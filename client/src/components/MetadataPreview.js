import React, { useState, useEffect } from 'react';

const MetadataPreview = ({ book, onOpenBook, onBackToLibrary }) => {
  const [bookInfo, setBookInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/files/${book.filename}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setBookInfo(data);
      } catch (error) {
        console.error('Error fetching book details:', error);
        alert(`Error fetching book details: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [book]);

  if (loading) {
    return <div className="metadata-preview">Loading book details...</div>;
  }

  if (!bookInfo) {
    return (
      <div className="metadata-preview">
        <p>Failed to load book details.</p>
        <div className="open-book-controls">
          <button onClick={onBackToLibrary}>Back to Library</button>
        </div>
      </div>
    );
  }

  return (
    <div id="postUploadInfo">
      <div className="metadata-preview">
        <h4>{bookInfo.metadata?.title || 'Unknown Title'}</h4>
        <p><strong>Author:</strong> {bookInfo.metadata?.creator || 'Unknown Author'}</p>
        <p><strong>Publisher:</strong> {bookInfo.metadata?.publisher || 'Unknown Publisher'}</p>
        <p><i>{bookInfo.toc?.length || 0} chapter(s) found.</i></p>
      </div>
      <div className="open-book-controls">
        <button onClick={onOpenBook}>Open Book</button>
        <button onClick={onBackToLibrary}>Back to Library</button>
      </div>
    </div>
  );
};

export default MetadataPreview;