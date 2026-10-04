#!/usr/bin/env node
// Verify every documentation link (REFS) in exams/*.js resolves to a real page.
//
//   node tools/check-links.js            all exams
//   node tools/check-links.js ccar-p     one exam
//
// An HTTP 200 is not proof: platform.claude.com answers 200 with a generic
// "Documentation | Claude Platform" page for paths that do not exist. So a
// link only passes when the final page has a specific <title> that is not a
// known not-found or generic-shell title.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const BAD_TITLES=[/^Documentation \| Claude Platform$/i,/not found/i,/\b404\b/,/page not found/i,/^Claude Code Docs$/i];
const only=process.argv[2];
const files=fs.readdirSync(path.join(ROOT,'exams')).filter(f=>f.endsWith('.js')&&(!only||f===only+'.js'));
const byUrl=new Map();
for(const f of files){
  const c={};vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(ROOT,'exams',f),'utf8')+';this.REFS=REFS;',c);
  for(const [id,ref] of Object.entries(c.REFS)){
    const url=ref.split('|')[0].split('#')[0];
    if(!byUrl.has(url))byUrl.set(url,[]);
    byUrl.get(url).push(f.replace('.js','')+':'+id);
  }
}
async function check(url){
  try{
    const r=await fetch(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 certprep-link-check'},signal:AbortSignal.timeout(30000)});
    const body=await r.text();
    const t=((body.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1]||'').replace(/\s+/g,' ').trim();
    if(r.status!==200)return{ok:false,why:'HTTP '+r.status};
    if(t&&BAD_TITLES.some(re=>re.test(t)))return{ok:false,why:'generic/not-found title "'+t+'"'};
    return{ok:true,title:t||'(no title)',final:r.url};
  }catch(e){return{ok:false,why:e.name==='TimeoutError'?'timeout':e.message};}
}
(async()=>{
  const urls=[...byUrl.keys()];let i=0,bad=0;
  console.log('checking '+urls.length+' unique pages from '+files.join(', '));
  await Promise.all(Array.from({length:8},async()=>{
    while(i<urls.length){const u=urls[i++];const r=await check(u);
      if(r.ok)console.log('ok    '+u+'  ['+r.title.slice(0,60)+']');
      else{bad++;console.log('FAIL  '+u+'  '+r.why+'  used by '+byUrl.get(u).join(' '));}}
  }));
  console.log(bad?bad+' broken link(s)':'all links ok');process.exit(bad?1:0);
})();
