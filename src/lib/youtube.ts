import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";

interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
}

interface YouTubeVideoInfo {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  viewCount: number;
  thumbnailUrl: string;
  duration: string;
}

function getApiKey(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("youtube_api_key") as
    | { value: string }
    | undefined;
  return row?.value || "";
}

export async function searchChannel(query: string): Promise<YouTubeChannelInfo[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("YouTube API key not configured");

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=5&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.statusText}`);
  const data = await res.json();

  return (data.items || []).map((item: any) => ({
    id: item.snippet.channelId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
  }));
}

export async function getChannelInfo(channelId: string): Promise<YouTubeChannelInfo> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("YouTube API key not configured");

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.statusText}`);
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) throw new Error("Channel not found");

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
  };
}

export async function fetchRecentVideos(
  channelId: string,
  maxResults = 10
): Promise<YouTubeVideoInfo[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("YouTube API key not configured");

  // Get recent uploads
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=${maxResults}&key=${apiKey}`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`YouTube API error: ${searchRes.statusText}`);
  const searchData = await searchRes.json();

  const videoIds = (searchData.items || []).map((item: any) => item.id.videoId).join(",");
  if (!videoIds) return [];

  // Get video statistics and details
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${apiKey}`;
  const detailsRes = await fetch(detailsUrl);
  if (!detailsRes.ok) throw new Error(`YouTube API error: ${detailsRes.statusText}`);
  const detailsData = await detailsRes.json();

  return (detailsData.items || []).map((item: any) => ({
    videoId: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    viewCount: parseInt(item.statistics.viewCount || "0", 10),
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || "",
    duration: item.contentDetails.duration,
  }));
}

export async function fetchAndStoreVideos(dbChannelId: string, youtubeChannelId: string) {
  const db = getDb();
  const videos = await fetchRecentVideos(youtubeChannelId);

  const insertVideo = db.prepare(`
    INSERT OR REPLACE INTO videos (id, channel_id, youtube_video_id, title, description, published_at, view_count, thumbnail_url, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDetails = db.prepare(`
    INSERT OR IGNORE INTO video_details (video_id, people, topics, most_replayed_sections, summary)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const video of videos) {
    const existingVideo = db
      .prepare("SELECT id FROM videos WHERE youtube_video_id = ?")
      .get(video.videoId) as { id: string } | undefined;

    const videoId = existingVideo?.id || uuidv4();

    insertVideo.run(
      videoId,
      dbChannelId,
      video.videoId,
      video.title,
      video.description,
      video.publishedAt,
      video.viewCount,
      video.thumbnailUrl,
      video.duration
    );

    // Extract people and topics from description
    const { people, topics } = extractMetadata(video.title, video.description);

    insertDetails.run(videoId, JSON.stringify(people), JSON.stringify(topics), "[]", "");
  }

  return videos.length;
}

function extractMetadata(
  title: string,
  description: string
): { people: string[]; topics: string[] } {
  const people: string[] = [];
  const topics: string[] = [];

  // Common patterns for guests: "with [Name]", "ft. [Name]", "featuring [Name]"
  const guestPatterns = [
    /(?:with|ft\.?|feat\.?|featuring|guest:?\s*)\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
    /(?:interview|conversation)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  ];

  const fullText = `${title} ${description}`;
  for (const pattern of guestPatterns) {
    let match;
    while ((match = pattern.exec(fullText)) !== null) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 50 && !people.includes(name)) {
        people.push(name);
      }
    }
  }

  // Extract topics from common separators and hashtags
  const hashtagPattern = /#(\w+)/g;
  let match;
  while ((match = hashtagPattern.exec(fullText)) !== null) {
    const topic = match[1].replace(/([A-Z])/g, " $1").trim();
    if (!topics.includes(topic)) {
      topics.push(topic);
    }
  }

  // Extract topics from pipe-separated or dash-separated titles
  const titleParts = title.split(/[|–—-]/).map((s) => s.trim());
  if (titleParts.length > 1) {
    for (const part of titleParts.slice(1)) {
      if (part.length > 3 && part.length < 80 && !topics.includes(part)) {
        topics.push(part);
      }
    }
  }

  return { people, topics };
}

/** Parse ISO 8601 duration (PT1H2M3S) into a readable format */
export function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return isoDuration;
  const hours = match[1] ? `${match[1]}h ` : "";
  const minutes = match[2] ? `${match[2]}m ` : "";
  const seconds = match[3] ? `${match[3]}s` : "";
  return `${hours}${minutes}${seconds}`.trim() || "0s";
}
