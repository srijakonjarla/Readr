# Readr — EPUB reader with an AI companion

A single Next.js 15 app: serves an EPUB library and reader, with a streaming AI
companion that respects spoiler boundaries.

## Stack

- **Next.js 15** (App Router) + **React 18** + **TypeScript**
- **Tailwind v3** + a custom Modern theme (cream / sepia / dark)
- **node:sqlite** (built-in, no native compile) for highlights / threads / messages
- **Anthropic SDK** (Claude Sonnet 4.6) and **OpenAI SDK** (GPT-4.1-mini) — streaming responses
- **`epub` 2.x** for EPUB parsing, with an LRU cache and a sanitizer pass on chapter HTML

## Pages

| URL | Page | Notes |
|---|---|---|
| `/` | Library | Lists books. Click a card → `/preview/<filename>`. Hero "Resume" → `/read/<filename>`. Empty shelf redirects to `/upload`. |
| `/upload` | Upload form | Drops a new `.epub` into `uploads/` and redirects to `/`. |
| `/preview/[filename]` | Book preview card | Metadata + chapter count + "Start reading". |
| `/read/[filename]` | Reader + chat panel | Owns per-book chat state (highlights, threads, messages). |

The site-wide header (R logo, theme toggle, +Add EPUB, ←Library) lives in
`app/layout.tsx` and is rendered on every route. Theme state is held by
`<ThemeProvider>` so it persists across navigation.

## Project layout

```
app/
  layout.tsx                               — root shell, ThemeProvider, ChromeHeader
  page.tsx                                 — / (Library)
  upload/page.tsx                          — /upload
  preview/[filename]/page.tsx              — /preview/<filename>
  read/[filename]/page.tsx                 — /read/<filename>
  globals.css                              — Tailwind base + theme variables
  api/
    books/                                 — list + per-book persistence
    files/[filename]/                      — TOC + metadata
    epub/[filename]/chapter/[chapterId]/   — chapter HTML
    epub/[filename]/asset/[assetId]/       — images / fonts inside the EPUB
    chat/                                  — streaming chat
    upload/                                — multipart upload
    highlights/[id]/, threads/[id]/, …     — CRUD for persisted state
components/                                — ChromeHeader, ThemeProvider, ChatPanel,
                                             ReaderSection, LibrarySection, …
hooks/                                     — useChapterLoader, useTextSelection,
                                             useHighlightPainter, useScrollProgress
lib/
  db/                                      — SQLite schema + repos
  services/{openai,claude}.ts              — streaming chat services
  epub.ts                                  — parse cache, sanitizer, helpers
  schemas.ts                               — zod schemas + parseOrError helper
  persistence.ts                           — client-side fetch helpers
shared/api.ts                              — types shared across server + client
util/, types.ts                            — small client helpers
uploads/                                   — uploaded EPUB files
data/                                      — SQLite database (auto-created)
```

## Setup

### 1. Environment

Create a `.env` at the repo root:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

Add either or both — the chat panel has a runtime toggle.

### 2. Install + run

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3001
```

Production:

```bash
npm run build
npm start            # http://localhost:3001
```

Type-check:

```bash
npm run typecheck
```

### 3. Docker

```bash
docker-compose up --build
```

App is on http://localhost:3001. `uploads/` and `data/` are bind-mounted so EPUBs and the SQLite DB persist across container restarts.

## API Endpoints

- `GET /api/books` — list every EPUB in `uploads/`
- `POST /api/upload` — multipart upload (field name `file`, max 50 MB, `.epub` only)
- `GET /api/files/:filename` — metadata + TOC
- `GET /api/epub/:filename/chapter/:chapterId` — sanitized chapter HTML, with internal `<img>` URLs rewritten to point at our asset endpoint
- `GET /api/epub/:filename/asset/:assetId` — image bytes from inside the EPUB
- `POST /api/chat` — body: `{ query, context?, filename, currentChapterIndex?, provider }`. Returns a `text/plain` stream of model output.
- Persistence: `GET /api/books/:filename/state`, `POST/DELETE /api/.../highlights`, `POST/DELETE /api/.../threads`, `POST/DELETE /api/.../messages`

## Features

- Browse + open EPUBs from a uploaded library
- Chapter-by-chapter reader with floating chrome, left-rail dots, real progress bar, TOC drawer
- **Spoiler-safe AI chat**: only chapters up to your current reading position are sent; system prompt forbids drawing on training-data knowledge of the book
- **Streaming responses** via Web `ReadableStream` (token-by-token rendering)
- **Highlights + threads** persisted to SQLite, survive server restarts
- Theme cycle: cream → dark → sepia
- Internal EPUB links (Contents pages, cross-chapter references) are intercepted client-side and routed to the right chapter
