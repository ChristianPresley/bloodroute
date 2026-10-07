// Bloodroute planner state: boss ordering and filters, "up next", default open phases, which saved position to
// restore. Pure functions (no DOM, no timers), tested in test/state.test.js.
//
// Used by js/cards.js too:
//   difficulty(name, phase?) → { score: 1–5, parts: [[label, text]] } for a V Blood: its challenge rating, level against
//     the phase, power stats and attack count.
//   benefit(boss, phase, def) → { tags: ['core' | 'dps' | 'sustain' | 'progression' | 'optional'], score, why: [text] }:
//     what defeating it does for the build right away.
(() => {
  'use strict';
  const BR = window.BR;
  const G = () => window.BR_GAME || {};
  const lex = () => BR.lex;
  const vb = name => ((lex() && lex().data.VBLOOD) || {})[name] || {};
  const levelBand = s => String(s || '').split('–').map(x => (x.trim() === 'Start' ? 1 : +x.trim() || 0));
  const splitSlot = s => String(s).split(/ or /).map(x => x.trim()).filter(x => x && x !== '—');

  // ---------- Difficulty ----------
  // Median physical power of the V Bloods within 5 levels: what a boss of that level usually hits for.
  function expectedPower(lv) {
    const pw = Object.values(G().npcs || {}).filter(n => n.vblood && n.stats && Number.isFinite(n.stats.pp) && Math.abs(n.lv - lv) <= 5).map(n => n.stats.pp).sort((a, b) => a - b);
    return pw.length ? pw[Math.floor(pw.length / 2)] : null;
  }
  function difficulty(name, phase) {
    const v = vb(name), n = (G().npcs || {})[name] || {};
    const boss = phase && (phase.bosses || []).find(b => b.name === name);
    const lv = n.lv || (boss && boss.lv) || 0;
    // Against the phase's lowest-level V Blood: the one your gear is ready for when the phase begins.
    const lows = phase ? (phase.bosses || []).map(b => b.lv).filter(Number.isFinite) : [];
    const start = lows.length ? Math.min(...lows) : lv;
    let score = v.challenge || 3;
    const parts = [];
    if (v.note) parts.push(['Fight', v.note]);
    parts.push(['Challenge', `${v.challenge || 3} / 5 for its level`]);
    if (phase && lv - start >= 8) { score += 0.5; parts.push(['Level', `Lv ${lv}: ${lv - start} levels above this phase's first V Blood`]); }
    else if (lv) parts.push(['Level', `Lv ${lv}`]);
    const pp = n.stats && Number.isFinite(n.stats.pp) ? n.stats.pp : null, sp = n.stats && Number.isFinite(n.stats.sp) ? n.stats.sp : null;
    if (pp !== null) {
      const exp = expectedPower(lv);
      let rel = '';
      if (exp && pp > exp * 1.15) { score += 0.5; rel = ', hits harder than most at its level'; }
      else if (exp && pp < exp * 0.85) { score -= 0.5; rel = ', hits softer than most at its level'; }
      parts.push(['Power', `${Math.round(pp)} physical${sp !== null ? ` / ${Math.round(sp)} spell` : ''}${rel}`]);
    }
    const attacks = (n.abilities || []).length;
    if (attacks) { if (attacks >= 8) score += 0.5; parts.push(['Attacks', `${attacks} different attacks`]); }
    return { score: Math.max(1, Math.min(5, Math.round(score))), parts };
  }

  // ---------- Build benefit ----------
  const loadoutNames = l => l ? [...l.slots.flatMap(splitSlot), ...(l.gear || [])] : [];
  // Items a phase's crafting turns into loadout gear: the craft row's icon plus anything its text names in bold.
  function needsFor(item, phase) {
    const g = (G().items || {})[item];
    const out = new Set();
    if (g && g.recipe) { if (g.recipe.station) out.add(g.recipe.station); (g.recipe.inputs || []).forEach(([n]) => out.add(n)); }
    for (const c of (phase && phase.craft) || []) if (c.ic === item) (String(c.t).match(/\b[A-Z][\w' ]+/g) || []).forEach(w => out.add(w.trim()));
    return out;
  }
  const KIND_TAG = { spell: 'dps', veil: 'dps', ult: 'dps', weapon: 'dps', 'weapon-skill': 'dps', jewelry: 'dps', jewel: 'dps', passive: 'dps',
    coating: 'dps', elixir: 'dps', armor: 'sustain', blood: 'sustain', consumable: 'sustain', form: 'sustain', station: 'progression', material: 'progression' };
  function benefit(boss, phase, def) {
    const phases = (def && def.phases) || [];
    const i = phases.indexOf(phase);
    const now = new Set(loadoutNames(phase && phase.loadout)), next = new Set(loadoutNames(phases[i + 1] && phases[i + 1].loadout));
    const tags = new Set(), why = [];
    let score = 0, immediate = false;
    const kindOf = n => (lex() ? lex().kindOf(n) : 'unknown');
    for (const g of boss.gets || []) {
      let used = now.has(g) ? 'now' : next.has(g) ? 'next' : null, item = g;
      if (!used) {
        const feeds = [...now].find(x => needsFor(x, phase).has(g)) || [...next].find(x => needsFor(x, phases[i + 1]).has(g));
        if (feeds) { item = feeds; used = now.has(feeds) ? 'now' : 'next'; why.push(`${g}: needed for ${feeds}${used === 'now' ? ' this phase' : ' next phase'}`); }
      } else why.push(`${g}: in your loadout ${used === 'now' ? 'this phase' : 'next phase'}`);
      const tag = KIND_TAG[kindOf(item)] || 'progression';
      if (used) {
        immediate = immediate || used === 'now';
        tags.add(tag);
        score += (used === 'now' ? 30 : 15) + (tag === 'dps' ? 5 : 0);
      } else if (tag === 'sustain') { tags.add('sustain'); score += 6; }
      else { tags.add('progression'); score += 4; }
    }
    if (boss.must) { tags.add('core'); score += 100; }
    else { tags.add('optional'); score -= 50; }
    const over = vb(boss.name).benefit;
    if (over) over.forEach(t => tags.add(t));
    if (immediate) score += 10;
    const order = ['core', 'dps', 'sustain', 'progression', 'optional'];
    return { tags: order.filter(t => tags.has(t)), score, why, immediate };
  }

  // ---------- Boss order ----------
  const ORDERS = { level: 'Level', route: 'Most direct route', benefit: 'Most beneficial', difficulty: 'Difficulty' };
  // Where a boss can be met: its map spawns (several for Alpha), a fixed position, or nowhere fixed.
  function spotsOf(name) {
    const n = (G().npcs || {})[name], v = vb(name);
    if (v.roams && v.roams !== true && !(n && n.spawns && n.spawns.length)) return [];
    if (n && n.spawns && n.spawns.length) return n.spawns;
    return v.pos ? [v.pos] : [];
  }
  // items: the phase's boss items ({ id, boss }). Returns { ids, legs, total } — legs only for the direct route.
  function orderBosses(phase, items, mode, ctx = {}) {
    const ids = items.map(it => it.id);
    if (mode === 'route' && BR.geo && BR.geo.plan) {
      const stops = items.map(it => ({ id: it.id, lv: it.boss.lv, pts: spotsOf(it.boss.name), roams: vb(it.boss.name).roams === true }));
      const r = BR.geo.plan(stops, { start: ctx.start, waygates: G().waygates || [] });
      return { ids: r.order, legs: r.legs, total: r.total, unplaced: r.unplaced };
    }
    if (mode === 'benefit') {
      const sc = new Map(items.map(it => [it.id, benefit(it.boss, phase, ctx.def).score]));
      return { ids: ids.slice().sort((a, b) => sc.get(b) - sc.get(a) || ids.indexOf(a) - ids.indexOf(b)) };
    }
    if (mode === 'difficulty') {
      const sc = new Map(items.map(it => [it.id, difficulty(it.boss.name, phase).score]));
      return { ids: ids.slice().sort((a, b) => sc.get(a) - sc.get(b) || ids.indexOf(a) - ids.indexOf(b)) };
    }
    return { ids };
  }
  // The newest defeated boss in a phase (ticks store when they were made; old saves hold 1).
  function lastKill(items, done) {
    let best = null;
    for (const it of items) { const t = done[it.id]; if (t && t > 1 && (!best || t > done[best.id])) best = it; }
    return best;
  }
  // Region filter matches a boss whose lexicon region (or where text) names the region.
  function bossVisible(it, filters = {}) {
    if (filters.needed && !it.boss.must) return false;
    if (filters.region) {
      const r = vb(it.boss.name).region || '';
      if (r !== filters.region && !String(it.boss.where || '').includes(filters.region)) return false;
    }
    return true;
  }

  // ---------- Up next and the current phase ----------
  // Steps first, then bosses in the chosen order (skipping filtered ones), then crafting; per phase.
  function nextItem(phases, done, { orders = {}, visible = () => true } = {}) {
    for (const p of phases) {
      const steps = p.items.filter(i => i.kind === 'Step'), bosses = p.items.filter(i => i.kind === 'Boss'), craft = p.items.filter(i => i.kind === 'Craft');
      const order = orders[p.id];
      const ordered = order ? order.map(id => bosses.find(b => b.id === id)).filter(Boolean) : bosses;
      const hit = [...steps, ...ordered.filter(visible), ...craft].find(i => !done[i.id]);
      if (hit) return hit;
    }
    return null;
  }
  // Ticked / total per section (from the data, not the DOM).
  function counts(p, done) {
    const out = {};
    for (const k of ['Step', 'Boss', 'Craft']) { const l = p.items.filter(i => i.kind === k); out[k] = [l.filter(i => done[i.id]).length, l.length]; }
    return out;
  }

  // ---------- Open phases ----------
  // First visit: only the current phase is open. Later: the saved state, plus the current phase whenever it changes.
  function openPhases(phases, cur, ui) {
    const curId = phases[cur - 1] && phases[cur - 1].id;
    const saved = ui && ui.collapsed && Object.keys(ui.collapsed).length;
    const out = {};
    for (const p of phases) out[p.id] = saved ? !ui.collapsed[p.id] : p.id === curId;
    if (saved && ui.cur !== curId && curId) out[curId] = true;
    return out;
  }

  // ---------- Where to start reading ----------
  // A link with a #hash wins on a fresh visit; a reload or a return visit restores the saved position.
  function restoreMode({ hash = '', navType = 'navigate', saved = null } = {}) {
    const real = hash && !/^#map=/.test(hash);
    if (real && navType !== 'reload' && navType !== 'back_forward') return 'hash';
    if (saved && saved.anchor) return 'saved';
    return real ? 'hash' : 'none';
  }

  // Trailing-edge throttle with an injectable clock: call() schedules fn at most every `ms`; flush() runs it now.
  function throttle(fn, ms, { now = () => Date.now(), later = (f, t) => setTimeout(f, t), cancel = id => clearTimeout(id) } = {}) {
    let last = 0, timer = null;
    const run = () => { timer = null; last = now(); fn(); };
    const call = () => {
      if (timer) return;
      const wait = Math.max(0, last + ms - now());
      timer = later(run, wait);
    };
    call.flush = () => { if (timer) { cancel(timer); timer = null; } run(); };
    return call;
  }

  BR.state = { ORDERS, difficulty, benefit, spotsOf, orderBosses, lastKill, bossVisible, nextItem, counts, openPhases, restoreMode, throttle, levelBand, splitSlot };
})();
