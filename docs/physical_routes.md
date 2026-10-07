# Research sources for the Warrior, Rogue and Brute routes

Gathered 2026-10-06 for game patch **1.1.13**. The routes live in `site/routes/{warrior,rogue,brute}/route.js`, with V Blood
locations, materials and reference views shared in `site/routes/shared.js`. Recipes come from the scraped item data
(`data/items.json`, vrising.gaming.tools data version 1790852702230). Wiki facts were read through the Fandom MediaWiki API;
W/Page = https://vrising.fandom.com/wiki/Page, with the revision date used.

These routes are **not scored by the damage simulator** (`calc/` scores only the Spellcaster build: its spells, crossbow,
coating and Blood Key). Weapon and gear choices follow the numbers below; the open questions at the end are what a
player should test.

## The three builds

| | Warrior | Rogue | Brute |
|---|---|---|---|
| Weapon | Sword → Reaper (Kriig 47) | Axes → Pistols (Jade 57) | Spear → Twinblades (Gaius 55) |
| Armor line | Grim Ranger → Blood Hunter → Dread Plate → Dracula's Dread | Shadewalker → Duskwatcher → Shadowmoon → Dracula's Shadow | Marauder → Crimson Templar → Grim Knight → Dracula's Grim |
| Jewelry | Ring/Pendant of the Warrior → Crimson Commander (Ruby, Weapon Skill Power) | same as Warrior | Ring/Pendant of the Duskwatcher → Blademaster (Topaz, Attack Speed) |
| Spells | Veil of Blood, Shadowbolt, Blood Rage | Veil of Chaos, Chaos Volley, Power Surge | Veil of Storm, Blood Rage, Discharge |
| Ultimate | Chaos Barrage → Blood Storm | Chaos Barrage → Blood Storm | Chaos Barrage → Heart Strike → Blood Storm |
| Elixir | Prowler → Crow → Werewolf | Prowler → Raven | Beast → Werewolf |
| Blood | Warrior + Rogue I/IV | Rogue + Warrior I/IV | Brute + Rogue I/IV |
| Passives | Sanguine Mastery, Ravenous Strikes, Overpower, Hunger for Blood, Blood Spray | Rampage, Lethal Strikes, Hunger for Blood, Lightning Fast Strikes, Ravenous Strikes | Hunger for Blood, Rampage, Lethal Strikes, Sanguine Mastery, Blood Spray |
| Ancestral rolls | Crit Chance · Physical Power · Crit Power | Weapon Skill Power · Crit Power · Physical Power | Physical Power · Crit Power · Attack Speed |

Why: the Warrior's damage is weapon skills (Weapon Skill Power, Weapon Cooldown Rate, Veil attacks), so it takes the
weapon with the strongest skills. The Rogue stacks physical crit and fires burst skills right after each Veil, while
Dracula's Shadow (+12% for 4 s) and Rogue blood Tier III (+100%, for an untested time) add crit. The Brute's damage and
healing come from primary attacks, so it takes the fastest primary combo; its spells' heals scale with Spell Power, which
it barely has, so it stays up on Primary Attack Leech and the Veil heal.

## Stat caps at the endgame

The wiki gives each cap with the stat's base (W/Attributes): Weapon Skill Power has a 100% base and a 145% cap, so only
45 points of bonus fit; Physical Crit Power has a 140% base and a 180% cap. Blood Efficiency (Tier V, Sanguine Mastery,
the Soul Shard's +16%) raises a blood bonus and its cap by the same amount (W/Blood, W/Attributes), so the sums below use
the blood's base values. The Soul Shard of Dracula takes the single magic-source slot, so the endgame loses the GL 25
amulet's stat. Sums use the full-quality blood values from W/Blood and the Homogenizer's Tier I from the second blood.

| Build | Stat | Sources (no roll) | Room for a roll |
|---|---|---|---|
| Warrior | Weapon Skill Power | Warrior III 18 + Dracula's Dread 2-pc 9 + Werewolf 9 + Ravenous Strikes 8 = 44 of 45 | none (in Phase 7 the Crimson Commander's +9 puts it over) |
| Warrior | Weapon Cooldown Rate | Warrior II 14 + Dracula's Dread 3-pc 7 + Overpower 7 = 28 of 35 | ~7 of a 14 roll |
| Warrior | Physical Crit Chance | base 5 + Rogue I ~16 + Blood Spray 8 = ~29 of 45 | a full 16 roll |
| Warrior | Bonus Physical Power | Warrior I 10 + Dracula's Dread ~4.8 = ~15 of 25 | a full 10 roll |
| Rogue | Physical Crit Chance | base 5 + Rogue I ~16 + Dracula's Shadow 8 + Raven 8 + Rampage 8 = 45 of 45 | none |
| Rogue | Weapon Skill Power | Ravenous Strikes 8 of 45 | a full 18 roll |
| Rogue | Veil Cooldown Rate | Rogue III 14 + Chaos mastery 5 + Dracula's Shadow 3-pc 7 = 26 of 35 | ~9 of a 14 roll |
| Brute | Attack Speed | Brute I 14 + Dracula's Grim 7.2 + Werewolf 7 + Storm mastery T1 5 = ~33 of 40 | ~7 of a 14 roll (in Phase 7 the Blademaster's +7 fills it) |
| Brute | Physical Crit Chance | base 5 + Rogue I ~16 + Rampage 8 + Blood Spray 8 = ~37 of 45 | ~8 of a 16 roll |

The Rogue drops Sanguine Mastery for Ravenous Strikes in Phase 7: its damage half needs Leech on the target and nothing in
the Rogue kit applies Leech, while Ravenous Strikes' Weapon Skill Power has plenty of room on that build.

## Stockpile costs that aren't recipes

- **Stygian passives.** Discover unlocks a random passive you don't have yet, out of 12 elemental (400 Stygian Shards) or
  12 vampire (600 Greater). Landing k specific ones takes k·13/(k+1) Discovers on average: 3 elemental ≈ 3,900 Stygian,
  3 vampire ≈ 5,850 Greater, 4 vampire (Rogue) ≈ 6,240 Greater. The stockpile counts these averages, plus 1,500 Greater for
  an Epic Ancestral shard from the Northern Mortium merchant.
- **Power Cores** (Fabricator, Voltatia): 2 from 8 Radium Alloy + 4 Charged Battery. Phase 7's 48 cores (amulet, Castle
  Heart 5, 8 Onyx Tears) take 192 Radium Alloy and 96 Charged Batteries, so the stockpile lists those instead.
- **Unsullied Hearts** stand in for the Phase 3 ring's Greater Blood Essence: before Tristan it only comes from 4 hearts.
- **Alternative endgame weapons** (Warrior W2 sword, Rogue R3 axes, Brute B3 spear) need their own Merciless Iron →
  Dark Silver → Sanguine → Epic Ancestral line. The Endgame tabs list the cost; the stockpile doesn't, since you only
  build one after the in-game test says it wins.

## Weapon numbers (W/Sword, W/Axes, W/Mace, W/Spear, W/Greatsword, W/Reaper, W/Claws, W/Twinblade, W/Pistols, W/Whip; 2025-05 to 2026-05)

| Weapon | Unlock | Primary combo/s | Skills (damage / cooldown) | Skills/s |
|---|---|---|---|---|
| Sword | Start | 64.7% | Whirlwind 175%/8s, Shockwave 100% + 3 × 20% recast /8s | 41.9% |
| Axes | Start | 68.7% | Frenzy 100%/8s (+50% attack speed 1.5 s), X-Strike 2 × 80%/8s | 32.5% |
| Mace | Start | 68.1% | Crushing Blow 150%/8s, Smack 70%/8s | 27.5% |
| Spear | Start | 75.6% | A Thousand Spears 140% + 50% recast /9s, Harpoon 110%/8s | 34.9% |
| Greatsword | Tristan 44 | 73.3% | Great Cleaver 125%/8s, Death from Above 125%/10s | 28.1% |
| Reaper | Kriig 47 | 73.8% | Tendon Swing 130%/8s, Howling Reaper 50% + 180%/8s | 45.0% |
| Twinblade | Gaius 55 | 83.3% | Javelin 125% + 80% recall /8s, Sweeping Strike 100%/8s | 38.1% |
| Pistols | Jade 57 | 76.7% | Fan the Hammer 10 × 25%/8s, Explosive Bullet 25% + 115%/10s | 45.3% |

Skills/s assumes one target, every hit landing and each skill on cooldown. Bone weapons have only the primary; Copper adds
the first skill and Iron the second (tier column on each weapon page).

## Facts used

| Fact | Source |
|---|---|
| Research Desk: T4 sets, Rings, Merciless Copper Sword/Axes/Mace/Spear/Crossbow/Longbow, Brew of Ferocity; Clive guarantees a weapon blueprint, Grayson an armour one | W/Research_Desk (2026-09-27) |
| Study: T6 sets, Pendants, every Merciless Iron weapon; Meredith and Jade guarantee a weapon blueprint, Raziel magic, Bane/Octavian/Angram armour | W/Study (2026-09-21) |
| Athenaeum: T8 sets, GL 25 amulets, Sanguine weapons (not the whip), Potion of Rage, Witch Potion | W/Athenaeum (2026-09-21) |
| Brew of Ferocity +3 Physical Power (32 Hell's Clarion + Fish Bone + Empty Waterskin); Potion of Rage +5 (60 Plague Brier + 60 Hell's Clarion + Fish Bone + bottle); they don't stack | W/Brew_of_Ferocity (2025-05-15), W/Potion_of_Rage (2026-07-25) |
| Warrior, Rogue and Brute blood tiers; tiers at 1/30/60/90/100% | W/Blood (2026-08-08) |
| Blood carriers by region and level | W/Enemies (2026-09-19) |
| Weapon unlocks; Rare Ancestral (Merciless Iron weapon + shard + 8 Radium + 1 GBE, 2 rolls, upgradable to GL 24/27); Epic Ancestral (3 rolls); physical roll pool and ranges; infused second skill | W/Weapons (2026-09-01) |
| Stygian passives: Blood Spray, Lightning Fast Strikes, Sanguine Mastery, Rampage, Lethal Strikes, Ravenous Strikes, Overpower, Hunger for Blood | W/Altar_of_Stygian_Awakening (2026-04-08) |
| Caps: Bonus Physical Power 25%, Attack Speed 40%, Physical Crit 45%, Crit Power 180% (base 140%), Weapon Skill Power 145% (base 100%), Weapon Cooldown Rate 35%, Veil Cooldown Rate 35%, Primary and Weapon Skill Leech 25%; Blood Efficiency raises a blood bonus and its cap equally | W/Attributes (2026-09-01), W/Blood |
| Storm mastery T1 is +5% Primary Attack Speed; Chaos mastery T1 +5% Veil Cooldown Rate | `data/ascendancy_passives.json` |
| Heart Strike heals 150% and Blood Rage 65% of Spell Power; Heart Strike's nova and Blood Rage inflict Leech; Discharge stuns for 0.6 s | `data/abilities.json` |
| Every amulet, pendant, ring and Soul Shard uses the one magic-source slot; the Soul Shard of Dracula adds +16% Blood Efficiency | `data/items.json`, research_sources.md |
| Gear Level is the sum of worn item levels: a T4 set is 17, Hollowfang 20 | W/Gear_Level |
| Harpy Dasher (Rogue) and Harpy Scratcher (Warrior), Lv 66, Silverlight Hills | `data/bloodtypes.json`, W/Enemies |
| Unsullied Hearts: guaranteed from Grayson to Gaius except the 25% bosses (Nibbles included), 80% from most Lv 53+ V Bloods, none from some | `data/raw_full.json` drop tables |
| Nibbles is summoned at a Vermin Nest with a Putrid Rat (4 Grave Dust + 1 Unsullied Heart) | W/Nibbles_the_Putrid_Rat, W/Vermin_Nest |
| Research costs: Research Desk 60 Paper (weapon, magic) / 50 (armour, consumables); Study 90 / 75 Scrolls; Athenaeum 120 / 100 Schematics; random within a category. Paper, Scrolls and Schematics drop from humans; the Paper Press (Nicholaus) crafts all three | W/Research_Desk, W/Study, W/Athenaeum, W/Paper_Press, W/Scroll, W/Schematic |
| Altar of Stygian Awakening: 1 Regular Ruby + 12 Iron Ingot + 4 Greater Blood Essence | W/Altar_of_Stygian_Awakening |
| Radium Alloy is smelted at the Furnace (60 Tech Scrap + 4 Sulphur + 1 Sludge-filled Canister → 4); Power Core = 8 Radium + 4 Charged Battery → 2 at the Fabricator; batteries charge at Lightning Harvesters | W/Radium_Alloy, W/Power_Core, W/Depleted_Battery |
| Silver Resistance Potion: 40 Plague Brier + Empty Glass Bottle | `data/items.json` |
| Blood Coating: next primary every 12 s inflicts Leech and Vampiric Curse | W/Blood_Coating |
| Jewelry: Warrior line +9% Weapon Skill Power, Duskwatcher line and Blademaster +7% Attack Speed; amulet procs | W/Ring_of_the_Warrior, W/Ring_of_the_Duskwatcher, W/Pendant_of_the_Duskwatcher, W/Amulet_of_the_Crimson_Commander, W/Amulet_of_the_Blademaster |
| Set bonuses and set totals (Dread Plate 4.8% Bonus Physical Power, Shadowmoon 8% Physical Crit, Grim Knight 7.2% Attack Speed) | `data/build_reference.md` (game data), W/Dread_Plate_Chestguard, W/Shadowmoon_Chestguard, W/Grim_Knight_Chestguard |
| Elixirs: Raven (Elena), Crow (Jade), Beast (Frostmaw), Werewolf (Willfred) | `data/items.json`, W/Elixir_of_the_Raven, W/Elixir_of_the_Crow, W/Elixir_of_the_Beast, W/Elixir_of_the_Werewolf |
| Jewel modifiers for Blood Rage, Power Surge, Shadowbolt, Discharge and the Veils; gem per school (Blood Ruby, Chaos Amethyst, Storm Topaz) | W/Template:Jewel_Table (2026-06-13), `data/items.json` |
| Plants: Bleeding Heart (Ruins of Mortium), Ghost Shroom (Cursed Forest), Hell's Clarion (underground), Plague Brier (Gloomrot South, Iron+ weapon), Corrupted Flower and Venom Sap (Oakveil) | W/Bleeding_Heart, W/Ghost_Shroom, W/Hell's_Clarion, W/Plague_Brier, W/Corrupted_Flower, W/Venom_Sap |

Spell points, Veil drops, V Blood locations, Castle Heart costs and Stygian slots are the same as the spellcaster route
(`research_sources.md`, `progression_schedule.md`).

## Open questions (the Endgame tabs ask players to test these)

- **Veil of Chaos recast.** Whether its second dash counts as a new Veil: a second Veil attack for Warrior blood (+40%) and
  Dracula's Dread (+30%), and a second crit window for Rogue blood Tier III. The same question is open for the spellcaster.
- **Rogue blood Tier III.** "100% increased Physical Critical Chance after using a Veil": how long it lasts (older guides
  say only the next physical hit, the Veil attack), and whether it adds 100 points (every hit crits) or doubles the current
  chance. If it's a one-hit bonus, the Rogue's crit window is Dracula's Shadow's +12% for 4 s alone.
- **Caps.** Whether Blood Efficiency really raises each cap by the same amount (the wiki says so), and how much Spell School
  Mastery raises the Attack Speed, Physical Crit and cooldown caps. The cap table above assumes the wiki's rule.
- **Twinblade and Reaper skills on moving bosses.** Howling Reaper spins in place and Javelin needs the recall to pass
  through the boss; the skills/s figures above assume every hit lands.
