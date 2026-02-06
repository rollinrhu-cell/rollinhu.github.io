import { NextRequest, NextResponse } from "next/server";
import { generateDigest, renderDigestHtml, recordDigest } from "@/lib/digest";
import { sendDigestEmail, getActiveSubscriberEmails } from "@/lib/email";

export async function GET() {
  try {
    const digest = generateDigest();
    const html = renderDigestHtml(digest);
    return NextResponse.json({ digest, html });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const digest = generateDigest();
    const html = renderDigestHtml(digest);

    // Allow sending to specific emails or to all active subscribers
    const recipients: string[] = body.emails || getActiveSubscriberEmails();

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found" }, { status: 400 });
    }

    const result = await sendDigestEmail(recipients, html);

    if (result.success) {
      recordDigest(digest, recipients.length);
      return NextResponse.json({
        success: true,
        recipientCount: recipients.length,
        videoCount: digest.videos.length,
      });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
