# Mobilethon Hub

A soft-brutalist submission hub for the **Mobilethon** — a mobile-first build sprint.
Participants choose whether they're **hacking solo or as a team**, then post their build:
project name, tagline, public **GitHub repo**, **3 on-device screenshots**, and their
**name + email** (plus teammates for teams). Submissions land on a public **Showcase** wall.

Built with **Next.js (App Router) + React + Tailwind CSS v4**.

## Design

"Soft brutalism" — the confident structure of brutalism (chunky `2.5px` borders, bold
type, offset shadows, a mono/grotesk type pairing) but deliberately gentled:

- **Rounded corners** everywhere instead of hard 90° edges.
- **Muted, subtle palette** on warm paper — dusty clay, sage, sky blue and soft mustard.
- **Smooth motion** — pressable elements glide toward their shadow on hover/press,
  cards float and content rises in.

## Features

- Solo / Team mode selector that adapts the form (team name + dynamic teammate list).
- Submission form: name, email, project name, tagline, validated GitHub URL.
- Exactly **3 device screenshots** with drag-and-drop upload + live previews.
- Server-side validation (`lib/validate.ts`) with friendly error messages.
- **Supabase persistence** — submissions stored in a Postgres `submissions` table and
  screenshots uploaded to a public **Supabase Storage** bucket (`screenshots`). This is
  durable across serverless instances, unlike a local file store.
- Public **Showcase** page with per-project cards, screenshot strips and repo links.

## Getting started

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run [`supabase/schema.sql`](./supabase/schema.sql) — this creates the
   `submissions` table and the public `screenshots` storage bucket.
3. Copy `.env.example` to `.env.local` and fill in your keys from **Settings > API**:

```bash
cp .env.example .env.local
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=...   (server-side only — never expose to the browser)
```

### 2. Run

```bash
npm install
npm run dev      # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## Project structure

```
app/
  page.tsx                 # landing + submission form
  showcase/page.tsx        # public wall of submissions
  api/submissions/route.ts # GET (list) + POST (create) API
  globals.css              # soft-brutalist design system
components/                # form, screenshot slots, cards, ticker
lib/
  types.ts                 # shared types
  validate.ts              # server-side validation
  supabase.ts              # Supabase server client (service role)
  store.ts                 # table queries + Storage uploads
supabase/schema.sql        # table + storage bucket setup
```

## Deploying to Vercel

Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as Environment Variables in the Vercel
project (Settings > Environment Variables), then deploy. Because data lives in Supabase,
submissions persist across serverless instances.

## Notes

- Each screenshot is capped at 5MB and must be PNG/JPG/WEBP/GIF.
- The service role key bypasses RLS and must only ever be used server-side.
