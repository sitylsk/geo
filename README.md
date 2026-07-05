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
- File-backed persistence — submissions in `data/submissions.json`, screenshots saved to
  `public/uploads` and served through a hardened `/media/[file]` route (path-traversal safe).
- Public **Showcase** page with per-project cards, screenshot strips and repo links.

## Getting started

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
  media/[file]/route.ts    # serves uploaded screenshots
  globals.css              # soft-brutalist design system
components/                # form, screenshot slots, cards, ticker
lib/                       # types, validation, JSON/file store
```

## Notes

- `data/submissions.json` and uploaded screenshots are runtime-generated and git-ignored.
- Each screenshot is capped at 5MB and must be PNG/JPG/WEBP/GIF.
