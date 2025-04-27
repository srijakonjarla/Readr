const fs = require('fs').promises;
const fsSync = require('fs');
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

    if (!fsSync.existsSync(filePath)) {
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
    
    if (!fsSync.existsSync(filePath)) {
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

// Helper function to safely parse metadata for a single EPUB
const getEpubMetadata = (filePath, filename) => {
  return new Promise((resolve) => {
    // Check existence synchronously before creating EPub instance
    if (!fsSync.existsSync(filePath)) {
        console.warn(`[getEpubMetadata] File disappeared before parsing: ${filename}`);
        return resolve(null); // File doesn't exist or was removed
    }

    const epub = new EPub(filePath);
    let resolved = false; // Flag to prevent multiple resolves

    epub.on('error', (error) => {
      if (resolved) return;
      resolved = true;
      console.error(`[getEpubMetadata] Error parsing metadata for ${filename}:`, error.message);
      resolve(null); // Return null on error for this specific file
    });

    epub.on('end', () => {
      if (resolved) return;
      resolved = true;
      console.log(`[getEpubMetadata] Successfully parsed metadata for ${filename}`);
      resolve({
        filename: filename,
        metadata: epub.metadata || { title: filename } // Provide fallback title
      });
    });

    // Add a timeout in case parsing hangs indefinitely
    const timeoutId = setTimeout(() => {
        if (resolved) return;
        resolved = true;
        console.warn(`[getEpubMetadata] Parsing timed out for ${filename}`);
        resolve(null);
    }, 10000); // 10 second timeout

    try {
        console.log(`[getEpubMetadata] Starting parse for ${filename}`);
        epub.parse();
    } catch (parseError) {
        if (resolved) return;
        resolved = true;
        console.error(`[getEpubMetadata] Caught synchronous error during parse init for ${filename}:`, parseError.message);
        clearTimeout(timeoutId); // Clear timeout if sync error occurs
        resolve(null);
    }
  });
};

exports.getBooks = async (req, res) => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  console.log(`[getBooks] Reading directory: ${uploadsDir}`);

  try {
    const files = await fs.readdir(uploadsDir);
    const epubFiles = files.filter(file => file.toLowerCase().endsWith('.epub'));
    console.log(`[getBooks] Found EPUB files:`, epubFiles);

    if (epubFiles.length === 0) {
      console.log(`[getBooks] No EPUB files found.`);
      return res.json([]); // Return empty array if no epubs
    }

    // Process files concurrently
    const bookPromises = epubFiles.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      return getEpubMetadata(filePath, filename);
    });

    const booksData = await Promise.all(bookPromises);

    // Filter out any null results from failed parses/timeouts
    const validBooksData = booksData.filter(book => book !== null);

    console.log(`[getBooks] Returning metadata for ${validBooksData.length} books.`);
    res.json(validBooksData);

  } catch (error) {
    // Handle directory reading errors (e.g., directory doesn't exist)
    if (error.code === 'ENOENT') {
        console.warn(`[getBooks] Uploads directory not found: ${uploadsDir}. Returning empty list.`);
        // If the directory doesn't exist, it's expected on first run, return empty array
        return res.json([]);
    }
    // Handle other potential errors during directory read or processing
    console.error('[getBooks] Error listing books:', error);
    res.status(500).json({ error: 'Failed to list books' });
  }
};

