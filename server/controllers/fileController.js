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
    const filename = req.params.filename;
    console.log(`[getFile] Requested file info for: ${filename}`);
    const filePath = path.join(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      console.error(`[getFile] File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    if (filePath.toLowerCase().endsWith('.epub')) {
      console.log(`[getFile] File is EPUB, attempting to parse: ${filePath}`);
      const epub = new EPub(filePath);

      epub.on('error', error => {
        console.error(`[getFile] EPUB parsing error for ${filename}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to parse EPUB file' });
        }
      });

      epub.on('end', () => {
        console.log(`[getFile] EPUB parsing finished for ${filename}.`);
        console.log(`[getFile] Raw epub.toc for ${filename}:`, JSON.stringify(epub.toc, null, 2));
        console.log(`[getFile] Raw epub.flow for ${filename}:`, JSON.stringify(epub.flow, null, 2));

        let toc = [];

        if (epub.toc && epub.toc.length > 0) {
            console.log(`[getFile] Using epub.toc for TOC mapping.`);
            toc = epub.toc.map(item => ({
              id: item.id,
              href: item.href,
              title: item.title || `Chapter (ID: ${item.id})`
            }));
        }
        else if (epub.flow && epub.flow.length > 0) {
            console.log(`[getFile] epub.toc is empty, using epub.flow as fallback for TOC.`);
            toc = epub.flow.map((item, index) => ({
              id: item.id,
              href: item.href,
              title: item.title || `Chapter ${index + 1} (ID: ${item.id})`
            }));
        } else {
            console.warn(`[getFile] Both epub.toc and epub.flow are empty or missing for ${filename}. No chapters can be listed.`);
        }

        console.log(`[getFile] Final mapped toc for ${filename}:`, JSON.stringify(toc, null, 2));
        console.log(`[getFile] Metadata for ${filename}:`, JSON.stringify(epub.metadata, null, 2));

        if (!toc || toc.length === 0) {
            console.warn(`[getFile] Warning: Final TOC is empty for ${filename}. Sending response without chapters.`);
        }

        if (!res.headersSent) {
            return res.json({
              metadata: epub.metadata,
              toc: toc,
              filename: filename
            });
        } else {
             console.warn(`[getFile] Headers already sent for ${filename}, could not send file info.`);
        }
      });

      console.log(`[getFile] Starting EPUB parse for ${filename}`);
      epub.parse();

    } else {
      console.log(`[getFile] File is not EPUB, sending raw file: ${filename}`);
      return res.sendFile(filePath);
    }
  } catch (error) {
    console.error('[getFile] General error:', error);
    if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to retrieve file info due to server error' });
    }
  }
};

exports.getEpubChapter = async (req, res) => {
  try {
    const { filename, chapterId } = req.params;
    console.log(`[getEpubChapter] Requested chapter: ID=${chapterId}, File=${filename}`);
    const filePath = path.join(__dirname, '../../uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`[getEpubChapter] File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }
    
    const epub = new EPub(filePath);
    
    epub.on('error', error => {
      console.error(`[getEpubChapter] EPUB parsing error for ${filename}:`, error);
      if (!res.headersSent) {
         res.status(500).json({ error: 'Failed to parse EPUB file on chapter request' });
      }
    });
    
    epub.on('end', () => {
      console.log(`[getEpubChapter] EPUB parsed successfully for chapter request: ${filename}`);
      epub.getChapter(chapterId, (error, text) => {
        if (error) {
          console.error(`[getEpubChapter] Error getting chapter content for ID ${chapterId}:`, error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to get chapter content' });
          }
          return;
        }

        console.log(`[getEpubChapter] Successfully retrieved chapter ID ${chapterId}. Content length: ${text ? text.length : 0}`);
        if (!text) {
            console.warn(`[getEpubChapter] Warning: Chapter ID ${chapterId} returned empty content.`);
        }

        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/html');
            return res.send(text);
        } else {
            console.warn(`[getEpubChapter] Headers already sent for chapter ID ${chapterId}, could not send content.`);
        }
      });
    });
    
    console.log(`[getEpubChapter] Starting EPUB parse for chapter request: ${filename}`);
    epub.parse();
  } catch (error) {
    console.error('[getEpubChapter] General error:', error);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to retrieve chapter due to server error' });
    }
  }
};

