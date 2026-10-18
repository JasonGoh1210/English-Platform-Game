// Pixel-only battle theatre. It never grades answers or changes player HP/rewards.
export function createBossPresentation({screen,stage,monster}){
  const canvas=document.createElement('canvas');canvas.className='boss-pixel-theatre';canvas.setAttribute('aria-hidden','true');stage.append(canvas);const ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let phase=1,active=false,death=null,frame=0,hitAt=0;
  function resize(){const w=Math.round(stage.clientWidth),h=Math.round(stage.clientHeight);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
  function finishDeath(ok){const pending=death;death=null;if(pending)pending.resolve(ok);}
  function draw(now){
    frame=0;if(!active)return;resize();const w=canvas.width,h=canvas.height,t=now/1000;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=false;
    const color=phase===1?'#80d8d3':phase===2?'#bd94d8':'#f0ad72';
    ctx.globalAlpha=phase===3?.13:.07;ctx.fillStyle=phase===1?'#2b5573':phase===2?'#62406c':'#98412d';ctx.fillRect(0,0,w,h);ctx.globalAlpha=1;
    for(let n=0;n<Math.min(36,12+phase*7);n++){
      const px=Math.round((n*97+31)%Math.max(1,w)+(reduced.matches?0:Math.sin(t*.7+n)*9)),py=Math.round(reduced.matches?(n*37)%Math.max(1,h*.7):h*.79-(t*(8+phase*5)+n*29)%(h*.73));
      ctx.globalAlpha=.3+(n%3)*.15;ctx.fillStyle=color;ctx.fillRect(px,py,n%3?3:5,3);if(phase===3&&n%3===0)ctx.fillRect(px+1,py-5,3,5);
    }ctx.globalAlpha=1;
    if(phase>=2){ctx.fillStyle=phase===2?'#a67bc4':'#cc7c55';ctx.globalAlpha=.22;for(let n=0;n<3;n++){const x=Math.round(w*(.23+n*.28));for(let y=8;y<h*.52;y+=24)ctx.fillRect(x+(n%2?8:-8)*(Math.floor(y/24)%2),y,4,18);}ctx.globalAlpha=1;}
    if(hitAt&&now-hitAt<300&&!reduced.matches){ctx.globalAlpha=(1-(now-hitAt)/300)*.15;ctx.fillStyle='#f9e6b5';ctx.fillRect(0,0,w,h*.79);ctx.globalAlpha=1;}
    if(death){
      const d=death,p=Math.min(1,(now-d.at)/(reduced.matches?850:1850));ctx.globalAlpha=1;
      const image=d.image;
      if(reduced.matches){ctx.globalAlpha=1-p;ctx.drawImage(image,d.x,d.y,d.w,d.h);ctx.globalAlpha=1;}
      else for(let sy=0;sy<image.naturalHeight;sy+=8)for(let sx=0;sx<image.naturalWidth;sx+=8){
        const delay=((sx*3+sy*7)%41)/100,life=Math.max(0,(p-delay)/(1-delay)),scale=Math.max(0,1-life*1.5);if(!scale)continue;
        const sw=Math.min(8,image.naturalWidth-sx),sh=Math.min(8,image.naturalHeight-sy),dw=sw*d.w/image.naturalWidth,dh=sh*d.h/image.naturalHeight;
        const dx=Math.round(d.x+sx*d.w/image.naturalWidth+Math.sin(sx+sy)*life*70),dy=Math.round(d.y+sy*d.h/image.naturalHeight-life*(50+sx%31));ctx.globalAlpha=Math.max(0,1-life);ctx.drawImage(image,sx,sy,sw,sh,dx,dy,Math.ceil(dw*scale),Math.ceil(dh*scale));
      }
      ctx.globalAlpha=1;ctx.fillStyle='#f4d793';for(let n=0;n<20;n++){const x=Math.round(d.x+d.w/2+Math.sin(n*2.4)*p*115),y=Math.round(d.y+d.h*.45+Math.cos(n*2.4)*p*85);ctx.globalAlpha=1-p;ctx.fillRect(x,y,4,4);}ctx.globalAlpha=1;
      if(p>=1){screen.classList.add('boss-fallen');finishDeath(true);}
    }
    frame=requestAnimationFrame(draw);
  }
  return {
    setPhase(next){phase=Math.max(1,Math.min(3,next));screen.dataset.phase=String(phase);screen.classList.toggle('boss-awake',phase===1);screen.classList.toggle('boss-enraged',phase===2);screen.classList.toggle('boss-final',phase===3);active=true;if(!frame)frame=requestAnimationFrame(draw);},
    hit(){hitAt=performance.now();},
    die(){if(death)return Promise.resolve(false);const image=monster.querySelector('img'),box=image.getBoundingClientRect(),stageBox=stage.getBoundingClientRect();if(!image.naturalWidth)return Promise.resolve(true);
      const scale=Math.min(box.width/image.naturalWidth,box.height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
      const promise=new Promise(resolve=>{death={image,at:performance.now(),x:box.left-stageBox.left+(box.width-w)/2,y:box.top-stageBox.top+(box.height-h)/2,w,h,resolve};});screen.classList.add('boss-dying');return promise;},
    reset(){finishDeath(false);screen.classList.remove('boss-dying','boss-fallen');hitAt=0;},
    stop(){active=false;if(frame)cancelAnimationFrame(frame);frame=0;ctx.clearRect(0,0,canvas.width,canvas.height);finishDeath(false);},
    state(){return {phase,active,dying:!!death,fallen:screen.classList.contains('boss-fallen'),reducedMotion:reduced.matches};}
  };
}
