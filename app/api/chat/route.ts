import { ChatBody, parseOrError } from "@/lib/schemas";
import { loadBookJsonFromDb } from "@/lib/epub";
import { getOpenAIStream } from "@/lib/services/openai";
import { getClaudeStream } from "@/lib/services/claude";
import type { BookJsonData } from "@/shared/api";

export const runtime = "nodejs";
// Allow long-running streams (default is short for serverless); we run on the
// Node runtime so this just disables Next's per-request timeout.
export const maxDuration = 300;

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const validated = parseOrError(ChatBody, body);
  if (!validated.ok) return validated.response;
  const { query, context, filename, currentChapterIndex, provider } =
    validated.data;

  console.log(
    `[POST /api/chat] query="${query.slice(0, 60)}…" file=${filename} chapterIdx=${currentChapterIndex} provider=${provider}`,
  );

  // Load + spoiler-trim the book context.
  let trimmedBookJson: BookJsonData;
  try {
    const bookJsonData = await loadBookJsonFromDb(filename);
    const totalChapters = bookJsonData.chapters.length;
    const cutoff =
      typeof currentChapterIndex === "number" && currentChapterIndex >= 0
        ? Math.min(currentChapterIndex + 1, totalChapters)
        : totalChapters;
    trimmedBookJson = {
      metadata: bookJsonData.metadata,
      chapters: bookJsonData.chapters.slice(0, cutoff),
    };
    console.log(
      `[POST /api/chat] Trimmed to ${trimmedBookJson.chapters.length}/${totalChapters} chapters.`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load book";
    return Response.json({ error: message }, { status: 500 });
  }

  // Pipe the model's async-iterable text stream into a Web ReadableStream.
  const encoder = new TextEncoder();
  const tokenStream =
    provider === "claude"
      ? getClaudeStream(trimmedBookJson, context, query)
      : getOpenAIStream(trimmedBookJson, context, query);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of tokenStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Streaming failed";
        try {
          controller.enqueue(encoder.encode(`\n\n[Error: ${message}]`));
        } catch {
          // controller already errored
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
