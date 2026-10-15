const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'city-rescue');
const read=name=>fs.readFileSync(path.join(dir,name),'utf8');
let html=read('index.html').replace('<link rel="stylesheet" href="style.css">',()=>`<style>\n${read('style.css')}\n</style>`).replace(/<script defer src="(?:core|app)\.js"><\/script>/g,'');
html=html.replace('href="./index.html"','href="./energy-city.html"').replace('</body>',()=>`<script>\n${read('core.js')}\n</script><script>\n${read('app.js')}\n</script></body>`);
fs.writeFileSync(path.join(root,'energy-city.html'),html);console.log('Created energy-city.html (standalone)');
