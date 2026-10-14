import {t,getLanguage,onLanguageChange,setLanguage} from './i18n.js?v=20261015-village2';
import {playSound} from './audio.js?v=20261015-village2';

const config=window.EPQ_SHOP,catalog=config.catalog,key=`englishPowerQuest.shop.pending.${config.playerId}`;
let view=null,pending=null,busy=false,selection=null;
const status=document.getElementById('shopStatus'),retry=document.getElementById('shopRetry'),dialog=document.getElementById('shopConfirm');
try {pending=JSON.parse(localStorage.getItem(key));if(pending && (!/^[a-f0-9]{32}$/.test(pending.requestId)||!catalog[pending.item]||!['BUY','EQUIP'].includes(pending.action)))pending=null;}catch{}
const name=id=>getLanguage()==='zh'?catalog[id].nameZh:catalog[id].name;
function persist(){try{if(pending)localStorage.setItem(key,JSON.stringify(pending));else localStorage.removeItem(key);}catch{}}
export function validShopView(v,products) {
  return v && Number.isSafeInteger(v.coins)&&v.coins>=0&&Number.isSafeInteger(v.potions)&&v.potions>=0&&v.potions<=99
    &&Array.isArray(v.owned)&&v.owned.includes('owl')&&new Set(v.owned).size===v.owned.length
    &&v.owned.every(id=>products[id]?.kind==='companion')&&v.owned.includes(v.equipped);
}
function render(){
  if(!view)return;
  document.getElementById('shopCoins').textContent=view.coins;document.getElementById('shopPotions').textContent=view.potions;document.getElementById('shopCompanion').textContent=name(view.equipped);
  for(const [container,kind] of [['shopSupplies','potion'],['shopSkins','companion']]) {
    const nodes=Object.entries(catalog).filter(([,p])=>p.kind===kind).map(([id,p])=>{
      const card=document.createElement('article'),img=document.createElement('img'),title=document.createElement('h3'),detail=document.createElement('p'),price=document.createElement('p'),button=document.createElement('button');
      const owned=view.owned.includes(id),equipped=view.equipped===id;card.className='shop-card '+kind+(owned?' owned':'')+(equipped?' equipped':'');card.dataset.item=id;
      img.src=p.sprite;img.alt=name(id);img.width=128;img.height=128;title.textContent=name(id);
      detail.textContent=kind==='potion'?t('shop.heal',{hp:p.heal}):t('shop.follows');price.className='shop-price';price.textContent=p.price===0?t('shop.free'):t('shop.price',{coins:p.price});
      button.dataset.shopItem=id;button.textContent=equipped?t('shop.selected'):owned?t('shop.equip'):t('shop.buy');button.disabled=busy||Boolean(pending)||equipped||(kind==='potion'&&view.potions>=99)||(!owned&&view.coins<p.price);
      button.addEventListener('click',()=>{if(owned){void mutate('EQUIP',id);}else{selection=id;document.getElementById('shopConfirmText').textContent=t('shop.confirmText',{name:name(id),coins:p.price});dialog.showModal();document.getElementById('shopCancel').focus();}});
      card.append(img,title,detail,price,button);return card;
    });document.getElementById(container).replaceChildren(...nodes);
  }
}
function token(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
async function fetchShop(options={cache:'no-store'}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {const response=await fetch('/FYP/api/shop.php',{...options,signal:controller.signal});return {response,data:await response.json()};}
  finally{clearTimeout(timer);}
}
async function load(){busy=true;retry.classList.add('hidden');status.textContent=t('shop.loading');render();try{
  const {response,data}=await fetchShop();if(!response.ok||!data.ok||!validShopView(data.shop,catalog))throw Error();view=data.shop;status.textContent=pending?t('shop.pending'):'';retry.classList.toggle('hidden',!pending);
}catch{status.textContent=t('shop.unavailable');retry.classList.remove('hidden');}finally{busy=false;render();}}
async function mutate(action,item){
  if(busy)return;if(!pending){pending={action,item,requestId:token()};persist();}busy=true;render();retry.classList.add('hidden');status.textContent=t('shop.saving');
  try {const {response,data}=await fetchShop({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pending,csrfToken:config.csrfToken})});
    if(response.ok && data.ok && validShopView(data.shop,catalog)){view=data.shop;pending=null;persist();status.textContent=t('shop.saved');playSound('heal');}
    else if(response.status>=400&&response.status<500){const message=data.errorCode;pending=null;persist();status.textContent=t(message==='NOT_ENOUGH_COINS'?'shop.noCoins':message==='SKIN_ALREADY_OWNED'?'shop.alreadyOwned':'shop.rejected');await load();status.textContent=t(message==='NOT_ENOUGH_COINS'?'shop.noCoins':'shop.rejected');}
    else throw Error();
  }catch{status.textContent=t('shop.pending');retry.classList.remove('hidden');}finally{busy=false;render();document.querySelector(`[data-shop-item="${item}"]`)?.focus();}
}
retry.addEventListener('click',()=>pending?mutate(pending.action,pending.item):load());
document.getElementById('shopCancel').addEventListener('click',()=>dialog.close());
document.getElementById('shopBuy').addEventListener('click',()=>{const item=selection;dialog.close();void mutate('BUY',item);});
dialog.addEventListener('close',()=>document.querySelector(`[data-shop-item="${selection}"]`)?.focus());
document.querySelectorAll('[data-set-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.setLanguage)));
onLanguageChange(()=>{render();if(pending)status.textContent=t('shop.pending');});void load();
