// Calculator invariants (calc/engine.js): cooldown timing, crit and Spell Power scaling, damage bookkeeping, step size;
// and the spellcaster page and guide quoting calc/optimizer_results.json. Fast: no optimizer runs. Run: node --test
const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, loadRoutes } = require('./load');
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

// Bare stats: 100 Spell Power, no crit, no bonuses, no flags, no Physical Power (so no weapon damage).
const blank = (o = {}) => {
  const st = Object.fromEntries(V.STAT_KEYS.map(k => [k, 0]));
  return Object.assign(st, { flatSP: 100, critPower: 150, flags: new Set() }, o);
};
const SPELLS_FIRST = { order: ['s1', 's2', 'veil'], ultHold: true };
const sim = (build, st, duration, o = {}) => V.simulate({ veil: 'T_veil', s2: 'T_none', ult: 'T_ult', ...build }, st, { stage: 'mid' }, { duration, seed: 1, policy: SPELLS_FIRST, ...o });

// Real loadouts from calc/optimizer_results.json (early #1, mid #1, late #1, mid #2 for Curse), and the old Chains core.
const LATE = { stage: 'late', primary: 'Draculin', secondary: { blood: 'Scholar', tier: 2 }, amulet: 'Soul Shard of Dracula', elixir: 'Elixir of the Twisted', coating: 'Unholy Coating',
  passives: ['Enhanced Conductivity', 'Hunger for Blood', 'Cold Soul', 'Wicked Power', 'Renewing Flames'], weapon: ['crit', 'critPower', 'cdr'] };
const MID = { stage: 'mid', primary: 'Scholar', secondary: null, amulet: 'Blood Merlot Amulet', elixir: 'Elixir of the Bat', coating: 'none',
  passives: ['Enhanced Conductivity', 'Renewing Flames', 'Lightning Fast Strikes'], weapon: [] };
const REAL = [
  [{ veil: 'Veil of Shadow', s1: 'Chaos Volley', s2: 'Bone Explosion', ult: 'Chaos Barrage' },
    { stage: 'early', primary: 'Scholar', secondary: null, amulet: 'Ring of the Sorcerer', elixir: 'none', coating: 'none', passives: [], weapon: [] }, { order: ['s2', 'veil', 's1'], ultHold: true }],
  [{ veil: 'Veil of Bones', s1: 'Chaos Volley', s2: 'Lightning Tendrils', ult: 'Chaos Barrage' }, MID, { order: ['s1', 's2', 'veil'], ultHold: true }],
  [{ veil: 'Veil of Frost', s1: 'Chaos Volley', s2: 'Lightning Tendrils', ult: 'Blood Storm' }, LATE, { order: ['s1', 's2', 'veil'], ultHold: true }],
  [{ veil: 'Veil of Bones', s1: 'Curse', s2: 'Lightning Tendrils', ult: 'Chaos Barrage' },
    { ...MID, elixir: 'Elixir of the Prowler', passives: ['Enhanced Conductivity', 'Spiritual Infusion', 'Lightning Fast Strikes'] }, { order: ['s1', 's2', 'veil'], ultHold: true }],
  [{ veil: 'Veil of Chaos', s1: 'Lightning Tendrils', s2: 'Unholy Chains', ult: 'Chaos Barrage' },
    { ...MID, elixir: 'Elixir of the Prowler', passives: ['Enhanced Conductivity', 'Chaos Kindling', 'Renewing Flames'] }, { order: ['s1', 'veil', 's2'], ultHold: true }],
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
  it('doubling flat Spell Power doubles every magic source and leaves the crossbow\'s physical damage alone', () => {
    for (const r of REAL) {
      const st = V.buildStats(r[1]);
      const one = runReal(r, { st }), two = runReal(r, { st: { ...st, flatSP: 2 * st.flatSP } });
      assert.ok(V.PHYSICAL.some(k => one.by[k] > 0), `${r[0].s1} + ${r[0].s2}: no weapon damage`);
      for (const [src, v] of Object.entries(one.by)) {
        if (src === 'Curse') continue;   // pays back a share of all damage taken, physical too, capped by Spell Power
        const want = V.PHYSICAL.includes(src) ? 1 : 2;
        assert.ok(Math.abs(two.by[src] / v - want) < 1e-9, `${r[0].s1} + ${r[0].s2}, ${src}: x${two.by[src] / v}, expected x${want}`);
      }
    }
  });
  it('doubling Physical Power doubles the crossbow\'s physical damage and nothing else', () => {
    for (const r of REAL) {
      const st = V.buildStats(r[1]);
      const one = runReal(r, { st }), two = runReal(r, { st: { ...st, pp: 2 * st.pp } });
      for (const [src, v] of Object.entries(one.by)) {
        if (src === 'Curse') continue;
        const want = V.PHYSICAL.includes(src) ? 2 : 1;
        assert.ok(Math.abs(two.by[src] / v - want) < 1e-9, `${r[0].s1} + ${r[0].s2}, ${src}: x${two.by[src] / v}, expected x${want}`);
      }
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

describe('crossbow', () => {
  it('fires one shot per 1.55 s with nothing else to cast, faster with attack speed', () => {
    // s1 = s2 = a spell that is never ready again; the Veil is cast once at the start.
    for (const aSpd of [0, 20, 40]) {
      const T = 600, cycle = (V.CROSSBOW.shotCast + V.CROSSBOW.shotCd) / (1 + aSpd / 100);
      const shots = sim({ s1: 'T_none' }, blank({ aSpd }), T).casts['Primary attack'];
      assert.ok(Math.abs(shots - (T + V.CROSSBOW.shotCd / (1 + aSpd / 100)) / cycle) <= 1, `+${aSpd}% attack speed: ${shots} shots`);
    }
  });
  it('physical hits on a Static target shock for 10% of Spell Power, without Enhanced Conductivity', () => {
    ability('T_static', { kind: 'spell', cd: 1e9, fx: c => c.apply('static') });
    const r = sim({ s1: 'T_static' }, blank({ pp: 100 }), 4.9);   // Static lasts the whole fight
    const hits = (r.casts['Primary attack'] || 0) + 5 * (r.casts['Rain of Bolts'] || 0) + (r.casts.Snapshot || 0);
    assert.ok(hits >= 3);
    assert.ok(Math.abs(r.by['Static shock'] - 10 * hits) < 1e-9, `${r.by['Static shock']} from ${hits} physical hits`);
  });
  it('a coating fires on at most one shot every 12 s', () => {
    const T = 120;
    const r = V.simulate({ veil: 'T_veil', s1: 'T_none', s2: 'T_none', ult: 'T_ult' }, blank({ pp: 100 }), { stage: 'late', coating: 'Storm Coating' }, { duration: T, seed: 1, policy: SPELLS_FIRST });
    const procs = r.by['Storm Coating'] / 40;   // 40% of 100 Spell Power each
    assert.ok(Number.isInteger(Math.round(procs)) && procs <= Math.ceil(T / 12) && procs >= Math.floor(T / 12) - 1, `${procs} procs`);
  });
});

describe('stages', () => {
  it('early game uses ~60% Scholar blood: tiers I–III at 80% strength, no Tier IV or V', () => {
    const st = V.buildStats(REAL[0][1]);
    assert.ok(Math.abs(st.bSP - (7.2 + 12 * 0.8)) < 1e-9, `bSP ${st.bSP}`);   // Warlock 7.2 + Scholar I
    assert.equal(st.charge, 0);
    assert.equal(st.eff, 0);
  });
  it('Phase 7 wears Maleficer Scholar, can take the Blood Key, and has no Dracula\'s court shard', () => {
    const av = V.available('p7');
    assert.ok(!av.ults.some(u => V.byName[u].shard), av.ults.join());
    assert.ok(V.STAGES.p7.amulets.includes('Blood Key') && !V.STAGES.p7.amulets.some(a => /Soul Shard/.test(a)));
    assert.equal(V.STAGES.p7.armor, 'Maleficer Scholar Vestment');
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
    assert.notEqual(V.cfgKey(a), V.cfgKey({ ...LATE, elixir: 'Elixir of the Bat' }));
    assert.notEqual(V.cfgKey(a), V.cfgKey({ ...LATE, coating: 'Chaos Coating' }));
  });
  it('a late-pre run is labelled as before Dracula and never wears the Dracula shard', () => {
    assert.match(V.RUNS['late-pre'].label, /before Dracula/);
    assert.ok(!V.RUNS['late-pre'].amulets.includes('Soul Shard of Dracula'));
    assert.throws(() => V.optimizeRun('nope'), /Unknown run/);
  });
});

// The spellcaster page and guide quote calc/optimizer_results.json; these checks keep them in step after a re-run.
describe('curated results (calc/optimizer_results.json)', () => {
  const R = require('../calc/optimizer_results.json');
  const guide = fs.readFileSync(path.join(ROOT, 'docs/pve_spellcaster_build.md'), 'utf8').replace(/\r/g, '');
  const endgame = loadRoutes().find(r => r.arch.id === 'spellcaster').endgame;
  const nums = s => (s.match(/\d+\.\d/g) || []).map(Number);
  const f1 = r => +r.dps.toFixed(1);
  const pair = (r, a, b) => [r.build.s1, r.build.s2].sort().join() === [a, b].sort().join();
  const late = R.stages.late.top;
  // The endgame ladder: the best late finalist of each kind.
  const LADDER = {
    A: late.find(r => pair(r, 'Chaos Volley', 'Lightning Tendrils') && r.build.ult === 'Blood Storm' && r.build.veil === 'Veil of Frost'),
    A2: late.find(r => pair(r, 'Chaos Volley', 'Shadowbolt') && r.build.ult === 'Blood Storm'),
    'B+': late.find(r => pair(r, 'Chaos Volley', 'Lightning Tendrils') && r.build.ult === 'Chaos Barrage' && r.cfg.amulet === 'Soul Shard of Dracula'),
  };
  const cells = line => line.split('|').slice(1, -1).map(c => c.trim());
  const guideRow = start => { const l = guide.split('\n').find(x => x.startsWith(start)); assert.ok(l, `guide row ${start}`); return cells(l); };

  it('were generated with the engine\'s current assumptions', () => {
    assert.deepEqual(R.assumptions, { ...V.ASSUME });
    assert.deepEqual(R.fightLengths, V.FIGHT_LENGTHS);
  });
  it('the guide\'s stage summary quotes each stage\'s winner', () => {
    const early = R.stages.early.top, w = early[0];
    const veilOfBlood = early.find(r => r.build.veil === 'Veil of Blood' && pair(r, w.build.s1, w.build.s2) && r.build.ult === w.build.ult);
    assert.deepEqual(nums(guideRow('| Early (').pop()), [f1(w), f1(veilOfBlood)]);
    for (const [row, stage] of [['| Phase 4 (', 'p4'], ['| Phase 5 (', 'p5'], ['| Mid (', 'mid'], ['| Phase 7 (', 'p7'], ['| Late, before Dracula', 'late-pre']])
      assert.deepEqual(nums(guideRow(row).pop()), [f1(R.stages[stage].top[0])], row);
    assert.deepEqual(nums(guideRow('| Endgame').pop()), [f1(LADDER.A)]);
  });
  it('each phase loadout on the page quotes its stage\'s winner', () => {
    const phases = loadRoutes().find(r => r.arch.id === 'spellcaster').def.phases;
    const dps = id => phases.find(p => p.id === id).loadout.dps;
    for (const [id, stage] of [['p3', 'early'], ['p4', 'p4'], ['p5', 'p5'], ['p6', 'mid'], ['p7', 'p7']]) {
      const want = `≈${Math.round(R.stages[stage].top[0].dps)} DPS`;
      assert.ok(dps(id).includes(want), `${id}: "${dps(id)}" should quote ${want}`);
    }
    const ends = Object.values(LADDER).map(r => r.dps), span = `${Math.round(Math.min(...ends))} – ${Math.round(Math.max(...ends))} DPS`;
    assert.ok(dps('p8').includes(span), `p8: "${dps('p8')}" should be ${span}`);
  });
  it('the endgame ladder on the page and in the guide quotes the late finalists', () => {
    for (const [k, r] of Object.entries(LADDER)) {
      assert.ok(r, `${k} is not among the late finalists`);
      assert.ok(endgame.includes(`<b>${k}</b><span>${f1(r).toFixed(1)} DPS</span>`), `page: ${k} should show ${f1(r).toFixed(1)}`);
    }
    assert.deepEqual(nums(guideRow('| DPS (mix)').slice(1).join(' ')), Object.values(LADDER).map(f1));
  });
  it('every scenario row on the page and in the guide is a row of the sensitivity table', () => {
    const blood = r => r.cfg.primary + (r.cfg.secondary ? ` + ${r.cfg.secondary.blood} T${r.cfg.secondary.tier}` : '');
    const label = r => `${r.build.veil} | ${r.build.s1} + ${r.build.s2} | ${r.build.ult} | ${r.cfg.amulet} | ${blood(r)} | ${r.cfg.elixir}`;
    const cols = Object.entries(LADDER).map(([k, r]) => { const i = R.sensitivity.builds.indexOf(label(r)); assert.ok(i >= 0, `${k} is not in the sensitivity table`); return i; });
    const known = Object.values(R.sensitivity.scenarios).map(v => cols.map(i => v[i]).join());
    const pageRows = [...endgame.matchAll(/<tr><td>([^<]+)<\/td>((?:<td class="num">.*?<\/td>){3})<\/tr>/g)].map(m => [m[1], nums(m[2])]);
    const at = guide.indexOf('| Scenario | A | A2 | B+ |');
    const guideRows = guide.slice(at, guide.indexOf('\n\n', at)).split('\n').slice(2).map(l => [cells(l)[0], nums(cells(l).slice(1).join(' '))]);
    assert.ok(pageRows.length >= 5 && guideRows.length >= 5);
    for (const [name, v] of [...pageRows, ...guideRows]) assert.ok(known.includes(v.join()), `"${name}" ${v.join(' / ')} matches no sensitivity scenario`);
  });
});
