#!/usr/bin/env node
// Tell Bing (and other IndexNow engines) which URLs changed: node tools/indexnow.js [url-or-path ...]
// With no arguments it submits every <loc> in sitemap.xml. The key file /<key>.txt at the site root
// proves ownership; it is public by design (IndexNow protocol). Run after a deploy is live.
'use strict';
const fs=require('fs'),path=require('path'),https=require('https');
const ROOT=path.resolve(__dirname,'..'),HOST='certprep.pratechlabs.com';
const keyFile=fs.readdirSync(ROOT).find(f=>/^[0-9a-f]{32}\.txt$/.test(f));
if(!keyFile){console.error('no IndexNow key file at the site root');process.exit(1);}
const key=keyFile.slice(0,-4);
let urls=process.argv.slice(2).map(u=>u.startsWith('http')?u:'https://'+HOST+(u.startsWith('/')?u:'/'+u));
if(!urls.length)urls=[...fs.readFileSync(path.join(ROOT,'sitemap.xml'),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const body=JSON.stringify({host:HOST,key,keyLocation:'https://'+HOST+'/'+keyFile,urlList:urls});
const req=https.request({hostname:'api.indexnow.org',path:'/indexnow',method:'POST',headers:{'Content-Type':'application/json; charset=utf-8','Content-Length':Buffer.byteLength(body)}},
  res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{console.log('IndexNow: HTTP '+res.statusCode+' for '+urls.length+' URL(s)'+(d?' '+d.slice(0,200):''));process.exit(res.statusCode<300?0:1);});});
req.on('error',e=>{console.error(e.message);process.exit(1);});req.end(body);
