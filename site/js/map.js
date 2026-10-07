// Bloodroute maps: the Vardoran map (V Rising Wiki image, downloaded at build time by site/build-map.js into map/)
// with pins, as a small inline map for hover cards and as a full-screen pan/zoom viewer. Styles: assets/map.css.
(() => {
  'use strict';
  const BR = window.BR;

  // A pin: { p: [x, z], label, kind: 'boss' | 'waygate' | 'node' | 'drop' | 'place' | 'you', icon?: name, n?: order number,
  //   note?: one line under the label, jump?: data-jump value (bosses default to the label; false hides "Show in phase"),
  //   info?: data-info value (defaults to the icon or label; false hides "Details") }
  //
  // ready() → true when the map image and coordinates are available (otherwise callers show Map Genie links only).
  // mini({ pins, focus?: [x, z], crop?: bool, region?: name, title?, spec?, links?: html }) → HTML for a card: the whole
  //   map with the pins, plus (crop) a closer view around `focus` (default: the first pin); region tints that region's
  //   area; spec adds an "Open map" link (href(spec)); links show next to the "not downloaded" note.
  // open({ title, pins, path?: [[x, z] | null, …], layers?: [BR_GAME.layers keys | { name, pts, color? }], focus?,
  //   waygates?: bool, region?: name, links?: html, spec? }) opens the full-screen viewer (pushState, so Back closes it).
  //   A null in `path` lifts the pen (a waygate jump, drawn dotted). Pin popups carry [data-jump] ("Show in phase",
  //   closes the viewer and bubbles to the app) and [data-info] ("Details", for js/cards.js).
  // close() closes it.
  // href(spec) → '#map=<spec>' for in-app map links; spec is 'boss:<name>' | 'mat:<name>' | 'place:<name>' |
  //   'region:<name>' | 'enemy:<name>' | 'phase:<id>' | 'mg:<Map Genie ids>' | 'cat:<Map Genie category>'.
  // resolve(fn) registers fn(spec) → open() options (js/app.js knows the route); follow(hash) opens a '#map=' link.
  //   Clicks on a[href^="#map="] are followed here; the app calls follow(location.hash) once its resolver is set.
  // Helpers (pure, tested): parse(hash) → { spec, type, arg } | null; lookup(spec) → open() options for the built-in
  //   specs, { external: url } for a Map Genie fallback, or null; frac([x, z]) → [fx, fy] fractions of the map image.

  const G = () => window.BR_GAME || {};
  const D = () => BR.lexData || {};
  const DEFAULT_BOUNDS = { minX: -2885, minZ: -2400, maxX: 155, maxZ: 640 };
  const bounds = () => (BR.geo && typeof BR.geo.bounds === 'function' && BR.geo.bounds()) || G().bounds || DEFAULT_BOUNDS;
  const IMG = w => `map/vardoran-${w}.webp`;
  const CREDIT = 'Map: V Rising Wiki · © Stunlock Studios';
  const esc = s => BR.h.esc(s);
  const KINDS = new Set(['boss', 'waygate', 'node', 'drop', 'place', 'you']);
  const DOT_KINDS = ['node', 'drop'];     // drawn as one SVG path per kind in cards
  const CAP_DOTS = 300, CAP_PINS = 150;   // per kind / other pins, in cards
  const CROP_ZOOM = 4;                    // the card's close-up shows a quarter of the map's width
  const REGION_R = 300;                   // world units, when REGIONS[name].r is not set
  const MG_LINK = 'Map Genie ↗';

  const isPt = p => Array.isArray(p) && p.length >= 2 && p[0] !== null && p[1] !== null && Number.isFinite(+p[0]) && Number.isFinite(+p[1]);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  // [x, z] → [fx, fy]: fractions of the square map image, north up.
  function frac(p) {
    const b = bounds();
    return [(p[0] - b.minX) / (b.maxX - b.minX), (b.maxZ - p[1]) / (b.maxZ - b.minZ)];
  }
  const onMap = f => f[0] >= -0.01 && f[0] <= 1.01 && f[1] >= -0.01 && f[1] <= 1.01;
  const pct = v => +(v * 100).toFixed(2) + '%';
  // Every n-th item, so a capped list still covers the whole map.
  function sample(list, cap) {
    if (list.length <= cap) return list;
    const out = [], step = list.length / cap;
    for (let i = 0; i < cap; i++) out.push(list[Math.floor(i * step)]);
    return out;
  }
  const kindOf = pin => KINDS.has(pin.kind) ? pin.kind : 'place';

  // A lexicon/game-data entry by name: exact, then with straight/curly apostrophes swapped, then ignoring case.
  const norm = s => String(s).toLowerCase().replace(/[’‘]/g, "'").trim();
  function find(obj, name) {
    if (!obj || name == null || name === '') return null;
    const n = String(name);
    if (Object.prototype.hasOwnProperty.call(obj, n) && obj[n]) return [n, obj[n]];
    const want = norm(n);
    for (const k of Object.keys(obj)) if (obj[k] && norm(k) === want) return [k, obj[k]];
    return null;
  }
  function regionOf(name) {
    const R = D().REGIONS;
    if (!R || !name) return null;
    const hit = find(R, name);
    if (hit) return hit;
    const want = norm(name);
    for (const [k, r] of Object.entries(R)) if (r && (r.aka || []).some(a => norm(a) === want)) return [k, r];
    return null;
  }
  // The region's highlight circle: { f: [fx, fy], r: radius as a fraction of the map width }.
  function regionCircle(name) {
    const hit = regionOf(name);
    if (!hit || !isPt(hit[1].center)) return null;
    const b = bounds();
    return { name: hit[0], f: frac(hit[1].center), r: (+hit[1].r || REGION_R) / (b.maxX - b.minX) };
  }

  // ---------- Availability ----------
  // Bounds always exist (BR_GAME or the default); the image is probed once and reported missing after a failed load.
  let missing = false, probed = false, hiFailed = false;
  function ready() {
    if (!probed && typeof Image === 'function') {
      probed = true;
      try { const im = new Image(); im.onerror = () => { missing = true; }; im.src = IMG(760); } catch {}
    }
    return !!bounds() && !missing;
  }

  // ---------- Card map ----------
  function pinHtml(pin) {
    const kind = kindOf(pin);
    const icon = pin.icon && kind === 'boss' ? BR.h.ic(pin.icon, 18, 'noinfo pin-ic') : '';
    const num = pin.n != null && pin.n !== '' ? `<b>${esc(pin.n)}</b>` : '';
    const cls = `pin pin-${kind}${icon ? ' has-ic' : ''}${num ? ' num' : ''}`;
    return `<i class="${cls}" style="left:${pct(pin.f[0])};top:${pct(pin.f[1])}"${pin.label ? ` title="${esc(pin.label)}"` : ''}>${icon}${num}</i>`;
  }
  // Dots as zero-length round-capped strokes: a few bytes each, sized in screen pixels however the panel is scaled.
  function dotsSvg(groups, digits) {
    const k = 10 ** digits;
    const r = v => Math.round(v * 1000 * k) / k;
    const paths = DOT_KINDS.filter(kd => groups[kd] && groups[kd].length)
      .map(kd => `<path class="d-${kd}" d="${groups[kd].map(p => `M${r(p.f[0])} ${r(p.f[1])}h0`).join('')}"/>`).join('');
    return paths ? `<svg class="map-dots" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>` : '';
  }
  const regionHtml = rc => rc ? `<i class="map-region" style="left:${pct(rc.f[0])};top:${pct(rc.f[1])};width:${pct(rc.r * 2)}"></i>` : '';
  const layerHtml = (rc, groups, pins, digits) => regionHtml(rc) + dotsSvg(groups, digits) + pins.map(pinHtml).join('');

  function mini(opts) {
    const o = opts || {};
    const all = (o.pins || []).filter(p => p && isPt(p.p)).map(p => ({ ...p, f: frac(p.p) })).filter(p => onMap(p.f));
    const rc = o.region ? regionCircle(o.region) : null;
    let focus = isPt(o.focus) ? frac(o.focus) : null;
    if (!all.length && !rc && !focus) return '';
    const links = o.links ? ' ' + o.links : '';
    const note = `<p class="map-note">Map image not downloaded.${links}</p>`;
    if (missing) return `<div class="map-mini map-missing">${note}</div>`;

    const groups = {}, pins = [];
    for (const p of all) { const kd = kindOf(p); if (DOT_KINDS.includes(kd)) (groups[kd] ??= []).push(p); else pins.push(p); }
    for (const kd of DOT_KINDS) if (groups[kd]) groups[kd] = sample(groups[kd], CAP_DOTS);
    // Bosses and places above waygates; numbered stops on top.
    const rank = p => (kindOf(p) === 'waygate' ? 0 : 1) + (p.n != null ? 2 : 0) + (kindOf(p) === 'you' ? 4 : 0);
    const shown = sample(pins, CAP_PINS).sort((a, b) => rank(a) - rank(b));
    const title = esc(o.title || (shown[0] && shown[0].label) || 'Map');
    let h = `<div class="map-mini"><div class="map-full" role="img" aria-label="${title}">`
      + `<img class="map-img" src="${IMG(760)}" alt="" width="760" height="760" loading="lazy" decoding="async">`
      + layerHtml(rc, groups, shown, 0) + '</div>';

    if (o.crop) {
      focus = focus || (shown.find(p => kindOf(p) !== 'waygate') || shown[0] || {}).f || (rc && rc.f);
      if (focus) {
        // The close-up is 2:1; keep its window inside the map.
        const z = CROP_ZOOM, hx = 1 / (2 * z), hy = 1 / (4 * z);
        const cx = clamp(focus[0], hx, 1 - hx), cy = clamp(focus[1], hy, 1 - hy);
        const inWin = p => Math.abs(p.f[0] - cx) <= hx + 0.02 && Math.abs(p.f[1] - cy) <= hy + 0.02;
        const g2 = {};
        for (const kd of DOT_KINDS) if (groups[kd]) g2[kd] = all.filter(p => kindOf(p) === kd && inWin(p)).slice(0, CAP_DOTS);
        h += `<div class="map-crop" aria-hidden="true"><div class="map-crop-in" style="width:${z * 100}%;transform:translate(${pct(-cx)},${pct(-cy)})">`
          + `<img class="map-img" src="${IMG(1520)}" alt="" width="1520" height="1520" loading="lazy" decoding="async">`
          + layerHtml(rc, g2, shown.filter(inWin), 1) + '</div></div>';
      }
    }
    const openLink = o.spec ? ` <a class="map-open" href="${esc(href(o.spec))}">Open map</a>` : '';
    return h + note + `<p class="map-credit">${CREDIT}${openLink}</p></div>`;
  }

  // ---------- Links: '#map=<spec>' ----------
  const href = spec => '#map=' + encodeURIComponent(spec);
  function parse(hash) {
    const m = /^#?map=(.*)$/s.exec(String(hash == null ? '' : hash).trim());
    if (!m || !m[1]) return null;
    let spec = m[1];
    try { spec = decodeURIComponent(spec.replace(/\+/g, '%20')); } catch {}
    spec = spec.trim();
    if (!spec) return null;
    const i = spec.indexOf(':');
    return { spec, type: i > 0 ? spec.slice(0, i).toLowerCase() : '', arg: i > 0 ? spec.slice(i + 1).trim() : spec };
  }

  // A boss's spots: its spawns from the game data, else the lexicon's fixed position.
  function bossPts(name) {
    const n = find(G().npcs, name), b = find(D().VBLOOD, name);
    const sp = n && Array.isArray(n[1].spawns) ? n[1].spawns.filter(isPt) : [];
    if (sp.length) return { name: n[0], pts: sp };
    if (b && isPt(b[1].pos)) return { name: b[0], pts: [b[1].pos] };
    return { name: (n || b || [name])[0], pts: [] };
  }
  const idsOf = v => String(v == null ? '' : v).split(/[\s,]+/).filter(Boolean);
  const mgLinks = (mg, cat) => mg ? BR.h.L(BR.h.M(idsOf(mg).join(',')), MG_LINK) : cat ? BR.h.L(BR.h.C(cat), MG_LINK) : '';
  const placePin = (name, pl) => ({ p: pl.pos, label: name, kind: 'place', note: pl.note || (pl.approx ? 'Approximate position' : '') });

  // Where a material is gathered: game-data layers (nodes or the raw material's nodes), the lexicon's place or layer,
  // and the layers of its best drop sources.
  function matSources(name, seen = new Set()) {
    const g = G(), d = D(), L = g.layers || {};
    const layers = [], pins = [];
    const key = (find(g.mats, name) || find(d.MATERIALS, name) || find(g.items, name) || [name])[0];
    if (seen.has(key)) return { key, layers, pins };
    seen.add(key);
    const add = k => { if (k && L[k] && !layers.includes(k)) layers.push(k); };
    const m = find(g.mats, key), lm = find(d.MATERIALS, key), it = find(g.items, key);
    if (m) (m[1].layers || []).forEach(add);
    if (lm) {
      (Array.isArray(lm[1].layer) ? lm[1].layer : idsOf(lm[1].layer)).forEach(add);
      const pl = lm[1].place && find(d.PLACES, lm[1].place);
      if (pl && isPt(pl[1].pos)) pins.push(placePin(pl[0], pl[1]));
    }
    const raw = (m && m[1].via) || (lm && lm[1].raw);
    if (raw && !layers.length && !pins.length) { const r = matSources(raw, seen); r.layers.forEach(add); pins.push(...r.pins); }
    // BR_GAME.mats already lists the best drop sources' layers; without it, use the item's top drops.
    if (it && !m) (it[1].drops || []).slice(0, 3).forEach(dr => add(dr && dr.layer));
    return { key, layers, pins, mg: lm && lm[1].mg };
  }

  // Built-in specs → open() options; { external } when only Map Genie knows the place; null for the app's resolver.
  function lookup(spec) {
    const q = typeof spec === 'string' ? parse(href(spec)) : spec;
    if (!q || !q.arg) return null;
    const g = G(), d = D(), a = q.arg;
    switch (q.type) {
      case 'boss': {
        const b = bossPts(a);
        if (!b.pts.length) return null;
        const note = b.pts.length > 1 ? 'One of several spawns' : (find(d.VBLOOD, b.name) || [, {}])[1].roams ? 'Roams; last seen here' : '';
        return { title: b.name, pins: b.pts.map(p => ({ p, label: b.name, kind: 'boss', icon: b.name, note })),
          focus: b.pts.length === 1 ? b.pts[0] : undefined, waygates: true };
      }
      case 'enemy': case 'npc': {
        const n = find(g.npcs, a);
        if (!n) return null;
        const pts = (n[1].spawns || []).filter(isPt), lk = n[1].id && 'npc:' + n[1].id;
        const layer = lk && g.layers && g.layers[lk] ? lk : pts.length ? { key: 'npc', name: n[0], pts } : null;
        return layer ? { title: `Where to find ${n[0]}`, layers: [layer], pins: [], waygates: true } : null;
      }
      case 'mat': {
        const s = matSources(a);
        if (!s.layers.length && !s.pins.length) return s.mg ? { external: BR.h.C(idsOf(s.mg)[0]) } : null;
        return { title: `Where to find ${s.key}`, layers: s.layers, pins: s.pins, waygates: true, links: s.mg ? mgLinks(null, idsOf(s.mg)[0]) : '' };
      }
      case 'place': {
        const pl = find(d.PLACES, a);
        if (!pl || !isPt(pl[1].pos)) return null;
        return { title: pl[0], pins: [placePin(pl[0], pl[1])], focus: pl[1].pos, waygates: true, links: mgLinks(pl[1].mg) };
      }
      case 'region': {
        const r = regionOf(a);
        if (!r) return null;
        const pins = [];
        for (const [n, b] of Object.entries(d.VBLOOD || {})) {
          if (!b || b.region !== r[0]) continue;
          const bp = bossPts(n);
          bp.pts.forEach(p => pins.push({ p, label: bp.name, kind: 'boss', icon: bp.name }));
        }
        if (!pins.length && !isPt(r[1].center)) return null;
        return { title: r[0], pins, region: r[0], focus: pins.length ? undefined : r[1].center, waygates: true };
      }
      case 'mg': {
        const want = new Set(idsOf(a));
        const pins = Object.entries(d.PLACES || {}).filter(([, pl]) => pl && isPt(pl.pos) && idsOf(pl.mg).some(id => want.has(id)))
          .map(([n, pl]) => placePin(n, pl));
        if (!pins.length) return want.size ? { external: BR.h.M([...want].join(',')) } : null;
        return { title: pins.map(p => p.label).join(' · '), pins, focus: pins.length === 1 ? pins[0].p : undefined, waygates: true, links: mgLinks([...want].join(',')) };
      }
      case 'cat': {
        const id = idsOf(a)[0];
        const mats = Object.entries(d.MATERIALS || {}).filter(([, m]) => m && idsOf(m.mg).includes(id)).map(([n]) => n);
        const layers = [], pins = [];
        for (const n of mats) { const s = matSources(n); s.layers.forEach(k => layers.includes(k) || layers.push(k)); pins.push(...s.pins); }
        if (!layers.length && !pins.length) return id ? { external: BR.h.C(id) } : null;
        return { title: `Where to find ${mats.join(', ')}`, layers, pins, waygates: true, links: mgLinks(null, id) };
      }
      default: return null;
    }
  }

  let resolver = null;
  function resolve(fn) { resolver = typeof fn === 'function' ? fn : null; }
  function follow(hash) {
    const q = parse(hash);
    if (!q) return false;
    let o = lookup(q);
    if (!o && resolver) { try { o = resolver(q.spec, q); } catch (err) { if (typeof console !== 'undefined') console.error(err); o = null; } }
    if (!o) return false;
    if (o.external) {
      if (typeof window.open === 'function') window.open(o.external, '_blank', 'noopener');
      return true;
    }
    return open({ spec: q.spec, ...o });
  }

  // ---------- Full-screen viewer ----------
  // The map is a 1520 px "world" element moved with one CSS transform (translate + scale). Everything that must keep
  // its screen size sits in unscaled overlays redrawn on each animation frame: pins (buttons, translated in px), the
  // route and region (one SVG), and resource layers (one canvas: thousands of dots, culled to the screen).
  const S0 = 1520, KMAX = 4, HI_AT = 1.6, FOCUS_SPAN = 0.2;
  const LAYER_COLORS = ['#3ee6c1', '#ffb347', '#52d4ff', '#9be15d', '#ff7eb6', '#ffe066'];
  const NPC_COLORS = ['#b46bff', '#ff6b6b', '#d59bff'];
  let v = null, opener = null, srPrev = null, pendingBack = 0;
  const hasDOM = () => typeof document !== 'undefined' && !!document.body;
  const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const raf = fn => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(fn) : setTimeout(() => fn(Date.now()), 16));
  const caf = id => { if (!id) return; if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id); else clearTimeout(id); };
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  function layerList(layers) {
    const all = G().layers || {}, out = [];
    let ni = 0, ri = 0;
    for (const item of layers || []) {
      const key = typeof item === 'string' ? item : item && item.key;
      const src = typeof item === 'string' ? all[item] : item;
      if (!src || !Array.isArray(src.pts)) continue;
      const pts = src.pts.filter(isPt);
      if (!pts.length) continue;
      const npc = /^npc/.test(key || '');
      const f = new Float32Array(pts.length * 2);
      pts.forEach((p, i) => { const q = frac(p); f[2 * i] = q[0]; f[2 * i + 1] = q[1]; });
      out.push({ key, name: src.name || key || 'Layer', color: src.color || (npc ? NPC_COLORS[ni++ % NPC_COLORS.length] : LAYER_COLORS[ri++ % LAYER_COLORS.length]), f, n: pts.length, on: src.on !== false });
    }
    return out;
  }
  // [[x, z] | null, …] → walking segments (fractions); a null starts a new segment.
  function segments(path) {
    const segs = [];
    let cur = [];
    for (const p of path || []) {
      if (isPt(p)) cur.push(frac(p));
      else if (cur.length) { segs.push(cur); cur = []; }
    }
    if (cur.length) segs.push(cur);
    return segs;
  }

  function lock(on) {
    const el = document.documentElement;
    el.classList.toggle('map-lock', on);
  }
  function setHistory(spec) {
    if (v) v.spec = spec;
    if (typeof history === 'undefined' || !history.pushState) return;
    const url = spec ? location.pathname + location.search + href(spec) : null;
    const args = url ? [{ brMap: 1 }, '', url] : [{ brMap: 1 }, ''];
    try {
      if (history.state && history.state.brMap) history.replaceState(...args);
      else {
        if (srPrev == null && 'scrollRestoration' in history) { srPrev = history.scrollRestoration; history.scrollRestoration = 'manual'; }
        history.pushState(...args);
      }
    } catch {}
  }
  function restoreScrollMode() {
    if (srPrev != null && typeof history !== 'undefined') { try { history.scrollRestoration = srPrev; } catch {} }
    srPrev = null;
  }
  function stripHash() {
    if (typeof location === 'undefined' || !/^#map=/.test(location.hash)) return;
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch {}
  }

  function open(opts) {
    if (!hasDOM()) return false;
    const o = opts || {};
    if (v) teardown(); else opener = document.activeElement;
    if (BR.cards && typeof BR.cards.close === 'function') { try { BR.cards.close(); } catch {} }
    const g = G();
    const pins = (o.pins || []).filter(p => p && isPt(p.p)).map(p => ({ ...p, f: frac(p.p) }));
    const ways = (g.waygates || []).filter(isPt).map(p => ({ p, label: 'Waygate', kind: 'waygate', f: frac(p), way: true }));
    const layers = layerList(o.layers);
    const path = segments(o.path);
    const routeOk = path.reduce((n, s) => n + s.length, 0) >= 2;
    const rc = o.region ? regionCircle(o.region) : null;
    const showWays = !!o.waygates;

    const tog = (key, label, on, sw, count) => `<label class="mv-tog"><input type="checkbox" data-layer="${key}"${on ? ' checked' : ''}>${sw}<span>${esc(label)}</span>${count != null ? `<small class="mono">${count}</small>` : ''}</label>`;
    const toggles = (ways.length ? tog('way', 'Waygates', showWays, '<i class="sw sw-way"></i>') : '')
      + layers.map((L, i) => tog(i, L.name, L.on, `<i class="sw" style="--c:${esc(L.color)}"></i>`, L.n)).join('')
      + (routeOk ? tog('route', 'Route', true, '<i class="sw sw-route"></i>') : '');

    const root = document.createElement('div');
    root.className = 'map-viewer';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'mv-title');
    root.innerHTML = `<div class="mv-bar"><h2 class="mv-title" id="mv-title">${esc(o.title || 'Map')}</h2>`
      + `<div class="mv-tools">${toggles ? `<div class="mv-layers" role="group" aria-label="Show on map">${toggles}</div>` : ''}${o.links ? `<div class="mv-links">${o.links}</div>` : ''}</div>`
      + `<button type="button" class="mv-close" data-mv="close" aria-label="Close map">✕</button></div>`
      + `<div class="mv-stage" tabindex="0" role="application" aria-roledescription="map" aria-label="Map. Drag to pan; scroll, pinch, double-click or press + and − to zoom; arrow keys pan.">`
      + `<div class="mv-world"><img class="map-img" src="${IMG(S0)}" alt="" width="${S0}" height="${S0}" draggable="false" decoding="async"></div>`
      + `<canvas class="mv-dots" aria-hidden="true"></canvas><svg class="mv-svg" aria-hidden="true"></svg><div class="mv-pins"></div>`
      + `<div class="mv-pop" hidden></div>`
      + `<p class="map-note mv-note" role="status">Map image not downloaded.${o.links ? ' ' + o.links : ''}</p>`
      + `<div class="mv-zoom"><button type="button" data-mv="in" aria-label="Zoom in">+</button><button type="button" data-mv="out" aria-label="Zoom out">−</button><button type="button" data-mv="fit" aria-label="Fit the pins">⤢</button></div>`
      + `<p class="mv-credit">${CREDIT}</p></div>`;

    const $ = s => root.querySelector(s);
    const s = v = {
      root, stage: $('.mv-stage'), world: $('.mv-world'), img: $('.mv-world .map-img'), canvas: $('.mv-dots'), svg: $('.mv-svg'),
      pinBox: $('.mv-pins'), pop: $('.mv-pop'), popPin: null, popSize: [0, 0],
      pins: [], layers, path, route: routeOk, rc, focus: isPt(o.focus) ? frac(o.focus) : null,
      k: 1, tx: 0, ty: 0, W: 0, H: 0, kmin: 0.1, hi: false, frame: 0, anim: 0, moved: false, dead: false,
    };
    s.ctx = s.canvas.getContext && s.canvas.getContext('2d');
    if (missing) root.classList.add('map-missing');
    s.img.addEventListener('error', () => { if (/-1520\./.test(s.img.src)) root.classList.add('map-missing'); });

    // Pins: waygates under the rest, numbered stops on top.
    const rank = p => (p.way ? 0 : 1) + (p.n != null ? 2 : 0) + (kindOf(p) === 'you' ? 4 : 0);
    const frag = document.createDocumentFragment();
    for (const p of [...ways, ...pins].sort((a, b) => rank(a) - rank(b))) {
      const kind = kindOf(p);
      const b = document.createElement('button');
      b.type = 'button';
      const icon = p.icon && kind === 'boss' ? BR.h.ic(p.icon, 26, 'noinfo pin-ic') : '';
      const num = p.n != null && p.n !== '' ? `<b>${esc(p.n)}</b>` : '';
      b.className = `mv-pin pin pin-${kind}${icon ? ' has-ic' : ''}${num ? ' num' : ''}`;
      const label = (p.n != null && p.n !== '' ? p.n + '. ' : '') + (p.label || kind);
      b.setAttribute('aria-label', label);
      b.title = label;
      if (p.way || kind === 'node' || kind === 'drop') b.tabIndex = -1;
      b.innerHTML = icon + num;
      b.hidden = !!p.way && !showWays;
      b._pin = p;
      p.el = b;
      s.pins.push(p);
      frag.appendChild(b);
    }
    s.pinBox.appendChild(frag);

    // Route and region shapes, updated in place each frame.
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (cls, tag) => { const e = document.createElementNS(NS, tag); e.setAttribute('class', cls); s.svg.appendChild(e); return e; };
    s.regionEl = rc ? mk('mv-region', 'circle') : null;
    s.routeEls = routeOk ? {
      jumps: path.slice(1).map(() => mk('mv-jump', 'line')),
      bg: path.map(() => mk('mv-path-bg', 'polyline')),
      fg: path.map(() => mk('mv-path', 'polyline')),
    } : null;

    wire(s);
    document.body.appendChild(root);
    lock(true);
    setHistory(o.spec);
    measure(s);
    try { s.stage.focus({ preventScroll: true }); } catch {}
    return true;
  }

  function teardown() {
    const s = v;
    if (!s) return;
    s.dead = true;
    caf(s.frame); caf(s.anim);
    if (s.ro) s.ro.disconnect();
    window.removeEventListener('resize', s.onResize);
    s.root.remove();
    v = null;
  }
  function refocus() {
    const el = opener;
    opener = null;
    if (el && el.isConnected && typeof el.focus === 'function') { try { el.focus({ preventScroll: true }); } catch {} }
  }
  function close() {
    if (!v) return;
    teardown();
    lock(false);
    refocus();
    if (typeof history !== 'undefined' && history.state && history.state.brMap) { pendingBack++; history.back(); }
    else { stripHash(); restoreScrollMode(); }
  }

  // ----- View math (screen px relative to the stage) -----
  const clampK = (s, k) => clamp(k, s.kmin, Math.max(KMAX, s.kmin));
  function clampT(s, k, tx, ty) {
    const S = S0 * k;
    return [clamp(tx, s.W / 2 - S, s.W / 2), clamp(ty, s.H / 2 - S, s.H / 2)];
  }
  function setView(s, k, tx, ty) {
    s.k = clampK(s, k);
    [s.tx, s.ty] = clampT(s, s.k, tx, ty);
    schedule(s);
  }
  function animateTo(s, k, tx, ty) {
    caf(s.anim);
    k = clampK(s, k);
    [tx, ty] = clampT(s, k, tx, ty);
    if (reduced()) { setView(s, k, tx, ty); return; }
    const a = { k: s.k, tx: s.tx, ty: s.ty }, t0 = now(), DUR = 220;
    const step = () => {
      if (s.dead) return;
      const t = Math.min(1, (now() - t0) / DUR), e = 1 - Math.pow(1 - t, 3);
      s.k = a.k + (k - a.k) * e; s.tx = a.tx + (tx - a.tx) * e; s.ty = a.ty + (ty - a.ty) * e;
      render(s);
      s.anim = t < 1 ? raf(step) : 0;
    };
    s.anim = raf(step);
  }
  function zoomAt(s, p, f, animate) {
    const k = clampK(s, s.k * f), r = k / s.k;
    const tx = p.x - (p.x - s.tx) * r, ty = p.y - (p.y - s.ty) * r;
    if (animate) animateTo(s, k, tx, ty); else { caf(s.anim); setView(s, k, tx, ty); }
  }
  // The pins' bounding box (else the route, focus, layers or region; else the whole map), as fractions.
  function box(s) {
    const fs = [];
    if (s.focus) fs.push(s.focus);
    else {
      s.pins.forEach(p => { if (!p.way) fs.push(p.f); });
      s.path.forEach(seg => fs.push(...seg));
      if (!fs.length) s.layers.forEach(L => { for (let i = 0; i < L.f.length; i += 2) fs.push([L.f[i], L.f[i + 1]]); });
      if (s.rc) fs.push([s.rc.f[0] - s.rc.r, s.rc.f[1] - s.rc.r], [s.rc.f[0] + s.rc.r, s.rc.f[1] + s.rc.r]);
    }
    if (!fs.length) return [0, 0, 1, 1];
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of fs) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return [x0, y0, x1, y1];
  }
  function fit(s, animate) {
    const [x0, y0, x1, y1] = box(s);
    const pad = Math.min(64, Math.min(s.W, s.H) * 0.12);
    const span = s.focus ? FOCUS_SPAN : 0.06;
    const bw = Math.max(x1 - x0, span) * S0, bh = Math.max(y1 - y0, span) * S0;
    const k = clampK(s, Math.min((s.W - 2 * pad) / bw, (s.H - 2 * pad) / bh));
    const cx = (x0 + x1) / 2 * S0, cy = (y0 + y1) / 2 * S0;
    const args = [s, k, s.W / 2 - cx * k, s.H / 2 - cy * k];
    if (animate) animateTo(...args); else setView(...args);
  }
  function measure(s) {
    if (s.dead) return;
    const r = s.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const first = !s.W;
    const centre = first ? null : [(s.W / 2 - s.tx) / s.k, (s.H / 2 - s.ty) / s.k];
    s.W = r.width; s.H = r.height;
    s.kmin = Math.min(s.W, s.H) / S0 * 0.8;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    s.canvas.width = Math.round(s.W * dpr); s.canvas.height = Math.round(s.H * dpr);
    s.canvas.style.width = s.W + 'px'; s.canvas.style.height = s.H + 'px';
    if (s.ctx) s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (first) fit(s, false);
    else setView(s, s.k, s.W / 2 - centre[0] * s.k, s.H / 2 - centre[1] * s.k);
  }
  function schedule(s) { if (!s.frame && !s.dead) s.frame = raf(() => { s.frame = 0; render(s); }); }

  function render(s) {
    if (s.dead) return;
    const { k, tx, ty, W, H } = s, S = S0 * k;
    s.world.style.transform = `translate(${tx}px,${ty}px) scale(${k})`;
    const X = f => tx + f[0] * S, Y = f => ty + f[1] * S;
    for (const p of s.pins) {
      if (p.el.hidden) continue;
      p.el.style.transform = `translate(${X(p.f).toFixed(1)}px,${Y(p.f).toFixed(1)}px) translate(-50%,-50%)`;
    }
    // Resource layers.
    const c = s.ctx;
    if (c) {
      c.clearRect(0, 0, W, H);
      const r = k > 1.5 ? 4.5 : 3.5, TAU = Math.PI * 2;
      for (const L of s.layers) {
        if (!L.on) continue;
        c.beginPath();
        const a = L.f;
        for (let i = 0; i < a.length; i += 2) {
          const x = tx + a[i] * S, y = ty + a[i + 1] * S;
          if (x < -r || y < -r || x > W + r || y > H + r) continue;
          c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU);
        }
        c.fillStyle = L.color; c.fill();
        c.lineWidth = 1.25; c.strokeStyle = 'rgba(10,8,12,.75)'; c.stroke();
      }
    }
    // Region and route.
    if (s.regionEl) {
      s.regionEl.setAttribute('cx', X(s.rc.f).toFixed(1)); s.regionEl.setAttribute('cy', Y(s.rc.f).toFixed(1));
      s.regionEl.setAttribute('r', (s.rc.r * S).toFixed(1));
    }
    if (s.routeEls) {
      const pts = seg => seg.map(f => X(f).toFixed(1) + ',' + Y(f).toFixed(1)).join(' ');
      s.path.forEach((seg, i) => {
        const str = pts(seg);
        s.routeEls.bg[i].setAttribute('points', str); s.routeEls.fg[i].setAttribute('points', str);
        if (i) {
          const a = s.path[i - 1][s.path[i - 1].length - 1], b = seg[0], ln = s.routeEls.jumps[i - 1];
          ln.setAttribute('x1', X(a).toFixed(1)); ln.setAttribute('y1', Y(a).toFixed(1));
          ln.setAttribute('x2', X(b).toFixed(1)); ln.setAttribute('y2', Y(b).toFixed(1));
        }
      });
      s.svg.classList.toggle('no-route', !s.route);
    }
    // The open popup follows its pin, kept on screen.
    if (s.popPin) {
      const [pw, ph] = s.popSize, x = X(s.popPin.f), y = Y(s.popPin.f);
      let py = y - ph - 22;
      if (py < 8) py = y + 22;
      s.pop.style.transform = `translate(${clamp(x - pw / 2, 8, Math.max(8, W - pw - 8)).toFixed(1)}px,${clamp(py, 8, Math.max(8, H - ph - 8)).toFixed(1)}px)`;
    }
    // Sharper art when zoomed in.
    if (!s.hi && !hiFailed && k * Math.min(window.devicePixelRatio || 1, 2) > HI_AT && typeof Image === 'function') {
      s.hi = true;
      const im = new Image();
      im.onload = () => { if (!s.dead) s.img.src = im.src; };
      im.onerror = () => { hiFailed = true; };
      im.src = IMG(3040);
    }
  }

  function showPop(s, p) {
    s.pins.forEach(q => q.el.classList.toggle('sel', q === p));
    const kind = kindOf(p);
    const jump = p.jump === false ? null : p.jump != null ? p.jump : kind === 'boss' ? p.label : null;
    const info = p.info === false || kind === 'waygate' || kind === 'you' ? null : p.info || p.icon || (kind === 'boss' || kind === 'place' ? p.label : null);
    const num = p.n != null && p.n !== '' ? `<span class="mv-pop-n">${esc(p.n)}</span>` : '';
    const acts = (jump ? `<button type="button" class="btn small primary" data-jump="${esc(jump)}">Show in phase</button>` : '')
      + (info ? `<button type="button" class="btn small" data-info="${esc(info)}">Details</button>` : '');
    s.pop.innerHTML = `<b>${num}${esc(p.label || 'Waygate')}</b>${p.note ? `<small>${esc(p.note)}</small>` : ''}${acts ? `<span class="mv-pop-act">${acts}</span>` : ''}`;
    s.pop.setAttribute('aria-label', p.label || kind);
    s.pop.hidden = false;
    s.popPin = p;
    s.popSize = [s.pop.offsetWidth, s.pop.offsetHeight];
    render(s);
  }
  function hidePop(s) {
    if (!s.popPin) return;
    s.popPin.el.classList.remove('sel');
    s.popPin = null;
    s.pop.hidden = true;
  }

  // ----- Input -----
  function wire(s) {
    const { root, stage } = s;
    const pos = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const centre = () => ({ x: s.W / 2, y: s.H / 2 });

    root.addEventListener('click', e => {
      const t = e.target;
      const act = t.closest('[data-mv]');
      if (act) {
        const a = act.dataset.mv;
        if (a === 'close') close();
        else if (a === 'in') zoomAt(s, centre(), 1.6, true);
        else if (a === 'out') zoomAt(s, centre(), 1 / 1.6, true);
        else if (a === 'fit') fit(s, true);
        return;
      }
      // "Show in phase": close, and let the click bubble on to the app's [data-jump] handler.
      if (t.closest('[data-jump]')) { close(); return; }
      const pin = t.closest('.mv-pin');
      if (pin && pin._pin) { if (s.popPin === pin._pin) hidePop(s); else showPop(s, pin._pin); return; }
      if (!t.closest('.mv-pop') && t.closest('.mv-stage')) hidePop(s);
    });
    // A drag ends without a click.
    stage.addEventListener('click', e => { if (s.moved && e.detail !== 0) { e.stopPropagation(); e.preventDefault(); s.moved = false; } }, true);
    // Focus never scrolls the stage; a pin tabbed to off screen is brought into view instead.
    stage.addEventListener('scroll', () => { stage.scrollTop = 0; stage.scrollLeft = 0; });
    stage.addEventListener('focusin', e => {
      const p = e.target._pin;
      if (!p) return;
      const S = S0 * s.k, x = s.tx + p.f[0] * S, y = s.ty + p.f[1] * S;
      if (x < 40 || y < 40 || x > s.W - 40 || y > s.H - 40) animateTo(s, s.k, s.W / 2 - p.f[0] * S, s.H / 2 - p.f[1] * S);
    });

    root.addEventListener('change', e => {
      const key = e.target.dataset && e.target.dataset.layer;
      if (key == null) return;
      const on = e.target.checked;
      if (key === 'way') s.pins.forEach(p => { if (p.way) { p.el.hidden = !on; if (!on && s.popPin === p) hidePop(s); } });
      else if (key === 'route') s.route = on;
      else if (s.layers[+key]) s.layers[+key].on = on;
      schedule(s);
    });

    const ptrs = new Map();
    let drag = null, pinch = null;
    const startPinch = () => {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, m: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, k: s.k, tx: s.tx, ty: s.ty };
      drag = null; s.moved = true;
    };
    stage.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('.mv-pop, .mv-zoom')) return;
      caf(s.anim);
      ptrs.set(e.pointerId, pos(e));
      if (ptrs.size === 1) { s.moved = false; const p = pos(e); drag = { id: e.pointerId, x: p.x, y: p.y, tx: s.tx, ty: s.ty, on: false }; }
      else if (ptrs.size === 2) { startPinch(); [...ptrs.keys()].forEach(id => { try { stage.setPointerCapture(id); } catch {} }); }
    });
    stage.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, pos(e));
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const k = clampK(s, pinch.k * d / pinch.d);
        const wx = (pinch.m.x - pinch.tx) / pinch.k, wy = (pinch.m.y - pinch.ty) / pinch.k;
        setView(s, k, m.x - wx * k, m.y - wy * k);
        return;
      }
      if (drag && drag.id === e.pointerId) {
        const p = ptrs.get(e.pointerId), dx = p.x - drag.x, dy = p.y - drag.y;
        if (!drag.on && Math.hypot(dx, dy) > 4) {
          drag.on = true; s.moved = true; stage.classList.add('dragging');
          try { stage.setPointerCapture(e.pointerId); } catch {}
        }
        if (drag.on) setView(s, s.k, drag.tx + dx, drag.ty + dy);
      }
    });
    const up = e => {
      if (!ptrs.delete(e.pointerId)) return;
      if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 1) { const [[id, p]] = [...ptrs]; drag = { id, x: p.x, y: p.y, tx: s.tx, ty: s.ty, on: true }; }
      else if (!ptrs.size) { drag = null; stage.classList.remove('dragging'); }
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
    stage.addEventListener('lostpointercapture', e => { if (ptrs.has(e.pointerId) && e.pointerType !== 'touch') up(e); });

    stage.addEventListener('wheel', e => {
      e.preventDefault();
      caf(s.anim);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? s.H : 1;
      zoomAt(s, pos(e), Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0015)), false);
    }, { passive: false });
    stage.addEventListener('dblclick', e => {
      if (e.target.closest('.mv-pin, .mv-pop, .mv-zoom')) return;
      e.preventDefault();
      zoomAt(s, pos(e), e.shiftKey ? 0.5 : 2, true);
    });

    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); if (s.popPin) hidePop(s); else close(); return; }
      if (e.key === 'Tab') { trap(root, e); return; }
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const step = 90;
      switch (e.key) {
        case '+': case '=': zoomAt(s, centre(), 1.5, true); break;
        case '-': case '_': zoomAt(s, centre(), 1 / 1.5, true); break;
        case '0': fit(s, true); break;
        case 'ArrowLeft': animateTo(s, s.k, s.tx + step, s.ty); break;
        case 'ArrowRight': animateTo(s, s.k, s.tx - step, s.ty); break;
        case 'ArrowUp': animateTo(s, s.k, s.tx, s.ty + step); break;
        case 'ArrowDown': animateTo(s, s.k, s.tx, s.ty - step); break;
        default: return;
      }
      e.preventDefault();
    });

    s.onResize = () => measure(s);
    if (typeof ResizeObserver === 'function') { s.ro = new ResizeObserver(s.onResize); s.ro.observe(stage); }
    else window.addEventListener('resize', s.onResize);
  }
  // Keep Tab inside the dialog.
  function trap(root, e) {
    const list = [...root.querySelectorAll('button, input, a[href], [tabindex="0"]')]
      .filter(el => !el.disabled && el.tabIndex >= 0 && !el.closest('[hidden]') && el.getClientRects().length);
    if (!list.length) return;
    const first = list[0], last = list[list.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || !root.contains(at))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (at === last || !root.contains(at))) { e.preventDefault(); first.focus(); }
  }

  // ---------- Page wiring (browser only) ----------
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    // A missing map image: show the note instead of an empty frame, and report ready() = false from then on.
    document.addEventListener('error', e => {
      const t = e.target;
      if (!t || !t.classList || !t.classList.contains('map-img')) return;
      if (/-760\./.test(t.getAttribute('src') || '')) missing = true;
      const box = t.closest('.map-mini');
      if (box) box.classList.add('map-missing');
    }, true);
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href^="#map="]');
      if (a && follow(a.getAttribute('href'))) e.preventDefault();
    });
    window.addEventListener('popstate', e => {
      const mine = e.state && e.state.brMap;
      // Our own history.back() from close(); a viewer opened since then needs its entry back.
      if (pendingBack) {
        pendingBack--;
        if (!mine) { stripHash(); if (v) setHistory(v.spec); else restoreScrollMode(); }
        return;
      }
      if (mine) return;
      if (v) { teardown(); lock(false); refocus(); }
      stripHash();
      restoreScrollMode();
    });
    window.addEventListener('hashchange', () => { if (!v && /^#map=/.test(location.hash)) follow(location.hash); });
  }

  BR.map = { ready, mini, open, close, href, resolve, follow, parse, lookup, frac };
})();
