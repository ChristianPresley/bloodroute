// Calculator invariants (calc/engine.js): cooldown timing, crit and Spell Power scaling, damage bookkeeping, step size.
// Fast: single simulations only, no optimizer runs. Run: node --test
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const V = require('../calc/engine.js');

const DT = V.ASSUME.dt;
after(() => { V.ASSUME.dt = DT; });

// Test abilities, registered next to the real ones. A slot that is never ready: cd 1e9.
const ability = (name, o) => { V.byName[name] = { name, school: 'Test', mods: [], charges: 1, cast: 0, fx: () => {}, onPrimary: () => {}, ...o }; };
ability('T_hit', { kind: 'spell', cd: 10, cast: 0.5, fx: c => c.hit(100) });
ability('T_hit2', { kind: 'spell', cd: 10, cast: 0.5, charges: 2, fx: c => c.hit(100) });
ability('T_ignite', { kind: 'spell', cd: 1e9, cast: 0.5, fx: c => c.ignite() });
ability('T_curseShort', { kind: 'spell', cd: 1e9, fx: c => c.curse(1, 2) });
ability('T_curseLong', { kind: 'spell', cd: 1e9, fx: c => c.curse(1, 10) });
ability('T_none', { kind: 'spell', cd: 1e9 });
ability('T_veil', { kind: 'veil', cd: 1e9 });
ability('T_veilHit', { kind: 'veil', cd: 1e9, fx: c => c.hit(100) });
ability('T_ult', { kind: 'ult', cd: 1e9 });

// Bare stats: 100 Spell Power, no crit, no bonuses, no flags.
const blank = (o = {}) => {
  const st = Object.fromEntries(['flatSP', 'bSP', 'crit', 'critPower', 'cdr', 'veilCDR', 'ultPower', 'ultCDR', 'charge', 'leech', 'minion', 'eff', 'dracCDR', 'veilUltCut'].map(k => [k, 0]));
  return Object.assign(st, { flatSP: 100, critPower: 150, flags: new Set() }, o);
};
const SPELLS_FIRST = { order: ['s1', 's2', 'veil'], ultHold: true };
const sim = (build, st, duration, o = {}) => V.simulate({ veil: 'T_veil', s2: 'T_none', ult: 'T_ult', ...build }, st, { stage: 'mid' }, { duration, seed: 1, policy: SPELLS_FIRST, ...o });

// Real loadouts from calc/optimizer_results.json (early #1, mid #1, late #1).
const LATE = { stage: 'late', primary: 'Mutant', secondary: { blood: 'Draculin', tier: 2 }, amulet: 'Soul Shard of Dracula', elixir: 'Elixir of the Blasphemous',
  passives: ['Enhanced Conductivity', 'Wicked Power', 'Hunger for Blood', 'Renewing Flames', 'Cold Soul'], weapon: ['crit', 'critPower', 'veilCDR'] };
const REAL = [
  [{ veil: 'Veil of Blood', s1: 'Chaos Volley', s2: 'Bone Explosion', ult: 'Chaos Barrage' },
    { stage: 'early', primary: 'Scholar', secondary: null, amulet: 'Ring of the Sorcerer', elixir: 'none', passives: [], weapon: [] }, { order: ['s1', 's2', 'veil'], ultHold: true }],
  [{ veil: 'Veil of Chaos', s1: 'Lightning Tendrils', s2: 'Unholy Chains', ult: 'Chaos Barrage' },
    { stage: 'mid', primary: 'Scholar', secondary: null, amulet: 'Blood Merlot Amulet', elixir: 'Elixir of the Prowler', passives: ['Enhanced Conductivity', 'Chaos Kindling', 'Renewing Flames'], weapon: [] },
    { order: ['s1', 'veil', 's2'], ultHold: true }],
  [{ veil: 'Veil of Chaos', s1: 'Lightning Tendrils', s2: 'Unholy Chains', ult: 'Blood Storm' }, LATE, { order: ['veil', 's1', 's2'], ultHold: true }],
  [{ veil: 'Veil of Chaos', s1: 'Curse', s2: 'Unholy Chains', ult: 'Chaos Barrage' },
    { stage: 'mid', primary: 'Scholar', secondary: null, amulet: 'Blood Merlot Amulet', elixir: 'Elixir of the Bat', passives: ['Enhanced Conductivity', 'Renewing Flames', 'Spiritual Infusion'], weapon: [] },
    { order: ['s1', 's2', 'veil'], ultHold: true }],
];
const runReal = ([build, cfg, policy], o = {}) => V.simulate(build, o.st || V.buildStats(cfg), cfg, { duration: o.duration || 300, seed: o.seed || 1, policy });

describe('cooldowns', () => {
  // Cast k starts at k x period (period = 10 s / (1 + CDR)) and counts once its 0.5 s cast finishes inside the fight.
  for (const dt of [0.05, 0.01]) {
    it(`a 10 s spell is cast on every cooldown at Spell Cooldown Rate 0-40% (dt ${dt})`, () => {
      V.ASSUME.dt = dt;
      const T = 600, wrong = [];
      for (let cdr = 0; cdr <= 40; cdr += 0.5) {
        const n = (T - 0.5) / (10 / (1 + cdr / 100));
        if (Math.abs(n - Math.round(n)) < 1e-6) continue;   // a cast that would end exactly at T
        const casts = sim({ s1: 'T_hit' }, blank({ cdr }), T).casts.T_hit;
        if (casts !== Math.floor(n) + 1) wrong.push(`${cdr}%: ${casts} casts, expected ${Math.floor(n) + 1}`);
      }
      V.ASSUME.dt = DT;
      assert.deepEqual(wrong, []);
    });
  }
  it('a 2-charge spell spends both charges, then recasts on every recharge', () => {
    const wrong = [];
    for (let cdr = 0; cdr <= 40; cdr += 2.5) {
      const n = (600 - 0.5) / (10 / (1 + cdr / 100));
      const casts = sim({ s1: 'T_hit2' }, blank({ cdr }), 600).casts.T_hit2;
      if (casts !== Math.floor(n) + 2) wrong.push(`${cdr}%: ${casts} casts, expected ${Math.floor(n) + 2}`);
    }
    assert.deepEqual(wrong, []);
  });
});

describe('damage scaling', () => {
  it('100% crit multiplies every spell and Veil hit by Crit Power, and nothing else', () => {
    const build = { veil: 'Veil of Chaos', s1: 'Chaos Volley', s2: 'Shadowbolt', ult: 'Chaos Barrage' };
    const no = V.simulate(build, blank({ crit: 0 }), { stage: 'mid' }, { duration: 300, seed: 3, policy: SPELLS_FIRST });
    const all = V.simulate(build, blank({ crit: 100 }), { stage: 'mid' }, { duration: 300, seed: 3, policy: SPELLS_FIRST });
    assert.deepEqual(all.casts, no.casts);
    const critable = ['Veil of Chaos', 'Chaos Volley', 'Shadowbolt'];
    for (const [src, v] of Object.entries(no.by)) {
      const want = critable.includes(src) ? 1.5 : 1;   // ultimates, Ignite and Agonizing Flames cannot crit
      assert.ok(Math.abs(all.by[src] / v - want) < 1e-9, `${src}: x${all.by[src] / v}, expected x${want}`);
    }
  });
  it('100% crit multiplies DPS by Crit Power when every hit can crit', () => {
    const no = sim({ s1: 'T_hit' }, blank({ crit: 0, critPower: 172 }), 300);
    const all = sim({ s1: 'T_hit' }, blank({ crit: 100, critPower: 172 }), 300);
    assert.ok(Math.abs(all.dps / no.dps - 1.72) < 1e-9);
  });
  it('doubling flat Spell Power doubles DPS', () => {
    for (const r of REAL) {
      const st = V.buildStats(r[1]);
      const one = runReal(r, { st }), two = runReal(r, { st: { ...st, flatSP: 2 * st.flatSP } });
      assert.ok(Math.abs(two.dps / one.dps - 2) < 1e-9, `${r[0].s1} + ${r[0].s2}: x${two.dps / one.dps}`);
    }
  });
});

describe('damage bookkeeping', () => {
  it('damage by source sums to DPS x fight length', () => {
    for (const r of REAL) for (const duration of [90, 600]) {
      const res = runReal(r, { duration });
      const sum = Object.values(res.by).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - res.dps * duration) < 1e-9 * sum, `${r[0].s1} + ${r[0].s2}, ${duration} s`);
    }
  });
  it('one Ignite deals exactly 50% of Spell Power over its 5 s, at any step size', () => {
    for (const dt of [0.05, 0.03, 0.01]) {
      V.ASSUME.dt = dt;
      assert.ok(Math.abs(sim({ s1: 'T_ignite' }, blank(), 60).by.Ignite - 50) < 1e-9, `dt ${dt}`);
    }
    V.ASSUME.dt = DT;
  });
  it('nothing happens after the fight ends', () => {
    // Ignite applied at 0.5 s, fight ends at 3.01 s: 2.51 s of ticks.
    assert.ok(Math.abs(sim({ s1: 'T_ignite' }, blank(), 3.01).by.Ignite - 25.1) < 1e-9);
  });
  it('a Curse pays out the damage dealt during it, not other curses\' payouts', () => {
    // Both curses start at 0 s, then a 100-damage hit; the 2 s curse pays 100 while the 10 s one is running.
    const r = sim({ s1: 'T_curseShort', s2: 'T_curseLong', veil: 'T_veilHit' }, blank(), 20);
    assert.equal(r.by['T_veilHit'], 100);
    assert.equal(r.by.Curse, 200);
  });
});

describe('step size', () => {
  it('real loadouts score the same at dt 0.05 and 0.005', () => {
    for (const r of REAL.slice(0, 2)) {
      const mean = dt => { V.ASSUME.dt = dt; let s = 0; for (const seed of [1, 2, 3, 4]) s += runReal(r, { seed }).dps; return s / 4; };
      const coarse = mean(0.05), fine = mean(0.005);
      V.ASSUME.dt = DT;
      assert.ok(Math.abs(coarse / fine - 1) < 1e-3, `${r[0].s1} + ${r[0].s2}: ${coarse} vs ${fine}`);
    }
  });
});

describe('optimizer helpers', () => {
  it('config keys ignore passive and weapon-roll order', () => {
    const a = { ...LATE }, b = { ...LATE, passives: [...LATE.passives].reverse(), weapon: [...LATE.weapon].reverse() };
    assert.equal(V.cfgKey(a), V.cfgKey(b));
    assert.notEqual(V.cfgKey(a), V.cfgKey({ ...LATE, elixir: 'Elixir of the Twisted' }));
  });
  it('a late-pre run is labelled as before Dracula and never wears the Dracula shard', () => {
    assert.match(V.RUNS['late-pre'].label, /before Dracula/);
    assert.ok(!V.RUNS['late-pre'].amulets.includes('Soul Shard of Dracula'));
    assert.throws(() => V.optimizeRun('nope'), /Unknown run/);
  });
});
