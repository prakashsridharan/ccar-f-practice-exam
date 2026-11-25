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
  x.path=c.EXAM.path;x.learn=c.LEARN?c.LEARN.u:null;
  // A version that shares another exam's guide also shares its Resources page.
  x.resources=x.learn&&!x.learn.startsWith(x.path)?x.learn.replace(/learn\/$/,'resources/'):x.path+'resources/';
  x.cheat=x.learn&&fs.existsSync(path.join(ROOT,x.learn,'cheat-sheet','index.html'))?x.learn+'cheat-sheet/':null;
  x.counts={lessons:c.LEARN?c.LEARN.lessons.length:0,questions:c.BQ.length,tests:c.TESTS.length,domains:Object.keys(c.EXAM.domains).length,
    items:c.EXAM.blueprint.questionCount,minutes:Math.round(c.EXAM.blueprint.durationSec/60)};
}
const exams=()=>SITE.vendors.flatMap(v=>v.exams);
const exam=id=>exams().find(x=>x.id===id);
const live=x=>x.status==='live'&&x.counts;
// An exam replaced by a newer version (site.json supersededBy) stays live at its own URL but is
// not listed in menus, rows or the footer (the newer version's row links to it instead), unless
// site.json sets "list": true, as for CCAR-P Version 1 until it is retired.
const listed=x=>live(x)&&!x.preview&&(!x.supersededBy||x.list===true);
// site.json "preview": true keeps an exam out of every menu, row, footer and sitemap, marks its pages
// noindex, and site.js shows them only to a signed-in admin (a client-side gate, not access control).
const previewHead=x=>x&&x.preview?['<meta name="robots" content="noindex, nofollow">','<meta name="cp-preview" content="1">','<style id="cp-pv">body{visibility:hidden}</style>'].join('\n'):'';
// The version label is shown wherever an exam has a sibling version on the site.
const versioned=x=>!!(x.version&&(x.supersededBy||olderOf(x)));
// Every exam that names its exam guide version shows it (CCAR-F Version 1.0, CCAR-P Version 1.1 / 1.0).
const showVer=x=>!!x.version;
// Versions sharing one guide: links into the guide carry data-for="<guide> <exam path>" so site.js
// remembers which version the reader came from, and learn.js points the guide's practice-test links there.
const forA=x=>x.learn&&exams().some(y=>y!==x&&y.learn===x.learn)?' data-for="'+x.learn+' '+x.path+'"':'';
const olderOf=x=>exams().find(y=>y.supersededBy===x.id&&live(y));

// Logo: a progress ring closing into a check (concept A, chosen 2026-11-04). This is the
// light-on-dark version for the navy header and footer; /favicon.svg is the same mark on a tile.
const LOGO='<svg class="sh-mark" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="25" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="7"/><path d="M32 7a25 25 0 1 1-23.5 16.4" fill="none" stroke="#5fd3e0" stroke-width="7" stroke-linecap="round"/><path d="M21 33l8 8 15-17" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const brand=()=>'<a class="sh-brand" href="/" aria-label="'+esc(SITE.name)+' home">'+LOGO+'<span>'+esc(SITE.name).replace(/Prep$/,'<b>Prep</b>')+'</span></a>';
const ORIGIN='https://certprep.pratechlabs.com';
// <head> tags shared by every page: icons, theme colour, manifest and the link-preview image.
// With an exam id, pages of that exam (its practice tests and guide) use /og-<id>.png when it
// exists, so a shared link previews that exam instead of the generic CertPrep card.
function headIcons(id){
  const x=id&&exam(id),own=x&&fs.existsSync(path.join(__dirname,'..','og-'+id+'.png'));
  const img=ORIGIN+(own?'/og-'+id+'.png':'/og-image.png');
  const alt=own?SITE.name+': '+x.code+(x.version?' '+x.version:'')+' '+x.name+' practice tests and learning guide':SITE.name+': '+SITE.tagline;
  return ['<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    '<meta name="theme-color" content="#1B4F8A">',
    '<meta property="og:image" content="'+img+'">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="'+esc(alt)+'">',
    '<meta name="twitter:image" content="'+img+'">'].join('\n');
}

// Header: brand, Certifications menu (a <details>, so it opens without JavaScript; /site.js
// closes it on Escape or an outside click), Resources.
function siteHeader(){
  const groups=SITE.vendors.map(v=>'<div class="sh-g"><div class="sh-gt">'+esc(v.name)+'</div>'+
    (v.exams.length?v.exams.filter(x=>!x.preview&&(!x.supersededBy||x.list===true)).map(x=>live(x)?
      '<div class="sh-x"><a class="sh-xn" href="'+(x.learn||x.path)+'"'+forA(x)+'><b>'+esc(x.code)+'</b><span>'+esc(x.name)+(showVer(x)?' ('+esc(x.version)+')':'')+'</span></a>'+
      '<span class="sh-xl">'+(x.learn?'<a href="'+x.learn+'"'+forA(x)+'>Guide</a>':'')+'<a href="'+x.path+'">Tests</a></span></div>':
      '<div class="sh-x sh-soon"><b>'+esc(x.code)+'</b><span>'+esc(x.name)+'</span><i>Coming soon</i></div>').join(''):
      '<div class="sh-x sh-soon"><span>'+esc(v.note||'Coming soon')+'</span><i>Coming soon</i></div>')+
    (v.url&&v.exams.filter(listed).length>1?'<a class="sh-all" href="'+v.url+'">All '+esc(v.name.split(' (')[0])+' certifications &rarr;</a>':'')+'</div>').join('');
  return '<header class="sh"><div class="sh-in">'+
    brand()+
    '<nav class="sh-nav" aria-label="Site"><a class="sh-a sh-w" href="/">Home</a><details class="sh-m"><summary>Certifications</summary><div class="sh-p"><a class="sh-all sh-top" href="/">All certifications &rarr;</a>'+groups+'</div></details>'+
    '<a class="sh-a sh-rs" href="/resources/">Resources</a>'+
    // About, Privacy and Feedback live in one More menu at every width; Home joins it under 900px, Resources on phones.
    '<details class="sh-m sh-more"><summary>More</summary><div class="sh-p sh-pm"><a class="sh-mh" href="/">Home</a><a class="sh-mr" href="/resources/">Resources</a>'+(SITE.author?'<a href="/about/">About</a>':'')+'<a href="/privacy/">Privacy</a><button type="button" data-fb>Send feedback</button></div></details></nav>'+
    // Filled by site.js / account.js ("Sign in", or the account menu); hidden without JavaScript.
    '<div class="sh-acct"><button type="button" class="sh-in-btn" aria-label="Sign in" hidden><svg class="sh-in-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg><span class="sh-in-t">Sign in</span></button></div></div></header>';
}

// Tab bar for every page of one exam. active: 'learn' | 'tests' | 'resources'.
// The Practice tests tab keeps class "hp": learn.js turns it into "Back to ..." after a "Read lesson" jump.
function examTabs(id,active){
  const x=exam(id),newer=x.supersededBy&&active!=='tests'?exam(x.supersededBy):null;
  // The bar names the version wherever two versions of the exam are live (each has its own guide).
  const label=showVer(x)?x.name+' ('+x.version+')':x.name;
  // On an exam's own page, the guide and Resources tabs remember this version (forA).
  const fa=active==='tests'?forA(x):'';
  const tab=(k,href,label,cls,attr)=>'<a class="xt-t'+(cls?' '+cls:'')+(k===active?' on':'')+'" href="'+href+'"'+(attr||'')+(k===active?' aria-current="page"':'')+'>'+label+'</a>';
  return '<nav class="xt" aria-label="'+esc(x.code)+'"><div class="xt-in"><div class="xt-h"><b>'+esc(x.code)+'</b><span>'+esc(label)+'</span></div><div class="xt-ts">'+
    (x.learn?tab('learn',x.learn,'Learning guide','',fa):'')+tab('tests',(newer||x).path,'Practice tests','hp')+tab('resources',x.resources,'Resources','',fa)+'</div></div></nav>';
}

// One row per exam, grouped by vendor. vendorId limits it to one vendor (the vendor pages).
function certList(vendorId){
  const vs=SITE.vendors.filter(v=>!vendorId||v.id===vendorId);
  const all=vs.flatMap(v=>v.exams);
  const filters=all.length>6?'<div class="cl-f js-only"><input type="search" class="cl-q" placeholder="Search certifications" aria-label="Search certifications"></div>':'';
  return filters+vs.map(v=>'<section class="cl-v" data-vendor="'+v.id+'">'+(vendorId?'':'<div class="cl-vh"><h2>'+esc(v.name)+'</h2>'+
      (v.url&&v.exams.filter(listed).length>1?'<a href="'+v.url+'">All '+esc(v.name.split(' (')[0])+' certifications &rarr;</a>':'')+'</div>')+
    '<div class="cl-g">'+(v.exams.length?v.exams.filter(x=>!x.preview&&(!x.supersededBy||x.list===true)).map(x=>live(x)?
      '<div class="cert-row" data-q="'+esc((x.code+' '+x.name+' '+v.name).toLowerCase())+'">'+
       '<div class="cr-m"><div class="cr-t"><span class="cr-c">'+esc(x.code)+'</span><span class="cr-l">'+esc(x.level)+'</span>'+(showVer(x)?'<span class="cr-l">'+esc(x.version)+'</span>':'')+(x.tag?'<span class="cr-new">'+esc(x.tag)+'</span>':'')+'</div>'+
       '<h3>'+esc(x.name)+'</h3><p>'+esc(x.blurb)+'</p>'+
       '<div class="cr-f">'+(x.counts.lessons?'<span>'+x.counts.lessons+' lessons</span>':'')+'<span>'+x.counts.questions+' questions</span><span>'+x.counts.tests+' practice tests</span><span>'+x.counts.domains+' domains</span>'+'</div>'+(olderOf(x)&&!listed(olderOf(x))?'<p class="cr-o">Older format: <a href="'+olderOf(x).path+'">'+esc(olderOf(x).version||'previous version')+'</a></p>':'')+'</div>'+
       '<div class="cr-a">'+(x.learn?'<a class="cr-b cr-p" href="'+x.learn+'"'+forA(x)+'>Learning guide</a>':'')+'<a class="cr-b" href="'+x.path+'">Practice tests</a>'+(x.cheat?'<a class="cr-b" href="'+x.cheat+'"'+forA(x)+'>Cheat sheet</a>':'')+'</div></div>':
      '<div class="cert-row cr-soon"><div class="cr-m"><div class="cr-t"><span class="cr-c">'+esc(x.code)+'</span><span class="cr-s">Coming soon</span></div><h3>'+esc(x.name)+'</h3></div></div>').join(''):
      '<div class="cert-row cr-soon"><div class="cr-m"><div class="cr-t"><span class="cr-s">Coming soon</span></div><p>'+esc(v.note||'')+'</p></div></div>')+'</div>'+
    '</section>').join('');
}

function siteFooter(){
  const certs=exams().filter(listed);
  return '<footer class="sf"><div class="sf-in">'+
    '<div class="sf-b">'+brand()+
    '<p>'+esc(SITE.tagline)+'. An independent study aid, not affiliated with or endorsed by Anthropic or any other certification provider.</p></div>'+
    '<div class="sf-c"><div class="sf-h">Certifications</div>'+certs.map(x=>'<a href="'+(versioned(x)?x.path:(x.learn||x.path))+'">'+esc(x.code)+' '+esc(x.level)+(showVer(x)?' '+esc(x.version.replace('Version ','v')):'')+'</a>').join('')+'</div>'+
    '<div class="sf-c"><div class="sf-h">Site</div><a href="/">All certifications</a><a href="/resources/">Resources</a>'+(SITE.author?'<a href="/about/">About</a>':'')+'<a href="/privacy/">Privacy</a><button type="button" class="sf-fb" data-fb>Send feedback</button></div>'+
    '</div></footer>';
}

// The author (site.json author): the About page and the byline on every guide page. Empty fields are left out.
function byline(){const a=SITE.author;if(!a)return '';
  return '<p class="byline">'+(a.photo?'<img src="'+esc(a.photo)+'" alt="" width="28" height="28">':'')+'<span>Written and maintained by <a href="/about/">'+esc(a.name)+'</a>'+(a.title?', '+esc(a.title):'')+'</span></p>';}
function authorLd(){const a=SITE.author;return a?{'@type':'Person',name:a.name,url:'https://certprep.pratechlabs.com/about/',...(a.title?{jobTitle:a.title}:{}),...(a.linkedin?{sameAs:[a.linkedin]}:{})}:undefined;}
module.exports={previewHead,SITE,byline,authorLd,ROOT,esc,exams,exam,live,listed,siteHeader,examTabs,certList,siteFooter,headIcons};
