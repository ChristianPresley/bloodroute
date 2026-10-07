// Saved-data tests (js/core.js BR.store): each route's progress lives under its own id in one localStorage
// entry, survives a reload, and moves between browsers through the backup file. Run: node --test
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./load');

const KEY = 'bloodroute:v1';
const open = storage => { const p = page(storage); p.run('js/core.js'); return p.window.BR.store; };

describe('saved data', () => {
  it('starts empty', () => {
    const s = open({});
    assert.equal(s.data.active, null);
    assert.deepEqual(Object.keys(s.data.routes), []);
  });

  it('keeps each route\'s ticks and stockpile apart and survives a reload', () => {
    const storage = {};
    const s = open(storage);
    for (const [id, tick, res] of [['spellcaster', 'p1-b0', 'Bone'], ['warrior', 'p3-b7', 'Iron Ingot'], ['rogue', 'p5-c0', 'Regular Ruby'], ['brute', 'p8-b4', 'Bat Leather']]) {
      const r = s.route(id);
      r.done[tick] = 1; r.stock[res] = 7;
      s.touch(id);
    }
    s.setActive('rogue');
    const again = open(storage);
    assert.equal(again.data.active, 'rogue');
    assert.deepEqual(Object.keys(again.data.routes).sort(), ['brute', 'rogue', 'spellcaster', 'warrior']);
    assert.deepEqual(JSON.parse(JSON.stringify(again.route('warrior').done)), { 'p3-b7': 1 });
    assert.deepEqual(JSON.parse(JSON.stringify(again.route('brute').stock)), { 'Bat Leather': 7 });
    assert.ok(again.route('warrior').updated > 0);
  });

  it('clears one route without touching the others', () => {
    const storage = {};
    const s = open(storage);
    s.route('warrior').done.x = 1; s.touch('warrior');
    s.route('brute').done.y = 1; s.touch('brute');
    s.setActive('warrior');
    s.clearRoute('warrior');
    const again = open(storage);
    assert.equal(again.data.active, null);
    assert.deepEqual(Object.keys(again.data.routes), ['brute']);
  });

  it('round-trips every route through a backup file', () => {
    const s = open({});
    s.route('warrior').done['p1-s0'] = 1; s.touch('warrior');
    s.route('rogue').stock['Crude Ruby'] = 4; s.touch('rogue');
    s.pref('hideDone', true);
    const backup = s.exportJSON();
    assert.equal(JSON.parse(backup).app, 'bloodroute');
    const other = open({});
    assert.equal(other.importJSON(backup), true);
    assert.equal(other.route('warrior').done['p1-s0'], 1);
    assert.equal(other.route('rogue').stock['Crude Ruby'], 4);
    assert.equal(other.pref('hideDone'), true);
  });

  it('refuses a file that is not a Bloodroute backup', () => {
    const s = open({});
    assert.throws(() => s.importJSON('{"routes":{}}'), /not a Bloodroute save file/);
    assert.throws(() => s.importJSON('not json'), { name: 'SyntaxError' });
  });

  it('recovers from a corrupt save', () => {
    const s = open({ [KEY]: '{oops' });
    assert.deepEqual(Object.keys(s.data.routes), []);
  });

  it('keeps stockpile counts for renamed materials, from a save or a backup', () => {
    const old = { v: 1, active: 'brute', prefs: {}, routes: { brute: { done: {}, stock: { 'Empty waterskin': 6, Bone: 3 } }, rogue: { done: {} } } };
    const s = open({ [KEY]: JSON.stringify(old) });
    assert.deepEqual(JSON.parse(JSON.stringify(s.route('brute').stock)), { Bone: 3, 'Empty Waterskin': 6 });
    const other = open({});
    other.importJSON(JSON.stringify({ app: 'bloodroute', ...old }));
    assert.equal(other.route('brute').stock['Empty Waterskin'], 6);
    assert.ok(!('Empty waterskin' in other.route('brute').stock));
  });

  it('carries over progress from the old single-route caster page', () => {
    const s = open({ 'vardoran-caster-path-v1': '{"p1-b1":1}', 'vardoran-caster-stock-v1': '{"Bone":32}' });
    assert.equal(s.data.active, 'spellcaster');
    assert.equal(s.route('spellcaster').done['p1-b1'], 1);
    assert.equal(s.route('spellcaster').stock.Bone, 32);
  });
});
