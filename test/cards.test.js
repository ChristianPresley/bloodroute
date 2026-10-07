// Hover card tests (js/cards.js): every kind of card renders with and without the game data (site/gamedata.js), the
// route-derived sections are there (how to get, why, when, replaced by, rotation, jewel picks, consumable use), the
// build's picks are starred, and timeline() follows the Spellcaster route. Run: node --test test/cards.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { modules } = require('./load');

// A page with the fixture game data (optional), core, the lexicon, the modules and the Spellcaster route.
function routePage({ game = true } = {}) {
  const p = modules({ game });
  p.run('routes/spellcaster/needs.js');
  let def = null;
  const BR = p.window.BR;
  const register = BR.registerRoute;
  BR.registerRoute = d => { def = d; };
  p.run('routes/spellcaster/route.js');
  BR.registerRoute = register;
  return { BR, window: p.window, def };
}
// Every ready archetype's route, loaded like the site does (shared.js first for the physical routes).
function archPages({ game = true } = {}) {
  const reg = modules();
  reg.run('routes/registry.js');
  return reg.window.BR.ARCHETYPES.filter(a => a.status === 'ready').map(arch => {
    const p = modules({ game });
    let def = null;
    p.window.BR.registerRoute = d => { def = d; };
    for (const f of arch.files) p.run(f);
    return { id: arch.id, BR: p.window.BR, window: p.window, def };
  });
}
const LEAK = /undefined|NaN|\[object Object\]/;
const kindOf = h => (/data-kind="([^"]+)"/.exec(h) || [])[1];
const titles = h => [...h.matchAll(/<h4>([^<]*)<\/h4>/g)].map(m => m[1]);
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const picks = h => [...h.matchAll(/<li class="pick[^"]*">(.*?)<\/li>/g)].map(m => text(m[1]).trim());
const phase = (def, n) => def.phases[n - 1];

// Every name the route shows: regions, bosses, rewards, step/craft icons, loadouts, materials.
function routeNames(def) {
  const names = new Set();
  for (const ph of def.phases) {
    (ph.regions || []).forEach(r => names.add(r));
    ph.bosses.forEach(b => { names.add(b.name); b.gets.forEach(g => names.add(g)); });
    [...(ph.steps || []), ...(ph.craft || [])].forEach(s => names.add(s.ic));
    (ph.access || []).forEach(([n]) => names.add(n));
    if (ph.loadout) { ph.loadout.slots.forEach(s => s.split(' or ').forEach(x => names.add(x))); ph.loadout.gear.forEach(g => names.add(g)); }
  }
  Object.keys(def.needs).forEach(n => names.add(n));
  ['Rain of Bolts', 'Snapshot', 'Veil attack', 'Primary attacks', 'Bandit Thug', 'Colosseum', 'Paper', 'Iron Ore', 'Mystery Widget'].forEach(n => names.add(n));
  return [...names];
}

// A two-phase route with the authored fields the cards read: info, rot, jewels, rolls, stage.
function testRoute() {
  const slots = ['Veil of Frost', 'Chaos Volley', 'Shadowbolt', 'Chaos Barrage'];
  const rot = {
    pre: ['Enchanted Brew', 'Elixir of the Prowler'],
    order: ['Chaos Volley', { n: 'Shadowbolt', when: 'right after the Volley lands' }, 'Veil of Frost', 'Veil attack'],
    fill: ['Rain of Bolts', 'Snapshot', 'Crossbow shot'],
    why: 'Volley first, so <b>Ignite</b> is up for the rest.',
  };
  return {
    id: 'test',
    phases: [
      {
        id: 'p1', title: 'Start', levels: '1 – 20', stage: 'Early', regions: ['Farbane Woods'],
        steps: [{ ic: 'Shadowbolt', t: 'Equip Shadowbolt (known from the start).' }],
        bosses: [{ lv: 20, name: 'Errol the Stonebreaker', must: true, map: 178451, gets: ['Chaos Volley'], take: 'Chaos T1 point → <b>Chaos Volley</b>.' }],
        craft: [{ ic: 'Enchanted Brew', t: '<b>Enchanted Brew</b> (+3 Spell Power, Alchemy Table): 32 Snow Flower + Fish Bone + Empty Waterskin.' }],
        loadout: {
          slots, rot, gear: ['Iron Crossbow', 'Primal jewel', 'Enchanted Brew', 'Elixir of the Prowler', 'Scholar'],
          jewels: { 'Chaos Volley': ['reduces cooldown', 'INCREASES DAMAGE'] },
        },
      },
      {
        id: 'p2', title: 'Later', levels: '20 – 40', stage: 'Mid', regions: ['Farbane Woods'],
        bosses: [{ lv: 37, name: 'Quincey the Bandit King', must: true, map: 178444, gets: ['Blood Storm'], take: 'Blood Storm.' }],
        craft: [{ ic: 'Ancestral Crossbow Shards', t: '<b>Ancestral Crossbow</b>: Iron Crossbow + 4 Onyx Tear.' }],
        loadout: {
          slots: ['Veil of Frost', 'Chaos Volley', 'Shadowbolt', 'Blood Storm'], rot,
          gear: ['Ancestral Crossbow Shards', 'Primal jewel', 'Enchanted Brew', 'Elixir of the Prowler', 'Scholar'],
          jewels: { 'Chaos Volley': ['reduces cooldown', 'INCREASES DAMAGE'] },
          rolls: ['spell critical strike chance', 'spell cooldown'],
        },
      },
    ],
    resources: { 'Snow Flower': [1, 'Snow Flower map layer'], 'Onyx Tear': [2, 'Recipe from Styx'], 'Iron Ingot': [1, 'Furnace, from Iron Ore'] },
    needs: {},
    info: {
      'Chaos Volley': { why: 'Your main damage spell.', upgrade: 'Keep it all game: nothing out-damages it per cast.' },
      'Enchanted Brew': { why: 'Cheap Spell Power.', use: 'Drink it before every V Blood fight; it lasts 60 minutes and survives death.', combo: ['Chaos Volley', 'Shadowbolt'] },
      'Iron Crossbow': { why: 'Half your damage this early.' },
    },
  };
}

// name, kind, ctx phase, what the card must say with the game data, and without it.
const CASES = [
  ['Iron Crossbow', 'weapon', 3, ['Stats', 'Physical Power', 'How to get', 'Smithy', 'Iron Ingot', 'Why', 'When', 'Upgrade / replace', 'Replaced by', 'Merciless Iron Crossbow', 'Rain of Bolts', 'Quincey'],
    ['How to get', 'Smithy', 'Iron Ingot', '×12', 'Plank', '×8', 'Why', 'When', 'Replaced by', 'Merciless Iron Crossbow', 'Rain of Bolts', 'Quincey']],
  ['Warlock Vest', 'armor', 2, ['Set: Warlock Vestment', '4 pieces:', 'Base item', 'Nightstalker Vest', 'Research Desk', '50 Paper', 'Replaced by', 'Dark Magus Chestguard'],
    ['How to get', 'Leather', 'Coarse Thread', 'Copper Ingot', 'Research Desk', 'Replaced by', 'Dark Magus Chestguard']],
  ['Gravedigger Ring', 'jewelry', 2, ['Grave Dust', 'Mourning Lily', 'Goreswine', 'Replaced by', 'Ring of the Sorcerer', 'Gear Level 9'],
    ['Grave Dust', '×12', 'Mourning Lily', '×32', 'Goreswine', 'Replaced by', 'Ring of the Sorcerer', 'Gear Level 9']],
  ['Ring of the Sorcerer', 'jewelry', 3, ['Gear Level 12', 'Artisan Table', 'Crude Amethyst', 'Greater Blood Essence', 'Base item', 'Gravedigger Ring', '60 Paper', 'Takes over from'],
    ['Crude Amethyst', '×4', 'Greater Blood Essence', 'Base item', 'Gravedigger Ring', 'Research Desk', 'Replaced by', 'Scourgestone Pendant']],
  ['Chaos Volley', 'spell', 5, ['Unlocked by', 'Errol', '8 s cooldown', 'Jewel mods', 'Agonizing Flames', 'Rotation · Phase 5', 'In the loadout'],
    ['Unlocked by', 'Errol', 'Rotation · Phase 5', 'Jewel mods', 'In the loadout']],
  ['Chaos Barrage', 'ult', 3, ['Ultimates take no jewels', 'Quincey', 'Replaced by', 'Blood Storm', 'Dracula'],
    ['Ultimates take no jewels', 'Quincey', 'Replaced by', 'Blood Storm', 'Dracula']],
  ['Veil of Frost', 'veil', 7, ['Frost', 'Vincent', 'In the loadout', 'Takes over from', 'Veil of Bones'], ['Vincent', 'Takes over from', 'Veil of Bones']],
  ['Rain of Bolts', 'weapon-skill', 3, ['Weapon skill', 'Crossbow', '8 s cooldown', 'Iron Crossbow'], ['Crossbow', 'Iron Crossbow']],
  ['Wolf Form', 'form', 1, ['Shapeshift form', 'How to get', 'Alpha'], ['How to get', 'Alpha']],
  ['Blood Hunger', 'ability', 4, ['Tristan', 'Phase 4'], ['Tristan', 'Phase 4']],
  ['Dominate', 'ability', 4, ['Phase 4', 'Servant Coffin'], ['Phase 4', 'Servant Coffin']],
  ['Primal jewel', 'jewel', 7, ['4 mods', 'Tier rules', 'Flawless Amethyst', 'Greater Stygian Shard', 'Valencia', 'Takes over from', 'Greater jewel'],
    ['4 mods', 'Tier rules', 'Greater Stygian Shard', '×320', 'Valencia', 'Takes over from', 'Greater jewel']],
  ['Enchanted Brew', 'consumable', 3, ['Effect', 'Spell Power +3 for 60 minutes', 'Use', 'How to get', 'Snow Flower', 'Fish Bone', 'Replaced by', 'Witch Potion'],
    ['Effect', '+3 Spell Power', 'Use', 'Snow Flower', '×32', 'Replaced by', 'Witch Potion']],
  ['Elixir of the Prowler', 'elixir', 5, ['Veil Cooldown Rate', 'Sunflower', 'Fire Blossom', 'Meredith', 'Replaced by', 'Elixir of the Bat', 'Enhances &amp; combos', 'Veil of Bones'],
    ['Sunflower', '×20', 'Fire Blossom', 'Meredith', 'Replaced by', 'Elixir of the Bat']],
  ['Unholy Coating', 'coating', 7, ['Corrupted Flower', 'Venom Sap', 'Stavros', 'Alchemy Table'], ['Corrupted Flower', '×16', 'Venom Sap', 'Stavros', 'Alchemy Table']],
  ['Errol the Stonebreaker', 'boss', 1, ['Lv 20', 'Stats', 'Physical Power', 'Attacks', 'Difficulty', 'Benefit', 'Drops &amp; unlocks', 'Chaos Volley', 'Unsullied Heart', '25%',
    'Why', 'Where', 'data-jump="Errol the Stonebreaker"', 'locationIds=178451', 'Farbane Woods'],
  ['Lv 20', 'Difficulty', 'Drops &amp; unlocks', 'Chaos Volley', 'Why', 'data-jump="Errol the Stonebreaker"', 'locationIds=178451']],
  ['Bandit Thug', 'enemy', 0, ['Lv 16', 'Warrior', 'Coarse Thread', '10%'], ['Lv 16', 'Warrior', 'Farbane Woods']],
  ['Farbane Woods (Tristan)', 'region', 4, ['Farbane Woods', 'here for Tristan', 'Tristan the Vampire Hunter', 'V Bloods here · Phase 4'],
    ['Farbane Woods', 'here for Tristan', 'Tristan the Vampire Hunter']],
  ['Colosseum', 'place', 5, ['Location', 'Gaius the Cursed Champion', 'Map Genie'], ['Location', 'Gaius the Cursed Champion', 'Map Genie']],
  ['Copper Ingot', 'material', 1, ['Where to get it', 'Furnace, from', 'Gattler', 'data-info="Gattler"', '21.7%', 'Made from', 'Copper Ore', '×20', 'Needed for', 'Phase 2', 'Warlock Vest', 'catIds=6091'],
    ['Where to get it', 'Furnace, from', 'Copper Ore', 'Needed for', 'Phase 2', 'Warlock Vest']],
  ['Iron Ingot', 'material', 3, ['Gear Level 12+', 'Iron Ore'], ['Gear Level 12+', 'Iron Ore']],
  ['Smithy', 'station', 3, ['Build cost', 'Iron Ingot', 'Quincey', 'This route crafts here', 'Iron Crossbow'], ['Unlocked by', 'Quincey', 'This route crafts here', 'Iron Crossbow']],
  ['Scholar', 'blood', 7, ['Blood bonuses', 'Tier III', 'Nun', 'In the loadout', 'Kept to the end'], ['Blood type', 'Kept to the end']],
  ['Enhanced Conductivity', 'passive', 5, ['Elemental passives', 'Cold Soul', 'Stygian Shard', 'Altar of Stygian Awakening', 'Passive slots open after'],
    ['Elemental passives', 'Cold Soul', 'Stygian Shard']],
  ['Veil attack', 'glyph', 0, ['Rotation step', 'empowered primary attack'], ['empowered primary attack']],
  ['Mystery Widget', 'unknown', 0, ['Mystery Widget'], ['Mystery Widget']],
];

describe('hover cards: every kind', () => {
  for (const game of [true, false]) {
    it(`renders each kind ${game ? 'with' : 'without'} the game data`, () => {
      const { BR, def } = routePage({ game });
      for (const [name, kind, n, withGame, bare] of CASES) {
        const h = BR.cards.render(name, { def, phase: n ? phase(def, n) : null, view: 'path' });
        assert.equal(kindOf(h), kind, `${name} should be a ${kind} card`);
        for (const s of game ? withGame : bare) assert.ok(h.includes(s), `${name} (${game ? 'game data' : 'no game data'}) should include "${s}"`);
        assert.doesNotMatch(h, LEAK, `${name} prints undefined/NaN/[object Object]`);
      }
    });
  }

  it('never prints undefined, NaN or [object Object], in any phase or view', () => {
    for (const game of [true, false]) {
      const { BR, def } = routePage({ game });
      for (const name of routeNames(def)) {
        for (const ctx of [{ def }, { def, view: 'stock' }, ...def.phases.map(p => ({ def, phase: p, view: 'path' }))]) {
          const h = BR.cards.render(name, ctx);
          assert.ok(h.startsWith('<article class="brc"'), `${name} renders a card`);
          assert.doesNotMatch(h, LEAK, `${name} (${game ? 'game' : 'no game'}, ${ctx.phase ? ctx.phase.id : ctx.view || 'no phase'})`);
        }
        assert.doesNotMatch(BR.cards.howToGet(name, { def }), LEAK, `howToGet(${name})`);
      }
    }
  });

  it('renders every name of every route, in every phase, with and without the game data', () => {
    for (const game of [true, false]) {
      for (const { id, BR, def } of archPages({ game })) {
        assert.ok(def, `${id} registers a route`);
        const tl = BR.cards.timeline(def);
        for (const ph of def.phases) for (const g of ph.loadout ? ph.loadout.gear : []) assert.ok(tl[g] && tl[g].first, `${id}: timeline has ${g}`);
        for (const name of routeNames(def)) {
          for (const ctx of [{ def, view: 'stock' }, ...def.phases.map(p => ({ def, phase: p, view: 'path' }))]) {
            const h = BR.cards.render(name, ctx);
            assert.doesNotMatch(h, LEAK, `${id}: ${name} (${game ? 'game' : 'no game'}, ${ctx.phase ? ctx.phase.id : ctx.view})`);
          }
        }
        // Authored rotations: each spell in a phase's rotation shows its place in it.
        for (const ph of def.phases.filter(p => p.loadout && p.loadout.rot)) {
          const order = (ph.loadout.rot.order || []).map(o => (typeof o === 'string' ? o : o.n));
          for (const n of order.filter(v => BR.lex.kindOf(v) === 'spell')) {
            const h = BR.cards.render(n, { def, phase: ph });
            assert.ok(titles(h).includes(`Rotation · Phase ${def.phases.indexOf(ph) + 1}`), `${id} ${ph.id}: ${n} has the phase's rotation`);
            assert.match(h, /Cast after|Opens the rotation|Last in the rotation|The only step/, `${id} ${ph.id}: ${n} says where it sits`);
          }
        }
      }
    }
  });

  it('copes with no route, odd names and broken game data', () => {
    const { BR, window } = routePage({ game: true });
    for (const name of ['Iron Crossbow', 'Errol the Stonebreaker', 'constructor', '__proto__', 'toString', '  ']) {
      for (const ctx of [undefined, null, {}, { def: null, phase: 3 }]) assert.doesNotMatch(BR.cards.render(name, ctx), LEAK, name);
    }
    window.BR_GAME.items['Iron Crossbow'] = { stats: [['Spell Power', 'lots', '']], gl: 'x', recipe: { inputs: [null, ['Plank']] }, drops: [{}], desc: { not: 'text' } };
    window.BR_GAME.npcs['Errol the Stonebreaker'] = { stats: { pp: null }, drops: [['Copper Ingot', 'often']], spawns: [[1], 'here'] };
    const { def } = routePage({ game: false });
    for (const name of ['Iron Crossbow', 'Errol the Stonebreaker']) assert.doesNotMatch(BR.cards.render(name, { def, phase: 3 }), LEAK, name);
  });

  it('escapes game text and names', () => {
    const { BR, window, def } = routePage({ game: true });
    window.BR_GAME.items['Iron Crossbow'].desc = '<script>alert(1)</script>';
    const h = BR.cards.render('Iron Crossbow', { def, phase: 3 });
    assert.ok(h.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    assert.ok(!h.includes('<script>'));
    const odd = BR.cards.render('<img src=x onerror=alert(1)>', { def });
    assert.ok(!odd.includes('<img src=x'), 'a name is never raw HTML');
  });

  it('accepts the phase as an object, id or number', () => {
    const { BR, def } = routePage({ game: true });
    for (const p of [phase(def, 5), 'p5', 5]) assert.ok(BR.cards.render('Chaos Volley', { def, phase: p }).includes('Rotation · Phase 5'), String(p.id || p));
  });

  it('does nothing outside a browser', () => {
    const { BR, def } = routePage({ game: true });
    assert.doesNotThrow(() => { BR.cards.init({ def, context: () => ({}) }); BR.cards.close(); });
  });
});

describe('hover cards: authored route content', () => {
  it('shows the rotation in order, with before/after and why', () => {
    const { BR } = routePage({ game: true });
    const def = testRoute();
    const sb = BR.cards.render('Shadowbolt', { def, phase: def.phases[0] });
    assert.ok(titles(sb).includes('Rotation · Phase 1'));
    assert.ok(sb.includes('Cast after <b>Chaos Volley</b>, before <b>Veil of Frost</b>.'), 'before/after');
    assert.ok(sb.includes('right after the Volley lands'), 'the step\'s when');
    assert.ok(sb.includes('Volley first, so <b>Ignite</b> is up for the rest.'), 'rot.why (route HTML)');
    assert.match(sb, /<li class="brc-rs ord cur"[^>]*aria-current="true"><b class="brc-rn">2<\/b>/, 'the hovered ability is highlighted, numbered 2');
    const order = [...sb.matchAll(/<li class="brc-rs (\w+)[^"]*"[^>]*>(?:<b[^>]*>\d+<\/b>)?<[^>]*data-info="([^"]+)"/g)].map(m => `${m[1]}:${m[2]}`);
    assert.deepEqual(order, ['pre:Enchanted Brew', 'pre:Elixir of the Prowler', 'ord:Chaos Volley', 'ord:Shadowbolt', 'ord:Veil of Frost', 'ord:Veil attack',
      'fill:Rain of Bolts', 'fill:Snapshot', 'fill:Crossbow shot'], 'pre → order → fill');
    assert.ok(BR.cards.render('Chaos Volley', { def, phase: 'p1' }).includes('Opens the rotation, before <b>Shadowbolt</b>.'));
    assert.ok(BR.cards.render('Veil attack', { def, phase: 'p1' }).includes('Last in the rotation, after <b>Veil of Frost</b>.'));
    assert.ok(BR.cards.render('Rain of Bolts', { def, phase: 'p1' }).includes('Fills the gaps'));
  });

  it('stars the build\'s jewel mods and Ancestral rolls', () => {
    const { BR } = routePage({ game: true });
    const def = testRoute();
    const cv = BR.cards.render('Chaos Volley', { def, phase: 'p1' });
    assert.deepEqual(picks(cv).sort(), ['★ Increases damage by 8 - 20% 8 - 20%', '★ Reduces cooldown by 8 - 12%. 8 - 12%']);
    assert.equal((cv.match(/<li>/g) || []).length, 4, 'the other four mods are listed too');
    assert.ok(cv.includes('Primal jewel') && cv.includes('4 mods'), 'the socketed jewel and its tier');
    const pj = BR.cards.render('Primal jewel', { def, phase: 'p1' });
    assert.ok(titles(pj).includes('Socketed · Phase 1'));
    assert.equal(picks(pj).length, 2);
    const anc = BR.cards.render('Ancestral Crossbow Shards', { def, phase: 'p2' });
    assert.deepEqual(picks(anc).sort(), ['★ Spell Cooldown Recovery Rate 6 - 12%', '★ Spell Critical Strike Chance 8 - 16%']);
    assert.ok(anc.includes('V Rising Wiki (CC BY-SA)'), 'credit for the wiki pools');
    const ult = BR.cards.render('Chaos Barrage', { def, phase: 'p1' });
    assert.ok(ult.includes('Ultimates take no jewels') && !picks(ult).length);
  });

  it('uses the route\'s why, use, combo and upgrade notes', () => {
    const { BR } = routePage({ game: true });
    const def = testRoute();
    const brew = BR.cards.render('Enchanted Brew', { def, phase: 'p1' });
    for (const s of ['Cheap Spell Power.', 'Drink it before every V Blood fight', 'Combos with', 'data-info="Shadowbolt"', 'Opens the rotation (Phase 1, 2): use it before', 'Boosts', 'data-info="Veil of Frost"'])
      assert.ok(brew.includes(s), `brew card: ${s}`);
    assert.deepEqual(titles(brew).slice(0, 3), ['Effect', 'Use', 'Enhances &amp; combos']);
    const cv = BR.cards.render('Chaos Volley', { def, phase: 'p1' });
    assert.ok(cv.includes('Your main damage spell.') && cv.includes('nothing out-damages it per cast'));
    const xb = BR.cards.render('Iron Crossbow', { def, phase: 'p1' });
    assert.ok(xb.includes('Half your damage this early.') && xb.includes('Replaced by') && xb.includes('Ancestral Crossbow'));
    assert.ok(xb.includes('Phase 2 · Later · Mid game'), 'the stage label from phase.stage');
    const ch = BR.cards.render('Chaos Barrage', { def, phase: 'p1' });
    assert.ok(ch.includes('after <span class="brc-ref"') && ch.includes('Quincey'), 'replaced after the boss that hands out the new one');
  });

  it('prefers the hovered phase\'s info over the base notes, field by field', () => {
    const { BR } = routePage({ game: true });
    const def = testRoute();
    def.info['Chaos Volley'].phases = { p2: { why: 'By Phase 2 it carries a Primal jewel.' } };
    const p1 = BR.cards.render('Chaos Volley', { def, phase: 'p1' }), p2 = BR.cards.render('Chaos Volley', { def, phase: 'p2' });
    assert.ok(p1.includes('Your main damage spell.') && !p1.includes('By Phase 2'));
    assert.ok(p2.includes('By Phase 2 it carries a Primal jewel.') && !p2.includes('Your main damage spell.'));
    assert.ok(p2.includes('nothing out-damages it per cast'), 'fields the phase leaves out come from the base');
    def.info['Enchanted Brew'].phases = { p2: { use: 'Phase 2: drink it with the elixir.' } };
    assert.ok(BR.cards.render('Enchanted Brew', { def, phase: 'p2' }).includes('Phase 2: drink it with the elixir.'));
  });

  it('lists a weapon\'s own skills from the game data', () => {
    const { BR, window } = routePage({ game: true });
    const def = testRoute();
    window.BR_GAME.items['Copper Crossbow'] = { kind: 'weapon', cat: 'Crossbow', gl: 8, skills: ['Rain of Bolts'] };
    def.phases[0].loadout.gear = def.phases[0].loadout.gear.map(g => (g === 'Iron Crossbow' ? 'Copper Crossbow' : g));
    const skills = h => (/<h4>Weapon skills<\/h4>(.*?)<\/section>/.exec(h) || [])[1] || '';
    const copper = skills(BR.cards.render('Copper Crossbow', { def, phase: 'p1' }));
    assert.ok(copper.includes('data-info="Rain of Bolts"') && !copper.includes('Snapshot'), 'Copper weapons only have the first skill');
    assert.ok(skills(BR.cards.render('Iron Crossbow', { def })).includes('data-info="Snapshot"'), 'Iron has both');
    assert.ok(!BR.cards.render('Snapshot', { def, phase: 'p1' }).includes('data-info="Copper Crossbow"'), 'Snapshot does not come with the Copper Crossbow');
  });

  it('falls back to what the route says when nothing is authored', () => {
    const { BR } = routePage({ game: false });
    const def = testRoute();
    delete def.info;
    def.phases.forEach(p => { delete p.loadout.rot; p.loadout.kv = [['Rotation', 'Volley → Shadowbolt → Veil; crossbow in between'], ['Why Veil of Frost', 'Its Chill turns on Cold Soul']]; });
    def.phases[0].craft.push({ ic: 'Iron Crossbow', t: '<b>Iron Crossbow</b> (Smithy): 12 Iron Ingot + 8 Plank. Your weapon until the Ancestral one.' });
    const xb = BR.cards.render('Iron Crossbow', { def, phase: 'p1' });
    assert.ok(titles(xb).includes('Why') && text(xb).includes('Your weapon until the Ancestral one'), 'why: the craft row');
    assert.ok(xb.includes('data-info="Iron Ingot"') && xb.includes('×12'), 'how to get: inputs read from the craft row');
    const cv = BR.cards.render('Chaos Volley', { def, phase: 'p1' });
    assert.ok(text(cv).includes('Chaos T1 point → Chaos Volley'), 'why: the take of the boss that hands it out');
    assert.ok(titles(cv).includes('Rotation · Phase 1') && text(cv).includes('Volley → Shadowbolt → Veil'), 'rotation: the kv Rotation note');
    assert.ok(text(BR.cards.render('Veil of Frost', { def, phase: 'p1' })).includes('Its Chill turns on Cold Soul'), 'why: a kv note naming it');
    const brew = BR.cards.render('Enchanted Brew', { def, phase: 'p1' });
    assert.ok(text(brew).includes('In the loadout: Phase 1 → Phase 2'), 'use: when the loadouts carry it');
    assert.ok(text(brew).includes('+3 Spell Power'), 'effect: from the craft row');
  });
});

describe('hover cards: how to get', () => {
  it('lists recipe inputs with their sources and map links', () => {
    const { BR, def } = routePage({ game: true });
    const h = BR.cards.howToGet('Copper Ingot', { def });
    assert.ok(h.includes('Craft at') && h.includes('data-info="Furnace"'));
    assert.ok(h.includes('data-info="Copper Ore"') && h.includes('×20'));
    assert.ok(h.includes('catIds=6091'), 'Map Genie layer for the ore');
    const vest = BR.cards.howToGet('Warlock Vest', { def });
    assert.ok(vest.includes('Base item') && vest.includes('data-info="Nightstalker Vest"'));
    assert.ok(text(vest).includes('Leather') && text(vest).includes('Tannery (Keely)'), 'each input has its own source line');
  });

  it('reads recipes from the route text without the game data', () => {
    const { BR, def } = routePage({ game: false });
    const xb = BR.cards.howToGet('Iron Crossbow', { def });
    assert.ok(xb.includes('data-info="Smithy"') && xb.includes('×12') && xb.includes('×8'));
    assert.ok(!/research/i.test(xb), 'Iron Crossbow is not a Study blueprint (that is Merciless Iron Crossbow)');
    const mi = BR.cards.howToGet('Merciless Iron Crossbow', { def });
    assert.ok(mi.includes('Base item') && mi.includes('data-info="Iron Crossbow"'));
    assert.ok(text(mi).includes('Study research: 90 Scrolls for a weapon or jewelry blueprint'));
    const el = BR.cards.howToGet('Elixir of the Prowler', { def });
    assert.ok(el.includes('data-info="Sunflower"') && el.includes('data-info="Fire Blossom"') && el.includes('×20'), 'from the boss take');
    const pc = BR.cards.howToGet('Prison Cell', { def });
    assert.ok(pc.includes('data-info="Iron Ingot"') && pc.includes('×8'));
    const rp = BR.cards.howToGet('Reinforced Plank', { def });
    assert.ok(!rp.includes('data-info="Iron Ingot"'), 'the Prison Cell recipe in the same take is not Reinforced Plank\'s');
  });

  it('notes Gear Level mining gates and research costs', () => {
    const { BR, def } = routePage({ game: true });
    assert.ok(text(BR.cards.howToGet('Silver Ore', { def })).includes('Gear Level 18+'));
    assert.ok(text(BR.cards.howToGet('Blood Crystal', { def })).includes('Gear Level 23+'));
    assert.ok(text(BR.cards.howToGet('Iron Ingot', { def })).includes('Gear Level 12+'));
    assert.ok(text(BR.cards.howToGet('Enchanted Brew', { def })).includes('50 Paper for an armour or consumable blueprint'));
  });
});

describe('hover cards: timeline', () => {
  const { BR, def } = routePage({ game: true });
  const tl = BR.cards.timeline(def);
  const rep = n => tl[n].replaced || {};

  it('finds when each loadout item arrives and what replaces it', () => {
    assert.equal(tl['Gravedigger Ring'].first.phase, 2);
    assert.equal(tl['Gravedigger Ring'].first.boss.name, 'Goreswine the Ravager');
    assert.deepEqual([rep('Gravedigger Ring').by, rep('Gravedigger Ring').phase], ['Ring of the Sorcerer', 3]);
    assert.deepEqual([tl['Iron Crossbow'].first.phase, tl['Iron Crossbow'].last, rep('Iron Crossbow').by, rep('Iron Crossbow').phase], [3, 4, 'Merciless Iron Crossbow', 5]);
    assert.equal(tl['Iron Crossbow'].first.boss.name, 'Quincey the Bandit King', 'crafted after the boss that unlocks it');
    assert.deepEqual([rep('Copper Crossbow').by, rep('Merciless Copper Crossbow').by, rep('Dark Silver Crossbow').by], ['Merciless Copper Crossbow', 'Iron Crossbow', 'Ancestral Crossbow Shards']);
    assert.deepEqual([rep('Blood Merlot Amulet').by, rep('Blood Key').by, rep('Blood Key').boss.name], ['Blood Key', 'Soul Shard of Dracula', 'Dracula the Immortal King']);
    assert.deepEqual([rep('Elixir of the Prowler').by, rep('Elixir of the Prowler').phase], ['Elixir of the Bat', 6]);
    assert.deepEqual([rep('Enchanted Brew').by, rep('Enchanted Brew').phase], ['Witch Potion', 7]);
    assert.deepEqual([rep('Regular jewel').by, rep('Greater jewel').by], ['Greater jewel', 'Primal jewel']);
    assert.deepEqual([rep('Warlock Vest').by, rep('Dark Magus Chestguard').by], ['Dark Magus Chestguard', 'Maleficer Scholar Chestguard']);
  });

  it('handles abilities, "X or Y" slots and mid-phase swaps', () => {
    assert.equal(tl['Starting dash'].first.how, 'start');
    assert.deepEqual([rep('Starting dash').by, rep('Starting dash').phase, rep('Starting dash').boss.name], ['Veil of Blood', 3, 'Beatrice the Tailor']);
    assert.equal(tl.Shadowbolt.first.how, 'start');
    assert.deepEqual([rep('Shadowbolt').by, rep('Shadowbolt').phase, rep('Shadowbolt').boss.name], ['Bone Explosion', 2, 'Goreswine the Ravager'], 'swapped within Phase 2');
    assert.equal(tl['Bone Explosion'].first.phase, 2);
    assert.deepEqual([rep('Bone Explosion').by, rep('Ball Lightning').by], ['Ball Lightning', 'Lightning Tendrils']);
    assert.deepEqual([tl['Chaos Barrage'].last, rep('Chaos Barrage').by, rep('Chaos Barrage').boss.name], [7, 'Blood Storm', 'Dracula the Immortal King']);
    assert.equal(tl['Chaos Volley'].replaced, undefined, 'kept all route');
    assert.equal(tl['Chaos Volley'].last, 8);
  });

  it('keeps blood and passives as sets', () => {
    assert.deepEqual([tl.Scholar.first.phase, tl.Scholar.last, tl.Scholar.replaced], [1, 8, undefined]);
    assert.equal(tl.Draculin.first.phase, 7);
    assert.deepEqual([rep('Lightning Fast Strikes').by, rep('Lightning Fast Strikes').phase], ['Cold Soul', 7], 'an elemental passive replaces an elemental one');
    assert.equal(tl['Wicked Power'].first.phase, 7);
    assert.equal(tl['Renewing Flames'].replaced, undefined);
  });

  it('lists rewards that never reach a loadout', () => {
    assert.deepEqual([tl['Wolf Form'].first.phase, tl['Wolf Form'].first.how, tl['Wolf Form'].first.boss.name, tl['Wolf Form'].last], [1, 'boss', 'Alpha the White Wolf', undefined]);
    assert.equal(tl.Smithy.first.boss.name, 'Quincey the Bandit King');
  });

  it('marks items that leave with nothing in their place', () => {
    const def2 = testRoute();
    def2.phases[1].loadout.gear = def2.phases[1].loadout.gear.filter(g => g !== 'Elixir of the Prowler');
    const t2 = BR.cards.timeline(def2);
    assert.deepEqual([t2['Elixir of the Prowler'].last, t2['Elixir of the Prowler'].left, t2['Elixir of the Prowler'].replaced], [1, 2, undefined]);
    assert.ok(BR.cards.render('Elixir of the Prowler', { def: def2, phase: 'p1' }).includes('Leaves the loadout after Phase 1'));
  });
});
