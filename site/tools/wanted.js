// Writes data/gt/wanted.json: every name the routes show (gear, spells, rewards, materials, stations, weapon skills,
// passives, blood types), for site/tools/capture-gt.js to fetch details for. Run: node site/tools/wanted.js
const fs = require('fs');
const path = require('path');
const { ROOT, page, loadRoutes } = require('../../test/load');
const icons = require('../build-icons');

const names = new Set();
for (const r of loadRoutes()) {
  if (!r.def) continue;
  r.icons.forEach(n => names.add(n));
  for (const p of r.def.phases) {
    p.loadout.slots.forEach(s => s.split(/ or /).forEach(n => names.add(n.trim())));
    p.bosses.forEach(b => names.add(b.name));
  }
  Object.keys(r.def.resources || {}).forEach(n => names.add(n));
}
const p = page();
p.run('js/core.js');
p.run('routes/shared.js');
const S = p.window.BR.shared;
for (const w of S.WEAPONS) { names.add(w.icon); w.skills.forEach(([n]) => names.add(n)); }
['Rain of Bolts', 'Snapshot', 'Iron Ore', 'Copper Ore', 'Silver Ore', 'Sulphur', 'Tech Scrap', 'Quartz'].forEach(n => names.add(n));
Object.keys(icons.ITEMS).concat(icons.PAGES).forEach(n => names.add(n));
['—', 'Starting dash'].forEach(n => names.delete(n));

const out = { names: [...names].sort(), stations: icons.STATIONS.concat(['Vampire Waygate', 'Advanced Furnace', 'Advanced Loom', 'Advanced Tannery', 'Paper Press', 'Gem Cutting Table']) };
fs.mkdirSync(path.join(ROOT, 'data', 'gt'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'gt', 'wanted.json'), JSON.stringify(out, null, 1));
console.log(`wanted: ${out.names.length} names, ${out.stations.length} stations`);
