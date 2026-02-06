import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { getChannelInfo, fetchAndStoreVideos } from "@/lib/youtube";

export async function GET() {
  const db = getDb();
  const channels = db
    .prepare("SELECT * FROM channels ORDER BY created_at DESC")
    .all();
  return NextResponse.json(channels);
}

export async function POST(req: NextRequest) {
  try {
    const { youtubeChannelId } = await req.json();
    if (!youtubeChannelId) {
      return NextResponse.json({ error: "youtubeChannelId is required" }, { status: 400 });
    }

    const db = getDb();

    // Check if already added
    const existing = db
      .prepare("SELECT * FROM channels WHERE youtube_channel_id = ?")
      .get(youtubeChannelId);
    if (existing) {
      return NextResponse.json({ error: "Channel already added" }, { status: 409 });
    }

    // Fetch channel info from YouTube
    const info = await getChannelInfo(youtubeChannelId);

    const id = uuidv4();
    db.prepare(
      "INSERT INTO channels (id, youtube_channel_id, name, description, thumbnail_url) VALUES (?, ?, ?, ?, ?)"
    ).run(id, youtubeChannelId, info.title, info.description, info.thumbnailUrl);

    // Fetch recent videos
    try {
      await fetchAndStoreVideos(id, youtubeChannelId);
    } catch {
      // Non-fatal: videos can be fetched later
    }

    return NextResponse.json({
      id,
      youtube_channel_id: youtubeChannelId,
      name: info.title,
      description: info.description,
      thumbnail_url: info.thumbnailUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM channels WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
