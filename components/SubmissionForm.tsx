"use client";

import { useMemo, useState } from "react";
import Field from "./Field";
import ScreenshotSlot from "./ScreenshotSlot";
import { CheckIcon, ArrowRightIcon } from "./Icons";

const SCREENSHOT_ACCENTS = ["bg-clay-soft", "bg-sage-soft", "bg-sky-soft"];

interface FormState {
  name: string;
  email: string;
  projectName: string;
  tagline: string;
  githubUrl: string;
  screenshots: (string | null)[];
}

const emptyState: FormState = {
  name: "",
  email: "",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);

    const payload = {
      name: state.name,
      email: state.email,
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
        window.scrollTo({
          top: document.getElementById("submit")?.offsetTop ?? 0,
          behavior: "smooth",
        });
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
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-sage-soft">
          <CheckIcon className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Submission received.</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          <span className="font-bold text-ink">{done.projectName}</span> has been submitted
          successfully. Your repository and screenshots are now on the showcase.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="/showcase"
            className="brut-press brut-focus inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-butter px-6 py-3 font-bold"
          >
            View the showcase <ArrowRightIcon />
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
      {/* STEP 1 — who */}
      <section className="mb-10">
        <StepHeader step="01" title="Your details" accent="bg-sky-soft" />
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
        </div>
      </section>

      {/* STEP 2 — project */}
      <section className="mb-10">
        <StepHeader step="02" title="Your project" accent="bg-sage-soft" />
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

      {/* STEP 3 — screenshots */}
      <section className="mb-10">
        <StepHeader step="03" title="Screenshots from your device" accent="bg-butter" />
        <p className="mb-4 mt-2 max-w-2xl text-sm text-ink-soft">
          Capture the app running on your phone or tablet. All three are required — for example, the
          home screen, a core feature, and a key result.
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
          <p className="mb-2 font-bold">Please resolve the following:</p>
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
          className="brut-press brut-focus inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border-[2.5px] border-ink bg-clay px-8 py-5 text-xl font-bold tracking-tight text-paper disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-16"
        >
          {submitting ? "Submitting…" : <>Submit to the Mobilethon <ArrowRightIcon className="h-5 w-5" /></>}
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
