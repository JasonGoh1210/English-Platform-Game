// Native pixel graphics for the existing UI; no player or database files are inputs.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.EPQ_PLAYWRIGHT_MODULE || 'playwright');
async function main(){
  const browser=await chromium.launch({executablePath:process.env.EPQ_CHROME_PATH || undefined,headless:true});
  try{
    const page=await browser.newPage();
    const assets=await page.evaluate(()=>{
      const output={},c=document.createElement('canvas');let x;
      const start=(w,h)=>{c.width=w;c.height=h;x=c.getContext('2d');};
      const r=(color,a,b,w,h)=>{x.fillStyle=color;x.fillRect(a,b,w,h);};
      const save=name=>{output[name]=c.toDataURL('image/png').split(',')[1];};
      start(64,64);
      r('#302820',11,18,7,44);r('#302820',46,18,7,44);r('#88613d',12,18,3,44);r('#88613d',47,18,3,44);
      r('#382b24',2,3,60,25);r('#be915d',4,5,56,21);r('#efd39a',5,6,54,2);r('#715037',6,10,52,13);r('#dbb77a',5,24,54,1);
      for(const a of [6,56]){r('#3e3a35',a,9,2,2);r('#3e3a35',a,22,2,2);}
      for(let row=0;row<11;row++){const inset=Math.abs(row-5);r('#efd5a1',53-inset,12+row,2+inset,1);}
      save('wayfinder_sign_64.png');
      start(64,64);
      r('#091526',8,13,49,40);r('#d4b376',10,11,45,4);r('#1c3855',9,15,23,38);r('#2c4d67',33,15,23,38);
      r('#7b6c51',30,13,4,43);r('#c6ad78',31,15,2,39);r('#98a9ac',11,51,18,3);r('#b2bbac',35,51,18,3);
      for(const a of [13,37]){r('#507780',a,20,13,1);r('#507780',a,25,13,1);r('#507780',a,43,13,1);}
      r('#4e9caa',19,30,7,9);r('#8ae6de',21,28,3,13);r('#82d5d6',17,32,11,4);
      r('#62b5c0',40,31,5,9);r('#b6f0dc',41,29,3,12);
      for(const [a,b] of [[7,7],[53,4],[3,32],[59,24]]){r('#efd18f',a,b,3,3);}
      save('system_book_64.png');
      start(384,192);r('#152332',0,0,384,192);r('#263848',0,0,384,118);r('#1b2b3b',0,118,384,74);
      for(let a=0;a<384;a+=32){r('#314657',a,4,1,113);r('#172433',a,142,30,1);r('#172433',a,174,30,1);}
      // Blackboard, clock, shelves and desks establish the original campus scene.
      r('#141f2a',22,18,141,69);r('#725d44',24,20,137,65);r('#193b3c',28,24,129,57);
      for(let row=0;row<3;row++){r('#80a49c',38,34+row*12,38+row*17,2);r('#627f7b',108,34+row*12,31,2);}
      r('#182635',174,24,22,22);r('#bdc4ad',177,27,16,16);r('#526574',184,30,2,8);r('#526574',184,37,6,2);
      r('#604d3e',202,69,26,62);r('#af9166',200,68,30,4);r('#af9166',200,98,30,4);
      for(let a=205;a<225;a+=5){r(a%2?'#537981':'#94826a',a,77,4,20);r('#334c60',a,107,4,20);}
      // A stepped city skyline and moon sit inside a substantial pixel window.
      r('#121f32',244,17,120,106);r('#536978',247,20,114,100);r('#193a54',252,25,104,90);
      r('#a9c8c6',324,33,13,13);r('#d2d8bd',327,32,7,15);
      for(const [a,h] of [[254,29],[270,38],[287,22],[302,42],[321,26],[339,36]]){r('#10283d',a,115-h,14,h);for(let b=119-h;b<109;b+=8)r('#8f9576',a+4,b,3,3);}
      r('#536978',302,25,4,90);r('#536978',252,69,104,4);r('#a4ad99',241,121,126,4);
      for(const [a,b] of [[28,133],[112,139],[252,145]]){r('#715746',a,b,65,7);r('#ac8b63',a,b,65,2);r('#3f3a37',a+5,b+7,5,26);r('#3f3a37',a+54,b+7,5,26);r('#bcb7a0',a+15,b-4,21,4);}
      r('#25333c',183,143,26,9);r('#728281',185,137,23,7);r('#334753',187,122,18,17);r('#518495',190,125,12,10);
      save('opening-campus.png');return output;
    });
    const folder=path.resolve(__dirname,'../images/world/pixel');fs.mkdirSync(folder,{recursive:true});
    for(const [name,data] of Object.entries(assets)){fs.writeFileSync(path.join(folder,name),Buffer.from(data,'base64'));console.log(name);}
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
