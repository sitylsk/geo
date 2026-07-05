"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
}

export default function Field({ label, hint, id, className = "", ...rest }: FieldProps) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.18em] text-ink-soft">
        {label}
      </span>
      <input
        id={id}
        className={`brut-focus w-full rounded-xl border-[2.5px] border-ink bg-card px-4 py-3 text-base text-ink placeholder:text-ink-soft/55 ${className}`}
        {...rest}
      />
      {hint ? <span className="text-xs text-ink-soft">{hint}</span> : null}
    </label>
  );
}
