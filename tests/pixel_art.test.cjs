const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
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
test('Active sprites are real 64x64 RGBA PNGs with binary alpha, bounded palettes and transparent margins',()=>{
  for(const file of sprites){const image=png(file);assert.equal(image.width,64,file);assert.equal(image.height,64);assert.equal(image.channels,4);
    const colors=new Set(),alphas=new Set();let opaque=0;
    for(let i=0;i<image.pixels.length;i+=4){const a=image.pixels[i+3];alphas.add(a);if(a){opaque++;colors.add(image.pixels.subarray(i,i+3).toString('hex'));}}
    assert.deepEqual([...alphas].sort((a,b)=>a-b),[0,255],file);assert.ok(opaque>280 && opaque<3400,file);assert.ok(colors.size<=128,file);
    for(let x=0;x<64;x++){assert.equal(image.pixels[x*4+3],0,file);assert.equal(image.pixels[(63*64+x)*4+3],0,file);
      assert.equal(image.pixels[(x*64)*4+3],0,file);assert.equal(image.pixels[(x*64+63)*4+3],0,file);}
  }
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
