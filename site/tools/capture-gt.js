// Bloodroute: capture the vrising.gaming.tools data behind the hover cards and maps: map markers (V Bloods, waygates,
// landmarks, resource nodes, creatures and loot containers) and the details of every NPC, item, blood type and station
// the routes show. gaming.tools serves these files to browsers, so this runs in a browser page, not in Node.
//
// Refresh after a game patch:
//   1. node site/tools/wanted.js          (writes data/gt/wanted.json: the names the routes use)
//   2. Open https://vrising.gaming.tools/map, open the developer console, paste this file, then run
//        await BRCapture.run({ wanted: <contents of data/gt/wanted.json> })
//      It downloads gt-capture.json. Move it to data/gt/ (or pass { sink: url } to POST each part instead).
//   3. node site/build-gamedata.js        (rebuilds site/gamedata.js from data/, data/gt/ and the wiki)
// The output is git-ignored raw data; only the trimmed site/gamedata.js is committed.
(function () {
  'use strict';
  const CDN = 'https://cdn-hosted.gaming.tools/vrising/data/en/';

  // gaming.tools files are SvelteKit "devalue" flat arrays: element 0 is the root; numbers inside objects and arrays
  // are indices into the array (-1 = undefined).
  function dec(a) {
    const memo = new Map();
    const h = i => {
      if (i === -1) return undefined;
      if (memo.has(i)) return memo.get(i);
      const v = a[i];
      if (v === null || typeof v !== 'object') { memo.set(i, v); return v; }
      if (Array.isArray(v)) { const o = []; memo.set(i, o); v.forEach(x => o.push(h(x))); return o; }
      const o = {}; memo.set(i, o);
      for (const [k, x] of Object.entries(v)) o[k] = h(x);
      return o;
    };
    return h(0);
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let VERSION = '';
  async function get(path, tries = 3) {
    for (let i = 1; ; i++) {
      try {
        const r = await fetch(CDN + path + '.d.json?version=' + VERSION);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(r.status + ' ' + path);
        return dec(await r.json());
      } catch (e) {
        if (i >= tries) throw e;
        await sleep(800 * i);
      }
    }
  }
  // Runs jobs with a small pool so the CDN isn't hammered.
  async function pool(list, n, fn) {
    const out = new Array(list.length);
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const k = i++; out[k] = await fn(list[k], k); } }));
    return out;
  }

  const ref = e => e && { id: e.id, name: e.name };
  const round = n => Math.round(n * 10) / 10;
  const pt = m => [Math.round(m.location.x), Math.round(m.location.z)];
  const lower = s => String(s || '').toLowerCase();

  // ---------- Trimmers: keep what the cards use ----------
  const trimStats = s => (s || []).map(x => [x.statType, x.modificationType, round(x.value)]);
  const trimRecipe = r => r && ({
    id: r.id, name: r.name, time: r.craftDuration ?? r.craftTime,
    stations: (r.workstations || []).map(w => w.name),
    inputs: (r.requirements || []).map(q => [q.item && q.item.name, q.amount, q.item && q.item.id]),
    outputs: (r.outputs || r.results || []).map(q => [q.item && q.item.name, q.amount]),
    unlock: (r.unlockSources || []).map(ref),
  });
  function trimDrops(list, keep = 25) {
    const by = new Map();
    for (const d of list || []) {
      const src = d.source || {};
      const key = src.id || d.sourcePrefabName;
      const cur = by.get(key) || { id: src.id || null, name: src.name || d.sourcePrefabName, prefab: d.sourcePrefabName,
        cats: src.categories || [], rate: 0, qty: d.quantity, locations: d.locationCount || 0, trigger: d.dropTrigger };
      cur.rate = Math.max(cur.rate, d.dropRate || 0);
      cur.locations = Math.max(cur.locations, d.locationCount || 0);
      by.set(key, cur);
    }
    return [...by.values()].sort((a, b) => b.rate - a.rate || b.locations - a.locations).slice(0, keep)
      .map(d => ({ ...d, rate: Math.round(d.rate * 1000) / 1000 }));
  }
  const trimItem = d => d && ({
    id: d.id, name: d.name, cats: d.categories, type: d.itemType, equip: d.equipmentType, weapon: d.weaponType,
    rarity: d.rarityName, gl: d.gearLevel, desc: d.description, icon: d.iconPath,
    stats: trimStats(d.statModifications), set: ref(d.itemSet || d.set), buff: ref(d.equipmentBuff),
    abilities: (d.grantedAbilities || []).map(ref), consumable: ref(d.consumableAbility || d.ability),
    recipes: (d.recipes || []).map(trimRecipe), unlock: (d.unlockSources || []).map(ref),
    drops: trimDrops(d.dropSources), dropCount: (d.dropSources || []).length,
    usedFor: (d.ingredientFor || []).slice(0, 40).map(ref),
  });
  const trimNpc = d => d && ({
    id: d.id, name: d.name, lv: d.level, unit: d.unitCategory, cats: d.categories, vblood: !!d.isVBlood,
    blood: d.bloodType && d.bloodType.name, desc: d.description, stats: d.stats, res: d.resistances,
    abilities: [...new Set((d.abilities || []).map(a => a.name))],
    drops: (d.drops || []).map(x => ({ item: x.item && x.item.name, id: x.item && x.item.id, rate: x.dropRate, qty: x.quantity }))
      .filter(x => x.item).sort((a, b) => b.rate - a.rate).slice(0, 30),
    unlocks: (d.unlocks || []).map(ref),
  });
  const trimBlood = d => d && ({
    id: d.id, name: d.name, desc: d.description, icon: d.iconPath,
    primary: (d.primaryBonuses || d.primary || []).map(b => ({ order: b.order, desc: b.description, buff: ref(b.buff) })),
    secondary: (d.secondaryBonuses || d.secondary || []).map(b => ({ order: b.order, desc: b.description, buff: ref(b.buff) })),
    npcs: (d.npcs || []).map(ref),
  });
  const trimBlueprint = d => d && ({
    id: d.id, name: d.name, type: d.type, desc: d.description,
    cost: (d.requirements || []).map(q => [q.item && q.item.name, q.amount]), unlock: (d.unlockSources || []).map(ref),
  });
  const trimAbility = d => d && ({
    id: d.id, name: d.name, school: d.abilitySchool, type: d.abilityType, hidden: d.hidden, icon: d.iconPath,
    desc: d.description, cd: d.cooldown ?? d.cooldownTime, cast: d.castTime, charges: d.charges,
  });

  // ---------- Capture ----------
  async function run({ wanted = {}, sink = null, version } = {}) {
    const log = [];
    VERSION = version || (await fetch('https://vrising.gaming.tools/_app/version.json').then(r => r.json()).then(j => j.version).catch(() => ''));
    const parts = {};

    // Map: bounds, V Bloods, waygates, landmarks, resource nodes, creatures and loot containers.
    const manifest = await get('map/manifest');
    const cats = manifest.categories;
    const leaf = cats.filter(c => !cats.some(o => o.parentId === c.id));
    const markers = { bounds: manifest.bounds, imageWidth: manifest.imageWidth, vblood: [], waygates: [], landmarks: [], resources: {}, creatures: {}, loot: {} };
    await pool(leaf, 4, async c => {
      const d = await get('map/' + c.id);
      if (!d) return;
      for (const m of d.markers || []) {
        const p = pt(m), e = m.entity || {};
        if (c.id === 'creatures/v_blood_carriers') markers.vblood.push({ name: m.name, id: e.id, prefab: m.sourcePrefabName, p });
        else if (c.id === 'landmarks/waygates') { if (!markers.waygates.some(w => w[0] === p[0] && w[1] === p[1])) markers.waygates.push(p); }
        else if (c.id.startsWith('landmarks/')) markers.landmarks.push({ cat: c.id.split('/')[1], name: m.name, prefab: m.sourcePrefabName, p });
        else if (c.id.startsWith('resources/')) (markers.resources[c.id.split('/').pop()] ??= { name: c.name, pts: [] }).pts.push(p);
        else if (c.id.startsWith('creatures/')) (markers.creatures[e.id || m.sourcePrefabName] ??= { name: e.name || m.name, prefab: m.sourcePrefabName, cat: c.id.split('/')[1], pts: [] }).pts.push(p);
        else (markers.loot[m.sourcePrefabName] ??= { name: m.name, cat: c.id, pts: [] }).pts.push(p);
      }
    });
    parts.markers = markers;
    log.push(`markers: ${markers.vblood.length} V Bloods, ${markers.waygates.length} waygates, ${Object.keys(markers.resources).length} resource layers, ${Object.keys(markers.creatures).length} creature types`);

    // Lists.
    const [items, abilities, npcs, bloodtypes, itemsets, blueprints] = await Promise.all(
      ['items', 'abilities', 'npcs', 'bloodtypes', 'itemsets', 'blueprints'].map(n => get(n)));
    parts.lists = {
      items: items.map(i => ({ id: i.id, name: i.name, cats: i.categories, type: i.itemType, rarity: i.rarityName, gl: i.gearLevel, icon: i.iconPath })),
      abilities: abilities.map(a => ({ id: a.id, name: a.name, school: a.abilitySchool, type: a.abilityType, hidden: a.hidden, cats: a.categories, icon: a.iconPath })),
      npcs: npcs.map(n => ({ id: n.id, name: n.name, lv: n.level, unit: n.unitCategory, vblood: n.isVBlood, blood: n.bloodType && n.bloodType.name, cats: n.categories })),
      bloodtypes: bloodtypes.map(b => ({ id: b.id, name: b.name, icon: b.iconPath })),
      itemsets: itemsets.map(s => ({ id: s.id, name: s.name, items: (s.items || []).map(ref), bonuses: s.bonuses || s.setBonuses })),
      blueprints: blueprints.filter(b => /production|structures\/castle|refinement/.test((b.categories || []).join(' ')) || (wanted.stations || []).includes(b.name))
        .map(b => ({ id: b.id, name: b.name, type: b.type, cats: b.categories })),
    };

    // Item details: every wanted name, then their recipe inputs (two levels down).
    const byName = new Map();
    for (const i of items) { const k = lower(i.name); if (!byName.has(k)) byName.set(k, []); byName.get(k).push(i); }
    const skipItem = i => /^item_(debug|transmog)|trader_template/.test(i.id) || (i.categories || []).includes('items/knowledge');
    const itemDetails = {};
    let queue = [...new Set((wanted.names || []).map(lower))];
    for (let depth = 0; depth < 3 && queue.length; depth++) {
      const ids = queue.flatMap(n => (byName.get(n) || []).filter(i => !skipItem(i)).map(i => i.id)).filter(id => !itemDetails[id]);
      const got = await pool(ids, 6, id => get('items/' + id));
      const next = new Set();
      got.forEach((d, k) => {
        const t = trimItem(d);
        if (!t) return;
        itemDetails[ids[k]] = t;
        for (const r of t.recipes) for (const [n] of r.inputs) if (n) next.add(lower(n));
      });
      queue = [...next].filter(n => !(byName.get(n) || []).every(i => itemDetails[i.id]));
    }
    parts.items = itemDetails;
    log.push(`items: ${Object.keys(itemDetails).length} details`);

    // Abilities whose names the routes use (spells, veils, weapon skills, forms).
    const want = new Set((wanted.names || []).map(lower));
    const abIds = abilities.filter(a => want.has(lower(a.name))).map(a => a.id);
    parts.abilities = Object.fromEntries((await pool(abIds, 6, id => get('abilities/' + id))).map(trimAbility).filter(Boolean).map(a => [a.id, a]));

    // NPCs: every V Blood, every creature on the map, and any wanted NPC name.
    const npcIds = new Set(npcs.filter(n => n.isVBlood).map(n => n.id));
    for (const id of Object.keys(markers.creatures)) if (npcs.some(n => n.id === id)) npcIds.add(id);
    for (const n of npcs) if (want.has(lower(n.name))) npcIds.add(n.id);
    const npcList = [...npcIds];
    parts.npcs = Object.fromEntries((await pool(npcList, 6, id => get('npcs/' + id))).map(trimNpc).filter(Boolean).map(n => [n.id, n]));
    log.push(`npcs: ${Object.keys(parts.npcs).length} details`);

    // Blood types and stations.
    parts.bloodtypes = Object.fromEntries((await pool(bloodtypes.map(b => b.id), 4, id => get('bloodtypes/' + id))).map(trimBlood).filter(Boolean).map(b => [b.name, b]));
    const stationIds = blueprints.filter(b => (wanted.stations || []).includes(b.name)).map(b => b.id);
    parts.blueprints = Object.fromEntries((await pool(stationIds, 4, id => get('blueprints/' + id))).map(trimBlueprint).filter(Boolean).map(b => [b.id, b]));

    parts.meta = { source: 'https://vrising.gaming.tools', version: VERSION, captured: new Date().toISOString(), log };

    if (sink) {
      for (const [name, data] of Object.entries(parts)) {
        const r = await fetch(sink + (sink.includes('?') ? '&' : '?') + 'name=' + name, { method: 'POST', body: JSON.stringify(data) });
        if (!r.ok) throw new Error(`sink ${name}: ${r.status}`);
      }
    } else if (typeof document !== 'undefined') {
      const url = URL.createObjectURL(new Blob([JSON.stringify(parts)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'gt-capture.json' });
      document.body.appendChild(a); a.click(); a.remove();
    }
    return log;
  }

  (typeof window !== 'undefined' ? window : globalThis).BRCapture = { run, dec };
})();
