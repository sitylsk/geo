import { getSupabase, isSupabaseConfigured } from "./supabase";

const CONFIG_BUCKET = "app-config";
const DEADLINE_FILE = "deadline.json";
const DEFAULT_WINDOW_HOURS = 24;

interface DeadlineConfig {
  deadlineIso: string;
}

function defaultDeadlineIso(hours = DEFAULT_WINDOW_HOURS): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Returns the submission-deadline timestamp (ISO string), 24 hours out by
 * default. The first time this is read it's persisted to Supabase Storage so
 * the countdown stays fixed across page loads, redeploys, and serverless
 * instances — an organizer can reset it via resetDeadline().
 */
export async function getDeadlineIso(): Promise<string> {
  if (!isSupabaseConfigured()) {
    // No persistence available — best-effort rolling window.
    return defaultDeadlineIso();
  }

  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.storage.from(CONFIG_BUCKET).download(DEADLINE_FILE);
    if (!error && data) {
      const parsed = JSON.parse(await data.text()) as Partial<DeadlineConfig>;
      if (parsed.deadlineIso && !Number.isNaN(Date.parse(parsed.deadlineIso))) {
        return parsed.deadlineIso;
      }
    }
  } catch (err) {
    console.error("getDeadlineIso read failed:", err);
  }

  // First run (or an unreadable file): start a fresh countdown and persist it.
  const iso = defaultDeadlineIso();
  try {
    await writeDeadline(iso);
  } catch (err) {
    console.error("getDeadlineIso persist failed:", err);
  }
  return iso;
}

export async function resetDeadline(hours = DEFAULT_WINDOW_HOURS): Promise<string> {
  const iso = defaultDeadlineIso(hours);
  await writeDeadline(iso);
  return iso;
}

async function writeDeadline(iso: string): Promise<void> {
  const supabase = getSupabase();
  const body = new Blob([JSON.stringify({ deadlineIso: iso }, null, 2)], {
    type: "application/json",
  });
  const { error } = await supabase.storage
    .from(CONFIG_BUCKET)
    .upload(DEADLINE_FILE, body, { contentType: "application/json", upsert: true });

  if (error) {
    throw new Error(`Failed to save deadline: ${error.message}`);
  }
}
