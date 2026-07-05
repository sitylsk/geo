import path from "path";
import os from "os";

/**
 * Where runtime data (the submissions JSON + uploaded screenshots) lives.
 *
 * On a normal server / local dev we keep everything inside the project so it's
 * easy to inspect. On serverless platforms (Vercel, etc.) the project
 * filesystem is read-only — only the OS temp dir is writable — so we fall back
 * to a writable location there.
 *
 * NOTE: On serverless the temp dir is ephemeral and per-instance, so
 * submissions are not durable across cold starts / instances. For production
 * persistence, swap this file store for a database + object storage
 * (e.g. Vercel Postgres/KV + Vercel Blob).
 */
const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY,
);

const BASE_DIR = isServerless ? path.join(os.tmpdir(), "mobilethon-hub") : process.cwd();

export const DATA_DIR = path.join(BASE_DIR, "data");
export const DB_FILE = path.join(DATA_DIR, "submissions.json");
export const UPLOAD_DIR = isServerless
  ? path.join(BASE_DIR, "uploads")
  : path.join(process.cwd(), "public", "uploads");
