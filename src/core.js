/* Pure logic: parsing, rendering, tree operations, map layout, exports. No DOM access. */
(function(root){
'use strict';

const SETS = {unicode: {v:'│   ', s:'    ', t:'├── ', l:'└── '}};
const PAL = {
  light:{surface:'#FFFFFF', ink:'#1F2328', muted:'#6E7781', tint:.12,
         b:['#3566E0','#E0782B','#2A9D6E','#C13E8E','#8A5CD6','#B8901A']},
  dark: {surface:'#1E1E1E', ink:'#D4D4D4', muted:'#858585', tint:.24,
         b:['#569CD6','#CE9178','#4EC9B0','#C586C0','#DCDCAA','#D16969']},
  blue: {surface:'#1A1B26', ink:'#C0CAF5', muted:'#565F89', tint:.22,
         b:['#7AA2F7','#FF9E64','#9ECE6A','#BB9AF7','#F7768E','#E0AF68']}
};
const SAMPLE = [[0,'Website'],[1,'Home'],[1,'Shop'],[2,'Beans'],[3,'Single origin'],[3,'Blends'],
  [2,'Brewing gear'],[2,'Subscriptions'],[1,'Learn'],[2,'Brew guides'],[2,'Glossary'],
  [1,'About'],[2,'Story'],[2,'Contact']];

/* Parsing accepts box-drawing lines and plain ASCII lines (so pasted output from any tool works).
   A connector group is 4 characters wide. Partial groups, from a deleted character, are tolerated. */
const STRICT  = /^(?:[│|] {3}| {4}|[├└][─-]{2} |[|`+\\]-- )/;
const REMNANT = /^(?:[├└│]|[|`+\\](?=-))[─-]*[ ]?/;
const HINT    = /^[ \t]*(?:[├└│]|[|`+\\]-|\| {3})/;

function repair(items){
  let prev = -1;
  for (const it of items){
    it.depth = Math.max(0, Math.min(it.depth, prev + 1));
    prev = it.depth;
  }
  return items;
}

function parseLine(raw, imp, unit){
  const s = raw.replace(/^[\t ]+/, m => m.replace(/\t/g, '    '));
  if (imp && !HINT.test(s)){
    const ws = /^ */.exec(s)[0].length;
    const t = s.slice(ws).replace(/^(?:[-*+•]|\d+[.)])\s+/, '');
    return {depth: Math.floor(ws / unit), text: t};
  }
  let depth = 0, rest = s, m;
  for (;;){
    if ((m = STRICT.exec(rest))){ rest = rest.slice(m[0].length); depth++; continue; }
    if ((m = REMNANT.exec(rest))){ rest = rest.slice(m[0].length).replace(/^ +(?=[├└│])/, ''); depth++; continue; }
    break;
  }
  rest = rest.replace(/^ +/, '');
  return {depth, text: rest};
}

/* opts.imp: pasted or opened text. Accepts indented outlines and bullet lists, drops blank lines. */
function parseDoc(text, opts){
  opts = opts || {};
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\u00A0/g, ' '));
  let unit = 4;
  if (opts.imp){
    const ws = lines.filter(l => l.trim() && !HINT.test(l))
      .map(l => /^[\t ]*/.exec(l)[0].replace(/\t/g, '    ').length).filter(n => n > 0);
    if (ws.length) unit = Math.max(1, Math.min.apply(null, ws));
  }
  const items = [];
  lines.forEach((raw, src) => {
    if (opts.imp && raw.trim() === '') return;
    const p = parseLine(raw, opts.imp, unit);
    items.push({depth: p.depth, text: p.text, src});
  });
  return repair(items);
}

function renderItems(items, set){
  const n = items.length, isLast = new Array(n), open = [];
  for (let i = n - 1; i >= 0; i--){
    const d = items[i].depth;
    isLast[i] = !open[d];
    open[d] = true;
    open.length = d + 1;
  }
  const path = [], lines = [], prefixLens = [];
  for (let i = 0; i < n; i++){
    const d = items[i].depth;
    path[d] = i; path.length = d + 1;
    let pre = '';
    for (let L = 1; L < d; L++) pre += isLast[path[L]] ? set.s : set.v;
    if (d > 0) pre += isLast[i] ? set.l : set.t;
    lines.push(pre + items[i].text);
    prefixLens.push(pre.length);
  }
  return {lines, prefixLens};
}

function subtreeEnd(items, i){
  let j = i + 1;
  while (j < items.length && items[j].depth > items[i].depth) j++;
  return j;
}
/* The branch(es) an operation acts on: node a with its subtree, plus later siblings that start at or before line b. */
function blockEnd(items, a, b){
  let e = subtreeEnd(items, a);
  while (e <= b && e < items.length && items[e].depth === items[a].depth) e = subtreeEnd(items, e);
  return e;
}
function ins(items, at, blk){ items.splice.apply(items, [at, 0].concat(blk)); }

/* Each operation returns the new index of line a, or -1 when nothing can change. */
function opIndent(items, a, b){
  if (a === 0 || items[a].depth > items[a - 1].depth) return -1;
  const e = blockEnd(items, a, b);
  for (let i = a; i < e; i++) items[i].depth++;
  return a;
}
function opOutdent(items, a, b){
  if (items[a].depth === 0) return -1;
  const e = blockEnd(items, a, b), d = items[a].depth;
  let pe = e;
  while (pe < items.length && items[pe].depth >= d) pe++;
  const blk = items.splice(a, e - a);
  blk.forEach(x => x.depth--);
  const at = pe - blk.length;
  ins(items, at, blk);
  return at;
}
function opMove(items, a, b, dir){
  const e = blockEnd(items, a, b), d = items[a].depth;
  if (dir < 0){
    let p = a - 1;
    while (p >= 0 && items[p].depth > d) p--;
    if (p < 0 || items[p].depth !== d) return -1;
    const blk = items.splice(a, e - a);
    ins(items, p, blk);
    return p;
  }
  if (e >= items.length || items[e].depth !== d) return -1;
  const ne = subtreeEnd(items, e);
  const nxt = items.splice(e, ne - e);
  ins(items, a, nxt);
  return a + nxt.length;
}
/* Set the indent level of a branch. Allowed levels are 0 .. (level of the line above) + 2.
   Going one past the natural limit adds a placeholder parent line above (with the given fill text), to fill in later. */
function opSetLevel(items, a, L, fill){
  const prev = a === 0 ? -1 : items[a - 1].depth;
  if (L < 0 || L > prev + 2 || L === items[a].depth) return -1;
  if (L === prev + 2){
    const delta = L - items[a].depth, e = subtreeEnd(items, a);
    for (let i = a; i < e; i++) items[i].depth += delta;
    items.splice(a, 0, {depth: prev + 1, text: fill || ''});
    return a + 1;
  }
  let idx = a;
  while (items[idx].depth < L){ if (opIndent(items, idx, idx) < 0) return -1; }
  while (items[idx].depth > L){ idx = opOutdent(items, idx, idx); if (idx < 0) return -1; }
  return idx;
}
/* Move a branch so it sits just before the given 1-based line. A line past the end moves it to the end. */
function opMoveTo(items, a, b, line){
  const n = items.length, e = blockEnd(items, a, b);
  let t = Math.max(0, Math.min(n, line - 1));
  if (t >= a && t < e) return -1;
  const delta = t < n ? items[t].depth - items[a].depth : 0;
  const blk = items.splice(a, e - a);
  if (t >= e) t -= blk.length;
  blk.forEach(x => { x.depth = Math.max(0, x.depth + delta); });
  ins(items, t, blk);
  repair(items);
  return t;
}
function opDuplicate(items, a, b){
  const e = blockEnd(items, a, b);
  const copy = items.slice(a, e).map(x => ({depth: x.depth, text: x.text}));
  ins(items, e, copy);
  return e;
}

/* keep: also keep nodes with no text (the live map shows them as dashed placeholders) */
function cleanItems(items, keep){
  const out = [];
  items.forEach((x, i) => { const t = x.text.trim(); if (t || keep) out.push({depth: x.depth, text: t, i}); });
  return repair(out);
}
function buildTree(clean){
  const roots = [], stack = [];
  clean.forEach(c => {
    const n = {text: c.text, i: c.i, depth: c.depth, kids: [], parent: null, branch: -1};
    stack.length = c.depth;
    if (c.depth === 0) roots.push(n);
    else { n.parent = stack[c.depth - 1]; n.parent.kids.push(n); }
    stack[c.depth] = n;
  });
  return roots;
}
function assignBranches(roots){
  let c = 0;
  const tag = (n, b) => { n.branch = b; n.kids.forEach(k => tag(k, b)); };
  roots.forEach(r => { r.branch = -1; r.kids.forEach(k => tag(k, (c++) % 6)); });
}

/* ---------- map layout (left to right) ---------- */
const M = {fs:14, cw:8.4, lh:19, px:14, py:9, gapx:58, gapy:10, margin:24, maxc:26};

function wrapText(text, max){
  const words = text.split(/\s+/), lines = [];
  let cur = '';
  for (let w of words){
    while (w.length > max){
      if (cur){ lines.push(cur); cur = ''; }
      lines.push(w.slice(0, max)); w = w.slice(max);
    }
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= max) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur || !lines.length) lines.push(cur);
  return lines;
}

function layoutMap(roots){
  const nodes = [], colW = [];
  (function walk(list){
    list.forEach(n => {
      nodes.push(n);
      n.empty = n.text === '';
      n.lines = n.empty ? ['…'] : wrapText(n.text, n.depth === 0 ? 32 : M.maxc);
      const mx = Math.max.apply(null, n.lines.map(l => l.length));
      n.w = Math.max(mx * M.cw + M.px * 2, n.empty ? 56 : 0);
      n.h = n.lines.length * M.lh + M.py * 2;
      colW[n.depth] = Math.max(colW[n.depth] || 0, n.w);
      walk(n.kids);
    });
  })(roots);
  const colX = []; let x = M.margin;
  colW.forEach((w, d) => { colX[d] = x; x += w + M.gapx; });
  let cursor = M.margin;
  const shift = (n, dy) => { n.y += dy; n.kids.forEach(k => shift(k, dy)); };
  const place = n => {
    n.x = colX[n.depth];
    if (!n.kids.length){ n.y = cursor + n.h / 2; cursor += n.h + M.gapy; return; }
    const start = cursor;
    n.kids.forEach(place);
    n.y = (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2;
    const top = n.y - n.h / 2;
    if (top < start){ const dy = start - top; shift(n, dy); cursor += dy; }
    cursor = Math.max(cursor, n.y + n.h / 2 + M.gapy);
  };
  roots.forEach((r, i) => { if (i) cursor += M.gapy; place(r); });
  if (!nodes.length) return {nodes, w: M.margin * 2, h: M.margin * 2};
  const last = colW.length - 1;
  return {nodes, w: Math.ceil(colX[last] + colW[last] + M.margin), h: Math.ceil(cursor - M.gapy + M.margin)};
}

function hexRGB(h){ return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); }
function mix(a, b, t){
  const pa = hexRGB(a), pb = hexRGB(b);
  return '#' + pa.map((v, i) => Math.round(v * t + pb[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}
function esc(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
const r1 = v => Math.round(v * 10) / 10;
const FONT = "ui-monospace,'Cascadia Mono','JetBrains Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace";

/* o.font: font stack for the text. o.ghost: text that marks a placeholder node, drawn dashed. */
function buildSVG(roots, P, o){
  o = o || {};
  const L = layoutMap(roots), font = o.font || FONT;
  let links = '', nodes = '';
  L.nodes.forEach(n => {
    n.kids.forEach(k => {
      const x1 = n.x + n.w, y1 = n.y, x2 = k.x, y2 = k.y, mx = (x1 + x2) / 2;
      links += '<path d="M' + r1(x1) + ' ' + r1(y1) + 'C' + r1(mx) + ' ' + r1(y1) + ' ' + r1(mx) + ' ' + r1(y2) + ' ' + r1(x2) + ' ' + r1(y2) +
        '" fill="none" stroke="' + P.b[k.branch] + '" stroke-width="' + (n.depth === 0 ? 2.6 : 2) + '" stroke-linecap="round" opacity=".85"/>';
    });
    const root = n.depth === 0, col = root ? P.ink : P.b[n.branch];
    let fill = root ? P.ink : mix(col, P.surface, P.tint), stroke = root ? fill : col, sw = root ? 0 : 1.5, tcol = root ? P.surface : P.ink, dash = '';
    if (n.empty || (o.ghost && n.text === o.ghost)){ fill = P.surface; stroke = root ? P.ink : col; sw = 1.5; tcol = P.muted; dash = ' stroke-dasharray="4 3"'; }
    let g = '<g class="node" data-i="' + n.i + '"><rect x="' + r1(n.x) + '" y="' + r1(n.y - n.h / 2) + '" width="' + r1(n.w) + '" height="' + r1(n.h) +
      '" rx="' + (root ? 11 : 8) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + dash + '/>';
    n.lines.forEach((ln, j) => {
      const y = n.y - n.h / 2 + M.py + j * M.lh + (M.lh - M.fs) / 2 + M.fs * 0.8;
      g += '<text x="' + r1(n.x + M.px) + '" y="' + r1(y) + '" font-family="' + font + '" font-size="' + M.fs +
        '" font-weight="' + (root ? 700 : 500) + '" fill="' + tcol + '" xml:space="preserve">' + esc(ln) + '</text>';
    });
    nodes += g + '</g>';
  });
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + L.w + '" height="' + L.h + '" viewBox="0 0 ' + L.w + ' ' + L.h +
    '" role="img" aria-label="Mind map"><rect width="100%" height="100%" fill="' + P.surface + '"/>' + links + nodes + '</svg>';
  return {svg, w: L.w, h: L.h};
}

/* ---------- exports ---------- */
function toTree(clean, set){
  return renderItems(clean, set).lines.map(s => s.replace(/\s+$/, '')).join('\n');
}
function toMarkdown(roots){
  const out = [];
  const bullet = (n, d) => { out.push('  '.repeat(d) + '- ' + n.text); n.kids.forEach(k => bullet(k, d + 1)); };
  if (roots.length === 1){ out.push('# ' + roots[0].text, ''); roots[0].kids.forEach(k => bullet(k, 0)); }
  else roots.forEach(r => bullet(r, 0));
  return out.join('\n');
}
function mm(s){ return s.replace(/[()\[\]{}"`]/g, ' ').replace(/\s+/g, ' ').trim() || '-'; }
function toMermaid(roots){
  const out = ['mindmap'];
  if (!roots.length) return 'mindmap\n  root((Empty))';
  const top = roots.length === 1 ? roots[0] : {text: 'Mind map', kids: roots};
  out.push('  root((' + mm(top.text) + '))');
  const go = (n, d) => { out.push('  '.repeat(d + 1) + mm(n.text)); n.kids.forEach(k => go(k, d + 1)); };
  top.kids.forEach(k => go(k, 1));
  return out.join('\n');
}
function xesc(s){ return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function toOPML(roots, title){
  const o = (n, ind) => n.kids.length
    ? ind + '<outline text="' + xesc(n.text) + '">\n' + n.kids.map(k => o(k, ind + '  ')).join('\n') + '\n' + ind + '</outline>'
    : ind + '<outline text="' + xesc(n.text) + '"/>';
  return '<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n  <head><title>' + xesc(title) + '</title></head>\n  <body>\n' +
    roots.map(r => o(r, '    ')).join('\n') + '\n  </body>\n</opml>\n';
}
function toJSON(roots){
  const plain = n => ({text: n.text, children: n.kids.map(plain)});
  return JSON.stringify(roots.length === 1 ? plain(roots[0]) : {text: 'Mind map', children: roots.map(plain)}, null, 2);
}
function slug(roots){
  const s = roots.length ? roots[0].text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) : '';
  return s || 'mind-map';
}
function sampleItems(){ return SAMPLE.map(a => ({depth: a[0], text: a[1]})); }

const Core = {SETS, PAL, repair, parseDoc, renderItems, subtreeEnd, blockEnd, opIndent, opOutdent, opMove, opSetLevel, opMoveTo, opDuplicate,
        cleanItems, buildTree, assignBranches, layoutMap, buildSVG, toTree, toMarkdown, toMermaid, toOPML, toJSON, slug, sampleItems};
if (typeof module !== 'undefined' && module.exports) module.exports = Core;
else root.Core = Core;
})(this);
