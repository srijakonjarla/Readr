import { z } from "zod";

// EPUB filenames stored on disk are timestamp-prefixed user-provided names.
// Allow any printable name except path separators and parent traversal —
// real-world EPUB filenames contain commas, apostrophes, ampersands, etc.
const Filename = z
  .string()
  .min(1)
  .max(512)
  .regex(/\.epub$/i, { message: "filename must end with .epub" })
  .refine((s) => !/[\\/]/.test(s) && !s.split(/[\s_-]/).includes(".."), {
    message: "filename must not contain path separators or ..",
  })
  .refine((s) => !s.includes("\0"), { message: "filename must not contain NUL" });

// Manifest IDs from the EPUB are arbitrary but constrained to safe chars.
const SafeId = z
  .string()
  .min(1)
  .max(256)
  .regex(/^[A-Za-z0-9._\-:]+$/, {
    message: "id must be alphanumeric (with . _ - : allowed)",
  });

export const FileParams = z.object({ filename: Filename });

export const ChapterParams = z.object({
  filename: Filename,
  chapterId: SafeId,
});

export const AssetParams = z.object({
  filename: Filename,
  assetId: SafeId,
});

export const ChatBody = z.object({
  query: z.string().min(1).max(8000),
  context: z.string().max(20_000).optional(),
  filename: Filename,
  currentChapterIndex: z.number().int().min(0).max(10_000).optional(),
  provider: z.enum(["openai", "claude"]).default("openai"),
});

export type ChatBodyInput = z.infer<typeof ChatBody>;

const HighlightId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

export const HighlightIdParam = z.object({ id: HighlightId });

export const ThreadIdParam = z.object({ id: HighlightId });

export const HighlightBody = z.object({
  id: HighlightId,
  kind: z.enum(["highlight", "thread"]),
  chapterId: SafeId,
  chapterIndex: z.number().int().min(0).max(10_000),
  text: z.string().min(1).max(10_000),
  threadCount: z.number().int().min(0).optional(),
});

export const ThreadBody = z.object({
  id: HighlightId,
  title: z.string().min(1).max(200),
  anchor: z.object({ text: z.string().max(10_000) }).nullable(),
  chapterIndex: z.number().int().min(0).max(10_000).nullable(),
});

export const MessageBody = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().min(1).max(50_000),
  anchor: z.boolean().default(false),
});
