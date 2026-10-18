export function createCombatVisuals(arena,target){
  const canvas=document.createElement('canvas');canvas.className='combat-pixel-effects';canvas.setAttribute('aria-hidden','true');arena.append(canvas);const g=canvas.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let combat=null,active=false,frame=0,fragments=[],last=0;
  function bounds(){const a=arena.getBoundingClientRect(),b=(target.querySelector('img')||target).getBoundingClientRect(),label=target.parentElement?.querySelector('.monster-name-box')?.getBoundingClientRect();return{x:b.left-a.left+b.width/2,y:b.top-a.top+b.height*.5,w:Math.min(150,b.width*.8),h:Math.min(160,b.height*.8),spriteWidth:b.width,spriteHeight:b.height,labelTop:label?label.top-a.top:Infinity};}
  function shieldRing(b,width,height,layers){
    const left=Math.max(5,Math.round(b.x-b.spriteWidth/2-10)),right=Math.min(width-5,Math.round(b.x+b.spriteWidth/2+10));
    const top=Math.max(5,Math.round(b.y-b.spriteHeight/2-10)),bottom=Math.min(height-5,Math.round(b.labelTop-7),Math.round(b.y+b.spriteHeight/2+10));
    function outline(inset,color,weight){
      const l=left+inset,r=right-inset,t=top+inset,d=bottom-inset,c=12,s=6;
      g.beginPath();g.moveTo(l+c,t);g.lineTo(r-c,t);g.lineTo(r-c,t+s);g.lineTo(r-s,t+s);g.lineTo(r-s,t+c);g.lineTo(r,t+c);g.lineTo(r,d-c);g.lineTo(r-s,d-c);g.lineTo(r-s,d-s);g.lineTo(r-c,d-s);g.lineTo(r-c,d);g.lineTo(l+c,d);g.lineTo(l+c,d-s);g.lineTo(l+s,d-s);g.lineTo(l+s,d-c);g.lineTo(l,d-c);g.lineTo(l,t+c);g.lineTo(l+s,t+c);g.lineTo(l+s,t+s);g.lineTo(l+c,t+s);g.closePath();
      g.strokeStyle=color;g.lineWidth=weight;g.lineJoin='miter';g.stroke();
    }
    // Hollow outlines stay outside the sprite. Never paint a panel over the creature.
    outline(0,'#172b35',7);outline(0,layers===2?'#e4c581':'#9ed9df',3);
    if(layers===2)outline(5,'#649da8',2);
    g.fillStyle=layers===2?'#f6dfa7':'#c4f0ef';for(const px of [left,right])g.fillRect(px-2,Math.round((top+bottom)/2)-3,5,6);
  }
  function loop(now){
    frame=0;const width=Math.round(arena.clientWidth),height=Math.round(arena.clientHeight);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}g.clearRect(0,0,width,height);g.imageSmoothingEnabled=false;const dt=last?Math.min(.04,(now-last)/1000):0;last=now;
    const b=bounds(),x=Math.round(b.x),y=Math.round(b.y),half=Math.round(b.w/2);
    if(active&&combat?.barrier){
      if(combat.kind==='vines'){
        for(let layer=0;layer<combat.barrier;layer++)for(let n=0;n<16;n++){const px=Math.round(x-half+n*b.w/16),py=Math.round(y+(layer?1:-1)*(n-8)*4);g.fillStyle='#142e21';g.fillRect(px-2,py-2,12,11);g.fillStyle=layer?'#6b9b55':'#94b86c';g.fillRect(px,py,8,7);if(n%3===0){g.fillStyle='#b8cb87';g.fillRect(px-3,py-6,8,4);}}
      }else{
        shieldRing(b,width,height,combat.barrier);
      }
    }
    if(active&&combat?.intent==='dive'){g.fillStyle='#f4cb76';const bounce=motion.matches?0:Math.round(Math.sin(now/200)*3);g.fillRect(x-3,y-b.h*.7-22+bounce,6,13);g.fillRect(x-8,y-b.h*.7-10+bounce,16,4);g.fillRect(x-4,y-b.h*.7-6+bounce,8,4);}
    if(active&&combat?.intent==='rune'){g.fillStyle='#a8dbdf';g.fillRect(x-22,y-b.h*.65-8,12,12);g.clearRect(x-19,y-b.h*.65-5,6,6);g.fillStyle='#ead293';g.fillRect(x+12,y-b.h*.65-8,12,12);g.clearRect(x+15,y-b.h*.65-5,6,6);}
    fragments=fragments.filter(f=>now-f.at<650);if(!motion.matches)for(const f of fragments){const p=(now-f.at)/650;g.globalAlpha=1-p;g.fillStyle=f.color;g.fillRect(Math.round(f.x+f.dx*p),Math.round(f.y-30*p+55*p*p),5,5);}g.globalAlpha=1;
    if(active||fragments.length)frame=requestAnimationFrame(loop);
  }
  window.addEventListener('pagehide',()=>{active=false;if(frame)cancelAnimationFrame(frame);});
  return {update({combat:next,status}){
    if(combat&&next&&next.barrier<combat.barrier){const b=bounds();for(let n=0;n<14;n++)fragments.push({at:performance.now(),x:b.x+(n%7-3)*12,y:b.y+(n%3-1)*20,dx:(n%2?1:-1)*(25+n*4),color:combat.kind==='vines'?'#9cbb70':'#d6bb7f'});}
    combat=next;active=!!next&&status==='ACTIVE';target.dataset.barrier=String(next?.barrier||0);target.dataset.intent=next?.intent||'';if(!frame){last=0;frame=requestAnimationFrame(loop);}
  },state(){return {kind:combat?.kind||null,barrier:combat?.barrier||0,fragments:fragments.length,intent:combat?.intent||null};}};
}
