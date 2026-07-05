"use client";

import { useEffect, useState } from "react";
import { ClockIcon } from "./Icons";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diffToParts(ms: number): TimeLeft {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function useCountdown() {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/deadline")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const t = new Date(d.deadlineIso).getTime();
        if (Number.isFinite(t)) {
          setDeadline(t);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ready = deadline !== null && now !== null;
  const parts = ready ? diffToParts(deadline! - now!) : null;
  const ended = ready ? deadline! - now! <= 0 : false;

  return { ready, failed, parts, ended };
}

export function CountdownBanner() {
  const { ready, failed, parts, ended } = useCountdown();
  if (failed) return null;

  return (
    <div className="brut-card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:justify-between sm:p-8 sm:text-left">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-soft">
          {ended ? "Mobilethon" : "Submissions close in"}
        </p>
        <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
          {ended ? "Time's up — thanks for building!" : "Every second counts. Ship it."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        {!ready ? (
          <>
            <DigitGroup value={null} label="Hrs" accent="bg-sky-soft" />
            <Colon />
            <DigitGroup value={null} label="Min" accent="bg-sage-soft" />
            <Colon />
            <DigitGroup value={null} label="Sec" accent="bg-clay-soft" />
          </>
        ) : ended ? (
          <span className="rounded-2xl border-[2.5px] border-ink bg-clay-soft px-5 py-3 font-mono text-lg font-bold">
            Closed
          </span>
        ) : (
          <>
            {parts!.days > 0 && (
              <>
                <DigitGroup value={parts!.days} label="Days" accent="bg-butter" />
                <Colon />
              </>
            )}
            <DigitGroup value={parts!.hours} label="Hrs" accent="bg-sky-soft" />
            <Colon />
            <DigitGroup value={parts!.minutes} label="Min" accent="bg-sage-soft" />
            <Colon />
            <DigitGroup value={parts!.seconds} label="Sec" accent="bg-clay-soft" />
          </>
        )}
      </div>
    </div>
  );
}

export function CountdownBadge() {
  const { ready, failed, parts, ended } = useCountdown();
  if (failed) return null;

  let label = "Loading…";
  if (ready) {
    if (ended) {
      label = "Submissions closed";
    } else {
      const days = parts!.days > 0 ? `${parts!.days}d ` : "";
      label = `${days}${pad(parts!.hours)}:${pad(parts!.minutes)}:${pad(parts!.seconds)} left`;
    }
  }

  return (
    <span className="brut-shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[2.5px] border-ink bg-card px-3 py-1.5 font-mono text-xs font-bold tabular-nums">
      <ClockIcon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

function DigitGroup({
  value,
  label,
  accent,
}: {
  value: number | null;
  label: string;
  accent: string;
}) {
  return (
    <div
      className={`flex min-w-[3.25rem] flex-col items-center justify-center rounded-2xl border-[2.5px] border-ink px-2.5 py-2 sm:min-w-[3.75rem] sm:px-3.5 sm:py-3 ${accent}`}
    >
      <span className="font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
        {value === null ? "--" : pad(value)}
      </span>
      <span className="mt-0.5 font-mono text-[0.58rem] font-bold uppercase tracking-widest text-ink/70">
        {label}
      </span>
    </div>
  );
}

function Colon() {
  return <span className="pb-4 text-xl font-bold text-ink-soft sm:text-2xl">:</span>;
}
