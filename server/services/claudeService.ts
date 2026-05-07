import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import type { BookJsonData, ChatResponse } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MAX_JSON_CONTEXT_CHARS = 1_000_000;

const SPOILER_SAFE_SYSTEM = `You are a reading companion analyzing a book the user is currently reading. The book JSON you receive contains ONLY the chapters the user has already read; later chapters have been deliberately withheld to prevent spoilers.

Strict rules:
- Treat the provided chapters as the entire book the reader has access to. Do not draw on outside knowledge of this book to answer questions about plot, characters, themes, or events that occur later than what is provided.
- If the user asks about something not yet covered in the provided chapters, respond: "I can't answer that without spoiling what's ahead — try asking again once you've read further." Do not hint at, foreshadow, or partially reveal what happens later.
- Do not speculate about endings, twists, or character fates beyond the provided text.
- Otherwise, be a thoughtful, concise companion: discuss what's actually on the page, reference chapter titles or IDs where helpful, and engage with the user's interpretation.`;

class ClaudeService {
  async getChatResponse(
    bookJsonData: BookJsonData,
    selectedText: string | undefined,
    query: string
  ): Promise<ChatResponse> {
    const chapterCount = bookJsonData.chapters?.length || 0;
    console.log(`[claudeService.getChatResponse] Chapters in context: ${chapterCount}`);
    console.log(
      `[claudeService.getChatResponse] Selected text length: ${selectedText ? selectedText.length : 0}`
    );
    console.log(`[claudeService.getChatResponse] Query: "${query}"`);

    let bookContextString: string;
    let truncationNote = '';
    try {
      bookContextString = JSON.stringify(bookJsonData);
      if (bookContextString.length > MAX_JSON_CONTEXT_CHARS) {
        bookContextString = bookContextString.substring(0, MAX_JSON_CONTEXT_CHARS);
        truncationNote = ' (Note: book context was truncated due to length.)';
        console.warn(
          `[claudeService.getChatResponse] Truncated book JSON to ${MAX_JSON_CONTEXT_CHARS} chars.`
        );
      }
    } catch (err) {
      console.error('[claudeService.getChatResponse] Failed to stringify book JSON:', err);
      throw new Error('Failed to prepare book data for AI.');
    }

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        thinking: { type: 'disabled' },
        system: SPOILER_SAFE_SYSTEM,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Book read so far (JSON):\n\`\`\`json\n${bookContextString}\n\`\`\`${truncationNote}`,
                cache_control: { type: 'ephemeral' },
              },
              {
                type: 'text',
                text: selectedText
                  ? `Selected snippet from the current chapter:\n\`\`\`\n${selectedText}\n\`\`\``
                  : 'No specific snippet selected.',
              },
              {
                type: 'text',
                text: `Question: ${query}`,
              },
            ],
          },
        ],
      });

      const usage = response.usage;
      console.log(
        `[claudeService.getChatResponse] usage — input: ${usage.input_tokens}, cache_read: ${usage.cache_read_input_tokens}, cache_create: ${usage.cache_creation_input_tokens}, output: ${usage.output_tokens}`
      );

      const textBlock = response.content.find((b) => b.type === 'text');
      const responseContent = textBlock && textBlock.type === 'text' ? textBlock.text.trim() : '';

      if (!responseContent) {
        console.error('[claudeService.getChatResponse] Empty response from Claude.');
        throw new Error('Received an empty response from AI service.');
      }

      return { response: responseContent };
    } catch (error) {
      console.error('[claudeService.getChatResponse] Error calling Claude API:', error);
      let errorMessage = 'Failed to get chat response from AI service.';
      if (error instanceof Anthropic.APIError) {
        errorMessage = `Claude Error: ${error.status} ${error.name} - ${error.message}`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }
}

export default new ClaudeService();
