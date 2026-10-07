// Lexicon data tests (js/lexicon-data.js BR.lexData): every V Blood, region, place and material the routes name has
// an entry the hover cards and the map can use, and the text reads as finished prose. Run: node --test test/lexicon.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, SITE, LEXICON, page } = require('./load');

// A page with core.js and the lexicon only (the planner modules aren't needed here).
function lexPage() {
  const p = page();
  p.run('js/core.js');
  for (const f of LEXICON) p.run(f);
  return p.window.BR;
}
// Each ready route's definition and its page's shared tables, loaded without the planner modules.
function routes() {
  const { window, run } = page();
  run('js/core.js');
  run('routes/registry.js');
  return window.BR.ARCHETYPES.filter(a => a.status === 'ready').map(arch => {
    const p = page();
    p.run('js/core.js');
    for (const f of LEXICON) p.run(f);
    const defs = [];
    p.window.BR.registerRoute = d => defs.push(d);
    for (const f of arch.files) p.run(f);
    assert.equal(defs.length, 1, `${arch.id}: one registerRoute call`);
    return { arch, def: JSON.parse(JSON.stringify(defs[0])), files: arch.files, shared: p.window.BR.shared };
  });
}

const BR = lexPage();
const D = BR.lexData, lex = BR.lex;
const ROUTES = routes();
const SHARED = ROUTES.map(r => r.shared).find(Boolean);
const BOUNDS = { minX: -2885, maxX: 155, minZ: -2400, maxZ: 640 };
const BAD = /\bT\d point|\(drop\)|\bTODO\b|\bTBD\b|placeholder|\bundefined\b|\bNaN\b/i;
// The captured gaming.tools map (git-ignored): checked only when present.
const GT = path.join(ROOT, 'data', 'gt');
const gt = f => (fs.existsSync(path.join(GT, f)) ? JSON.parse(fs.readFileSync(path.join(GT, f), 'utf8')) : null);
const MARKERS = gt('markers.json'), LISTS = gt('lists.json');

const region = s => Object.keys(D.REGIONS).find(k => s.startsWith(k))
  || Object.keys(D.REGIONS).find(k => D.REGIONS[k].aka.some(a => s.startsWith(a))) || null;
const inside = ([x, z]) => x >= BOUNDS.minX && x <= BOUNDS.maxX && z >= BOUNDS.minZ && z <= BOUNDS.maxZ;

describe('lexicon data', () => {
  it('has every V Blood the routes and the shared table name', () => {
    assert.ok(ROUTES.length >= 1, 'at least one ready route');
    const names = new Set(Object.keys(SHARED.VB));
    for (const { def } of ROUTES) for (const ph of def.phases) for (const b of ph.bosses) names.add(b.name);
    names.add('Dracula the Immortal King');
    for (const n of names) {
      const v = D.VBLOOD[n];
      assert.ok(v, `VBLOOD lacks ${n}`);
      assert.ok(D.REGIONS[v.region], `${n}: region ${v.region} is not a REGIONS key`);
      assert.ok(Number.isInteger(v.challenge) && v.challenge >= 1 && v.challenge <= 5, `${n}: challenge ${v.challenge}`);
      assert.ok(typeof v.note === 'string' && v.note.length > 20, `${n}: note`);
    }
    for (const n of Object.keys(D.VBLOOD)) assert.ok(names.has(n), `VBLOOD has ${n}, which no route or the shared table names`);
  });

  it('places Dracula, summons Nibbles and marks the roamers', () => {
    assert.ok(D.VBLOOD['Dracula the Immortal King'].pos.includes(-78) && D.VBLOOD['Dracula the Immortal King'].pos.includes(-586));
    assert.ok(/summoned/.test(D.VBLOOD['Nibbles the Putrid Rat'].roams));
    for (const n of ['Alpha the White Wolf', 'Simon Belmont the Vampire Hunter', 'Tristan the Vampire Hunter', 'Christina the Sun Priestess',
      'Vincent the Frostbringer', 'Jade the Vampire Hunter', 'Bane the Shadowblade', 'Lidia the Chaos Archer']) assert.ok(D.VBLOOD[n].roams, `${n} roams`);
    for (const [n, v] of Object.entries(D.VBLOOD)) {
      if (v.roams !== undefined) assert.ok(v.roams === true || typeof v.roams === 'string', `${n}: roams is true or text`);
      if (v.pos) assert.ok(inside(v.pos), `${n}: pos inside the map`);
    }
  });

  it('gives a map spot to every V Blood but the summoned one', { skip: !MARKERS && 'data/gt not captured' }, () => {
    const marked = new Set(MARKERS.vblood.map(v => v.name));
    for (const [n, v] of Object.entries(D.VBLOOD)) {
      if (typeof v.roams === 'string') continue;
      assert.ok(marked.has(n) || v.pos, `${n}: no marker and no pos`);
    }
  });

  it('reads as finished text', () => {
    const texts = [
      ...Object.entries(D.VBLOOD).map(([n, v]) => [n, v.note]),
      ...Object.entries(D.REGIONS).map(([n, v]) => [n, v.blurb]),
      ...Object.entries(D.PLACES).map(([n, v]) => [n, v.note || '']),
      ...Object.entries(D.PASSIVE_TEXT),
      ...Object.entries(D.ENEMIES).map(([n, v]) => [n, v.note || '']),
      ...D.ROLL_POOL.map(r => [r.text, `${r.text} ${r.range}`]),
    ];
    for (const [n, t] of texts) assert.ok(!BAD.test(t), `${n}: "${t}"`);
  });

  it('names a level band, blurb and centre for every region', () => {
    for (const [n, r] of Object.entries(D.REGIONS)) {
      assert.ok(/^Lv \d+–\d+$/.test(r.band), `${n}: band ${r.band}`);
      assert.ok(r.blurb && r.blurb.length > 20, `${n}: blurb`);
      assert.ok(Array.isArray(r.aka), `${n}: aka`);
      assert.ok(inside(r.center), `${n}: center inside the map`);
      if (r.r !== undefined) assert.ok(r.r > 0 && r.r < 1500, `${n}: radius ${r.r}`);
    }
    const aka = Object.values(D.REGIONS).flatMap(r => r.aka);
    assert.equal(new Set(aka).size, aka.length, 'each short name belongs to one region');
  });

  it('resolves every phase region a route lists', () => {
    for (const { arch, def } of ROUTES) for (const ph of def.phases) {
      assert.ok(ph.regions && ph.regions.length, `${arch.id} ${ph.id}: regions`);
      for (const s of ph.regions) assert.ok(region(s), `${arch.id} ${ph.id}: "${s}" starts with no region or short name`);
    }
  });

  it('knows where to get every material a route needs', () => {
    for (const { arch, def } of ROUTES) for (const m of Object.keys(def.needs)) {
      const v = D.MATERIALS[m];
      assert.ok(v, `${arch.id}: MATERIALS lacks ${m}`);
      assert.ok(D.REGIONS[v.region], `${m}: region ${v.region}`);
      assert.ok(v.layer || v.raw || v.place || v.mg || v.craft || v.drop, `${m}: no layer, raw, place, mg, craft or drop`);
    }
  });

  it('links materials to real places, inputs and map layers', () => {
    for (const [m, v] of Object.entries(D.MATERIALS)) {
      assert.ok(D.REGIONS[v.region], `${m}: region ${v.region}`);
      if (v.place) assert.ok(D.PLACES[v.place], `${m}: place ${v.place}`);
      if (v.raw) assert.ok(D.MATERIALS[v.raw], `${m}: raw ${v.raw} has no entry`);
      if (v.mg !== undefined) assert.ok(Number.isInteger(v.mg), `${m}: mg is a Map Genie category id`);
      if (v.layer !== undefined) assert.ok([].concat(v.layer).every(l => typeof l === 'string' && l), `${m}: layer`);
    }
    // Refining chains end at a gathered material.
    for (const m of Object.keys(D.MATERIALS)) {
      let n = m;
      for (let i = 0; i < 6 && D.MATERIALS[n].raw; i++) n = D.MATERIALS[n].raw;
      assert.ok(!D.MATERIALS[n].raw, `${m}: raw chain loops`);
    }
    assert.equal(D.MATERIALS["Hell's Clarion"].layer, 'hell’s_clarion', 'the layer id keeps its curly apostrophe');
  });

  it('uses map layers the captured map has', { skip: !MARKERS && 'data/gt not captured' }, () => {
    for (const [m, v] of Object.entries(D.MATERIALS)) for (const l of [].concat(v.layer || [])) assert.ok(MARKERS.resources[l], `${m}: layer ${l}`);
  });

  it('keeps every place on the map and in a region', () => {
    for (const [n, p] of Object.entries(D.PLACES)) {
      assert.ok(Array.isArray(p.pos) && inside(p.pos), `${n}: pos ${p.pos}`);
      for (const q of p.pts || []) assert.ok(inside(q), `${n}: pts ${q}`);
      assert.ok(D.REGIONS[p.region], `${n}: region ${p.region}`);
      assert.equal(p.approx, true, `${n}: approx`);
      if (p.mg !== undefined) assert.ok(/^\d+(,\d+)*$/.test(p.mg), `${n}: mg ${p.mg}`);
    }
    assert.equal(D.PLACES['Farbane bandit camps'].mg, BR.h.CAMPS);
  });

  it('has a place for every Map Genie location link in the route text', () => {
    const mgs = new Set(Object.values(D.PLACES).map(p => p.mg).filter(Boolean));
    const files = new Set(ROUTES.flatMap(r => r.files));
    let links = 0;
    for (const f of files) {
      const src = fs.readFileSync(path.join(SITE, f), 'utf8');
      for (const m of src.matchAll(/L\(M\(([^)]*)\),/g)) {
        const ids = m[1] === 'CAMPS' ? BR.h.CAMPS : m[1].replace(/['"`]/g, '');
        assert.ok(mgs.has(ids), `${f}: no PLACES entry has mg "${ids}"`);
        links++;
      }
    }
    assert.ok(links > 5, 'found the route links');
  });

  it('describes all 24 Stygian passives and the Ancestral roll pool', () => {
    assert.equal(Object.keys(D.PASSIVE_TEXT).length, 24);
    for (const n of lex.ALL_PASSIVES) assert.ok(D.PASSIVE_TEXT[n] && D.PASSIVE_TEXT[n].length > 15, `PASSIVE_TEXT lacks ${n}`);
    assert.ok(D.ROLL_POOL.length >= 10);
    for (const r of D.ROLL_POOL) assert.ok(r.text && /^\+[\d.]+–[\d.]+%$/.test(r.range), `${r.text}: range ${r.range}`);
  });

  it('has every blood carrier the routes list', () => {
    for (const [n, e] of Object.entries(D.ENEMIES)) {
      assert.ok(Number.isInteger(e.lv) && e.lv > 0, `${n}: lv`);
      assert.ok(lex.BLOODS.includes(e.blood), `${n}: blood ${e.blood}`);
      assert.ok(D.REGIONS[e.region], `${n}: region ${e.region}`);
    }
    // "Bandit Rascal 10 · Thug 16 · …" → each name (or its faction-prefixed full name) at that level and blood.
    for (const [blood, rows] of Object.entries(SHARED.CARRIERS)) for (const [, list] of rows) {
      for (const tok of list.replace(/\s*\((these|also)[^)]*\)\s*$/, '').split(' · ')) {
        const [, name, lv] = tok.match(/^(.+?) (\d+)(?:–\d+)?$/) || [];
        assert.ok(name, `cannot read "${tok}"`);
        const key = Object.keys(D.ENEMIES).find(k => k === name || k.endsWith(' ' + name));
        assert.ok(key, `ENEMIES lacks ${name}`);
        assert.equal(D.ENEMIES[key].lv, +lv, `${key}: level`);
        assert.equal(D.ENEMIES[key].blood, blood, `${key}: blood`);
      }
    }
    for (const n of ['Nun', 'Priest', 'Villager', 'Alchemist', 'Witch', 'Devoted']) assert.equal((D.ENEMIES[n] || {}).blood, 'Scholar', `${n}: Scholar carrier`);
  });

  it('matches the captured NPC list', { skip: !LISTS && 'data/gt not captured' }, () => {
    const byId = Object.fromEntries(LISTS.npcs.map(n => [n.id, n]));
    for (const [n, e] of Object.entries(D.ENEMIES)) {
      assert.ok(byId[e.id], `${n}: id ${e.id}`);
      assert.equal(byId[e.id].blood, e.blood, `${n}: blood`);
    }
  });

  it('classifies every lexicon name', () => {
    for (const n of Object.keys(D.VBLOOD)) assert.equal(lex.kindOf(n), 'boss', n);
    for (const n of Object.keys(D.REGIONS)) assert.equal(lex.kindOf(n), 'region', n);
    for (const n of Object.keys(D.PLACES)) assert.equal(lex.kindOf(n), 'place', n);
    for (const n of Object.keys(D.MATERIALS)) assert.equal(lex.kindOf(n), 'material', n);
    for (const n of Object.keys(D.ENEMIES)) assert.equal(lex.kindOf(n), 'enemy', n);
  });
});
