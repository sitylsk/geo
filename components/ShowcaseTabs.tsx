import Link from "next/link";

type Tab = "showcase" | "winners";

export default function ShowcaseTabs({
  active,
  winnersLive,
}: {
  active: Tab;
  winnersLive: boolean;
}) {
  const tabClass = (isActive: boolean) =>
    `brut-focus rounded-full border-[2.5px] border-ink px-4 py-2 text-sm font-bold transition ${
      isActive ? "bg-ink text-paper" : "bg-card hover:-translate-y-0.5"
    }`;

  return (
    <nav className="mt-5 flex flex-wrap items-center gap-2">
      <Link href="/showcase" className={tabClass(active === "showcase")}>
        All projects
      </Link>
      <Link href="/showcase/winners" className={tabClass(active === "winners")}>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden>★</span> Winners
          {winnersLive && (
            <span className="ml-0.5 h-2 w-2 rounded-full bg-butter ring-2 ring-ink" />
          )}
        </span>
      </Link>
    </nav>
  );
}
