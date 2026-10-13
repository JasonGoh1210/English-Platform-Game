const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../js/characters.js"),"utf8").replaceAll("export function","function");
function fixture(){const c={Uint32Array,crypto:require("node:crypto").webcrypto};vm.createContext(c);vm.runInContext(source,c);return c;}
test("Character palettes preserve transparent pixels, alpha, warm skin and black outlines",()=>{
  const c=fixture();const input=new Uint8ClampedArray([0,0,0,0,220,180,150,255,2,3,4,255,20,22,40,128]);
  const alpha=[input[3],input[7],input[11],input[15]],original=Array.from(input);
  c.recolorPixels(input,2,2,[42,102,71]);
  assert.deepEqual([input[3],input[7],input[11],input[15]],alpha);
  assert.deepEqual(Array.from(input.slice(0,12)),original.slice(0,12));
  assert.notDeepEqual(Array.from(input.slice(12,15)),original.slice(12,15));
  assert.ok(input[13]>input[12]&&input[13]>input[14],"Forest cloak becomes green");
});
test("Sprite palettes keep native dimensions, cache each look and source, and safely fall back while loading",()=>{
  const c=fixture(),created=[];
  c.document={createElement:()=>{const canvas={getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(canvas.width*canvas.height*4)}),putImageData(){}})};created.push(canvas);return canvas;}};
  const image={complete:true,naturalWidth:32,naturalHeight:48,src:"walk-right.png"};
  const forest={appearance:"forest",palette:[42,102,71]},arcane={appearance:"arcane",palette:[111,64,156]};
  const green=c.characterSprite(image,forest),purple=c.characterSprite(image,arcane);
  assert.notEqual(green,purple);assert.equal(green.width,32);assert.equal(green.height,48);
  assert.equal(c.characterSprite(image,forest),green);assert.equal(c.characterSprite(image,arcane),purple);assert.equal(created.length,2);
  image.src="alpha-repaired-walk.png";assert.notEqual(c.characterSprite(image,forest),green,"A replaced frame invalidates the old cache");
  assert.equal(c.characterSprite(image,{appearance:"shadow",palette:null}),image);
  const unloaded={...image,complete:false};assert.equal(c.characterSprite(unloaded,forest),unloaded);
});
test("The name dice changes the current name and stays within the supplied valid choices",()=>{
  const c=fixture(),names=["Arin Vale","Luna Reed","星澜"];
  assert.equal(c.randomCharacterName(names,"Arin Vale",()=>0),"Luna Reed");
  assert.equal(c.randomCharacterName(names,"Luna Reed",length=>length-1),"星澜");
  for(let n=0;n<50;n++)assert.ok(names.includes(c.randomCharacterName(names,"")));
});
