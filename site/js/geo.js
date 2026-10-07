// Bloodroute geometry: map projection and the "most direct route" planner for a phase's V Bloods.
// Pure functions (no DOM); tested in test/geo.test.js. World units are gaming.tools map coordinates (~1 m each).
(() => {
  'use strict';
  const BR = window.BR;
  const DEFAULT_BOUNDS = { minX: -2885, minZ: -2400, maxX: 155, maxZ: 640 };
  const bounds = () => (window.BR_GAME && window.BR_GAME.bounds) || DEFAULT_BOUNDS;

  // [x, z] → [px, py] on a square map image `width` pixels wide (north up).
  function project(p, width) { throw new Error('geo.project: not implemented'); }
  // Straight-line distance between two [x, z] points.
  function dist(a, b) { throw new Error('geo.dist: not implemented'); }
  // Cheapest way from a to b: walk, or walk to the nearest waygate, teleport, and walk from the waygate nearest b.
  // → { d, via: null | [waygateA, waygateB] }
  function travel(a, b, waygates) { throw new Error('geo.travel: not implemented'); }
  // Order a phase's bosses to minimise travel.
  //   stops: [{ id, lv, pts: [[x, z], …] (empty when the boss has no fixed spot), roams?: bool }]
  //   opts:  { start?: [x, z], waygates?: [[x, z], …], gap?: 6 }
  //          A boss may not come before another boss in the phase that is `gap` or more levels lower.
  // → { order: [ids], legs: { [id]: { d, via, from: [x, z], to: [x, z] } }, total, unplaced: [ids] }
  //   Bosses with several spawns use the cheapest one; unplaced and roaming bosses go last, in level order.
  function plan(stops, opts = {}) { throw new Error('geo.plan: not implemented'); }

  BR.geo = { DEFAULT_BOUNDS, bounds, project, dist, travel, plan };
})();
