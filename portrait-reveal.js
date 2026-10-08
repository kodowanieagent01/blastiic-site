(()=>{
  const hero=document.querySelector('#blastiic-mono .opening');
  const portrait=hero?.querySelector('.portrait');
  if(!hero||!portrait)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function reveal(){if(!reduced.matches)hero.classList.add('reveal-playing')}
  if(portrait.complete&&portrait.naturalWidth)reveal();
  else portrait.addEventListener('load',reveal,{once:true});
  hero.addEventListener('animationend',event=>{
    if(event.animationName==='portrait-light-pass')hero.classList.remove('reveal-playing');
  });
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  let current=47,target=47,frame=0;
  function settle(){
    current+=(target-current)*.075;
    hero.style.setProperty('--portrait-light',current.toFixed(3)+'%');
    if(Math.abs(target-current)>.015)frame=requestAnimationFrame(settle);
    else frame=0;
  }
  function aim(value){target=value;if(!frame)frame=requestAnimationFrame(settle)}
  hero.addEventListener('pointermove',event=>{
    if(reduced.matches||!fine.matches||hero.classList.contains('reveal-playing'))return;
    const bounds=hero.getBoundingClientRect();
    aim(44+Math.min(1,Math.max(0,(event.clientX-bounds.left)/bounds.width))*6);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>aim(47),{passive:true});
  reduced.addEventListener('change',()=>{
    hero.classList.remove('reveal-playing');
    if(frame)cancelAnimationFrame(frame);
    frame=0;current=target=47;hero.style.setProperty('--portrait-light','47%');
  });
})();
