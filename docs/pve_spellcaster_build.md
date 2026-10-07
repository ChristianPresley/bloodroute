# PvE Spellcaster: maximum-damage build (patch 1.1.13)

Every loadout here was chosen by the simulator in `calc/engine.js`. It simulates a single-target V Blood boss fight
using the vrising.gaming.tools game data and the mechanics in `research_sources.md`. This is the sixth version: the
simulator now plays the crossbow too (primary shots, Rain of Bolts, Snapshot), and that changed every build from
Phase 4 on (see "What changed").

**How the search works:**
1. Every feasible pair of damage spells is ranked in up to 6 veil/ultimate setups, with 4 rotation orders. Feasible means the spell points of each school and tier exist by that stage.
2. The best pairs are tried with every veil and ultimate.
3. Gear is tuned for the top 10 loadouts:
   - Early, Phases 4–5 and mid game: every blood/elixir/passive combination is tried.
   - Phase 7 and late game: a search over blood, amulet, elixir, weapon coating, weapon rolls and passives, started from each primary blood plus a random setup.
   - Either way, the best 16 setups are re-scored on separate seeds.
4. Finalists get their best rotation chosen once (from 6 priority orders × "hold the ultimate" on/off), then are scored on fresh seeds.

Crossbow skills and shots fill every gap between abilities in every rotation: Rain of Bolts and Snapshot when they're
ready, otherwise a primary shot if no ability comes back during its 1 s draw.

**How DPS is reported:** each figure is the **equal-weight average of 90 s, 180 s, 300 s and 600 s fights** (32 runs each).
Treat the figures as comparisons between builds, not exact in-game numbers. Late-game figures carry about ±1 DPS of
noise, so gaps under ~2 DPS mean little; early and mid figures are steadier (about ±0.1). Full output, including each
figure's standard error (`se`), is in `calc/optimizer_results.json`.

| Stage | Best loadout (veil · spells · ultimate) | DPS |
|---|---|---|
| Early (bosses ≤ Lv 40) | Starting dash **or** Veil of Blood · Chaos Volley + Bone Explosion · Chaos Barrage | 50.0 / 49.8 |
| Phase 4 (bosses ≤ Lv 50) | Veil of Bones · Chaos Volley + Ball Lightning · Chaos Barrage | 66.2 |
| Phase 5 (bosses ≤ Lv 60) | Veil of Bones · Chaos Volley + Lightning Tendrils · Chaos Barrage | 109.2 |
| Mid (bosses ≤ Lv 70) | Veil of Bones · Chaos Volley + Lightning Tendrils · Chaos Barrage | 150.4 |
| Phase 7 (bosses ≤ Lv 84) | Veil of Frost · Chaos Volley + Lightning Tendrils · Chaos Barrage (Maleficer Scholar, Blood Key) | 310.1 |
| Late, before Dracula | Veil of Frost · Chaos Volley + Lightning Tendrils · Chaos Barrage (Dracula's Maleficer) | 320.8 |
| Endgame | Veil of Frost · Chaos Volley + Lightning Tendrils · Blood Storm (if the in-game test passes; otherwise see the ladder below) | 328.6 |

**The core from Phase 5 on is Chaos Volley + Lightning Tendrils:**
- **Lightning Tendrils** fires 7 bolts that can each crit and keeps the boss Static. Every crossbow hit on a Static boss shocks it for 10% of Spell Power, and Enhanced Conductivity makes every spell hit shock too. Late game, Draculin's "crit → +30% cooldown rate" runs almost constantly.
- **Chaos Volley** is a quick 0.6 s cast whose Ignite keeps Renewing Flames (+8% spell damage) on.
- The **Veil** supplies the Condemn that Unholy Chains used to: **Veil of Bones** (Phases 4–6) Condemns the boss (+15% damage taken for 5 s) on its Veil attack. From Phase 7, Primal jewels make **Veil of Frost** better (two novas, Freeze, and Chill for Cold Soul), and **Unholy Coating** takes over the Condemn.
- **Unholy Chains** (the old core) still hits hardest per cast, and with Veil of Chaos, Tendrils + Chains beats Volley + Tendrils (145.5 vs 140.8 mid game). Once the Veil Condemns, its own Condemn is wasted and its 2.5 s channel isn't worth it: Veil of Bones · Tendrils + Chains scores 137.3.
- The crossbow is 13–21% of the damage from mid game on, and about half in the early game.

---

## Endgame: pick from this ladder

After Dracula you can wear the **Soul Shard of Dracula** with any ultimate (since 1.1 a shard's ultimate can be swapped).
Three builds are within 3 DPS of each other; which one is best depends on mechanics nobody has measured:

| | **A** | **A2** | **B+** |
|---|---|---|---|
| Spells | Chaos Volley + Lightning Tendrils | Chaos Volley + Shadowbolt | Chaos Volley + Lightning Tendrils |
| Ultimate | Blood Storm | Blood Storm | Chaos Barrage |
| Rotation | Volley → Tendrils → Veil | Shadowbolt → Veil → Volley | Veil → Volley → Tendrils |
| DPS (mix) | **328.6** | 325.6 | 327.1 |
| Relies on | Nearly all of Tendrils' and Blood Storm's bolts landing; Static shocks with no cooldown | Blood Storm's bolts landing | Nearly all of Tendrils' bolts landing; Static shocks with no cooldown |

**Shared by all three:**
- Veil of Frost.
- Blood: **Draculin** 100% + Scholar **T2** via the Homogenizer.
- Elixir of the Twisted and Unholy Coating.
- Soul Shard of Dracula and Dracula's Maleficer Regalia (4 pieces).
- Witch Potion.
- Weapon rolls: Crit · Crit Power · Spell Cooldown.
- Stygian passives: Enhanced Conductivity · Wicked Power · Hunger for Blood · Renewing Flames · Cold Soul.

**Scenario table** (the same builds re-scored with one assumption changed):

| Scenario | A | A2 | B+ |
|---|---|---|---|
| Default assumptions | **327.6** | 326.0 | 327.4 |
| Crossbow shots and skills deal no damage (spells only) | **267.3** | 266.7 | 259.7 |
| Half of Rain of Bolts' bolts hit | **321.4** | 317.3 | 317.8 |
| 80% of Tendrils bolts hit | 304.4 | **326.0** | 302.6 |
| Static shocks at most once per second | 303.9 | **319.9** | 303.2 |
| 80% of Tendrils bolts hit **and** Static shocks at most once per second | 284.0 | **319.9** | 281.4 |
| Only 75% of Blood Storm's bolts hit | 324.8 | 318.1 | **327.4** |
| Only 50% of Blood Storm's bolts hit | 319.1 | 312.7 | **327.4** |
| Bloodthirst (shard proc) only boosts physical damage | **320.0** | 317.8 | 317.8 |
| Blood Efficiency also boosts the Homogenizer trait | **346.1** | 330.9 | 339.8 |
| Blood Efficiency doesn't stretch fixed traits (Draculin's 30%) | **316.3** | 310.3 | 316.0 |

The Ultimate Cooldown Rate questions that decided the previous version no longer matter: no build here uses Mutant
blood or the stat. Veil of Chaos instead of Veil of Frost scores 321.6 with A's spells. Eye of the Storm (Soul Shard of
the Monster) ties A only if all 37 of its strikes land (301.6 at the default 30%).

**How to choose:**
1. **Run the in-game test below.** If Static has no cooldown and nearly every Tendrils and Blood Storm bolt lands, use **A**. Its lead is only 0.2–1.6 DPS, inside the noise.
2. Otherwise:
   - Static shocks have a cooldown, or Tendrils' bolts miss (moving bosses) → **A2**. At 80% of Tendrils' bolts it is ~22 DPS ahead.
   - Many Blood Storm bolts missing → **B+**. At 75% of the bolts it is already ahead of A.
   - Unsure → **A2**. It is never more than ~15 DPS behind the best build in any scenario.

**The in-game test** (on a Grayson target dummy):
1. Put Static on the dummy with Lightning Tendrils, then fire Rain of Bolts at it. Five separate shock numbers mean Static has no cooldown; about one shock per second means it does.
2. On a boss that moves, count how many of Tendrils' 7 bolts hit.
3. On the dummy, count how many of Blood Storm's 25 bolts hit.

### Abilities, unlocks and jewels

| Ability | How to unlock | Jewel mods (Primal, 4 mods) |
|---|---|---|
| **Veil of Frost** | Drops from Vincent the Frostbringer (Lv 44) | Veil attack nova 50% + Chill · illusion nova 40% · +24% Veil attack · Veil attack consumes Chill to Freeze (a V Blood takes 30% instead) |
| **Chaos Volley** | Chaos T1 spell point: Errol (20), Lidia (30) or Morian (70) | +20% damage · −12% cooldown · Agonizing Flames · any |
| **Lightning Tendrils** | Storm T2 spell point: Ziva (60), Domina (60) or Voltatia (79) | +1 bolt · +12% bolt damage · +24% cast rate · any |
| **Shadowbolt** | Known from the start | +60% vs Leeched · +24% cast rate · −12% cooldown · explodes 30% + Leech |
| **Veil of Bones** (Phases 4–6) | Drops from Bane the Shadowblade (Lv 50) | Skeleton explodes 80% + Condemn · +50% Veil attack on a boss below 20% · +24% Veil attack · dashing through the boss Condemns |
| **Blood Storm** | Soul Shard of Dracula (Dracula, Lv 91) | — |
| **Chaos Barrage** | Chaos T3 spell point: Quincey (37) or Azariel (79) | — |

**Jewel crafting:**
- Primal jewels: Jewelcrafting Table after General Valencia (Lv 84), 4 Flawless gem + 320 Greater Stygian Shards. Gems: Chaos Volley Amethyst, Tendrils Topaz, Veil of Frost Sapphire, Veil of Bones Emerald.
- Mod tiers are random; the model assumes top-tier (tier 5) rolls.
- The Fusion Forge (Dantos) merges two jewels for the same spell and keeps the best mods.

**Blood and gear notes:**
- The Homogenizer donor potion must be **90%+** to also add the donor's **T4** (+12 Spell Charge Gain for Scholar). The model assumes a 100% donor.
- Draculin carriers: Vampire Cultists, Blood Prophets, Night Maidens. Scholar carriers: Nuns, Priests, Villagers.
- Dracula's Maleficer pieces: boots from Solarus, gloves from Talzur, chest from Adam, legs from Megara. Each upgrades a Maleficer Scholar piece.
- Stygian passive slots come from Elena (53), Cassius (57), Cyril (65), Jakira (75) and Simon Belmont (80). Wicked Power and Hunger for Blood are Vampire Awakenings (Greater Stygian Shards).
- **Weapon coating:** Unholy Coating (Stavros, Lv 75; 16 Corrupted Flower + 16 Venom Sap) lasts 60 minutes. Every 12 s your next shot adds 40% magic damage, a 50% bone spirit and Condemn. That's about 14 DPS in build A, mostly from the Condemn.
- **Spell School Mastery:** by the late game you have tier 3 in every school except Blood. The traits that matter: Chaos (Veil cooldown +5%, Ultimate Power +5%, Ignite +1 tick), Illusion (+5% cooldown rate) and Storm T1 (+5% attack speed).

### Build A stats

| Stat | Value | Cap | Sources |
|---|---|---|---|
| Spell Power | 63.4 | — | (10 base + 34 shard + 5 potion) × 1.29 |
| Bonus Spell Power | 29.3% | 30% + Efficiency share | 6 armor + 7 Enhanced Conductivity + 12 Draculin T1 = 25, plus 4.3 from Blood Efficiency on Draculin's 12% (bypasses the cap) |
| Spell Cooldown Rate | 35% permanent | 30% + mastery | 12 Scholar T2 + 6 armor set + 12 weapon = 30 (cap) + 5 Illusion mastery; **+40.8% for 3 s after every spell crit** (Draculin T4 × 1.36 Efficiency) |
| Spell Crit Chance | 50.8% | 45% + Efficiency share | 5 base + 16 Draculin T2 + 8 Wicked Power + 8 Twisted + 16 weapon, capped at 45, + 5.8 Efficiency share; +15% for 4 s after each Veil |
| Spell Crit Power | 182.9% | 180% | 140 + 8 Draculin T1 + 8 Cold Soul + 8 Twisted + 16 weapon, capped, + 2.9 Efficiency share |
| Spell Charge Gain | 16.1 | 30 | Scholar T4 12 (via the 90%+ donor) + Draculin T3 3 × 1.36 |
| Physical Power | 43.7 | — | 10 base + 33.7 Ancestral Crossbow; physical crit 5% / 140% |
| Attack speed | +5% | 40% | Storm mastery T1 (+7% per Mark stack for 10 s, up to 3) |
| Blood Efficiency | 36% | 50% | 20 (100% blood) + 16 shard |

### Rotation
1. **Your two spells and the Veil** in the build's priority order (table above). Build A: Chaos Volley → Lightning Tendrils → Veil of Frost.
2. **The Veil attack:** right after the Veil, a crossbow shot (Freeze, nova, Chill; with the coating ready, its Condemn too).
3. **Ultimate when both spells are on cooldown.**
4. **Fill every gap with the crossbow:** Rain of Bolts and Snapshot whenever they're ready (they Mark the boss: your next shot deals +25% and gives +7% attack speed), otherwise a primary shot. Skip the shot if a spell comes back during its 1 s draw.

### Where the damage comes from (A, 600 s fight)

| Source | DPS |
|---|---|
| Chaos Volley | 103.3 |
| Lightning Tendrils | 97.5 |
| Static shock | 28.5 |
| Crossbow primary | 24.4 |
| Blood Storm (5 casts) | 19.0 |
| Veil of Frost (novas) | 15.7 |
| Rain of Bolts | 12.9 |
| Ignite | 8.2 |
| Agonizing Flames | 5.8 |
| Unholy Coating | 5.4 |
| Snapshot | 4.8 |
| Freeze on a V Blood | 1.3 |
| **Total** | **326.8** |

---

## Late game, before you kill Dracula (setup B, 320.8 DPS)

The 320.8 assumes Dracula's Maleficer armor, whose pieces come from Talzur, Solarus, Adam and Megara (86–88) before
you fight Dracula. With Maleficer Scholar armor (Phase 7, Lv 76–84) the same loadout scores **310.1**, and about 294
with the Amulet of the Arch-Warlock before Lord Styx's Blood Key.

| Slot | Choice |
|---|---|
| Spells | Veil of Frost · Chaos Volley + Lightning Tendrils · Chaos Barrage |
| Blood (100%) | **Draculin** + Scholar **T2** via Homogenizer |
| Magic source | **Blood Key** (+34 Spell Power, +4 more from its equip buff) |
| Elixir and coating | Elixir of the Twisted · Unholy Coating |
| Weapon rolls | Crit · Crit Power · Spell Cooldown |
| Passives | Enhanced Conductivity · Wicked Power · Hunger for Blood · Cold Soul · Renewing Flames |
| Rotation | Volley → Tendrils → Veil; ultimate as soon as it's ready |

**Stats:**
- Spell Power: 53 flat × 1.27.
- Cooldown Rate: 35%, plus Draculin's +36% after crits.
- Crit: 48.2%; Crit Power: 181.6%.

**Damage (600 s):**

| Source | DPS |
|---|---|
| Chaos Volley | 105.1 |
| Lightning Tendrils | 96.9 |
| Static shock | 29.2 |
| Crossbow primary | 24.4 |
| Veil of Frost | 16.3 |
| Rain of Bolts | 13.2 |
| Chaos Barrage | 9.3 |
| Ignite | 8.6 |
| Agonizing Flames | 5.9 |
| Unholy Coating | 5.7 |
| Snapshot | 4.9 |

**Alternatives:**

| Loadout | DPS |
|---|---|
| Volatile Arachnid / Spectral Guardian / Wisp Dance as ultimate | 318.8 / 318.6 / 318.0 |
| Draculin + Scholar **T1** blood, Elixir of the Bat | 318.2 |
| Veil of Chaos · Shadowbolt + Tendrils | 312.8 |

## Mid game (bosses up to Lv 70)

| Slot | Choice | Unlock |
|---|---|---|
| Veil | Veil of Bones (Veil of Blood until then) | Bane (50) / Beatrice (40) |
| Spell 1 | Chaos Volley | Chaos T1 point: Errol (20) |
| Spell 2 | Lightning Tendrils (from Lv 60; Ball Lightning until then) | Storm T2 point: Ziva/Domina (60) / Storm T1 point: Grethel (50) or Sir Erwin (46) |
| Ultimate | Chaos Barrage | Chaos T3 point: Quincey (37) |

**Gear and setup:**
- **Armor:** Dark Magus Vestment (+6% Bonus Spell Power; crafted from Hollowfang).
- **Amulet:** Blood Merlot Amulet (Baron, Lv 70); before that, Pendant of the Sorcerer.
- **Weapon:** Dark Silver Crossbow (Physical Power 24.3).
- **Potion and blood:** Enchanted Brew; Scholar 100% (Corrupted Fish).
- **Elixir:** **Elixir of the Bat** (Cassius, Lv 57).
- **Passives:** Enhanced Conductivity, Renewing Flames, Lightning Fast Strikes (+7% attack speed, Static shocks +20%). Slots come from Elena 53, Cassius 57 and Cyril 65.
- **Jewels:** Greater jewels, 3 mods (Mairwyn, Lv 70). Regular 2-mod jewels come earlier: Raziel (57) unlocks the Jewelcrafting Table.
  - Chaos Volley: +20% damage, −12% cooldown, Agonizing Flames.
  - Tendrils: +1 bolt, +12% bolt damage, +24% cast rate.
  - Veil of Bones: skeleton explosion (80% + Condemn), +50% on a boss below 20%, +24% Veil attack.
- **Spell School Mastery:** by Lv 70 the bosses give tier 2 in every school and tier 3 in Unholy. Chaos T1–T2, Illusion T1 and Storm T1 add damage.

**Rotation:** Volley → Tendrils → Veil; ultimate when both spells are down; crossbow in between.

**DPS** (every blood/elixir/passive combination was tried for each loadout):

| Loadout | DPS |
|---|---|
| Veil of Bones · Volley + Tendrils · Chaos Barrage (recommended) | **150.4** |
| Curse instead of Volley (Prowler, Spiritual Infusion) | 149.1 |
| Wisp Dance / Volatile Arachnid / Spectral Guardian as ultimate | 146.8 / 146.6 / 146.4 |
| Veil of Chaos · Tendrils + Unholy Chains (the previous core) | 145.5 |
| Veil of Chaos · Volley + Tendrils | 140.8 |
| Veil of Bones · Tendrils + Unholy Chains | 137.3 |

All mid numbers use Lv 70 gear and mastery. The route's checkpoints on the way:
- **Phase 5 (Lv 60, 109.2):** the same spells with Pendant of the Sorcerer, Merciless Iron Crossbow, Regular jewels, two passives (Enhanced Conductivity, Renewing Flames), the Prowler elixir and a 90% Scholar prisoner. The old Veil of Chaos · Tendrils + Chains setup scores 107.1 here.
- **Phase 4 (Lv 50, 66.2):** Veil of Bones · Chaos Volley + **Ball Lightning** · Chaos Barrage with the Scourgestone Pendant, Iron Crossbow, no jewels or passives and no elixir (the Prowler scores 65.8 here).

## Early game (bosses up to Lv 40)

| Slot | Choice | Unlock |
|---|---|---|
| Veil | Veil of Blood or the starting dash (the same score) | Beatrice the Tailor (40); your starting dash until then (assumed; no source names it) |
| Spell 1 | Chaos Volley | Chaos T1 point: Errol (20) |
| Spell 2 | **Bone Explosion** | Unholy T1 point: Goreswine (27) |
| Ultimate | Chaos Barrage | Chaos T3 point: Quincey (37) |

For a step-by-step route with map links, see `progression_schedule.md`.

**About half the early damage is the crossbow:** an Iron Crossbow shot hits for ~24 every 1.55 s, and Rain of Bolts plus
Snapshot add 275% every 8 s.

**Spell 2 choice:**
- Bone Explosion scores 50.0. Corrupted Skull and Rain of Chaos score 47.8, Spectral Wolf 47.3, Shadowbolt 46.9.
- Bone Explosion's early source is Goreswine (Unholy T1, confirmed by his wiki infobox; an older guide listing him as Illusion was wrong). The other Unholy T1 sources are Leandra (47) and Gaius (55).
- The early numbers assume the Ring of the Sorcerer. It's a Research Desk recipe, and its Greater Blood Essence can be crafted from Unsullied Hearts (4, per the wiki) at the Blood Press from the start. With only the Gravedigger Ring, early DPS is about 47.1.
- Early blood is assumed to be ~60% Scholar from feeding (no Prison Cell before Vincent, Lv 44): Tiers I–III at 80% strength, no Tier IV or V.

**Gear and setup:**
- **Gear:** Warlock Vestment (+7.2% Bonus Spell Power), Ring of the Sorcerer, Iron Crossbow, Enchanted Brew, Scholar blood.
- **Mastery:** Chaos T1 (+5% Veil cooldown) is reached by Lv 40.

**Rotation:** Bone Explosion → Veil → Volley; crossbow skills and shots in between.

## Crafting path

| Stage | Armor | Amulet |
|---|---|---|
| Early | Nightstalker → **Warlock** | Bone Ring → Gravedigger Ring → **Ring of the Sorcerer** |
| Mid | Hollowfang → **Dark Magus** | Scourgestone Pendant → **Pendant of the Sorcerer** → **Blood Merlot Amulet** |
| Late | Dawnthorn → **Maleficer Scholar** → **Dracula's Maleficer** | **Amulet of the Arch-Warlock** → **Blood Key** → **Soul Shard of Dracula** |

**Weapons:** Crossbow up the Copper → Iron → Dark Silver → Sanguine ladder, then an Ancestral Crossbow with the spell
rolls above. Fuse two at the Fusion Forge to combine the best rolls. The model plays the crossbow; Pistols aren't scored.

**Soul Shard upkeep** (item text): the shard has 2,500 durability, loses it over time, and can only be repaired by
feeding on Primal Blood Souls during Rift Incursions. With the PvP "Unique Soul Shards" setting, only one of each shard
exists and an unrepaired one is destroyed.

---

## What changed in this version
- **The crossbow is modelled** (until now, primary attacks dealt no damage and took 0.6 s):
  - Primary shots: 100% physical, a 1 s draw and 0.55 s reload (W/Crossbow), with Physical Power from the crossbow tier you'd wear at each stage.
  - Rain of Bolts and Snapshot every 8 s, their Marks (+25% on the next shot, +7% attack speed), and physical crit.
  - Static: physical hits on a Static boss shock it (W/Abilities).
  - Every Veil's Veil-attack effects and jewel mods. Before, only Veil of Chaos had jewels.
- **New gear and items:**
  - Weapon coatings (Stavros, Lv 75).
  - The Blood Key as a magic source (34 Spell Power, +4 from its equip buff).
  - Maleficer Scholar armor.
  - The Ancestral weapon's Attack Speed and Bonus Physical Power rolls. The search never picked them.
- **Blood quality:** ~60% Scholar early (no Prison Cell yet), 90% in Phases 4–5, 100% from Phase 6.
- **New checkpoints:** Phase 4 (Lv 50), Phase 5 (Lv 60) and Phase 7 (Lv 84) are now scored with their own gear.
- **Corrections:**
  - Sanguine Coil's and Veil of Blood's "drain" is healing, not damage.
  - Frost Bat's impact blast only hits other enemies.
  - Arctic Storm cannot crit.
- **What moved:**
  - Early: 33.4 → 50.0. Same spells, and the crossbow is half the damage.
  - **Phases 4–6 switch to Veil of Bones** and Chaos Volley next to Ball Lightning, then Lightning Tendrils: mid 119.5 → 150.4. The old Veil of Chaos · Tendrils + Chains build scores 145.5 under the new model.
  - **Phase 7 onward switches to Veil of Frost · Chaos Volley + Lightning Tendrils** with Draculin + Scholar blood, the Blood Key (until the shard) and Unholy Coating:
    - Setup B: 257.8 → 320.8.
    - Endgame: 276.2 → 328.6.
  - Under the new model the old build A (Mutant, Tendrils + Chains, Blood Storm) scores 301.0, or 310.6 with the coating, and the old setup B 280.0.
- **Rejected after checking:** two review findings were already right in the engine. Curse's 4 s base duration is the 1.1.13 value, and Chaos Kindling / Flowing Sorcery are 6% (the altar table's 7% is stale).

### Version 5
- Simulator timing fixes: cooldown timers left a hair above zero, effects ending mid-step, a Curse counting other curses' payouts, and the final re-rank treating one setup in a different passive order as a different setup.

### Version 4
- **Gear tuning rebuilt:** blood × amulet tried together (including the Dracula shard with another ultimate), starts from each primary blood plus a random setup, exhaustive early/mid search, best 16 setups re-scored on separate seeds, each loadout scored with its own best rotation.
- **Search changes:** spell-first rotations are tried during the search, the spell-pair shortlist is wider, and each finalist's rotation is chosen once on separate seeds before scoring.

## Limits of the model
- **Unconfirmed mechanics:** the endgame scenario table covers the crossbow, Rain of Bolts, Tendrils' bolts, Static's cooldown, Blood Storm's bolts, Bloodthirst and Blood Efficiency on the Homogenizer trait.
- **Hard caps:** if caps can't be bypassed, A drops to 311.0.
- **Spell Power formula:** if Bonus Spell Power multiplies only the base 10, numbers drop about 16% late (A 275.9). The ranking is unchanged.
- **Fight-length weighting:** results average 90/180/300/600 s fights equally.
- **Assumed with no source:**
  - 60% of Rain meteors and 30% of Eye of the Storm strikes hit; all 5 Rain of Bolts bolts hit.
  - Agonizing Flames refreshes rather than stacks.
  - Blood Efficiency doesn't boost Homogenizer traits.
  - The Wicked Power effect pool is Ignite / Leech / Chill / Weaken / Static / Condemn.
  - Your starting dash before Beatrice is a Veil of Shadow (+25% on its Veil attack).
  - Blood quality per stage (above), and that Veil illusions explode next to the boss.
- **Not modelled:**
  - Gear Level differences (about +1% damage per level above the boss, −4% below).
  - Minions: Veil of Bones' Skeleton Warrior, Spectral Guardian's and Volatile Arachnid's minion scaling.
  - Ancestral weapon infusions; amulet procs other than Cold Blood and Bloodthirst.
  - Boss downtime or immunity phases.
  - Hunger for Power builds never attack while building the chain.
- **Jewel rolls:** per-tier values aren't published, so every jewel assumes tier-5 rolls.

To rerun:
- **Command line:** `node calc/run.js <early|p4|p5|mid|p7|late-pre|late> <dir>/out_<stage>.json` for each stage (late-game runs take about 20 minutes), then `node calc/curate.js <dir>` to rebuild `calc/optimizer_results.json`, its mid-game comparisons and the scenario tables. `node calc/sens.js` alone re-scores the curated results.
- **Browser:** serve `calc/` over http (for example `npx http-server calc`) and open `index.html`, so it runs in the background.
