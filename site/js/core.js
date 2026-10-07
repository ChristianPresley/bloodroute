// Bloodroute core: shared helpers for route files, the saved-data store, and route registration.
// Loaded before routes/registry.js, the active route's files and js/app.js.
(() => {
  'use strict';
  const BR = window.BR = window.BR || {};

  // Escapes text for HTML attributes and text nodes.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- Map Genie links ----------
  // L() tags Map Genie links with their location or category ids (data-mg / data-cat) so js/map.js can show the
  // same place on the in-app map; the link itself still opens Map Genie.
  const MG = 'https://mapgenie.io/v-rising/maps/vardoran';
  const M = ids => `${MG}?locationIds=${ids}`;
  const C = id => `${MG}?catIds=${id}`;
  const L = (href, text) => {
    const loc = /[?&]locationIds=([\d,]+)/.exec(href), cat = /[?&]catIds=(\d+)/.exec(href);
    const data = loc ? ` data-mg="${loc[1]}"` : cat ? ` data-cat="${cat[1]}"` : '';
    return `<a href="${href}" target="_blank" rel="noopener"${data}>${text}</a>`;
  };
  const CAMPS = '178215,178231,178234,178238,178242,178243,178245,178259,178372,178373,178374,178375,178376,178379,178380,178381,178382,178383,178388,178390,178392,178527';

  // ---------- Icons ----------
  const ICONS = window.VR_ICONS || {};
  const ALIAS = { 'Jewelcrafting Table': 'Regular jewel', 'Altar of Stygian Awakening': 'Stygian Shard', 'Fusion Forge': 'Ember Glass',
    'Ancestral Forge': 'Ancestral Crossbow Shards', 'Blood Homogenizer': 'Primal Blood Essence', 'Stygian Summoning Circle': 'Stygian Shard',
    'Regular gem': 'Regular Topaz', 'Flawless gem': 'Flawless Amethyst',
    'Ancestral Pistols Shards': 'Sanguine Pistols' };
  const BOSS_NAMES = new Set();
  const srcOf = n => ICONS[n] || ICONS[ALIAS[n]] || null;
  const initials = n => n.replace(/^(The|General|Sir|Lord)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  // Names with no item behind them, drawn as a glyph: an empty slot, the dash every vampire starts with, and the
  // rotation steps that are actions rather than abilities.
  const GLYPH = { '—': '—', 'Starting dash': '»', 'Veil attack': '✦', 'Primary attacks': '⚔', 'Crossbow shot': '➶', 'Recast': '↻' };
  // Ancestral weapons are named after their icon's item ("Ancestral Reaper Shards"); show the weapon's name.
  const display = n => String(n).replace(/^(Ancestral .+) Shards$/, '$1');
  // A loadout slot's icon: the first spell the slot names ("Shadowbolt or Bone Explosion" → Shadowbolt).
  const slotIcon = (names, s) => (names || []).filter(n => s.includes(n)).sort((a, b) => s.indexOf(a) - s.indexOf(b) || b.length - a.length)[0] || s;
  // Frame colour by spell school or item rarity.
  const SCHOOL = {
    '#b46bff': ['Chaos Volley', 'Rain of Chaos', 'Chaos Barrage', 'Aftershock', 'Void', 'Veil of Chaos', 'Chaos Kindling', 'Renewing Flames', 'Power Surge'],
    '#ff3d63': ['Shadowbolt', 'Blood Rite', 'Veil of Blood', 'Blood Storm', 'Carrion Swarm', 'Crimson Beam', 'Blood Rage', 'Hunger for Blood', 'Scholar', 'Draculin', 'Mutant', 'Warrior', 'Rogue', 'Brute',
      'Heart Strike', 'Sanguine Coil', 'Blood Spray', 'Sanguine Mastery', 'Rampage', 'Lethal Strikes', 'Ravenous Strikes', 'Overpower'],
    '#6fdc5c': ['Bone Explosion', 'Volatile Arachnid', 'Unholy Chains', 'Veil of Bones'],
    '#ffd23f': ['Lightning Tendrils', 'Ball Lightning', 'Veil of Storm', 'Enhanced Conductivity', 'Lightning Fast Strikes', 'Discharge', 'Lightning Typhoon'],
    '#52d4ff': ['Cold Snap', 'Ice Block', 'Veil of Frost', 'Cold Soul'],
    '#3ee6c1': ['Phantom Aegis', 'Wraith Spear', 'Curse', 'Spectral Guardian', 'Veil of Illusion', 'Wicked Power'],
    '#ff9a3c': ['Soul Shard of Dracula', 'Soul Shard of the Winged Horror', 'Soul Shard of Solarus', 'Soul Shard of the Monster', 'Soul Shard of the Serpent',
      "Dracula's Maleficer Chestguard", "Dracula's Maleficer Gloves", "Dracula's Maleficer Boots", "Dracula's Maleficer Leggings", 'Sanguine Crossbow',
      'Ancestral Crossbow Shards', 'Blood Key', 'Primal jewel',
      'Sanguine Reaper', 'Sanguine Pistols', 'Sanguine Twinblade', 'Ancestral Reaper Shards', 'Ancestral Pistols Shards', 'Ancestral Twinblade Shards',
      'Ancestral Sword Shards', 'Ancestral Axes Shards', 'Ancestral Spear Shards',
      "Dracula's Dread Chestguard", "Dracula's Dread Gloves", "Dracula's Dread Boots", "Dracula's Dread Leggings",
      "Dracula's Grim Chestguard", "Dracula's Grim Gloves", "Dracula's Grim Boots", "Dracula's Grim Leggings",
      "Dracula's Shadow Chestguard", "Dracula's Shadow Gloves", "Dracula's Shadow Boots", "Dracula's Shadow Leggings"],
    '#e056c9': ['Amulet of the Arch-Warlock', 'Blood Merlot Amulet', 'Maleficer Scholar Chestguard', 'Dawnthorn Chestguard', 'Greater jewel',
      'Elixir of the Prowler', 'Elixir of the Twisted', 'Elixir of the Blasphemous', 'Elixir of the Bat', 'Merciless Iron Crossbow',
      'Amulet of the Crimson Commander', 'Amulet of the Blademaster', 'Dread Plate Chestguard', 'Grim Knight Chestguard', 'Shadowmoon Chestguard',
      'Greater Blood jewel', 'Greater Chaos jewel', 'Elixir of the Raven', 'Elixir of the Crow', 'Elixir of the Werewolf', 'Elixir of the Beast',
      'Merciless Iron Reaper', 'Merciless Iron Pistols', 'Merciless Iron Twinblade'],
    '#c9a56a': ['Wolf Form', 'Rat Form', 'Bear Form', 'Human Form', 'Spider Form', 'Toad Form', 'Bat Form'],
  };
  const FRAME = {};
  for (const [col, names] of Object.entries(SCHOOL)) names.forEach(n => FRAME[n] = col);
  // An icon. data-info carries the raw name for the hover cards (js/cards.js); pass cls 'noinfo' for decorative icons.
  function ic(name, size = 44, cls = '') {
    const s = srcOf(name);
    const round = BOSS_NAMES.has(name) ? ' round' : '';
    const fr = FRAME[name] ? ` framed" style="--fr:${FRAME[name]}` : '';
    const label = esc(display(name));
    const info = /\bnoinfo\b/.test(cls) || GLYPH[name] === '—' ? '' : ` data-info="${esc(name)}"`;
    if (s) return `<img class="ic${round} ${cls}${fr}" src="${s}" alt="${label}"${info} width="${size}" height="${size}" loading="lazy">`;
    const glyph = GLYPH[name];
    return `<span class="ic-fallback${glyph ? ' glyph' : ''} ${cls}" style="width:${size}px;height:${size}px" role="img" aria-label="${label}"${info}>${glyph || initials(name || '?')}</span>`;
  }
  // Tiles are focusable so a keyboard can open their hover card.
  const tiles = list => list && list.length ? `<div class="tiles">${list.map(n => `<span class="tile" tabindex="0">${ic(n, 44)}<em>${display(n)}</em></span>`).join('')}</div>` : '';

  BR.h = { MG, M, C, L, CAMPS, ICONS, BOSS_NAMES, GLYPH, SCHOOL, FRAME, esc, srcOf, ic, tiles, display, slotIcon };

  // ---------- Saved data (this browser profile only) ----------
  // One localStorage entry: { v, active, prefs, routes: { [routeId]: { done, stock, updated } } }.
  const KEY = 'bloodroute:v1';
  const blank = () => ({ v: 1, active: null, prefs: {}, routes: {} });
  // Stockpile counts are keyed by material name: keep them when a material is renamed.
  const RENAMED = { 'Empty waterskin': 'Empty Waterskin' };
  function migrate(routes) {
    for (const r of Object.values(routes || {})) {
      const st = r && r.stock;
      if (!st || typeof st !== 'object') continue;
      for (const [from, to] of Object.entries(RENAMED)) if (from in st) { if (!(to in st)) st[to] = st[from]; delete st[from]; }
    }
  }
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
    migrate(s.routes);
    return s;
  }
  const store = load();
  let ok = true;
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); ok = true; } catch { ok = false; }
    return ok;
  }
  // View state (open phases and sections, scroll positions, boss order and filters) has its own entry, so saving it
  // never rewrites progress another tab has changed. It belongs to this browser and is not part of backups.
  const UI_KEY = 'bloodroute:ui:v1';
  let ui = {};
  try { ui = JSON.parse(localStorage.getItem(UI_KEY)) || {}; } catch { ui = {}; }
  if (!ui || typeof ui !== 'object' || Array.isArray(ui)) ui = {};

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
    clearRoute(id) { delete store.routes[id]; delete ui[id]; if (store.active === id) store.active = null; persist(); this.saveUI(); },
    // A route's view state; mutate it, then call saveUI() (js/app.js throttles the calls).
    ui(id) { const u = ui[id] ??= {}; u.collapsed ??= {}; u.sections ??= {}; u.scroll ??= {}; return u; },
    saveUI() { try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); return true; } catch { return false; } },
    // Another tab saved progress: copy its ticks and counts into the route objects this page already holds.
    reload() {
      let s = null;
      try { s = JSON.parse(localStorage.getItem(KEY)); } catch { s = null; }
      if (!s || typeof s !== 'object' || !s.routes) return false;
      migrate(s.routes);
      for (const [id, r] of Object.entries(s.routes)) {
        const mine = this.route(id);
        for (const k of ['done', 'stock']) { Object.keys(mine[k]).forEach(x => delete mine[k][x]); Object.assign(mine[k], r[k] || {}); }
        mine.updated = r.updated; mine.summary = r.summary;
      }
      store.active = s.active ?? store.active; store.prefs = s.prefs || store.prefs;
      return true;
    },
    KEY, UI_KEY,
    exportJSON() { return JSON.stringify({ app: 'bloodroute', exported: new Date().toISOString(), ...store }, null, 1); },
    importJSON(text) {
      const d = JSON.parse(text);
      if (!d || d.app !== 'bloodroute' || typeof d.routes !== 'object') throw new Error('This is not a Bloodroute save file.');
      store.v = 1; store.active = d.active || null; store.prefs = d.prefs || {}; store.routes = d.routes;
      migrate(store.routes);
      return persist();
    },
  };

  // ---------- Route registration ----------
  let onRoute = null, pending = null;
  BR.registerRoute = def => { if (onRoute) onRoute(def); else pending = def; };
  BR.whenRoute = fn => { onRoute = fn; if (pending) { fn(pending); pending = null; } };
})();
