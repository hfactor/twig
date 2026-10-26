/* Pure logic: parsing, link art, tree operations, map layout, exports. No DOM access. */
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
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\u00A0/g, ' '));
  const artLinks = readArt(rawLines, opts.shift);
  const lines = rawLines.map(stripArt);
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
    items.push({depth: p.depth, text: p.text, src, links: []});
  });
  /* an indent that skips a level gets placeholder parents (opts.fill) instead of being flattened */
  if (opts.fill){
    const out = [];
    let prev = -1;
    items.forEach(it => {
      if (it.text.trim() !== '' && it.depth > prev + 1){
        for (let d = prev + 1; d < it.depth; d++) out.push({depth: d, text: opts.fill, links: []});
        prev = it.depth;
      } else prev = Math.max(0, Math.min(it.depth, prev + 1));
      out.push(it);
    });
    items.length = 0;
    out.forEach(it => items.push(it));
  }
  const bySrc = new Map(items.filter(it => it.src !== undefined).map(it => [it.src, it]));
  artLinks.forEach(l => {
    const a = bySrc.get(l.from), b = bySrc.get(l.to);
    if (a && b && a !== b && !a.links.some(x => x.ref === b && x.indirect === l.indirect)) a.links.push({ref: b, indirect: l.indirect});
  });
  return repair(items);
}

/* ---------- link art ----------
   Links are drawn into the text, to the right of each line, like the tree prefix on the left, and are read back from it.
   A link is a column of │ (or ┊ when indirect) joining two lines. Each end turns into a corner: ┐ ┘ at the line the link
   starts on, rounded ╮ ╯ at the line it points to (also marked ◄). The cell left of a starting corner says solid (─) or dotted (┄).
   The art column starts at LINE_LEN and moves right by LINE_STEP when a line is longer. */
const ART = / +[─┄│┊┐┘┼╮╯◄][─┄│┊┐┘┼╮╯◄ ]*$/;
const LINE_LEN = 40, LINE_STEP = 8;
function stripArt(line){ return line.replace(ART, ''); }
/* Column where the art on this line starts (its first drawn character), or -1 if there is none. */
function artStart(line){
  const m = ART.exec(line);
  return m ? m.index + m[0].length - m[0].replace(/^ +/, '').length : -1;
}

/* Read links from the art on each line. shift[i] says how far line i's art moved since it was drawn (null: ignore its art). */
function readArt(lines, shift){
  const rows = lines.map((l, i) => {
    const m = ART.exec(l), d = shift ? shift[i] : 0;
    if (!m || d === null) return null;
    const cells = [];
    for (let k = 0; k < m[0].length; k++) if (m[0][k] !== ' ') cells.push([m.index + k - (d || 0), m[0][k]]);
    return cells;
  });
  let A = Infinity, maxc = 0;
  rows.forEach(r => { if (r && r.length) A = Math.min(A, r[0][0]); });
  if (A === Infinity) return [];
  rows.forEach(r => { if (r) r.forEach(x => { maxc = Math.max(maxc, x[0] - A); }); });
  const at = (r, c) => { const cell = rows[r] && rows[r].find(x => x[0] - A === c); return cell ? cell[1] : ''; };
  const out = [];
  for (let vc = 2; vc <= maxc; vc += 2){
    let top = null;
    for (let r = 0; r < rows.length; r++){
      const ch = at(r, vc);
      if (ch === '┐' || ch === '╮') top = {r, ch};
      else if ((ch === '┘' || ch === '╯') && top){
        const targetTop = top.ch === '╮', targetBottom = ch === '╯' && !targetTop;
        const from = targetTop ? r : top.r, to = targetTop ? top.r : r;
        out.push({from, to: targetBottom || targetTop ? to : r, indirect: at(from, vc - 1) === '┄'});
        top = null;
      }
    }
  }
  return out;
}

/* links: from collectLinks. Returns one string per line (empty where nothing is drawn). */
function linkArt(links, n){
  const spans = links.filter(l => l.to >= 0 && l.to < n && l.to !== l.from)
    .map(l => ({l, a: Math.min(l.from, l.to), b: Math.max(l.from, l.to)}))
    .sort((p, q) => p.a - q.a || (q.b - q.a) - (p.b - p.a));
  const ends = [];
  spans.forEach(s => { let k = 0; while (ends[k] !== undefined && ends[k] >= s.a) k++; ends[k] = s.b; s.track = k; });
  const cols = 2 * Math.max(1, ends.length) + 1;
  const grid = Array.from({length: n}, () => new Array(cols).fill(' '));
  const kind = Array.from({length: n}, () => new Array(cols).fill(''));
  const put = (r, c, ch, k) => { grid[r][c] = ch; kind[r][c] = k; };
  spans.forEach(s => {
    const vt = s.l.indirect ? '┊' : '│', vc = 2 + 2 * s.track;
    for (let r = s.a + 1; r < s.b; r++) put(r, vc, vt, 'v');
  });
  spans.forEach(s => {
    const hz = s.l.indirect ? '┄' : '─', vc = 2 + 2 * s.track;
    [s.l.from, s.l.to].forEach(r => { for (let c = 0; c < vc; c++) put(r, c, kind[r][c] === 'v' ? '┼' : hz, 'h'); });
    put(s.l.to, 0, '◄', 'h');
  });
  spans.forEach(s => {
    const vc = 2 + 2 * s.track, down = s.l.to > s.l.from;
    put(s.l.from, vc, down ? '┐' : '┘', 'c');
    put(s.l.to, vc, down ? '╯' : '╮', 'c');
  });
  spans.forEach(s => put(s.l.from, 2 + 2 * s.track - 1, s.l.indirect ? '┄' : '─', 'h'));
  return grid.map(row => row.join('').replace(/\s+$/, ''));
}

/* renderItems plus the link art. Use this wherever text is written back to the editor. */
function renderDoc(items, set){
  const r = renderItems(items, set);
  const art = linkArt(collectLinks(items), items.length);
  if (!art.some(Boolean)) return r;
  let col = LINE_LEN;
  const longest = Math.max.apply(null, r.lines.map(l => l.replace(/\s+$/, '').length));
  while (col < longest + 2) col += LINE_STEP;
  r.lines = r.lines.map((l, i) => art[i] ? l.padEnd(col) + art[i] : l);
  return r;
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

/* ---------- links ---------- */
/* Typing @12 (direct) or @@12 (indirect) at the end of a line links it to line 12. Once drawn, the number is dropped:
   from then on the link is the drawn line, tied to the two lines it joins, so inserting lines never breaks it.
   Items carry links as {ref: item, indirect}. */
const TAIL = /(?:(?:^|\s+)@@?\d+)+\s*$/;
function parseLinks(text){
  const m = TAIL.exec(text);
  if (!m) return {text, links: [], suffix: ''};
  const links = Array.from(m[0].matchAll(/@(@?)(\d+)/g), x => ({to: +x[2], indirect: x[1] === '@'}));
  return {text: text.slice(0, m.index), links, suffix: m[0]};
}
/* Turn typed @n tokens into real links. Tokens that point nowhere stay as text.
   opts.terminated: only tokens already followed by a space, so @1 is left alone while you are still typing @12. */
function convertTokens(items, opts){
  items.forEach(it => {
    const p = parseLinks(it.text);
    if (!p.links.length) return;
    if (opts && opts.terminated && !/\s$/.test(it.text)) return;
    const left = [];
    if (!it.links) it.links = [];
    p.links.forEach(l => {
      const t = items[l.to - 1];
      if (t && t !== it){ if (!it.links.some(x => x.ref === t && x.indirect === l.indirect)) it.links.push({ref: t, indirect: l.indirect}); }
      else left.push((l.indirect ? '@@' : '@') + l.to);
    });
    it.text = p.text + (left.length ? ' ' + left.join(' ') : '');
  });
  return items;
}
function cloneItems(items){
  const copies = items.map(x => ({depth: x.depth, text: x.text, src: x.src, links: []})), at = new Map(items.map((x, i) => [x, i]));
  items.forEach((x, i) => (x.links || []).forEach(l => { if (at.has(l.ref)) copies[i].links.push({ref: copies[at.get(l.ref)], indirect: l.indirect}); }));
  return copies;
}
/* All links in a document as {from, to, indirect, k} (0-based line numbers). Typed @n tokens are not links until convertTokens runs. */
function collectLinks(items){
  const at = new Map(items.map((x, i) => [x, i])), out = [], seen = new Set();
  const add = (from, to, indirect) => {
    const key = from + '>' + to + (indirect ? '~' : '');
    if (to < 0 || to >= items.length || to === from || seen.has(key)) return;
    seen.add(key); out.push({from, to, indirect, k: out.length});
  };
  items.forEach((x, i) => {
    (x.links || []).forEach(l => { if (at.has(l.ref)) add(i, at.get(l.ref), l.indirect); });
  });
  return out;
}

/* Items without link tokens, ready for the map and exports. keep: also keep nodes with no text (the live map shows them as dashed placeholders) */
function cleanItems(items, keep){
  const out = [], by = new Map();
  collectLinks(items).forEach(l => { if (!by.has(l.from)) by.set(l.from, []); by.get(l.from).push({to: l.to + 1, indirect: l.indirect, k: l.k}); });
  items.forEach((x, i) => { const t = parseLinks(x.text).text.trim(); if (t || keep) out.push({depth: x.depth, text: t, i, links: by.get(i) || []}); });
  return repair(out);
}
function buildTree(clean){
  const roots = [], stack = [];
  clean.forEach(c => {
    const n = {text: c.text, i: c.i, depth: c.depth, kids: [], parent: null, branch: -1, links: c.links || []};
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
const M = {fs:14, cw:8.4, lh:19, px:15, py:10, gapx:72, gapy:12, margin:28, maxc:26};

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

/* Links that would run through a node's children, or point at a tree that is not on screen, are drawn as a small labelled
   node instead, such as "→ Investigate" or "→ Setup is confusing · Interview themes", as an extra leaf of the node the link touches.
   Only links between two leaf nodes in view become arrows. Works on a copy. */
function withRefs(roots, all){
  const info = new Map(), drawn = new Set();
  all.forEach(r => eachNode([r], n => info.set(n.i, {text: n.text, tree: r.text, leaf: n.kids.length === 0})));
  eachNode(roots, n => drawn.add(n.i));
  const short = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
  const label = (arrow, line, own) => { const x = info.get(line); return arrow + ' ' + short(x.text, 24) + (x.tree !== own ? ' · ' + short(x.tree, 18) : ''); };
  const incoming = new Map();
  eachNode(all, a => {
    if (drawn.has(a.i)) return;
    a.links.forEach(l => {
      const t = l.to - 1;
      if (!drawn.has(t)) return;
      if (!incoming.has(t)) incoming.set(t, []);
      incoming.get(t).push({line: a.i, dir: 'in', indirect: l.indirect, text: label('←', a.i, info.get(t).tree)});
    });
  });
  const copy = (n, own) => {
    const c = {text: n.text, i: n.i, depth: n.depth, branch: n.branch, links: [], parent: null, kids: n.kids.map(k => copy(k, own))};
    const refs = [];
    n.links.forEach(l => {
      const t = l.to - 1, target = info.get(t);
      if (!target) return;
      if (drawn.has(t) && n.kids.length === 0 && target.leaf) c.links.push(l);
      else refs.push({line: t, dir: 'out', indirect: l.indirect, text: label('→', t, own)});
    });
    (incoming.get(n.i) || []).forEach(r => refs.push(r));
    refs.forEach(r => c.kids.push({text: r.text, i: null, depth: c.depth + 1, branch: Math.max(0, c.branch), links: [], kids: [], parent: null, ref: r}));
    return c;
  };
  return roots.map(r => copy(r, r.text));
}

/* o.font: font stack for the text. o.ghost: text that marks a placeholder node, drawn dashed. */
function buildSVG(roots, P, o){
  o = o || {};
  const L = layoutMap(withRefs(roots, o.all || roots)), font = o.font || FONT;
  let links = '', nodes = '';
  const byLine = new Map(L.nodes.map(n => [n.i, n]));
  let cross = '';
  L.nodes.forEach(n => {
    n.kids.forEach(k => {
      let x1 = n.x + n.w, y1 = n.y, x2 = k.x, y2 = k.y;
      if (k.ref){
        /* link to or from another tree: dotted-grey stub, arrow pointing the way the link goes */
        if (k.ref.dir === 'in'){ [x1, y1, x2, y2] = [x2, y2, x1, y1]; }
        const mx0 = (x1 + x2) / 2;
        cross += '<path d="M' + r1(x1) + ' ' + r1(y1) + 'C' + r1(mx0) + ' ' + r1(y1) + ' ' + r1(mx0) + ' ' + r1(y2) + ' ' + r1(x2) + ' ' + r1(y2) +
          '" fill="none" stroke="' + P.muted + '" stroke-width="1.4"' + (k.ref.indirect ? ' stroke-dasharray="6 5"' : '') + ' marker-end="url(#twah)" opacity=".85"/>';
        return;
      }
      const mx = (x1 + x2) / 2;
      links += '<path d="M' + r1(x1) + ' ' + r1(y1) + 'C' + r1(mx) + ' ' + r1(y1) + ' ' + r1(mx) + ' ' + r1(y2) + ' ' + r1(x2) + ' ' + r1(y2) +
        '" fill="none" stroke="' + P.b[k.branch] + '" stroke-width="' + (n.depth === 0 ? 2.2 : 1.6) + '" stroke-linecap="round" opacity=".55"/>';
    });
    const root = n.depth === 0, col = root ? P.ink : P.b[n.branch];
    let fill = root ? P.ink : mix(col, P.surface, P.tint), stroke = root ? fill : mix(col, P.surface, .55), sw = root ? 0 : 1, tcol = root ? P.surface : P.ink, dash = '';
    if (n.empty || (o.ghost && n.text === o.ghost)){ fill = P.surface; stroke = root ? P.ink : mix(col, P.surface, .8); sw = 1.25; tcol = P.muted; dash = ' stroke-dasharray="4 3"'; }
    if (n.ref){ fill = P.surface; stroke = P.muted; sw = 1; tcol = P.muted; dash = ' stroke-dasharray="3 3"'; }
    let g = '<g class="node' + (n.ref ? ' xref" data-ref="' + n.ref.line : '" data-i="' + n.i) + '"><rect x="' + r1(n.x) + '" y="' + r1(n.y - n.h / 2) + '" width="' + r1(n.w) + '" height="' + r1(n.h) +
      '" rx="' + (root ? 14 : 10) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + dash + '/>';
    n.lines.forEach((ln, j) => {
      const y = n.y - n.h / 2 + M.py + j * M.lh + (M.lh - M.fs) / 2 + M.fs * 0.8;
      g += '<text x="' + r1(n.x + M.px) + '" y="' + r1(y) + '" font-family="' + font + '" font-size="' + M.fs +
        '" font-weight="' + (root ? 700 : 500) + '" fill="' + tcol + '" xml:space="preserve">' + esc(ln) + '</text>';
    });
    nodes += g + '</g>';
  });
  /* Links between nodes run in lanes to the right of the whole map: out of the node's right edge, along a lane, back in
     to the target's right edge. Lanes are shared when links do not overlap vertically. */
  const hops = [];
  L.nodes.forEach(n => n.links.forEach(l => {
    const t = byLine.get(l.to - 1);
    if (t && t !== n) hops.push({n, t, indirect: l.indirect, a: Math.min(n.y, t.y), b: Math.max(n.y, t.y)});
  }));
  if (hops.length){
    const edge = Math.max.apply(null, L.nodes.map(n => n.x + n.w)) + 24, ends = [];
    hops.sort((p, q) => p.a - q.a || (q.b - q.a) - (p.b - p.a));
    hops.forEach(s => { let k = 0; while (ends[k] !== undefined && ends[k] + 8 > s.a) k++; ends[k] = s.b; s.k = k; });
    hops.forEach(s => {
      const xk = edge + s.k * 11, x1 = s.n.x + s.n.w, x2 = s.t.x + s.t.w, y1 = s.n.y, y2 = s.t.y, dy = y2 - y1;
      const sg = dy < 0 ? -1 : 1, r = Math.min(8, Math.abs(dy) / 2);
      const d = Math.abs(dy) < 1 ? 'M' + r1(x1) + ' ' + r1(y1) + 'H' + r1(x2)
        : 'M' + r1(x1) + ' ' + r1(y1) + 'H' + r1(xk - r) + 'Q' + r1(xk) + ' ' + r1(y1) + ' ' + r1(xk) + ' ' + r1(y1 + sg * r) +
          'V' + r1(y2 - sg * r) + 'Q' + r1(xk) + ' ' + r1(y2) + ' ' + r1(xk - r) + ' ' + r1(y2) + 'H' + r1(x2);
      cross += '<path d="' + d + '" fill="none" stroke="' + P.muted + '" stroke-width="1.4"' + (s.indirect ? ' stroke-dasharray="6 5"' : '') +
        ' marker-end="url(#twah)" opacity=".8" pointer-events="none"/>';
    });
    L.w = Math.max(L.w, Math.ceil(edge + ends.length * 11 + 16));
  }
  const defs = cross ? '<marker id="twah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="' + P.muted + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>' : '';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + L.w + '" height="' + L.h + '" viewBox="0 0 ' + L.w + ' ' + L.h +
    '" role="img" aria-label="Mind map">' + (defs ? '<defs>' + defs + '</defs>' : '') + '<rect width="100%" height="100%" fill="' + P.surface + '"/>' + links + cross + nodes + '</svg>';
  return {svg, w: L.w, h: L.h};
}

/* ---------- exports ---------- */
function toTree(clean, set){
  const pos = new Map(clean.map((c, k) => [c.i, k]));
  const out = clean.map(c => ({depth: c.depth, text: c.text, links: []}));
  clean.forEach((c, k) => (c.links || []).forEach(l => {
    const j = pos.get(l.to - 1);
    if (j !== undefined && j !== k) out[k].links.push({ref: out[j], indirect: l.indirect});
  }));
  return renderDoc(out, set).lines.map(s => s.replace(/\s+$/, '')).join('\n');
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
function eachNode(roots, fn){ const go = n => { fn(n); n.kids.forEach(go); }; roots.forEach(go); }
function toJSON(roots){
  const plain = n => ({text: n.text, children: n.kids.map(plain)});
  const byLine = new Map(), edges = [];
  eachNode(roots, n => byLine.set(n.i, n));
  eachNode(roots, n => n.links.forEach(l => { const t = byLine.get(l.to - 1); if (t) edges.push({from: n.text, to: t.text, indirect: l.indirect}); }));
  const out = roots.length === 1 ? plain(roots[0]) : {text: 'Mind map', children: roots.map(plain)};
  if (edges.length) out.links = edges;
  return JSON.stringify(out, null, 2);
}
/* Mermaid flowchart: tree branches are plain lines, links are arrows (dotted when indirect). */
function toMermaidGraph(roots){
  const out = ['graph LR'], id = n => 'n' + n.i, byLine = new Map();
  eachNode(roots, n => byLine.set(n.i, n));
  eachNode(roots, n => {
    out.push('  ' + id(n) + '["' + (n.text.replace(/"/g, "'") || '-') + '"]');
    n.kids.forEach(k => out.push('  ' + id(n) + ' --- ' + id(k)));
    n.links.forEach(l => { const t = byLine.get(l.to - 1); if (t) out.push('  ' + id(n) + (l.indirect ? ' -.-> ' : ' --> ') + id(t)); });
  });
  return out.join('\n');
}
function slug(roots){
  const s = roots.length ? roots[0].text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) : '';
  return s || 'mind-map';
}


const Core = {SETS, PAL, LINE_LEN, LINE_STEP,
  parseDoc, renderDoc, renderItems, stripArt, artStart, repair,
  parseLinks, convertTokens, cloneItems, collectLinks,
  subtreeEnd, blockEnd, opIndent, opOutdent, opMove, opSetLevel, opMoveTo, opDuplicate,
  cleanItems, buildTree, assignBranches, buildSVG,
  toTree, toMarkdown, toMermaid, toMermaidGraph, toOPML, toJSON, slug};
if (typeof module !== 'undefined' && module.exports) module.exports = Core;
else root.Core = Core;
})(this);
