"use client";

import { useEffect, useMemo, useState } from "react";
import Field from "./Field";
import ScreenshotSlot from "./ScreenshotSlot";
import { CheckIcon, ArrowRightIcon, CloseIcon } from "./Icons";

const SCREENSHOT_ACCENTS = ["bg-clay-soft", "bg-sage-soft", "bg-sky-soft"];

interface FormState {
  name: string;
  email: string;
  projectName: string;
  tagline: string;
  githubUrl: string;
  liveUrl: string;
  screenshots: (string | null)[];
}

const emptyState: FormState = {
  name: "",
  email: "",
  projectName: "",
  tagline: "",
  githubUrl: "",
  liveUrl: "",
  screenshots: [null, null, null],
};

export default function SubmissionForm() {
  const [state, setState] = useState<FormState>(emptyState);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ projectName: string; email: string } | null>(null);

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
      liveUrl: state.liveUrl.trim() || undefined,
      screenshots: state.screenshots.filter((s): s is string => Boolean(s)),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 413) {
        setErrors([
          "Your screenshots were too large to upload. Please re-add them and try again.",
        ]);
        scrollToTop();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(
          data.errors ?? [data.error ?? "Something went wrong. Please try again."],
        );
        scrollToTop();
        return;
      }
      setDone({ projectName: payload.projectName, email: payload.email });
      setState(emptyState);
    } catch {
      setErrors(["Network error — please check your connection and try again."]);
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToTop() {
    window.scrollTo({
      top: document.getElementById("submit")?.offsetTop ?? 0,
      behavior: "smooth",
    });
  }

  return (
    <>
      {done && <SuccessModal projectName={done.projectName} email={done.email} onClose={() => setDone(null)} />}
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
              type="url"
              placeholder="https://github.com/your-name/your-repo"
              value={state.githubUrl}
              onChange={(e) => update("githubUrl", e.target.value)}
              hint="Public repo so judges can browse your code."
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              id="liveUrl"
              label="Live link (optional)"
              type="url"
              placeholder="https://your-project.vercel.app"
              value={state.liveUrl}
              onChange={(e) => update("liveUrl", e.target.value)}
              hint="A live demo link (Vercel, Netlify, etc.) so judges can open your project directly."
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
    </>
  );
}

function SuccessModal({
  projectName,
  email,
  onClose,
}: {
  projectName: string;
  email: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const steps = [
    {
      n: "1",
      t: "It's live on the showcase",
      d: "Your project, repo and screenshots are now public on the wall.",
      a: "bg-sky-soft",
    },
    {
      n: "2",
      t: "Judges review every entry",
      d: "After the deadline, all submissions are reviewed and scored.",
      a: "bg-sage-soft",
    },
    {
      n: "3",
      t: "Winners get announced",
      d: "Results are posted on the Winners page — we'll reach out by email if you win.",
      a: "bg-butter-soft",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
      />
      <div className="brut-card animate-rise relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto p-7 sm:p-9">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="brut-focus absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] border-ink bg-card transition hover:bg-clay-soft"
        >
          <CloseIcon />
        </button>

        <div className="flex h-14 w-14 items-center justify-center rounded-full border-[2.5px] border-ink bg-sage-soft">
          <CheckIcon className="h-7 w-7" />
        </div>
        <h2 id="success-title" className="mt-5 text-3xl font-bold tracking-tight">
          You&apos;re in!
        </h2>
        <p className="mt-2 text-ink-soft">
          <span className="font-bold text-ink">{projectName}</span> has been submitted to the
          Mobilethon. A confirmation is tied to <span className="font-bold text-ink">{email}</span>.
        </p>

        <div className="mt-6">
          <p className="mb-3 font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
            What happens next
          </p>
          <ol className="flex flex-col gap-3">
            {steps.map((s) => (
              <li key={s.n} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[2.5px] border-ink font-mono text-sm font-bold ${s.a}`}
                >
                  {s.n}
                </span>
                <span>
                  <span className="block font-bold">{s.t}</span>
                  <span className="block text-sm text-ink-soft">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="/showcase"
            className="brut-press brut-focus inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-butter px-6 py-3 font-bold"
          >
            View the showcase <ArrowRightIcon />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-card px-6 py-3 font-bold"
          >
            Submit another
          </button>
        </div>
      </div>
    </div>
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
