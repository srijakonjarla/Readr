import type { Request, Response } from "express";
import {
  deleteHighlight,
  insertHighlight,
  listHighlights,
  type DbHighlight,
} from "../db/highlights";
import {
  appendMessage,
  clearMessages,
  deleteThread,
  insertThread,
  listThreads,
  removeLastMessage,
  type DbMessage,
} from "../db/threads";

// GET /api/books/:filename/state — initial bundle for a book.
export const getBookState = (
  req: Request<{ filename: string }>,
  res: Response,
): void => {
  const { filename } = req.params;
  res.json({
    highlights: listHighlights(filename),
    threads: listThreads(filename),
  });
};

// POST /api/books/:filename/highlights — body validated by zod
export const createHighlight = (
  req: Request<
    { filename: string },
    unknown,
    Omit<DbHighlight, "filename">
  >,
  res: Response,
): void => {
  const { filename } = req.params;
  const h: DbHighlight = { ...req.body, filename };
  insertHighlight(h);
  res.status(201).json(h);
};

// DELETE /api/highlights/:id
export const removeHighlightHandler = (
  req: Request<{ id: string }>,
  res: Response,
): void => {
  deleteHighlight(req.params.id);
  res.status(204).end();
};

// POST /api/books/:filename/threads — create a thread
export const createThread = (
  req: Request<
    { filename: string },
    unknown,
    {
      id: string;
      title: string;
      anchor: { text: string } | null;
      chapterIndex: number | null;
    }
  >,
  res: Response,
): void => {
  const { filename } = req.params;
  insertThread({ ...req.body, filename });
  res.status(201).json({ ok: true });
};

// DELETE /api/threads/:id
export const removeThreadHandler = (
  req: Request<{ id: string }>,
  res: Response,
): void => {
  deleteThread(req.params.id);
  res.status(204).end();
};

// POST /api/threads/:id/messages — append a message
export const createMessage = (
  req: Request<{ id: string }, unknown, DbMessage>,
  res: Response,
): void => {
  appendMessage(req.params.id, req.body);
  res.status(201).json({ ok: true });
};

// DELETE /api/threads/:id/messages — clear all messages in the thread
export const clearThreadMessages = (
  req: Request<{ id: string }>,
  res: Response,
): void => {
  clearMessages(req.params.id);
  res.status(204).end();
};

// DELETE /api/threads/:id/messages/last — pop the most recent message
export const removeLastMessageHandler = (
  req: Request<{ id: string }>,
  res: Response,
): void => {
  removeLastMessage(req.params.id);
  res.status(204).end();
};
