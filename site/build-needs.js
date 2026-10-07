// Computes the raw materials each route phase's crafting needs, from data/items.json recipes, and writes
// routes/<id>/needs.js for the stockpile counters. Run: node site/build-needs.js [route id ...] (default: all)
// The tests (test/) import ROUTES, compute() and recipesByName() to check the route pages against these crafts.
const fs = require('fs');
const path = require('path');

// [phase, item name, how many to craft]. Armor sets list all four pieces.
const set = (phase, names) => names.map(n => [phase, n, 1]);
const pieces = (phase, base, chest = 'Chestguard') => set(phase, [`${base} ${chest}`, `${base} Leggings`, `${base} Gloves`, `${base} Boots`]);
// Consumables are drunk, so every phase whose loadout uses one restocks it: { phase: name } → [phase, name, n].
const drinks = (byPhase, n = 2) => Object.entries(byPhase).map(([p, name]) => [+p, name, n]);
const castle = [
  [2, 'Castle Heart level 2', { 'Leather': 12, 'Copper Ingot': 12 }],
  [4, 'Castle Heart level 3', { 'Reinforced Plank': 8, 'Glass': 24, 'Greater Blood Essence': 1 }],
  [4, 'Eye of Mortium', { 'Iron Ingot': 4, 'Scourgestone': 4, 'Scroll': 20 }],
  [4, 'Prison Cell', { 'Iron Ingot': 8, 'Reinforced Plank': 2 }],
  [5, 'Altar of Stygian Awakening', { 'Regular Ruby': 1, 'Iron Ingot': 12, 'Greater Blood Essence': 4 }],
  [6, 'Castle Heart level 4', { 'Radium Alloy': 12, 'Primal Blood Essence': 1 }],
  [7, 'Castle Heart level 5', { 'Dark Silver Ingot': 12, 'Power Core': 4, 'Primal Blood Essence': 1 }],
];
const key = [
  [7, 'Onyx Tear ×8 (Blood Key + Epic Ancestral)', { 'Gold Ingot': 32, 'Power Core': 32, 'Ember Glass': 32 }],
  [7, 'Blood Key', { 'Primal Blood Essence': 4, 'Blood Crystal': 200 }],
  [7, 'Epic shard (Northern Mortium merchant)', { 'Greater Stygian Shard': 1500 }],
];
// Altar Discovers unlock a random passive you don't have yet, out of 12 elemental (400 Stygian) or 12 vampire (600 Greater).
// Landing k specific ones takes k(n+1)/(k+1) Discovers on average, so these are expected costs, not guarantees.
const discovers = k => k * 13 / (k + 1);
const passives = (elemental, vampire, ePhase = 5) => [
  [ePhase, `Elemental passives ×${elemental} (≈${discovers(elemental).toFixed(1)} Discovers)`, { 'Stygian Shard': Math.round(discovers(elemental) * 400) }],
  [7, `Vampire passives ×${vampire} (≈${discovers(vampire).toFixed(1)} Discovers)`, { 'Greater Stygian Shard': Math.round(discovers(vampire) * 600) }],
];

// A physical route: weapon line (with its copper/iron types), armor line, jewelry and consumables per phase.
// early = weapon you start with, main = { name, phase } of the weapon from mid game, elixirs = { phase: elixir },
// jewels = { regular: {gem: n}, greater: {gem: n} }, passives = [elemental, vampire] passives the route Discovers.
function physical({ early, main, sets, ring, pendant, amulet, elixirs, coating, jewels, passives: [elemental, vampire] }) {
  const regular = Object.values(jewels.regular).reduce((a, b) => a + b, 0) / 4;
  const greater = Object.values(jewels.greater).reduce((a, b) => a + b, 0) / 4;
  return {
    crafts: [
      [1, 'Bone Ring', 1], [1, `Bone ${early}`, 1], [1, `Reinforced Bone ${early}`, 1], [1, `Copper ${early}`, 1],
      ...set(1, ['Nightstalker Vest', 'Nightstalker Leggings', 'Nightstalker Gloves', 'Nightstalker Boots']),
      [2, 'Gravedigger Ring', 1], [2, `Merciless Copper ${early}`, 1], ...pieces(2, sets[0], 'Vest'),
      [3, ring, 1], [3, `Iron ${early}`, 1], [3, 'Brew of Ferocity', 3],
      ...set(4, ['Hollowfang Chestguard', 'Hollowfang Leggings', 'Hollowfang Gloves', 'Hollowfang Boots']),
      [4, 'Scourgestone Pendant', 1], ...(main.phase === 4 ? [[4, `Iron ${main.name}`, 1]] : []),
      ...pieces(5, sets[1]), [5, pendant, 1], ...(main.phase === 5 ? [[5, `Iron ${main.name}`, 1]] : []), [5, `Merciless Iron ${main.name}`, 1],
      ...set(6, ['Dawnthorn Chestguard', 'Dawnthorn Leggings', 'Dawnthorn Gloves', 'Dawnthorn Boots']),
      [6, `Dark Silver ${main.name}`, 1], [6, 'Blood Merlot', 1], [6, 'Blood Merlot Amulet', 1], [6, 'Silver Resistance Potion', 2],
      ...pieces(7, sets[2]), [7, amulet, 1], [7, `Sanguine ${main.name}`, 1],
      ...pieces(8, sets[3]),
      ...drinks(elixirs), ...drinks({ 4: 'Brew of Ferocity', 5: 'Brew of Ferocity', 6: 'Brew of Ferocity', 7: 'Potion of Rage', 8: 'Potion of Rage' }),
      ...drinks({ 7: coating, 8: coating }),
    ],
    extra: [
      ...castle,
      [5, `Regular jewels ×${regular}`, { ...jewels.regular, 'Iron Ingot': regular * 4 }],
      [6, `Greater jewels ×${greater}`, { ...jewels.greater, 'Dark Silver Ingot': greater * 4 }],
      ...key, ...passives(elemental, vampire),
    ],
  };
}

const ROUTES = {
  spellcaster: {
    crafts: [
      [1, 'Bone Ring', 1], [1, 'Bone Crossbow', 1], [1, 'Reinforced Bone Crossbow', 1], [1, 'Copper Crossbow', 1],
      ...set(1, ['Nightstalker Vest', 'Nightstalker Leggings', 'Nightstalker Gloves', 'Nightstalker Boots']),
      [2, 'Gravedigger Ring', 1], [2, 'Merciless Copper Crossbow', 1],
      ...set(2, ['Warlock Vest', 'Warlock Leggings', 'Warlock Gloves', 'Warlock Boots']),
      [3, 'Ring of the Sorcerer', 1], [3, 'Enchanted Brew', 3], [3, 'Iron Crossbow', 1],
      ...set(4, ['Hollowfang Chestguard', 'Hollowfang Leggings', 'Hollowfang Gloves', 'Hollowfang Boots']),
      [4, 'Scourgestone Pendant', 1],
      ...set(5, ['Dark Magus Chestguard', 'Dark Magus Leggings', 'Dark Magus Gloves', 'Dark Magus Boots']),
      [5, 'Pendant of the Sorcerer', 1], [5, 'Merciless Iron Crossbow', 1],
      ...set(6, ['Dawnthorn Chestguard', 'Dawnthorn Leggings', 'Dawnthorn Gloves', 'Dawnthorn Boots']),
      [6, 'Dark Silver Crossbow', 1], [6, 'Blood Merlot', 1], [6, 'Blood Merlot Amulet', 1], [6, 'Silver Resistance Potion', 2],
      ...set(7, ['Maleficer Scholar Chestguard', 'Maleficer Scholar Leggings', 'Maleficer Scholar Gloves', 'Maleficer Scholar Boots']),
      [7, 'Amulet of the Arch-Warlock', 1], [7, 'Sanguine Crossbow', 1],
      ...set(8, ["Dracula's Maleficer Chestguard", "Dracula's Maleficer Leggings", "Dracula's Maleficer Gloves", "Dracula's Maleficer Boots"]),
      ...drinks({ 5: 'Elixir of the Prowler', 6: 'Elixir of the Bat', 7: 'Elixir of the Twisted', 8: 'Elixir of the Twisted' }),
      ...drinks({ 4: 'Enchanted Brew', 5: 'Enchanted Brew', 6: 'Enchanted Brew', 7: 'Witch Potion', 8: 'Witch Potion' }),
      ...drinks({ 7: 'Unholy Coating', 8: 'Unholy Coating' }),
    ],
    // Recipes not in items.json (structures, jewels, intermediates), from research_sources.md.
    // Jewels, 4 gems each: Chaos Volley (Amethyst), Lightning Tendrils (Topaz), Veil of Bones (Emerald) in Phases 5–6,
    // Veil of Frost (Sapphire) for the Primal set.
    extra: [
      ...castle,
      [5, 'Regular jewels ×3', { 'Regular Topaz': 4, 'Regular Emerald': 4, 'Regular Amethyst': 4, 'Iron Ingot': 12 }],
      [6, 'Greater jewels ×3', { 'Flawless Topaz': 4, 'Flawless Emerald': 4, 'Flawless Amethyst': 4, 'Dark Silver Ingot': 12 }],
      ...key,
      [7, 'Primal jewels ×3', { 'Flawless Topaz': 4, 'Flawless Sapphire': 4, 'Flawless Amethyst': 4, 'Greater Stygian Shard': 960 }],
      ...passives(4, 2),
    ],
  },
  warrior: physical({
    early: 'Sword', main: { name: 'Reaper', phase: 4 }, sets: ['Grim Ranger', 'Blood Hunter', 'Dread Plate', "Dracula's Dread"],
    ring: 'Ring of the Warrior', pendant: 'Pendant of the Warrior', amulet: 'Amulet of the Crimson Commander',
    elixirs: { 4: 'Elixir of the Prowler', 5: 'Elixir of the Crow', 6: 'Elixir of the Werewolf', 7: 'Elixir of the Werewolf', 8: 'Elixir of the Werewolf' },
    coating: 'Blood Coating', jewels: { regular: { 'Regular Ruby': 8 }, greater: { 'Flawless Ruby': 8 } }, passives: [3, 3],
  }),
  rogue: physical({
    early: 'Axes', main: { name: 'Pistols', phase: 5 }, sets: ['Shadewalker', 'Duskwatcher', 'Shadowmoon', "Dracula's Shadow"],
    ring: 'Ring of the Warrior', pendant: 'Pendant of the Warrior', amulet: 'Amulet of the Crimson Commander',
    elixirs: { 4: 'Elixir of the Prowler', 5: 'Elixir of the Raven', 6: 'Elixir of the Raven', 7: 'Elixir of the Raven', 8: 'Elixir of the Raven' },
    coating: 'Unholy Coating', jewels: { regular: { 'Regular Amethyst': 8 }, greater: { 'Flawless Amethyst': 8 } }, passives: [3, 4],
  }),
  brute: physical({
    early: 'Spear', main: { name: 'Twinblade', phase: 5 }, sets: ['Marauder', 'Crimson Templar', 'Grim Knight', "Dracula's Grim"],
    ring: 'Ring of the Duskwatcher', pendant: 'Pendant of the Duskwatcher', amulet: 'Amulet of the Blademaster',
    elixirs: { 5: 'Elixir of the Beast', 6: 'Elixir of the Werewolf', 7: 'Elixir of the Werewolf', 8: 'Elixir of the Werewolf' },
    coating: 'Blood Coating', jewels: { regular: { 'Regular Topaz': 4, 'Regular Ruby': 4 }, greater: { 'Flawless Topaz': 4, 'Flawless Ruby': 4 } },
    passives: [3, 3],
  }),
};

// Crafted gear that feeds the next tier is not a raw material.
const SKIP = /Crossbow$|Sword$|Axes$|Spear$|Reaper$|Twinblade$|Pistols$|Ring$|Pendant$|Amulet$|Vest$|Leggings$|Gloves$|Boots$|Chestguard$|^Blood Merlot$/;
// Intermediates the stockpile counts as what they're made of (before phase `until`, if given):
// Greater Blood Essence comes only from Unsullied Hearts until Tristan (Phase 4) adds the Blood Essence recipe,
// and the Fabricator makes 2 Power Cores from 8 Radium Alloy + 4 Charged Battery.
const MADE = {
  'Greater Blood Essence': { until: 4, from: { 'Unsullied Heart': 4 } },
  'Power Core': { from: { 'Radium Alloy': 4, 'Charged Battery': 2 } },
};
// Recipe names sometimes use a curly apostrophe (Hell’s Clarion); match the icon and resource names.
const norm = n => n.replace(/’/g, "'");

// The crafting recipe: some items list a vendor price (coins) first.
const recipeOf = i => (i.recipes || []).find(r => r.ingredients && r.ingredients.length && !r.ingredients.some(([n]) => / Coin$/.test(n)));
// Some names appear more than once in items.json (event and legacy copies); prefer the one crafted at a real station.
function recipesByName(items) {
  const byName = {};
  for (const i of items) {
    const r = recipeOf(i);
    if (!r) continue;
    const prev = byName[i.name];
    if (!prev || (!prev.recipe.station && r.station)) byName[i.name] = { recipe: r };
  }
  return byName;
}

// A route's raw materials: { needs: { resource: { phase: { qty, for } } }, missing: [item names without a recipe] }.
function compute(id, items = require('../data/items.json')) {
  const { crafts, extra } = ROUTES[id];
  const byName = recipesByName(items);
  const needs = {};  // resource -> { phase -> { qty, for: [] } }
  const add = (phase, res, qty, forWhat) => {
    const made = MADE[res];
    if (made && !(phase >= made.until)) {
      for (const [ing, q] of Object.entries(made.from)) add(phase, ing, qty * q, `${forWhat} (${res})`);
      return;
    }
    const r = (needs[res] ??= {}); const p = (r[phase] ??= { qty: 0, for: [] });
    p.qty += qty; if (!p.for.includes(forWhat)) p.for.push(forWhat);
  };
  const missing = [];
  for (const [phase, name, count] of crafts) {
    const it = byName[name];
    if (!it) { missing.push(name); continue; }
    for (const [ing, qty] of it.recipe.ingredients) if (!SKIP.test(ing)) add(phase, norm(ing), qty * count, name);
  }
  for (const [phase, what, ings] of extra) for (const [ing, qty] of Object.entries(ings)) add(phase, ing, qty, what);
  return { needs, missing };
}

function build(id) {
  const { needs, missing } = compute(id);
  const out = path.join(__dirname, 'routes', id);
  fs.writeFileSync(path.join(out, 'needs.json'), JSON.stringify(needs, null, 1));
  fs.writeFileSync(path.join(out, 'needs.js'), `// Generated by site/build-needs.js from item recipes.\n(window.BR_NEEDS ??= {}).${id} = ` + JSON.stringify(needs) + ';\n');
  console.log(`\n${id}: ${Object.keys(needs).length} resources`); if (missing.length) console.log('missing recipes:', missing.join(', '));
  for (const [r, ph] of Object.entries(needs)) console.log(r.padEnd(26), Object.entries(ph).map(([p, v]) => `P${p}:${v.qty}`).join('  '));
}

module.exports = { ROUTES, compute, recipesByName };

if (require.main === module) {
  const ids = process.argv.slice(2);
  for (const id of ids.length ? ids : Object.keys(ROUTES)) {
    if (!ROUTES[id]) { console.error(`Unknown route: ${id}`); process.exitCode = 1; continue; }
    build(id);
  }
}
