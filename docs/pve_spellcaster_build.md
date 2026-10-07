# PvE Spellcaster: maximum-damage build (patch 1.1.13)

Every loadout here was chosen by the simulator in `calc/engine.js`. It simulates a single-target V Blood boss fight
using the vrising.gaming.tools game data and the mechanics in `research_sources.md`. This is the fifth version; it
fixes timing bugs in the simulator that a code review found (see "What changed").

**How the search works:**
1. Every feasible pair of damage spells is ranked in up to 6 veil/ultimate setups, with 4 rotation orders. Feasible means the spell points of each school and tier exist by that stage.
2. The best pairs are tried with every veil and ultimate.
3. Gear is tuned for the top 10 loadouts:
   - Mid and early game: every blood/elixir/passive combination is tried.
   - Late game: a search over blood, amulet, elixir, weapon rolls and passives, started from each primary blood plus a random setup.
   - Either way, the best 16 setups are re-scored on separate seeds.
4. Finalists get their best rotation chosen once (from 6 priority orders × "hold the ultimate" on/off), then are scored on fresh seeds.

**How DPS is reported:** each figure is the **equal-weight average of 90 s, 180 s, 300 s and 600 s fights** (32 runs each).
Treat the figures as comparisons between builds, not exact in-game numbers. Late-game figures carry about ±1 DPS of
noise, so gaps under ~2 DPS mean little; early and mid figures are steadier (about ±0.1). Full output, including each
figure's standard error (`se`), is in `calc/optimizer_results.json`.

| Stage | Best loadout (veil · spells · ultimate) | DPS |
|---|---|---|
| Early (bosses ≤ Lv 40) | Veil of Blood · Chaos Volley + Bone Explosion **or** Shadowbolt · Chaos Barrage | 33.4 / 32.7 |
| Mid (bosses ≤ Lv 70) | Veil of Chaos · Lightning Tendrils + Unholy Chains · Chaos Barrage | 119.5 |
| Late, before Dracula | Veil of Chaos · Lightning Tendrils + Unholy Chains · Chaos Barrage | 257.8 |
| Endgame | Veil of Chaos · Lightning Tendrils + Unholy Chains · Blood Storm (if the in-game test passes; otherwise see the ladder below) | 276.2 |

**The core from mid game on is Lightning Tendrils + Unholy Chains:**
- **Unholy Chains** is the biggest single hit (448% with its jewel), and its Condemn makes the boss take +15% from everything.
- **Lightning Tendrils** fires 7 bolts that can each crit. That keeps Draculin's "crit → +30% cooldown rate" running almost constantly, and its Static lets Enhanced Conductivity add a shock to every spell hit.

---

## Endgame: pick from this ladder

After Dracula you can wear the **Soul Shard of Dracula** with any ultimate (since 1.1 a shard's ultimate can be swapped).
Four builds are close; which one is best depends on mechanics nobody has confirmed:

| | **A** | **A2** | **A3** | **B+** |
|---|---|---|---|---|
| Spells | Lightning Tendrils + Unholy Chains | Shadowbolt (or Chaos Volley, 267.3) + Lightning Tendrils | Chaos Volley + Shadowbolt | Lightning Tendrils + Unholy Chains |
| Ultimate | Blood Storm | Blood Storm | Blood Storm | Chaos Barrage |
| Blood (100%) | **Mutant** + Draculin T2 | Draculin + Scholar T2 | Draculin + Scholar T2 | Draculin + Scholar T2 |
| Elixir | Blasphemous | Twisted | Twisted | Twisted |
| Weapon rolls | Crit · Crit Power · **Veil Cooldown** | Crit · Crit Power · Cooldown | Crit · Crit Power · Cooldown | Crit · Crit Power · Cooldown |
| DPS (mix) | **276.2** | 270.0 | 268.3 | 265.0 |
| Relies on | Mutant's Veil cut being ~14.5 s, ≥ ~90% of bolts landing, Tendrils + Chains landing | Tendrils landing, bolts landing | Bolts landing only | Tendrils + Chains landing |

**Shared by all four:**
- Veil of Chaos.
- Soul Shard of Dracula.
- Dracula's Maleficer Regalia (4 pieces).
- Witch Potion.
- Stygian passives: Enhanced Conductivity · Wicked Power · Hunger for Blood · Renewing Flames · Cold Soul.

**Scenario table** (the same builds re-scored with one assumption changed):

| Scenario | A | A2 | A3 | B+ |
|---|---|---|---|---|
| Default assumptions | **276.3** | 269.5 | 267.9 | 265.4 |
| Ultimate Cooldown Rate works as the tooltip says | **285.4** | 269.5 | 267.9 | 265.4 |
| Ultimate Cooldown Rate does nothing at all | 252.8 | **269.5** | 267.9 | 265.4 |
| The ~14 s is two 7 s cuts (Veil of Chaos recast's attack counts too) | **280.8** | 260.3 | 259.0 | 250.4 |
| Blood Efficiency doesn't stretch fixed traits (Mutant's 7 s, Draculin's 30%) | 245.9 | 255.7 | 246.6 | **256.2** |
| Only 75% of Blood Storm's bolts hit | 249.1 | 263.6 | 262.1 | **265.4** |
| Only 50% of Blood Storm's bolts hit | 231.7 | 258.1 | 256.8 | **265.4** |
| 80% of Tendrils bolts hit **and** Static shocks at most once per second | 250.2 | 231.0 | **266.3** | 230.7 |
| 25% of Unholy Chains channels fail (moving or teleporting boss) | 254.1 | **269.5** | 267.9 | 229.5 |
| Bloodthirst (shard proc) only boosts physical damage | **269.3** | 259.3 | 258.2 | 258.5 |

**How to choose:**
1. **Run the in-game test below.** If Mutant's Veil cut is ~14 s or more per Veil attack (or two cuts) **and at least ~90%** of Blood Storm's bolts land, use **A**.
2. Otherwise A2, A3 and B+ are within ~5 DPS of each other. Pick by your bosses:
   - Bosses that teleport or move a lot, so the Chains tether breaks → **A2**. If Tendrils' bolts also miss often → **A3**, which has no channel and no multi-bolt spell.
   - Many Blood Storm bolts missing → **B+**.
   - Unsure → **A2**. It never falls far behind except when Tendrils misses.

**The in-game test** (wear A's gear: Mutant 100%, Blasphemous, the shard):
1. Cast Blood Storm, then **don't Veil**, and time the cooldown. About 120 s means the stat doesn't speed the timer; about 79 s means it does.
2. Cast it again, Veil once and land the follow-up attack. Watch how far the cooldown jumps: ~14.5 s (the default assumption), ~9.5 s, or two separate jumps if you recast and attack again.
3. On a lone training dummy or boss, count how many of the 25 bolts hit.

### Abilities, unlocks and jewels

| Ability | How to unlock | Jewel mods (Primal, 4 mods) |
|---|---|---|
| **Veil of Chaos** | Drops from Jade the Vampire Hunter (Lv 57) | Illusion explosion +24% · second illusion on recast (80%) · Agonizing Flames on the Veil attack · any |
| **Lightning Tendrils** | Storm T2 spell point: Ziva (60), Domina (60) or Voltatia (79) | +1 bolt · +12% bolt damage · +24% cast rate · any |
| **Unholy Chains** | Unholy T2 spell point: Kriig (47), Cassius (57) or Foulrot (63) | +0.4s channel & +60% damage · projectile nova 50% · then defensive (heal, damage taken −24%) |
| **Chaos Volley** | Chaos T1 spell point: Errol (20), Lidia (30) or Morian (70) | +20% damage · −12% cooldown · Agonizing Flames · any |
| **Shadowbolt** | Known from the start | +60% vs Leeched · +24% cast rate · −12% cooldown · explodes 30% + Leech |
| **Blood Storm** | Soul Shard of Dracula (Dracula, Lv 91) | — |
| **Chaos Barrage** | Chaos T3 spell point: Quincey (37) or Azariel (79) | — |

**Jewel crafting:**
- Primal jewels: Jewelcrafting Table after General Valencia (Lv 84), 4 Flawless gem + 320 Greater Stygian Shards.
- Mod tiers are random; the model assumes top-tier (tier 5) rolls.
- The Fusion Forge (Dantos) merges two jewels for the same spell and keeps the best mods.

**Blood and gear notes:**
- The Homogenizer donor potion must be **90%+** to also add the donor's **T4**. The model assumes a 100% donor.
- Mutant carriers: Mutated Wolf/Deer/Bear/Moose, Mutant Spitter, Rat Horror, Abomination.
- Draculin carriers: Vampire Cultists, Blood Prophets, Night Maidens.
- Scholar carriers: Nuns, Priests, Villagers.
- Dracula's Maleficer pieces: boots from Solarus, gloves from Talzur, chest from Adam, legs from Megara. Each upgrades a Maleficer Scholar piece.
- Stygian passive slots come from Elena (53), Cassius (57), Cyril (65), Jakira (75) and Simon Belmont (80). Wicked Power and Hunger for Blood are Vampire Awakenings (Greater Stygian Shards).
- **Spell School Mastery:** spend at least 7 points in Chaos (Veil cooldown +5%, Ultimate Power +5%, Ignite +1 tick) and 3 in Illusion (+5% cooldown rate). Late game has enough points for tier 3 in every school except Blood.

### Build A stats

| Stat | Value | Cap | Sources |
|---|---|---|---|
| Spell Power | 64.7 | — | (10 base + 34 shard + 5 potion) × 1.32 |
| Bonus Spell Power | 32% | 30% + Efficiency share | 6 armor + 7 Enhanced Conductivity + 14 Mutant T1 = 27, plus 5% from Blood Efficiency on Mutant's 14% (bypasses the cap) |
| Spell Cooldown Rate | 11% permanent | 30% | 6 armor set + 5 Illusion mastery; **+30% for 3 s after every spell crit** (Draculin T4, up almost all the time) |
| Spell Crit Chance | 45% | 45% | 5 base + 16 Draculin T2 + 8 Wicked Power + 16 weapon; 60% for 4 s after each Veil |
| Spell Crit Power | 164% | 180% | 140 + 8 Cold Soul + 16 weapon |
| Ultimate Power | +42% | +50% | Mutant T3 20 (+7 Efficiency) + Chaos mastery 5 + Blasphemous 10 |
| Ultimate Cooldown Rate | +52% | 70% | Mutant T2 28 (+10 Efficiency) + Blasphemous 14; under the default assumption it only enlarges the Veil cut |
| Veil Cooldown Rate | +28.5% | 35% | weapon 14 + Mutant T4 7 (+2.5 Efficiency) + Chaos mastery 5 |
| Blood Efficiency | 36% | 50% | 20 (100% blood) + 16 shard |

### Rotation
1. **Veil of Chaos** on cooldown → **primary attack right away** (this is the "Veil attack": it triggers Mutant's ultimate cut and Agonizing Flames) → **recast** the Veil for the second illusion.
2. **Your two spells** in the order shown below.
   - With Unholy Chains you can only move while channelling, so stay within 14 m.
   - Don't start Chains if your Veil comes back within ~2 s, because the channel blocks Veiling for 2.5 s.
3. **Ultimate when both spells are on cooldown**, but don't hold it more than a second or two. In A, a Veil cut that lands while Blood Storm is already ready is wasted.
4. Primary attack when nothing is ready.

Best priority orders found:

| Build | Order |
|---|---|
| A | Veil → Tendrils → Chains |
| A2 | Shadowbolt → Tendrils → Veil |
| B+ | Tendrils → Veil → Chains |

### Where the damage comes from (A, 600 s fight)

| Source | DPS |
|---|---|
| Blood Storm (16 casts, one per ~37 s) | 87.2 |
| Unholy Chains | 72.2 |
| Lightning Tendrils | 61.8 |
| Veil of Chaos | 22.2 |
| Static shock | 16.6 |
| Ignite | 8.3 |
| Agonizing Flames | 4.0 |
| **Total** | **272.2** |

---

## Late game, before you kill Dracula (setup B, 257.8 DPS)

The 257.8 assumes Dracula's Maleficer armor, whose pieces come from Talzur, Solarus, Adam and Megara (86–88) before
you fight Dracula. With Maleficer Scholar armor (Lv 76–84) the same loadout scores about **249**.

| Slot | Choice |
|---|---|
| Spells | Veil of Chaos · Lightning Tendrils + Unholy Chains · Chaos Barrage |
| Blood (100%) | **Draculin** + Scholar **T2** via Homogenizer |
| Magic source | Amulet of the Arch-Warlock |
| Elixir | Elixir of the Twisted |
| Weapon rolls | **Bonus Spell Power** · Spell Cooldown · Crit Power |
| Passives | Enhanced Conductivity · Wicked Power · Hunger for Blood · Cold Soul · Renewing Flames |
| Rotation | Tendrils → Chains → Veil; ultimate when both spells are down |

**Stats:**
- Bonus Spell Power: 32.4%.
- Cooldown Rate: 35%.
- Crit: 48.2%. The Blood Efficiency share of Draculin's crit goes over the 45% cap.
- Crit Power: 181.6%.

**Damage (600 s):**

| Source | DPS |
|---|---|
| Chains | 113.4 |
| Tendrils | 89.1 |
| Static | 17.5 |
| Veil | 16.9 |
| Chaos Barrage | 9.3 |
| Ignite | 7.4 |
| Agonizing Flames | 2.8 |

**Alternatives:**

| Loadout | DPS |
|---|---|
| Scholar + Draculin T1 blood; rolls Cooldown · Crit · Crit Power; Veil → Tendrils → Chains | 255.5 |
| Volatile Arachnid as ultimate | 253.2 |
| Spectral Guardian as ultimate | 251.5 |
| Shadowbolt + Tendrils | 249.0 |

## Mid game (bosses up to Lv 70)

| Slot | Choice | Unlock |
|---|---|---|
| Veil | Veil of Chaos (Veil of Blood until Jade, Lv 57) | Jade (57) / Beatrice (40) |
| Spell 1 | Lightning Tendrils (from Lv 60; Chaos Volley until then) | Storm T2 point: Ziva/Domina (60) / Chaos T1 point: Errol (20) |
| Spell 2 | Unholy Chains | Unholy T2 point: Kriig (47) |
| Ultimate | Chaos Barrage | Chaos T3 point: Quincey (37) |

**Gear and setup:**
- **Armor:** Dark Magus Vestment (+6% Bonus Spell Power; crafted from Hollowfang).
- **Amulet:** Blood Merlot Amulet (Baron, Lv 70); before that, Pendant of the Sorcerer.
- **Potion and blood:** Enchanted Brew; Scholar 100%.
- **Elixir:** **Elixir of the Prowler** (Meredith, Lv 50).
- **Passives:** Enhanced Conductivity, Chaos Kindling, Renewing Flames. Slots come from Elena 53, Cassius 57 and Cyril 65.
- **Jewels:** Greater jewels, 3 mods (Mairwyn, Lv 70). Regular 2-mod jewels come earlier: Raziel (57) unlocks the Jewelcrafting Table.
  - Tendrils: +1 bolt, +12% bolt damage, +24% cast rate.
  - Chains: +60% damage, nova, then defensive.
  - Veil of Chaos: explosion +24%, second illusion, Agonizing Flames.
- **Spell School Mastery:** by Lv 70 the bosses give tier 2 in every school and tier 3 in Unholy. Chaos T1–T2 and Illusion T1 add damage.

**Rotation:** Tendrils → Veil → Chains; ultimate when both spells are down.

**DPS** (every blood/elixir/passive combination was tried for each loadout):

| Loadout | DPS |
|---|---|
| Tendrils + Chains + Chaos Barrage, Prowler (recommended) | **119.5** |
| Same with Elixir of the Bat | 116.6 |
| Chaos Volley + Chains + Chaos Barrage, Prowler | 115.1 |
| Tendrils + Chains with Spectral Guardian / Volatile Arachnid / Wisp Dance | 114.5 / 113.6 / 113.3 |
| Curse + Chains + Chaos Barrage (Mutant, Blasphemous, Spiritual Infusion) | 111.1 |

All mid numbers use Lv 70 gear and mastery, so expect less before then.

## Early game (bosses up to Lv 40)

| Slot | Choice | Unlock |
|---|---|---|
| Veil | Veil of Blood | Beatrice the Tailor (40); your starting dash until then (assumed; no source names it) |
| Spell 1 | Chaos Volley | Chaos T1 point: Errol (20) |
| Spell 2 | **Bone Explosion** or **Shadowbolt** | Unholy T1 point: Goreswine (27) / known from the start |
| Ultimate | Chaos Barrage | Chaos T3 point: Quincey (37) |

For a step-by-step route with map links, see `progression_schedule.md`.

**Spell 2 choice:**
- Bone Explosion scores 33.4 and Shadowbolt 32.7. The gap is real but comes mostly from short fights: at 90 s it's 35.3 vs 33.5, at 600 s 31.6 vs 31.4.
- Bone Explosion's early source is Goreswine (Unholy T1, confirmed by his wiki infobox; an older guide listing him as Illusion was wrong). The other Unholy T1 sources are Leandra (47) and Gaius (55).
- The early numbers assume the Ring of the Sorcerer. It's a Research Desk recipe, and its Greater Blood Essence can be crafted from Unsullied Hearts (4, per the wiki) at the Blood Press from the start. Most V Bloods from Grayson on drop a heart, so it's reachable early in Phase 3 of the progression schedule. With only the Gravedigger Ring, early DPS is about 29.
- Shadowbolt is the safe pick. Rain of Chaos (Clive, Lv 30) scores 32.5.

**Gear and setup:**
- **Gear:** Warlock Vestment (+7.2% Bonus Spell Power), Ring of the Sorcerer, Enchanted Brew, Scholar blood.
- **Mastery:** Chaos T1 (+5% Veil cooldown) is reached by Lv 40.

**Rotation:** Volley → spell 2 → Veil.

## Crafting path

| Stage | Armor | Amulet |
|---|---|---|
| Early | Nightstalker → **Warlock** | Bone Ring → Gravedigger Ring → **Ring of the Sorcerer** |
| Mid | Hollowfang → **Dark Magus** | Scourgestone Pendant → **Pendant of the Sorcerer** → **Blood Merlot Amulet** |
| Late | Dawnthorn → **Maleficer Scholar** → **Dracula's Maleficer** | **Amulet of the Arch-Warlock** → **Soul Shard of Dracula** |

**Weapons:** Crossbow or Pistols up the Copper → Iron → Dark Silver → Sanguine ladder, then an Ancestral weapon with
the spell rolls above. Fuse two at the Fusion Forge to combine the best rolls.

**Soul Shard upkeep** (item text): the shard has 2,500 durability, loses it over time, and can only be repaired by
feeding on Primal Blood Souls during Rift Incursions. With the PvP "Unique Soul Shards" setting, only one of each shard
exists and an unrepaired one is destroyed.

---

## What changed in this version
- **Simulator fixes** (no game assumptions changed):
  - A spell whose cooldown timer was left a hair above zero by rounding waited an extra 0.05 s step. It cost some builds casts depending on their cooldown rate, by up to ±2% and unevenly between builds.
  - Draculin's +30% cooldown rate, Ignite and Agonizing Flames now end exactly when they run out instead of at the end of a step, and nothing counts after the fight ends. One Ignite was 50.5% of Spell Power; it's now 50%.
  - A Curse no longer counts other curses' payouts.
  - Results no longer depend on the simulation step: 0.05 s and 0.005 s steps agree within ~0.1%.
  - The search's final re-rank no longer treats one setup in a different passive order as a different setup.
- **What moved:**
  - Every stage winner is the same: early 33.4, mid 119.5, setup B 257.8, endgame A 276.2.
  - **A2 is now Shadowbolt + Tendrils** (270.0). Chaos Volley + Tendrils (267.3) is 2.7 ± 0.8 behind it. A3 rose from 265.1 to 268.3 and B+ is 265.0, so A2, A3 and B+ are within ~5 DPS.
  - Setup B's runner-up is now Scholar + Draculin T1 blood (255.5). Chaos Volley + Tendrils dropped out of the late-pre top 10.
  - Mid: Chaos Volley + Chains is third (115.1). Curse + Chains fell from 112.5 to 111.1 with the Curse fix.
  - Early: the top three are unchanged (33.4 / 32.7 / 32.5). Spectral Wolf fell from 5th to 10th.

### Version 4
- **Gear tuning rebuilt:** blood × amulet tried together (including the Dracula shard with another ultimate), starts from each primary blood plus a random setup, exhaustive early/mid search, best 16 setups re-scored on separate seeds, each loadout scored with its own best rotation.
- **New endgame options this uncovered:** B+ (Chaos Barrage while keeping the shard) and A2/A3 (Draculin-based Blood Storm builds), which don't depend on the disputed Ultimate Cooldown Rate.
- **Setup B** gained ~3 DPS with Draculin + Scholar T2, and **mid** ~2 DPS with the Prowler elixir.
- **Search changes:** spell-first rotations are tried during the search, the spell-pair shortlist is wider, and each finalist's rotation is chosen once on separate seeds before scoring.

## Limits of the model
- **Unconfirmed mechanics:** the endgame scenario table covers Mutant's cut, Blood Storm bolts, Tendrils bolts, Static's cooldown, Chains completion and Bloodthirst.
- **Hard caps:** if caps can't be bypassed, A drops to 272.1 and B to 242.2.
- **Spell Power formula:** if Bonus Spell Power multiplies only the base 10, numbers drop about 11% early, 16% mid and 19–20% late (A 223.0, B 205.7). The ranking is unchanged.
- **Fight-length weighting:** results average 90/180/300/600 s fights equally. Short fights favour builds that open with a big ultimate; Bone Explosion's early edge is entirely from short fights.
- **Assumed with no source:**
  - 60% of Rain meteors hit a moving boss.
  - A primary attack takes 0.6 s.
  - Agonizing Flames refreshes rather than stacks.
  - Blood Efficiency doesn't boost Homogenizer traits.
  - The Wicked Power effect pool is Ignite / Leech / Chill / Weaken / Static / Condemn.
  - Your starting dash before Beatrice.
- **Not modelled:** weapon damage, Gear Level differences (about +1% damage per level above the boss, −4% below), minions and skeletons, boss downtime or immunity phases.
- **Jewel rolls:** per-tier values aren't published, so every jewel assumes tier-5 rolls.

To rerun:
- **Command line:** `node calc/run.js <early|mid|late-pre|late>` (writes `calc/out_<stage>.json`), then `node calc/sens.js calc/out_late.json calc/out_late-pre.json` for the scenario tables. With no arguments `sens.js` re-scores the curated results. A late-game run takes about 10 minutes.
- **Browser:** serve `calc/` over http (for example `npx http-server calc`) and open `index.html`, so it runs in the background.
