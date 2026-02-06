# YouTube Email Digest

A Next.js application that creates email digests for YouTube channel shows. Track your favorite channels, manage email subscribers, and send beautifully formatted digests on a schedule you choose.

## Features

- **Channel Tracking** — Add YouTube channels by ID or search, automatically fetch recent videos
- **Email Digest** — Generates a styled HTML email digest with:
  - Overarching themes across all tracked channels
  - People/guests on each show
  - Topics discussed
  - View counts
  - Most replayed sections (when available)
- **Subscriber Management** — Add/remove email addresses, pause/activate individual subscribers
- **Flexible Scheduling** — Toggle between daily, bi-weekly, or weekly digest frequency
- **Digest History** — Track previously sent digests

## Getting Started

### Prerequisites

- Node.js 18+
- A [YouTube Data API v3](https://console.cloud.google.com/apis/library/youtube.googleapis.com) key
- SMTP email credentials (Gmail, SendGrid, etc.)

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

1. Go to the **Settings** tab in the app
2. Enter your **YouTube API Key**
3. Configure your **SMTP settings** for sending emails
4. Choose your preferred **digest frequency** (daily, bi-weekly, or weekly)

### Adding Channels

1. Go to the **Channels** tab
2. Enter a YouTube Channel ID (e.g., `UCxxxxxxxx`) or search by name
3. The app will automatically fetch recent videos from added channels

### Managing Subscribers

1. Go to the **Subscribers** tab
2. Add email addresses that should receive the digest
3. Toggle subscribers active/inactive as needed

### Sending a Digest

1. Go to the **Digest** tab
2. Click **Preview Digest** to see what the email will look like
3. Click **Send to All Subscribers** to distribute

## Tech Stack

- **Next.js 15** with App Router
- **TypeScript**
- **Tailwind CSS** for styling
- **SQLite** (via better-sqlite3) for local data storage
- **Nodemailer** for email delivery
- **YouTube Data API v3** for channel/video data
