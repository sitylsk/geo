import Link from "next/link";
import Ticker from "@/components/Ticker";
import SubmissionForm from "@/components/SubmissionForm";
import { LogoMark, ArrowRightIcon } from "@/components/Icons";
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
            <LogoMark />
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
            <h1 className="mt-5 text-5xl font-bold leading-[0.98] tracking-tight sm:text-7xl">
              Build on
              <br />
              <span className="text-clay">mobile.</span> Submit
              <br />
              with <span className="text-sky">confidence.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft">
              The Mobilethon is a mobile-first build sprint. Turn your idea into a working app on
              your own device, then submit your GitHub repository and three on-device screenshots —
              all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#submit"
                className="brut-press brut-focus inline-flex items-center gap-2 rounded-full border-[2.5px] border-ink bg-clay px-7 py-3.5 text-base font-bold text-paper"
              >
                Submit your project <ArrowRightIcon />
              </a>
              <Link
                href="/showcase"
                className="brut-press brut-focus rounded-full border-[2.5px] border-ink bg-card px-7 py-3.5 text-base font-bold"
              >
                View submissions
              </Link>
            </div>
          </div>

          {/* stat stack */}
          <div className="relative mx-auto hidden w-full max-w-sm lg:block">
            <div className="brut-card animate-floaty p-6">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
                Submissions
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
            <div className="brut-card absolute -bottom-8 -left-6 p-4">
              <p className="font-mono text-xs font-bold uppercase tracking-widest">Built on device</p>
              <p className="text-sm text-ink-soft">mobile-first</p>
            </div>
          </div>
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto mt-20 max-w-6xl px-5">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              n: "1",
              t: "Add your details",
              d: "Your name, email, project name, and tagline.",
              a: "bg-sky-soft",
            },
            {
              n: "2",
              t: "Share your repository",
              d: "Submit the public GitHub repo for your project.",
              a: "bg-sage-soft",
            },
            {
              n: "3",
              t: "Attach 3 screenshots",
              d: "Show the app running on your actual device.",
              a: "bg-clay-soft",
            },
          ].map((s) => (
            <div key={s.n} className="brut-card p-6">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border-[2.5px] border-ink font-mono text-base font-bold ${s.a}`}
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
            Submission
          </span>
          <h2 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Submit your project
          </h2>
        </div>
        <SubmissionForm />
      </section>

      <footer className="mx-auto mt-24 max-w-6xl px-5">
        <div className="brut-card flex flex-col items-center gap-2 p-6 text-center">
          <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-ink-soft">
            <LogoMark className="text-clay" /> Mobilethon Hub
          </p>
          <p className="text-sm text-ink-soft">The official submission portal for the Mobilethon.</p>
        </div>
      </footer>
    </main>
  );
}
