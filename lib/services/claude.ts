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
): AsyncIterable<string> {
  let bookContextString = JSON.stringify(bookJsonData);
  let truncationNote = "";
  if (bookContextString.length > MAX_JSON_CONTEXT_CHARS) {
    bookContextString = bookContextString.substring(0, MAX_JSON_CONTEXT_CHARS);
    truncationNote = " (Note: book context was truncated due to length.)";
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    thinking: { type: "disabled" },
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
    const u = final.usage;
    console.log(
      `[claude.stream] usage — input: ${u.input_tokens}, cache_read: ${u.cache_read_input_tokens}, cache_create: ${u.cache_creation_input_tokens}, output: ${u.output_tokens}`,
    );
  } catch {
    // Best-effort; finalMessage can throw if the consumer broke off early.
  }
}
