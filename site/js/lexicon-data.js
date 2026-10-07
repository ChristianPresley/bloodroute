// Bloodroute lexicon data: committed facts about V Bloods, regions, places, materials and passives that the game
// data (site/gamedata.js) doesn't carry. Loaded after js/core.js, before js/lexicon.js. Plain data only.
(() => {
  'use strict';
  window.BR.lexData = {
    // V Blood → { region (a REGIONS key), challenge 1–5 (how hard the fight is for its level: mechanics, adds,
    //   arena), note (one line on the fight; never "T1 point" or "(drop)" wording), roams? (true or text when it has no
    //   fixed spot), pos? [x, z] (only when the map data has no marker, e.g. Dracula), benefit? override tags }
    VBLOOD: {},
    // Region → { band (level band text), blurb (one line), aka: [short names used in route text], center: [x, z] }
    REGIONS: {},
    // Named place → { pos: [x, z], region, mg?: 'Map Genie location id(s)', approx: true, note? }
    PLACES: {},
    // Material → { layer?: gaming.tools resource layer id(s), raw?: the gathered material it's refined from,
    //   place?: a PLACES key, region: where to gather it, mg?: Map Genie category id }
    MATERIALS: {},
    // Stygian passive → its effect, one line
    PASSIVE_TEXT: {},
    // Ancestral weapon roll pool, used when site/gamedata.js has none: [{ text, range }]
    ROLL_POOL: [],
    // Names that match several gaming.tools entries → the id the routes mean
    ID_HINT: {},
    // Enemies the planner names (blood carriers, drop sources) → { lv, blood?, region }
    ENEMIES: {},
  };
})();
