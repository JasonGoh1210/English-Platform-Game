const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
test('Shop receipts require valid inventory, balances and an owned equipped companion',()=>{
  const source=fs.readFileSync(path.join(root,'js/shop.js'),'utf8').match(/export function validShopView[\s\S]+?\n}/)[0].replace('export ','');
  const c={};vm.createContext(c);vm.runInContext(source,c);const products=JSON.parse(fs.readFileSync(path.join(root,'data/shop.json')));
  const valid={coins:48,potions:2,owned:['owl','fox'],equipped:'fox'};assert.ok(c.validShopView(valid,products));
  assert.ok(c.validShopView({...valid,ownedEffects:['none','sakura_trail'],equippedEffect:'sakura_trail'},products));
  for(const bad of [{ownedEffects:null},{ownedEffects:['none','none']},{ownedEffects:['none','fox']},{ownedEffects:[]},{equippedEffect:'star_trail'},{equippedEffect:null},{coins:-1},{coins:'48'},{potions:100},{potions:1.5},{hintPotions:100},{hintPotions:-1},{hintPotions:null},{hintPotions:1.5},{owned:['owl','owl']},{owned:['fox']},{equipped:'dragon'},{owned:['owl','potion']}])assert.ok(!c.validShopView({...valid,...bad},products));
});
test('A guiding companion points towards the actual route, stays close and resets across worlds',()=>{
  const source=fs.readFileSync(path.join(root,'js/companions.js'),'utf8').replace(/^import .+;\r?\n/,'').replaceAll('export function','function');
  const c={Image:class{}};vm.createContext(c);vm.runInContext(source,c);
  assert.equal(c.companionDestination(440,220,1800,true),330);assert.equal(c.companionDestination(440,880,1800,true),550);
  assert.equal(c.companionDestination(850,880,1800,true),880);assert.equal(c.companionDestination(70,220,1800,false),40);
  const buddy=c.createCompanion({owl:{kind:'companion',sprite:'owl.png'}});const fields={playerX:440,playerFacing:1,routeX:880,width:1800,realm:'maple',inside:false,equipped:'owl'};
  buddy.update(.1,fields);assert.equal(buddy.state('owl').x,360);assert.equal(buddy.toggle(),true);buddy.update(1,fields);assert.equal(buddy.state('owl').x,550);
  buddy.update(.1,{...fields,realm:'forest',playerX:1600,routeX:220});assert.equal(buddy.state('owl').x,1490);buddy.reset();assert.equal(buddy.state('owl').x,null);
  buddy.update(1,{...fields,playerX:200,camera:0,safeScreenLeft:240});assert.equal(buddy.state('owl').x,310);
  buddy.toggle();buddy.update(1,{...fields,playerX:200,camera:0,safeScreenLeft:240});assert.equal(buddy.state('owl').x,240,'Follow mode avoids the touch buttons');
});

test('Followers face the player even when the quest is behind, and move behind a left-facing owner',()=>{
  const source=fs.readFileSync(path.join(root,'js/companions.js'),'utf8').replace(/^import .+;\r?\n/,'').replaceAll('export function','function');
  const c={Image:class{}};vm.createContext(c);vm.runInContext(source,c);
  const buddy=c.createCompanion({fox:{kind:'companion',sprite:'fox.png',animation:{motion:'walk'}}});
  const fields={playerX:440,playerFacing:1,routeX:220,width:1800,realm:'maple',inside:false,equipped:'fox'};
  buddy.update(.1,fields);assert.equal(buddy.state('fox').facing,'right','Looks at owner, not the left-hand quest');
  buddy.update(1,{...fields,playerFacing:-1});assert.equal(buddy.state('fox').x,520);assert.equal(buddy.state('fox').facing,'left');
  assert.equal(c.companionDestination(440,220,1800,false,-1),520);
  buddy.toggle();buddy.update(1,fields);assert.equal(buddy.state('fox').facing,'left','Guide looks along its route');
});

test('Winged companions hover and flap while ground companions walk or hop through distinct frames',()=>{
  const source=fs.readFileSync(path.join(root,'js/companions.js'),'utf8').replace(/^import .+;\r?\n/,'').replaceAll('export function','function');
  const c={Image:class{}};vm.createContext(c);vm.runInContext(source,c);
  const products=JSON.parse(fs.readFileSync(path.join(root,'data/shop.json')));
  for(const id of Object.keys(products).filter(id=>products[id].kind==='companion')){
    const buddy=c.createCompanion(products),fields={playerX:700,playerFacing:1,routeX:880,width:1800,realm:'maple',inside:false,equipped:id};
    buddy.update(0,fields);const first=buddy.state(id),flying=products[id].animation.motion==='fly';
    assert.equal(first.airborne,flying);assert.equal(first.motion,flying?'hover':'idle');assert.equal(first.altitude>40,flying);
    const idle=new Set(),moving=new Set();for(let i=0;i<12;i++){buddy.update(.15,fields);idle.add(buddy.state(id).frame);}
    assert.ok(idle.size>1,'Idle or wing animation advances');
    for(let i=0;i<12;i++){buddy.update(.08,{...fields,playerX:710+i*5});const pose=buddy.state(id);moving.add(pose.frame);assert.equal(pose.motion,flying?'fly':products[id].animation.motion==='hop'?'hop':'walk');}
    assert.ok(moving.size>=3,'Movement changes actual pose indices');assert.ok([...moving].every(frame=>frame>=4&&frame<8));
  }
});

test('Companions greet, perch, wag or orbit without stealing movement or remaining stuck after travel',()=>{
  const source=fs.readFileSync(path.join(root,'js/companions.js'),'utf8').replace(/^import .+;\r?\n/,'').replaceAll('export function','function');
  const c={Image:class{}};vm.createContext(c);vm.runInContext(source,c);const products=JSON.parse(fs.readFileSync(path.join(root,'data/shop.json')));
  const fields={playerX:440,playerFacing:1,routeX:880,width:2800,realm:'maple',inside:false};
  for(const id of Object.keys(products).filter(id=>products[id].kind==='companion')){
    const b=c.createCompanion(products);b.update(.1,{...fields,equipped:id});b.interact();assert.equal(b.state(id).reaction,'greeting');b.update(3.1,{...fields,equipped:id});assert.notEqual(b.state(id).reaction,'greeting');
  }
  const fox=c.createCompanion(products);fox.update(1,{...fields,equipped:'fox',interest:{x:450,kind:'supplies'}});assert.equal(fox.state('fox').motion,'wag');fox.update(.1,{...fields,playerX:460,equipped:'fox',interest:{x:450,kind:'supplies'}});assert.equal(fox.state('fox').motion,'walk');
  const bat=c.createCompanion(products),cave={...fields,equipped:'bat',interest:{x:470,kind:'cave'}};bat.update(.5,cave);assert.equal(bat.state('bat').motion,'orbit');const x=bat.state('bat').x;bat.update(.4,cave);assert.notEqual(bat.state('bat').x,x);bat.update(.1,{...cave,playerX:480});assert.equal(bat.state('bat').motion,'fly');bat.update(.1,{...cave,realm:'ruins',playerX:1500,interest:null});assert.notEqual(bat.state('bat').motion,'orbit');
});
