const OpenAI = require('openai');
require('dotenv').config(); // Ensure dotenv is configured

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_BOOK_CONTEXT_CHARS = 100000; // Limit book context (adjust as needed, ~25k tokens)

// Limit total JSON string length sent to OpenAI
const MAX_JSON_CONTEXT_CHARS = 100000; // Adjust as needed (~25k tokens)

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
  }

  async summarizeText(text) {
    if (!text) {
        throw new Error("No text provided to summarize.");
    }
    console.log("[openaiService.summarizeText] Summarizing text, length:", text.length);
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that summarizes text concisely." },
                { role: "user", content: `Please summarize the following text:\n\n${text}` }
            ],
            max_tokens: 150, // Adjust as needed
        });
        console.log("[openaiService.summarizeText] OpenAI API Response received.");
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error calling OpenAI API for summarization:", error);
        throw new Error("Failed to get summary from OpenAI."); // Throw a generic error
    }
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
        const messages = [
             // --- Updated System Prompt ---
             { role: "system", content: `You are a helpful assistant analyzing a book provided as a JSON object. The JSON contains 'metadata' and an array of 'chapters', where each chapter has an 'id', 'title', and 'content' (which may be truncated or null if loading failed). Use this JSON structure, along with any specific 'selected text' provided by the user, to answer their 'query'. Be concise and refer to chapter titles or IDs if helpful.${truncationMessage}` }
        ];

        // --- Updated User Prompt ---
        let userMessageContent = `Here is the book structure in JSON format:\n\n\`\`\`json\n${bookContextString}\n\`\`\`\n\n`;

        if (selectedText && selectedText.length > 0) {
            userMessageContent += `The user also selected this specific snippet from the text:\n\n\`\`\`\n${selectedText}\n\`\`\`\n\n`;
        } else {
            userMessageContent += `The user did not select a specific snippet.\n\n`;
        }

        userMessageContent += `Based on the provided book JSON and snippet (if any), please answer this question: ${query}`;

        messages.push({ role: "user", content: userMessageContent });

        console.log("[openaiService.getChatResponse] Sending request to OpenAI API...");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Ensure this model can handle potentially large JSON inputs
            messages: messages,
            max_tokens: 500, // Increased slightly for potentially more complex analysis
            temperature: 0.5,
        });

        console.log("[openaiService.getChatResponse] OpenAI API Response received.");
        const responseContent = completion.choices[0]?.message?.content?.trim();

        if (!responseContent) {
            console.error("[openaiService.getChatResponse] OpenAI response missing content.");
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