import express from "express";
import multer from "multer";
import path from "path";
import * as fileController from "./controllers/fileController";

const router = express.Router();

// TODO: use a real cloud database for this
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), fileController.uploadFile);
router.get("/files/:filename", fileController.getFile);
router.get("/epub/:filename/chapter/:chapterId", fileController.getEpubChapter);
router.get("/epub/:filename/asset/:assetId", fileController.getEpubAsset);
router.get("/books", fileController.getBooks);
router.post("/chat", fileController.handleChatQuery);

export default router;
