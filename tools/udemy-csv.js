#!/usr/bin/env node
// Udemy bulk-upload CSVs for a Version 2 bank, one per practice test, in the same format as the
// earlier Udemy files (CCAR-P_BalancedTest<N>_63Q.csv): HTML text (<b>, <code>), up to six options
// each with its explanation, Correct Answers as option numbers ("3,4"), and an Overall Explanation
// ending with the documentation link. Yes/No and Match items cannot go in a bulk upload; they are
// written as Udemy "Fill in the blanks" text by tools/udemy-fitb.js.
//
//   node tools/udemy-csv.js <v2-exam-dir>      e.g. node tools/udemy-csv.js ../certprep-content/claude/ccar-p-v2
//
// Writes <dir>/udemy/<CODE>-v2_Test<N>_<count>Q.csv (private content repo) and checks every row.
'use strict';
const fs=require('fs'),path=require('path');
const {parseQuestions}=require('./build.js');
const dir=process.argv[2];if(!dir){console.error('usage: node tools/udemy-csv.js <v2-exam-dir>');process.exit(2);}
const EXAM=new Function(fs.readFileSync(path.join(dir,'config.js'),'utf8')+';return EXAM;')();
const shared=EXAM.shares?path.join(dir,'..',EXAM.shares):dir;
const src=f=>fs.existsSync(path.join(dir,f))?path.join(dir,f):path.join(shared,f);
const {qs,keys}=parseQuestions(fs.readFileSync(path.join(dir,'questions.md'),'utf8'),'questions.md');
const refs=JSON.parse(fs.readFileSync(src('refs.json'),'utf8'));
const notes=JSON.parse(fs.readFileSync(src('option-notes.json'),'utf8'));
const tests=JSON.parse(fs.readFileSync(src('tests.json'),'utf8'));
const EM=String.fromCharCode(0x2014),EN=String.fromCharCode(0x2013);
// Markdown in the bank to the HTML the earlier Udemy files use. Text is escaped first.
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const html=s=>esc(s).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/`([^`]+)`/g,'<code>$1</code>');
const cell=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
const HEAD=['Question','Question Type'];for(let i=1;i<=6;i++)HEAD.push('Answer Option '+i,'Explanation '+i);HEAD.push('Correct Answers','Overall Explanation','Domain');
const prefix=EXAM.code+'-v2';
const outDir=path.join(dir,'udemy');fs.mkdirSync(outDir,{recursive:true});
const errs=[];let total=0;const summary=[];
for(const t of tests){
  const rows=[HEAD.map(cell).join(',')];let multi=0,single=0,skipped=0;
  for(const id of t.ids){
    const q=qs.find(x=>EXAM.idPrefix+x.n===id),k=keys[q.n];
    if(q.ty==='yn'||q.ty==='match'){skipped++;continue;}
    if(q.o.length>6){errs.push(id+': more than 6 options');continue;}
    const nx=k.on?k.on.map(x=>x.t):notes[id];
    if(!nx||nx.length!==q.o.length){errs.push(id+': no option explanations');continue;}
    const correct=q.o.map((o,i)=>k.a.includes(o.l)?i+1:0).filter(Boolean);
    if(correct.length!==q.se)errs.push(id+': '+correct.length+' correct options for Select '+q.se);
    const r=[q.stem.map(html).join('<br><br>'),q.se>1?'multi-select':'multiple-choice'];
    for(let i=0;i<6;i++){r.push(q.o[i]?html(q.o[i].t):'',q.o[i]?html(nx[i]):'');}
    const ref=(refs[id]||'').split('|');
    const overall=html(k.r.join(' '))+(ref[0]?'<br><br>Resources: <a target="_blank" rel="noopener noreferrer" href="'+ref[0]+'">'+esc(ref[1]||ref[0])+'</a>':'');
    r.push(correct.join(','),overall,EXAM.domains[q.d].n);
    const line=r.map(cell).join(',');
    if(line.includes(EM)||line.includes(EN))errs.push(id+': em or en dash');
    if(/Course \d ·|\*Source:\*/.test(line))errs.push(id+': internal source note in the text');
    rows.push(line);q.se>1?multi++:single++;}
  const f=path.join(outDir,prefix+'_Test'+t.n+'_'+(rows.length-1)+'Q.csv');
  fs.writeFileSync(f,rows.join('\n')+'\n');total+=rows.length-1;
  summary.push(path.basename(f)+': '+(rows.length-1)+' rows ('+single+' multiple-choice, '+multi+' multi-select); '+skipped+' Yes/No or Match items go in fill-in-blanks.md');}
summary.forEach(s=>console.log(s));
if(errs.length){console.log(errs.length+' problem(s):\n  '+errs.join('\n  '));process.exit(1);}
console.log('OK, '+total+' rows');
