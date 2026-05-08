import express, { type ErrorRequestHandler } from "express";
import path from "path";
import fs from "fs";
import "dotenv/config";
import routes from "./routes";

const app = express();
const PORT = Number(process.env.PORT) || 5001;

const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.use("/api", routes);

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err instanceof Error ? err.stack : err);
  res.status(500).send("Something broke!");
};
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
