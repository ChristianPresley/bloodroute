// Builds calc/optimizer_results.json from a folder of run.js outputs, then adds the mid-game contenders
// and the sensitivity table (sens.js).
// Usage: node calc/curate.js <dir>   (the dir holds out_<run>.json for every run in RUNS, e.g. from
//        for w in early p4 p5 mid p7 late-pre late; do node calc/run.js $w <dir>/out_$w.json; done)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const V = require('./engine.js');

const dir = process.argv[2];
if (!dir) throw new Error('Usage: node calc/curate.js <dir with out_<run>.json files>');
const RUN_ORDER = ['early', 'p4', 'p5', 'mid', 'p7', 'late-pre', 'late'];
const stages = {};
for (const w of RUN_ORDER) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, `out_${w}.json`)));
  stages[w] = { ...r, label: V.RUNS[w].label || V.STAGES[V.RUNS[w].stage].label };
}

// Mid-game comparisons with Chaos Barrage, each with its own tuned gear (the guide's mid table): the old core
// (Tendrils + Chains) and the winner's spells with the other Veil.
const r2 = n => Math.round(n * 100) / 100;
const midContendersChaosBarrage = {};
for (const [veil, s1, s2] of [['Veil of Chaos', 'Lightning Tendrils', 'Unholy Chains'], ['Veil of Bones', 'Lightning Tendrils', 'Unholy Chains'], ['Veil of Chaos', 'Chaos Volley', 'Lightning Tendrils']]) {
  const build = { veil, s1, s2, ult: 'Chaos Barrage' };
  const tuned = V.optimizeCfg(build, V.defaultCfg('mid', V.STAGES.mid.amulets), 'mid', V.STAGES.mid.amulets, 4, 300);
  const c = V.confirm(build, tuned.cfg);
  midContendersChaosBarrage[`${veil} · ${s1} + ${s2}`] = { dps: r2(c.dps), se: r2(c.se), byLength: Object.fromEntries(Object.entries(c.byLen).map(([k, v]) => [k, r2(v)])), cfg: c.cfg, policy: c.policy };
  console.log(`mid ${veil} · ${s1} + ${s2}: ${r2(c.dps)}`);
}

const out = path.join(__dirname, 'optimizer_results.json');
const result = {
  generated: new Date().toISOString(), patch: '1.1.13', model: 'calc/engine.js',
  assumptions: { ...V.ASSUME }, fightLengths: V.FIGHT_LENGTHS,
  note: 'dps = mean of 90/180/300/600 s fights, 32 fresh-seed runs each; se = its standard error (all lengths share the seeds); policy = the best of 12 rotation policies, chosen once on separate 300 s fights; dps600/se600/damageBySource600/casts600 are from the 600 s fights',
  stages, midContendersChaosBarrage,
};
fs.writeFileSync(out, JSON.stringify(result, null, 1));

// The sensitivity table re-scores the curated late and late-pre builds, so it runs on the file just written.
const sensOut = path.join(dir, 'sens.json');
execFileSync(process.execPath, [path.join(__dirname, 'sens.js'), '--out', sensOut], { stdio: 'inherit' });
result.sensitivity = JSON.parse(fs.readFileSync(sensOut));
fs.writeFileSync(out, JSON.stringify(result, null, 1));
console.log(`Wrote ${out}`);
