import OpenAI from "openai";
import "dotenv/config";
import type { BookJsonData } from "@/shared/api";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_JSON_CONTEXT_CHARS = 1_000_000;

const SYSTEM_PROMPT = (truncationMessage: string) => `You are a reading companion analyzing a book the user is currently reading. The book JSON you receive contains ONLY the chapters the user has already read; later chapters have been deliberately withheld to prevent spoilers.

Strict rules:
- Treat the provided chapters as the entire book the reader has access to. Do not draw on outside knowledge of this book to answer questions about plot, characters, themes, or events that occur later than what is provided.
- If the user asks about something not yet covered in the provided chapters, respond: "I can't answer that without spoiling what's ahead — try asking again once you've read further." Do not hint at, foreshadow, or partially reveal what happens later.
- Do not speculate about endings, twists, or character fates beyond the provided text.
- Otherwise, be a thoughtful, concise companion: discuss what's actually on the page, reference chapter titles or IDs where helpful, and engage with the user's interpretation.${truncationMessage}`;

interface PreparedContext {
  bookContextString: string;
  truncationMessage: string;
}

function prepareContext(bookJsonData: BookJsonData): PreparedContext {
  let bookContextString = JSON.stringify(bookJsonData);
  let truncationMessage = "";
  if (bookContextString.length > MAX_JSON_CONTEXT_CHARS) {
    bookContextString = bookContextString.substring(0, MAX_JSON_CONTEXT_CHARS);
    truncationMessage =
      " (Note: The provided book JSON context was truncated due to length constraints.)";
  }
  return { bookContextString, truncationMessage };
}

export async function* getOpenAIStream(
  bookJsonData: BookJsonData,
  selectedText: string | undefined,
  query: string,
): AsyncIterable<string> {
  const { bookContextString, truncationMessage } = prepareContext(bookJsonData);

  const userInput = [
    {
      role: "user" as const,
      content: [
        {
          type: "input_text" as const,
          text: `Book JSON:\n\`\`\`json\n${bookContextString}\n\`\`\``,
        },
        {
          type: "input_text" as const,
          text: selectedText
            ? `Selected Snippet:\n\`\`\`\n${selectedText}\n\`\`\``
            : "No specific snippet selected.",
        },
        { type: "input_text" as const, text: `Query: ${query}` },
      ],
    },
  ];

  const stream = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: userInput,
    instructions: SYSTEM_PROMPT(truncationMessage),
    max_output_tokens: 4096,
    temperature: 0.5,
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      const delta = (event as { delta?: string }).delta;
      if (typeof delta === "string" && delta.length > 0) {
        yield delta;
      }
    }
  }
}
