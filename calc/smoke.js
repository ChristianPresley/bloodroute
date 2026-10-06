// Quick checks: node calc/smoke.js (or VS Code's Electron with ELECTRON_RUN_AS_NODE=1).
const V = require('./engine.js');
const cfg = { stage: 'late', primary: 'Mutant', secondary: { blood: 'Draculin', tier: 2 }, amulet: 'Soul Shard of Dracula',
  elixir: 'Elixir of the Twisted', passives: ['Renewing Flames', 'Enhanced Conductivity', 'Cold Soul', 'Chaos Kindling', 'Flowing Sorcery'], weapon: ['crit', 'critPower', 'cdr'] };
const st = V.buildStats(cfg);
const r1 = n => Math.round(n * 10) / 10;
console.log('stats', { flatSP: st.flatSP, bSP: r1(st.bSP), cdr: r1(st.cdr), crit: r1(st.crit), critPower: r1(st.critPower), ultPower: r1(st.ultPower), ultCDR: r1(st.ultCDR), veilCDR: r1(st.veilCDR), eff: st.eff, dracCDR: r1(st.dracCDR), veilUltCut: r1(st.veilUltCut), mastery: st.masteryTiers });
for (const stage of ['early', 'mid', 'late']) { const a = V.available(stage); console.log(stage, 'spells', a.spells.length, 'veils', a.veils.join(','), 'ults', a.ults.join(','), 'mastery', JSON.stringify(V.masteryTiers(V.STAGES[stage].level))); }
const t0 = Date.now();
const b = { veil: 'Veil of Chaos', s1: 'Chaos Volley', s2: 'Unholy Chains', ult: 'Blood Storm' };
const e = V.evaluate(b, cfg, 8, 600, { policies: 'full' });
console.log('eval', r1(e.dps), '+-', r1(e.se), JSON.stringify(e.policy), JSON.stringify(e.casts), Date.now() - t0, 'ms');
console.log('by', Object.fromEntries(Object.entries(e.by).map(([k, v]) => [k, r1(v)])));
