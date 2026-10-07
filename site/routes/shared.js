// Bloodroute: data and views shared by the Warrior, Rogue and Brute routes: V Blood locations, materials,
// common steps and crafts, blood carriers, the weapon table and the reference cards.
// Load it before those routes' needs.js and route.js. Sources: game data (data/), the V Rising wiki
// (research tiers, blood carriers, weapon skills, stat caps) and docs/research_sources.md.
(() => {
  'use strict';
  const { ic, tiles, srcOf, L, M, C, CAMPS } = BR.h;

  // ---------- V Bloods: name → [level, Map Genie marker, where] ----------
  const VB = {
    'Alpha the White Wolf': [16, 178446, 'any wolf den'],
    'Errol the Stonebreaker': [20, 178451],
    'Keely the Frost Archer': [20, 178445],
    'Rufus the Foreman': [20, 178449],
    'Grayson the Armourer': [27, 178453],
    'Goreswine the Ravager': [27, 178447, 'roams the forest'],
    'Clive the Firestarter': [30, 178454],
    'Lidia the Chaos Archer': [30, 178452, 'spawns along Farbane paths'],
    'Nibbles the Putrid Rat': [30, 178456, 'summoned with a Vermin Nest'],
    'Finn the Fisherman': [32, 355625],
    'Polora the Feywalker': [35, 178262],
    'Nicholaus the Fallen': [35, 178450],
    'Kodia the Ferocious Bear': [35, 178384],
    'Quincey the Bandit King': [37, 178444, `in the ${L(M(178391), 'Bandit Stronghold')}; enter with Minor Explosive Boxes or Bear Form`],
    'Beatrice the Tailor': [40, 178468, 'Dunley Farmlands'],
    'Tristan the Vampire Hunter': [44, 178455, 'wanders Farbane paths'],
    'Christina the Sun Priestess': [44, 178472, 'roams between Dawnbreak and Mosswick'],
    'Vincent the Frostbringer': [44, 178474, 'wanders Dunley paths'],
    'Sir Erwin the Gallant Cavalier': [46, 449769],
    'Kriig the Undead General': [47, 348261, `around the ${L(M(178316), 'Haunted Iron Mine')}`],
    'Maja the Dark Savant': [47, 282796],
    'Leandra the Shadow Priestess': [47, 178470],
    'Meredith the Bright Archer': [50, 178311],
    'Grethel the Glassblower': [50, 282806],
    'Bane the Shadowblade': [50, 284510, 'hooded human on Dunley paths'],
    'Terah the Geomancer': [53, 178471],
    'Frostmaw the Mountain Terror': [53, 178467, 'roams the Hallowed Mountains'],
    'General Elena the Hollow': [53, 355624, 'Ruins of Mortium roads'],
    'Gaius the Cursed Champion': [55, 450463, `${L(M(178286), 'Colosseum')} or Dunley paths`],
    'Jade the Vampire Hunter': [57, 178473, 'wanders Dunley paths'],
    'General Cassius the Betrayer': [57, 396636, 'Ruins of Mortium paths'],
    'Raziel the Shepherd': [57, 178475],
    'Octavian the Militia Captain': [58, 178469],
    'Domina the Blade Dancer': [60, 283049, 'Gloomrot South'],
    'Ziva the Engineer': [60, 282801, 'Gloomrot South'],
    'Angram the Purifier': [61, 283050, 'Gloomrot South'],
    'Ben the Old Wanderer': [63, 348111, 'Cursed Forest'],
    'Ungora the Spider Queen': [63, 178458, 'Cursed Forest'],
    'Foulrot the Soultaker': [63, 178457, 'Cursed Forest'],
    'Willfred the Village Elder': [64, 178476, 'Dunley'],
    'Albert the Duke of Balaton': [64, 178459, 'Cursed Forest'],
    'Cyril the Cursed Smith': [65, 283052, 'Cursed Forest'],
    'Sir Magnus the Overseer': [66, 283051, 'Silverlight Hills'],
    'Mairwyn the Elementalist': [70, 178464, 'Silverlight Hills'],
    'Baron du Bouchon the Sommelier': [70, 348237, 'Silverlight Hills'],
    'Morian the Stormwing Matriarch': [70, 178465, 'Silverlight Hills'],
    'Henry Blackbrew the Doctor': [74, 283053, 'Gloomrot North'],
    'Jakira the Shadow Huntress': [75, 474543, 'Oakveil Woodlands'],
    'Stavros the Carver': [75, 474540, 'Oakveil'],
    'Matka the Curse Weaver': [76, 178460, 'Cursed Forest'],
    'Lucile the Venom Alchemist': [76, 450465, 'Oakveil'],
    'Terrorclaw the Ogre': [76, 178281, 'Hallowed Mountains'],
    'Azariel the Sunbringer': [79, 178466, 'Silverlight Hills; bring a Holy Resistance Flask'],
    'Voltatia the Power Master': [79, 284506, 'Gloomrot North'],
    'Simon Belmont the Vampire Hunter': [80, null, `no fixed marker: patrols Farbane, Dunley and Silverlight roads, ending at the ${L(M(178286), 'Colosseum')}`],
    'Dantos the Forgebinder': [82, 450466, 'Oakveil'],
    'General Valencia the Depraved': [84, 356943, 'Ruins of Mortium'],
    'Gorecrusher the Behemoth': [84, 178462, 'Cursed Forest'],
    'Lord Styx the Night Champion': [84, 355626, "Dracula's Demise, circling a giant Blood Crystal on the Dunley–Gloomrot border"],
    'Talzur the Winged Horror': [86, 178448, `${L(M(178385), 'The Dreaded Peak')}, Farbane`],
    'Solarus the Immaculate': [86, 178463, 'Silverlight Hills'],
    'Adam the Firstborn': [88, 284505, 'Gloomrot North'],
    'Megara the Serpent Queen': [88, 508500, 'Oakveil'],
    'Dracula the Immortal King': [91, 378284, 'Ruins of Mortium; needs the Blood Key'],
  };
  // Boss entries for a route's phases: B = the build needs it (★), O = optional.
  const boss = must => (name, gets, take) => {
    if (!VB[name]) throw new Error(`Unknown V Blood: ${name}`);
    const [lv, map, where] = VB[name];
    return { lv, name, must, map, where, gets, take };
  };
  const B = boss(true), O = boss(false);

  // ---------- Steps and crafts every physical route shares ----------
  const STEP = {
    boneguard: { ic: 'Boneguard Chestguard', t: 'Craft the Boneguard set from the inventory, then upgrade to Plated Boneguard at the Simple Workbench.' },
    castle: { ic: 'Castle Heart', t: `Place a Castle Heart on a ${L(C(6117), 'castle plot')} with a coffin, chest and Mist Brazier. "Shelter" unlocks the Furnace, Sawmill, Simple Workbench, Grinder and Blood Press.` },
    copper: { ic: 'Copper Ingot', t: `Smelt Copper Ingot in the Furnace from ${L(C(6091), 'Copper Ore')}.` },
    workbench: { ic: 'Simple Workbench', t: 'Build a Sawmill and Simple Workbench and raise your Gear Level ("Getting Ready for the Hunt" unlocks Blood Tracking).' },
    desk: { ic: 'Research Desk', t: 'Finish "Thirst for Power": beat 3 more V Bloods and equip a new spell. It rewards the Research Desk; build it and spend Paper on blueprints.' },
    heart2: { ic: 'Castle Heart', t: 'Castle Heart level 2: 12 Leather + 12 Copper Ingot.' },
    dominate: { ic: 'Dominate', t: 'Get Dominate: "Waygate" gives the Stone Coffin → "Lord of the Manor" gives the Servant Coffin → "Servants" (Blood Press + Servant Coffin) gives Dominate.' },
    heart3: { ic: 'Castle Heart', t: 'Castle Heart level 3: 8 Reinforced Plank + 24 Glass + 1 Greater Blood Essence ("Reign Supreme" gives the Eye of Mortium).' },
    eye: { ic: 'Eye of Mortium', t: 'Build the Eye of Mortium inside your territory (4 Iron Ingot + 4 Scourgestone + 20 Scroll). It tracks Rift Incursions for Phase 5 shards.' },
    shards: { ic: 'Stygian Shard', t: 'Farm Stygian Shards in Tier 1 Rift Incursions (recommended Lv 57+, every 30 minutes, tracked with the Eye of Mortium) and at Ruins of Mortium points of interest.' },
    greater: { ic: 'Greater Stygian Shard', t: 'Farm Greater Stygian Shards in Tier 2 Rift Incursions (Lv 80, ~65 per solo run) or convert 12:1 at the Gem Cutting Table.' },
  };
  const CRAFT = {
    nightstalker: next => ({ ic: 'Nightstalker Vest', t: `<b>Nightstalker set</b> (vest: 8 Leather + 4 Coarse Thread), the base for ${next}. Coarse Thread drops in ${L(M(CAMPS), 'Farbane bandit camps')} or comes from the Shady Goods Dealer at the ${L(M('283054,284512'), 'Shady Merchants Camp')}.` }),
    hearts: { ic: 'Unsullied Heart', t: 'Keep every Unsullied Heart. These four bosses drop one 25% of the time; you need 4 for the Phase 3 ring.' },
    gravedigger: { ic: 'Gravedigger Ring', t: `<b>Gravedigger Ring</b> (GL 9): 12 Grave Dust + 32 ${L(C(6116), 'Mourning Lily')}. Wear it until Phase 3, then it becomes your ring.` },
    ring: (name, gem, stat) => ({ ic: name, t: `<b>${name}</b> (GL 12, ${stat}, Research Desk): make a Greater Blood Essence at the Blood Press from 4 Unsullied Hearts, then Gravedigger Ring + 4 ${gem} (${L(C(6098), 'gem nodes')}) + 1 Greater Blood Essence.` }),
    brew: { ic: 'Brew of Ferocity', t: `<b>Brew of Ferocity</b> (+3 Physical Power, Research Desk blueprint, Alchemy Table): 32 Hell's Clarion (${L(C(6106), 'map layer')}) + Fish Bone + Empty Waterskin. Herb & Potion merchants also sell it.` },
    heal: { ic: 'Vermin Salve', t: `Healing: Vermin Salve and Blood Rose Brew (${L(C(6088), 'Blood Rose')}).` },
    hollowfang: next => ({ ic: 'Hollowfang Chestguard', t: `<b>Hollowfang Battlegear</b> (Tailoring Bench; chest 12 Cotton Yarn + 8 Wool Thread), only the base for ${next}. Loot thread in Dunley; ${L(M('432218,432220,432221,432222'), 'cotton patches')} are there too.` }),
    scourgestone: { ic: 'Scourgestone Pendant', t: '<b>Scourgestone Pendant</b> (GL 15, Artisan Table): 8 Scourgestone + 24 Gem Dust.' },
    prowler: { ic: 'Elixir of the Prowler', t: `<b>Elixir of the Prowler</b> (+7% Veil Cooldown Rate, +4% Movement Speed): 20 Sunflower (${L(M('179518,179681,432219'), 'patches')}) + 20 ${L(C(6089), 'Fire Blossom')} + Greater Blood Essence + Empty Glass Bottle.` },
    rareAncestral: w => ({ ic: `Ancestral ${w} Shards`, t: `<b>Rare Ancestral ${w}</b> (optional, Ancestral Forge): Merciless Iron ${w} + a Rare Ancestral ${w} shard + 8 Radium Alloy + 1 Greater Blood Essence. Two random rolls. Shards: 25% from Lv 53+ V Bloods, 50% from Tier 1 Rifts, or 750 Stygian at the southern Mortium Vampire Merchant. A Dark Silver or Sanguine ${w} raises it to GL 24 and 27 later.` }),
    dawnthorn: next => ({ ic: 'Dawnthorn Chestguard', t: `<b>Dawnthorn Regalia</b> (chest 12 Pristine Leather + 8 Silk). Don't wear it; it's only the base for ${next}.` }),
    merlot: { ic: 'Blood Merlot', t: '<b>Blood Merlot</b> (drink, at a Prison Cell): Empty Glass Bottle + 60 Sacred Grapes (Brighthaven vineyards or Sacred Grape Seeds).' },
    merlotAmulet: { ic: 'Blood Merlot Amulet', t: '<b>Blood Merlot Amulet</b> (GL 22, Artisan Table): 1 Blood Merlot + 4 Dark Silver Ingot + 12 Radium Alloy. Wear it for the Gear Level; it is also the base for your GL 25 amulet.' },
    castle4: { ic: 'Castle Heart', t: 'Castle Heart level 4: 12 Radium Alloy + 1 Primal Blood Essence (unlocks Subdue).' },
    fish: blood => ({ ic: 'Corrupted Fish', t: `<b>Corrupted Fish</b>: fish at ${L(M(178412), 'Brighthaven Docks')} and feed your ${blood} prisoner up to 100% (Tier V: every blood bonus +20%).` }),
    rage: { ic: 'Potion of Rage', t: `<b>Potion of Rage</b> (+5 Physical Power, Athenaeum): 60 Plague Brier + 60 Hell's Clarion + Fish Bone + Empty Glass Bottle, or 60 Goldsun Coins at the City Herb & Potion Vendor or the ${L(M(355898), 'Treasure Hunter')}. Replaces the Brew.` },
    coating: (name, why) => ({ ic: name, t: `<b>${name}</b> (Stavros, Alchemy Table): 16 Corrupted Flower + 16 Venom Sap, both from Oakveil. ${why} Recharges every 12 s and lasts 60 minutes.` }),
    castle5: { ic: 'Castle Heart', t: 'Castle Heart level 5: 12 Dark Silver Ingot + 4 Power Core + 1 Primal Blood Essence.' },
    onyx: { ic: 'Onyx Tear', t: `<b>Onyx Tear</b> (Anvil): 4 Gold Ingot + 4 Power Core + 4 Ember Glass. Also drops from Lv 79+ bosses or from the ${L(M(355898), 'Treasure Hunter')}.` },
    key: { ic: 'Blood Key', t: "<b>Blood Key</b> (Artisan Table): 4 Onyx Tear + 4 Primal Blood Essence + 200 Blood Crystal (mined at Dracula's Demise with a GL 23+ weapon). Opens Dracula's castle." },
    epicAncestral: (w, rolls) => ({ ic: `Ancestral ${w} Shards`, t: `<b>Epic Ancestral ${w}</b> (3 rolls, Ancestral Forge): Sanguine ${w} + an Epic ${w} shard + 4 Onyx Tear. Epic shards: ~5% from Lv 79+ bosses and Tier 2 Rifts, or 1,500 Greater at the Northern Mortium Vampire Merchant (${L(M('400681,400682'), 'probable markers')}). ${rolls} Merge two at the Fusion Forge (12 Ember Glass) to keep the best rolls.` }),
    shard: { ic: 'Soul Shard of Dracula', t: 'Wear the <b>Soul Shard of Dracula</b>: primary hits can trigger Bloodthirst (+15% damage for 6 s), and it unlocks Blood Storm, an invulnerable channel. Since 1.1 you can keep any ultimate with a Soul Shard.' },
    repair: { ic: 'Greater Stygian Shard', t: 'Keep the shard repaired: feed on Primal Blood Souls in Tier 2 Rift Incursions (+750 each, shared across carried shards).' },
  };
  const ACCESS = [['Shroud of the Forest', 'Cursed Forest fogs your view: kill Ben first and craft his Shroud of the Forest.'], ['Silver Resistance Potion', 'Silverlight Hills hurts with silver: bring Willfred\'s Silver Resistance Potion.']];
  const NOTE = {
    hearts: 'From Grayson on, almost every V Blood drops an Unsullied Heart guaranteed (25% only from Alpha, Errol, Keely, Rufus, Lidia, Kodia and Finn).',
    blueprints: 'Research Desk blueprints are random within a category (60 Paper for a weapon, 50 for armour). Clive always drops a weapon blueprint and Grayson an armour one; the Shady Merchants Camp sells them too.',
    quincey: 'The game data also lists a "Lv 30 Quincey the Marauder". It\'s a duplicate entry; the real fight is the Lv 37 Bandit King.',
    horizons: 'The journal\'s "Broaden Horizons" (Lv 40) sends you on to Dunley Farmlands.',
    fish: 'Corrupted Fish (raises prisoner quality ±2% per feed) is only caught in Oakveil or at Brighthaven Docks, so catch a high-quality prisoner for now.',
    study: 'Study blueprints cost Scrolls. Meredith and Jade always drop a weapon blueprint, Raziel a magic one, and Bane, Octavian and Angram an armour one.',
    gl: 'Gear Level is worth chasing: you deal about 4% less damage per level under a boss.',
  };

  // ---------- Materials: when you can first gather them (phase) and how ----------
  const gems = (tier, names, phase, how) => Object.fromEntries(names.map(n => [`${tier} ${n}`, [phase, how]]));
  const GEMS = ['Ruby', 'Topaz', 'Sapphire', 'Emerald', 'Amethyst', 'Miststone'];
  const RES = {
    'Bone': [1, 'Skeletons and beasts all over Farbane'], 'Plank': [1, 'Sawmill (from wood)'], 'Stone': [1, 'Rocks everywhere'],
    'Copper Ingot': [1, `Furnace, from ${L(C(6091), 'Copper Ore')}`], 'Leather': [1, 'Tannery (Keely), from animal hides'],
    'Coarse Thread': [1, `Loot ${L(M(CAMPS), 'bandit camps')} or the ${L(M('283054,284512'), 'Shady Goods Dealer')}; Loom from Lv 40`],
    'Unsullied Heart': [1, 'V Blood drops (25% early, guaranteed from Grayson on)'], 'Mourning Lily': [1, L(C(6116), 'Mourning Lily map layer')],
    'Snow Flower': [1, L(C(6090), 'Snow Flower map layer')], "Hell's Clarion": [1, `${L(C(6106), "Hell's Clarion map layer")}: caves and underground areas; Mantraps drop it`],
    ...gems('Crude', GEMS, 1, L(C(6098), 'Gem nodes')),
    'Gem Dust': [1, 'Grinder (from gems)'], 'Empty waterskin': [1, 'Recipe from Keely'], 'Grave Dust': [2, 'Recipe from Goreswine'],
    'Whetstone': [2, 'Recipe from Grayson'], 'Greater Blood Essence': [2, 'Blood Press, from 4 Unsullied Hearts (from Tristan, also from Blood Essence)'],
    'Fish Bone': [3, `Fish with Finn's pole at ${L(C(6104), 'fishing spots')}`], 'Iron Ingot': [3, `Furnace (Quincey), from ${L(C(6093), 'Iron Ore')} (GL 12+ weapon)`],
    'Cotton Yarn': [3, `Loot in Dunley; ${L(M('432218,432220,432221,432222'), 'cotton patches')}; Loom recipe from Beatrice`],
    'Sunflower': [3, L(M('179518,179681,432219'), 'Dunley sunflower patches')], 'Fire Blossom': [3, L(C(6089), 'Fire Blossom map layer')],
    'Wool Thread': [4, 'Recipe from Christina; loot in Dunley'], 'Scourgestone': [4, 'Recipe from Leandra'], 'Scroll': [4, 'Paper Press / recipe from Maja'],
    'Glass': [4, 'Recipe from Grethel'], 'Empty Glass Bottle': [4, 'Recipe from Grethel'], 'Reinforced Plank': [4, 'Recipe from Vincent'],
    'Thick Leather': [5, 'Recipe from Frostmaw'], ...gems('Regular', GEMS, 5, 'Gem Cutting Table (Terah)'),
    'Primal Blood Essence': [5, 'Advanced Blood Press (Jade)'], 'Radium Alloy': [5, 'Fabricator (Ziva)'],
    'Bleeding Heart': [5, 'Grows across the Ruins of Mortium'], 'Plague Brier': [5, 'Brier plants in Gloomrot South (cut with an Iron or better weapon)'],
    'Pristine Leather': [6, 'Recipe from Ben'], 'Silk': [6, 'Recipe from Ungora'], 'Dark Silver Ingot': [6, `Advanced Furnace (Cyril), from ${L(C(6094), 'Silver Ore')} (GL 18+)`],
    'Sacred Grapes': [6, 'Brighthaven vineyards (Silverlight) or Sacred Grape Seeds'], ...gems('Flawless', GEMS, 6, 'Recipe from Morian'),
    'Ghost Shroom': [6, 'Grows in the Cursed Forest; also comes from Cursed Wood at the Sawmill'],
    'Blood Crystal': [6, 'Mine at Dracula\'s Demise with a GL 23+ weapon'], 'Ghost Yarn': [7, 'Advanced Loom (Matka)'], 'Power Core': [7, 'Recipe from Voltatia'],
    'Gold Ingot': [7, 'Recipe from Azariel'], 'Ember Glass': [7, 'Recipe from Dantos'], 'Shadow Weave': [7, 'Recipe from Valencia'], 'Bat Leather': [7, 'Recipe from Gorecrusher'],
    'Corrupted Flower': [7, 'Grows in the Oakveil Woodlands'], 'Venom Sap': [7, 'Looted across Oakveil; also from Corrupted Oak (Advanced Sawmill) or Corrupted Fish (Blood Press)'],
  };

  // ---------- Where each physical blood type lives (V Rising wiki, Enemies page) ----------
  const CARRIERS = {
    Warrior: [['Farbane Woods', 'Bandit Rascal 10 · Thug 16 · Thief 18 · Bomber 32'], ['Dunley Farmlands', 'Militia Torchbearer 36 · Guard 40 · Demolisher 47'],
      ['Gloomrot', 'Batoon 58 · Sentry Officer 60'], ['Silverlight Hills', 'Slave Master (morningstar) 65 · Knight 71 · Paladin 76'],
      ['Oakveil Woodlands', 'Lurker 73 · Dreadcleaver 74 · Sentinel 81 (these also carry Corrupted blood)']],
    Rogue: [['Farbane Woods', 'Bandit Scout 10 · Poacher 16 · Trapper 20 · Deadeye 26'], ['Dunley Farmlands', 'Militia Crossbowman 36 · Archer 42'],
      ['Gloomrot', 'Railgunner 58 · Tazer 58'], ['Silverlight Hills', 'Rifleman 65 · Slave Master (pistol) 65'],
      ['Oakveil Woodlands', 'Dartflinger 73 · Viper 74–82 (these also carry Corrupted blood)']],
    Brute: [['Farbane Woods', 'Bandit Mugger 22 · Stalker 30'], ['Dunley Farmlands', 'Militia Skirmisher 36 · Veteran 54'],
      ['Gloomrot', 'Tractor Beamer 58'], ['Silverlight Hills', 'Church Archer 56 · Footman 65 · Cleric 68'],
      ['Oakveil Woodlands', 'Striker 74–82 (also carries Corrupted blood)']],
  };

  // ---------- Weapon skills (V Rising wiki weapon pages, 2025–26) ----------
  // combo = the wiki's primary "Combo DPS" (% of Physical Power per second); skills = [name, % per use, cooldown s].
  // Javelin counts the recall, Shockwave the recast, A Thousand Spears the thrust, X-Strike both axes, Lunge its recast.
  const WEAPONS = [
    { w: 'Sword', icon: 'Iron Sword', from: 'Start', combo: 64.7, skills: [['Whirlwind', 175, 8], ['Shockwave', 160, 8]] },
    { w: 'Axes', icon: 'Iron Axes', from: 'Start', combo: 68.7, skills: [['Frenzy', 100, 8], ['X-Strike', 160, 8]] },
    { w: 'Mace', icon: 'Iron Mace', from: 'Start', combo: 68.1, skills: [['Crushing Blow', 150, 8], ['Smack', 70, 8]] },
    { w: 'Spear', icon: 'Iron Spear', from: 'Start', combo: 75.6, skills: [['A Thousand Spears', 190, 9], ['Harpoon', 110, 8]] },
    { w: 'Greatsword', icon: 'Iron Greatsword', from: 'Tristan 44', combo: 73.3, skills: [['Great Cleaver', 125, 8], ['Death from Above', 125, 10]] },
    { w: 'Reaper', icon: 'Iron Reaper', from: 'Kriig 47', combo: 73.8, skills: [['Tendon Swing', 130, 8], ['Howling Reaper', 230, 8]] },
    { w: 'Claws', icon: 'Iron Claws', from: 'Frostmaw 53', combo: null, skills: [['Lunge', 180, 8], ['Skewering Leap', 100, 10]] },
    { w: 'Twinblade', icon: 'Iron Twinblade', from: 'Gaius 55', combo: 83.3, skills: [['Javelin', 205, 8], ['Sweeping Strike', 100, 8]] },
    { w: 'Pistols', icon: 'Iron Pistols', from: 'Jade 57', combo: 76.7, skills: [['Fan the Hammer', 250, 8], ['Explosive Bullet', 140, 10]] },
    { w: 'Whip', icon: 'Iron Whip', from: 'Domina 60', combo: null, skills: [['Aerial Whip Twirl', 100, 10], ['Entangling Whip', 100, 10]] },
  ];
  const skillRate = x => x.skills.reduce((s, [, d, cd]) => s + d / cd, 0);
  function weaponCard(picks) {
    const bestCombo = Math.max(...WEAPONS.map(x => x.combo || 0)), bestSkill = Math.max(...WEAPONS.map(skillRate));
    const hi = (v, best, txt) => v === best ? `<span class="best">${txt}</span>` : txt;
    const rows = WEAPONS.map(x => {
      const r = skillRate(x), pick = picks.includes(x.w);
      return `<tr><td><span class="cell">${ic(x.icon, 32)}${pick ? `<b>${x.w} ★</b>` : x.w}</span></td><td>${x.from}</td>
        <td class="num">${x.combo ? hi(x.combo, bestCombo, x.combo.toFixed(1) + '%') : '—'}</td>
        ${x.skills.map(([n, d, cd]) => `<td>${n} <span class="mono">${d}%/${cd}s</span></td>`).join('')}
        <td class="num">${hi(r, bestSkill, r.toFixed(1) + '%')}</td></tr>`;
    }).join('');
    return `<div class="card"><h2>Weapons compared</h2>
      <p>Base numbers from the wiki's weapon pages, before any bonuses. Primary is the wiki's combo damage per second; skills per second assumes one target, every hit landing and each skill used on cooldown. ★ marks this route's weapons. Claws add Puncture ruptures and the whip's primary depends on hitting with the tip, so they have no combo figure. Daggers, Slashers and the bows depend on positioning and are left out.</p>
      <div class="scroll"><table><thead><tr><th>Weapon</th><th>Unlock</th><th>Primary/s</th><th>Skill 1</th><th>Skill 2</th><th>Skills/s</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  // ---------- Reference and endgame views ----------
  const table = (head, rows) => `<div class="scroll"><table>${head ? `<thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  // cfg: { blood, picks: weapon names, research: [[station, unlockedBy, recipes]], mastery: { text, rows: [[icon, tier, bonus, from]] } }
  function renderRef(cfg) {
    const slots = [['General Elena the Hollow', 53, 355624], ['General Cassius the Betrayer', 57, 396636], ['Cyril the Cursed Smith', 65, 283052], ['Jakira the Shadow Huntress', 75, 474543], ['Simon Belmont the Vampire Hunter', 80, null]];
    const layers = [['V Bloods', 6066], ['Waygates', 6047], ['Castle plots', 6117], ['Merchants', 6114], ['Fishing spots', 6104, 'Fish Bone'], ['Mourning Lily', 6116, 'Mourning Lily'], ['Snow Flower', 6090, 'Snow Flower'], ['Blood Rose', 6088, 'Blood Rose Brew'], ['Fire Blossom', 6089, 'Fire Blossom'], ["Hell's Clarion", 6106, "Hell's Clarion"], ['Copper Ore', 6091, 'Copper Ore'], ['Iron Ore', 6093, 'Iron Ore'], ['Silver Ore', 6094, 'Silver Ore'], ['Gem Stone', 6098, 'Crude Ruby']];
    return `
      <div class="grid2">
        <div class="card"><h2>Research tiers</h2>${table(null, cfg.research.map(([st, by, what]) => [`<span class="cell">${ic(st, 36)}<span><b>${st}</b><br><span style="font-size:12px;color:var(--muted)">${by}</span></span></span>`, what]))}
          <p>${NOTE.study}</p></div>
        <div class="card"><h2 class="cell">${ic(cfg.blood, 40)}Where to find ${cfg.blood} blood</h2>${table(['Region', 'Carriers and level'], CARRIERS[cfg.blood])}
          <p>Blood tiers unlock at 1 / 30 / 60 / 90% quality and Tier V at 100%. Tristan's Blood Hunger shows type and quality over every head.</p></div>
        <div class="card"><h2 class="cell">${ic('Castle Heart', 40)}Castle Heart</h2>${table(['Level', 'Materials', 'Unlocks'], [
          ['<span class="mono">2</span>', '12 Leather + 12 Copper Ingot', ''], ['<span class="mono">3</span>', '8 Reinforced Plank + 24 Glass + 1 Greater Blood Essence', 'Eye of Mortium'],
          ['<span class="mono">4</span>', '12 Radium Alloy + 1 Primal Blood Essence', 'Subdue'], ['<span class="mono">5</span>', '12 Dark Silver Ingot + 4 Power Core + 1 Primal Blood Essence', 'Eye of Twilight']])}</div>
        <div class="card"><h2>Spell School Mastery</h2>${table(null, cfg.mastery.rows.map(([n, tier, bonus, from]) => [`<span class="cell">${ic(n, 36)}${tier}</span>`, bonus, from]))}
          <p>${cfg.mastery.text}</p></div>
        <div class="card"><h2>Stygian passive slots</h2><div class="tiles">${slots.map(([n, lv, id]) => `<span class="tile" style="width:84px">${id ? `<a href="${M(id)}" target="_blank" rel="noopener">${ic(n, 56)}</a>` : ic(n, 56)}<em>${n.split(' ').slice(-3).join(' ').replace(/^the /, '')}<br><span class="mono">Lv ${lv}</span></em></span>`).join('')}</div><p>Simon Belmont has no fixed marker; he roams. Elemental passives cost 400 Stygian Shards and vampire passives 600 Greater; each Discover is random.</p></div>
        <div class="card"><h2>Mining gates</h2>${tiles(['Iron Ore', 'Silver Ore', 'Blood Crystal'])}<p>Iron Ore needs a GL 12+ weapon, Silver Ore GL 18+, Blood Crystals GL 23+ (only at Dracula's Demise).</p></div>
      </div>
      ${weaponCard(cfg.picks)}
      <div class="card"><h2>Map layers</h2><div style="display:flex;flex-wrap:wrap;gap:8px">${layers.map(([n, id, i]) => `<a class="btn small" href="${C(id)}" target="_blank" rel="noopener">${i && srcOf(i) ? `<img src="${srcOf(i)}" alt="" width="18" height="18" style="border-radius:4px">` : '📍'} ${n}</a>`).join('')}</div></div>`;
  }

  // cfg: { intro, builds: [{ k, label, top, spells, weapon, blood, bloodText, elixir, rolls, when }], common: { text, tiles },
  //        rotation: { icon, title, text }, caps: [[stat, cap, note]], steps: [html] }
  function renderEndgame(cfg) {
    return `
      <div class="card"><h2>Pick your endgame build</h2><p>${cfg.intro}</p>
        <ol class="ladder">${cfg.steps.map(s => `<li><div>${s}</div></li>`).join('')}</ol>
        <div class="note" style="margin-top:14px">These builds are not scored by the damage simulator yet; it only models spells. They follow the game data, set bonuses and the wiki's weapon numbers (Reference tab), so test the alternatives on a Grayson target dummy.</div>
      </div>
      <div class="card"><h2>The builds</h2>
        <div class="builds">${cfg.builds.map(b => `<div class="build${b.top ? ' top' : ''}">
          <div class="head"><b>${b.k}</b><span>${b.label}</span></div>
          <div class="spells">${b.spells.map(s => ic(s, 46)).join('')}</div>
          <div style="font-size:13px">${b.spells.join(' · ')}</div>
          <dl><dt>Weapon</dt><dd><span class="cell" style="gap:6px">${ic(b.weapon, 26)}${b.weapon.replace(' Shards', '')}</span></dd>
          <dt>Blood</dt><dd><span class="cell" style="gap:6px">${b.blood.map(x => ic(x, 26)).join('')}${b.bloodText}</span></dd>
          <dt>Elixir</dt><dd><span class="cell" style="gap:6px">${ic(b.elixir, 26)}${b.elixir.replace('Elixir of the ', '')}</span></dd>
          <dt>Rolls</dt><dd>${b.rolls}</dd><dt>Pick when</dt><dd>${b.when}</dd></dl></div>`).join('')}</div>
        <p>${cfg.common.text}</p>${tiles(cfg.common.tiles)}
      </div>
      <div class="grid2">
        <div class="card"><h3 class="cell">${ic(cfg.rotation.icon, 36)}${cfg.rotation.title}</h3><p>${cfg.rotation.text}</p></div>
        <div class="card"><h3>Stat caps to watch</h3>${table(['Stat', 'Cap', 'In this build'], cfg.caps.map(([s, c, n]) => [s, `<span class="mono">${c}</span>`, n]))}
          <p>Caps apply to permanent sources; temporary buffs (Veils, Blood Rage, procs) can go past them. Tier V blood and Spell School Mastery raise some caps. The attributes screen shows a red bar when you're over.</p></div>
      </div>`;
  }

  BR.shared = { VB, B, O, STEP, CRAFT, ACCESS, NOTE, RES, CARRIERS, WEAPONS, renderRef, renderEndgame };
})();
