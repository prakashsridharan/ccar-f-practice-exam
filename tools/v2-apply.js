#!/usr/bin/env node
// Replace or add questions in a Version 2 bank from a batch file.
//
//   node tools/v2-apply.js <bank.md> <batch.md>
//
// The batch file has the same two parts as the bank: question blocks ("**Q12.** ...") and,
// after a "# Answer key" line, key blocks ("**Q12** (CODE) - ..."). Each question block and
// key block in the batch replaces the block with the same number in the bank. A number the bank
// does not have is added: the question at the end of its domain section (from its CCARP-D<n>
// code), the key at the end of the key part. A "*Ref:* <url>|<label>" line in a key block is the
// question's documentation link: it goes to refs.json in the bank's folder and is not kept in the
// bank. Nothing else changes. Run tools/check-v2.js afterwards.
'use strict';
const fs=require('fs'),path=require('path');
const [bankF,batchF]=process.argv.slice(2);
if(!bankF||!batchF){console.error('usage: node tools/v2-apply.js <bank.md> <batch.md>');process.exit(2);}
const crlf=/\r\n/.test(fs.readFileSync(bankF,'utf8'));
const norm=s=>s.replace(/\r\n/g,'\n');
const bank=norm(fs.readFileSync(bankF,'utf8')),batch=norm(fs.readFileSync(batchF,'utf8'));
const split=s=>{const i=s.search(/^# Answer key/m);if(i<0)throw new Error('no "# Answer key" line');return[s.slice(0,i),s.slice(i)];};
// Blocks start at a header line and run up to the next header, a "## " heading or the end.
const blocks=(part,re)=>{const out={},lines=part.split('\n');let n=null,buf=[];
  const end=()=>{if(n!==null)out[n]=buf.join('\n').replace(/\s+$/,'');n=null;buf=[];};
  for(const l of lines){const m=l.match(re);if(m){end();n=+m[1];buf=[l];}else if(/^#{1,2} /.test(l)){end();}else if(n!==null)buf.push(l);}
  end();return out;};
const QH=/^\*\*Q(\d+)\.\*\*/,KH=/^\*\*Q(\d+)\*\*\s/;
const [bq,bk]=split(batch),newQ=blocks(bq,QH),newK=blocks(bk,KH);
if(!Object.keys(newQ).length)throw new Error('batch has no question blocks');
// Documentation links for refs.json, taken out of the key blocks
const refs={};
for(const n of Object.keys(newK))newK[n]=newK[n].split('\n').filter(l=>{const m=l.match(/^\*Ref:\*\s*(\S.*)$/);if(m){refs['P'+n]=m[1].trim();return false;}return true;}).join('\n');
// Numbers the bank already has are replaced; the rest are added
const have=new Set([...bank.matchAll(/^\*\*Q(\d+)\.\*\*/gm)].map(m=>+m[1]));
const addQ={},addK={};
for(const n of Object.keys(newQ))if(!have.has(+n)){addQ[n]=newQ[n];delete newQ[n];
  if(newK[n]===undefined)throw new Error('Q'+n+': new question without a key block');addK[n]=newK[n];delete newK[n];}
const replace=(part,re,repl)=>{const lines=part.split('\n'),out=[];let skip=false;const done=new Set();
  for(const l of lines){const m=l.match(re);
    if(m){skip=false;if(repl[+m[1]]!==undefined){out.push(repl[+m[1]],'');skip=true;done.add(+m[1]);continue;}}
    else if(/^#{1,2} /.test(l))skip=false;
    if(!skip)out.push(l);}
  Object.keys(repl).forEach(n=>{if(!done.has(+n))throw new Error('Q'+n+' is not in the bank');});
  return out.join('\n').replace(/\n{3,}/g,'\n\n');};
const [q,k]=split(bank);
let qo=replace(q,QH,newQ),ko=replace(k,KH,newK);
for(const n of Object.keys(addQ).map(Number).sort((a,b)=>a-b)){
  const d=(addQ[n].match(/CCARP-D(\d)-/)||[])[1];if(!d)throw new Error('Q'+n+': no CCARP-D<n> code');
  const L=qo.split('\n'),h=L.findIndex(l=>l.startsWith('## Domain '+d+':'));if(h<0)throw new Error('no section for domain '+d);
  let e=L.findIndex((l,i)=>i>h&&/^#{1,2} /.test(l));if(e<0)e=L.length;
  L.splice(e,0,addQ[n],'');qo=L.join('\n').replace(/\n{3,}/g,'\n\n');
  ko=ko.replace(/\s*$/,'\n\n'+addK[n]+'\n');}
let out=qo+ko;
if(crlf)out=out.replace(/\n/g,'\r\n');
fs.writeFileSync(bankF,out);
if(Object.keys(refs).length){const rf=path.join(path.dirname(bankF),'refs.json'),R=JSON.parse(fs.readFileSync(rf,'utf8'));
  Object.assign(R,refs);fs.writeFileSync(rf,JSON.stringify(R,null,1)+'\n');}
if(Object.keys(addQ).length)console.log('added questions '+Object.keys(addQ).join(', '));
if(Object.keys(newQ).length)console.log('replaced questions '+Object.keys(newQ).join(', ')+'; keys '+Object.keys(newK).join(', '));
if(Object.keys(refs).length)console.log(Object.keys(refs).length+' refs written to refs.json');
