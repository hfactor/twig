# Twig

Text first mind mapping. Indent to build, link to connect.

Write an outline, see it as a map. One page, no dependencies, no account, no tracking, works offline. Your document stays in your browser.

## Use it

Open `index.html` in a browser, or build one portable file:

```bash
npm run build   # writes dist/twig.html (about 100 KB)
```

The first thing you see is a short note about Twig, written in Twig. File → Load example also has debugging notes, an app screen flow and an idea board (three linked trees).

## What it does

- **Two views.** Text to write, Map to read. On the map, click a node to rename it, jump to its line or start a link. Drag a node to move its whole branch: drop on the middle to make it a child, on an edge to make it a sibling.
- **Tabs.** Each document is a tab. New opens a blank tab, Clear is separate, and closing or clearing a tab with real content asks first and offers a download. Documents are stored only in your browser.
- **Trees.** Enter on a top-level line starts a new tree. Each tree is badged in the text and listed beside the map.
- **Links.** Connect any two lines, across branches and trees, with loops allowed.
  - Press the `@` button, then click the line to link to (Shift-click for a dashed, indirect link).
  - Or end a line with `@12 ` (solid) or `@@12 ` (dashed) to link it to line 12. The number is dropped once the link is drawn.
  - Links are drawn into the text as box characters to the right of each line and follow their two lines however you edit. On screen links are grey with a dot where each starts and an arrow where it ends; hover a line, or put the caret on it, and its links light up in colour. Dashed links are drawn dash, gap, dash. The status bar names the line's links in words.
  - Remove a link from the right-click menu, or press Backspace with the caret in the drawn lines.
- **TBD placeholders.** For work in progress, `TBD` fills the gaps, whichever way you work: press Tab again on a first child to add a TBD parent, use the right-click level chips, paste an outline that skips a level, or link to a line that does not exist yet (`@15` on a 12 line note adds TBD lines up to 15). Change the text in Settings.
- **Import and export.** Paste `tree` output, a Markdown list or any indented outline. Copy as text, Markdown, Mermaid mind map or Mermaid graph; download `.txt`, `.opml`, `.json`, `.svg` or `.png`; print the tree or map to PDF.
- **Settings.** Theme (System, Light, Dark, Tokyo Night), font (system, or a Google font loaded only when chosen) and the placeholder text.
- **Phone friendly.** One compact header, a scrollable tool strip, and a readable map. Not a full mobile editor, but clean.

Keyboard: Tab and Shift+Tab indent, Enter adds a sibling, Ctrl+Enter a child, Alt+↑↓ moves a branch, Esc then Tab leaves the editor.

## Develop

No build step is needed while developing. Serve the folder and edit `src/`:

```bash
npm run serve   # http://localhost:8080
npm test        # needs Node 18+
```

| File | Purpose |
| --- | --- |
| `src/core.js` | Pure logic: parsing, link art, tree operations, map layout, exports. No DOM, unit tested |
| `src/examples.js` | The three example documents |
| `src/app.js` | Editor, map interaction, menus, settings, storage |
| `src/styles.css` | Themes and layout |
| `build.js` | Inlines everything into `dist/twig.html` |

## Feedback

Ideas and problems are welcome as [GitHub issues](https://github.com/hfactor/twig/issues).

## Links

[github.com/hfactor/twig](https://github.com/hfactor/twig)

## License

[MIT](LICENSE)
