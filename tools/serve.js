#!/usr/bin/env node
// Tiny static server for local testing. Pages use root-absolute paths
// (/app.js), so they do not work from file://.
//
//   node tools/serve.js [root] [testDir] [port]
//   root defaults to the repo root; files in testDir are served under /__test/
//   (handy for throwaway pages that drive the app into a given state).
'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..')),extra=process.argv[3],port=+process.argv[4]||8765;
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.xml':'application/xml','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain'};
http.createServer((q,r)=>{
  const p=decodeURIComponent(q.url.split('?')[0]);
  let f=p.startsWith('/__test/')&&extra?path.join(extra,p.slice(8)):path.join(root,p);
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
  fs.readFile(f,(e,d)=>{
    if(e){const nf=path.join(root,'404.html');r.writeHead(404,{'Content-Type':T['.html']});r.end(fs.existsSync(nf)?fs.readFileSync(nf):'not found');return;}
    r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});r.end(d);});
}).listen(port,()=>console.log('serving '+root+' on http://localhost:'+port));
