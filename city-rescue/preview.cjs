const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const allowed=new Set(['index.html','style.css','core.js','app.js']);
http.createServer((req,res)=>{
 const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
 if(!allowed.has(name)){res.writeHead(404);res.end();return;}
 fs.readFile(path.join(__dirname,name),(err,data)=>{if(err){res.writeHead(500);res.end();return;}res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8'})[path.extname(name)],'Cache-Control':'no-store'});res.end(data);});
}).listen(4174,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4174'));
