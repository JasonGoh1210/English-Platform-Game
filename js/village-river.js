// The bridge deck shares the normal walking plane. The river replaces the soil
// below it, so characters cross the timber rather than appearing over dry land.
export function drawVillageCrossing(ctx,{x,ground,height,time=0,width=440}) {
  x=Math.round(x);ground=Math.round(ground);
  const left=x-width/2,right=x+width/2,bankLeft=left+24,bankRight=right-24;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#173b4b';ctx.fillRect(bankLeft,ground-2,bankRight-bankLeft,height-ground+2);
  ctx.fillStyle='#24586b';ctx.fillRect(bankLeft+14,ground+16,bankRight-bankLeft-28,height-ground);
  ctx.fillStyle='#2b6575';ctx.fillRect(x-72,ground+24,144,height-ground);
  for(let y=ground+30;y<height+32;y+=40) {
    const phase=Math.floor(time*12)%40;
    for(let lane=0;lane<4;lane++) {
      const wx=bankLeft+28+lane*88+(Math.floor(y/40)%2)*12;
      ctx.fillStyle=lane%2?'#468a96':'#397a8b';ctx.fillRect(wx,y+phase,24,2);
      ctx.fillStyle='#5998a0';ctx.fillRect(wx+8,y+phase+6,8,2);
    }
  }
  for(const [edge,direction] of [[bankLeft,-1],[bankRight,1]]) {
    ctx.fillStyle='#3e514d';ctx.fillRect(edge+(direction<0?-12:0),ground,12,height-ground);
    for(let y=ground+10,index=0;y<height;y+=32,index++) {
      const rockX=edge+(direction<0?-22:0)+(index%2)*direction*4;
      ctx.fillStyle='#53655d';ctx.fillRect(rockX,y,22,24);
      ctx.fillStyle='#839280';ctx.fillRect(rockX+2,y,16,4);
      ctx.fillStyle='#344b49';ctx.fillRect(rockX+4,y+20,18,4);
    }
  }
  // Back rail, posts, deck and supports are deliberately pixel-aligned rectangles.
  ctx.fillStyle='#4c372d';ctx.fillRect(left,ground-52,width,10);
  ctx.fillStyle='#ca9b62';ctx.fillRect(left,ground-54,width,4);
  ctx.fillStyle='#77543c';ctx.fillRect(left,ground-30,width,6);
  for(let px=left+8;px<=right-8;px+=84) {
    ctx.fillStyle='#4a352c';ctx.fillRect(px,ground-64,12,96);
    ctx.fillStyle='#ac8050';ctx.fillRect(px+2,ground-60,4,90);
    ctx.fillStyle='#d0a775';ctx.fillRect(px-4,ground-66,20,6);
  }
  ctx.fillStyle='#392e28';ctx.fillRect(left-10,ground,width+20,22);
  for(let px=left-8,index=0;px<right+8;px+=22,index++) {
    ctx.fillStyle=index%2?'#a57c51':'#bc905d';ctx.fillRect(px,ground,20,12);
    ctx.fillStyle='#dfb77e';ctx.fillRect(px,ground,20,3);
    ctx.fillStyle='#624832';ctx.fillRect(px+8,ground+7,4,2);
  }
  ctx.fillStyle='#6d4a33';ctx.fillRect(left-10,ground+14,width+20,8);
  ctx.fillStyle='#bb8c55';ctx.fillRect(left-10,ground+14,width+20,3);
  for(const end of [left+10,right-10]) {
    ctx.fillStyle='#423b32';ctx.fillRect(end-6,ground-84,12,16);
    ctx.fillStyle='#e8b968';ctx.fillRect(end-4,ground-82,8,10);
    ctx.fillStyle='#ffe0a0';ctx.fillRect(end-2,ground-80,4,6);
  }
  ctx.restore();
}
