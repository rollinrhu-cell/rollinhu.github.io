# CLAUDE.md

This file provides guidance for AI assistants (Claude and others) working in this codebase.

## Project Overview

**YouTube Email Digest** — a self-hosted Next.js 16 web application that tracks YouTube channels, generates styled HTML email digests of recent videos, and delivers them to a managed subscriber list.

Key capabilities:
- Track YouTube channels by ID or search
- Cache video metadata in a local SQLite database
- Extract guests, topics, and most-replayed sections from video metadata
- Generate and preview HTML email digests
- Manage email subscribers (add, pause, remove)
- Configure digest frequency (daily, bi-weekly, weekly)
- Maintain a history of sent digests

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict mode) |
| UI | React 19 + Tailwind CSS 4 |
| Database | SQLite via `better-sqlite3` (synchronous, embedded) |
| Email | Nodemailer 8 |
| External API | YouTube Data API v3 |
| Linting | ESLint 9 with `eslint-config-next` |

## Repository Structure

```
src/
├── app/
│   ├── api/
│   │   ├── channels/
│   │   │   ├── route.ts          # GET (list), POST (add), DELETE channels
│   │   │   ├── search/route.ts   # GET search YouTube by query
│   │   │   └── refresh/route.ts  # POST refresh all channel videos
│   │   ├── subscribers/route.ts  # GET, POST, DELETE, PATCH subscribers
│   │   ├── settings/route.ts     # GET, PUT app settings
│   │   └── digest/
│   │       ├── route.ts          # GET (preview), POST (send) digest
│   │       └── history/route.ts  # GET last 20 sent digests
│   ├── layout.tsx                # Root layout, metadata, global CSS import
│   ├── page.tsx                  # Main page: 4-tab UI (Channels/Subscribers/Digest/Settings)
│   └── globals.css               # Tailwind CSS entry point
├── components/
│   ├── ChannelManager.tsx        # Add/manage YouTube channels
│   ├── SubscriberManager.tsx     # Add/manage email subscribers
│   ├── Settings.tsx              # Configure API keys, SMTP, frequency
│   └── DigestPreview.tsx         # Preview digest, send, view history
└── lib/
    ├── db.ts                     # SQLite schema init, WAL mode, default settings
    ├── youtube.ts                # YouTube Data API v3 client
    ├── email.ts                  # Nodemailer email delivery
    └── digest.ts                 # Digest generation & HTML rendering
```

## Development Workflow

### Prerequisites
- Node.js 18+
- YouTube Data API v3 key
- SMTP credentials (Gmail, SendGrid, or any SMTP server)

### Commands

```bash
npm run dev     # Start dev server (http://localhost:3000)
npm run build   # Production build
npm start       # Start production server
npm run lint    # Run ESLint
```

### First-time Setup
1. `npm install`
2. `npm run dev`
3. Open http://localhost:3000 → **Settings** tab
4. Enter YouTube Data API v3 key and SMTP credentials
5. Go to **Channels** tab → add channels by ID or search
6. Go to **Digest** tab → preview and send

## Database

The app uses an **embedded SQLite database** (`./data/digest.db`, git-ignored). The database is auto-created and migrated on first run via `src/lib/db.ts`.

### Schema

| Table | Purpose |
|-------|---------|
| `channels` | Tracked YouTube channels |
| `subscribers` | Email subscribers |
| `subscriber_channels` | Junction table (channels ↔ subscribers) |
| `videos` | Cached video metadata |
| `video_details` | Extracted metadata: guests, topics, most-replayed |
| `settings` | Key-value config store |
| `digest_history` | Audit log of sent digests |

**Important:** `better-sqlite3` is synchronous — do **not** introduce `async/await` around database calls. All DB operations happen synchronously within API route handlers.

## API Routes

All routes live under `src/app/api/` and follow Next.js App Router conventions (exported `GET`, `POST`, etc. handlers).

### Channels
- `GET /api/channels` — list all tracked channels
- `POST /api/channels` — add a channel (`{ channelId: string }`)
- `DELETE /api/channels?channelId=...` — remove a channel
- `GET /api/channels/search?q=...` — search YouTube channels
- `POST /api/channels/refresh` — refresh video data for all channels

### Subscribers
- `GET /api/subscribers` — list all subscribers
- `POST /api/subscribers` — add subscriber (`{ email: string }`)
- `DELETE /api/subscribers?id=...` — remove subscriber
- `PATCH /api/subscribers` — toggle active status (`{ id, active }`)

### Settings
- `GET /api/settings` — retrieve settings (sensitive values masked)
- `PUT /api/settings` — update settings (`{ key: string, value: string }`)

### Digest
- `GET /api/digest` — generate digest preview (returns HTML + metadata)
- `POST /api/digest` — send digest to all active subscribers
- `GET /api/digest/history` — last 20 digests

## Key Conventions

### TypeScript
- Strict mode is enabled (`tsconfig.json`). Avoid `any` types.
- Path alias: `@/*` maps to `./src/*`. Use it for all internal imports.
- All components are `.tsx`, all library files are `.ts`.

### Styling
- Tailwind CSS 4 via PostCSS. No CSS modules or styled-components.
- Global styles only in `src/app/globals.css`.
- Inline Tailwind utility classes in JSX — no separate `.css` files per component.

### API Routes
- Use Next.js App Router route handlers (`NextRequest` / `NextResponse`).
- Return JSON with `NextResponse.json()`.
- Always handle errors with try/catch and return appropriate HTTP status codes.
- Sensitive settings (API keys, passwords) must be masked in GET responses.

### Database Access
- All DB access goes through the singleton returned by `src/lib/db.ts`.
- Use `db.prepare(...).get()`, `.all()`, `.run()` — no async wrappers.
- Schema changes belong in `src/lib/db.ts` alongside the existing `CREATE TABLE IF NOT EXISTS` statements.

### State Management
- No external state library. React `useState` / `useEffect` only.
- Page-level state lives in `src/app/page.tsx`; component-local state lives in each component.
- Data fetching uses the native `fetch` API inside `useEffect` hooks.

## Settings Keys

The `settings` table stores configuration as key-value pairs. Valid keys:

| Key | Description |
|-----|-------------|
| `youtube_api_key` | YouTube Data API v3 key |
| `digest_frequency` | `daily` \| `biweekly` \| `weekly` |
| `smtp_host` | SMTP server hostname |
| `smtp_port` | SMTP port (e.g., `587`) |
| `smtp_user` | SMTP username |
| `smtp_password` | SMTP password |
| `smtp_from` | Sender email address |
| `smtp_subject` | Email subject line |

The settings API validates against an allowlist of these keys before persisting.

## Security Notes

- **No authentication** on any API endpoint — this app is intended for local or trusted-network use only. Do not expose it to the public internet without adding auth.
- SMTP passwords are stored in plaintext in SQLite. This is acceptable for personal/local use; add encryption if deploying for others.
- Sensitive fields are masked (`***`) in `GET /api/settings` responses to avoid leaking credentials to the browser.

## External Dependencies

### YouTube Data API v3
- Used in `src/lib/youtube.ts`
- Requires a Google Cloud project with the YouTube Data API enabled
- Quota: default 10,000 units/day. `videos.list` costs 1 unit per call; `search.list` costs 100 units.
- Metadata extraction (guests, topics) uses regex pattern matching on titles/descriptions — no ML.

### Nodemailer
- Used in `src/lib/email.ts`
- Reads SMTP config from the `settings` table at send time
- Supports any SMTP server; Gmail requires an App Password if 2FA is enabled

## Common Tasks

### Add a new settings field
1. Add a default row in the `initializeDefaultSettings()` call in `src/lib/db.ts`
2. Add the key to the allowlist in `src/app/api/settings/route.ts`
3. Add the UI input in `src/components/Settings.tsx`

### Add a new API route
1. Create `src/app/api/<name>/route.ts`
2. Export named functions (`GET`, `POST`, etc.) using `NextRequest` / `NextResponse`
3. Access the DB via `import db from '@/lib/db'`

### Modify the digest HTML template
- Edit the `generateDigestHTML()` function in `src/lib/digest.ts`
- The template uses inline styles for email client compatibility — avoid Tailwind classes inside the digest HTML

### Add a new database table
- Add `CREATE TABLE IF NOT EXISTS` in `src/lib/db.ts` inside the initialization block
- The DB is initialized synchronously at module load time

## No-Test Environment

There are currently no automated tests or CI/CD pipelines. When making changes:
- Run `npm run build` to catch TypeScript and Next.js build errors
- Run `npm run lint` to catch ESLint issues
- Manually test API routes and UI interactions in the dev server
