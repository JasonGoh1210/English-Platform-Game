// Visual-only renderer. World positions, encounters, quests and save data stay in rpg.js.
export const PIXEL_TILE_SIZE = 32;
export const pixelArtPaths = {
  npcs: { mira:"/FYP/images/npc/npc_mira_64.png", tala:"/FYP/images/npc/npc_tala_64.png", kai:"/FYP/images/npc/npc_kai_64.png" },
  monsters: { "bat-01":"/FYP/images/world/monsters/confusion-bat-64.png", "road-guardian-01":"/FYP/images/world/monsters/road-guardian-64.png",
    "guardian-01":"/FYP/images/world/monsters/grammar-guardian-64.png", "cave-wraith-01":"/FYP/images/world/monsters/cave-wraith-64.png" },
  portal:"/FYP/images/world/pixel/realm_portal_64.png"
};
const palettes = {
  maple: { sky:"#3a659c",grass:"#718663",edge:"#425d4d",soil:"#303b34",line:"#3d4940" },
  forest: { sky:"#1e5262",grass:"#526f57",edge:"#294e43",soil:"#223831",line:"#2c453c" },
  camp: { sky:"#c8897b",grass:"#a08060",edge:"#755951",soil:"#3b3438",line:"#4b4140" },
  ruins: { sky:"#373d6a",grass:"#748295",edge:"#455166",soil:"#272f41",line:"#343e50" }
};
export function drawPixelBackdrop(ctx, image, {width,height,ground,realm,camera=0}) {
  const p=palettes[realm] || palettes.maple;
  ctx.fillStyle=p.sky;ctx.fillRect(0,0,width,height);
  if(image?.complete && image.naturalWidth) {
    const scale=Math.max(1,Math.ceil(Math.max(width/image.naturalWidth,ground/image.naturalHeight)));
    const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    const travel=Math.min((w-width)/2,Math.max(0,camera*.06));
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(image,Math.round((width-w)/2-travel),Math.round(ground-h),w,h);
  }
}
export function drawPixelGround(ctx,{width,height,ground,realm,camera=0}) {
  const p=palettes[realm] || palettes.ruins;
  ctx.fillStyle=p.soil;ctx.fillRect(0,ground,width,height-ground);
  const offset=-Math.floor(camera)%PIXEL_TILE_SIZE;
  for(let y=0;y<Math.min(height-ground,128);y+=32)for(let x=offset-32;x<width+32;x+=32){
    ctx.fillStyle=p.line;ctx.fillRect(x+1,ground+y+1,30,1);
    if((Math.floor((x+camera)/32)+y/32)%3===0)ctx.fillRect(x+22,ground+y+16,4,2);
  }
  ctx.fillStyle=p.edge;ctx.fillRect(0,ground,width,8);ctx.fillStyle=p.grass;ctx.fillRect(0,ground,width,4);
}

const tiles=new Map();
function landmarkTile(type,variant) {
  const key=type+":"+variant;if(tiles.has(key))return tiles.get(key);
  const c=document.createElement("canvas");c.width=32;c.height=32;const ctx=c.getContext("2d");
  const rect=(color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
  if(type==="cave" || type==="typingCave"){
    c.width=c.height=64;
    const spelling=type==="typingCave",stones=spelling?["#554965","#73617c","#8c7896"]:["#405c70","#59788b","#7596a5"];
    for(let y=7;y<63;y++)for(let x=5;x<59;x++){
      const outer=y>=33 || ((x-32)/27)**2+((y-34)/28)**2<=1;
      if(!outer)continue;
      const row=Math.floor(y/8),shift=row%2*7,col=Math.floor((x+shift)/14);
      const edge=y%8===0 || (x+shift)%14===0;
      rect(edge?"#263647":stones[(row+col)%3],x,y,1,1);
    }
    rect("#101c28",18,31,28,32);
    for(let y=18;y<32;y++){const half=Math.floor(Math.sqrt(Math.max(0,14**2-(31-y)**2)));rect("#101c28",32-half,y,half*2,1);}
    rect("#263647",18,56,28,7);rect("#4a586c",13,61,38,3);rect("#718094",16,59,32,2);
    const rune=spelling?"#cbb0e7":"#85c8d4";
    rect(rune,30,9,4,5);rect(rune,27,11,10,1);
    for(const x of [10,51]){rect("#28343e",x,40,3,13);rect("#b89466",x,39,3,5);rect("#e2b46f",x-1,35,5,5);rect("#f7d895",x,33,3,5);}
    rect("#192b3a",20,32,2,23);rect("#192b3a",43,32,2,23);
    tiles.set(key,c);return c;
  }else if(type==="house"){
    const roof=variant==="elder"?"#4a695b":variant==="shop"?"#6a577c":"#81544e";
    rect("#463a36",4,13,24,18);rect("#b8946e",6,15,20,15);rect("#dcc498",7,15,18,2);
    for(let i=0;i<7;i++)rect(roof,2+i*2,12-i,28-i*4,2);
    rect("#433734",7,3,4,8);rect("#393637",13,21,6,10);rect("#d8b474",14,22,1,8);
    for(const x of [8,22]){rect("#5c463c",x-1,20,5,6);rect("#efcd7d",x,21,3,3);}
    rect("#716a5d",3,30,26,2);
  }else if(type==="camp"){
    for(let y=0;y<20;y++)rect("#ad8965",15-Math.floor(y/2),10+y,2+Math.floor(y/2)*2,1);
    rect("#664c42",15,17,2,14);rect("#403831",13,22,6,10);
    rect("#493a34",2,29,7,2);rect("#e7a25b",4,25,3,4);rect("#f4cf83",5,23,1,5);
  }else if(type==="bridge"){
    rect("#61554b",1,24,30,5);for(const x of [2,11,20,29])rect("#907c62",x,17,2,12);
    rect("#af9776",1,19,30,2);rect("#3c474a",2,29,28,3);
  }else{
    rect("#49596b",7,8,18,24);rect("#8290a0",7,8,3,23);rect("#637487",5,5,22,4);
    for(const x of [5,13,21])rect("#718498",x,2,5,4);
    rect("#1e2b3c",13,22,6,10);rect("#96b6c5",14,12,4,6);
    if(type==="ruins"){ctx.clearRect(18,0,14,12);rect("#354456",19,13,5,7);}
  }
  tiles.set(key,c);return c;
}
export function drawPixelLandmark(ctx,type,x,ground,variant="") {
  const tile=landmarkTile(type,variant),scale=tile.width===64?2:type==="bridge"?6:4;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(tile,Math.round(x-tile.width*scale/2),Math.round(ground-tile.height*scale),tile.width*scale,tile.height*scale);
}
export function drawPixelCave(ctx,{width,height,ground,camera=0}) {
  ctx.fillStyle="#111c2a";ctx.fillRect(0,0,width,height);
  const offset=-Math.floor(camera*.15)%32;
  for(let y=0;y<ground;y+=32)for(let x=offset-32;x<width+32;x+=32){
    ctx.fillStyle=((Math.floor((x+camera*.15)/32)+y/32)%3===0)?"#1b2b3b":"#162432";
    ctx.fillRect(x+1,y+1,30,30);ctx.fillStyle="#253849";ctx.fillRect(x+4,y+4,20,2);
  }
  drawPixelGround(ctx,{width,height,ground,realm:"ruins",camera});
}
