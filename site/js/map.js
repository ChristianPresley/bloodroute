// Bloodroute maps: the Vardoran map (V Rising Wiki image, downloaded at build time by site/build-map.js into map/)
// with pins, as a small inline map for hover cards and as a full-screen pan/zoom viewer. Styles: assets/map.css.
(() => {
  'use strict';
  const BR = window.BR;

  // A pin: { p: [x, z], label, kind: 'boss' | 'waygate' | 'node' | 'drop' | 'place' | 'you', icon?: name, n?: order number }
  //
  // ready() → true when the map image and coordinates are available (otherwise callers show Map Genie links only).
  // mini({ pins, focus?: [x, z], crop?: bool, region?: name, title? }) → HTML for a card: the whole map with the pins,
  //   plus (crop) a closer view around `focus`; region tints that region's area.
  // open({ title, pins, path?: [[x, z], …], layers?: [BR_GAME.layers keys], focus?, waygates?: bool, links?: html })
  //   opens the full-screen viewer (pushState, so Back closes it).
  // close() closes it.
  // href(spec) → '#map=<spec>' for in-app map links; spec is 'boss:<name>' | 'mat:<name>' | 'place:<name>' |
  //   'region:<name>' | 'phase:<id>' | 'mg:<Map Genie ids>' | 'cat:<Map Genie category>'.
  // resolve(fn) registers fn(spec) → open() options (js/app.js knows the route); follow(hash) opens a '#map=' link.
  function ready() { return false; }
  function mini(opts) { return ''; }
  function open(opts) { throw new Error('map.open: not implemented'); }
  function close() {}
  const href = spec => '#map=' + encodeURIComponent(spec);
  let resolver = null;
  function resolve(fn) { resolver = fn; }
  function follow(hash) { return false; }

  BR.map = { ready, mini, open, close, href, resolve, follow };
})();
