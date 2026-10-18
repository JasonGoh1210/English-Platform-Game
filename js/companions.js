import {drawGroundedSprite} from './pixel-world.js?v=20261018-newbie1';

export function companionDestination(playerX,routeX,width,leading,playerFacing=1) {
  const direction=Math.sign(routeX-playerX)||1;
  return Math.max(40,Math.min(width-40,leading?playerX+direction*Math.min(110,Math.abs(routeX-playerX)):playerX-(playerFacing<0?-80:80)));
}

export function createCompanion(catalog) {
  const images=new Map(),sheets=new Map(),frames=new Map();
  let x=null,identity='',leading=false,facing=1,moving=false,phase=0,lastPlayerX=null,playerDirection=1,equippedId='owl';
  let curiosity=null,still=0,perching=false,petTime=0,orbiting=false,wagging=false;
  for(const [id,item] of Object.entries(catalog))if(item.kind==='companion'){
    const image=new Image();image.src=item.sprite;images.set(id,image);
    if(item.animation?.sheet){const sheet=new Image();sheet.src=item.animation.sheet;sheets.set(id,sheet);}
  }
  function visual() {
    const animation=catalog[equippedId]?.animation||{};
    const airborne=animation.motion==='fly';
    const frame=((moving||orbiting)?4:0)+Math.floor(phase*(airborne?8:moving?9:2))%4;
    const altitude=airborne?(perching?132:(animation.hover||72)+Math.round(Math.sin(phase*(orbiting?2.8:3.5))*(orbiting?22:4))):0;
    return {frame:perching||wagging?0:frame,airborne,altitude,motion:perching?'perch':wagging?'wag':orbiting?'orbit':airborne?(moving?'fly':'hover'):moving?(animation.motion==='hop'?'hop':'walk'):'idle',reaction:petTime>0?'greeting':curiosity?(equippedId==='fox'?'supplies':equippedId==='bat'?'echo':'curious'):null};
  }
  function animationFrames(id) {
    if(frames.has(id))return frames.get(id);
    const sheet=sheets.get(id);if(!sheet?.complete||sheet.naturalWidth!==256||sheet.naturalHeight!==128)return null;
    const result=Array.from({length:8},(_,i)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.imageSmoothingEnabled=false;
      context.drawImage(sheet,i%4*64,Math.floor(i/4)*64,64,64,0,0,64,64);return canvas;
    });
    frames.set(id,result);return result;
  }
  return {
    toggle(){leading=!leading;return leading;},
    interact(){petTime=3;return equippedId;},
    reset(){x=null;identity='';lastPlayerX=null;moving=false;phase=0;},
    update(dt,{playerX,playerFacing,routeX,width,realm,inside,equipped,camera=0,safeScreenLeft=0,interest=null}) {
      const key=realm+':'+inside+':'+equipped;
      const ownerMoving=lastPlayerX!==null&&Math.abs(playerX-lastPlayerX)>.1;
      if(playerFacing===1||playerFacing===-1)playerDirection=playerFacing;
      else if(lastPlayerX!==null&&Math.abs(playerX-lastPlayerX)>.1)playerDirection=Math.sign(playerX-lastPlayerX);
      lastPlayerX=playerX;equippedId=equipped;
      curiosity=interest;still=ownerMoving?0:still+Math.max(0,dt);petTime=Math.max(0,petTime-Math.max(0,dt));
      wagging=equipped==='fox'&&!leading&&!ownerMoving&&(petTime>0||interest?.kind==='supplies')&&still>.25;
      orbiting=equipped==='bat'&&!leading&&!ownerMoving&&interest?.kind==='cave'&&still>.2;
      perching=!leading&&!inside&&equipped==='owl'&&Math.abs(playerX-420)<100&&still>1.5;
      const destination=perching?386:orbiting?interest.x+Math.cos(phase*2.8)*36:companionDestination(playerX,routeX,width,leading,playerDirection);
      const target=Math.min(width-40,Math.max(destination,camera+safeScreenLeft));
      const previous=x;
      if(identity!==key||x===null||Math.abs(x-playerX)>360){identity=key;x=target;phase=0;moving=false;}
      else {x+=(target-x)*Math.min(1,Math.max(0,dt)*5);moving=Math.abs(x-previous)>.05;}
      // Followers look at their owner; guides look along the route they are leading.
      const lookAt=leading?routeX:playerX;
      if(Math.abs(lookAt-x)>3)facing=Math.sign(lookAt-x);
      phase+=Math.max(0,dt);
    },
    draw(ctx,{camera,ground,equipped,playerX,routeX,charm=null}) {
      const image=images.get(equipped);if(!image||x===null)return;
      const screen=Math.round(x-camera),pose=visual(),animation=animationFrames(equipped);
      if(pose.airborne){ctx.save();ctx.globalAlpha=.24;ctx.fillStyle='#101b24';ctx.fillRect(screen-15,ground-3,30,3);ctx.fillRect(screen-10,ground-5,20,2);ctx.restore();}
      ctx.save();ctx.imageSmoothingEnabled=false;
      if(facing<0){ctx.translate(screen*2,0);ctx.scale(-1,1);}
      const greeting=petTime>0&&!moving;
      let lift=0,scaleX=1,scaleY=1;
      if(greeting){
        const bounce=Math.abs(Math.sin(phase*(equipped==='bunny'?10:6)));
        if(['bunny','cat','penguin'].includes(equipped))lift=Math.round(bounce*(equipped==='bunny'?18:5));
        if(equipped==='slime'){scaleX=1+bounce*.14;scaleY=1-bounce*.18;}
        if(equipped==='turtle'||equipped==='owl')scaleY=1-bounce*.08;
        if(equipped==='dragon'||equipped==='wisp')lift=Math.round(bounce*11);
        ctx.translate(screen,ground);ctx.scale(scaleX,scaleY);ctx.translate(-screen,-ground-lift);
      }
      if(animation){
        // Fixed frame anchors prevent flapping wings and lifted paws from shifting the body.
        const y=Math.round(ground-(pose.airborne?pose.altitude+32:61));
        if(wagging){
          // Animate the native fox tail independently; its face and paws remain anchored.
          for(let col=0;col<4;col++){const dy=Math.round(Math.sin(phase*9)*(4-col));ctx.drawImage(animation[0],col*8,0,8,64,screen-32+col*8,y+dy,8,64);}
          ctx.drawImage(animation[0],32,0,32,64,screen,y,32,64);
        }else ctx.drawImage(animation[pose.frame],screen-32,y,64,64);
      }else drawGroundedSprite(ctx,image,screen,Math.round(ground-(pose.airborne?pose.altitude-28:0)),64);
      ctx.restore();
      if(charm){const cy=Math.round(ground-(pose.airborne?pose.altitude+8:38)-lift);ctx.fillStyle='#101b24';ctx.fillRect(screen+8,cy-1,10,10);ctx.fillStyle=charm;ctx.fillRect(screen+10,cy,6,7);ctx.fillRect(screen+8,cy+2,10,3);}
      if(greeting){const cy=Math.round(ground-(pose.airborne?pose.altitude+50:88)-lift);ctx.fillStyle=equipped==='wisp'?'#b0edce':'#edc49c';ctx.fillRect(screen-6,cy,4,4);ctx.fillRect(screen+2,cy,4,4);ctx.fillRect(screen-4,cy+4,8,4);ctx.fillRect(screen-2,cy+8,4,3);}
      if(leading&&Math.abs(routeX-playerX)>110){
        const arrowY=Math.round(ground-(pose.airborne?pose.altitude+47:82)),direction=Math.sign(routeX-playerX);
        ctx.fillStyle='#f6d88c';ctx.fillRect(screen-3,arrowY,6,10);ctx.fillRect(screen+(direction<0?-9:3),arrowY+4,6,4);
      }
      if(curiosity&&!leading){
        const y=Math.round(ground-(pose.airborne?pose.altitude+50:90));ctx.fillStyle='#f9dfa0';ctx.fillRect(screen-2,y,4,10);ctx.fillRect(screen-2,y+14,4,4);
      }
    },
    state(equipped){return {equipped,x:x===null?null:Math.round(x),leading,facing:facing<0?'left':'right',...visual()};}
  };
}
