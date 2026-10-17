// Small, bounded cosmetic emitters shared by the map and shop previews.
// Integer canvas blocks keep every effect crisp without external textures.
const patterns=new Set(['petal','star','firefly','frost','ember','rainbow']);
const rainbow=['#ff93b7','#ffd57d','#b5ef91','#7de1ed','#bcadff'];

export function createParticleEffect() {
  let particles=[],identity='',lastX=null,carry=0,clock=0,seed=47,current='none';
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  function reset(){particles=[];lastX=null;carry=0;clock=0;}
  function update(dt,{x,ground,effect='none',realm='',inside=false,active=true,reducedMotion=false}) {
    const key=`${effect}:${realm}:${inside}`;
    if(key!==identity||!active||reducedMotion||!patterns.has(effect)||!Number.isFinite(x)||!Number.isFinite(ground)) {
      reset();identity=key;current=patterns.has(effect)?effect:'none';
      if(!active||reducedMotion||!patterns.has(effect)||!Number.isFinite(x)||!Number.isFinite(ground))return;
    }
    dt=Math.max(0,Math.min(.1,Number(dt)||0));clock+=dt;
    const delta=lastX===null?0:x-lastX;
    if(Math.abs(delta)>160)reset();
    const moving=Math.abs(delta)>.1,direction=delta<0?-1:1;lastX=x;
    particles=particles.filter(p=>(p.age+=dt)<p.life);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;}
    carry+=dt*(moving?22:9);
    while(carry>=1&&particles.length<48){
      carry--;const r=random(),s=random(),life=effect==='firefly'?2.1:1.1+r*.7;
      let px=x+(s-.5)*40,py=-12-r*92,vx=(s-.5)*14,vy=-12;
      if(effect==='petal'){py=-105-r*34;vx=-direction*12;vy=32+r*16;}
      if(effect==='frost'){px=x+(s-.5)*38;py=-3-r*12;vx=0;vy=-4;}
      if(effect==='ember'){py=-5-r*35;vx=(s-.5)*24;vy=-35-r*25;}
      if(effect==='rainbow'){px=x-direction*(15+r*13);py=-8-r*65;vx=-direction*12;vy=-8;}
      if(effect==='firefly'){py=-25-r*83;vy=-5;vx=(s-.5)*10;}
      particles.push({x:px,y:py,vx,vy,age:0,life,phase:r*Math.PI*2,color:Math.floor(random()*5)});
    }
  }
  function draw(ctx,{camera=0,ground,scale=1}={}) {
    if(!Number.isFinite(ground))return;
    ctx.save();ctx.imageSmoothingEnabled=false;
    for(const p of particles){
      const progress=p.age/p.life;
      const sway=current==='petal'?Math.sin(p.phase+p.age*5)*8:current==='firefly'?Math.sin(p.phase+clock*4)*9:0;
      const x=Math.round((p.x-camera+sway)/scale)*scale,y=Math.round((ground+p.y)/scale)*scale;
      ctx.globalAlpha=progress>.7?.5:1;
      const block=(dx,dy,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x+dx*scale,y+dy*scale,w*scale,h*scale);};
      if(current==='petal'){block(-2,-2,5,3,'#ff9fc5');block(-1,1,3,2,'#ffdaea');}
      else if(current==='star'){block(-1,-4,2,9,'#ffe8a2');block(-4,-1,8,2,'#ffe8a2');block(-1,-1,2,2,'#fffbea');}
      else if(current==='firefly'){block(-3,-3,6,6,'#396b52');block(-1,-1,3,3,'#d5ff8c');}
      else if(current==='frost'){block(-1,-4,2,8,'#8de3f5');block(-4,-1,8,2,'#8de3f5');block(-2,-2,4,4,'#e6fcff');}
      else if(current==='ember'){block(-2,-1,4,4,'#f27e53');block(-1,-4,2,5,'#ffd883');}
      else if(current==='rainbow'){block(-2,-2,4,4,rainbow[p.color]);block(2,0,2,2,'#fff2db');}
    }
    ctx.restore();
  }
  return {update,draw,reset,state:()=>({pattern:current,count:particles.length,movingTrail:particles.length>0})};
}

// Stop offscreen previews from doing animation work, and replace their emitters
// when a translated/updated catalog is rendered.
export function createEffectPreviews() {
  let previews=[],frame=0,last=0;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const hero=new Image();hero.src='/FYP/assets/player/png_frames/Player_Stand.png';
  function paint(entry,dt){
    const {canvas,pattern,emitter}=entry,ctx=canvas.getContext('2d');
    if(!motion.matches||!entry.staticReady)emitter.update(dt,{x:64,ground:112,effect:pattern});
    ctx.clearRect(0,0,128,128);ctx.fillStyle='#10232f';ctx.fillRect(0,0,128,128);
    ctx.fillStyle='#536c72';ctx.fillRect(22,112,84,3);ctx.fillStyle='#213b46';ctx.fillRect(22,115,84,9);
    if(hero.complete&&hero.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(hero,24,24,80,88);}
    emitter.draw(ctx,{ground:112});
    if(pattern==='none'){ctx.fillStyle='#adc0c5';ctx.fillRect(10,10,10,2);}
  }
  function loop(now){const dt=last?Math.min(.1,(now-last)/1000):.016;last=now;
    if(!document.hidden)for(const entry of previews){const r=entry.canvas.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)paint(entry,dt);}
    frame=requestAnimationFrame(loop);
  }
  return {set(entries){cancelAnimationFrame(frame);last=0;previews=entries.map(entry=>({...entry,emitter:createParticleEffect()}));
    for(const entry of previews){for(let n=0;n<22;n++)paint(entry,.05);entry.staticReady=true;}if(previews.length)frame=requestAnimationFrame(loop);
  }};
}
