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
const sprites=['images/npc/npc_mira_32.png','images/npc/npc_tala_32.png','images/npc/npc_kai_32.png',
  'images/world/pixel/realm_portal_32.png','images/world/monsters/cave-wraith-32.png','images/world/monsters/confusion-bat-32.png',
  'images/world/monsters/road-guardian-32.png','images/world/monsters/grammar-guardian-32.png'];
test('New sprites are real 32x32 RGBA PNGs with binary alpha, bounded palettes and feet/margin inside their frame',()=>{
  for(const file of sprites){const image=png(file);assert.equal(image.width,32,file);assert.equal(image.height,32);assert.equal(image.channels,4);
    const colors=new Set(),alphas=new Set();let opaque=0;
    for(let i=0;i<image.pixels.length;i+=4){const a=image.pixels[i+3];alphas.add(a);if(a){opaque++;colors.add(image.pixels.subarray(i,i+3).toString('hex'));}}
    assert.deepEqual([...alphas].sort((a,b)=>a-b),[0,255],file);assert.ok(opaque>70 && opaque<850,file);assert.ok(colors.size<=32,file);
    for(let x=0;x<32;x++){assert.equal(image.pixels[x*4+3],0,file);assert.equal(image.pixels[(31*32+x)*4+3],0,file);}
  }
});
test('Every realm has a native pixel backdrop and the battle cave has its own pixel scene',()=>{
  for(const realm of ['maple','forest','camp','ruins','cave']){const image=png('images/world/pixel/'+realm+'.png');assert.equal(image.width,384);assert.equal(image.height,192);assert.equal(image.width%32,0);assert.equal(image.height%32,0);}
});
