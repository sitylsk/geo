document.getElementById("year").textContent = new Date().getFullYear();

const CAT_LABEL = {
  precious: "Precious Metals",
  base: "Base & Battery",
  gemstone: "Gemstone",
  critical: "Critical / REE",
  energy: "Energy",
  water: "Groundwater",
};

async function loadCommodities() {
  const grid = document.getElementById("commodity-grid");
  try {
    const res = await fetch("/api/commodities");
    const data = await res.json();
    const items = data.commodities || [];
    document.getElementById("stat-commodities").textContent = `${items.length}+`;
    grid.innerHTML = "";
    const ICON = {
      precious: "M12 2 3 7l9 5 9-5-9-5Z M3 7v10l9 5 9-5V7",
      base: "M12 2 2 8v8l10 6 10-6V8L12 2Z",
      gemstone: "M6 3h12l3 6-9 12L3 9l3-6Z M3 9h18 M12 21 8 9l4-6 4 6-4 12Z",
      critical: "M12 2v20 M2 7l10 5 10-5 M2 17l10-5 10 5",
      energy: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
      water: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z",
    };
    items.forEach((c) => {
      const el = document.createElement("div");
      el.className = "commodity-card";
      el.style.setProperty("--c", c.color);
      el.innerHTML = `
        <div class="cc-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[c.category] || ICON.base}"/></svg></div>
        <div class="cc-body">
          <div class="cc-cat">${CAT_LABEL[c.category] || c.category}</div>
          <h3>${c.name}</h3>
        </div>
        <div class="cc-arrow">&rarr;</div>
      `;
      el.addEventListener("click", () => {
        window.location.href = `/explorer?commodity=${encodeURIComponent(c.id)}`;
      });
      grid.appendChild(el);
    });
  } catch (err) {
    grid.innerHTML = `<div class="card muted-card">Could not load resources (${err.message}).</div>`;
  }
}

loadCommodities();
