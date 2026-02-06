import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as {
    key: string;
    value: string;
  }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    // Don't expose sensitive values directly
    if (row.key === "smtp_pass" || row.key === "youtube_api_key") {
      settings[row.key] = row.value ? "••••••••" : "";
    } else {
      settings[row.key] = row.value;
    }
  }
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const updates = await req.json();
  const db = getDb();

  const allowedKeys = [
    "digest_frequency",
    "youtube_api_key",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_pass",
    "from_email",
    "digest_subject",
  ];

  const upsert = db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  );

  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.includes(key)) {
      // Skip masked values (don't overwrite secrets with mask)
      if (value === "••••••••") continue;
      upsert.run(key, value as string);
    }
  }

  return NextResponse.json({ success: true });
}
