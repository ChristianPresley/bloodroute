// Bloodroute lexicon data: committed facts about V Bloods, regions, places, materials and passives that the game
// data (site/gamedata.js) doesn't carry. Loaded after js/core.js, before js/lexicon.js. Plain data only.
// Sources: the V Rising wiki (region, boss, Altar of Stygian Awakening and Ancestral Forge pages; CC BY-SA), the
// gaming.tools map captured in data/gt/ (positions, resource layers, NPC levels) and site/routes/shared.js.
// Map coordinates are game x/z: x from -2885 (west) to 155 (east), z from -2400 (south) to 640 (north).
(() => {
  'use strict';
  const FARBANE = 'Farbane Woods', DUNLEY = 'Dunley Farmlands', HALLOWED = 'Hallowed Mountains', MORTIUM = 'Ruins of Mortium',
    GLOOM_S = 'Gloomrot South', GLOOM_N = 'Gloomrot North', CURSED = 'Cursed Forest', SILVER = 'Silverlight Hills', OAKVEIL = 'Oakveil Woodlands';
  // Farbane bandit camps on Map Genie (same list as BR.h.CAMPS in js/core.js).
  const CAMPS = '178215,178231,178234,178238,178242,178243,178245,178259,178372,178373,178374,178375,178376,178379,178380,178381,178382,178383,178388,178390,178392,178527';

  window.BR.lexData = {
    // V Blood → { region (a REGIONS key), challenge 1–5 (how hard the fight is for its level: mechanics, adds,
    //   arena), note (one line on the fight; never "T1 point" or "(drop)" wording), roams? (true or text when it has no
    //   fixed spot), pos? [x, z] (only when the map data has no marker, e.g. Dracula), benefit? override tags }
    // Regions follow the wiki's boss locations, except Lord Styx: Dracula's Demise sits on the Dunley–Gloomrot border
    // (the wiki files it under Gloomrot South) and the routes reach it from Dunley.
    VBLOOD: {
      // Farbane Woods
      'Alpha the White Wolf': { region: FARBANE, challenge: 1, roams: true, note: 'Chains up to three lunges and howls to speed himself up; sidestep each lunge and punish the pause after it.' },
      'Errol the Stonebreaker': { region: FARBANE, challenge: 1, note: 'A slow hammer bandit deep in the copper mine who calls miners for help; back off from his telegraphed slams and clear the adds.' },
      'Keely the Frost Archer': { region: FARBANE, challenge: 2, note: 'Kites with frost arrows, a multishot fan and Rain of Arrows that chill and freeze; keep strafing and close in after she dashes away.' },
      'Rufus the Foreman': { region: FARBANE, challenge: 2, note: 'Fires crossbow bursts, throws a net that roots you and calls woodcutters; dodge the net and keep moving once he blood-rages.' },
      'Grayson the Armourer': { region: FARBANE, challenge: 2, note: 'Throws hammers, scatters spike traps and calls bandit reinforcements; watch your footing and pull him away from the armory crowd.' },
      'Goreswine the Ravager': { region: FARBANE, challenge: 2, roams: true, note: 'Walks between two graveyards with four armoured skeletons and blows up corpses; thin the escort first and step out of the green bursts.' },
      'Clive the Firestarter': { region: FARBANE, challenge: 2, note: 'Dashes around lobbing cluster bombs and explosive shots; dodge the bomb circles and keep clear of the quarry\'s powder kegs.' },
      'Lidia the Chaos Archer': { region: FARBANE, challenge: 2, roams: true, note: 'Patrols the central Farbane road with chaos arrows, a chaos storm and a barrage; walk out of the purple zones and keep pressure on her.' },
      'Nibbles the Putrid Rat': { region: FARBANE, challenge: 1, roams: 'summoned at your castle', note: 'Summoned at your Vermin Nest, he sends a vanguard of rats ahead of him; clear the swarm with an area spell and he folds quickly.' },
      'Finn the Fisherman': { region: FARBANE, challenge: 2, note: 'Fishes up blowfish, piranhas and old boots and feeds a sea serpent that lunges from the lake; dodge the serpent lines and stay off the shore edge.' },
      'Polora the Feywalker': { region: FARBANE, challenge: 2, note: 'Fires homing fey bolts and conjures spirit wolves and pixies; dodge the bolts and cleave the summons before they stack up.' },
      'Nicholaus the Fallen': { region: FARBANE, challenge: 2, note: 'Raises skeleton hordes and fires rings of bolts in the Forgotten Cemetery; clear the skeletons with area damage and dodge between the bolts.' },
      'Kodia the Ferocious Bear': { region: FARBANE, challenge: 2, note: 'A heavy bear in a cave that charges and mauls and swaps targets in groups; sidestep the charge and punish its recovery.' },
      'Quincey the Bandit King': { region: FARBANE, challenge: 3, note: 'Chaos charges, weapon throws, a Chaos Barrier and bandit reinforcements at low health; dodge the charge and stop hitting into the barrier.' },
      'Tristan the Vampire Hunter': { region: FARBANE, challenge: 3, roams: true, note: 'Leaping thrusts, rolls, fast crossbow bursts and a rain of fire on the northern Farbane roads; keep distance after his roll and never stand in the fire.' },
      'Talzur the Winged Horror': { region: FARBANE, challenge: 4, note: 'A manticore on a peak you can only reach in Bat Form, with chaos and frost breath, wing storms, air dashes and a frost vortex; dodge the breath cones and leave the vortex.' },
      // Dunley Farmlands
      'Beatrice the Tailor': { region: DUNLEY, challenge: 2, note: 'Turns into a winged gargoyle that raises a wing shield and dives across the room; hold your damage while the shield is up and dodge the landing.' },
      'Christina the Sun Priestess': { region: DUNLEY, challenge: 2, roams: true, note: 'Walks with two militia guards, sprays holy bolts and channels long heals; interrupt or out-damage the heal and avoid the holy pools.' },
      'Vincent the Frostbringer': { region: DUNLEY, challenge: 2, roams: true, note: 'Patrols the central roads; his Frost Shield freezes whoever hits it, so stop attacking while it glows and dodge his frost swings.' },
      'Sir Erwin the Gallant Cavalier': { region: DUNLEY, challenge: 2, note: 'Charges on horseback at the race track and calls lightning orbs and strikes; sidestep the charges and leave the marked circles.' },
      'Kriig the Undead General': { region: DUNLEY, challenge: 3, note: 'His chain hook drags you into his scythe and Ward of the Damned blocks hits; dodge the hook and wait out the ward (Meredith often fights him nearby).' },
      'Maja the Dark Savant': { region: DUNLEY, challenge: 2, note: 'Fights inside her tower with circling razor parchments and quick cuts; keep moving around the parchment rings and burst her between casts.' },
      'Leandra the Shadow Priestess': { region: DUNLEY, challenge: 2, note: 'Fires triple shadow bolts, mist-walks away and summons shadow soldiers; keep moving and kill the soldiers before they surround you.' },
      'Meredith the Bright Archer': { region: DUNLEY, challenge: 3, note: 'Guided arrows, snipes, a healing shot and an escort of archers and guards; break line of sight on the snipe and kill the escort first.' },
      'Grethel the Glassblower': { region: DUNLEY, challenge: 2, note: 'Breathes fire, rains glass and raises a mirror shield that reflects projectiles; stop casting into the mirror and dodge the glass rain.' },
      'Bane the Shadowblade': { region: DUNLEY, challenge: 3, roams: true, note: 'Disguised as a hooded traveller on the roads, he shadow-steps behind you and throws knife bursts; keep moving and punish him after each step.' },
      'Terah the Geomancer': { region: DUNLEY, challenge: 3, note: 'Turns into a stone golem twice and raises golem guardians at Bedrock Pass; burst her human form and dodge the golem slams.' },
      'Gaius the Cursed Champion': { region: DUNLEY, challenge: 3, note: 'Summoned with the Colosseum flag, he fadestrikes, side-steps, leaps and feeds on corpses; dodge the leap strike and keep him off the corpses.' },
      'Jade the Vampire Hunter': { region: DUNLEY, challenge: 3, roams: true, note: 'Pistol bursts, snipes, caltrops and stealth on the Dunley roads; strafe her shots, avoid the caltrops and watch for her return from stealth.' },
      'Raziel the Shepherd': { region: DUNLEY, challenge: 3, note: 'Holy beams, pillars and circles inside a monastery full of holy radiation; bring holy resistance and keep moving out of the circles.' },
      'Octavian the Militia Captain': { region: DUNLEY, challenge: 3, note: 'Leaps at you and calls militia waves in the Bastion of Dunley; dodge the leaps and kill the adds before they pile up.' },
      'Willfred the Village Elder': { region: DUNLEY, challenge: 3, note: 'Fought at night as the Werewolf Chief in Gracefall Village, with shadow dashes and knockdowns; don\'t get pinned and dodge each dash.' },
      'Simon Belmont the Vampire Hunter': { region: DUNLEY, challenge: 4, roams: true, note: 'Patrols the Farbane, Dunley and Silverlight roads with a whip, holy water, spinning crosses and axes; dodge the crosses on their way back and stay out of the holy water.' },
      'Lord Styx the Night Champion': { region: DUNLEY, challenge: 4, note: 'Circles the giant Blood Crystal with bat swarms, night dashes and a bat storm while Talzur may bomb from above; keep moving through the storm.' },
      // Hallowed Mountains
      'Frostmaw the Mountain Terror': { region: HALLOWED, challenge: 3, roams: true, note: 'Roams the mountain roads with frost novas, a two-stage ice beam and leap attacks; never stand in the beam line and back out of the nova.' },
      'Terrorclaw the Ogre': { region: HALLOWED, challenge: 3, note: 'A yeti in the Frozen Cave that leaps and shakes the cave so rocks fall; dodge the leaps and the falling-rock markers.' },
      // Ruins of Mortium
      'General Elena the Hollow': { region: MORTIUM, challenge: 3, roams: true, note: 'Patrols around the South Fortress Ruins with Rain of Bolts, Ice Nova, a Tower of Frost and a self-heal; dodge the frost tower and burst through her Blood Mend.' },
      'General Cassius the Betrayer': { region: MORTIUM, challenge: 3, roams: true, note: 'Patrols northern Mortium with greatsword whirlwinds and cleaves, Corpse Storm and raised dead; kite the whirlwind and kill the risen skeletons.' },
      'General Valencia the Depraved': { region: MORTIUM, challenge: 4, note: 'Hooks you with her spear, twirls and casts A Thousand Spears while summoning Crimson Maidens; dodge the hook and kill the maidens quickly.' },
      'Dracula the Immortal King': { region: MORTIUM, challenge: 5, pos: [-78, -586], note: 'A long multi-phase duel of sword throws, blood-bolt swarms, rings of blood and quick side-steps; learn his dodges and heal between the blood rings.' },
      // Gloomrot South
      'Domina the Blade Dancer': { region: GLOOM_S, challenge: 3, note: 'Electric sprints and leap attacks in Rustlock Village; dodge sideways out of the sprint lanes and punish her landings.' },
      'Ziva the Engineer': { region: GLOOM_S, challenge: 3, note: 'Swaps between a flamer, shotgun, tazer and a lightning cannon that can malfunction; punish the malfunctions and leave the ring of fire.' },
      'Angram the Purifier': { region: GLOOM_S, challenge: 3, note: 'Sprays chaos volleys around the Pools of Rebirth behind a Chaos Barrier; dodge the volleys, keep out of the sludge and stop hitting the barrier.' },
      // Cursed Forest
      'Ben the Old Wanderer': { region: CURSED, challenge: 2, roams: true, note: 'Wanders the forest roads, and you fight him before you own his Shroud, so the curse fog hides him; release a wisp and keep him in sight.' },
      'Ungora the Spider Queen': { region: CURSED, challenge: 3, note: 'Web-hooks you in, spits poison and spawns spiderlings in her cave; kill the adds and dodge the web pulls.' },
      'Foulrot the Soultaker': { region: CURSED, challenge: 3, note: 'Summons ghosts, melds into shadow and camouflages around the Ancient Village; clear the ghosts with area spells and catch him as he reappears.' },
      'Albert the Duke of Balaton': { region: CURSED, challenge: 2, note: 'A giant toad that leaps, spits and rains poison over his swamp; dodge the landing zones and leave the poison puddles.' },
      'Cyril the Cursed Smith': { region: CURSED, challenge: 3, note: 'Spear thrusts and chained multi-dashes through the Cursed Village; dodge every dash in the chain and hit him when he stops.' },
      'Matka the Curse Weaver': { region: CURSED, challenge: 4, note: 'Witch bolts, exploding mushrooms and mosquitoes, corrupted ghouls and a death squad in a small arena; keep moving and kill adds before they swarm.' },
      'Gorecrusher the Behemoth': { region: CURSED, challenge: 4, roams: true, note: 'A huge beast that roams the forest and rests in his lair, with heavy dash attacks and leaps; dodge every charge, as each hit takes a big chunk of health.' },
      // Silverlight Hills
      'Sir Magnus the Overseer': { region: SILVER, challenge: 3, note: 'Behind the silver mine gate with slave masters at his side, he charges and throws piercing spears; free the Ruffians to help and dodge the charge.' },
      'Mairwyn the Elementalist': { region: SILVER, challenge: 4, note: 'Charged crystal lances, Arcane Imprisonment, fire spinners and lightning arcs; dodge the lances and break out of the imprisonment fast.' },
      'Baron du Bouchon the Sommelier': { region: SILVER, challenge: 2, note: 'Rolls barrels, flurries and casts Sanguine Coil inside the vineyard house; dodge the barrel lanes and fight in the open.' },
      'Morian the Stormwing Matriarch': { region: SILVER, challenge: 3, note: 'Soars between perches, dashes and fires storm projectiles with harpies joining in; dodge the dash and stay out of her storm circles.' },
      'Azariel the Sunbringer': { region: SILVER, challenge: 4, note: 'Light waves, novas, orbs and summoned aides in a cathedral full of holy radiation; drink a Holy Resistance Flask and dodge the light waves.' },
      'Solarus the Immaculate': { region: SILVER, challenge: 5, note: 'Heavy holy radiation, divine rays, holy spinners, an angelic ascent and a healing angel; bring holy resistance, kill the angel and dodge the rays.' },
      // Gloomrot North
      'Henry Blackbrew the Doctor': { region: GLOOM_N, challenge: 4, note: 'Fills his lab with sweeping laser patterns, imploding orbs and discharges; learn the beam patterns and move through the gaps.' },
      'Voltatia the Power Master': { region: GLOOM_N, challenge: 4, note: 'Energy bursts, homing orbs, a Lightning Curtain and Trancendum adds at the power plant; outrun the orbs and kill the adds.' },
      'Adam the Firstborn': { region: GLOOM_N, challenge: 5, note: 'Behind EMP-locked gates, a multi-phase monster with lightning pillars, throws, Arctic Leap and Eye of the Storm; dodge the pillars and his finisher.' },
      // Oakveil Woodlands
      'Jakira the Shadow Huntress': { region: OAKVEIL, challenge: 4, roams: true, note: 'Patrols southern Oakveil with slicing dashes, spirit orbs and a shadow dance of illusions; clear the orbs and watch her dash lines.' },
      'Stavros the Carver': { region: OAKVEIL, challenge: 3, note: 'Body slams, spews corruption, coats his weapon and calls carvers at the logging outpost; leave the corruption pools and clear the carvers.' },
      'Lucile the Venom Alchemist': { region: OAKVEIL, challenge: 4, note: 'Throws toxin, crippling goo and liquid fire and turns Gold Skin invulnerable; throw the outpost\'s Potion of Dispel to break Gold Skin and the Beauty Elixir to end her madness.' },
      'Dantos the Forgebinder': { region: OAKVEIL, challenge: 4, note: 'Fights in a side room of the bastion with dual tackles, Merciless Charge and Smack; dodge the tackles and punish his recovery.' },
      'Megara the Serpent Queen': { region: OAKVEIL, challenge: 5, note: 'Teleports around the bastion with spectral blasts, swarms, orb barrages and her tail summon; keep moving and survive the Spectral Hell phase.' },
    },

    // Region → { band (level band text), blurb (one line), aka: [short names used in route text], center: [x, z],
    //   r (rough radius in map units, for the region tint) }
    // Bands follow the region's V Blood levels and the wiki's recommended Gear Level; centers are the mean of its
    // V Blood spawns and landmarks.
    REGIONS: {
      'Farbane Woods': { band: 'Lv 1–40', aka: ['Farbane'], center: [-1378, -1461], r: 650,
        blurb: 'The southern starting forest of bandit camps, quarries and graveyards, where you gather copper, bone and crude gems and hunt the first V Bloods.' },
      'Dunley Farmlands': { band: 'Lv 40–60', aka: ['Dunley'], center: [-1339, -659], r: 480,
        blurb: 'Central farmland of villages, militia camps and the Haunted Iron Mine; come for iron, cotton, quartz, scrolls and most mid-game V Bloods.' },
      'Hallowed Mountains': { band: 'Lv 53–76', aka: ['Hallowed'], center: [-638, -1178], r: 220,
        blurb: 'The small snowy region east of Farbane and Dunley, home to Frostmaw and Terrorclaw, with Thick Hide, Hallow Wood and Snow Flower.' },
      'Ruins of Mortium': { band: 'Lv 53–91', aka: ['Mortium'], center: [-536, -514], r: 380,
        blurb: 'Dracula\'s cloudy eastern domain of Rift Incursions, Stygian Shards, Bleeding Heart and the Vampire Merchants, with his castle at the far east and no castle plots.' },
      'Gloomrot South': { band: 'Lv 58–64', aka: ['Gloomrot'], center: [-1601, -13], r: 250,
        blurb: 'Trancendum villages, factories and sludge pools north of Dunley, where you loot Tech Scrap, Radium Alloy and Plague Brier.' },
      'Gloomrot North': { band: 'Lv 74–88', aka: [], center: [-1767, 98], r: 300,
        blurb: 'The stormy Trancendum heartland with Doctor Blackbrew\'s labs, the power plant, the Treasure Hunter and Lightning Harvesters for charging batteries.' },
      'Cursed Forest': { band: 'Lv 63–84', aka: [], center: [-790, 73], r: 270,
        blurb: 'A fog-cursed swamp in the north-east (wear Ben\'s Shroud) for Ghost Shroom, Silkworms, Pristine Hide and Ghost Crystal.' },
      'Silverlight Hills': { band: 'Lv 65–86', aka: ['Silverlight'], center: [-2190, -767], r: 320,
        blurb: 'The Church of Luminance\'s silver-tainted west around Brighthaven, with Silver Ore, the vineyards, flawless gems, Schematics and the docks.' },
      'Oakveil Woodlands': { band: 'Lv 73–88', aka: ['Oakveil'], center: [-2314, 22], r: 320,
        blurb: 'The Venom Blades\' corrupted north-western woods, for Venom Sap, Corrupted Flower, Emery and Ember Glass.' },
    },

    // Named place → { pos: [x, z], region, mg?: 'Map Genie location id(s)', approx: true, note? }
    // pts: [[x, z], …] lists every spot when a place has several (pos is the first). mg is exactly the id list the
    // route text links. Positions come from the captured map's NPC and landmark markers or the boss that lives there.
    PLACES: {
      // Farbane Woods
      'Farbane bandit camps': { pos: [-1474, -1435], region: FARBANE, mg: CAMPS, approx: true, note: 'Centre of the bandit spawns; camps are spread across the woods.' },
      'Bandit Stronghold': { pos: [-1392, -1223], region: FARBANE, mg: '178391', approx: true, note: 'Quincey\'s fort in north Farbane; enter with Minor Explosive Boxes or Bear Form.' },
      'Shady Merchants Camp': { pos: [-1056, -1426], pts: [[-1056, -1426], [-1783, -1414]], region: FARBANE, mg: '283054,284512', approx: true, note: 'Two camps; the Shady Dealers trade for Copper Coins.' },
      'Shady Goods Dealer': { pos: [-1051, -1433], pts: [[-1051, -1433], [-1784, -1407]], region: FARBANE, mg: '283054,284512', approx: true, note: 'At both Shady Merchants Camps.' },
      'Wolf Den': { pos: [-1319, -1463], pts: [[-1319, -1463], [-1231, -1618], [-1476, -1712]], region: FARBANE, approx: true, note: 'Alpha\'s three spawns; he roams the roads between them.' },
      'Fishing Lake': { pos: [-827, -1213], region: FARBANE, approx: true, note: 'Finn\'s lake in north-east Farbane.' },
      'The Dreaded Peak': { pos: [-681, -1336], region: FARBANE, mg: '178385', approx: true, note: 'Talzur\'s peak on Farbane\'s eastern edge; reachable only in Bat Form.' },
      // Dunley Farmlands
      'Haunted Iron Mine': { pos: [-1396, -979], region: DUNLEY, mg: '178316', approx: true, note: 'Kriig and Meredith both fight here.' },
      'Colosseum': { pos: [-992, -513], region: DUNLEY, mg: '178286', approx: true, note: 'Gaius\'s arena; Simon Belmont\'s patrol ends here.' },
      'Dawnbreak': { pos: [-1068, -850], region: DUNLEY, approx: true, note: 'Dawnbreak Village, east Dunley; Beatrice and one end of Christina\'s walk.' },
      'Mosswick': { pos: [-1695, -835], region: DUNLEY, approx: true, note: 'Mosswick Village, west Dunley; the other end of Christina\'s walk.' },
      'Dunley Farmers Market': { pos: [-1376, -677], region: DUNLEY, mg: '355902', approx: true, note: 'The Rural Merchants (Silver Coins, Human Form needed).' },
      'Dunley cotton patches': { pos: [-1384, -825], pts: [[-1798, -755], [-1475, -865], [-1252, -787], [-1010, -892]], region: DUNLEY, mg: '432218,432220,432221,432222', approx: true, note: 'Cotton farms, under garlic and guarded by hostile villagers.' },
      'Dunley sunflower patches': { pos: [-1379, -825], region: DUNLEY, mg: '179518,179681,432219', approx: true, note: 'Sunflowers grow on most Dunley farms.' },
      "Dracula's Demise": { pos: [-1390, -275], region: DUNLEY, approx: true, note: 'Lord Styx and the only Blood Crystal nodes, on the Dunley–Gloomrot border.' },
      // Silverlight Hills
      'Brighthaven': { pos: [-2380, -790], region: SILVER, approx: true, note: 'The Church of Luminance\'s city; silver hurts without resistance.' },
      'Brighthaven Docks': { pos: [-2450, -900], region: SILVER, mg: '178412', approx: true, note: 'Every region\'s fish, including Corrupted Fish, bites here.' },
      'City Herb & Potion Vendor': { pos: [-2383, -836], region: SILVER, approx: true, note: 'Brighthaven Trade District; Goldsun Coins, Human Form needed.' },
      'Brighthaven vineyards': { pos: [-2196, -775], region: SILVER, approx: true, note: 'Two vineyards of Sacred Grapes; Baron du Bouchon is in the northern one.' },
      // Gloomrot North
      'Treasure Hunter': { pos: [-1969, -47], region: GLOOM_N, mg: '355898', approx: true, note: 'Treasure Hunter Trade Post; trades for Goldsun Coins.' },
      'Thunderstrike Peak': { pos: [-1498, 71], region: GLOOM_N, approx: true, note: 'Four Lightning Harvesters; charge ten Depleted Batteries at a time.' },
      'Stormdrain Hills': { pos: [-2008, -116], region: GLOOM_N, approx: true, note: 'Four Lightning Harvesters; charge ten Depleted Batteries at a time.' },
      // Oakveil Woodlands
      'Carvers Logging Outpost': { pos: [-2505, -75], region: OAKVEIL, approx: true, note: 'Stavros\'s camp; the best spot for Corrupted Oak, Venom Sap and Corrupted Flower.' },
      // Ruins of Mortium
      'South Fortress Ruins': { pos: [-700, -714], region: MORTIUM, approx: true, note: 'The only place outside Rift Incursions with Stygian Shards.' },
      "Dracula's Castle Garden": { pos: [-340, -660], region: MORTIUM, approx: true, note: 'Bleeding Heart, and the only Greater Stygian Shards outside Rift Incursions.' },
      'Southern Mortium Vampire Merchant': { pos: [-594, -769], region: MORTIUM, approx: true, note: 'Sells Rare Ancestral weapon shards for 750 Stygian Shards.' },
      'Northern Mortium Vampire Merchant': { pos: [-663, -348], region: MORTIUM, mg: '400681,400682', approx: true, note: 'Sells Epic Ancestral weapon shards for 1,500 Greater Stygian Shards.' },
      "Dracula's Castle": { pos: [-78, -586], region: MORTIUM, approx: true, note: 'Needs the Blood Key to enter.' },
    },

    // Material → { layer?: gaming.tools resource layer id(s), raw?: the gathered material it's refined from,
    //   place?: a PLACES key, region: where to gather it, mg?: Map Genie category id }
    // craft: true marks station-made materials with several inputs; drop: true marks materials that only drop.
    MATERIALS: {
      // Ores, stone and wood
      'Copper Ore': { layer: 'copper_ore', region: FARBANE, mg: 6091 },
      'Copper Ingot': { raw: 'Copper Ore', region: FARBANE, mg: 6091 },
      'Iron Ore': { layer: 'iron_ore', region: DUNLEY, mg: 6093 },
      'Iron Ingot': { raw: 'Iron Ore', region: DUNLEY, mg: 6093 },
      'Silver Ore': { layer: 'silver_ore', region: SILVER, mg: 6094 },
      'Dark Silver Ingot': { raw: 'Silver Ore', region: SILVER, mg: 6094 },
      'Sulphur Ore': { layer: 'sulphur_ore', region: FARBANE },
      'Sulphur': { raw: 'Sulphur Ore', region: FARBANE },
      'Quartz': { layer: 'quartz', region: DUNLEY },
      'Glass': { raw: 'Quartz', region: DUNLEY },
      'Empty Glass Bottle': { raw: 'Glass', region: DUNLEY },
      'Clay': { layer: 'clay', region: FARBANE },
      'Stone': { layer: 'stone', region: FARBANE },
      'Whetstone': { raw: 'Stone', region: FARBANE },
      'Bone': { layer: 'bone', region: FARBANE },
      'Grave Dust': { raw: 'Bone', region: FARBANE },
      'Scourgestone': { craft: true, raw: 'Grave Dust', region: DUNLEY },
      'Wood': { region: FARBANE },
      'Plank': { raw: 'Wood', region: FARBANE },
      'Reinforced Plank': { craft: true, raw: 'Plank', region: DUNLEY },
      'Hallow Wood': { region: HALLOWED },
      'Blood Crystal': { layer: 'blood_crystal', place: "Dracula's Demise", region: DUNLEY },
      'Emery': { layer: 'emery', region: OAKVEIL },
      'Ember Glass': { raw: 'Emery', region: OAKVEIL },
      'Ghost Crystal': { layer: 'ghost_crystal', region: CURSED },
      'Tech Scrap': { layer: 'tech_scrap', region: GLOOM_S },
      'Radium Alloy': { craft: true, raw: 'Tech Scrap', region: GLOOM_S },
      'Depleted Battery': { drop: true, region: GLOOM_S },
      'Charged Battery': { raw: 'Depleted Battery', place: 'Thunderstrike Peak', region: GLOOM_S },
      'Gold Jewelry': { drop: true, region: SILVER },
      'Gold Ingot': { raw: 'Gold Jewelry', region: SILVER },
      // Gems (Crude from nodes, Regular and Flawless cut 4:1 at the Gem Cutting Table or mined later)
      'Crude Ruby': { region: FARBANE, mg: 6098 }, 'Crude Topaz': { region: FARBANE, mg: 6098 },
      'Crude Sapphire': { region: FARBANE, mg: 6098 }, 'Crude Emerald': { region: FARBANE, mg: 6098 },
      'Crude Amethyst': { region: FARBANE, mg: 6098 }, 'Crude Miststone': { region: FARBANE, mg: 6098 },
      'Regular Ruby': { raw: 'Crude Ruby', region: DUNLEY }, 'Regular Topaz': { raw: 'Crude Topaz', region: DUNLEY },
      'Regular Sapphire': { raw: 'Crude Sapphire', region: DUNLEY }, 'Regular Emerald': { raw: 'Crude Emerald', region: DUNLEY },
      'Regular Amethyst': { raw: 'Crude Amethyst', region: DUNLEY }, 'Regular Miststone': { raw: 'Crude Miststone', region: DUNLEY },
      'Flawless Ruby': { raw: 'Regular Ruby', region: SILVER }, 'Flawless Topaz': { raw: 'Regular Topaz', region: SILVER },
      'Flawless Sapphire': { raw: 'Regular Sapphire', region: SILVER }, 'Flawless Emerald': { raw: 'Regular Emerald', region: SILVER },
      'Flawless Amethyst': { raw: 'Regular Amethyst', region: SILVER }, 'Flawless Miststone': { raw: 'Regular Miststone', region: SILVER },
      'Gem Dust': { craft: true, region: FARBANE },
      // Hides and cloth
      'Rugged Hide': { layer: 'rugged_hide', region: FARBANE },
      'Leather': { raw: 'Rugged Hide', region: FARBANE },
      'Empty Waterskin': { raw: 'Leather', region: FARBANE },
      'Thick Hide': { drop: true, region: HALLOWED },
      'Thick Leather': { raw: 'Thick Hide', region: HALLOWED },
      'Pristine Hide': { drop: true, region: CURSED },
      'Pristine Leather': { raw: 'Pristine Hide', region: CURSED },
      'Bat Hide': { drop: true, region: MORTIUM },
      'Bat Leather': { raw: 'Bat Hide', region: MORTIUM },
      'Coarse Thread': { place: 'Farbane bandit camps', region: FARBANE },
      'Cotton': { place: 'Dunley cotton patches', region: DUNLEY },
      'Cotton Yarn': { raw: 'Cotton', place: 'Dunley cotton patches', region: DUNLEY },
      'Wool Thread': { craft: true, raw: 'Coarse Thread', region: DUNLEY },
      'Silkworm': { drop: true, region: CURSED },
      'Silk': { raw: 'Silkworm', region: CURSED },
      'Ghost Yarn': { craft: true, raw: 'Ghost Shroom', region: CURSED },
      'Shadow Weave': { craft: true, raw: 'Silk', region: MORTIUM },
      // Plants
      'Mourning Lily': { layer: 'mourning_lily', region: FARBANE, mg: 6116 },
      'Snow Flower': { layer: 'snow_flower', region: FARBANE, mg: 6090 },
      'Blood Rose': { layer: 'blood_rose', region: FARBANE, mg: 6088 },
      'Fire Blossom': { layer: 'fire_blossom', region: FARBANE, mg: 6089 },
      "Hell's Clarion": { layer: 'hell’s_clarion', region: FARBANE, mg: 6106 },
      'Trippy Shroom': { layer: 'trippy_shroom', region: CURSED },
      'Sunflower': { place: 'Dunley sunflower patches', region: DUNLEY },
      'Plague Brier': { layer: 'plague_brier', region: GLOOM_S },
      'Bleeding Heart': { layer: 'bleeding_heart', region: MORTIUM },
      'Ghost Shroom': { layer: 'ghost_shroom', region: CURSED },
      'Sacred Grapes': { place: 'Brighthaven vineyards', region: SILVER },
      'Corrupted Flower': { place: 'Carvers Logging Outpost', region: OAKVEIL },
      'Venom Sap': { place: 'Carvers Logging Outpost', region: OAKVEIL },
      // Fish, hearts, essences, research and shards
      'Fish Bone': { region: FARBANE, mg: 6104 },
      'Unsullied Heart': { drop: true, region: FARBANE },
      'Greater Blood Essence': { raw: 'Unsullied Heart', region: FARBANE },
      'Primal Blood Essence': { raw: 'Greater Blood Essence', region: DUNLEY },
      'Paper': { drop: true, region: FARBANE },
      'Scroll': { craft: true, drop: true, region: DUNLEY },
      'Schematic': { craft: true, drop: true, region: SILVER },
      'Stygian Shard': { place: 'South Fortress Ruins', region: MORTIUM },
      'Greater Stygian Shard': { raw: 'Stygian Shard', place: "Dracula's Castle Garden", region: MORTIUM },
    },

    // Stygian passive → its effect, one line (W/Altar_of_Stygian_Awakening, Update 1.1)
    PASSIVE_TEXT: {
      // Elemental (400 Stygian Shards per Discover)
      'Arcane Animator': '20% chance to raise a Skeleton Mage when a Condemned target dies; minions deal 12% more damage.',
      'Blood Spray': '+8% Physical Critical Chance; critical hits leech 5% health, and Leeched kills have a 25% chance to drop a Blood Orb.',
      'Chaos Kindling': '+7% Spell Cooldown Rate; Ignite deals 25% more damage and Chaos explosions ignite enemies hit.',
      'Chillweave': 'Shields absorb 10% more damage; breaking Freeze with a hit sets off a frost nova (25% magic damage) that Chills.',
      'Cold Soul': '+8% Spell Critical Power and 8% more damage to Chilled and Frozen enemies.',
      'Enhanced Conductivity': '+7% Bonus Spell Power; spell damage also sets off the bonus damage on Static targets.',
      'Flowing Sorcery': '+7% Spell Cooldown Rate and a 35% chance to keep Phantasm when it resets a cooldown.',
      'Lightning Fast Strikes': '+7% Primary Attack Speed; Static triggers deal 20% more damage.',
      'Renewing Flames': '8% more spell damage to Ignited enemies, and Ignite heals you for up to 15% of your Spell Power.',
      'Sanguine Mastery': '8% more physical damage to Leeched enemies and +8% to your current blood type\'s effects.',
      'Soul Drinker': '+8% Maximum Health; heal 1% of your maximum health when a Skeleton dies.',
      'Spiritual Infusion': '+12% Healing Received and 8% more spell damage to Weakened enemies.',
      // Vampire (600 Greater Stygian Shards per Discover)
      'Bastion': '+8% Maximum Health and 25% less damage taken while crowd-controlled.',
      'Dark Enchantment': '+4% Damage Reduction; losing over 30% of your health within 2 s grants a shield of 250% Spell Power for 4 s (once every 40 s).',
      'Embrace Mayhem': '+14% Ultimate Cooldown Rate and +10% Ultimate Power.',
      'Feral Haste': '+4% Movement Speed, and +15% while shapeshifted.',
      'Hunger for Blood': '+5% Primary Attack Leech and 8% more damage against V Bloods.',
      'Hunger for Power': '+4% Spell Leech; after 6 spells in a row, +20% damage and +10% movement speed for 6 s.',
      'Lethal Strikes': '+8% Physical Critical Power and 12% more physical damage to enemies under 30% health.',
      'Overpower': '+7% Weapon Cooldown Rate and +8 Weapon Charge Gain.',
      'Rampage': '+8% Physical Critical Chance; physical critical hits grant 12% Attack Speed for 4 s.',
      'Ravenous Strikes': '+8% Weapon Skill Power and +5% Weapon Skill Leech.',
      'Turbulent Velocity': '+4% Movement Speed, plus 4% more for 4 s after you damage an enemy.',
      'Wicked Power': '+8% Spell Critical Chance; spell critical hits have a 50% chance to apply a random spell school effect.',
    },

    // Ancestral weapon roll pool, used when site/gamedata.js has none: [{ text, range }] (W/Ancestral_Forge: each roll
    // is a base value times 1–5; Rare weapons get 2 rolls, Epic and Legendary 3)
    ROLL_POOL: [
      { text: 'Bonus Maximum Health', range: '+3.2–16%' },
      { text: 'Bonus Movement Speed', range: '+1.6–8%' },
      { text: 'Veil Cooldown Rate', range: '+2.8–14%' },
      { text: 'Bonus Physical Power', range: '+2–10%' },
      { text: 'Attack Speed', range: '+2.8–14%' },
      { text: 'Weapon Skill Cooldown Rate', range: '+2.8–14%' },
      { text: 'Weapon Skill Power', range: '+3.6–18%' },
      { text: 'Physical Critical Chance', range: '+3.2–16%' },
      { text: 'Physical Critical Power', range: '+3.2–16%' },
      { text: 'Bonus Spell Power', range: '+2.4–12%' },
      { text: 'Spell Cooldown Rate', range: '+2.4–12%' },
      { text: 'Spell Critical Chance', range: '+3.2–16%' },
      { text: 'Spell Critical Power', range: '+3.2–16%' },
      { text: 'Spell Leech', range: '+1.6–8%' },
    ],

    // Names that match several gaming.tools entries → the id the routes mean
    ID_HINT: {},

    // Enemies the planner names (blood carriers, drop sources) → { lv, blood?, region, id? (gaming.tools NPC id) }
    // Keys are the full names the Reference tab's carrier lists shorten (BR.shared.CARRIERS: "Thug 16" under
    // Farbane → 'Bandit Thug'); levels follow those lists and the wiki's Enemies page.
    ENEMIES: {
      // Warrior
      'Bandit Rascal': { lv: 10, blood: 'Warrior', region: FARBANE, id: 'char_bandit_rascal' },
      'Bandit Thug': { lv: 16, blood: 'Warrior', region: FARBANE, id: 'char_bandit_thug' },
      'Bandit Thief': { lv: 18, blood: 'Warrior', region: FARBANE, id: 'char_bandit_thief' },
      'Bandit Bomber': { lv: 32, blood: 'Warrior', region: FARBANE, id: 'char_bandit_bomber' },
      'Militia Torchbearer': { lv: 36, blood: 'Warrior', region: DUNLEY, id: 'char_militia_torchbearer' },
      'Militia Guard': { lv: 40, blood: 'Warrior', region: DUNLEY, id: 'char_militia_guard' },
      'Militia Demolisher': { lv: 47, blood: 'Warrior', region: DUNLEY, id: 'char_militia_bomber' },
      'Batoon': { lv: 58, blood: 'Warrior', region: GLOOM_S, id: 'char_gloomrot_batoon' },
      'Sentry Officer': { lv: 60, blood: 'Warrior', region: GLOOM_S, id: 'char_gloomrot_sentryofficer' },
      'Slave Master (morningstar)': { lv: 65, blood: 'Warrior', region: SILVER, id: 'char_churchoflight_slavemaster_enforcer' },
      'Harpy Scratcher': { lv: 66, blood: 'Warrior', region: SILVER, id: 'char_harpy_scratcher' },
      'Knight': { lv: 71, blood: 'Warrior', region: SILVER, id: 'char_churchoflight_knight_2h' },
      'Paladin': { lv: 76, blood: 'Warrior', region: SILVER, id: 'char_churchoflight_paladin' },
      'Lurker': { lv: 73, blood: 'Warrior', region: OAKVEIL, id: 'char_blackfang_lurker' },
      'Dreadcleaver': { lv: 74, blood: 'Warrior', region: OAKVEIL, id: 'char_blackfang_venomblade' },
      'Sentinel': { lv: 81, blood: 'Warrior', region: OAKVEIL, id: 'char_blackfang_sentinel' },
      // Rogue
      'Bandit Scout': { lv: 10, blood: 'Rogue', region: FARBANE, id: 'char_bandit_scout' },
      'Bandit Poacher': { lv: 16, blood: 'Rogue', region: FARBANE, id: 'char_bandit_hunter' },
      'Bandit Trapper': { lv: 20, blood: 'Rogue', region: FARBANE, id: 'char_bandit_trapper' },
      'Bandit Deadeye': { lv: 26, blood: 'Rogue', region: FARBANE, id: 'char_bandit_deadeye' },
      'Militia Crossbowman': { lv: 36, blood: 'Rogue', region: DUNLEY, id: 'char_militia_crossbow' },
      'Militia Archer': { lv: 42, blood: 'Rogue', region: DUNLEY, id: 'char_militia_longbowman' },
      'Railgunner': { lv: 58, blood: 'Rogue', region: GLOOM_S, id: 'char_gloomrot_railgunner' },
      'Tazer': { lv: 58, blood: 'Rogue', region: GLOOM_S, id: 'char_gloomrot_tazer' },
      'Rifleman': { lv: 65, blood: 'Rogue', region: SILVER, id: 'char_churchoflight_rifleman' },
      'Slave Master (pistol)': { lv: 65, blood: 'Rogue', region: SILVER, id: 'char_churchoflight_slavemaster_sentry' },
      'Harpy Dasher': { lv: 66, blood: 'Rogue', region: SILVER, id: 'char_harpy_dasher' },
      'Dartflinger': { lv: 73, blood: 'Rogue', region: OAKVEIL, id: 'char_blackfang_dartflinger' },
      'Viper': { lv: 74, blood: 'Rogue', region: OAKVEIL, id: 'char_blackfang_viper' },
      // Brute
      'Bandit Mugger': { lv: 22, blood: 'Brute', region: FARBANE, id: 'char_bandit_mugger' },
      'Bandit Stalker': { lv: 30, blood: 'Brute', region: FARBANE, id: 'char_bandit_stalker' },
      'Militia Skirmisher': { lv: 36, blood: 'Brute', region: DUNLEY, id: 'char_militia_light' },
      'Militia Veteran': { lv: 54, blood: 'Brute', region: DUNLEY, id: 'char_militia_heavy' },
      'Tractor Beamer': { lv: 58, blood: 'Brute', region: GLOOM_S, id: 'char_gloomrot_tractorbeamer' },
      'Church Archer': { lv: 56, blood: 'Brute', region: SILVER, id: 'char_churchoflight_archer' },
      'Footman': { lv: 65, blood: 'Brute', region: SILVER, id: 'char_churchoflight_footman' },
      'Cleric': { lv: 68, blood: 'Brute', region: SILVER, id: 'char_churchoflight_cleric' },
      'Striker': { lv: 74, blood: 'Brute', region: OAKVEIL, id: 'char_blackfang_striker' },
      // Scholar (the Spellcaster route's carriers)
      'Nun': { lv: 46, blood: 'Scholar', region: DUNLEY, id: 'char_militia_nun' },
      'Devoted': { lv: 56, blood: 'Scholar', region: DUNLEY, id: 'char_militia_devoted' },
      'Villager': { lv: 20, blood: 'Scholar', region: DUNLEY, id: 'char_farmlands_villager_female_sister', note: 'Most villagers carry Worker blood; the sisters in Mosswick, Dawnbreak and the Dunley Monastery carry Scholar.' },
      'Priest': { lv: 76, blood: 'Scholar', region: SILVER, id: 'char_churchoflight_priest' },
      'Lightweaver': { lv: 76, blood: 'Scholar', region: SILVER, id: 'char_churchoflight_lightweaver' },
      'Witch': { lv: 72, blood: 'Scholar', region: CURSED, id: 'char_cursed_witch' },
      'Alchemist': { lv: 74, blood: 'Scholar', region: OAKVEIL, id: 'char_blackfang_alchemist' },
    },
  };
})();
