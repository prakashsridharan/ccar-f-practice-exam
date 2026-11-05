// Accounts: optional sign-in and progress sync. Loaded by site.js only when someone is signed in,
// is coming back from Google or an email link, or clicks "Sign in", so most visits never load it.
//
// Sign-in is Supabase Auth with no passwords: "Continue with Google", or an email carrying a link
// and a 6-digit code (the code works when the email is opened on another device). The first
// sign-in creates the account. Everything on the site works the same without an account.
//
// Sync: the browser keeps progress in localStorage as before ('<exam>-progress' from app.js,
// '<exam>-learn' from learn.js). For a signed-in learner each such key is also a row in the
// user_progress table (RLS: own rows only). Every sync reads the row, merges it with the browser's
// copy and writes both back, so two devices never overwrite each other: attempts are unioned,
// the newer graded answer wins, a lesson completed anywhere stays completed. app.js and learn.js
// call window.cpSync(key) after each save; a 'cp-sync' event tells them to reload after a merge.
(function(){
  'use strict';
  var SUPA='https://vuzdypmlfpeslsfezapd.supabase.co',
    ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emR5cG1sZnBlc2xzZmV6YXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjYyNDcsImV4cCI6MjEwMzk0MjI0N30.UGbcFwFLeKnTITJLQm8QO4YPn1hDhWe8ptz1-QJ19ik',
    LIB='/vendor/supabase-2.45.4.min.js',KEYRE=/^[a-z0-9-]{2,40}-(progress|learn)$/,RET='cp-return';
  var sb=null,user=null,syncedFor=null,chain=Promise.resolve(),dirty={},timer=null,lastSync=0,state='';
  var box=document.querySelector('.sh-acct'),btn=box&&box.querySelector('.sh-in-btn');
  var dlg=null,menu=null;

  function el(html){var d=document.createElement('div');d.innerHTML=html.trim();return d.firstChild;}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function loadLib(){return window.supabase?Promise.resolve():new Promise(function(res,rej){
    var s=document.createElement('script');s.src=LIB;s.onload=res;s.onerror=function(){rej(new Error('lib'));};document.head.appendChild(s);});}

  // ---- start ----
  var ready=null;
  function init(){
    if(ready)return ready;
    ready=loadLib().then(function(){
      sb=window.supabase.createClient(SUPA,ANON,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      sb.auth.onAuthStateChange(function(ev,session){
        user=session&&session.user||null;paint();
        if(user&&syncedFor!==user.id){syncedFor=user.id;syncAll();}
        if(ev==='SIGNED_IN'){if(dlg&&dlg.open)dlg.close();returnTo();}
        if(ev==='SIGNED_OUT'){syncedFor=null;setState('');}
      });
      return sb.auth.getSession();
    }).then(function(r){
      user=r.data&&r.data.session&&r.data.session.user||null;paint();
      if(user&&syncedFor!==user.id){syncedFor=user.id;syncAll();}
      linkError();
    });
    return ready;
  }

  // A link from the email opened in a different browser cannot finish the sign-in (the code
  // verifier lives in the browser that asked for it); say so and offer the 6-digit code.
  function linkError(){
    var p=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,'')),
      msg=p.get('error_description')||h.get('error_description');
    if(!msg&&!(p.get('code')&&!user))return;
    try{history.replaceState(history.state,'',location.pathname+(location.hash&&!h.get('error_description')?location.hash:''));}catch(e){}
    openDialog();showStep('start');
    err('start',/expired|invalid/i.test(msg||'')?'That sign-in link has expired or was already used. Ask for a new one below.':
      'That link was opened in a different browser from the one you signed in with. Enter your email again, then use the 6-digit code from the new email in this browser.');
  }

  // Coming back from Google or an email link lands on the page the learner left; the exam app's
  // view lives in the hash (#/study/1), which a sign-in redirect cannot carry, so restore it.
  function saveReturn(){try{localStorage.setItem(RET,JSON.stringify({u:location.pathname+location.hash,at:Date.now()}));}catch(e){}}
  function redirectUrl(){return location.origin+location.pathname;}
  function returnTo(){
    var r=null;try{r=JSON.parse(localStorage.getItem(RET)||'null');localStorage.removeItem(RET);}catch(e){}
    if(!r||Date.now()-r.at>3600*1000)return;
    var path=r.u.split('#')[0],hash=r.u.indexOf('#')>-1?r.u.slice(r.u.indexOf('#')):'';
    if(path===location.pathname&&hash&&location.hash!==hash)location.hash=hash;
  }

  // ---- header button and menu ----
  function paint(){
    if(!btn)return;
    if(user){
      var m=user.user_metadata||{},name=m.full_name||m.name||user.email||'',ini=(name.trim()[0]||'?').toUpperCase();
      btn.innerHTML='<span class="ac-av" aria-hidden="true">'+esc(ini)+'</span><span class="sh-in-t">Account</span>';
      btn.setAttribute('aria-label','Account: '+(user.email||name));btn.setAttribute('aria-haspopup','true');btn.classList.add('is-in');
    }else{
      btn.innerHTML='<svg class="sh-in-i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg><span class="sh-in-t">Sign in</span>';
      btn.setAttribute('aria-label','Sign in');btn.removeAttribute('aria-haspopup');btn.classList.remove('is-in');
      if(menu)menu.hidden=true;
    }
    btn.hidden=false;
  }
  function click(){init().then(function(){if(user)toggleMenu();else openDialog();}).catch(function(){alert('Sign-in is unavailable right now. Please try again later.');});}
  function toggleMenu(){
    if(!menu){
      menu=el('<div class="ac-m" role="menu" hidden><div class="ac-who"><span>Signed in as</span><b></b></div><div class="ac-st"></div>'+
        '<button type="button" role="menuitem" class="ac-mi" data-a="out">Sign out</button>'+
        '<a role="menuitem" class="ac-mi" href="/privacy/">Privacy policy</a>'+
        '<button type="button" role="menuitem" class="ac-mi ac-del" data-a="del">Delete my account</button></div>');
      box.appendChild(menu);
      menu.addEventListener('click',function(e){var b=e.target.closest('[data-a]');if(!b)return;
        if(b.getAttribute('data-a')==='out')signOut();else delAccount();});
      document.addEventListener('click',function(e){if(!box.contains(e.target))menu.hidden=true;});
      document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!menu.hidden){menu.hidden=true;btn.focus();}});
    }
    menu.querySelector('.ac-who b').textContent=user.email||'';
    stateText();menu.hidden=!menu.hidden;btn.setAttribute('aria-expanded',menu.hidden?'false':'true');
  }
  function setState(s){state=s;stateText();}
  function stateText(){if(!menu)return;var t={syncing:'Saving your progress...',synced:'Progress saved to your account',error:'Could not reach the server. Your progress is safe in this browser and will be saved when you are back online.'}[state]||'';
    var st=menu.querySelector('.ac-st');st.textContent=t;st.className='ac-st'+(state?' is-'+state:'');}
  function signOut(){
    pushNow().then(function(){return sb.auth.signOut({scope:'local'});}).then(function(){user=null;paint();});
  }
  function delAccount(){
    if(!confirm('Delete your CertPrep account and the progress saved to it?\n\nThe progress kept in this browser stays here. This cannot be undone.'))return;
    sb.rpc('delete_my_account').then(function(r){
      if(r.error){alert('Your account could not be deleted right now. Please try again, or email contact@pratechlabs.com.');return;}
      return sb.auth.signOut({scope:'local'}).then(function(){user=null;paint();alert('Your account has been deleted.');});
    });
  }

  // ---- sign-in dialog ----
  var GLOGO='<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>';
  var email='',resendAt=0,rt=null;
  function openDialog(){
    if(!dlg){
      dlg=el('<dialog class="ac-d" aria-labelledby="ac-t"><button type="button" class="ac-x" aria-label="Close">&times;</button>'+
        '<div class="ac-step" data-step="start"><h2 id="ac-t">Sign in to CertPrep</h2>'+
          '<p class="ac-sub">Sign in or create a free account. No password needed. Your practice scores and completed lessons then follow you to any device.</p>'+
          '<button type="button" class="ac-g">'+GLOGO+'<span>Continue with Google</span></button>'+
          '<div class="ac-or"><span>or</span></div>'+
          '<form class="ac-f" novalidate><label for="ac-e">Email</label><input id="ac-e" type="email" autocomplete="email" placeholder="you@example.com" required>'+
          '<button type="submit" class="ac-p">Email me a link and code</button></form>'+
          '<p class="ac-err" role="alert" hidden></p>'+
          '<p class="ac-fine">Everything on CertPrep stays free with or without an account. Read the <a href="/privacy/">privacy policy</a>.</p></div>'+
        '<div class="ac-step" data-step="code" hidden><h2>Check your email</h2>'+
          '<p class="ac-sub">We sent a sign-in link and a 6-digit code to <b class="ac-to"></b>. Click the link in the email, or enter the code here.</p>'+
          '<form class="ac-cf" novalidate><label for="ac-c">6-digit code</label><input id="ac-c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="123456" required>'+
          '<button type="submit" class="ac-p">Sign in</button></form>'+
          '<p class="ac-err" role="alert" hidden></p>'+
          '<p class="ac-fine"><button type="button" class="ac-l ac-resend">Send again</button> <span aria-hidden="true">&middot;</span> <button type="button" class="ac-l ac-back">Use a different email</button></p>'+
          '<p class="ac-fine">Not in your inbox? Check spam. The email comes from no-reply@certprep.pratechlabs.com.</p></div></dialog>');
      document.body.appendChild(dlg);
      dlg.querySelector('.ac-x').addEventListener('click',function(){dlg.close();});
      dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});// backdrop
      dlg.querySelector('.ac-g').addEventListener('click',google);
      dlg.querySelector('.ac-f').addEventListener('submit',function(e){e.preventDefault();sendEmail(dlg.querySelector('#ac-e').value.trim());});
      dlg.querySelector('.ac-cf').addEventListener('submit',function(e){e.preventDefault();verify(dlg.querySelector('#ac-c').value.replace(/\D/g,''));});
      dlg.querySelector('#ac-c').addEventListener('input',function(e){var v=e.target.value.replace(/\D/g,'').slice(0,6);e.target.value=v;if(v.length===6)verify(v);});
      dlg.querySelector('.ac-resend').addEventListener('click',function(){sendEmail(email);});
      dlg.querySelector('.ac-back').addEventListener('click',function(){showStep('start');dlg.querySelector('#ac-e').focus();});
    }
    if(!dlg.open)dlg.showModal();
    showStep(email&&Date.now()-resendAt<15*60*1000?'code':'start');
  }
  function showStep(s){
    if(!dlg)return;
    dlg.querySelectorAll('.ac-step').forEach(function(x){x.hidden=x.getAttribute('data-step')!==s;});
    dlg.querySelectorAll('.ac-err').forEach(function(x){x.hidden=true;});
    var f=dlg.querySelector(s==='code'?'#ac-c':'#ac-e');if(f)setTimeout(function(){f.focus();},30);
  }
  function err(step,msg){var p=dlg.querySelector('[data-step="'+step+'"] .ac-err');p.textContent=msg;p.hidden=!msg;}
  function busy(b,on,label){b.disabled=on;if(label)b.textContent=label;}
  function friendly(e){var m=(e&&e.message)||'';
    if(/rate limit|too many|security purposes/i.test(m))return 'Too many attempts. Please wait a minute and try again.';
    if(/expired|invalid|otp/i.test(m))return 'That code is not valid or has expired. Check the latest email, or send a new code.';
    if(/fetch|network/i.test(m))return 'Could not reach the server. Check your connection and try again.';
    return 'Something went wrong. Please try again.';}
  function google(){
    saveReturn();
    sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectUrl()}}).then(function(r){if(r.error)err('start',friendly(r.error));});
  }
  function sendEmail(addr){
    var b=dlg.querySelector(addr===email&&!dlg.querySelector('[data-step="code"]').hidden?'.ac-resend':'.ac-f .ac-p');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)){err('start','Enter a valid email address.');return;}
    var wait=60-Math.round((Date.now()-resendAt)/1000);
    if(addr===email&&wait>0){err('code','You can send another email in '+wait+' seconds.');return;}
    var old=b.textContent;busy(b,true,'Sending...');saveReturn();
    sb.auth.signInWithOtp({email:addr,options:{shouldCreateUser:true,emailRedirectTo:redirectUrl()}}).then(function(r){
      busy(b,false,old);
      if(r.error){err(dlg.querySelector('[data-step="code"]').hidden?'start':'code',friendly(r.error));return;}
      email=addr;resendAt=Date.now();dlg.querySelector('.ac-to').textContent=addr;dlg.querySelector('#ac-c').value='';showStep('code');cooldown();
    });
  }
  function cooldown(){var b=dlg.querySelector('.ac-resend');clearInterval(rt);
    rt=setInterval(function(){var w=60-Math.round((Date.now()-resendAt)/1000);
      if(w>0){b.disabled=true;b.textContent='Send again in '+w+'s';}else{b.disabled=false;b.textContent='Send again';clearInterval(rt);}},500);}
  var verifying=false;
  function verify(code){
    if(verifying)return;if(code.length!==6){err('code','Enter the 6 digits from the email.');return;}
    var b=dlg.querySelector('.ac-cf .ac-p');verifying=true;busy(b,true,'Signing in...');
    sb.auth.verifyOtp({email:email,token:code,type:'email'}).then(function(r){
      verifying=false;busy(b,false,'Sign in');
      if(r.error){err('code',friendly(r.error));return;}
      email='';// signed in: onAuthStateChange closes the dialog and syncs
    });
  }

  // ---- sync ----
  function read(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}
  function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
  function localKeys(){var ks=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(KEYRE.test(k))ks.push(k);}}catch(e){}return ks;}
  function validProg(p){return p&&p.v===1&&Array.isArray(p.attempts);}
  function validLearn(p){return p&&p.v===1&&p.done&&typeof p.done==='object';}
  function mergeProg(l,r){
    if(!validProg(r))return l;if(!validProg(l))return r;
    var o=JSON.parse(JSON.stringify(l)),have={};
    o.attempts.forEach(function(a){have[a.t+'|'+a.d]=1;});
    r.attempts.forEach(function(a){if(a&&typeof a.t==='number'&&a.d&&!have[a.t+'|'+a.d]){o.attempts.push(a);have[a.t+'|'+a.d]=1;}});
    o.attempts.sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0;});
    if(!o.cur&&r.cur)o.cur=r.cur;
    if(r.study&&typeof r.study==='object'){o.study=o.study||{};Object.keys(r.study).forEach(function(k){if(!o.study[k])o.study[k]=r.study[k];});}
    if(r.ql&&typeof r.ql==='object'){o.ql=o.ql||{};Object.keys(r.ql).forEach(function(id){var v=r.ql[id];
      if(Array.isArray(v)&&(!o.ql[id]||String(v[1]||'')>String(o.ql[id][1]||'')))o.ql[id]=v;});}
    return o;
  }
  function mergeLearn(l,r){
    if(!validLearn(r))return l;if(!validLearn(l))return r;
    var o=JSON.parse(JSON.stringify(l));o.ck=o.ck||{};
    Object.keys(r.done).forEach(function(id){var d=r.done[id];if(!o.done[id]||(d&&String(d)<String(o.done[id])))o.done[id]=d;});
    if(r.ck)Object.keys(r.ck).forEach(function(k){if(r.ck[k])o.ck[k]=r.ck[k];});
    return o;
  }
  function merge(k,l,r){if(r==null)return l;if(l==null)return r;return /-learn$/.test(k)?mergeLearn(l,r):mergeProg(l,r);}
  // Read the account's rows for these keys (all of them when keys is null), merge with the
  // browser, write back whichever side changed. Queued, so syncs never overlap.
  function sync(keys){
    chain=chain.then(function(){
      if(!user)return;
      setState('syncing');
      var q=sb.from('user_progress').select('key,data');if(keys)q=q.in('key',keys);
      return q.then(function(res){
        if(res.error)throw res.error;
        var remote={};(res.data||[]).forEach(function(r){remote[r.key]=r.data;});
        var ks=keys||localKeys().concat(Object.keys(remote).filter(function(k){return localKeys().indexOf(k)<0;}));
        var changed=[],rows=[];
        ks.forEach(function(k){
          if(!KEYRE.test(k))return;
          var l=read(k),m=merge(k,l,remote[k]);if(m==null)return;
          if(JSON.stringify(m)!==JSON.stringify(l)){write(k,m);changed.push(k);}
          if(JSON.stringify(m)!==JSON.stringify(remote[k]))rows.push({user_id:user.id,key:k,data:m,updated_at:new Date().toISOString()});
        });
        return (rows.length?sb.from('user_progress').upsert(rows):Promise.resolve({})).then(function(u){
          if(u&&u.error)throw u.error;
          lastSync=Date.now();setState('synced');
          if(changed.length)window.dispatchEvent(new CustomEvent('cp-sync',{detail:{keys:changed}}));
        });
      }).catch(function(){setState('error');});
    });
    return chain;
  }
  function syncAll(){return sync(null);}
  function changed(k){if(!user||!KEYRE.test(k))return;dirty[k]=1;clearTimeout(timer);timer=setTimeout(pushNow,1500);}
  function pushNow(){clearTimeout(timer);var ks=Object.keys(dirty);dirty={};return ks.length?sync(ks):chain;}
  // Back to this tab after a while: pick up anything done on another device.
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&user&&Date.now()-lastSync>60000)syncAll();
    if(document.visibilityState==='hidden')pushNow();});

  window.CPAccount={init:init,click:click,changed:changed,_merge:merge};// _merge: for tests
})();
