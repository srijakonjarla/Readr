# EPUB Reader with AI Features

A web application for reading EPUB books with AI-powered chat features.

## Project Structure

- `client/` - React frontend (TypeScript, Create React App)
- `server/` - Node.js + Express backend (TypeScript)
- `uploads/` - Uploaded EPUB files
- `samples/` - Sample EPUB files for testing

## Setup

### 1. Environment variables

Create a `.env` file in the project root with API keys for whichever providers you want to use:

```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Install dependencies

```bash
# Backend (root)
npm install

# Frontend
cd client && npm install && cd ..
```

### 3. Run in development

Open two terminals.

**Terminal 1 — backend** (Express on port 5001, hot-reloads via `tsx watch`):

```bash
npm run dev
```

**Terminal 2 — frontend** (CRA dev server on port 3000, proxies API to 5001):

```bash
cd client && npm start
```

Open http://localhost:3000.

### Type checking

```bash
npm run typecheck         # server
cd client && npx tsc --noEmit   # client
```

### Production build

```bash
npm run build      # compiles server to dist/
npm start          # runs node dist/app.js

cd client && npm run build   # builds static frontend
```

### Docker

```bash
docker-compose up --build
```

## API Endpoints

- `POST /api/upload` - Upload an EPUB file
- `GET /api/books` - List all books in the library
- `GET /api/files/:filename` - Get metadata + table of contents for a book
- `GET /api/epub/:filename/chapter/:chapterId` - Get chapter HTML
- `POST /api/chat` - Submit a chat query. Body: `{ query, context, filename, currentChapterIndex, provider }` where `provider` is `"openai"` or `"claude"`.

## Features

- Upload and browse EPUB books
- Read by chapter with adjustable font size and dark/light theme
- AI-powered chat:
  - **Spoiler-safe**: only chapters up to your current reading position are sent to the model
  - **Provider toggle**: OpenAI (GPT-4.1-mini) or Claude (Sonnet 4.6)
  - Claude requests use prompt caching for fast/cheap follow-up questions on the same chapter
