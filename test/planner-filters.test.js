// The planner's boss filters (js/view.js and js/state.js) and the map's layer toggles (assets/map.css). The region filter
// is per phase: a region picked in one phase must never empty another, and every region a phase offers has bosses in it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { ROOT, loadRoutes } = require('./load');

test('the region select is per phase: only the phase it was picked in shows the region selected', () => {
  const r = loadRoutes().find(x => x.arch.id === 'warrior');
  const multi = r.def.phases.filter(p => r.BR.view.regionsOf(p).length > 1);
  assert.ok(multi.length >= 2, 'warrior needs two phases with more than one region to test this');
  const [a, b] = multi;
  const region = r.BR.view.regionsOf(a)[0];
  const ctx = { order: 'level', plans: {}, filters: {}, regions: { [a.id]: region } };
  const inA = r.BR.view.bossToolbar(a, ctx), inB = r.BR.view.bossToolbar(b, ctx);
  assert.match(inA, new RegExp(`data-region-phase="${a.id}"`));
  assert.strictEqual((inA.match(/ selected>/g) || []).length, 1, 'the picked region is selected in its own phase');
  assert.strictEqual((inB.match(/ selected>/g) || []).length, 0, 'another phase still shows All regions');
});

test('every region a phase offers in its filter shows at least one boss in that phase', () => {
  for (const r of loadRoutes().filter(x => x.arch.status === 'ready')) {
    for (const p of r.def.phases) {
      const items = p.bosses.map(boss => ({ boss, phase: p }));
      for (const region of r.BR.view.regionsOf(p)) {
        assert.ok(items.some(it => r.BR.state.bossVisible(it, { region })),
          `${r.arch.id} ${p.id}: "${region}" is offered but hides every boss in its phase`);
      }
    }
  }
});

test('waygate pins honour the hidden attribute, so the Waygates layer toggle can hide them', () => {
  const css = fs.readFileSync(path.join(ROOT, 'site', 'assets', 'map.css'), 'utf8');
  assert.match(css, /\.pin\[hidden\]\s*\{\s*display:\s*none;?\s*\}/);
});
