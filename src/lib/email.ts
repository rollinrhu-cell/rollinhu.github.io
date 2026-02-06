import nodemailer from "nodemailer";
import { getDb } from "./db";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  subject: string;
}

function getSmtpConfig(): SmtpConfig {
  const db = getDb();
  const getSetting = (key: string) => {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
      | { value: string }
      | undefined;
    return row?.value || "";
  };

  return {
    host: getSetting("smtp_host"),
    port: parseInt(getSetting("smtp_port") || "587", 10),
    user: getSetting("smtp_user"),
    pass: getSetting("smtp_pass"),
    fromEmail: getSetting("from_email"),
    subject: getSetting("digest_subject"),
  };
}

export async function sendDigestEmail(
  recipients: string[],
  htmlContent: string
): Promise<{ success: boolean; error?: string }> {
  const config = getSmtpConfig();

  if (!config.host || !config.user || !config.pass) {
    return { success: false, error: "SMTP settings not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    await transporter.sendMail({
      from: config.fromEmail || config.user,
      to: recipients.join(", "),
      subject: config.subject || "Your YouTube Channel Digest",
      html: htmlContent,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function getActiveSubscriberEmails(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT email FROM subscribers WHERE active = 1").all() as {
    email: string;
  }[];
  return rows.map((r) => r.email);
}
