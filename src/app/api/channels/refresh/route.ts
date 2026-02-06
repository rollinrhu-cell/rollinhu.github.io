import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchAndStoreVideos } from "@/lib/youtube";

export async function POST() {
  const db = getDb();
  const channels = db.prepare("SELECT id, youtube_channel_id FROM channels").all() as {
    id: string;
    youtube_channel_id: string;
  }[];

  const results: { channel: string; videoCount?: number; error?: string }[] = [];

  for (const channel of channels) {
    try {
      const count = await fetchAndStoreVideos(channel.id, channel.youtube_channel_id);
      results.push({ channel: channel.youtube_channel_id, videoCount: count });
    } catch (err: any) {
      results.push({ channel: channel.youtube_channel_id, error: err.message });
    }
  }

  return NextResponse.json({ results });
}
