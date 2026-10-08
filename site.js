(()=>{
 const isUpcoming=e=>e.status==='premiere'&&(!e.releaseAt||Date.now()<Date.parse(e.releaseAt));
 const root=document.getElementById('blastiic-mono'),menu=root.querySelector('.menu'),dialog=root.querySelector('.overlay'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function toggle(open){dialog.hidden=!open;menu.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';[...dialog.parentElement.children].filter(el=>el!==dialog).forEach(el=>el.inert=open);document.querySelector('.skip-link').inert=open;root.querySelector('main').inert=open;root.querySelector('.footer').inert=open;(open?dialog.querySelector('.close'):menu).focus()}
 menu.addEventListener('click',()=>toggle(true));dialog.querySelector('.close').addEventListener('click',()=>toggle(false));dialog.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>toggle(false)));
 document.addEventListener('keydown',e=>{if(dialog.hidden)return;if(e.key==='Escape')toggle(false);if(e.key==='Tab'){const items=[...dialog.querySelectorAll('a,button')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 document.getElementById('copyright-year').textContent=new Date().getFullYear();
 fetch('episodes.json?v=20261008').then(r=>{if(!r.ok)throw Error('archive');return r.json()}).then(episodes=>{
  const latest=episodes[0],picker=root.querySelector('.episode-picker');
  const buttonTemplate=picker.querySelector('button').cloneNode(true);picker.querySelectorAll('button').forEach(b=>b.remove());
  function select(e){root.querySelector('.transmission-title').textContent='SELECTS '+e.number;root.querySelector('.episode-watch').href='selects.html?episode='+e.number;document.getElementById('home-episode-status').textContent=isUpcoming(e)?'UPCOMING PREMIERE':'SELECTED TRANSMISSION';picker.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.episode===e.number)))}
  episodes.slice(0,3).forEach(e=>{const b=buttonTemplate.cloneNode(true);b.dataset.episode=e.number;b.textContent=e.number;b.addEventListener('click',()=>select(e));picker.insertBefore(b,picker.querySelector('a'))});
  document.getElementById('home-latest-title').textContent='SELECTS — '+latest.number;document.getElementById('home-latest-status').textContent=isUpcoming(latest)?'UPCOMING PREMIERE':'LATEST TRANSMISSION';root.querySelector('.latest-link').href='selects.html?episode='+latest.number;select(latest);
 }).catch(()=>{root.querySelectorAll('[data-episode]').forEach(b=>b.addEventListener('click',()=>{root.querySelector('.transmission-title').textContent='SELECTS '+b.dataset.episode;root.querySelector('.episode-watch').href='selects.html?episode='+b.dataset.episode;root.querySelectorAll('[data-episode]').forEach(p=>p.setAttribute('aria-pressed',String(p===b)))}))});
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){if(!reduced.matches)e.target.classList.add('enter-view');observer.unobserve(e.target)}}),{threshold:.08});root.querySelectorAll('.release-feature,.about-grid,.contact-layout').forEach(el=>observer.observe(el));
 async function globe(){
  if(!globalThis.d3||!globalThis.topojson)return;
  const res=await fetch('assets/land.json');if(!res.ok)throw Error('geography');const geo=await res.json(),land=topojson.feature(geo,geo.objects.land),stage=root.querySelector('.globe-stage'),svg=d3.select(root.querySelector('.world-globe'));
  const projection=d3.geoOrthographic().rotate([-20,-18]),path=d3.geoPath(projection),defs=svg.append('defs');
  const light=defs.append('radialGradient').attr('id','earth-light').attr('cx','32%').attr('cy','25%').attr('r','80%');[[0,'#282828'],[.6,'#101010'],[1,'#030303']].forEach(([o,c])=>light.append('stop').attr('offset',o).attr('stop-color',c));
  const sea=svg.append('path').attr('fill','url(#earth-light)').attr('stroke','#555').attr('stroke-width',.6),grid=svg.append('path').attr('fill','none').attr('stroke','#666').attr('stroke-width',.4).attr('opacity',.17),continents=svg.append('path').attr('fill','#777').attr('fill-opacity',.25).attr('stroke','#b8b8b8').attr('stroke-opacity',.58).attr('stroke-width',.55);
  const shade=defs.append('linearGradient').attr('id','earth-shadow');[[0,0],[.45,.05],[1,.94]].forEach(([o,a])=>shade.append('stop').attr('offset',o).attr('stop-color','#000').attr('stop-opacity',a));const shadow=svg.append('path').attr('fill','url(#earth-shadow)');
  const graticule=d3.geoGraticule10();let visible=false,dragging=false,paused=false,frame=0,last=0;
  function paint(){sea.attr('d',path({type:'Sphere'}));grid.attr('d',path(graticule));continents.attr('d',path(land));shadow.attr('d',path({type:'Sphere'}))}
  function size(){const w=stage.clientWidth,h=Math.round(w*(w<600?.88:.63));svg.attr('viewBox',`0 0 ${w} ${h}`).attr('height',h);projection.translate([w*.5,h*.46]).scale(Math.min(w*.41,h*.43));paint()}
  const pause=document.getElementById('globe-pause'),reset=document.getElementById('globe-reset');pause.hidden=reset.hidden=false;
  function tick(t){if(last){const r=projection.rotate();r[0]=(r[0]+Math.min(t-last,80)*.006)%360;projection.rotate(r);paint()}last=t;frame=requestAnimationFrame(tick)}
  function sync(){cancelAnimationFrame(frame);frame=0;last=0;if(visible&&!document.hidden&&!reduced.matches&&!paused&&!dragging)frame=requestAnimationFrame(tick);pause.textContent=paused||reduced.matches?'PLAY ROTATION':'PAUSE ROTATION';pause.setAttribute('aria-pressed',String(paused||reduced.matches))}
  pause.addEventListener('click',()=>{paused=!paused;sync();if(reduced.matches&&!paused){const r=projection.rotate();projection.rotate([r[0]+45,r[1]]);paint();pause.textContent='ROTATE 45°'}});
  reset.addEventListener('click',()=>{projection.rotate([-20,-18]);paint()});
  svg.call(d3.drag().filter(e=>e.type!=='touchstart'||e.touches.length===1).on('start',()=>{dragging=true;sync()}).on('drag',e=>{const r=projection.rotate();projection.rotate([r[0]+e.dx*.3,Math.max(-65,Math.min(65,r[1]-e.dy*.3))]);paint()}).on('end',()=>{dragging=false;sync()}));
  size();new ResizeObserver(size).observe(stage);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{threshold:.08}).observe(stage);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 }
 globe().catch(()=>{root.querySelector('.globe-note').textContent='WORLDWIDE SOUND';root.querySelector('.globe-stage').style.minHeight='200px'});
})();
