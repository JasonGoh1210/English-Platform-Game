import {drawGroundedSprite} from './pixel-world.js?v=20261014-companions1';

export function companionDestination(playerX,routeX,width,leading) {
  const direction=Math.sign(routeX-playerX)||1;
  return Math.max(40,Math.min(width-40,leading?playerX+direction*Math.min(110,Math.abs(routeX-playerX)):playerX-80));
}
export function createCompanion(catalog) {
  const images=new Map();let x=null,identity='',leading=false;
  for(const [id,item] of Object.entries(catalog))if(item.kind==='companion'){const image=new Image();image.src=item.sprite;images.set(id,image);}
  return {
    toggle(){leading=!leading;return leading;},
    reset(){x=null;identity='';},
    update(dt,{playerX,routeX,width,realm,inside,equipped,camera=0,safeScreenLeft=0}) {
      const key=realm+':'+inside+':'+equipped;
      // Short-screen touch controls cover the lower left; keep the helper beside them.
      const target=Math.min(width-40,Math.max(companionDestination(playerX,routeX,width,leading),camera+safeScreenLeft));
      if(identity!==key||x===null||Math.abs(x-playerX)>360){identity=key;x=target;}
      else x+=(target-x)*Math.min(1,dt*5);
    },
    draw(ctx,{camera,ground,equipped,playerX,routeX,time}) {
      const image=images.get(equipped);if(!image || x===null)return;
      const screen=Math.round(x-camera),floating=equipped==='wisp'?18:0;
      ctx.save();
      if(routeX<x){ctx.translate(screen*2,0);ctx.scale(-1,1);}
      drawGroundedSprite(ctx,image,screen,Math.round(ground-floating),64);ctx.restore();
      if(leading && Math.abs(routeX-playerX)>110){ctx.fillStyle='#f6d88c';const direction=Math.sign(routeX-playerX);ctx.fillRect(screen-3,ground-82,6,10);ctx.fillRect(screen+(direction<0?-9:3),ground-78,6,4);}
    },
    state(equipped){return {equipped,x:x===null?null:Math.round(x),leading};}
  };
}
