// Test helpers: load the site's browser scripts into a Node VM the way index.html and js/app.js do,
// and parse the facts in docs/ that the routes are checked against. No dependencies beyond Node 18+.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site');

// A fresh page: window + localStorage, nothing loaded yet.
function page(storage = {}) {
  const window = {
    localStorage: {
      getItem: k => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: k => { delete storage[k]; },
    },
    VR_ICONS: {},
  };
  window.window = window;
  vm.createContext(window);
  const run = f => vm.runInContext(fs.readFileSync(path.join(SITE, f), 'utf8'), window, { filename: f });
  return { window, run, storage };
}

// Every archetype in the registry, each loaded on its own page like the site does:
// { arch, def, icons: Set of icon names used (phases and rendered views), endgame, ref }.
function loadRoutes() {
  const { window, run } = page();
  run('js/core.js');
  run('routes/registry.js');
  return window.BR.ARCHETYPES.map(arch => {
    if (arch.status !== 'ready') return { arch };
    const p = page();
    p.run('js/core.js');
    const BR = p.window.BR;
    const icons = new Set();
    const ic = BR.h.ic, tiles = BR.h.tiles;
    BR.h.ic = (n, ...a) => { icons.add(n); return ic(n, ...a); };
    BR.h.tiles = l => { (l || []).forEach(n => icons.add(n)); return tiles(l); };
    const defs = [];
    BR.registerRoute = d => defs.push(d);
    for (const f of arch.files) p.run(f);
    if (defs.length !== 1) throw new Error(`${arch.id}: expected one registerRoute call, got ${defs.length}`);
    // Copy the data out of the VM so assert.deepStrictEqual compares plain objects from this realm.
    const def = { ...JSON.parse(JSON.stringify(defs[0])), renderEndgame: defs[0].renderEndgame, renderRef: defs[0].renderRef };
    for (const ph of def.phases) {
      icons.add(ph.sig);
      [...(ph.steps || []), ...(ph.craft || [])].forEach(s => icons.add(s.ic));
      (ph.access || []).forEach(([n]) => icons.add(n));
      ph.bosses.forEach(b => { icons.add(b.name); b.gets.forEach(g => icons.add(g)); });
      if (ph.loadout) {
        ph.loadout.slots.forEach(s => icons.add(BR.h.slotIcon(def.slotIcons, s)));
        (ph.loadout.gear || []).forEach(g => icons.add(g));
      }
    }
    Object.keys(def.needs).forEach(n => icons.add(n));
    if (def.finish) icons.add(def.finish.icon);
    [...arch.icons, arch.blood].forEach(n => icons.add(n));
    const endgame = def.renderEndgame ? def.renderEndgame() : '';
    const ref = def.renderRef ? def.renderRef() : '';
    return { arch, def, icons, endgame, ref };
  });
}

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r/g, '');
const cells = line => line.split('|').slice(1, -1).map(c => c.trim());

// docs/vblood_rewards.md: [{ lv, name, rewards: Set of lower-case reward names }]. Slash groups are expanded
// ("Iron/Dark Silver Reaper" → Iron Reaper, Dark Silver Reaper; "Regular Ruby/Sapphire" → Regular Ruby, Regular Sapphire).
function vbloodRewards() {
  const expand = entry => {
    const parts = entry.split('/').map(s => s.trim());
    if (parts.length < 2) return [entry];
    const first = parts[0].split(' '), last = parts[parts.length - 1].split(' ');
    const prefix = first.length > 1 ? first.slice(0, -1).join(' ') : '';
    const suffix = last.length > 1 ? last[last.length - 1] : '';
    return parts.map((p, i) => {
      let core = p;
      if (i === 0 && prefix) core = p.slice(prefix.length + 1);
      if (i === parts.length - 1 && suffix) core = core.slice(0, -(suffix.length + 1));
      return [prefix, core, suffix].filter(Boolean).join(' ');
    });
  };
  return read('docs/vblood_rewards.md').split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => {
    const [lv, name, rewards] = cells(l);
    const names = rewards.split(/, | \+ /).map(s => s.replace(/★/g, '').trim()).flatMap(expand);
    return { lv: +lv, name: name.replace(/\s*\(.*\)$/, ''), rewards: new Set(names.map(n => n.toLowerCase())) };
  });
}

// docs/research_sources.md spell table: { points: { boss short name: [school, tier] }, spells: { spell: [school, tier] },
// veils: { veil: boss short name }, start: [spells], shards: { ultimate: boss short name } }.
function spellTable() {
  const text = read('docs/research_sources.md');
  const points = {}, spells = {}, veils = {}, shards = {};
  for (const l of text.split('\n').filter(l => /^\| (Blood|Chaos|Frost|Illusion|Storm|Unholy) \|.*\| Veil of /.test(l))) {
    const [school, ...tiers] = cells(l);
    tiers.slice(0, 3).forEach((cell, i) => {
      const m = cell.match(/^(.*?)\s*\(([^)]*)\)/);
      m[1].split(', ').forEach(s => { spells[s] = [school, i + 1]; });
      m[2].split(', ').forEach(b => { points[b.replace(/\s+\d+$/, '')] = [school, i + 1]; });
    });
    const v = tiers[3].match(/^(Veil of \w+): (.+?) \(/);
    veils[v[1]] = v[2];
  }
  const at = text.indexOf('Soul Shard ultimates:');
  for (const m of text.slice(at, text.indexOf('\n\n', at)).matchAll(/(\w+) \(\d+\) → ([^·]+)/g)) shards[m[2].trim().replace(/\.$/, '')] = m[1];
  return { points, spells, veils, start: ['Shadowbolt', 'Blood Rite'], shards };
}

module.exports = { ROOT, SITE, page, loadRoutes, vbloodRewards, spellTable };
