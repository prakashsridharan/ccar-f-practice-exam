#!/usr/bin/env node
// Build the public exam files from the private content repo.
//
//   node tools/build.js <content-dir>        e.g. node tools/build.js ../certprep-content
//
// For every <vendor>/<exam>/ folder in the content repo that has a config.js,
// writes exams/<EXAM.id>.js in this repo. Sources per exam:
//   config.js       const EXAM={...}   (copied verbatim; must set idPrefix)
//   questions.md    question bank in the format below
//   refs.json       {"<id>":"<url>|<label>"}  one documentation link per question
//   scenarios.json  optional {"1":{"t":"title","d":"description"}}
//
// questions.md format (the format the CCAR-P bank was written in):
//   ## Domain 3: Integration                         sets the domain for what follows
//   **Q12.** `CODE` · Select TWO · hard · Scenario 2  code, difficulty, scenario optional
//   Question stem paragraph(s)
//   - **A.** option text   (A-F)
//   ...
//   # Answer key and rationale
//   **Q12** (CODE) - **A, C**   (an em dash before the answers is also accepted)
//   Rationale paragraph(s)
//   *Why not:* optional "why not the others" line
//   *Objective:* blueprint objective · *Source:* internal note (Source is never published)
//
// Validation fails the build on: unknown answer letters, answer count not equal
// to "Select N", missing keys or refs, duplicate ids, fewer than 2 options.
// Em/en dashes are converted to hyphens (house style: no em dashes anywhere).
'use strict';
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..');
const NUM={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
// Em and en dash, built from char codes so this file itself contains no em dashes.
const EM=String.fromCharCode(0x2014),EN=String.fromCharCode(0x2013);
const clean=s=>s.replace(new RegExp('\\s*'+EM+'\\s*','g'),' - ').split(EN).join('-').trim();

function parseQuestions(src,file){
  src=src.replace(/\r\n/g,'\n');
  const cut=src.search(/^# Answer key/m);
  if(cut<0)throw new Error(file+': no "# Answer key" section');
  const qpart=src.slice(0,cut),kpart=src.slice(cut);
  const qs=[];let domain=null,cur=null;
  const flush=()=>{if(cur){qs.push(cur);cur=null;}};
  for(const raw of qpart.split('\n')){
    const l=raw.trim();
    const dm=l.match(/^##\s+Domain\s+(\d+)/i);
    if(dm){flush();domain=+dm[1];continue;}
    const hm=l.match(/^\*\*Q(\d+)\.\*\*\s*(.*)$/);
    if(hm){flush();cur={n:+hm[1],stem:[],o:[],d:domain};
      for(const tok of hm[2].split('·').map(t=>t.trim()).filter(Boolean)){
        let m;
        if((m=tok.match(/^`([^`]+)`$/))){cur.code=m[1];const d=m[1].match(/D(\d+)-/);if(d)cur.d=+d[1];}
        else if((m=tok.match(/^Select\s+(\w+)$/i))){cur.se=NUM[m[1].toUpperCase()]||parseInt(m[1],10);}
        else if(/^(easy|medium|hard)$/i.test(tok))cur.df=tok.toLowerCase();
        else if((m=tok.match(/^Scenario\s+(\d+)$/i)))cur.s=+m[1];
        else throw new Error(file+' Q'+cur.n+': unknown header token "'+tok+'"');}
      continue;}
    if(!cur||!l||l==='---'||l.startsWith('#'))continue;
    const om=l.match(/^- \*\*([A-F])\.\*\*\s+(.*)$/);
    if(om)cur.o.push({l:om[1],t:clean(om[2])});
    else if(cur.o.length)throw new Error(file+' Q'+cur.n+': text after options: '+l);
    else cur.stem.push(clean(l));
  }
  flush();
  const keys={};let k=null;
  for(const raw of kpart.split('\n')){
    const l=raw.trim();
    const km=l.replace(EM,'-').match(/^\*\*Q(\d+)\*\*\s*(?:\(([^)]*)\))?\s*-\s*\*\*([A-F ,]+)\*\*/);
    if(km){k={code:km[2],a:km[3].split(',').map(s=>s.trim()).filter(Boolean),r:[],w:'',ob:''};keys[+km[1]]=k;continue;}
    if(!k||!l||l==='---')continue;
    let m;
    if((m=l.match(/^\*Why not:\*\s*(.*)$/)))k.w=clean(m[1]);
    else if((m=l.match(/^\*Objective:\*\s*(.*?)(?:\s+·\s+\*Source:\*.*)?$/)))k.ob=clean(m[1]);
    else k.r.push(clean(l));
  }
  return {qs,keys};
}

function buildExam(dir){
  const cfgSrc=fs.readFileSync(path.join(dir,'config.js'),'utf8').trim();
  const EXAM=new Function(cfgSrc+';return EXAM;')();
  if(!EXAM.id||!EXAM.idPrefix)throw new Error(dir+': config.js needs id and idPrefix');
  const qfile=path.join(dir,'questions.md');
  const {qs,keys}=parseQuestions(fs.readFileSync(qfile,'utf8'),qfile);
  const refs=JSON.parse(fs.readFileSync(path.join(dir,'refs.json'),'utf8'));
  const scPath=path.join(dir,'scenarios.json');
  const BS=fs.existsSync(scPath)?JSON.parse(fs.readFileSync(scPath,'utf8')):{1:{t:EXAM.code+' Question Bank',d:'Scenario-based questions across the '+EXAM.code+' domains.'}};
  const errs=[],seen=new Set(),BQ=[],REFS={};
  for(const q of qs){
    const id=EXAM.idPrefix+q.n,key=keys[q.n],at='Q'+q.n+' ('+id+')';
    if(seen.has(id)){errs.push(at+': duplicate id');continue;}seen.add(id);
    if(!key){errs.push(at+': no answer key');continue;}
    if(key.code&&q.code&&key.code!==q.code)errs.push(at+': key code '+key.code+' != '+q.code);
    if(!q.d||!EXAM.domains[q.d])errs.push(at+': unknown domain '+q.d);
    if(!q.se)errs.push(at+': no "Select N"');
    if(q.o.length<2)errs.push(at+': fewer than 2 options');
    if(key.a.length!==q.se)errs.push(at+': Select '+q.se+' but '+key.a.length+' answers');
    key.a.forEach(a=>{if(!q.o.some(o=>o.l===a))errs.push(at+': answer '+a+' is not an option');});
    if(!q.stem.length)errs.push(at+': empty stem');
    if(!key.r.length)errs.push(at+': empty rationale');
    if(!refs[id])errs.push(at+': no entry in refs.json');
    else if(!/^https:\/\/\S+\|.+/.test(refs[id]))errs.push(at+': refs.json entry must be "https://...|Label"');
    const o={id,s:q.s||1,d:q.d,ty:q.se>1?'multi':'single'};
    if(q.se>1)o.se=q.se;
    Object.assign(o,{q:q.stem.join('\n\n'),o:q.o,a:key.a,r:key.r.join(' ')});
    if(key.w)o.w=key.w;
    if(q.df)o.df=q.df;
    if(key.ob)o.ob=key.ob;
    if(!BS[o.s])errs.push(at+': unknown scenario '+o.s);
    BQ.push(o);REFS[id]=refs[id];
  }
  Object.keys(keys).forEach(n=>{if(!qs.some(q=>q.n===+n))errs.push('answer key Q'+n+' has no question');});
  Object.keys(refs).forEach(id=>{if(!seen.has(id))errs.push('refs.json '+id+' has no question');});
  if(errs.length)throw new Error(dir+': '+errs.length+' problem(s)\n  '+errs.join('\n  '));
  const out=[
    '// '+EXAM.code+' exam definition: config (EXAM), question bank (BQ), scenarios (BS)',
    '// and documentation links (REFS). Loaded before /app.js, which reads these globals.',
    '// GENERATED by tools/build.js from the private content repo. Do not edit by hand:',
    '// change the source there and rebuild.',
    cfgSrc,
    'const BQ=[\n'+BQ.map(q=>JSON.stringify(q)).join(',\n')+'\n];',
    'const BS='+JSON.stringify(BS)+';',
    'const REFS='+JSON.stringify(REFS,null,0)+';',
    ''].join('\n');
  if(out.includes(EM)||out.includes(EN))throw new Error(dir+': em/en dash in output (check config.js)');
  const target=path.join(ROOT,'exams',EXAM.id+'.js');
  fs.writeFileSync(target,out);
  const byD={};BQ.forEach(q=>{byD[q.d]=(byD[q.d]||0)+1;});
  console.log('built exams/'+EXAM.id+'.js  '+BQ.length+' questions  per domain '+JSON.stringify(byD));
}

const content=process.argv[2];
if(!content){console.error('usage: node tools/build.js <content-dir>');process.exit(2);}
const dirs=[];
for(const v of fs.readdirSync(content,{withFileTypes:true}))if(v.isDirectory()&&!v.name.startsWith('.'))
  for(const e of fs.readdirSync(path.join(content,v.name),{withFileTypes:true}))
    if(e.isDirectory()&&fs.existsSync(path.join(content,v.name,e.name,'config.js')))dirs.push(path.join(content,v.name,e.name));
if(!dirs.length){console.error('no <vendor>/<exam>/config.js found under '+content);process.exit(2);}
let failed=0;
for(const d of dirs){try{buildExam(d);}catch(e){failed++;console.error('FAILED '+e.message);}}
process.exit(failed?1:0);
