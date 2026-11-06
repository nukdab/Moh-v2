(function(){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  var fine=matchMedia('(pointer:fine)').matches;
  function go(){var m=document.querySelector('.main');if(!m)return;m.classList.remove('fx-go');void m.offsetWidth;m.classList.add('fx-go')}
  window.addEventListener('hashchange',go);
  if(fine){
    document.addEventListener('pointermove',function(e){
      var t=e.target.closest&&e.target.closest('.stat,.type,.box,.fx-t');
      document.querySelectorAll('.fx-tilt').forEach(function(n){if(n!==t){n.style.transform='';n.classList.remove('fx-tilt')}});
      if(!t)return;var r=t.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      t.classList.add('fx-tilt');t.style.transform='perspective(800px) rotateY('+(x*10)+'deg) rotateX('+(-y*10)+'deg) translateZ(14px)';
    });
    document.addEventListener('pointerleave',function(){document.querySelectorAll('.fx-tilt').forEach(function(n){n.style.transform=''})});
  }
})();
