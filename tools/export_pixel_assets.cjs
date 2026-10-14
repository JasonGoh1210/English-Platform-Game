// Production export for newly generated artwork. Original player/Rowan files are never overwritten.
// EPQ_PLAYWRIGHT_MODULE can point at a local Playwright install; nothing is downloaded.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.EPQ_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const spriteNames = { rowan:'images/npc/npc_elder_rowan_64.png', mira:'images/npc/npc_mira_64.png', tala:'images/npc/npc_tala_64.png',
  kai:'images/npc/npc_kai_64.png', portal:'images/world/pixel/realm_portal_64.png',
  wraith:'images/world/monsters/cave-wraith-64.png', bat:'images/world/monsters/confusion-bat-64.png',
  road_guardian:'images/world/monsters/road-guardian-64.png', grammar_guardian:'images/world/monsters/grammar-guardian-64.png' };
const portraitNames={portrait_elder:'images/npc/portraits/elder_256.png',portrait_mira:'images/npc/portraits/mira_256.png',
  portrait_tala:'images/npc/portraits/tala_256.png',portrait_kai:'images/npc/portraits/kai_256.png'};
const dungeonNames={owl:'clockwork-owl-64.png',moss:'moss-sentinel-64.png',scorpion:'ember-scorpion-64.png',beetle:'crystal-beetle-64.png'};
const companionNames=Object.fromEntries(['owl','fox','cat','dragon','wisp','bunny'].map(id=>['companion_'+id,'images/companions/'+id+'-64.png']));
const heroNames=Object.fromEntries(['male_forest','female_forest','male_arcane','female_arcane'].map(id=>['hero_'+id,'assets/player/looks/'+id.replaceAll('_','-')+'-sheet.png']));
for(const realm of ['maple','forest','camp','ruins']) {
  dungeonNames[realm+'_interior']=realm+'-interior.png';dungeonNames[realm+'_entrance']=realm+'-entrance-128.png';
}
async function main() {
  const browser=await chromium.launch({executablePath:process.env.EPQ_CHROME_PATH || undefined,headless:true});
  try {
    const page=await browser.newPage();
    for (const item of manifest) {
      const dungeonKey=item.key.startsWith('dungeon_')?item.key.slice(8):null;
      const background=['maple','forest','camp','ruins'].includes(item.key) || Boolean(dungeonKey?.endsWith('_interior'));
      const entrance=Boolean(dungeonKey?.endsWith('_entrance')) || item.key==='exit_door';
      const sheet=Boolean(heroNames[item.key]),potion=item.key==='potion';
      const portrait=Boolean(portraitNames[item.key]);
      const relative=dungeonKey && dungeonNames[dungeonKey]?'images/dungeons/'+dungeonNames[dungeonKey]
        :background?'images/world/pixel/'+item.key+'.png':portraitNames[item.key] || spriteNames[item.key] || companionNames[item.key] || heroNames[item.key]
        || (item.key==='exit_door'?'images/dungeons/exit-door-128.png':potion?'images/shop/ruby-potion-32.png':null);
      if (!relative) throw new Error('Unknown export key: '+item.key);
      const source='data:image/png;base64,'+fs.readFileSync(item.source).toString('base64');
      const result=await page.evaluate(async({source,background,portrait,entrance,floorFraction,dungeonKey,sheet,potion})=>{
        const img=new Image();img.src=source;await img.decode();
        const sourceCanvas=document.createElement('canvas');sourceCanvas.width=img.width;sourceCanvas.height=img.height;
        const src=sourceCanvas.getContext('2d',{willReadFrequently:true});src.drawImage(img,0,0);
        const pixels=src.getImageData(0,0,img.width,img.height).data;
        let left=img.width,top=img.height,right=-1,bottom=-1,transparent=0;
        for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++){
          const a=pixels[(y*img.width+x)*4+3];if(a<128)transparent++;
          else{left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
        }
        if(!background && (right<left || transparent===0))throw Error('Sprite needs actual alpha and a visible silhouette');
        const size=portrait?256:entrance?128:potion?32:64,margin=portrait?8:entrance?4:2;
        const canvas=document.createElement('canvas');canvas.width=sheet?320:background?384:size;canvas.height=sheet?160:background?192:size;
        const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
        if(sheet){
          const cellW=img.width/4,cellH=img.height/2,frames=[];
          for(let frame=0;frame<7;frame++){
            const sx=Math.floor(frame%4*cellW),sy=Math.floor(Math.floor(frame/4)*cellH);let l=cellW,r=-1,t=cellH,b=-1;
            for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++)if(pixels[((sy+y)*img.width+sx+x)*4+3]>=128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
            if(b<t)throw Error('Empty hero frame '+frame);frames.push({sx:sx+l,sy:sy+t,w:r-l+1,h:b-t+1});
          }
          const scale=Math.min(72/Math.max(...frames.map(f=>f.w)),72/Math.max(...frames.map(f=>f.h)));
          frames.forEach((f,i)=>{const w=Math.round(f.w*scale),h=Math.round(f.h*scale);ctx.drawImage(img,f.sx,f.sy,f.w,f.h,(i%4)*80+Math.floor((80-w)/2),Math.floor(i/4)*80+76-h,w,h);});
        }else if(background)ctx.drawImage(img,0,0,img.width,Math.min(img.height,img.height*(floorFraction||.75)/.75),0,0,canvas.width,canvas.height);
        else {const w=right-left+1,h=bottom-top+1,scale=Math.min((size-margin*2)/w,(size-margin*2)/h),dw=Math.max(1,Math.round(w*scale)),dh=Math.max(1,Math.round(h*scale));
          ctx.drawImage(img,left,top,w,h,Math.floor((size-dw)/2),size-margin-dh,dw,dh);}
        const data=ctx.getImageData(0,0,canvas.width,canvas.height),colors=new Map();
        for(let i=0;i<data.data.length;i+=4){data.data[i+3]=background?255:data.data[i+3]>=128?255:0;
          if(data.data[i+3]){const key=data.data.slice(i,i+3).join(',');colors.set(key,(colors.get(key)||0)+1);}}
        // Frequency-only palettes can discard small gold runes and cyan eyes.
        // Select distant colors with frequency weighting so those accents survive.
        const entries=[...colors.entries()].sort((a,b)=>b[1]-a[1]).map(([key,count])=>({rgb:key.split(',').map(Number),count,distance:Infinity}));
        const limit=background?(dungeonKey?96:48):portrait?256:128,palette=[];
        if(background && !dungeonKey || entries.length<=limit)palette.push(...entries.slice(0,limit).map(e=>e.rgb));
        else {
          let next=entries[0];
          for(let n=0;n<limit;n++){
            palette.push(next.rgb);let score=-1,candidate=null;
            for(const e of entries){
              const d=e.rgb.reduce((sum,c,i)=>sum+(c-next.rgb[i])**2,0);e.distance=Math.min(e.distance,d);
              const weighted=e.distance*Math.sqrt(e.count);if(weighted>score){score=weighted;candidate=e;}
            }
            next=candidate;
          }
        }
        for(let i=0;i<data.data.length;i+=4){if(!data.data[i+3]){data.data[i]=data.data[i+1]=data.data[i+2]=0;continue;}
          let best=palette[0],distance=Infinity;for(const c of palette){const d=(c[0]-data.data[i])**2+(c[1]-data.data[i+1])**2+(c[2]-data.data[i+2])**2;if(d<distance){distance=d;best=c;}}
          data.data.set(best,i);}
        ctx.putImageData(data,0,0);
        return {base64:canvas.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height,palette:palette.length};
      },{source,background,portrait,entrance,floorFraction:item.floorFraction,dungeonKey,sheet,potion});
      const destination=path.join(root,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,Buffer.from(result.base64,'base64'));
      console.log(relative,result.width+'x'+result.height,'colors='+result.palette);
    }
    if(!manifest.some(item=>['maple','forest','camp','ruins'].includes(item.key)))return;
    const cave=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=384;c.height=192;const x=c.getContext('2d');
      x.fillStyle='#101a27';x.fillRect(0,0,384,192);
      for(let y=0;y<192;y+=32)for(let col=0;col<384;col+=32){x.fillStyle=(col/32+y/32)%3?'#172432':'#1c2c3b';x.fillRect(col+1,y+1,30,30);x.fillStyle='#213445';x.fillRect(col+4,y+4,23,2);}
      x.fillStyle='#0b1420';x.fillRect(0,123,384,69);x.fillStyle='#32485a';x.fillRect(0,153,384,3);
      for(const col of [22,106,278,352]){x.fillStyle='#263f50';x.fillRect(col,79,12,74);x.fillStyle='#375567';x.fillRect(col-4,78,20,5);}
      for(const col of [55,207,317]){x.fillStyle='#41778b';x.fillRect(col,124,8,28);x.fillStyle='#75b7c7';x.fillRect(col+2,116,3,30);x.fillRect(col+5,124,5,22);}
      return c.toDataURL('image/png').split(',')[1];});
    fs.writeFileSync(path.join(root,'images/world/pixel/cave.png'),Buffer.from(cave,'base64'));
  } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
