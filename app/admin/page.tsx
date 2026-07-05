"use client";

import { useState } from "react";
import type { Submission } from "@/lib/types";
import type { WinnerEntry } from "@/lib/winners";

interface Row {
  submission: Submission;
  selected: boolean;
  award: string;
  rank: number;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [published, setPublished] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [timerStatus, setTimerStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [timerBusy, setTimerBusy] = useState(false);
  const [timerHours, setTimerHours] = useState(24);

  async function load() {
    setBusy(true);
    setStatus(null);
    try {
      const [subsRes, winRes] = await Promise.all([
        fetch("/api/submissions"),
        fetch("/api/winners"),
      ]);
      const subsData = await subsRes.json();
      const winData = await winRes.json();
      const submissions: Submission[] = subsData.submissions ?? [];
      const entries: WinnerEntry[] = winData.config?.entries ?? [];
      const entryById = new Map(entries.map((e) => [e.id, e]));

      setRows(
        submissions.map((s, i) => {
          const e = entryById.get(s.id);
          return {
            submission: s,
            selected: Boolean(e),
            award: e?.award ?? "",
            rank: e?.rank ?? i + 1,
          };
        }),
      );
      setPublished(Boolean(winData.config?.published));
      setLoaded(true);
    } catch {
      setStatus({ kind: "err", msg: "Failed to load data." });
    } finally {
      setBusy(false);
    }
  }

  function patch(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.submission.id === id ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    const entries: WinnerEntry[] = rows
      .filter((r) => r.selected)
      .map((r) => ({ id: r.submission.id, award: r.award.trim() || "Winner", rank: Number(r.rank) || 999 }));

    try {
      const res = await fetch("/api/winners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ published, entries }),
      });
      if (res.status === 401) {
        setStatus({ kind: "err", msg: "Unauthorized — check your admin token." });
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setStatus({ kind: "err", msg: d.error ?? "Failed to save." });
        return;
      }
      setStatus({
        kind: "ok",
        msg: `Saved. ${entries.length} winner(s), ${published ? "published" : "not published"}.`,
      });
    } catch {
      setStatus({ kind: "err", msg: "Network error." });
    } finally {
      setBusy(false);
    }
  }

  async function resetTimer(hours: number) {
    if (!token) {
      setTimerStatus({ kind: "err", msg: "Enter your admin token first." });
      return;
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      setTimerStatus({ kind: "err", msg: "Enter a valid number of hours." });
      return;
    }
    setTimerBusy(true);
    setTimerStatus(null);
    try {
      const res = await fetch("/api/deadline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hours }),
      });
      if (res.status === 401) {
        setTimerStatus({ kind: "err", msg: "Unauthorized — check your admin token." });
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTimerStatus({ kind: "err", msg: data.error ?? "Failed to reset timer." });
        return;
      }
      setTimerStatus({
        kind: "ok",
        msg: `Timer reset — closes ${new Date(data.deadlineIso).toLocaleString()}.`,
      });
    } catch {
      setTimerStatus({ kind: "err", msg: "Network error." });
    } finally {
      setTimerBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Admin · Choose winners</h1>
      <p className="mt-2 text-ink-soft">
        Enter your admin token, mark the winning projects, give each an award label and a rank,
        then publish.
      </p>

      <div className="brut-card mt-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
            Admin token
          </span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="paste ADMIN_TOKEN"
            className="brut-focus w-full rounded-xl border-[2.5px] border-ink bg-card px-4 py-3"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={busy || !token}
          className="brut-press brut-focus w-full rounded-xl border-[2.5px] border-ink bg-sky-soft px-6 py-3 font-bold disabled:opacity-50 sm:w-auto"
        >
          {busy && !loaded ? "Loading…" : "Load projects"}
        </button>
      </div>

      {status && (
        <div
          className={`brut-card mt-4 p-4 font-bold ${
            status.kind === "ok" ? "bg-sage-soft" : "bg-clay-soft"
          }`}
        >
          {status.msg}
        </div>
      )}

      <div className="brut-card mt-6 flex flex-col gap-4 p-5">
        <div>
          <p className="font-bold">Countdown timer</p>
          <p className="text-sm text-ink-soft">
            Sets the public countdown to close exactly this many hours from now — use this to
            correct it if it's showing the wrong time remaining.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              step="0.5"
              value={timerHours}
              onChange={(e) => setTimerHours(Number(e.target.value))}
              className="brut-focus w-24 rounded-lg border-[2px] border-ink bg-card px-3 py-2 text-base"
            />
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
              hours from now
            </span>
          </label>
          <button
            type="button"
            onClick={() => resetTimer(timerHours)}
            disabled={timerBusy || !token}
            className="brut-press brut-focus w-full shrink-0 rounded-xl border-[2.5px] border-ink bg-butter px-6 py-3 font-bold disabled:opacity-50 sm:w-auto"
          >
            {timerBusy ? "Updating…" : "Set countdown"}
          </button>
        </div>
      </div>
      {timerStatus && (
        <div
          className={`brut-card mt-3 p-4 font-bold ${
            timerStatus.kind === "ok" ? "bg-sage-soft" : "bg-clay-soft"
          }`}
        >
          {timerStatus.msg}
        </div>
      )}

      {loaded && (
        <>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-clay"
              />
              Publish winners (show them on the public page)
            </label>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="brut-press brut-focus w-full rounded-xl border-[2.5px] border-ink bg-clay px-6 py-3 font-bold text-paper disabled:opacity-50 sm:w-auto"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="mt-6 text-ink-soft">No submissions yet.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {rows.map((r) => (
                <div
                  key={r.submission.id}
                  className={`brut-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${
                    r.selected ? "bg-butter-soft" : ""
                  }`}
                >
                  <label className="flex flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={r.selected}
                      onChange={(e) => patch(r.submission.id, { selected: e.target.checked })}
                      className="h-5 w-5 accent-clay"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{r.submission.projectName}</span>
                      <span className="block truncate text-sm text-ink-soft">
                        {r.submission.name} · {r.submission.tagline}
                      </span>
                    </span>
                  </label>
                  <input
                    value={r.award}
                    onChange={(e) => patch(r.submission.id, { award: e.target.value })}
                    placeholder="Award (e.g. 1st Place)"
                    disabled={!r.selected}
                    className="brut-focus w-full rounded-lg border-[2px] border-ink bg-card px-3 py-2 text-base disabled:opacity-40 sm:w-44 sm:text-sm"
                  />
                  <input
                    type="number"
                    value={r.rank}
                    onChange={(e) => patch(r.submission.id, { rank: Number(e.target.value) })}
                    disabled={!r.selected}
                    aria-label="Rank"
                    className="brut-focus w-full rounded-lg border-[2px] border-ink bg-card px-3 py-2 text-base disabled:opacity-40 sm:w-20 sm:text-sm"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
