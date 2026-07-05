import type { NewSubmissionInput, ParticipationMode, TeamMember } from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  value?: NewSubmissionInput;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_RE = /^https?:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/i;

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function validateSubmission(body: unknown): ValidationResult {
  const errors: string[] = [];
  const data = (body ?? {}) as Record<string, unknown>;

  const mode = asString(data.mode) as ParticipationMode;
  if (mode !== "solo" && mode !== "team") {
    errors.push("Choose whether you are hacking solo or as a team.");
  }

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

  let teamName: string | undefined;
  let teammates: TeamMember[] | undefined;
  if (mode === "team") {
    teamName = asString(data.teamName).trim();
    if (teamName.length < 2) errors.push("Please add a team name.");

    const rawMates = Array.isArray(data.teammates) ? data.teammates : [];
    teammates = rawMates
      .map((m) => {
        const mm = (m ?? {}) as Record<string, unknown>;
        return { name: asString(mm.name).trim(), email: asString(mm.email).trim() };
      })
      .filter((m) => m.name || m.email);

    for (const mate of teammates) {
      if (mate.email && !EMAIL_RE.test(mate.email)) {
        errors.push(`Teammate email "${mate.email}" is not valid.`);
      }
      if (mate.email && !mate.name) {
        errors.push("Each teammate needs a name.");
      }
    }
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
      mode,
      name,
      email,
      teamName,
      teammates,
      projectName,
      tagline,
      githubUrl,
      screenshots,
    },
  };
}
