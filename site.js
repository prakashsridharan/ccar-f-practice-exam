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
  var q=document.querySelector('.cl-q');
  if(q)q.addEventListener('input',function(){
    var t=q.value.trim().toLowerCase();
    document.querySelectorAll('.cert-row[data-q]').forEach(function(r){r.hidden=!!t&&r.getAttribute('data-q').indexOf(t)<0;});
  });
})();
