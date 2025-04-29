// import deps
const express = require('express');
const multer = require('multer');
const path = require('path');
const fileController = require('./controllers/fileController');
const openaiService = require('./services/openaiService');

const router = express.Router();

// TODO: use a real cloud database for this
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// API routes served by the nodejs server
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/files/:filename', fileController.getFile);
router.get('/epub/:filename/chapter/:chapterId', fileController.getEpubChapter);
router.get('/books', fileController.getBooks);
router.post('/chat', fileController.handleChatQuery);

module.exports = router;