// Site chrome behaviour on every page. The header menu is a <details>, so it works without
// this file; here it closes on Escape, on an outside click and when another menu opens.
// Also: the certification search box, shown only once the list is long (tools/site-nav.js).
(function(){
  'use strict';
  document.documentElement.classList.add('js');
  var menus=[].slice.call(document.querySelectorAll('.sh-m'));
  function closeAll(except){menus.forEach(function(m){if(m!==except)m.removeAttribute('open');});}
  menus.forEach(function(m){m.addEventListener('toggle',function(){if(m.open)closeAll(m);});});
  document.addEventListener('click',function(e){if(!e.target.closest||!e.target.closest('.sh-m'))closeAll();});
  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var open=menus.filter(function(m){return m.open;})[0];
    if(open){closeAll();var s=open.querySelector('summary');if(s)s.focus();}
  });
  // Slim title bar: once the page's blue banner (.hdr with an h1) has scrolled up under the
  // sticky header, a one-line copy of its title stays pinned below the header (and the exam
  // tabs). The banner itself never changes size, so the page cannot jump. The exam app
  // re-renders its banner, so the current one is looked up on every check.
  var mini=document.createElement('div');mini.className='hdr-mini';mini.setAttribute('aria-hidden','true');
  var inner=document.createElement('div');inner.className='hm-in';mini.appendChild(inner);document.body.appendChild(mini);
  var ticking=false;
  function check(){
    ticking=false;
    var h=document.querySelector('.hdr'),t=h&&h.querySelector('h1'),bar=document.querySelector('.xt')||document.querySelector('.sh');
    var show=!!(t&&bar&&h.getBoundingClientRect().bottom<=bar.getBoundingClientRect().bottom+1);
    if(show){var txt=t.textContent;if(inner.textContent!==txt)inner.textContent=txt;mini.style.top=bar.getBoundingClientRect().bottom+'px';}
    mini.classList.toggle('on',show);
  }
  function req(){if(!ticking){ticking=true;requestAnimationFrame(check);}}
  window.addEventListener('scroll',req,{passive:true});window.addEventListener('resize',req);
  // The exam app swaps views without scrolling events (Back/Forward, tab clicks).
  window.addEventListener('hashchange',function(){setTimeout(check,0);});
  check();

  // Visit counting for the pages that have no tracker of their own (home, vendor, Resources).
  // Exam pages (app.js, #app) and guide pages (learn.js, body[data-prefix]) count their own
  // visits, so they are skipped here. Same table, fields and utm handling as learn.js.
  if(!document.getElementById('app')&&!(document.body.hasAttribute&&document.body.hasAttribute('data-prefix'))&&window.fetch&&window.URLSearchParams)(function(){
    var U='https://vuzdypmlfpeslsfezapd.supabase.co/rest/v1/visits',
      K='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1emR5cG1sZnBlc2xzZmV6YXBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjYyNDcsImV4cCI6MjEwMzk0MjI0N30.UGbcFwFLeKnTITJLQm8QO4YPn1hDhWe8ptz1-QJ19ik';
    if(location.hash==='#admin')return;// the owner checking stats is not a visit
    var p=new URLSearchParams(location.search),ref='';
    try{var h=document.referrer&&new URL(document.referrer).hostname;if(h&&h!==location.hostname)ref=h.slice(0,80);}catch(e){}
    var page=location.pathname==='/'?'hub':location.pathname.replace(/^\/|\/$/g,'').slice(0,40);
    var full={page:page,ua:navigator.userAgent.substring(0,200),path:location.pathname.slice(0,200),
      src:(p.get('utm_source')||'').slice(0,40),campaign:(p.get('utm_campaign')||'').slice(0,60),ref:ref};
    var tags=[];p.forEach(function(v,k){if(k.indexOf('utm_')===0)tags.push(k);});
    if(tags.length){tags.forEach(function(k){p.delete(k);});var s=p.toString();
      try{history.replaceState(history.state,'',location.pathname+(s?'?'+s:'')+location.hash);}catch(e){}}
    fetch(U,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+K,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(full)}).catch(function(){});
  })();

  // Account (header "Sign in"): account.js and the sign-in library load only when they are
  // needed: a saved session, a return from Google or an email link (?code=, error=), or a click.
  // window.cpSync(key) is how app.js and learn.js report a saved change; it is a no-op until an
  // account is signed in, and account.js reads the browser's copy at its first sync anyway.
  (function(){
    var box=document.querySelector('.sh-acct'),btn=box&&box.querySelector('.sh-in-btn');
    window.cpSync=function(k){if(window.CPAccount)window.CPAccount.changed(k);};
    // Launch switch: until the Google, email and database setup is done, sign-in shows only in a
    // browser that opened a page with ?auth=preview (remembered; ?auth=off forgets it).
    var AUTH_LIVE=false,pv=false;
    try{if(/[?&]auth=preview/.test(location.search))localStorage.setItem('cp-auth-preview','1');
      if(/[?&]auth=off/.test(location.search))localStorage.removeItem('cp-auth-preview');pv=localStorage.getItem('cp-auth-preview')==='1';}catch(e){}
    if(!btn||!(AUTH_LIVE||pv))return;
    var me=document.querySelector('script[src*="/site.js"]'),v=(String(me&&me.getAttribute('src')||'').split('?v=')[1]||''),loading=null;
    function load(){
      if(window.CPAccount)return Promise.resolve();
      return loading||(loading=new Promise(function(res,rej){var s=document.createElement('script');s.src='/account.js?v='+v;
        s.onload=res;s.onerror=function(){loading=null;rej();};document.head.appendChild(s);}));
    }
    btn.hidden=false;
    btn.addEventListener('click',function(){load().then(function(){window.CPAccount.click();}).catch(function(){});});
    var has=false;try{has=!!localStorage.getItem('sb-vuzdypmlfpeslsfezapd-auth-token');}catch(e){}
    if(has||/[?&](code|error_description)=/.test(location.search)||/error_description=/.test(location.hash))
      load().then(function(){window.CPAccount.init();}).catch(function(){});
  })();

  var q=document.querySelector('.cl-q');
  if(q)q.addEventListener('input',function(){
    var t=q.value.trim().toLowerCase();
    document.querySelectorAll('.cert-row[data-q]').forEach(function(r){r.hidden=!!t&&r.getAttribute('data-q').indexOf(t)<0;});
  });
})();
