const axios = require('axios');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async summarizeText(text) {
    try {
      const response = await this.client.post('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant that summarizes book content.' },
          { role: 'user', content: `Summarize the following text in a concise manner: ${text}` }
        ],
        max_tokens: 500
      });
      
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error.response?.data || error.message);
      throw new Error('Failed to summarize text');
    }
  }
}

module.exports = new OpenAIService();