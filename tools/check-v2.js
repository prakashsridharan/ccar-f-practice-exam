#!/usr/bin/env node
// Check a Version 2 question bank (exam-format item types) without publishing anything.
//
//   node tools/check-v2.js <exam-content-dir> [file]   e.g. node tools/check-v2.js ../certprep-content/claude/ccar-p
//   file defaults to questions-v2.md. Ids, refs, tests.json and option-notes.json come from the same folder.
//
// Item types (header token after the code): Select ONE / Select N (as in Version 1), and
//   Yes/No   stem, then 5-6 statements "- **1.** ...";  key "**Q12** (CODE) - **1 Yes, 2 No, ...**"
//   Match    stem, options "- **A.** ..." (3-4, reusable), then 6 statements "- **1.** ...";
//            key "**Q12** (CODE) - **1 B, 2 A, ...**"
// Yes/No and Match keys need one explanation per statement ("- **1.** ..."). A Select item whose
// options changed carries its option notes inline ("- **A.** Correct. ..."); otherwise its
// option-notes.json entry must still fit. Scoring is all or nothing for every type.
//
// Reports the mix per fixed test against the Version 2 target, and answer-position and
// option-length balance. Exits 1 on any error.
'use strict';
const fs=require('fs'),path=require('path');
const {parseQuestions}=require('./build.js');
const dir=process.argv[2],file=path.join(dir||'',process.argv[3]||'questions-v2.md');
if(!dir){console.error('usage: node tools/check-v2.js <exam-content-dir> [file]');process.exit(2);}
const EXAM=new Function(fs.readFileSync(path.join(dir,'config.js'),'utf8')+';return EXAM;')();
const {qs,keys}=parseQuestions(fs.readFileSync(file,'utf8'),file);
const v1=parseQuestions(fs.readFileSync(path.join(dir,'questions.md'),'utf8'),'questions.md');
const refs=JSON.parse(fs.readFileSync(path.join(dir,'refs.json'),'utf8'));
const notes=JSON.parse(fs.readFileSync(path.join(dir,'option-notes.json'),'utf8'));
const tests=JSON.parse(fs.readFileSync(path.join(dir,'tests.json'),'utf8'));
const TARGET={multi:33,yn:5,match:5};// per 63-item test; single choice takes the rest
const EM=String.fromCharCode(0x2014),EN=String.fromCharCode(0x2013);
const errs=[],type={},changed=new Set();
const v1q=new Map(v1.qs.map(q=>[q.n,q]));
for(const q of qs){
  const id=EXAM.idPrefix+q.n,k=keys[q.n],at=id;
  if(!k){errs.push(at+': no answer key');continue;}
  if(!refs[id])errs.push(at+': no entry in refs.json');
  if(!q.stem.length)errs.push(at+': empty stem');
  if(!k.r.length)errs.push(at+': empty rationale');
  const ty=q.ty||(q.se>1?'multi':'single');type[id]=ty;
  if(ty==='yn'||ty==='match'){
    const S=q.st,nums=S.map(s=>s.n).join();
    if(q.se)errs.push(at+': '+ty+' item must not say "Select N"');
    if(!k.sa)errs.push(at+': key must list statement answers (**1 Yes, 2 No, ...**)');
    if(nums!==S.map((_,i)=>i+1).join())errs.push(at+': statements must be numbered 1..'+S.length);
    if(ty==='yn'){
      if(S.length<5||S.length>6)errs.push(at+': Yes/No needs 5-6 statements, has '+S.length);
      if(q.o.length)errs.push(at+': Yes/No item has options');
      if(k.sa&&k.sa.some(a=>a.v!=='Yes'&&a.v!=='No'))errs.push(at+': Yes/No answers must be Yes or No');
      if(k.sa&&(new Set(k.sa.map(a=>a.v))).size<2)errs.push(at+': Yes/No answers are all the same');
    }else{
      if(S.length!==6)errs.push(at+': Match needs 6 statements, has '+S.length);
      if(q.o.length<3||q.o.length>4)errs.push(at+': Match needs 3-4 options, has '+q.o.length);
      if(k.sa&&k.sa.some(a=>!q.o.some(o=>o.l===a.v)))errs.push(at+': Match answer is not an option');
      if(k.sa&&(new Set(k.sa.map(a=>a.v))).size<Math.min(3,q.o.length))errs.push(at+': Match uses fewer than 3 options');
    }
    if(k.sa&&k.sa.map(a=>a.n).join()!==nums)errs.push(at+': key answers do not cover statements 1..'+S.length+' in order');
    if(k.sn.length!==S.length)errs.push(at+': needs one explanation per statement ('+k.sn.length+' of '+S.length+')');
  }else{
    if(!q.se)errs.push(at+': no "Select N"');
    if(q.st.length)errs.push(at+': Select item has numbered statements');
    if(q.o.length<2)errs.push(at+': fewer than 2 options');
    if(k.a.length!==q.se)errs.push(at+': Select '+q.se+' but '+k.a.length+' answers');
    k.a.forEach(a=>{if(!q.o.some(o=>o.l===a))errs.push(at+': answer '+a+' is not an option');});
    const old=v1q.get(q.n),same=old&&JSON.stringify(old.o)===JSON.stringify(q.o)&&JSON.stringify(v1.keys[q.n].a)===JSON.stringify(k.a);
    if(!same)changed.add(id);
    if(k.on){if(k.on.map(x=>x.l).join()!==q.o.map(o=>o.l).join())errs.push(at+': inline notes must cover options '+q.o.map(o=>o.l).join(''));
      else k.on.forEach(x=>{const want=k.a.includes(x.l)?'Correct.':'Incorrect.';if(!x.t.startsWith(want))errs.push(at+': note for '+x.l+' must start with "'+want+'"');});}
    else if(!same)errs.push(at+': options or answers changed, so it needs inline option notes');
    else if(!notes[id]||notes[id].length!==q.o.length)errs.push(at+': option-notes.json does not fit');
  }
  if(k.code&&q.code&&k.code!==q.code)errs.push(at+': key code '+k.code+' != '+q.code);
}
const ids=new Set(qs.map(q=>EXAM.idPrefix+q.n)),v1ids=new Set(v1.qs.map(q=>EXAM.idPrefix+q.n));
v1ids.forEach(id=>{if(!ids.has(id))errs.push(id+': missing from Version 2');});
ids.forEach(id=>{if(!v1ids.has(id))errs.push(id+': not in Version 1 (ids must stay P1..P'+v1ids.size+')');});
const raw=fs.readFileSync(file,'utf8');if(raw.includes(EM)||raw.includes(EN))console.log('note: '+(raw.split(EM).length-1)+' em and '+(raw.split(EN).length-1)+' en dashes (the build turns them into hyphens)');
// Mix per test
console.log('Test   multi  yes/no  match  single   (target '+TARGET.multi+' / '+TARGET.yn+' / '+TARGET.match+' / '+(63-TARGET.multi-TARGET.yn-TARGET.match)+')');
for(const t of tests){const c={multi:0,yn:0,match:0,single:0};t.ids.forEach(id=>c[type[id]]++);
  console.log(String(t.n).padEnd(6)+String(c.multi).padStart(5)+String(c.yn).padStart(8)+String(c.match).padStart(7)+String(c.single).padStart(8));}
// Balance over the Select items
const sel=qs.filter(q=>q.se),pos={};let longest=0,shortest=0;
sel.forEach(q=>{const k=keys[q.n];if(!k)return;k.a.forEach(a=>pos[a]=(pos[a]||0)+1);
  const len=q.o.map(o=>o.t.length),cor=q.o.map(o=>k.a.includes(o.l));
  const mc=Math.max(...len.filter((_,i)=>cor[i])),mw=Math.max(...len.filter((_,i)=>!cor[i]));
  if(mc>mw)longest++;if(Math.min(...len.filter((_,i)=>cor[i]))<Math.min(...len.filter((_,i)=>!cor[i])))shortest++;});
console.log('Select items: answers by position '+JSON.stringify(pos)+'; a correct option is the longest in '+Math.round(100*longest/sel.length)+'%, the shortest in '+Math.round(100*shortest/sel.length)+'%');
console.log('Changed from Version 1: '+changed.size+' Select items, '+Object.values(type).filter(t=>t==='yn'||t==='match').length+' Yes/No or Match items');
if(errs.length){console.log('\n'+errs.length+' problem(s):\n  '+errs.join('\n  '));process.exit(1);}
console.log('OK');
