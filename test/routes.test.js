// Route tests. Every archetype must cover the whole progression (every V Blood and every gear tier, from a fresh
// spawn to Dracula), and every loadout may only use what the route has already told you how to get.
// Facts come from docs/ (V Blood rewards, spell points), the wiki (passives) and the game data when it's present.
// Run: node --test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { ROOT, SITE, page, loadRoutes, vbloodRewards, spellTable } = require('./load');
const iconLists = require('../site/build-icons');
const needsBuild = require('../site/build-needs');

const ROUTES = loadRoutes();
const READY = ROUTES.filter(r => r.def);
const REWARDS = vbloodRewards();
const SPELLS = spellTable();

// In the V Blood data but not hunts: a duplicate Quincey entry, and two carriers with no rewards and no map marker.
const NOT_HUNTED = ['Quincey the Marauder', 'Brutus the Watcher', 'Boyo'];
const ALL_VBLOODS = REWARDS.map(r => r.name).filter(n => !NOT_HUNTED.includes(n));
const full = short => {
  const m = ALL_VBLOODS.filter(n => n === short || n.startsWith(short + ' ') || n.includes(' ' + short + ' '));
  assert.equal(m.length, 1, `"${short}" should name exactly one V Blood`);
  return m[0];
};
const POINT = Object.fromEntries(Object.entries(SPELLS.points).map(([b, v]) => [full(b), v]));
const VEIL_FROM = Object.fromEntries(Object.entries(SPELLS.veils).map(([v, b]) => [v, full(b)]));
const SHARD_FROM = Object.fromEntries(Object.entries(SPELLS.shards).map(([u, b]) => [u, full(b)]));
const SCHOOLS = ['Blood', 'Chaos', 'Frost', 'Illusion', 'Storm', 'Unholy'];

// Stygian passives (W/Altar_of_Stygian_Awakening, 2026-04-08) and the bosses that open the five slots.
const PASSIVES = ['Arcane Animator', 'Blood Spray', 'Chaos Kindling', 'Chillweave', 'Cold Soul', 'Enhanced Conductivity', 'Flowing Sorcery',
  'Lightning Fast Strikes', 'Renewing Flames', 'Sanguine Mastery', 'Soul Drinker', 'Spiritual Infusion', 'Bastion', 'Dark Enchantment',
  'Embrace Mayhem', 'Feral Haste', 'Hunger for Blood', 'Hunger for Power', 'Lethal Strikes', 'Overpower', 'Rampage', 'Ravenous Strikes',
  'Turbulent Velocity', 'Wicked Power'];
const SLOT_BOSSES = ['General Elena the Hollow', 'General Cassius the Betrayer', 'Cyril the Cursed Smith', 'Jakira the Shadow Huntress', 'Simon Belmont the Vampire Hunter'];
const BLOODS = ['Scholar', 'Draculin', 'Mutant', 'Warrior', 'Rogue', 'Brute', 'Creature', 'Worker', 'Corrupted'];

// Gear tiers, low to high (gear levels from the game data).
const WEAPON = /(Crossbow|Longbow|Sword|Greatsword|Axes|Mace|Spear|Reaper|Twinblade|Pistols|Slashers|Claws|Whip|Daggers)( Shards)?$/;
const WEAPON_TIERS = ['Bone', 'Reinforced Bone', 'Copper', 'Merciless Copper', 'Iron', 'Merciless Iron', 'Dark Silver', 'Sanguine', 'Ancestral'];
const MAGIC_TIERS = [['Bone Ring', 3], ['Blood Bone Ring', 6], ['Gravedigger Ring', 9], ['Ring of the ', 12], ['Scourgestone Pendant', 15],
  ['Pendant of the ', 18], ['Blood Merlot Amulet', 22], ['Amulet of the ', 25], ['Soul Shard of ', 25]];
const ARMOR_TIERS = { 'Boneguard': 1, 'Plated Boneguard': 2, 'Nightstalker': 3, 'Warlock': 4, 'Grim Ranger': 4, 'Marauder': 4, 'Shadewalker': 4,
  'Hollowfang': 5, 'Dark Magus': 6, 'Blood Hunter': 6, 'Crimson Templar': 6, 'Duskwatcher': 6, 'Dawnthorn': 7, 'Maleficer Scholar': 8,
  'Dread Plate': 8, 'Grim Knight': 8, 'Shadowmoon': 8, "Dracula's": 9 };
const longest = (name, keys) => keys.filter(k => name.startsWith(k)).sort((a, b) => b.length - a.length)[0];
const weaponTier = n => WEAPON_TIERS.indexOf(longest(n, WEAPON_TIERS));
const magicTier = n => (MAGIC_TIERS.find(([k]) => n.startsWith(k)) || [])[1];
const armorTier = n => ARMOR_TIERS[longest(n, Object.keys(ARMOR_TIERS))];
const isMagic = n => magicTier(n) !== undefined;
const isChest = n => /(Chestguard|Vest)$/.test(n);
// Gear Level of a full armor set (W/Gear_Level: the sum of worn item levels): four pieces at the chest's tier, +1 for the
// T4, T6 and T8 class sets' set bonus. Hollowfang and Dawnthorn are crafted only as the base for the next set.
const setLevel = n => 4 * armorTier(n) + ([4, 6, 8].includes(armorTier(n)) ? 1 : 0);
const BASE_ONLY = ['Hollowfang', 'Dawnthorn'];

// Loadout items that are used up (restocked every phase) and jewels (crafted from the stockpile's "… jewels" rows).
const CONSUMABLE = /^(Elixir of the |Brew of |Potion of )|^(Enchanted Brew|Witch Potion)$| Coating$/;
const JEWEL = /^(Regular|Greater|Primal) (\w+ )?jewel$/;
// Items with a crafting recipe: from data/items.json when it's downloaded; otherwise anything any route crafts, plus
// anything shaped like crafted gear or a consumable. The Soul Shard drops from Dracula, and Ancestral weapons are
// forged from a Sanguine weapon and a shard (the data has no recipe for them).
const ITEMS_JSON = path.join(ROOT, 'data', 'items.json');
const RECIPES = fs.existsSync(ITEMS_JSON) ? new Set(Object.keys(needsBuild.recipesByName(require(ITEMS_JSON)))) : null;
const ANY_CRAFT = new Set(Object.values(needsBuild.ROUTES).flatMap(r => r.crafts.map(([, n]) => n)));
const hasRecipe = g => RECIPES ? RECIPES.has(g)
  : ANY_CRAFT.has(g) || ((CONSUMABLE.test(g) || WEAPON.test(g) || isMagic(g) || isChest(g)) && !/^Soul Shard of |^Ancestral .* Shards$/.test(g));
const PLACEHOLDER = /check the (item )?tooltip|\bTODO\b|\bTBD\b|\bFIXME\b|placeholder|lorem ipsum/i;

// Text helpers. A phase's text is everything it tells you except its loadout.
const strip = h => String(h).replace(/<[^>]+>/g, '');
const phaseText = p => strip([p.goal, p.sig, ...(p.steps || []).flatMap(s => [s.t, s.ic]), ...(p.craft || []).flatMap(s => [s.t, s.ic]),
  ...(p.access || []).flat(), ...(p.notes || []), ...p.bosses.flatMap(b => [b.name, b.take, b.where || '', ...b.gets])].join('\n')).toLowerCase();
const PIECE = / (Chestguard|Vest|Leggings|Gloves|Boots)$/;
const mentions = (text, name) => text.includes(name.toLowerCase()) || (PIECE.test(name) && text.includes(name.replace(PIECE, '').toLowerCase()));
const upTo = (def, n) => def.phases.slice(0, n).map(phaseText).join('\n');
const bossList = def => def.phases.flatMap((p, i) => p.bosses.map(b => ({ ...b, phase: i + 1 })));
// Where a route hands you something: a step/craft icon, a boss reward tile or the phase's signature icon.
const iconsIn = p => new Set([p.sig, ...(p.steps || []).map(s => s.ic), ...(p.craft || []).map(s => s.ic), ...p.bosses.flatMap(b => b.gets)]);
const levelBand = s => s.split('–').map(x => (x.trim() === 'Start' ? 1 : +x.trim()));

// Where each route hands you each piece of the progression (first icon or reward tile; else first mention).
const MILESTONES = {
  common: {
    'Bone Ring': 1, 'Nightstalker Vest': 1, 'Gravedigger Ring': 2, 'Research Desk': 2, 'Hollowfang Chestguard': 3, 'Prison Cell': 4, 'Dominate': 4,
    'Eye of Mortium': 4, 'Scourgestone Pendant': 4, 'Study': 4, 'Altar of Stygian Awakening': 5, 'Jewelcrafting Table': 5, 'Ancestral Forge': 5,
    'Dawnthorn Chestguard': 6, 'Blood Merlot Amulet': 6, 'Athenaeum': 7, 'Blood Homogenizer': 7, 'Fusion Forge': 7, 'Onyx Tear': 7, 'Blood Key': 7,
    'Soul Shard of Dracula': 8,
  },
  spellcaster: {
    'Copper Crossbow': 1, 'Merciless Copper Crossbow': 2, 'Warlock Vest': 2, 'Ring of the Sorcerer': 3, 'Iron Crossbow': 3, 'Dark Magus Chestguard': 5,
    'Pendant of the Sorcerer': 5, 'Merciless Iron Crossbow': 5, 'Dark Silver Crossbow': 6, 'Maleficer Scholar Chestguard': 7,
    'Amulet of the Arch-Warlock': 7, 'Sanguine Crossbow': 7, 'Ancestral Crossbow Shards': 7, "Dracula's Maleficer Chestguard": 8,
  },
  warrior: {
    'Bone Sword': 1, 'Copper Sword': 1, 'Merciless Copper Sword': 2, 'Grim Ranger Vest': 2, 'Ring of the Warrior': 3, 'Iron Sword': 3, 'Iron Reaper': 4,
    'Blood Hunter Chestguard': 5, 'Pendant of the Warrior': 5, 'Merciless Iron Reaper': 5, 'Ancestral Reaper Shards': 5, 'Dark Silver Reaper': 6,
    'Dread Plate Chestguard': 7, 'Amulet of the Crimson Commander': 7, 'Sanguine Reaper': 7, "Dracula's Dread Chestguard": 8,
  },
  rogue: {
    'Bone Axes': 1, 'Copper Axes': 1, 'Merciless Copper Axes': 2, 'Shadewalker Vest': 2, 'Ring of the Warrior': 3, 'Iron Axes': 3, 'Iron Pistols': 5,
    'Merciless Iron Pistols': 5, 'Duskwatcher Chestguard': 5, 'Pendant of the Warrior': 5, 'Ancestral Pistols Shards': 5, 'Dark Silver Pistols': 6,
    'Shadowmoon Chestguard': 7, 'Amulet of the Crimson Commander': 7, 'Sanguine Pistols': 7, "Dracula's Shadow Chestguard": 8,
  },
  brute: {
    'Bone Spear': 1, 'Copper Spear': 1, 'Merciless Copper Spear': 2, 'Marauder Vest': 2, 'Ring of the Duskwatcher': 3, 'Iron Spear': 3,
    'Iron Twinblade': 5, 'Merciless Iron Twinblade': 5, 'Crimson Templar Chestguard': 5, 'Pendant of the Duskwatcher': 5,
    'Ancestral Twinblade Shards': 5, 'Dark Silver Twinblade': 6, 'Grim Knight Chestguard': 7, 'Amulet of the Blademaster': 7,
    'Sanguine Twinblade': 7, "Dracula's Grim Chestguard": 8,
  },
};

for (const { arch, def, icons, endgame, ref } of ROUTES) describe(`${arch.name} route`, () => {
  it('is ready and registered by its own files', () => {
    assert.equal(arch.status, 'ready');
    assert.ok(def, 'route registered');
    assert.equal(def.id, arch.id);
    for (const f of arch.files) assert.ok(fs.existsSync(path.join(SITE, f)), `${f} exists`);
    assert.ok(arch.patch && arch.tagline && arch.icons.length && arch.blood && arch.color);
  });

  it('runs from a fresh spawn to Dracula in 8 contiguous phases', () => {
    const P = def.phases;
    assert.deepEqual(P.map(p => p.id), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']);
    assert.match(P[0].levels, /^Start /);
    for (let i = 1; i < P.length; i++) assert.equal(levelBand(P[i].levels)[0], levelBand(P[i - 1].levels)[1], `${P[i].id} starts where ${P[i - 1].id} ends`);
    assert.equal(levelBand(P[7].levels)[1], 91);
    for (const p of P) {
      assert.ok(p.title && p.goal && p.sig && p.regions.length, `${p.id} has a title, goal, icon and regions`);
      assert.ok(p.bosses.length, `${p.id} has bosses`);
      assert.ok(p.loadout && p.loadout.slots.length === 4 && p.loadout.gear.length, `${p.id} ends with a loadout`);
      assert.ok((p.craft || []).length, `${p.id} has crafting`);
    }
    const last = P[7].bosses[P[7].bosses.length - 1];
    assert.equal(last.name, 'Dracula the Immortal King');
    assert.ok(def.finish && def.finish.title && def.finish.text, 'finish card');
  });

  it('hunts every V Blood exactly once', () => {
    const names = bossList(def).map(b => b.name);
    assert.equal(new Set(names).size, names.length, 'no boss twice');
    assert.deepEqual([...names].sort(), [...ALL_VBLOODS].sort());
    assert.equal(names.length, 64);
  });

  it('orders bosses by level inside each phase band, at their game-data levels', () => {
    def.phases.forEach(p => {
      const [lo, hi] = levelBand(p.levels);
      p.bosses.forEach((b, i) => {
        assert.ok(b.lv >= lo && b.lv <= hi, `${b.name} (Lv ${b.lv}) inside ${p.id} (${p.levels})`);
        if (i) assert.ok(b.lv >= p.bosses[i - 1].lv, `${b.name} after ${p.bosses[i - 1].name}`);
        assert.equal(b.lv, REWARDS.find(r => r.name === b.name).lv, `${b.name} level`);
      });
    });
  });

  it('gives every boss a map marker, rewards and a take', () => {
    for (const b of bossList(def)) {
      if (b.name === 'Simon Belmont the Vampire Hunter') assert.equal(b.map, null, 'Simon roams');
      else assert.ok(Number.isInteger(b.map) && b.map > 0, `${b.name} map marker`);
      assert.ok(Array.isArray(b.gets), `${b.name} gets`);
      assert.ok(strip(b.take).length > 5, `${b.name} take`);
      assert.ok(b.must === undefined || typeof b.must === 'boolean', `${b.name} must`);
    }
  });

  it('states each boss\'s spell point correctly, and counts school points right', () => {
    const seen = Object.fromEntries(SCHOOLS.map(s => [s, []]));
    for (const b of bossList(def)) {
      const take = strip(b.take);
      const claims = [...take.matchAll(/\b(Blood|Chaos|Frost|Illusion|Storm|Unholy) T(\d) point/g)];
      const point = POINT[b.name];
      if (!point) { assert.equal(claims.length, 0, `${b.name} gives no spell point`); continue; }
      seen[point[0]].push(b);
      assert.equal(claims.length, 1, `${b.name} states its ${point[0]} T${point[1]} point`);
      assert.deepEqual([claims[0][1], +claims[0][2]], point, `${b.name} point`);
      // "→ Spell" or "→ Spell or Spell" must name spells of that school and tier ("→ Chaos mastery T3" names a trait).
      const arrow = take.match(/T\d point[^→.]*→ (.*)/);
      if (arrow && !arrow[1].startsWith(`${point[0]} mastery T`)) {
        let rest = arrow[1];
        do {
          const s = Object.keys(SPELLS.spells).filter(x => rest.startsWith(x)).sort((a, c) => c.length - a.length)[0];
          assert.ok(s, `${b.name}: "${rest.slice(0, 30)}" starts with a spell name`);
          assert.deepEqual(SPELLS.spells[s], point, `${b.name}: ${s} is a ${point[0]} T${point[1]} spell`);
          rest = rest.slice(s.length);
        } while (rest.startsWith(' or ') && (rest = rest.slice(4)));
      }
      // "(5th Chaos point)" / "(5th)": the count of that school's points so far, all from bosses the route needs.
      const nth = take.match(/T\d point \((\d+)(?:st|nd|rd|th)\b/);
      if (nth) {
        const sofar = seen[point[0]];
        assert.equal(+nth[1], sofar.length, `${b.name} is ${point[0]} point ${sofar.length}`);
        sofar.forEach(x => assert.ok(x.must, `${b.name}'s count includes ${x.name}, so the route must need it`));
      }
    }
  });

  it('attributes every Veil drop to the right boss', () => {
    for (const b of bossList(def)) {
      for (const m of strip(b.take).matchAll(/(Veil of \w+) \(drop\)/g)) assert.equal(VEIL_FROM[m[1]], b.name, `${m[1]} drops from ${VEIL_FROM[m[1]]}`);
      const veil = Object.keys(VEIL_FROM).find(v => VEIL_FROM[v] === b.name);
      if (veil) assert.ok(strip(b.take).includes(`${veil} (drop)`), `${b.name} take mentions ${veil}`);
    }
  });

  it('only loads spells you can have learned by that phase', () => {
    const bosses = bossList(def);
    def.phases.forEach((p, i) => {
      const n = i + 1, have = bosses.filter(b => b.phase <= n && b.must);
      const has = name => have.some(b => b.name === name);
      const used = {};
      p.loadout.slots.forEach((slot, k) => {
        const alts = strip(slot).split(' or ').map(s => s.trim());
        if (alts[0] === 'Starting dash') { assert.equal(k, 0, 'the starting dash is a Veil'); return; }
        if (alts[0] === '—') { assert.ok(k > 0, `${p.id}: empty slot`); return; }
        const ok = alts.filter(s => {
          if (SPELLS.start.includes(s)) return k === 1 || k === 2;
          if (VEIL_FROM[s]) return k === 0 && has(VEIL_FROM[s]);
          if (SHARD_FROM[s]) return k === 3 && has(SHARD_FROM[s]);
          const t = SPELLS.spells[s];
          assert.ok(t, `${p.id}: "${s}" is a spell`);
          if ((k === 3) !== (t[1] === 3)) return false;  // tier 3 spells are the ultimates
          const key = t.join(' T'), points = have.filter(b => POINT[b.name] && POINT[b.name].join(' T') === key).length;
          return (used[key] || 0) < points;
        });
        assert.ok(ok.length, `${p.id} slot ${k + 1} (${slot}) is learnable by phase ${n}`);
        const t = SPELLS.spells[ok[0]];
        if (t) used[t.join(' T')] = (used[t.join(' T')] || 0) + 1;
      });
    });
  });

  it('only recommends gear, blood and passives the route has already covered', () => {
    const bosses = bossList(def);
    def.phases.forEach((p, i) => {
      const n = i + 1, text = upTo(def, n), gear = p.loadout.gear;
      const bloods = gear.filter(g => BLOODS.includes(g)), passives = gear.filter(g => PASSIVES.includes(g));
      for (const g of gear) if (!BLOODS.includes(g)) assert.ok(mentions(text, g), `${p.id} loadout: ${g} is covered by phase ${n}`);
      assert.ok(bloods.length >= 1, `${p.id}: a blood type`);
      if (bloods.length > 1) assert.ok(bosses.some(b => b.name === 'Lucile the Venom Alchemist' && b.phase <= n), `${p.id}: mixing bloods needs the Blood Homogenizer`);
      const slots = bosses.filter(b => SLOT_BOSSES.includes(b.name) && b.must && b.phase <= n).length;
      assert.ok(passives.length <= slots, `${p.id}: ${passives.length} passives, ${slots} slots open`);
      assert.equal(gear.filter(isMagic).length, 1, `${p.id}: one magic source`);
      assert.equal(gear.filter(g => WEAPON.test(g)).length, 1, `${p.id}: one weapon`);
      assert.equal(gear.filter(isChest).length, 1, `${p.id}: one chest piece`);
      assert.ok(gear.filter(g => g.startsWith('Elixir of the ')).length <= 1, `${p.id}: one elixir at a time`);
      assert.ok(gear.filter(g => ['Brew of Ferocity', 'Potion of Rage'].includes(g)).length <= 1, `${p.id}: physical brews don't stack`);
      assert.ok(gear.filter(g => ['Enchanted Brew', 'Witch Potion'].includes(g)).length <= 1, `${p.id}: spell brews don't stack`);
    });
  });

  it('never downgrades the weapon, magic source or armor', () => {
    const L = def.phases.map(p => p.loadout.gear);
    const series = [['weapon', g => g.find(x => WEAPON.test(x)), weaponTier], ['magic source', g => g.find(isMagic), magicTier], ['armor', g => g.find(isChest), armorTier]];
    for (const [what, pick, tier] of series) {
      const tiers = L.map(g => tier(pick(g)));
      tiers.forEach((t, i) => assert.ok(t !== undefined && t >= 0, `${def.phases[i].id} ${what} ${pick(L[i])} has a tier`));
      for (let i = 1; i < tiers.length; i++) assert.ok(tiers[i] >= tiers[i - 1], `${what}: ${pick(L[i])} (p${i + 1}) is not below ${pick(L[i - 1])}`);
    }
  });

  it('crafts every loadout item that has a recipe in that phase or earlier', () => {
    const { crafts, extra } = needsBuild.ROUTES[arch.id];
    def.phases.forEach((p, i) => {
      const n = i + 1;
      for (const g of p.loadout.gear) {
        if (JEWEL.test(g)) {
          const tier = g.split(' ')[0];
          assert.ok(extra.some(([ph, what]) => ph <= n && what.startsWith(`${tier} jewels`)), `${p.id}: ${g} is crafted by phase ${n}`);
        } else if (hasRecipe(g)) assert.ok(crafts.some(([ph, name]) => ph <= n && name === g), `${p.id}: ${g} is crafted by phase ${n}`);
      }
    });
  });

  it('restocks each consumable in every phase whose loadout uses it', () => {
    const { crafts } = needsBuild.ROUTES[arch.id];
    def.phases.forEach((p, i) => {
      for (const g of p.loadout.gear.filter(x => CONSUMABLE.test(x))) {
        assert.ok(crafts.some(([ph, name]) => ph === i + 1 && name === g), `${p.id}: the stockpile makes ${g} in phase ${i + 1}`);
      }
    });
  });

  it('wears the highest Gear Level weapon, magic source and armor crafted so far', () => {
    const { crafts } = needsBuild.ROUTES[arch.id];
    const wearable = g => isChest(g) && !BASE_ONLY.some(b => g.startsWith(b));
    const slots = [['weapon', g => WEAPON.test(g), weaponTier], ['magic source', isMagic, magicTier], ['armor', wearable, setLevel]];
    def.phases.forEach((p, i) => {
      const made = crafts.filter(([ph]) => ph <= i + 1).map(([, name]) => name);
      for (const [what, is, level] of slots) {
        const worn = p.loadout.gear.find(is), best = made.filter(is).sort((a, b) => level(b) - level(a))[0];
        if (best) assert.ok(level(worn) >= level(best), `${p.id} ${what}: wears ${worn}, but ${best} is crafted by now`);
      }
    });
    // The sets skipped above must be presented as bases, not armor to wear.
    const craftText = def.phases.flatMap(p => p.craft || []);
    for (const b of BASE_ONLY) {
      const c = craftText.find(x => x.ic === `${b} Chestguard`);
      assert.ok(c && /only the base/.test(strip(c.t)), `${b} is crafted as a base only`);
    }
  });

  it('stockpiles Stygian Shards for every passive its loadouts use', () => {
    const used = new Set(def.phases.flatMap(p => p.loadout.gear.filter(g => PASSIVES.includes(g))));
    const { extra } = needsBuild.ROUTES[arch.id];
    for (const [kind, pool, shard, price] of [['Elemental', PASSIVES.slice(0, 12), 'Stygian Shard', 400], ['Vampire', PASSIVES.slice(12), 'Greater Stygian Shard', 600]]) {
      const k = [...used].filter(x => pool.includes(x)).length;
      const row = extra.find(([, what]) => what.startsWith(`${kind} passives ×`));
      assert.ok(row, `${kind} passives are in the stockpile`);
      assert.equal(+row[1].match(/×(\d+)/)[1], k, `${kind} passives: the loadouts use ${k}`);
      // Discover gives a random passive you don't have yet: k specific ones out of 12 take k·13/(k+1) Discovers on average.
      assert.equal(row[2][shard], Math.round(k * 13 / (k + 1) * price), `${kind} passives: expected ${shard} cost`);
    }
    assert.ok(extra.some(([ph, what]) => ph === 5 && what === 'Altar of Stygian Awakening'), 'the Altar itself is stockpiled');
  });

  it('names real materials and has no placeholder text', () => {
    for (const [res, [, how]] of Object.entries(def.resources)) {
      assert.doesNotMatch(strip(how), PLACEHOLDER, `${res}: how to get it`);
      if (def.needs[res]) assert.doesNotMatch(res, / gem$/i, `${res}: stockpile a specific gem`);
    }
    for (const p of def.phases) assert.doesNotMatch(phaseText(p), PLACEHOLDER, `${p.id} text`);
    for (const [name, html] of [['endgame', endgame], ['reference', ref]]) assert.doesNotMatch(strip(html), PLACEHOLDER, name);
  });

  it('covers the whole gear and station progression in the right phases', () => {
    const where = name => {
      const i = def.phases.findIndex(p => iconsIn(p).has(name));
      return i >= 0 ? i + 1 : def.phases.findIndex(p => mentions(phaseText(p), name)) + 1 || null;
    };
    for (const [name, phase] of Object.entries({ ...MILESTONES.common, ...MILESTONES[arch.id] })) assert.equal(where(name), phase, `${name} in phase ${phase}`);
    [[2, 2], [3, 4], [4, 6], [5, 7]].forEach(([lvl, phase]) => assert.ok(phaseText(def.phases[phase - 1]).includes(`castle heart level ${lvl}`), `Castle Heart ${lvl} in phase ${phase}`));
  });

  it('lists the same crafts as its stockpile (site/build-needs.js)', () => {
    const cfg = needsBuild.ROUTES[arch.id];
    assert.ok(cfg, 'build-needs has this route');
    const textOf = n => phaseText(def.phases[n - 1]) + '\n' + def.phases[n - 1].loadout.gear.join('\n').toLowerCase();
    for (const [n, item] of cfg.crafts) assert.ok(mentions(textOf(n), item), `phase ${n} mentions ${item}`);
    for (const [n, what] of cfg.extra) {
      const name = what.replace(/ ×\d+.*$| \(.*\)$/, '');
      assert.ok(mentions(textOf(n), name), `phase ${n} mentions ${name}`);
    }
  });

  it('has a gather note for every stockpiled material, available in time', () => {
    const json = JSON.parse(fs.readFileSync(path.join(SITE, 'routes', arch.id, 'needs.json'), 'utf8'));
    assert.deepEqual(JSON.parse(JSON.stringify(def.needs)), json, 'needs.js matches needs.json');
    assert.ok(Object.keys(def.needs).length > 30, 'a full material list');
    const bosses = bossList(def);
    for (const [res, phases] of Object.entries(def.needs)) {
      const r = def.resources[res];
      assert.ok(r && Number.isInteger(r[0]) && strip(r[1]).length, `${res} has a phase and a how-to`);
      const first = Math.min(...Object.keys(phases).map(Number));
      assert.ok(r[0] <= first, `${res}: gatherable in phase ${r[0]}, first needed in ${first}`);
      for (const [ph, v] of Object.entries(phases)) assert.ok(Number.isInteger(v.qty) && v.qty > 0 && v.for.length && +ph >= 1 && +ph <= 8, `${res} P${ph}`);
      // "Recipe from Morian", "Fabricator (Ziva)": that boss must come no later than the material's phase.
      for (const b of bosses) {
        const short = b.name.replace(/^(General|Sir|Lord) /, '').split(' ')[0];
        if (new RegExp(`[Rr]ecipe from ${short}\\b|\\(${short}\\)`).test(strip(r[1]))) assert.ok(b.phase <= r[0], `${res}: ${b.name} (phase ${b.phase}) by phase ${r[0]}`);
      }
    }
  });

  it('regenerates the same stockpile from the item data', { skip: !fs.existsSync(path.join(ROOT, 'data', 'items.json')) && 'data/items.json not downloaded' }, () => {
    const { needs, missing } = needsBuild.compute(arch.id);
    assert.deepEqual(missing, [], 'every craft has a recipe');
    assert.deepEqual(needs, JSON.parse(fs.readFileSync(path.join(SITE, 'routes', arch.id, 'needs.json'), 'utf8')));
  });

  it('has an icon for everything it shows', () => {
    const known = {};
    for (const n of [...Object.keys(iconLists.ITEMS), ...iconLists.PAGES, ...iconLists.BOSSES, ...iconLists.STATIONS]) known[n] = 'icon';
    const p = page();
    p.window.VR_ICONS = known;
    p.run('js/core.js');
    const missing = [...icons].filter(n => !['Starting dash', '—'].includes(n) && !p.window.BR.h.srcOf(n));
    assert.deepEqual(missing, []);
  });

  it('renders its endgame and reference tabs cleanly', () => {
    for (const [name, html] of [['endgame', endgame], ['reference', ref], ['phases', JSON.stringify(def.phases)]]) {
      assert.ok(html.length > 1000, `${name} has content`);
      assert.doesNotMatch(html, /undefined|NaN|\[object Object\]/, `${name} has no broken values`);
    }
  });

  it('agrees with the V Blood rewards in the game data', () => {
    // Icon stand-ins: Terrorclaw unlocks the Advanced Tannery, shown with the Tannery icon.
    const standIn = { 'Terrorclaw the Ogre': ['Tannery'] };
    for (const b of bossList(def)) {
      const mine = REWARDS.filter(r => r.name === b.name || (b.name === 'Quincey the Bandit King' && r.name === 'Quincey the Marauder'));
      for (const g of b.gets) {
        const owners = REWARDS.filter(r => r.rewards.has(g.toLowerCase()));
        if (!owners.length || (standIn[b.name] || []).includes(g)) continue;
        assert.ok(mine.some(r => r.rewards.has(g.toLowerCase())), `${g} comes from ${owners.map(r => r.name).join(', ')}, not ${b.name}`);
      }
    }
  });
});

describe('shared route data', () => {
  const p = page();
  p.run('js/core.js');
  p.run('routes/shared.js');
  const S = p.window.BR.shared;

  it('keeps boss levels and map markers identical in every route', () => {
    for (const { def } of READY) for (const b of bossList(def)) {
      const [lv, map] = S.VB[b.name];
      assert.equal(b.lv, lv, `${def.id}: ${b.name} level`);
      assert.equal(b.map, map, `${def.id}: ${b.name} marker`);
    }
  });

  it('unlocks each weapon line from the boss the game data says', () => {
    for (const w of S.WEAPONS.filter(w => w.from !== 'Start')) {
      const boss = full(w.from.replace(/ \d+$/, ''));
      assert.ok(REWARDS.find(r => r.name === boss).rewards.has(`iron ${w.w.toLowerCase()}`), `${boss} unlocks Iron ${w.w}`);
      assert.equal(+w.from.match(/\d+$/)[0], S.VB[boss][0], `${w.w}: ${boss} level`);
    }
  });

  it('computes weapon skill rates from their parts', () => {
    for (const w of S.WEAPONS) {
      assert.equal(w.skills.length, 2, `${w.w} has two skills`);
      for (const [, dmg, cd] of w.skills) assert.ok(dmg > 0 && cd >= 8 && cd <= 10, `${w.w} skill numbers`);
    }
  });
});
