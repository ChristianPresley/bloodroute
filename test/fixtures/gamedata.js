// The BR_GAME schema: what site/build-gamedata.js writes to site/gamedata.js and what js/cards.js, js/map.js and
// js/state.js read. A small, real sample (patch 1.1.13), used by the tests. Keep it in step with build-gamedata.js.
//
// Conventions
// - Every map is keyed by the name the routes use (display names, e.g. "Warlock Vest", "Errol the Stonebreaker").
// - Coordinates are world [x, z] pairs (gaming.tools markers); js/map.js projects them with `bounds`.
// - Text is plain (no HTML), with game tokens cleaned: "%125" → "125%", "\n" → newline, "{value}" → "".
// - Any field can be missing; renderers must cope.
(typeof window !== 'undefined' ? window : globalThis).BR_GAME = {
  version: { data: '1790852702230', patch: '1.1.13', captured: '2026-10-07' },
  credit: { data: 'vrising.gaming.tools', map: 'V Rising Wiki', jewels: 'V Rising Wiki (CC BY-SA)' },
  // World bounds of the map image (square: 3040 units each way). px = (x - minX) / (maxX - minX) * width; py = (maxZ - z) / (maxZ - minZ) * width.
  bounds: { minX: -2885, minZ: -2400, maxX: 155, maxZ: 640 },

  // Items: gear, consumables, materials, jewels.
  //   kind: weapon | armor | jewelry | jewel | consumable | material | other
  //   cat: the in-game type (Crossbow, Chest, Magic Source, Elixir, Brew, Coating, Mineral, …)
  //   stats: [label, value, unit] with readable labels ("Spell Power", "Max Health"); unit is '%' or ''.
  //   recipe: the station recipe the route uses; inputs are [name, qty]; unlock names the bosses/research that teach it
  //     (journal quests as "Journal: <quest>"); out: how many one craft makes (when not 1); byproduct: the recipe's main
  //     output when this item is a side product (Ghost Shroom from sawing Cursed Wood). A jewel with no school uses
  //     "Regular gem" / "Flawless gem" (one of the spell's school).
  //   drops: top sources by drop rate; kind npc | vblood | loot; layer names an entry in `layers` holding its spawn points;
  //     n: how many spawns/containers. Servant hunts are loot named "Servant hunt: <mission>" and listed last.
  //   icon: the gaming.tools icon path (site/build-icons.js downloads icons for card-only names from it).
  //   Names a card only lists (NPC drops, second-level recipe inputs) get a stub: id, kind, cat, rarity, icon.
  items: {
    'Iron Crossbow': {
      id: 'item_weapon_crossbow_t05_iron', kind: 'weapon', cat: 'Crossbow', rarity: 'Rare', gl: 15,
      desc: 'A ranged weapon that fires long range bolts.',
      stats: [['Physical Power', 13.8, ''], ['Resource Power', 14, '']],
      skills: ['Rain of Bolts', 'Snapshot'],
      recipe: { station: 'Smithy', time: 60, inputs: [['Iron Ingot', 12], ['Plank', 8]], unlock: ['Quincey the Bandit King'] },
      icon: '/images/icons/stunlock_icon_ironcrossbow01.webp',
    },
    'Warlock Vest': {
      id: 'item_chest_t04_copper_scholar', kind: 'armor', cat: 'Chest', rarity: 'Common', gl: 4,
      desc: 'Elegant robes inscribed with runes of power.',
      stats: [['Max Health', 90.2, '']], set: 'Warlock Vestment',
      recipe: { station: 'Simple Workbench', inputs: [['Nightstalker Vest', 1], ['Leather', 4], ['Coarse Thread', 4], ['Copper Ingot', 8]], unlock: ['Research Desk'] },
    },
    'Ring of the Sorcerer': {
      id: 'item_magicsource_general_t04_sorcererring', kind: 'jewelry', cat: 'Magic Source', rarity: 'Common', gl: 12,
      desc: 'Magic Sources increase gear level and boost the power of spells.',
      stats: [['Spell Power', 12.8, '']],
      recipe: { station: 'Artisan Table', inputs: [['Gravedigger Ring', 1], ['Crude Amethyst', 4], ['Greater Blood Essence', 1]], unlock: ['Research Desk'] },
    },
    'Enchanted Brew': {
      id: 'item_consumable_spellbrew_t01', kind: 'consumable', cat: 'Brew',
      desc: 'A brew that increases spell power by 3 for 60 minutes.\n\nEffect persists through death.',
      effect: 'Spell Power +3 for 60 minutes',
      recipe: { station: 'Alchemy Table', inputs: [['Snow Flower', 32], ['Fish Bone', 1], ['Empty Waterskin', 1]], unlock: ['Research Desk'] },
    },
    'Elixir of the Prowler': {
      id: 'item_elixir_prowler_t01', kind: 'consumable', cat: 'Elixir',
      desc: 'A brew that increases Bonus Movement Speed by 4% and Veil Cooldown Rate by 7% for 60 minutes.\n\nOnly one elixir may be active at a time.',
      effect: 'Movement Speed +4%, Veil Cooldown Rate +7% for 60 minutes',
      recipe: { station: 'Alchemy Table', inputs: [['Sunflower', 20], ['Fire Blossom', 20], ['Greater Blood Essence', 1], ['Empty Glass Bottle', 1]], unlock: ['Meredith the Bright Archer'] },
    },
    'Copper Ingot': {
      id: 'item_ingredient_mineral_copperbar', kind: 'material', cat: 'Mineral',
      desc: 'Metal component used to craft weapons and armour.\n\nProduced at a Furnace.',
      recipe: { station: 'Furnace', inputs: [['Copper Ore', 20]] },
      drops: [{ name: 'Gattler', rate: 0.217, kind: 'npc', n: 15, layer: 'npc:char_gloomrot_gattler' }],
    },
    'Coarse Thread': {
      id: 'item_ingredient_thread_coarse', kind: 'material', cat: 'Tailoring',
      desc: 'Tailoring components are used for crafting clothes, armour and cloaks.',
      recipe: { station: 'Loom', inputs: [['Plant Fibre', 8], ['Pollen', 12]] },
      drops: [{ name: 'Bandit Armory', rate: 1, kind: 'loot' }, { name: 'Bandit Thug', rate: 0.1, kind: 'npc', n: 40, layer: 'npc:char_bandit_thug' }],
    },
    'Primal jewel': {
      id: 'item_jewel_chaos_t04', kind: 'jewel', cat: 'Jewel', rarity: 'Legendary',
      desc: 'A jewel with four modifiers for one spell.',
      recipe: { station: 'Jewelcrafting Table', inputs: [['Flawless Amethyst', 4], ['Greater Stygian Shard', 320]] },
    },
  },

  // Abilities: spells, veils, ultimates, weapon skills, shapeshift forms.
  //   slot: Spell | Veil | Ultimate | Weapon | Form | Travel | Other. cd and cast in seconds; charges defaults to 1.
  //   icon: the gaming.tools icon path, as for items.
  abilities: {
    'Chaos Volley': { id: 'ab_chaos_volley_abilitygroup', school: 'Chaos', slot: 'Spell', desc: 'Launch 2 Chaos Bolts in a sequence that deals 125% magic damage and inflicts Ignite.', cd: 8, cast: 0.6 },
    'Veil of Frost': { id: 'ab_frost_veiloffrost_abilitygroup', school: 'Frost', slot: 'Veil', desc: 'Dash forward leaving an illusion; your next primary attack is empowered and inflicts Chill.', cd: 8, cast: 0.5 },
    'Chaos Barrage': { id: 'ab_chaos_barrage_abilitygroup', school: 'Chaos', slot: 'Ultimate', desc: 'Channel a barrage of chaos projectiles.', cd: 120, cast: 1 },
    'Rain of Bolts': { id: 'ab_vampire_crossbow_rainofbolts_group', slot: 'Weapon', weapon: 'Crossbow', desc: 'Fire a volley of bolts into the air that rains down on the target area.', cd: 8 },
    'Wolf Form': { id: 'ab_shapeshift_wolf_group', slot: 'Form', desc: 'Transform into a wolf: faster travel.' },
  },

  // NPCs: every V Blood plus the enemies the cards show (blood carriers, drop sources).
  //   stats: physical/spell power, damage reduction and resistances (percent values as numbers).
  //   abilities: distinct attack names (their count feeds the difficulty score). drops: [item, rate].
  //   spawns: [[x, z], …]; empty for bosses with no fixed spawn (Nibbles is summoned at your castle).
  //   Enemies are keyed by the name routes/shared.js CARRIERS uses ("Bandit Thug", "Militia Guard", "Slave Master (pistol)"),
  //   else the in-game name (bandits get "Bandit "); same-named variants share one entry with merged spawns.
  npcs: {
    'Errol the Stonebreaker': {
      id: 'char_bandit_stonebreaker_vblood', lv: 20, vblood: true, unit: 'Human',
      desc: 'A brutal mining foreman, just as adept at crushing stone as he is crushing bone.',
      stats: { pp: 24.4, sp: 24.4, dr: 0, physRes: 0, spellRes: 0, fireRes: 0 },
      res: { silver: 0, holy: 0, garlic: 0, sun: 0 },
      abilities: ['Primary Attack', 'Secondary Attack', 'Reinforcements'],
      drops: [['Unsullied Heart', 0.25], ['Copper Ingot', 1]],
      spawns: [[-1549, -1464]],
    },
    'Adam the Firstborn': {
      id: 'char_gloomrot_monster_vblood', lv: 88, vblood: true, unit: 'Human',
      desc: 'The culmination of Doctor Henry Blackbrew’s brilliance.',
      stats: { pp: 106.9, sp: 106.9, dr: 0, physRes: 0, spellRes: 0, fireRes: 75 },
      abilities: ['Primary Attack', 'Arctic Leap', 'Monster Throw', 'Chaos Barrier', 'Lightning Pillars', 'Eye of the Storm', 'Spectral Strike'],
      spawns: [[-1854, 356]],
    },
    'Bandit Thug': { id: 'char_bandit_thug', lv: 16, unit: 'Human', blood: 'Warrior', drops: [['Coarse Thread', 0.1]], spawns: [[-1500, -1400], [-1520, -1380]] },
  },

  // Blood types: tier bonuses (tier, text; tier 5 is the general boost) and the NPCs that carry them (keys of npcs).
  blood: {
    Scholar: { tiers: [[1, 'Increased Spell Power and 10% Shield Efficiency.'], [2, 'Increased Spell Cooldown Rate.'], [3, 'Ultimate Power; using an Ultimate resets your spell cooldowns.'], [4, 'Increased Spell Charge Gain.']], carriers: ['Nun', 'Priest'] },
  },
  // Armor sets: pieces and bonuses (pieces, text).
  sets: {
    'Warlock Vestment': { pieces: ['Warlock Vest', 'Warlock Leggings', 'Warlock Gloves', 'Warlock Boots'], bonuses: [[2, '+4% Spell Cooldown Rate'], [4, '+1 Gear Level']] },
  },
  // Stations: build cost and what unlocks them.
  stations: {
    Smithy: { desc: 'A workstation used for crafting iron weapons.', cost: [['Blood Essence', 200], ['Plank', 30], ['Iron Ingot', 12]], unlock: ['Quincey the Bandit King'] },
  },

  // Jewel modifier pools per spell (wiki Template:Jewel_Table): every option with its tier range.
  jewels: {
    'Chaos Volley': [
      { text: 'Hitting a target affected by Ignite engulfs it in Agonizing Flames dealing 2 - 6% damage and healing you for 8 - 12% of your spell power 5 times.', range: '2 - 6%' },
      { text: 'Hitting a different target with the second projectile deals 40 - 60% additional damage.', range: '40 - 60%' },
      { text: 'Increases damage by 8 - 20%', range: '8 - 20%' },
      { text: 'Increases projectile range and speed by 12 - 24%.', range: '12 - 24%' },
      { text: 'Knock targets back 0.8 - 1.6 meters on hit.', range: '0.8 - 1.6' },
      { text: 'Reduces cooldown by 8 - 12%.', range: '8 - 12%' },
    ],
  },
  // Ancestral weapon roll pool (wiki Ancestral Forge): every stat that can roll, with its range.
  rolls: [
    { text: 'Spell Critical Strike Chance', range: '8 - 16%' },
    { text: 'Spell Critical Strike Damage', range: '8 - 16%' },
    { text: 'Spell Cooldown Recovery Rate', range: '6 - 12%' },
    { text: 'Physical Critical Strike Chance', range: '8 - 16%' },
  ],

  // Point layers for maps: resource nodes (by gaming.tools layer id, all of them), NPC spawns ("npc:<id>") and loot
  // containers ("loot:<prefab>"). Points within ~12 units are merged, at most ~60 per layer.
  layers: {
    copper_ore: { name: 'Copper Ore', pts: [[-1199, -1902], [-1241, -1898]] },
    'npc:char_bandit_thug': { name: 'Bandit Thug', pts: [[-1500, -1400], [-1520, -1380]] },
  },
  // Materials: the layers where they're gathered (nodes or the raw material's nodes) and their best drop sources.
  //   via: the gathered material(s) a refined one is made from ("Sulphur Ore + Tech Scrap"). layers can be empty.
  mats: {
    'Copper Ingot': { layers: ['copper_ore'], via: 'Copper Ore' },
    'Coarse Thread': { layers: ['npc:char_bandit_thug'] },
  },
  // Vampire waygates (fast travel), deduplicated.
  waygates: [[-1812, -1829], [-890, -1812]],
};
