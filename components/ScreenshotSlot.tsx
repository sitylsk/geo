"use client";

import { useRef } from "react";
import { CameraIcon } from "./Icons";

interface ScreenshotSlotProps {
  index: number;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  accentClass: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

export default function ScreenshotSlot({
  index,
  value,
  onChange,
  accentClass,
}: ScreenshotSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file (PNG, JPG, WEBP or GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      alert("That screenshot is larger than 5MB. Try a smaller one.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`brut-press brut-focus group relative flex aspect-[9/16] w-full items-center justify-center overflow-hidden rounded-[1.1rem] border-[2.5px] border-ink ${
          value ? "bg-card" : accentClass
        }`}
        aria-label={`Upload screenshot ${index + 1}`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`Screenshot ${index + 1} preview`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-2 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] border-ink bg-paper">
              <CameraIcon className="h-5 w-5" />
            </span>
            <span className="font-mono text-[0.68rem] font-bold uppercase tracking-widest text-ink">
              Shot {index + 1}
            </span>
            <span className="text-[0.62rem] text-ink-soft">Tap or drop</span>
          </div>
        )}

        {value && (
          <span className="absolute left-2 top-2 rounded-full border-[2px] border-ink bg-paper px-2 py-0.5 font-mono text-[0.65rem] font-bold">
            #{index + 1}
          </span>
        )}
      </button>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="brut-focus self-start rounded-full border-[2px] border-ink bg-paper px-3 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider transition hover:bg-clay-soft"
        >
          Replace / remove
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
