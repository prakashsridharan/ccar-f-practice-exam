// Shared site chrome for every page: the CertPrep header with its Certifications menu, the
// per-exam tab bar, the certification list (hub and vendor pages) and the footer.
// Used by tools/build-site.js (static pages) and tools/build-learn.js (guide and resources pages).
//
// The catalogue is /site.json. Counts (lessons, questions, tests, domains) are not stored
// there: they are read from the generated exams/<id>.js bundles, so they never go stale.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const SITE=JSON.parse(fs.readFileSync(path.join(ROOT,'site.json'),'utf8'));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// Attach path and counts to every live exam from its bundle.
for(const v of SITE.vendors)for(const x of v.exams){
  x.vendor=v;
  const f=path.join(ROOT,'exams',x.id+'.js');
  if(x.status!=='live'||!fs.existsSync(f))continue;
  const c={};vm.createContext(c);
  vm.runInContext(fs.readFileSync(f,'utf8')+';this.EXAM=EXAM;this.BQ=BQ;this.TESTS=typeof TESTS!=="undefined"?TESTS:[];this.LEARN=typeof LEARN!=="undefined"?LEARN:null;',c);
  x.path=c.EXAM.path;x.learn=c.LEARN?c.LEARN.u:null;x.resources=x.path+'resources/';
  x.counts={lessons:c.LEARN?c.LEARN.lessons.length:0,questions:c.BQ.length,tests:c.TESTS.length,domains:Object.keys(c.EXAM.domains).length,
    items:c.EXAM.blueprint.questionCount,minutes:Math.round(c.EXAM.blueprint.durationSec/60)};
}
const exams=()=>SITE.vendors.flatMap(v=>v.exams);
const exam=id=>exams().find(x=>x.id===id);
const live=x=>x.status==='live'&&x.counts;

// Header: brand, Certifications menu (a <details>, so it opens without JavaScript; /site.js
// closes it on Escape or an outside click), Resources.
function siteHeader(){
  const groups=SITE.vendors.map(v=>'<div class="sh-g"><div class="sh-gt">'+esc(v.name)+'</div>'+
    (v.exams.length?v.exams.map(x=>live(x)?
      '<div class="sh-x"><a class="sh-xn" href="'+(x.learn||x.path)+'"><b>'+esc(x.code)+'</b><span>'+esc(x.name)+'</span></a>'+
      '<span class="sh-xl">'+(x.learn?'<a href="'+x.learn+'">Guide</a>':'')+'<a href="'+x.path+'">Tests</a></span></div>':
      '<div class="sh-x sh-soon"><b>'+esc(x.code)+'</b><span>'+esc(x.name)+'</span><i>Coming soon</i></div>').join(''):
      '<div class="sh-x sh-soon"><span>'+esc(v.note||'Coming soon')+'</span><i>Coming soon</i></div>')+
    (v.url&&v.exams.filter(live).length>1?'<a class="sh-all" href="'+v.url+'">All '+esc(v.name.split(' (')[0])+' certifications &rarr;</a>':'')+'</div>').join('');
  return '<header class="sh"><div class="sh-in">'+
    '<a class="sh-brand" href="/"><span class="sh-logo" aria-hidden="true">CP</span>'+esc(SITE.name)+'</a>'+
    '<nav class="sh-nav" aria-label="Site"><details class="sh-m"><summary>Certifications</summary><div class="sh-p">'+groups+'</div></details>'+
    '<a class="sh-a" href="/resources/">Resources</a></nav></div></header>';
}

// Tab bar for every page of one exam. active: 'learn' | 'tests' | 'resources'.
// The Practice tests tab keeps class "hp": learn.js turns it into "Back to ..." after a "Read lesson" jump.
function examTabs(id,active){
  const x=exam(id);
  const tab=(k,href,label,cls)=>'<a class="xt-t'+(cls?' '+cls:'')+(k===active?' on':'')+'" href="'+href+'"'+(k===active?' aria-current="page"':'')+'>'+label+'</a>';
  return '<nav class="xt" aria-label="'+esc(x.code)+'"><div class="xt-in"><div class="xt-h"><b>'+esc(x.code)+'</b><span>'+esc(x.name)+'</span></div><div class="xt-ts">'+
    (x.learn?tab('learn',x.learn,'Learning guide'):'')+tab('tests',x.path,'Practice tests','hp')+tab('resources',x.resources,'Resources')+'</div></div></nav>';
}

// One row per exam, grouped by vendor. vendorId limits it to one vendor (the vendor pages).
function certList(vendorId){
  const vs=SITE.vendors.filter(v=>!vendorId||v.id===vendorId);
  const all=vs.flatMap(v=>v.exams);
  const filters=all.length>6?'<div class="cl-f js-only"><input type="search" class="cl-q" placeholder="Search certifications" aria-label="Search certifications"></div>':'';
  return filters+vs.map(v=>'<section class="cl-v" data-vendor="'+v.id+'">'+(vendorId?'':'<div class="cl-vh"><h2>'+esc(v.name)+'</h2>'+
      (v.url&&v.exams.filter(live).length>1?'<a href="'+v.url+'">All '+esc(v.name.split(' (')[0])+' certifications &rarr;</a>':'')+'</div>')+
    (v.exams.length?v.exams.map(x=>live(x)?
      '<div class="cert-row" data-q="'+esc((x.code+' '+x.name+' '+v.name).toLowerCase())+'">'+
       '<div class="cr-m"><div class="cr-t"><span class="cr-c">'+esc(x.code)+'</span><span class="cr-l">'+esc(x.level)+'</span></div>'+
       '<h3>'+esc(x.name)+'</h3><p>'+esc(x.blurb)+'</p>'+
       '<div class="cr-f">'+(x.counts.lessons?'<span>'+x.counts.lessons+' lessons</span>':'')+'<span>'+x.counts.questions+' questions</span><span>'+x.counts.tests+' practice tests</span><span>'+x.counts.domains+' domains</span></div></div>'+
       '<div class="cr-a">'+(x.learn?'<a class="cr-b cr-p" href="'+x.learn+'">Learning guide</a>':'')+'<a class="cr-b" href="'+x.path+'">Practice tests</a></div></div>':
      '<div class="cert-row cr-soon"><div class="cr-m"><div class="cr-t"><span class="cr-c">'+esc(x.code)+'</span><span class="cr-s">Coming soon</span></div><h3>'+esc(x.name)+'</h3></div></div>').join(''):
      '<div class="cert-row cr-soon"><div class="cr-m"><div class="cr-t"><span class="cr-s">Coming soon</span></div><p>'+esc(v.note||'')+'</p></div></div>')+
    '</section>').join('');
}

function siteFooter(){
  const certs=exams().filter(live);
  return '<footer class="sf"><div class="sf-in">'+
    '<div class="sf-b"><a class="sh-brand" href="/"><span class="sh-logo" aria-hidden="true">CP</span>'+esc(SITE.name)+'</a>'+
    '<p>'+esc(SITE.tagline)+'. An independent study aid, not affiliated with or endorsed by Anthropic or any other certification provider.</p></div>'+
    '<div class="sf-c"><div class="sf-h">Certifications</div>'+certs.map(x=>'<a href="'+(x.learn||x.path)+'">'+esc(x.code)+' '+esc(x.level)+'</a>').join('')+'</div>'+
    '<div class="sf-c"><div class="sf-h">Site</div><a href="/">All certifications</a><a href="/resources/">Resources</a></div>'+
    '</div></footer>';
}

module.exports={SITE,ROOT,esc,exams,exam,live,siteHeader,examTabs,certList,siteFooter};
