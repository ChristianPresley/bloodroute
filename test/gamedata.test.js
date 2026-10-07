// Game data snapshot tests (site/gamedata.js, built by site/build-gamedata.js and committed): every name a route loadout
// or boss list shows has an entry, bosses sit on the map, consumables say what they do, spells have their jewel pool,
// stockpiled materials have a source, and every coordinate lands on the map. Map images are checked when built.
// Run: node --test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SITE, LEXICON, page, loadRoutes } = require('./load');

const FILE = path.join(SITE, 'gamedata.js');
const BUDGET = 450 * 1024;
const p = page();
p.run('js/core.js');
for (const f of LEXICON) p.run(f);
p.run('gamedata.js');
const G = p.window.BR_GAME;
const LEX = p.window.BR.lex;
const READY = loadRoutes().filter(r => r.def);
const split = s => String(s).split(/ or /).map(x => x.trim()).filter(Boolean);
const SKIP = new Set(['—', 'Starting dash', ...LEX.ALL_PASSIVES]);

// Every loadout name (slots and gear), with where it's used.
const loadoutNames = [];
for (const r of READY) for (const ph of r.def.phases) {
  const lo = ph.loadout || {};
  for (const s of lo.slots || []) split(s).forEach(n => loadoutNames.push([n, `${r.arch.id} ${ph.id} slot`]));
  for (const g of lo.gear || []) split(g).forEach(n => loadoutNames.push([n, `${r.arch.id} ${ph.id} gear`]));
}
const inBounds = ([x, z]) => x >= G.bounds.minX && x <= G.bounds.maxX && z >= G.bounds.minZ && z <= G.bounds.maxZ;

describe('game data snapshot', () => {
  it('is committed, versioned and within its size budget', () => {
    assert.ok(G, 'site/gamedata.js should define window.BR_GAME (run node site/build-gamedata.js)');
    assert.match(G.version.patch, /^\d+\.\d+/);
    assert.match(G.version.captured, /^\d{4}-\d\d-\d\d$/);
    const size = fs.statSync(FILE).size;
    assert.ok(size <= BUDGET, `site/gamedata.js is ${(size / 1024).toFixed(0)} KB, over the ${BUDGET / 1024} KB budget`);
  });

  it('has every route V Blood, placed on the map (Nibbles is summoned at your castle)', () => {
    for (const r of READY) for (const ph of r.def.phases) for (const b of ph.bosses) {
      const n = G.npcs[b.name];
      assert.ok(n && n.vblood, `${r.arch.id} ${ph.id}: ${b.name} should be a V Blood in BR_GAME.npcs`);
      assert.ok(Array.isArray(n.spawns), `${b.name} should have a spawns list`);
      if (/^Nibbles /.test(b.name)) continue;
      assert.ok(n.spawns.length > 0, `${b.name} should have a spawn point`);
      assert.ok(typeof n.lv === 'number' && n.lv > 0, `${b.name} should have a level`);
    }
    assert.equal(G.npcs['Alpha the White Wolf'].spawns.length, 3, 'Alpha keeps all three spawns');
  });

  it('resolves every loadout spell, piece of gear and blood type', () => {
    for (const [n, where] of loadoutNames) {
      if (SKIP.has(n)) continue;
      assert.ok(G.items[n] || G.abilities[n] || G.blood[n], `${where}: "${n}" has no entry in BR_GAME items, abilities or blood`);
    }
  });

  it('says what every loadout consumable does', () => {
    const seen = new Set();
    for (const [n, where] of loadoutNames) {
      const it = G.items[n];
      if (!(it && it.kind === 'consumable') && !LEX.CONSUMABLE.test(n)) continue;
      seen.add(n);
      assert.ok(it && typeof it.effect === 'string' && it.effect.length > 5, `${where}: consumable "${n}" needs an effect line`);
      assert.doesNotMatch(it.effect, /%\d|\{value\}/, `${n}: effect text should be cleaned`);
    }
    assert.ok(seen.size > 5, 'loadouts should use some consumables');
  });

  it('has the jewel pool for every spell and Veil the loadouts slot', () => {
    for (const [n, where] of loadoutNames) {
      const a = G.abilities[n];
      if (!a || (a.slot !== 'Spell' && a.slot !== 'Veil')) continue;
      const pool = G.jewels[n];
      assert.ok(Array.isArray(pool) && pool.length >= 4, `${where}: ${n} should have its jewel modifier pool`);
      for (const m of pool) {
        assert.ok(typeof m.text === 'string' && m.text.length > 5, `${n}: jewel modifier text`);
        assert.doesNotMatch(m.text, /\{\{|\[\[|'''/, `${n}: jewel text should be plain (no wiki markup)`);
        if (m.range) assert.ok(m.text.includes(m.range), `${n}: "${m.range}" should appear in "${m.text}"`);
      }
    }
    assert.ok(G.rolls.length >= 10, 'the Ancestral roll pool should be there');
  });

  it('has a source for every stockpiled material', () => {
    for (const r of READY) for (const mat of Object.keys(r.def.needs)) {
      assert.ok(G.mats[mat] || G.items[mat], `${r.arch.id}: needs material "${mat}" has no mats or items entry`);
    }
  });

  it('only references layers, NPCs and items that exist', () => {
    for (const [n, m] of Object.entries(G.mats)) for (const l of m.layers || []) assert.ok(G.layers[l], `mats ${n}: layer ${l}`);
    for (const [n, it] of Object.entries(G.items)) {
      for (const d of it.drops || []) if (d.layer) assert.ok(G.layers[d.layer], `items ${n}: drop layer ${d.layer}`);
      for (const [i] of (it.recipe && it.recipe.inputs) || []) assert.ok(G.items[i] || / gem$/.test(i), `items ${n}: recipe input ${i}`);
      if (it.set) assert.ok(G.sets[it.set], `items ${n}: set ${it.set}`);
    }
    for (const [b, v] of Object.entries(G.blood)) for (const c of v.carriers || []) assert.ok(G.npcs[c], `blood ${b}: carrier ${c}`);
    for (const [w, skills] of Object.entries(LEX.WEAPON_SKILLS)) for (const s of skills) assert.ok(G.abilities[s], `${w} skill ${s}`);
  });

  it('keeps every coordinate on the map', () => {
    const check = (pts, what) => pts.forEach(pt => assert.ok(Array.isArray(pt) && inBounds(pt), `${what}: [${pt}] is off the map`));
    for (const [n, v] of Object.entries(G.npcs)) check(v.spawns || [], `npcs ${n}`);
    for (const [n, l] of Object.entries(G.layers)) check(l.pts, `layers ${n}`);
    check(G.waygates, 'waygates');
    assert.ok(G.waygates.length >= 20, 'the waygates should be there');
  });

  it('has clean game text', () => {
    const bad = [];
    const walk = (v, where) => {
      if (typeof v === 'string') { if (/%\d|\{value\}|\\n|undefined|NaN/.test(v)) bad.push(`${where}: ${v.slice(0, 80)}`); }
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
    };
    walk(G, 'BR_GAME');
    assert.equal(bad.length, 0, `uncleaned text:\n${bad.slice(0, 10).join('\n')}`);
  });

  const MAP = path.join(SITE, 'map');
  it('has the map images when they are built', { skip: !fs.existsSync(MAP) && 'site/map/ not built (node site/build-map.js)' }, () => {
    for (const w of [760, 1520, 3040]) {
      const f = path.join(MAP, `vardoran-${w}.webp`);
      assert.ok(fs.existsSync(f), `${path.basename(f)} is missing`);
      const head = fs.readFileSync(f).subarray(0, 12).toString('latin1');
      assert.ok(head.startsWith('RIFF') && head.endsWith('WEBP'), `${path.basename(f)} should be a WebP image`);
    }
  });
});
