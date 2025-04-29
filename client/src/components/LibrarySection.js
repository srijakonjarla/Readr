import React, { useRef } from 'react';

const LibrarySection = ({ books, onBookSelect, onUploadSuccess }) => {
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    
    const file = fileInputRef.current.files[0];
    if (!file) {
      alert('Please select a file first.');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      await response.json();
      
      // Clear the input field after successful upload
      fileInputRef.current.value = '';
      
      // Notify parent component of successful upload
      onUploadSuccess();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error uploading file: ${error.message}`);
    }
  };

  return (
    <div className="library-section">
      <h2>My Library</h2>
      {books.length > 0 ? (
        <ul id="bookList">
          {books.map((book, index) => (
            <li key={book.filename || index}>
              <span>
                {book.metadata?.title || book.filename}
                {book.metadata?.creator && ` by ${book.metadata.creator}`}
              </span>
              <button onClick={() => onBookSelect(book)}>Open</button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Your library is empty. Upload an EPUB to get started!</p>
      )}
      
      <div className="library-upload-controls">
        <hr />
        <p>Or upload a new book:</p>
        <form onSubmit={handleUpload}>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".epub" 
          />
          <button type="submit">Upload</button>
        </form>
      </div>
    </div>
  );
};

export default LibrarySection;