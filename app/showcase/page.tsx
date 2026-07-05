import Link from "next/link";
import Ticker from "@/components/Ticker";
import ProjectCard from "@/components/ProjectCard";
import ShowcaseTabs from "@/components/ShowcaseTabs";
import { CountdownBadge } from "@/components/CountdownTimer";
import { LogoMark, PlusIcon, CameraIcon, ArrowRightIcon } from "@/components/Icons";
import { listSubmissions } from "@/lib/store";
import { getWinnersConfig } from "@/lib/winners";

export const dynamic = "force-dynamic";

export default async function Showcase() {
  const [submissions, winners] = await Promise.all([listSubmissions(), getWinnersConfig()]);
  const winnersLive = winners.published && winners.entries.length > 0;

  return (
    <main className="pb-24">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-[2.5px] border-ink bg-clay text-paper brut-shadow-sm sm:h-9 sm:w-9">
            <LogoMark />
          </span>
          <span className="truncate text-base font-bold tracking-tight sm:text-lg">
            Mobilethon Hub
          </span>
        </Link>
        <Link
          href="/#submit"
          className="brut-press brut-focus inline-flex shrink-0 items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-clay px-3 py-2 text-xs font-bold text-paper sm:px-4 sm:text-sm"
        >
          <PlusIcon /> <span className="sm:hidden">Submit</span><span className="hidden sm:inline">Submit project</span>
        </Link>
      </header>

      <Ticker />

      <section className="mx-auto max-w-6xl px-5 pt-12">
        <span className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-clay">
          The wall
        </span>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-6xl">Showcase</h1>
        <ShowcaseTabs active="showcase" winnersLive={winnersLive} />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Stat label="Projects" value={submissions.length} accent="bg-butter" />
          <CountdownBadge />
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
              Be the first to submit a project — the showcase is open.
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
