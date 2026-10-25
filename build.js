/* Inlines src/ into dist/twig.html so the whole app is one portable file. No dependencies. */
const fs = require('fs');
const read = p => fs.readFileSync(p, 'utf8');
const html = read('index.html')
  .replace('<link rel="stylesheet" href="src/styles.css">', () => '<style>\n' + read('src/styles.css').trim() + '\n</style>')
  .replace('<script src="src/core.js"></script>', () => '<script>\n' + read('src/core.js').trim() + '\n</script>')
  .replace('<script src="src/app.js"></script>', () => '<script>\n' + read('src/app.js').trim() + '\n</script>');
fs.mkdirSync('dist', {recursive: true});
fs.writeFileSync('dist/twig.html', html);
console.log('dist/twig.html', (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB');
