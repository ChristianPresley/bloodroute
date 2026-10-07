// Bloodroute hover cards: a full card for any icon (item, ability, boss, enemy, location, material, station, blood,
// passive): name, stats and description from the game data (site/gamedata.js → window.BR_GAME), plus what the route
// says about it: why, when to get it, what replaces it, rotation, jewel mods, consumable use, how to craft it and
// where its materials are. Styles: assets/cards.css.
//
// Route data the cards read (route.js, all optional):
//   def.info[name] = { why, use?, combo?: [names], upgrade? }
//   phase.stage, phase.loadout.rot = { pre: [names], order: [name | { n, when }], fill: [names], why }
//   phase.loadout.jewels = { [spell]: [mod keywords] }, phase.loadout.rolls = [roll keywords]
//   def.needs, def.resources, phase.bosses (gets, take, where), phase.craft/steps (ic, t)
(() => {
  'use strict';
  const BR = window.BR;

  // init({ def, context(el) → { phase, view, build } }): delegated listeners on document (hover, focus, click/tap to pin,
  //   long-press on touch, Esc). Call once per page.
  // render(name, ctx) → HTML for the card. ctx = { def, phase?, view?, build? }; reads window.BR_GAME and BR.lex.
  // howToGet(name, ctx) → HTML: recipe inputs with their sources and map links, station, unlocking boss, research cost,
  //   base item, Gear Level gates; or drop sources.
  // timeline(def) → { [name]: { first: { phase, how, boss? }, last?: phase, replaced?: { phase, by, boss? } } }
  // close() closes the open card.
  function init(opts) {}
  function render(name, ctx) { return ''; }
  function howToGet(name, ctx) { return ''; }
  function timeline(def) { return {}; }
  function close() {}

  BR.cards = { init, render, howToGet, timeline, close };
})();
