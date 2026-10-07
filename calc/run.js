// Command-line optimizer run: node calc/run.js <early|mid|p7|late-pre|late> [out.json]
// "p7" = Phase 7 (bosses up to Lv 84: Maleficer Scholar, Blood Key, no shards from Dracula's court).
// "late-pre" = late game before the Dracula kill (no Soul Shard of Dracula).
const fs = require('fs');
const path = require('path');
const V = require('./engine.js');

const which = process.argv[2] || 'late';
const out = process.argv[3] || path.join(__dirname, `out_${which}.json`);
const log = [];
const t0 = Date.now();
const res = V.optimizeRun(which, m => { log.push(`${m} @${Math.round((Date.now() - t0) / 1000)}s`); fs.writeFileSync(out + '.log', log.join('\n')); });

const r2 = n => Math.round(n * 100) / 100;
const slim = r => ({
  dps: r2(r.dps), se: r2(r.se), dps600: r2(r.dps600), se600: r2(r.se600), byLength: Object.fromEntries(Object.entries(r.byLen).map(([k, v]) => [k, r2(v)])),
  build: r.build, cfg: r.cfg, policy: r.policy,
  stats: Object.fromEntries(['flatSP', 'bSP', 'cdr', 'crit', 'critPower', 'ultPower', 'ultCDR', 'veilCDR', 'eff', 'pp', 'aSpd'].map(k => [k, r2(r.st[k])])),
  casts600: Object.fromEntries(Object.entries(r.casts).map(([k, v]) => [k, r2(v)])),
  damageBySource600: Object.fromEntries(Object.entries(r.by).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, r2(v)])),
});
fs.writeFileSync(out, JSON.stringify({ run: which, seconds: Math.round((Date.now() - t0) / 1000), log, keptPairs: res.pairs, top: res.final.map(slim) }, null, 1));
