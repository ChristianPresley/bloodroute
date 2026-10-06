// Sensitivity of the top builds to unconfirmed mechanics: node calc/sens.js
// Reads out_late.json and out_late-pre.json (run `run.js late` and `run.js late-pre` first),
// re-scores their top builds under each scenario.
const fs = require('fs');
const path = require('path');
const V = require('./engine.js');

const late = JSON.parse(fs.readFileSync(path.join(__dirname, 'out_late.json'))).top;
const pre = JSON.parse(fs.readFileSync(path.join(__dirname, 'out_late-pre.json'))).top;
const label = r => `${r.build.veil} | ${r.build.s1} + ${r.build.s2} | ${r.build.ult} | ${r.cfg.amulet}`;
const seen = new Set();
const bestNonStorm = late.find(r => r.build.ult !== 'Blood Storm');   // e.g. Chaos Barrage while wearing the shard
const builds = [...late.slice(0, 6), ...(bestNonStorm ? [bestNonStorm] : []), ...pre.slice(0, 3)]
  .filter(r => !seen.has(label(r)) && seen.add(label(r)));

const base = { ...V.ASSUME };
const scenarios = [
  ['baseline', {}],
  ['Ultimate Cooldown Rate works as described', { ultCdrMode: 'works' }],
  ['Ultimate Cooldown Rate does nothing', { ultCdrMode: 'none' }],
  ['Ult CDR does nothing, Veil of Chaos recast = 2nd Veil attack', { ultCdrMode: 'twoCuts' }],
  ['Blood Efficiency does not boost fixed traits (7s cut, 30%)', { effScalesFixed: false }],
  ['80% of Lightning Tendrils bolts hit', { tendrilsBoltFrac: 0.8 }],
  ['Static shock at most once per second', { staticIcd: 1 }],
  ['80% Tendrils bolts + Static once per second', { tendrilsBoltFrac: 0.8, staticIcd: 1 }],
  ['Bloodthirst is physical-only', { bloodthirstSpells: false }],
  ['Hunger for Power chain never breaks', { hungerPowerBreak: 'none' }],
  ['75% of Blood Storm bolts hit', { bloodStormBoltFrac: 0.75 }],
  ['50% of Blood Storm bolts hit', { bloodStormBoltFrac: 0.5 }],
  ['25% of Unholy Chains channels fail', { chainsCompleteFrac: 0.75 }],
  ['45% of Rain meteors hit', { rainHitFrac: 0.45 }],
  ['caps are hard (no bypass)', { capBypass: false }],
  ['Bonus Spell Power applies to base 10 only', { spFormula: 'base' }],
];
const r2 = n => Math.round(n * 10) / 10;
const out = { builds: builds.map(label), scenarios: {} };
for (const [name, patch] of scenarios) {
  Object.assign(V.ASSUME, base, patch);
  out.scenarios[name] = builds.map(b => r2(V.confirm(b.build, b.cfg, 24).dps));
}
Object.assign(V.ASSUME, base);
fs.writeFileSync(path.join(__dirname, 'out_sens.json'), JSON.stringify(out, null, 1));
