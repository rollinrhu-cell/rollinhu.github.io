import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const db = getDb();
  const subscribers = db
    .prepare("SELECT * FROM subscribers ORDER BY created_at DESC")
    .all();
  return NextResponse.json(subscribers);
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const db = getDb();

  const existing = db.prepare("SELECT * FROM subscribers WHERE email = ?").get(email);
  if (existing) {
    return NextResponse.json({ error: "Email already subscribed" }, { status: 409 });
  }

  const id = uuidv4();
  db.prepare("INSERT INTO subscribers (id, email) VALUES (?, ?)").run(id, email);

  return NextResponse.json({ id, email, active: 1 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  db.prepare("DELETE FROM subscribers WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const { id, active } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  db.prepare("UPDATE subscribers SET active = ? WHERE id = ?").run(active ? 1 : 0, id);
  return NextResponse.json({ success: true });
}
