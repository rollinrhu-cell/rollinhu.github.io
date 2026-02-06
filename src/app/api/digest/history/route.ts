import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const history = db
    .prepare("SELECT * FROM digest_history ORDER BY sent_at DESC LIMIT 20")
    .all();
  return NextResponse.json(history);
}
