#!/usr/bin/env node
// Check a Version 2 question bank (exam-format item types) without publishing anything.
//
//   node tools/check-v2.js <v2-exam-dir>   e.g. node tools/check-v2.js ../certprep-content/claude/ccar-p-v2
//   Reads <dir>/questions.md; Version 1 (ids, refs, tests.json, option-notes.json) is the folder named by
//   the config's `shares`. tools/build.js applies the same rules when it builds the exam.
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
const dir=process.argv[2];
if(!dir){console.error('usage: node tools/check-v2.js <v2-exam-dir>');process.exit(2);}
const file=path.join(dir,'questions.md');
const EXAM=new Function(fs.readFileSync(path.join(dir,'config.js'),'utf8')+';return EXAM;')();
// basedOn: the earlier version this bank was converted from (ids, option notes); shares: the same, when the versions also share files.
const v1dir=path.join(dir,'..',EXAM.basedOn||EXAM.shares||'');
const {qs,keys}=parseQuestions(fs.readFileSync(file,'utf8'),file);
const v1=parseQuestions(fs.readFileSync(path.join(v1dir,'questions.md'),'utf8'),'questions.md');
// Version 2's own refs, option notes and tests when it has them, else the shared (Version 1) files.
const own=f=>fs.existsSync(path.join(dir,f))?path.join(dir,f):path.join(v1dir,f);
const refs=JSON.parse(fs.readFileSync(own('refs.json'),'utf8'));
const notes=JSON.parse(fs.readFileSync(own('option-notes.json'),'utf8'));
const tests=JSON.parse(fs.readFileSync(own('tests.json'),'utf8'));
const QN=EXAM.blueprint.questionCount,MIX=EXAM.blueprint.mix||{multi:33,yn:5,match:5};
const TARGET=Object.assign({},MIX,{single:QN-MIX.multi-MIX.yn-MIX.match});
// Domain targets per test: the blueprint weights over questionCount, largest remainder (as app.js weightsFor).
const DK=Object.keys(EXAM.domains),DT={};{let used=0;const raw=DK.map(k=>{const x=QN*EXAM.domains[k].weightPct/100;DT[k]=Math.floor(x);used+=DT[k];return[k,x-DT[k]];});
  raw.sort((a,b)=>b[1]-a[1]);for(let i=0;used<QN;i++,used++)DT[raw[i][0]]++;}
// Skills (v1.1 guide): each question's *Objective:* line names one skill of its own domain.
const SK={};DK.forEach(k=>(EXAM.domains[k].skills||[]).forEach(x=>SK[x]=+k));const useSkills=Object.keys(SK).length>0;
const skillOf={},untagged=[];
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
  if(useSkills){if(SK[k.ob]===undefined)untagged.push(id);else if(SK[k.ob]!==q.d)errs.push(at+': skill "'+k.ob+'" belongs to domain '+SK[k.ob]+', question is domain '+q.d);else skillOf[id]=k.ob;}
  if(k.code&&q.code&&k.code!==q.code)errs.push(at+': key code '+k.code+' != '+q.code);
}
const ids=new Set(qs.map(q=>EXAM.idPrefix+q.n)),v1ids=new Set(v1.qs.map(q=>EXAM.idPrefix+q.n));
const dropped=[...v1ids].filter(id=>!ids.has(id)),added=[...ids].filter(id=>!v1ids.has(id));
console.log('Bank: '+ids.size+' questions ('+added.length+' new, '+dropped.length+' Version 1 questions dropped)');
const dom={};qs.forEach(q=>dom[EXAM.idPrefix+q.n]=q.d);
for(const t of tests)t.ids.forEach(id=>{if(!ids.has(id))errs.push('test '+t.n+': '+id+' is not in the bank');});
const raw=fs.readFileSync(file,'utf8');if(raw.includes(EM)||raw.includes(EN))console.log('note: '+(raw.split(EM).length-1)+' em and '+(raw.split(EN).length-1)+' en dashes (the build turns them into hyphens)');
// Mix per test
console.log('Test  items  multi  yes/no  match  single   (target '+QN+': '+TARGET.multi+' / '+TARGET.yn+' / '+TARGET.match+' / '+TARGET.single+')');
for(const t of tests){const c={multi:0,yn:0,match:0,single:0};t.ids.forEach(id=>c[type[id]]++);
  console.log(String(t.n).padEnd(6)+String(t.ids.length).padStart(5)+String(c.multi).padStart(7)+String(c.yn).padStart(8)+String(c.match).padStart(7)+String(c.single).padStart(8));
  if(t.ids.length===QN)for(const x in TARGET)if(c[x]!==TARGET[x])errs.push('test '+t.n+': '+c[x]+' '+x+' items, target '+TARGET[x]);}
// Domains per test against the blueprint weights
console.log('\nTest  '+DK.map(k=>('D'+k).padStart(5)).join('')+'   (target '+DK.map(k=>DT[k]).join('/')+' of '+QN+')');
for(const t of tests){const c={};DK.forEach(k=>c[k]=0);t.ids.forEach(id=>c[dom[id]]++);
  console.log(String(t.n).padEnd(6)+DK.map(k=>String(c[k]).padStart(5)).join(''));
  if(t.ids.length===QN)DK.forEach(k=>{if(Math.abs(c[k]-DT[k])>1)errs.push('test '+t.n+': domain '+k+' has '+c[k]+', target '+DT[k]);});}
const bank={};DK.forEach(k=>bank[k]=0);qs.forEach(q=>bank[q.d]++);
console.log('Bank  '+DK.map(k=>String(bank[k]).padStart(5)).join('')+'   (for '+tests.length+' tests: '+DK.map(k=>DT[k]*tests.length).join('/')+')');
// Skills: questions per skill in the bank, and in how many tests each appears
if(useSkills){console.log('\nSkill coverage (bank / tests that include it):');
  for(const k of DK)console.log('  D'+k+'  '+EXAM.domains[k].skills.map(x=>{const ids=Object.keys(skillOf).filter(i=>skillOf[i]===x);
    return x+' '+ids.length+'/'+tests.filter(t=>t.ids.some(i=>skillOf[i]===x)).length;}).join(', '));
  if(untagged.length)console.log('Untagged (objective is not a v1.1 skill): '+untagged.length+(untagged.length<=20?' '+untagged.join(' '):''));}
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
