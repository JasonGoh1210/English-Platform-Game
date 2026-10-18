// Native pixel decorations are grounded in the village, never extra HUD panels.
export function drawVillageCelebration(ctx,{camera,ground,time,ending,reducedMotion=false}){
  const crate=2220-camera;ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#573a27';ctx.fillRect(Math.round(crate-23),ground-31,46,29);ctx.fillStyle='#ba8a50';ctx.fillRect(Math.round(crate-24),ground-34,48,7);ctx.fillRect(Math.round(crate-18),ground-28,5,24);ctx.fillRect(Math.round(crate+13),ground-28,5,24);ctx.fillStyle='#e5c690';ctx.fillRect(Math.round(crate-4),ground-25,8,9);
  if(!ending){ctx.restore();return;}
  const palette=['#d6b377','#98c5b3','#bbaccf','#dea08a'];
  for(const [left,right] of [[480,720],[720,950],[980,1220],[2220,2480]]){
    const y=ground-195;ctx.fillStyle='#71614e';for(let x=left;x<=right;x+=6){const sag=Math.round(Math.sin((x-left)/(right-left)*Math.PI)*14);ctx.fillRect(Math.round(x-camera),y+sag,6,2);}
    for(let x=left+18,n=0;x<right-8;x+=32,n++){const sy=y+Math.round(Math.sin((x-left)/(right-left)*Math.PI)*14);ctx.fillStyle=palette[n%4];const sx=Math.round(x-camera);ctx.fillRect(sx,sy+2,20,9);ctx.fillRect(sx+3,sy+11,14,6);ctx.fillRect(sx+7,sy+17,6,5);}
  }
  for(const wx of [520,760,1000,1210,2190,2520]){const x=Math.round(wx-camera);ctx.fillStyle='#6d5438';ctx.fillRect(x-3,ground-104,6,102);ctx.fillRect(x-9,ground-104,18,5);ctx.fillStyle='#efcf80';ctx.fillRect(x-10,ground-96,20,26);ctx.fillStyle='#fff0af';ctx.fillRect(x-5,ground-92,10,18);ctx.fillStyle='#8c6c41';ctx.fillRect(x-10,ground-73,20,4);}
  if(!reducedMotion)for(let n=0;n<20;n++){const wx=460+(n*131)%2040,offset=(time*13+n*21)%210;ctx.fillStyle=palette[n%4];ctx.fillRect(Math.round(wx-camera+Math.sin(time*.6+n)*18),Math.round(ground-230+offset),3,4);}
  ctx.restore();
}
