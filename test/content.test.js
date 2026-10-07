// Route content for the hover cards and the planner: every phase says which part of the game it is and where it
// takes place; every loadout item says why it's there, every consumable when to use it; every loadout has a rotation
// that names its abilities in order; jewels and Ancestral rolls name the mods the build wants. Run: node --test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SITE, page, loadRoutes, LEXICON } = require('./load');

const ROUTES = loadRoutes().filter(r => r.def);
// A page with the lexicon and, when it's committed, the game data snapshot.
const lexPage = page();
const GAME = fs.existsSync(path.join(SITE, 'gamedata.js'));
if (GAME) lexPage.run('gamedata.js');
lexPage.run('js/core.js');
LEXICON.forEach(f => lexPage.run(f));
const LEX = lexPage.window.BR.lex, BR_GAME = lexPage.window.BR_GAME;
const strip = h => String(h || '').replace(/<[^>]+>/g, '').trim();
const BAD = /check the (item )?tooltip|\bTODO\b|\bTBD\b|\bFIXME\b|placeholder|lorem ipsum|undefined|NaN|\[object Object\]/i;
const STAGES = ['Beginning', 'Early', 'Mid', 'Late', 'End'];
const slotNames = l => l.slots.flatMap(s => s.split(/ or /).map(x => x.trim())).filter(x => x && x !== '—');
const loadoutNames = l => [...slotNames(l).filter(x => x !== 'Starting dash'), ...l.gear];
const rotNames = rot => rot ? [...(rot.pre || []), ...(rot.order || []), ...(rot.fill || [])].map(x => (typeof x === 'string' ? x : x.n)) : [];
const regionOf = r => String(r).replace(/\s*\(.*\)\s*$/, '');
const JEWEL_MODS = { Regular: 2, Greater: 3, Primal: 4 };

for (const { arch, def } of ROUTES) describe(`${arch.name} route content`, () => {
  const info = def.info || {};

  it('names the part of the game each phase is', () => {
    const st = def.phases.map(p => p.stage);
    st.forEach((s, i) => assert.ok(STAGES.includes(s), `p${i + 1} stage "${s}"`));
    assert.equal(st[0], 'Beginning');
    assert.equal(st[7], 'End');
    for (let i = 1; i < st.length; i++) assert.ok(STAGES.indexOf(st[i]) >= STAGES.indexOf(st[i - 1]), `stages run in order at p${i + 1}`);
  });

  it('lists every region each phase takes you to', () => {
    const R = LEX.data.REGIONS, V = LEX.data.VBLOOD, MAT = LEX.data.MATERIALS;
    def.phases.forEach((p, i) => {
      const n = i + 1;
      const mine = new Set(p.regions.map(regionOf));
      for (const r of mine) assert.ok(R[r], `${p.id}: "${r}" is a known region`);
      for (const b of p.bosses) {
        const r = V[b.name] && V[b.name].region;
        if (r && !V[b.name].roams) assert.ok(mine.has(r), `${p.id}: ${b.name} is in ${r}`);
      }
      for (const [m, [ph]] of Object.entries(def.resources)) {
        const r = MAT[m] && MAT[m].region;
        if (ph === n && r && def.needs[m] && R[r]) assert.ok(mine.has(r) || def.phases.slice(0, n - 1).some(q => q.regions.map(regionOf).includes(r)), `${p.id}: ${m} is gathered in ${r}`);
      }
    });
  });

  it('says why every loadout item is there, and when to use every consumable', () => {
    for (const p of def.phases) for (const n of loadoutNames(p.loadout)) {
      const i = info[n];
      assert.ok(i && strip(i.why).length >= 20, `${p.id}: why ${n}`);
      if (['elixir', 'consumable', 'coating'].includes(LEX.kindOf(n))) assert.ok(strip(i.use).length >= 20, `${p.id}: when to use ${n}`);
      for (const c of (i && i.combo) || []) assert.notEqual(LEX.kindOf(c), 'unknown', `${n} combo: ${c}`);
    }
    for (const [n, i] of Object.entries(info)) for (const v of [i.why, i.use, i.upgrade]) if (v) assert.doesNotMatch(strip(v), BAD, `info ${n}`);
  });

  it('gives every loadout a rotation with its abilities in order', () => {
    for (const p of def.phases) {
      const l = p.loadout;
      assert.ok(!(l.kv || []).some(([k]) => /^(Rotation|Combo)$/.test(k)), `${p.id}: the rotation lives in loadout.rot, not kv`);
      assert.ok(l.rot && (l.rot.order || []).length >= 2, `${p.id}: rotation order`);
      assert.ok(strip(l.rot.why).length >= 30, `${p.id}: why this rotation`);
      const names = rotNames(l.rot);
      for (const s of l.slots) {
        const alts = s.split(/ or /).map(x => x.trim()).filter(x => x && x !== '—');
        if (alts.length) assert.ok(alts.some(a => names.includes(a)), `${p.id}: ${s} is in the rotation`);
      }
      for (const n of names) assert.notEqual(LEX.kindOf(n), 'unknown', `${p.id}: rotation step ${n}`);
      for (const x of [...(l.rot.order || [])]) if (typeof x !== 'string') assert.ok(x.n && strip(x.when).length, `${p.id}: conditional step`);
      for (const [, v] of l.kv || []) assert.doesNotMatch(strip(v), BAD, `${p.id} kv`);
      assert.doesNotMatch(strip(l.rot.why), BAD, `${p.id} rotation`);
    }
  });

  it('names the jewel mods and weapon rolls the build wants', () => {
    for (const p of def.phases) {
      const l = p.loadout;
      const jewel = l.gear.find(g => LEX.JEWEL.test(g));
      if (jewel) {
        const want = JEWEL_MODS[jewel.split(' ')[0]];
        const spells = Object.keys(l.jewels || {});
        assert.ok(spells.length, `${p.id}: ${jewel} goes into some spells`);
        for (const sp of spells) {
          assert.ok(slotNames(l).includes(sp), `${p.id}: ${sp} is slotted`);
          const keys = l.jewels[sp];
          assert.equal(keys.length, want, `${p.id}: ${sp} has ${want} mods`);
          const pool = BR_GAME && BR_GAME.jewels && BR_GAME.jewels[sp];
          if (pool) for (const k of keys) assert.equal(pool.filter(m => m.text.toLowerCase().includes(k.toLowerCase())).length, 1, `${p.id}: "${k}" picks one ${sp} mod`);
        }
      }
      const anc = l.gear.find(g => /^Ancestral .* Shards$/.test(g));
      if (anc) {
        assert.ok((l.rolls || []).length >= 2, `${p.id}: ${anc} rolls`);
        const pool = (BR_GAME && BR_GAME.rolls && BR_GAME.rolls.length ? BR_GAME.rolls : LEX.data.ROLL_POOL) || [];
        if (pool.length) for (const k of l.rolls) assert.ok(pool.filter(m => m.text.toLowerCase().includes(k.toLowerCase())).length >= 1, `${p.id}: roll "${k}"`);
      }
    }
  });

  it('knows what kind of thing every name it shows is', () => {
    const names = new Set();
    for (const p of def.phases) {
      loadoutNames(p.loadout).forEach(n => names.add(n));
      p.bosses.forEach(b => b.gets.forEach(g => names.add(g)));
      [...(p.steps || []), ...(p.craft || [])].forEach(s => names.add(s.ic));
    }
    Object.keys(def.needs).forEach(n => names.add(n));
    const unknown = [...names].filter(n => LEX.kindOf(n) === 'unknown');
    assert.deepEqual(unknown, []);
  });
});

describe('shared lists', () => {
  it('weapon skill names agree between the lexicon and the weapon table', () => {
    const p = page();
    p.run('js/core.js');
    LEXICON.forEach(f => p.run(f));
    p.run('routes/shared.js');
    const { WEAPONS } = p.window.BR.shared, WS = p.window.BR.lex.WEAPON_SKILLS;
    for (const w of WEAPONS) assert.equal(WS[w.w] && WS[w.w].join('|'), w.skills.map(([n]) => n).join('|'), w.w);
  });
});
