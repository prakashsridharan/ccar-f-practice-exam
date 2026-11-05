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

// ---- privacy policy (/privacy/): linked from the footer, the sign-in dialog and the account menu ----
const PRIV_DATE='5 November 2026',CONTACT='contact@pratechlabs.com';// a GoDaddy alias; nothing can receive mail @certprep (its DNS name is a CNAME to GitHub Pages)
const privHtml=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Policy - ${esc(SITE.name)}</title>
<meta name="description" content="What ${esc(SITE.name)} collects, why, where it is stored, and how to delete your account.">
<meta name="robots" content="index, follow">
<meta name="author" content="PraTech Labs">
<link rel="canonical" href="${URL_}/privacy/">
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
  <h1>Privacy Policy</h1>
  <div class="sub">Last updated ${PRIV_DATE}</div>
</div>
<div class="container legal">
  <p>${esc(SITE.name)} is a free study site for certification exams. You can use all of it without an account. This page explains what we collect, why, where it is kept, and how to remove it. Questions: <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>

  <h2>Without an account</h2>
  <ul>
    <li><b>Your progress stays in your browser.</b> Practice test scores, study answers and completed lessons are saved in your browser's local storage. They never leave your device unless you sign in. Clearing your browser data removes them.</li>
    <li><b>Visit counts.</b> When a page opens we record the page, your browser type (user agent), the site that linked to us and any campaign tags in the link (such as utm_source). We do not record your name or email, and we do not use this to identify you. It tells us which pages and which shared posts are useful.</li>
    <li><b>No advertising or tracking cookies.</b> We do not set cookies.</li>
  </ul>

  <h2>With an account</h2>
  <p>Signing in is optional. It keeps your progress in step across your devices.</p>
  <ul>
    <li><b>What we store:</b> your email address; if you sign in with Google, the name and profile picture address Google shares; the dates you signed up and last signed in; and your study progress (practice test attempts and scores, your latest answer to each question, study mode answers, completed lessons and exercise ticks).</li>
    <li><b>What we do not store:</b> passwords (there are none), payment details, or your Google contacts, files or any other Google data.</li>
    <li><b>How it is used:</b> to sign you in and to show your progress on any device. In future it may power features for you, such as a progress dashboard or study suggestions. We will not sell it, share it for advertising, or send you marketing email without asking first.</li>
    <li><b>Sign-in emails:</b> when you ask for a sign-in link, we send one email with a link and a 6-digit code.</li>
  </ul>

  <h2>Services we use</h2>
  <ul>
    <li><b>Supabase</b> stores accounts, saved progress and visit counts, and runs sign-in.</li>
    <li><b>Resend</b> sends the sign-in emails.</li>
    <li><b>Google</b> handles "Continue with Google" if you choose it, and serves the fonts on these pages.</li>
    <li><b>GitHub Pages</b> hosts the site. Like any web host, it keeps standard server logs.</li>
  </ul>
  <p>These providers may process data in countries other than yours. Each acts under its own privacy terms.</p>

  <h2>How long we keep it</h2>
  <p>Account data and saved progress are kept until you delete your account. Visit counts are kept as aggregate statistics.</p>

  <h2>Your choices</h2>
  <ul>
    <li><b>Delete your account</b> at any time: sign in, open the account menu in the header and choose "Delete my account". This deletes your account and the progress saved to it straight away. Progress stored in your browser stays there until you clear it.</li>
    <li><b>See or correct your data, or ask any question:</b> email <a href="mailto:${CONTACT}">${CONTACT}</a>.</li>
  </ul>

  <h2>Children</h2>
  <p>${esc(SITE.name)} is meant for adults preparing for professional certifications. It is not directed at children under 16, and we do not knowingly create accounts for them.</p>

  <h2>Changes</h2>
  <p>If this policy changes, we will update this page and the date at the top.</p>

  <div class="notice">
    <strong>Important Note</strong>
    <p>${esc(SITE.name)} is an independent study aid, not affiliated with or endorsed by Anthropic or any other certification provider.</p>
  </div>
</div>
<!--site-footer--><!--/site-footer-->
<script src="/site.js?v=${V}"></script>
</body>
</html>
`;
fs.mkdirSync(path.join(ROOT,'privacy'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'privacy','index.html'),privHtml);

// ---- fill the marked regions ----
const pages=['index.html','resources/index.html','privacy/index.html',
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
  // The author meta, the site's own domain and the privacy contact address are the allowed mentions.
  const scan=out.replace(/<meta name="author"[^>]*>/,'').split('certprep.pratechlabs.com').join('').split(CONTACT).join('');
  if(scan.includes(EM)||scan.includes(EN))errors.push(p+': contains an em or en dash');
  for(const t of banned)if(new RegExp(t,'i').test(scan))errors.push(p+': contains a banned term');
  if(out!==src)fs.writeFileSync(f,out);
}

// ---- sitemap: /resources/ ----
const smf=path.join(ROOT,'sitemap.xml');
let sm=fs.readFileSync(smf,'utf8').replace(/\r\n/g,'\n');
for(const [p,pr] of [['/resources/','0.6'],['/privacy/','0.2']])
  if(!sm.includes('<loc>'+URL_+p+'</loc>'))
    sm=sm.replace('</urlset>','  <url>\n    <loc>'+URL_+p+'</loc>\n    <lastmod>'+new Date().toISOString().slice(0,10)+'</lastmod>\n    <changefreq>'+(pr==='0.2'?'yearly':'monthly')+'</changefreq>\n    <priority>'+pr+'</priority>\n  </url>\n</urlset>');
fs.writeFileSync(smf,sm);

if(errors.length){console.error('build-site: '+errors.length+' error(s)\n  '+errors.join('\n  '));process.exit(1);}
console.log('build-site: '+pages.length+' pages, '+liveExams.length+' live exams'+(contentDir?'':' (no content dir: banned-term check skipped)'));
