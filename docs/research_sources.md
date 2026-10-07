# Research sources for the caster damage model

Gathered 2026-10-05 for game patch **1.1.13.0** (Spring Patch, 2026-05-26; Hot Fixes 11–12 changed no balance).
vrising.gaming.tools data version 1790852702230 matches v1.1.13.0.

Both official wikis block automated page loads, so wiki facts were read through the Fandom MediaWiki API
(raw page text). "W/Page" = https://vrising.fandom.com/wiki/Page. The patch notes are the primary source
where they conflict with older pages.

Main sources:
- 1.1 patch notes (2025-04-28): https://blog.stunlock.com/v-rising-1-1-patch-notes/
- 1.1 October patch (2025-10-15): https://store.steampowered.com/news/app/1604030/view/496083100136112688
- 1.1.13.0 Spring patch (2026-05-26): https://store.steampowered.com/news/app/1604030/view/679625078232581352
- V Blood list with spell-point rewards (updated 2025-11-11): https://www.bisecthosting.com/blog/v-rising-blood-boss-locations-where-to-find-level-requirements-rewards
- Jewel modifier table (rev 2026-06-13): https://vrising.fandom.com/wiki/Template:Jewel_Table
- Attributes / caps (rev 2026-09-01): W/Attributes · Gear Level (rev 2026-05-28): W/Gear_Level · Blood (rev 2026-08-08): W/Blood

## How spells are unlocked

Each V Blood boss gives one **Spell Point** for a fixed school and tier (T1/T2/T3). You spend it in the
Spellbook on any spell of that school and tier. **Veils** drop directly from one boss each (since 1.1).
**Soul Shard** ultimates come from wearing the shard necklace.

| School | T1 spells (point from) | T2 spells (point from) | T3 spells (point from) | Veil |
|---|---|---|---|---|
| Blood | Blood Rage (Rufus 20). Shadowbolt and Blood Rite are known from the start | Sanguine Coil, Blood Fountain, Carrion Swarm (Raziel 57, Baron 70, Lucile 76) | Crimson Beam, Heart Strike (Tristan 44, Willfred 64) | Veil of Blood: Beatrice (40) |
| Chaos | Chaos Volley, Power Surge, Aftershock (Errol 20, Lidia 30, Morian 70) | Void, Chaos Barrier, Rain of Chaos (Clive 30, Angram 61, Stavros 75) | Chaos Barrage, Merciless Charge (Quincey 37, Azariel 79) | Veil of Chaos: Jade (57) |
| Frost | Frost Bat, Cold Snap, Ice Nova (Keely 20, Finn 32, Sir Magnus 66) | Crystal Lance, Frost Barrier, Arctic Storm (Elena 53, Ben 63, Dantos 82) | Arctic Leap, Ice Block (Frostmaw 53, Terrorclaw 76) | Veil of Frost: Vincent (44) |
| Illusion | Spectral Wolf, Phantom Aegis, Wraith Spear (Grayson 27, Polora 35, Maja 47) | Mosquito, Mist Trance, Curse (Christina 44, Jakira 75, Matka 76) | Spectral Guardian, Wisp Dance (Terah 53, Gorecrusher 84) | Veil of Illusion: Cyril (65) |
| Storm | Cyclone, Ball Lightning, Discharge (Sir Erwin 46, Grethel 50, Mairwyn 70) | Polarity Shift, Lightning Curtain, Lightning Tendrils (Ziva 60, Domina 60, Voltatia 79) | Raging Tempest, Lightning Typhoon (Octavian 58, Henry Blackbrew 74) | Veil of Storm: Meredith (50) |
| Unholy | Corrupted Skull, Bone Explosion, Ward of the Damned (Goreswine 27, Leandra 47, Gaius 55) | Death Knight, Soulburn, Unholy Chains (Kriig 47, Cassius 57, Foulrot 63) | Army of the Dead, Volatile Arachnid (Nicholaus 35, Ungora 63) | Veil of Bones: Bane (50) |

Soul Shard ultimates: Dracula (91) → Blood Storm · Talzur (86) → Voidquake Vortex · Adam (88) → Eye of the Storm ·
Megara (88) → Serpent's Kiss · Solarus (86) → Summon Fallen Angel.

Conflicts: one source lists Angram as T3 Chaos; the official notes say T2 (used here). Goreswine/Grayson schools
differ between two pages from the same site; the wiki boss infoboxes (2026) confirm Goreswine Unholy T1 and Grayson
Illusion T1. The wiki infoboxes for Angram, Ben, Mairwyn and Ziva are stale; the 1.1 notes' changes are used.
The game data also contains a Lv 30 "Quincey the Marauder" with Quincey's rewards; the wiki lists only Quincey the
Bandit King (Lv 37), so the Lv 30 entry is treated as a duplicate.
Greater Blood Essence is craftable from the start from Unsullied Hearts (4) at the Blood Press (Tristan adds the
Blood Essence → Greater recipe). The Blood Key costs 4 Onyx Tear + 4 Primal Blood Essence + 200 Blood Crystals at the Artisan Table (1.1 notes, W/Blood_Key).
Shards: Stygian Shards from Tier 1 Rift Incursions (Lv 57+) and Mortium; Greater Stygian Shards from Tier 2 Rift
Incursions (Lv 80) or 12:1 conversion at the Gem Cutting Table. Ancestral shards: Rare 25% from Lv 53–76 V Bloods /
50% Tier 1 Rifts / 750 Stygian at a Mortium vendor; Epic 5% from Lv 79+ V Bloods / Tier 2 Rifts / 1,500 Greater.
Only Epic or Legendary Ancestral weapons have 3 rolls (Epic = Sanguine weapon + Epic shard + 4 Onyx Tear). Map links in progression_schedule.md use Map Genie's map
(mapgenie.io/v-rising/maps/vardoran) marker and category IDs.
"Vampiric Curse" in the database is a jewel/coating/shard effect, not a spellbook spell. Veil of Shadow has no
current unlock source; it is probably a leftover entry.

## Progression facts used in progression_schedule.md

Checked by the review agents against the Fandom wiki (MediaWiki API, 2025–26 revisions), the 1.1 patch notes, the
journal-quest data and build_data.json. W/Page = https://vrising.fandom.com/wiki/Page.

| Fact | Source |
|---|---|
| Shelter quest unlocks Furnace, Sawmill, Simple Workbench, Grinder, Blood Press | W/Shelter, W/Furnace |
| Research Desk from "Thirst for Power": 3 more V Bloods + equip a spell (journal tag Lv 30) | W/Thirst_for_Power; quest data |
| Dominate chain: "Waygate" → Stone Coffin; "Lord of the Manor" → Servant Coffin; "Servants" (Blood Press + Servant Coffin) → Dominate | quest data; W/Servants_(Quest) |
| Unsullied Heart guaranteed from Grayson to Gaius (Lv 27–55); 25% from Alpha, Errol, Keely, Rufus, Nibbles, Lidia, Kodia, Finn; 80% from most Lv 53+ V Bloods and none from some (the wiki says guaranteed from all but the 25% ones; the game data drop tables are used). Greater Blood Essence from 4 hearts at the Blood Press; summoning Nibbles costs 1 heart + 4 Grave Dust | W/Unsullied_Heart, W/Blood_Press, W/Greater_Blood_Essence, W/Vermin_Nest, `data/raw_full.json` drop tables |
| Coarse Thread looted in bandit camps / Shady Goods Dealer (no Human Form); Wool Thread, Cotton Yarn looted or Rural merchant (Human Form) | W/Coarse_Thread, W/Wool_Thread, W/Cotton_Yarn, W/Human_Form |
| Quincey's stronghold needs Minor Explosive Boxes or Bear Form's Crush | W/Quincey_the_Bandit_King |
| Prison Cell 8 Iron Ingot + 2 Reinforced Plank; Corrupted Fish ±0–2% quality, caught in Oakveil (and Brighthaven Docks, which has every region's fish) | W/Prison_Cell, W/Corrupted_Fish, W/Silverlight_Hills |
| Irradiant Gruel +1–2% quality, 35% chance to make an Abomination (must be killed); Mutant Spitters can be dominated since 1.1 | W/Irradiant_Gruel, W/Mutant_Spitter, 1.1 notes |
| Castle Heart 2: 12 Leather + 12 Copper; 3: 8 Reinforced Plank + 24 Glass + 1 GBE (Eye of Mortium via "Reign Supreme"); 4: 12 Radium + 1 PBE (Subdue); 5: 12 Dark Silver + 4 Power Core + 1 PBE (Eye of Twilight) | W/Castle_Heart; quest data |
| Eye of Mortium: 4 Iron Ingot + 4 Scourgestone + 20 Scroll, inside your territory | W/Eye_of_Mortium |
| Mining: Iron Ore GL 12, Silver Ore GL 18, Blood Crystal GL 23 (only at Dracula's Demise) | W/Iron_Ore, W/Silver_Ore, W/Blood_Crystal |
| Rift Incursions: Tier 1 Lv 57+, Tier 2 Lv 80, every 30 min for 20 min; ~65 Greater Stygian Shards per solo Tier 2 run; shard repair +750 per Primal Blood Soul in Tier 2 only, shared across carried shards | W/Rift_Incursions, W/Greater_Stygian_Shard |
| Gem Cutting Table converts 12 Stygian → 1 Greater Stygian Shard | W/Gem_Cutting_Table |
| Altar Discover: random passive, 400 Stygian (elemental) / 600 Greater (vampire); Awakening Scrolls unlock directly; spare scrolls salvage for 100 Greater at the Devourer; ~5,200 Greater expected for two specific vampire passives (reviewer arithmetic) | W/Altar_of_Stygian_Awakening |
| Ancestral: Rare = Merciless Iron weapon + Rare shard + 8 Radium Alloy + 1 GBE (2 rolls); Epic = Sanguine weapon + Epic shard + 4 Onyx Tear (3 rolls); shards weapon-specific; 15% of Epic shards are Legendary | W/Ancestral_Forge |
| Onyx Tear: 4 Gold Ingot + 4 Power Core + 4 Ember Glass at the Anvil (recipe from Styx); drops ~5% Lv 79–84 V Bloods, 25% from Gorecrusher/Talzur/Solarus/Adam/Megara; sold by the Treasure Hunter | W/Onyx_Tear |
| Blood Key: 4 Onyx Tear + 4 Primal Blood Essence + 200 Blood Crystal (Artisan Table); item text: entry to Dracula's Castle | W/Blood_Key, 1.1 notes, items.json |
| Fusion Forge: 12 Ember Glass per fusion; jewels (same spell) or Ancestral weapons (across types); result keeps the target's mod count | W/Fusion_Forge |
| Mortium Vampire Merchants sell Rare (South, 750 Stygian) / Epic (North, 1,500 Greater) Ancestral shards; Human Form is only described for Rural/City vendors | W/Vendors |
| Elixir of the Prowler: 20 Sunflower + 20 Fire Blossom + GBE + bottle; Witch Potion also sold by the city Herbs & Potions vendor and Treasure Hunter; Elixir of the Blasphemous: 20 Plague Brier + 20 Hell's Clarion + GBE + bottle (Domina) | W/Elixir_of_the_Prowler, W/Witch_Potion, W/Elixir_of_the_Blasphemous |
| Radium Alloy is smelted at the Furnace (60 Tech Scrap + 4 Sulphur + 1 Sludge-filled Canister → 4); the Fabricator makes Power Cores (8 Radium + 4 Charged Battery → 2). Plague Brier grows in Gloomrot South, Corrupted Flower in Oakveil | W/Radium_Alloy, W/Power_Core, W/Plague_Brier, W/Corrupted_Flower |
| Lord Styx circles a giant Blood Crystal at Dracula's Demise (south of Gloomrot; Map Genie files it under Dunley) | W/Lord_Styx_the_Night_Champion |
| Simon Belmont matches the opponent's Gear Level; patrols Farbane, Dunley and Silverlight roads, ending at the Colosseum | W/Simon_Belmont_the_Vampire_Hunter |
| Cursed Forest fog cured by Ben's Shroud of the Forest; Silverlight needs silver resistance; Azariel needs holy resistance | W/Curse_of_the_Forest, W/Silverlight_Hills |
| Sacred Grapes only at the Brighthaven Vineyards or from seeds | W/Sacred_Grapes |

## Spell School Mastery ("Ascendancy" in the data)

Traits unlock automatically as you spend 3/5/7 points in a school (wiki Abilities page). The engine counts the
points each stage's bosses provide: early (≤ Lv 40) reaches Chaos T1 only; mid (≤ Lv 70) reaches T2 in every
school and Unholy T3; late reaches T3 everywhere except Blood (T2, 6 points).

| School | T1 | T2 | T3 |
|---|---|---|---|
| Blood | +15% Blood Mend | −15% blood drain | Leech heals +3% |
| Chaos | +5% Veil Cooldown Rate | +5% Ultimate Power | Ignite lasts 1s longer, one extra tick |
| Unholy | +15% health regen | +15% feed cooldown | Skeletons +2s |
| Illusion | +5% Spell Cooldown Rate | +6% shapeshift speed | +2 max Phantasm |
| Frost | +8% shield efficiency | +10 all resist | Chill +1s, Freeze +0.25s |
| Storm | +5% attack speed | +5% mount speed | Chain Lightning +20%, +1 bounce |

## Damage formula and caps

- Base Spell Power 10 (also in the game data). Base Spell Crit 5%, base Spell Crit Power 140%.
- A spell's "X% magic damage" = X% of Spell Power.
- Flat Spell Power: GL25 amulets +34, Witch Potion +5, Enchanted Brew +3 (they don't stack with each other).
- Bonus Spell Power % is a percentage of base power (1.1). **Unconfirmed:** whether it multiplies (10 + flat) or only 10. The model uses (10 + flat) × (1 + bonus) (`ASSUME.spFormula`). The other reading lowers absolute numbers by roughly 11% (early) to 19% (endgame) but left the build ranking unchanged in the sensitivity runs.
- Caps on permanent sources: Bonus Spell Power 30%, Spell Cooldown Rate 30%, Spell Crit 45%, Crit Power 180%, Ultimate Power +50%, Spell Leech 20%, Spell Charge Gain 30, Blood Efficiency 50%, Ultimate Cooldown Rate 70%. Temporary buffs can exceed caps.
- Blood Efficiency bonuses "bypass the soft cap" (1.1 notes) and Tier V "increases the maximum cap of blood effects with an equal amount" (W/Blood). Spell School Mastery is the other listed way to raise caps (W/Attributes). The engine lets both bypass caps (`ASSUME.capBypass`).
- **Ultimate Cooldown Rate may be bugged.** Two open player bug reports (bugs.playvrising.com #641124, 2025-05-19, and #647127, 2025-06-08) say it does not shorten the ultimate's cooldown; one measured ~117 s with 62% rate and saw only Mutant's Veil cut grow (7 s → ~14 s). No later patch mentions a fix. The engine defaults to that reported behaviour (`ASSUME.ultCdrMode = 'cutOnly'`): the stat scales Mutant's Veil cut but not the timer. With 100% Mutant + Blasphemous + Embrace Mayhem (61.6%) the model's cut is 7 × 1.2 × 1.616 = 13.6 s, close to the reported ~14 s; this fit is why Blood Efficiency is assumed to boost the fixed 7 s (`ASSUME.effScalesFixed`). The same ~14 s could also be two separate 7 s cuts if the Veil of Chaos recast's attack counts as a second Veil attack (`'twoCuts'`). Only one player measured this.
- Cooldown = base / (1 + rate).
- Spell Charge: each spell adds your Charge Gain; at 100 the next spell has no cooldown.
- Ultimates, counters and minions cannot crit.
- Gear Level vs NPC: about +1% damage per level above, −4% per level below (not modelled; equal levels assumed).

## Gear (fixed values; no random rolls on armor or amulets)

- Warlock Vestment: +7.2% Bonus Spell Power total, 2pc +4% Cooldown Rate. Dark Magus Vestment: +6% Bonus Spell Power total, 2pc +4% Cooldown Rate, 3pc +1 Gear Level, 4pc +3% Spell Leech (wiki set pages).
- Maleficer Scholar / Dracula's Maleficer: +1.5% Bonus Spell Power per piece. Dracula's set: 2pc +6% Cooldown Rate, 3pc +4% Leech, 4pc +15% Spell Crit for 4s after a Veil.
- Amulet of the Arch-Warlock +34 SP, +8% Spell Crit; proc Cold Blood (+15% Bonus Spell Power for 4s, 10% on primary hit, 10s cooldown).
- Master Spellweaver +6% Cooldown Rate. Wicked Prophet +4% Leech.
- Soul Shard of Dracula +34 SP, +16% Blood Efficiency; 15% chance on primary hit to gain Bloodthirst (+15% damage for 6s, 10s cooldown). Durability 2,500, decays while worn; repaired only with Primal Blood Souls in Rift Incursions (server setting can disable decay). Since 1.1 a Soul Shard's ultimate can be swapped for any other.
- Ancestral weapons (only random gear besides jewels): 3 rolls at Epic/Legendary; tier 5 values: Bonus Spell Power 12%, Cooldown Rate 12%, Spell Crit 16%, Crit Power 16%, Leech 8%, Veil Cooldown Rate 14%. The **Fusion Forge** (Dantos) merges two Ancestral weapons, or two jewels for the same spell, keeping the best rolls.
- Jewels: T2 Regular (2 mods; Raziel 57 unlocks the Jewelcrafting Table per both the wiki and his technology rewards in the game data; Regular gems from Terah 53), T3 Greater (3 mods; Mairwyn 70), T4 Primal (4 mods; General Valencia 84). Each mod rolls one of 5 tiers.
- Phantasm (Illusion): each stack gives −1% spell cooldown and +1% Spell Charge gain (wiki Abilities keyword) / "+1 Spell Charge gained" (1.1 notes). The engine applies both: +1% cooldown rate and +1 Charge Gain per stack.
- Elixirs (one at a time): Twisted +8% crit / +8% crit power; Bat +6% Cooldown Rate, +4% leech; Blasphemous +14% Ultimate Cooldown Rate, +10% Ultimate Power; Prowler +7% Veil Cooldown Rate.
- Stygian passives (W/Altar_of_Stygian_Awakening): 5 slots from Elena 53, Cassius 57, Cyril 65, Jakira 75, Simon Belmont 80.
  - Elemental (Stygian Shards): Enhanced Conductivity +7% Bonus SP and spell hits trigger Static; Cold Soul +8% crit power **and** +8% damage vs Chilled/Frozen; Flowing Sorcery and Chaos Kindling +6% CDR (altar table says 7%, individual pages and Attributes say 6%; 6 used), Kindling also Ignite +25%; Renewing Flames +8% spell damage vs Ignited; Spiritual Infusion +8% spell damage vs Weakened; Arcane Animator +12% minion damage; Sanguine Mastery boosts your blood type by 8%; Lightning Fast Strikes Static +20%.
  - Vampire (Greater Stygian Shards, treated as endgame): Wicked Power +8% crit, crits 50% chance to apply a random school effect; Embrace Mayhem +14% Ultimate Cooldown Rate, +10% Ultimate Power; Hunger for Blood +8% damage vs V Bloods; Hunger for Power +20% damage for 6s after 6 consecutive spells.

## Blood (100% quality; Tier V adds +20% Blood Efficiency to every primary effect)

| Blood | T1 | T2 | T3 | T4 |
|---|---|---|---|---|
| Scholar | 12% Spell Power | 12% Cooldown Rate, shield on cast | 20% Ultimate Power, Ultimate resets spell cooldowns | +12 Spell Charge Gain |
| Draculin | 12% Spell Power, +8% Crit Power | 16% Spell Crit | 8% Spell Leech, +3 Charge | Spell crit → +30% Cooldown Rate for 3s |
| Mutant | 14% Spell Power | 28% Ultimate Cooldown Rate | 20% Ultimate Power, 12% minion damage | 7% Veil Cooldown Rate, Veil hit cuts Ultimate cooldown by 7s |

Blood Homogenizer (Lucile 76): add one T1–T3 trait from a second blood, plus its T4 if that blood is ≥ 90%.

## Spell numbers

Cooldown / cast / charges / damage for every spell, plus jewel modifier pools (T5 = top of each range),
are in `calc/engine.js`, one line per spell. Key values:

| Spell | CD | Cast | Damage |
|---|---|---|---|
| Chaos Volley | 8s | 0.6s | 2 × 125% + Ignite |
| Rain of Chaos | 12s | 0.7s | up to 415% over 3.2s + Ignite |
| Shadowbolt | 8s | 1.0s | 200% + Leech |
| Crystal Lance | 8s | 1.0s | 170% + Freeze |
| Unholy Chains | 9s | 0.4s + 1.7s channel | 280% + Condemn |
| Blood Storm (ult) | 120s | 1.5s cast + 3s channel (wiki infobox) | 25 × 100% + 300% |
| Lightning Tendrils | 8s | 0.9s (channel) | 6 × 40% + Static |
| Lightning Typhoon (ult) | 120s | 0.5s cast + 4s spin (wiki infobox) | 800% over 4s |
| Raging Tempest (ult) | 120s | 0.7s cast + 2.5s (wiki infobox, 1.1.13 notes) | 525% split + 4 × 50% |
| Chaos Barrage (ult) | 120s | 1s | 4 × (200% + 100%) |

Status effects: Ignite 50% over 5s (Chaos Kindling +25%); Condemn +15% damage taken for 5s; Freeze on a
Freeze-immune boss deals 30% instead; Curse returns 40% of damage taken over 4s (cap 500%).
