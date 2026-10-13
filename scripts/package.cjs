// Developer-only convenience: refresh the optional one-file handout.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let html=read('index.html').replace('<link rel="stylesheet" href="styles.css">',()=>`<style>\n${read('styles.css')}\n</style>`);
html=html.replace(/  <script defer src="(?:engine|records|game)\.js"><\/script>\r?\n/g,'');
html=html.replace('href="./index.html"','href="./light-rhythm.html"');
const scripts=['engine.js','records.js','game.js'].map(name=>`<script>\n${read(name)}\n</script>`).join('\n');
html=html.replace('</body>',()=>`${scripts}\n</body>`);
fs.writeFileSync(path.join(root,'light-rhythm.html'),html,'utf8');
console.log('Created light-rhythm.html — standalone, no external assets.');
