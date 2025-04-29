import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './ChatInterface';

const ReaderSection = ({ book, onBackToLibrary, isDarkMode, toggleDarkMode }) => {
  // State variables
  const [bookInfo, setBookInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toc, setToc] = useState([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);
  const [chapterContent, setChapterContent] = useState('');
  const [fontSize, setFontSize] = useState(100);
  const [selectedText, setSelectedText] = useState('');
  const [progress, setProgress] = useState(0);

  // Refs
  const contentRef = useRef(null);

  // Fetch book details on component mount
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
        setToc(data.toc || []);
        
        // Load first chapter if available
        if (data.toc && data.toc.length > 0) {
          setCurrentChapterIndex(0);
        }
      } catch (error) {
        console.error('Error fetching book details:', error);
        alert(`Error fetching book details: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [book]);

  // Load chapter when chapter index changes
  useEffect(() => {
    if (currentChapterIndex >= 0 && toc[currentChapterIndex]) {
      loadChapter(toc[currentChapterIndex].id);
    }
  }, [currentChapterIndex, toc]);

  // Add event listener for text selection
  useEffect(() => {
    const handleTextSelection = () => {
      const selection = window.getSelection();
      setSelectedText(selection.toString().trim());
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('mouseup', handleTextSelection);
      contentElement.addEventListener('keyup', handleTextSelection);
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('mouseup', handleTextSelection);
        contentElement.removeEventListener('keyup', handleTextSelection);
      }
    };
  }, []);

  // Add event listener for scroll to update progress
  useEffect(() => {
    const updateReadingProgress = () => {
      const contentElement = contentRef.current;
      if (!contentElement || contentElement.scrollHeight <= contentElement.clientHeight) {
        setProgress(100);
        return;
      }
      
      const scrollTop = contentElement.scrollTop;
      const scrollHeight = contentElement.scrollHeight;
      const clientHeight = contentElement.clientHeight;
      const scrollableHeight = scrollHeight - clientHeight;
      const scrollPercentage = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 100;
      
      setProgress(Math.min(scrollPercentage, 100));
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('scroll', updateReadingProgress);
      // Initial progress update
      updateReadingProgress();
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', updateReadingProgress);
      }
    };
  }, [chapterContent]);

  // Load chapter content by chapter ID
  const loadChapter = async (chapterId) => {
    try {
      setChapterContent('<p><i>Loading chapter...</i></p>');
      
      const response = await fetch(`/api/epub/${book.filename}/chapter/${chapterId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      setChapterContent(html);
      
      // Reset scroll position
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } catch (error) {
      console.error('Error loading chapter:', error);
      setChapterContent(`<p>Error loading chapter content: ${error.message}</p>`);
    }
  };

  // Navigate to previous chapter
  const navigateToPrevChapter = () => {
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  // Navigate to next chapter
  const navigateToNextChapter = () => {
    if (toc && currentChapterIndex < toc.length - 1) {
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };

  // Change font size
  const changeFontSize = (delta) => {
    setFontSize(prev => Math.max(50, Math.min(200, prev + delta)));
  };

  if (loading) {
    return <div className="reader-section">Loading book...</div>;
  }

  if (!bookInfo) {
    return (
      <div className="reader-section">
        <p>Failed to load book.</p>
        <button onClick={onBackToLibrary}>Back to Library</button>
      </div>
    );
  }

  return (
    <div className="reader-section">
      <div className="toc">
        <h3>Table of Contents</h3>
        <div className="metadata">
          <h4>{bookInfo.metadata?.title || 'Unknown Title'}</h4>
          <p><strong>Author:</strong> {bookInfo.metadata?.creator || 'Unknown Author'}</p>
          <p><strong>Publisher:</strong> {bookInfo.metadata?.publisher || 'Unknown Publisher'}</p>
        </div>
        <ul>
          {toc.map((item, index) => (
            <li 
              key={item.id || index}
              onClick={() => setCurrentChapterIndex(index)}
              style={{
                fontWeight: index === currentChapterIndex ? 'bold' : 'normal',
                color: index === currentChapterIndex ? 
                  (isDarkMode ? '#7FFF7F' : '#4CAF50') : ''
              }}
            >
              {item.title || `Chapter ${index + 1}`}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="content-wrapper">
        <div className="controls">
          <button 
            onClick={navigateToPrevChapter}
            disabled={currentChapterIndex <= 0}
          >
            &lt; Prev
          </button>
          <div>
            <button onClick={() => changeFontSize(-10)}>A-</button>
            <button onClick={() => changeFontSize(10)}>A+</button>
            <button onClick={toggleDarkMode}>Toggle Theme</button>
          </div>
          <button 
            onClick={navigateToNextChapter}
            disabled={currentChapterIndex < 0 || !toc || currentChapterIndex >= toc.length - 1}
          >
            Next &gt;
          </button>
        </div>
        
        <div className="progress-bar">
          <div 
            className="progress-indicator"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <ChatInterface 
          selectedText={selectedText}
          filename={book.filename}
        />
        
        <div 
          className="content" 
          ref={contentRef}
          style={{ fontSize: `${fontSize}%` }}
          dangerouslySetInnerHTML={{ __html: chapterContent }}
        ></div>
      </div>
    </div>
  );
};

export default ReaderSection;