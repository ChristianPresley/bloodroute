// V Rising PvE spellcaster damage model and build optimizer (patch 1.1.13).
// Single-target boss fight simulation: spells, Veils and ultimates, plus the crossbow's shots and skills.
// Numbers come from research_sources.md or the vrising.gaming.tools data in this repo; anything with no
// published source lives in ASSUME.
(function (global) {
  'use strict';

  // ---------- Assumptions and unresolved mechanics ----------
  const ASSUME = {
    weaponDamage: true,      // crossbow shots and skills deal physical damage (false = spells only, as before v6)
    rainBoltsFrac: 1.0,      // share of Rain of Bolts' 5 bolts that hit one boss
    bloodKeyBuff: true,      // the Blood Key's equip buff adds +4 Spell Power (in the game data; the wiki lists only +34)
    rainHitFrac: 0.6,        // chance each Rain of Chaos meteor hits one moving boss
    eyeHitFrac: 0.3,         // chance each Eye of the Storm strike hits one boss
    bloodStormBoltFrac: 1.0, // share of Blood Storm's 25 homing bolts that hit a lone boss
    chainsCompleteFrac: 1.0, // share of Unholy Chains channels that complete (boss can break the 14m tether)
    tendrilsBoltFrac: 1.0,   // chance each Lightning Tendrils bolt hits (a jewel mod rewards "6 bolts in a row", so misses happen)
    staticIcd: 0,            // internal cooldown (s) on Static shocks; none documented
    // Ultimate Cooldown Rate: 'cutOnly' = per bug report #647127 it doesn't speed the timer but enlarges Mutant's veil cut;
    // 'works' = speeds the timer as described (cut is 7 real seconds); 'none' = the stat does nothing;
    // 'twoCuts' = the stat does nothing, but the Veil of Chaos recast's attack counts as a second Veil attack.
    ultCdrMode: 'cutOnly',
    effScalesFixed: true,    // Blood Efficiency also boosts fixed-number traits (Mutant's 7s cut, Draculin's 30%); fits #647127 best
    capBypass: true,         // Blood Efficiency and Spell School Mastery bonuses bypass stat caps (1.1 notes, wiki Attributes)
    effOnSecondary: false,   // Blood Efficiency does not boost the Homogenizer's secondary trait (unknown)
    bloodthirstSpells: true, // Dracula shard's Bloodthirst "+15% damage output" applies to spells (may be physical only)
    hungerPowerBreak: 'primary', // what breaks Hunger for Power's 6-spell chain: 'primary' (any weapon attack) or 'none'
    spFormula: 'total',      // 'total': (10 + flat) x (1 + bonus%); 'base': 10 x (1 + bonus%) + flat (unconfirmed which)
    afDuration: 2.5,       // Agonizing Flames: 5 ticks, assumed 0.5s apart, refreshes rather than stacks
    lowHpFrac: 0.3,          // last 30% of the fight counts as "target below 30% HP"
    dt: 0.05,                // simulation step (s)
  };

  // Caps on permanent sources; temporary buffs may exceed them.
  const CAP = { bSP: 30, cdr: 30, crit: 45, critPower: 180, ultPower: 50, charge: 30, eff: 50, ultCDR: 70, veilCDR: 35,
    bPP: 25, pCrit: 45, pCritPower: 180, aSpd: 40 };

  // ---------- Crossbow (the caster's weapon) ----------
  // Primary (W/Crossbow): one bolt, 100% physical; 1 s draw, then 0.55 s before the next shot; attack speed shortens both.
  // A primary that hits a Marked target deals +25% and gives +7% attack speed for 10 s (3 stacks).
  // Physical Power per tier (items.json, added to base 10). Physical crit: 5% base, 140% power (W/Attributes).
  const CROSSBOW = {
    shotCast: 1.0, shotCd: 0.55, markBonus: 25, markSpeed: 7, markStacks: 3, markDur: 10,
    pp: { Iron: 13.84, 'Merciless Iron': 17.3, 'Dark Silver': 24.33, Sanguine: 29.34, Ancestral: 33.7 },
  };
  // Weapon skills (W/Crossbow): Rain of Bolts (Copper tier on) and Snapshot (Iron tier on); both Mark the target.
  // Snapshot's bolt splits toward other enemies, so a lone boss takes the first 75% only.
  const WEAPON_SKILLS = [
    { kind: 'weapon', name: 'Rain of Bolts', cd: 8, cast: 0.4, fx: c => { for (let i = 0; i < 5; i++) if (c.chance(ASSUME.rainBoltsFrac)) c.phys(40); c.mark(); } },
    { kind: 'weapon', name: 'Snapshot', cd: 8, cast: 0.3, fx: c => { c.phys(75); c.mark(); } },
  ];
  const PHYSICAL = ['Primary attack', ...WEAPON_SKILLS.map(w => w.name)];   // damage sources that scale with Physical Power

  // ---------- Spell points: boss levels that grant a point, per school and tier ----------
  const POINTS = {
    Blood: { 1: [20], 2: [57, 70, 76], 3: [44, 64] },
    Chaos: { 1: [20, 30, 70], 2: [30, 61, 75], 3: [37, 79] },
    Frost: { 1: [20, 32, 66], 2: [53, 63, 82], 3: [53, 76] },
    Illusion: { 1: [27, 35, 47], 2: [44, 75, 76], 3: [53, 84] },
    Storm: { 1: [46, 50, 70], 2: [60, 60, 79], 3: [58, 74] },
    Unholy: { 1: [27, 47, 55], 2: [47, 57, 63], 3: [35, 63] },
  };
  function pointsAt(level) {
    const out = {};
    for (const [school, tiers] of Object.entries(POINTS)) {
      out[school] = {};
      for (const [t, lv] of Object.entries(tiers)) out[school][t] = lv.filter(x => x <= level).length;
    }
    return out;
  }

  // ---------- Blood types: max values at 100% quality, before Blood Efficiency ----------
  const BLOOD = {
    Scholar: {
      1: { bSP: 12, label: 'T1 +12% Spell Power' },
      2: { cdr: 12, label: 'T2 +12% Spell Cooldown Rate' },
      3: { ultPower: 20, flags: ['ultReset'], label: 'T3 +20% Ultimate Power, Ultimate resets spells' },
      4: { charge: 12, label: 'T4 +12 Spell Charge Gain' },
    },
    Draculin: {
      1: { bSP: 12, critPower: 8, label: 'T1 +12% Spell Power, +8% Crit Power' },
      2: { crit: 16, label: 'T2 +16% Spell Crit Chance' },
      3: { leech: 8, charge: 3, label: 'T3 +8% Spell Leech, +3 Spell Charge Gain' },
      4: { dracCDR: 30, label: 'T4 spell crits give +30% Spell Cooldown Rate for 3s' },
    },
    Mutant: {
      1: { bSP: 14, label: 'T1 +14% Spell Power' },
      2: { ultCDR: 28, label: 'T2 +28% Ultimate Cooldown Rate' },
      3: { ultPower: 20, minion: 12, label: 'T3 +20% Ultimate Power, +12% Minion Damage' },
      4: { veilCDR: 7, veilUltCut: 7, label: 'T4 +7% Veil Cooldown Rate, Veil attack cuts Ultimate cooldown by 7s' },
    },
  };

  const AMULET = {
    'Gravedigger Ring': { flatSP: 9.7 },
    'Ring of the Sorcerer': { flatSP: 12.8 },
    'Scourgestone Pendant': { flatSP: 16.5 },
    'Pendant of the Sorcerer': { flatSP: 20.9 },
    'Blood Merlot Amulet': { flatSP: 27.9 },
    'Amulet of the Arch-Warlock': { flatSP: 34, crit: 8, flags: ['coldBlood'] },
    'Amulet of the Master Spellweaver': { flatSP: 34, cdr: 6 },
    'Amulet of the Wicked Prophet': { flatSP: 34, leech: 4 },
    'Blood Key': { flatSP: 34, equipSP: 4 },   // Lord Styx (84); equipSP under ASSUME.bloodKeyBuff
    'Soul Shard of Dracula': { flatSP: 34, eff: 16, flags: ['bloodthirst'], ult: 'Blood Storm' },
    'Soul Shard of the Winged Horror': { flatSP: 34, ult: 'Voidquake Vortex' },
    'Soul Shard of the Monster': { flatSP: 34, ult: 'Eye of the Storm' },
    'Soul Shard of the Serpent': { flatSP: 34, ult: "Serpent's Kiss" },
    'Soul Shard of Solarus': { flatSP: 34 },
  };

  const ELIXIR = {
    none: { boss: 0 },
    'Elixir of the Prowler': { veilCDR: 7, boss: 50 },
    'Elixir of the Bat': { cdr: 6, leech: 4, boss: 57 },
    'Elixir of the Blasphemous': { ultCDR: 14, ultPower: 10, boss: 60 },
    'Elixir of the Twisted': { crit: 8, critPower: 8, boss: 75 },
  };

  // Stygian Altar passives. Elemental ones cost Stygian Shards; Vampire ones (vampire: true)
  // cost Greater Stygian Shards and are treated as endgame.
  const PASSIVE = {
    'Enhanced Conductivity': { bSP: 7, flags: ['conductivity'] },
    'Cold Soul': { critPower: 8, flags: ['coldSoul'] },
    'Flowing Sorcery': { cdr: 6 },
    'Chaos Kindling': { cdr: 6, flags: ['kindling'] },
    'Renewing Flames': { flags: ['renewing'] },
    'Spiritual Infusion': { flags: ['spiritual'] },
    'Arcane Animator': { minion: 12 },
    'Lightning Fast Strikes': { aSpd: 7, flags: ['lfs'] },
    'Sanguine Mastery': { eff: 8 },
    'Wicked Power': { crit: 8, flags: ['wicked'], vampire: true },
    'Embrace Mayhem': { ultCDR: 14, ultPower: 10, vampire: true },
    'Hunger for Blood': { flags: ['hungerBlood'], vampire: true },
    'Hunger for Power': { leech: 4, flags: ['hungerPower'], vampire: true },
  };

  const ARMOR = {
    'Warlock Vestment': { bSP: 7.2, cdr: 4 },
    'Dark Magus Vestment': { bSP: 6, cdr: 4, leech: 3 },
    'Maleficer Scholar Vestment': { bSP: 6, cdr: 5, leech: 4 },
    "Dracula's Maleficer Regalia": { bSP: 6, cdr: 6, leech: 4, flags: ['veilCrit'] },
  };

  // Spell School Mastery traits (unlocked at 3/5/7 points spent in a school).
  const MASTERY = {
    Chaos: [{ veilCDR: 5 }, { ultPower: 5 }, { flags: ['chaosMastery'] }],
    Illusion: [{ cdr: 5 }, {}, { flags: ['illusionMastery'] }],
    Frost: [{}, {}, { flags: ['frostMastery'] }],
    Storm: [{ aSpd: 5 }, {}, {}],
    Blood: [{}, {}, {}], Unholy: [{}, {}, {}],
  };

  // Weapon coatings (Stavros, Lv 75): the next primary every 12 s carries the effect. Their damage is magic
  // (it scales with Spell Power) and can't crit. Chain Lightning, novas and orbs that only reach other enemies are left out.
  const COATING = {
    none: { boss: 0, fx: () => {} },
    'Blood Coating': { boss: 75, fx: c => { c.apply('leech'); c.flat(50, 'Blood Coating'); } },           // Vampiric Curse 50% after 2 s
    'Chaos Coating': { boss: 75, fx: c => { c.flat(40, 'Chaos Coating'); c.ignite(); } },
    'Frost Coating': { boss: 75, fx: c => { c.flat(30, 'Frost Coating'); c.apply('chill'); } },
    'Illusion Coating': { boss: 75, fx: c => { c.flat(30, 'Illusion Coating'); c.apply('weaken'); c.phantasm(4); } },
    'Storm Coating': { boss: 75, fx: c => { c.flat(40, 'Storm Coating'); } },
    'Unholy Coating': { boss: 75, fx: c => { c.flat(40, 'Unholy Coating'); c.apply('condemn'); c.flat(50, 'Unholy Coating'); } },   // + bone spirit
  };

  // Blood quality (W/Blood): tiers I–IV unlock at 1/30/60/90%; I–III scale as max x (0.5 + 0.5 x quality), IV is fixed;
  // Tier V (+20% Blood Efficiency) needs 100%.
  const TIER_MIN = { 1: 0.01, 2: 0.3, 3: 0.6, 4: 0.9 };

  // Ancestral weapon rolls, tier 5 (W/Ancestral_Forge): the spell stats plus the two physical ones that help a caster's
  // crossbow most (physical crit and weapon-skill rolls are worth less here and are left out of the search).
  const WEAPON_ROLL = { bSP: 12, cdr: 12, crit: 16, critPower: 16, leech: 8, veilCDR: 14, aSpd: 14, bPP: 10 };

  // ---------- Stages ----------
  // weapon: crossbow tier worn. bloodQuality: early game has no Prison Cell (Vincent, 44), so ~60% Scholar blood
  // from feeding (tiers I–III, no IV or V). Phases 4–5 keep a high-quality (90%) prisoner; Corrupted Fish lift it to
  // 100% from Phase 6. p4 and p5 are the route's checkpoints between the early and mid game.
  const STAGES = {
    early: {
      label: 'Early game (bosses up to Lv 40)', level: 40, weapon: 'Iron', bloodQuality: 0.6,
      amulets: ['Ring of the Sorcerer'], primaries: ['Scholar'], homogenizer: false,
      passiveSlots: 0, vampirePassives: false, jewelMods: 0, armor: 'Warlock Vestment', weaponRolls: 0, potion: 3,
    },
    p4: {
      label: 'Phase 4 (bosses up to Lv 50)', level: 50, weapon: 'Iron', bloodQuality: 0.9,
      amulets: ['Scourgestone Pendant'], primaries: ['Scholar'], homogenizer: false,
      passiveSlots: 0, vampirePassives: false, jewelMods: 0, armor: 'Warlock Vestment', weaponRolls: 0, potion: 3,
    },
    p5: {
      label: 'Phase 5 (bosses up to Lv 60)', level: 60, weapon: 'Merciless Iron', bloodQuality: 0.9,
      amulets: ['Pendant of the Sorcerer'], primaries: ['Scholar', 'Mutant'], homogenizer: false,
      passiveSlots: 2, vampirePassives: false, jewelMods: 2, armor: 'Dark Magus Vestment', weaponRolls: 0, potion: 3,
    },
    mid: {
      label: 'Mid game (bosses up to Lv 70)', level: 70, weapon: 'Dark Silver', bloodQuality: 1,
      amulets: ['Blood Merlot Amulet'], primaries: ['Scholar', 'Mutant'], homogenizer: false,
      passiveSlots: 3, vampirePassives: false, jewelMods: 3, armor: 'Dark Magus Vestment', weaponRolls: 0, potion: 3,
    },
    p7: {
      label: 'Phase 7 (bosses up to Lv 84: Maleficer Scholar, no Dracula\'s court shards)', level: 84, weapon: 'Ancestral', bloodQuality: 1,
      amulets: ['Amulet of the Arch-Warlock', 'Amulet of the Master Spellweaver', 'Amulet of the Wicked Prophet', 'Blood Key'],
      primaries: ['Scholar', 'Draculin', 'Mutant'], homogenizer: true,
      passiveSlots: 5, vampirePassives: true, jewelMods: 4, armor: 'Maleficer Scholar Vestment', weaponRolls: 3, potion: 5,
    },
    late: {
      label: 'Late game (all content)', level: 91, weapon: 'Ancestral', bloodQuality: 1,
      amulets: ['Amulet of the Arch-Warlock', 'Amulet of the Master Spellweaver', 'Amulet of the Wicked Prophet', 'Blood Key',
        'Soul Shard of Dracula', 'Soul Shard of the Winged Horror', 'Soul Shard of the Monster', 'Soul Shard of the Serpent'],
      primaries: ['Scholar', 'Draculin', 'Mutant'], homogenizer: true,
      passiveSlots: 5, vampirePassives: true, jewelMods: 4, armor: "Dracula's Maleficer Regalia", weaponRolls: 3, potion: 5,
    },
  };
  // Amulets that can be worn by a stage before Dracula (no Dracula shard).
  const PRE_DRACULA = STAGES.late.amulets.filter(a => a !== 'Soul Shard of Dracula');

  // ---------- Abilities ----------
  // pt: [school, tier] spell point needed (start: true = known from the start).
  // boss: level of the boss that drops it (veils, shard ultimates).
  // fx(c) runs when the ability resolves; c.m(i) is true when jewel mod i is socketed.
  const ABILITIES = [];
  const sp = (name, school, pt, o, fx) => ABILITIES.push({ kind: 'spell', name, school, pt, charges: 1, mods: [], ...o, fx });
  const veil = (name, school, boss, o, fx, onPrimary) => ABILITIES.push({ kind: 'veil', name, school, boss, cd: 8, mods: [], ...o, fx, onPrimary });
  const ult = (name, school, pt, o, fx) => ABILITIES.push({ kind: 'ult', name, school, pt, cd: 120, mods: [], ...o, fx });

  // Chaos
  sp('Chaos Volley', 'Chaos', ['Chaos', 1], { cd: 8, cast: 0.6, mods: ['+20% damage', '-12% cooldown', 'Agonizing Flames'], cdMod: [1, 12] },
    c => { for (let i = 0; i < 2; i++) { c.hit(125 * (c.m(0) ? 1.2 : 1)); c.af(2); c.ignite(); } });
  sp('Rain of Chaos', 'Chaos', ['Chaos', 2], { cd: 12, cast: 0.7, mods: ['extra centre meteor 80%', '-12% cooldown', 'burning ground 3x16%', 'Agonizing Flames'], cdMod: [1, 12] },
    c => {
      for (let i = 0; i < 8; i++) if (c.chance(ASSUME.rainHitFrac)) { c.hit(415 / 8); c.af(3); c.ignite(); }
      if (c.m(0)) c.hit(80); if (c.m(2)) c.flat(48, 'Rain of Chaos');
    });
  sp('Void', 'Chaos', ['Chaos', 2], { cd: 9, cast: 0.4, charges: 2, mods: ['+16% damage', '+12% recharge rate', '3 fragments x24% (1 hits)', 'burning ground 3x16%'], rechargeMod: [1, 12] },
    c => { c.hit(80 * (c.m(0) ? 1.16 : 1)); c.ignite(); if (c.m(2)) c.hit(24); if (c.m(3)) c.flat(48, 'Void'); });
  sp('Aftershock', 'Chaos', ['Chaos', 1], { cd: 9, cast: 0.4, mods: ['+24% damage', '-12% cooldown', 'Agonizing Flames'], cdMod: [1, 12] },
    c => { c.hit(140 * (c.m(0) ? 1.24 : 1)); c.af(2); c.ignite(); });

  // Blood
  sp('Shadowbolt', 'Blood', null, { start: true, cd: 8, cast: 1.0, mods: ['+60% vs Leeched', '+24% cast rate', '-12% cooldown', 'explodes 30% + Leech'], castMod: [1, 24], cdMod: [2, 12] },
    c => { c.hit(200 * (1 + (c.m(0) && c.has('leech') ? 0.6 : 0))); if (c.m(3)) c.hit(30); c.apply('leech'); });
  // Its "drains 30% health" is healing, not damage.
  sp('Sanguine Coil', 'Blood', ['Blood', 2], { cd: 7, cast: 0.4, charges: 3, mods: ['+24% vs Leeched', '+16% damage', '+1 charge', '+50% life drain (healing)'], chargeMod: [2, 1] },
    c => { c.hit(80 * (1 + (c.m(1) ? 0.16 : 0) + (c.m(0) && c.has('leech') ? 0.24 : 0))); c.apply('leech'); });
  sp('Carrion Swarm', 'Blood', ['Blood', 2], { cd: 9, cast: 0.8, mods: ['+10% damage per bat', 'Lesser Vampiric Curse 50%'] },
    c => { for (let i = 0; i < 8; i++) c.hit(30 * (c.m(0) ? 1.1 : 1)); if (c.m(1)) c.hit(50); c.apply('leech'); });
  sp('Blood Fountain', 'Blood', ['Blood', 2], { cd: 10, cast: 0.4, mods: ['+32% eruption damage', 'recast lesser fountain 36%'], extraBusy: [1, 0.4] },
    c => { c.hit(90 * (c.m(0) ? 1.32 : 1)); if (c.m(1)) c.hit(36); c.apply('leech'); });

  // Frost (V Bloods are Freeze-immune: a Freeze instead deals 30% and Chills)
  sp('Crystal Lance', 'Frost', ['Frost', 2], { cd: 8, cast: 1.0, mods: ['+70% vs Chilled/Frozen', '+24% cast rate'], castMod: [1, 24] },
    c => { c.hit(170 * (1 + (c.m(0) && c.has('chill') ? 0.7 : 0))); c.freeze(); });
  // The impact-blast jewel hits only enemies around the target, so it does nothing to a lone boss.
  sp('Frost Bat', 'Frost', ['Frost', 1], { cd: 8, cast: 0.6, charges: 2, mods: ['+32% vs Chilled/Frozen', '+24% cast rate', 'impact blast 60% (surrounding enemies)'], castMod: [1, 24] },
    c => { const ch = c.has('chill'); c.hit(120 * (1 + (c.m(0) && ch ? 0.32 : 0))); if (ch) c.freeze(); c.apply('chill'); });
  sp('Ice Nova', 'Frost', ['Frost', 1], { cd: 9, cast: 0.4, mods: ['+50% vs Chilled/Frozen', 'recast lesser nova (50% of original)', '-12% cooldown'], cdMod: [2, 12], extraBusy: [1, 0.4] },
    c => { const ch = c.has('chill'); c.hit(150 * (1 + (c.m(0) && ch ? 0.5 : 0))); if (ch) c.freeze(); c.apply('chill'); if (c.m(1)) c.hit(75); });
  sp('Arctic Storm', 'Frost', ['Frost', 2], { cd: 9, cast: 1.5, noCrit: true, mods: ['+24% damage'] },
    c => { c.hit(210 * (c.m(0) ? 1.24 : 1)); c.apply('chill'); c.freeze(); });

  // Illusion
  sp('Wraith Spear', 'Illusion', ['Illusion', 1], { cd: 9, cast: 0.7, mods: ['+25% damage'] },
    c => { c.hit(170 * (c.m(0) ? 1.25 : 1)); c.apply('weaken'); c.phantasm(); });
  sp('Spectral Wolf', 'Illusion', ['Illusion', 1], { cd: 8, cast: 0.6, mods: [] },
    c => { c.hit(150); c.apply('weaken'); c.phantasm(); });
  sp('Mosquito', 'Illusion', ['Illusion', 2], { cd: 10, cast: 0.1, mods: ['+40% damage'] },
    c => { c.hit(130 * (c.m(0) ? 1.4 : 1)); c.apply('weaken'); c.phantasm(); });
  sp('Curse', 'Illusion', ['Illusion', 2], { cd: 9, cast: 0.4, mods: ['+10% curse damage', '+1s duration', 'on-hit 40%'] },
    c => { if (c.m(2)) c.hit(40); c.curse(c.m(0) ? 0.5 : 0.4, c.m(1) ? 5 : 4); c.apply('weaken'); c.phantasm(); });

  // Storm
  sp('Ball Lightning', 'Storm', ['Storm', 1], { cd: 9, cast: 0.4, mods: ['+7% damage per shock'] },
    c => { for (let i = 0; i < 6; i++) c.hit(30 * (c.m(0) ? 1.07 : 1)); c.hit(50); c.apply('static'); });
  sp('Cyclone', 'Storm', ['Storm', 1], { cd: 8, cast: 0.4, mods: ['+30% damage', '+24% cast rate'], castMod: [1, 24] },
    c => { c.hit(120 * (c.m(0) ? 1.3 : 1)); c.apply('static'); });
  sp('Lightning Tendrils', 'Storm', ['Storm', 2], { cd: 8, cast: 0.9, mods: ['+1 bolt', '+12% bolt damage', '+24% cast rate'], castMod: [2, 24] },
    c => { const n = c.m(0) ? 7 : 6; for (let i = 0; i < n; i++) if (c.chance(ASSUME.tendrilsBoltFrac)) { c.hit(40 * (c.m(1) ? 1.12 : 1)); c.apply('static'); } });
  sp('Polarity Shift', 'Storm', ['Storm', 2], { cd: 9, cast: 0.5, charges: 2, mods: ['destination nova 60%'] },
    c => { c.hit(90); if (c.m(0)) c.hit(60); c.apply('static'); });

  // Unholy (Condemn: target takes +15% damage from all sources for 5s)
  sp('Bone Explosion', 'Unholy', ['Unholy', 1], { cd: 9, cast: 0.5, mods: ['+24% damage', '-12% cooldown', 'second explosion 50%', '+30% vs <30% HP'], cdMod: [1, 12] },
    c => { c.hit(150 * (1 + (c.m(0) ? 0.24 : 0) + (c.m(3) && c.lowHp() ? 0.3 : 0))); c.apply('condemn'); if (c.m(2)) c.hit(50); });
  sp('Unholy Chains', 'Unholy', ['Unholy', 2], { cd: 9, cast: 2.1, mods: ['+0.4s channel, +60% damage', 'projectile nova 50% (1 hits)'], extraBusy: [0, 0.4] },
    c => { if (!c.chance(ASSUME.chainsCompleteFrac)) return; c.hit(280 * (c.m(0) ? 1.6 : 1)); c.apply('condemn'); if (c.m(1)) c.hit(50); });
  sp('Corrupted Skull', 'Unholy', ['Unholy', 1], { cd: 8, cast: 0.7, charges: 2, mods: ['+20% damage'] },
    c => { c.hit(80 * (1 + (c.m(0) ? 0.2 : 0) + (c.lowHp() ? 0.5 : 0))); c.apply('condemn'); });
  sp('Soulburn', 'Unholy', ['Unholy', 2], { cd: 8, cast: 0.35, mods: ['+16% damage', '+24% cast rate'], castMod: [1, 24] },
    c => { c.hit(60 * (c.m(0) ? 1.16 : 1)); c.apply('condemn'); });

  // Veils: fx on cast, onPrimary on the empowered primary attack ("Veil attack") that follows.
  // atk: % bonus damage on the Veil attack's shot; atkMod: [jewel mod, %] the "+X% Veil attack damage" jewel;
  // atkLow: [jewel mod, %] bonus against a boss below 20% HP. Jewel mods are listed best first for one boss.
  // Veil of Shadow stands in for the starting dash (no 1.1 unlock source; assumed default). Veil of Bones' Skeleton
  // Warrior (30% per hit) is a minion with no documented lifetime and is left out.
  veil('Veil of Shadow', 'Shadow', 0, { cast: 0.45, atk: 25 }, () => {}, () => {});
  veil('Veil of Blood', 'Blood', 40, { cast: 0.5, mods: ['+24% Veil attack damage', '+16% physical damage for 4 s (Leeched target)', 'dashing through the boss inflicts Leech'], atkMod: [0, 24] },
    c => { if (c.m(2)) c.apply('leech'); },
    c => { c.hit(20); c.apply('leech'); if (c.m(1)) c.buff('veilPhys', 4); });   // its "drains 20% health" heals
  // A V Blood is Freeze-immune, so the Freeze jewel gives the 30% proc and Chill instead (see Frost spells).
  veil('Veil of Frost', 'Frost', 44, { cast: 0.5, mods: ['Veil attack nova 50% + Chill', 'illusion explodes 40% + Chill', '+24% Veil attack damage', 'Veil attack consumes Chill to Freeze'], atkMod: [2, 24] },
    () => {}, c => { if (c.m(3) && c.has('chill')) c.freeze(); c.apply('chill'); if (c.m(0)) c.hit(50); if (c.m(1)) c.hit(40); });
  veil('Veil of Bones', 'Unholy', 50, { cast: 0.5, mods: ['skeleton explodes 80% + Condemn', '+50% Veil attack vs <20% HP', '+24% Veil attack damage', 'dashing through the boss inflicts Condemn'], atkLow: [1, 50], atkMod: [2, 24] },
    c => { if (c.m(3)) c.apply('condemn'); },
    c => { c.apply('condemn'); if (c.m(0)) c.flat(80, 'Veil of Bones'); });
  veil('Veil of Storm', 'Storm', 50, { cast: 0.4, mods: ['illusion shocks 20% + Static', '+24% Veil attack damage', 'dash applies Static'], atkMod: [1, 24] },
    c => { c.buff('stormHaste', 4); if (c.m(0)) { c.hit(20); c.apply('static'); } if (c.m(2)) c.apply('static'); },   // +20% attack speed for 4 s
    c => c.apply('static'));
  veil('Veil of Chaos', 'Chaos', 57, { cast: 0.4, mods: ['illusion explosion +24%', 'second illusion at 80%', 'Agonizing Flames on Veil attack', '+24% Veil attack damage'], atkMod: [3, 24] },
    c => { c.hit(50 * (c.m(0) ? 1.24 : 1)); c.ignite(); },
    c => { c.ignite(); c.af(2); if (c.m(1)) { c.busy(0.4); c.hit(50 * (c.m(0) ? 1.24 : 1) * 0.8); c.ignite(); } });
  veil('Veil of Illusion', 'Illusion', 65, { cast: 0.5, mods: ['Veil attack grants 5 Phantasm', 'recast detonation 36% + Weaken', '+24% Veil attack damage'], atkMod: [2, 24] },
    () => {}, c => { c.apply('weaken'); c.phantasm(c.m(0) ? 5 : 1); if (c.m(1)) c.hit(36); });

  // Ultimates: cannot crit, scale with Ultimate Power. cast = total busy time (cast + channel).
  ult('Chaos Barrage', 'Chaos', ['Chaos', 3], { cast: 1.0 }, c => { for (let i = 0; i < 4; i++) { c.hit(200); c.hit(100); } c.ignite(); });
  ult('Merciless Charge', 'Chaos', ['Chaos', 3], { cast: 1.5 }, c => { c.hit(100); c.hit(250); c.ignite(); });
  ult('Crimson Beam', 'Blood', ['Blood', 3], { cast: 3.4 }, c => { for (let i = 0; i < 6; i++) c.hit(275 / 6); c.apply('leech'); });
  ult('Heart Strike', 'Blood', ['Blood', 3], { cast: 0.7 }, c => { c.hit(150); c.hit(150); c.apply('leech'); });
  ult('Volatile Arachnid', 'Unholy', ['Unholy', 3], { cast: 0.5 }, c => { c.hit(250); for (let i = 0; i < 3; i++) c.hit(125); c.apply('condemn'); });
  ult('Arctic Leap', 'Frost', ['Frost', 3], { cast: 1.0 }, c => { c.hit(250); c.freeze(); });
  ult('Wisp Dance', 'Illusion', ['Illusion', 3], { cast: 0.8 }, c => { for (let i = 0; i < 3; i++) { c.hit(70); c.hit(125); } c.apply('weaken'); c.phantasm(6); });
  ult('Spectral Guardian', 'Illusion', ['Illusion', 3], { cast: 0.3 }, c => { for (let i = 0; i < 4; i++) c.hit(150); c.apply('weaken'); });
  ult('Lightning Typhoon', 'Storm', ['Storm', 3], { cast: 4.5 }, c => { for (let i = 0; i < 8; i++) c.hit(100); c.apply('static'); });
  ult('Raging Tempest', 'Storm', ['Storm', 3], { cast: 3.2 }, c => { c.hit(525); for (let i = 0; i < 4; i++) c.hit(50); c.apply('static'); });
  ult('Blood Storm', 'Blood', null, { boss: 91, shard: 'Soul Shard of Dracula', cast: 4.5 },
    c => { for (let i = 0; i < 25; i++) if (c.chance(ASSUME.bloodStormBoltFrac)) c.hit(100); c.hit(300); c.apply('leech'); });
  ult('Voidquake Vortex', 'Chaos', null, { boss: 86, shard: 'Soul Shard of the Winged Horror', cast: 1.5 }, c => { c.hit(400); c.ignite(); });
  ult('Eye of the Storm', 'Storm', null, { boss: 88, shard: 'Soul Shard of the Monster', cast: 0.7 },
    c => { for (let i = 0; i < 37; i++) if (c.chance(ASSUME.eyeHitFrac)) c.hit(100); c.apply('static'); });
  ult("Serpent's Kiss", 'Illusion', null, { boss: 88, shard: 'Soul Shard of the Serpent', cast: 1.1 }, c => { c.hit(350); c.hit(200); c.apply('weaken'); });

  const byName = Object.fromEntries(ABILITIES.map(a => [a.name, a]));

  // ---------- Stats ----------
  const STAT_KEYS = ['flatSP', 'bSP', 'crit', 'critPower', 'cdr', 'veilCDR', 'ultPower', 'ultCDR', 'charge', 'leech', 'minion', 'eff', 'dracCDR', 'veilUltCut',
    'pp', 'bPP', 'pCrit', 'pCritPower', 'aSpd'];   // physical: Physical Power (base + weapon), bonus %, crit, crit power, attack speed

  function masteryTiers(level) {
    const pts = pointsAt(level), out = {};
    for (const school of Object.keys(POINTS)) {
      const n = Object.values(pts[school]).reduce((a, b) => a + b, 0);
      out[school] = n >= 7 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0;
    }
    return out;
  }

  // cfg: { stage, primary, secondary: {blood, tier} | null, amulet, elixir, passives: [], weapon: [] }
  function buildStats(cfg) {
    const S = STAGES[cfg.stage];
    const st = Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
    const bypass = Object.fromEntries(STAT_KEYS.map(k => [k, 0]));
    const q = S.bloodQuality;
    st.flatSP = 10 + S.potion; st.crit = 5; st.critPower = 140; st.eff = q >= 1 ? 20 : 0;
    st.pp = 10 + CROSSBOW.pp[S.weapon]; st.pCrit = 5; st.pCritPower = 140;
    st.flags = new Set();
    const add = (src, scale = 1, into = st) => {
      for (const [k, v] of Object.entries(src)) {
        if (k === 'flags') v.forEach(f => st.flags.add(f));
        else if (typeof v === 'number' && k in into) into[k] += v * scale;
      }
    };
    add(ARMOR[S.armor]);
    add(AMULET[cfg.amulet]);
    if (ASSUME.bloodKeyBuff) st.flatSP += AMULET[cfg.amulet].equipSP || 0;
    add(ELIXIR[cfg.elixir]);
    cfg.passives.forEach(p => add(PASSIVE[p]));
    cfg.weapon.forEach(w => { st[w] += WEAPON_ROLL[w]; });
    const tiers = masteryTiers(S.level);
    for (const [school, t] of Object.entries(tiers))
      for (let i = 0; i < t; i++) add(MASTERY[school][i], 1, ASSUME.capBypass ? bypass : st);
    st.eff = Math.min(CAP.eff, st.eff);
    const effMul = st.eff / 100;
    for (const t of [1, 2, 3, 4]) {                               // primary blood at the stage's quality
      if (q < TIER_MIN[t]) continue;
      const tr = BLOOD[cfg.primary][t], scale = t === 4 ? 1 : 0.5 + 0.5 * q;
      add(tr, scale);
      const effPart = ASSUME.effScalesFixed ? tr                  // Blood Efficiency portion
        : Object.fromEntries(Object.entries(tr).filter(([k]) => k !== 'dracCDR' && k !== 'veilUltCut'));
      add(effPart, scale * effMul, ASSUME.capBypass ? bypass : st);
    }
    if (cfg.secondary && cfg.secondary.blood !== cfg.primary) {    // Blood Homogenizer, 100% donor
      for (const t of [cfg.secondary.tier, 4]) {
        const tr = BLOOD[cfg.secondary.blood][t];
        add(tr);
        if (ASSUME.effOnSecondary) add(tr, effMul, ASSUME.capBypass ? bypass : st);
      }
    }
    st.raw = {}; st.bypass = bypass;
    for (const k of STAT_KEYS) {
      st.raw[k] = st[k] + bypass[k];
      st[k] = (k in CAP ? Math.min(CAP[k], st[k]) : st[k]) + bypass[k];
    }
    st.masteryTiers = tiers;
    return st;
  }

  // ---------- Simulation ----------
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const SCHOOL_EFFECTS = ['ignite', 'leech', 'chill', 'weaken', 'static', 'condemn'];

  // Rotation policies: priority order of veil/s1/s2, and whether the ultimate waits until no spell is ready.
  const PERMS = [['veil', 's1', 's2'], ['veil', 's2', 's1'], ['s1', 'veil', 's2'], ['s2', 'veil', 's1'], ['s1', 's2', 'veil'], ['s2', 's1', 'veil']];
  const POLICIES = {
    // 'fast' (search phases): veil-first and spells-first orders, ultimate held.
    fast: [PERMS[0], PERMS[1], PERMS[4], PERMS[5]].map(order => ({ order, ultHold: true })),
    full: PERMS.flatMap(order => [{ order, ultHold: true }, { order, ultHold: false }]),
  };

  // build: { veil, s1, s2, ult } (names); opts: { duration, seed, policy, trace } (trace: an array that gets [time, action] for every action)
  function simulate(build, st, cfg, opts) {
    const T = opts.duration, rng = mulberry32(opts.seed);
    const jm = STAGES[cfg.stage].jewelMods;
    const s = { t: 0, total: 0, by: {}, until: {}, meter: 0, phantasm: 0, coldIcd: 0, thirstIcd: 0, staticNext: 0,
      curses: [], primed: null, chain: 0, hpPending: false, casts: {}, primReady: 0, marked: false, markStacks: 0, coatReady: 0 };
    const F = st.flags;
    const phantasmMax = F.has('illusionMastery') ? 12 : 10;

    const slot = (name, key) => {
      const def = byName[name];
      const m = i => def.kind !== 'ult' && i < jm && i < def.mods.length;
      let cd = def.cd, cast = def.cast, charges = def.charges || 1, recharge = 0;
      if (def.cdMod && m(def.cdMod[0])) cd *= 1 - def.cdMod[1] / 100;
      if (def.castMod && m(def.castMod[0])) cast /= 1 + def.castMod[1] / 100;
      if (def.extraBusy && m(def.extraBusy[0])) cast += def.extraBusy[1];
      if (def.chargeMod && m(def.chargeMod[0])) charges += def.chargeMod[1];
      if (def.rechargeMod && m(def.rechargeMod[0])) recharge = def.rechargeMod[1] / 100;
      return { key, def, m, cd, cast, max: charges, charges, timer: 0, recharge };
    };
    const veilS = slot(build.veil, 'veil'), s1 = slot(build.s1, 's1'), s2 = slot(build.s2, 's2'), ultS = slot(build.ult, 'ult');
    const spells = [s1, s2];
    const policy = opts.policy || POLICIES.fast[0];
    const seq = policy.order.map(k => ({ veil: veilS, s1, s2 })[k]);
    // Crossbow skills fill the gaps between abilities. Stats with no Physical Power (the tests' blank stats) have no weapon.
    const weapon = ASSUME.weaponDamage && st.pp > 0;
    const wSkills = weapon ? WEAPON_SKILLS.map(def => ({ key: def.name, def, m: () => false, cd: def.cd, cast: def.cast, max: 1, charges: 1, timer: 0, recharge: 0 })) : [];
    const all = [veilS, s1, s2, ultS, ...wSkills];
    const coat = COATING[cfg.coating || 'none'];
    const coatSlot = { def: { kind: 'coating' }, m: () => false };
    const trace = opts.trace ? name => opts.trace.push([s.t, name]) : () => {};

    // Times within 1e-9 s count as equal, so float noise from the step size can't decide whether a buff is still up.
    const active = k => (s.until[k] || 0) - s.t > 1e-9;
    const past = x => s.t >= x - 1e-9;
    const SP = () => {
      const bonus = st.bSP / 100 + (active('coldBlood') ? 0.15 : 0);
      return ASSUME.spFormula === 'base' ? 10 * (1 + bonus) + (st.flatSP - 10) : st.flatSP * (1 + bonus);
    };
    const critMult = st.critPower / 100;
    const ultMult = 1 + st.ultPower / 100;
    const minionMult = 1 + st.minion / 100;
    // Running curses accumulate the damage dealt meanwhile, except other curses' payouts.
    const add = (src, v) => { s.total += v; s.by[src] = (s.by[src] || 0) + v; if (src !== 'Curse') for (const c of s.curses) c.acc += v; };
    // Damage multiplier from target debuffs and own temporary buffs. spell = false for DoT ticks, shocks,
    // procs and ground effects, which don't get "+X% spell damage" passives.
    const targetMult = (spell = true) => {
      let b = 0;
      if (spell && F.has('renewing') && active('ignite')) b += 0.08;
      if (spell && F.has('spiritual') && active('weaken')) b += 0.08;
      if (F.has('coldSoul') && active('chill')) b += 0.08;
      let m = 1 + b;
      if (active('condemn')) m *= 1.15;
      if (F.has('hungerBlood')) m *= 1.08;
      if (active('bloodthirst') && ASSUME.bloodthirstSpells) m *= 1.15;
      if (active('hungerPower')) m *= 1.20;
      return m;
    };
    // Physical hits get no "+X% spell damage" passives or spell crit; Bloodthirst always applies.
    const physMult = () => {
      let m = 1 + (F.has('coldSoul') && active('chill') ? 0.08 : 0);
      if (active('condemn')) m *= 1.15;
      if (F.has('hungerBlood')) m *= 1.08;
      if (active('bloodthirst')) m *= 1.15;
      if (active('hungerPower')) m *= 1.20;
      if (active('veilPhys')) m *= 1.16;
      return m;
    };
    const physPower = st.pp * (1 + st.bPP / 100);
    const aspd = () => 1 + (st.aSpd + (active('stormHaste') ? 20 : 0) + (active('marks') ? s.markStacks * CROSSBOW.markSpeed : 0)) / 100;
    const staticShock = () => {
      if (!past(s.staticNext)) return;
      add('Static shock', 0.10 * (F.has('lfs') ? 1.2 : 1) * SP() * targetMult(false));
      s.staticNext = s.t + ASSUME.staticIcd;
    };
    // Physical damage against a Static target triggers a shock (W/Abilities); spell hits do too with Enhanced Conductivity.
    function physHit(coef, src) {
      let v = coef / 100 * physPower * physMult();
      if (rng() < st.pCrit / 100) v *= st.pCritPower / 100;
      add(src, v);
      if (active('static')) staticShock();
    }
    // Seconds of [s.t, s.t + dt] that effect k still covers, so effects that run out mid-step count only until they do.
    const overlap = (k, dt) => Math.max(0, Math.min(dt, (s.until[k] || 0) - s.t));
    // Cooldown rate now, or averaged over the next dt seconds.
    const rate = (a, dt = 0) => {
      if (a.def.kind === 'weapon') return 1;   // a caster has no Weapon Skill Cooldown
      if (a.def.kind === 'veil') return 1 + st.veilCDR / 100;
      if (a.def.kind === 'ult') return ASSUME.ultCdrMode === 'works' ? 1 + st.ultCDR / 100 : 1;
      const drac = dt ? overlap('dracCDR', dt) / dt : active('dracCDR') ? 1 : 0;
      return 1 + st.cdr / 100 + drac * st.dracCDR / 100 + s.phantasm * 0.01 + a.recharge;
    };

    function tick(dt) {
      for (const a of all) {
        if (a.charges >= a.max) continue;
        a.timer -= dt * rate(a, dt);
        // Tolerance: advancing by timer / rate can leave float residue (~1e-15) that would delay the charge a whole step.
        while (a.timer <= 1e-9 * a.cd && a.charges < a.max) { a.charges++; if (a.charges < a.max) a.timer += a.cd; else a.timer = 0; }
      }
      const sp = SP(), tm = targetMult(false);
      const ig = overlap('ignite', dt), af = overlap('af', dt);
      if (ig > 0) add('Ignite', 0.10 * (F.has('kindling') ? 1.25 : 1) * sp * tm * ig);
      if (af > 0) add('Agonizing Flames', (0.06 * 5 / ASSUME.afDuration) * sp * tm * af);
      s.t += dt;
      // Curses stack (wiki); each pays out when it expires. Curses still running at fight end pay nothing.
      for (const c of s.curses.filter(c => past(c.until))) {
        s.curses.splice(s.curses.indexOf(c), 1);
        add('Curse', Math.min(c.mult * c.acc, 5 * SP()));   // accumulated damage already includes Condemn etc.
      }
    }
    function advance(d) {   // the last step is clipped so nothing happens after T
      while (d > 1e-9 && s.t < T) { const step = Math.min(ASSUME.dt, d, T - s.t); tick(step); d -= step; }
    }

    function ctxFor(a, src) {
      const isUlt = a.def.kind === 'ult';
      const c = {
        m: i => a.m(i),
        has: k => active(k),
        chance: p => p >= 1 || rng() < p,
        lowHp: () => s.t > T * (1 - ASSUME.lowHpFrac),
        busy: d => advance(d),
        hit(coef, o = {}) {
          let v = coef / 100 * SP() * targetMult();
          if (isUlt) v *= ultMult;
          if (o.minion) v *= minionMult;
          let wickedEffect = null;
          if (!isUlt && !o.minion && !a.def.noCrit) {
            const p = st.crit / 100 + (active('veilCrit') ? 0.15 : 0);
            if (rng() < p) {
              v *= critMult;
              if (st.dracCDR) s.until.dracCDR = s.t + 3;
              if (F.has('wicked') && rng() < 0.5) wickedEffect = SCHOOL_EFFECTS[Math.floor(rng() * SCHOOL_EFFECTS.length)];
            }
          }
          add(src, v);
          if (active('static') && F.has('conductivity')) staticShock();
          if (wickedEffect) c.apply(wickedEffect);   // applied after this hit resolves
        },
        phys(coef) { physHit(coef, src); },
        mark() { s.marked = true; },
        buff(k, d) { s.until[k] = s.t + d; },
        flat(coef, label) { add(label, coef / 100 * SP() * targetMult(false)); },
        apply(k) {
          if (k === 'ignite') return c.ignite();
          s.until[k] = s.t + (k === 'chill' ? 5 + (F.has('frostMastery') ? 1 : 0) : 5);
        },
        ignite() { s.until.ignite = s.t + 5 + (F.has('chaosMastery') ? 1 : 0); },
        af(i) { if (a.m(i) && active('ignite')) s.until.af = s.t + ASSUME.afDuration; },
        freeze() { add('Freeze-immune proc', 0.30 * SP() * targetMult(false)); c.apply('chill'); },
        phantasm(n = 1) { s.phantasm = Math.min(phantasmMax, s.phantasm + n); },
        curse(mult, dur) { s.curses.push({ until: s.t + dur, acc: 0, mult }); },
      };
      return c;
    }

    function use(a) {
      if (a.def.kind === 'spell' && s.meter >= 100) { s.meter -= 100; s.phantasm = 0; }  // Spell Charge: free cast
      else { a.charges--; if (a.timer <= 0) a.timer = a.cd; }
      if (a.def.kind === 'spell' || a.def.kind === 'ult') {
        s.meter += st.charge + s.phantasm;                     // st.charge is already capped
        if (F.has('hungerPower') && ++s.chain >= 6) { s.hpPending = true; s.chain = 0; }  // buff starts after the 6th spell
      }
    }

    function nextReady() {
      let best = Infinity;
      for (const a of all) if (a.charges < a.max) best = Math.min(best, a.timer / rate(a));
      return best;
    }

    // One crossbow shot: waits out the last shot's cooldown, draws, then hits; bonus = % extra damage (Veil attack).
    // Returns false if the fight ended first.
    function shoot(bonus = 0) {
      if (s.primReady > s.t) advance(s.primReady - s.t);
      const as = aspd();
      advance(CROSSBOW.shotCast / as);
      if (s.t >= T) return false;
      s.primReady = s.t + CROSSBOW.shotCd / as;
      s.casts['Primary attack'] = (s.casts['Primary attack'] || 0) + 1; trace('Primary attack');
      if (ASSUME.hungerPowerBreak === 'primary') s.chain = 0;
      if (F.has('coldBlood') && past(s.coldIcd) && rng() < 0.10) { s.until.coldBlood = s.t + 4; s.coldIcd = s.t + 10; }
      if (F.has('bloodthirst') && past(s.thirstIcd) && rng() < 0.15) { s.until.bloodthirst = s.t + 6; s.thirstIcd = s.t + 10; }
      if (!weapon) return true;
      if (s.marked) {   // consuming the Mark: +25% on this shot and a +7% attack speed stack
        bonus += CROSSBOW.markBonus; s.marked = false;
        s.markStacks = Math.min(CROSSBOW.markStacks, (active('marks') ? s.markStacks : 0) + 1); s.until.marks = s.t + CROSSBOW.markDur;
      }
      physHit(100 * (1 + bonus / 100), 'Primary attack');
      if (coat !== COATING.none && past(s.coatReady)) { s.coatReady = s.t + 12; coat.fx(ctxFor(coatSlot, 'Coating')); }
      return true;
    }

    function primary(afterVeil) {
      if (!afterVeil) { shoot(); return; }
      const a = s.primed, d = a.def; s.primed = null;
      const bonus = (d.atk || 0) + (d.atkMod && a.m(d.atkMod[0]) ? d.atkMod[1] : 0)
        + (d.atkLow && a.m(d.atkLow[0]) && s.t > T * 0.8 ? d.atkLow[1] : 0);
      if (!shoot(bonus)) return;
      d.onPrimary(ctxFor(a, d.name));
      // Mutant T4 cut, in timer units: 'works' = 7 real seconds (x timer rate); 'cutOnly' = cut grows with the stat.
      const mode = ASSUME.ultCdrMode;
      const cut = () => { if (st.veilUltCut && ultS.charges < ultS.max) ultS.timer -= st.veilUltCut * (mode === 'none' || mode === 'twoCuts' ? 1 : 1 + st.ultCDR / 100); };
      cut();
      if (mode === 'twoCuts' && d.name === 'Veil of Chaos') {   // recast dash + a second Veil attack
        advance(a.m(1) ? 0 : 0.4);
        if (!shoot(bonus)) return;
        cut();
      }
    }

    function useWeapon(w) {
      w.charges--; if (w.timer <= 0) w.timer = w.cd;
      if (ASSUME.hungerPowerBreak === 'primary') s.chain = 0;
      advance(w.cast);
      if (s.t >= T) return;
      w.def.fx(ctxFor(w, w.def.name));
      s.casts[w.def.name] = (s.casts[w.def.name] || 0) + 1; trace(w.def.name);
    }

    while (s.t < T) {
      if (s.primed) { primary(true); continue; }
      let a = null;
      const spellReady = spells.some(x => x.charges > 0);
      if (ultS.charges > 0 && !(policy.ultHold && spellReady)) a = ultS;
      else a = seq.find(x => x.charges > 0) || (ultS.charges > 0 ? ultS : null);
      if (!a) {
        // Filler: a crossbow skill that fits before the next ability, else a shot. Wait instead if the next ability
        // would be ready mid-shot, or if any attack would break Hunger for Power's chain.
        const wait = nextReady();
        const keepChain = F.has('hungerPower') && ASSUME.hungerPowerBreak === 'primary';
        const w = keepChain ? null : wSkills.find(x => x.charges > 0 && x.cast <= wait + 1e-9);
        if (w) { useWeapon(w); continue; }
        const shotTime = Math.max(0, s.primReady - s.t) + CROSSBOW.shotCast / aspd();
        if (wait < shotTime || keepChain) advance(Math.max(1e-6, Math.min(wait, shotTime))); else primary(false);
        continue;
      }
      use(a);
      advance(a.cast);
      if (s.t >= T) break;
      if (a.def.kind === 'veil' && F.has('veilCrit')) s.until.veilCrit = s.t + 4;
      a.def.fx(ctxFor(a, a.def.name));
      if (s.hpPending) { s.until.hungerPower = s.t + 6; s.hpPending = false; }
      s.casts[a.def.name] = (s.casts[a.def.name] || 0) + 1; trace(a.def.name);
      if (a.def.kind === 'veil') s.primed = a;
      if (a.def.kind === 'ult' && F.has('ultReset')) for (const x of [s1, s2]) { x.charges = x.max; x.timer = 0; }
    }
    return { dps: s.total / T, by: s.by, casts: s.casts };
  }

  // Ultimates from a Soul Shard need that shard; any other ultimate can be worn with any amulet
  // (since 1.1 a Soul Shard's ultimate can be overridden).
  function fixAmulet(build, cfg) {
    const def = byName[build.ult];
    return def.shard && cfg.amulet !== def.shard ? { ...cfg, amulet: def.shard } : cfg;
  }

  // opts.policies: 'fast' (4 policies) or 'full' (12); opts.policyList: explicit policies;
  // opts.seedBase: use a fresh base to confirm. Returns the best policy's result.
  function evaluate(build, cfg, runs = 4, duration = 300, opts = {}) {
    cfg = fixAmulet(build, cfg);
    const st = buildStats(cfg);
    const seedBase = opts.seedBase ?? 1000;
    let best = null;
    for (const policy of opts.policyList || POLICIES[opts.policies || 'fast']) {
      const vals = []; const by = {}; const casts = {};
      for (let r = 0; r < runs; r++) {
        const res = simulate(build, st, cfg, { duration, seed: seedBase + r * 7919, policy });
        vals.push(res.dps);
        for (const [k, v] of Object.entries(res.by)) by[k] = (by[k] || 0) + v / duration / runs;
        for (const [k, v] of Object.entries(res.casts)) casts[k] = (casts[k] || 0) + v / runs;
      }
      const dps = vals.reduce((a, b) => a + b, 0) / runs;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - dps) ** 2, 0) / Math.max(1, runs - 1));
      if (!best || dps > best.dps) best = { dps, se: sd / Math.sqrt(runs), vals, by, casts, policy, cfg, st };
    }
    return best;
  }

  // ---------- Availability ----------
  function available(stage, opts = {}) {
    const S = STAGES[stage], lv = S.level, pts = pointsAt(lv);
    const amulets = opts.amulets || S.amulets;
    const hasPoint = a => a.start || (a.pt && pts[a.pt[0]][a.pt[1]] > 0);
    return {
      spells: ABILITIES.filter(a => a.kind === 'spell' && hasPoint(a)).map(a => a.name),
      veils: ABILITIES.filter(a => a.kind === 'veil' && a.boss <= lv).map(a => a.name),
      ults: ABILITIES.filter(a => a.kind === 'ult' && (a.shard ? amulets.includes(a.shard) && a.boss <= lv : hasPoint(a))).map(a => a.name),
      pts,
    };
  }
  // A loadout is feasible if the spell points it needs exist by the stage's boss level.
  function feasible(stage, names) {
    const pts = pointsAt(STAGES[stage].level), need = {};
    for (const n of names) {
      const a = byName[n];
      if (!a.pt) continue;
      const k = a.pt.join(':'); need[k] = (need[k] || 0) + 1;
      if (need[k] > pts[a.pt[0]][a.pt[1]]) return false;
    }
    return true;
  }
  function passivesFor(stage) {
    const S = STAGES[stage];
    return Object.keys(PASSIVE).filter(p => S.vampirePassives || !PASSIVE[p].vampire);
  }
  function elixirsFor(stage) {
    return Object.keys(ELIXIR).filter(e => ELIXIR[e].boss <= STAGES[stage].level);
  }
  function coatingsFor(stage) {
    return Object.keys(COATING).filter(k => COATING[k].boss <= STAGES[stage].level);
  }

  // ---------- Optimizer ----------
  // Identifies a config regardless of passive and weapon-roll order.
  const cfgKey = c => JSON.stringify({ ...c, passives: [...c.passives].sort(), weapon: [...c.weapon].sort() });
  function combos(arr, k) {
    const out = [];
    const rec = (i, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let j = i; j < arr.length; j++) { cur.push(arr[j]); rec(j + 1, cur); cur.pop(); } };
    rec(0, []); return out;
  }

  function defaultCfg(stage, amulets) {
    const S = STAGES[stage];
    const coatings = coatingsFor(stage);
    const cfg = { stage, primary: S.primaries[0], secondary: null, amulet: amulets[0], elixir: elixirsFor(stage).slice(-1)[0],
      coating: coatings.includes('Unholy Coating') ? 'Unholy Coating' : 'none', passives: [], weapon: [] };
    if (stage === 'late' || stage === 'p7') Object.assign(cfg, { primary: 'Mutant', secondary: { blood: 'Draculin', tier: 2 }, passives: ['Enhanced Conductivity', 'Wicked Power', 'Cold Soul', 'Flowing Sorcery', 'Chaos Kindling'], weapon: ['crit', 'critPower', 'cdr'] });
    if (stage === 'mid') cfg.passives = ['Enhanced Conductivity', 'Flowing Sorcery', 'Chaos Kindling'];
    return cfg;
  }

  // Score every rotation policy for a loadout (separate seeds), best first.
  function rankPolicies(build, cfg, runs = 3, duration = 300, seedBase = 700000) {
    cfg = fixAmulet(build, cfg);
    return POLICIES.full.map(policy => ({ policy, dps: evaluate(build, cfg, runs, duration, { policyList: [policy], seedBase }).dps }))
      .sort((a, b) => b.dps - a.dps);
  }

  function randomCfg(stage, amulets, rng) {
    const S = STAGES[stage], pick = a => a[Math.floor(rng() * a.length)];
    const shuffle = a => a.map(x => [rng(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
    const primary = pick(S.primaries);
    const secondary = S.homogenizer && rng() < 0.85
      ? { blood: pick(Object.keys(BLOOD).filter(b => b !== primary)), tier: 1 + Math.floor(rng() * 3) } : null;
    return { stage, primary, secondary, amulet: pick(amulets), elixir: pick(elixirsFor(stage)), coating: pick(coatingsFor(stage)),
      passives: shuffle(passivesFor(stage)).slice(0, S.passiveSlots), weapon: shuffle(Object.keys(WEAPON_ROLL)).slice(0, S.weaponRolls) };
  }

  // Gear/blood/passive tuning for one loadout, scored with that loadout's two best rotation policies.
  // Small option spaces are searched exhaustively; larger ones by coordinate descent (joint blood x amulet
  // moves, elixir, weapon rolls, greedy passive fill + swaps) from the given start plus random restarts.
  function optimizeCfg(build, cfg, stage, amulets, runs, duration, opts = {}) {
    const S = STAGES[stage];
    const policyList = rankPolicies(build, cfg).slice(0, 2).map(r => r.policy);
    const seen = new Map();   // every scored config, so the best few can be re-scored more precisely at the end
    const score = c => {
      const k = cfgKey(c);
      if (!seen.has(k)) seen.set(k, { cfg: c, dps: evaluate(build, c, runs, duration, { policyList }).dps });
      return seen.get(k).dps;
    };
    // Re-score the top configs over all fight lengths on separate seeds; short screening runs are noisy.
    const finish = () => {
      const top = [...seen.values()].sort((a, b) => b.dps - a.dps).slice(0, 16);
      let best = null;
      for (const t of top) {
        const mix = FIGHT_LENGTHS.reduce((s, d) => s + evaluate(build, t.cfg, 8, d, { policyList, seedBase: 600000 }).dps, 0) / FIGHT_LENGTHS.length;
        if (!best || mix > best.dps) best = { cfg: fixAmulet(build, t.cfg), dps: mix };
      }
      return { ...best, policyList };
    };
    const P = passivesFor(stage);
    const amuletOpts = byName[build.ult].shard ? [byName[build.ult].shard] : amulets;
    const bloodSets = S.primaries.flatMap(p => {
      const secs = [null];
      if (S.homogenizer) for (const b of Object.keys(BLOOD)) if (b !== p) for (const t of [1, 2, 3]) secs.push({ blood: b, tier: t });
      return secs.map(secondary => ({ primary: p, secondary }));
    });
    const passiveSets = S.passiveSlots ? combos(P, S.passiveSlots) : [[]];
    const weaponSets = S.weaponRolls ? combos(Object.keys(WEAPON_ROLL), S.weaponRolls) : [[]];
    const elixirs = elixirsFor(stage), coatings = coatingsFor(stage);

    const space = bloodSets.length * amuletOpts.length * elixirs.length * coatings.length * passiveSets.length * weaponSets.length;
    if (space <= 1500) {
      for (const b of bloodSets) for (const a of amuletOpts) for (const e of elixirs) for (const co of coatings) for (const ps of passiveSets) for (const w of weaponSets)
        score({ stage, ...b, amulet: a, elixir: e, coating: co, passives: ps, weapon: w });
      return finish();
    }

    const descend = start => {
      let best = fixAmulet(build, { ...start }), bestScore = score(best);
      const tryCfg = c => { const v = score(c); if (v > bestScore + 1e-9) { bestScore = v; best = c; return true; } return false; };
      // Elixir, weapon and passives are tuned before blood x amulet, so each start's blood gets its
      // supporting gear (e.g. Mutant needs Blasphemous + Veil cooldown) before it can be swapped away.
      for (let round = 0; round < 3; round++) {
        let changed = false;
        for (const e of elixirs) changed = tryCfg({ ...best, elixir: e }) || changed;
        for (const co of coatings) changed = tryCfg({ ...best, coating: co }) || changed;
        for (const w of weaponSets) changed = tryCfg({ ...best, weapon: w }) || changed;
        if (S.passiveSlots) {
          if (best.passives.length < S.passiveSlots) {          // greedy fill
            const picked = best.passives.slice();
            while (picked.length < S.passiveSlots) {
              let bp = null, bv = -Infinity;
              for (const p of P) if (!picked.includes(p)) { const v = score({ ...best, passives: [...picked, p] }); if (v > bv) { bv = v; bp = p; } }
              picked.push(bp);
            }
            best = { ...best, passives: picked }; bestScore = score(best); changed = true;
          }
          for (let i = 0; i < S.passiveSlots; i++)              // single swaps
            for (const p of P) {
              if (best.passives.includes(p)) continue;
              const ps = best.passives.slice(); ps[i] = p;
              changed = tryCfg({ ...best, passives: ps }) || changed;
            }
        }
        for (const b of bloodSets) for (const a of amuletOpts) changed = tryCfg({ ...best, ...b, amulet: a }) || changed;
        if (!changed) break;
      }
      return { cfg: best, dps: bestScore };
    };
    // Starts: the given config, the same config with each primary blood, and random restarts.
    const starts = [cfg, ...S.primaries.filter(p => p !== cfg.primary)
      .map(p => ({ ...cfg, primary: p, secondary: cfg.secondary && cfg.secondary.blood !== p ? cfg.secondary : null }))];
    const rng = mulberry32(9001);
    for (let i = 0; i < (opts.restarts ?? 1); i++) starts.push(randomCfg(stage, amulets, rng));
    starts.forEach(descend);
    return finish();
  }

  // opts.amulets restricts magic sources (e.g. PRE_DRACULA); log(msg) reports progress.
  function optimize(stage, log = () => {}, opts = {}) {
    const amulets = opts.amulets || STAGES[stage].amulets;
    const av = available(stage, { amulets });
    const cfg0 = defaultCfg(stage, amulets);
    const pairs = combos(av.spells, 2).filter(p => feasible(stage, p));
    const key = b => `${b.veil}|${b.s1}|${b.s2}|${b.ult}`;

    // A: rank spell pairs in several veil/ultimate contexts; keep the union of each context's top pairs.
    const veilCtx = ['Veil of Chaos', 'Veil of Bones', 'Veil of Frost', 'Veil of Blood', 'Veil of Shadow'].filter(v => av.veils.includes(v)).slice(0, 2);
    const ultCtx = ['Blood Storm', 'Chaos Barrage', 'Arctic Leap', 'Wisp Dance', 'Crimson Beam'].filter(u => av.ults.includes(u)).slice(0, 3);
    const keep = new Set();
    for (const v of veilCtx) for (const u of ultCtx) {
      const ranked = pairs.filter(p => feasible(stage, [...p, u]))
        .map(p => ({ p, dps: evaluate({ veil: v, s1: p[0], s2: p[1], ult: u }, cfg0, 3, 180).dps }))
        .sort((x, y) => y.dps - x.dps);
      ranked.slice(0, 14).forEach(r => keep.add(r.p.join('|')));
    }
    const topPairs = [...keep].map(k => k.split('|'));
    log(`A: ${pairs.length} feasible spell pairs x ${veilCtx.length * ultCtx.length} contexts -> ${topPairs.length} kept`);

    const phaseB = cfgUse => {
      const out = [];
      for (const [a, b] of topPairs) for (const v of av.veils) for (const u of av.ults) {
        if (!feasible(stage, [a, b, u])) continue;
        const build = { veil: v, s1: a, s2: b, ult: u };
        out.push({ build, ...evaluate(build, cfgUse, 3, 240) });
      }
      return out.sort((x, y) => y.dps - x.dps);
    };
    let B = phaseB(cfg0);
    log(`B: ${B.length} loadouts ranked`);

    // C: tune gear for the top loadouts (distinct ultimates first so each family gets tuned).
    const picks = []; const seenUlt = new Set();
    for (const r of B) if (!seenUlt.has(r.build.ult) && picks.length < 4) { picks.push(r); seenUlt.add(r.build.ult); }
    for (const r of B) if (picks.length < 10 && !picks.includes(r)) picks.push(r);
    const C = [];
    for (const r of picks) { C.push({ build: r.build, ...optimizeCfg(r.build, r.cfg, stage, amulets, 4, 300) }); log(`C: tuned ${C.length}/${picks.length}`); }
    C.sort((x, y) => y.dps - x.dps);

    // D: re-rank all loadouts with each of the 3 best distinct configs. Every (loadout, config) pair from
    // that re-rank and from C is a candidate; candidates are screened, then the best are confirmed.
    const cfgs = []; const seenCfg = new Set();
    for (const r of C) { const k = cfgKey(r.cfg); if (!seenCfg.has(k) && cfgs.length < 3) { seenCfg.add(k); cfgs.push(r.cfg); } }
    const cand = new Map();
    const addCand = (build, cfg, score) => {
      cfg = fixAmulet(build, cfg);
      const k = key(build) + '#' + cfgKey(cfg);
      if (!cand.has(k) || cand.get(k).score < score) cand.set(k, { build, cfg, score });
    };
    for (const c of cfgs) phaseB(c).slice(0, 16).forEach(r => addCand(r.build, r.cfg, r.dps));
    C.forEach(r => addCand(r.build, r.cfg, Infinity));          // tuned candidates always get screened
    const screened = [...cand.values()].sort((x, y) => y.score - x.score).slice(0, 26)
      .map(p => ({ ...p, quick: evaluate(p.build, p.cfg, 8, 300, { policies: 'full', seedBase: 300000 }).dps }))
      .sort((x, y) => y.quick - x.quick);
    log(`D: ${screened.length} candidates screened`);
    const final = screened.slice(0, 10).map(p => confirm(p.build, p.cfg)).sort((x, y) => y.dps - x.dps);
    log('D: confirmed');
    return { stage, pairs: topPairs, final };
  }

  // Named optimizer runs (run.js, index.html): a stage, or 'late-pre' = late game before the Dracula kill (no Dracula shard).
  const RUNS = {
    early: { stage: 'early' }, p4: { stage: 'p4' }, p5: { stage: 'p5' }, mid: { stage: 'mid' }, p7: { stage: 'p7' }, late: { stage: 'late' },
    'late-pre': { stage: 'late', amulets: PRE_DRACULA, label: 'Late game before Dracula (no Soul Shard of Dracula)' },
  };
  function optimizeRun(which, log) {
    const R = RUNS[which];
    if (!R) throw new Error(`Unknown run "${which}"; use ${Object.keys(RUNS).join(', ')}`);
    return { ...optimize(R.stage, log, R.amulets ? { amulets: R.amulets } : {}), run: which, label: R.label || STAGES[R.stage].label };
  }

  // Confirmation: pick the loadout's best rotation once (on separate seeds), then score it on fresh seeds
  // over a mix of fight lengths. The damage breakdown and casts returned are from the 600 s fights.
  // Every length uses the same seeds, so se is the standard error of the per-seed mix, not of each length.
  const FIGHT_LENGTHS = [90, 180, 300, 600];
  function confirm(build, cfg, runs = 32) {
    const policy = rankPolicies(build, cfg, 8, 300, 700000)[0].policy;
    const byLen = {}, mixVals = Array(runs).fill(0); let main = null;
    for (const d of FIGHT_LENGTHS) {
      const r = evaluate(build, cfg, runs, d, { policyList: [policy], seedBase: 500000 });
      byLen[d] = r.dps;
      r.vals.forEach((v, i) => { mixVals[i] += v / FIGHT_LENGTHS.length; });
      if (d === 600) main = r;
    }
    const dps = mixVals.reduce((a, b) => a + b, 0) / runs;
    const sd = Math.sqrt(mixVals.reduce((a, b) => a + (b - dps) ** 2, 0) / Math.max(1, runs - 1));
    return { build, ...main, dps, se: sd / Math.sqrt(runs), dps600: main.dps, se600: main.se, byLen };
  }

  global.VRCalc = { ASSUME, CAP, STAT_KEYS, POINTS, BLOOD, AMULET, ELIXIR, PASSIVE, ARMOR, MASTERY, COATING, CROSSBOW, WEAPON_SKILLS, PHYSICAL, WEAPON_ROLL, STAGES, PRE_DRACULA, ABILITIES, byName,
    POLICIES, FIGHT_LENGTHS, RUNS, cfgKey, confirm, rankPolicies, randomCfg, pointsAt, masteryTiers, buildStats, simulate, evaluate, optimize, optimizeRun, optimizeCfg, available, feasible, passivesFor, elixirsFor, coatingsFor, defaultCfg, fixAmulet };
  if (typeof module !== 'undefined') module.exports = global.VRCalc;
})(typeof window !== 'undefined' ? window : globalThis);
