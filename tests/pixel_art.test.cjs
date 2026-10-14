const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('Portal, cave, tower and doorway visible bases touch the ground despite PNG padding',()=>{
  const source=fs.readFileSync(path.join(root,'js/pixel-world.js'),'utf8').replaceAll('export ','');
  const c={document:{createElement(){let source;return {getContext:()=>({drawImage(image){source=image;},getImageData:()=>({data:source.pixels})})};}}};vm.createContext(c);vm.runInContext(source,c);
  for(const [file,size] of [['images/world/pixel/realm_portal_64.png',192],['images/dungeons/forest-entrance-128.png',256],['images/dungeons/maple-entrance-128.png',384],['images/dungeons/exit-door-128.png',256],['assets/player/png_frames/Player_Stand.png',144],['assets/player/png_frames/player_walk_right_3.png',144],['images/npc/npc_elder_rowan_64.png',128],['images/dungeons/moss-sentinel-64.png',128]]){
    const data=png(file),image={...data,naturalWidth:data.width,naturalHeight:data.height,complete:true};let args;
    const context={drawImage:(image,...a)=>args=a};assert.ok(c.drawGroundedSprite(context,image,500,520,size));const bounds=c.spriteBounds(image),scale=size/data.height;
    assert.ok(Math.abs(args[1]+(bounds.bottom+1)*scale-520)<=.5,'Visible threshold sits on the walking plane');
    assert.ok(Math.abs(args[0]+(bounds.left+bounds.right+1)/2*scale-500)<=.5,'Visible silhouette centered on interaction point');
  }
});
test('Six companion skins, potion and doorway are binary-alpha pixel sprites with transparent margins',()=>{
  const files=['owl','fox','cat','dragon','wisp','bunny'].map(id=>['images/companions/'+id+'-64.png',64]);files.push(['images/dungeons/exit-door-128.png',128],['images/shop/ruby-potion-32.png',32]);
  const signatures=new Set();for(const [file,size] of files){const image=png(file);assert.equal(image.width,size);assert.equal(image.height,size);assert.equal(image.channels,4);let visible=0;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){const alpha=image.pixels[(y*size+x)*4+3];assert.ok(alpha===0||alpha===255);if(alpha)visible++;if(x<2||y<2||x>=size-2||y>=size-2)assert.equal(alpha,0);}
    assert.ok(visible>size*size*.15);signatures.add(image.pixels.toString('base64'));
  }assert.equal(signatures.size,8);
});
test('Four new hero sheets contain seven distinct complete walking frames with aligned boots',()=>{
  const silhouettes=[];
  for(const gender of ['male','female'])for(const appearance of ['forest','arcane']){
    const image=png('assets/player/looks/'+gender+'-'+appearance+'-sheet.png');assert.equal(image.width,320);assert.equal(image.height,160);assert.equal(image.channels,4);
    const frames=new Set();for(let frame=0;frame<8;frame++){let visible=0,bottom=-1;const signature=[];
      for(let y=0;y<80;y++)for(let x=0;x<80;x++){const at=((Math.floor(frame/4)*80+y)*320+(frame%4)*80+x)*4,alpha=image.pixels[at+3];assert.ok(alpha===0||alpha===255);if(alpha){visible++;bottom=Math.max(bottom,y);}if(x<3||x>=77||y<3||y>=77)assert.equal(alpha,0);signature.push(...image.pixels.subarray(at,at+4));}
      if(frame===7)assert.equal(visible,0);else{assert.ok(visible>500);assert.equal(bottom,75);frames.add(Buffer.from(signature).toString('base64'));if(frame===0)silhouettes.push(signature.filter((_,i)=>i%4===3).join(','));}
    }assert.equal(frames.size,7,'Walking frames must change actual poses');
  }assert.equal(new Set(silhouettes).size,4,'New heroes have different silhouettes, not merely palette swaps');
});
function png(relative){
  const b=fs.readFileSync(path.join(root,relative));assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=b.readUInt32BE(16),height=b.readUInt32BE(20),depth=b[24],type=b[25];
  assert.equal(depth,8);assert.ok([2,6].includes(type));const channels=type===6?4:3,idat=[];
  for(let p=8;p<b.length;){const n=b.readUInt32BE(p),kind=b.toString('ascii',p+4,p+8);if(kind==='IDAT')idat.push(b.subarray(p+8,p+8+n));p+=12+n;}
  const raw=zlib.inflateSync(Buffer.concat(idat)),stride=width*channels,out=Buffer.alloc(height*stride);
  let p=0;
  for(let y=0;y<height;y++){const filter=raw[p++];for(let x=0;x<stride;x++){
    const left=x>=channels?out[y*stride+x-channels]:0,up=y?out[(y-1)*stride+x]:0,corner=y&&x>=channels?out[(y-1)*stride+x-channels]:0;
    let predictor=0;if(filter===1)predictor=left;else if(filter===2)predictor=up;else if(filter===3)predictor=Math.floor((left+up)/2);
    else if(filter===4){const v=left+up-corner,a=Math.abs(v-left),c=Math.abs(v-corner),d=Math.abs(v-up);predictor=a<=d&&a<=c?left:d<=c?up:corner;}
    else assert.equal(filter,0);out[y*stride+x]=(raw[p++]+predictor)&255;
  }}
  return {width,height,channels,pixels:out};
}
const sprites=['images/npc/npc_mira_64.png','images/npc/npc_tala_64.png','images/npc/npc_kai_64.png',
  'images/npc/npc_elder_rowan_64.png','images/world/pixel/system_book_64.png','images/world/pixel/wayfinder_sign_64.png',
  'images/world/pixel/realm_portal_64.png','images/world/monsters/cave-wraith-64.png','images/world/monsters/confusion-bat-64.png',
  'images/world/monsters/road-guardian-64.png','images/world/monsters/grammar-guardian-64.png'];
for(const id of ['clockwork-owl','moss-sentinel','ember-scorpion','crystal-beetle'])sprites.push('images/dungeons/'+id+'-64.png');
test('Active sprites are real 64x64 RGBA PNGs with binary alpha, bounded palettes and transparent margins',()=>{
  for(const file of sprites){const image=png(file);assert.equal(image.width,64,file);assert.equal(image.height,64);assert.equal(image.channels,4);
    const colors=new Set(),alphas=new Set();let opaque=0;
    for(let i=0;i<image.pixels.length;i+=4){const a=image.pixels[i+3];alphas.add(a);if(a){opaque++;colors.add(image.pixels.subarray(i,i+3).toString('hex'));}}
    assert.deepEqual([...alphas].sort((a,b)=>a-b),[0,255],file);assert.ok(opaque>280 && opaque<3400,file);assert.ok(colors.size<=128,file);
    for(let x=0;x<64;x++){assert.equal(image.pixels[x*4+3],0,file);assert.equal(image.pixels[(63*64+x)*4+3],0,file);
      assert.equal(image.pixels[(x*64)*4+3],0,file);assert.equal(image.pixels[(x*64+63)*4+3],0,file);}
  }
});
test('All four new interiors are native pixel PNGs, and cave/tower entrances preserve transparent margins',()=>{
  const signatures=new Set();
  for(const realm of ['maple','forest','camp','ruins']) {
    const bg=png('images/dungeons/'+realm+'-interior.png');assert.equal(bg.width,384);assert.equal(bg.height,192);
    const colors=new Set();for(let i=0;i<bg.pixels.length;i+=4){assert.equal(bg.pixels[i+3],255);colors.add(bg.pixels.subarray(i,i+3).toString('hex'));}assert.ok(colors.size<=96);
    signatures.add(bg.pixels.toString('base64'));
    const entrance=png('images/dungeons/'+realm+'-entrance-128.png');assert.equal(entrance.width,128);assert.equal(entrance.height,128);
    const alpha=new Set();for(let i=3;i<entrance.pixels.length;i+=4)alpha.add(entrance.pixels[i]);assert.deepEqual([...alpha].sort((a,b)=>a-b),[0,255]);
    for(let x=0;x<128;x++){assert.equal(entrance.pixels[x*4+3],0);assert.equal(entrance.pixels[(127*128+x)*4+3],0);}
    assert.equal(entrance.pixels[(92*128+64)*4+3],255,'The dark entrance opening is opaque, not a transparency hole');
  }
  assert.equal(signatures.size,4,'World interiors must be visually distinct');
});
test('Portal runes and guardian eyes retain their gold and cyan accent colors',()=>{
  for(const [file,accent] of [['images/world/pixel/realm_portal_64.png','gold'],
    ['images/world/monsters/road-guardian-64.png','gold'],['images/world/monsters/grammar-guardian-64.png','cyan']]){
    const {pixels}=png(file);let count=0;
    for(let i=0;i<pixels.length;i+=4){const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      if(pixels[i+3] && (accent==='gold'?r>150&&g>90&&r>b*1.5&&g>b*1.2:g>130&&b>150&&g>r*1.3&&b>r*1.3))count++;
    }
    assert.ok(count>=8,file+' lost its '+accent+' details');
  }
});
test('Every realm has a native pixel backdrop and the battle cave has its own pixel scene',()=>{
  for(const realm of ['maple','forest','camp','ruins','cave']){const image=png('images/world/pixel/'+realm+'.png');assert.equal(image.width,384);assert.equal(image.height,192);assert.equal(image.width%32,0);assert.equal(image.height%32,0);}
});
test('Opening campus scene is a native 384x192 pixel PNG',()=>{
  const image=png('images/world/pixel/opening-campus.png');assert.equal(image.width,384);assert.equal(image.height,192);
});
test('All four dialogue portraits are true 256x256 RGBA busts with centered transparent margins',()=>{
  for(const id of ['elder','mira','tala','kai']){
    const image=png('images/npc/portraits/'+id+'_256.png');assert.equal(image.width,256);assert.equal(image.height,256);assert.equal(image.channels,4);
    let left=256,right=-1,top=256,bottom=-1,opaque=0;const alphas=new Set();
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=image.pixels[(y*256+x)*4+3];alphas.add(a);if(a){opaque++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
    assert.deepEqual([...alphas].sort((a,b)=>a-b),[0,255]);assert.ok(opaque>5000&&opaque<60000,id);
    assert.ok(left>=8&&right<=247&&top>=8&&bottom<=247,id);assert.ok(Math.abs(left-(255-right))<=1,id+' portrait is off-center');
  }
});
