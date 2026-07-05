const ITEMS = [
  "MOBILETHON 2026",
  "SHIP ON DEVICE",
  "SOLO OR SQUAD",
  "36 HOURS",
  "PUSH TO MAIN",
  "3 SCREENSHOTS",
  "BUILD LOUD",
];

export default function Ticker() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="overflow-hidden border-y-[2.5px] border-ink bg-ink py-2.5">
      <div className="animate-marquee flex w-max gap-8 whitespace-nowrap">
        {row.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-8 font-mono text-sm font-bold uppercase tracking-[0.25em] text-paper"
          >
            {item}
            <span className="text-butter">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
