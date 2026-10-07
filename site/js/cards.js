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
// Route strings that are HTML (take, where, craft/step text, resources how, info.*, rot.why) are trusted; game text
// and names are escaped.
(() => {
  'use strict';
  const BR = window.BR;

  // init({ def, context(el) → { phase, view, build }, onJump?(bossName, ctx) }): delegated listeners on document (hover,
  //   focus, click/tap to pin, long-press on touch, Esc). Call once per page; calling again swaps the options.
  //   Any element with data-info="<name>" opens a card (BR.h.ic adds it to icons). Inside the card, [data-jump] calls
  //   onJump (or, without it, bubbles to the app's own [data-jump] handler) and '#map=' links close the card.
  // render(name, ctx) → HTML for the card. ctx = { def, phase?, view?, build? }; phase may be the phase object, its id
  //   or its number; reads window.BR_GAME and BR.lex.
  // howToGet(name, ctx) → HTML: recipe inputs with their sources and map links, station, unlocking boss, research cost,
  //   base item, Gear Level gates; or drop sources.
  // timeline(def) → { [name]: { first: { phase, at, how, boss? }, last?: phase, slot?, replaced?: { phase, by, boss?, how,
  //   slot }, left?: phase } }. first.phase is the first loadout it's in, first.at the phase it's obtained; how is 'boss' |
  //   'craft' | 'step' | 'start' | 'loadout'; boss = { name, lv, phase }. left = the phase it drops out with no
  //   replacement. Rewards that never reach a loadout only have first.
  // close() closes the open card.

  // ---------- Small helpers ----------
  const H = () => BR.h;
  const G = () => (window.BR_GAME && typeof window.BR_GAME === 'object' ? window.BR_GAME : {});
  const LD = () => BR.lexData || {};
  const LX = () => BR.lex || {};
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const arr = x => (Array.isArray(x) ? x : []);
  const str = x => (typeof x === 'string' ? x : typeof x === 'number' && Number.isFinite(x) ? String(x) : '');
  const num = x => {
    const v = typeof x === 'number' ? x : typeof x === 'string' && x.trim() ? Number(x) : NaN;
    return Number.isFinite(v) ? v : null;
  };
  const fmt = x => { const v = num(x); return v === null ? '' : String(Math.round(v * 10) / 10); };
  const pct = x => { const v = num(x); return v === null ? '' : `${Math.round(v * 1000) / 10}%`; };
  const esc = s => H().esc(str(s));
  const txt = s => esc(s).replace(/\n/g, '<br>');
  const html = s => str(s);
  const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
  const plain = s => str(s).replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (m, e) => ENT[e]);
  const lc = s => str(s).toLowerCase();
  const display = n => H().display(str(n));
  const short = n => str(n).replace(/^(General|Sir|Lord) /, '').split(' the ')[0];
  const own = (o, k) => (o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
  const ic = (n, size, cls = '') => H().ic(str(n), size, cls);
  const isPt = p => Array.isArray(p) && p.length >= 2 && num(p[0]) !== null && num(p[1]) !== null;
  const uniq = list => [...new Set(list)];
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const cap = s => str(s).charAt(0).toUpperCase() + str(s).slice(1);
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

  // A game-data entry by name: exact, then the display name, then ignoring case.
  const lowIdx = new WeakMap();
  function lookup(map, name) {
    if (!map || typeof map !== 'object') return undefined;
    const n = str(name);
    if (!n) return undefined;
    const v = own(map, n) ?? own(map, display(n));
    if (v !== undefined) return v;
    let idx = lowIdx.get(map);
    if (!idx) {
      idx = new Map();
      for (const k of Object.keys(map)) if (!idx.has(k.toLowerCase())) idx.set(k.toLowerCase(), map[k]);
      lowIdx.set(map, idx);
    }
    return idx.get(n.toLowerCase()) ?? idx.get(display(n).toLowerCase());
  }
  const objAt = (map, n) => { const v = lookup(map, n); return isObj(v) ? v : null; };
  const gItem = n => objAt(G().items, n);
  const gAb = n => objAt(G().abilities, n);
  const gNpc = n => objAt(G().npcs, n);
  const gMat = n => objAt(G().mats, n);
  const gStation = n => objAt(G().stations, n);
  const gBlood = n => objAt(G().blood, n);
  const gSet = n => objAt(G().sets, n);
  const gJewels = n => { const v = lookup(G().jewels, n); return Array.isArray(v) && v.length ? v : null; };
  const gRolls = () => (Array.isArray(G().rolls) && G().rolls.length ? G().rolls : arr(LD().ROLL_POOL));
  const gLayerPts = id => { const l = own(G().layers, id); return isObj(l) ? arr(l.pts).filter(isPt) : []; };
  const lxMat = n => objAt(LD().MATERIALS, n) || {};
  const lxPlace = n => objAt(LD().PLACES, n);
  const lxBoss = n => objAt(LD().VBLOOD, n) || {};
  const kindOf = n => { try { return typeof LX().kindOf === 'function' ? LX().kindOf(n) : 'unknown'; } catch { return 'unknown'; } };

  // ---------- Maps (js/map.js, called defensively) ----------
  function mapReady() { try { return !!(BR.map && typeof BR.map.ready === 'function' && BR.map.ready()); } catch { return false; } }
  function mini(opts) {
    try { const h = BR.map && typeof BR.map.mini === 'function' ? BR.map.mini(opts) : ''; return typeof h === 'string' ? h : ''; } catch { return ''; }
  }
  function mapHref(spec) {
    try { if (BR.map && typeof BR.map.href === 'function') return BR.map.href(spec); } catch {}
    return '#map=' + encodeURIComponent(spec);
  }
  const mgLink = href => `<a class="btn small brc-mg" href="${esc(href)}" target="_blank" rel="noopener">Map Genie ↗</a>`;
  // The card's map (js/map.js adds the in-app "Open map" link for `spec`) plus the card's own links.
  function mapBlock(opts, spec, links = []) {
    const m = opts && arr(opts.pins).length + (opts.region ? 1 : 0) + (isPt(opts.focus) ? 1 : 0) ? mini({ ...opts, spec }) : '';
    const all = links.filter(Boolean);
    return (m ? `<div class="brc-map">${m}</div>` : '') + (all.length ? `<div class="brc-links">${all.join('')}</div>` : '');
  }
  const idsOf = v => (Array.isArray(v) ? v.map(str) : str(v).split(/[\s,]+/)).filter(Boolean);
  // A place's points (several for places like the two merchant camps), else its one position.
  const placePts = pl => { const pts = arr(pl && pl.pts).filter(isPt); return pts.length ? pts : pl && isPt(pl.pos) ? [pl.pos] : []; };
  function bossPins(name, n) {
    const npc = gNpc(name), vb = lxBoss(name);
    let pts = arr(npc && npc.spawns).filter(isPt);
    if (!pts.length && isPt(vb.pos)) pts = [vb.pos];
    return pts.map(p => ({ p, label: name, kind: 'boss', icon: name, ...(n ? { n } : {}) }));
  }
  // A material's map points: its node layers (or the raw material's), its place, and its drop sources' spawns.
  function matPins(name) {
    const out = [], gm = gMat(name), lm = lxMat(name);
    const ids = uniq([...arr(gm && gm.layers).map(str), ...idsOf(lm.layer)].filter(Boolean));
    ids.forEach(id => gLayerPts(id).forEach(p => out.push({ p, label: name, kind: id.startsWith('npc:') ? 'drop' : 'node' })));
    if (!out.length) {
      const raw = str(lm.raw) || str(gm && gm.via);
      if (raw && raw !== name) { const r = gMat(raw); arr(r && r.layers).forEach(id => gLayerPts(str(id)).forEach(p => out.push({ p, label: raw, kind: 'node' }))); }
    }
    placePts(str(lm.place) && lxPlace(lm.place)).forEach(p => out.push({ p, label: str(lm.place), kind: 'place' }));
    const gi = gItem(name);
    if (!out.length) arr(gi && gi.drops).filter(isObj).slice(0, 3).forEach(d => gLayerPts(str(d.layer)).forEach(p => out.push({ p, label: str(d.name), kind: 'drop' })));
    return out;
  }
  function matLinks(m, existing = '') {
    const out = [], lm = lxMat(m);
    if (mapReady() && matPins(m).length) out.push(`<a class="brc-pin" href="${esc(mapHref('mat:' + m))}" aria-label="Show where to find ${esc(m)} on the map">📍</a>`);
    if (!/mapgenie\.io/.test(existing)) {
      if (str(lm.mg)) out.push(`<a class="brc-mg" href="${esc(H().C(str(lm.mg)))}" target="_blank" rel="noopener">Map Genie ↗</a>`);
      else { const pl = str(lm.place) && lxPlace(lm.place); if (pl && str(pl.mg)) out.push(`<a class="brc-mg" href="${esc(H().M(str(pl.mg)))}" target="_blank" rel="noopener">Map Genie ↗</a>`); }
    }
    return out.join(' ');
  }

  // ---------- The route, indexed ----------
  const splitOr = s => str(s).split(/\s+or\s+/).map(t => t.trim()).filter(t => t && t !== '—');
  const pushTo = (m, k, v) => { if (!k) return; const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
  function loadoutNames(l) {
    if (!isObj(l)) return [];
    const out = [];
    for (const key of ['slots', 'spells', 'gear', 'blood']) arr(l[key]).forEach(s => out.push(...splitOr(s)));
    for (const key of ['weapon', 'elixir']) if (str(l[key])) out.push(str(l[key]));
    const rot = isObj(l.rot) ? l.rot : null;
    if (rot) {
      arr(rot.pre).forEach(s => out.push(str(s)));
      arr(rot.order).forEach(o => out.push(typeof o === 'string' ? o : isObj(o) ? str(o.n) : ''));
      arr(rot.fill).forEach(s => out.push(str(s)));
    }
    if (isObj(l.jewels)) out.push(...Object.keys(l.jewels));
    return uniq(out.filter(Boolean));
  }
  const EMPTY = { phases: [], rewards: new Map(), crafts: new Map(), steps: new Map(), bosses: new Map(), names: new Set(), cands: [], lastLoadout: 0 };
  const routeIdx = new WeakMap();
  function R(def) {
    if (!isObj(def)) return EMPTY;
    let x = routeIdx.get(def);
    if (x) return x;
    x = { phases: arr(def.phases).map(p => (isObj(p) ? p : {})), rewards: new Map(), crafts: new Map(), steps: new Map(), bosses: new Map(), names: new Set(), longer: new Map(), lastLoadout: 0 };
    x.phases.forEach((p, i) => {
      const n = i + 1;
      arr(p.bosses).filter(isObj).forEach(b => {
        const nm = str(b.name);
        if (nm && !x.bosses.has(nm)) x.bosses.set(nm, { b, phase: n });
        arr(b.gets).map(str).filter(Boolean).forEach(g => { pushTo(x.rewards, g, { phase: n, boss: b }); x.names.add(g); });
      });
      arr(p.craft).filter(isObj).forEach(r => { const k = str(r.ic); pushTo(x.crafts, k, { phase: n, t: str(r.t) }); if (k) x.names.add(k); });
      arr(p.steps).filter(isObj).forEach(r => { const k = str(r.ic); pushTo(x.steps, k, { phase: n, t: str(r.t) }); if (k) x.names.add(k); });
      arr(p.access).forEach(a => { if (Array.isArray(a) && str(a[0])) x.names.add(str(a[0])); });
      if (isObj(p.loadout)) { x.lastLoadout = n; loadoutNames(p.loadout).forEach(k => x.names.add(k)); }
    });
    for (const k of Object.keys(isObj(def.resources) ? def.resources : {})) x.names.add(k);
    for (const k of Object.keys(isObj(def.needs) ? def.needs : {})) x.names.add(k);
    // Recipe text can name any route name or lexicon material.
    x.cands = uniq([...x.names, ...Object.keys(isObj(LD().MATERIALS) ? LD().MATERIALS : {})]).filter(k => k.length > 2).sort((a, b) => b.length - a.length);
    routeIdx.set(def, x);
    return x;
  }
  const bossRef = (b, phase) => ({ name: str(b && b.name), lv: num(b && b.lv), phase });
  function phaseNo(def, phase) {
    if (!phase) return 0;
    const ps = R(def).phases;
    let i = ps.indexOf(phase);
    if (i < 0 && phase.id) i = ps.findIndex(p => p.id === phase.id);
    return i >= 0 ? i + 1 : num(phase.n) || 0;
  }
  // Same defaults as js/view.js when a phase has no stage of its own.
  const STAGE_BY_PHASE = ['Beginning', 'Beginning', 'Early', 'Early', 'Mid', 'Mid', 'Late', 'End'];
  function stageOf(def, n) {
    const p = R(def).phases[n - 1];
    if (!p) return '';
    const s = str(p.stage) || (R(def).phases.length === 8 ? STAGE_BY_PHASE[n - 1] : '');
    return s ? str(own(LX().STAGES, s)) || s : '';
  }
  function phLabel(def, n, title = true) {
    if (!n) return '';
    const p = R(def).phases[n - 1];
    const st = stageOf(def, n);
    return `Phase ${n}${title && p && str(p.title) ? ` · ${esc(p.title)}` : ''}${st ? ` · ${esc(st)}` : ''}`;
  }

  // Whole-word (optionally plural) matches of a name in plain text.
  const reCache = new Map();
  function nameRe(n) {
    let re = reCache.get(n);
    if (!re) { re = new RegExp(`(^|[^A-Za-z0-9'’])(${reEsc(n)}(?:e?s)?)(?![A-Za-z0-9])`, 'g'); reCache.set(n, re); }
    return re;
  }
  function findName(text, n) {
    if (!n) return null;
    const re = nameRe(n);
    re.lastIndex = 0;
    const m = re.exec(text);
    return m ? { i: m.index + m[1].length, len: m[2].length } : null;
  }
  // findName, ignoring longer route names that contain it ("Iron Crossbow" inside "Merciless Iron Crossbow").
  // Masking keeps the text's length, so indexes still point into the original.
  function findIn(text, n, def) {
    const x = R(def);
    let longer = x.longer && x.longer.get(n);
    if (!longer) { longer = arr(x.cands).filter(k => k.length > n.length && k.includes(n)); if (x.longer) x.longer.set(n, longer); }
    let t = str(text);
    for (const k of longer) t = t.replace(nameRe(k), (m, pre, w) => pre + ' '.repeat(w.length));
    return findName(t, n);
  }
  // Route rows that mention a name: steps, crafts, boss takes and spots, access notes and tips.
  function mentions(n, def) {
    const out = [];
    R(def).phases.forEach((p, i) => {
      const phase = i + 1;
      const scan = (kind, t, icn) => { if (str(t) && findIn(plain(t), n, def)) out.push({ phase, kind, t: str(t), ic: str(icn) }); };
      arr(p.steps).filter(isObj).forEach(r => scan('step', r.t, r.ic));
      arr(p.craft).filter(isObj).forEach(r => scan('craft', r.t, r.ic));
      arr(p.bosses).filter(isObj).forEach(b => { scan('boss', b.take, b.name); scan('where', b.where, b.name); });
      arr(p.access).forEach(a => Array.isArray(a) && scan('access', a[1], a[0]));
      arr(p.notes).forEach(t => scan('note', t));
    });
    return out;
  }

  // ---------- Recipes from route text (when the game data has none) ----------
  const RESEARCH = { 'Research Desk': ['Paper', 'Paper', 60, 50], Study: ['Scroll', 'Scrolls', 90, 75], Athenaeum: ['Schematic', 'Schematics', 120, 100] };
  // The recipe sentence after a name: its first parenthetical (station, research, effects, GL) and the text up to the
  // end of the sentence. strict: the name must be in the text.
  function segment(t, n, strict, def) {
    const p = plain(t);
    const f = findIn(p, n, def);
    if (!f && strict) return null;
    const rest = f ? p.slice(f.i + f.len) : p;
    const end = rest.search(/\.(\s|$)/);
    const text = end >= 0 ? rest.slice(0, end) : rest;
    const par = (f ? /^\s*\(([^)]*)\)/ : /\(([^)]*)\)/).exec(text);
    const bits = par ? par[1].split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
    const stations = arr(LX().STATIONS);
    const gl = /\bGL (\d+)\b/.exec(bits.join(' '));
    return {
      text,
      station: bits.find(b => stations.includes(b) && !RESEARCH[b]) || '',
      research: bits.find(b => RESEARCH[b]) || '',
      effect: bits.filter(b => /^[+−-]\s?\d/.test(b)).join(', '),
      gl: gl ? +gl[1] : null,
    };
  }
  // Inputs named in recipe text: a route name with a quantity in front ("12 Iron Ingot") or joined by "+".
  function findInputs(text, self, def) {
    let work = text;
    const found = [];
    for (const k of R(def).cands) {
      if (k === self) continue;
      const re = nameRe(k);
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(work))) {
        const s = m.index + m[1].length, e = s + m[2].length;
        const before = text.slice(Math.max(0, s - 14), s), after = text.slice(e, e + 4);
        const q = /(\d[\d,]*)\s*$/.exec(before);
        if (q || /\+\s*$/.test(before) || /^\s*\+/.test(after)) found.push({ n: k, q: q ? Number(q[1].replace(/,/g, '')) : null, at: s });
        work = work.slice(0, s) + ' '.repeat(e - s) + work.slice(e);
        re.lastIndex = e;
      }
    }
    const seen = new Set();
    return found.sort((a, b) => a.at - b.at).filter(f => !seen.has(f.n) && seen.add(f.n));
  }
  function parseRecipe(n, def) {
    const x = R(def);
    const tries = [...(x.crafts.get(n) || []).map(r => [r.t, false]), ...(x.steps.get(n) || []).map(r => [r.t, true]),
      ...(x.rewards.get(n) || []).map(r => [str(r.boss.take), true])];
    for (const [t, strict] of tries) {
      const seg = segment(t, n, strict, def);
      if (!seg) continue;
      const inputs = findInputs(seg.text, n, def);
      if (inputs.length) return { ...seg, inputs, t };
    }
    return null;
  }
  // Research stations whose route row names this item ("Spend Scrolls at the Study on Dark Magus, …").
  function researchMentions(n, def) {
    const out = [];
    const x = R(def);
    for (const st of Object.keys(RESEARCH)) [...(x.crafts.get(st) || []), ...(x.steps.get(st) || [])].forEach(r => { if (findIn(plain(r.t), n, def)) out.push(st); });
    return out;
  }

  // ---------- How a name is obtained, and when ----------
  function unlockBoss(n, def, maxPhase) {
    const x = R(def), gi = gItem(n);
    const recipe = gi && isObj(gi.recipe) ? gi.recipe : null;
    for (const u of arr(recipe && recipe.unlock).map(str)) { const e = x.bosses.get(u); if (e) return bossRef(e.b, e.phase); }
    const cr = (x.crafts.get(n) || [])[0];
    const st = str(recipe && recipe.station) || (cr ? segment(cr.t, n, false, def).station : '');
    if (st) { const r = (x.rewards.get(st) || [])[0]; if (r && (!maxPhase || r.phase <= maxPhase)) return bossRef(r.boss, r.phase); }
    return null;
  }
  // → { phase, how: 'boss' | 'craft' | 'step' | 'start', boss?, craft?: phase } or null.
  function acquire(name, def) {
    const n = str(name), x = R(def);
    if (n === 'Starting dash') return { phase: 1, how: 'start' };
    const c = [];
    const rw = (x.rewards.get(n) || [])[0], cr = (x.crafts.get(n) || [])[0], st = (x.steps.get(n) || [])[0];
    if (rw) c.push({ phase: rw.phase, how: 'boss', boss: bossRef(rw.boss, rw.phase), r: 0 });
    if (cr) c.push({ phase: cr.phase, how: 'craft', r: 1 });
    if (st) c.push({ phase: st.phase, how: /from the start/i.test(plain(st.t)) ? 'start' : 'step', r: 2 });
    if (!c.length) {
      // Only a mention in route text: trust it unless the name is already in an earlier loadout.
      const m = mentions(n, def).find(v => v.kind === 'craft' || v.kind === 'step');
      const worn = x.phases.findIndex(p => isObj(p.loadout) && loadoutNames(p.loadout).includes(n)) + 1;
      return m && !(worn && worn < m.phase) ? { phase: m.phase, how: m.kind } : null;
    }
    c.sort((a, b) => a.phase - b.phase || a.r - b.r);
    const best = c[0];
    delete best.r;
    if (!best.boss && best.how !== 'start') { const ub = unlockBoss(n, def, best.phase); if (ub) best.boss = ub; }
    if (cr) best.craft = cr.phase;
    return best;
  }

  // Loadout categories: what takes an item's place. Spells share one category, so swapping slots isn't a replacement.
  const SLOT_CAT = ['veil', 'spells', 'spells', 'ult'];
  const ARMOR_PART = [[/Leggings$/, 'legs'], [/Gloves$/, 'hands'], [/Boots$/, 'feet'], [/^Shroud of /, 'cloak']];
  const CAT_LABEL = { veil: 'Veil', spells: 'Spell', ult: 'Ultimate', weapon: 'Weapon', 'armor:chest': 'Chest armour', 'armor:legs': 'Leggings',
    'armor:hands': 'Gloves', 'armor:feet': 'Boots', 'armor:cloak': 'Cloak', jewelry: 'Magic source', jewel: 'Jewels', elixir: 'Elixir',
    coating: 'Weapon coating', brew: 'Brew or potion', blood: 'Blood', 'passive:elemental': 'Elemental passive', 'passive:vampire': 'Vampire passive' };
  function catOf(n) {
    const k = kindOf(n);
    if (k === 'armor') { const p = ARMOR_PART.find(([re]) => re.test(n)); return 'armor:' + (p ? p[1] : 'chest'); }
    if (k === 'consumable') return /(^| )(Brew|Potion)( |$)/.test(n) && !/Resistance|Blood Rose/.test(n) ? 'brew' : 'consumable:' + n;
    if (k === 'passive') return 'passive:' + (arr((LX().PASSIVES || {}).vampire).includes(n) ? 'vampire' : 'elemental');
    if (['weapon', 'jewelry', 'jewel', 'elixir', 'coating', 'blood'].includes(k)) return k;
    return k + ':' + n;
  }
  // A loadout as one or more states ({ category: [names] }); "X or Y" slots swap X for Y within the phase.
  function loadoutStates(l) {
    const slots = arr(l.slots).map(splitOr);
    const gear = {};
    arr(l.gear).forEach(g => splitOr(g).forEach(n => { const c = catOf(n); (gear[c] = gear[c] || []).push(n); }));
    const steps = Math.max(1, ...slots.map(o => o.length));
    const out = [];
    for (let k = 0; k < steps; k++) {
      const st = {};
      for (const [c, list] of Object.entries(gear)) st[c] = list.slice();
      slots.forEach((opts, i) => {
        if (!opts.length) return;
        const c = SLOT_CAT[i] || 'spells';
        (st[c] = st[c] || []).push(opts[Math.min(k, opts.length - 1)]);
      });
      out.push(st);
    }
    return out;
  }
  const tlCache = new WeakMap();
  function timeline(def) {
    if (!isObj(def)) return {};
    const hit = tlCache.get(def);
    if (hit) return hit;
    const x = R(def), out = {};
    const entry = n => (out[n] = out[n] || { first: null, last: 0 });
    let prev = {};
    x.phases.forEach((p, i) => {
      const n = i + 1;
      if (!isObj(p.loadout)) return;
      for (const st of loadoutStates(p.loadout)) {
        for (const c of uniq([...Object.keys(prev), ...Object.keys(st)])) {
          const a = prev[c] || [], b = st[c] || [];
          const gone = a.filter(v => !b.includes(v)), added = b.filter(v => !a.includes(v));
          gone.forEach((g, k) => {
            const e = entry(g);
            if (added[k]) { e.replaced = { phase: n, by: added[k], slot: CAT_LABEL[c] || 'Loadout' }; delete e.left; } else { delete e.replaced; e.left = n; }
          });
          added.forEach(v => { if (out[v]) { delete out[v].replaced; delete out[v].left; } });
        }
        for (const [c, list] of Object.entries(st)) list.forEach(v => {
          const e = entry(v);
          if (!e.first) e.first = { phase: n };
          e.last = n;
          e.slot = CAT_LABEL[c] || 'Loadout';
        });
        prev = st;
      }
    });
    for (const [nm, e] of Object.entries(out)) {
      const a = acquire(nm, def);
      Object.assign(e.first, a ? { at: a.phase, how: a.how } : { at: e.first.phase, how: 'loadout' });
      if (a && a.boss) e.first.boss = a.boss;
      if (e.replaced) {
        const ra = acquire(e.replaced.by, def);
        e.replaced.how = ra ? ra.how : 'loadout';
        if (ra && ra.boss && ra.boss.phase <= e.replaced.phase) e.replaced.boss = ra.boss;
      }
    }
    x.rewards.forEach((list, nm) => {
      if (out[nm] || nm === '__proto__') return;
      const r = list[0];
      out[nm] = { first: { phase: r.phase, at: r.phase, how: 'boss', boss: bossRef(r.boss, r.phase) } };
    });
    tlCache.set(def, out);
    return out;
  }

  // ---------- Card context ----------
  function normCtx(ctx) {
    if (ctx && ctx.__brc) return ctx;
    const o = isObj(ctx) ? ctx : {};
    const def = isObj(o.def) ? o.def : { phases: [] };
    let phase = o.phase;
    if (typeof phase === 'number') phase = arr(def.phases)[phase - 1];
    else if (typeof phase === 'string') phase = arr(def.phases).find(p => p && p.id === phase);
    return { __brc: true, def, phase: isObj(phase) ? phase : null, view: str(o.view) || 'path', build: isObj(o.build) ? o.build : null, seen: new Set(), flags: {} };
  }
  // What a name is: route bosses first, then the lexicon, then region names the route uses, then the game data.
  function kindFor(n, c) {
    const x = R(c && c.def);
    if (x.bosses.has(n)) return 'boss';
    const k = kindOf(n);
    if (k !== 'unknown') return k;
    if (regionKey(n, c)) return 'region';
    const def = c && c.def;
    if (def && (own(def.resources, n) || own(def.needs, n))) return 'material';
    const gi = gItem(n);
    if (gi) {
      const gk = str(gi.kind), cat = lc(gi.cat);
      if (gk === 'consumable') return cat === 'elixir' ? 'elixir' : cat === 'coating' ? 'coating' : 'consumable';
      if (['weapon', 'armor', 'jewelry', 'jewel', 'material'].includes(gk)) return gk;
    }
    const np = gNpc(n);
    if (np) return np.vblood ? 'boss' : 'enemy';
    const ga = gAb(n);
    if (ga) return ({ Spell: 'spell', Veil: 'veil', Ultimate: 'ult', Weapon: 'weapon-skill', Form: 'form' })[ga.slot] || 'ability';
    if (lxPlace(n)) return 'place';
    return 'unknown';
  }
  // "Farbane Woods (Tristan)" → { key: 'Farbane Woods', known, note: 'Tristan', bosses, places, rest }: a lexicon region
  // (by name, aka or a unique prefix) or a region name the route's phases use. The note's parts ("Elena, Cassius,
  // Stygian Shards", "Blood Crystals at Dracula's Demise") become route bosses, lexicon places or plain text.
  function regionOf(n, c) {
    const r = regionKey(n, c);
    if (!r) return null;
    const places = Object.keys(LD().PLACES || {}), x = R(c && c.def);
    r.bosses = []; r.places = []; r.rest = [];
    for (const part of r.note.split(/[,;]/).map(s => s.trim()).filter(Boolean)) {
      const boss = [...x.bosses.keys()].find(b => short(b) === part || b === part);
      const place = places.find(k => [lc(part), 'the ' + lc(part)].includes(lc(k))) || places.filter(k => lc(part).includes(lc(k).replace(/^the /, ''))).sort((a, b) => b.length - a.length)[0];
      if (boss) r.bosses.push(boss); else if (place) { r.places.push(place); if (lc(place).replace(/^the /, '') !== lc(part)) r.rest.push(part); } else r.rest.push(part);
    }
    r.place = r.places[0] || null;
    return r;
  }
  function regionKey(n, c) {
    const regions = LD().REGIONS || {};
    const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(n);
    const base = m ? m[1] : n, note = m ? m[2] : '';
    let key = own(regions, n) ? n : own(regions, base) ? base : null;
    if (!key) key = Object.keys(regions).find(k => arr(isObj(regions[k]) && regions[k].aka).some(a => lc(a) === lc(base) || lc(a) === lc(n))) || null;
    if (!key) { const pre = Object.keys(regions).filter(k => lc(k).startsWith(lc(base) + ' ')); if (pre.length === 1) key = pre[0]; }
    const inRoute = R(c && c.def).phases.some(p => arr(p.regions).some(r => r === n || str(r).replace(/\s*\(.*\)\s*$/, '') === base));
    if (!key && !inRoute) return null;
    return { key: key || base, known: !!key, note };
  }
  // The route's notes on a name, with the hovered phase's overrides (info[name].phases[phaseId]) field by field.
  function infoOf(n, c) {
    const pick = m => (isObj(m) ? own(m, n) || own(m, display(n)) : null);
    const v = pick(c.def && c.def.info) || pick(BR.shared && BR.shared.INFO);
    if (!isObj(v)) return null;
    const ov = c.phase && isObj(v.phases) ? own(v.phases, str(c.phase.id)) : null;
    if (!isObj(ov)) return v;
    const out = { ...v };
    for (const [k, val] of Object.entries(ov)) if (val !== undefined && val !== null && val !== '') out[k] = val;
    return out;
  }
  // A weapon's skills: the game data's (Copper weapons have only the first), else the lexicon's pair for its type.
  function weaponSkills(w) {
    const gi = gItem(w);
    const own2 = arr(gi && gi.skills).map(str).filter(Boolean);
    if (own2.length) return own2;
    const type = LX().weaponType ? str(LX().weaponType(w)) : '';
    return arr(own(LX().WEAPON_SKILLS, type || str(gi && gi.cat))).map(str).filter(Boolean);
  }
  // The loadout a card talks about: the endgame build, the hovered phase's loadout when it has the name, else the
  // nearest later (then earlier) one that does; with no phase, the last one that does.
  function loadoutFor(n, c) {
    if (c.build) return { l: c.build, phase: 0 };
    const x = R(c.def), cur = phaseNo(c.def, c.phase);
    const L = i => x.phases[i] && x.phases[i].loadout;
    const has = i => isObj(L(i)) && loadoutNames(L(i)).includes(n);
    if (!cur) { for (let i = x.phases.length - 1; i >= 0; i--) if (has(i)) return { l: L(i), phase: i + 1 }; return null; }
    if (has(cur - 1)) return { l: L(cur - 1), phase: cur };
    for (let i = cur; i < x.phases.length; i++) if (has(i)) return { l: L(i), phase: i + 1 };
    for (let i = cur - 2; i >= 0; i--) if (has(i)) return { l: L(i), phase: i + 1 };
    return null;
  }
  const slotLists = l => (arr(l.slots).length ? arr(l.slots) : arr(l.spells)).map(splitOr);
  const weaponOf = l => loadoutNames(l).find(g => kindOf(g) === 'weapon') || '';

  // ---------- HTML pieces ----------
  const STAR = '<span class="brc-star" role="img" aria-label="Build pick" title="Build pick">★</span>';
  const DOT = '<span class="brc-dot" aria-hidden="true"></span>';
  const tag = (t, cls = '') => (t ? `<span class="brc-tag${cls ? ' ' + cls : ''}">${t}</span>` : '');
  const sec = (title, body, cls = '') => (body ? `<section class="brc-sec${cls ? ' ' + cls : ''}"><h4>${title}</h4>${body}</section>` : '');
  const dl = rows => { const r = rows.filter(v => v && v[1]); return r.length ? `<dl class="brc-dl">${r.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''; };
  const chip = (n, extra = '') => `<span class="brc-chip" tabindex="0">${ic(n, 22)}<span>${esc(display(n))}</span>${extra}</span>`;
  const chips = list => { const l = list.filter(Boolean); return l.length ? `<div class="brc-chips">${l.join('')}</div>` : ''; };
  const ref = n => `<span class="brc-ref" tabindex="0">${ic(n, 18)}<span>${esc(short(display(n)))}</span></span>`;
  const bossTxt = b => { if (!b || !b.name) return ''; const lv = fmt(b.lv); return `${ref(b.name)}${lv ? ` (Lv ${lv})` : ''}`; };
  const locChip = n => `<span class="brc-chip brc-loc" tabindex="0" data-info="${esc(n)}"><span aria-hidden="true">📍</span><span>${esc(n)}</span></span>`;
  const descP = d => (str(d) ? `<p class="brc-desc">${txt(d)}</p>` : '');
  const mods = n => ({ regular: 2, greater: 3, primal: 4 })[lc((/^(Regular|Greater|Primal)\b/i.exec(str(n)) || [])[1])] || 0;
  // Route text once per card.
  function routeNote(c, t, label) {
    if (!str(t) || c.seen.has(t)) return '';
    c.seen.add(t);
    return `<div class="brc-note">${label ? `<span class="brc-src">${label}</span> ` : ''}${html(t)}</div>`;
  }
  function acqLine(a, def) {
    if (!a) return '';
    if (a.how === 'start') return 'Known from the start';
    const ph = phLabel(def, a.phase);
    if (a.how === 'boss') return `${ph} · after ${bossTxt(a.boss)}`;
    if (a.how === 'craft') return `${ph} · crafted${a.boss ? `, unlocked by ${bossTxt(a.boss)}${a.boss.phase !== a.phase ? ` in Phase ${a.boss.phase}` : ''}` : ''}`;
    return `${ph}${a.boss ? ` · after ${bossTxt(a.boss)}` : ''}`;
  }
  // Every mod in a pool; the build's picks (keywords, case-insensitive) starred.
  function modList(pool, picks) {
    const ks = arr(picks).map(lc).filter(Boolean);
    const items = arr(pool).map(m => (typeof m === 'string' ? { text: m } : isObj(m) ? m : null)).filter(m => m && str(m.text));
    if (!items.length) return '';
    return `<ul class="brc-mods">${items.map(m => {
      const pick = ks.some(k => lc(m.text).includes(k));
      return `<li${pick ? ' class="pick"' : ''}>${pick ? STAR : DOT}<span>${esc(m.text)}</span>${str(m.range) ? `<span class="brc-range mono">${esc(m.range)}</span>` : ''}</li>`;
    }).join('')}</ul>`;
  }
  const legend = '<p class="brc-legend">★ marks this build\'s pick.</p>';

  const KIND_LABEL = { weapon: 'Weapon', armor: 'Armour', jewelry: 'Magic source', jewel: 'Jewel', elixir: 'Elixir', consumable: 'Consumable',
    coating: 'Weapon coating', blood: 'Blood type', passive: 'Stygian passive', veil: 'Veil', spell: 'Spell', ult: 'Ultimate',
    'weapon-skill': 'Weapon skill', form: 'Shapeshift form', ability: 'Ability', station: 'Castle station', material: 'Material', boss: 'V Blood',
    enemy: 'Enemy', region: 'Region', place: 'Location', glyph: 'Rotation step', unknown: 'Item' };
  const SCHOOL_COLOR = { Chaos: '#b46bff', Blood: '#ff3d63', Unholy: '#6fdc5c', Storm: '#ffd23f', Frost: '#52d4ff', Illusion: '#3ee6c1', Shadow: '#c9a56a' };
  const RARITY_COLOR = { Common: '#a49cad', Uncommon: '#6fdc5c', Rare: '#4fa3ff', Epic: '#e056c9', Legendary: '#ff9a3c' };
  const accent = (n, extra) => str(own(H().FRAME, n)) || extra || '';
  const PLACE_ICON = '<span class="ic-fallback glyph brc-ic" role="img" aria-hidden="true" style="width:56px;height:56px">📍</span>';

  function card(n, c, kind, o = {}) {
    const title = str(o.title) || display(n);
    const icon = o.icon || ic(n, 56, kind === 'boss' || kind === 'enemy' ? 'noinfo brc-ic round' : 'noinfo brc-ic');
    const sub = [KIND_LABEL[kind] || 'Item', ...arr(o.sub)].map(str).filter(Boolean)
      .filter((s, i, all) => all.findIndex(t => lc(t) === lc(s)) === i).map(esc).join(' · ');
    const tags = arr(o.tags).filter(Boolean);
    const credit = [];
    if (G().version || G().items) credit.push(`Game data: ${esc(str(isObj(G().credit) && G().credit.data) || 'vrising.gaming.tools')}${str(isObj(G().version) && G().version.patch) ? ` (patch ${esc(G().version.patch)})` : ''}`);
    if (c.flags.wiki) credit.push(`Mods: ${esc(str(isObj(G().credit) && G().credit.jewels) || 'V Rising Wiki (CC BY-SA)')}`);
    return `<article class="brc" data-kind="${esc(kind)}"${o.acc ? ` style="--acc:${esc(o.acc)}"` : ''}>`
      + `<header class="brc-head">${icon}<div class="brc-title"><h3>${esc(title)}</h3><div class="brc-kind">${sub}</div>`
      + `${tags.length ? `<div class="brc-meta">${tags.join('')}</div>` : ''}</div></header>`
      + arr(o.parts).filter(Boolean).join('')
      + (credit.length ? `<footer class="brc-foot">${credit.join(' · ')}</footer>` : '') + '</article>';
  }

  // ---------- Shared sections ----------
  function whySec(n, c, skipTake = false) {
    const info = infoOf(n, c);
    if (info && str(info.why)) return sec('Why', `<div class="brc-why">${html(info.why)}</div>`);
    const x = R(c.def), out = [];
    const rw = (x.rewards.get(n) || [])[0];
    if (rw && !skipTake) out.push(routeNote(c, str(rw.boss.take), `${esc(short(rw.boss.name))}:`));
    (x.crafts.get(n) || []).slice(0, 1).forEach(r => out.push(routeNote(c, r.t, `Phase ${r.phase}:`)));
    (x.steps.get(n) || []).slice(0, 1).forEach(r => out.push(routeNote(c, r.t, `Phase ${r.phase}:`)));
    const lo = loadoutFor(n, c);
    if (lo) arr(lo.l.kv).filter(r => Array.isArray(r) && !/^(rotation|combo)$/i.test(str(r[0])) && (findIn(plain(r[0]), n, c.def) || findIn(plain(r[1]), n, c.def)))
      .slice(0, 2).forEach(r => out.push(routeNote(c, str(r[1]), `${esc(r[0])}:`)));
    const body = out.filter(Boolean).join('');
    return body ? sec('Why', body) : '';
  }
  function spanLine(e, def) {
    const x = R(def), a = e.first.phase, b = e.last;
    if (a === b) return phLabel(def, a);
    return `Phase ${a} → Phase ${b}${b === x.lastLoadout ? ' (to the end)' : ''}`;
  }
  function whenSec(n, c) {
    const def = c.def, e = own(timeline(def), n), a = acquire(n, def);
    const rows = [['Get it', acqLine(a, def)]];
    if (e && e.last) rows.push(['In the loadout', spanLine(e, def)]);
    const body = dl(rows);
    return body ? sec('When', body) : '';
  }
  const GEAR = ['weapon', 'armor', 'jewelry'];
  // Route items that use this one: the game's recipes, or route text that starts a recipe with it ("X + 4 …").
  function usedIn(n, c) {
    const x = R(c.def), out = [];
    if (isObj(G().items)) for (const k of x.names) {
      const gi = gItem(k);
      if (k !== n && gi && isObj(gi.recipe) && arr(gi.recipe.inputs).some(i => Array.isArray(i) && i[0] === n)) out.push(k);
    }
    x.crafts.forEach((rows, k) => {
      if (k === n || out.includes(k)) return;
      if (rows.some(r => { const p = plain(r.t), f = findIn(p, n, c.def); return f && /^\s*\+/.test(p.slice(f.i + f.len)); })) out.push(k);
    });
    return out;
  }
  function upgradeSec(n, c) {
    const def = c.def, x = R(def), tl = timeline(def), e = own(tl, n), info = infoOf(n, c), rows = [];
    if (e && e.replaced) {
      const r = e.replaced, b = r.boss;
      const after = b ? (b.phase === r.phase ? ` after ${bossTxt(b)}` : `, once ${bossTxt(b)} has unlocked it (Phase ${b.phase})`) : r.how === 'craft' ? ' (crafted)' : '';
      rows.push(`<p>Replaced by ${chip(r.by)} in ${phLabel(def, r.phase)}${after}.</p>`);
    } else if (e && e.last && e.left) rows.push(`<p>Leaves the loadout after Phase ${e.last}, with nothing in its place.</p>`);
    else if (e && e.last && e.last === x.lastLoadout) rows.push('<p>Kept to the end of the route.</p>');
    const from = Object.keys(tl).filter(k => tl[k].replaced && tl[k].replaced.by === n);
    if (from.length) rows.push(`<p>Takes over from ${from.map(k => `${chip(k)} <span class="brc-muted">(Phase ${tl[k].replaced.phase})</span>`).join(' ')}</p>`);
    const into = usedIn(n, c).filter(u => GEAR.includes(kindFor(u, c)));
    if (into.length && GEAR.includes(kindFor(n, c))) rows.push(`<p>Base item for ${into.map(u => chip(u)).join(' ')}</p>`);
    if (info && str(info.upgrade)) rows.push(`<div class="brc-why">${html(info.upgrade)}</div>`);
    return rows.length ? sec('Upgrade / replace', rows.join('')) : '';
  }
  function rotationSec(n, c) {
    const lo = loadoutFor(n, c);
    if (!lo) return '';
    const title = `Rotation${lo.phase ? ` · Phase ${lo.phase}` : ''}`;
    const rot = isObj(lo.l.rot) ? lo.l.rot : null;
    if (!rot) {
      const kv = arr(lo.l.kv).find(r => Array.isArray(r) && /^(rotation|combo)$/i.test(str(r[0])));
      return kv && str(kv[1]) ? sec(title, `<div class="brc-note">${html(kv[1])}</div>`) : '';
    }
    const pre = arr(rot.pre).map(str).filter(Boolean);
    const order = arr(rot.order).map(o => (typeof o === 'string' ? { n: o, when: '' } : isObj(o) && str(o.n) ? { n: str(o.n), when: str(o.when) } : null)).filter(o => o && o.n);
    const fill = arr(rot.fill).map(str).filter(Boolean);
    const label = m => display(m).replace(/^Elixir of the /, '');
    const step = (m, cls, i) => `<li class="brc-rs ${cls}${m === n ? ' cur' : ''}" tabindex="0"${m === n ? ' aria-current="true"' : ''}>`
      + `${i ? `<b class="brc-rn">${i}</b>` : ''}${ic(m, 32)}<span>${esc(label(m))}</span></li>`;
    const arrow = (t = '→') => `<li class="brc-arrow" aria-hidden="true">${t}</li>`;
    const seq = [];
    if (pre.length) seq.push(pre.map(m => step(m, 'pre')).join(arrow('+')), arrow());
    if (order.length) seq.push(order.map((o, i) => step(o.n, 'ord', i + 1)).join(arrow()));
    if (fill.length) seq.push(arrow('then'), fill.map(m => step(m, 'fill')).join(''));
    const nm = o => `<b>${esc(display(o.n))}</b>`;
    const i = order.findIndex(o => o.n === n);
    let pos = '';
    if (i >= 0) {
      const b = order[i - 1], a = order[i + 1];
      pos = b && a ? `Cast after ${nm(b)}, before ${nm(a)}.` : a ? `Opens the rotation, before ${nm(a)}.` : b ? `Last in the rotation, after ${nm(b)}.` : 'The only step in the rotation.';
      if (order[i].when) pos += ` ${esc(order[i].when)}`;
    } else if (pre.includes(n)) pos = `Use it before the rotation starts${order[0] ? `, ahead of ${nm(order[0])}` : ''}.`;
    else if (fill.includes(n)) pos = 'Fills the gaps while the rotation is on cooldown.';
    return sec(title, `<ol class="brc-rot" aria-label="Rotation order">${seq.join('')}</ol>${pos ? `<p class="brc-pos">${pos}</p>` : ''}`
      + (str(rot.why) ? `<div class="brc-why">${html(rot.why)}</div>` : ''), 'brc-rotsec');
  }
  // Route rows that list jewel mods for a spell (the jewel crafts' text), when the build has no keywords.
  function jewelRows(n, c) {
    const out = [];
    R(c.def).crafts.forEach((rows, k) => { if (kindOf(k) === 'jewel') rows.forEach(r => { if (findIn(plain(r.t), n, c.def)) out.push(r); }); });
    return out;
  }
  function jewelSec(n, c, kind) {
    const ga = gAb(n) || {}, sp = own(LX().SPELLS, n) || {};
    if (kind === 'ult' || str(ga.slot) === 'Ultimate' || str(sp.slot) === 'Ultimate') return sec('Jewel mods', '<p class="brc-muted">Ultimates take no jewels.</p>');
    if (n === 'Starting dash') return '';
    const pool = gJewels(n), lo = loadoutFor(n, c);
    const picks = lo && isObj(lo.l.jewels) ? arr(lookup(lo.l.jewels, n)).map(str).filter(Boolean) : [];
    if (!pool && !picks.length) {
      const rows = jewelRows(n, c);
      return rows.length ? sec('Jewel mods', rows.slice(-1).map(r => routeNote(c, r.t, `Phase ${r.phase}:`)).join('')) : '';
    }
    if (pool) c.flags.wiki = true;
    const gem = lo && picks.length ? loadoutNames(lo.l).find(g => kindOf(g) === 'jewel') : '';
    const head = gem ? `<p>${chip(gem)} <span class="brc-muted">${mods(gem) ? `${mods(gem)} mods` : ''}${lo.phase ? ` · Phase ${lo.phase}` : ''}</span></p>` : '';
    const body = pool ? modList(pool, picks) : modList(picks, picks);
    return sec('Jewel mods', head + body + (picks.length ? legend : '<p class="brc-muted">Every mod this spell can roll. A jewel rolls 2 of them (Regular), 3 (Greater) or 4 (Primal).</p>'));
  }
  function inLoadoutSec(n, c) {
    const x = R(c.def), e = own(timeline(c.def), n);
    const phases = [];
    x.phases.forEach((p, i) => { if (isObj(p.loadout) && arr(p.loadout.slots).some(s => splitOr(s).includes(n))) phases.push(i + 1); });
    if (!phases.length) return '';
    const cur = phaseNo(c.def, c.phase);
    const pills = phases.map(p => `<span class="brc-ph${p === cur ? ' cur' : ''}">P${p}</span>`).join('');
    return sec('In the loadout', `<p>${e && e.slot ? `${esc(e.slot)} slot: ` : ''}${pills}</p>`);
  }

  // ---------- How to get ----------
  const GATES = { 'Iron Ore': 12, 'Silver Ore': 18, 'Blood Crystal': 23 };
  const RAW = { 'Iron Ingot': 'Iron Ore', 'Dark Silver Ingot': 'Silver Ore', 'Copper Ingot': 'Copper Ore' };
  function gateOf(m) {
    if (GATES[m]) return { ore: m, gl: GATES[m] };
    const gm = gMat(m);
    const raw = str(lxMat(m).raw) || str(gm && gm.via) || RAW[m] || '';
    return raw && GATES[raw] ? { ore: raw, gl: GATES[raw] } : null;
  }
  const gateP = g => `<p class="brc-gate">⛏ Mining ${ref(g.ore)} needs a Gear Level ${g.gl}+ weapon.</p>`;
  function researchNote(st, kind) {
    const [cur, curs, hi, lo] = RESEARCH[st];
    const heavy = kind === 'weapon' || kind === 'jewelry', light = ['armor', 'consumable', 'elixir', 'coating'].includes(kind);
    const cost = heavy ? `<b>${hi} ${curs}</b> for a weapon or jewelry blueprint` : light ? `<b>${lo} ${curs}</b> for an armour or consumable blueprint`
      : `${hi} ${curs} for a weapon or jewelry blueprint, ${lo} for armour or a consumable`;
    return `<p class="brc-research">${chip(st)} research: ${cost} (${ref(cur)}). Each blueprint is a random draw within its category, so it can take a few tries.</p>`;
  }
  // One line on where a material comes from: the route's note, else the game data; plus map links.
  function sourceLine(m, c) {
    const def = c.def, bits = [];
    const res = own(isObj(def.resources) ? def.resources : null, m);
    let how = '';
    if (Array.isArray(res) && str(res[1])) { how = html(res[1]); bits.push(how); }
    else {
      const gi = gItem(m), gm = gMat(m), lm = lxMat(m);
      const raw = str(lm.raw) || str(gm && gm.via);
      if (gi && isObj(gi.recipe) && str(gi.recipe.station)) bits.push(`${esc(gi.recipe.station)}${raw ? `, from ${esc(raw)}` : ''}`);
      else if (raw) bits.push(`From ${esc(raw)}`);
      const d = arr(gi && gi.drops).filter(v => isObj(v) && str(v.name)).slice(0, 2).map(v => `${esc(v.name)}${pct(v.rate) ? ` ${pct(v.rate)}` : ''}`);
      if (d.length) bits.push(`drops from ${d.join(', ')}`);
      if (!bits.length && (lm.craft || lm.drop)) bits.push([lm.craft && 'crafted', lm.drop && 'drops from enemies and chests'].filter(Boolean).join(', '));
      if (str(lm.place)) bits.push(esc(lm.place)); else if (str(lm.region)) bits.push(esc(lm.region));
      const rw = (R(def).rewards.get(m) || [])[0];
      if (!bits.length && rw) bits.push(`Recipe from ${esc(short(rw.boss.name))} (Phase ${rw.phase})`);
    }
    const g = gateOf(m);
    if (g && !/GL \d+/.test(plain(how))) bits.push(`needs a GL ${g.gl}+ weapon to mine ${esc(g.ore)}`);
    const links = matLinks(m, how);
    return (bits.join('; ') || '<span class="brc-muted">No source on record yet</span>') + (links ? ` <span class="brc-src-links">${links}</span>` : '');
  }
  function baseLine(n, c) {
    const a = acquire(n, c.def);
    return `The base item: you upgrade the one you have${a ? ` (${acqLine(a, c.def)})` : ''}.`;
  }
  function inputRows(inputs, c) {
    return `<ul class="brc-inputs">${inputs.map(({ n, q }) => {
      const base = GEAR.includes(kindFor(n, c));
      return `<li class="brc-input${base ? ' base' : ''}"><span class="brc-chip" tabindex="0">${ic(n, 28)}<b>${esc(display(n))}</b>${fmt(q) ? ` <span class="mono">×${fmt(q)}</span>` : ''}</span>`
        + `${base ? tag('Base item', 'base') : ''}<div class="brc-src">${base ? baseLine(n, c) : sourceLine(n, c)}</div></li>`;
    }).join('')}</ul>`;
  }
  // Drop sources: the item's top drops, else the NPCs whose drops list it.
  const DROP_KIND = { npc: 'enemy', vblood: 'V Blood', loot: 'container' };
  function dropList(n, c) {
    const gi = gItem(n), rows = [];
    arr(gi && gi.drops).filter(d => isObj(d) && str(d.name)).slice(0, 6).forEach(d => rows.push({ who: str(d.name), rate: d.rate, kind: str(d.kind) }));
    if (!rows.length && isObj(G().npcs)) for (const [nm, npc] of Object.entries(G().npcs)) {
      if (rows.length >= 6) break;
      arr(isObj(npc) && npc.drops).forEach(d => { if (Array.isArray(d) && str(d[0]) === n) rows.push({ who: nm, rate: d[1], kind: npc.vblood ? 'vblood' : 'npc' }); });
    }
    if (!rows.length) return '';
    return `<ul class="brc-drops">${rows.map(r => `<li>${r.kind === 'loot' ? `<span class="brc-loot">${esc(r.who)}</span>` : chip(r.who)}`
      + `${pct(r.rate) ? ` <span class="mono">${pct(r.rate)}</span>` : ''}${DROP_KIND[r.kind] ? ` <span class="brc-muted">${DROP_KIND[r.kind]}</span>` : ''}</li>`).join('')}</ul>`;
  }
  function howToGet(name, ctx) {
    const c = normCtx(ctx), n = str(name).trim();
    if (!n) return '';
    const def = c.def, x = R(def), k = kindFor(n, c), out = [];
    const gi = gItem(n);
    const recipe = gi && isObj(gi.recipe) ? gi.recipe : null;
    const rows = (x.crafts.get(n) || []).length + (x.steps.get(n) || []).length;
    const parsed = recipe || k === 'boss' || (k === 'station' && rows > 1) ? null : parseRecipe(n, def);
    if (recipe || parsed) {
      const station = str(recipe ? recipe.station : parsed.station);
      const inputs = recipe ? arr(recipe.inputs).filter(i => Array.isArray(i) && str(i[0])).map(([m, q]) => ({ n: str(m), q: num(q) })) : parsed.inputs;
      const time = recipe && fmt(recipe.time) ? ` <span class="brc-muted mono">${fmt(recipe.time)} s</span>` : '';
      if (station) out.push(`<p>Craft at ${chip(station)}${time}</p>`);
      if (inputs.length) out.push(inputRows(inputs, c));
    }
    // What unlocks it: the boss that hands it out, the game's unlock list, or the station's boss.
    const unl = [];
    const rw = (x.rewards.get(n) || [])[0];
    if (rw) unl.push(`${k === 'material' ? 'Recipe from' : 'From'} ${bossTxt(bossRef(rw.boss, rw.phase))} · ${phLabel(def, rw.phase, false)}`);
    for (const u of arr(recipe && recipe.unlock).map(str).filter(v => v && !RESEARCH[v])) {
      if (rw && str(rw.boss.name) === u) continue;
      const e = x.bosses.get(u);
      unl.push(e ? `Recipe from ${bossTxt(bossRef(e.b, e.phase))} · ${phLabel(def, e.phase, false)}` : kindFor(u, c) === 'boss' ? `Recipe from ${ref(u)}` : `Unlocked by ${esc(u)}`);
    }
    if (!unl.length && (recipe || parsed)) { const ub = unlockBoss(n, def); if (ub) unl.push(`Unlocked by ${bossTxt(ub)} · ${phLabel(def, ub.phase, false)}`); }
    if (unl.length) out.push(`<p class="brc-unlock">${unl.join('<br>')}</p>`);
    uniq([...arr(recipe && recipe.unlock).map(str).filter(v => RESEARCH[v]), ...(parsed && parsed.research ? [parsed.research] : []), ...researchMentions(n, def)])
      .forEach(st => out.push(researchNote(st, k)));
    const g = gateOf(n);
    if (g) out.push(gateP(g));
    if (!recipe && !parsed) { const d = dropList(n, c); if (d) out.push(`<p class="brc-muted">Drops from</p>${d}`); }
    const res = own(isObj(def.resources) ? def.resources : null, n);
    if (Array.isArray(res) && str(res[1]) && !recipe) {
      const links = matLinks(n, res[1]);
      out.push(`<p class="brc-res">${fmt(res[0]) ? `<span class="brc-ph">Phase ${fmt(res[0])}</span> ` : ''}${html(res[1])}${links ? ` <span class="brc-src-links">${links}</span>` : ''}</p>`);
    }
    if (!recipe && !(parsed && parsed.inputs.length)) (x.crafts.get(n) || []).slice(0, 1).forEach(r => out.push(routeNote(c, r.t, `Phase ${r.phase}:`)));
    (x.steps.get(n) || []).slice(0, 1).forEach(r => out.push(routeNote(c, r.t, `Phase ${r.phase}:`)));
    return out.filter(Boolean).join('');
  }

  // ---------- Renderers ----------
  function rEquip(n, c, kind) {
    const gi = gItem(n) || {}, parsed = gi.recipe ? null : parseRecipe(n, c.def);
    const magic = arr(LX().MAGIC_TIERS).find(t => Array.isArray(t) && n.startsWith(t[0]));
    const gl = fmt(gi.gl) || (parsed && parsed.gl ? String(parsed.gl) : '') || (kind === 'jewelry' && magic ? fmt(magic[1]) : '');
    const wt = kind === 'weapon' ? str(gi.cat) || str(LX().weaponType ? LX().weaponType(n) : '') : str(gi.cat);
    const tags = [gl && tag(`Gear Level ${gl}`, 'gl'), str(gi.rarity) && tag(esc(gi.rarity), 'rarity')];
    // Weapons bring two skills.
    let skills = '';
    if (kind === 'weapon') {
      const type = str(LX().weaponType ? LX().weaponType(n) : '') || str(gi.cat);
      const list = weaponSkills(n);
      if (list.length) skills = sec('Weapon skills', chips(list.map(s => { const d = skillData(s, type, c.def); return chip(s, d.cd !== null ? ` <small class="mono">${fmt(d.cd)} s</small>` : ''); })));
    }
    // Ancestral weapons: the roll pool, with the build's rolls starred.
    let rolls = '';
    if (/^Ancestral /.test(n)) {
      const lo = loadoutFor(n, c), picks = arr(lo && lo.l.rolls).map(str).filter(Boolean), pool = gRolls();
      if (pool.length) c.flags.wiki = true;
      const body = pool.length ? modList(pool, picks) : modList(picks, picks);
      if (body) rolls = sec('Ancestral rolls', `<p class="brc-muted">Rolls are random at the Ancestral Forge.</p>${body}${picks.length ? legend : ''}`);
    }
    // Set bonuses.
    let set = '';
    if (str(gi.set)) {
      const s = gSet(gi.set);
      const bonuses = arr(s && s.bonuses).filter(b => Array.isArray(b) && fmt(b[0]) && str(b[1])).map(([k, t]) => `<li><b>${fmt(k)} pieces:</b> ${esc(t)}</li>`);
      const pieces = arr(s && s.pieces).map(str).filter(Boolean);
      set = sec(`Set: ${esc(gi.set)}`, (pieces.length ? `<p class="brc-muted">${pieces.map(esc).join(' · ')}</p>` : '')
        + (bonuses.length ? `<ul class="brc-list">${bonuses.join('')}</ul>` : `<p>Part of the ${esc(gi.set)} set.</p>`));
    }
    const stats = arr(gi.stats).filter(s => Array.isArray(s) && str(s[0]) && fmt(s[1]))
      .map(([label, v, unit]) => `<tr><th>${esc(label)}</th><td>${num(v) > 0 ? '+' : ''}${fmt(v)}${esc(unit)}</td></tr>`);
    return card(n, c, kind, {
      sub: [wt], tags, acc: accent(n, RARITY_COLOR[str(gi.rarity)]),
      parts: [descP(gi.desc), stats.length ? sec('Stats', `<table class="brc-stats"><tbody>${stats.join('')}</tbody></table>`) : '', set, skills, rolls,
        sec('How to get', howToGet(n, c)), whySec(n, c), whenSec(n, c), upgradeSec(n, c)],
    });
  }

  function rAbility(n, c, kind) {
    const ga = gAb(n) || {}, sp = own(LX().SPELLS, n) || {};
    const school = str(ga.school) || str(sp.school);
    const tags = [fmt(ga.cd) && tag(`${fmt(ga.cd)} s cooldown`), fmt(ga.cast) && tag(`${fmt(ga.cast)} s cast`), num(ga.charges) > 1 && tag(`${fmt(ga.charges)} charges`)];
    const a = acquire(n, c.def);
    const unlock = a ? sec('Unlocked by', `<p>${acqLine(a, c.def)}</p>`) : '';
    return card(n, c, kind, {
      sub: [school], tags, acc: SCHOOL_COLOR[school] || accent(n),
      parts: [descP(ga.desc), unlock, rotationSec(n, c), jewelSec(n, c, kind), inLoadoutSec(n, c), upgradeSec(n, c), whySec(n, c)],
    });
  }

  // A weapon skill's numbers: the game data, else the physical routes' weapon table (BR.shared.WEAPONS).
  function skillData(s, type, def) {
    const ga = gAb(s) || {};
    const table = arr((isObj(def) && def.weapons) || (BR.shared && BR.shared.WEAPONS));
    const w = table.find(v => isObj(v) && v.w === type);
    const row = w ? arr(w.skills).find(r => Array.isArray(r) && r[0] === s) : null;
    return { pct: row ? num(row[1]) : null, cd: num(ga.cd) ?? (row ? num(row[2]) : null), desc: str(ga.desc), from: w ? str(w.from) : '' };
  }
  function rSkill(n, c, kind) {
    const type = str((gAb(n) || {}).weapon) || str(own(LX().SKILL_WEAPON, n));
    const d = skillData(n, type, c.def);
    const tags = [d.pct !== null && tag(`${fmt(d.pct)}% per use`), d.cd !== null && tag(`${fmt(d.cd)} s cooldown`)];
    const weapons = uniq(R(c.def).phases.flatMap(p => (isObj(p.loadout) ? arr(p.loadout.gear) : [])).filter(g => LX().weaponType && LX().weaponType(g) === type && weaponSkills(g).includes(n)));
    const weapon = (weapons.length ? chips(weapons.map(w => chip(w))) : type ? `<p>Any ${esc(type)}.</p>` : '') + (d.from ? `<p class="brc-muted">${esc(type)} unlocked: ${esc(d.from)}</p>` : '');
    return card(n, c, kind, { sub: [type], tags, parts: [descP(d.desc), sec('Weapon', weapon), rotationSec(n, c), whySec(n, c)] });
  }

  function rForm(n, c, kind) {
    const ga = gAb(n) || {};
    return card(n, c, kind, {
      tags: [fmt(ga.cd) && tag(`${fmt(ga.cd)} s cooldown`)],
      parts: [descP(ga.desc), sec('How to get', howToGet(n, c)), whySec(n, c), rotationSec(n, c)],
    });
  }

  function rJewel(n, c, kind) {
    const m = /^(Regular|Greater|Primal)\s+(?:(\w+)\s+)?(jewel|gem)$/i.exec(n);
    if (m && /gem/i.test(m[3])) return rMaterial(n, c, 'material');
    const school = m && m[2] ? m[2] : '';
    const gi = gItem(n) || {};
    const k = mods(n);
    const lo = loadoutFor(n, c);
    let spells = lo && isObj(lo.l.jewels) ? Object.keys(lo.l.jewels) : [];
    if (school) { const f = spells.filter(s => str((own(LX().SPELLS, s) || gAb(s) || {}).school) === school); if (f.length) spells = f; }
    let any = false;
    const body = spells.map(s => {
      const pool = gJewels(s), picks = arr(lookup(lo.l.jewels, s)).map(str).filter(Boolean);
      if (pool) c.flags.wiki = true;
      if (picks.length) any = true;
      return `<div class="brc-jw">${chip(s)}${pool ? modList(pool, picks) : modList(picks, picks)}</div>`;
    }).join('');
    const rules = '<p>A jewel adds random mods to one spell, drawn from that spell\'s pool: Regular jewels roll 2, Greater 3 and Primal 4. Gem colour matches the spell\'s school.</p>';
    return card(n, c, kind, {
      sub: [school], tags: [k && tag(`${k} mods`)], acc: accent(n, SCHOOL_COLOR[school]),
      parts: [descP(gi.desc), sec(`Socketed${lo && lo.phase ? ` · Phase ${lo.phase}` : ''}`, body ? body + (any ? legend : '') : ''), sec('Tier rules', rules),
        sec('How to get', howToGet(n, c)), whySec(n, c), whenSec(n, c), upgradeSec(n, c)],
    });
  }

  // Abilities an effect boosts, from its wording and the loadout's slots and weapon.
  function boosts(effect, lo) {
    const e = lc(effect);
    if (!e || !lo) return [];
    const slots = slotLists(lo.l), out = [];
    if (/veil/.test(e)) out.push(...(slots[0] || []));
    if (/spell|magic/.test(e)) slots.forEach(s => out.push(...s));
    if (/ultimate/.test(e)) out.push(...(slots[3] || []));
    if (/weapon skill|physical|attack speed|primary/.test(e)) {
      const w = weaponOf(lo.l);
      if (w) out.push(...weaponSkills(w));
    }
    return uniq(out.filter(v => v && v !== 'Starting dash'));
  }
  function rConsumable(n, c, kind) {
    const def = c.def, gi = gItem(n) || {}, info = infoOf(n, c), parsed = gi.recipe ? null : parseRecipe(n, def);
    const effect = str(gi.effect) || (parsed ? parsed.effect : '');
    const dur = str(gi.duration) || ((/\b(\d+)\s*(minutes|seconds)\b/.exec(`${effect} ${str(gi.desc)}`) || [])[0] || '');
    const effectSec = sec('Effect', (effect ? `<p class="brc-effect">${esc(effect)}</p>` : '') + descP(gi.desc));
    // Use: the route's note (when, where, why), else what the loadouts say.
    const e = own(timeline(def), n), lo = loadoutFor(n, c);
    let use = info && str(info.use) ? `<div class="brc-why">${html(info.use)}</div>` : '';
    if (!use) {
      const bits = [];
      if (e && e.last) bits.push(`<p>In the loadout: ${spanLine(e, def)}.</p>`);
      if (lo) arr(lo.l.kv).filter(r => Array.isArray(r) && (findIn(plain(r[0]), n, def) || findIn(plain(r[1]), n, def) || (kind === 'elixir' && /^elixir/i.test(str(r[0])))))
        .slice(0, 2).forEach(r => bits.push(routeNote(c, str(r[1]), `${esc(r[0])}:`)));
      use = bits.join('');
    }
    // Enhances and combos: the route's combo list, the rotations it opens, and the abilities its effect boosts.
    const combo = [];
    const cm = info && info.combo;
    if (Array.isArray(cm) && cm.length) combo.push(`<p class="brc-muted">Combos with</p>${chips(cm.map(str).filter(Boolean).map(v => chip(v)))}`);
    else if (str(cm)) combo.push(`<div class="brc-why">${html(cm)}</div>`);
    const prePhases = [];
    R(def).phases.forEach((p, i) => { const r = isObj(p.loadout) && isObj(p.loadout.rot) ? p.loadout.rot : null; if (r && arr(r.pre).includes(n)) prePhases.push(i + 1); });
    if (c.build && isObj(c.build.rot) && arr(c.build.rot.pre).includes(n)) prePhases.push(0);
    if (prePhases.length) {
      const r = lo && isObj(lo.l.rot) ? lo.l.rot : null;
      const first = r ? arr(r.order).map(o => (typeof o === 'string' ? o : isObj(o) ? str(o.n) : '')).find(Boolean) : '';
      const ph = prePhases.filter(Boolean);
      combo.push(`<p>Opens the rotation${ph.length ? ` (Phase ${ph.join(', ')})` : ''}${first ? `: use it before ${chip(first)}` : ''}.</p>`);
    }
    const boosted = boosts(effect || str(gi.desc), lo);
    if (boosted.length) combo.push(`<p class="brc-muted">Boosts</p>${chips(boosted.map(v => chip(v)))}`);
    return card(n, c, kind, {
      sub: [str(gi.cat)], tags: [dur && tag(esc(dur))], acc: accent(n),
      parts: [effectSec, sec('Use', use), sec('Enhances &amp; combos', combo.join('')), sec('How to get', howToGet(n, c)), whySec(n, c), whenSec(n, c), upgradeSec(n, c)],
    });
  }

  const NPC_STAT = { pp: 'Physical Power', sp: 'Spell Power', dr: 'Damage Reduction', physRes: 'Physical Resistance', spellRes: 'Spell Resistance',
    fireRes: 'Fire Resistance', hp: 'Health' };
  const PCT_STAT = /^(dr|\w*Res)$/;
  function npcStatsSec(npc) {
    const rows = [];
    if (isObj(npc.stats)) for (const [k, v] of Object.entries(npc.stats)) {
      const f = fmt(v);
      if (!f || (PCT_STAT.test(k) && num(v) === 0)) continue;
      rows.push(`<tr><th>${esc(NPC_STAT[k] || k)}</th><td>${f}${PCT_STAT.test(k) ? '%' : ''}</td></tr>`);
    }
    if (isObj(npc.res)) for (const [k, v] of Object.entries(npc.res)) if (num(v)) rows.push(`<tr><th>${esc(cap(k))} resistance</th><td>${fmt(v)}</td></tr>`);
    const ab = arr(npc.abilities).map(str).filter(Boolean);
    if (ab.length) rows.push(`<tr><th>Attacks</th><td>${ab.length}</td></tr>`);
    if (!rows.length) return '';
    return sec('Stats', `<table class="brc-stats"><tbody>${rows.join('')}</tbody></table>${ab.length ? `<p class="brc-muted brc-small">${ab.map(esc).join(' · ')}</p>` : ''}`);
  }
  const pips = s => `<span class="brc-pips" role="img" aria-label="Difficulty ${s} of 5">${[1, 2, 3, 4, 5].map(i => `<i${i <= s ? ' class="on"' : ''}></i>`).join('')}</span>`;
  const BEN = { core: '★ Core', dps: '+DPS', sustain: 'Sustain', progression: 'Progression', optional: 'Optional' };
  function rBoss(n, c, kind) {
    const def = c.def, x = R(def), cur = phaseNo(def, c.phase);
    const here = cur ? arr(x.phases[cur - 1].bosses).find(b => isObj(b) && b.name === n) : null;
    const e = here ? { b: here, phase: cur } : x.bosses.get(n) || null;
    const b = e ? e.b : {}, phaseObj = e ? x.phases[e.phase - 1] : c.phase;
    const npc = gNpc(n) || {}, vb = lxBoss(n), info = infoOf(n, c);
    const lv = fmt(b.lv) || fmt(npc.lv), region = str(vb.region);
    // Difficulty and benefit (js/state.js), else the lexicon's challenge rating and the route's ★.
    let d = null, bn = null;
    try { if (BR.state && typeof BR.state.difficulty === 'function') d = BR.state.difficulty(n, phaseObj); } catch { d = null; }
    try { if (e && BR.state && typeof BR.state.benefit === 'function') bn = BR.state.benefit(b, phaseObj, def); } catch { bn = null; }
    const score = d && num(d.score) !== null ? Math.max(0, Math.min(5, Math.round(num(d.score)))) : num(vb.challenge);
    const LEAKY = /undefined|NaN|\[object Object\]/;
    const parts = d && Array.isArray(d.parts) ? d.parts.filter(p => Array.isArray(p) && str(p[1]) && !LEAKY.test(str(p[1]))).map(([k, v]) => [esc(k), esc(v)]) : [];
    const diff = score !== null ? sec('Difficulty', `<p>${pips(score)} <span class="brc-muted">${score} of 5</span></p>${dl(parts)}`) : '';
    const benTags = bn ? arr(bn.tags).map(str).filter(Boolean).map(t => tag(esc(BEN[t] || t), 'ben ben-' + t.replace(/\W/g, ''))) : e ? [tag(b.must ? '★ Needed for the build' : 'Optional', b.must ? 'must' : '')] : [];
    const benWhy = bn ? arr(bn.why).map(str).filter(t => t && !LEAKY.test(t)).map(t => `<li>${esc(t)}</li>`) : [];
    const benefit = benTags.length ? sec('Benefit', `<div class="brc-chips">${benTags.join('')}</div>${benWhy.length ? `<ul class="brc-list">${benWhy.join('')}</ul>` : ''}`) : '';
    const gets = arr(b.gets).map(str).filter(Boolean);
    const drops = arr(npc.drops).filter(v => Array.isArray(v) && str(v[0]));
    const dropsBody = (gets.length ? `<p class="brc-muted">Unlocks</p>${chips(gets.map(g => chip(g)))}` : '')
      + (drops.length ? `<p class="brc-muted">Drops</p>${chips(drops.map(([m, r]) => chip(m, pct(r) ? ` <small class="mono">${pct(r)}</small>` : '')))}` : '');
    const why = [info && str(info.why) ? `<div class="brc-why">${html(info.why)}</div>` : '', str(b.take) ? `<div class="brc-why">${html(b.take)}</div>` : ''].join('');
    const links = [str(b.map) ? mgLink(H().M(str(b.map))) : '', e ? `<button type="button" class="btn small brc-jump" data-jump="${esc(n)}">Show in phase</button>` : ''];
    const pins = bossPins(n);
    const where = (str(b.where) ? `<p class="brc-where">${html(b.where)}</p>` : '') + (vb.roams && !pins.length ? `<p class="brc-muted">${typeof vb.roams === 'string' ? esc(vb.roams) : 'Roams; no fixed spot.'}</p>` : '')
      + mapBlock(pins.length ? { pins, focus: pins[0].p, crop: true, region: region || undefined, title: n } : null, 'boss:' + n, links);
    return card(n, c, kind, {
      tags: [lv && tag(`Lv ${lv}`, 'lv'), e && tag(`Phase ${e.phase}`), region && locChip(region)],
      parts: [descP(npc.desc), str(vb.note) && !d ? `<p class="brc-muted">${esc(vb.note)}</p>` : '', npcStatsSec(npc), diff, benefit,
        sec('Drops &amp; unlocks', dropsBody), sec('Why', why), sec('Where', where)],
    });
  }

  function rEnemy(n, c, kind) {
    const npc = gNpc(n) || {}, en = objAt(LD().ENEMIES, n) || {};
    const lv = fmt(npc.lv) || fmt(en.lv), blood = str(npc.blood) || str(en.blood), region = str(en.region);
    const drops = arr(npc.drops).filter(v => Array.isArray(v) && str(v[0])).map(([m, r]) => chip(m, pct(r) ? ` <small class="mono">${pct(r)}</small>` : ''));
    // Route materials it drops, by the materials' own drop lists.
    for (const k of R(c.def).names) {
      const gi = gItem(k);
      const d = arr(gi && gi.drops).find(v => isObj(v) && v.name === n);
      if (d && !drops.some(h => h.includes(`data-info="${esc(k)}"`))) drops.push(chip(k, pct(d.rate) ? ` <small class="mono">${pct(d.rate)}</small>` : ''));
    }
    let pts = arr(npc.spawns).filter(isPt);
    if (!pts.length && str(en.id)) pts = gLayerPts('npc:' + str(en.id));
    if (!pts.length && str(npc.id)) pts = gLayerPts('npc:' + str(npc.id));
    const pins = pts.map(p => ({ p, label: n, kind: 'drop' }));
    return card(n, c, kind, {
      tags: [lv && tag(`Lv ${lv}`, 'lv'), region && locChip(region)],
      parts: [descP(npc.desc), blood ? sec('Blood', chips([chip(blood)])) : '', npcStatsSec(npc), sec('Drops', chips(drops)),
        sec('Where', mapBlock(pins.length ? { pins, crop: true, region: region || undefined, title: n } : null, 'enemy:' + n))],
    });
  }

  function rRegion(n, c, kind) {
    const r = regionOf(n, c) || { key: n, known: false, note: '', place: null, bosses: [], places: [], rest: [] };
    const data = objAt(LD().REGIONS, r.key) || {};
    const def = c.def, x = R(def), cur = phaseNo(def, c.phase);
    const names = [r.key, ...arr(data.aka).map(str)].filter(Boolean);
    const inRegion = b => { const vb = lxBoss(b.name); if (str(vb.region)) return vb.region === r.key; const w = plain(b.where); return names.some(k => w.includes(k)); };
    let bosses = [];
    if (cur) {
      const ph = x.phases[cur - 1], regs = arr(ph.regions);
      bosses = arr(ph.bosses).filter(isObj).filter(b => inRegion(b) || (regs.length === 1 && !str(lxBoss(b.name).region) && !str(b.where))).map(b => ({ b, phase: cur }));
    }
    if (!bosses.length) x.phases.forEach((ph, i) => arr(ph.bosses).filter(isObj).filter(inRegion).forEach(b => bosses.push({ b, phase: i + 1 })));
    const places = Object.keys(LD().PLACES || {}).filter(k => isObj(LD().PLACES[k]) && LD().PLACES[k].region === r.key);
    const pins = bosses.flatMap(({ b }) => bossPins(b.name));
    r.bosses.filter(b => !bosses.some(v => v.b.name === b)).forEach(b => pins.push(...bossPins(b)));
    const ppts = r.places.flatMap(pl => placePts(lxPlace(pl)).map(p => ({ p, label: pl, kind: 'place' })));
    pins.push(...ppts);
    const notePins = [...r.bosses.flatMap(b => bossPins(b)), ...ppts];
    const focus = notePins.length ? notePins[0].p : isPt(data.center) ? data.center : undefined;
    const here = [...r.bosses.map(b => chip(b)), ...r.places.map(locChip)];
    const bossChips = bosses.map(({ b, phase }) => chip(b.name, `${fmt(b.lv) ? ` <small class="mono">Lv ${fmt(b.lv)}</small>` : ''}${!cur ? ` <small class="brc-muted">P${phase}</small>` : ''}`));
    return card(n, c, kind, {
      title: r.key, icon: PLACE_ICON, tags: [str(data.band) && tag(esc(data.band))], sub: [r.note && `here for ${r.note}`],
      parts: [str(data.blurb) ? `<p>${esc(data.blurb)}</p>` : '',
        sec('Here for', chips(here) + (r.rest.length ? `<p class="brc-muted">${r.rest.map(esc).join(' · ')}</p>` : '')),
        sec(`V Bloods here${cur && bosses.some(v => v.phase === cur) ? ` · Phase ${cur}` : ''}`, chips(bossChips)),
        sec('Places', chips(places.map(locChip))),
        sec('Map', mapBlock({ pins, region: r.known ? r.key : undefined, focus, crop: !!focus, title: r.key }, 'region:' + r.key))],
    });
  }

  function rPlace(n, c, kind) {
    const pl = lxPlace(n) || {};
    const refs = mentions(n, c.def).slice(0, 4).map(m => (m.kind === 'boss' || m.kind === 'where' ? chip(m.ic, ` <small class="brc-muted">P${m.phase}</small>`) : routeNote(c, m.t, `Phase ${m.phase}:`)));
    const pins = placePts(pl).map(p => ({ p, label: n, kind: 'place' }));
    const links = str(pl.mg) ? [mgLink(H().M(idsOf(pl.mg).join(',')))] : [];
    return card(n, c, kind, {
      icon: PLACE_ICON, tags: [str(pl.region) && locChip(pl.region), pl.approx && tag('Approximate position')],
      parts: [str(pl.note) ? `<p>${esc(pl.note)}</p>` : '', sec('In this route', chips(refs.filter(h => h.startsWith('<span'))) + refs.filter(h => h.startsWith('<div')).join('')),
        sec('Map', mapBlock(pins.length ? { pins, focus: pins[0].p, crop: true, region: str(pl.region) || undefined, title: n } : null, 'place:' + n, links))],
    });
  }

  function rMaterial(n, c, kind) {
    const def = c.def, gi = gItem(n) || {}, lm = lxMat(n), gm = gMat(n) || {};
    const res = own(isObj(def.resources) ? def.resources : null, n);
    const cur = phaseNo(def, c.phase);
    // Where it comes from.
    const src = [];
    if (Array.isArray(res) && str(res[1])) src.push(`<p>${fmt(res[0]) ? `<span class="brc-ph">Phase ${fmt(res[0])}</span> ` : ''}${html(res[1])}</p>`);
    const raw = str(lm.raw) || str(gm.via) || RAW[n] || '';
    if (raw && raw !== n) src.push(`<p>Refined from ${chip(raw)}</p>`);
    if (str(lm.place)) src.push(`<p>Gathered at ${locChip(lm.place)}</p>`);
    if (str(lm.region)) src.push(`<p>Region: ${locChip(lm.region)}</p>`);
    const rw = (R(def).rewards.get(n) || [])[0];
    if (rw && !(Array.isArray(res) && findName(plain(res[1]), short(rw.boss.name)))) src.push(`<p>Recipe from ${bossTxt(bossRef(rw.boss, rw.phase))} · Phase ${rw.phase}</p>`);
    const g = gateOf(n);
    if (g) src.push(gateP(g));
    const drops = dropList(n, c);
    if (drops) src.push(`<p class="brc-muted">Drops from</p>${drops}`);
    // Made from.
    const recipe = isObj(gi.recipe) ? gi.recipe : null;
    const inputs = recipe ? arr(recipe.inputs).filter(i => Array.isArray(i) && str(i[0])).map(([m, q]) => ({ n: str(m), q: num(q) })) : [];
    const made = recipe ? (str(recipe.station) ? `<p>Craft at ${chip(recipe.station)}${fmt(recipe.time) ? ` <span class="brc-muted mono">${fmt(recipe.time)} s</span>` : ''}</p>` : '') + (inputs.length ? inputRows(inputs, c) : '') : '';
    // Needed for.
    const nd = own(isObj(def.needs) ? def.needs : null, n);
    const needRows = isObj(nd) ? Object.keys(nd).filter(p => isObj(nd[p]) && fmt(nd[p].qty)).sort((a, b) => a - b)
      .map(p => `<tr${+p === cur ? ' class="cur"' : ''}><th>Phase ${esc(p)}</th><td class="mono">×${fmt(nd[p].qty)}</td><td>${arr(nd[p].for).map(str).filter(Boolean).map(esc).join(', ')}</td></tr>`) : [];
    const used = needRows.length ? '' : chips(usedIn(n, c).map(u => chip(u)));
    const pins = matPins(n);
    const links = [];
    if (str(lm.mg)) links.push(mgLink(H().C(str(lm.mg))));
    else { const pl = str(lm.place) && lxPlace(lm.place); if (pl && str(pl.mg)) links.push(mgLink(H().M(str(pl.mg)))); }
    return card(n, c, kind, {
      sub: [str(gi.cat)], tags: [Array.isArray(res) && fmt(res[0]) && tag(`From Phase ${fmt(res[0])}`)], acc: accent(n),
      parts: [descP(gi.desc), sec('Where to get it', src.join('')), sec('Made from', made),
        sec('Needed for', needRows.length ? `<table class="brc-needs"><tbody>${needRows.join('')}</tbody></table>` : used),
        sec('Map', mapBlock(pins.length ? { pins, crop: false, title: n } : null, 'mat:' + n, links)), whySec(n, c, true)],
    });
  }

  function rStation(n, c, kind) {
    const gs = gStation(n) || {}, x = R(c.def);
    const cost = arr(gs.cost).filter(i => Array.isArray(i) && str(i[0])).map(([m, q]) => ({ n: str(m), q: num(q) }));
    const unl = [];
    const a = acquire(n, c.def);
    if (a) unl.push(acqLine(a, c.def));
    arr(gs.unlock).map(str).filter(Boolean).forEach(u => { if (!(a && a.boss && a.boss.name === u)) unl.push(x.bosses.has(u) || kindFor(u, c) === 'boss' ? `Recipe from ${ref(u)}` : esc(u)); });
    const rows = [...(x.steps.get(n) || []), ...(x.crafts.get(n) || [])].sort((p, q) => p.phase - q.phase).map(r => routeNote(c, r.t, `Phase ${r.phase}:`));
    // What this route makes here: game recipes at this station, or craft rows whose recipe names it.
    const made = [];
    for (const k of x.names) { const gi = gItem(k); if (gi && isObj(gi.recipe) && gi.recipe.station === n) made.push(k); }
    x.crafts.forEach((list, k) => { if (k !== n && !made.includes(k) && list.some(r => segment(r.t, k, false, c.def).station === n)) made.push(k); });
    return card(n, c, kind, {
      tags: [RESEARCH[n] && tag('Research')],
      parts: [descP(gs.desc), sec('Build cost', cost.length ? inputRows(cost, c) : ''), sec('Unlocked by', unl.length ? `<p>${unl.join('<br>')}</p>` : ''),
        RESEARCH[n] ? sec('Research', researchNote(n, '')) : '', sec('This route crafts here', chips(made.slice(0, 16).map(k => chip(k)))),
        sec('In this route', rows.join('')), whySec(n, c)],
    });
  }

  function rBlood(n, c, kind) {
    const gb = gBlood(n) || {};
    const tiers = arr(gb.tiers).filter(t => Array.isArray(t) && str(t[1])).map(([t, s]) => `<tr><th>Tier ${ROMAN[num(t)] || esc(t)}</th><td>${esc(s)}</td></tr>`);
    const carriers = arr(gb.carriers).map(str).filter(Boolean);
    const shared = arr(BR.shared && BR.shared.CARRIERS && own(BR.shared.CARRIERS, n)).filter(r => Array.isArray(r) && str(r[0]));
    const where = (carriers.length ? chips(carriers.map(v => chip(v))) : '')
      + (shared.length ? `<table class="brc-stats brc-carriers"><tbody>${shared.map(([reg, t]) => `<tr><th>${esc(reg)}</th><td>${esc(t)}</td></tr>`).join('')}</tbody></table>` : '');
    const notes = [];
    R(c.def).phases.forEach((p, i) => { if (isObj(p.loadout)) arr(p.loadout.kv).forEach(r => { if (Array.isArray(r) && /^blood$/i.test(str(r[0])) && findIn(plain(r[1]), n, c.def)) notes.push(routeNote(c, str(r[1]), `Phase ${i + 1}:`)); }); });
    return card(n, c, kind, {
      acc: accent(n),
      parts: [tiers.length ? sec('Blood bonuses', `<table class="brc-stats brc-tiers"><tbody>${tiers.join('')}</tbody></table>`) : '', sec('Where to find it', where + notes.slice(0, 1).join('')),
        whySec(n, c), whenSec(n, c), upgradeSec(n, c)],
    });
  }

  function rPassive(n, c, kind) {
    const P = LX().PASSIVES || {}, group = arr(P.vampire).includes(n) ? 'vampire' : 'elemental';
    const text = str(own(LD().PASSIVE_TEXT, n));
    const used = new Set();
    R(c.def).phases.forEach(p => { if (isObj(p.loadout)) loadoutNames(p.loadout).forEach(v => used.add(v)); });
    if (c.build) loadoutNames(c.build).forEach(v => used.add(v));
    const list = arr(P[group]).map(p => {
      const t = str(own(LD().PASSIVE_TEXT, p));
      return `<li class="${[used.has(p) && 'pick', p === n && 'cur'].filter(Boolean).join(' ')}">${used.has(p) ? STAR : DOT}`
        + `<span><span class="brc-ref" tabindex="0">${ic(p, 18)}<b>${esc(p)}</b></span>${t ? ` <span class="brc-muted">${esc(t)}</span>` : ''}</span></li>`;
    });
    const cost = group === 'vampire' ? `600 ${ref('Greater Stygian Shard')} per Discover` : `400 ${ref('Stygian Shard')} per Discover`;
    const slots = [];
    R(c.def).phases.forEach(p => arr(p.bosses).filter(isObj).forEach(b => { if (/passive slot/i.test(plain(b.take))) slots.push(b.name); }));
    return card(n, c, kind, {
      sub: [group === 'vampire' ? 'Vampire' : 'Elemental'], acc: accent(n),
      parts: [text ? `<p class="brc-effect">${esc(text)}</p>` : '',
        sec('How to get', `<p>Discover it at the ${ref('Altar of Stygian Awakening')}: ${cost}. Each Discover is a random ${group} passive you don't have yet.</p>`
          + (slots.length ? `<p class="brc-muted">Passive slots open after</p>${chips(slots.map(v => chip(v)))}` : '')),
        sec(`${group === 'vampire' ? 'Vampire' : 'Elemental'} passives`, `<ul class="brc-mods brc-passives">${list.join('')}</ul>${used.size && list.length ? '<p class="brc-legend">★ marks the passives this route uses.</p>' : ''}`),
        whySec(n, c), whenSec(n, c), upgradeSec(n, c)],
    });
  }

  const GLYPH_TEXT = {
    'Veil attack': 'The empowered primary attack right after a Veil. It carries the Veil\'s extra effect, so fire it before the empowerment runs out.',
    'Primary attacks': 'Your weapon\'s basic attack. It fills the gaps while spells and weapon skills are on cooldown.',
    'Crossbow shot': 'A primary crossbow shot. Shots fill every gap between spells and weapon skills.',
    'Recast': 'Cast the same ability again while its recast window is open.',
  };
  function rGlyph(n, c, kind) {
    return card(n, c, kind, { parts: [GLYPH_TEXT[n] ? `<p>${esc(GLYPH_TEXT[n])}</p>` : '', rotationSec(n, c), whySec(n, c)] });
  }

  function rUnknown(n, c, kind) {
    const gi = gItem(n) || {};
    const refs = mentions(n, c.def).slice(0, 3).map(m => routeNote(c, m.t, `Phase ${m.phase}:`)).join('');
    return card(n, c, kind, { sub: [str(gi.cat)], parts: [descP(gi.desc), sec('How to get', howToGet(n, c)), whySec(n, c), sec('In this route', refs)] });
  }

  const RENDER = { weapon: rEquip, armor: rEquip, jewelry: rEquip, jewel: rJewel, elixir: rConsumable, consumable: rConsumable, coating: rConsumable,
    blood: rBlood, passive: rPassive, veil: rAbility, spell: rAbility, ult: rAbility, 'weapon-skill': rSkill, form: rForm, ability: rForm,
    station: rStation, material: rMaterial, boss: rBoss, enemy: rEnemy, region: rRegion, place: rPlace, glyph: rGlyph, unknown: rUnknown };

  function render(name, ctx) {
    const n = str(name).trim();
    if (!n) return '';
    const c = normCtx(ctx);
    if (n in Object.prototype || n === '__proto__') return card(n, c, 'unknown', { icon: PLACE_ICON.replace('📍', '?') });
    const kind = kindFor(n, c);
    return (RENDER[kind] || rUnknown)(n, c, kind);
  }

  // ======================= DOM wiring (browsers only) =======================
  const HINT_KEY = 'bloodroute:hint';
  const OPEN_DELAY = 250, WARM_MS = 400, HIDE_DELAY = 180, LONG_PRESS = 450;
  let S = null;

  const infoEl = t => (t && t.closest ? t.closest('[data-info]') : null);
  // The icon a focused element stands for: itself, or the one icon inside it.
  function hostInfo(el) {
    if (!el || !el.matches || el.matches('input, select, textarea')) return null;
    if (el.matches('[data-info]')) return el;
    const list = el.querySelectorAll('[data-info]');
    return list.length === 1 ? list[0] : null;
  }
  const interactive = t => !!t.closest('a, label, summary, button');
  // A click on an icon, or on the caption of a chip or tile that holds one icon.
  const HOSTS = '.brc-chip, .brc-ref, .brc-rs, .tile, .slot, .portrait, .item-ic, .mat-ic';
  function clickInfo(t) {
    const a = infoEl(t);
    if (a) return a;
    const h = t && t.closest ? t.closest(HOSTS) : null;
    return h && !(S.pop.contains(h) && !h.closest('.brc-body')) ? hostInfo(h) : null;
  }

  function init(opts = {}) {
    if (typeof document === 'undefined' || !document.body) return;
    if (S) { S.opts = opts || {}; return; }
    const pop = document.createElement('div');
    pop.className = 'brc-pop';
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    pop.tabIndex = -1;
    pop.innerHTML = '<div class="brc-bar"><button type="button" class="btn small brc-back" hidden>← Back</button><span class="brc-grip" aria-hidden="true"></span>'
      + '<button type="button" class="brc-x" aria-label="Close">×</button></div><div class="brc-body"></div>';
    document.body.appendChild(pop);
    S = { opts: opts || {}, pop, body: pop.querySelector('.brc-body'), back: pop.querySelector('.brc-back'), anchor: null, name: '', ctx: null,
      stack: [], pinned: false, tOpen: 0, tHide: 0, closedAt: 0, lp: null, suppressAt: 0, raf: 0 };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', cancelPress, { passive: true });
    document.addEventListener('pointercancel', cancelPress, { passive: true });
    document.addEventListener('contextmenu', e => { if (S.lp || Date.now() - S.suppressAt < 800) { if (infoEl(e.target)) e.preventDefault(); } });
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    document.documentElement.addEventListener('mouseleave', () => { if (!S.pinned) scheduleHide(); });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', () => position(), { passive: true });
    if (window.visualViewport) for (const ev of ['resize', 'scroll']) window.visualViewport.addEventListener(ev, () => position(), { passive: true });
    if (typeof MutationObserver === 'function') new MutationObserver(() => { if (S.anchor && !S.anchor.isConnected) close(); }).observe(document.body, { childList: true, subtree: true });
    try { if (window.matchMedia && window.matchMedia('(hover: none)').matches) setTimeout(hint, 1200); } catch {}
  }

  function context(anchor) {
    const o = S.opts || {};
    let extra = null;
    try { extra = typeof o.context === 'function' ? o.context(anchor) : null; } catch { extra = null; }
    if (!isObj(extra)) {
      const ph = anchor && anchor.closest && anchor.closest('[data-phase]');
      const v = anchor && anchor.closest && anchor.closest('.view');
      extra = { phase: ph ? ph.getAttribute('data-phase') : null, view: v && v.id ? v.id.replace(/^view-/, '') : '' };
    }
    return normCtx({ ...extra, def: isObj(extra.def) ? extra.def : o.def });
  }
  function paint() {
    let h = '';
    try { S.ctx.seen = new Set(); S.ctx.flags = {}; h = render(S.name, S.ctx); } catch (err) {
      h = `<article class="brc"><header class="brc-head"><div class="brc-title"><h3>${esc(display(S.name))}</h3></div></header><p class="brc-muted">No details for this one yet.</p></article>`;
      if (window.console) console.error(err);
    }
    S.body.innerHTML = h;
    const art = S.body.firstElementChild;
    S.pop.style.setProperty('--acc', (art && art.style.getPropertyValue('--acc')) || 'var(--blood)');
    S.back.hidden = !S.stack.length;
    S.pop.setAttribute('aria-label', display(S.name));
    S.pop.scrollTop = 0;
  }
  function open(anchor, how = {}) {
    clearTimeout(S.tOpen); clearTimeout(S.tHide);
    const name = anchor.getAttribute('data-info');
    if (!name) return;
    if (S.anchor !== anchor || S.pop.hidden || S.stack.length || S.name !== name) {
      S.anchor = anchor; S.name = name; S.stack = [];
      S.ctx = context(anchor);
      paint();
      S.pop.hidden = false;
    }
    setPinned(!!how.pin || S.pinned && S.anchor === anchor);
    position();
    if (how.focus) S.pop.focus({ preventScroll: true });
  }
  function setPinned(on) { S.pinned = on; S.pop.classList.toggle('pinned', on); }
  function close() {
    if (!S) return;
    clearTimeout(S.tOpen); clearTimeout(S.tHide);
    if (S.pop.hidden) return;
    S.pop.hidden = true;
    S.anchor = null; S.stack = []; S.closedAt = Date.now();
    setPinned(false);
  }
  function swap(name) {
    if (!name || name === S.name) return;
    S.stack.push(S.name); S.name = name;
    setPinned(true); paint(); position();
  }
  function back() {
    if (!S.stack.length) return;
    S.name = S.stack.pop(); paint(); position();
  }
  function scheduleHide() {
    clearTimeout(S.tHide);
    if (!S.pop.hidden && !S.pinned) S.tHide = setTimeout(close, HIDE_DELAY);
  }
  const warm = () => !S.pop.hidden || Date.now() - S.closedAt < WARM_MS;
  function schedule(t, how) {
    clearTimeout(S.tOpen);
    S.tOpen = setTimeout(() => { if (t.isConnected) open(t, how); }, warm() ? 0 : OPEN_DELAY);
  }

  // Next to the anchor (right, else left, else below/above), inside the viewport; a bottom sheet on narrow screens.
  function position() {
    if (!S || S.pop.hidden || !S.anchor) return;
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight, m = 8, pop = S.pop;
    const sheet = vw < 640;
    pop.classList.toggle('sheet', sheet);
    // The sheet spans what's on screen, even when the page is wider than the screen.
    if (sheet) { pop.style.top = ''; pop.style.left = vv ? `${Math.round(vv.offsetLeft)}px` : ''; pop.style.width = vv ? `${Math.round(vv.width)}px` : ''; return; }
    pop.style.width = '';
    const r = S.anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    let x, y;
    if (r.right + m + w <= vw - m) { x = r.right + m; y = r.top; }
    else if (r.left - m - w >= m) { x = r.left - m - w; y = r.top; }
    else {
      x = r.left + r.width / 2 - w / 2;
      y = r.bottom + m + h <= vh - m ? r.bottom + m : r.top - m - h;
    }
    x = Math.min(Math.max(m, x), vw - w - m);
    y = Math.min(Math.max(m, y), vh - h - m);
    pop.style.left = `${Math.round(Math.max(m, x))}px`;
    pop.style.top = `${Math.round(Math.max(m, y))}px`;
  }

  function onOver(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    if (S.pop.contains(e.target)) { clearTimeout(S.tHide); return; }
    const t = infoEl(e.target);
    if (t) {
      clearTimeout(S.tHide);
      if (t === S.anchor || S.pinned) return;
      schedule(t, {});
    } else {
      clearTimeout(S.tOpen);
      scheduleHide();
    }
  }
  function onDown(e) {
    if (e.pointerType === 'mouse') return;
    const t = infoEl(e.target);
    if (!t || S.pop.contains(t)) return;
    cancelPress();
    S.lp = { t, x: e.clientX, y: e.clientY, id: setTimeout(() => { S.lp = null; S.suppressAt = Date.now(); open(t, { pin: true }); }, LONG_PRESS) };
  }
  function onMove(e) { if (S.lp && Math.hypot(e.clientX - S.lp.x, e.clientY - S.lp.y) > 10) cancelPress(); }
  function cancelPress() { if (S && S.lp) { clearTimeout(S.lp.id); S.lp = null; } }
  function onClick(e) {
    const t = e.target;
    // The click after a long-press: it opened the card, so cancel what the click would do (follow a link, tick a box).
    if (S.suppressAt && Date.now() - S.suppressAt < 800) { S.suppressAt = 0; e.preventDefault(); e.stopPropagation(); return; }
    S.suppressAt = 0;
    if (S.pop.contains(t)) {
      setPinned(true);
      if (t.closest('.brc-x')) { close(); return; }
      if (t.closest('.brc-back')) { back(); return; }
      const jump = t.closest('[data-jump]');
      if (jump) {
        const name = jump.getAttribute('data-jump'), ctx = S.ctx, fn = S.opts.onJump;
        close();
        if (typeof fn === 'function') { e.preventDefault(); e.stopPropagation(); try { fn(name, ctx); } catch (err) { if (window.console) console.error(err); } }
        return;
      }
      const link = t.closest('a[href]');
      if (link) { if ((link.getAttribute('href') || '').startsWith('#')) close(); return; }
      const inner = clickInfo(t);
      if (inner) { e.preventDefault(); swap(inner.getAttribute('data-info')); }
      return;
    }
    const a = clickInfo(t);
    // An icon inside a link, label, summary or button keeps its click; a [data-info] button (the map's "Details") opens.
    const isBtn = !!a && a.matches('button');
    if (a && (isBtn || !interactive(a))) {
      if (isBtn) e.preventDefault();
      if (S.anchor === a && S.pinned) close(); else open(a, { pin: true });
      return;
    }
    if (!S.pop.hidden && !(a && a === S.anchor)) close();
  }
  function onKey(e) {
    if (e.key === 'Escape' && !S.pop.hidden) {
      const inside = S.pop.contains(document.activeElement), a = S.anchor;
      close();
      if (inside && a && a.isConnected) { const host = a.closest('[tabindex], a, button') || a; if (host.focus) host.focus(); }
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const el = document.activeElement;
    if (!el || el === document.body) return;
    if (S.pop.contains(el)) {
      if (el.matches('a, button')) return;
      const t = hostInfo(el);
      if (t) { e.preventDefault(); swap(t.getAttribute('data-info')); }
      return;
    }
    if (el.matches('a, button, summary, label, input, select, textarea')) return;
    const t = hostInfo(el);
    if (t) { e.preventDefault(); if (S.anchor === t && S.pinned) close(); else open(t, { pin: true, focus: true }); }
  }
  function onFocus(e) {
    const el = e.target;
    if (S.pop.contains(el)) { clearTimeout(S.tHide); return; }
    const t = hostInfo(el);
    let keyboard = true;
    try { keyboard = el.matches(':focus-visible'); } catch {}
    if (t && keyboard) { if (t !== S.anchor || S.pop.hidden) schedule(t, {}); return; }
    if (!S.pinned && !S.pop.hidden) scheduleHide();
  }
  function onScroll(e) {
    if (!S || S.pop.hidden) return;
    if (e.target && e.target.nodeType === 1 && S.pop.contains(e.target)) return;
    if (!S.anchor || !S.anchor.isConnected) { close(); return; }
    if (!S.pinned) { close(); return; }
    if (!S.raf) S.raf = requestAnimationFrame(() => { S.raf = 0; position(); });
  }
  function hint() {
    let seen = true;
    try { seen = !!localStorage.getItem(HINT_KEY); if (!seen) localStorage.setItem(HINT_KEY, '1'); } catch { seen = true; }
    if (seen) return;
    const el = document.createElement('div');
    el.className = 'brc-hint';
    el.setAttribute('role', 'status');
    el.textContent = 'Long-press icons for details';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  BR.cards = { init, render, howToGet, timeline, close };
})();
