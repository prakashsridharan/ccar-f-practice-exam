#!/usr/bin/env node
// Fill the shared site chrome into the static pages and write the site-wide Resources page.
//
//   node tools/build-site.js [content-dir]      e.g. node tools/build-site.js ../certprep-content
//
// Run it last: node tools/build.js <content> -> node tools/build-learn.js <content> <exam> (each) -> this.
//
// Static pages carry marked regions, rewritten from tools/site-nav.js on every run:
//   <!--site-icons-->...<!--/site-icons-->   (in <head>: favicons, manifest, link-preview image)
//   <!--site-header-->...<!--/site-header-->
//   <!--exam-tabs <exam-id> <learn|tests|resources>-->...<!--/exam-tabs-->
//   <!--cert-list [vendor-id]-->...<!--/cert-list-->
//   <!--site-footer-->...<!--/site-footer-->
// Pages: index.html, every <vendor>/index.html and every live exam shell. Writes /resources/
// and its sitemap entry. Fails on an em or en dash, on a term from the content repo's
// outline.json bannedTerms (when content-dir is given; the <meta name="author"> line and the
// site's domain are exempt),
// and on a page with no site header.
'use strict';
const fs=require('fs'),path=require('path');
const N=require('./site-nav');
const {ROOT,SITE,esc}=N;
const URL_='https://certprep.pratechlabs.com';
const EM=String.fromCharCode(0x2014),EN=String.fromCharCode(0x2013);
const contentDir=process.argv[2];
const errors=[];

const banned=new Set();
if(contentDir)for(const v of fs.readdirSync(contentDir))for(const x of N.exams()){
  const o=path.join(contentDir,v,x.id,'learn','outline.json');
  if(fs.existsSync(o))for(const t of JSON.parse(fs.readFileSync(o,'utf8')).bannedTerms||[])banned.add(t);
}

// ---- site-wide Resources page ----
const V=(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/site\.css\?v=([\w]+)/)||[])[1]||'1';
const liveExams=N.exams().filter(N.live);
const resHtml=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Study Resources for Claude Certifications - ${esc(SITE.name)}</title>
<meta name="description" content="Curated official documentation and hands-on notebooks for each certification on ${esc(SITE.name)}, grouped by exam domain.">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="PraTech Labs">
<link rel="canonical" href="${URL_}/resources/">
<meta property="og:type" content="website">
<meta property="og:url" content="${URL_}/resources/">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="Study Resources - ${esc(SITE.name)}">
<meta property="og:description" content="Curated official documentation and hands-on notebooks for each certification, grouped by exam domain.">
<meta name="twitter:card" content="summary_large_image">
<!--site-icons--><!--/site-icons-->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/hub.css?v=${V}">
<link rel="stylesheet" href="/site.css?v=${V}">
</head>
<body>
<!--site-header--><!--/site-header-->
<div class="hdr">
  <h1>Study Resources</h1>
  <div class="sub">The official documentation and hands-on notebooks behind every lesson, grouped by exam and domain.</div>
</div>
<div class="container">
  <div class="cl-vh"><h2>Official certification information</h2></div>
  <ul class="res-g">
${(SITE.official||[]).map(g=>`    <li><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.label)}</a></li>`).join('\n')}
  </ul>
  <div class="cl-vh"><h2>By certification</h2></div>
${liveExams.map(x=>`  <div class="cert-row"><div class="cr-m"><div class="cr-t"><span class="cr-c">${esc(x.code)}</span><span class="cr-l">${esc(x.level)}</span></div><h3>${esc(x.name)}</h3><p>Every documentation page the ${esc(x.code)} lessons cite, grouped by the exam's ${x.counts.domains} domains, plus runnable notebooks.</p></div><div class="cr-a"><a class="cr-b cr-p" href="${x.resources}">${esc(x.code)} resources</a></div></div>`).join('\n')}
  <div class="cl-vh"><h2>Official documentation</h2></div>
  <ul class="res-g">
${SITE.general.map(g=>`    <li><a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.label)}</a></li>`).join('\n')}
  </ul>
  <div class="notice">
    <strong>Important Note</strong>
    <p>These are links to public documentation from the certification providers, collected as an independent study aid. ${esc(SITE.name)} is not affiliated with or endorsed by Anthropic or any other certification provider.</p>
  </div>
</div>
<!--site-footer--><!--/site-footer-->
<script src="/site.js?v=${V}"></script>
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT,'resources'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'resources','index.html'),resHtml);

// ---- fill the marked regions ----
const pages=['index.html','resources/index.html',
  ...SITE.vendors.filter(v=>v.url).map(v=>v.url.replace(/^\//,'')+'index.html'),
  ...liveExams.map(x=>x.path.replace(/^\//,'')+'index.html')];
const RE=/<!--(site-icons|site-header|site-footer|exam-tabs|cert-list)([^>]*?)-->[\s\S]*?<!--\/\1-->/g;
for(const p of pages){
  const f=path.join(ROOT,p);
  if(!fs.existsSync(f)){errors.push(p+': missing');continue;}
  const src=fs.readFileSync(f,'utf8');
  const out=src.replace(RE,(_,kind,args)=>{
    const a=args.trim().split(/\s+/).filter(Boolean);let body='';
    if(kind==='site-icons')body='\n'+N.headIcons()+'\n';
    else if(kind==='site-header')body=N.siteHeader();
    else if(kind==='site-footer')body=N.siteFooter();
    else if(kind==='cert-list')body=N.certList(a[0]);
    else{if(!N.exam(a[0])){errors.push(p+': exam-tabs for unknown exam '+a[0]);return _;}body=N.examTabs(a[0],a[1]);}
    return '<!--'+kind+args+'-->'+body+'<!--/'+kind+'-->';});
  if(!out.includes('<!--site-header-->'))errors.push(p+': no <!--site-header--> marker');
  // The author meta and the site's own domain (certprep.pratechlabs.com) are the allowed mentions.
  const scan=out.replace(/<meta name="author"[^>]*>/,'').split('certprep.pratechlabs.com').join('');
  if(scan.includes(EM)||scan.includes(EN))errors.push(p+': contains an em or en dash');
  for(const t of banned)if(new RegExp(t,'i').test(scan))errors.push(p+': contains a banned term');
  if(out!==src)fs.writeFileSync(f,out);
}

// ---- sitemap: /resources/ ----
const smf=path.join(ROOT,'sitemap.xml');
let sm=fs.readFileSync(smf,'utf8').replace(/\r\n/g,'\n');
if(!sm.includes('<loc>'+URL_+'/resources/</loc>'))
  sm=sm.replace('</urlset>','  <url>\n    <loc>'+URL_+'/resources/</loc>\n    <lastmod>'+new Date().toISOString().slice(0,10)+'</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n</urlset>');
fs.writeFileSync(smf,sm);

if(errors.length){console.error('build-site: '+errors.length+' error(s)\n  '+errors.join('\n  '));process.exit(1);}
console.log('build-site: '+pages.length+' pages, '+liveExams.length+' live exams'+(contentDir?'':' (no content dir: banned-term check skipped)'));
