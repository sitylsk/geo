import Link from "next/link";
import Ticker from "@/components/Ticker";
import ProjectCard from "@/components/ProjectCard";
import { LogoMark, PlusIcon, CameraIcon, ArrowRightIcon } from "@/components/Icons";
import { listSubmissions } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Showcase() {
  const submissions = await listSubmissions();

  return (
    <main className="pb-24">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border-[2.5px] border-ink bg-clay text-paper brut-shadow-sm">
            <LogoMark />
          </span>
          <span className="text-lg font-bold tracking-tight">Mobilethon Hub</span>
        </Link>
        <Link
          href="/#submit"
          className="brut-press brut-focus inline-flex items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-clay px-4 py-2 text-sm font-bold text-paper"
        >
          <PlusIcon /> Submit project
        </Link>
      </header>

      <Ticker />

      <section className="mx-auto max-w-6xl px-5 pt-12">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-clay">
          The wall
        </span>
        <h1 className="mt-2 text-5xl font-bold tracking-tight sm:text-6xl">Showcase</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <Stat label="Projects" value={submissions.length} accent="bg-butter" />
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5">
        {submissions.length === 0 ? (
          <div className="brut-card p-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-sky-soft">
              <CameraIcon className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold">No submissions yet.</h2>
            <p className="mx-auto mt-2 max-w-sm text-ink-soft">
              Be the first to submit a project. Solo or team — the showcase is open.
            </p>
            <Link
              href="/#submit"
              className="brut-press brut-focus mt-6 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-clay px-6 py-3 font-bold text-paper"
            >
              Submit the first project <ArrowRightIcon />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {submissions.map((s, i) => (
              <ProjectCard key={s.id} submission={s} index={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border-[2.5px] border-ink px-5 py-3 brut-shadow-sm ${accent}`}
    >
      <span className="text-3xl font-bold tracking-tight">{value}</span>
      <span className="font-mono text-[0.7rem] font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}
