const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),catalog=JSON.parse(fs.readFileSync(path.join(root,'data/shop.json')));
function emitter(){const c={};vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'js/particle-effects.js'),'utf8').replaceAll('export function','function'),c);return c.createParticleEffect();}
const fields={x:200,ground:400,realm:'maple',inside:false};
test('All six paid particle styles draw distinct pixel shapes with bounded work',()=>{
  const signatures=new Set(),effects=Object.values(catalog).filter(p=>p.kind==='effect'&&p.pattern!=='none');assert.equal(effects.length,6);
  for(const product of effects){const e=emitter();for(let n=0;n<1000;n++)e.update(.05,{...fields,x:200+n,effect:product.pattern});assert.ok(e.state().count>0&&e.state().count<=48);
    const blocks=[],ctx={save(){},restore(){},fillRect(...args){assert.ok(args.every(Number.isInteger));blocks.push([this.fillStyle,...args]);}};
    e.draw(ctx,{ground:400,camera:960});assert.ok(blocks.length>0&&blocks.length<=144);signatures.add(JSON.stringify(blocks));assert.equal(ctx.imageSmoothingEnabled,false);
  }assert.equal(signatures.size,6);
});
test('Unequipping, reduced motion, overlays and scene changes never leave a stale trail',()=>{
  const e=emitter(),f={...fields,effect:'petal'};for(let n=0;n<30;n++)e.update(.05,f);assert.ok(e.state().count>0);
  for(const override of [{effect:'none'},{effect:'unknown'},{active:false},{reducedMotion:true},{x:NaN},{ground:NaN}]){e.update(.05,{...f,...override});assert.equal(e.state().count,0);for(let n=0;n<30;n++)e.update(.05,f);}
  for(const override of [{realm:'ruins'},{inside:true},{x:1800},{effect:'star'}]){e.update(0,{...f,...override});assert.equal(e.state().count,0);for(let n=0;n<30;n++)e.update(.05,f);}
});
test('Particle stepping is deterministic, survives invalid time and leaves supplied game data unchanged',()=>{
  const a=emitter(),b=emitter(),f={...fields,effect:'rainbow'},before=JSON.stringify(f);
  for(let n=0;n<30;n++){a.update(.05,f);b.update(.05,f);}const paint=e=>{const rects=[],c={save(){},restore(){},fillRect(...args){rects.push([this.fillStyle,...args]);}};e.draw(c,{ground:400});return rects;};
  assert.deepEqual(paint(a),paint(b));assert.equal(JSON.stringify(f),before);
  for(const dt of [-2,NaN,Infinity,undefined])a.update(dt,f);assert.ok(a.state().count<=48);a.reset();assert.equal(a.state().count,0);
});
