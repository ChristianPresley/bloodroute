// Bloodroute geometry: map projection and the "most direct route" planner for a phase's V Bloods.
// Pure functions (no DOM); tested in test/geo.test.js. World units are gaming.tools map coordinates (~1 m each).
(() => {
  'use strict';
  const BR = window.BR;
  const DEFAULT_BOUNDS = { minX: -2885, minZ: -2400, maxX: 155, maxZ: 640 };
  const bounds = () => (window.BR_GAME && window.BR_GAME.bounds) || DEFAULT_BOUNDS;
  // A waygate hop has to beat walking by 5% to be worth opening the menu.
  const WAY_GAIN = 0.95;
  // Exact search up to this many Held–Karp entries (stop subsets × spawns: 14 bosses, 2 MB); bigger phases go greedy.
  const EXACT_MAX = 1 << 18;

  // [x, z] → [px, py] on a square map image `width` pixels wide (north up).
  function project(p, width) {
    const b = bounds();
    return [(p[0] - b.minX) / (b.maxX - b.minX) * width, (b.maxZ - p[1]) / (b.maxZ - b.minZ) * width];
  }
  // Straight-line distance between two [x, z] points.
  function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
  // Nearest of `pts` to p → [index, distance]; the first wins ties, [-1, Infinity] when there are none.
  function nearest(p, pts) {
    let at = -1, best = Infinity;
    for (let i = 0; i < pts.length; i++) { const d = dist(p, pts[i]); if (d < best) { best = d; at = i; } }
    return [at, best];
  }
  // Cheapest way from a to b: walk, or walk to the nearest waygate, teleport, and walk from the waygate nearest b.
  // Teleporting is free (a menu), so the nearest gate at each end is optimal. d is the length of the route taken.
  // → { d, via: null | [waygateA, waygateB] }
  function travel(a, b, waygates) {
    const gates = waygates || [], d = dist(a, b);
    const [i, da] = nearest(a, gates), [j, db] = nearest(b, gates);
    return i !== j && da + db < d * WAY_GAIN ? { d: da + db, via: [gates[i], gates[j]] } : { d, via: null };
  }

  // Order a phase's bosses to minimise travel.
  //   stops: [{ id, lv, pts: [[x, z], …] (empty when the boss has no fixed spot), roams?: bool }]
  //   opts:  { start?: [x, z], waygates?: [[x, z], …], gap?: 6 }
  //          A boss may not come before another boss in the phase that is `gap` or more levels lower.
  //          Without a start the route begins at whichever boss makes the rest shortest (its leg is 0, from null).
  // → { order: [ids], legs: { [id]: { d, via, from: [x, z] | null, to: [x, z] } }, total, unplaced: [ids] }
  //   Bosses with several spawns use the cheapest one; unplaced and roaming bosses go last, in level order.
  // Exact (Held–Karp over subsets × spawns, open path), ties to input order; greedy nearest-first beyond EXACT_MAX.
  function plan(stops, opts = {}) {
    const { start = null, waygates = [], gap = 6 } = opts || {};
    const all = stops || [];
    const here = s => !!(s.pts && s.pts.length) && !s.roams;
    const lv = s => (Number.isFinite(s.lv) ? s.lv : NaN); // unknown level: no precedence, sorts last
    const placed = all.filter(here);
    const unplaced = all.map((s, i) => [s, i]).filter(([s]) => !here(s))
      .sort(([a, i], [b, j]) => (isNaN(lv(a)) - isNaN(lv(b))) || (lv(a) - lv(b)) || i - j).map(([s]) => s.id);
    const n = placed.length;

    // Spawns flattened to nodes: stop t owns nodes first[t] … first[t + 1] - 1.
    const first = [0], pt = [], stopOf = [];
    placed.forEach((s, t) => { s.pts.forEach(p => { pt.push(p); stopOf.push(t); }); first.push(pt.length); });
    const N = pt.length;
    const C = new Float64Array(N * N);
    for (let k = 0; k < N; k++) for (let q = 0; q < N; q++) C[k * N + q] = stopOf[k] === stopOf[q] ? 0 : travel(pt[k], pt[q], waygates).d;
    const S = Float64Array.from(pt, p => (start ? travel(start, p, waygates).d : 0));
    // before[t]: stops that must come first (gap or more levels lower).
    const before = placed.map(b => placed.map((_, i) => i).filter(i => lv(b) - lv(placed[i]) >= gap && lv(b) > lv(placed[i])));

    // f[m * N + k]: cheapest way to visit every stop not in m, standing on node k (whose stop is in m).
    const exact = n > 0 && 2 ** n * N <= EXACT_MAX;
    let f = null, pre = null;
    const full = exact ? (1 << n) - 1 : 0;
    if (exact) {
      pre = before.map(l => l.reduce((m, i) => m | 1 << i, 0));
      f = new Float64Array((full + 1) * N).fill(Infinity);
      for (let k = 0; k < N; k++) f[full * N + k] = 0;
      for (let m = full - 1; m > 0; m--) {
        let ok = true;
        for (let t = 0; t < n && ok; t++) if (m >> t & 1 && pre[t] & ~m) ok = false;
        if (!ok) continue;
        for (let k = 0; k < N; k++) {
          if (!(m >> stopOf[k] & 1)) continue;
          let best = Infinity;
          for (let t = 0; t < n; t++) {
            if (m >> t & 1 || pre[t] & ~m) continue;
            const row = (m | 1 << t) * N;
            for (let q = first[t]; q < first[t + 1]; q++) { const c = C[k * N + q] + f[row + q]; if (c < best) best = c; }
          }
          f[m * N + k] = best;
        }
      }
    }

    // Walk forward: from each position take the first node (input order) within rounding of the best.
    const order = [], legs = {}, done = placed.map(() => false);
    let m = 0, k = -1, total = 0;
    for (let step = 0; step < n; step++) {
      const cand = [];
      for (let t = 0; t < n; t++) {
        if (done[t] || before[t].some(i => !done[i])) continue;
        for (let q = first[t]; q < first[t + 1]; q++) {
          const c = k < 0 ? S[q] : C[k * N + q];
          cand.push([q, exact ? c + f[(m | 1 << t) * N + q] : c]);
        }
      }
      const best = Math.min(...cand.map(c => c[1]));
      const q = cand.find(c => c[1] <= best + 1e-9 * Math.max(1, best))[0];
      const t = stopOf[q], from = k < 0 ? start : pt[k];
      const leg = from ? travel(from, pt[q], waygates) : { d: 0, via: null };
      legs[placed[t].id] = { d: leg.d, via: leg.via, from: from || null, to: pt[q] };
      order.push(placed[t].id);
      total += leg.d;
      done[t] = true;
      if (exact) m |= 1 << t;
      k = q;
    }
    return { order: order.concat(unplaced), legs, total, unplaced };
  }

  BR.geo = { DEFAULT_BOUNDS, bounds, project, dist, travel, plan };
})();
