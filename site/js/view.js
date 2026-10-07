// Bloodroute views: the HTML builders for the route planner (phase cards, boss cards, loadout containers, rotation
// strips, material sources). Pure functions of the route data and saved state; js/app.js wires them up.
// ctx: { def, phases, done, stock, ui, order, filters, plans: { [phaseId]: { ids, legs } }, hueOf }
(() => {
  'use strict';
  const BR = window.BR;
  const h = () => BR.h;
  const L = () => BR.lex;
  const esc = s => BR.h.esc(s);
  const G = () => window.BR_GAME || {};
  const STAGE_BY_PHASE = ['Beginning', 'Beginning', 'Early', 'Early', 'Mid', 'Mid', 'Late', 'End'];
  const stageOf = p => p.stage || STAGE_BY_PHASE[(p.n || 1) - 1] || 'End';
  const stageLabel = p => (L().STAGES || {})[stageOf(p)] || stageOf(p);

  // ---------- Small pieces ----------
  const regionName = r => String(r).replace(/\s*\(.*\)\s*$/, '');
  const regionNote = r => (String(r).match(/\((.*)\)\s*$/) || [])[1] || '';
  // A region as a focusable location chip; its hover card shows the map.
  const regionChip = r => `<span class="chip region" tabindex="0" data-info="${esc(regionName(r))}">📍 ${esc(regionName(r))}${regionNote(r) ? ` <small>(${esc(regionNote(r))})</small>` : ''}</span>`;
  const mapHref = spec => (BR.map && BR.map.href ? BR.map.href(spec) : '#map=' + encodeURIComponent(spec));
  const mats = () => (L().data && L().data.MATERIALS) || {};
  const hasMap = r => !!((G().mats && G().mats[r] && (G().mats[r].layers || []).length) || (mats()[r] && (mats()[r].layer || mats()[r].place)));
  // In-app map link plus the Map Genie layer, when the material has either.
  function mapLinks(r, how = '') {
    const out = [];
    if (hasMap(r)) out.push(`<a class="maplink" href="${mapHref('mat:' + r)}" aria-label="Show where to find ${esc(r)} on the map">📍 Map</a>`);
    const mg = mats()[r] && mats()[r].mg;
    if (mg && !String(how).includes(`catIds=${mg}`)) out.push(`<a class="maplink ext" href="${h().C(mg)}" target="_blank" rel="noopener" data-cat="${mg}">Map Genie ↗</a>`);
    return out.join('');
  }
  // Where a material comes from: the route's note, plus map links.
  function sourceLine(r, def) {
    const how = ((def.resources || {})[r] || [])[1] || '';
    const fallback = !how && mats()[r] ? [mats()[r].raw && `From ${esc(mats()[r].raw)}`, mats()[r].region && esc(mats()[r].region)].filter(Boolean).join(' · ') : '';
    const links = mapLinks(r, how);
    return how || fallback || links ? `<span class="src">${how || fallback}${links ? ` <span class="src-links">${links}</span>` : ''}</span>` : '';
  }
  // Groups of names by category, in the order the categories first appear.
  function groupBy(names, groups) {
    const out = new Map();
    for (const n of names) {
      const key = L().containerOf(L().kindOf(n), groups);
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(n);
    }
    return [...out].map(([k, list]) => [groups.find(g => g[0] === k), list]);
  }
  const REWARD_GROUPS = [['abilities', 'Abilities', ['veil', 'spell', 'ult', 'form', 'ability', 'weapon-skill', 'passive']],
    ['gear', 'Gear & recipes', ['weapon', 'armor', 'jewelry', 'jewel', 'elixir', 'consumable', 'coating']],
    ['castle', 'Stations & materials', []]];
  function rewardTiles(gets) {
    if (!gets || !gets.length) return '';
    return `<div class="rewards">${groupBy(gets, REWARD_GROUPS).map(([[, label], list]) =>
      `<div class="rgrp"><span class="rgrp-h">${label}</span>${h().tiles(list)}</div>`).join('')}</div>`;
  }

  // ---------- Boss cards ----------
  const TAG_LABEL = { core: '★ Core', dps: '+DPS', sustain: 'Sustain', progression: 'Progression', optional: 'Optional' };
  function pips(score) { return `<span class="pips" title="Difficulty ${score} of 5" aria-label="Difficulty ${score} of 5">${'<i class="on"></i>'.repeat(score)}${'<i></i>'.repeat(5 - score)}</span>`; }
  const metres = d => d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d / 10) * 10} m`;
  function bossCard(it, ctx) {
    const b = it.boss, c = ctx.done[it.id] ? ' checked' : '';
    const phase = it.phase, plan = ctx.plans[phase.id];
    const v = (L().data.VBLOOD || {})[b.name] || {};
    const ben = BR.state.benefit(b, phase, ctx.def), dif = BR.state.difficulty(b.name, phase);
    const pos = plan && ctx.order === 'route' ? plan.ids.indexOf(it.id) : -1;
    const leg = plan && plan.legs && plan.legs[it.id];
    const legText = ctx.order === 'route' ? (leg ? `<div class="leg">${pos + 1}. ${!leg.from ? 'Start here' : metres(leg.d) + (pos === 0 ? ' from your last kill' : ' from the last boss')}${leg.via ? ' · via waygate' : ''}</div>`
      : (plan && plan.unplaced || []).includes(it.id) ? `<div class="leg">No fixed spot: ${esc(v.roams && v.roams !== true ? v.roams : 'it roams')}, so fit it in when you meet it</div>` : '') : '';
    const mg = b.map ? `<a class="btn small ghost" href="${h().M(b.map)}" target="_blank" rel="noopener" data-mg="${b.map}" aria-label="Open ${esc(b.name)} on Map Genie">Map Genie ↗</a>` : '';
    return `<div class="boss${b.must ? ' must' : ''}${c}" id="row-${it.id}" data-boss="${it.id}">
        <div class="portrait" tabindex="0">${h().ic(b.name, 80)}<span class="lvb">Lv ${b.lv}</span>${pos >= 0 ? `<span class="ord">${pos + 1}</span>` : ''}</div>
        <label class="defeat" title="Mark defeated"><input type="checkbox" id="${it.id}" data-id="${it.id}"${c} aria-label="Defeated ${esc(b.name)}"></label>
        <div class="info">
          <div class="name">${esc(b.name)}</div>
          <div class="badges">${ben.tags.map(t => `<span class="chip tag tag-${t}">${TAG_LABEL[t]}</span>`).join('')}${pips(dif.score)}${v.region ? regionChip(v.region) : ''}</div>
          <div class="tools"><a class="btn small" href="${mapHref('boss:' + b.name)}" aria-label="Show ${esc(b.name)} on the map">📍 Map</a>${mg}</div>
          ${legText}
          ${b.where ? `<div class="where">${b.where}</div>` : ''}
          ${rewardTiles(b.gets)}
          <div class="take">${b.take}</div>
        </div></div>`;
  }

  // ---------- Checklist rows (the icon sits outside the label, so it opens its card instead of ticking) ----------
  function itemRow(it, ctx) {
    const c = ctx.done[it.id] ? ' checked' : '';
    return `<div class="item${c}" id="row-${it.id}">
      <span class="item-ic" tabindex="0">${h().ic(it.icon, 48)}</span>
      <label class="text" for="${it.id}">${it.text}</label>
      <input type="checkbox" id="${it.id}" data-id="${it.id}"${c}></div>`;
  }
  // Crafting rows in category groups; groups follow the order their first row appears, rows keep their order.
  function craftGroups(list, ctx) {
    const groups = new Map();
    for (const it of list) {
      const key = L().containerOf(L().kindOf(it.icon), L().CRAFT_GROUPS);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    }
    if (groups.size < 2) return `<div class="rows">${list.map(it => itemRow(it, ctx)).join('')}</div>`;
    return `<div class="groups">${[...groups].map(([k, rows]) => `<section class="grp grp-${k}"><h4 class="grp-h">${L().CRAFT_GROUPS.find(g => g[0] === k)[1]}</h4>
      <div class="rows">${rows.map(it => itemRow(it, ctx)).join('')}</div></section>`).join('')}</div>`;
  }

  // ---------- Materials ----------
  // A material row: icon, name, how many, where to get it (with map links).
  function matRow(r, qty, ctx, why = '') {
    return `<div class="mat"${why ? ` title="${esc(why)}"` : ''}><span class="mat-ic" tabindex="0">${h().ic(r, 36)}</span>
      <div class="mat-txt"><b>${esc(r)}</b>${qty ? ` <span class="mono">×${qty}</span>` : ''}${sourceLine(r, ctx.def)}</div></div>`;
  }
  function needsList(p, ctx) {
    const NEEDS = ctx.def.needs || {};
    const list = Object.keys(NEEDS).filter(r => NEEDS[r][p.n]);
    if (!list.length) return '';
    return `<div class="needs"><div class="dps muted">Materials this phase's crafting uses, and where to get them</div>
      <div class="mats">${list.map(r => matRow(r, NEEDS[r][p.n].qty, ctx, NEEDS[r][p.n].for.join(', '))).join('')}</div></div>`;
  }

  // ---------- Loadout ----------
  const SLOT_KEYS = ['Veil', 'Spell 1', 'Spell 2', 'Ultimate'];
  // Where a loadout note belongs: next to the category it explains.
  const NOTE_BOX = [[/^(Veil|Spell|Ultimate|Ult|Before|Why Veil|Spells?)\b/i, 'abilities'], [/^(Blood|Leech|Why Blood|Primaries)/i, 'blood'],
    [/^(Elixir|Brew|Potion|Coating)/i, 'consumables'], [/^(Ring|Amulet|Pendant|Armou?r|Set|Chest)/i, 'equipment'], [/^(Weapon|Rolls?|Crossbow|Why speed)/i, 'weapon'], [/^(Jewels?|Mods?)/i, 'jewels']];
  const noteBox = k => (NOTE_BOX.find(([re]) => re.test(k)) || [, 'notes'])[1];
  function rotationStrip(rot, kvText) {
    if (!rot) return kvText ? `<div class="rot"><span class="rot-h">Rotation</span><p class="rot-why">${kvText}</p></div>` : '';
    const step = (x, cls = '') => {
      const n = typeof x === 'string' ? x : x.n, when = typeof x === 'string' ? '' : x.when;
      return `<li class="${cls}" tabindex="0">${h().ic(n, 34)}<span class="rot-n">${esc(h().display(n))}</span>${when ? `<small>${esc(when)}</small>` : ''}</li>`;
    };
    return `<div class="rot"><span class="rot-h">Rotation</span><ol class="rot-steps">${(rot.pre || []).map(x => step(x, 'pre')).join('')}${(rot.order || []).map(x => step(x)).join('')}${(rot.fill || []).map(x => step(x, 'fill')).join('')}</ol>
      ${rot.why ? `<p class="rot-why">${rot.why}</p>` : ''}</div>`;
  }
  function loadoutBlock(l, ctx) {
    const slotIc = s => h().slotIcon(ctx.def.slotIcons, s);
    const kv = (l.kv || []).filter(([k]) => !/^(Rotation|Combo)$/.test(k));
    const kvRot = (l.kv || []).find(([k]) => /^(Rotation|Combo)$/.test(k));
    const notesFor = box => kv.filter(([k]) => noteBox(k) === box);
    const noteHtml = list => list.length ? `<dl class="kv">${list.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : '';
    const boxes = new Map(L().CONTAINERS.map(([k, label]) => [k, { label, names: [] }]));
    for (const g of l.gear || []) boxes.get(L().containerOf(L().kindOf(g))).names.push(g);
    // The weapon brings its two skills.
    const weapon = boxes.get('weapon').names.find(n => L().kindOf(n) === 'weapon');
    // Its skills per the game data (Bone and Copper weapons have only the first), else the weapon type's two.
    const gw = weapon && G().items && G().items[weapon];
    const skills = weapon ? ((gw && gw.skills) || L().WEAPON_SKILLS[L().weaponType(weapon)] || []) : [];
    const box = (k, inner) => {
      const b = boxes.get(k), notes = noteHtml(notesFor(k));
      if (!inner && !b.names.length && !notes) return '';
      return `<section class="box box-${k}"><h4 class="box-h">${b.label}</h4>${inner || ''}${b.names.length && k !== 'weapon' ? h().tiles(b.names) : ''}${notes}</section>`;
    };
    const slots = `<div class="slots">${l.slots.map((s, i) => `<div class="slot" tabindex="0" data-slot="${esc(s)}">${h().ic(slotIc(s), 56)}<span class="k">${SLOT_KEYS[i]}</span><span class="v">${esc(s)}</span></div>`).join('')}</div>`;
    const weaponInner = weapon ? `${h().tiles([weapon])}${skills.length ? `<div class="skills"><span class="sub-h">Weapon skills</span>${h().tiles(skills)}</div>` : ''}` : '';
    return `<div class="loadout">
        ${l.label || l.dps ? `<div class="dps">${[l.label, l.dps].filter(Boolean).join(' · ')}</div>` : ''}
        <div class="lo-grid">
          ${box('abilities', slots + rotationStrip(l.rot, kvRot && kvRot[1]))}
          ${box('weapon', weaponInner)}
          ${box('equipment')}${box('jewels')}${box('consumables')}${box('blood')}
        </div>
        ${noteHtml(notesFor('notes'))}
      </div>`;
  }

  // ---------- Boss toolbar (one setting for every phase) ----------
  function bossToolbar(p, ctx) {
    const regions = [...new Set(p.bosses.map(b => ((L().data.VBLOOD || {})[b.name] || {}).region).filter(Boolean))];
    const orders = Object.entries(BR.state.ORDERS).map(([k, label]) => {
      const off = k === 'route' && !BR.geo.plan ? ' disabled title="Needs the map data"' : '';
      return `<button type="button" class="seg-b" data-order="${k}" aria-pressed="${ctx.order === k}"${off}>${label}</button>`;
    }).join('');
    const plan = ctx.plans[p.id];
    const route = ctx.order === 'route' ? `<button type="button" class="btn small" data-route-map="${p.id}">📍 Show route on map</button>
      <button type="button" class="btn small ghost" data-replan="${p.id}" title="Plan again from the boss you defeated last">Re-plan from last kill</button>${plan && plan.total ? `<span class="muted mono">≈ ${metres(plan.total)} of travel</span>` : ''}` : '';
    return `<div class="boss-tools" role="toolbar" aria-label="Boss order and filters">
        <span class="lbl">Order</span><div class="seg">${orders}</div>
        <label class="flt"><input type="checkbox" data-filter="needed"${ctx.filters.needed ? ' checked' : ''}> Needed only</label>
        ${regions.length > 1 ? `<select data-filter="region" aria-label="Show bosses in one region"><option value="">All regions</option>${regions.map(r => `<option${ctx.filters.region === r ? ' selected' : ''}>${esc(r)}</option>`).join('')}</select>` : ''}
        ${route}
      </div>`;
  }

  // ---------- Phase card ----------
  function phaseCard(p, ctx) {
    const open = ctx.open[p.id];
    const sec = (title, kind, body, isOpen = true) => {
      const key = `${p.id}:${kind}`;
      const saved = ctx.ui.sections[key];
      const o = saved === undefined ? isOpen : saved;
      const cnt = kind && ['Step', 'Boss', 'Craft'].includes(kind) ? `<span class="count" data-seccount="${key}"></span>` : '';
      return `<details class="sec" data-sec="${key}"${o ? ' open' : ''}><summary>${title}${cnt}</summary><div class="sec-body">${body}</div></details>`;
    };
    const steps = p.items.filter(i => i.kind === 'Step'), bosses = p.items.filter(i => i.kind === 'Boss'), craft = p.items.filter(i => i.kind === 'Craft');
    const plan = ctx.plans[p.id];
    const ordered = plan ? plan.ids.map(id => bosses.find(b => b.id === id)).filter(Boolean) : bosses;
    return `<article class="phase${open ? '' : ' collapsed'}" id="${p.id}" data-phase="${p.id}" style="--ph:${ctx.hueOf(p.n)}">
        <header class="phase-head">
          <h2 class="ph-h"><button type="button" class="ph-toggle" aria-expanded="${!!open}" aria-controls="body-${p.id}" data-toggle-phase="${p.id}">
            ${h().ic(p.sig, 48, 'sig noinfo')}
            <span class="ph-title"><span class="num">PHASE ${p.n} / ${ctx.phases.length}<span class="stage stage-${stageOf(p).toLowerCase()}">${esc(stageLabel(p))}</span></span><span class="ph-name">${p.title}</span></span>
            <span class="ph-side"><span class="lv">Lv ${p.levels}</span><span class="prog"><span class="bar"><i data-bar="${p.id}"></i></span><span data-count="${p.id}" class="mono"></span></span></span>
            <span class="chev" aria-hidden="true"></span>
          </button></h2>
          <div class="regions"><span class="lbl">Regions</span>${p.regions.map(regionChip).join('')}</div>
        </header>
        <div class="phase-body" id="body-${p.id}"${open ? '' : ' hidden="until-found"'}>
          <div class="phase-intro"><div class="goal">${p.goal}</div>
            <div class="roster" data-roster="${p.id}">${ordered.map(it => `<a href="#row-${it.id}" class="${it.boss.must ? 'must' : ''}${ctx.done[it.id] ? ' dead' : ''}" data-rost="${it.id}" aria-label="${esc(it.boss.name)} · Lv ${it.boss.lv}">${h().ic(it.boss.name, 40)}</a>`).join('')}</div></div>
          ${p.access ? sec('Before you go', 'access', `<div class="rows">${p.access.map(([n, a]) => `<div class="item static"><span class="item-ic" tabindex="0">${h().ic(n, 48)}</span><div class="text">${a}</div></div>`).join('')}</div>`) : ''}
          ${steps.length ? sec('Do', 'Step', `<div class="rows">${steps.map(it => itemRow(it, ctx)).join('')}</div>`) : ''}
          ${sec(`V Bloods to hunt (${bosses.length})`, 'Boss', bossToolbar(p, ctx) + `<div class="bosses" data-bosses="${p.id}">${ordered.map(it => bossCard(it, ctx)).join('')}</div>`)}
          ${craft.length ? sec('Craft and prepare', 'Craft', needsList(p, ctx) + craftGroups(craft, ctx)) : ''}
          ${ctx.stockSection ? ctx.stockSection(p) : ''}
          ${p.notes ? sec('Tips', 'notes', `<div class="rows">${p.notes.map(n => `<div class="note">${n}</div>`).join('')}</div>`, false) : ''}
          ${p.loadout ? sec('Loadout at the end of this phase', 'loadout', loadoutBlock(p.loadout, ctx)) : ''}
        </div>
      </article>`;
  }

  // ---------- Rail ----------
  function rail(ctx) {
    let stage = null;
    return ctx.phases.map(p => {
      const st = stageOf(p), first = st !== stage; stage = st;
      return `<a class="step${first ? ' stage-first' : ''}" href="#${p.id}" data-step="${p.id}" style="--ph:${ctx.hueOf(p.n)}">
        ${first ? `<span class="rail-stage">${esc(stageLabel(p))}</span>` : ''}
        <span class="badge">${h().ic(p.sig, 44, 'noinfo')}<b>${p.n}</b></span><span><span class="t">${p.title}</span><br><span class="l mono">Lv ${p.levels}</span><div class="bar"><i data-railbar="${p.id}"></i></div></span></a>`;
    }).join('') + `<div class="rail-tools"><button class="btn small" id="collapseAll" type="button">Collapse all</button><button class="btn small" id="expandAll" type="button">Expand all</button><button class="btn small" id="focusCur" type="button">Focus current</button>
      <button class="btn small" id="toggleDone" type="button">Hide done</button><span id="resetWrap"><button class="btn small" id="reset" type="button">Reset</button></span></div>`;
  }

  BR.view = { stageOf, stageLabel, regionName, regionChip, sourceLine, mapLinks, matRow, needsList, rewardTiles, bossCard, itemRow, craftGroups,
    rotationStrip, loadoutBlock, bossToolbar, phaseCard, rail, metres, pips, SLOT_KEYS };
})();
