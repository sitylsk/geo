import type { Submission } from "@/lib/types";
import { GithubIcon, ExternalLinkIcon } from "./Icons";

const CARD_ACCENTS = ["bg-clay-soft", "bg-sage-soft", "bg-sky-soft", "bg-butter-soft"];

export default function ProjectCard({
  submission,
  index,
  award,
}: {
  submission: Submission;
  index: number;
  award?: string;
}) {
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  const repoLabel = submission.githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  const isWinner = Boolean(award);

  return (
    <article
      className={`brut-card overflow-hidden ${
        isWinner ? "ring-2 ring-butter ring-offset-2 ring-offset-paper" : ""
      }`}
    >
      {isWinner && (
        <div className="flex items-center gap-2 border-b-[2.5px] border-ink bg-butter px-4 py-2">
          <span aria-hidden className="text-base leading-none">★</span>
          <span className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.16em]">
            {award}
          </span>
        </div>
      )}

      {/* screenshot strip */}
      <div className="grid grid-cols-3 gap-1.5 border-b-[2.5px] border-ink bg-paper-2 p-1.5">
        {submission.screenshots.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`${submission.projectName} screenshot ${i + 1}`}
            className="aspect-[9/16] w-full rounded-lg border-[2px] border-ink object-cover"
            loading="lazy"
          />
        ))}
      </div>

      <div className="p-5">
        <span
          className={`inline-block rounded-full border-[2px] border-ink px-2.5 py-0.5 font-mono text-[0.62rem] font-bold uppercase tracking-wider ${accent}`}
        >
          {submission.name}
        </span>

        <h3 className="mt-3 text-2xl font-bold leading-tight tracking-tight">
          {submission.projectName}
        </h3>
        <p className="mt-1 text-sm text-ink-soft">{submission.tagline}</p>

        <p className="mt-4 min-w-0 truncate font-mono text-[0.68rem] text-ink-soft">{repoLabel}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {submission.liveUrl && (
            <a
              href={submission.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="brut-press brut-focus inline-flex shrink-0 items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-sky-soft px-4 py-2 font-mono text-xs font-bold"
            >
              <ExternalLinkIcon /> Live
            </a>
          )}
          <a
            href={submission.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="brut-press brut-focus inline-flex shrink-0 items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-card px-4 py-2 font-mono text-xs font-bold"
          >
            <GithubIcon /> Repo
          </a>
        </div>
      </div>
    </article>
  );
}
