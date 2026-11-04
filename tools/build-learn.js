#!/usr/bin/env node
// Build the static learning-guide pages for one exam from the private content repo.
//
//   node tools/build-learn.js <content-dir> <exam>   e.g. node tools/build-learn.js ../certprep-content ccar-p
//
// Sources, in <content-dir>/<vendor>/<exam>/:
//   config.js            const EXAM={...}  domain names, weights, colours, blurbs, path, storagePrefix
//   refs.json            the title-checked doc links; every lesson source must use one of these pages
//   learn/outline.json   {title, intro, notice, outOfScope?:{intro, items}, domains:[{n, slug, lessons:[{id, slug, title, task}]}]}
//   learn/<slug>.md      one per lesson; a lesson with no file is listed as "coming soon"
//   learn/cases/*.md     fictional case studies used by the exercises (index.md = the cases page)
//   learn/cheat-sheet.md optional: title/summary front matter, then ## sections (one "## Domain <n>: ..."
//                        per domain, others allowed); [[1.3]] links to lesson 1.3. Kept to 2-3 printed pages.
//
// Lesson file format:
//   ---
//   summary: one sentence
//   sources:
//   - https://url#anchor|Label
//   handson:                  optional: Anthropic cookbook notebooks (shown as "Go hands-on")
//   - https://github.com/anthropics/claude-cookbooks/blob/main/<path>|Label
//   ---
//   Markdown: ## and ### headings, paragraphs, - and 1. lists, | tables |, **bold**, *italic*,
//   `code`, ```lang fenced blocks```, [text](url), and callouts:  > [!trap] Title / > [!rule] Title / > [!example] Title / > [!note] Title
//   followed by "> " lines (which may hold lists).
//   Check questions (original, written for the lesson; never questions from the tests):
//     ?? Question stem
//     - [ ] wrong option
//     - [x] right option        (two or more [x] make it a "select N" question)
//     = Explanation shown after the reader checks their answer.
//   One exercise per lesson (original; set in a case from learn/cases/):
//     ::: exercise <minutes> <case-slug>
//     brief, then a numbered list of steps (indented lines continue a step, e.g. *Why:* ...)
//     ::: model
//     model answer (any Markdown above)
//     ::: check
//     - self-check item
//     :::
//
// Writes <exam path>/learn/** (wiped first) and <exam path>/resources/ in this repo (generated, never edit by hand) and
// rewrites the learn URLs in sitemap.xml. Fails on: a lesson task that matches no published
// question objective, an em or en dash, chat phrasing ("your notes", "Let's", "Course 3"),
// a term from outline.json bannedTerms, an unknown callout, a source page not in refs.json, a lesson without an exercise,
// an exercise without steps, a model answer or a self-check, an unknown case, or a broken internal link.
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const NAV=require('./site-nav');
const ROOT=path.resolve(__dirname,'..');
const SITE='https://certprep.pratechlabs.com';
const EM=String.fromCharCode(0x2014),EN=String.fromCharCode(0x2013);
const CALLOUTS={trap:'Exam trap',rule:'Decision rule',example:'Example',note:'Note'};
const COOKBOOK='https://github.com/anthropics/claude-cookbooks/blob/main/';
const BANNED=[[/your notes|my notes/i,'"your/my notes"'],[/\blet's\b/i,'"Let\'s"'],[/\bcourse\s*[1-5]\b|\bcourse-0/i,'a course number'],
  [/\bS11\b/,'a course slide reference']];
const errors=[],warns=[];
let kcEnd=0,kcN=0;// check-question parser state (see checkQuestion)
let exEnd=0,curLesson=null,exFound=false;// exercise parser state (see exercise)
const fail=m=>errors.push(m);

const [contentDir,examId]=process.argv.slice(2);
if(!contentDir||!examId){console.error('usage: node tools/build-learn.js <content-dir> <exam>');process.exit(2);}
const vendor=fs.readdirSync(contentDir).find(v=>fs.existsSync(path.join(contentDir,v,examId,'config.js')));
if(!vendor){console.error('no '+examId+'/config.js under '+contentDir);process.exit(2);}
const SRC=path.join(contentDir,vendor,examId),LSRC=path.join(SRC,'learn');

// ---- inputs ----
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SRC,'config.js'),'utf8')+';this.EXAM=EXAM;',ctx);
const EXAM=ctx.EXAM;
const pub={};vm.createContext(pub);
vm.runInContext(fs.readFileSync(path.join(ROOT,'exams',examId+'.js'),'utf8')+';this.BQ=BQ;this.TESTS=typeof TESTS!=="undefined"?TESTS:[];',pub);
const refPages=new Set(Object.values(JSON.parse(fs.readFileSync(path.join(SRC,'refs.json'),'utf8'))).map(r=>r.split('|')[0].split('#')[0]));
const OUT=JSON.parse(fs.readFileSync(path.join(LSRC,'outline.json'),'utf8'));
// Names that must never appear in lesson text (kept in the private outline, not in this public file).
for(const t of OUT.bannedTerms||[])BANNED.push([new RegExp(t,'i'),'a banned term']);
const examPath=EXAM.path; // e.g. /claude/ccar-p/
const learnPath=examPath+'learn/';
const outDir=path.join(ROOT,learnPath);
const casesPath=learnPath+'cases/';

// ---- case studies (learn/cases/*.md): loaded first, since exercises link to them ----
const CASES={},CDIR=path.join(LSRC,'cases');let casesIndex=null;
if(fs.existsSync(CDIR))for(const f of fs.readdirSync(CDIR).filter(f=>f.endsWith('.md')).sort()){
  const slug=f.slice(0,-3);
  if(slug==='index')continue;
  CASES[slug]={slug,url:casesPath+slug+'/',used:[],file:path.join(CDIR,f)};
}
for(const c of Object.values(CASES))Object.assign(c,parseDoc(fs.readFileSync(c.file,'utf8'),'cases/'+c.slug+'.md'));
if(fs.existsSync(path.join(CDIR,'index.md')))casesIndex=parseDoc(fs.readFileSync(path.join(CDIR,'index.md'),'utf8'),'cases/index.md');
else if(Object.keys(CASES).length)fail('cases/index.md is missing');

// ---- outline: attach domain config, published-question counts, lesson files ----
const lessons=[];
for(const d of OUT.domains){
  const cfg=EXAM.domains[d.n];
  if(!cfg){fail('outline: unknown domain '+d.n);continue;}
  Object.assign(d,{name:cfg.n,weight:cfg.weightPct,color:cfg.color,tint:cfg.tint,blurb:cfg.blurb,url:learnPath+d.slug+'/'});
  for(const l of d.lessons){
    l.domain=d;l.url=d.url+l.slug+'/';
    const qs=pub.BQ.filter(q=>q.ob===l.task);
    if(!qs.length)fail(l.id+': task matches no published question objective: '+l.task);
    l.qCount=qs.length;
    const f=path.join(LSRC,l.slug+'.md');
    if(fs.existsSync(f)){curLesson=l;Object.assign(l,parseLesson(fs.readFileSync(f,'utf8'),l.slug+'.md'));curLesson=null;
      if(!l.exercise)fail(l.slug+'.md: no "::: exercise" block (every lesson ends with one)');}
    else warns.push(l.id+' '+l.slug+'.md not written yet (listed as coming soon)');
    lessons.push(l);
  }
}
const ids=new Set();for(const l of lessons){if(ids.has(l.id))fail('duplicate lesson id '+l.id);ids.add(l.id);}
const written=lessons.filter(l=>l.html);

// ---- cheat sheet (learn/cheat-sheet.md, optional): one ## section per topic; a heading that
// starts "Domain <n>:" takes that domain's colour. [[1.3]] links to lesson 1.3. ----
const csPath=learnPath+'cheat-sheet/',CSF=path.join(LSRC,'cheat-sheet.md');
let cheat=null;
if(fs.existsSync(CSF)){
  const src=fs.readFileSync(CSF,'utf8').replace(/\[\[([\d.]+)\]\]/g,(_,id)=>{const l=lessons.find(x=>x.id===id&&x.html);
    if(!l){fail('cheat-sheet.md: [['+id+']] is not a written lesson');return id;}return '['+id+']('+l.url+')';});
  const m=src.replace(/\r\n/g,'\n').match(/^(---\n[\s\S]*?\n---\n)([\s\S]*)$/);
  const doc=parseDoc(src,'learn/cheat-sheet.md');
  if(m&&doc.title){
    const secs=('\n'+m[2]).split(/\n(?=## )/).map(s=>s.trim()).filter(Boolean);
    if(secs.some(s=>!s.startsWith('## ')))fail('cheat-sheet.md: text before the first ## heading');
    cheat=Object.assign(doc,{sections:secs.map(s=>{const lines=s.split('\n'),h=lines[0].slice(3).trim(),dm=h.match(/^Domain (\d+):/);
      const d=dm&&OUT.domains.find(x=>x.n===+dm[1]);if(dm&&!d)fail('cheat-sheet.md: unknown domain in "'+h+'"');
      return{h,d,html:blocks(lines.slice(1),'learn/cheat-sheet.md',null).replace(/<a href="([^"]+)">(\d+\.\d+)<\/a>/g,'<a class="cs-l" href="$1" title="Lesson $2">$2</a>')};})});
    const dn=new Set(cheat.sections.filter(s=>s.d).map(s=>s.d.n));
    for(const d of OUT.domains)if(!dn.has(d.n))fail('cheat-sheet.md: no "## Domain '+d.n+': ..." section');
  }
}

// ---- markdown ----
function parseLesson(src,file){
  src=src.replace(/\r\n/g,'\n');
  const m=src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!m){fail(file+': missing front matter');return{};}
  const fm={sources:[],handson:[]};let list=null;
  for(const line of m[1].split('\n')){
    const kv=line.match(/^(\w+):\s*(.*)$/);
    if(kv){list=fm[kv[1]]&&Array.isArray(fm[kv[1]])?kv[1]:null;if(!list)fm[kv[1]]=kv[2].trim();continue;}
    const li=line.match(/^\s*-\s+(\S+?)\|(.+)$/);
    if(list&&li){fm[list].push({url:li[1],label:li[2].trim()});continue;}
    if(line.trim())fail(file+': bad front matter line: '+line);
  }
  if(!fm.summary)fail(file+': no summary');
  if(!fm.sources.length)fail(file+': no sources');
  for(const s of fm.sources)if(!refPages.has(s.url.split('#')[0]))fail(file+': source page is not in refs.json (title-check it first): '+s.url);
  for(const s of fm.handson)if(!s.url.startsWith(COOKBOOK))fail(file+': hands-on links must be Anthropic cookbook notebooks ('+COOKBOOK+'...): '+s.url);
  for(const t of [m[2],fm.summary,...fm.sources.map(s=>s.label),...fm.handson.map(s=>s.label)]){
    if(t.includes(EM)||t.includes(EN))fail(file+': contains an em or en dash');
    for(const [re,what] of BANNED)if(re.test(t))fail(file+': contains '+what);
  }
  const toc=[];kcN=0;exFound=false;
  const html=blocks(m[2].split('\n'),file,toc);
  return{summary:fm.summary,sources:fm.sources,handson:fm.handson,html,toc,exercise:exFound,words:m[2].split(/\s+/).filter(Boolean).length};
}
// A plain document (case studies): front matter title and summary, then the same Markdown.
function parseDoc(src,file){
  src=src.replace(/\r\n/g,'\n');
  const m=src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if(!m){fail(file+': missing front matter');return{html:''};}
  const fm={};for(const line of m[1].split('\n')){const kv=line.match(/^(\w+):\s*(.*)$/);if(kv)fm[kv[1]]=kv[2].trim();else if(line.trim())fail(file+': bad front matter line: '+line);}
  if(!fm.title||!fm.summary)fail(file+': needs title and summary');
  for(const t of [m[2],fm.title||'',fm.summary||'']){
    if(t.includes(EM)||t.includes(EN))fail(file+': contains an em or en dash');
    for(const [re,what] of BANNED)if(re.test(t))fail(file+': contains '+what);
  }
  return{title:fm.title,summary:fm.summary,html:blocks(m[2].split('\n'),file,null)};
}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function slugify(s){return s.toLowerCase().replace(/<[^>]+>/g,'').replace(/&[a-z]+;/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function inline(s){
  const code=[];
  s=s.replace(/`([^`]+)`/g,(_,c)=>{code.push(c);return'\u0000'+(code.length-1)+'\u0000';});
  s=esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,(_,t,u)=>{const ext=/^https?:/.test(u);return'<a href="'+u+'"'+(ext?' target="_blank" rel="noopener"':'')+'>'+t+'</a>';})
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g,'$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>'<code>'+esc(code[+i])+'</code>');
}
function blocks(lines,file,toc){
  let out='',i=0;
  const isTableSep=l=>/^\|?\s*:?-{2,}/.test(l.trim());
  while(i<lines.length){
    const l=lines[i],t=l.trim();
    if(!t){i++;continue;}
    let h=t.match(/^(#{2,3})\s+(.*)$/);
    if(h){const lv=h[1].length,txt=inline(h[2]),id=slugify(txt);
      if(toc&&lv===2)toc.push({id,txt});
      out+='<h'+lv+' id="'+id+'">'+txt+'</h'+lv+'>\n';i++;continue;}
    if(t.startsWith('>')){
      const inner=[];while(i<lines.length&&lines[i].trim().startsWith('>')){inner.push(lines[i].trim().replace(/^>\s?/,''));i++;}
      const c=inner[0].match(/^\[!(\w+)\]\s*(.*)$/);
      if(!c){fail(file+': blockquote without a callout marker');continue;}
      if(!CALLOUTS[c[1]]){fail(file+': unknown callout [!'+c[1]+']');continue;}
      out+='<aside class="co co-'+c[1]+'"><div class="co-k">'+CALLOUTS[c[1]]+'</div>'+(c[2]?'<div class="co-t">'+inline(c[2])+'</div>':'')+
        blocks(inner.slice(1),file,null)+'</aside>\n';continue;}
    if(t.startsWith('|')&&i+1<lines.length&&isTableSep(lines[i+1])){
      const row=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      const head=row(t);i+=2;const body=[];
      while(i<lines.length&&lines[i].trim().startsWith('|')){body.push(row(lines[i]));i++;}
      out+='<div class="tbl"><table><thead><tr>'+head.map(c=>'<th>'+inline(c)+'</th>').join('')+'</tr></thead><tbody>'+
        body.map(r=>'<tr>'+r.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>\n';continue;}
    if(t.startsWith('```')){
      const lang=t.slice(3).trim(),code=[];i++;
      while(i<lines.length&&lines[i].trim()!=='```'){code.push(lines[i]);i++;}
      if(i>=lines.length)fail(file+': code block not closed with ```');i++;
      const ind=Math.min(...code.filter(c=>c.trim()).map(c=>c.match(/^\s*/)[0].length));
      out+='<pre class="code"'+(lang?' data-lang="'+esc(lang)+'"':'')+'><code>'+esc(code.map(c=>c.slice(ind)).join('\n'))+'</code></pre>\n';continue;}
    if(t.startsWith('?? ')){out+=checkQuestion(lines,i,file);i=kcEnd;continue;}
    if(t.startsWith('::: exercise')){out+=exercise(lines,i,file);i=exEnd;continue;}
    if(t.startsWith(':::')){fail(file+': stray "'+t+'" outside an exercise');i++;continue;}
    const li=t.match(/^(-|\d+\.)\s+/);
    if(li){const ord=li[1]!=='-',items=[];
      while(i<lines.length){const x=lines[i].trim(),m=x.match(/^(-|\d+\.)\s+(.*)$/);
        if(m&&(m[1]!=='-')===ord){items.push(m[2]);i++;}
        else if(x&&!m&&items.length&&/^\s{2,}/.test(lines[i])){items[items.length-1]+='\n'+x;i++;}
        else break;}
      out+=(ord?'<ol>':'<ul>')+items.map(x=>'<li>'+x.split('\n').map(inline).join('<br>')+'</li>').join('')+(ord?'</ol>':'</ul>')+'\n';continue;}
    const para=[];
    while(i<lines.length&&lines[i].trim()&&!/^(#{2,3}\s|>|\||-\s|\d+\.\s|\?\?\s|:::|```)/.test(lines[i].trim())){para.push(lines[i].trim());i++;}
    out+='<p>'+inline(para.join(' '))+'</p>\n';
  }
  return out;
}

// A check question: radio or checkbox options, Check answer, explanation. Without JavaScript
// the answer sits in a <details> below the options.

function checkQuestion(lines,i,file){
  const stem=[lines[i].trim().slice(3)],opts=[],ex=[];i++;
  while(i<lines.length&&lines[i].trim()&&!/^- \[[ x]\]/.test(lines[i].trim())){stem.push(lines[i].trim());i++;}
  while(i<lines.length){const m=lines[i].trim().match(/^- \[([ x])\]\s+(.*)$/);if(!m)break;opts.push({ok:m[1]==='x',t:m[2]});i++;}
  while(i<lines.length&&!lines[i].trim())i++;
  if(i<lines.length&&lines[i].trim().startsWith('= ')){ex.push(lines[i].trim().slice(2));i++;
    while(i<lines.length&&lines[i].trim()&&!/^(#{2,3}\s|\?\?\s|>|\|)/.test(lines[i].trim())){ex.push(lines[i].trim());i++;}}
  kcEnd=i;kcN++;
  const at=file+' check question '+kcN+' ('+stem[0].slice(0,40)+'...)';
  const right=opts.filter(o=>o.ok).length;
  if(opts.length<3)fail(at+': needs at least 3 options');
  if(!right)fail(at+': no correct option marked [x]');
  if(right===opts.length)fail(at+': every option is marked correct');
  if(!ex.length)fail(at+': no "= explanation" line');
  // House rule: the right answer must not stand out by length.
  const len=o=>o.t.length,maxWrong=Math.max(...opts.filter(o=>!o.ok).map(len)),maxRight=Math.max(...opts.filter(o=>o.ok).map(len));
  if(right===1&&maxRight>maxWrong*1.25)warns.push(at+': correct option is '+Math.round(100*maxRight/maxWrong-100)+'% longer than the longest wrong one');
  const name='kc'+kcN,type=right>1?'checkbox':'radio',L='ABCDEF';
  return '<div class="kc" data-kc data-right="'+right+'"><div class="kc-h">Question '+kcN+(right>1?' &middot; select '+right:'')+'</div>'+
    '<p class="kc-q">'+inline(stem.join(' '))+'</p><ul class="kc-o">'+
    opts.map((o,k)=>'<li><label><input type="'+type+'" name="'+name+'" value="'+k+'"'+(o.ok?' data-ok':'')+'><span class="kc-l">'+L[k]+'</span><span>'+inline(o.t)+'</span></label></li>').join('')+
    '</ul><button type="button" class="btn kc-b js-only" disabled>Check answer</button>'+
    '<details class="kc-d"><summary>Show answer</summary><p class="kc-r"><strong>Answer: '+opts.map((o,k)=>o.ok?L[k]:'').filter(Boolean).join(', ')+'.</strong> '+inline(ex.join(' '))+'</p></details></div>\n';
}

// An "Apply it" exercise: brief and steps, a self-check list (ticks kept in the browser), and a
// model answer in a <details>, so it works without JavaScript.
function exercise(lines,i,file){
  const head=lines[i].trim().match(/^::: exercise\s+(\d+)\s+([a-z0-9-]+)\s*$/);
  const parts={body:[],model:[],check:[]};let cur='body';i++;
  while(i<lines.length&&lines[i].trim()!==':::'){const t=lines[i].trim();
    if(t==='::: model')cur='model';else if(t==='::: check')cur='check';else parts[cur].push(lines[i]);i++;}
  exEnd=i+1;
  const at=file+' exercise';
  if(i>=lines.length)fail(at+': not closed with a ":::" line');
  if(!head){fail(at+': first line must be "::: exercise <minutes> <case-slug>"');return'';}
  if(exFound)fail(at+': only one exercise per lesson');exFound=true;
  const mins=+head[1],cs=CASES[head[2]];
  if(mins<5||mins>45)fail(at+': '+mins+' minutes; keep exercises between 5 and 45');
  if(!cs){fail(at+': unknown case "'+head[2]+'" (no learn/cases/'+head[2]+'.md)');return'';}
  if(!parts.body.some(l=>/^\d+\.\s/.test(l.trim())))fail(at+': needs numbered steps');
  if(!parts.model.join('').trim())fail(at+': needs a "::: model" answer');
  const checks=parts.check.map(l=>l.trim()).filter(Boolean);
  if(!checks.length||checks.some(l=>!l.startsWith('- ')))fail(at+': "::: check" needs "- " items and nothing else');
  const key=file.replace(/\.md$/,'');
  if(curLesson&&!cs.used.includes(curLesson))cs.used.push(curLesson);
  return '<section class="ex" id="exercise" data-ex="'+key+'"><div class="ex-h"><span class="ex-k">Exercise &middot; about '+mins+' min</span>'+
    '<a class="ex-case" href="'+cs.url+'">Case: '+esc(cs.title)+'</a></div>'+
    blocks(parts.body,file,null)+
    '<div class="ex-c"><div class="ex-ck">Check your work</div><ul>'+checks.map((c,k)=>'<li><label><input type="checkbox" data-ck="'+key+':'+k+'"><span>'+inline(c.slice(2))+'</span></label></li>').join('')+'</ul></div>'+
    '<details class="ex-m"><summary>Show model answer</summary><div class="ex-mb">'+blocks(parts.model,file,null)+'</div></details>'+
    '<button type="button" class="btn btn-g ex-copy js-only">Copy the steps as a template</button></section>\n';
}

// ---- page template ----
const V=OUT.assetVersion||'1';
const WORDS=['no','one','two','three','four','five','six','seven','eight','nine','ten'];
function page({title,desc,url,crumbs,main,lesson,domainColor,jsonld,tab='learn',side=true,wrapCls=''}){
  const canon=SITE+url;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="PraTech Labs">
<link rel="canonical" href="${canon}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canon}">
<meta property="og:site_name" content="${esc(EXAM.code)} Learning Guide">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta name="twitter:card" content="summary_large_image">
${NAV.headIcons()}
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/learn.css?v=${V}">
<link rel="stylesheet" href="/site.css?v=${V}">
</head>
<body data-prefix="${esc(EXAM.storagePrefix)}"${lesson?' data-lesson="'+lesson+'"':''}${domainColor?' style="--dc:'+domainColor.color+';--dt:'+domainColor.tint+'"':''}>
${NAV.siteHeader()}
${NAV.examTabs(examId,tab)}
<div class="wrap${side?'':' wrap-1'}${wrapCls?' '+wrapCls:''}">
${side?sidebar(lesson):''}
<main class="main">
<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map((c,i)=>i<crumbs.length-1?'<a href="'+c[1]+'">'+esc(c[0])+'</a>':'<span>'+esc(c[0])+'</span>').join('<i>/</i>')}</nav>
${main}
<aside class="notice"><strong>Important Note</strong><p>${esc(OUT.notice)}</p></aside>
</main>
</div>
${NAV.siteFooter()}
<script src="/learn.js?v=${V}"></script>
<script src="/site.js?v=${V}"></script>
</body>
</html>
`;
}
function sidebar(cur){
  const total=lessons.length;
  return '<nav class="side" aria-label="Lessons"><details class="side-d" open><summary><span>All lessons</span> <span class="prog-txt" data-prog="all" data-total="'+total+'"></span></summary>'+
    '<a class="side-home" href="'+learnPath+'">Overview</a>'+(cheat?'<a class="side-home" href="'+csPath+'">Cheat sheet</a>':'')+(casesIndex?'<a class="side-home" href="'+casesPath+'">Case studies</a>':'')+
    OUT.domains.map(d=>'<div class="side-dom" style="--dc:'+d.color+'"><a class="side-dt" href="'+d.url+'"><b>'+d.n+'</b> '+esc(d.name)+'</a><ul>'+
      d.lessons.map(l=>'<li data-l="'+l.id+'"'+(l.id===cur?' class="cur"':'')+'>'+(l.html?'<a href="'+l.url+'"'+(l.id===cur?' aria-current="page"':'')+'>':'<span class="soon">')+
        '<span class="lid">'+l.id+'</span>'+esc(l.title)+(l.html?'</a>':' <em>soon</em></span>')+'</li>').join('')+'</ul></div>').join('')+
    '</details></nav>';
}
const orgJson=(type,name,url,desc,extra)=>Object.assign({'@context':'https://schema.org','@type':type,name,url:SITE+url,description:desc,inLanguage:'en',isAccessibleForFree:true,
  about:{'@type':'Thing',name:EXAM.name+' ('+EXAM.code+') certification'}},extra||{});

const pages=[];
// Curriculum
pages.push({url:learnPath,html:page({
  title:EXAM.code+' Learning Guide - '+EXAM.name,
  desc:OUT.intro,url:learnPath,crumbs:[[EXAM.code,examPath],['Learning guide']],
  jsonld:orgJson('Course',EXAM.code+' Learning Guide',learnPath,OUT.intro,{provider:{'@type':'Organization',name:'certprep'},
    hasPart:lessons.filter(l=>l.html).map(l=>({'@type':'LearningResource',name:l.title,url:SITE+l.url}))}),
  main:`<div class="tag">${esc(EXAM.code)} Learning Guide</div>
<h1>${esc(OUT.title)}</h1>
<p class="lead">${esc(OUT.intro)}</p>
<div class="progress js-only"><div class="bar"><i data-bar="all"></i></div><span data-prog="all" data-total="${lessons.length}"></span> lessons complete</div>
${cheat?`<a class="cs-card" href="${csPath}"><span class="cs-ck">Before the exam</span><b>Cheat sheet</b><span>${esc(cheat.summary)}</span></a>`:''}
<div class="dgrid">${OUT.domains.map(d=>`<a class="dcard" href="${d.url}" style="--dc:${d.color};--dt:${d.tint}">
 <div class="dc-top"><span class="dc-n">Domain ${d.n}</span><span class="dc-w">${d.weight}% of the exam</span></div>
 <h2>${esc(d.name)}</h2><p>${esc(d.blurb)}</p>
 <div class="dc-foot"><span>${d.lessons.length} lessons</span><span class="js-only" data-prog="d${d.n}" data-total="${d.lessons.length}"></span></div></a>`).join('\n')}</div>
${casesIndex?'<p class="after">Every lesson ends with a short exercise set in one of '+WORDS[Object.keys(CASES).length]+' fictional companies. Their facts are on the <a href="'+casesPath+'">case studies</a> page.</p>':''}${OUT.outOfScope?'\n<section class="oos"><h2>Not on the exam</h2><p>'+inline(OUT.outOfScope.intro)+'</p><ul>'+OUT.outOfScope.items.map(t=>'<li>'+inline(t)+'</li>').join('')+'</ul></section>':''}
<p class="after">Ready to test yourself? The <a href="${examPath}">${esc(EXAM.code)} practice tests</a> cover the same ${WORDS[OUT.domains.length]} domains, with a rationale and documentation link for every question.</p>`})});
// Domain pages
OUT.domains.forEach((d,di)=>{
  const prev=OUT.domains[di-1],next=OUT.domains[di+1];
  pages.push({url:d.url,html:page({
    title:'Domain '+d.n+': '+d.name+' - '+EXAM.code+' Learning Guide',desc:d.blurb,url:d.url,domainColor:d,
    crumbs:[[EXAM.code,examPath],['Learning guide',learnPath],['Domain '+d.n]],
    jsonld:orgJson('CollectionPage','Domain '+d.n+': '+d.name,d.url,d.blurb),
    main:`<div class="tag">Domain ${d.n} &middot; ${d.weight}% of the exam</div>
<h1>${esc(d.name)}</h1>
<p class="lead">${esc(d.blurb)}</p>
<ol class="llist">${d.lessons.map(l=>`<li data-l="${l.id}">${l.html?'<a href="'+l.url+'">':'<div class="soon">'}<span class="lid">${l.id}</span><span class="lt"><b>${esc(l.title)}</b>${l.summary?'<span>'+esc(l.summary)+'</span>':'<span>Coming soon</span>'}</span>${l.html?'</a>':'</div>'}</li>`).join('\n')}</ol>
<nav class="pn">${prev?'<a class="prev" href="'+prev.url+'"><small>Previous domain</small>'+esc(prev.name)+'</a>':'<span></span>'}${next?'<a class="next" href="'+next.url+'"><small>Next domain</small>'+esc(next.name)+'</a>':''}</nav>`})});
});
// Lesson pages
written.forEach(l=>{
  const i=written.indexOf(l),prev=written[i-1],next=written[i+1],d=l.domain;
  const mins=Math.max(3,Math.round(l.words/200));
  pages.push({url:l.url,html:page({
    title:l.id+' '+l.title+' - '+EXAM.code+' Learning Guide',desc:l.summary,url:l.url,lesson:l.id,domainColor:d,
    crumbs:[[EXAM.code,examPath],['Learning guide',learnPath],['Domain '+d.n,d.url],['Lesson '+l.id]],
    jsonld:orgJson('LearningResource',l.title,l.url,l.summary,{learningResourceType:'Lesson',timeRequired:'PT'+mins+'M',
      teaches:l.task,isPartOf:{'@type':'Course',name:EXAM.code+' Learning Guide',url:SITE+learnPath}}),
    main:`<div class="tag">Domain ${d.n} &middot; Lesson ${l.id} &middot; ${mins} min read</div>
<h1>${esc(l.title)}</h1>
<div class="task"><span>Exam task</span>${esc(l.task)}</div>
<p class="lead">${esc(l.summary)}</p>
<nav class="jump" aria-label="On this page"><span>On this page</span>${l.toc.map(t=>'<a href="#'+t.id+'">'+t.txt.replace(/<[^>]+>/g,'').split(':')[0]+'</a>').join('')}<a href="#sources">Sources</a></nav>
<article class="body">
${l.html}</article>
<section class="sources"><h2 id="sources">Sources</h2><ul>${l.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a></li>').join('')}</ul>${l.handson.length?'<h3 class="ho">Go hands-on <span>optional, needs a Claude API key</span></h3><p class="ho-p">Runnable notebooks from Anthropic\'s Claude Cookbook that build the patterns in this lesson.</p><ul>'+l.handson.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a></li>').join('')+'</ul>':''}</section>
<div class="done-row js-only"><button type="button" class="btn done-btn" data-done="${l.id}">Mark complete</button></div>
<nav class="pn">${prev?'<a class="prev" href="'+prev.url+'"><small>Previous lesson</small>'+prev.id+' '+esc(prev.title)+'</a>':'<span></span>'}${next?'<a class="next" href="'+next.url+'"><small>Next lesson</small>'+next.id+' '+esc(next.title)+'</a>':'<a class="next" href="'+examPath+'"><small>Finished</small>Take a practice test</a>'}</nav>`})});
});

// Cheat sheet: full width, prints on two or three pages (print rules in learn.css).
if(cheat){
  const bp=EXAM.blueprint;
  pages.push({url:csPath,html:page({
    title:EXAM.code+' Cheat Sheet - '+EXAM.name,desc:cheat.summary,url:csPath,side:false,wrapCls:'wrap-cs',
    crumbs:[[EXAM.code,examPath],['Learning guide',learnPath],['Cheat sheet']],
    jsonld:orgJson('LearningResource',EXAM.code+' Cheat Sheet',csPath,cheat.summary,{learningResourceType:'Cheat sheet',
      isPartOf:{'@type':'Course',name:EXAM.code+' Learning Guide',url:SITE+learnPath}}),
    main:`<div class="tag">${esc(EXAM.code)} Learning Guide &middot; Cheat sheet</div>
<h1>${esc(cheat.title)}</h1>
<p class="lead">${esc(cheat.summary)}</p>
<div class="cs-act js-only"><button type="button" class="btn" data-print>Print or save as PDF</button><span>Numbers like <a class="cs-l" href="${written[0].url}">${written[0].id}</a> open the lesson behind each point.</span></div>
<div class="cs-glance"><div><b>${bp.questionCount}</b>items</div><div><b>${Math.round(bp.durationSec/60)}</b>minutes</div><div><b>${bp.passScaled}</b>to pass, of ${bp.scaledMax}</div>
<ul>${OUT.domains.map(d=>`<li style="--dc:${d.color}"><b>D${d.n}</b> ${esc(d.name)} <i>${d.weight}%</i></li>`).join('')}</ul></div>
${cheat.sections.map(s=>`<section class="cs-s${s.d?'':' cs-x'}"${s.d?` style="--dc:${s.d.color};--dt:${s.d.tint}"`:''}><h2 id="${slugify(s.h)}">${s.d?`<span>Domain ${s.d.n} &middot; ${s.d.weight}%</span>`+esc(s.d.name):esc(s.h)}</h2><div class="cs-b body">${s.html}</div></section>`).join('\n')}
<p class="after">Unsure about a point? Open its lesson from the number beside it. Ready to check yourself? Take the <a href="${examPath}">${esc(EXAM.code)} practice tests</a>.</p>`})});
}

// Case pages
if(casesIndex){
  const list=Object.values(CASES);
  pages.push({url:casesPath,html:page({
    title:'Case Studies - '+EXAM.code+' Learning Guide',desc:casesIndex.summary,url:casesPath,
    crumbs:[[EXAM.code,examPath],['Learning guide',learnPath],['Case studies']],
    jsonld:orgJson('CollectionPage',EXAM.code+' Case Studies',casesPath,casesIndex.summary),
    main:'<h1>'+esc(casesIndex.title)+'</h1><p class="lead">'+esc(casesIndex.summary)+'</p><article class="body">'+casesIndex.html+'</article>'})});
  for(const c of list){
    const used=c.used.slice().sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
    pages.push({url:c.url,html:page({
      title:c.title+' (case study) - '+EXAM.code+' Learning Guide',desc:c.summary,url:c.url,
      crumbs:[[EXAM.code,examPath],['Learning guide',learnPath],['Case studies',casesPath],[c.title]],
      jsonld:orgJson('Article',c.title+' case study',c.url,c.summary),
      main:'<div class="tag tag-case">Case study &middot; fictional company</div><h1>'+esc(c.title)+'</h1><p class="lead">'+esc(c.summary)+'</p>'+
        '<article class="body">'+c.html+'</article>'+
        (used.length?'<section class="sources"><h2 id="used-in">Exercises set here</h2><ul>'+used.map(l=>'<li><a href="'+l.url+'#exercise'+'">'+l.id+' '+esc(l.title)+'</a></li>').join('')+'</ul></section>':'')})});
  }
}

// Resources page (<exam path>/resources/): the outline's official links, then every documentation
// page the lessons cite, grouped by domain with the lessons that cite it, then the cookbook notebooks.
const resPath=examPath+'resources/';
{
  const lessonLinks=ls=>ls.map(l=>'<a href="'+l.url+'#sources">'+l.id+'</a>').join(', ');
  const group=(items)=>{const m=new Map();for(const [s,l] of items){const k=s.url;if(!m.has(k))m.set(k,{s,ls:[]});if(!m.get(k).ls.includes(l))m.get(k).ls.push(l);}return[...m.values()];};
  const list=g=>'<ul class="res">'+g.map(({s,ls})=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a><span>Lesson'+(ls.length>1?'s ':' ')+lessonLinks(ls)+'</span></li>').join('')+'</ul>';
  const official=OUT.official||[];
  const doms=OUT.domains.map(d=>({d,g:group(d.lessons.filter(l=>l.html).flatMap(l=>l.sources.map(s=>[s,l])))})).filter(x=>x.g.length);
  const ho=group(written.flatMap(l=>l.handson.map(s=>[s,l])));
  const nDocs=new Set(written.flatMap(l=>l.sources.map(s=>s.url))).size;
  pages.push({url:resPath,html:page({
    title:EXAM.code+' Study Resources - '+EXAM.name,tab:'resources',side:false,
    desc:'Official documentation and hands-on notebooks for the '+EXAM.name+' exam, grouped by exam domain and linked to the lessons that use them.',url:resPath,
    crumbs:[[EXAM.code,examPath],['Resources']],
    jsonld:orgJson('CollectionPage',EXAM.code+' Study Resources',resPath,'Official documentation and hands-on notebooks for the '+EXAM.code+' exam, grouped by domain.'),
    main:`<div class="tag">${esc(EXAM.code)} Study Resources</div>
<h1>Study resources</h1>
<p class="lead">The ${nDocs} documentation pages the ${esc(EXAM.code)} lessons are built on, grouped by exam domain, with the lessons that cite each one.${ho.length?' Then runnable notebooks from Anthropic\'s Claude Cookbook for hands-on practice.':''}</p>
${official.length?'<section class="res-s"><h2 id="official">Official exam information</h2><ul class="res">'+official.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a></li>').join('')+'</ul></section>':''}
${doms.map(({d,g})=>`<section class="res-s" style="--dc:${d.color}"><h2 id="domain-${d.n}"><span>Domain ${d.n}</span>${esc(d.name)}</h2>${list(g)}</section>`).join('\n')}
${ho.length?'<section class="res-s"><h2 id="hands-on"><span>Go hands-on</span>Claude Cookbook notebooks</h2><p class="ho-p">Optional and needs a Claude API key. Each notebook builds a pattern from the lessons listed beside it.</p>'+list(ho)+'</section>':''}
<p class="after">Learning the topics? Start with the <a href="${learnPath}">${esc(EXAM.code)} learning guide</a>.${cheat?` Revising before the exam? Read the <a href="${csPath}">cheat sheet</a>.`:''} Ready to test yourself? Take the <a href="${examPath}">practice tests</a>.</p>`})});
}

// ---- internal link check ----
// /resources/ (site-wide) is written by tools/build-site.js, which runs after this.
const known=new Set([...pages.map(p=>p.url),'/resources/']);
for(const p of pages){
  for(const m of p.html.matchAll(/href="(\/[^"#?]*)/g)){
    const u=m[1];
    if(known.has(u))continue;
    const f=path.join(ROOT,u,u.endsWith('/')?'index.html':'');
    if(!fs.existsSync(f))fail(p.url+': broken internal link '+u);
  }
}
if(errors.length){console.error('build-learn: '+errors.length+' error(s)\n  '+errors.join('\n  '));process.exit(1);}

// ---- write ----
fs.rmSync(outDir,{recursive:true,force:true});
for(const p of pages){const f=path.join(ROOT,p.url,'index.html');fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,p.html);}
// sitemap: drop this guide's old entries, append the current ones
const smf=path.join(ROOT,'sitemap.xml'),today=new Date().toISOString().slice(0,10);
let sm=fs.readFileSync(smf,'utf8').replace(/\r\n/g,'\n');
for(const base of [learnPath,resPath])
  sm=sm.replace(new RegExp('  <url>\\n    <loc>'+(SITE+base).replace(/[.\/]/g,'\\$&')+'[^<]*</loc>[\\s\\S]*?</url>\\n','g'),'');
const entries=pages.filter(p=>p.url===learnPath||p.url.split('/').length>0).map(p=>
  '  <url>\n    <loc>'+SITE+p.url+'</loc>\n    <lastmod>'+today+'</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>'+(p.url===learnPath?'0.8':'0.7')+'</priority>\n  </url>\n').join('');
sm=sm.replace('</urlset>',entries+'</urlset>');
fs.writeFileSync(smf,sm);
for(const w of warns)console.log('note: '+w);
console.log('build-learn: '+examId+': '+pages.length+' pages ('+written.length+' of '+lessons.length+' lessons written) -> '+learnPath);
