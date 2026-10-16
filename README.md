# Readr — EPUB reader with an AI companion

A single Next.js app: an invite-only EPUB library and reader, with a streaming
AI companion that respects spoiler boundaries. Deployed on Vercel.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 18** + **TypeScript**
- **Tailwind v4** (`@tailwindcss/postcss`) + a custom theme (cream / sepia / dark)
- **Supabase Auth** (`@supabase/ssr`) — invite-only sign-in via an `allowed_emails` table
- **Supabase Postgres** via `postgres` (postgres.js) — books, chapters, assets, highlights, threads, messages
- **Vercel Blob** (private) — the original uploaded `.epub` files
- **Anthropic SDK** (Claude Opus 5.5) and **OpenAI SDK** (GPT-5.6 Sol) — streaming responses
- **`epub` 2.x** for parsing, with a sanitizer pass on chapter HTML

## How data flows

EPUBs are parsed **once, at upload time**. `POST /api/upload` stages the file
in `/tmp`, extracts chapters (sanitized HTML) and assets (images, fonts), stores
the raw file in Vercel Blob, and writes everything to Postgres. Reading a book
is then pure DB queries — no per-request EPUB parsing, no cold-start cost.

## Auth and data ownership

- `proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the Supabase
  session on every request. Signed-out visitors are redirected to `/`, which
  renders the login form; signed-out `/api/*` calls get a `401` instead.
- Sign-in is invite-only: `app/auth/callback` signs the user straight back out
  unless their email is in `public.allowed_emails`. To invite someone, insert
  their email there.
- Every user's data is private. `books`, `highlights`, `threads` and
  `reading_state` carry a `user_id`; `chapters`, `assets` and `messages` are
  owned through their parent row. Highlights/threads have a composite foreign
  key to `books (filename, user_id)`, so they can't point at another user's book.
- **The app connects as `postgres`, which bypasses RLS.** Ownership is enforced
  by `requireUser()` (`lib/auth.ts`) in every route handler plus a `user_id`
  filter in every `lib/db/*` query. RLS policies exist on all tables as a second
  layer and keep the Supabase Data API closed to other users.

## Pages

| URL                   | Page                | Notes                                                        |
| --------------------- | ------------------- | ------------------------------------------------------------ |
| `/`                   | Library / login     | Login form when signed out; the user's books when signed in. |
| `/login`              | Login               | Redirects to `/` when already signed in.                     |
| `/upload`             | Upload form         | Uploads a new `.epub` and redirects to `/`.                  |
| `/preview/[filename]` | Book preview card   | Metadata + chapter count + "Start reading".                  |
| `/read/[filename]`    | Reader + chat panel | Owns per-book chat state (highlights, threads, messages).    |
| `/privacy`, `/terms`  | Legal pages         | Public.                                                      |

The site-wide header lives in `app/layout.tsx` and is rendered on every route.
Theme state is held by `<ThemeProvider>` so it persists across navigation.

## Project layout

```
proxy.ts                                   — session refresh + auth gate
app/
  layout.tsx                               — root shell, ThemeProvider, ChromeHeader
  page.tsx                                 — / (login or library)
  login/, upload/, preview/, read/         — pages
  auth/callback/, auth/signout/            — Supabase OAuth callback + sign-out
  privacy/, terms/                         — legal pages
  api/
    books/                                 — list + per-book state, highlights, threads
    files/[filename]/                      — TOC + metadata
    epub/[filename]/chapter/[chapterId]/   — chapter HTML
    epub/[filename]/asset/[assetId]/       — images / fonts inside the EPUB
    chat/                                  — streaming chat
    upload/                                — multipart upload + parse
    highlights/[id]/, threads/[id]/…       — deletes + message mutations
components/                                — ChromeHeader, LoginForm, ChatPanel,
  chat/, library/, reader/                   ReaderSection, LibrarySection, …
hooks/                                     — useChapterLoader, useTextSelection,
                                             useHighlightPainter, useScrollProgress, …
lib/
  auth.ts                                  — requireUser() for route handlers
  supabase/                                — browser, server, and proxy clients
  db/                                      — postgres.js client + per-table repos
  epub/                                    — parse, extract, sanitize, chat JSON
  services/{openai,claude}.ts              — streaming chat services
  schemas.ts                               — zod schemas + parseOrError helper
  persistence.ts                           — client-side fetch helpers
shared/api.ts                              — types shared across server + client
util/, types.ts                            — small client helpers
```

## Setup

### 1. Environment

Create `.env.local` at the repo root (or `vercel env pull .env.local`):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
DATABASE_URL=postgresql://...          # Supabase pooler connection string

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# AI providers — either or both; the chat panel has a runtime toggle
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Install + run

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3001
```

Sign in with an email that's in `allowed_emails`.

Production:

```bash
npm run build
npm start            # http://localhost:3001
```

Checks:

```bash
npm run typecheck
npm run lint
npm run format:check
```

### 3. Docker

```bash
docker-compose up --build
```

> **Stale:** `docker-compose.yml` predates the Supabase/Blob move — it still
> bind-mounts `uploads/` and `data/` and only passes the AI keys. It needs the
> env vars above (the `NEXT_PUBLIC_*` ones at build time) before it will work.

## API endpoints

All `/api/*` routes require a session and return `401` without one. Every
response is scoped to the signed-in user; another user's book returns `404`.

- `GET /api/books` — list the user's books
- `POST /api/upload` — multipart upload (field name `file`, max 50 MB, `.epub` only)
- `GET /api/files/:filename` — metadata + TOC
- `GET /api/epub/:filename/chapter/:chapterId` — sanitized chapter HTML, with internal `<img>` URLs rewritten to point at the asset endpoint
- `GET /api/epub/:filename/asset/:assetId` — image/font bytes from inside the EPUB
- `POST /api/chat` — body: `{ query, context?, filename, currentChapterIndex?, provider }`. Returns a `text/plain` stream of model output.
- Persistence: `GET /api/books/:filename/state`, `POST /api/books/:filename/{highlights,threads}`, `DELETE /api/highlights/:id`, `DELETE /api/threads/:id`, `POST/DELETE /api/threads/:id/messages`, `DELETE /api/threads/:id/messages/last`

## Features

- Invite-only accounts with a private library per user
- Chapter-by-chapter reader with floating chrome, left-rail dots, real progress bar, TOC drawer
- **Spoiler-safe AI chat**: only chapters up to your current reading position are sent; the system prompt forbids drawing on training-data knowledge of the book
- **Streaming responses** via Web `ReadableStream` (token-by-token rendering)
- **Highlights + threads** persisted to Postgres
- Theme cycle: cream → dark → sepia
- Internal EPUB links (Contents pages, cross-chapter references) are intercepted client-side and routed to the right chapter
