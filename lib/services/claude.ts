import Anthropic from "@anthropic-ai/sdk";
import type { BookJsonData } from "@/shared/api";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_JSON_CONTEXT_CHARS = 1_000_000;

const SPOILER_SAFE_SYSTEM = `You are a reading companion analyzing a book the user is currently reading. The book JSON you receive contains ONLY the chapters the user has already read; later chapters have been deliberately withheld to prevent spoilers.

Strict rules:
- Treat the provided chapters as the entire book the reader has access to. Do not draw on outside knowledge of this book to answer questions about plot, characters, themes, or events that occur later than what is provided.
- If the user asks about something not yet covered in the provided chapters, respond: "I can't answer that without spoiling what's ahead — try asking again once you've read further." Do not hint at, foreshadow, or partially reveal what happens later.
- Do not speculate about endings, twists, or character fates beyond the provided text.
- Otherwise, be a thoughtful, concise companion: discuss what's actually on the page, reference chapter titles or IDs where helpful, and engage with the user's interpretation.`;

export async function* getClaudeStream(
  bookJsonData: BookJsonData,
  selectedText: string | undefined,
  query: string,
  readingPosition?: string,
): AsyncIterable<string> {
  let bookContextString = JSON.stringify(bookJsonData);
  let truncationNote = "";
  if (bookContextString.length > MAX_JSON_CONTEXT_CHARS) {
    bookContextString = bookContextString.substring(0, MAX_JSON_CONTEXT_CHARS);
    truncationNote = " (Note: book context was truncated due to length.)";
  }

  // Opus 5.5 always thinks (thinking can't be disabled); effort is the depth
  // control. `low` keeps chat replies quick. max_tokens covers thinking too.
  // `fallbacks: "default"` reruns a safety-classifier refusal on a fallback
  // model inside the same call.
  const stream = anthropic.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SPOILER_SAFE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Book read so far (JSON):\n\`\`\`json\n${bookContextString}\n\`\`\`${truncationNote}`,
            cache_control: { type: "ephemeral" },
          },
          ...(readingPosition
            ? [{ type: "text" as const, text: readingPosition }]
            : []),
          {
            type: "text",
            text: selectedText
              ? `Selected snippet from the current chapter:\n\`\`\`\n${selectedText}\n\`\`\``
              : "No specific snippet selected.",
          },
          { type: "text", text: `Question: ${query}` },
        ],
      },
    ],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }

  // Surface usage for debugging cache/cost.
  try {
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") {
      yield "\n\n[The model declined to answer this one.]";
    }
    const u = final.usage;
    console.log(
      `[claude.stream] usage — input: ${u.input_tokens}, cache_read: ${u.cache_read_input_tokens}, cache_create: ${u.cache_creation_input_tokens}, output: ${u.output_tokens}, model: ${final.model}`,
    );
  } catch {
    // Best-effort; finalMessage can throw if the consumer broke off early.
  }
}
