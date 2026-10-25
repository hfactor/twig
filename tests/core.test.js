const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/core.js');

const SET = C.SETS.unicode;
const tree = items => C.renderItems(items, SET).lines.join('\n');
const plain = items => items.map(x => [x.depth, x.text]);

test('render then parse round-trips', () => {
  const items = C.sampleItems();
  assert.deepStrictEqual(plain(C.parseDoc(tree(items))), plain(items));
});

test('parses ASCII tree output', () => {
  const src = 'root\n|-- a\n|   `-- b\n`-- c';
  assert.deepStrictEqual(plain(C.parseDoc(src)), [[0, 'root'], [1, 'a'], [2, 'b'], [1, 'c']]);
});

test('imports markdown bullets and indented outlines', () => {
  const src = '- one\n  - two\n    - three\n\n- four';
  assert.deepStrictEqual(plain(C.parseDoc(src, {imp: true})), [[0, 'one'], [1, 'two'], [2, 'three'], [0, 'four']]);
});

test('repair never lets a line jump more than one level', () => {
  assert.deepStrictEqual(C.repair([{depth: 3}, {depth: 5}]).map(x => x.depth), [0, 1]);
});

test('indent, outdent and move keep subtrees together', () => {
  const mk = () => [[0, 'a'], [0, 'b'], [1, 'c'], [0, 'd']].map(([depth, text]) => ({depth, text}));
  let it = mk();
  assert.strictEqual(C.opIndent(it, 1, 1), 1);
  assert.deepStrictEqual(it.map(x => x.depth), [0, 1, 2, 0]);
  it = mk();
  assert.strictEqual(C.opMove(it, 1, 1, 1), 2);
  assert.deepStrictEqual(it.map(x => x.text), ['a', 'd', 'b', 'c']);
  it = mk();
  assert.strictEqual(C.opIndent(it, 0, 0), -1);
});

test('map layout and exports handle a sample tree', () => {
  const roots = C.buildTree(C.cleanItems(C.sampleItems()));
  C.assignBranches(roots);
  const out = C.buildSVG(roots, C.PAL.light);
  assert.match(out.svg, /^<svg /);
  assert.strictEqual((out.svg.match(/class="node"/g) || []).length, 14);
  assert.match(C.toMermaid(roots), /^mindmap\n {2}root\(\(Website\)\)/);
  assert.match(C.toOPML(roots, 'T'), /<opml version="2.0">/);
  assert.strictEqual(JSON.parse(C.toJSON(roots)).text, 'Website');
  assert.strictEqual(C.slug(roots), 'website');
});

test('svg escapes node text', () => {
  const roots = C.buildTree(C.cleanItems([{depth: 0, text: '<b>&"x"'}]));
  C.assignBranches(roots);
  assert.ok(!C.buildSVG(roots, C.PAL.light).svg.includes('<b>'));
});

test('setting a level two below the line above adds an empty parent', () => {
  const it = [[0, 'a'], [1, 'b'], [0, 'c']].map(([depth, text]) => ({depth, text}));
  assert.strictEqual(C.opSetLevel(it, 2, 3), 3);
  assert.deepStrictEqual(plain(it), [[0, 'a'], [1, 'b'], [2, ''], [3, 'c']]);
  assert.strictEqual(C.opSetLevel(it, 3, 5), -1);
});

test('placeholder parent uses the fill text and is drawn dashed', () => {
  const it = [[0, 'a'], [1, 'b'], [0, 'c']].map(([depth, text]) => ({depth, text}));
  C.opSetLevel(it, 2, 3, 'TBD');
  assert.strictEqual(it[2].text, 'TBD');
  const roots = C.buildTree(C.cleanItems(it));
  C.assignBranches(roots);
  const svg = C.buildSVG(roots, C.PAL.light, {ghost: 'TBD'}).svg;
  assert.strictEqual((svg.match(/stroke-dasharray/g) || []).length, 1);
});
