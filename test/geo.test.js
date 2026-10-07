// Geometry tests (js/geo.js BR.geo): map projection, waygate travel and the "most direct route" boss planner,
// checked against a brute-force search. Run: node --test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { modules } = require('./load');

const { geo } = modules().window.BR;
const plain = x => JSON.parse(JSON.stringify(x));
const close = (a, b, msg) => assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), `${msg || ''} ${a} != ${b}`);

// Seeded PRNG (mulberry32), so random fixtures are the same on every run.
function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const point = r => [Math.round(-2800 + r() * 2900), Math.round(-2300 + r() * 2900)];
function fixture(r, n, { spawns = 3 } = {}) {
  let multi = 0;
  const stops = Array.from({ length: n }, (_, i) => {
    const k = multi < spawns && r() < 0.35 ? 2 + Math.floor(r() * 2) : 1;
    if (k > 1) multi++;
    return { id: `s${i}`, lv: 20 + Math.floor(r() * 20), pts: Array.from({ length: k }, () => point(r)) };
  });
  const waygates = Array.from({ length: Math.floor(r() * 7) }, () => point(r));
  return { stops, waygates };
}

const mustPrecede = (a, b, gap) => b.lv - a.lv >= gap && b.lv > a.lv;

// Cheapest open path over every order and spawn choice that respects the level gap.
function brute(stops, { start = null, waygates = [], gap = 6 } = {}) {
  const placed = stops.filter(s => s.pts && s.pts.length && !s.roams);
  const used = placed.map(() => false);
  let best = Infinity;
  const dfs = (from, depth, acc) => {
    if (acc >= best) return;
    if (depth === placed.length) { best = acc; return; }
    placed.forEach((s, t) => {
      if (used[t] || placed.some((a, i) => !used[i] && i !== t && mustPrecede(a, s, gap))) return;
      used[t] = true;
      for (const p of s.pts) dfs(p, depth + 1, acc + (from ? geo.travel(from, p, waygates).d : 0));
      used[t] = false;
    });
  };
  dfs(start, 0, 0);
  return placed.length ? best : 0;
}

// A plan is a permutation (placed first, then unplaced), keeps the level gap, and its legs chain up and sum to total.
function valid(stops, opts, r) {
  const { start = null, waygates = [], gap = 6 } = opts;
  const byId = Object.fromEntries(stops.map(s => [s.id, s]));
  assert.deepEqual([...r.order].sort(), stops.map(s => s.id).sort());
  const routed = r.order.slice(0, r.order.length - r.unplaced.length);
  assert.deepEqual(r.order.slice(routed.length), r.unplaced);
  routed.forEach((id, i) => routed.slice(i + 1).forEach(later => assert.ok(!mustPrecede(byId[later], byId[id], gap), `${later} before ${id}`)));
  let prev = start, sum = 0;
  for (const id of routed) {
    const leg = r.legs[id];
    assert.deepEqual(leg.from, prev);
    assert.ok(byId[id].pts.some(p => p[0] === leg.to[0] && p[1] === leg.to[1]), `${id} goes to one of its spawns`);
    close(leg.d, prev ? geo.travel(prev, leg.to, waygates).d : 0, `${id} leg`);
    sum += leg.d;
    prev = leg.to;
  }
  r.unplaced.forEach(id => assert.equal(r.legs[id], undefined));
  close(r.total, sum, 'total');
}

describe('projection', () => {
  it('maps the world corners and centre onto the square image, north up', () => {
    const at = (x, z) => plain(geo.project([x, z], 1000)).map(v => Math.round(v * 1e6) / 1e6);
    assert.deepEqual(at(-2885, 640), [0, 0]);
    assert.deepEqual(at(155, 640), [1000, 0]);
    assert.deepEqual(at(-2885, -2400), [0, 1000]);
    assert.deepEqual(at(155, -2400), [1000, 1000]);
    assert.deepEqual(at(-1365, -880), [500, 500]);
  });

  it('uses BR_GAME.bounds when the game data is loaded', () => {
    const { window } = modules({ game: true });
    assert.deepEqual(plain(window.BR.geo.bounds()), plain(window.BR_GAME.bounds));
    window.BR_GAME.bounds = { minX: 0, minZ: 0, maxX: 100, maxZ: 100 };
    assert.deepEqual(plain(window.BR.geo.project([25, 75], 200)), [50, 50]);
  });

  it('measures straight-line distance', () => {
    assert.equal(geo.dist([0, 0], [3, 4]), 5);
    assert.equal(geo.dist([-7, 2], [-7, 2]), 0);
  });
});

describe('travel', () => {
  it('hops between waygates when both ends are next to one', () => {
    const gates = [[-1990, -2000], [0, 0], [-1000, 600]];
    const t = plain(geo.travel([-2000, -2000], [10, 0], gates));
    assert.deepEqual(t, { d: 20, via: [[-1990, -2000], [0, 0]] });
  });

  it('walks when the points are close, share a gate, or the hop saves under 5%', () => {
    assert.deepEqual(plain(geo.travel([0, 0], [100, 0], [[-500, 0], [600, 0]])), { d: 100, via: null });
    assert.deepEqual(plain(geo.travel([0, 0], [50, 0], [[25, 1]])), { d: 50, via: null });
    assert.deepEqual(plain(geo.travel([0, 0], [100, 0], [[0, 48], [100, 48]])), { d: 100, via: null });
    assert.deepEqual(plain(geo.travel([0, 0], [100, 0], [[0, 40], [100, 40]])), { d: 80, via: [[0, 40], [100, 40]] });
  });

  it('walks when there are no waygates', () => {
    assert.deepEqual(plain(geo.travel([0, 0], [3, 4], [])), { d: 5, via: null });
    assert.deepEqual(plain(geo.travel([0, 0], [3, 4])), { d: 5, via: null });
  });
});

describe('plan', () => {
  it('matches a brute-force search on random phases', () => {
    const r = rng(20261007);
    for (let i = 0; i < 16; i++) {
      const { stops, waygates } = fixture(r, 6 + (i % 3));
      const opts = { waygates, start: i % 2 ? point(r) : undefined, gap: i % 4 === 3 ? Infinity : 6 };
      const got = plain(geo.plan(stops, opts));
      valid(stops, opts, got);
      close(got.total, brute(stops, opts), `fixture ${i}`);
    }
  });

  it('kills a boss 6+ levels lower first, even when it is further away', () => {
    const stops = [{ id: 'high', lv: 30, pts: [[10, 0]] }, { id: 'low', lv: 24, pts: [[1000, 0]] }];
    assert.deepEqual(plain(geo.plan(stops, { start: [0, 0] })).order, ['low', 'high']);
    assert.deepEqual(plain(geo.plan(stops, { start: [0, 0], gap: 7 })).order, ['high', 'low']);
    stops[1].lv = 25;
    assert.deepEqual(plain(geo.plan(stops, { start: [0, 0] })).order, ['high', 'low']);
  });

  it('picks the spawn that makes the whole route shortest, not just the next leg', () => {
    const stops = [{ id: 'wolf', lv: 20, pts: [[0, 90], [0, -100]] }, { id: 'next', lv: 22, pts: [[0, -300]] }];
    const got = plain(geo.plan(stops, { start: [0, 0] }));
    assert.deepEqual(got.order, ['wolf', 'next']);
    assert.deepEqual(got.legs.wolf, { d: 100, via: null, from: [0, 0], to: [0, -100] });
    assert.equal(got.total, 300);
  });

  it('puts unplaced and roaming bosses last, by level then input order', () => {
    const stops = [
      { id: 'a', lv: 30, pts: [[0, 100]] },
      { id: 'b', lv: 40, pts: [] },
      { id: 'c', lv: 20, pts: [[0, 1]], roams: true },
      { id: 'd', lv: 20 },
      { id: 'e', lv: 25, pts: [[0, 10]] },
      { id: 'f', pts: [] },
    ];
    const opts = { start: [0, 0] };
    const got = plain(geo.plan(stops, opts));
    valid(stops, opts, got);
    assert.deepEqual(got.order, ['e', 'a', 'c', 'd', 'b', 'f']);
    assert.deepEqual(got.unplaced, ['c', 'd', 'b', 'f']);
    assert.equal(got.total, 100);
  });

  it('is deterministic and breaks ties by input order', () => {
    const a = { id: 'a', lv: 20, pts: [[10, 0]] }, b = { id: 'b', lv: 20, pts: [[-10, 0]] };
    assert.deepEqual(plain(geo.plan([a, b], { start: [0, 0] })).order, ['a', 'b']);
    assert.deepEqual(plain(geo.plan([b, a], { start: [0, 0] })).order, ['b', 'a']);
    assert.deepEqual(plain(geo.plan([b, a])).order, ['b', 'a']);
    const { stops, waygates } = fixture(rng(7), 8);
    assert.deepEqual(plain(geo.plan(stops, { waygates, start: [0, 0] })), plain(geo.plan(stops, { waygates, start: [0, 0] })));
  });

  it('handles empty, single, start-less and all-unplaced phases', () => {
    assert.deepEqual(plain(geo.plan([])), { order: [], legs: {}, total: 0, unplaced: [] });
    assert.deepEqual(plain(geo.plan()), { order: [], legs: {}, total: 0, unplaced: [] });
    const one = [{ id: 'x', lv: 20, pts: [[3, 4]] }];
    assert.deepEqual(plain(geo.plan(one, { start: [0, 0] })), { order: ['x'], legs: { x: { d: 5, via: null, from: [0, 0], to: [3, 4] } }, total: 5, unplaced: [] });
    assert.deepEqual(plain(geo.plan(one)), { order: ['x'], legs: { x: { d: 0, via: null, from: null, to: [3, 4] } }, total: 0, unplaced: [] });
    const two = [{ id: 'far', lv: 20, pts: [[500, 0]] }, { id: 'near', lv: 21, pts: [[0, 0]] }];
    const got = plain(geo.plan(two, { start: undefined }));
    assert.equal(got.total, 500);
    assert.equal(got.legs[got.order[0]].d, 0);
    const none = [{ id: 'p', lv: 50, pts: [] }, { id: 'q', lv: 10 }, { id: 'r', lv: 30, pts: [[1, 1]], roams: true }];
    assert.deepEqual(plain(geo.plan(none, { start: [0, 0] })), { order: ['q', 'r', 'p'], legs: {}, total: 0, unplaced: ['q', 'r', 'p'] });
  });

  it('plans a 13-boss phase with multi-spawn bosses and 22 waygates quickly', () => {
    const r = rng(13);
    const { stops } = fixture(r, 13, { spawns: 4 });
    const waygates = Array.from({ length: 22 }, () => point(r));
    const opts = { waygates, start: point(r) };
    const t0 = performance.now();
    const got = plain(geo.plan(stops, opts));
    const ms = performance.now() - t0;
    valid(stops, opts, got);
    assert.ok(ms < 250, `took ${ms.toFixed(1)} ms`);
  });

  it('falls back to a valid route for phases too big to search exactly', () => {
    const r = rng(99);
    const { stops, waygates } = fixture(r, 20);
    const opts = { waygates, start: [0, 0] };
    const got = plain(geo.plan(stops, opts));
    valid(stops, opts, got);
    assert.equal(got.order.length, 20);
  });
});
