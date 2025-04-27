const fs = require('fs');
const path = require('path');
const EPub = require('epub');

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    return res.status(200).json({ 
      message: 'File uploaded successfully',
      file: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
};

exports.getFile = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../uploads', req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Check if it's an EPUB file
    if (filePath.toLowerCase().endsWith('.epub')) {
      const epub = new EPub(filePath);
      
      epub.on('error', error => {
        console.error('Error parsing EPUB:', error);
        return res.status(500).json({ error: 'Failed to parse EPUB file' });
      });
      
      epub.on('end', () => {
        // Get the table of contents
        const toc = epub.toc.map(item => ({
          id: item.id,
          href: item.href,
          title: item.title
        }));
        
        return res.json({
          metadata: epub.metadata,
          toc: toc,
          filename: req.params.filename
        });
      });
      
      epub.parse();
    } else {
      return res.sendFile(filePath);
    }
  } catch (error) {
    console.error('Error retrieving file:', error);
    return res.status(500).json({ error: 'Failed to retrieve file' });
  }
};

exports.getEpubChapter = async (req, res) => {
  try {
    const { filename, chapterId } = req.params;
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const epub = new EPub(filePath);
    
    epub.on('error', error => {
      console.error('Error parsing EPUB:', error);
      return res.status(500).json({ error: 'Failed to parse EPUB file' });
    });
    
    epub.on('end', () => {
      epub.getChapter(chapterId, (error, text) => {
        if (error) {
          console.error('Error getting chapter:', error);
          return res.status(500).json({ error: 'Failed to get chapter' });
        }
        
        return res.send(text);
      });
    });
    
    epub.parse();
  } catch (error) {
    console.error('Error retrieving chapter:', error);
    return res.status(500).json({ error: 'Failed to retrieve chapter' });
  }
};