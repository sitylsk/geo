import { getSupabase, isSupabaseConfigured } from "./supabase";

const CONFIG_BUCKET = "app-config";
const WINNERS_FILE = "winners.json";

export interface WinnerEntry {
  /** submission id */
  id: string;
  /** award label, e.g. "1st Place" or "Best UI" */
  award: string;
  /** display order (lower shows first) */
  rank: number;
}

export interface WinnersConfig {
  published: boolean;
  entries: WinnerEntry[];
}

const EMPTY: WinnersConfig = { published: false, entries: [] };

export async function getWinnersConfig(): Promise<WinnersConfig> {
  if (!isSupabaseConfigured()) return EMPTY;

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage.from(CONFIG_BUCKET).download(WINNERS_FILE);
    if (error || !data) return EMPTY;

    const text = await data.text();
    const parsed = JSON.parse(text) as Partial<WinnersConfig>;
    return {
      published: Boolean(parsed.published),
      entries: Array.isArray(parsed.entries)
        ? parsed.entries
            .filter((e): e is WinnerEntry => Boolean(e && typeof e.id === "string"))
            .map((e) => ({
              id: e.id,
              award: typeof e.award === "string" ? e.award : "Winner",
              rank: Number.isFinite(e.rank) ? Number(e.rank) : 999,
            }))
        : [],
    };
  } catch (err) {
    console.error("getWinnersConfig failed:", err);
    return EMPTY;
  }
}

export async function saveWinnersConfig(config: WinnersConfig): Promise<void> {
  const supabase = getSupabase();
  const clean: WinnersConfig = {
    published: Boolean(config.published),
    entries: (config.entries ?? [])
      .filter((e) => e && typeof e.id === "string" && e.id.trim())
      .map((e) => ({
        id: e.id.trim(),
        award: (e.award ?? "Winner").toString().trim() || "Winner",
        rank: Number.isFinite(e.rank) ? Number(e.rank) : 999,
      }))
      .sort((a, b) => a.rank - b.rank),
  };

  const body = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" });
  const { error } = await supabase.storage
    .from(CONFIG_BUCKET)
    .upload(WINNERS_FILE, body, { contentType: "application/json", upsert: true });

  if (error) {
    throw new Error(`Failed to save winners: ${error.message}`);
  }
}
