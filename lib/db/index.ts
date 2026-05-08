import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const globalForSql = globalThis as unknown as { __readrSql?: postgres.Sql };

export const sql: postgres.Sql =
  globalForSql.__readrSql ??
  (globalForSql.__readrSql = postgres(url, {
    prepare: false,
    idle_timeout: 20,
    max: 10,
  }));
