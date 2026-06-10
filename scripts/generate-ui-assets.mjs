import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const root = new URL("../public/assets/ui/", import.meta.url).pathname.slice(1);
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" shape-rendering="crispEdges">${body}</svg>\n`;
const outline = "#102b35";
const light = "#e8f7f2";
const teal = "#7ed1cc";
const blue = "#55bfe1";
const deepBlue = "#347da5";
const wood = "#a86535";
const woodLight = "#d5904d";
const gold = "#f2c15f";
const metal = "#a9c4ca";
const darkMetal = "#55737d";
const danger = "#e85e50";

const icons = {
  "raft/plank.svg": `
    <path fill="${outline}" d="M5 9h54v46H5z"/><path fill="${wood}" d="M9 13h46v10H9zm0 14h46v10H9zm0 14h46v10H9z"/>
    <path fill="${woodLight}" d="M12 15h29v3H12zm8 14h32v3H20zm-8 14h27v3H12z"/>
    <path fill="#563721" d="M16 19h5v3h-5zm29-5h5v5h-5zM12 33h5v3h-5zm34 8h5v5h-5z"/>`,
  "raft/beam.svg": `
    <path fill="${outline}" d="M7 5h12v18h8V5h12v18h18v12H39v24H27V35H7V23h20V5z"/>
    <path fill="${wood}" d="M11 9h4v18h16V9h4v18h18v4H35v24h-4V31H11z"/>
    <path fill="${woodLight}" d="M13 10h2v15h14V10h2v18H13z"/><path fill="${gold}" d="M27 25h12v12H27z"/><path fill="#624022" d="M30 28h6v6h-6z"/>`,
  "raft/net.svg": `
    <path fill="${outline}" d="M5 5h54v54H5z"/><path fill="#c6a85d" d="M9 9h46v46H9z"/><path fill="#173e4b" d="M13 13h38v38H13z"/>
    <path fill="#dec77c" d="M13 17h38v3H13zm0 10h38v3H13zm0 10h38v3H13zm0 10h38v3H13zM17 13h3v38h-3zm10 0h3v38h-3zm10 0h3v38h-3zm10 0h3v38h-3z"/>
    <path fill="${gold}" d="M7 7h8v8H7zm42 0h8v8h-8zM7 49h8v8H7zm42 0h8v8h-8z"/>`,
  "raft/water-collector.svg": `
    <path fill="${outline}" d="M7 7h50v50H7z"/><path fill="#536c74" d="M11 11h42v11H11z"/><path fill="#d7e6df" d="M14 14h36v5H14z"/>
    <path fill="#315262" d="M15 22h34l6 28H9z"/><path fill="${blue}" d="M14 37h36l2 10H12z"/><path fill="#9ce4ec" d="M18 39h25v4H18z"/>
    <path fill="${light}" d="M28 22h8v8h-8z"/><path fill="${blue}" d="M29 27h6v8h-6z"/><path fill="${darkMetal}" d="M11 50h8v7h-8zm34 0h8v7h-8z"/>`,
  "raft/grill.svg": `
    <path fill="${outline}" d="M7 8h50v48H7z"/><path fill="${darkMetal}" d="M11 12h42v13H11z"/><path fill="${metal}" d="M14 15h36v4H14zM14 21h36v3H14z"/>
    <path fill="#3a3030" d="M13 27h38v21H13z"/><path fill="${danger}" d="M20 36h8v9h-8zm17-5h8v14h-8z"/><path fill="#ffb64d" d="M23 32h6v10h-6zm15 4h6v7h-6z"/>
    <path fill="${darkMetal}" d="M13 48h8v9h-8zm30 0h8v9h-8z"/>`,
  "raft/chest.svg": `
    <path fill="${outline}" d="M6 12h52v44H6z"/><path fill="${wood}" d="M10 16h44v14H10zm0 18h44v18H10z"/><path fill="${woodLight}" d="M14 19h36v5H14zm0 18h36v5H14z"/>
    <path fill="#5a3823" d="M6 28h52v8H6z"/><path fill="${gold}" d="M26 28h12v15H26z"/><path fill="#fff0a3" d="M30 31h4v7h-4z"/>`,
  "raft/bed.svg": `
    <path fill="${outline}" d="M5 13h54v44H5z"/><path fill="${wood}" d="M9 17h8v36H9zm38 0h8v36h-8z"/><path fill="#dbe8df" d="M17 19h30v13H17z"/>
    <path fill="#89acd4" d="M17 32h30v19H17z"/><path fill="#b7d3e6" d="M20 35h24v6H20z"/><path fill="${woodLight}" d="M9 49h46v8H9z"/>`,
  "raft/mast.svg": `
    <path fill="${outline}" d="M25 4h14v49h16v8H9v-8h16z"/><path fill="${wood}" d="M29 8h6v49h16v2H13v-2h16z"/>
    <path fill="${woodLight}" d="M31 8h3v43h-3z"/><path fill="#d9d3ae" d="M36 11h5v39h-5z"/><path fill="#f1e7c1" d="M38 12h3v25h-3z"/>`,
  "raft/sail.svg": `
    <path fill="${outline}" d="M13 5h13v47h33v9H7v-9h6z"/><path fill="${wood}" d="M17 9h5v47H9v2h46v-2H22V9z"/>
    <path fill="#ede8cf" d="M25 9h28v39H25z"/><path fill="#c8d8d2" d="M29 13h20v5H29zm0 10h20v4H29zm0 9h20v4H29z"/><path fill="${danger}" d="M45 9h8v8h-8z"/>`,

  "menu/menu.svg": `<path fill="${outline}" d="M7 9h50v12H7zm0 17h50v12H7zm0 17h50v12H7z"/><path fill="${light}" d="M12 13h40v4H12zm0 17h40v4H12zm0 17h40v4H12z"/><path fill="${teal}" d="M12 17h27v3H12zm0 17h34v3H12zm0 17h22v3H12z"/>`,
  "menu/craft.svg": `<path fill="${outline}" d="M7 7h22v15H18v8h-8v-8H7zm31 2h19v19H46v8h-8zM8 40h18v18H8zm25 5h24v12H33z"/><path fill="${gold}" d="M11 11h14v7H14v8h-4V18h-3zm31 2h11v11h-7v8h-4z"/><path fill="${light}" d="M12 44h10v10H12zm25 5h16v4H37z"/>`,
  "menu/inventory.svg": `<path fill="${outline}" d="M8 10h48v49H8z"/><path fill="${wood}" d="M12 17h40v37H12z"/><path fill="${woodLight}" d="M16 20h32v10H16z"/><path fill="#553621" d="M8 31h48v9H8z"/><path fill="${gold}" d="M25 5h14v14H25zm1 28h12v17H26z"/><path fill="#fff0a3" d="M29 37h6v7h-6z"/>`,
  "menu/map.svg": `<path fill="${outline}" d="M5 8h18l9 6 9-6h18v48H41l-9-6-9 6H5z"/><path fill="#eadb9d" d="M9 12h12v38H9zm16 3h14v35L32 46l-7 4zm18-3h12v38H43z"/><path fill="#4b9d73" d="M12 17h7v7h-7zm34 23h6v6h-6z"/><path fill="${blue}" d="M27 24h10v14H27z"/>`,
  "menu/fishing.svg": `<path fill="${outline}" d="M8 5h13v37H8zm13 4h19v8H21zm15 8h9v23h-9zm-9 22h11v9H27zM8 43h28l14 9-14 9H8l9-9z"/><path fill="${metal}" d="M12 9h5v30h-5zm9 4h15v4H21zm19 8h4v17h-4z"/><path fill="${blue}" d="M13 47h21l8 5-8 5H13l6-5z"/><path fill="${light}" d="M20 49h7v6h-7z"/>`,
  "menu/dive.svg": `<path fill="${outline}" d="M7 10h50v29H7zm8 29h34v13H15zM6 50h18v10H6zm34 0h18v10H40z"/><path fill="#d8eef0" d="M11 14h42v21H11z"/><path fill="#2d6579" d="M16 18h14v13H16zm18 0h14v13H34z"/><path fill="${gold}" d="M29 35h6v14h-6z"/><path fill="${blue}" d="M19 42h26v6H19z"/>`,
  "menu/system.svg": `<path fill="${outline}" d="M25 3h14v9h9l6 6-6 9v10l6 9-7 7-9-6H27l-9 6-7-7 6-9V27l-6-9 6-6h8z"/><path fill="${metal}" d="M29 8h6v9l10 4 4-3 2 2-6 9v7l6 8-3 3-9-5H27l-9 5-3-3 6-8v-9l-6-8 3-3 5 5 6-4z"/><path fill="${outline}" d="M24 24h16v16H24z"/><path fill="${teal}" d="M28 28h8v8h-8z"/>`,
  "menu/save.svg": `<path fill="${outline}" d="M8 5h48v54H8z"/><path fill="#dbe9e5" d="M12 9h40v46H12z"/><path fill="#477080" d="M16 11h27v17H16zm4 29h24v15H20z"/><path fill="${gold}" d="M43 11h7v18h-7z"/><path fill="${light}" d="M24 44h16v7H24z"/>`,
  "menu/load.svg": `<path fill="${outline}" d="M5 12h21l6 7h27v38H5z"/><path fill="#d8c477" d="M9 16h15l6 7h25v30H9z"/><path fill="${blue}" d="M28 25h9v17h10L32 57 17 42h11z"/><path fill="${light}" d="M31 28h3v18h6l-8 7z"/>`,
  "menu/fullscreen.svg": `<path fill="${outline}" d="M5 5h23v9H14v14H5zm31 0h23v23h-9V14H36zM5 36h9v14h14v9H5zm45 0h9v23H36v-9h14z"/><path fill="${light}" d="M9 9h15v3H12v12H9zm31 0h15v15h-3V12H40zM9 40h3v12h12v3H9zm43 0h3v15H40v-3h12z"/>`,
  "menu/back.svg": `<path fill="${outline}" d="M25 7h14v12h18v30H39v10H25V49H7V19h18z"/><path fill="${light}" d="M25 13h8v12h18v18H33v10h-8V43H13V25h12z"/><path fill="${teal}" d="M19 26h22v8H19zm0 8h14v8H19z"/>`,
  "menu/anchor-up.svg": `<path fill="${outline}" d="M24 4h16v12h9v9h-9v17h8v-8h11v17H47v8H17v-8H5V34h11v8h8V25h-9v-9h9z"/><path fill="${light}" d="M28 8h8v12h9v3h-9v24h8v-7h7v7h-8v6H21v-6h-8v-7h7v7h8V23h-9v-3h9z"/><path fill="${teal}" d="M28 8h8v8h-8z"/>`,
  "menu/anchor-down.svg": `<path fill="${outline}" d="M24 4h16v12h9v9h-9v17h8v-8h11v17H47v8H17v-8H5V34h11v8h8V25h-9v-9h9z"/><path fill="${darkMetal}" d="M28 8h8v12h9v3h-9v24h8v-7h7v7h-8v6H21v-6h-8v-7h7v7h8V23h-9v-3h9z"/><path fill="#42555b" d="M28 8h8v8h-8z"/>`,
  "menu/enter.svg": `<path fill="${outline}" d="M6 5h36v54H6zm36 16h10v8h7v14h-7v8H42V39H25V25h17z"/><path fill="${wood}" d="M11 10h26v44H11z"/><path fill="#613a25" d="M15 14h18v36H15z"/><path fill="${gold}" d="M28 30h5v7h-5z"/><path fill="${light}" d="M43 25h5v8h7v6h-7v8h-5V35H29v-6h14z"/>`,
  "menu/attack.svg": `<path fill="${outline}" d="M38 4h21v21H49v9h-9v9h-9v9h-9v9H5V44h9v-9h9v-9h9v-9h6z"/><path fill="${metal}" d="M42 8h13v13h-9v9h-9v9h-9v9h-9v9H9v-9h9v-9h9v-9h9v-9h6z"/><path fill="${danger}" d="M7 46h15v15H7z"/><path fill="${gold}" d="M16 39h9v9h-9z"/>`,
  "menu/repair.svg": `<path fill="${outline}" d="M7 8h36v16H30v12h-9V24H7zm28 25h12v9h7v17H37V42h-2z"/><path fill="${metal}" d="M11 12h28v8H26v12h-3V20H11z"/><path fill="${wood}" d="M39 37h5v18h-5z"/><path fill="${gold}" d="M44 37h7v6h-7z"/>`,

  "hud/weather-sunny.svg": `<path fill="#dd922f" d="M26 2h12v14H26zM26 48h12v14H26zM2 26h14v12H2zm46 0h14v12H48zM8 8h12v12H8zm36 0h12v12H44zM8 44h12v12H8zm36 0h12v12H44z"/><path fill="${gold}" d="M18 18h28v28H18z"/><path fill="#ffe58a" d="M24 22h16v16H24z"/>`,
  "hud/weather-cloudy.svg": `<path fill="${gold}" d="M7 8h12v12H7zm13-6h12v14H20z"/><path fill="${outline}" d="M12 25h8v-9h22v8h10v8h8v22H5V34h7z"/><path fill="#91b4bd" d="M16 29h9v-9h13v8h10v8h8v14H9V38h7z"/><path fill="#d4e6e7" d="M18 32h12v-7h8v8h11v7H14z"/>`,
  "hud/weather-rain.svg": `<path fill="${outline}" d="M12 8h29v8h10v8h8v22H5V26h7z"/><path fill="#87aab5" d="M16 12h21v8h10v8h8v14H9V30h7z"/><path fill="#d1e3e5" d="M19 18h18v7h12v7H14v-7h5z"/><path fill="${blue}" d="M10 47h8v15h-8zm18 2h8v13h-8zm18-2h8v15h-8z"/>`,
  "hud/weather-storm.svg": `<path fill="${outline}" d="M12 6h29v8h10v8h8v22H5V24h7z"/><path fill="#657f8b" d="M16 10h21v8h10v8h8v14H9V28h7z"/><path fill="${gold}" d="M29 32h19L37 45h9L23 63l6-16H18z"/><path fill="${blue}" d="M9 46h7v14H9zm42 0h7v14h-7z"/>`,
  "hud/sea-calm.svg": `<path fill="${outline}" d="M3 17h58v14H3zm0 23h58v14H3z"/><path fill="${blue}" d="M7 21h50v6H7zm0 23h50v6H7z"/><path fill="#bcecf0" d="M14 18h34v5H14zm9 23h34v5H23z"/>`,
  "hud/sea-choppy.svg": `<path fill="${outline}" d="M2 18h10V9h14v9h12V9h14v9h10v18H2zm0 25h13v-9h14v9h10v-9h14v9h9v18H2z"/><path fill="${deepBlue}" d="M6 22h10v-8h6v8h20v-8h6v8h10v10H6zm0 25h13v-8h6v8h18v-8h6v8h9v10H6z"/><path fill="#b9e8eb" d="M12 14h10v8H12zm26 0h10v8H38zM15 39h10v8H15zm24 0h10v8H39z"/>`,
  "hud/sea-rough.svg": `<path fill="${outline}" d="M2 20h9V8h15v6h11V2h16v10h9v29H2zm0 28h12V36h16v7h10V31h16v12h6v19H2z"/><path fill="${deepBlue}" d="M6 24h9V13h7v7h19V7h8v10h9v20H6zm0 28h12V41h8v7h18V36h8v12h6v10H6z"/><path fill="#d3f1ed" d="M11 13h11v7H11zm26-6h12v10H37zM14 41h12v7H14zm26-5h12v12H40z"/>`
};

for (const [relativePath, body] of Object.entries(icons)) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, svg(body), "utf8");
}

console.log(`Generated ${Object.keys(icons).length} high-readability pixel-art UI assets.`);
