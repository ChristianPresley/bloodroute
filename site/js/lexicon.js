// Bloodroute lexicon: what kind of thing a name is (gear, spell, consumable, boss, place…), the category containers
// the planner groups things into, and the game's fixed lists (passives, blood types, gear tiers, spells, weapon
// skills, stations). Facts about bosses, regions, places and materials live in js/lexicon-data.js (BR.lexData).
// Loaded after js/core.js and js/lexicon-data.js; the tests read the same lists.
(() => {
  'use strict';
  const BR = window.BR;
  const D = () => BR.lexData || {};
  const G = () => window.BR_GAME || {};

  // Stygian passives (W/Altar_of_Stygian_Awakening): 12 elemental (Stygian Shards) and 12 vampire (Greater Stygian Shards).
  const PASSIVES = {
    elemental: ['Arcane Animator', 'Blood Spray', 'Chaos Kindling', 'Chillweave', 'Cold Soul', 'Enhanced Conductivity', 'Flowing Sorcery',
      'Lightning Fast Strikes', 'Renewing Flames', 'Sanguine Mastery', 'Soul Drinker', 'Spiritual Infusion'],
    vampire: ['Bastion', 'Dark Enchantment', 'Embrace Mayhem', 'Feral Haste', 'Hunger for Blood', 'Hunger for Power', 'Lethal Strikes', 'Overpower',
      'Rampage', 'Ravenous Strikes', 'Turbulent Velocity', 'Wicked Power'],
  };
  const ALL_PASSIVES = [...PASSIVES.elemental, ...PASSIVES.vampire];
  const BLOODS = ['Scholar', 'Draculin', 'Mutant', 'Warrior', 'Rogue', 'Brute', 'Creature', 'Worker', 'Corrupted'];

  // Gear tiers, low to high.
  const WEAPON = /(Crossbow|Longbow|Sword|Greatsword|Axes|Mace|Spear|Reaper|Twinblade|Pistols|Slashers|Claws|Whip|Daggers)( Shards)?$/;
  const WEAPON_TIERS = ['Bone', 'Reinforced Bone', 'Copper', 'Merciless Copper', 'Iron', 'Merciless Iron', 'Dark Silver', 'Sanguine', 'Ancestral'];
  const MAGIC_TIERS = [['Bone Ring', 3], ['Blood Bone Ring', 6], ['Gravedigger Ring', 9], ['Ring of the ', 12], ['Scourgestone Pendant', 15],
    ['Pendant of the ', 18], ['Blood Merlot Amulet', 22], ['Amulet of the ', 25], ['Blood Key', 25], ['Soul Shard of ', 25]];
  const ARMOR_TIERS = { 'Boneguard': 1, 'Plated Boneguard': 2, 'Nightstalker': 3, 'Warlock': 4, 'Grim Ranger': 4, 'Marauder': 4, 'Shadewalker': 4,
    'Hollowfang': 5, 'Dark Magus': 6, 'Blood Hunter': 6, 'Crimson Templar': 6, 'Duskwatcher': 6, 'Dawnthorn': 7, 'Maleficer Scholar': 8,
    'Dread Plate': 8, 'Grim Knight': 8, 'Shadowmoon': 8, "Dracula's": 9 };
  // Loadout items that are used up (restocked every phase) and jewels.
  const CONSUMABLE = /^(Elixir of the |Brew of |Potion of )|^(Enchanted Brew|Witch Potion)$| Coating$/;
  const JEWEL = /^(Regular|Greater|Primal) (\w+ )?jewel$/;

  // Spells by school: [spells, veil, ultimates]. Covers every spell a route shows.
  const SCHOOLS = {
    Blood: [['Shadowbolt', 'Blood Rite', 'Blood Rage', 'Sanguine Coil', 'Carrion Swarm', 'Blood Fountain'], 'Veil of Blood', ['Crimson Beam', 'Heart Strike', 'Blood Storm']],
    Chaos: [['Chaos Volley', 'Aftershock', 'Rain of Chaos', 'Void', 'Power Surge'], 'Veil of Chaos', ['Chaos Barrage', 'Merciless Charge', 'Voidquake Vortex']],
    Frost: [['Cold Snap', 'Ice Block', 'Crystal Lance', 'Frost Bat', 'Ice Nova', 'Arctic Storm'], 'Veil of Frost', ['Arctic Leap']],
    Illusion: [['Phantom Aegis', 'Wraith Spear', 'Spectral Wolf', 'Mosquito', 'Curse', 'Mist Trance'], 'Veil of Illusion', ['Wisp Dance', 'Spectral Guardian', "Serpent's Kiss"]],
    Storm: [['Ball Lightning', 'Cyclone', 'Lightning Tendrils', 'Polarity Shift', 'Discharge', 'Lightning Curtain'], 'Veil of Storm', ['Lightning Typhoon', 'Raging Tempest', 'Eye of the Storm']],
    Unholy: [['Bone Explosion', 'Corrupted Skull', 'Unholy Chains', 'Soulburn', 'Ward of the Damned'], 'Veil of Bones', ['Volatile Arachnid', 'Death Knight']],
  };
  const SPELLS = {};
  for (const [school, [spells, veil, ults]] of Object.entries(SCHOOLS)) {
    spells.forEach(n => SPELLS[n] = { school, slot: 'Spell' });
    SPELLS[veil] = { school, slot: 'Veil' };
    ults.forEach(n => SPELLS[n] = { school, slot: 'Ultimate' });
  }
  SPELLS['Starting dash'] = { school: 'Shadow', slot: 'Veil' };
  const FORMS = ['Wolf Form', 'Rat Form', 'Bear Form', 'Human Form', 'Spider Form', 'Toad Form', 'Bat Form'];
  const OTHER_ABILITIES = ['Blood Hunger', 'Dominate', 'Subdue', 'Feed Prisoner'];

  // Weapon skills (V Rising wiki weapon pages): weapon type → its two skills. js/routes/shared.js keeps the
  // per-skill numbers in WEAPONS; a test checks the names agree.
  const WEAPON_SKILLS = {
    Crossbow: ['Rain of Bolts', 'Snapshot'], Sword: ['Whirlwind', 'Shockwave'], Axes: ['Frenzy', 'X-Strike'], Mace: ['Crushing Blow', 'Smack'],
    Spear: ['A Thousand Spears', 'Harpoon'], Greatsword: ['Great Cleaver', 'Death from Above'], Reaper: ['Tendon Swing', 'Howling Reaper'],
    Claws: ['Lunge', 'Skewering Leap'], Twinblade: ['Javelin', 'Sweeping Strike'], Pistols: ['Fan the Hammer', 'Explosive Bullet'],
    Whip: ['Aerial Whip Twirl', 'Entangling Whip'],
  };
  const SKILL_WEAPON = {};
  for (const [w, s] of Object.entries(WEAPON_SKILLS)) s.forEach(n => SKILL_WEAPON[n] = w);
  const weaponType = name => (String(name).match(WEAPON) || [])[1] || null;

  const STATIONS = ['Research Desk', 'Study', 'Athenaeum', 'Alchemy Table', 'Smithy', 'Tailoring Bench', 'Tannery', 'Advanced Tannery', 'Woodworking Bench',
    'Artisan Table', 'Jewelcrafting Table', 'Gem Cutting Table', 'Anvil', 'Prison Cell', 'Altar of Stygian Awakening', 'Fusion Forge',
    'Ancestral Forge', 'Blood Homogenizer', 'Eye of Mortium', 'Blood Press', 'Advanced Blood Press', 'Loom', 'Advanced Loom', 'Furnace',
    'Advanced Furnace', 'Fabricator', 'Simple Workbench', 'Sawmill', 'Castle Heart', 'Stygian Summoning Circle', 'Waygate', 'Paper Press',
    'Devourer', 'Vermin Nest', 'Grinder', 'Leatherworking Station', 'Mist Brazier'];
  const CONSUMABLES = /^(Brew of |Potion of )|^(Enchanted Brew|Witch Potion|Blood Rose Brew|Blood Rose Potion|Vermin Salve|Blood Merlot|Minor Explosive Box|Putrid Rat)$|Resistance (Potion|Flask)$/;
  const MATERIAL = /Ingot|Ore$|Plank|Leather|Thread|Yarn|Weave|^Silk$|Glass|Bottle|Waterskin|Dust$|Whetstone|Shard$|Essence$|Heart$|^Bone$|^Stone$|Ruby$|Topaz$|Sapphire$|Emerald$|Amethyst$|Miststone$|Flower$|Blossom$|Lily$|Rose$|Clarion$|Brier$|Shroom$|Grapes$|Sap$|^Scroll$|^Paper$|Schematic$|Battery$|Alloy$|Core$|Crystal$|Tear$|^Scourgestone$|Fish|Sunflower$|Sulphur$|Tech Scrap$|Quartz$|Cotton$|Wood$/;

  const STAGES = { Beginning: 'Beginning', Early: 'Early game', Mid: 'Mid game', Late: 'Late game', End: 'Endgame' };

  // What a name is. Order matters: bosses before everything, specific consumables before the material catch-all.
  function kindOf(name) {
    const n = String(name || '');
    if (!n) return 'unknown';
    const d = D(), g = G();
    if (BR.h.GLYPH && n in BR.h.GLYPH && n !== 'Starting dash') return 'glyph';
    if ((d.VBLOOD && d.VBLOOD[n]) || (g.npcs && g.npcs[n] && g.npcs[n].vblood) || BR.h.BOSS_NAMES.has(n) || /the Immortal King$/.test(n)) return 'boss';
    if (d.REGIONS && d.REGIONS[n]) return 'region';
    if (d.PLACES && d.PLACES[n]) return 'place';
    if (BLOODS.includes(n)) return 'blood';
    if (ALL_PASSIVES.includes(n)) return 'passive';
    if (SPELLS[n]) return ({ Spell: 'spell', Veil: 'veil', Ultimate: 'ult' })[SPELLS[n].slot];
    if (FORMS.includes(n)) return 'form';
    if (SKILL_WEAPON[n]) return 'weapon-skill';
    if (OTHER_ABILITIES.includes(n)) return 'ability';
    if (JEWEL.test(n) || /^(Regular|Greater|Primal) gem$/.test(n)) return 'jewel';
    if (/^Elixir of the /.test(n)) return 'elixir';
    if (/ Coating$/.test(n)) return 'coating';
    if (CONSUMABLES.test(n)) return 'consumable';
    if (WEAPON.test(n) || n === 'Fishing Pole') return 'weapon';
    if (MAGIC_TIERS.some(([k]) => n.startsWith(k))) return 'jewelry';
    if (/(Chestguard|Vest|Leggings|Gloves|Boots|Battlegear|Vestment|Regalia)$|^Shroud of /.test(n)) return 'armor';
    if (STATIONS.includes(n)) return 'station';
    if ((d.MATERIALS && d.MATERIALS[n]) || MATERIAL.test(n)) return 'material';
    if (g.npcs && g.npcs[n]) return 'enemy';
    if (d.ENEMIES && d.ENEMIES[n]) return 'enemy';
    return 'unknown';
  }

  // Category containers on the planner. Loadouts: abilities, weapon and skills, equipment, jewels, consumables, blood
  // and passives. Craft lists: equipment, consumables, jewels, castle and stations, materials.
  const CONTAINERS = [
    ['abilities', 'Abilities', ['veil', 'spell', 'ult', 'glyph']],
    ['weapon', 'Weapon & skills', ['weapon', 'weapon-skill']],
    ['equipment', 'Equipment', ['armor', 'jewelry']],
    ['jewels', 'Jewels & mods', ['jewel']],
    ['consumables', 'Consumables', ['elixir', 'consumable', 'coating']],
    ['blood', 'Blood & passives', ['blood', 'passive']],
  ];
  const CRAFT_GROUPS = [
    ['equipment', 'Equipment', ['weapon', 'armor', 'jewelry']],
    ['consumables', 'Consumables', ['elixir', 'consumable', 'coating']],
    ['jewels', 'Jewels', ['jewel']],
    ['castle', 'Castle & stations', ['station']],
    ['materials', 'Materials & other', []],
  ];
  const containerOf = (kind, list = CONTAINERS) => (list.find(([, , kinds]) => kinds.includes(kind)) || list[list.length - 1])[0];

  BR.lex = {
    PASSIVES, ALL_PASSIVES, BLOODS, WEAPON, WEAPON_TIERS, MAGIC_TIERS, ARMOR_TIERS, CONSUMABLE, JEWEL,
    SCHOOLS, SPELLS, FORMS, WEAPON_SKILLS, SKILL_WEAPON, STATIONS, STAGES, CONTAINERS, CRAFT_GROUPS,
    kindOf, containerOf, weaponType,
    get data() { return D(); },
  };
})();
