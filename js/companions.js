import {drawGroundedSprite} from './pixel-world.js?v=20261017-particles1';

export function companionDestination(playerX,routeX,width,leading,playerFacing=1) {
  const direction=Math.sign(routeX-playerX)||1;
  return Math.max(40,Math.min(width-40,leading?playerX+direction*Math.min(110,Math.abs(routeX-playerX)):playerX-(playerFacing<0?-80:80)));
}

export function createCompanion(catalog) {
  const images=new Map(),sheets=new Map(),frames=new Map();
  let x=null,identity='',leading=false,facing=1,moving=false,phase=0,lastPlayerX=null,playerDirection=1,equippedId='owl';
  for(const [id,item] of Object.entries(catalog))if(item.kind==='companion'){
    const image=new Image();image.src=item.sprite;images.set(id,image);
    if(item.animation?.sheet){const sheet=new Image();sheet.src=item.animation.sheet;sheets.set(id,sheet);}
  }
  function visual() {
    const animation=catalog[equippedId]?.animation||{};
    const airborne=animation.motion==='fly';
    const frame=(moving?4:0)+Math.floor(phase*(airborne?8:moving?9:2))%4;
    const altitude=airborne?(animation.hover||72)+Math.round(Math.sin(phase*3.5)*4):0;
    return {frame,airborne,altitude,motion:airborne?(moving?'fly':'hover'):moving?(animation.motion==='hop'?'hop':'walk'):'idle'};
  }
  function animationFrames(id) {
    if(frames.has(id))return frames.get(id);
    const sheet=sheets.get(id);if(!sheet?.complete||sheet.naturalWidth!==256||sheet.naturalHeight!==128)return null;
    const result=Array.from({length:8},(_,i)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
      const context=canvas.getContext('2d');context.imageSmoothingEnabled=false;
      context.drawImage(sheet,i%4*64,Math.floor(i/4)*64,64,64,0,0,64,64);return canvas;
    });
    frames.set(id,result);return result;
  }
  return {
    toggle(){leading=!leading;return leading;},
    reset(){x=null;identity='';lastPlayerX=null;moving=false;phase=0;},
    update(dt,{playerX,playerFacing,routeX,width,realm,inside,equipped,camera=0,safeScreenLeft=0}) {
      const key=realm+':'+inside+':'+equipped;
      if(playerFacing===1||playerFacing===-1)playerDirection=playerFacing;
      else if(lastPlayerX!==null&&Math.abs(playerX-lastPlayerX)>.1)playerDirection=Math.sign(playerX-lastPlayerX);
      lastPlayerX=playerX;equippedId=equipped;
      const target=Math.min(width-40,Math.max(companionDestination(playerX,routeX,width,leading,playerDirection),camera+safeScreenLeft));
      const previous=x;
      if(identity!==key||x===null||Math.abs(x-playerX)>360){identity=key;x=target;phase=0;moving=false;}
      else {x+=(target-x)*Math.min(1,Math.max(0,dt)*5);moving=Math.abs(x-previous)>.05;}
      // Followers look at their owner; guides look along the route they are leading.
      const lookAt=leading?routeX:playerX;
      if(Math.abs(lookAt-x)>3)facing=Math.sign(lookAt-x);
      phase+=Math.max(0,dt);
    },
    draw(ctx,{camera,ground,equipped,playerX,routeX}) {
      const image=images.get(equipped);if(!image||x===null)return;
      const screen=Math.round(x-camera),pose=visual(),animation=animationFrames(equipped);
      if(pose.airborne){ctx.save();ctx.globalAlpha=.24;ctx.fillStyle='#101b24';ctx.fillRect(screen-15,ground-3,30,3);ctx.fillRect(screen-10,ground-5,20,2);ctx.restore();}
      ctx.save();ctx.imageSmoothingEnabled=false;
      if(facing<0){ctx.translate(screen*2,0);ctx.scale(-1,1);}
      if(animation){
        // Fixed frame anchors prevent flapping wings and lifted paws from shifting the body.
        ctx.drawImage(animation[pose.frame],screen-32,Math.round(ground-(pose.airborne?pose.altitude+32:61)),64,64);
      }else drawGroundedSprite(ctx,image,screen,Math.round(ground-(pose.airborne?pose.altitude-28:0)),64);
      ctx.restore();
      if(leading&&Math.abs(routeX-playerX)>110){
        const arrowY=Math.round(ground-(pose.airborne?pose.altitude+47:82)),direction=Math.sign(routeX-playerX);
        ctx.fillStyle='#f6d88c';ctx.fillRect(screen-3,arrowY,6,10);ctx.fillRect(screen+(direction<0?-9:3),arrowY+4,6,4);
      }
    },
    state(equipped){return {equipped,x:x===null?null:Math.round(x),leading,facing:facing<0?'left':'right',...visual()};}
  };
}
