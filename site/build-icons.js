// Downloads the icons the site uses and writes icons.js (window.VR_ICONS = { name: dataURI }).
// Run: node site/build-icons.js (the Pages workflow runs it at deploy time; icons.js is git-ignored)
// The tests (test/) import the name lists to check every icon a route uses gets downloaded.
// Item, spell and passive icons: vrising.gaming.tools CDN. Boss portraits, station images and a few item icons: V Rising Fandom wiki.
const fs = require('fs');
const path = require('path');

const CDN = 'https://cdn-hosted.gaming.tools/vrising/images/icons/';
const VER = '?v=1790852702230';

// Display name -> gaming.tools icon file (looked up from the vrising.gaming.tools entity data).
const ITEMS = {
  'Shadowbolt': 'stunlock_icon_ability_spell_shadow_shadowbolt.webp', 'Blood Rite': 'stunlock_icon_ability_spell_shadow_shadowdance.webp',
  'Chaos Volley': 'stunlock_icon_ability_spell_chaos_chaosvolley.webp', 'Bone Explosion': 'poneti_icon_paladinskill_17_green.webp',
  'Rain of Chaos': 'stunlock_icon_ability_spell_chaos_rainofchaos.webp', 'Chaos Barrage': 'stunlock_icon_ability_spell_chaos_chaosbarrage.webp',
  'Volatile Arachnid': 'stunlock_icon_ability_spell_unholy_baneling.webp', 'Unholy Chains': 'stunlock_icon_ability_spell_unholy_chainsofdeath.webp',
  'Lightning Tendrils': 'stunlock_icon_ability_spell_storm_lightningtendrils.webp', 'Veil of Blood': 'stunlock_icon_ability_spell_blood_veilofblood.webp',
  'Veil of Chaos': 'stunlock_icon_ability_spell_chaos_veilofchaos.webp', 'Blood Storm': 'stunlock_icon_ability_spell_blood_bloodstorm.webp',
  'Carrion Swarm': 'stunlock_icon_ability_spell_blood_carrionswarm.webp', 'Crimson Beam': 'stunlock_icon_ability_spell_blood_crimsonbeam.webp',
  'Phantom Aegis': 'stunlock_icon_ability_spell_illusion_phantomaegis.webp', 'Wraith Spear': 'stunlock_icon_ability_spell_illusion_wraithspear.webp',
  'Cold Snap': 'stunlock_icon_ability_spell_frost_coldsnap.webp', 'Ice Block': 'stunlock_icon_ability_spell_frost_iceblock.webp',
  'Aftershock': 'stunlock_icon_ability_spell_chaos_aftershock.webp', 'Curse': 'stunlock_icon_ability_spell_illusion_curse.webp',
  'Ball Lightning': 'stunlock_icon_ability_spell_storm_lightning_ball.webp', 'Void': 'stunlock_icon_ability_spell_chaos_void.webp',
  'Blood Rage': 'stunlock_icon_ability_spell_blood_bloodrage.webp', 'Spectral Guardian': 'stunlock_icon_ability_spell_illusion_spectralguardian.webp',
  'Wolf Form': 'stunlock_icon_ability_shapeshift_wolf.webp', 'Rat Form': 'stunlock_icon_ability_shapeshift_rat.webp',
  'Bear Form': 'stunlock_icon_ability_shapeshift_bear.webp', 'Human Form': 'stunlock_icon_ability_shapeshift_human.webp',
  'Spider Form': 'stunlock_icon_ability_shapeshift_spider.webp', 'Toad Form': 'stunlock_icon_ability_shapeshift_toad.webp',
  'Bat Form': 'stunlock_icon_ability_shapeshift_bat.webp', 'Veil of Frost': 'stunlock_icon_ability_spell_frost_veiloffrost.webp',
  'Veil of Storm': 'stunlock_icon_ability_spell_storm_veilofstorm.webp', 'Veil of Bones': 'stunlock_icon_ability_spell_unholy_veilofunholy.webp',
  'Veil of Illusion': 'stunlock_icon_ability_spell_illusion_veilofillusion.webp',
  'Bone Sword': 'stunlock_icon_bonesword01.webp', 'Bone': 'poneti_icon_loot_23.webp', 'Bone Ring': 'item_magicsource_general_t01_bonering.webp',
  'Boneguard Chestguard': 'stunlock_icon_chest_01_boneguard.webp', 'Plated Boneguard Chestguard': 'stunlock_icon_chest_02_platedboneguard.webp',
  'Copper Crossbow': 'stunlock_icon_bronzecrossbow01.webp', 'Merciless Copper Crossbow': 'stunlock_icon_bronzecrossbow02.webp',
  'Iron Crossbow': 'stunlock_icon_ironcrossbow01.webp', 'Merciless Iron Crossbow': 'stunlock_icon_ironcrossbow02_legendary.webp',
  'Dark Silver Crossbow': 'stunlock_icon_steelcrossbow01.webp', 'Sanguine Crossbow': 'stunlock_icon_steelcrossbow02.webp',
  'Ancestral Crossbow Shards': 'stunlock_icon_steelcrossbow02_shattered_epic.webp',
  'Nightstalker Vest': 'stunlock_icon_chest_03_nightstalker.webp', 'Warlock Vest': 'stunlock_icon_chest_scholar.webp',
  'Hollowfang Chestguard': 'stunlock_icon_chest_05_hollowfang.webp', 'Dark Magus Chestguard': 'stunlock_icon_chest_tudor.webp',
  'Dawnthorn Chestguard': 'stunlock_icon_chest_07_dawnthorn.webp', 'Maleficer Scholar Chestguard': 'stunlock_icon_chest_castlelord.webp',
  "Dracula's Maleficer Chestguard": 'stunlock_icon_chest_dracula_scholar.webp', "Dracula's Maleficer Gloves": 'stunlock_icon_gloves_dracula_scholar.webp',
  "Dracula's Maleficer Boots": 'stunlock_icon_boots_dracula_scholar.webp', "Dracula's Maleficer Leggings": 'stunlock_icon_legs_dracula_scholar.webp',
  'Gravedigger Ring': 'item_magicsource_general_t03_gravediggerring.webp', 'Ring of the Sorcerer': 'poneti_icon_jewelry_26_mage_ring.webp',
  'Scourgestone Pendant': 'item_magicsource_general_t05_relic.webp', 'Pendant of the Sorcerer': 'item_magicsource_general_t06_amethystpendant.webp',
  'Blood Merlot Amulet': 'item_magicsource_general_t07_bloodwineamulet.webp', 'Amulet of the Arch-Warlock': 'item_magicsource_general_t08_frozencrypt.webp',
  'Soul Shard of Dracula': 'item_magicsource_soulshardofdracula.webp', 'Soul Shard of the Winged Horror': 'item_magicsource_soulshardofwingedhorror.webp',
  'Soul Shard of Solarus': 'item_magicsource_soulshardofsolarus.webp', 'Soul Shard of the Monster': 'item_magicsource_soulshardofthemonster.webp',
  'Soul Shard of the Serpent': 'stunlock_icon_item_magicsource_soulshardofmorgana.webp', 'Blood Key': 'item_magicsource_bloodkey_t01.webp',
  'Enchanted Brew': 'stunlock_icon_item_canteen_spellbrew_t01.webp', 'Witch Potion': 'stunlock_icon_glassbottle_spellbrew_t02.webp',
  'Elixir of the Prowler': 'stunlock_icon_item_elixir_prowler.webp', 'Elixir of the Twisted': 'stunlock_icon_item_elixir_twisted.webp',
  'Elixir of the Blasphemous': 'stunlock_icon_item_elixir_blasphemous.webp', 'Elixir of the Bat': 'stunlock_icon_item_elixir_bat.webp',
  'Vermin Salve': 'fantasyicon_magicitem__105_.webp', 'Blood Rose Brew': 'stunlock_icon_item_canteen09.webp',
  'Blood Rose Potion': 'poneti_icon_alchemy_31_bloodrosebrew_flask.webp', 'Blood Merlot': 'stunlock_icon_merlotbloodpotion.webp',
  'Greater Blood Essence': 'stunlock_icon_item_bloodessence02.webp', 'Primal Blood Essence': 'stunlock_icon_item_bloodessence04.webp',
  'Unsullied Heart': 'stunlock_icon_item_unsulliedheart02.webp', 'Leather': 'poneti_icon_skinning_01_piece_of_leather.webp',
  'Coarse Thread': 'stunlock_icon_coarsethread.webp', 'Copper Ingot': 'poneti_icon_mining_52_copper_ingot.webp',
  'Iron Ingot': 'poneti_icon_mining_51_iron_ingot.webp', 'Dark Silver Ingot': 'poneti_icon_mining_61_darksilver_ingot.webp',
  'Gold Ingot': 'poneti_icon_mining_54_gold_ingot.webp', 'Radium Alloy': 'poneti_icon_blacksmith_05_stick1.webp',
  'Power Core': 'stunlock_icon_powercore.webp', 'Thick Leather': 'poneti_icon_skinning_03_very_thick_skin.webp',
  'Pristine Leather': 'poneti_icon_skinning_04_skin.webp', 'Silk': 'poneti_icon_tailoring_22_blue_clothroll.webp',
  'Cotton Yarn': 'poneti_icon_tailoring_14_yarn.webp', 'Wool Thread': 'fantasyicon_resourceandcraftaddon__56_.webp',
  'Ghost Yarn': 'poneti_icon_tailoring_18_ghost_yarn.webp', 'Shadow Weave': 'poneti_icon_tailoring_40_demonic_cloth.webp',
  'Bat Leather': 'item_ingredient_batleather.webp', 'Glass': 'resourceicon_glass.webp', 'Empty Glass Bottle': 'stunlock_icon_emptybottle.webp',
  'Empty Waterskin': 'stunlock_icon_item_canteen04.webp', 'Scourgestone': 'poneti_icon_jewelry_19_fellcrystal.webp',
  'Gem Dust': 'poneti_icon_enchantment_02_big_magicdust.webp', 'Grave Dust': 'stunlock_icon_item_gravedust.webp',
  'Whetstone': 'poneti_icon_blacksmith_22_grindstone.webp', 'Reinforced Plank': 'poneti_icon_res_04_reinforced.webp',
  'Plank': 'poneti_icon_res_124.webp', 'Onyx Tear': 'poneti_icon_enchantment_61_runeponeti.webp',
  'Ember Glass': 'stunlock_icon_item_ingredient_emberglass.webp', 'Blood Crystal': 'item_ingredient_bloodcrystal.webp',
  'Mourning Lily': 'stunlock_icon_mourninglily.webp', 'Snow Flower': 'stunlock_icon_snowflower.webp', 'Fire Blossom': 'stunlock_icon_fireblossom.webp',
  'Sunflower': 'stunlock_icon_sunflower.webp', 'Sacred Grapes': 'stunlock_icon_grapes.webp', 'Fish Bone': 'fantasyicon_food__78_.webp',
  'Corrupted Fish': 'stunlock_icon_item_ingredient_fish_corrupted_t03.webp', 'Stygian Shard': 'item_nethershard_t01.webp',
  'Greater Stygian Shard': 'item_nethershard_t02.webp', 'Scroll': 'poneti_icon_enchantment_22_scroll1.webp',
  'Flawless Amethyst': 'stunlock_icon_item_gem_amethyst3.webp', 'Regular Topaz': 'stunlock_icon_item_gem_topaz2.webp',
  'Crude Amethyst': 'stunlock_icon_item_gem_amethyst1.webp', 'Copper Ore': 'poneti_icon_mining_05_ironore.webp',
  'Iron Ore': 'poneti_icon_mining_06_clearironore.webp', 'Silver Ore': 'poneti_icon_mining_10_mangan.webp',
  'Fishing Pole': 'poneti_icon_cooking_59_fishingrod.webp', 'Minor Explosive Box': 'stunlock_icon_explosivebox_minor.webp',
  'Scholar': 'bloodtype_scholar_big.webp', 'Draculin': 'bloodtype_draculin_big.webp', 'Mutant': 'bloodtype_mutant_big.webp',
  'Warrior': 'bloodtype_warrior_big.webp', 'Rogue': 'bloodtype_rogue_big.webp', 'Brute': 'bloodtype_brute_big.webp',
  'Enhanced Conductivity': 'stunlock_icon_ability_spell_storm_passive_enhancedconductivity.webp',
  'Wicked Power': 'stunlock_icon_spellpassive_wickedpower.webp', 'Hunger for Blood': 'stunlock_icon_spellpassive_vbloodslayer.webp',
  'Renewing Flames': 'stunlock_icon_ignitechaosbuff.webp', 'Cold Soul': 'stunlock_icon_ability_spell_frost_passive_coldsoul.webp',
  'Chaos Kindling': 'stunlock_icon_ability_spell_chaos_passive_chaoskindling.webp',
  'Lightning Fast Strikes': 'stunlock_icon_ability_spell_storm_passive_lightningfaststrikes.webp',
  'Shroud of the Forest': 'poneti_icon_cloak_30.webp', 'Silver Resistance Potion': 'stunlock_icon_glassbottle_silverresistance_t03.webp',
  'Holy Resistance Flask': 'stunlock_icon_glassbottle_holyresistance_t03.webp', 'Blood Hunger': 'stunlock_icon_bloodhunger.webp',
  'Dominate': 'stunlock_icon_ability_dominatingpresence.webp',
  'Stone': 'poneti_icon_mining_01_fragments_of_stones.webp', 'Crude Topaz': 'stunlock_icon_item_gem_topaz1.webp',
  'Regular Amethyst': 'stunlock_icon_item_gem_amethyst2.webp', 'Regular Emerald': 'stunlock_icon_item_gem_emerald2.webp',
  'Flawless Sapphire': 'stunlock_icon_item_gem_sapphire3.webp', 'Flawless Topaz': 'stunlock_icon_item_gem_topaz3.webp',
  'Flawless Emerald': 'stunlock_icon_item_gem_emerald3.webp', 'Corrupted Flower': 'stunlock_icon_item_ingredient_plant_corruptedflower.webp',
  'Plague Brier': 'stunlock_icon_plaguebrier.webp', "Hell's Clarion": 'stunlock_icon_hellsclarion.webp',
  'Regular jewel': 'stunlock_icon_item_jewel_topaz2.webp', 'Greater jewel': 'stunlock_icon_item_jewel_topaz3.webp',
  'Primal jewel': 'stunlock_icon_item_jewel_topaz4.webp',
  // Warrior, Rogue and Brute routes.
  'Bone Axes': 'stunlock_icon_boneaxe01.webp', 'Bone Spear': 'stunlock_icon_bonespear01.webp',
  'Copper Sword': 'stunlock_icon_bronzesword01.webp', 'Merciless Copper Sword': 'stunlock_icon_bronzesword02.webp',
  'Copper Axes': 'stunlock_icon_bronzeaxe01.webp', 'Merciless Copper Axes': 'stunlock_icon_bronzeaxe02.webp',
  'Copper Spear': 'stunlock_icon_bronzespear01.webp', 'Merciless Copper Spear': 'stunlock_icon_bronzespear02.webp',
  'Iron Sword': 'stunlock_icon_ironsword01.webp', 'Iron Axes': 'stunlock_icon_ironaxe01.webp', 'Iron Spear': 'stunlock_icon_ironspear01.webp',
  'Iron Mace': 'stunlock_icon_ironmace01.webp', 'Iron Greatsword': 'stunlock_icon_irongreatsword01.webp', 'Iron Claws': 'stunlock_icon_ironclaws01.webp',
  'Iron Daggers': 'stunlock_icon_irondaggers01.webp', 'Iron Slashers': 'stunlock_icon_ironslashers01.webp',
  'Iron Reaper': 'stunlock_icon_ironscythe01.webp', 'Merciless Iron Reaper': 'stunlock_icon_ironscythe02_legendary.webp',
  'Dark Silver Reaper': 'stunlock_icon_steelscythe01.webp', 'Sanguine Reaper': 'stunlock_icon_steelscythe02.webp',
  'Iron Twinblade': 'stunlock_icon_irontwinblades01.webp', 'Merciless Iron Twinblade': 'stunlock_icon_irontwinblades02_legendary.webp',
  'Dark Silver Twinblade': 'stunlock_icon_steeltwinblades01.webp', 'Sanguine Twinblade': 'stunlock_icon_steeltwinblades02.webp',
  'Iron Pistols': 'stunlock_icon_ironpistol01.webp', 'Merciless Iron Pistols': 'stunlock_icon_ironpistol02_legendary.webp',
  'Ancestral Reaper Shards': 'stunlock_icon_steelscythe02_shattered_epic.webp', 'Ancestral Twinblade Shards': 'stunlock_icon_steeltwinblades02_shattered_epic.webp',
  'Ancestral Sword Shards': 'stunlock_icon_steelsword02_shattered_epic.webp', 'Ancestral Axes Shards': 'stunlock_icon_steelaxe02_shattered_epic.webp',
  'Ancestral Spear Shards': 'stunlock_icon_steelspear02_shattered_epic.webp',
  "Dracula's Dread Chestguard": 'stunlock_icon_chest_dracula_warrior.webp', "Dracula's Dread Gloves": 'stunlock_icon_gloves_dracula_warrior.webp',
  "Dracula's Dread Boots": 'stunlock_icon_boots_dracula_warrior.webp', "Dracula's Dread Leggings": 'stunlock_icon_legs_dracula_warrior.webp',
  "Dracula's Grim Chestguard": 'stunlock_icon_chest_dracula_brute.webp', "Dracula's Grim Gloves": 'stunlock_icon_gloves_dracula_brute.webp',
  "Dracula's Grim Boots": 'stunlock_icon_boots_dracula_brute.webp', "Dracula's Grim Leggings": 'stunlock_icon_legs_dracula_brute.webp',
  "Dracula's Shadow Chestguard": 'stunlock_icon_chest_dracula_rogue.webp', "Dracula's Shadow Gloves": 'stunlock_icon_gloves_dracula_rogue.webp',
  "Dracula's Shadow Boots": 'stunlock_icon_boots_dracula_rogue.webp', "Dracula's Shadow Leggings": 'stunlock_icon_legs_dracula_rogue.webp',
  'Ring of the Duskwatcher': 'item_magicsource_general_t04_duskwatcher.webp', 'Pendant of the Warrior': 'item_magicsource_general_t06_rubypendant.webp',
  'Pendant of the Duskwatcher': 'item_magicsource_general_t06_topazamulet.webp',
  'Elixir of the Raven': 'stunlock_icon_item_elixir_raven.webp', 'Elixir of the Crow': 'stunlock_icon_item_elixir_crow.webp',
  'Elixir of the Werewolf': 'stunlock_icon_item_elixir_werewolf.webp', 'Elixir of the Beast': 'stunlock_icon_item_elixir_beast.webp',
  'Brew of Ferocity': 'stunlock_icon_item_canteen_physicalbrew_t01.webp', 'Potion of Rage': 'stunlock_icon_glassbottle_physicalbrew_t02.webp',
  'Blood Coating': 'stunlock_icon_item_coating_blood.webp', 'Unholy Coating': 'stunlock_icon_item_coating_unholy.webp',
  'Power Surge': 'stunlock_icon_ability_spell_chaos_powersurge.webp', 'Discharge': 'stunlock_icon_ability_spell_storm_discharge.webp',
  'Heart Strike': 'stunlock_icon_ability_spell_blood_heartstrike.webp', 'Sanguine Coil': 'stunlock_icon_ability_spell_blood_sanguinecoil.webp',
  'Blood Spray': 'stunlock_icon_ability_spell_blood_passive_bloodspray.webp', 'Sanguine Mastery': 'stunlock_icon_ability_spell_blood_passive_sanguinemastery.webp',
  'Rampage': 'stunlock_icon_spellpassive_rampage.webp', 'Lethal Strikes': 'stunlock_icon_spellpassive_lethalstrikes.webp',
  'Ravenous Strikes': 'stunlock_icon_spellpassive_ravenousstrikes.webp', 'Overpower': 'stunlock_icon_spellpassive_overpower.webp',
  'Crude Ruby': 'stunlock_icon_item_gem_ruby1.webp', 'Regular Ruby': 'stunlock_icon_item_gem_ruby2.webp', 'Flawless Ruby': 'stunlock_icon_item_gem_ruby3.webp',
  'Crude Sapphire': 'stunlock_icon_item_gem_sapphire1.webp', 'Regular Sapphire': 'stunlock_icon_item_gem_sapphire2.webp',
  'Crude Emerald': 'stunlock_icon_item_gem_emerald1.webp', 'Ghost Shroom': 'stunlock_icon_ghostshroom.webp',
  'Regular Blood jewel': 'stunlock_icon_item_jewel_ruby2.webp', 'Greater Blood jewel': 'stunlock_icon_item_jewel_ruby3.webp',
  'Regular Chaos jewel': 'stunlock_icon_item_jewel_amethyst2.webp', 'Greater Chaos jewel': 'stunlock_icon_item_jewel_amethyst3.webp',
};
// Item icons the CDN doesn't have under a predictable name: taken from the wiki page of the same title.
const PAGES = ['Iron Whip', 'Dark Silver Pistols', 'Sanguine Pistols', 'Ring of the Warrior', 'Amulet of the Crimson Commander',
  'Amulet of the Blademaster', 'Lightning Typhoon', 'Regular Miststone', 'Flawless Miststone', 'Bleeding Heart', 'Venom Sap',
  'Grim Ranger Vest', 'Blood Hunter Chestguard', 'Dread Plate Chestguard', 'Marauder Vest', 'Crimson Templar Chestguard',
  'Grim Knight Chestguard', 'Shadewalker Vest', 'Duskwatcher Chestguard', 'Shadowmoon Chestguard'];

// Wiki page titles -> display names (portraits and structure images).
const BOSSES = ['Alpha the White Wolf', 'Errol the Stonebreaker', 'Keely the Frost Archer', 'Rufus the Foreman', 'Grayson the Armourer',
  'Goreswine the Ravager', 'Clive the Firestarter', 'Lidia the Chaos Archer', 'Nibbles the Putrid Rat', 'Finn the Fisherman',
  'Polora the Feywalker', 'Nicholaus the Fallen', 'Kodia the Ferocious Bear', 'Quincey the Bandit King', 'Beatrice the Tailor',
  'Tristan the Vampire Hunter', 'Christina the Sun Priestess', 'Vincent the Frostbringer', 'Sir Erwin the Gallant Cavalier',
  'Kriig the Undead General', 'Maja the Dark Savant', 'Leandra the Shadow Priestess', 'Meredith the Bright Archer',
  'Grethel the Glassblower', 'Bane the Shadowblade', 'Terah the Geomancer', 'Frostmaw the Mountain Terror', 'General Elena the Hollow',
  'Gaius the Cursed Champion', 'Jade the Vampire Hunter', 'General Cassius the Betrayer', 'Raziel the Shepherd',
  'Octavian the Militia Captain', 'Domina the Blade Dancer', 'Ziva the Engineer', 'Angram the Purifier', 'Ben the Old Wanderer',
  'Ungora the Spider Queen', 'Foulrot the Soultaker', 'Willfred the Village Elder', 'Albert the Duke of Balaton', 'Cyril the Cursed Smith',
  'Sir Magnus the Overseer', 'Mairwyn the Elementalist', 'Baron du Bouchon the Sommelier', 'Morian the Stormwing Matriarch',
  'Henry Blackbrew the Doctor', 'Jakira the Shadow Huntress', 'Stavros the Carver', 'Matka the Curse Weaver', 'Lucile the Venom Alchemist',
  'Terrorclaw the Ogre', 'Azariel the Sunbringer', 'Voltatia the Power Master', 'Simon Belmont the Vampire Hunter',
  'Dantos the Forgebinder', 'General Valencia the Depraved', 'Gorecrusher the Behemoth', 'Lord Styx the Night Champion',
  'Talzur the Winged Horror', 'Solarus the Immaculate', 'Adam the Firstborn', 'Megara the Serpent Queen', 'Dracula the Immortal King'];
const STATIONS = ['Research Desk', 'Study', 'Athenaeum', 'Alchemy Table', 'Smithy', 'Tailoring Bench', 'Tannery', 'Woodworking Bench',
  'Artisan Table', 'Jewelcrafting Table', 'Gem Cutting Table', 'Anvil', 'Prison Cell', 'Altar of Stygian Awakening', 'Fusion Forge',
  'Ancestral Forge', 'Blood Homogenizer', 'Eye of Mortium', 'Blood Press', 'Loom', 'Furnace', 'Fabricator', 'Advanced Blood Press',
  'Simple Workbench', 'Sawmill', 'Castle Heart', 'Stygian Summoning Circle', 'Waygate'];

const UA = { 'User-Agent': 'bloodroute icon builder (+https://github.com/ChristianPresley/bloodroute)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Retries transient failures (CDN/wiki hiccups on CI runners) before giving up on an icon.
async function dataUri(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const type = (r.headers.get('content-type') || 'image/png').split(';')[0];
      return `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString('base64')}`;
    } catch (e) {
      if (i >= tries || /^404 /.test(e.message)) throw e;
      await sleep(1000 * i);
    }
  }
}

async function wikiThumbs(titles, width) {
  const out = {};
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40);
    const u = 'https://vrising.fandom.com/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=' + width +
      '&titles=' + encodeURIComponent(batch.join('|'));
    let j;
    for (let t = 1; ; t++) {
      try { j = await (await fetch(u, { headers: UA })).json(); break; } catch (e) { if (t >= 3) throw e; await sleep(1000 * t); }
    }
    const back = {};  // resolve redirects/normalisation back to the requested title
    for (const n of j.query.normalized || []) back[n.to] = n.from;
    for (const n of j.query.redirects || []) back[n.to] = back[n.from] || n.from;
    for (const p of Object.values(j.query.pages)) if (p.thumbnail) out[back[p.title] || p.title] = p.thumbnail.source;
  }
  return out;
}

async function main() {
  const icons = {}, missing = [];
  const jobs = Object.entries(ITEMS).map(([name, file]) => [name, CDN + file + VER]);
  const bossThumbs = await wikiThumbs(BOSSES, 96);
  const stationThumbs = await wikiThumbs(STATIONS, 96);
  const pageThumbs = await wikiThumbs(PAGES, 96);
  for (const t of BOSSES) bossThumbs[t] ? jobs.push([t, bossThumbs[t]]) : missing.push(t);
  for (const t of STATIONS) stationThumbs[t] ? jobs.push([t, stationThumbs[t]]) : missing.push(t);
  for (const t of PAGES) pageThumbs[t] ? jobs.push([t, pageThumbs[t]]) : missing.push(t);
  let i = 0;
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < jobs.length) {
      const [name, url] = jobs[i++];
      try { icons[name] = await dataUri(url); } catch (e) { missing.push(`${name} (${e.message})`); }
    }
  }));
  const sorted = Object.fromEntries(Object.keys(icons).sort().map(k => [k, icons[k]]));
  const js = '// Generated by build-icons.js. Item/spell icons: vrising.gaming.tools; boss, station and some item images: vrising.fandom.com.\n' +
    'window.VR_ICONS = ' + JSON.stringify(sorted) + ';\n';
  fs.writeFileSync(path.join(__dirname, 'icons.js'), js);
  console.log(`icons: ${Object.keys(icons).length}, size: ${(js.length / 1024).toFixed(0)} KB`);
  if (missing.length) console.log('missing:', missing.join('; '));
}

module.exports = { ITEMS, PAGES, BOSSES, STATIONS };
if (require.main === module) main();
