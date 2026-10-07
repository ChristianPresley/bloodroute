// js/map.js: links, spec parsing and lookup, and the card map's markup. The viewer needs a DOM, so only the pure parts
// are tested here. Loads core.js and map.js alone (with a lexicon stub) so other modules can't break these tests.
const test = require('node:test');
const assert = require('node:assert');
const { page } = require('./load');

const LEX = {
  VBLOOD: {
    'Errol the Stonebreaker': { region: 'Farbane Woods' },
    'Alpha the White Wolf': { region: 'Farbane Woods', pos: [-1700, -1300] },
    'Dracula the Immortal King': { region: 'Ruins of Mortium', pos: [-78, -586] },
    Nibbles: { region: 'Farbane Woods', roams: 'Summoned at your castle' },
  },
  REGIONS: {
    'Farbane Woods': { center: [-1365, -880], band: '16–30', blurb: 'Woods', aka: ['Farbane'] },
    'Ruins of Mortium': { center: [-100, -600], r: 200 },
  },
  PLACES: {
    'Bandit Stronghold': { pos: [-1400, -1500], region: 'Farbane Woods', mg: '178222', approx: true },
    'Sunflower field': { pos: [-1000, -600], region: 'Dunley Farmlands', mg: '178301,178302', approx: true },
  },
  MATERIALS: {
    "Hell's Clarion": { place: 'Sunflower field', region: 'Dunley Farmlands', mg: '1234' },
    'Copper Ingot': { raw: 'Copper Ore', region: 'Farbane Woods' },
    'Ghost Yarn': { region: 'Silverlight Hills', mg: '777' },
  },
};

function load({ game = true, lex = true } = {}) {
  const p = page();
  if (game) p.run('../test/fixtures/gamedata.js');
  p.run('js/core.js');
  if (lex) p.window.BR.lexData = JSON.parse(JSON.stringify(LEX));
  p.run('js/map.js');
  return p.window.BR;
}
const json = v => JSON.parse(JSON.stringify(v));

test('href and parse round-trip specs with special characters', () => {
  const { map } = load();
  const specs = ["mat:Hell's Clarion", 'mat:Hell’s Clarion', 'boss:Errol the Stonebreaker', 'place:Bandit Stronghold', 'region:Farbane Woods',
    'phase:p3', 'route:p3', 'mg:178215,178231', 'cat:1234', 'boss:A & B <c> "q" #x%y?z=1+2', 'boss:Ünïcødé — test'];
  for (const s of specs) {
    const h = map.href(s);
    assert.match(h, /^#map=[^\s"<>#]+$/, `${s} → ${h}`);
    const q = map.parse(h);
    assert.ok(q, h);
    assert.strictEqual(q.spec, s);
    assert.strictEqual(q.type + ':' + q.arg, s.replace(/^(\w+):/, (m, t) => t.toLowerCase() + ':'));
  }
  assert.strictEqual(map.parse("map=mat%3AHell's%20Clarion").arg, "Hell's Clarion", 'leading # is optional');
  assert.strictEqual(map.parse("#map=mat:Hell's Clarion").arg, "Hell's Clarion", 'unencoded hashes work too');
  assert.strictEqual(map.parse('#map=%E0%A4%A').spec, '%E0%A4%A', 'malformed escapes fall back to the raw text');
  for (const bad of ['', '#', '#row-3', '#map=', '#mapx=boss:A', null, undefined]) assert.strictEqual(map.parse(bad), null, String(bad));
});

test('mini() places pins at percent positions from world coordinates', () => {
  const { map } = load();
  const at = p => map.mini({ pins: [{ p, kind: 'boss', label: 'X' }] });
  assert.match(at([-1365, -880]), /left:50%;top:50%/, 'map centre');
  assert.match(at([-1385, -880]), /left:49\.34%;top:50%/);
  assert.match(at([-2885, 640]), /left:0%;top:0%/, 'north-west corner');
  assert.match(at([155, -2400]), /left:100%;top:100%/, 'south-east corner');
  assert.deepStrictEqual(json(map.frac([-1365, -880])), [0.5, 0.5]);
  // Off-map and malformed points are dropped.
  assert.strictEqual(map.mini({ pins: [{ p: [9000, 9000], kind: 'boss' }, { p: ['a', 1] }, { p: null }] }), '');
});

test('mini() draws kinds, numbers, icons, region and the credit', () => {
  const BR = load();
  const h = BR.map.mini({
    title: 'Farbane bosses', region: 'Farbane', pins: [
      { p: [-1549, -1464], kind: 'boss', label: 'Errol the Stonebreaker', icon: 'Errol the Stonebreaker', n: 3 },
      { p: [-1812, -1829], kind: 'waygate', label: 'Waygate' },
      { p: [-1400, -1500], kind: 'place', label: 'Bandit Stronghold' },
      { p: [-1199, -1902], kind: 'node', label: 'Copper Ore' },
      { p: [-1500, -1400], kind: 'drop', label: 'Bandit Thug' },
    ],
  });
  assert.match(h, /^<div class="map-mini">/);
  assert.match(h, /src="map\/vardoran-760\.webp"/);
  assert.match(h, /aria-label="Farbane bosses"/);
  assert.match(h, /class="pin pin-boss has-ic num"[^>]*title="Errol the Stonebreaker"/);
  assert.match(h, /<b>3<\/b>/);
  assert.match(h, /pin-ic/);
  assert.ok(!/data-info=/.test(h), 'pin portraits are decorative (noinfo)');
  assert.match(h, /class="pin pin-waygate"/);
  assert.match(h, /class="pin pin-place"/);
  assert.match(h, /<path class="d-node" d="M\d+ \d+h0"\/>/);
  assert.match(h, /<path class="d-drop" d="M\d+ \d+h0"\/>/);
  assert.match(h, /class="map-region" style="left:50%;top:50%;width:19\.74%"/, 'region by alias, 300-unit default radius');
  assert.ok(h.includes('Map: V Rising Wiki · © Stunlock Studios'));
  assert.match(h, /Map image not downloaded\./);
  assert.ok(!/undefined|NaN/.test(h), h);
});

test('mini() caps dense node layers and keeps markup small', () => {
  const { map } = load();
  const pins = [];
  for (let i = 0; i < 2000; i++) pins.push({ p: [-2800 + (i % 50) * 50, -2300 + Math.floor(i / 50) * 60], kind: 'node', label: 'Iron Ore' });
  const h = map.mini({ pins });
  const dots = (h.match(/h0/g) || []).length;
  assert.ok(dots <= 300 && dots >= 250, `rendered ${dots} dots`);
  assert.ok(h.length < 6000, `markup is ${h.length} bytes`);
  // Spread over the whole layer, not just its first points.
  assert.match(h, /M\d+ 9\d\dh0/);
  assert.match(h, /M\d+ 1\d\dh0/);
});

test('mini() escapes labels and titles', () => {
  const { map } = load();
  const evil = `<img src=x onerror=alert(1)> "Hell's" & co`;
  const h = map.mini({ title: evil, spec: `boss:${evil}`, pins: [{ p: [-1365, -880], kind: 'boss', label: evil }, { p: [-1300, -800], kind: 'place', label: evil, n: '<i>' }] });
  assert.ok(!h.includes('<img src=x'), 'no raw markup from labels');
  assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt; &quot;Hell&#39;s&quot; &amp; co'));
  assert.ok(h.includes('<b>&lt;i&gt;</b>'));
  assert.match(h, /<a class="map-open" href="#map=boss%3A%3Cimg[^"]*">Open map<\/a>/);
});

test('mini() close-up: the 1520 image centred on the focus, kept inside the map', () => {
  const { map } = load();
  const pins = [{ p: [-1365, -880], kind: 'boss', label: 'Mid' }, { p: [-2885, 640], kind: 'boss', label: 'Corner' }];
  const h = map.mini({ pins, focus: [-1365, -880], crop: true });
  assert.match(h, /class="map-crop"/);
  assert.match(h, /src="map\/vardoran-1520\.webp"/);
  assert.match(h, /width:400%;transform:translate\(-50%,-50%\)/);
  const crop = h.slice(h.indexOf('map-crop-in'));
  assert.ok(crop.includes('title="Mid"') && !crop.includes('title="Corner"'), 'only pins inside the window');
  // A corner focus is clamped so the window stays on the map (half-window = 1/8 wide, 1/16 tall).
  assert.match(map.mini({ pins, focus: [-2885, 640], crop: true }), /translate\(-12\.5%,-6\.25%\)/);
  // Without a focus the first pin is used; without crop there is no close-up.
  assert.match(map.mini({ pins, crop: true }), /translate\(-50%,-50%\)/);
  assert.ok(!map.mini({ pins }).includes('map-crop'));
});

test('without BR_GAME or the lexicon, mini() still works from default bounds and lookups return null', () => {
  const { map } = load({ game: false, lex: false });
  assert.strictEqual(map.ready(), true);
  assert.strictEqual(map.mini(), '');
  assert.strictEqual(map.mini({}), '');
  assert.strictEqual(map.mini({ pins: [], region: 'Farbane Woods' }), '');
  assert.match(map.mini({ pins: [{ p: [-1365, -880], kind: 'boss', label: 'X' }] }), /left:50%;top:50%/);
  for (const s of ['boss:Errol the Stonebreaker', 'mat:Copper Ingot', 'place:Bandit Stronghold', 'region:Farbane Woods', 'enemy:Bandit Thug', 'phase:p3'])
    assert.strictEqual(map.lookup(s), null, s);
  assert.strictEqual(map.follow('#map=boss:Errol the Stonebreaker'), false);
});

test('lookup() resolves built-in specs from BR_GAME and the lexicon', () => {
  const { map } = load();
  const boss = json(map.lookup('boss:errol the stonebreaker'));
  assert.strictEqual(boss.title, 'Errol the Stonebreaker', 'case-insensitive, canonical name');
  assert.deepStrictEqual(boss.pins.map(p => [p.kind, p.label, p.icon, p.p]), [['boss', 'Errol the Stonebreaker', 'Errol the Stonebreaker', [-1549, -1464]]]);
  assert.deepStrictEqual(boss.focus, [-1549, -1464]);
  assert.strictEqual(boss.waygates, true);
  assert.deepStrictEqual(json(map.lookup('boss:Dracula the Immortal King')).pins[0].p, [-78, -586], 'lexicon position when there are no spawns');
  assert.strictEqual(map.lookup('boss:Nibbles'), null, 'no fixed spot');

  const mat = json(map.lookup('mat:Copper Ingot'));
  assert.strictEqual(mat.title, 'Where to find Copper Ingot');
  assert.deepStrictEqual(mat.layers, ['copper_ore']);
  assert.deepStrictEqual(json(map.lookup('mat:Coarse Thread')).layers, ['npc:char_bandit_thug']);
  const clarion = json(map.lookup('mat:Hell’s Clarion'));
  assert.strictEqual(clarion.title, "Where to find Hell's Clarion", 'curly apostrophe matches');
  assert.deepStrictEqual(clarion.pins.map(p => [p.kind, p.label, p.note]), [['place', 'Sunflower field', 'Approximate position']]);
  assert.match(clarion.links, /catIds=1234.*Map Genie/);
  assert.deepStrictEqual(json(map.lookup('mat:Ghost Yarn')), { external: 'https://mapgenie.io/v-rising/maps/vardoran?catIds=777' });
  assert.strictEqual(map.lookup('mat:Unobtainium'), null);

  const place = json(map.lookup('place:bandit stronghold'));
  assert.strictEqual(place.title, 'Bandit Stronghold');
  assert.deepStrictEqual(place.focus, [-1400, -1500]);
  assert.match(place.links, /locationIds=178222/);

  const region = json(map.lookup('region:Farbane'));
  assert.strictEqual(region.title, 'Farbane Woods');
  assert.strictEqual(region.region, 'Farbane Woods');
  assert.deepStrictEqual(region.pins.map(p => p.label).sort(), ['Alpha the White Wolf', 'Errol the Stonebreaker']);

  const mg = json(map.lookup('mg:178302'));
  assert.deepStrictEqual(mg.pins.map(p => p.label), ['Sunflower field']);
  assert.deepStrictEqual(json(map.lookup('mg:999,998')), { external: 'https://mapgenie.io/v-rising/maps/vardoran?locationIds=999,998' });
  assert.deepStrictEqual(json(map.lookup('cat:1234')).pins.map(p => p.label), ['Sunflower field']);
  assert.deepStrictEqual(json(map.lookup('cat:55')), { external: 'https://mapgenie.io/v-rising/maps/vardoran?catIds=55' });

  const enemy = json(map.lookup('enemy:Bandit Thug'));
  assert.deepStrictEqual(enemy.layers, ['npc:char_bandit_thug']);
  assert.strictEqual(map.lookup('phase:p3'), null, 'left to the app resolver');
});

test('follow() parses the hash, falls back to the resolver, and needs a DOM to open', () => {
  const { map } = load();
  const seen = [];
  map.resolve((spec, q) => { seen.push([spec, q.type, q.arg]); return spec === 'phase:p3' ? { title: 'Phase 3', pins: [] } : null; });
  assert.strictEqual(map.follow('#row-12'), false);
  assert.strictEqual(map.follow('#map=route%3Ap9'), false);
  assert.strictEqual(map.follow(map.href('phase:p3')), false, 'no DOM in the test VM, so nothing opens');
  assert.deepStrictEqual(seen, [['route:p9', 'route', 'p9'], ['phase:p3', 'phase', 'p3']]);
  assert.strictEqual(map.follow('#map=boss:Errol the Stonebreaker'), false, 'built-in specs do not reach the resolver');
  assert.strictEqual(seen.length, 2);
  assert.strictEqual(map.follow('#map=mg:999'), true, 'a Map Genie fallback counts as handled');
  map.resolve(() => { throw new Error('boom'); });
  const err = console.error; console.error = () => {};
  try { assert.strictEqual(map.follow('#map=phase:p1'), false, 'a failing resolver is contained'); } finally { console.error = err; }
  assert.strictEqual(map.open({ title: 'x' }), false);
  assert.doesNotThrow(() => map.close());
});
