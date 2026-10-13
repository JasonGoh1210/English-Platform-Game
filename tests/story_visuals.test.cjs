const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Story and dialogue use the same actual pixel NPC portraits, with distinct sign and cave art',()=>{
  const scope={};
  const pixelCode=fs.readFileSync(path.join(__dirname,'../js/pixel-world.js'),'utf8').replace(/export /g,'');
  vm.runInNewContext(pixelCode+'\nglobalThis.pixelArtPaths=pixelArtPaths;',scope);
  const storyCode=fs.readFileSync(path.join(__dirname,'../js/story-visuals.js'),'utf8').replace(/^import .*;$/gm,'').replace(/export /g,'');
  vm.runInNewContext(storyCode+'\nglobalThis.storyPortraitSource=storyPortraitSource;',scope);
  const {storyPortraitSource,pixelArtPaths}=scope;
  for(const id of ['elder','mira','tala','kai']){
    const portrait=storyPortraitSource(id);assert.equal(portrait.kind,'pixel');assert.equal(portrait.src,pixelArtPaths.portraits[id]);
    assert.ok(fs.existsSync(path.join(__dirname,'..',portrait.src.replace('/FYP/',''))));
  }
  assert.equal(storyPortraitSource('rowan').src,storyPortraitSource('elder').src);
  assert.equal(storyPortraitSource('sign').src,pixelArtPaths.sign);
  assert.equal(storyPortraitSource('caveEntry').src,pixelArtPaths.monsters['cave-wraith-01']);
  assert.equal(storyPortraitSource('book').src,pixelArtPaths.book);
  assert.ok(storyPortraitSource('alex').src.includes('Player_Stand.png'));
});
