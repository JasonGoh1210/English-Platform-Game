// Visual-only renderer. World positions, encounters, quests and save data stay in rpg.js.
export const PIXEL_TILE_SIZE = 32;
const groundedBounds=new WeakMap();
export function spriteBounds(image) {
  if(!image || image.complete===false || !(image.naturalWidth||image.width))return null;
  if(groundedBounds.has(image))return groundedBounds.get(image);
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const pixels=context.getImageData(0,0,width,height).data;let left=width,right=-1,top=height,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(bottom<0)return null;const bounds={left,right,top,bottom,width,height};groundedBounds.set(image,bounds);return bounds;
}
export function drawGroundedSprite(ctx,image,x,ground,size) {
  const bounds=spriteBounds(image);if(!bounds)return false;
  const scale=size/bounds.height;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,Math.round(x-(bounds.left+bounds.right+1)*scale/2),Math.round(ground-(bounds.bottom+1)*scale),bounds.width*scale,size);
  return true;
}
export const pixelArtPaths = {
  portraits: { elder:"/FYP/images/npc/portraits/elder_256.png", mira:"/FYP/images/npc/portraits/mira_256.png",
    tala:"/FYP/images/npc/portraits/tala_256.png", kai:"/FYP/images/npc/portraits/kai_256.png" },
  npcs: { elder:"/FYP/images/npc/npc_elder_rowan_64.png", mira:"/FYP/images/npc/npc_mira_64.png", tala:"/FYP/images/npc/npc_tala_64.png", kai:"/FYP/images/npc/npc_kai_64.png" },
  monsters: { "bat-01":"/FYP/images/world/monsters/confusion-bat-64.png", "road-guardian-01":"/FYP/images/world/monsters/road-guardian-64.png",
    "guardian-01":"/FYP/images/world/monsters/grammar-guardian-64.png", "cave-wraith-01":"/FYP/images/world/monsters/cave-wraith-64.png" },
  portal:"/FYP/images/world/pixel/realm_portal_64.png",
  sign:"/FYP/images/world/pixel/wayfinder_sign_64.png",
  book:"/FYP/images/world/pixel/system_book_64.png",
  campus:"/FYP/images/world/pixel/opening-campus.png"
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
  for(let y=0;y<height-ground;y+=32)for(let x=offset-32;x<width+32;x+=32){
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
    c.width=c.height=64;
    const roof=variant==="elder"?"#4a695b":variant==="shop"?"#6a577c":"#81544e";
    rect("#463a36",7,21,50,43);rect("#b8946e",10,25,44,36);rect("#e0c69c",12,26,40,3);
    for(let row=0;row<10;row++){rect(roof,2+row*3,23-row*2,60-row*6,2);rect("#344238",5+row*3,23-row*2,4,1);}
    rect("#55473e",12,5,7,15);rect("#94836c",11,4,9,3);
    rect("#645047",10,28,3,33);rect("#645047",51,28,3,33);rect("#725845",10,44,44,2);
    rect("#3b3431",24,31,17,32);rect("#896442",26,33,13,29);rect("#b08d5a",27,34,2,27);rect("#40372e",37,44,2,3);
    for(const x of [14,44]){rect("#5c463c",x-1,31,9,12);rect("#e8c77c",x,32,7,9);rect("#a68153",x+3,32,1,9);rect("#a68153",x,36,7,1);rect("#4d4137",x-2,43,11,2);}
    rect("#897966",5,61,54,3);rect("#b5a489",21,62,23,2);
    rect("#826a47",30,24,5,5);rect("#ddc18b",31,25,3,3);
  }else if(type==="camp"){
    for(let y=0;y<20;y++)rect("#ad8965",15-Math.floor(y/2),10+y,2+Math.floor(y/2)*2,1);
    rect("#664c42",15,17,2,14);rect("#403831",13,22,6,10);
    rect("#493a34",2,29,7,2);rect("#e7a25b",4,25,3,4);rect("#f4cf83",5,23,1,5);
  }else if(type==="bridge"){
    rect("#61554b",1,24,30,5);for(const x of [2,11,20,29])rect("#907c62",x,17,2,12);
    rect("#af9776",1,19,30,2);rect("#3c474a",2,29,28,3);
  }else{
    c.width=c.height=64;
    rect("#35465b",14,11,36,53);rect("#607487",16,13,32,49);rect("#8e9ca4",16,13,4,49);
    for(let y=18;y<62;y+=9){rect("#42596c",18,y,30,1);for(const x of [26,38])rect("#42596c",x+(y%2)*3,y-7,1,7);}
    rect("#89979d",10,10,44,5);for(const x of [10,23,36,49]){rect("#677d8d",x,3,6,8);rect("#a0abb0",x,3,6,2);}
    rect("#152537",24,38,16,26);rect("#89979d",22,37,20,3);rect("#263f55",25,40,3,22);
    for(const y of [20,29]){rect("#253a51",27,y,10,7);rect("#91bcc6",29,y+1,6,5);rect("#476877",31,y+1,1,5);}
    rect("#85909b",10,61,44,3);
    if(type==="ruins"){ctx.clearRect(36,0,28,18);rect("#3c5067",39,18,11,7);rect("#27394e",41,25,2,8);rect("#7b8e9b",45,53,9,8);}
  }
  tiles.set(key,c);return c;
}
export function drawPixelLandmark(ctx,type,x,ground,variant="") {
  const tile=landmarkTile(type,variant),scale=type==="tower"?5:type==="cave" || type==="typingCave"?3:tile.width===64?4:type==="camp"?7:8;ctx.imageSmoothingEnabled=false;
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

export function drawDungeonBackdrop(ctx,image,{width,height,ground,camera=0,realm="ruins"}) {
  if(!image?.complete || !image.naturalWidth) {drawPixelCave(ctx,{width,height,ground,camera});return;}
  const scale=Math.max(1,Math.ceil(Math.max(width/image.naturalWidth,ground/(image.naturalHeight*.75))));
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
  ctx.fillStyle=palettes[realm]?.soil || "#131b2b";ctx.fillRect(0,0,width,height);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,Math.round((width-w)/2-Math.min((w-width)/2,camera*.06)),Math.round(ground-h*.75),w,h);
  // Retain the artwork's stone floor beneath the actor instead of painting outdoor grass over it.
  // Solid pixel masonry beneath the walkway; no duplicated rooms/windows or flat stripe extension.
  const floor={maple:['#252e38','#303b49','#455566','#18212b'],forest:['#223c35','#2d4940','#466653','#142c26'],camp:['#44352f','#554036','#785541','#2c2526'],ruins:['#292d43','#353a51','#515872','#1c2335']}[realm]||['#252e38','#303b49','#455566','#18212b'];
  ctx.fillStyle=floor[0];ctx.fillRect(0,ground+3,width,height-ground-3);
  for(let row=0,y=Math.round(ground+6);y<height;row++,y+=32){
    const offset=-Math.floor(camera)%32+(row%2?16:0);
    for(let x=offset-32;x<width+32;x+=32){const hash=(Math.floor((x+camera)/32)*17+row*31)>>>0;
      ctx.fillStyle=hash%3?floor[0]:floor[1];ctx.fillRect(x+2,y+2,28,28);
      ctx.fillStyle=floor[3];ctx.fillRect(x,y,2,32);ctx.fillRect(x,y+30,32,2);
      ctx.fillStyle=floor[2];if(hash%4===0)ctx.fillRect(x+5,y+5,8,2);if(hash%7===0)ctx.fillRect(x+21,y+20,3,3);
    }
  }
  ctx.fillStyle={maple:"#ae9570",forest:"#698970",camp:"#bb8a59",ruins:"#879dc0"}[realm];ctx.fillRect(0,Math.round(ground),width,3);
}
