// Sensitivity of the top builds to unconfirmed mechanics: re-scores the late and late-pre top builds under each scenario.
// Usage: node calc/sens.js [late.json late-pre.json] [--out sens.json]
// With no inputs it reads the curated calc/optimizer_results.json; pass two `run.js late` / `run.js late-pre` outputs
// to use fresh runs instead. Prints the table and writes it as JSON to --out (default calc/out_sens.json, git-ignored).
const fs = require('fs');
const path = require('path');
const V = require('./engine.js');

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const out = outAt >= 0 ? path.resolve(args[outAt + 1]) : path.join(__dirname, 'out_sens.json');
const inputs = outAt >= 0 ? args.filter((a, i) => i !== outAt && i !== outAt + 1) : args;
if (inputs.length !== 0 && inputs.length !== 2) throw new Error('Pass both late.json and late-pre.json, or neither');
const readTop = f => JSON.parse(fs.readFileSync(path.resolve(f))).top;
const curated = inputs.length ? null : JSON.parse(fs.readFileSync(path.join(__dirname, 'optimizer_results.json'))).stages;
const late = curated ? curated.late.top : readTop(inputs[0]);
const pre = curated ? curated['late-pre'].top : readTop(inputs[1]);

const label = r => `${r.build.veil} | ${r.build.s1} + ${r.build.s2} | ${r.build.ult} | ${r.cfg.amulet}`;
const seen = new Set();   // the same spells with different blood or gear are different builds
const bestNonStorm = late.find(r => r.build.ult !== 'Blood Storm');   // e.g. Chaos Barrage while wearing the shard
// The top build with Eye of the Storm instead (its shard replaces the amulet): how many strikes land decides it.
const eye = late.find(r => r.build.ult === 'Eye of the Storm')
  || (b => ({ build: b, cfg: V.fixAmulet(b, late[0].cfg) }))({ ...late[0].build, ult: 'Eye of the Storm' });
const builds = [...late.slice(0, 6), ...(bestNonStorm ? [bestNonStorm] : []), eye, ...pre.slice(0, 3)]
  .filter(r => { const k = label(r) + '#' + V.cfgKey(r.cfg); return !seen.has(k) && seen.add(k); });
const blood = r => r.cfg.primary + (r.cfg.secondary ? ` + ${r.cfg.secondary.blood} T${r.cfg.secondary.tier}` : '');

const base = { ...V.ASSUME };
const scenarios = [
  ['baseline', {}],
  ['crossbow shots and skills deal no damage (spells only)', { weaponDamage: false }],
  ['half of Rain of Bolts\' bolts hit', { rainBoltsFrac: 0.5 }],
  ['the Blood Key\'s +4 equip Spell Power isn\'t real', { bloodKeyBuff: false }],
  ['Ultimate Cooldown Rate works as described', { ultCdrMode: 'works' }],
  ['Ultimate Cooldown Rate does nothing', { ultCdrMode: 'none' }],
  ['Ult CDR does nothing, Veil of Chaos recast = 2nd Veil attack', { ultCdrMode: 'twoCuts' }],
  ['Blood Efficiency does not boost fixed traits (7s cut, 30%)', { effScalesFixed: false }],
  ['Blood Efficiency also boosts the secondary blood trait', { effOnSecondary: true }],
  ['80% of Lightning Tendrils bolts hit', { tendrilsBoltFrac: 0.8 }],
  ['Static shock at most once per second', { staticIcd: 1 }],
  ['80% Tendrils bolts + Static once per second', { tendrilsBoltFrac: 0.8, staticIcd: 1 }],
  ['Bloodthirst is physical-only', { bloodthirstSpells: false }],
  ['Hunger for Power chain never breaks', { hungerPowerBreak: 'none' }],
  ['75% of Blood Storm bolts hit', { bloodStormBoltFrac: 0.75 }],
  ['50% of Blood Storm bolts hit', { bloodStormBoltFrac: 0.5 }],
  ['25% of Unholy Chains channels fail', { chainsCompleteFrac: 0.75 }],
  ['45% of Rain meteors hit', { rainHitFrac: 0.45 }],
  ['60% of Eye of the Storm strikes hit', { eyeHitFrac: 0.6 }],
  ['every Eye of the Storm strike hits', { eyeHitFrac: 1 }],
  ['caps are hard (no bypass)', { capBypass: false }],
  ['Bonus Spell Power applies to base 10 only', { spFormula: 'base' }],
];
const r1 = n => Math.round(n * 10) / 10;
const res = { builds: builds.map(r => `${label(r)} | ${blood(r)} | ${r.cfg.elixir}`), scenarios: {} };
for (const [name, patch] of scenarios) {
  Object.assign(V.ASSUME, base, patch);
  res.scenarios[name] = builds.map(b => r1(V.confirm(b.build, b.cfg, 24).dps));
}
Object.assign(V.ASSUME, base);
fs.writeFileSync(out, JSON.stringify(res, null, 1));
res.builds.forEach((b, i) => console.log(`#${i + 1} ${b}`));
for (const [name, v] of Object.entries(res.scenarios)) console.log(`${name.padEnd(62)} ${v.map(x => x.toFixed(1).padStart(6)).join('')}`);
console.log(`Wrote ${out}`);
