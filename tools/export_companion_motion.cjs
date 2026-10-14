// Export generated RGBA artwork to native pixel sheets; originals are preserved.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.EPQ_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
async function main(){
  const manifest=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
  const browser=await chromium.launch({executablePath:process.env.EPQ_CHROME_PATH||undefined,headless:true});
  try{
    const page=await browser.newPage();
    for(const item of manifest){
      const expected=item.key==='village-shop'?'images/shop/village-apothecary-192.png':/^(owl|fox|cat|dragon|wisp|bunny)$/.test(item.key)?'images/companions/'+item.key+'-motion-64.png':null;
      if(!expected||item.output!==expected)throw Error('Unknown motion export destination');
      const source='data:image/png;base64,'+fs.readFileSync(item.source).toString('base64');
      const result=await page.evaluate(async({source,key})=>{
        const image=new Image();image.src=source;await image.decode();
        const original=document.createElement('canvas');original.width=image.width;original.height=image.height;
        const originalContext=original.getContext('2d',{willReadFrequently:true});originalContext.drawImage(image,0,0);
        const pixels=originalContext.getImageData(0,0,image.width,image.height).data;
        const shop=key==='village-shop',airborne=['owl','dragon','wisp'].includes(key);
        const cellWidth=image.width/(shop?1:4),cellHeight=image.height/(shop?1:2),bounds=[];
        for(let frame=0;frame<(shop?1:8);frame++){
          const sx=Math.floor(frame%4*cellWidth),sy=Math.floor(Math.floor(frame/4)*cellHeight);
          let left=Math.floor(cellWidth),right=-1,top=Math.floor(cellHeight),bottom=-1;
          for(let y=0;y<Math.floor(cellHeight);y++)for(let x=0;x<Math.floor(cellWidth);x++)if(pixels[((sy+y)*image.width+sx+x)*4+3]>=128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
          if(bottom<top)throw Error('Empty generated frame '+key+':'+frame);
          bounds.push({sx,sy,left,right,top,bottom});
        }
        const left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right));
        const top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom));
        const width=right-left+1,height=bottom-top+1;
        const scale=Math.min((shop?184:58)/width,(shop?120:58)/height);
        const drawWidth=Math.round(width*scale),drawHeight=Math.round(height*scale);
        const canvas=document.createElement('canvas');canvas.width=shop?192:256;canvas.height=128;
        const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
        bounds.forEach((b,i)=>{
          // One crop and scale across the sheet preserves body registration while wings move.
          const dx=(shop?0:i%4*64)+Math.floor(((shop?192:64)-drawWidth)/2);
          let dy=shop?124-drawHeight:Math.floor(i/4)*64+Math.floor((64-drawHeight)/2);
          if(!shop&&!airborne){
            const hop=key==='bunny'?(i===5?4:i===6?8:0):0;
            dy=Math.floor(i/4)*64+61-Math.round((b.bottom-top+1)*scale)-hop;
          }
          ctx.drawImage(image,b.sx+left,b.sy+top,width,height,dx,dy,drawWidth,drawHeight);
        });
        const output=ctx.getImageData(0,0,canvas.width,canvas.height),colors=new Map();
        for(let i=0;i<output.data.length;i+=4){output.data[i+3]=output.data[i+3]>=128?255:0;if(output.data[i+3]){const rgb=output.data.slice(i,i+3).join(',');colors.set(rgb,(colors.get(rgb)||0)+1);}}
        // Preserve small eye/scarf highlights as well as frequent coat colors.
        const entries=[...colors.entries()].sort((a,b)=>b[1]-a[1]).map(([rgb,count])=>({rgb:rgb.split(',').map(Number),count,distance:Infinity}));
        const palette=[];let next=entries[0];
        for(let n=0;n<Math.min(128,entries.length);n++){
          palette.push(next.rgb);let score=-1,candidate=null;
          for(const color of entries){color.distance=Math.min(color.distance,color.rgb.reduce((sum,value,i)=>sum+(value-next.rgb[i])**2,0));const weight=color.distance*Math.sqrt(color.count);if(weight>score){score=weight;candidate=color;}}
          next=candidate;
        }
        const mapped=new Map();
        for(let i=0;i<output.data.length;i+=4){
          if(!output.data[i+3]){output.data[i]=output.data[i+1]=output.data[i+2]=0;continue;}
          const key=output.data.slice(i,i+3).join(',');let best=mapped.get(key);
          if(!best){let distance=Infinity;for(const rgb of palette){const delta=rgb.reduce((sum,value,c)=>sum+(value-output.data[i+c])**2,0);if(delta<distance){distance=delta;best=rgb;}}mapped.set(key,best);}
          output.data.set(best,i);
        }
        ctx.putImageData(output,0,0);
        return {base64:canvas.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height};
      },{source,key:item.key});
      const destination=path.join(root,expected);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,Buffer.from(result.base64,'base64'));
      console.log(expected+' '+result.width+'x'+result.height);
    }
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
