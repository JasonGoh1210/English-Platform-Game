// Nine real purchases; decorative connections never imply an unimplemented ability.
export function renderSkillGraph({root,branches,skills,selected,busy,onSelect,stateFor,language}){
  const zh=language==='zh';root.replaceChildren();root.className='skill-constellation';root.setAttribute('aria-busy',String(busy));
  const positions=[[42,40],[62,142],[42,256]];
  for(const [id,info] of Object.entries(branches)){
    const lane=document.createElement('div');lane.className='skill-lane';lane.dataset.branch=id;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('skill-connections');svg.setAttribute('viewBox','0 0 100 308');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
    const level=skills?.[info.field]||0;
    for(let i=0;i<2;i++){const line=document.createElementNS(svg.namespaceURI,'path'),[x,y]=positions[i],[nx,ny]=positions[i+1];line.setAttribute('d',`M${x} ${y} V${(y+ny)/2} H${nx} V${ny}`);line.classList.toggle('lit',level>=i+2);svg.append(line);}lane.append(svg);
    for(let n=1;n<=3;n++){
      const node={level:n,cost:n,requiredLevel:[2,3,5][n-1],bonus:info.bonuses[n-1]},s=stateFor(skills,node,info.field);
      const b=document.createElement('button');b.type='button';b.className='skill-star'+(s.owned?' owned':s.ready?' available':' locked')+(selected?.branch===id&&selected.level===n?' selected':'');b.dataset.skillBranch=id;b.dataset.skillLevel=String(n);b.style.left=positions[n-1][0]+'%';b.style.top=positions[n-1][1]+'px';b.disabled=busy;
      const stateText=s.owned?(zh?'已解锁':'Unlocked'):s.ready?(zh?'可以解锁':'Available'):(zh?'条件未满足':'Requirements not met');
      b.setAttribute('aria-label',(zh?info.zh:info.en)+' '+n+' · '+stateText+' · '+(zh?'花费':'Cost ')+n+(zh?'点':'SP'));
      b.setAttribute('aria-pressed',String(selected?.branch===id&&selected.level===n));
      const art=document.createElement('span');art.className='skill-star-art';art.setAttribute('aria-hidden','true');
      const icon=document.createElementNS(svg.namespaceURI,'svg');icon.setAttribute('viewBox','0 0 32 32');icon.setAttribute('shape-rendering','crispEdges');
      const shapes=id==='word-strike'?[[4,6,10,3],[18,6,10,3],[4,9,3,16],[25,9,3,16],[7,23,7,3],[18,23,7,3],[14,8,4,21],[8,12,4,2],[20,12,4,2],[8,17,4,2],[20,17,4,2]]:id==='grammar-guard'?[[5,3,22,4],[5,7,4,13],[23,7,4,13],[9,20,14,5],[12,25,8,4],[14,9,4,12],[10,13,12,4]]:[[17,2,9,5],[13,7,11,5],[8,12,13,6],[13,18,6,6],[12,24,4,6]];
      shapes.forEach(([x,y,w,h])=>{const r=document.createElementNS(svg.namespaceURI,'rect');for(const [a,v] of Object.entries({x,y,width:w,height:h}))r.setAttribute(a,String(v));icon.append(r);});art.append(icon);
      const rank=document.createElement('span');rank.className='skill-star-rank';rank.textContent=['I','II','III'][n-1];const cost=document.createElement('span');cost.className='skill-star-cost';cost.textContent=(s.owned?'✓ ':s.ready?'◆ ':'◇ ')+n+' '+(zh?'点':'SP');
      b.append(art,rank,cost);b.addEventListener('click',()=>onSelect(id,node));b.addEventListener('keydown',event=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();const keys=Object.keys(branches),nextBranch=event.key==='ArrowLeft'?keys[Math.max(0,keys.indexOf(id)-1)]:event.key==='ArrowRight'?keys[Math.min(2,keys.indexOf(id)+1)]:id;
        const nextTier=Math.max(1,Math.min(3,n+(event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0))),selector=`[data-skill-branch="${nextBranch}"][data-skill-level="${nextTier}"]`;root.querySelector(selector)?.click();root.querySelector(selector)?.scrollIntoView({block:'nearest',inline:'nearest'});
      });lane.append(b);
    }root.append(lane);
  }
}
