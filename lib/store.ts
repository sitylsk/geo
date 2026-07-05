import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import type { NewSubmissionInput, Submission } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "submissions.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function readAll(): Promise<Submission[]> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Submission[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(rows: Submission[]): Promise<void> {
  await ensureDirs();
  await fs.writeFile(DB_FILE, JSON.stringify(rows, null, 2), "utf8");
}

const DATA_URL_RE = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per screenshot

/**
 * Persist a base64 data URL screenshot to /public/uploads and return its
 * public path. Throws on invalid or oversized images.
 */
async function saveScreenshot(dataUrl: string, id: string, index: number): Promise<string> {
  const match = DATA_URL_RE.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Screenshots must be PNG, JPG, WEBP or GIF images.");
  }
  const mime = match[1];
  const base64 = match[3];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Each screenshot must be smaller than 5MB.");
  }
  const ext = EXT_BY_MIME[mime] ?? "png";
  const fileName = `${id}-${index + 1}.${ext}`;
  await ensureDirs();
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), buffer);
  // Served via the /media route handler (works in dev & production, since
  // files added to /public after build are not served statically).
  return `/media/${fileName}`;
}

export async function listSubmissions(): Promise<Submission[]> {
  const rows = await readAll();
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createSubmission(input: NewSubmissionInput): Promise<Submission> {
  const id = crypto.randomUUID();

  const screenshots: string[] = [];
  for (let i = 0; i < input.screenshots.length; i++) {
    screenshots.push(await saveScreenshot(input.screenshots[i], id, i));
  }

  const submission: Submission = {
    id,
    createdAt: new Date().toISOString(),
    mode: input.mode,
    name: input.name.trim(),
    email: input.email.trim(),
    teamName: input.mode === "team" ? input.teamName?.trim() || undefined : undefined,
    teammates:
      input.mode === "team"
        ? (input.teammates ?? [])
            .map((m) => ({ name: m.name.trim(), email: m.email.trim() }))
            .filter((m) => m.name || m.email)
        : undefined,
    projectName: input.projectName.trim(),
    tagline: input.tagline.trim(),
    githubUrl: input.githubUrl.trim(),
    screenshots,
  };

  const rows = await readAll();
  rows.push(submission);
  await writeAll(rows);
  return submission;
}
