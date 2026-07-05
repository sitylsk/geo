import crypto from "crypto";
import type { NewSubmissionInput, Submission } from "./types";
import {
  getSupabase,
  isSupabaseConfigured,
  SCREENSHOTS_BUCKET,
  SUBMISSIONS_TABLE,
} from "./supabase";

const DATA_URL_RE = /^data:(image\/(png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per screenshot

interface DecodedImage {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

function decodeDataUrl(dataUrl: string): DecodedImage {
  const match = DATA_URL_RE.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Screenshots must be PNG, JPG, WEBP or GIF images.");
  }
  const contentType = match[1];
  const buffer = Buffer.from(match[3], "base64");
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Each screenshot must be smaller than 5MB.");
  }
  return { buffer, contentType, ext: EXT_BY_MIME[contentType] ?? "png" };
}

interface SubmissionRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  project_name: string;
  tagline: string;
  github_url: string;
  live_url?: string | null;
  screenshots: string[] | null;
}

function rowToSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
    projectName: row.project_name,
    tagline: row.tagline,
    githubUrl: row.github_url,
    liveUrl: row.live_url ?? undefined,
    screenshots: row.screenshots ?? [],
  };
}

export async function listSubmissions(): Promise<Submission[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Stay resilient: if the table isn't set up yet (or a transient read
    // error occurs), render an empty list rather than crashing the page.
    console.error("listSubmissions failed:", error.message);
    return [];
  }
  return (data as SubmissionRow[]).map(rowToSubmission);
}

async function uploadScreenshot(
  id: string,
  index: number,
  dataUrl: string,
): Promise<string> {
  const supabase = getSupabase();
  const { buffer, contentType, ext } = decodeDataUrl(dataUrl);
  const objectPath = `${id}/${index + 1}.${ext}`;

  const { error } = await supabase.storage
    .from(SCREENSHOTS_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: true });

  if (error) {
    throw new Error(`Failed to upload screenshot: ${error.message}`);
  }

  const { data } = supabase.storage.from(SCREENSHOTS_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function createSubmission(input: NewSubmissionInput): Promise<Submission> {
  const supabase = getSupabase();
  const id = crypto.randomUUID();

  const screenshots: string[] = [];
  for (let i = 0; i < input.screenshots.length; i++) {
    screenshots.push(await uploadScreenshot(id, i, input.screenshots[i]));
  }

  const row: Record<string, unknown> = {
    id,
    name: input.name.trim(),
    email: input.email.trim(),
    project_name: input.projectName.trim(),
    tagline: input.tagline.trim(),
    github_url: input.githubUrl.trim(),
    screenshots,
  };
  // Only include live_url when provided, so submissions without one keep
  // working even before the `live_url` column migration has been applied.
  if (input.liveUrl) {
    row.live_url = input.liveUrl.trim();
  }

  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .insert(row)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save submission: ${error.message}`);
  }

  return rowToSubmission(data as SubmissionRow);
}
