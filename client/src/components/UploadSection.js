import React, { useState, useRef } from 'react';

const UploadSection = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    
    const file = fileInputRef.current.files[0];
    if (!file) {
      alert('Please select a file first.');
      return;
    }

    setUploading(true);
    
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
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-section">
      <h2>Upload EPUB</h2>
      <form onSubmit={handleUpload}>
        <input 
          type="file" 
          ref={fileInputRef} 
          accept=".epub" 
        />
        <button 
          type="submit" 
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
};

export default UploadSection;