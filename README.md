# Twig

Text first mind mapping. Indent to build a mind map, a tree, a data set, or whatever you are thinking through. One page, no dependencies, no account, no tracking. Works offline.

Type or paste text on the left, see the map on the right. Everything stays in your browser (`localStorage`).

## Use it

Open `index.html` in a browser, or build a single portable file:

```bash
npm run build   # writes dist/twig.html (about 60 KB)
```

## Features

- Two views: Text to edit, Map to read. The map is a view; click a node twice to fix its wording
- Paste `tree` output, a Markdown list or any indented outline and it is converted
- Keyboard first: Tab / Shift+Tab indent, Enter sibling, Ctrl+Enter child, Alt+↑↓ move, F2 rename
- Right-click menu (text view): set indent level, move to line, duplicate, copy or delete a branch
- Skip a level and Twig adds a placeholder parent (TBD by default), a spot for ideas you cannot name yet
- Export: tree text, Markdown, Mermaid mindmap, OPML, JSON, SVG, PNG, PDF (via print)
- Settings: theme (System, Light, Dark, Tokyo Night), font (system or Google Fonts, loaded only when chosen) and the text for placeholder parents
- Works on touch screens

## Develop

No build step is needed for development. Serve the folder and edit `src/`:

```bash
npm run serve   # http://localhost:8080
npm test        # needs Node 18+
```

| File | Purpose |
| --- | --- |
| `src/core.js` | Pure logic: parsing, tree operations, map layout, exports. No DOM, unit tested |
| `src/app.js` | Editor, map interaction, menus, storage |
| `src/styles.css` | Themes and layout |
| `build.js` | Inlines everything into `dist/twig.html` |

## Links

[github.com/hfactor/twig](https://github.com/hfactor/twig)

## License

[MIT](LICENSE)
