const OpenAI = require('openai');
require('dotenv').config(); // Ensure dotenv is configured

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const MAX_BOOK_CONTEXT_CHARS = 1000000; // Limit book context to 1 million tokens

// Limit total JSON string length sent to OpenAI
const MAX_JSON_CONTEXT_CHARS = 1000000; // Adjust to 1 million tokens

// TODO aditya add useful functionality to deeplink from the answer to the rest of the text.
// The user should feel like they can explore and understand the book, while fully respecting the sourcce. 
class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async getChatResponse(bookJsonData, selectedText, query) {
    console.log(`[openaiService.getChatResponse] Received book JSON. Chapters: ${bookJsonData?.chapters?.length || 0}`);
    console.log(`[openaiService.getChatResponse] Selected text length: ${selectedText ? selectedText.length : 0}`);
    console.log(`[openaiService.getChatResponse] Query: "${query}"`);

    // --- Stringify and potentially truncate the JSON context ---
    let bookContextString = "";
    let truncationMessage = "";
    try {
      bookContextString = JSON.stringify(bookJsonData);
      if (bookContextString.length > MAX_JSON_CONTEXT_CHARS) {
        bookContextString = bookContextString.substring(0, MAX_JSON_CONTEXT_CHARS);
        truncationMessage = ` (Note: The provided book JSON context was truncated due to length constraints.)`;
        console.warn(`[openaiService.getChatResponse] Truncated book JSON string to ${MAX_JSON_CONTEXT_CHARS} characters.`);
      }
    } catch (stringifyError) {
      console.error("[openaiService.getChatResponse] Error stringifying book JSON:", stringifyError);
      throw new Error("Failed to prepare book data for AI.");
    }

    try {
      // --- Prepare input for /v1/responses ---
      const systemInstructions = `You are a helpful assistant analyzing a book provided as a JSON object. The JSON contains 'metadata' and an array of 'chapters', where each chapter has an 'id', 'title', and 'content' (which may be truncated or null if loading failed). Use this JSON structure, along with any specific 'selected text' provided by the user, to answer their 'query'. Be concise and refer to chapter titles or IDs if helpful.${truncationMessage}`;

      // Structure the input as an array of message-like objects or a single string
      // Using an array might provide better structure for the model
      const userInput = [
        {
          role: "user", // Role is still relevant conceptually for structuring input
          content: [
            { type: "input_text", text: `Book JSON:\n\`\`\`json\n${bookContextString}\n\`\`\`` },
            { type: "input_text", text: selectedText ? `Selected Snippet:\n\`\`\`\n${selectedText}\n\`\`\`` : "No specific snippet selected." },
            { type: "input_text", text: `Query: ${query}` }
          ]
        }
      ];
      // --- End input preparation ---


      console.log("[openaiService.getChatResponse] Sending request to OpenAI API (/v1/responses)...");

      // --- Call the /v1/responses endpoint ---
      const response = await openai.responses.create({
        model: "gpt-4.1-mini", 
        input: userInput, 
        instructions: systemInstructions,
        max_output_tokens: 500, 
        temperature: 0.5,
      });

      console.log("[openaiService.getChatResponse] OpenAI API Response received.");

      // --- Extract response using output_text ---
      const responseContent = response.output_text?.trim();
      // --- End response extraction change ---

      if (!responseContent) {
        console.error("[openaiService.getChatResponse] OpenAI response missing output text.");
        // Log the full response for debugging if needed
        // console.error("[openaiService.getChatResponse] Full response:", JSON.stringify(response, null, 2));
        throw new Error("Received an empty response from AI service.");
      }

      return { response: responseContent };

    } catch (error) {
      console.error("[openaiService.getChatResponse] Error calling OpenAI API for chat:", error);
      let errorMessage = "Failed to get chat response from AI service.";
      if (error instanceof OpenAI.APIError) {
        errorMessage = `OpenAI Error: ${error.status} ${error.name} - ${error.message}`;
        console.error("OpenAI Error Details:", error.error, error.code, error.param, error.type);
      } else if (error.message) {
        errorMessage = error.message;
      }
      throw new Error(errorMessage);
    }
  }
}

module.exports = new OpenAIService();