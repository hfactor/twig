const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/core.js');
require('../src/examples.js');

const SET = C.SETS.unicode;
const WEBSITE = [[0,'Website'],[1,'Home'],[1,'Shop'],[2,'Beans'],[3,'Single origin'],[3,'Blends'],[2,'Brewing gear'],[2,'Subscriptions'],
  [1,'Learn'],[2,'Brew guides'],[2,'Glossary'],[1,'About'],[2,'Story'],[2,'Contact']].map(([depth, text]) => ({depth, text}));
const tree = items => C.renderItems(items, SET).lines.join('\n');
const plain = items => items.map(x => [x.depth, x.text]);

test('render then parse round-trips', () => {
  const items = WEBSITE;
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
  const roots = C.buildTree(C.cleanItems(WEBSITE));
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

test('link tokens parse and strip', () => {
  const p = C.parseLinks('Checkout @12 @@3');
  assert.strictEqual(p.text, 'Checkout');
  assert.deepStrictEqual(p.links, [{to: 12, indirect: false}, {to: 3, indirect: true}]);
  assert.strictEqual(C.parseLinks('mail me@12 now').links.length, 0);
});

test('links are drawn on the map and exported', () => {
  const items = C.convertTokens(C.parseDoc('Shop\n├── Cart @3\n└── Checkout @@1'));
  const roots = C.buildTree(C.cleanItems(items));
  C.assignBranches(roots);
  assert.strictEqual(roots[0].kids[0].text, 'Cart');
  const svg = C.buildSVG(roots, C.PAL.light).svg;
  assert.strictEqual((svg.match(/marker-end/g) || []).length, 2);
  assert.strictEqual((svg.match(/stroke-dasharray="6 5"/g) || []).length, 1);
  assert.deepStrictEqual(C.collectLinks(items).map(l => [l.from, l.to, l.indirect, l.k]), [[1, 2, false, 0], [2, 0, true, 1]]);
  assert.strictEqual(JSON.parse(C.toJSON(roots)).links.length, 2);
  assert.match(C.toMermaidGraph(roots), /n1 --> n2\n?[\s\S]*n2 -\.-> n0/);
  const tree = C.toTree(C.cleanItems(items), SET);
  assert.ok(tree.includes('◄') && !tree.includes('@'));
});

const linkSet = items => C.collectLinks(items).map(l => [items[l.from].text, items[l.to].text, l.indirect].join('>'));

test('link art is drawn into the text, the number goes, and the link reads back', () => {
  const items = C.convertTokens(C.parseDoc('Shop\n├── Cart @3\n│   └── Pay @@1\n└── Done'));
  assert.strictEqual(items[1].text, 'Cart');
  const text = C.renderDoc(items, SET).lines.join('\n');
  const lines = text.split('\n');
  assert.ok(!text.includes('@'));
  assert.ok(lines[0].includes('◄┄') && lines[1].includes('┐'));
  assert.strictEqual(lines[0].indexOf('◄'), C.LINE_LEN);
  const back = C.parseDoc(text);
  assert.deepStrictEqual(plain(back), plain(items));
  assert.deepStrictEqual(linkSet(back), linkSet(items));
  assert.strictEqual(C.renderDoc(back, SET).lines.join('\n'), text);
});

test('links follow their lines when lines are added in between', () => {
  const items = C.convertTokens(C.parseDoc('Shop\n├── Cart @3\n│   └── Pay\n└── Done'));
  items.splice(2, 0, ...Array.from({length: 20}, (_, k) => ({depth: 1, text: 'x' + k, links: []})));
  const back = C.parseDoc(C.renderDoc(items, SET).lines.join('\n'));
  assert.deepStrictEqual(linkSet(back), ['Cart>Pay>false']);
});

test('art is still read after typing moved a line sideways', () => {
  const lines = C.renderDoc(C.convertTokens(C.parseDoc('Shop\n├── Cart @3\n│   └── Pay\n└── Done')), SET).lines;
  const before = linkSet(C.parseDoc(lines.join('\n')));
  const typed = lines.slice();
  typed[2] = typed[2].replace('Pay', 'Pay now');
  const back = C.parseDoc(typed.join('\n'), {shift: [0, 0, 4, 0]});
  assert.deepStrictEqual(linkSet(back).map(s => s.replace('Pay now', 'Pay')), before);
});

test('the art column moves right in steps when a line is long', () => {
  const long = 'x'.repeat(C.LINE_LEN + 3);
  const items = C.convertTokens(C.parseDoc('A @2\nB ' + long));
  const lines = C.renderDoc(items, SET).lines;
  assert.strictEqual(lines[0].search(/[─◄┐]/), C.LINE_LEN + C.LINE_STEP);
});

test('a line with no links and no art stays plain', () => {
  assert.strictEqual(C.renderDoc(C.parseDoc('A\n└── B'), SET).lines.join('\n'), 'A\n└── B');
});

test('an indent that skips a level gets placeholder parents', () => {
  const src = '- a\n    - b\n            - c';
  assert.deepStrictEqual(plain(C.parseDoc(src, {imp: true, fill: 'TBD'})), [[0, 'a'], [1, 'b'], [2, 'TBD'], [3, 'c']]);
  assert.deepStrictEqual(plain(C.parseDoc(src, {imp: true})), [[0, 'a'], [1, 'b'], [2, 'c']]);
});

test('every example loads, every link resolves, and the art reads back', () => {
  C.EXAMPLES.forEach(ex => {
    const names = ex.lines.map(l => l[1]);
    const wanted = ex.lines.reduce((n, l) => n + l.length - 2, 0);
    ex.lines.forEach((l, i) => l.slice(2).forEach(t => {
      const name = t[0] === '~' ? t.slice(1) : t;
      assert.ok(names.includes(name), ex.name + ': no line named "' + name + '"');
      assert.strictEqual(names.filter(x => x === name).length, 1, ex.name + ': "' + name + '" is not unique');
      assert.notStrictEqual(name, l[1], ex.name + ': "' + name + '" links to itself');
    }));
    const items = C.convertTokens(C.exampleItems(ex.id));
    const text = C.renderDoc(items, SET).lines.join('\n');
    assert.ok(!text.includes('@'), ex.name + ' has an unresolved link');
    const back = C.parseDoc(text);
    assert.strictEqual(C.collectLinks(back).length, wanted, ex.name + ' link count');
    assert.strictEqual(back.length, ex.lines.length);
    assert.ok(ex.lines.length >= 15 && ex.lines.length <= 45, ex.name + ' should be a readable size');
    assert.ok(wanted <= ex.lines.length, ex.name + ' has too many links for its size');
  });
});

test('art start is the first drawn character, not the padding', () => {
  const text = C.renderDoc(C.convertTokens(C.parseDoc('A @2\nB')), SET).lines;
  assert.strictEqual(C.artStart(text[0]), C.LINE_LEN);
  assert.strictEqual(C.artStart('plain line'), -1);
});

test('a line can have an incoming and an outgoing link, and links can loop', () => {
  const items = C.convertTokens(C.parseDoc('A @2\nB @3\nC @1\nD'));
  const text = C.renderDoc(items, SET).lines.join('\n');
  const back = C.parseDoc(text);
  assert.deepStrictEqual(linkSet(back).sort(), ['A>B>false', 'B>C>false', 'C>A>false']);
  assert.ok(back[1].links.length === 1 && back.some(x => x.links.some(l => l.ref === back[1])));
  const mixed = C.convertTokens(C.parseDoc('A @3\nB @3 @@1\nC'));
  assert.deepStrictEqual(linkSet(C.parseDoc(C.renderDoc(mixed, SET).lines.join('\n'))).sort(), ['A>C>false', 'B>A>true', 'B>C>false']);
});

test('a typed @n only becomes a link once it is finished with a space', () => {
  const partial = C.parseDoc('A @1\nB');
  C.convertTokens(partial, {terminated: true});
  assert.strictEqual(partial[0].text, 'A @1');
  assert.strictEqual(C.collectLinks(partial).length, 0);
  const done = C.parseDoc('A\nB @1 ');
  C.convertTokens(done, {terminated: true});
  assert.strictEqual(done[1].text, 'B');
  assert.deepStrictEqual(linkSet(done), ['B>A>false']);
  const enter = C.parseDoc('A\nB @@1');
  C.convertTokens(enter);
  assert.deepStrictEqual(linkSet(enter), ['B>A>true']);
});

test('viewing one tree labels the links that cross to other trees', () => {
  const items = C.convertTokens(C.parseDoc('Evidence\n├── Slow setup\nProblems\n└── Users stall @2\nIdeas\n└── Checklist @4 '));
  const roots = C.buildTree(C.cleanItems(items));
  C.assignBranches(roots);
  const svg = C.buildSVG([roots[1]], C.PAL.light, {all: roots}).svg;
  assert.ok(svg.includes('→ Slow setup · Evidence'), 'outgoing label');
  assert.ok(svg.includes('← Checklist · Ideas'), 'incoming label');
  assert.strictEqual((svg.match(/class="node xref"/g) || []).length, 2);
  const whole = C.buildSVG(roots, C.PAL.light, {all: null}).svg;
  assert.ok(!whole.includes('xref'));
});
