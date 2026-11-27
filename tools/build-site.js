#!/usr/bin/env node
// Fill the shared site chrome into the static pages and write the site-wide Resources page.
//
//   node tools/build-site.js [content-dir]      e.g. node tools/build-site.js ../certprep-content
//
// Run it last: node tools/build.js <content> -> node tools/build-learn.js <content> <exam> (each) -> this.
//
// Static pages carry marked regions, rewritten from tools/site-nav.js on every run:
//   <!--site-icons [exam]-->...<!--/site-icons-->   (in <head>: favicons, manifest, link-preview image; an exam id picks /og-<id>.png)
//   <!--site-header-->...<!--/site-header-->
//   <!--exam-tabs <exam-id> <learn|tests|resources>-->...<!--/exam-tabs-->
//   <!--cert-list [vendor-id]-->...<!--/cert-list-->
//   <!--site-footer-->...<!--/site-footer-->
//   <!--exam-faq <exam-id>-->...<!--/exam-faq-->   (exam shells' crawler block: EXAM.copy.faq as
//                                                 static text plus FAQPage JSON-LD; the app renders the same list)
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
<meta name="author" content="Prakash Sridharan">
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
${liveExams.filter(x=>!x.preview).map(x=>`  <div class="cert-row"><div class="cr-m"><div class="cr-t"><span class="cr-c">${esc(x.code)}</span><span class="cr-l">${esc(x.level)}</span></div><h3>${esc(x.name)}</h3><p>Every documentation page the ${esc(x.code)} lessons cite, grouped by the exam's ${x.counts.domains} domains, plus runnable notebooks.</p></div><div class="cr-a"><a class="cr-b cr-p" href="${x.resources}">${esc(x.code)} resources</a></div></div>`).join('\n')}
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
const PRIV_DATE='20 November 2026',CONTACT='contact@pratechlabs.com';// a GoDaddy alias; nothing can receive mail @certprep (its DNS name is a CNAME to GitHub Pages)
const privHtml=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Policy - ${esc(SITE.name)}</title>
<meta name="description" content="What ${esc(SITE.name)} collects, why, where it is stored, and how to delete your account.">
<meta name="robots" content="index, follow">
<meta name="author" content="Prakash Sridharan">
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
    <li><b>Visit counts.</b> When a page opens we record the page, your browser type (user agent), the site that linked to us, any campaign tags in the link (such as utm_source) and an anonymous visitor ID. The ID is a random code made in your browser and kept in its local storage, so that one person reading ten pages counts as one visitor, not ten. It is not linked to your account, name or email, and clearing this site's data in your browser removes it. We do not record your name or email, and we do not use this to identify you. It tells us which pages and which shared posts are useful.</li>
    <li><b>Course link clicks.</b> When you click a link to one of our courses on Udemy, we record which course and coupon the link was for, the page you clicked it on, your browser type and the same anonymous visitor ID. It tells us how many people use those links. What happens on Udemy itself is covered by Udemy's own privacy policy.</li>
    <li><b>Feedback.</b> If you send feedback with the Feedback button, we store your message, the rating and topic you choose, the address and title of the page you sent it from and your browser type. Your email is stored only if you add it, and is used only to reply to you. Only the site owner can read feedback.</li>
    <li><b>No advertising or tracking cookies.</b> We do not set cookies.</li>
  </ul>

  <h2>With an account</h2>
  <p>Signing in is optional. It keeps your progress in step across your devices.</p>
  <ul>
    <li><b>What we store:</b> your email address; if you sign in with Google, the name and profile picture address Google shares; the dates you signed up and last signed in; and your study progress (practice test attempts and scores, your latest answer to each question, study mode answers, completed lessons and exercise ticks).</li>
    <li><b>What we do not store:</b> passwords (there are none), payment details, or your Google contacts, files or any other Google data.</li>
    <li><b>How it is used:</b> to sign you in and to show your progress on any device. In future it may power features for you, such as a progress dashboard or study suggestions. We will not sell it, share it for advertising, or send you marketing email without asking first.</li>
    <li><b>Signing out</b> removes your progress from that browser. It stays in your account and comes back when you sign in again.</li>
    <li><b>Sign-in emails:</b> when you ask for a sign-in link, we send one email with a link and a 6-digit code.</li>
  </ul>

  <h2>Services we use</h2>
  <ul>
    <li><b>Supabase</b> stores accounts, saved progress, visit counts, course link clicks and feedback, and runs sign-in.</li>
    <li><b>Resend</b> sends the sign-in emails.</li>
    <li><b>Google</b> handles "Continue with Google" if you choose it, and serves the fonts on these pages.</li>
    <li><b>GitHub Pages</b> hosts the site. Like any web host, it keeps standard server logs.</li>
  </ul>
  <p>These providers may process data in countries other than yours. Each acts under its own privacy terms.</p>

  <h2>How long we keep it</h2>
  <p>Account data and saved progress are kept until you delete your account. Visit counts are kept as aggregate statistics. Feedback is kept while it is useful for improving the site, and you can ask for yours to be deleted.</p>

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

// ---- About (/about/): who writes the guides and tests (site.json author; empty fields are left out) ----
const A=SITE.author;
if(A){
  const SUM=[].concat(A&&A.summary||[]);const EDU=A.education||[];
  const ld={'@context':'https://schema.org','@type':'AboutPage',url:URL_+'/about/',name:'About '+SITE.name,
    mainEntity:Object.assign(N.authorLd(),SUM.length?{description:SUM.join(' ')}:{},EDU.length?{alumniOf:EDU.map(e=>({'@type':'EducationalOrganization',name:e.slice(e.indexOf(', ')+2)}))}:{},A.photo?{image:URL_+A.photo}:{},
      A.credentials.length?{hasCredential:A.credentials.map(c=>({'@type':'EducationalOccupationalCredential',name:c.name||c}))}:{})};
  const li=(c)=>typeof c==='string'?esc(c):(c.url?'<a href="'+esc(c.url)+'" target="_blank" rel="noopener">'+esc(c.name)+'</a>':esc(c.name))+(c.note?' <span class="ab-n">'+esc(c.note)+'</span>':'');
  const aboutHtml=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>About - ${esc(SITE.name)}</title>
<meta name="description" content="${esc(SITE.name)} is written and maintained by ${esc(A.name)}${A.title?', '+esc(A.title):''}. Free learning guides, cheat sheets and practice tests for certification exams.">
<meta name="robots" content="index, follow">
<meta name="author" content="Prakash Sridharan">
<link rel="canonical" href="${URL_}/about/">
<!--site-icons--><!--/site-icons-->
<script type="application/ld+json">${JSON.stringify(ld).split('<').join('\u003c')}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/hub.css?v=${V}">
<link rel="stylesheet" href="/site.css?v=${V}">
</head>
<body>
<!--site-header--><!--/site-header-->
<div class="hdr">
  <h1>About ${esc(SITE.name)}</h1>
  <div class="sub">Who writes the guides and tests, and why</div>
</div>
<div class="container legal about">
  <section class="ab-card">
    ${A.photo?'<img class="ab-ph" src="'+esc(A.photo)+'" alt="'+esc(A.name)+'" width="140" height="140">':''}
    <div>
      <h2>Built by ${esc(A.name)}</h2>
      ${(A.headline||A.title)?'<p class="ab-t">'+esc(A.headline||A.title)+(A.role?' &middot; '+esc(A.role):'')+(A.experience?' &middot; '+esc(A.experience):'')+'</p>':''}
      ${SUM.map(p=>'<p>'+esc(p)+'</p>').join('')}
      ${A.linkedin?'<p><a class="ab-li" href="'+esc(A.linkedin)+'" target="_blank" rel="noopener me">Connect on LinkedIn</a></p>':''}
    </div>
  </section>
  ${EDU.length?'<h2>Education</h2>\n  <ul>'+EDU.map(c=>'<li>'+li(c)+'</li>').join('')+'</ul>':''}
  ${A.credentials.length?'<h2>Credentials</h2>\n  <ul>'+A.credentials.map(c=>'<li>'+li(c)+'</li>').join('')+'</ul>':''}
  ${A.patents.length?'<h2>Patents</h2>\n  <p>Two U.S. patents granted and one application pending.</p>\n  <ul>'+A.patents.map(c=>'<li>'+li(c)+'</li>').join('')+'</ul>':''}
  <h2>Why ${esc(SITE.name)}</h2>
  <p>Good preparation for a new certification is hard to find, and much of it is paid. ${esc(SITE.name)} offers free learning guides, printable cheat sheets and timed practice tests, so you can learn each exam topic, test yourself under exam conditions and see which domains you are ready for.</p>
  <p>Every lesson, cheat sheet and practice question is written and maintained by ${esc(A.name)}. The questions are original, written from the public exam guides and the providers' public documentation. They contain no real exam content.</p>
  <h2>Found a mistake?</h2>
  <p>Use the Feedback button on any page, or email <a href="mailto:${CONTACT}">${CONTACT}</a>. Corrections are made as soon as they are checked.</p>
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
  fs.mkdirSync(path.join(ROOT,'about'),{recursive:true});
  fs.writeFileSync(path.join(ROOT,'about','index.html'),aboutHtml);
}

// ---- Compare (/claude/which-certification/): every current Claude exam side by side ----
// Facts (items, time, pass mark, fee, format, domains and weights, our lesson/question counts) come
// from site.json and the generated exams/<id>.js, so they cannot drift from the exam pages. Only
// the "best for" and "you will be tested on" lines below are written here by hand.
const CMP_PATH='/claude/which-certification/';
const claudeV=SITE.vendors.find(v=>v.id==='claude');
const CMP_FOR={
  'ccao-f':['You use Claude at work and do not build on it: consultants, analysts, sellers, marketers, team leads and operations staff.','Prompting and checking output, choosing between chat, Projects, Artifacts, Research, connectors and Skills, designing everyday workflows, and handling data responsibly.'],
  'ccdv-f':['You build with Claude: application developers and engineers using the Messages API, the Agent SDK, Claude Code, tools and MCP.','Agents and workflows, API integration, Claude Code, prompts and context, tools and MCP, model choice and cost, evaluation and debugging, and security.'],
  'ccdv-p':['You run Claude systems in production: senior engineers, platform and reliability teams, and people who operate fleets of coding agents.','Agent orchestration, production reliability and grounding, observability, incident response, evaluation engineering, cost and latency at scale, runtime guardrails and agent fleets.'],
  'ccar-f':['You design Claude solutions: solution architects and senior engineers who make the technical design calls on agentic systems.','Agentic architecture, tool design and MCP, Claude Code configuration, prompt engineering and structured output, and context management.'],
  'ccar-p-v2':['You lead Claude projects end to end: architects who own the design, the trade-offs and the conversation with stakeholders.','Solution design, models and context engineering, integration, evaluation and optimization, governance and risk, stakeholder communication and developer enablement.']
};
function cmpBundle(id){return new Function(fs.readFileSync(path.join(ROOT,'exams',id+'.js'),'utf8')+';return EXAM;')();}
const cmpEx=(claudeV&&claudeV.tracks||[]).flatMap(t=>t.exams.map(id=>({t,x:N.exam(id)}))).filter(o=>o.x&&N.listed(o.x)&&!o.x.supersededBy&&CMP_FOR[o.x.id]).map(o=>{
  const E=cmpBundle(o.x.id),b=E.blueprint;
  return {x:o.x,t:o.t,E,b,fee:String(b.fee||'').replace(/ USD$/,''),pass:b.passScaled?b.passScaled+' of '+(b.scaledMax||1000):'',
    doms:Object.values(E.domains).map(d=>({name:d.n||d.name,w:d.weightPct,c:d.color||'#1B4F8A'}))};
});
const cmpOld=N.exams().filter(x=>x.vendor===claudeV&&x.supersededBy&&N.listed(x));
if(cmpEx.length){
  const faqAnswer=(id,q)=>{const f=(cmpBundle(id).copy.faq||[]).find(z=>z.q===q);return f?f.a:'';};
  const nm=x=>x.name.replace(/^Claude Certified /,'');
  const FAQ=[
    ['Which Claude certification should I take first?','Start from what you do with Claude. If you use it at work without building on it, take Associate - Foundations (CCAO-F). If you build with the API, the Agent SDK or Claude Code, take Developer - Foundations (CCDV-F), then Developer - Professional (CCDV-P) once you run Claude systems in production. If you design solutions and make architecture decisions, take Architect - Foundations (CCAR-F), then Architect - Professional (CCAR-P).'],
    ['What is the difference between the Developer and Architect certifications?','Developer exams test how you build and operate: writing the API calls, agents, tools and prompts, then running them reliably, cheaply and safely in production. Architect exams test design decisions: which architecture fits the problem, the trade-offs between options, and, at Professional level, evaluation, governance, risk and communication with stakeholders. Many topics overlap, so the two tracks share ground such as agents, tools, MCP and Claude Code.'],
    ['Do I need a Foundations certification before a Professional exam?','No. None of the exams has a prerequisite. The CCAR-P exam guide treats the Architect Foundations scope as assumed knowledge, and the CCDV-P guide recommends Developer Foundations (CCDV-F) as preparation, so Foundations first is the usual order.'],
    ['Who can take the exams?',faqAnswer('ccao-f','Who can take the exam?')],
    ['What changes on 7 December 2026?','Anthropic\'s exam guide 1.1 takes effect for Associate Foundations, Developer Foundations and Architect Professional. This site already follows guide 1.1 for all three. CCAR-P Version 1.0 stays on the site until that date for people who sit the exam before it.'],
    ['Are the guides and practice tests free?','Yes. Every learning guide, cheat sheet and the two practice tests for each exam are free, with no sign-in needed. Signing in only saves your progress across devices.']
  ].filter(f=>f[1]);
  const ld={'@context':'https://schema.org','@type':'FAQPage',mainEntity:FAQ.map(f=>({'@type':'Question',name:f[0],acceptedAnswer:{'@type':'Answer',text:f[1]}}))};
  const ROLE=[['I use Claude at work','ccao-f'],['I build with Claude','ccdv-f'],['I design Claude solutions','ccar-f']];
  const byId=id=>cmpEx.find(o=>o.x.id===id);
  const row=(label,f)=>'<tr><th scope="row">'+label+'</th>'+cmpEx.map(o=>'<td>'+f(o)+'</td>').join('')+'</tr>';
  const cmpHtml=`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Which Claude Certification Should I Take? ${cmpEx.map(o=>o.x.code).join(', ')} Compared - ${esc(SITE.name)}</title>
<meta name="description" content="Compare every Claude certification side by side: who each exam is for, items, time, pass mark, fee, domains and weights, and where to start. ${cmpEx.map(o=>o.x.code).join(', ')}.">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="Prakash Sridharan">
<link rel="canonical" href="${URL_}${CMP_PATH}">
<meta property="og:type" content="article">
<meta property="og:url" content="${URL_}${CMP_PATH}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:title" content="Which Claude certification should I take?">
<meta property="og:description" content="Every Claude certification compared: audience, format, fee, domains and where to start.">
<meta name="twitter:card" content="summary_large_image">
<!--site-icons--><!--/site-icons-->
<script type="application/ld+json">${JSON.stringify(ld).split('<').join('\\u003c')}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/hub.css?v=${V}">
<link rel="stylesheet" href="/site.css?v=${V}">
<style>
.cmp h2{font-size:1.25rem;margin:2rem 0 .6rem;color:var(--ac-h)}
.cmp-lead{color:var(--text-2);max-width:760px;margin-top:1.4rem}
.cmp-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:.9rem;margin:1rem 0 .4rem}
.cmp-role{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:1rem 1.1rem;box-shadow:var(--sh);display:flex;flex-direction:column;gap:.35rem}
.cmp-role h3{font-size:1rem;margin:0;color:var(--ac-h)}
.cmp-role p{margin:0;font-size:.9rem;color:var(--text-2)}
.cmp-path{font-family:'JetBrains Mono',monospace;font-size:.82rem;color:var(--ac);font-weight:500;margin-top:auto!important;padding-top:.3rem}
.cmp-path a{color:inherit}
.cmp-tw{overflow-x:auto;border:1px solid var(--border);border-radius:var(--rl);background:var(--surface);box-shadow:var(--sh)}
.cmp-t{border-collapse:collapse;width:100%;min-width:820px;font-size:.88rem}
.cmp-t th,.cmp-t td{padding:.6rem .7rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.cmp-t thead th{background:#eef2f7;color:var(--ac-h);font-size:.85rem}
.cmp-t thead th small{display:block;font-weight:500;color:var(--text-m)}
.cmp-t tbody th{color:var(--text-2);font-weight:600;white-space:nowrap;width:120px}
.cmp-t tr:last-child th,.cmp-t tr:last-child td{border-bottom:0}
.cmp-t a{white-space:nowrap}
.cmp-doms{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:.9rem}
.cmp-d{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:.9rem 1rem;box-shadow:var(--sh)}
.cmp-d h3{font-size:.95rem;margin:0 0 .5rem;color:var(--ac-h)}
.cmp-d h3 span{font-family:'JetBrains Mono',monospace;font-size:.8rem;color:var(--text-m);font-weight:500;margin-left:.3rem}
.cmp-b{display:grid;grid-template-columns:1fr 2.6rem;gap:.15rem .5rem;font-size:.8rem;color:var(--text-2);margin:.28rem 0}
.cmp-b i{grid-column:1/-1;height:6px;border-radius:3px;background:#e8ecf2;overflow:hidden;display:block}
.cmp-b i b{display:block;height:100%;border-radius:3px}
.cmp-b em{font-style:normal;text-align:right;font-family:'JetBrains Mono',monospace}
.cmp-note{font-size:.85rem;color:var(--text-m);margin:.5rem 0 0}
@media (max-width:760px){.cmp-roles{grid-template-columns:1fr}}
</style>
</head>
<body>
<!--site-header--><!--/site-header-->
<div class="hdr">
  <h1>Which Claude certification should I take?</h1>
  <div class="sub">All ${cmpEx.length} current Claude certifications side by side: who each one is for, what it tests, and where to start.</div>
</div>
<div class="container cmp">
  <p class="cmp-lead">Anthropic's certifications follow three tracks: Associate for people who use Claude at work, Developer for people who build with it, and Architect for people who design Claude solutions. Pick the track that matches your work, then start at Foundations.</p>
  <div class="cmp-roles">
${ROLE.map(([h,id])=>{const o=byId(id);if(!o)return '';const t=o.t,chain=t.exams.map(N.exam).filter(x=>x&&N.listed(x)&&!x.supersededBy);
  return '    <div class="cmp-role"><h3>'+esc(h)+'</h3><p>'+esc(t.desc)+'</p><p class="cmp-path">'+chain.map(x=>'<a href="'+x.learn+'">'+esc(x.code)+'</a>').join(' &rarr; ')+'</p></div>';}).join('\n')}
  </div>
  <p class="cmp-note">None of the exams has a prerequisite; Foundations first is the usual order.</p>

  <h2>Side by side</h2>
  <div class="cmp-tw"><table class="cmp-t">
    <thead><tr><th scope="col"></th>${cmpEx.map(o=>'<th scope="col">'+esc(o.x.code)+'<small>'+esc(nm(o.x))+'</small></th>').join('')}</tr></thead>
    <tbody>
    ${row('Best for',o=>esc(CMP_FOR[o.x.id][0]))}
    ${row('Tests you on',o=>esc(CMP_FOR[o.x.id][1]))}
    ${row('Exam guide',o=>esc((o.x.version||'').replace('Version ','')||'-'))}
    ${row('Items',o=>o.b.questionCount+' items')}
    ${row('Time',o=>Math.round(o.b.durationSec/60)+' minutes')}
    ${row('Pass mark',o=>esc(o.pass))}
    ${row('Fee',o=>esc(o.fee))}
    ${row('Format',o=>esc(o.b.format||''))}
    ${row('Domains',o=>o.doms.length+' domains')}
    ${row('Free prep here',o=>(o.x.counts.lessons?o.x.counts.lessons+' lessons, ':'')+o.x.counts.questions+' questions, '+o.x.counts.tests+' tests')}
    ${row('Start',o=>(o.x.learn?'<a href="'+o.x.learn+'">Guide</a> &middot; ':'')+'<a href="'+o.x.path+'">Tests</a>'+(o.x.cheat?' &middot; <a href="'+o.x.cheat+'">Cheat sheet</a>':''))}
    </tbody>
  </table></div>
  <p class="cmp-note">Fees and formats are from Anthropic's public exam guides and certification pages; check them there before you book.${cmpOld.length?' '+cmpOld.map(x=>esc(x.code)+' '+esc(x.version)+' stays on this site '+esc((x.note||'').replace(/^Until/,'until'))+' (<a href="'+x.path+'">tests</a>'+(x.learn?', <a href="'+x.learn+'">guide</a>':'')+').').join(' '):''}</p>

  <h2>Domains and weights</h2>
  <p class="cmp-lead">The share of exam items each domain carries, from each exam guide. The heavier the domain, the more questions you will see on it.</p>
  <div class="cmp-doms">
${cmpEx.map(o=>'    <div class="cmp-d"><h3>'+esc(o.x.code)+'<span>'+esc(nm(o.x))+'</span></h3>'+o.doms.map(d=>'<div class="cmp-b"><span>'+esc(d.name)+'</span><em>'+d.w+'%</em><i><b style="width:'+Math.min(100,d.w*3)+'%;background:'+esc(d.c)+'"></b></i></div>').join('')+'</div>').join('\n')}
  </div>

  <section class="faq">
    <h2>Questions</h2>
${FAQ.map((f,i)=>'    <details'+(i?'':' open')+'><summary>'+esc(f[0])+'</summary><p>'+esc(f[1])+'</p></details>').join('\n')}
  </section>
  <div class="notice">
    <strong>Important Note</strong>
    <p>${esc(SITE.name)} is an independent study aid, not affiliated with or endorsed by Anthropic. The practice questions are original, written from Anthropic's public exam guides; they contain no real exam content and do not guarantee a pass.</p>
  </div>
</div>
<!--site-footer--><!--/site-footer-->
<script src="/site.js?v=${V}"></script>
</body>
</html>
`;
  fs.mkdirSync(path.join(ROOT,CMP_PATH),{recursive:true});
  fs.writeFileSync(path.join(ROOT,CMP_PATH,'index.html'),cmpHtml);
}

// ---- fill the marked regions ----
const pages=['index.html','resources/index.html','privacy/index.html',...(SITE.author?['about/index.html']:[]),...(cmpEx.length?[CMP_PATH.slice(1)+'index.html']:[]),
  ...SITE.vendors.filter(v=>v.url).map(v=>v.url.replace(/^\//,'')+'index.html'),
  ...liveExams.map(x=>x.path.replace(/^\//,'')+'index.html')];
// The exam FAQ comes from the generated exams/<id>.js, so the crawler copy can never drift
// from what the app shows.
function examFaq(id){const f=path.join(ROOT,'exams',id+'.js');if(!fs.existsSync(f))return null;
  const EX=new Function(fs.readFileSync(f,'utf8')+';return EXAM;')(),F=EX.copy&&EX.copy.faq;if(!F||!F.length)return '';
  const ld={'@context':'https://schema.org','@type':'FAQPage',mainEntity:F.map(x=>({'@type':'Question',name:x.q,acceptedAnswer:{'@type':'Answer',text:x.a}}))};
  return '\n  <h2>'+esc(EX.code)+' exam FAQ</h2>\n'+F.map(x=>'  <h3>'+esc(x.q)+'</h3>\n  <p>'+esc(x.a)+'</p>\n').join('')+
    '  <script type="application/ld+json">'+JSON.stringify(ld).split('<').join('\\u003c')+'</script>\n  ';}
const RE=/<!--(site-icons|site-header|site-footer|exam-tabs|exam-faq|cert-list)([^>]*?)-->[\s\S]*?<!--\/\1-->/g;
for(const p of pages){
  const f=path.join(ROOT,p);
  if(!fs.existsSync(f)){errors.push(p+': missing');continue;}
  const src=fs.readFileSync(f,'utf8');
  const out=src.replace(RE,(_,kind,args)=>{
    const a=args.trim().split(/\s+/).filter(Boolean);let body='';
    if(kind==='site-icons')body='\n'+N.headIcons(a[0])+'\n';
    else if(kind==='site-header')body=N.siteHeader();
    else if(kind==='site-footer')body=N.siteFooter();
    else if(kind==='cert-list')body=N.certList(a[0]);
    else if(kind==='exam-faq'){const b=examFaq(a[0]);if(b===null){errors.push(p+': exam-faq for unknown exam '+a[0]);return _;}body=b;}
    else{if(!N.exam(a[0])){errors.push(p+': exam-tabs for unknown exam '+a[0]);return _;}body=N.examTabs(a[0],a[1]);}
    return '<!--'+kind+args+'-->'+body+'<!--/'+kind+'-->';});
  if(!out.includes('<!--site-header-->'))errors.push(p+': no <!--site-header--> marker');
  // The author meta, the site's own domain, the privacy contact address and the named author
  // (site.json author: About page, footer, bylines) are the allowed mentions.
  const scan=out.replace(/<meta name="author"[^>]*>/,'').split(A?A.name:SITE.name).join('').split(A&&A.linkedin||SITE.name).join('').split('certprep.pratechlabs.com').join('').split(CONTACT).join('');
  if(scan.includes(EM)||scan.includes(EN))errors.push(p+': contains an em or en dash');
  for(const t of banned)if(new RegExp(t,'i').test(scan))errors.push(p+': contains a banned term');
  if(out!==src)fs.writeFileSync(f,out);
}

// ---- sitemap: /resources/ ----
const smf=path.join(ROOT,'sitemap.xml');
let sm=fs.readFileSync(smf,'utf8').replace(/\r\n/g,'\n');
for(const [p,pr] of [['/resources/','0.6'],['/privacy/','0.2'],...(A?[['/about/','0.3']]:[]),...(cmpEx.length?[[CMP_PATH,'0.8']]:[])])
  if(!sm.includes('<loc>'+URL_+p+'</loc>'))
    sm=sm.replace('</urlset>','  <url>\n    <loc>'+URL_+p+'</loc>\n    <lastmod>'+new Date().toISOString().slice(0,10)+'</lastmod>\n    <changefreq>'+(pr==='0.2'?'yearly':'monthly')+'</changefreq>\n    <priority>'+pr+'</priority>\n  </url>\n</urlset>');
fs.writeFileSync(smf,sm);

if(errors.length){console.error('build-site: '+errors.length+' error(s)\n  '+errors.join('\n  '));process.exit(1);}
console.log('build-site: '+pages.length+' pages, '+liveExams.length+' live exams'+(contentDir?'':' (no content dir: banned-term check skipped)'));
