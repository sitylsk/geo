import Link from "next/link";
import Ticker from "@/components/Ticker";
import SubmissionForm from "@/components/SubmissionForm";
import { listSubmissions } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const submissions = await listSubmissions();
  const count = submissions.length;

  return (
    <main className="pb-24">
      {/* top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border-[2.5px] border-ink bg-clay text-paper brut-shadow-sm">
            ▲
          </span>
          <span className="text-lg font-bold tracking-tight">Mobilethon Hub</span>
        </Link>
        <Link
          href="/showcase"
          className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-card px-4 py-2 text-sm font-bold"
        >
          Showcase{count > 0 ? ` · ${count}` : ""}
        </Link>
      </header>

      <Ticker />

      {/* hero */}
      <section className="mx-auto max-w-6xl px-5 pt-12 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-sage-soft px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-widest brut-shadow-sm">
              <span className="h-2 w-2 rounded-full bg-clay" /> Submissions open
            </span>
            <h1 className="mt-5 text-5xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
              Build it on
              <br />
              <span className="text-clay">mobile.</span> Ship it
              <br />
              <span className="text-sky">loud.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              The Mobilethon is a mobile-first build sprint. Go solo or rally a team, hack your
              idea into a real app, then drop your GitHub repo and three on-device screenshots
              right here.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#submit"
                className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-clay px-7 py-3.5 text-base font-bold text-paper"
              >
                Submit your project →
              </a>
              <Link
                href="/showcase"
                className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-card px-7 py-3.5 text-base font-bold"
              >
                Browse the wall
              </Link>
            </div>
          </div>

          {/* floating stat stack */}
          <div className="relative mx-auto hidden w-full max-w-sm lg:block">
            <div className="brut-card animate-floaty rotate-[-1.5deg] p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
                On the board
              </p>
              <p className="mt-1 text-6xl font-bold tracking-tight">{count}</p>
              <p className="text-sm text-ink-soft">projects submitted so far</p>
              <div className="mt-5 flex gap-2">
                <span className="h-3 flex-1 rounded-full border-[2px] border-ink bg-clay-soft" />
                <span className="h-3 flex-1 rounded-full border-[2px] border-ink bg-sage-soft" />
                <span className="h-3 flex-1 rounded-full border-[2px] border-ink bg-sky-soft" />
                <span className="h-3 flex-1 rounded-full border-[2px] border-ink bg-butter" />
              </div>
            </div>
            <div className="brut-card absolute -bottom-8 -left-6 rotate-[3deg] p-4">
              <p className="font-mono text-xs font-bold uppercase tracking-widest">Solo · Team</p>
              <p className="text-sm text-ink-soft">both welcome</p>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto mt-20 max-w-6xl px-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "①",
              t: "Pick your mode",
              d: "Hack solo or spin up a team with your crew.",
              a: "bg-sky-soft",
            },
            {
              n: "②",
              t: "Add the details",
              d: "Name, email, project, and your public GitHub repo.",
              a: "bg-sage-soft",
            },
            {
              n: "③",
              t: "Drop 3 screenshots",
              d: "Show it running on your actual device.",
              a: "bg-clay-soft",
            },
          ].map((s) => (
            <div key={s.n} className="brut-card p-6">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border-[2.5px] border-ink text-lg font-bold ${s.a}`}
              >
                {s.n}
              </span>
              <h3 className="mt-4 text-xl font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* form */}
      <section className="mx-auto mt-24 max-w-6xl px-5">
        <div className="mb-10 text-center">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-clay">
            The submission
          </span>
          <h2 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Post your build
          </h2>
        </div>
        <SubmissionForm />
      </section>

      <footer className="mx-auto mt-24 max-w-6xl px-5">
        <div className="brut-card flex flex-col items-center gap-2 p-6 text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
            Mobilethon Hub — built for makers
          </p>
          <p className="text-sm text-ink-soft">Soft brutalism. Loud ideas. Muted palette.</p>
        </div>
      </footer>
    </main>
  );
}
