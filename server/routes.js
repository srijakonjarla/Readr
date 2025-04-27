
// import deps
const express = require('express');
const multer = require('multer');
const path = require('path');
const fileController = require('./controllers/fileController');
const openaiService = require('./services/openaiService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// SEtup API routes from nodejs exports, these will be called by the served frontend
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/files/:filename', fileController.getFile);
router.get('/epub/:filename/chapter/:chapterId', fileController.getEpubChapter);

// OpenAI routes
router.post('/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    const summary = await openaiService.summarizeText(text);
    return res.status(200).json({ summary });
  } catch (error) {
    console.error('Error summarizing text:', error);
    return res.status(500).json({ error: 'Failed to summarize text' });
  }
});

module.exports = router;