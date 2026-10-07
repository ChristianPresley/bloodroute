// Bloodroute app: the archetype picker and the route planner (phases, next step, stockpile, endgame, reference).
// The active route is chosen by ?route=<id>, else the last route used in this browser; ?pick shows the picker.
(() => {
  'use strict';
  const { ic, tiles, M, BOSS_NAMES, slotIcon } = BR.h;
  const ARCH = BR.ARCHETYPES;
  const $ = id => document.getElementById(id);
  const ready = a => a && a.status === 'ready';

  // Anchor jumps (scroll-padding-top) and the sticky rail sit below the app bar, whose height changes as it wraps.
  const appbar = document.querySelector('.appbar');
  const syncAppbar = () => document.documentElement.style.setProperty('--appbar-h', appbar.offsetHeight + 'px');
  if (appbar) { syncAppbar(); if (window.ResizeObserver) new ResizeObserver(syncAppbar).observe(appbar); }

  const params = new URLSearchParams(location.search);
  const asked = params.get('route');
  const arch = params.has('pick') ? null
    : ready(ARCH.find(a => a.id === asked)) ? ARCH.find(a => a.id === asked)
    : !asked && ready(ARCH.find(a => a.id === BR.store.data.active)) ? ARCH.find(a => a.id === BR.store.data.active)
    : null;

  BOSS_NAMES.add('Dracula the Immortal King');
  $('crest').innerHTML = ic('Dracula the Immortal King', 40, 'crest');

  if (!arch) { showPicker(); return; }
  loadScripts(arch.files || []).then(() => BR.whenRoute(def => startRoute(arch, def))).catch(err => {
    $('view-path').innerHTML = `<div class="card"><h2>Couldn't load the ${arch.name} route</h2><p>${err.message}. <a href="?pick">Back to the archetypes</a>.</p></div>`;
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
        ${started ? `<div class="meta" style="color:var(--muted)">Phase ${s.phase}: ${s.phaseTitle} · ${s.n} / ${s.total} done</div>` : ''}
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
  }

  // ======================= Route planner =======================
  function startRoute(arch, def) {
    BR.store.setActive(arch.id);
    if (params.get('route') !== arch.id) history.replaceState(null, '', `?route=${arch.id}${location.hash}`);
    document.title = `Bloodroute · ${arch.name}`;
    $('sub').textContent = `${arch.name} route · patch ${arch.patch || '—'}`;
    const sw = $('archSwitch');
    sw.style.setProperty('--ac', arch.color);
    sw.innerHTML = `${ic(arch.icons[0], 28)}<span>${arch.name}<br><small>Change archetype</small></span>`;
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

    // ---------- State (saved per route in this browser profile) ----------
    const R = BR.store.route(arch.id);
    const done = R.done, stock = R.stock;
    const items = [];
    PHASES.forEach((p, pi) => {
      p.n = pi + 1;
      p.items = [];
      (p.steps || []).forEach((s, i) => p.items.push({ id: `${p.id}-s${i}`, kind: 'Step', text: s.t, icon: s.ic }));
      p.bosses.forEach((b, i) => p.items.push({ id: `${p.id}-b${i}`, kind: 'Boss', boss: b }));
      (p.craft || []).forEach((s, i) => p.items.push({ id: `${p.id}-c${i}`, kind: 'Craft', text: s.t, icon: s.ic }));
      p.items.forEach(it => { it.phase = p; items.push(it); });
    });
    const currentPhase = () => { const it = items.find(i => !done[i.id]); return it ? it.phase.n : PHASES.length; };
    function save() {
      const n = items.filter(i => done[i.id]).length, ph = PHASES[currentPhase() - 1];
      R.summary = { n, total: items.length, pct: items.length ? Math.round(n / items.length * 100) : 0, phase: ph.n, phaseTitle: ph.title };
      BR.store.touch(arch.id);
    }

    // ---------- Resources ----------
    const availOf = r => (RES[r] || [1])[0];
    const needIn = (r, n) => (NEEDS[r] && NEEDS[r][n] ? NEEDS[r][n].qty : 0);
    const needAfter = (r, n) => Object.entries(NEEDS[r] || {}).filter(([p]) => +p > n).reduce((s, [, v]) => s + v.qty, 0);
    const needFrom = (r, n) => Object.entries(NEEDS[r] || {}).filter(([p]) => +p >= n).reduce((s, [, v]) => s + v.qty, 0);

    // One resource row with a counter. target = how many to stockpile; chips show which phases need it.
    function resRow(r, target, fromPhase, idp = 'ph') {
      const have = stock[r] || 0;
      const chips = Object.entries(NEEDS[r]).filter(([p]) => +p >= fromPhase)
        .map(([p, v]) => `<span class="need" style="--pc:${hueOf(p)}" title="${v.for.join(', ')}">P${p} ×${v.qty}</span>`).join('');
      const pct = target ? Math.min(100, Math.round(have / target * 100)) : 100;
      return `<div class="res${have >= target ? ' full' : ''}" data-res-row="${r}" data-target="${target}">
        ${ic(r, 44)}
        <div><div class="rname">${r}</div><div class="rmeta">${chips}</div><div class="how">${(RES[r] || [0, ''])[1]}</div><div class="rbar"><i style="width:${pct}%"></i></div></div>
        <div class="counter"><button type="button" data-res="${r}" data-delta="-10" class="big" aria-label="Remove 10 ${r}">−10</button><button type="button" data-res="${r}" data-delta="-1" aria-label="Remove 1 ${r}">−</button>
        <input type="number" min="0" inputmode="numeric" id="cnt-${idp}${fromPhase}-${r.replace(/\W+/g, '')}" data-res-input="${r}" value="${have}" aria-label="${r} stockpiled">
        <button type="button" data-res="${r}" data-delta="1" aria-label="Add 1 ${r}">+</button><button type="button" data-res="${r}" data-delta="10" class="big" aria-label="Add 10 ${r}">+10</button>
        <span class="of">/ ${target}</span></div></div>`;
    }

    // Phase n: materials gatherable by now that later phases need.
    function stockSection(p) {
      const list = Object.keys(NEEDS).filter(r => availOf(r) <= p.n && needAfter(r, p.n) > 0)
        .sort((a, b) => Math.min(...Object.keys(NEEDS[a]).filter(x => +x > p.n)) - Math.min(...Object.keys(NEEDS[b]).filter(x => +x > p.n)) || a.localeCompare(b));
      if (!list.length) return '';
      const sumUp = list.filter(r => (stock[r] || 0) >= needAfter(r, p.n)).length;
      return `<details class="sec" open><summary>${ic('Greater Stygian Shard', 26, 'sec-ic')}Stock up now for later phases<span class="count" data-stockcount="${p.n}">${sumUp}/${list.length}</span></summary>
        <div class="sec-body stock"><div class="stock-intro">You can already gather these, and later phases need them. Counters are your stockpile and are shared across phases; the target is everything needed after this phase.</div>
        ${list.map(r => resRow(r, needAfter(r, p.n), p.n + 1)).join('')}</div></details>`;
    }

    // Phase n: materials this phase's crafting uses.
    function needsTiles(p) {
      const list = Object.keys(NEEDS).filter(r => needIn(r, p.n) > 0);
      if (!list.length) return '';
      return `<div><div class="dps" style="color:var(--muted);margin-bottom:8px">Materials this phase's crafting uses</div><div class="tiles qty-tiles">${list.map(r => `<span class="tile" title="${NEEDS[r][p.n].for.join(', ')}">${ic(r, 44)}<em>${r}<br><b>×${needIn(r, p.n)}</b></em></span>`).join('')}</div></div>`;
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
    const mapBtn = b => b.map ? `<a class="btn small" href="${M(b.map)}" target="_blank" rel="noopener" aria-label="Open ${b.name} on Map Genie">📍 Map</a>` : '';

    function bossCard(it) {
      const b = it.boss, c = done[it.id] ? ' checked' : '';
      return `<div class="boss${b.must ? ' must' : ''}${c}" id="row-${it.id}">
        <div class="portrait">${ic(b.name, 80)}<span class="lvb">Lv ${b.lv}</span></div>
        <label class="defeat" title="Mark defeated"><input type="checkbox" id="${it.id}" data-id="${it.id}"${c} aria-label="Defeated ${b.name}"></label>
        <div class="info">
          <div class="name">${b.name}</div>
          <div class="tools">${b.must ? '<span class="chip must">★ needed</span>' : ''}${mapBtn(b)}</div>
          ${b.where ? `<div class="where">${b.where}</div>` : ''}
          ${tiles(b.gets)}
          <div class="take">${b.take}</div>
        </div></div>`;
    }

    function itemRow(it) {
      const c = done[it.id] ? ' checked' : '';
      return `<label class="item${c}" id="row-${it.id}" for="${it.id}">${ic(it.icon, 48)}<div class="text">${it.text}</div><input type="checkbox" id="${it.id}" data-id="${it.id}"${c}></label>`;
    }

    function loadoutBlock(l) {
      const keys = ['Veil', 'Spell 1', 'Spell 2', 'Ultimate'];
      return `<div class="loadout">
        ${l.label || l.dps ? `<div class="dps">${[l.label, l.dps].filter(Boolean).join(' · ')}</div>` : ''}
        <div class="slots">${l.slots.map((s, i) => `<div class="slot">${ic(slotIcon(def.slotIcons, s), 56)}<span class="k">${keys[i]}</span><span class="v">${s}</span></div>`).join('')}</div>
        ${l.gear ? `<div><div class="dps" style="color:var(--muted);margin-bottom:8px">Gear, blood and passives</div>${tiles(l.gear)}</div>` : ''}
        ${l.kv && l.kv.length ? `<dl class="kv">${l.kv.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
      </div>`;
    }

    function phaseCard(p) {
      const sec = (title, kind, body, open = true) => {
        const list = p.items.filter(i => i.kind === kind);
        return `<details class="sec"${open ? ' open' : ''}><summary>${title}<span class="count">${list.filter(i => done[i.id]).length}/${list.length}</span></summary><div class="sec-body">${body}</div></details>`;
      };
      const steps = p.items.filter(i => i.kind === 'Step');
      const bosses = p.items.filter(i => i.kind === 'Boss');
      const craft = p.items.filter(i => i.kind === 'Craft');
      return `<article class="phase" id="${p.id}" style="--ph:${hueOf(p.n)}">
        <div class="phase-head">
          <div class="row">${ic(p.sig, 56, 'sig')}<div><span class="num">PHASE ${p.n} / ${PHASES.length}</span><h2>${p.title}</h2></div><span class="lv">Lv ${p.levels}</span></div>
          <div class="goal">${p.goal}</div>
          <div class="roster" data-roster="${p.id}">${bosses.map(it => `<a href="#row-${it.id}" class="${it.boss.must ? 'must' : ''}${done[it.id] ? ' dead' : ''}" data-rost="${it.id}" title="${it.boss.name} · Lv ${it.boss.lv}">${ic(it.boss.name, 40)}</a>`).join('')}</div>
          <div class="regions">${p.regions.map(r => `<span class="chip region">${r}</span>`).join('')}</div>
          <div class="prog"><div class="bar"><i data-bar="${p.id}"></i></div><span data-count="${p.id}" class="mono"></span></div>
        </div>
        ${p.access ? `<details class="sec" open><summary>Before you go</summary><div class="sec-body">${p.access.map(([n, a]) => `<div class="item" style="cursor:default;grid-template-columns:48px 1fr">${ic(n, 48)}<div class="text">${a}</div></div>`).join('')}</div></details>` : ''}
        ${steps.length ? sec('Do', 'Step', steps.map(itemRow).join('')) : ''}
        ${sec(`V Bloods to hunt (${bosses.length})`, 'Boss', `<div class="bosses">${bosses.map(bossCard).join('')}</div>`)}
        ${craft.length ? sec('Craft and prepare', 'Craft', needsTiles(p) + craft.map(itemRow).join('')) : ''}
        ${stockSection(p)}
        ${p.notes ? `<details class="sec"><summary>Tips</summary><div class="sec-body">${p.notes.map(n => `<div class="note">${n}</div>`).join('')}</div></details>` : ''}
        ${p.loadout ? `<details class="sec" open><summary>Loadout at the end of this phase</summary><div class="sec-body">${loadoutBlock(p.loadout)}</div></details>` : ''}
      </article>`;
    }

    function renderRail() {
      $('rail').innerHTML = PHASES.map(p => `<a class="step" href="#${p.id}" data-step="${p.id}" style="--ph:${hueOf(p.n)}">
        <span class="badge">${ic(p.sig, 44)}<b>${p.n}</b></span><span><span class="t">${p.title}</span><br><span class="l mono">Lv ${p.levels}</span><div class="bar"><i data-railbar="${p.id}"></i></div></span></a>`).join('') +
        `<div class="rail-tools"><button class="btn small" id="toggleDone" type="button">Hide done</button><span id="resetWrap"><button class="btn small" id="reset" type="button">Reset</button></span></div>`;
    }

    function renderNext() {
      const it = items.find(i => !done[i.id]);
      const el = $('next');
      if (!it) {
        const f = def.finish || { icon: 'Dracula the Immortal King', title: 'Route complete', text: '' };
        el.innerHTML = `<div class="next finished"><div class="hero">${ic(f.icon, 112)}</div><div class="body"><div class="eyebrow">Route complete</div><h2>${f.title}</h2><div class="take">${f.text}</div></div></div>`;
        return;
      }
      const p = it.phase, b = it.boss;
      const title = b ? b.name : it.kind === 'Step' ? 'Next step' : 'Next to craft';
      const body = b ? b.take : it.text;
      el.innerHTML = `<div class="next"><div class="hero">${ic(b ? b.name : it.icon, 112)}</div>
        <div class="body"><div class="eyebrow">Up next · Phase ${p.n}: ${p.title}</div>
        <h2>${title}</h2>
        <div class="meta">${b ? `<span class="chip lv">Lv ${b.lv}</span>${b.must ? '<span class="chip must">★ needed</span>' : ''}${b.where ? `<span>${b.where}</span>` : ''}` : `<span class="chip">${it.kind}</span>`}</div>
        ${b ? tiles(b.gets) : ''}
        <div class="take">${body}</div>
        <div class="actions"><button class="btn primary" type="button" data-done="${it.id}">${b ? 'Mark defeated' : 'Mark done'}</button><a class="btn" href="#row-${it.id}" data-jump="${it.id}">Show in phase</a>${b ? mapBtn(b) : ''}</div></div></div>`;
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
      });
      const pct = total ? Math.round(n / total * 100) : 0;
      $('ring').style.setProperty('--p', pct);
      $('overallPct').textContent = pct + '%';
      $('overallCount').textContent = `${n} / ${total} items`;
      $('topbar').style.width = pct + '%';
      document.querySelectorAll('details.sec > summary .count:not([data-stockcount])').forEach(el => {
        const boxes = el.closest('details').querySelectorAll('input[type=checkbox]');
        el.textContent = `${[...boxes].filter(x => x.checked).length}/${boxes.length}`;
      });
    }

    function setDone(id, val) {
      if (val) done[id] = 1; else delete done[id];
      save();
      const box = $(id); if (box) box.checked = !!val;
      const row = $('row-' + id); if (row) row.classList.toggle('checked', !!val);
      if (row && val) { row.classList.add('pop'); setTimeout(() => row.classList.remove('pop'), 700); }
      const r = document.querySelector(`[data-rost="${id}"]`); if (r) r.classList.toggle('dead', !!val);
      renderNext(); updateProgress();
      if (currentPhase() !== stockPhase) renderStockpile();
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
      const head = `<div class="card" style="--ph:${hueOf(cur)}"><h2 class="cell">${ic(PHASES[cur - 1].sig, 44)}Stockpile</h2>
        <p>You're in <b>Phase ${cur}: ${PHASES[cur - 1].title}</b>. These are the materials still needed from this phase to the end. Targets count only what's left, so they shrink as you progress. Counters are shared with the stock-up panels on the Path tab.</p>
        <div class="tiles">${now.slice(0, 18).map(r => `<span class="tile">${ic(r, 44)}<em>${r}</em></span>`).join('')}</div></div>`;
      const sections = Object.keys(groups).sort((a, b) => a - b).map(a => {
        const ph = PHASES[a - 1];
        const label = +a <= cur ? `Gatherable now (from Phase ${a}: ${ph.title})` : `Unlocks in Phase ${a}: ${ph.title}`;
        return `<div class="card" style="--ph:${hueOf(a)};border-top:4px solid ${hueOf(a)}"><h3>${label}</h3><div class="stock">${groups[a].map(r => resRow(r, needFrom(r, cur), cur, 'all')).join('')}</div></div>`;
      }).join('');
      const table = `<div class="card"><h2>Needs by phase</h2><p>Every material the route's crafting uses, by phase. The current phase is highlighted; hover a number to see what it's for.</p>
        <div class="scroll"><table class="stock-table"><thead><tr><th>Material</th><th>From</th>${PHASES.map(p => `<th style="text-align:center;color:${hueOf(p.n)}">P${p.n}</th>`).join('')}<th>Have</th></tr></thead><tbody>
        ${Object.keys(NEEDS).sort((a, b) => availOf(a) - availOf(b) || a.localeCompare(b)).map(r => `<tr><td><span class="cell">${ic(r, 32)}${r}</span></td><td class="ph">P${availOf(r)}</td>
          ${PHASES.map(p => { const v = NEEDS[r][p.n]; return `<td class="ph${p.n === cur ? ' now' : ''}${v ? ' has' : ''}" ${v ? `title="${v.for.join(', ')}"` : ''}>${v ? v.qty : '·'}</td>`; }).join('')}
          <td class="num" data-have="${r}">${stock[r] || 0}</td></tr>`).join('')}</tbody></table></div></div>`;
      $('view-stock').innerHTML = head + sections + table;
      stockPhase = cur;
    }

    // ---------- Wiring ----------
    renderRail();
    $('phases').innerHTML = PHASES.map(phaseCard).join('');
    renderNext(); updateProgress(); renderStockpile();
    for (const [view, fn] of [['endgame', def.renderEndgame], ['ref', def.renderRef]]) {
      if (fn) $('view-' + view).innerHTML = fn(); else $('tab-' + view).hidden = true;
    }
    if (BR.store.pref('hideDone')) { document.body.classList.add('hide-done'); $('toggleDone').textContent = 'Show done'; }
    if (!R.summary) save();

    document.addEventListener('change', e => {
      const id = e.target.dataset && e.target.dataset.id; if (id) setDone(id, e.target.checked);
      const r = e.target.dataset && e.target.dataset.resInput; if (r) setStock(r, e.target.value);
    });
    document.addEventListener('click', e => {
      const d = e.target.closest('[data-done]'); if (d) { setDone(d.dataset.done, true); return; }
      const sb = e.target.closest('[data-delta]');
      if (sb) { const r = sb.dataset.res; setStock(r, (stock[r] || 0) + +sb.dataset.delta); return; }
      const j = e.target.closest('[data-jump], .roster a');
      if (j) {
        const id = j.dataset.jump || j.dataset.rost;
        const row = $('row-' + id);
        if (row) { const det = row.closest('details'); if (det) det.open = true; row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1600); }
      }
      if (e.target.id === 'toggleDone') {
        const on = document.body.classList.toggle('hide-done');
        e.target.textContent = on ? 'Show done' : 'Hide done';
        BR.store.pref('hideDone', on);
      }
      if (e.target.id === 'reset') {
        $('resetWrap').innerHTML = `<span class="confirm">Clear all ticks for ${arch.name}? <button class="btn small primary" id="resetYes" type="button">Clear</button><button class="btn small" id="resetNo" type="button">Keep</button></span>`;
      }
      if (e.target.id === 'resetYes' || e.target.id === 'resetNo') {
        if (e.target.id === 'resetYes') {
          Object.keys(done).forEach(k => delete done[k]); save();
          document.querySelectorAll('[data-id]').forEach(b => { b.checked = false; const r = $('row-' + b.dataset.id); if (r) r.classList.remove('checked'); });
          document.querySelectorAll('.roster a').forEach(a => a.classList.remove('dead'));
          renderNext(); updateProgress(); renderStockpile();
        }
        $('resetWrap').innerHTML = `<button class="btn small" id="reset" type="button">Reset</button>`;
      }
    });

    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', String(x === t)));
      document.querySelectorAll('.view').forEach(v => v.hidden = v.id !== 'view-' + t.dataset.view);
      window.scrollTo({ top: 0 });
    }));

    const steps = [...document.querySelectorAll('[data-step]')];
    // When the sticky rail is taller than the screen it scrolls: keep the highlighted phase in view.
    const reveal = s => {
      const r = $('rail');
      if (!s || getComputedStyle(r).position !== 'sticky' || r.scrollHeight <= r.clientHeight) return;
      if (s.offsetTop < r.scrollTop) r.scrollTop = s.offsetTop;
      else if (s.offsetTop + s.offsetHeight > r.scrollTop + r.clientHeight) r.scrollTop = s.offsetTop + s.offsetHeight - r.clientHeight;
    };
    const activate = id => { steps.forEach(s => s.classList.toggle('active', s.dataset.step === id)); reveal(steps.find(s => s.dataset.step === id)); };
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) activate(en.target.id); });
    }, { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('.phase').forEach(p => spy.observe(p));
    const first = items.find(i => !done[i.id]);
    if (first) activate(first.phase.id);
    if (location.hash) { const t = document.querySelector(location.hash.replace(/[^\w#-]/g, '')); if (t) { syncAppbar(); t.scrollIntoView(); } }
  }
})();
