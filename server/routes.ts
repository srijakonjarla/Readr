import express from "express";
import multer from "multer";
import path from "path";
import * as fileController from "./controllers/fileController";
import * as stateController from "./controllers/stateController";
import { validate } from "./middleware/validate";
import {
  AssetParams,
  ChapterParams,
  ChatBody,
  FileParams,
  HighlightBody,
  HighlightIdParam,
  MessageBody,
  ThreadBody,
  ThreadIdParam,
} from "./schemas";

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

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB cap per upload
  fileFilter: (_req, file, cb) => {
    if (!/\.epub$/i.test(file.originalname)) {
      cb(new Error("Only .epub files are accepted"));
      return;
    }
    cb(null, true);
  },
});

router.post("/upload", upload.single("file"), fileController.uploadFile);

router.get(
  "/files/:filename",
  validate({ params: FileParams }),
  fileController.getFile,
);

router.get(
  "/epub/:filename/chapter/:chapterId",
  validate({ params: ChapterParams }),
  fileController.getEpubChapter,
);

router.get(
  "/epub/:filename/asset/:assetId",
  validate({ params: AssetParams }),
  fileController.getEpubAsset,
);

router.get("/books", fileController.getBooks);

router.post(
  "/chat",
  validate({ body: ChatBody }),
  fileController.handleChatQuery,
);

// ─── Persistence (highlights, threads, messages) ─────────────────────────────
router.get(
  "/books/:filename/state",
  validate({ params: FileParams }),
  stateController.getBookState,
);

router.post(
  "/books/:filename/highlights",
  validate({ params: FileParams, body: HighlightBody }),
  stateController.createHighlight,
);

router.delete(
  "/highlights/:id",
  validate({ params: HighlightIdParam }),
  stateController.removeHighlightHandler,
);

router.post(
  "/books/:filename/threads",
  validate({ params: FileParams, body: ThreadBody }),
  stateController.createThread,
);

router.delete(
  "/threads/:id",
  validate({ params: ThreadIdParam }),
  stateController.removeThreadHandler,
);

router.post(
  "/threads/:id/messages",
  validate({ params: ThreadIdParam, body: MessageBody }),
  stateController.createMessage,
);

router.delete(
  "/threads/:id/messages",
  validate({ params: ThreadIdParam }),
  stateController.clearThreadMessages,
);

router.delete(
  "/threads/:id/messages/last",
  validate({ params: ThreadIdParam }),
  stateController.removeLastMessageHandler,
);

export default router;
