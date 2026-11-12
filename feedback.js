// Feedback form for every page (CertPrep). Loaded by site.js on the first click of the
// Feedback button or the footer's "Send feedback", then CPFeedback.open() shows it.
// Sends one row to the Supabase "feedback" table (schema.sql section 6): insert only, the
// public key cannot read anything back. The page it came from is attached automatically,
// so a comment such as "this is unclear" arrives as "CCAR-P learning guide: Lesson 3.4 ...".
(function(){
  var U='https://vuzdypmlfpeslsfezapd.supabase.co/rest/v1/feedback',
    K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emR5cG1sZnBlc2xzZmV6YXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjYyNDcsImV4cCI6MjEwMzk0MjI0N30.UGbcFwFLeKnTITJLQm8QO4YPn1hDhWe8ptz1-QJ19ik',
    WAIT=60*1000,LAST='cp-fb-at';
  var CATS=[['content','A mistake in the content'],['guide','Learning guide or lesson'],['cheat','Cheat sheet'],['tests','Practice tests or questions'],['site','Something not working'],['idea','A suggestion'],['other','Something else']];
  var EXAMS={'ccar-f':'CCAR-F','ccar-p':'CCAR-P Version 1','ccar-p-v2':'CCAR-P Version 2'};

  // Where the reader is: an area label for the admin list, and the category to preselect.
  function where(){
    var p=location.pathname,m=p.match(/^\/[a-z0-9-]+\/([a-z0-9-]+)\//),ex=m&&(EXAMS[m[1]]||m[1].toUpperCase());
    if(p==='/')return{area:'Home page',cat:'other'};
    if(/^\/(resources|privacy)\/$/.test(p))return{area:p==='/resources/'?'Resources':'Privacy page',cat:'other'};
    if(!m)return{area:'Certification list',cat:'other'};
    if(/\/learn\/cheat-sheet\//.test(p))return{area:ex+' cheat sheet',cat:'cheat'};
    if(/\/learn\//.test(p))return{area:ex+' learning guide',cat:'guide'};
    if(/\/resources\//.test(p))return{area:ex+' resources',cat:'other'};
    return{area:ex+' practice tests',cat:'tests'};
  }
  function el(tag,attrs,kids){var e=document.createElement(tag);for(var k in attrs||{}){if(k==='text')e.textContent=attrs[k];else e.setAttribute(k,attrs[k]);}(kids||[]).forEach(function(c){e.appendChild(c);});return e;}

  var dlg=null;
  function build(){
    var w=where();
    var rating=el('div',{'class':'fb-rate',role:'radiogroup','aria-label':'How was it?'});
    [['3','Good'],['2','Okay'],['1','Poor']].forEach(function(r){
      var id='fb-r'+r[0],i=el('input',{type:'radio',name:'fb-rating',value:r[0],id:id});
      rating.appendChild(el('label',{'for':id,'class':'fb-ro'},[i,el('span',{text:r[1]})]));});
    var cat=el('select',{id:'fb-cat',name:'category'});
    CATS.forEach(function(c){var o=el('option',{value:c[0],text:c[1]});if(c[0]===w.cat)o.selected=true;cat.appendChild(o);});
    var msg=el('textarea',{id:'fb-msg',name:'message',rows:'5',maxlength:'2000',required:'',placeholder:'What should we know? If it is about a question or lesson, mention its number.'});
    var mail=el('input',{id:'fb-mail',name:'email',type:'email',maxlength:'200',autocomplete:'email',placeholder:'Only if you would like a reply'});
    // Bots fill every field; people never see this one.
    var trap=el('input',{name:'website',type:'text',tabindex:'-1',autocomplete:'off','class':'fb-hp','aria-hidden':'true'});
    var note=el('p',{'class':'fb-st',role:'status','aria-live':'polite'});
    var send=el('button',{type:'submit','class':'fb-send',text:'Send feedback'});
    var form=el('form',{'class':'fb-f',novalidate:''},[
      el('p',{'class':'fb-where',text:'About: '+w.area+(document.title?' · '+document.title.split(' - ')[0]:'')}),
      el('div',{'class':'fb-l',text:'How was it? (optional)'}),rating,
      el('label',{'class':'fb-l','for':'fb-cat',text:'What is it about?'}),cat,
      el('label',{'class':'fb-l','for':'fb-msg',text:'Your feedback'}),msg,
      el('label',{'class':'fb-l','for':'fb-mail',text:'Email (optional)'}),mail,trap,
      el('p',{'class':'fb-pv',text:'We store your message, this page’s address and, only if you add it, your email. See the privacy page.'}),
      el('div',{'class':'fb-acts'},[el('button',{type:'button','class':'fb-cancel',text:'Cancel'}),send]),note]);
    var box=el('dialog',{'class':'fb-d','aria-labelledby':'fb-t'},[
      el('div',{'class':'fb-hd'},[el('h2',{id:'fb-t',text:'Send feedback'}),el('button',{type:'button','class':'fb-x','aria-label':'Close',text:'×'})]),form]);
    function close(){box.close();}
    box.querySelector('.fb-x').addEventListener('click',close);
    form.querySelector('.fb-cancel').addEventListener('click',close);
    box.addEventListener('click',function(e){if(e.target===box)close();});
    form.addEventListener('submit',function(e){e.preventDefault();
      var text=msg.value.trim();note.className='fb-st';
      if(text.length<3){note.textContent='Please write a few words first.';note.classList.add('err');msg.focus();return;}
      if(mail.value&&!mail.checkValidity()){note.textContent='That email address does not look right.';note.classList.add('err');mail.focus();return;}
      var last=0;try{last=+localStorage.getItem(LAST)||0;}catch(x){}
      if(Date.now()-last<WAIT){note.textContent='Thanks, we have just received feedback from you. Please wait a minute before sending more.';note.classList.add('err');return;}
      if(trap.value){done();return;}// quietly drop bot submissions
      var r=rating.querySelector('input:checked');
      var row={path:(location.pathname+location.hash).slice(0,300),page_title:(document.title||'').slice(0,200),area:w.area.slice(0,60),
        rating:r?+r.value:null,category:cat.value,message:text.slice(0,2000),email:mail.value.trim().slice(0,200),ua:navigator.userAgent.slice(0,200)};
      send.disabled=true;note.textContent='Sending...';
      fetch(U,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(row)})
        .then(function(res){if(!res.ok)throw new Error(res.status);try{localStorage.setItem(LAST,String(Date.now()));}catch(x){}done();})
        .catch(function(){send.disabled=false;note.textContent='Sorry, it could not be sent right now. Please try again, or email contact@pratechlabs.com.';note.classList.add('err');});
    });
    function done(){form.hidden=true;
      var thanks=el('div',{'class':'fb-ok'},[el('p',{'class':'fb-okt',text:'Thank you. Your feedback has been sent.'}),
        el('p',{text:mail.value?'We will reply to '+mail.value.trim()+' if there is something to follow up.':'We read every message and use it to improve the guides and tests.'}),
        el('button',{type:'button','class':'fb-send',text:'Close'})]);
      thanks.querySelector('button').addEventListener('click',close);box.appendChild(thanks);}
    document.body.appendChild(box);return box;
  }
  window.CPFeedback={open:function(){
    // A fresh form each time, so the page context and the thank-you state are current.
    if(dlg&&dlg.parentNode)dlg.parentNode.removeChild(dlg);
    dlg=build();
    if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','');
    var m=dlg.querySelector('#fb-msg');if(m)m.focus();
  }};
})();
