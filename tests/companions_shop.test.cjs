const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('Shop receipts require valid inventory, balances and an owned equipped companion',()=>{
  const source=fs.readFileSync(path.join(root,'js/shop.js'),'utf8').match(/export function validShopView[\s\S]+?\n}/)[0].replace('export ','');
  const c={};vm.createContext(c);vm.runInContext(source,c);const products=JSON.parse(fs.readFileSync(path.join(root,'data/shop.json')));
  const valid={coins:48,potions:2,owned:['owl','fox'],equipped:'fox'};assert.ok(c.validShopView(valid,products));
  for(const bad of [{coins:-1},{coins:'48'},{potions:100},{potions:1.5},{owned:['owl','owl']},{owned:['fox']},{equipped:'dragon'},{owned:['owl','potion']}])assert.ok(!c.validShopView({...valid,...bad},products));
});
test('A guiding companion points towards the actual route, stays close and resets across worlds',()=>{
  const source=fs.readFileSync(path.join(root,'js/companions.js'),'utf8').replace(/^import .+;\r?\n/,'').replaceAll('export function','function');
  const c={Image:class{}};vm.createContext(c);vm.runInContext(source,c);
  assert.equal(c.companionDestination(440,220,1800,true),330);assert.equal(c.companionDestination(440,880,1800,true),550);
  assert.equal(c.companionDestination(850,880,1800,true),880);assert.equal(c.companionDestination(70,220,1800,false),40);
  const buddy=c.createCompanion({owl:{kind:'companion',sprite:'owl.png'}});const fields={playerX:440,routeX:880,width:1800,realm:'maple',inside:false,equipped:'owl'};
  buddy.update(.1,fields);assert.equal(buddy.state('owl').x,360);assert.equal(buddy.toggle(),true);buddy.update(1,fields);assert.equal(buddy.state('owl').x,550);
  buddy.update(.1,{...fields,realm:'forest',playerX:1600,routeX:220});assert.equal(buddy.state('owl').x,1490);buddy.reset();assert.equal(buddy.state('owl').x,null);
  buddy.update(1,{...fields,playerX:200,camera:0,safeScreenLeft:240});assert.equal(buddy.state('owl').x,310);
  buddy.toggle();buddy.update(1,{...fields,playerX:200,camera:0,safeScreenLeft:240});assert.equal(buddy.state('owl').x,240,'Follow mode avoids the touch buttons');
});
