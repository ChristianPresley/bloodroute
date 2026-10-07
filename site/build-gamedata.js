// Builds site/gamedata.js (window.BR_GAME): the trimmed game data behind the hover cards and maps, keyed by the names
// the routes use. Sources: data/ (gaming.tools dumps), data/gt/ (captured with site/tools/capture-gt.js), calc/engine.js,
// the routes themselves, and the V Rising Wiki API for the jewel and Ancestral roll pools and a few spell timings
// (cached in data/cache/, so reruns work offline).
// Run: node site/build-gamedata.js [--refresh]   (--refresh downloads the wiki pages again)
// The output is committed (CI can't reach the gaming.tools data); test/fixtures/gamedata.js documents its schema.
'use strict';
const fs = require('fs');
const path = require('path');
const { ROOT, LEXICON, page, loadRoutes } = require('../test/load');
const { recipesByName } = require('./build-needs');
const engine = require('../calc/engine');

const PATCH = '1.1.13';  // the game patch data/ and data/gt/ were captured for
const DATA = path.join(ROOT, 'data'), GT = path.join(DATA, 'gt'), CACHE = path.join(DATA, 'cache');
const OUT = path.join(__dirname, 'gamedata.js');
const BUDGET = 450 * 1024;
const REFRESH = process.argv.includes('--refresh');
const WIKI = 'https://vrising.fandom.com/api.php';
const UA = { 'User-Agent': 'bloodroute data builder (+https://github.com/ChristianPresley/bloodroute)' };

// Names that match several gaming.tools items -> the one the routes mean (the crafted copy, not event or Legendary
// variants; the equippable Soul Shard, not the castle relic; the Epic-from-Sanguine Ancestral shard at Gear Level 30).
const ID_HINT = {
  'Merciless Iron Crossbow': 'item_weapon_crossbow_t06_iron_reinforced', 'Merciless Iron Reaper': 'item_weapon_reaper_t06_iron_reinforced',
  'Merciless Iron Pistols': 'item_weapon_pistols_t06_iron_reinforced', 'Merciless Iron Twinblade': 'item_weapon_twinblades_t06_iron_reinforced',
  'Sanguine Crossbow': 'item_weapon_crossbow_t08_sanguine', 'Sanguine Reaper': 'item_weapon_reaper_t08_sanguine',
  'Sanguine Pistols': 'item_weapon_pistols_t08_sanguine', 'Sanguine Twinblade': 'item_weapon_twinblades_t08_sanguine',
  'Iron Pistols': 'item_weapon_pistols_t05_iron',
  'Ancestral Crossbow Shards': 'item_weapon_crossbow_legendary_t08_shattered', 'Ancestral Reaper Shards': 'item_weapon_reaper_legendary_t08_shattered',
  'Ancestral Pistols Shards': 'item_weapon_pistols_legendary_t08_shattered', 'Ancestral Twinblade Shards': 'item_weapon_twinblades_legendary_t08_shattered',
  'Ancestral Sword Shards': 'item_weapon_sword_legendary_t08_shattered', 'Ancestral Axes Shards': 'item_weapon_axe_legendary_t08_shattered',
  'Ancestral Spear Shards': 'item_weapon_spear_legendary_t08_shattered',
  'Soul Shard of Solarus': 'item_magicsource_soulshard_solarus', 'Soul Shard of the Monster': 'item_magicsource_soulshard_monster',
  'Soul Shard of the Winged Horror': 'item_magicsource_soulshard_manticore',
};
// Refined materials gathered as another material: name -> resource layers (gaming.tools layer ids).
const RAW = {
  'Copper Ingot': ['copper_ore'], 'Iron Ingot': ['iron_ore'], 'Dark Silver Ingot': ['silver_ore'], 'Glass': ['quartz'],
  'Stone Brick': ['stone'], 'Radium Alloy': ['sulphur_ore', 'tech_scrap'], 'Sulphur': ['sulphur_ore'], 'Leather': ['rugged_hide'],
  'Whetstone': ['stone'], 'Gem Dust': ['emery'], 'Ember Glass': ['quartz'],
};
// Names with no game entry: an empty slot, the starting dash and the rotation's action glyphs (BR.h.GLYPH).
const PSEUDO = new Set(['—', 'Starting dash', 'Veil attack', 'Primary attacks', 'Crossbow shot', 'Recast']);

// ---------- Helpers ----------
const sleep = ms => new Promise(r => setTimeout(r, ms));
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
function need(dir, file) {
  const f = path.join(dir, file);
  if (fs.existsSync(f)) return read(f);
  console.error(`Missing ${path.relative(ROOT, f)}. data/ holds the gaming.tools dumps and data/gt/ the browser capture` +
    ' (node site/tools/wanted.js, then site/tools/capture-gt.js on vrising.gaming.tools; see the README).');
  process.exit(1);
}
const RENAME = { 'Empty waterskin': 'Empty Waterskin' };
const nm = s => { const n = String(s ?? '').replace(/[’‘]/g, "'").trim(); return RENAME[n] || n; };
const lower = s => nm(s).toLowerCase();
const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;
const title = s => s.replace(/\b[a-z]/g, c => c.toUpperCase());
const uniq = a => [...new Set(a)];
const split = s => String(s).split(/ or /).map(x => x.trim()).filter(Boolean);
const add = (o, k, v) => { if (v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length)) o[k] = v; return o; };

// Game text: "%125" -> "125%", literal "\n" -> newline, "{value}" placeholders dropped.
const clean = s => String(s ?? '').replace(/\\n|\r?\n/g, '\n').replace(/\{value\}%?\s?/g, '').replace(/%%\s?/g, '')
  .replace(/%(\d+(?:\.\d+)?)/g, '$1%').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

// Wiki markup -> plain text: templates become their display/first argument, links their label.
function wikiText(s) {
  let t = String(s), prev;
  do {
    prev = t;
    t = t.replace(/\{\{([^{}]*)\}\}/g, (m, body) => {
      const args = body.split('|').slice(1);
      const disp = args.find(a => /^display=/.test(a));
      return disp ? disp.slice(8) : (args.find(a => !a.includes('=')) || '');
    });
  } while (t !== prev);
  return t.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, '$1').replace(/'''|''/g, '').replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function wiki(pageName) {
  const file = path.join(CACHE, 'wiki-' + pageName.replace(/[^\w.-]+/g, '_') + '.json');
  const cached = fs.existsSync(file) ? read(file) : undefined;
  if (cached !== undefined && !REFRESH) return cached;
  const u = `${WIKI}?action=parse&format=json&redirects=1&prop=wikitext&page=${encodeURIComponent(pageName)}`;
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(u, { headers: UA });
      if (!r.ok) throw new Error(`${r.status} ${pageName}`);
      const j = await r.json();
      const text = j.error ? null : j.parse.wikitext['*'];
      fs.mkdirSync(CACHE, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(text));
      return text;
    } catch (e) {
      if (t >= 3) { if (cached !== undefined) return cached; console.warn(`wiki: ${pageName}: ${e.message}`); return null; }
      await sleep(1000 * t);
    }
  }
}

// Merges points within `r` world units, widening r until at most `cap` remain.
function cluster(pts, cap = 60) {
  let r = 12, out;
  for (;;) {
    out = [];
    for (const [x, z] of pts) {
      const c = out.find(c => Math.hypot(c[0] - x, c[1] - z) <= r);
      if (c) { c[2]++; c[0] += (x - c[0]) / c[2]; c[1] += (z - c[1]) / c[2]; } else out.push([x, z, 1]);
    }
    if (out.length <= cap) break;
    r *= 1.5;
  }
  return out.map(([x, z]) => [Math.round(x), Math.round(z)]);
}

// ---------- Inputs ----------
// A fresh browser capture (data/gt/gt-capture.json, all parts in one file) is unpacked into data/gt/<part>.json first.
const CAPTURE = path.join(GT, 'gt-capture.json'), META_FILE = path.join(GT, 'meta.json');
if (fs.existsSync(CAPTURE) && (!fs.existsSync(META_FILE) || fs.statSync(CAPTURE).mtimeMs > fs.statSync(META_FILE).mtimeMs)) {
  for (const [part, data] of Object.entries(read(CAPTURE))) fs.writeFileSync(path.join(GT, `${part}.json`), JSON.stringify(data));
  console.log(`unpacked ${path.relative(ROOT, CAPTURE)}`);
}
const META = need(GT, 'meta.json'), MARK = need(GT, 'markers.json'), LISTS = need(GT, 'lists.json');
const GTI = need(GT, 'items.json'), GTA = need(GT, 'abilities.json'), GTN = need(GT, 'npcs.json');
const GTB = need(GT, 'bloodtypes.json'), GTP = need(GT, 'blueprints.json');
const RAWF = need(DATA, 'raw_full.json'), DITEMS = need(DATA, 'items.json');

// raw_full item records in the shape capture-gt.js trims them to.
const ref = e => e && { id: e.id, name: e.name };
function trimDrops(list) {
  const by = new Map();
  for (const d of list || []) {
    const src = d.source || {}, key = src.id || d.sourcePrefabName;
    const cur = by.get(key) || { id: src.id || null, name: src.name || d.sourcePrefabName, prefab: d.sourcePrefabName, cats: src.categories || [], rate: 0, locations: 0 };
    cur.rate = Math.max(cur.rate, d.dropRate || 0); cur.locations = Math.max(cur.locations, d.locationCount || 0);
    by.set(key, cur);
  }
  return [...by.values()].sort((a, b) => b.rate - a.rate || b.locations - a.locations).slice(0, 25);
}
const fromRaw = d => d && ({
  id: d.id, name: d.name, cats: d.categories, type: d.itemType, equip: d.equipmentType, weapon: d.weaponType,
  rarity: d.rarityName, gl: d.gearLevel, desc: d.description, icon: d.iconPath,
  stats: (d.statModifications || []).map(s => [s.statType, s.modificationType, r1(s.value)]),
  abilities: (d.grantedAbilities || []).map(ref),
  recipes: (d.recipes || []).map(r => ({
    time: r.craftDuration, stations: (r.workstations || []).map(w => w.name),
    inputs: (r.requirements || []).map(q => [q.item && q.item.name, q.amount]),
    outputs: (r.outputs || []).map(q => [q.item && q.item.name, q.amount]), unlock: (r.unlockSources || []).map(ref),
  })),
  drops: trimDrops(d.dropSources),
});
const detail = id => GTI[id] || fromRaw(RAWF.items[id]) || null;
const listItem = Object.fromEntries(LISTS.items.map(i => [i.id, i]));
const setOf = {};
for (const s of LISTS.itemsets) for (const i of s.items || []) setOf[i.id] = s;

// ---------- Names the routes show ----------
function routeNames() {
  const all = new Set(), strict = new Map(), needs = new Set(), bosses = new Set();
  const note = (n, where) => { if (PSEUDO.has(n)) return; all.add(n); if (!strict.has(n)) strict.set(n, where); };
  for (const r of loadRoutes().filter(r => r.def)) {
    r.icons.forEach(n => all.add(n));
    for (const p of r.def.phases) {
      const lo = p.loadout || {};
      (lo.slots || []).forEach(s => split(s).forEach(n => note(n, `${r.arch.id} ${p.id} slot`)));
      (lo.gear || []).forEach(g => split(g).forEach(n => note(n, `${r.arch.id} ${p.id} gear`)));
      for (const k of ['pre', 'order', 'fill']) ((lo.rot || {})[k] || []).forEach(x => all.add(typeof x === 'string' ? x : x && x.n));
      p.bosses.forEach(b => { all.add(b.name); bosses.add(b.name); });
    }
    Object.keys(r.def.resources || {}).forEach(n => all.add(n));
    Object.keys(r.def.needs || {}).forEach(n => { all.add(n); needs.add(n); });
    Object.keys(r.def.info || {}).forEach(n => all.add(n));
  }
  const p = page();
  p.run('js/core.js');
  for (const f of LEXICON) { try { p.run(f); } catch {} }
  p.run('routes/shared.js');
  const { WEAPONS, CARRIERS } = p.window.BR.shared;
  const skills = {};
  for (const w of WEAPONS) { all.add(w.icon); w.skills.forEach(([n]) => { all.add(n); skills[n] = w.w; }); }
  const lexSkills = (p.window.BR.lex || {}).WEAPON_SKILLS || {};
  for (const [w, list] of Object.entries({ ...lexSkills, Crossbow: ['Rain of Bolts', 'Snapshot'] })) list.forEach(n => { all.add(n); skills[n] ??= w; });
  for (const n of [...all]) if (!n || PSEUDO.has(n)) all.delete(n);
  return { all, strict, needs, bosses, skills, WEAPONS: JSON.parse(JSON.stringify(WEAPONS)), CARRIERS: JSON.parse(JSON.stringify(CARRIERS)) };
}

// ---------- Resolution ----------
const itemsByName = new Map();
for (const i of LISTS.items) {
  // Skip research entries (type Tech, blueprint books), debug/transmog/trader copies, base templates and jewels (by spell).
  if (/^item_(debug|transmog|dummy)_|^item_ingredient_book_|trader_template|transmogtest|_base$|^item_jewel_/.test(i.id) || i.type === 'Tech') continue;
  const k = lower(i.name);
  if (!itemsByName.has(k)) itemsByName.set(k, []);
  itemsByName.get(k).push(i.id);
}
const preferred = recipesByName(DITEMS);
const sig = list => (list || []).map(([n]) => lower(n)).sort().join('|');
function pickItem(name) {
  const ids = itemsByName.get(lower(name)) || [];
  if (!ids.length) return null;
  if (ID_HINT[name] && ids.includes(ID_HINT[name])) return ID_HINT[name];
  const want = preferred[name] && sig(preferred[name].recipe.ingredients);
  const score = id => {
    const d = detail(id), rs = (d && d.recipes) || [];
    return (d ? 4 : 0) + (want && rs.some(r => sig(r.inputs) === want) ? 2 : 0) + (rs.some(r => r.stations.length) ? 1 : 0) - (/^item_building_/.test(id) ? 8 : 0);
  };
  return ids.slice().sort((a, b) => score(b) - score(a))[0];
}
const abilitiesByName = new Map();
for (const a of Object.values(GTA)) { const k = lower(a.name); if (!abilitiesByName.has(k)) abilitiesByName.set(k, []); abilitiesByName.get(k).push(a); }
const JEWEL = /^(Regular|Greater|Primal) (?:(\w+) )?jewel$/i, TIER = { regular: 2, greater: 3, primal: 4 };
const stationsByName = Object.fromEntries(Object.values(GTP).map(b => [nm(b.name), b]));
const passiveNames = new Set(LISTS.items.filter(i => /^item_ingredient_passive_/.test(i.id)).map(i => lower(i.name)));
const bloodNames = new Set(Object.keys(GTB));

// The NPC behind a V Blood name: prefer the real fight over Blood Soul, minion and unused copies.
function bossId(name) {
  const c = LISTS.npcs.filter(n => n.vblood && lower(n.name) === lower(name));
  const bad = id => /gateboss|_unused|_minion|_summon|_servant/.test(id);
  return (c.find(n => !bad(n.id)) || c[0] || {}).id || null;
}

function resolver(skills) {
  // Weapon skills: the ability each vampire weapon grants (Iron tier first), by name.
  const skillIds = {};
  const weapons = Object.values(GTI).filter(d => d.equip === 'Weapon').sort((a, b) => (/^Iron /.test(b.name) ? 1 : 0) - (/^Iron /.test(a.name) ? 1 : 0));
  for (const d of weapons) for (const a of d.abilities || []) if (!/Primary Attack/i.test(a.name)) skillIds[lower(a.name)] ??= { id: a.id, weapon: d.weapon };
  return function resolve(name) {
    if (PSEUDO.has(name)) return { type: 'skip' };
    const k = lower(name), ab = abilitiesByName.get(k) || [];
    const vis = ab.find(a => a.hidden === false);
    if (vis) return { type: 'ability', id: vis.id };
    const form = ab.find(a => a.school === 'Shapeshift' && /_group$/.test(a.id) && !/takeflight/.test(a.id));
    if (form) return { type: 'ability', id: form.id };
    const sk = Object.keys(skills).find(s => lower(s) === k);
    if (sk && skillIds[k]) return { type: 'ability', id: skillIds[k].id, weapon: skills[sk] || skillIds[k].weapon };
    if (bloodNames.has(name)) return { type: 'blood' };
    const j = name.match(JEWEL);
    if (j) return { type: 'jewel', tier: TIER[j[1].toLowerCase()], school: j[2] ? title(j[2].toLowerCase()) : null };
    const id = pickItem(name);
    if (id) return { type: 'item', id };
    if (passiveNames.has(k)) return { type: 'passive' };
    if (stationsByName[name]) return { type: 'station' };
    const boss = bossId(name);
    if (boss) return { type: 'boss', id: boss };
    return null;
  };
}

// ---------- Items ----------
const STAT_NAME = { MaxHealth: 'Max Health', SpellCriticalStrikeChance: 'Spell Critical Chance', PhysicalCriticalStrikeChance: 'Physical Critical Chance',
  SpellCooldownRecoveryRate: 'Spell Cooldown Rate', SpellLifeLeech: 'Spell Leech', DamageVsUndeads: 'Damage vs Undead' };
const PCT = /^Bonus|^DamageVs|Chance$|Rate$|Leech$|Speed$|^DamageReduction$|^ReducedBloodDrain$|^ResourceYield$|^WeaponSkillPower$/;
function stat([type, , value]) {
  if (!value) return null;  // random-roll placeholders (BonusSpellPower 0 …)
  const pct = PCT.test(type) && Math.abs(value) <= 1;
  const label = STAT_NAME[type] || type.replace(/^Bonus/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/ Vs /, ' vs ');
  return [label, pct ? r1(value * 100) : r1(value), pct ? '%' : ''];
}
function kindOf(d) {
  const cats = (d.cats || []).join(' ');
  if (d.type === 'Jewel' || /jewels/.test(cats)) return 'jewel';
  if (d.equip === 'Weapon' || /equipment\/weapons/.test(cats)) return 'weapon';
  if (d.equip === 'MagicSource' || /magic-sources/.test(cats)) return 'jewelry';
  if (d.equip || /equipment\/(armor|cloaks)/.test(cats)) return 'armor';
  if (/consumables\/(other|blood-potions)/.test(cats)) return 'consumable';
  if (/materials|consumables\/alchemy/.test(cats) || d.type === 'Stackable') return 'material';
  return 'other';
}
const ARMOR_CAT = { Footgear: 'Boots', Headgear: 'Head', Legs: 'Legs' };
function catOf(d, kind, name) {
  const seg = ((d.cats || [])[0] || '').split('/').pop();
  if (kind === 'weapon') return d.weapon || (seg && title(seg.replace(/s$/, '')));
  if (kind === 'armor') return ARMOR_CAT[d.equip] || d.equip || (seg && title(seg));
  if (kind === 'jewelry') return 'Magic Source';
  if (kind === 'jewel') return 'Jewel';
  if (kind === 'consumable') {
    const c = [[/^Elixir/, 'Elixir'], [/ Coating$/, 'Coating'], [/Brew/, 'Brew'], [/Potion|Flask/, 'Potion'], [/Salve/, 'Salve']].find(([re]) => re.test(name));
    return c ? c[1] : /blood-potions/.test((d.cats || []).join(' ')) ? 'Blood Potion' : 'Consumable';
  }
  return seg ? title(seg.replace(/-/g, ' ').replace(/s$/, '')).replace(/^Other$/, 'Material') : undefined;
}
// A consumable's effect in one line, from its description.
function effectOf(desc) {
  const d = clean(desc);
  let m = d.match(/increases (.+?) for (\d+ (?:minutes?|seconds?))/i);
  if (m) {
    const parts = m[1].split(/,? and |, /).map(p => { const q = p.match(/^(.+?) by ([\d.]+%?)$/); return q && `${title(q[1].replace(/^bonus /i, ''))} +${q[2]}`; });
    if (parts.every(Boolean)) return `${parts.join(', ')} for ${m[2]}`;
  }
  m = d.match(/recovers ([\d.]+%) of your maximum health over ([\d.]+s)/i);
  if (m) return `Heals ${m[1]} of max health over ${m[2]}`;
  m = d.match(/Your next primary attack ([^.]+)\./);
  if (m) {
    const every = d.match(/recharges every ([\d.]+s)/), last = d.match(/lasts for (\d+ minutes)/);
    return `Next primary attack ${m[1]}${every ? `; recharges every ${every[1]}` : ''}${last ? `, lasts ${last[1]}` : ''}`;
  }
  return undefined;
}
// Who teaches a recipe: bosses, research stations and journal quests (not the internal "Tech …" entries or blueprint books).
function unlocks(list) {
  const out = [];
  for (const u of list || []) {
    let n = null;
    if (/^char_/.test(u.id) && !/_unused$|_minion$|gateboss/.test(u.id)) n = u.name;
    else if (/^tm_researchstation_/.test(u.id)) n = u.name;
    else if (/^journal_/.test(u.id)) n = `Journal: ${u.name}`;
    if (n && !out.includes(nm(n))) out.push(nm(n));
  }
  return out;
}
// The recipe the routes use: a station recipe that isn't a vendor trade, the basic station first.
function recipeOf(d, name) {
  const rs = (d.recipes || []).filter(r => r.inputs && r.inputs.length && !r.inputs.some(([n]) => / Coin$/.test(n || '')));
  const r = rs.find(r => r.stations.length && (r.outputs || [])[0] && lower(r.outputs[0][0]) === lower(name)) || rs.find(r => r.stations.length) || rs[0];
  if (!r) return undefined;
  const station = r.stations.find(s => !/^Advanced /.test(s)) || r.stations[0];
  const outs = r.outputs || [], mine = outs.find(([n]) => lower(n) === lower(name));
  const o = { station };
  add(o, 'time', r.time && r1(r.time));
  o.inputs = r.inputs.filter(([n]) => n).map(([n, q]) => [nm(n), q]);
  add(o, 'unlock', unlocks(r.unlock));
  if (mine && mine[1] !== 1) o.out = mine[1];
  if (outs.length && lower(outs[0][0]) !== lower(name)) o.byproduct = nm(outs[0][0]);
  return o;
}

// ---------- Drop sources ----------
const FACTION = { Chuch: 'Church', Church: 'Church', Bandit: 'Bandit', Militia: 'Militia', Blackfang: 'Blackfang' };
const words = s => s.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
const SOURCE_RULES = [
  [/^TM_Carriage(Chest|Container)_(Chuch|Church|Bandit|Militia|Blackfang)/, (m, t, f) => `Carriage ${t.toLowerCase()} (${FACTION[f]})`],
  [/^TM_Castle_Chain_(?:Plant|Tree)_([A-Za-z]+?)_(?:Object|Grow)/, (m, p) => `${words(p)} (castle garden)`],
  [/^TM_Plant_([A-Za-z]+?)_\d+_Pickup/, (m, p) => `${words(p)} plant`],
  [/^TM_Plantfiber(?:_Strongblade_)?([A-Za-z]+?)(?:_[A-Za-z]+)?_?\d+_(?:Harvested_)?Pickup/, (m, p) => `Wild ${words(p).toLowerCase()}`],
  [/^TM_CottonPickup/, () => 'Wild cotton'],
  [/^TM_Gem(Crude|Regular|Flawless)_/, (m, t) => `${t} gem node`],
  [/^TM_(Copper|Iron|Silver|Quartz|Emery|Obsidian|GhostCrystal|BloodCrystal|Mech|Rock)(?:Big|Medium)?_\d+_Stage\d_Resource/, (m, p) => `${({ Mech: 'Scrap', Rock: 'Stone' })[p] || words(p)} node`],
  [/^TM_MechCorpse_UnitCorpse_Tank_([A-Za-z]+?)_\d+/, (m, u) => `${words(u)} wreck`],
  [/^TM_(?:Large)?(?:Pine|Spruce|Birch|Oak|PineOld|PineSnow|OakCursed|OakSkeleton|StrongBlade\w*Tree|CursedRottenStub)/, () => 'Tree'],
  [/^TM_Spider_Cocoon/, () => 'Spider cocoon'],
  [/^TM_Noctem_RiftCrystalChild_Tier0(\d)/, (m, t) => `Rift crystal (tier ${t})`],
  [/^Char_Fish_General/, () => 'Fishing'],
];
const SKIP_SOURCE = /^AB_|^GateBossComponents|^TM_Debug|^ServantMission_TEST|^TM_ScarecrowDummy/;
function sourceName(d, lootNames) {
  const pf = d.prefab || d.name || '';
  if (lootNames[pf]) return lootNames[pf];
  for (const [re, f] of SOURCE_RULES) { const m = pf.match(re); if (m) return f(...m); }
  return words(pf.replace(/^TM_/, '').replace(/_(Full|Pickup|Object|Resource|Stage\d|Large|Small|SPECIAL)\b/g, '').replace(/_?\d+$/, '')
    .replace(/_?\d+(?=_|$)/g, ''));
}

// ---------- Build ----------
async function main() {
  const R = routeNames();
  const resolve = resolver(R.skills);
  const out = {
    version: { data: META.version, patch: PATCH, captured: String(META.captured).slice(0, 10) },
    credit: { data: 'vrising.gaming.tools', map: 'V Rising Wiki', jewels: 'V Rising Wiki (CC BY-SA)', rolls: 'V Rising Wiki (CC BY-SA)' },
    bounds: { minX: MARK.bounds.minimumX, minZ: MARK.bounds.minimumZ, maxX: MARK.bounds.maximumX, maxZ: MARK.bounds.maximumZ },
    items: {}, abilities: {}, npcs: {}, blood: {}, sets: {}, stations: {}, jewels: {}, rolls: [], layers: {}, mats: {}, waygates: [],
  };
  const skipped = [];
  const lootNames = Object.fromEntries(Object.entries(MARK.loot).map(([pf, v]) => [pf, v.name]));

  // NPC display names: the carriers the routes list ("Bandit Rascal 10 · Thug 16" -> Bandit Thug), bandits with their
  // faction, everyone else by their in-game name.
  const npcName = {}, carriers = {};
  const realNpc = id => !/_servant|_summon|_vblood|_minion|_micropoi|_cocoon|gateboss|targetdummy|_unused/.test(id);
  const hasMarkers = id => !!MARK.creatures[id];
  const NPC_ALIAS = { 'militia crossbowman': 'Militia Crossbow' };  // route spelling -> game name
  const findNpc = n => LISTS.npcs.filter(x => lower(x.name) === lower(NPC_ALIAS[lower(n)] || n) && realNpc(x.id));
  for (const [blood, rows] of Object.entries(R.CARRIERS)) {
    const list = carriers[blood] = [];
    for (const [, text] of rows) {
      // "Militia Torchbearer 36 · Guard 40" -> Militia Guard; "Slave Master (pistol) 65" keeps its qualifier.
      const entries = text.split(' · ').map(e => e.replace(/\s*\((?:these|also)[^)]*\)/, '').replace(/\s+\d+(?:–\d+)?\s*$/, '').trim());
      const lead = entries[0].replace(/\s*\([^)]*\)$/, '').split(' ');
      const first = lead.length > 1 ? lead[0] : null;
      let prefix = null, faction0 = null;  // prefix: a word the game's name lacks ("Bandit" Rascal), inherited by the rest
      entries.forEach((e, i) => {
        const q = (e.match(/\(([^)]+)\)$/) || [])[1], short = e.replace(/\s*\([^)]*\)$/, '');
        let c = i && first ? findNpc(`${first} ${short}`) : [];
        const whole = c.length > 0;
        if (!c.length) c = findNpc(short);
        if (!c.length && !i && first) c = findNpc(short.split(' ').slice(1).join(' '));
        const byBlood = c.filter(x => x.blood === blood);
        const pick = (byBlood.length ? byBlood : c).sort((a, b) => hasMarkers(b.id) - hasMarkers(a.id))[0];
        if (!pick) { console.warn(`carriers: no NPC for "${e}" (${blood})`); return; }
        const faction = pick.id.split('_')[1];
        let display = short;
        if (!i) { faction0 = faction; if (first && lower(pick.name) !== lower(short)) prefix = first; }
        else if (whole) display = nm(pick.name);
        else if (prefix && faction === faction0) display = `${prefix} ${short}`;
        if (q) display += ` (${q})`;
        npcName[pick.id] ??= display;
        if (!list.includes(npcName[pick.id])) list.push(npcName[pick.id]);
      });
    }
  }
  const nameOfNpc = (id, gtName) => npcName[id] || (/^char_bandit_/.test(id) && realNpc(id) && !/^Bandit\b/.test(gtName) ? `Bandit ${nm(gtName)}` : nm(gtName));

  const layerFor = id => {
    const c = MARK.creatures[id];
    if (!c || !c.pts.length) return null;
    const key = `npc:${id}`;
    out.layers[key] ??= { name: nameOfNpc(id, c.name), pts: cluster(c.pts) };
    return key;
  };
  const dropNpc = {};  // drop source name -> NPC id
  function drops(d, keep, min) {
    const by = new Map();
    for (const s of d.drops || []) {
      if (SKIP_SOURCE.test(s.prefab || s.name || '') || !(s.rate >= min)) continue;
      const npc = s.id && /^char_/.test(s.id);
      const vblood = npc && ((s.cats || []).includes('npcs/v-blood-carriers') || /_vblood/.test(s.id)) && !/gateboss/.test(s.id);
      const servant = /^servantmission_/.test(s.id || '') || /^ServantMission_/.test(s.prefab || '');
      const name = npc ? (vblood ? nm(s.name) : nameOfNpc(s.id, s.name)) : servant ? `Servant hunt: ${nm(s.name)}` : sourceName(s, lootNames);
      const cur = by.get(name);
      if (cur) { cur.rate = Math.max(cur.rate, s.rate); cur.locations += s.locations || 0; continue; }
      by.set(name, { name, rate: s.rate, kind: npc ? (vblood ? 'vblood' : 'npc') : 'loot', id: s.id, prefab: s.prefab, servant, locations: s.locations || 0 });
    }
    // Servant hunts are a castle chore, not a place to farm: list them after real sources.
    const list = [...by.values()].sort((a, b) => (a.servant - b.servant) || b.rate - a.rate || b.locations - a.locations).slice(0, keep);
    return list.map(s => {
      const o = { name: s.name, rate: r3(s.rate), kind: s.kind };
      let layer = null, n = s.locations;
      if (s.kind === 'npc') layer = layerFor(s.id), n = MARK.creatures[s.id] ? MARK.creatures[s.id].pts.length : n;
      else if (s.prefab && MARK.loot[s.prefab]) {
        layer = `loot:${s.prefab}`;
        out.layers[layer] ??= { name: s.name, pts: cluster(MARK.loot[s.prefab].pts) };
        n = MARK.loot[s.prefab].pts.length;
      }
      if (s.kind !== 'vblood') add(o, 'n', n || undefined);
      add(o, 'layer', layer);
      if (s.kind === 'npc') dropNpc[s.name] = s.id;
      return o;
    });
  }

  // Items, abilities, blood, stations, bosses from the route names; recipe inputs one level down.
  const setIds = new Set(), npcWanted = new Map(), itemQueue = [];
  const jewelUnlock = {};
  for (const d of Object.values(GTI)) {
    const m = d.id.match(/^item_jewel_\w+?_t0(\d)_/);
    if (m && !jewelUnlock[m[1]]) { const r = (d.recipes || [])[0]; if (r && r.unlock.length) jewelUnlock[m[1]] = unlocks(r.unlock); }
  }
  function addItem(name, id, depth) {
    if (out.items[name]) return;
    const d = detail(id), li = listItem[id] || {};
    if (!d) { out.items[name] = add(add({ id, kind: 'material' }, 'cat', catOf(li, 'material', name)), 'icon', li.icon); return; }
    const kind = kindOf(d), o = { id, kind };
    add(o, 'cat', catOf(d, kind, name)); add(o, 'rarity', d.rarity); add(o, 'gl', d.gl);
    add(o, 'desc', clean(d.desc));
    if (kind === 'consumable') add(o, 'effect', effectOf(d.desc));
    add(o, 'stats', (d.stats || []).map(stat).filter(Boolean));
    if (kind === 'weapon') add(o, 'skills', uniq((d.abilities || []).filter(a => !/Primary Attack/i.test(a.name)).map(a => {
      const k = Object.keys(R.skills).find(s => lower(s) === lower(a.name)); return k || nm(a.name);
    })));
    const set = setOf[id];
    if (set) { o.set = set.name; setIds.add(set.id); }
    const recipe = recipeOf(d, name);
    add(o, 'recipe', recipe);
    // Materials: the best farming spots. Gear and brews: only drops worth chasing (bosses, 5%+).
    if (kind === 'material' || kind === 'consumable' || !recipe) add(o, 'drops', kind === 'material' ? drops(d, 6, 0.01) : drops(d, 4, 0.05));
    add(o, 'icon', d.icon || li.icon);
    out.items[name] = o;
    if (recipe && depth < 1) for (const [n] of recipe.inputs) itemQueue.push([n, depth + 1]);
  }
  function addJewel(name, tier, school) {
    const s = (school || 'Chaos').toLowerCase(), id = `item_jewel_${s}_t0${tier}`;
    const d = detail(id);
    const o = { id, kind: 'jewel', cat: 'Jewel', rarity: ({ 2: 'Rare', 3: 'Epic', 4: 'Legendary' })[tier] };
    add(o, 'desc', `A jewel with ${['', 'one', 'two', 'three', 'four'][tier]} modifiers for one ${school ? school + ' ' : ''}spell.`);
    const r = d && (d.recipes || [])[0];
    if (r) {
      // Without a school the gem is "of the spell's school": Regular or Flawless gem.
      const inputs = r.inputs.map(([n, q]) => [!school && /^(Regular|Flawless) /.test(n) ? `${n.split(' ')[0]} gem` : nm(n), q]);
      o.recipe = add({ station: 'Jewelcrafting Table', inputs }, 'unlock', jewelUnlock[tier]);
      for (const [n] of inputs) if (!/ gem$/.test(n)) itemQueue.push([n, 1]);
    }
    add(o, 'icon', d && d.icon);
    out.items[name] = o;
  }

  const kinds = {};
  for (const name of [...R.all].sort()) {
    const r = resolve(name);
    if (!r) continue;  // listed at the end; only loadout and boss names must resolve
    kinds[name] = r;
    if (r.type === 'item') itemQueue.push([name, 0, r.id]);
    else if (r.type === 'jewel') addJewel(name, r.tier, r.school);
    else if (r.type === 'passive' || r.type === 'skip') skipped.push(name);
  }
  while (itemQueue.length) {
    const [name, depth, id] = itemQueue.shift();
    if (out.items[name]) continue;
    const pick = id || pickItem(name);
    if (pick) addItem(name, pick, depth);
  }
  // Every loadout slot, piece of gear and boss must resolve (Stygian passives resolve but are skipped: their text
  // lives in js/lexicon-data.js).
  const failures = [...R.strict].filter(([n]) => !kinds[n]).map(([n, w]) => `${n} (${w})`)
    .concat([...R.bosses].filter(b => !bossId(b)).map(b => `${b} (boss)`));
  if (failures.length) { console.error('Unresolved route names:\n  ' + failures.join('\n  ')); process.exit(1); }

  // Abilities: game text, timings from the simulator, the wiki or the weapon table.
  const SLOT = { SpellSlot1: 'Spell', SpellSlot2: 'Spell', Travel: 'Veil', Ultimate: 'Ultimate' };
  const weaponCd = {};
  for (const w of R.WEAPONS) for (const [n, , cd] of w.skills) weaponCd[n] = cd;
  for (const s of engine.WEAPON_SKILLS) weaponCd[s.name] = s.cd;
  const engineAb = Object.fromEntries(engine.ABILITIES.map(a => [a.name, a]));
  const engineSkill = Object.fromEntries(engine.WEAPON_SKILLS.map(a => [a.name, a]));
  for (const [name, r] of Object.entries(kinds)) {
    if (r.type !== 'ability') continue;
    const a = GTA[r.id] || {}, raw = RAWF.abilities[r.id] || {};
    const o = { id: r.id };
    const school = a.school || raw.abilitySchool;
    if (r.weapon) { o.slot = 'Weapon'; o.weapon = r.weapon; }
    else if (school === 'Shapeshift') o.slot = /Form$/.test(name) ? 'Form' : 'Other';
    else { add(o, 'school', school); o.slot = SLOT[a.type || raw.abilityType] || 'Other'; }
    add(o, 'desc', clean(a.desc || raw.description));
    const e = engineAb[name] || engineSkill[name];
    if (e) { o.cd = e.cd; add(o, 'cast', e.cast); if (e.charges > 1) o.charges = e.charges; }
    else if (r.weapon && weaponCd[name]) o.cd = weaponCd[name];
    else if (['Spell', 'Veil', 'Ultimate'].includes(o.slot)) {
      // Spells the simulator doesn't model (Blood Rage, Power Surge, Discharge, Cold Snap, Phantom Aegis, Ice Block):
      // cooldown and cast time from the wiki page's AbilityInfobox.
      const t = await wiki(name);
      const num = k => { const m = (t || '').match(new RegExp(`\\|\\s*${k}\\s*=\\s*([\\d.]+)`)); return m ? +m[1] : undefined; };
      add(o, 'cd', num('cooldown')); add(o, 'cast', num('castTime')); const ch = num('charges'); if (ch > 1) o.charges = ch;
      if (o.cd === undefined) console.warn(`abilities: no cooldown for ${name}`);
    }
    add(o, 'icon', a.icon || raw.iconPath);
    out.abilities[name] = o;
  }

  // Blood types: tier text and carriers.
  for (const [name, r] of Object.entries(kinds)) {
    if (r.type !== 'blood') continue;
    const b = GTB[name];
    const o = { tiers: (b.primary || []).map(t => [t.order, clean(t.desc)]).filter(([, t]) => t) };
    let list = carriers[name];
    if (!list) {
      list = [];
      const seen = new Set();
      for (const n of (b.npcs || []).filter(n => realNpc(n.id) && hasMarkers(n.id))) {
        const dn = nameOfNpc(n.id, n.name);
        if (seen.has(dn) || list.length >= 10) continue;
        seen.add(dn); npcName[n.id] ??= dn; list.push(dn);
      }
    }
    o.carriers = list;
    for (const c of list) npcWanted.set(c, 'carrier');
    out.blood[name] = o;
  }

  // Sets.
  for (const s of LISTS.itemsets) {
    if (!setIds.has(s.id)) continue;
    const bonus = t => { const c = clean(t), m = c.match(/^Increases? (.+?) by (\d+(?:\.\d+)?%?)\.?$/); return m ? `+${m[2]} ${m[1]}` : c; };
    out.sets[s.name] = { pieces: s.items.map(i => nm(i.name)), bonuses: (s.bonuses || []).map(b => [b.requiredItems || b.pieces, bonus(b.description)]) };
  }

  // Stations: every captured castle station (the routes, recipes and js/lexicon.js name most of them).
  for (const n of Object.keys(stationsByName).sort()) {
    const b = stationsByName[n];
    const o = add({}, 'desc', clean(b.desc));
    add(o, 'cost', (b.cost || []).map(([i, q]) => [nm(i), q]));
    add(o, 'unlock', unlocks(b.unlock));
    out.stations[n] = o;
  }

  // NPCs: every route V Blood, plus blood carriers and the NPCs that drop the materials the routes stockpile.
  const vbMarkers = {};
  for (const v of MARK.vblood) (vbMarkers[v.id] ??= []).push(v.p);
  const shard = MARK.landmarks.find(l => l.name === 'Soul Shard of Dracula');
  const ABILITY_JUNK = /Emote|Idle|Aggro|Wake Up|Target Switch|Combat Tag|Unknown Error|Travel To Position|Disconnected|Add To Duel|Fly (Start|End)|Jump (Down|Back)|Weapon (Equip|Malfunction)|Change Phase|Target ?buff|Relocate|Lineup|Step Back|Side Step|Clear Check|Centre Travel|Corpse Buff|^Awake$|Transform To|Request Aid|On Aggro|Soar Travel/i;
  // Boss attack names carry the unit's internal name ("Bandit Stone Breaker VBlood Reinforcement"): strip leading words
  // that spell out the NPC id's parts (alone or run together: Stone Breaker = stonebreaker) or a faction.
  const FACTIONS = ['vblood', 'bandit', 'undead', 'militia', 'gloomrot', 'blackfang', 'cursed', 'vhunter', 'vampire', 'legion', 'boss', 'elite', 'gargoyle', 'deadeye'];
  function abilityName(a, id) {
    const vocab = new Set([...id.split('_').slice(1), ...FACTIONS]);
    const w = a.replace(/\bFrostt\b/g, 'Frost').replace(/\bAreana\b/g, 'Arena')
      .replace(/\s+(Hard|HARD|Abilitygroup|Intense|First|Second|Single|Double|Tripple|Far|Humanoid|Short|Long|Small|Fast|Low Health)\b/g, '').split(' ');
    let i = 0;
    outer: while (i < w.length - 1) {
      for (let j = Math.min(w.length - 1, i + 4); j > i; j--) if (vocab.has(w.slice(i, j).join('').toLowerCase())) { i = j; continue outer; }
      break;
    }
    const s = w.slice(i).join(' ');
    return !s || ABILITY_JUNK.test(a) || ABILITY_JUNK.test(s) ? null : s;
  }
  const npcStats = s => s && {
    pp: r1(s.physicalPower || 0), sp: r1(s.spellPower || 0), dr: r1((s.damageReduction || 0) * 100),
    physRes: r1((s.physicalResistance || 0) * 100), spellRes: r1((s.spellResistance || 0) * 100), fireRes: r1(s.fireResistance || 0),
  };
  const npcRes = r => {
    const o = {}, f = { silver: 'silverDamageReduction', holy: 'holyDamageReduction', garlic: 'garlicDamageReduction', sun: 'sunPiercingDuration', fire: 'fireDamageReduction' };
    for (const [k, src] of Object.entries(f)) if (r && r[src]) o[k] = r1(r[src]);
    return Object.keys(o).length ? o : undefined;
  };
  const dropIds = {};
  const npcDrops = (d, keep) => {
    const by = new Map();
    for (const x of d.drops || []) {
      if (/^item_ingredient_book_/.test(x.id || '')) continue;
      const n = nm(x.item);
      by.set(n, Math.max(by.get(n) || 0, x.rate || 0));
      dropIds[n] ??= x.id;
    }
    return [...by].sort((a, b) => b[1] - a[1]).slice(0, keep).map(([n, r]) => [n, r3(r)]);
  };
  for (const name of [...R.bosses].sort()) {
    const id = bossId(name), d = GTN[id] || {};
    const o = { id, lv: d.lv, vblood: true };
    add(o, 'unit', d.unit);
    if (d.desc && d.desc !== 'No Description') o.desc = clean(d.desc);
    add(o, 'stats', npcStats(d.stats)); add(o, 'res', npcRes(d.res));
    add(o, 'abilities', uniq((d.abilities || []).map(a => abilityName(a, id)).filter(Boolean)));
    add(o, 'drops', npcDrops(d, 12));
    o.spawns = /Nibbles/.test(name) ? [] : /^Dracula/.test(name) ? (shard ? [shard.p] : []) : (vbMarkers[id] || []).map(p => p.map(Math.round));
    out.npcs[name] = o;
  }
  for (const mat of R.needs) {
    const it = out.items[nm(mat)];
    for (const s of (it && it.drops) || []) if (s.kind === 'npc' && dropNpc[s.name]) npcWanted.set(s.name, dropNpc[s.name]);
  }
  const idByName = {};
  for (const n of LISTS.npcs) if (realNpc(n.id)) { const dn = nameOfNpc(n.id, n.name); (idByName[dn] ??= []).push(n.id); }
  for (const [name, hint] of npcWanted) {
    if (out.npcs[name]) continue;
    const ids = hint !== 'carrier' ? [hint] : Object.keys(npcName).filter(id => npcName[id] === name);
    const all = uniq([...ids, ...(idByName[name] || [])]).filter(id => GTN[id] || listItem[id] || LISTS.npcs.some(n => n.id === id));
    const id = all.find(i => GTN[i]) || all[0];
    if (!id) { console.warn(`npcs: no data for ${name}`); continue; }
    const d = GTN[id] || LISTS.npcs.find(n => n.id === id) || {};
    const o = { id, lv: d.lv };
    add(o, 'unit', d.unit); add(o, 'blood', d.blood);
    if (d.desc && d.desc !== 'No Description') o.desc = clean(d.desc);
    add(o, 'drops', npcDrops(d, 6));
    // Same-named variants (a Knight with a shield or a two-hander) share one card: merge their spawns.
    const pts = all.flatMap(i => (MARK.creatures[i] || { pts: [] }).pts);
    o.spawns = cluster(pts);
    out.npcs[name] = o;
  }

  // What NPCs drop and the inputs of second-level recipes: a name, kind and icon for each item the cards list that
  // isn't in items yet.
  const stub = (n, id) => {
    const li = listItem[id];
    if (out.items[n] || !li || /^item_ingredient_passive_/.test(li.id)) return;
    const kind = kindOf(li);
    out.items[n] = add(add(add({ id: li.id, kind }, 'cat', catOf(li, kind, n)), 'rarity', li.rarity), 'icon', li.icon);
  };
  for (const n of uniq(Object.values(out.npcs).flatMap(v => (v.drops || []).map(([i]) => i)))) stub(n, dropIds[n]);
  for (const it of Object.values(out.items)) for (const [n] of (it.recipe && it.recipe.inputs) || []) if (!/ gem$/.test(n)) stub(n, pickItem(n));

  // Materials: where each stockpiled material and recipe input is gathered.
  const layerName = {};
  for (const [lid, l] of Object.entries(MARK.resources)) layerName[lower(l.name)] = lid;
  const matNames = new Set([...R.needs].map(nm));
  const GEAR = new Set(['weapon', 'armor', 'jewelry', 'jewel', 'consumable']);
  for (const it of Object.values(out.items)) if (it.recipe) it.recipe.inputs.forEach(([n]) => {
    if (!/ gem$|^Any /.test(n) && !(out.items[n] && GEAR.has(out.items[n].kind))) matNames.add(n);
  });
  // Every resource layer goes in (js/lexicon-data.js names some the routes don't stockpile, like Clay).
  for (const [lid, l] of Object.entries(MARK.resources)) out.layers[lid] = { name: nm(l.name), pts: cluster(l.pts) };
  const useLayer = lid => (out.layers[lid] ? lid : null);
  for (const name of [...matNames].sort()) {
    const it = out.items[name];
    const o = { layers: [] };
    const direct = layerName[lower(name)];
    if (direct) o.layers.push(useLayer(direct));
    else if (RAW[name]) { o.layers.push(...RAW[name].map(useLayer).filter(Boolean)); o.via = RAW[name].map(l => nm(MARK.resources[l].name)).join(' + '); }
    else if (it && it.recipe && !it.recipe.byproduct) {
      const raw = it.recipe.inputs.map(([n]) => layerName[lower(n)]).filter(Boolean);
      if (raw.length) { o.layers.push(...raw.map(useLayer)); o.via = it.recipe.inputs.filter(([n]) => layerName[lower(n)]).map(([n]) => n).join(' + '); }
    }
    if (!o.layers.length && it && it.drops) o.layers.push(...uniq(it.drops.filter(s => s.layer).slice(0, 3).map(s => s.layer)));
    out.mats[name] = o;
  }

  // Jewel pools for every spell and Veil shown, and the Ancestral roll pool.
  const jt = await wiki('Template:Jewel_Table');
  const pools = {};
  for (const m of String(jt || '').matchAll(/<section begin="([^"]+)"\s*\/>([\s\S]*?)<section end=/g)) {
    pools[m[1]] = m[2].split('\n').filter(l => l.includes('{{Modifier}}')).map(l => {
      const raw = l.replace(/^\|?\s*\{\{Modifier\}\}\s*/, '');
      const range = (raw.match(/'''([^']*\d[^']*?\s-\s[^']*?)'''/) || [])[1];
      return add({ text: wikiText(raw) }, 'range', range && range.trim());
    });
  }
  for (const [name, a] of Object.entries(out.abilities)) {
    if (a.slot !== 'Spell' && a.slot !== 'Veil') continue;
    if (pools[name]) out.jewels[name] = pools[name]; else console.warn(`jewels: no wiki pool for ${name}`);
  }
  const af = await wiki('Ancestral Forge');
  const rollsAt = String(af || '').indexOf('Possible Attribute Rolls');
  if (rollsAt >= 0) {
    const table = af.slice(rollsAt, af.indexOf('|}', rollsAt));
    for (const m of table.matchAll(/^\|\s*'''([^']+)'''\s*\|\|(.+)$/gm)) {
      const v = m[2].split('||').map(c => c.trim().replace(/^\+/, ''));
      out.rolls.push({ text: m[1].trim(), range: `${v[0].replace(/%$/, '')} - ${v[v.length - 1]}` });
    }
  }
  if (!out.rolls.length) console.warn('rolls: no Ancestral roll table on the wiki');

  out.waygates = MARK.waygates.map(p => p.map(Math.round));

  // ---------- Write ----------
  // One entry per line, keys sorted, so a refresh reviews as a readable diff.
  const J = JSON.stringify;
  const body = Object.entries(out).map(([k, v]) => {
    if (!v || Array.isArray(v) || ['version', 'credit', 'bounds'].includes(k)) return `${J(k)}: ${J(v)}`;
    const rows = Object.keys(v).sort().map(n => `  ${J(n)}: ${J(v[n])}`);
    return `${J(k)}: {\n${rows.join(',\n')}\n}`;
  }).join(',\n');
  const js = `// Generated by build-gamedata.js from vrising.gaming.tools data (patch ${PATCH}, captured ${out.version.captured}) and the V Rising Wiki` +
    ' (jewel and Ancestral roll text, CC BY-SA). Game names and text © Stunlock Studios. Rebuild: node site/build-gamedata.js\n' +
    `window.BR_GAME = {\n${body}\n};\n`;
  fs.writeFileSync(OUT, js);

  const kb = n => `${(n / 1024).toFixed(0)} KB`;
  console.log(`gamedata.js: ${kb(Buffer.byteLength(js))} (budget ${kb(BUDGET)})`);
  for (const k of Object.keys(out)) {
    const v = out[k], n = Array.isArray(v) ? v.length : typeof v === 'object' ? Object.keys(v).length : 1;
    console.log(`  ${k.padEnd(9)} ${String(n).padStart(4)}  ${kb(Buffer.byteLength(JSON.stringify(v))).padStart(7)}`);
  }
  const shown = [...R.all].filter(n => !PSEUDO.has(n));
  const covered = shown.filter(n => out.items[n] || out.abilities[n] || out.npcs[n] || out.blood[n] || out.stations[n]);
  console.log(`coverage: ${covered.length}/${shown.length} route names; ${skipped.length} passives/pseudo skipped; ` +
    `${Object.values(out.npcs).filter(n => n.vblood && n.spawns.length).length}/${R.bosses.size} bosses placed`);
  const placed = Object.values(out.mats).filter(m => m.layers.length).length;
  console.log(`npcs: ${Object.values(out.npcs).filter(n => n.vblood).length} V Bloods, ${Object.values(out.npcs).filter(n => !n.vblood).length} enemies; mats: ${placed}/${Object.keys(out.mats).length} with a map layer`);
  const miss = shown.filter(n => !covered.includes(n) && !skipped.includes(n));
  if (miss.length) console.log('not in the data (cards fall back to route text):', miss.join(', '));
  if (Buffer.byteLength(js) > BUDGET) { console.error('gamedata.js is over budget'); process.exitCode = 1; }
}

main().catch(e => { console.error(e); process.exit(1); });
