import { getDb } from "./db";
import { v4 as uuidv4 } from "uuid";
import { formatDuration } from "./youtube";

interface VideoDigestEntry {
  videoTitle: string;
  channelName: string;
  publishedAt: string;
  viewCount: number;
  duration: string;
  people: string[];
  topics: string[];
  mostReplayedSections: string[];
  thumbnailUrl: string;
  videoUrl: string;
}

interface DigestData {
  themesSummary: string;
  videos: VideoDigestEntry[];
  generatedAt: string;
  frequency: string;
}

export function getDigestFrequency(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("digest_frequency") as
    | { value: string }
    | undefined;
  return row?.value || "weekly";
}

function getDateRangeForFrequency(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case "daily":
      now.setDate(now.getDate() - 1);
      break;
    case "biweekly":
      now.setDate(now.getDate() - 3); // roughly twice a week
      break;
    case "weekly":
    default:
      now.setDate(now.getDate() - 7);
      break;
  }
  return now.toISOString();
}

export function generateDigest(): DigestData {
  const db = getDb();
  const frequency = getDigestFrequency();
  const sinceDate = getDateRangeForFrequency(frequency);

  const videos = db
    .prepare(
      `
    SELECT v.*, vd.people, vd.topics, vd.most_replayed_sections, vd.summary,
           c.name as channel_name
    FROM videos v
    LEFT JOIN video_details vd ON v.id = vd.video_id
    JOIN channels c ON v.channel_id = c.id
    WHERE v.published_at >= ?
    ORDER BY v.published_at DESC
  `
    )
    .all(sinceDate) as any[];

  const digestEntries: VideoDigestEntry[] = videos.map((v) => ({
    videoTitle: v.title,
    channelName: v.channel_name,
    publishedAt: v.published_at,
    viewCount: v.view_count,
    duration: formatDuration(v.duration || ""),
    people: safeParseJSON(v.people, []),
    topics: safeParseJSON(v.topics, []),
    mostReplayedSections: safeParseJSON(v.most_replayed_sections, []),
    thumbnailUrl: v.thumbnail_url,
    videoUrl: `https://www.youtube.com/watch?v=${v.youtube_video_id}`,
  }));

  const themesSummary = generateThemesSummary(digestEntries);

  return {
    themesSummary,
    videos: digestEntries,
    generatedAt: new Date().toISOString(),
    frequency,
  };
}

function generateThemesSummary(videos: VideoDigestEntry[]): string {
  if (videos.length === 0) {
    return "No new videos were published in this digest period.";
  }

  // Collect all topics across videos
  const allTopics: Record<string, number> = {};
  const allPeople: string[] = [];
  const channelNames = new Set<string>();

  for (const video of videos) {
    channelNames.add(video.channelName);
    for (const topic of video.topics) {
      allTopics[topic] = (allTopics[topic] || 0) + 1;
    }
    allPeople.push(...video.people);
  }

  const topTopics = Object.entries(allTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const channelList = Array.from(channelNames).join(", ");
  const topicStr =
    topTopics.length > 0
      ? `Key themes include ${topTopics.join(", ")}.`
      : "A variety of topics were covered.";

  const highViewVideos = videos.filter((v) => v.viewCount > 10000);
  const viewNote =
    highViewVideos.length > 0
      ? ` ${highViewVideos.length} video(s) garnered significant viewership.`
      : "";

  return `This ${getFrequencyLabel(videos[0] ? "weekly" : "weekly")} digest covers ${videos.length} new video(s) from ${channelList}. ${topicStr}${viewNote}`;
}

function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case "daily":
      return "daily";
    case "biweekly":
      return "bi-weekly";
    case "weekly":
      return "weekly";
    default:
      return "weekly";
  }
}

function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function renderDigestHtml(digest: DigestData): string {
  const frequencyLabel = getFrequencyLabel(digest.frequency);

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; color: #333; }
    .container { max-width: 700px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ff0000, #cc0000); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .themes { background: #fafafa; padding: 20px 30px; border-bottom: 1px solid #eee; }
    .themes h2 { font-size: 16px; color: #666; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; }
    .themes p { margin: 0; line-height: 1.6; color: #444; }
    .video-card { padding: 20px 30px; border-bottom: 1px solid #eee; }
    .video-card:last-child { border-bottom: none; }
    .video-card h3 { margin: 0 0 8px; }
    .video-card h3 a { color: #1a0dab; text-decoration: none; }
    .video-card h3 a:hover { text-decoration: underline; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #666; margin-bottom: 10px; }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .badge { display: inline-block; background: #e8f0fe; color: #1967d2; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin: 2px; }
    .badge.person { background: #fce8e6; color: #c5221f; }
    .section-label { font-weight: 600; font-size: 13px; color: #555; margin-top: 8px; }
    .replayed { background: #fff8e1; border-left: 3px solid #f9a825; padding: 8px 12px; margin-top: 8px; font-size: 13px; color: #666; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
    .thumbnail { width: 100%; max-width: 320px; border-radius: 8px; margin-bottom: 10px; }
    .view-count { font-weight: 600; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>YouTube Channel Digest</h1>
      <p>${frequencyLabel.charAt(0).toUpperCase() + frequencyLabel.slice(1)} digest &middot; ${new Date(digest.generatedAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    <div class="themes">
      <h2>Overarching Themes</h2>
      <p>${digest.themesSummary}</p>
    </div>`;

  for (const video of digest.videos) {
    const viewCountFormatted = video.viewCount.toLocaleString();
    const publishedDate = new Date(video.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    html += `
    <div class="video-card">
      <h3><a href="${video.videoUrl}">${escapeHtml(video.videoTitle)}</a></h3>
      <div class="meta">
        <span><strong>${escapeHtml(video.channelName)}</strong></span>
        <span>${publishedDate}</span>
        <span>${video.duration}</span>
        <span class="view-count">${viewCountFormatted} views</span>
      </div>`;

    if (video.people.length > 0) {
      html += `<div class="section-label">People</div><div>`;
      for (const person of video.people) {
        html += `<span class="badge person">${escapeHtml(person)}</span>`;
      }
      html += `</div>`;
    }

    if (video.topics.length > 0) {
      html += `<div class="section-label">Topics</div><div>`;
      for (const topic of video.topics) {
        html += `<span class="badge">${escapeHtml(topic)}</span>`;
      }
      html += `</div>`;
    }

    if (video.mostReplayedSections.length > 0) {
      html += `<div class="replayed"><strong>Most Replayed:</strong> ${video.mostReplayedSections.map(escapeHtml).join(", ")}</div>`;
    }

    html += `</div>`;
  }

  html += `
    <div class="footer">
      <p>Generated by YouTube Email Digest</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function recordDigest(digest: DigestData, recipientCount: number): string {
  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO digest_history (id, recipient_count, video_count, themes_summary) VALUES (?, ?, ?, ?)`
  ).run(id, recipientCount, digest.videos.length, digest.themesSummary);
  return id;
}
