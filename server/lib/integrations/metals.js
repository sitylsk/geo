// Commodity spot prices — Metals.live fallback to gold-api.com.

const METALS_LIVE = "https://api.metals.live/v1/spot";
const GOLD_API = "https://api.gold-api.com/price";

const SYMBOLS = {
  gold: "XAU",
  silver: "XAG",
  copper: "HG",
  platinum: "XPT",
  palladium: "XPD",
};

async function fetchGoldApi(symbol) {
  const res = await fetch(`${GOLD_API}/${symbol}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const d = await res.json();
  return { symbol: d.symbol, name: d.name, usd: d.price, updated: d.updatedAtReadable };
}

export async function fetchCommodityPrices() {
  // Try metals.live first
  try {
    const res = await fetch(METALS_LIVE, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        return { source: "Metals.live", prices: data.slice(0, 8), asOf: new Date().toISOString() };
      }
    }
  } catch {
    /* fallback */
  }

  const entries = await Promise.all(
    Object.entries(SYMBOLS).map(async ([key, sym]) => {
      const p = await fetchGoldApi(sym);
      return p ? { metal: key, ...p } : null;
    }),
  );
  return {
    source: "gold-api.com (Metals.live fallback)",
    prices: entries.filter(Boolean),
    asOf: new Date().toISOString(),
  };
}
