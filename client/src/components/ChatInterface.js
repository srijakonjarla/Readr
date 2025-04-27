import React, { useState } from 'react';

const ChatInterface = ({ selectedText, filename }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      alert('Please enter a question.');
      return;
    }
    
    if (!filename) {
      alert('No book is currently loaded. Cannot process chat query.');
      console.error('[handleChatQuerySubmit] filename is missing.');
      return;
    }

    setLoading(true);
    setResponse('Asking AI... (processing book structure)');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          context: selectedText,
          filename: filename
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Error submitting chat query:', error);
      setResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-interface">
      <h4>Ask about the text:</h4>
      <div className="selected-text-preview">
        {selectedText ? (
          <blockquote>{selectedText}</blockquote>
        ) : (
          <p><i>Select text in the chapter above to provide context...</i></p>
        )}
      </div>
      <form onSubmit={handleSubmit}>
        <textarea
          id="chatQueryInput"
          rows="3"
          placeholder="Enter your question here..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button 
          type="submit" 
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Ask AI'}
        </button>
      </form>
      <div className="chat-response">
        {response && response.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            <br />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ChatInterface;