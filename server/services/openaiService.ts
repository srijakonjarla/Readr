import OpenAI from 'openai';
import 'dotenv/config';
import type { BookJsonData, ChatResponse } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_JSON_CONTEXT_CHARS = 1_000_000;

class OpenAIService {
  async getChatResponse(
    bookJsonData: BookJsonData,
    selectedText: string | undefined,
    query: string
  ): Promise<ChatResponse> {
    console.log(
      `[openaiService.getChatResponse] Received book JSON. Chapters: ${bookJsonData.chapters?.length || 0}`
    );
    console.log(
      `[openaiService.getChatResponse] Selected text length: ${selectedText ? selectedText.length : 0}`
    );
    console.log(`[openaiService.getChatResponse] Query: "${query}"`);

    let bookContextString = '';
    let truncationMessage = '';
    try {
      bookContextString = JSON.stringify(bookJsonData);
      if (bookContextString.length > MAX_JSON_CONTEXT_CHARS) {
        bookContextString = bookContextString.substring(0, MAX_JSON_CONTEXT_CHARS);
        truncationMessage = ' (Note: The provided book JSON context was truncated due to length constraints.)';
        console.warn(
          `[openaiService.getChatResponse] Truncated book JSON string to ${MAX_JSON_CONTEXT_CHARS} characters.`
        );
      }
    } catch (stringifyError) {
      console.error('[openaiService.getChatResponse] Error stringifying book JSON:', stringifyError);
      throw new Error('Failed to prepare book data for AI.');
    }

    try {
      const systemInstructions = `You are a reading companion analyzing a book the user is currently reading. The book JSON you receive contains ONLY the chapters the user has already read; later chapters have been deliberately withheld to prevent spoilers.

Strict rules:
- Treat the provided chapters as the entire book the reader has access to. Do not draw on outside knowledge of this book to answer questions about plot, characters, themes, or events that occur later than what is provided.
- If the user asks about something not yet covered in the provided chapters, respond: "I can't answer that without spoiling what's ahead — try asking again once you've read further." Do not hint at, foreshadow, or partially reveal what happens later.
- Do not speculate about endings, twists, or character fates beyond the provided text.
- Otherwise, be a thoughtful, concise companion: discuss what's actually on the page, reference chapter titles or IDs where helpful, and engage with the user's interpretation.${truncationMessage}`;

      const userInput = [
        {
          role: 'user' as const,
          content: [
            { type: 'input_text' as const, text: `Book JSON:\n\`\`\`json\n${bookContextString}\n\`\`\`` },
            {
              type: 'input_text' as const,
              text: selectedText
                ? `Selected Snippet:\n\`\`\`\n${selectedText}\n\`\`\``
                : 'No specific snippet selected.',
            },
            { type: 'input_text' as const, text: `Query: ${query}` },
          ],
        },
      ];

      console.log('[openaiService.getChatResponse] Sending request to OpenAI API (/v1/responses)...');

      const response = await openai.responses.create({
        model: 'gpt-4.1-mini',
        input: userInput,
        instructions: systemInstructions,
        max_output_tokens: 500,
        temperature: 0.5,
      });

      console.log('[openaiService.getChatResponse] OpenAI API Response received.');

      const responseContent = response.output_text?.trim();

      if (!responseContent) {
        console.error('[openaiService.getChatResponse] OpenAI response missing output text.');
        throw new Error('Received an empty response from AI service.');
      }

      return { response: responseContent };
    } catch (error) {
      console.error('[openaiService.getChatResponse] Error calling OpenAI API for chat:', error);
      let errorMessage = 'Failed to get chat response from AI service.';
      if (error instanceof OpenAI.APIError) {
        errorMessage = `OpenAI Error: ${error.status} ${error.name} - ${error.message}`;
        console.error('OpenAI Error Details:', error.error, error.code, error.param, error.type);
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }
}

export default new OpenAIService();
