import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "youtube-digest.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      youtube_channel_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriber_channels (
      subscriber_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      PRIMARY KEY (subscriber_id, channel_id),
      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      youtube_video_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT,
      published_at TEXT,
      view_count INTEGER DEFAULT 0,
      thumbnail_url TEXT,
      duration TEXT,
      fetched_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS video_details (
      video_id TEXT PRIMARY KEY,
      people TEXT,
      topics TEXT,
      most_replayed_sections TEXT,
      summary TEXT,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS digest_history (
      id TEXT PRIMARY KEY,
      sent_at TEXT DEFAULT (datetime('now')),
      recipient_count INTEGER,
      video_count INTEGER,
      themes_summary TEXT
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('digest_frequency', 'weekly');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('youtube_api_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_host', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_port', '587');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_user', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('smtp_pass', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('from_email', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('digest_subject', 'Your YouTube Channel Digest');
  `);
}
