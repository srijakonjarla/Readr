import React, { useState, useEffect } from 'react';
import UploadSection from './components/UploadSection';
import LibrarySection from './components/LibrarySection';
import MetadataPreview from './components/MetadataPreview';
import ReaderSection from './components/ReaderSection';
import './App.css';

function App() {
  // State variables
  const [books, setBooks] = useState([]);
  const [currentBook, setCurrentBook] = useState(null);
  const [activeSection, setActiveSection] = useState('library');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Fetch books on component mount
  useEffect(() => {
    fetchBooks();
  }, []);

  // Apply dark mode to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Fetch books from API
  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBooks(data);
      
      // Show appropriate section based on books
      if (data.length === 0) {
        setActiveSection('upload');
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setActiveSection('upload');
    }
  };

  // Handle book upload
  const handleUploadSuccess = () => {
    fetchBooks();
    setActiveSection('library');
  };

  // Handle book selection from library
  const handleBookSelect = (book) => {
    setCurrentBook(book);
    setActiveSection('preview');
  };

  // Handle open book
  const handleOpenBook = () => {
    setActiveSection('reader');
  };

  // Handle back to library
  const handleBackToLibrary = () => {
    setActiveSection('library');
    setCurrentBook(null);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  return (
    <div className="container">
      <h1>EPUB Reader</h1>

      {activeSection === 'upload' && (
        <UploadSection onUploadSuccess={handleUploadSuccess} />
      )}

      {activeSection === 'library' && (
        <LibrarySection 
          books={books} 
          onBookSelect={handleBookSelect} 
          onUploadSuccess={handleUploadSuccess} 
        />
      )}

      {activeSection === 'preview' && currentBook && (
        <MetadataPreview 
          book={currentBook} 
          onOpenBook={handleOpenBook}
          onBackToLibrary={handleBackToLibrary}
        />
      )}

      {activeSection === 'reader' && currentBook && (
        <ReaderSection 
          book={currentBook} 
          onBackToLibrary={handleBackToLibrary}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
        />
      )}
    </div>
  );
}

export default App;