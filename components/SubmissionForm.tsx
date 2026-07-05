"use client";

import { useMemo, useState } from "react";
import type { ParticipationMode, TeamMember } from "@/lib/types";
import Field from "./Field";
import ScreenshotSlot from "./ScreenshotSlot";

const SCREENSHOT_ACCENTS = ["bg-clay-soft", "bg-sage-soft", "bg-sky-soft"];

interface FormState {
  mode: ParticipationMode | null;
  name: string;
  email: string;
  teamName: string;
  teammates: TeamMember[];
  projectName: string;
  tagline: string;
  githubUrl: string;
  screenshots: (string | null)[];
}

const emptyState: FormState = {
  mode: null,
  name: "",
  email: "",
  teamName: "",
  teammates: [{ name: "", email: "" }],
  projectName: "",
  tagline: "",
  githubUrl: "",
  screenshots: [null, null, null],
};

export default function SubmissionForm() {
  const [state, setState] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ projectName: string } | null>(null);

  const shotCount = useMemo(
    () => state.screenshots.filter(Boolean).length,
    [state.screenshots],
  );

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }

  function setScreenshot(index: number, dataUrl: string | null) {
    setState((s) => {
      const next = [...s.screenshots];
      next[index] = dataUrl;
      return { ...s, screenshots: next };
    });
  }

  function updateTeammate(index: number, patch: Partial<TeamMember>) {
    setState((s) => {
      const next = s.teammates.map((m, i) => (i === index ? { ...m, ...patch } : m));
      return { ...s, teammates: next };
    });
  }

  function addTeammate() {
    setState((s) => ({ ...s, teammates: [...s.teammates, { name: "", email: "" }] }));
  }

  function removeTeammate(index: number) {
    setState((s) => ({
      ...s,
      teammates: s.teammates.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (!state.mode) {
      setErrors(["Please choose solo or team to begin."]);
      return;
    }

    const payload = {
      mode: state.mode,
      name: state.name,
      email: state.email,
      teamName: state.mode === "team" ? state.teamName : undefined,
      teammates: state.mode === "team" ? state.teammates : undefined,
      projectName: state.projectName,
      tagline: state.tagline,
      githubUrl: state.githubUrl,
      screenshots: state.screenshots.filter((s): s is string => Boolean(s)),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? [data.error ?? "Something went wrong."]);
        window.scrollTo({ top: document.getElementById("submit")?.offsetTop ?? 0, behavior: "smooth" });
        return;
      }
      setDone({ projectName: payload.projectName });
      setState(emptyState);
    } catch {
      setErrors(["Network error — please try again."]);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="brut-card animate-rise mx-auto max-w-2xl p-8 text-center sm:p-12">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-sage-soft text-3xl">
          ✶
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">You&apos;re in the arena.</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          <span className="font-bold text-ink">{done.projectName}</span> has been submitted to the
          Mobilethon. Your screenshots and repo are on the board.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/showcase"
            className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-butter px-6 py-3 font-bold"
          >
            See the showcase →
          </a>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-card px-6 py-3 font-bold"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form id="submit" onSubmit={handleSubmit} className="mx-auto max-w-4xl">
      {/* STEP 1 — mode */}
      <section className="mb-10">
        <StepHeader step="01" title="How are you hacking?" accent="bg-clay-soft" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ModeCard
            active={state.mode === "solo"}
            onClick={() => update("mode", "solo")}
            emoji="🎧"
            title="Solo"
            desc="Just you, your device, and a wild idea."
            accent="bg-sky-soft"
          />
          <ModeCard
            active={state.mode === "team"}
            onClick={() => update("mode", "team")}
            emoji="🛰️"
            title="Team"
            desc="A crew building together. Add your squad below."
            accent="bg-sage-soft"
          />
        </div>
      </section>

      {/* STEP 2 — who */}
      <section className="mb-10">
        <StepHeader step="02" title="Who's shipping this?" accent="bg-sky-soft" />
        <div className="brut-card mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <Field
            id="name"
            label="Your name"
            placeholder="Ada Lovelace"
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
          />
          <Field
            id="email"
            label="Your email"
            type="email"
            placeholder="ada@mobilethon.dev"
            value={state.email}
            onChange={(e) => update("email", e.target.value)}
          />

          {state.mode === "team" && (
            <>
              <div className="sm:col-span-2">
                <Field
                  id="teamName"
                  label="Team name"
                  placeholder="The Null Pointers"
                  value={state.teamName}
                  onChange={(e) => update("teamName", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
                    Teammates
                  </span>
                  <button
                    type="button"
                    onClick={addTeammate}
                    className="brut-focus rounded-full border-[2px] border-ink bg-butter px-3 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider transition hover:-translate-y-0.5"
                  >
                    + Add teammate
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {state.teammates.map((mate, i) => (
                    <div
                      key={i}
                      className="grid gap-3 rounded-xl border-[2px] border-dashed border-ink/45 bg-paper/60 p-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <input
                        className="brut-focus rounded-lg border-[2px] border-ink bg-card px-3 py-2 text-sm"
                        placeholder="Teammate name"
                        value={mate.name}
                        onChange={(e) => updateTeammate(i, { name: e.target.value })}
                      />
                      <input
                        className="brut-focus rounded-lg border-[2px] border-ink bg-card px-3 py-2 text-sm"
                        placeholder="Teammate email"
                        type="email"
                        value={mate.email}
                        onChange={(e) => updateTeammate(i, { email: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => removeTeammate(i)}
                        className="brut-focus rounded-lg border-[2px] border-ink bg-clay-soft px-3 py-2 font-mono text-xs font-bold"
                        aria-label="Remove teammate"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* STEP 3 — project */}
      <section className="mb-10">
        <StepHeader step="03" title="Your project" accent="bg-sage-soft" />
        <div className="brut-card mt-5 grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <Field
            id="projectName"
            label="Project name"
            placeholder="PocketPilot"
            value={state.projectName}
            onChange={(e) => update("projectName", e.target.value)}
          />
          <Field
            id="tagline"
            label="One-line tagline"
            placeholder="Your co-pilot for the daily commute."
            value={state.tagline}
            onChange={(e) => update("tagline", e.target.value)}
          />
          <div className="sm:col-span-2">
            <Field
              id="githubUrl"
              label="GitHub project URL"
              placeholder="https://github.com/your-name/your-repo"
              value={state.githubUrl}
              onChange={(e) => update("githubUrl", e.target.value)}
              hint="Public repo so judges can browse your code."
            />
          </div>
        </div>
      </section>

      {/* STEP 4 — screenshots */}
      <section className="mb-10">
        <StepHeader step="04" title="3 shots from your device" accent="bg-butter" />
        <p className="mb-4 mt-2 max-w-2xl text-sm text-ink-soft">
          Capture the app running on your phone or tablet. All three are required — think home
          screen, a core feature, and a moment of delight.
        </p>
        <div className="brut-card p-6 sm:p-8">
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {[0, 1, 2].map((i) => (
              <ScreenshotSlot
                key={i}
                index={i}
                value={state.screenshots[i]}
                onChange={(url) => setScreenshot(i, url)}
                accentClass={SCREENSHOT_ACCENTS[i]}
              />
            ))}
          </div>
          <p className="mt-4 font-mono text-[0.7rem] font-bold uppercase tracking-widest text-ink-soft">
            {shotCount} / 3 attached
          </p>
        </div>
      </section>

      {errors.length > 0 && (
        <div className="brut-card animate-rise mb-6 border-clay bg-clay-soft/70 p-5">
          <p className="mb-2 font-bold">Almost — fix these first:</p>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="brut-press brut-focus w-full rounded-2xl border-[2.5px] border-ink bg-clay px-8 py-5 text-xl font-bold tracking-tight text-paper disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-16"
        >
          {submitting ? "Submitting…" : "Submit to the Mobilethon →"}
        </button>
        <p className="font-mono text-[0.7rem] uppercase tracking-widest text-ink-soft">
          You can submit again anytime before the deadline.
        </p>
      </div>
    </form>
  );
}

function StepHeader({ step, title, accent }: { step: string; title: string; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink font-mono text-sm font-bold brut-shadow-sm ${accent}`}
      >
        {step}
      </span>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  emoji,
  title,
  desc,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  title: string;
  desc: string;
  accent: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`brut-press brut-focus flex items-start gap-4 rounded-2xl border-[2.5px] border-ink p-5 text-left ${
        active ? accent : "bg-card"
      }`}
      aria-pressed={active}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink bg-paper text-2xl">
        {emoji}
      </span>
      <span>
        <span className="flex items-center gap-2 text-xl font-bold">
          {title}
          {active && (
            <span className="rounded-full border-[2px] border-ink bg-paper px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider">
              picked
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-ink-soft">{desc}</span>
      </span>
    </button>
  );
}
