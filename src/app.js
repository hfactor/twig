'use strict';
const C = Core, SET = C.SETS.unicode, PAL = C.PAL;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const ta = $('#editor'), gutter = $('#gutter'), hl = $('#lineHl'), host = $('#mapHost'), wrap = $('#mapWrap');
const toastEl = $('#toast'), ctx = $('#ctx');
const KEY = 'twig.v2';
const THEMES = [['system', 'System'], ['light', 'Light'], ['dark', 'Dark'], ['blue', 'Tokyo Night']];
/* Monospace only: the map sizes its boxes from a fixed character width. Web fonts load from Google Fonts only once chosen. */
const SYS_MONO = "ui-monospace,'Cascadia Mono',Menlo,Consolas,'DejaVu Sans Mono',monospace";
const FONTS = [['system', 'System', ''], ['jetbrains', 'JetBrains Mono', 'JetBrains Mono'], ['fira', 'Fira Code', 'Fira Code'], ['plex', 'IBM Plex Mono', 'IBM Plex Mono']];
const LH = 24, PAD = 16;

/* The same text is parsed several times per keystroke; keep the last result and hand out copies, since callers mutate items. */
let memoText = null, memoItems = null, memoFill = null;
function parse(text){
  if (text !== memoText || memoFill !== fill){ memoItems = C.parseDoc(text, {fill}); memoText = text; memoFill = fill; }
  return C.cloneItems(memoItems);
}

const ICONS = {
  outdent:'<polyline points="7 8 3 12 7 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>',
  indent:'<polyline points="3 8 7 12 3 16"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="18" x2="11" y2="18"/>',
  up:'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
  down:'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
  sibling:'<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus:'<path d="M5 12h14"/>',
  child:'<polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
  rename:'<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo:'<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  text:'<line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>',
  map:'<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
  fit:'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  gear:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  close:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  at:'<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/>',
  copy:'<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'
};
const svgIcon = n => '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>';
$$('[data-icon]').forEach(b => b.insertAdjacentHTML('afterbegin', svgIcon(b.dataset.icon)));
$('#settingsIcon').innerHTML = ICONS.gear;

let view = 'text', theme = 'system', font = 'system', fill = 'TBD';
let guard = false, composing = false, leaveOnTab = false;
let treeSel = -1;
let zoomMode = 'fit', zoom = 1, mapSize = {w: 1, h: 1}, raf = 0, lastActive = -2, curRange = [-1, -1];

/* ---------- storage and settings ---------- */
function loadSaved(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
let saveTimer;
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify({text: ta.value, view, theme, font, fill})); } catch (e) {}
  }, 250);
}
const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const effTheme = () => theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme;
const pal = () => PAL[effTheme()];
function segment(box, items, current, onPick){
  box.replaceChildren();
  items.forEach(([id, label]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.setAttribute('aria-pressed', String(id === current));
    b.addEventListener('click', () => onPick(id));
    box.appendChild(b);
  });
}
function applyTheme(){
  document.documentElement.dataset.theme = effTheme();
  segment($('#themeSeg'), THEMES, theme, id => { theme = id; applyTheme(); lastActive = -2; renderMap(); save(); });
}
darkQuery.addEventListener('change', () => { if (theme === 'system'){ applyTheme(); lastActive = -2; renderMap(); } });
function applyFont(){
  const f = FONTS.find(x => x[0] === font) || FONTS[0];
  if (f[2]){
    const id = 'gf-' + f[0];
    if (!document.getElementById(id)){
      const l = document.createElement('link');
      l.id = id; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + f[2].replace(/ /g, '+') + ':wght@400;500;700&display=swap';
      document.head.appendChild(l);
    }
  }
  document.documentElement.style.setProperty('--mono', f[2] ? "'" + f[2] + "'," + SYS_MONO : SYS_MONO);
  segment($('#fontSeg'), FONTS, font, id => { font = id; applyFont(); save(); });
}
/* blank is not allowed: it would make the field look filled (grey TBD) while writing nothing */
$('#fillInput').addEventListener('input', e => { fill = e.target.value.trim() || 'TBD'; save(); lastActive = -2; renderMap(); });
$('#fillInput').addEventListener('change', e => { e.target.value = fill; });

/* ---------- small helpers ---------- */
let toastTimer;
function toast(msg){
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1900);
}
async function copyText(t, label){
  try { await navigator.clipboard.writeText(t); toast(label + ' copied'); return; } catch (e) {}
  const x = document.createElement('textarea');
  x.value = t; x.style.cssText = 'position:fixed;top:0;opacity:0';
  document.body.appendChild(x); x.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  x.remove();
  toast(ok ? label + ' copied' : 'The browser blocked copying');
}
function download(name, data, mime){
  const b = data instanceof Blob ? data : new Blob([data], {type: mime + ';charset=utf-8'});
  const u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
}

/* ---------- editor: text in, text out ---------- */
/* Replace only the part of the text that changed, through the browser's edit command, so Undo keeps working. */
function setValue(next){
  const cur = ta.value;
  if (cur === next) return;
  const m = Math.min(cur.length, next.length);
  let p = 0; while (p < m && cur.charCodeAt(p) === next.charCodeAt(p)) p++;
  let s = 0; while (s < m - p && cur.charCodeAt(cur.length - 1 - s) === next.charCodeAt(next.length - 1 - s)) s++;
  const insText = next.slice(p, next.length - s);
  const prev = document.activeElement, ro = ta.readOnly;
  guard = true;
  try {
    ta.focus({preventScroll: true});
    ta.readOnly = false;
    ta.setSelectionRange(p, cur.length - s);
    let ok = false;
    try { ok = insText === '' ? document.execCommand('delete') : document.execCommand('insertText', false, insText); } catch (e) {}
    if (!ok || ta.value !== next) ta.value = next;
  } finally {
    ta.readOnly = ro; guard = false;
    if (prev && prev !== ta && (prev === wrap || view === 'map') && prev.focus) prev.focus({preventScroll: true});
  }
}

function lineInfo(text, pos){
  let lineIdx = 0, lineStart = 0;
  for (let i = 0; i < pos; i++) if (text.charCodeAt(i) === 10){ lineIdx++; lineStart = i + 1; }
  return {lineIdx, lineStart};
}
function currentLine(){ return lineInfo(ta.value, ta.selectionStart).lineIdx; }
/* keep: read the editor as it is, without finishing any @n being typed */
function state(keep){
  if (!keep && ta.value.indexOf('@') >= 0) normalize(false, true);
  const text = ta.value, items = parse(text), lines = text.split('\n');
  const {lineIdx, lineStart} = lineInfo(text, ta.selectionStart);
  const idx = Math.min(lineIdx, items.length - 1);
  const raw = C.stripArt(lines[idx] || '');
  const col = ta.selectionStart - lineStart;
  const textStart = raw.length - items[idx].text.length;
  const off = Math.max(0, Math.min(items[idx].text.length, col - textStart));
  return {text, lines, items, idx, col, textStart, off};
}
function lineRange(){
  const text = ta.value, s = ta.selectionStart, e = ta.selectionEnd, count = text.split('\n').length;
  const a = lineInfo(text, s).lineIdx;
  let b = lineInfo(text, e).lineIdx;
  if (e > s && b > a && text.charAt(e - 1) === '\n') b--;
  const hi = count - 1;
  return [Math.min(a, hi), Math.min(Math.max(a, b), hi)];
}
function selRange(items){
  const hi = items.length - 1, r = lineRange();
  return [Math.min(r[0], hi), Math.min(r[1], hi)];
}
function ensureVisible(idx){
  const top = PAD + idx * LH;
  if (top < ta.scrollTop) ta.scrollTop = Math.max(0, top - PAD);
  else if (top + LH + PAD > ta.scrollTop + ta.clientHeight) ta.scrollTop = top + LH + PAD - ta.clientHeight;
}
function selectLine(i, focus){
  const text = ta.value; let pos = 0;
  for (let k = 0; k < i; k++){ const n = text.indexOf('\n', pos); if (n < 0){ pos = text.length; break; } pos = n + 1; }
  const end = text.indexOf('\n', pos), p = pos + C.stripArt(text.slice(pos, end < 0 ? text.length : end)).length;
  if (focus) ta.focus({preventScroll: true});
  ta.setSelectionRange(p, p);
  ensureVisible(i);
  lastActive = -2;
  syncCaretUI();
}
/* Render items back to ASCII, write them into the editor and put the caret on node idx. */
function commit(items, idx, off){
  C.repair(items);
  const r = C.renderDoc(items, SET);
  setValue(r.lines.join('\n'));
  idx = Math.max(0, Math.min(idx, items.length - 1));
  let pos = 0;
  for (let i = 0; i < idx; i++) pos += r.lines[i].length + 1;
  pos += r.prefixLens[idx] + Math.max(0, Math.min(off, items[idx].text.length));
  ta.setSelectionRange(pos, pos);
  ensureVisible(idx);
  changed();
}
/* Links live in the drawn art, so a raw edit that changes a line's length moves that line's art sideways.
   Compare with the text from before the edit to know by how much (null: line count changed, ignore that art). */
let lastText = '';
function rawShifts(prev, cur){
  const A = prev.split('\n'), B = cur.split('\n');
  if (A.length === B.length) return B.map((l, i) => l === A[i] ? 0 : l.length - A[i].length);
  let p = 0; while (p < A.length && p < B.length && A[p] === B[p]) p++;
  let s = 0; while (s < A.length - p && s < B.length - p && A[A.length - 1 - s] === B[B.length - 1 - s]) s++;
  return B.map((l, i) => (i < p || i >= B.length - s) ? 0 : null);
}
/* Called after typing, pasting or any edit that may have broken the line prefixes or the link art.
   convert: turn typed @n tokens into drawn links. shift: see rawShifts. */
function normalize(imp, convert, shift){
  const cur = ta.value;
  const items = C.parseDoc(cur, {imp, shift, fill});
  const render = () => C.renderDoc(items, SET).lines.join('\n');
  if (!convert && render() === cur) return;
  const {lineIdx, lineStart} = lineInfo(cur, ta.selectionStart);
  let idx = 0;
  for (let k = 0; k < items.length; k++){ if (items[k].src <= lineIdx) idx = k; else break; }
  let off;
  if (imp || items[idx].src !== lineIdx) off = items[idx].text.length;
  else {
    const end = cur.indexOf('\n', lineStart);
    const rawLen = C.stripArt(cur.slice(lineStart, end < 0 ? cur.length : end)).length;
    off = (ta.selectionStart - lineStart) - (rawLen - items[idx].text.length);
    /* spaces typed after the text look like padding next to the art; the caret position tells us how many are real */
    const extra = off - items[idx].text.length;
    if (extra > 0 && extra <= 40 && cur.charAt(ta.selectionStart - 1) === ' ') items[idx].text += ' '.repeat(extra);
  }
  if (convert) C.convertTokens(items, {terminated: convert === 'terminated'});
  if (render() === cur) return;
  commit(items, idx, off);
}

/* ---------- links: press @, click the line to link to; remove from the menu ---------- */
let linkFrom = -1;
const shortText = s => { const t = s.trim() || '(empty)'; return t.length > 24 ? t.slice(0, 23) + '…' : t; };
function startLink(){
  if (linkFrom >= 0){ cancelLink(); return; }
  linkFrom = view === 'map' ? currentLine() : state().idx;
  document.body.classList.add('linking');
  $('#linkHint').hidden = false; $('#stats').hidden = true;
}
function cancelLink(){
  linkFrom = -1;
  document.body.classList.remove('linking');
  $('#linkHint').hidden = true; $('#stats').hidden = false;
}
function finishLink(to, indirect){
  const from = linkFrom;
  cancelLink();
  if (to === from){ toast('A line cannot link to itself'); return; }
  const st = state(), a = st.items[from], b = st.items[to];
  if (!a || !b) return;
  if (a.links.some(l => l.ref === b && l.indirect === indirect)){ toast('Already linked'); return; }
  a.links.push({ref: b, indirect});
  commit(st.items, from, a.text.length);
  toast('Linked “' + shortText(a.text) + '” to “' + shortText(b.text) + '”' + (indirect ? ' (dashed)' : ''));
}
/* picking a line in the editor: click the text or its line number */
function pickFromEditor(e){
  if (linkFrom < 0) return;
  e.preventDefault(); e.stopPropagation();
  const r = ta.getBoundingClientRect(), n = ta.value.split('\n').length;
  finishLink(Math.max(0, Math.min(n - 1, Math.floor((e.clientY - r.top + ta.scrollTop - PAD) / LH))), e.shiftKey);
}
ta.addEventListener('mousedown', pickFromEditor, true);
gutter.addEventListener('mousedown', pickFromEditor, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && linkFrom >= 0) cancelLink(); });

/* Remove one link, given the lines at its two ends (same numbering as the current text). */
function removeLink(fromIdx, toIdx, indirect){
  const st = state(), from = st.items[fromIdx], to = st.items[toIdx];
  if (!from || !to) return;
  from.links = from.links.filter(l => !(l.ref === to && l.indirect === indirect));
  commit(st.items, st.idx, st.off);
  toast('Link removed');
}
/* Remove every link that starts or ends on the current line. */
function doRemoveLinks(){
  const st = state(), it = st.items[st.idx];
  let n = it.links.length;
  it.links = [];
  st.items.forEach(x => { const before = x.links.length; x.links = x.links.filter(l => l.ref !== it); n += before - x.links.length; });
  if (!n){ toast('No links on this line'); return; }
  commit(st.items, st.idx, st.off);
  toast(n === 1 ? 'Link removed' : n + ' links removed');
}

/* ---------- structure commands (all act on the selected line, in any view) ---------- */
function structOp(fn){
  const st = state(), [a, b] = selRange(st.items);
  const ni = fn(st.items, a, b);
  if (ni < 0) return false;
  commit(st.items, ni + (st.idx - a), st.off);
  return true;
}
const doIndent  = () => structOp(C.opIndent);
const doOutdent = () => structOp(C.opOutdent);
const doMove    = dir => structOp((i, a, b) => C.opMove(i, a, b, dir));
function doDelete(){
  const st = state(), [a, b] = selRange(st.items), e = C.blockEnd(st.items, a, b);
  st.items.splice(a, e - a);
  if (!st.items.length) st.items.push({depth: 0, text: ''});
  const i = Math.min(a, st.items.length - 1);
  commit(st.items, i, st.items[i].text.length);
}
function doEnter(asChild, opt){
  opt = opt || {};
  if (ta.selectionStart !== ta.selectionEnd){ try { document.execCommand('delete'); } catch (e) {} }
  const st = state(), it = st.items[st.idx];
  if (!asChild && !opt.noExit && it.text === '' && it.depth > 0){
    const ni = C.opOutdent(st.items, st.idx, st.idx);
    commit(st.items, ni < 0 ? st.idx : ni, 0);
    return;
  }
  if (!asChild && !opt.noExit && st.off === 0 && it.text !== ''){
    st.items.splice(st.idx, 0, {depth: it.depth, text: ''});
    commit(st.items, st.idx + 1, 0);
    return;
  }
  const left = it.text.slice(0, st.off).replace(/\s+$/, ''), right = it.text.slice(st.off).replace(/^\s+/, '');
  it.text = left;
  const e = C.subtreeEnd(st.items, st.idx);
  st.items.splice(e, 0, {depth: asChild ? it.depth + 1 : it.depth, text: right});
  commit(st.items, e, 0);
}
function doDuplicate(){ structOp((i, a, b) => C.opDuplicate(i, a, b)); }
function doCopyBranch(){
  const st = state(), [a, b] = selRange(st.items), e = C.blockEnd(st.items, a, b), base = st.items[a].depth;
  const blk = st.items.slice(a, e).map(x => ({depth: x.depth - base, text: C.parseLinks(x.text).text}));
  copyText(C.toTree(blk, SET), 'Branch');
}
function doUndo(redo){
  const prev = document.activeElement;
  ta.focus({preventScroll: true});
  const ro = ta.readOnly; ta.readOnly = false;
  try { document.execCommand(redo ? 'redo' : 'undo'); } catch (e) {}
  ta.readOnly = ro;
  if (view === 'map' || prev === wrap) wrap.focus({preventScroll: true});
}
function setNodeText(i, v){
  const items = parse(ta.value);
  if (!items[i]) return;
  items[i].text = v;
  commit(items, i, v.length);
}
/* Add a sibling or child from the action bar. */
function addNode(asChild){ doEnter(asChild, {noExit: true}); }

ta.addEventListener('keydown', e => {
  if (composing || e.isComposing) return;
  if (e.key === 'Escape'){ leaveOnTab = true; return; }
  if (e.key === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey){
    if (leaveOnTab){ leaveOnTab = false; return; }
    e.preventDefault();
    if (e.shiftKey) doOutdent(); else doIndent();
    return;
  }
  leaveOnTab = false;
  if (e.key === 'End' && !e.ctrlKey && !e.metaKey && !e.altKey){
    /* on a line with link art, End means the end of the text, not the end of the drawing */
    const st = state(true);
    if (C.artStart(st.lines[st.idx]) >= 0){
      e.preventDefault();
      const textEnd = st.textStart + st.items[st.idx].text.length;
      const anchor = ta.selectionDirection === 'backward' ? ta.selectionEnd : ta.selectionStart, to = anchor - st.col + textEnd;
      if (e.shiftKey) ta.setSelectionRange(Math.min(anchor, to), Math.max(anchor, to), to < anchor ? 'backward' : 'forward');
      else ta.setSelectionRange(to, to);
      syncCaretUI();
      return;
    }
  }
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')){
    e.preventDefault(); doMove(e.key === 'ArrowUp' ? -1 : 1); return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); doEnter(true); }
});

ta.addEventListener('beforeinput', e => {
  if (guard || composing || e.isComposing) return;
  const t = e.inputType;
  if (!/^history|^insertParagraph|^insertLineBreak/.test(t) && ta.selectionStart === ta.selectionEnd){
    /* Padding before the art is ordinary text space. From the first drawn character on, edits belong to the text (or, for delete keys, to the links). */
    const st = state(true), as = C.artStart(st.lines[st.idx]), textEnd = st.textStart + st.items[st.idx].text.length;
    const del = t === 'deleteContentBackward' || t === 'deleteContentForward';
    if (as >= 0 && st.col >= as + (t === 'deleteContentBackward' ? 1 : 0)){
      const here = st.items[st.idx];
      if (del && (here.links.length || st.items.some(x => x.links.some(l => l.ref === here)))){ e.preventDefault(); doRemoveLinks(); return; }
      const p = ta.selectionStart - st.col + textEnd; ta.setSelectionRange(p, p);
    }
  }
  if (t === 'insertParagraph' || t === 'insertLineBreak'){ e.preventDefault(); doEnter(false); return; }
  if (ta.selectionStart !== ta.selectionEnd) return;
  if (t === 'deleteContentBackward'){
    const st = state(true);
    if (st.col > st.textStart) return;
    const it = st.items[st.idx];
    if (it.depth > 0){
      e.preventDefault();
      const ni = C.opOutdent(st.items, st.idx, st.idx);
      commit(st.items, ni < 0 ? st.idx : ni, 0);
    } else if (it.text === '' && st.idx > 0 && C.subtreeEnd(st.items, st.idx) === st.idx + 1){
      e.preventDefault();
      st.items.splice(st.idx, 1);
      commit(st.items, st.idx - 1, st.items[st.idx - 1].text.length);
    }
    return;
  }
  if (t === 'deleteContentForward'){
    const st = state(true);
    if (st.col !== C.stripArt(st.lines[st.idx]).length || st.idx >= st.items.length - 1) return;
    e.preventDefault();
    const nxt = st.items.splice(st.idx + 1, 1)[0];
    st.items[st.idx].text += nxt.text;
    commit(st.items, st.idx, st.off);
  }
});
ta.addEventListener('input', e => {
  if (guard || composing) return;
  const history = e.inputType === 'historyUndo' || e.inputType === 'historyRedo';
  /* @12 becomes a link once it is finished: followed by a space (here), or by Enter or leaving the editor */
  normalize(e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop', 'terminated', history ? undefined : rawShifts(lastText, ta.value));
  changed();
});
ta.addEventListener('compositionstart', () => { composing = true; });
ta.addEventListener('compositionend', () => { composing = false; normalize(false, false, rawShifts(lastText, ta.value)); changed(); });
ta.addEventListener('blur', () => { leaveOnTab = false; if (!composing && ta.value.indexOf('@') >= 0){ normalize(false, true); changed(); } });
ta.addEventListener('scroll', () => { gutter.scrollTop = ta.scrollTop; placeHighlight(); });
['keyup', 'pointerup', 'focus'].forEach(ev => ta.addEventListener(ev, () => syncCaretUI()));
document.addEventListener('selectionchange', () => { if (document.activeElement === ta) syncCaretUI(); });

/* action bar: buttons must not steal focus from the editor or the map */
const actionsBar = $('#actions');
actionsBar.addEventListener('mousedown', e => { if (e.target.closest('[data-op]')) e.preventDefault(); });
actionsBar.addEventListener('click', e => {
  const b = e.target.closest('[data-op]'); if (!b) return;
  runOp(b.dataset.op);
});
function runOp(op){
  if (op === 'indent') doIndent();
  else if (op === 'outdent') doOutdent();
  else if (op === 'up') doMove(-1);
  else if (op === 'down') doMove(1);
  else if (op === 'sibling') addNode(false);
  else if (op === 'child') addNode(true);
  else if (op === 'delete') doDelete();
  else if (op === 'link') startLink();
  else if (op === 'undo') doUndo(false);
  else if (op === 'redo') doUndo(true);
}

/* ---------- line numbers and selected-line highlight ---------- */
function placeHighlight(){
  const [a, b] = curRange;
  if (a < 0){ hl.style.display = 'none'; return; }
  hl.style.display = '';
  hl.style.height = ((b - a + 1) * LH) + 'px';
  hl.style.transform = 'translateY(' + (PAD + a * LH - ta.scrollTop) + 'px)';
}
function buildGutter(count){
  if (gutter.childElementCount !== count){
    let s = '';
    for (let i = 1; i <= count; i++) s += '<i>' + i + '</i>';
    gutter.innerHTML = s;
    gutter.scrollTop = ta.scrollTop;
    curRange = [-1, -1];
  }
}
/* A tree starts at every top-level line. Enter on a top-level line begins a new one. */
function treeRoots(){
  const r = [];
  parse(ta.value).forEach((x, k) => { if (x.depth === 0) r.push(k); });
  return r;
}
function markTrees(){
  const roots = treeRoots(), multi = roots.length > 1, kids = gutter.children;
  for (let i = 0; i < kids.length; i++){ kids[i].classList.remove('root'); kids[i].removeAttribute('data-t'); }
  if (multi) roots.forEach((k, t) => { if (kids[k]){ kids[k].classList.add('root'); kids[k].dataset.t = t + 1; } });
}
function updateTreeChip(){
  const roots = treeRoots(), chip = $('#treeInd');
  if (roots.length < 2){ chip.hidden = true; return; }
  const line = currentLine();
  chip.hidden = false;
  chip.textContent = 'Tree ' + roots.filter(k => k <= line).length + ' of ' + roots.length;
}
function syncCaretUI(){
  const next = lineRange(), kids = gutter.children;
  for (let i = curRange[0]; i >= 0 && i <= curRange[1]; i++) if (kids[i]) kids[i].classList.remove('cur');
  curRange = next;
  for (let i = next[0]; i <= next[1]; i++) if (kids[i]) kids[i].classList.add('cur');
  placeHighlight();
  syncActive();
  updateTreeChip();
}

/* ---------- map ---------- */
function model(keep){
  const clean = C.cleanItems(parse(ta.value), keep);
  const roots = C.buildTree(clean);
  C.assignBranches(roots);
  return {clean, roots};
}
function renderMap(){
  if (view === 'text') return;
  const m = model(true);
  if (treeSel >= m.roots.length) treeSel = -1;
  renderToc(m.roots);
  if (!m.roots.length){
    host.innerHTML = '<p class="empty">Type a line in the text view and your map appears here.</p>';
    mapSize = {w: 1, h: 1}; return;
  }
  const out = C.buildSVG(treeSel >= 0 ? [m.roots[treeSel]] : m.roots, pal(), {ghost: fill, all: treeSel >= 0 ? m.roots : null});
  mapSize = {w: out.w, h: out.h};
  host.innerHTML = out.svg;
  lastActive = -2;
  applyZoom();
  syncActive();
}
/* Side list of trees. Only shown when the text holds more than one. */
function renderToc(all){
  const toc = $('#toc');
  if (all.length < 2){ toc.hidden = true; treeSel = -1; return; }
  toc.hidden = false;
  toc.replaceChildren();
  const add = (label, sub, idx) => {
    const b = mk('button', 'toc-item' + (idx === treeSel ? ' on' : ''));
    b.type = 'button'; b.dataset.t = idx;
    const n = mk('span', 'toc-n'), t = mk('span', 'toc-t');
    n.textContent = label; t.textContent = sub;
    b.append(n, t);
    toc.appendChild(b);
  };
  add('All trees', all.length + ' trees', -1);
  all.forEach((r, k) => add('Tree ' + (k + 1), r.text || '(empty)', k));
}
$('#toc').addEventListener('click', e => {
  const b = e.target.closest('.toc-item'); if (!b) return;
  treeSel = +b.dataset.t; zoomMode = 'fit';
  renderMap(); wrap.scrollTo(0, 0);
});
function scheduleMap(){
  if (view === 'text' || raf) return;
  raf = requestAnimationFrame(() => { raf = 0; renderMap(); });
}
function applyZoom(){
  const s = $('svg', host); if (!s) return;
  const cw = wrap.clientWidth - 24, ch = wrap.clientHeight - 24;
  if (zoomMode === 'fit' && cw > 50 && ch > 50) zoom = Math.max(.3, Math.min(1, cw / mapSize.w, ch / mapSize.h));
  s.setAttribute('width', Math.round(mapSize.w * zoom));
  s.setAttribute('height', Math.round(mapSize.h * zoom));
  $('#zoomLbl').textContent = Math.round(zoom * 100) + '%';
}
$('#zoomIn').addEventListener('click', () => { zoomMode = 'manual'; zoom = Math.min(3, zoom * 1.25); applyZoom(); });
$('#zoomOut').addEventListener('click', () => { zoomMode = 'manual'; zoom = Math.max(.2, zoom / 1.25); applyZoom(); });
$('#zoomFit').addEventListener('click', () => { zoomMode = 'fit'; applyZoom(); });

function syncActive(){
  if (view === 'text') return;
  const idx = currentLine();
  if (idx === lastActive) return;
  lastActive = idx;
  $$('.node.active', host).forEach(n => n.classList.remove('active'));
  const el = host.querySelector('.node[data-i="' + idx + '"]');
  if (el){ el.classList.add('active'); if (el.scrollIntoView) el.scrollIntoView({block: 'nearest', inline: 'nearest'}); }
}

/* inline rename: an input is placed over the node */
let renaming = null;
function renameNode(i){
  const g = host.querySelector('.node[data-i="' + i + '"]');
  if (!g || renaming) return;
  const r = $('rect', g);
  const items = parse(ta.value), pl = C.parseLinks(items[i] ? items[i].text : ''), old = pl.text.trim();
  const x = +r.getAttribute('x') * zoom, y = +r.getAttribute('y') * zoom;
  const w = Math.max(+r.getAttribute('width') * zoom, 150), h = Math.max(+r.getAttribute('height') * zoom, 32);
  const inp = document.createElement('input');
  inp.className = 'rename'; inp.type = 'text'; inp.value = old; inp.setAttribute('aria-label', 'Node text');
  inp.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;font-size:' + Math.max(12, 14 * zoom) + 'px';
  host.appendChild(inp);
  renaming = inp;
  inp.focus(); inp.select();
  if (inp.scrollIntoView) inp.scrollIntoView({block: 'nearest', inline: 'nearest'});
  let done = false;
  const finish = (ok, then) => {
    if (done) return; done = true;
    const v = inp.value.replace(/\s+/g, ' ').trim();
    renaming = null; inp.remove();
    if (ok && v !== old) setNodeText(i, v + pl.suffix);
    if (view === 'map') wrap.focus({preventScroll: true}); else ta.focus({preventScroll: true});
    if (then) then();
  };
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter'){ e.preventDefault(); finish(true); }
    else if (e.key === 'Escape'){ e.preventDefault(); finish(false); }
  });
  inp.addEventListener('blur', () => finish(true));
}

/* Clicking a node offers three things: rename it, jump to its line in the text, or start a link from it. */
function closePop(){ const p = host.querySelector('.nodepop'); if (p) p.remove(); }
function showPop(i, g){
  closePop();
  const r = $('rect', g);
  const p = mk('div', 'nodepop');
  p.style.left = (+r.getAttribute('x') * zoom) + 'px';
  p.style.top = ((+r.getAttribute('y') + +r.getAttribute('height')) * zoom + 6) + 'px';
  [['rename', 'Rename', () => renameNode(i)],
   ['text', 'Go to line', () => { setView('text'); selectLine(i, true); }],
   ['at', 'Link to…', () => startLink()]].forEach(([ic, label, fn]) => {
    const b = mk('button', '', svgIcon(ic) + '<span>' + label + '</span>');
    b.type = 'button';
    b.addEventListener('click', ev => { ev.stopPropagation(); closePop(); fn(); });
    p.appendChild(b);
  });
  host.appendChild(p);
}
host.addEventListener('click', e => {
  /* a node that stands for a link to or from another tree: jump to that tree and select the line */
  const x = e.target.closest('.xref');
  if (x){
    const line = +x.dataset.ref, roots = model(true).roots, has = (n) => n.i === line || n.kids.some(has);
    const t = roots.findIndex(has);
    if (t >= 0 && treeSel >= 0 && t !== treeSel){ treeSel = t; zoomMode = 'fit'; selectLine(line, false); renderMap(); wrap.scrollTo(0, 0); }
    else if (t >= 0) selectLine(line, false);
    return;
  }
  const g = e.target.closest('.node');
  if (linkFrom >= 0){ closePop(); if (g && g.dataset.i !== undefined) finishLink(+g.dataset.i, e.shiftKey); else cancelLink(); return; }
  if (!g){ closePop(); return; }
  const i = +g.dataset.i;
  selectLine(i, false);
  wrap.focus({preventScroll: true});
  showPop(i, g);
});
document.addEventListener('click', e => { if (!e.target.closest('.nodepop, .node')) closePop(); });

/* map keyboard: arrows select, Enter or F2 renames. Structure is edited in the text view. */
wrap.addEventListener('keydown', e => {
  if (e.target !== wrap) return;
  closePop();
  const k = e.key, mod = e.ctrlKey || e.metaKey;
  const items = parse(ta.value), i = Math.min(currentLine(), items.length - 1);
  const handled = () => e.preventDefault();
  if (mod && (k === 'z' || k === 'Z')){ handled(); doUndo(e.shiftKey); return; }
  if (mod && (k === 'y' || k === 'Y')){ handled(); doUndo(true); return; }
  if (mod || e.altKey) return;
  if (k === 'ArrowDown'){ handled(); if (i < items.length - 1) selectLine(i + 1); }
  else if (k === 'ArrowUp'){ handled(); if (i > 0) selectLine(i - 1); }
  else if (k === 'ArrowLeft'){
    handled();
    let p = i - 1; while (p >= 0 && items[p].depth >= items[i].depth) p--;
    if (p >= 0) selectLine(p);
  } else if (k === 'ArrowRight'){
    handled(); if (i + 1 < items.length && items[i + 1].depth > items[i].depth) selectLine(i + 1);
  }
  else if (k === 'Enter' || k === 'F2'){ handled(); renameNode(i); }
});

/* ---------- context menu ---------- */
function hideCtx(){ ctx.hidden = true; ctx.innerHTML = ''; }
function mk(tag, cls, html){ const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
function showCtx(x, y){
  const st = state(), items = st.items, [a, b] = selRange(items);
  const can = fn => fn(items.map(o => ({depth: o.depth, text: o.text})), a, b) >= 0;
  const curL = items[a].depth, maxL = a === 0 ? 0 : items[a - 1].depth + 2, natural = a === 0 ? 0 : items[a - 1].depth + 1;
  const run = fn => () => { hideCtx(); fn(); if (view === 'map') wrap.focus({preventScroll: true}); else ta.focus({preventScroll: true}); };
  ctx.innerHTML = '';
  const item = (icon, label, kbd, fn, enabled) => {
    const b2 = mk('button', 'item', (icon ? svgIcon(icon) : '<span style="width:18px;flex:none"></span>') + '<span>' + label + '</span>' + (kbd ? '<span class="kbd">' + kbd + '</span>' : ''));
    b2.type = 'button'; b2.setAttribute('role', 'menuitem');
    if (enabled === false) b2.disabled = true; else b2.addEventListener('click', run(fn));
    ctx.appendChild(b2);
  };
  item('sibling', 'Add sibling', 'Enter', () => addNode(false));
  item('child', 'Add child', 'Ctrl+Enter', () => addNode(true));
  item('at', 'Link to another line…', '', startLink);
  ctx.appendChild(mk('hr'));
  item('indent', 'Indent', 'Tab', doIndent, can(C.opIndent));
  item('outdent', 'Outdent', 'Shift+Tab', doOutdent, can(C.opOutdent));
  const lv = mk('div', 'row', '<span class="lbl">Indent level</span>');
  for (let L = 0; L <= Math.min(maxL, 12); L++){
    const c = mk('button', 'chip' + (L === curL ? ' on' : '') + (L > natural ? ' ghost' : ''), String(L));
    c.type = 'button'; c.title = L > natural ? 'Level ' + L + ' (adds a placeholder parent)' : 'Set indent level to ' + L;
    c.addEventListener('click', run(() => structOp((it, aa) => C.opSetLevel(it, aa, L, fill))));
    lv.appendChild(c);
  }
  ctx.appendChild(lv);
  ctx.appendChild(mk('hr'));
  item('up', 'Move up', 'Alt+↑', () => doMove(-1), can((it, aa, bb) => C.opMove(it, aa, bb, -1)));
  item('down', 'Move down', 'Alt+↓', () => doMove(1), can((it, aa, bb) => C.opMove(it, aa, bb, 1)));
  const mv = mk('div', 'row', '<span class="lbl">Move to line</span>');
  const num = mk('input'); num.type = 'number'; num.min = 1; num.max = items.length + 1; num.placeholder = '1–' + (items.length + 1);
  num.setAttribute('aria-label', 'Line number');
  const go = mk('button', 'chip', 'Go'); go.type = 'button';
  const doGo = () => {
    const n = parseInt(num.value, 10);
    if (!n || n < 1){ toast('Type a line number'); return; }
    hideCtx();
    if (!structOp((it, aa, bb) => C.opMoveTo(it, aa, bb, n))) toast('That line is inside the branch');
    if (view === 'map') wrap.focus({preventScroll: true}); else ta.focus({preventScroll: true});
  };
  go.addEventListener('click', doGo);
  num.addEventListener('keydown', ev => { if (ev.key === 'Enter'){ ev.preventDefault(); doGo(); } else if (ev.key === 'Escape') hideCtx(); });
  mv.append(num, go);
  ctx.appendChild(mv);
  ctx.appendChild(mk('hr'));
  /* one entry per link on this line, naming the line at the other end */
  const here = items[a];
  const linked = [];
  here.links.forEach(l => linked.push({out: true, from: a, to: items.indexOf(l.ref), other: l.ref, indirect: l.indirect}));
  items.forEach((x, k) => x.links.forEach(l => { if (l.ref === here) linked.push({out: false, from: k, to: a, other: x, indirect: l.indirect}); }));
  linked.forEach(l => {
    const b2 = mk('button', 'item', svgIcon('trash') + '<span></span>');
    $('span', b2).textContent = (l.out ? 'Remove link to “' : 'Remove link from “') + shortText(l.other.text) + '”' + (l.indirect ? ' (dashed)' : '');
    b2.type = 'button'; b2.setAttribute('role', 'menuitem');
    b2.addEventListener('click', run(() => removeLink(l.from, l.to, l.indirect)));
    ctx.appendChild(b2);
  });
  if (linked.length > 1) item('trash', 'Remove all ' + linked.length + ' links on this line', '', doRemoveLinks);
  if (linked.length) ctx.appendChild(mk('hr'));
  const acts = mk('div', 'row acts');
  [['copy', 'Duplicate', doDuplicate], ['copy', 'Copy', doCopyBranch], ['trash', 'Delete', doDelete]].forEach(([ic, label, fn]) => {
    const b2 = mk('button', 'chip act', svgIcon(ic) + '<span>' + label + '</span>');
    b2.type = 'button'; b2.title = label + ' branch';
    b2.addEventListener('click', run(fn));
    acts.appendChild(b2);
  });
  ctx.appendChild(acts);
  ctx.hidden = false;
  const r = ctx.getBoundingClientRect();
  ctx.style.left = Math.max(8, Math.min(x, innerWidth - r.width - 8)) + 'px';
  ctx.style.top = Math.max(8, Math.min(y, innerHeight - r.height - 8)) + 'px';
}
ctx.addEventListener('mousedown', e => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
document.addEventListener('mousedown', e => { if (!ctx.hidden && !ctx.contains(e.target)) hideCtx(); }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !ctx.hidden) hideCtx(); });
addEventListener('resize', hideCtx);
addEventListener('blur', hideCtx);
ta.addEventListener('contextmenu', e => {
  e.preventDefault();
  const r = ta.getBoundingClientRect();
  const idx = Math.max(0, Math.floor((e.clientY - r.top + ta.scrollTop - PAD) / LH));
  const [a, b] = lineRange();
  const count = ta.value.split('\n').length;
  const hit = Math.min(idx, count - 1);
  if (hit < a || hit > b) selectLine(hit, true);
  showCtx(e.clientX, e.clientY);
});

/* ---------- views ---------- */
function setView(v){
  view = v;
  document.body.dataset.view = v;
  ta.readOnly = v === 'map';
  $$('#viewSeg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  if (v === 'map') requestAnimationFrame(() => { lastActive = -2; renderMap(); });
  save();
}
$('#viewSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setView(b.dataset.view); });
addEventListener('resize', () => { if (view === 'map') applyZoom(); });

function changed(){
  const clean = C.cleanItems(parse(ta.value));
  const levels = clean.reduce((m, x) => Math.max(m, x.depth + 1), 0);
  $('#stats').textContent = clean.length + (clean.length === 1 ? ' node' : ' nodes') + ' · ' + levels + (levels === 1 ? ' level' : ' levels');
  buildGutter(ta.value.split('\n').length);
  markTrees();
  syncCaretUI();
  scheduleMap();
  lastText = ta.value;
  save();
}

/* ---------- menus ---------- */
const menus = $$('details.menu');
menus.forEach(d => d.addEventListener('toggle', () => {
  if (d.open) menus.forEach(o => { if (o !== d) o.open = false; });
  else $$('details.sub', d).forEach(s => { s.open = false; });
}));

/* Level 2 menus fly out beside their parent: hover opens them, a click opens them too (touch, keyboard). */
const subs = $$('details.sub');
function openSub(s){
  subs.forEach(o => { if (o !== s) o.open = false; });
  s.open = true;
  const f = $('.flyout', s);
  f.classList.remove('flip');
  if (f.getBoundingClientRect().right > innerWidth - 8) f.classList.add('flip');
}
subs.forEach(s => {
  let t = 0;
  s.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse'){ clearTimeout(t); openSub(s); } });
  s.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') t = setTimeout(() => { s.open = false; }, 150); });
  $('summary', s).addEventListener('click', e => { e.preventDefault(); openSub(s); });
});
$$('#fileMenu > .panel > button').forEach(b => b.addEventListener('pointerenter', () => subs.forEach(s => { s.open = false; })));
document.addEventListener('click', e => { menus.forEach(d => { if (d.open && !d.contains(e.target)) d.open = false; }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') menus.forEach(d => { d.open = false; }); });

/* ---------- settings and about dialogs ---------- */
const settingsDlg = $('#settingsDlg');
$('#settingsBtn').addEventListener('click', () => settingsDlg.showModal());
$('#settingsClose').addEventListener('click', () => settingsDlg.close());
settingsDlg.addEventListener('click', e => { if (e.target === settingsDlg) settingsDlg.close(); });
const aboutDlg = $('#aboutDlg');
$('#aboutBtn').addEventListener('click', () => aboutDlg.showModal());
$('#aboutClose').addEventListener('click', () => aboutDlg.close());
aboutDlg.addEventListener('click', e => { if (e.target === aboutDlg) aboutDlg.close(); });

/* ---------- file menu ---------- */
function exampleText(id){
  const items = C.exampleItems(id);
  items.forEach(x => { if (x.text === 'TBD') x.text = fill; });
  return C.renderDoc(C.convertTokens(items), SET).lines.join('\n');
}
const sampleText = () => exampleText('ideas');
function loadExample(id){
  setValue(exampleText(id));
  ta.setSelectionRange(0, 0); ta.scrollTop = 0;
  treeSel = -1;
  changed();
}
function need(m){ if (m.clean.length) return true; toast('Nothing to export yet'); return false; }
function exportSVG(){ return C.buildSVG(model().roots, PAL.light, {ghost: fill}); }

async function downloadPNG(name){
  const o = exportSVG();
  const url = URL.createObjectURL(new Blob([o.svg], {type: 'image/svg+xml;charset=utf-8'}));
  const img = new Image();
  try {
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const sc = Math.max(.5, Math.min(2, 8000 / Math.max(o.w, o.h)));
    const c = document.createElement('canvas');
    c.width = Math.round(o.w * sc); c.height = Math.round(o.h * sc);
    const g = c.getContext('2d'); g.scale(sc, sc); g.drawImage(img, 0, 0, o.w, o.h);
    c.toBlob(b => { if (b) download(name + '.png', b); else toast('Could not create the PNG'); }, 'image/png');
  } catch (e) { toast('Could not create the PNG'); }
  finally { URL.revokeObjectURL(url); }
}
function printAs(kind){
  const m = model(); if (!need(m)) return;
  const out = $('#printOut');
  if (kind === 'tree'){
    const pre = document.createElement('pre');
    pre.textContent = C.toTree(m.clean, SET);
    out.replaceChildren(pre);
    $('#pageStyle').textContent = '@page{size:portrait;margin:14mm}';
  } else {
    const o = C.buildSVG(m.roots, PAL.light, {ghost: fill});
    out.innerHTML = o.svg;
    $('#pageStyle').textContent = '@page{size:' + (o.w > o.h ? 'landscape' : 'portrait') + ';margin:12mm}';
  }
  window.print();
}
addEventListener('afterprint', () => { $('#printOut').replaceChildren(); });

const actions = {
  open(){ $('#fileInput').click(); },
  new(){ setValue(''); ta.setSelectionRange(0, 0); changed(); },
  'ex-debug'(){ loadExample('debug'); },
  'ex-flow'(){ loadExample('flow'); },
  'ex-ideas'(){ loadExample('ideas'); },
  'copy-tree'(){ const m = model(); if (need(m)) copyText(C.toTree(m.clean, SET), 'Tree'); },
  'copy-md'(){ const m = model(); if (need(m)) copyText(C.toMarkdown(m.roots), 'Markdown'); },
  'copy-graph'(){ const m = model(); if (need(m)) copyText(C.toMermaidGraph(m.roots), 'Mermaid graph'); },
  'copy-mermaid'(){ const m = model(); if (need(m)) copyText(C.toMermaid(m.roots), 'Mermaid'); },
  'dl-txt'(){ const m = model(); if (need(m)) download(C.slug(m.roots) + '.txt', C.toTree(m.clean, SET) + '\n', 'text/plain'); },
  'dl-opml'(){ const m = model(); if (need(m)) download(C.slug(m.roots) + '.opml', C.toOPML(m.roots, m.roots[0].text), 'text/x-opml'); },
  'dl-json'(){ const m = model(); if (need(m)) download(C.slug(m.roots) + '.json', C.toJSON(m.roots), 'application/json'); },
  'dl-svg'(){ const m = model(); if (need(m)) download(C.slug(m.roots) + '.svg', exportSVG().svg, 'image/svg+xml'); },
  'dl-png'(){ const m = model(); if (need(m)) downloadPNG(C.slug(m.roots)); },
  'print-tree'(){ printAs('tree'); },
  'print-map'(){ printAs('map'); }
};
$('#fileMenu').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  $('#fileMenu').open = false;
  actions[b.dataset.act]();
});
$('#fileInput').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  const t = await f.text(); e.target.value = '';
  setValue(t.replace(/\r\n?/g, '\n'));
  normalize(true, true);
  ta.setSelectionRange(0, 0); ta.scrollTop = 0;
  changed();
});

/* ---------- start ---------- */
(function init(){
  const saved = loadSaved() || {};
  theme = THEMES.some(t => t[0] === saved.theme) ? saved.theme : 'system';
  font = FONTS.some(f => f[0] === saved.font) ? saved.font : 'system';
  fill = typeof saved.fill === 'string' && saved.fill.trim() ? saved.fill.trim() : 'TBD';
  $('#fillInput').value = fill;
  view = saved.view === 'map' ? 'map' : 'text';
  applyTheme();
  applyFont();
  ta.value = typeof saved.text === 'string' ? saved.text : sampleText();
  normalize(false, true);
  setView(view);
  changed();
  if (matchMedia('(pointer:fine)').matches && view !== 'map'){
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    syncCaretUI();
  }
})();
