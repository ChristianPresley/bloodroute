// Bloodroute core: shared helpers for route files, the saved-data store, and route registration.
// Loaded before routes/registry.js, the active route's files and js/app.js.
(() => {
  'use strict';
  const BR = window.BR = window.BR || {};

  // ---------- Map Genie links ----------
  const MG = 'https://mapgenie.io/v-rising/maps/vardoran';
  const M = ids => `${MG}?locationIds=${ids}`;
  const C = id => `${MG}?catIds=${id}`;
  const L = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const CAMPS = '178215,178231,178234,178238,178242,178243,178245,178259,178372,178373,178374,178375,178376,178379,178380,178381,178382,178383,178388,178390,178392,178527';

  // ---------- Icons ----------
  const ICONS = window.VR_ICONS || {};
  const ALIAS = { 'Jewelcrafting Table': 'Regular jewel', 'Altar of Stygian Awakening': 'Stygian Shard', 'Fusion Forge': 'Ember Glass',
    'Ancestral Forge': 'Ancestral Crossbow Shards', 'Blood Homogenizer': 'Primal Blood Essence', 'Stygian Summoning Circle': 'Stygian Shard',
    'Regular gem': 'Regular Topaz', 'Flawless gem': 'Flawless Amethyst', 'Empty waterskin': 'Empty Waterskin' };
  const BOSS_NAMES = new Set();
  const srcOf = n => ICONS[n] || ICONS[ALIAS[n]] || null;
  const initials = n => n.replace(/^(The|General|Sir|Lord)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  // Frame colour by spell school or item rarity.
  const SCHOOL = {
    '#b46bff': ['Chaos Volley', 'Rain of Chaos', 'Chaos Barrage', 'Aftershock', 'Void', 'Veil of Chaos', 'Chaos Kindling', 'Renewing Flames'],
    '#ff3d63': ['Shadowbolt', 'Blood Rite', 'Veil of Blood', 'Blood Storm', 'Carrion Swarm', 'Crimson Beam', 'Blood Rage', 'Hunger for Blood', 'Scholar', 'Draculin', 'Mutant', 'Warrior', 'Rogue', 'Brute'],
    '#6fdc5c': ['Bone Explosion', 'Volatile Arachnid', 'Unholy Chains', 'Veil of Bones'],
    '#ffd23f': ['Lightning Tendrils', 'Ball Lightning', 'Veil of Storm', 'Enhanced Conductivity', 'Lightning Fast Strikes'],
    '#52d4ff': ['Cold Snap', 'Ice Block', 'Veil of Frost', 'Cold Soul'],
    '#3ee6c1': ['Phantom Aegis', 'Wraith Spear', 'Curse', 'Spectral Guardian', 'Veil of Illusion', 'Wicked Power'],
    '#ff9a3c': ['Soul Shard of Dracula', 'Soul Shard of the Winged Horror', 'Soul Shard of Solarus', 'Soul Shard of the Monster', 'Soul Shard of the Serpent',
      "Dracula's Maleficer Chestguard", "Dracula's Maleficer Gloves", "Dracula's Maleficer Boots", "Dracula's Maleficer Leggings", 'Sanguine Crossbow',
      'Ancestral Crossbow Shards', 'Blood Key', 'Primal jewel'],
    '#e056c9': ['Amulet of the Arch-Warlock', 'Blood Merlot Amulet', 'Maleficer Scholar Chestguard', 'Dawnthorn Chestguard', 'Greater jewel',
      'Elixir of the Prowler', 'Elixir of the Twisted', 'Elixir of the Blasphemous', 'Elixir of the Bat', 'Merciless Iron Crossbow'],
    '#c9a56a': ['Wolf Form', 'Rat Form', 'Bear Form', 'Human Form', 'Spider Form', 'Toad Form', 'Bat Form'],
  };
  const FRAME = {};
  for (const [col, names] of Object.entries(SCHOOL)) names.forEach(n => FRAME[n] = col);
  function ic(name, size = 44, cls = '') {
    const s = srcOf(name);
    const round = BOSS_NAMES.has(name) ? ' round' : '';
    const fr = FRAME[name] ? ` framed" style="--fr:${FRAME[name]}` : '';
    if (s) return `<img class="ic${round} ${cls}${fr}" src="${s}" alt="${name}" title="${name}" width="${size}" height="${size}" loading="lazy">`;
    return `<span class="ic-fallback ${cls}" style="width:${size}px;height:${size}px" title="${name}" aria-label="${name}">${initials(name || '?')}</span>`;
  }
  const tiles = list => list && list.length ? `<div class="tiles">${list.map(n => `<span class="tile">${ic(n, 44)}<em>${n}</em></span>`).join('')}</div>` : '';

  BR.h = { MG, M, C, L, CAMPS, ICONS, BOSS_NAMES, srcOf, ic, tiles };

  // ---------- Saved data (this browser profile only) ----------
  // One localStorage entry: { v, active, prefs, routes: { [routeId]: { done, stock, updated } } }.
  const KEY = 'bloodroute:v1';
  const blank = () => ({ v: 1, active: null, prefs: {}, routes: {} });
  function load() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch { s = null; }
    if (!s || typeof s !== 'object' || !s.routes) s = blank();
    // Carry over progress from the single-route "Vardoran Caster Path" page, if this origin has it.
    try {
      const oldDone = localStorage.getItem('vardoran-caster-path-v1'), oldStock = localStorage.getItem('vardoran-caster-stock-v1');
      if ((oldDone || oldStock) && !s.routes.spellcaster) {
        s.routes.spellcaster = { done: JSON.parse(oldDone || '{}'), stock: JSON.parse(oldStock || '{}'), updated: Date.now() };
        s.active = s.active || 'spellcaster';
      }
    } catch {}
    return s;
  }
  const store = load();
  let ok = true;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); ok = true; } catch { ok = false; }
    return ok;
  }
  BR.store = {
    get data() { return store; },
    get ok() { return ok; },
    route(id) {
      const r = store.routes[id] ??= { done: {}, stock: {}, updated: 0 };
      r.done ??= {}; r.stock ??= {};
      return r;
    },
    touch(id) { store.routes[id].updated = Date.now(); persist(); },
    setActive(id) { store.active = id; persist(); },
    pref(k, v) { if (v === undefined) return store.prefs[k]; store.prefs[k] = v; persist(); },
    clearRoute(id) { delete store.routes[id]; if (store.active === id) store.active = null; persist(); },
    exportJSON() { return JSON.stringify({ app: 'bloodroute', exported: new Date().toISOString(), ...store }, null, 1); },
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || d.app !== 'bloodroute' || typeof d.routes !== 'object') throw new Error('This is not a Bloodroute save file.');
      store.v = 1; store.active = d.active || null; store.prefs = d.prefs || {}; store.routes = d.routes;
      return persist();
    },
  };

  // ---------- Route registration ----------
  let onRoute = null, pending = null;
  BR.registerRoute = def => { if (onRoute) onRoute(def); else pending = def; };
  BR.whenRoute = fn => { onRoute = fn; if (pending) { fn(pending); pending = null; } };
})();
