import Link from "next/link";
import Ticker from "@/components/Ticker";
import ProjectCard from "@/components/ProjectCard";
import ShowcaseTabs from "@/components/ShowcaseTabs";
import { LogoMark, PlusIcon, ArrowRightIcon } from "@/components/Icons";
import { listSubmissions } from "@/lib/store";
import { getWinnersConfig } from "@/lib/winners";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Winners — Mobilethon Hub",
  description: "The winning projects of the Mobilethon.",
};

export default async function Winners() {
  const [submissions, winners] = await Promise.all([listSubmissions(), getWinnersConfig()]);

  const byId = new Map(submissions.map((s) => [s.id, s]));
  const ranked = winners.entries
    .map((e) => ({ entry: e, submission: byId.get(e.id) }))
    .filter((x) => x.submission)
    .sort((a, b) => a.entry.rank - b.entry.rank);

  const winnersLive = winners.published && ranked.length > 0;

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
          The results
        </span>
        <h1 className="mt-2 flex items-center gap-3 text-5xl font-bold tracking-tight sm:text-6xl">
          <span aria-hidden>★</span> Winners
        </h1>
        <ShowcaseTabs active="winners" winnersLive={winnersLive} />
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5">
        {!winnersLive ? (
          <div className="brut-card p-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border-[2.5px] border-ink bg-butter text-3xl">
              ★
            </div>
            <h2 className="text-2xl font-bold">Winners haven&apos;t been announced yet.</h2>
            <p className="mx-auto mt-2 max-w-md text-ink-soft">
              Judging is underway. Once the results are in, the winning projects will appear right
              here. In the meantime, explore everything that was submitted.
            </p>
            <Link
              href="/showcase"
              className="brut-press brut-focus mt-6 inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-card px-6 py-3 font-bold"
            >
              Browse all projects <ArrowRightIcon />
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-8 max-w-2xl text-lg text-ink-soft">
              Congratulations to the standout projects of the Mobilethon — every one built on a
              phone.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ranked.map(({ entry, submission }, i) => (
                <ProjectCard
                  key={entry.id}
                  submission={submission!}
                  index={i}
                  award={entry.award}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
