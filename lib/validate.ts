import type { NewSubmissionInput } from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value?: NewSubmissionInput;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/i;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function validateSubmission(body: unknown): ValidationResult {
  const errors: string[] = [];
  const data = (body ?? {}) as Record<string, unknown>;

  const name = asString(data.name).trim();
  if (name.length < 2) errors.push("Please add your name.");

  const email = asString(data.email).trim();
  if (!EMAIL_RE.test(email)) errors.push("Please add a valid email address.");

  const projectName = asString(data.projectName).trim();
  if (projectName.length < 2) errors.push("Please add a project name.");

  const tagline = asString(data.tagline).trim();
  if (tagline.length < 4) errors.push("Please add a short tagline for your project.");

  const githubUrl = asString(data.githubUrl).trim();
  if (!GITHUB_RE.test(githubUrl)) {
    errors.push("Please add a valid GitHub project URL (github.com/owner/repo).");
  }

  const liveUrl = asString(data.liveUrl).trim();
  if (liveUrl && !URL_RE.test(liveUrl)) {
    errors.push("Please add a valid live link URL (e.g. https://your-project.vercel.app).");
  }

  const screenshots = Array.isArray(data.screenshots)
    ? (data.screenshots.filter((s) => typeof s === "string") as string[])
    : [];
  if (screenshots.length !== 3) {
    errors.push("Please attach exactly 3 screenshots from your device.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    errors: [],
    value: {
      name,
      email,
      projectName,
      tagline,
      githubUrl,
      liveUrl: liveUrl || undefined,
      screenshots,
    },
  };
}
