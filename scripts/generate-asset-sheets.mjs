import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const output = new URL("../public/assets/sheets/", import.meta.url).pathname.slice(1);
const uiRoot = new URL("../public/assets/ui/", import.meta.url).pathname.slice(1);

const assets = [
  ["Hava: Gunesli", "../ui/hud/weather-sunny.svg"], ["Hava: Bulutlu", "../ui/hud/weather-cloudy.svg"],
  ["Hava: Yagmur", "../ui/hud/weather-rain.svg"], ["Hava: Firtina", "../ui/hud/weather-storm.svg"],
  ["Deniz: Duz", "../ui/hud/sea-calm.svg"], ["Deniz: Dalgali", "../ui/hud/sea-choppy.svg"],
  ["Deniz: Sert", "../ui/hud/sea-rough.svg"], ["Menu", "../ui/menu/menu.svg"],
  ["Uretim", "../ui/menu/craft.svg"], ["Envanter", "../ui/menu/inventory.svg"],
  ["Harita", "../ui/menu/map.svg"], ["Balikcilik", "../ui/menu/fishing.svg"],
  ["Dalis", "../ui/menu/dive.svg"], ["Sistem", "../ui/menu/system.svg"],
  ["Kaydet", "../ui/menu/save.svg"], ["Yukle", "../ui/menu/load.svg"],
  ["Tam Ekran", "../ui/menu/fullscreen.svg"], ["Geri", "../ui/menu/back.svg"],
  ["Capa Yukarida", "../ui/menu/anchor-up.svg"], ["Capa Suda", "../ui/menu/anchor-down.svg"],
  ["Giris", "../ui/menu/enter.svg"], ["Saldiri", "../ui/menu/attack.svg"],
  ["Tamir", "../ui/menu/repair.svg"], ["Sal Parcasi", "../ui/raft/plank.svg"],
  ["Baglanti Kirisi", "../ui/raft/beam.svg"], ["Toplama Agi", "../ui/raft/net.svg"],
  ["Su Toplayici", "../ui/raft/water-collector.svg"], ["Basit Ocak", "../ui/raft/grill.svg"],
  ["Sandik", "../ui/raft/chest.svg"], ["Yatak", "../ui/raft/bed.svg"],
  ["Direk", "../ui/raft/mast.svg"], ["Yelken", "../ui/raft/sail.svg"]
];

const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const embeddedAssets = new Map();

for (const [, href] of assets) {
  const relative = href.replace("../ui/", "");
  const source = await readFile(resolve(uiRoot, relative), "utf8");
  const body = source.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)?.[1] ?? "";
  embeddedAssets.set(href, body);
}

function sheet({ review = false, direction = "neutral" } = {}) {
  const cols = 8;
  const rows = 4;
  const cell = review ? 144 : 96;
  const imageSize = review ? 72 : 72;
  const width = cols * cell;
  const height = rows * cell;
  const palette = direction === "stoneshard"
    ? { outline: "#171b20", panel: "#24272a", line: "#5e5140", text: "#e1d3b4", filter: "contrast(1.2) saturate(.78) brightness(.86)" }
    : direction === "ultima"
      ? { outline: "#31281f", panel: "#4b4133", line: "#a38d68", text: "#ead9b3", filter: "sepia(.18) saturate(.82) brightness(1.02)" }
      : { outline: "none", panel: "none", line: "none", text: "none", filter: "none" };
  const cells = assets.map(([label, href], index) => {
    const x = (index % cols) * cell;
    const y = Math.floor(index / cols) * cell;
    const ix = x + (cell - imageSize) / 2;
    const iy = y + (review ? 16 : (cell - imageSize) / 2);
    const scale = imageSize / 64;
    return `
      ${review ? `<rect x="${x + 5}" y="${y + 5}" width="${cell - 10}" height="${cell - 10}" rx="5" fill="${palette.panel}" stroke="${palette.line}" stroke-width="2"/>` : ""}
      <g transform="translate(${ix} ${iy}) scale(${scale})" style="filter:${palette.filter};image-rendering:pixelated">${embeddedAssets.get(href)}</g>
      ${review ? `<text x="${x + cell / 2}" y="${y + 111}" text-anchor="middle" fill="${palette.text}" font-family="Arial,sans-serif" font-size="13" font-weight="700">${escape(label)}</text><text x="${x + 13}" y="${y + 22}" fill="${palette.line}" font-family="monospace" font-size="11">${String(index + 1).padStart(2, "0")}</text>` : ""}
    `;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${review ? `<rect width="100%" height="100%" fill="${palette.outline}"/>` : ""}
    ${cells}
  </svg>\n`;
}

await mkdir(output, { recursive: true });
await writeFile(join(output, "wayborn-master-transparent.svg"), sheet(), "utf8");
await writeFile(join(output, "wayborn-stoneshard-direction-review.svg"), sheet({ review: true, direction: "stoneshard" }), "utf8");
await writeFile(join(output, "wayborn-ultima-direction-review.svg"), sheet({ review: true, direction: "ultima" }), "utf8");
await writeFile(join(output, "asset-index.json"), JSON.stringify(assets.map(([name, path], index) => ({ id: index + 1, name, path })), null, 2), "utf8");
console.log("Generated transparent master sheet and two review direction sheets.");
