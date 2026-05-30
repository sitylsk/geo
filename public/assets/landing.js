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
    items.forEach((c) => {
      const el = document.createElement("div");
      el.className = "card commodity-chip";
      el.innerHTML = `
        <div class="cat"><span class="dot" style="background:${c.color}"></span>${CAT_LABEL[c.category] || c.category}</div>
        <h3>${c.name}</h3>
      `;
      el.style.cursor = "pointer";
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
