// --- Add these requires back at the top ---
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const EPub = require('epub');
const openaiService = require('../services/openaiService'); // This should already be there
// --- End requires ---

// --- Add these exported functions back ---

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
        // console.log(`[getFile] Raw epub.toc for ${filename}:`, JSON.stringify(epub.toc, null, 2));
        // console.log(`[getFile] Raw epub.flow for ${filename}:`, JSON.stringify(epub.flow, null, 2));

        let toc = [];
        const chapterSource = epub.flow && epub.flow.length > 0 ? epub.flow : epub.toc; // Prefer flow, fallback to toc

        if (chapterSource && chapterSource.length > 0) {
            console.log(`[getFile] Using ${epub.flow && epub.flow.length > 0 ? 'epub.flow' : 'epub.toc'} for TOC mapping.`);
            toc = chapterSource.map((item, index) => ({
              id: item.id,
              href: item.href, // Keep href for potential future use
              title: item.title || `Chapter ${index + 1} (ID: ${item.id})` // Ensure title exists
            }));
        } else {
            console.warn(`[getFile] Both epub.flow and epub.toc are empty or missing for ${filename}. No chapters can be listed.`);
        }


        // console.log(`[getFile] Final mapped toc for ${filename}:`, JSON.stringify(toc, null, 2));
        // console.log(`[getFile] Metadata for ${filename}:`, JSON.stringify(epub.metadata, null, 2));

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
      // For non-EPUBs, maybe just send metadata? Or decide on behavior.
      // For now, let's prevent sending raw files directly.
      return res.status(400).json({ error: 'Requested file is not an EPUB.' });
      // return res.sendFile(filePath); // Avoid sending arbitrary files
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
            // Try to find chapter by index if ID fails? Maybe too complex.
            res.status(500).json({ error: `Failed to get chapter content for ID: ${chapterId}` });
          }
          return;
        }

        console.log(`[getEpubChapter] Successfully retrieved chapter ID ${chapterId}. Content length: ${text ? text.length : 0}`);
        if (!text) {
            console.warn(`[getEpubChapter] Warning: Chapter ID ${chapterId} returned empty content.`);
        }

        if (!res.headersSent) {
            res.setHeader('Content-Type', 'text/html'); // Send as HTML
            return res.send(text || ""); // Send empty string if text is null/undefined
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
    let timeoutId = null; // Store timeout ID

    const resolveOnce = (data) => {
        if (resolved) return;
        resolved = true;
        if (timeoutId) clearTimeout(timeoutId); // Clear timeout if resolving normally
        resolve(data);
    };

    epub.on('error', (error) => {
      console.error(`[getEpubMetadata] Error parsing metadata for ${filename}:`, error.message);
      resolveOnce(null); // Return null on error for this specific file
    });

    epub.on('end', () => {
      console.log(`[getEpubMetadata] Successfully parsed metadata for ${filename}`);
      resolveOnce({
        filename: filename,
        metadata: epub.metadata || { title: filename } // Provide fallback title
      });
    });

    // Add a timeout in case parsing hangs indefinitely
    timeoutId = setTimeout(() => {
        console.warn(`[getEpubMetadata] Parsing timed out for ${filename}`);
        resolveOnce(null);
    }, 15000); // 15 second timeout

    try {
        console.log(`[getEpubMetadata] Starting parse for ${filename}`);
        epub.parse();
    } catch (parseError) {
        console.error(`[getEpubMetadata] Caught synchronous error during parse init for ${filename}:`, parseError.message);
        resolveOnce(null);
    }
  });
};

exports.getBooks = async (req, res) => {
  const uploadsDir = path.join(__dirname, '../../uploads');
  console.log(`[getBooks] Reading directory: ${uploadsDir}`);

  try {
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

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
    // Handle directory reading errors (e.g., permissions)
    console.error('[getBooks] Error listing books:', error);
    res.status(500).json({ error: 'Failed to list books' });
  }
};

// --- End added functions ---

// Limit characters per chapter to keep JSON size manageable
const MAX_CHARS_PER_CHAPTER_JSON = 5000;

const loadBookJsonStructure = (filePath) => {
    return new Promise((resolve, reject) => {
        console.log(`[loadBookJsonStructure] Loading JSON structure from: ${filePath}`);
        if (!fsSync.existsSync(filePath)) {
            console.error(`[loadBookJsonStructure] File not found: ${filePath}`);
            return reject(new Error('Book file not found.'));
        }

        const epub = new EPub(filePath);
        const bookJson = {
            metadata: null,
            chapters: []
        };
        let chaptersProcessed = 0;

        epub.on('error', (error) => {
            console.error(`[loadBookJsonStructure] EPUB parsing error:`, error);
            if (chaptersProcessed === 0) {
                 reject(new Error('Failed to parse EPUB file.'));
            } else {
                 console.warn("[loadBookJsonStructure] Resolving with potentially partial JSON structure due to later parsing error.");
                 resolve(bookJson); // Resolve with what we have (metadata + processed chapters)
            }
        });

        epub.on('end', () => {
            console.log(`[loadBookJsonStructure] EPUB metadata parsed. Flow length: ${epub.flow ? epub.flow.length : 0}`);
            bookJson.metadata = epub.metadata || {}; // Store metadata

            const chapterList = epub.flow || epub.toc || []; // Use flow, fallback to toc

            if (chapterList.length === 0) {
                console.warn("[loadBookJsonStructure] EPUB flow/toc is empty. No chapters to include in JSON.");
                return resolve(bookJson); // Resolve with metadata only
            }

            let chapterPromises = [];

            chapterList.forEach((chapterRef, index) => {
                chapterPromises.push(
                    new Promise((chapResolve) => { // Don't reject, just resolve with error info or null content
                        epub.getChapter(chapterRef.id, (error, text) => {
                            if (error) {
                                console.error(`[loadBookJsonStructure] Error getting chapter ID ${chapterRef.id}:`, error);
                                chapResolve({
                                    id: chapterRef.id,
                                    title: chapterRef.title || `Chapter ${index + 1} (Error Loading)`,
                                    content: null, // Indicate error
                                    error: error.message
                                });
                            } else {
                                // Basic HTML stripping & Truncation
                                let plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                                let truncated = false;
                                if (plainText.length > MAX_CHARS_PER_CHAPTER_JSON) {
                                    plainText = plainText.substring(0, MAX_CHARS_PER_CHAPTER_JSON) + "... (truncated)";
                                    truncated = true;
                                }
                                chapResolve({
                                    id: chapterRef.id,
                                    title: chapterRef.title || `Chapter ${index + 1}`,
                                    content: plainText,
                                    truncated: truncated
                                });
                            }
                        });
                    })
                );
            });

            Promise.all(chapterPromises)
                .then(chaptersData => {
                    bookJson.chapters = chaptersData; // Add chapter data array
                    console.log(`[loadBookJsonStructure] Finished processing ${chaptersData.length} chapters for JSON structure.`);
                    resolve(bookJson);
                })
                // This catch shouldn't be needed if individual promises don't reject
                // .catch(error => {
                //      console.error("[loadBookJsonStructure] Unexpected error during Promise.all for chapters:", error);
                //      reject(new Error("Failed to process all book chapters for JSON."));
                // });
        });

        console.log(`[loadBookJsonStructure] Starting EPUB parse...`);
        epub.parse();
    });
};
// --- End Helper Function ---

// Modified handler for chat queries
exports.handleChatQuery = async (req, res) => {
    const { query, context, filename } = req.body; // context is selectedText
    console.log(`[handleChatQuery] Received query: "${query}"`);
    console.log(`[handleChatQuery] Received selected text length: ${context ? context.length : 0}`);
    console.log(`[handleChatQuery] Received filename: ${filename}`);

    if (!query) return res.status(400).json({ error: 'No query provided' });
    if (!filename) return res.status(400).json({ error: 'No filename provided' });

    try {
        // --- Load Book as JSON Structure ---
        const filePath = path.join(__dirname, '../../uploads', filename);
        const bookJsonData = await loadBookJsonStructure(filePath); // Use the new function
        console.log(`[handleChatQuery] Loaded book JSON structure. Metadata keys: ${Object.keys(bookJsonData.metadata || {}).length}, Chapters: ${bookJsonData.chapters.length}`);

        // --- Call service with JSON data, selected text, and query ---
        const aiResponse = await openaiService.getChatResponse(bookJsonData, context, query);

        console.log("[handleChatQuery] Response from service received.");
        return res.status(200).json(aiResponse);

    } catch (error) {
        console.error('[handleChatQuery] Error processing chat query:', error);
        const errorMessage = error.message || 'Failed to process chat query';
        return res.status(500).json({ error: errorMessage });
    }
};

