import { sql } from "./index";

export interface DbBook {
  userId: string;
  filename: string;
  blobUrl: string;
  blobPathname: string;
  title: string | null;
  author: string | null;
  sizeBytes: number | null;
  uploadedAt: number;
}

export interface DbChapter {
  filename: string;
  chapterId: string;
  idx: number;
  title: string | null;
  html: string;
}

export interface DbAsset {
  filename: string;
  assetId: string;
  mime: string;
  bytes: Buffer;
}

interface BookRow {
  user_id: string;
  filename: string;
  blob_url: string;
  blob_pathname: string;
  title: string | null;
  author: string | null;
  size_bytes: string | number | null;
  uploaded_at: string | number;
}

const rowToBook = (r: BookRow): DbBook => ({
  userId: r.user_id,
  filename: r.filename,
  blobUrl: r.blob_url,
  blobPathname: r.blob_pathname,
  title: r.title,
  author: r.author,
  sizeBytes: r.size_bytes === null ? null : Number(r.size_bytes),
  uploadedAt: Number(r.uploaded_at),
});

export async function insertBook(b: Omit<DbBook, "uploadedAt">): Promise<void> {
  await sql`
    INSERT INTO books (user_id, filename, blob_url, blob_pathname, title, author, size_bytes)
    VALUES (${b.userId}, ${b.filename}, ${b.blobUrl}, ${b.blobPathname}, ${b.title}, ${b.author}, ${b.sizeBytes})
  `;
}

export async function listBooks(userId: string): Promise<DbBook[]> {
  const rows = await sql<BookRow[]>`
    SELECT * FROM books WHERE user_id = ${userId} ORDER BY uploaded_at DESC
  `;
  return rows.map(rowToBook);
}

export async function getBook(
  userId: string,
  filename: string,
): Promise<DbBook | null> {
  const rows = await sql<BookRow[]>`
    SELECT * FROM books WHERE user_id = ${userId} AND filename = ${filename}
  `;
  return rows.length > 0 ? rowToBook(rows[0]) : null;
}

export async function deleteBook(
  userId: string,
  filename: string,
): Promise<void> {
  await sql`DELETE FROM books WHERE user_id = ${userId} AND filename = ${filename}`;
}

interface ChapterRow {
  filename: string;
  chapter_id: string;
  idx: number;
  title: string | null;
  html: string;
}

const rowToChapter = (r: ChapterRow): DbChapter => ({
  filename: r.filename,
  chapterId: r.chapter_id,
  idx: r.idx,
  title: r.title,
  html: r.html,
});

export async function insertChapters(chapters: DbChapter[]): Promise<void> {
  if (chapters.length === 0) return;
  const rows = chapters.map((c) => ({
    filename: c.filename,
    chapter_id: c.chapterId,
    idx: c.idx,
    title: c.title,
    html: c.html,
  }));
  await sql`
    INSERT INTO chapters ${sql(rows, "filename", "chapter_id", "idx", "title", "html")}
  `;
}

// Chapters and assets have no owner column of their own; they're scoped
// through the parent book.
export async function listChapters(
  userId: string,
  filename: string,
): Promise<DbChapter[]> {
  const rows = await sql<ChapterRow[]>`
    SELECT c.* FROM chapters c JOIN books b ON b.filename = c.filename
    WHERE b.user_id = ${userId} AND c.filename = ${filename} ORDER BY c.idx
  `;
  return rows.map(rowToChapter);
}

export async function getChapter(
  userId: string,
  filename: string,
  chapterId: string,
): Promise<DbChapter | null> {
  const rows = await sql<ChapterRow[]>`
    SELECT c.* FROM chapters c JOIN books b ON b.filename = c.filename
    WHERE b.user_id = ${userId} AND c.filename = ${filename}
      AND c.chapter_id = ${chapterId}
  `;
  return rows.length > 0 ? rowToChapter(rows[0]) : null;
}

interface AssetRow {
  filename: string;
  asset_id: string;
  mime: string;
  bytes: Buffer;
}

export async function insertAssets(assets: DbAsset[]): Promise<void> {
  if (assets.length === 0) return;
  const rows = assets.map((a) => ({
    filename: a.filename,
    asset_id: a.assetId,
    mime: a.mime,
    bytes: a.bytes,
  }));
  await sql`
    INSERT INTO assets ${sql(rows, "filename", "asset_id", "mime", "bytes")}
  `;
}

export async function getAsset(
  userId: string,
  filename: string,
  assetId: string,
): Promise<{ mime: string; bytes: Buffer } | null> {
  const rows = await sql<AssetRow[]>`
    SELECT a.* FROM assets a JOIN books b ON b.filename = a.filename
    WHERE b.user_id = ${userId} AND a.filename = ${filename}
      AND a.asset_id = ${assetId}
  `;
  if (rows.length === 0) return null;
  return { mime: rows[0].mime, bytes: rows[0].bytes };
}
