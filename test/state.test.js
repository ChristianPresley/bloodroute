// Planner state and views (js/state.js, js/view.js): boss orders never drop or duplicate a boss, "up next" follows the
// chosen order and filters, phases open sensibly, the saved position wins only when it should, and every phase renders
// cleanly in every order. Run: node --test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { modules, loadRoutes } = require('./load');

const ROUTES = loadRoutes().filter(r => r.def);
const plain = x => JSON.parse(JSON.stringify(x));

describe('boss order', () => {
  for (const { arch, BR, planner } of ROUTES) it(`${arch.name}: every order is a permutation of each phase's bosses`, () => {
    for (const p of planner.phases) {
      const bosses = p.items.filter(i => i.kind === 'Boss');
      const ids = bosses.map(b => b.id).sort();
      for (const order of Object.keys(BR.state.ORDERS)) {
        const r = BR.state.orderBosses(p, bosses, order, { def: { phases: planner.phases } });
        assert.deepEqual(plain(r.ids).sort(), ids, `${p.id} ${order}`);
      }
    }
  });

  it('puts bosses the build needs first under "most beneficial"', () => {
    const { BR, planner } = ROUTES.find(r => r.arch.id === 'spellcaster');
    const p = planner.phases[0];
    const bosses = p.items.filter(i => i.kind === 'Boss');
    const r = BR.state.orderBosses(p, bosses, 'benefit', { def: { phases: planner.phases } });
    const first = bosses.find(b => b.id === r.ids[0]).boss;
    assert.equal(first.must, true);
    const alpha = bosses.find(b => b.boss.name === 'Alpha the White Wolf');
    assert.equal(r.ids[r.ids.length - 1], alpha.id, 'the optional Alpha comes last');
  });

  it('tags what a boss does for the build', () => {
    const { BR, planner } = ROUTES.find(r => r.arch.id === 'spellcaster');
    const p = planner.phases[0];
    const errol = p.bosses.find(b => b.name === 'Errol the Stonebreaker');
    const ben = BR.state.benefit(errol, p, { phases: planner.phases });
    assert.ok(ben.tags.includes('core') && ben.tags.includes('dps'), plain(ben.tags).join());
    assert.ok(ben.immediate, 'Chaos Volley is slotted this phase');
    const alpha = BR.state.benefit(p.bosses.find(b => b.name === 'Alpha the White Wolf'), p, { phases: planner.phases });
    assert.ok(alpha.tags.includes('optional'));
  });

  it('sees a reward feeding this phase\'s craft from the craft text alone', () => {
    const { BR, planner } = ROUTES.find(r => r.arch.id === 'spellcaster');
    const p = planner.phases[2];
    const quincey = p.bosses.find(b => b.name === 'Quincey the Bandit King');
    const ben = BR.state.benefit(quincey, p, { phases: planner.phases });
    assert.ok(plain(ben.why).some(w => /needed for Iron Crossbow/.test(w)), plain(ben.why).join('; '));
  });

  it('rates difficulty from 1 to 5 with the reasons', () => {
    const p = modules({ game: true });
    const d = p.window.BR.state.difficulty('Adam the Firstborn');
    assert.ok(d.score >= 1 && d.score <= 5);
    assert.ok(plain(d.parts).some(([k]) => k === 'Attacks'));
    const none = modules().window.BR.state.difficulty('Somebody Unknown');
    assert.equal(none.score, 3);
  });
});

describe('up next and filters', () => {
  const { BR, planner } = ROUTES.find(r => r.arch.id === 'spellcaster');
  const S = BR.state;
  const P = planner.phases;

  it('does steps, then bosses in the chosen order, then crafting', () => {
    const done = {};
    P[0].items.filter(i => i.kind === 'Step').forEach(i => { done[i.id] = 1; });
    const bosses = P[0].items.filter(i => i.kind === 'Boss');
    const reversed = bosses.map(b => b.id).reverse();
    assert.equal(S.nextItem(P, done, { orders: { p1: reversed } }).id, reversed[0]);
    assert.equal(S.nextItem(P, done).id, bosses[0].id, 'level order without a chosen order');
  });

  it('skips bosses a filter hides', () => {
    const done = {};
    P[0].items.filter(i => i.kind === 'Step').forEach(i => { done[i.id] = 1; });
    const next = S.nextItem(P, done, { visible: it => it.kind !== 'Boss' || S.bossVisible(it, { needed: true }) });
    assert.notEqual(next.boss.name, 'Alpha the White Wolf');
    assert.equal(next.boss.must, true);
  });

  it('finds the boss defeated last (old saves store 1, new ones the time)', () => {
    const bosses = P[2].items.filter(i => i.kind === 'Boss');
    const done = { [bosses[0].id]: 1, [bosses[3].id]: 1700000000000, [bosses[1].id]: 1600000000000 };
    assert.equal(S.lastKill(bosses, done).id, bosses[3].id);
    assert.equal(S.lastKill(bosses, { [bosses[0].id]: 1 }), null);
  });

  it('counts each section from the data', () => {
    const done = { 'p1-s0': 1, 'p1-b2': 1 };
    const c = plain(S.counts(P[0], done));
    assert.deepEqual(c.Step, [1, P[0].steps.length]);
    assert.deepEqual(c.Boss, [1, P[0].bosses.length]);
  });
});

describe('open phases and the saved position', () => {
  const { BR, planner } = ROUTES[0];
  const S = BR.state, P = planner.phases;

  it('opens only the current phase on a first visit', () => {
    const o = plain(S.openPhases(P, 3, {}));
    assert.deepEqual(Object.keys(o).filter(k => o[k]), ['p3']);
  });

  it('keeps what you opened, and opens the next phase when you reach it', () => {
    const ui = { collapsed: { p1: false, p2: true, p3: true, p4: true, p5: true, p6: true, p7: true, p8: true }, cur: 'p1' };
    assert.deepEqual(Object.entries(plain(S.openPhases(P, 1, ui))).filter(([, v]) => v).map(([k]) => k), ['p1']);
    assert.deepEqual(Object.entries(plain(S.openPhases(P, 2, ui))).filter(([, v]) => v).map(([k]) => k), ['p1', 'p2']);
  });

  it('follows a #link on a fresh visit and the saved position on a reload', () => {
    const saved = { anchor: '#row-p3-b2', offset: 40 };
    assert.equal(S.restoreMode({ hash: '#p4', navType: 'navigate', saved }), 'hash');
    assert.equal(S.restoreMode({ hash: '#p4', navType: 'reload', saved }), 'saved');
    assert.equal(S.restoreMode({ hash: '', navType: 'navigate', saved }), 'saved');
    assert.equal(S.restoreMode({ hash: '#map=boss:x', navType: 'navigate', saved }), 'saved');
    assert.equal(S.restoreMode({ hash: '', navType: 'navigate', saved: null }), 'none');
  });

  it('throttles saves and flushes on demand', () => {
    let t = 0, n = 0;
    const timers = [];
    const save = S.throttle(() => n++, 400, { now: () => t, later: (f, ms) => { timers.push([t + ms, f]); return timers.length; }, cancel: () => { timers.length = 0; } });
    save(); save(); save();
    assert.equal(timers.length, 1, 'one save scheduled');
    t = 0; timers.shift()[1]();
    assert.equal(n, 1);
    t = 100; save();
    assert.equal(timers[0][0], 400, 'the next waits out the interval');
    save.flush();
    assert.equal(n, 2);
  });
});

describe('planner views', () => {
  for (const { arch, planner } of ROUTES) it(`${arch.name}: renders every phase cleanly in every order`, () => {
    for (const [order, html] of Object.entries(planner.html)) {
      assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/, order);
      for (const p of planner.phases) {
        assert.match(html, new RegExp(`data-toggle-phase="${p.id}"`), `${p.id} has a toggle`);
        for (const it of p.items) assert.equal(html.split(` id="${it.id}"`).length - 1, 1, `${it.id} once (${order})`);
      }
      assert.match(html, /class="stage stage-(beginning|early|mid|late|end)"/);
      assert.match(html, /class="chip region"/);
      assert.match(html, /class="box box-abilities"/);
    }
  });
});
