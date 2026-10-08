// Bloodroute app: the archetype picker and the route planner (phases, next step, stockpile, endgame, reference).
// The active route is chosen by ?route=<id>, else the last route used in this browser; ?pick shows the picker.
// Page HTML comes from js/view.js, ordering and "up next" from js/state.js, hover cards from js/cards.js and maps
// from js/map.js. What's open, the scroll positions and the boss order are saved per route (BR.store.ui).
(() => {
  'use strict';
  const { ic, M, BOSS_NAMES, esc } = BR.h;
  const V = BR.view, S = BR.state;
  const ARCH = BR.ARCHETYPES;
  const $ = id => document.getElementById(id);
  const ready = a => a && a.status === 'ready';
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Anchor jumps (scroll-padding-top) and the sticky rail sit below the app bar, whose height changes as it wraps.
  const appbar = document.querySelector('.appbar');
  const syncAppbar = () => document.documentElement.style.setProperty('--appbar-h', appbar.offsetHeight + 'px');
  if (appbar) { syncAppbar(); if (window.ResizeObserver) new ResizeObserver(syncAppbar).observe(appbar); }
  const barH = () => (appbar ? appbar.offsetHeight : 0) + 11;

  const params = new URLSearchParams(location.search);
  const asked = params.get('route');
  const arch = params.has('pick') ? null
    : ready(ARCH.find(a => a.id === asked)) ? ARCH.find(a => a.id === asked)
    : !asked && ready(ARCH.find(a => a.id === BR.store.data.active)) ? ARCH.find(a => a.id === BR.store.data.active)
    : null;

  BOSS_NAMES.add('Dracula the Immortal King');
  $('crest').innerHTML = ic('Dracula the Immortal King', 40, 'crest noinfo');

  // Game data (site/gamedata.js) is optional: without it the cards fall back to what the route says.
  const optional = src => new Promise(ok => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = ok; document.body.appendChild(s); });
  if (!arch) { optional('gamedata.js').then(showPicker); return; }
  optional('gamedata.js').then(() => loadScripts(arch.files || [])).then(() => BR.whenRoute(def => startRoute(arch, def))).catch(err => {
    $('view-path').innerHTML = `<div class="card"><h2>Couldn't load the ${arch.name} route</h2><p>${esc(err.message)}. <a href="?pick">Back to the archetypes</a>.</p></div>`;
  });

  function loadScripts(list) {
    return list.reduce((p, src) => p.then(() => new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error(`${src} failed to load`));
      document.body.appendChild(s);
    })), Promise.resolve());
  }

  // ======================= Archetype picker =======================
  function showPicker() {
    document.body.classList.add('picking');
    document.title = 'Bloodroute · choose your route';
    document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== 'view-pick');
    const routes = BR.store.data.routes, active = BR.store.data.active;
    const card = a => {
      const r = routes[a.id], s = r && r.summary;
      const icons = a.icons.map(n => ic(n, 52)).join('');
      if (!ready(a)) {
        return `<div class="arch soon" style="--ac:${a.color}" aria-disabled="true"><div class="top"><div class="icons">${icons}</div><span class="status chip">Coming soon</span></div>
          <h3>${a.name}</h3><p>${a.tagline}</p>
          <div class="meta"><span class="cell" style="gap:6px">${ic(a.blood, 22)}${a.blood} blood</span></div></div>`;
      }
      // Opening a route saves a summary, so only ticked items count as started.
      const started = s && s.n > 0, pct = started ? s.pct : 0;
      return `<a class="arch${a.id === active ? ' current' : ''}" href="?route=${a.id}" style="--ac:${a.color}"><div class="top"><div class="icons">${icons}</div><span class="status chip ready">${started ? (pct === 100 ? 'Complete' : 'In progress') : 'Ready'}</span></div>
        <h3>${a.name}</h3><p>${a.tagline}</p>
        <div class="meta"><span class="cell" style="gap:6px">${ic(a.blood, 22)}${a.blood} blood</span>${a.patch ? `<span class="chip">patch ${a.patch}</span>` : ''}</div>
        ${started ? `<div class="meta" style="color:var(--muted)">${s.stage ? `${esc(s.stage)} · ` : ''}Phase ${s.phase}: ${s.phaseTitle} · ${s.n} / ${s.total} done</div>` : ''}
        <div class="cta"><div class="prog" aria-label="${pct}% done"><i style="width:${pct}%"></i></div><span class="go">${started ? `${pct}% · Continue →` : 'Start this route →'}</span></div></a>`;
    };
    $('view-pick').innerHTML = `
      <div class="pick-hero"><h2>Choose your route</h2>
        <p>Pick an archetype and follow it from a fresh spawn to Dracula: the V Bloods to hunt, the gear to craft, what to stockpile early, and the endgame build.</p></div>
      <div class="archs">${ARCH.map(card).join('')}</div>
      <div class="card"><h2>Your data</h2>
        <p>Your progress and stockpile counts for each route are saved in this browser profile only. Nothing is uploaded. Private windows and clearing site data erase them, so export a backup to move to another browser or device.</p>
        <div class="data-actions"><button class="btn" type="button" id="exportData">Export backup</button>
          <label class="btn" for="importData">Import backup</label><input type="file" id="importData" accept="application/json,.json" hidden>
          <span class="msg" id="dataMsg" role="status">${BR.store.ok ? '' : 'Saving is blocked in this browser, so progress will reset when you leave.'}</span></div></div>`;
    $('exportData').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([BR.store.exportJSON()], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `bloodroute-backup-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      msg('Backup downloaded.', 'ok');
    });
    $('importData').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { BR.store.importJSON(await f.text()); msg('Backup restored.', 'ok'); setTimeout(showPicker, 600); }
      catch (err) { msg(err instanceof SyntaxError ? 'That file is not valid JSON.' : err.message, 'err'); }
      e.target.value = '';
    });
    function msg(t, kind) { const m = $('dataMsg'); m.textContent = t; m.className = 'msg ' + kind; }
    if (BR.cards && !showPicker.cards) { BR.cards.init({ def: null, context: () => ({ view: 'pick' }) }); showPicker.cards = true; }
  }

  // ======================= Route planner =======================
  function startRoute(arch, def) {
    BR.store.setActive(arch.id);
    if (params.get('route') !== arch.id) history.replaceState(history.state, '', `?route=${arch.id}${location.hash}`);
    document.title = `Bloodroute · ${arch.name}`;
    $('sub').textContent = `${arch.name} route · patch ${arch.patch || '—'}`;
    const sw = $('archSwitch');
    sw.style.setProperty('--ac', arch.color);
    sw.innerHTML = `${ic(arch.icons[0], 28, 'noinfo')}<span>${arch.name}<br><small>Change archetype</small></span>`;
    sw.hidden = false;
    $('overall').hidden = false; $('tabs').hidden = false;
    syncAppbar();

    const PHASES = def.phases;
    PHASES.forEach(p => p.bosses.forEach(b => BOSS_NAMES.add(b.name)));
    const RES = def.resources || {};
    const NEEDS = def.needs || {};

    // Region colour per phase.
    const HUES = def.hues || ['#55c46a', '#9ad44f', '#ff8a3d', '#f2c24b', '#35d0e0', '#9db4ff', '#c07bff', '#ff3d63'];
    const hueOf = n => HUES[(n - 1) % HUES.length];

    // ---------- State: progress (BR.store.route) and view (BR.store.ui) ----------
    const R = BR.store.route(arch.id);
    const done = R.done, stock = R.stock;
    const U = BR.store.ui(arch.id);
    U.filters ??= {};
    // The region filter is per phase (each phase's list has its own), so it can't empty a phase it wasn't set in.
    // Views saved by the old route-wide filter lose it, and so does a region the phase no longer has.
    U.regions ??= {};
    delete U.filters.region;
    for (const p of PHASES) if (U.regions[p.id] && !V.regionsOf(p).includes(U.regions[p.id])) delete U.regions[p.id];
    if (!S.ORDERS[U.order] || (U.order === 'route' && !(window.BR_GAME && window.BR_GAME.npcs))) U.order = 'level';
    const items = [];
    PHASES.forEach((p, pi) => {
      p.n = pi + 1;
      p.items = [];
      (p.steps || []).forEach((s, i) => p.items.push({ id: `${p.id}-s${i}`, kind: 'Step', text: s.t, icon: s.ic }));
      p.bosses.forEach((b, i) => p.items.push({ id: `${p.id}-b${i}`, kind: 'Boss', boss: b }));
      (p.craft || []).forEach((s, i) => p.items.push({ id: `${p.id}-c${i}`, kind: 'Craft', text: s.t, icon: s.ic }));
      p.items.forEach(it => { it.phase = p; items.push(it); });
    });
    const byId = new Map(items.map(it => [it.id, it]));
    const bossItems = p => p.items.filter(i => i.kind === 'Boss');
    const visible = it => it.kind !== 'Boss' || S.bossVisible(it, { ...U.filters, region: U.regions[it.phase.id] });

    // Boss order per phase. The direct route starts from the boss defeated last in the phase, else where the previous
    // phase's route ended; it's planned when the order is picked or the page opens, so rows don't jump as you tick.
    const plans = {};
    const spot = it => { const s = S.spotsOf(it.boss.name); return s && s.length ? s[0] : null; };
    function planPhase(p) {
      let start = null;
      const last = S.lastKill(bossItems(p), done);
      if (last) start = spot(last);
      else if (p.n > 1 && plans[PHASES[p.n - 2].id]) {
        const prev = plans[PHASES[p.n - 2].id].ids.map(id => byId.get(id)).filter(it => spot(it));
        if (prev.length) start = spot(prev[prev.length - 1]);
      }
      plans[p.id] = S.orderBosses(p, bossItems(p), U.order, { def, start });
    }
    const planAll = () => PHASES.forEach(planPhase);
    const orders = () => Object.fromEntries(Object.entries(plans).map(([k, v]) => [k, v.ids]));

    const nextUp = () => S.nextItem(PHASES, done, { orders: orders(), visible });
    // The phase of what's up next; with everything shown done (even if filtered-out bosses remain), the last phase.
    const currentPhase = () => { const it = nextUp(); return it ? it.phase.n : PHASES.length; };
    function save() {
      const n = items.filter(i => done[i.id]).length, ph = PHASES[currentPhase() - 1];
      R.summary = { n, total: items.length, pct: items.length ? Math.round(n / items.length * 100) : 0, phase: ph.n, phaseTitle: ph.title, stage: V.stageLabel(ph) };
      BR.store.touch(arch.id);
    }
    const saveUI = S.throttle(() => BR.store.saveUI(), 400);

    // ---------- Resources ----------
    const availOf = r => (RES[r] || [1])[0];
    const needIn = (r, n) => (NEEDS[r] && NEEDS[r][n] ? NEEDS[r][n].qty : 0);
    const needAfter = (r, n) => Object.entries(NEEDS[r] || {}).filter(([p]) => +p > n).reduce((s, [, v]) => s + v.qty, 0);
    const needFrom = (r, n) => Object.entries(NEEDS[r] || {}).filter(([p]) => +p >= n).reduce((s, [, v]) => s + v.qty, 0);

    // One resource row with a counter. target = how many to stockpile; chips show which phases need it.
    function resRow(r, target, fromPhase, idp = 'ph') {
      const have = stock[r] || 0;
      const chips = Object.entries(NEEDS[r]).filter(([p]) => +p >= fromPhase)
        .map(([p, v]) => `<span class="need" style="--pc:${hueOf(p)}" title="${esc(v.for.join(', '))}">P${p} ×${v.qty}</span>`).join('');
      const pct = target ? Math.min(100, Math.round(have / target * 100)) : 100;
      return `<div class="res${have >= target ? ' full' : ''}" data-res-row="${esc(r)}" data-target="${target}">
        <span class="mat-ic" tabindex="0">${ic(r, 44)}</span>
        <div><div class="rname">${esc(r)}</div><div class="rmeta">${chips}</div><div class="how">${V.sourceLine(r, def)}</div><div class="rbar"><i style="width:${pct}%"></i></div></div>
        <div class="counter"><button type="button" data-res="${esc(r)}" data-delta="-10" class="big" aria-label="Remove 10 ${esc(r)}">−10</button><button type="button" data-res="${esc(r)}" data-delta="-1" aria-label="Remove 1 ${esc(r)}">−</button>
        <input type="number" min="0" inputmode="numeric" id="cnt-${idp}${fromPhase}-${r.replace(/\W+/g, '')}" data-res-input="${esc(r)}" value="${have}" aria-label="${esc(r)} stockpiled">
        <button type="button" data-res="${esc(r)}" data-delta="1" aria-label="Add 1 ${esc(r)}">+</button><button type="button" data-res="${esc(r)}" data-delta="10" class="big" aria-label="Add 10 ${esc(r)}">+10</button>
        <span class="of">/ ${target}</span></div></div>`;
    }

    // Phase n: materials gatherable by now that later phases need.
    function stockSection(p) {
      const list = Object.keys(NEEDS).filter(r => availOf(r) <= p.n && needAfter(r, p.n) > 0)
        .sort((a, b) => Math.min(...Object.keys(NEEDS[a]).filter(x => +x > p.n)) - Math.min(...Object.keys(NEEDS[b]).filter(x => +x > p.n)) || a.localeCompare(b));
      if (!list.length) return '';
      const key = `${p.id}:stock`, o = U.sections[key] === undefined ? true : U.sections[key];
      const sumUp = list.filter(r => (stock[r] || 0) >= needAfter(r, p.n)).length;
      return `<details class="sec" data-sec="${key}"${o ? ' open' : ''}><summary>${ic('Greater Stygian Shard', 26, 'sec-ic noinfo')}Stock up now for later phases<span class="count" data-stockcount="${p.n}">${sumUp}/${list.length}</span></summary>
        <div class="sec-body stock"><div class="stock-intro">You can already gather these, and later phases need them. Counters are your stockpile and are shared across phases; the target is everything needed after this phase.</div>
        ${list.map(r => resRow(r, needAfter(r, p.n), p.n + 1)).join('')}</div></details>`;
    }

    function updateStockUI(r) {
      const have = stock[r] || 0;
      document.querySelectorAll(`[data-res-input="${CSS.escape(r)}"]`).forEach(inp => { if (+inp.value !== have) inp.value = have; });
      document.querySelectorAll(`[data-res-row="${CSS.escape(r)}"]`).forEach(row => {
        const t = +row.dataset.target; const pct = t ? Math.min(100, Math.round(have / t * 100)) : 100;
        row.querySelector('.rbar i').style.width = pct + '%'; row.classList.toggle('full', have >= t);
      });
      document.querySelectorAll(`[data-have="${CSS.escape(r)}"]`).forEach(c => c.textContent = have);
      PHASES.forEach(p => {
        const el = document.querySelector(`[data-stockcount="${p.n}"]`); if (!el) return;
        const rows = el.closest('details').querySelectorAll('[data-res-row]');
        el.textContent = `${[...rows].filter(x => x.classList.contains('full')).length}/${rows.length}`;
      });
    }
    function setStock(r, v) { stock[r] = Math.max(0, Math.floor(+v || 0)); save(); updateStockUI(r); }

    // ---------- Rendering ----------
    const ctx = () => ({ def, phases: PHASES, done, stock, ui: U, order: U.order, filters: U.filters, regions: U.regions, plans, hueOf, open, stockSection });
    let open = {};
    function renderPhases() {
      $('rail').innerHTML = V.rail(ctx());
      $('phases').innerHTML = PHASES.map(p => V.phaseCard(p, ctx())).join('');
      decorate($('phases'));
      applyFilters();
    }
    // Just the boss list, toolbar and roster of every phase (after the order or a filter changes).
    function renderBosses() {
      const c = ctx();
      for (const p of PHASES) {
        const body = document.querySelector(`[data-sec="${p.id}:Boss"] > .sec-body`);
        const ordered = plans[p.id].ids.map(id => byId.get(id));
        if (body) body.innerHTML = V.bossToolbar(p, c) + `<div class="bosses" data-bosses="${p.id}">${ordered.map(it => V.bossCard(it, c)).join('')}</div>`;
        const roster = document.querySelector(`[data-roster="${p.id}"]`);
        if (roster) roster.innerHTML = ordered.map(it => `<a href="#row-${it.id}" class="${it.boss.must ? 'must' : ''}${done[it.id] ? ' dead' : ''}" data-rost="${it.id}" aria-label="${esc(it.boss.name)} · Lv ${it.boss.lv}">${ic(it.boss.name, 40)}</a>`).join('');
        if (body) decorate(body);
      }
      applyFilters(); renderNext(); updateProgress();
    }
    // Filters hide boss cards (and their roster icons); the rows stay in the page, so ticks and ids never move.
    function applyFilters() {
      for (const it of items) if (it.kind === 'Boss') {
        const show = visible(it);
        const row = $('row-' + it.id); if (row) row.classList.toggle('filtered', !show);
        const r = document.querySelector(`[data-rost="${it.id}"]`); if (r) r.classList.toggle('filtered', !show);
      }
    }
    // Map Genie links in route text name a place: give them that place's hover card.
    const placeByMg = (() => {
      const out = new Map();
      for (const [name, pl] of Object.entries((BR.lex.data && BR.lex.data.PLACES) || {})) if (pl.mg) out.set(String(pl.mg), name);
      return out;
    })();
    function decorate(root) {
      root.querySelectorAll('a[data-mg]:not([data-info])').forEach(a => { const n = placeByMg.get(a.dataset.mg); if (n) a.dataset.info = n; });
    }

    function renderNext() {
      const it = nextUp();
      const el = $('next');
      if (!it) {
        const f = def.finish || { icon: 'Dracula the Immortal King', title: 'Route complete', text: '' };
        el.innerHTML = `<div class="next finished"><div class="hero">${ic(f.icon, 112)}</div><div class="body"><div class="eyebrow">Route complete</div><h2>${f.title}</h2><div class="take">${f.text}</div></div></div>`;
        return;
      }
      const p = it.phase, b = it.boss;
      const title = b ? b.name : it.kind === 'Step' ? 'Next step' : 'Next to craft';
      const body = b ? b.take : it.text;
      const mapBtns = b ? `<a class="btn" href="${BR.map.href('boss:' + b.name)}">📍 Map</a>${b.map ? `<a class="btn ghost" href="${M(b.map)}" target="_blank" rel="noopener" data-mg="${b.map}">Map Genie ↗</a>` : ''}` : '';
      el.innerHTML = `<div class="next" data-phase="${p.id}"><div class="hero">${ic(b ? b.name : it.icon, 112)}</div>
        <div class="body split"><div class="lead"><div class="eyebrow">Up next · ${esc(V.stageLabel(p))} · Phase ${p.n}: ${p.title}</div>
        <h2>${title}</h2>
        <div class="meta">${b ? `<span class="chip lv">Lv ${b.lv}</span>${b.must ? '<span class="chip must">★ needed</span>' : ''}${b.where ? `<span>${b.where}</span>` : ''}` : `<span class="chip">${it.kind}</span>`}</div>
        ${b ? V.rewardTiles(b.gets) : ''}</div>
        <div class="what"><div class="take">${body}</div>
        <div class="actions"><button class="btn primary" type="button" data-done="${it.id}">${b ? 'Mark defeated' : 'Mark done'}</button><a class="btn" href="#row-${it.id}" data-jump-id="${it.id}">Show in phase</a>${mapBtns}</div></div></div></div>`;
      decorate(el);
    }

    function updateProgress() {
      let total = 0, n = 0;
      PHASES.forEach(p => {
        const t = p.items.length, d = p.items.filter(i => done[i.id]).length;
        total += t; n += d;
        const pct = t ? Math.round(d / t * 100) : 0;
        document.querySelectorAll(`[data-bar="${p.id}"], [data-railbar="${p.id}"]`).forEach(b => b.style.width = pct + '%');
        const c = document.querySelector(`[data-count="${p.id}"]`); if (c) c.textContent = `${d} / ${t} done`;
        const s = document.querySelector(`[data-step="${p.id}"]`); if (s) s.classList.toggle('done', d === t);
        const cnt = S.counts(p, done);
        for (const [k, [dd, tt]] of Object.entries(cnt)) { const el = document.querySelector(`[data-seccount="${p.id}:${k}"]`); if (el) el.textContent = `${dd}/${tt}`; }
      });
      const pct = total ? Math.round(n / total * 100) : 0;
      $('ring').style.setProperty('--p', pct);
      $('overallPct').textContent = pct + '%';
      $('overallCount').textContent = `${n} / ${total} items`;
      $('topbar').style.width = pct + '%';
    }

    function setDone(id, val) {
      if (val) done[id] = Date.now(); else delete done[id];
      save();
      const box = $(id); if (box) box.checked = !!val;
      const row = $('row-' + id); if (row) row.classList.toggle('checked', !!val);
      if (row && val) { row.classList.add('pop'); setTimeout(() => row.classList.remove('pop'), 700); }
      const r = document.querySelector(`[data-rost="${id}"]`); if (r) r.classList.toggle('dead', !!val);
      renderNext(); updateProgress();
      const cur = currentPhase();
      if (cur !== stockPhase) renderStockpile();
      if (PHASES[cur - 1].id !== U.cur) { U.cur = PHASES[cur - 1].id; setOpen(U.cur, true); }
    }

    // ---------- Open and closed phases ----------
    function setOpen(id, on, persist = true) {
      open[id] = on;
      const art = $(id); if (!art) return;
      art.classList.toggle('collapsed', !on);
      const btn = art.querySelector('[data-toggle-phase]'); if (btn) btn.setAttribute('aria-expanded', String(on));
      const body = art.querySelector('.phase-body');
      if (body) { if (on) body.removeAttribute('hidden'); else body.setAttribute('hidden', 'until-found'); }
      if (persist) { U.collapsed = Object.fromEntries(PHASES.map(p => [p.id, !open[p.id]])); saveUI(); }
    }
    // Shows an element wherever it is: opens its phase and section, un-hides it, then scrolls to it.
    function reveal(el, { flash = true, smooth = true } = {}) {
      if (!el) return;
      const art = el.closest('.phase'); if (art && !open[art.id]) setOpen(art.id, true);
      let d = el.closest('details'); while (d) { d.open = true; d = d.parentElement && d.parentElement.closest('details'); }
      if (el.classList.contains('filtered')) { U.filters = {}; if (art) delete U.regions[art.id]; saveUI(); renderBosses(); el = $(el.id) || el; }
      if (document.body.classList.contains('hide-done') && el.classList.contains('checked')) el.classList.add('force-show');
      const top = el.getBoundingClientRect().top + scrollY - barH();
      scrollTo({ top, behavior: smooth ? 'smooth' : 'instant' });
      if (flash) { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); }
    }

    // ---------- Stockpile tab ----------
    let stockPhase = 0;
    function renderStockpile() {
      const cur = currentPhase();
      const res = Object.keys(NEEDS).filter(r => needFrom(r, cur) > 0);
      if (!Object.keys(NEEDS).length) { $('view-stock').innerHTML = `<div class="card"><h2>Stockpile</h2><p>This route has no material list yet.</p></div>`; stockPhase = cur; return; }
      const groups = {};
      res.forEach(r => (groups[availOf(r)] ??= []).push(r));
      const now = res.filter(r => availOf(r) <= cur);
      const c = ctx();
      const head = `<div class="card" style="--ph:${hueOf(cur)}"><h2 class="cell">${ic(PHASES[cur - 1].sig, 44, 'noinfo')}Stockpile</h2>
        <p>You're in <b>Phase ${cur}: ${PHASES[cur - 1].title}</b> (${esc(V.stageLabel(PHASES[cur - 1]))}). These are the materials still needed from this phase to the end. Targets count only what's left, so they shrink as you progress. Counters are shared with the stock-up panels on the Path tab.</p>
        <div class="mats">${now.slice(0, 18).map(r => V.matRow(r, 0, c)).join('')}</div></div>`;
      const sections = Object.keys(groups).sort((a, b) => a - b).map(a => {
        const ph = PHASES[a - 1];
        const label = +a <= cur ? `Gatherable now (from Phase ${a}: ${ph.title})` : `Unlocks in Phase ${a}: ${ph.title}`;
        return `<div class="card" style="--ph:${hueOf(a)};border-top:4px solid ${hueOf(a)}"><h3>${label}</h3><div class="stock">${groups[a].map(r => resRow(r, needFrom(r, cur), cur, 'all')).join('')}</div></div>`;
      }).join('');
      const table = `<div class="card"><h2>Needs by phase</h2><p>Every material the route's crafting uses, by phase. The current phase is highlighted; hover a number to see what it's for, or a material for where to get it.</p>
        <div class="scroll"><table class="stock-table"><thead><tr><th>Material</th><th>Where</th><th>From</th>${PHASES.map(p => `<th style="text-align:center;color:${hueOf(p.n)}">P${p.n}</th>`).join('')}<th>Have</th></tr></thead><tbody>
        ${Object.keys(NEEDS).sort((a, b) => availOf(a) - availOf(b) || a.localeCompare(b)).map(r => `<tr><td><span class="cell">${ic(r, 32)}${esc(r)}</span></td><td class="where">${V.mapLinks(r, (RES[r] || [])[1]) || '<span class="muted">—</span>'}</td><td class="ph">P${availOf(r)}</td>
          ${PHASES.map(p => { const v = NEEDS[r][p.n]; return `<td class="ph${p.n === cur ? ' now' : ''}${v ? ' has' : ''}" ${v ? `title="${esc(v.for.join(', '))}"` : ''}>${v ? v.qty : '·'}</td>`; }).join('')}
          <td class="num" data-have="${esc(r)}">${stock[r] || 0}</td></tr>`).join('')}</tbody></table></div></div>`;
      $('view-stock').innerHTML = head + sections + table;
      decorate($('view-stock'));
      stockPhase = cur;
    }

    // ---------- Saved position ----------
    const view = () => (document.querySelector('.tab[aria-selected="true"]') || {}).dataset?.view || 'path';
    // The anchor is the innermost phase, section or row crossing the top of the screen (else the next one below),
    // with how far it's scrolled past.
    const ANCHORS = '.phase, details.sec[data-sec], [id^="row-"]';
    function anchorNow() {
      const line = barH();
      let above = null, below = null;
      for (const el of document.querySelectorAll(`#phases :is(${ANCHORS})`)) {
        if (!el.offsetParent) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom <= line) continue;
        if (r.top <= line + 2) { if (!above || r.top >= above.r.top) above = { el, r }; }
        else if (!below || r.top < below.r.top) below = { el, r };
      }
      const best = above || below;
      if (!best) return null;
      const el = best.el;
      return { anchor: el.id ? '#' + el.id : `[data-sec="${el.dataset.sec}"]`, offset: Math.round(line - best.r.top) };
    }
    function remember() {
      const v = view();
      if (v === 'path') { const a = anchorNow(); if (a) U.scroll.path = a; }
      else U.scroll[v] = { y: Math.round(scrollY) };
      const rail = $('rail'); if (rail) U.rail = rail.scrollTop;
      saveUI();
    }
    let userScrolled = false;
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(t => addEventListener(t, () => { userScrolled = true; }, { passive: true, once: true }));
    function restore(v = 'path') {
      const s = U.scroll[v];
      if (!s) return false;
      if (v !== 'path') { scrollTo({ top: s.y || 0, behavior: 'instant' }); return true; }
      let el = s.anchor && document.querySelector(s.anchor), offset = s.offset || 0;
      // A hidden anchor (collapsed phase, filtered boss): go to its phase's header instead, without the old offset.
      if (el && !el.offsetParent) { el = el.closest('.phase') || el; offset = 0; }
      if (!el) return false;
      scrollTo({ top: el.getBoundingClientRect().top + scrollY - barH() + offset, behavior: 'instant' });
      return true;
    }

    // ---------- First render ----------
    planAll();
    const cur0 = currentPhase();
    open = S.openPhases(PHASES, cur0, U);
    U.cur = PHASES[cur0 - 1].id;
    U.collapsed = Object.fromEntries(PHASES.map(p => [p.id, !open[p.id]]));
    renderPhases(); renderNext(); updateProgress(); renderStockpile();
    for (const [v, fn] of [['endgame', def.renderEndgame], ['ref', def.renderRef]]) {
      if (fn) { $('view-' + v).innerHTML = fn(); decorate($('view-' + v)); } else $('tab-' + v).hidden = true;
    }
    if (BR.store.pref('hideDone')) { document.body.classList.add('hide-done'); $('toggleDone').textContent = 'Show done'; }
    if (!R.summary) save();
    BR.store.saveUI();
    if (U.rail) $('rail').scrollTop = U.rail;

    // Hover cards: the context is the phase an icon sits in (or the endgame build on the Endgame tab).
    BR.cards.init({
      def,
      context: el => {
        const ph = el && el.closest('[data-phase]');
        const v = view();
        return { def, phase: ph ? PHASES.find(p => p.id === ph.dataset.phase) : v === 'endgame' ? PHASES[PHASES.length - 1] : null, view: v };
      },
      onJump: name => jumpToBoss(name),
    });
    function jumpToBoss(name) {
      const it = items.find(i => i.boss && i.boss.name === name);
      if (it) { selectTab('path'); reveal($('row-' + it.id)); }
    }

    // Maps: '#map=phase:<id>' shows a phase's bosses in the chosen order, with the route when it's the direct one.
    BR.map.resolve(spec => {
      const m = /^(phase|route):(\w+)$/.exec(spec);
      if (!m) return null;
      const p = PHASES.find(x => x.id === m[2]); if (!p) return null;
      const plan = plans[p.id], route = U.order === 'route';
      const pins = plan.ids.map(id => byId.get(id)).map((it, i) => {
        const leg = plan.legs && plan.legs[it.id];
        const at = (leg && leg.to) || spot(it);
        return at && { p: at, label: `${it.boss.name} · Lv ${it.boss.lv}`, kind: 'boss', icon: it.boss.name, n: route ? i + 1 : undefined, done: !!done[it.id] };
      }).filter(Boolean);
      // The route line: walk to each boss; a waygate hop walks to the gate, lifts the pen (null) and starts at the other gate.
      let path = null;
      if (route && plan.legs) {
        path = [];
        plan.ids.forEach((id, i) => {
          const leg = plan.legs[id]; if (!leg) return;
          if (i === 0 && leg.from) path.push(leg.from);
          if (leg.via) path.push(leg.via[0], null, leg.via[1]);
          path.push(leg.to);
        });
      }
      return { title: `Phase ${p.n}: ${p.title} · ${route ? 'most direct route' : 'V Bloods'}`, pins, path, waygates: route, focus: null };
    });

    // ---------- Events ----------
    document.addEventListener('change', e => {
      const t = e.target, d = t.dataset || {};
      if (d.id) setDone(d.id, t.checked);
      if (d.resInput) setStock(d.resInput, t.value);
      if (d.filter === 'region') {
        const regions = { ...U.regions };
        if (t.value) regions[d.regionPhase] = t.value; else delete regions[d.regionPhase];
        U.regions = regions;
        saveUI(); renderBosses();
      } else if (d.filter) {
        U.filters = { ...U.filters, [d.filter]: t.type === 'checkbox' ? t.checked : t.value };
        saveUI(); renderBosses();
      }
    });
    // Sections that render open fire 'toggle' too, so only a click on a section's heading is saved.
    document.addEventListener('click', e => {
      const sum = e.target.closest('details.sec[data-sec] > summary'); if (!sum) return;
      const d = sum.parentElement;
      setTimeout(() => { U.sections[d.dataset.sec] = d.open; saveUI(); });
    });
    document.addEventListener('beforematch', e => { const art = e.target.closest('.phase'); if (art) setOpen(art.id, true); }, true);
    document.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('a[href^="#map="]')) return;   // js/map.js opens in-app map links
      const d = t.closest('[data-done]'); if (d) { setDone(d.dataset.done, true); return; }
      const sb = t.closest('[data-delta]');
      if (sb) { const r = sb.dataset.res; setStock(r, (stock[r] || 0) + +sb.dataset.delta); return; }
      const tog = t.closest('[data-toggle-phase]'); if (tog) { setOpen(tog.dataset.togglePhase, !open[tog.dataset.togglePhase]); return; }
      const ord = t.closest('[data-order]');
      if (ord && !ord.disabled) { U.order = ord.dataset.order; saveUI(); planAll(); renderBosses(); return; }
      const rp = t.closest('[data-replan]'); if (rp) { planPhase(PHASES.find(p => p.id === rp.dataset.replan)); renderBosses(); return; }
      const rm = t.closest('[data-route-map]'); if (rm) { BR.map.follow(BR.map.href('phase:' + rm.dataset.routeMap)); return; }
      const jb = t.closest('[data-jump]'); if (jb) { e.preventDefault(); jumpToBoss(jb.dataset.jump); return; }
      // Rail steps, roster icons and "Show in phase" open what they point at instead of jumping to a closed phase.
      const step = t.closest('[data-step]');
      if (step) { e.preventDefault(); const art = $(step.dataset.step); if (art && !open[art.id]) setOpen(art.id, true); reveal(art, { flash: false }); return; }
      const j = t.closest('[data-jump-id], .roster a');
      if (j) { e.preventDefault(); reveal($('row-' + (j.dataset.jumpId || j.dataset.rost))); return; }
      if (t.id === 'collapseAll' || t.id === 'expandAll') { PHASES.forEach(p => setOpen(p.id, t.id === 'expandAll')); return; }
      if (t.id === 'focusCur') { const c = PHASES[currentPhase() - 1].id; PHASES.forEach(p => setOpen(p.id, p.id === c)); reveal($(c), { flash: false }); return; }
      if (t.id === 'toggleDone') {
        const on = document.body.classList.toggle('hide-done');
        t.textContent = on ? 'Show done' : 'Hide done';
        document.querySelectorAll('.force-show').forEach(x => x.classList.remove('force-show'));
        BR.store.pref('hideDone', on);
      }
      if (t.id === 'reset') {
        $('resetWrap').innerHTML = `<span class="confirm">Clear all ticks for ${arch.name}? <button class="btn small primary" id="resetYes" type="button">Clear</button><button class="btn small" id="resetNo" type="button">Keep</button></span>`;
      }
      if (t.id === 'resetYes' || t.id === 'resetNo') {
        if (t.id === 'resetYes') {
          Object.keys(done).forEach(k => delete done[k]); save();
          planAll(); renderBosses();
          document.querySelectorAll('[data-id]').forEach(b => { b.checked = false; const r = $('row-' + b.dataset.id); if (r) r.classList.remove('checked'); });
          document.querySelectorAll('.roster a').forEach(a => a.classList.remove('dead'));
          const c = PHASES[currentPhase() - 1].id; PHASES.forEach(p => setOpen(p.id, p.id === c));
          renderNext(); updateProgress(); renderStockpile();
        }
        $('resetWrap').innerHTML = `<button class="btn small" id="reset" type="button">Reset</button>`;
      }
    });

    // keep: false when reopening the saved tab on load, before the Path view has been placed (its position is still unread).
    function selectTab(v, keep = true) {
      if (view() === v) return;
      if (keep) remember();
      document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x.dataset.view === v)));
      document.querySelectorAll('.view').forEach(x => x.hidden = x.id !== 'view-' + v);
      U.tab = v; saveUI();
      if (!restore(v)) scrollTo({ top: 0, behavior: 'instant' });
    }
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => selectTab(t.dataset.view)));

    // Rail highlight: the last phase whose header is above 40% of the screen. Also saves the reading position.
    const steps = [...document.querySelectorAll('[data-step]')];
    const revealStep = s => {
      const r = $('rail');
      if (!s || getComputedStyle(r).position !== 'sticky' || r.scrollHeight <= r.clientHeight) return;
      if (s.offsetTop < r.scrollTop) r.scrollTop = s.offsetTop;
      else if (s.offsetTop + s.offsetHeight > r.scrollTop + r.clientHeight) r.scrollTop = s.offsetTop + s.offsetHeight - r.clientHeight;
    };
    let activeId = null;
    const activate = id => {
      if (id === activeId) return; activeId = id;
      steps.forEach(s => s.classList.toggle('active', s.dataset.step === id)); revealStep(steps.find(s => s.dataset.step === id));
    };
    const spy = () => {
      const line = innerHeight * 0.4;
      let cur = PHASES[0].id;
      for (const p of PHASES) { const el = $(p.id); if (el && el.getBoundingClientRect().top <= line) cur = p.id; }
      activate(cur);
    };
    const keep = S.throttle(remember, 400);
    let raf = 0;
    addEventListener('scroll', () => { keep(); if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (view() === 'path') spy(); }); }, { passive: true });
    $('rail').addEventListener('scroll', keep, { passive: true });
    addEventListener('pagehide', () => { remember(); keep.flush(); saveUI.flush(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { remember(); keep.flush(); saveUI.flush(); } });

    // Another tab ticked something: take its progress and redraw the ticks.
    addEventListener('storage', e => {
      if (e.key !== BR.store.KEY || !BR.store.reload()) return;
      document.querySelectorAll('[data-id]').forEach(b => { const on = !!done[b.dataset.id]; b.checked = on; const r = $('row-' + b.dataset.id); if (r) r.classList.toggle('checked', on); });
      document.querySelectorAll('[data-rost]').forEach(a => a.classList.toggle('dead', !!done[a.dataset.rost]));
      for (const r of Object.keys(stock)) updateStockUI(r);
      renderNext(); updateProgress(); renderStockpile();
    });

    // Where to start: a #link on a fresh visit, else the saved tab and position, else the current phase.
    if (U.tab && U.tab !== 'path' && !$('tab-' + U.tab).hidden) selectTab(U.tab, false);
    const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0] || {}).type || 'navigate';
    const mode = S.restoreMode({ hash: location.hash, navType: nav, saved: U.scroll.path });
    const place = () => {
      if (/^#map=/.test(location.hash)) return;
      if (view() !== 'path') { restore(view()); return; }
      if (mode === 'hash') {
        const target = document.querySelector(location.hash.replace(/[^\w#-]/g, ''));
        if (target) { syncAppbar(); reveal(target, { smooth: false, flash: target.id.startsWith('row-') }); }
        history.replaceState(history.state, '', location.pathname + location.search);
      } else if (mode === 'saved') restore('path');
      else if (cur0 > 1) reveal($(PHASES[cur0 - 1].id), { smooth: false, flash: false });
      spy();
    };
    place();
    // Fonts can reflow the page once they arrive: place it again, unless the reader has moved since.
    const placedY = scrollY;
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!userScrolled && Math.abs(scrollY - placedY) < 2) place(); });
    if (/^#map=/.test(location.hash)) BR.map.follow(location.hash);   // js/map.js follows later hash changes itself
    activate(PHASES[cur0 - 1].id); spy();
  }
})();
