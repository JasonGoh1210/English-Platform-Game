import {t,getLanguage,onLanguageChange,setLanguage} from './i18n.js?v=20261017-castleroad2';
import {playSound} from './audio.js?v=20261017-castleroad2';

const config=window.EPQ_SHOP,catalog=config.catalog,backpack=config.mode==='backpack',key=`englishPowerQuest.${backpack?'backpack':'shop'}.pending.${config.playerId}`;
const messageKey=id=>`${backpack?'backpack':'shop'}.${id}`;
let view=null,pending=null,busy=false,selection=null;
const status=document.getElementById('shopStatus'),retry=document.getElementById('shopRetry'),dialog=document.getElementById('shopConfirm');
let statusKey='';
function showStatus(key){statusKey=key;status.textContent=key?t(key):'';}
try {pending=JSON.parse(localStorage.getItem(key));if(pending && (!/^[a-f0-9]{32}$/.test(pending.requestId)||!catalog[pending.item]||!(backpack?['EQUIP']:['BUY','EQUIP']).includes(pending.action)))pending=null;}catch{}
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
  if(backpack)document.getElementById('backpackCastleKey').textContent=t(view.castle?.gateOpen?'castle.keyUsed':view.castle?.hasKey?'castle.keyOwned':'castle.keyMissing');
  for(const [container,kind] of [['shopSupplies','potion'],['shopSkins','companion']]) {
    const nodes=Object.entries(catalog).filter(([id,p])=>p.kind===kind&&(!backpack||kind==='potion'||view.owned.includes(id))).map(([id,p])=>{
      const card=document.createElement('article'),img=document.createElement('img'),title=document.createElement('h3'),detail=document.createElement('p'),price=document.createElement('p'),button=document.createElement('button');
      const owned=view.owned.includes(id),equipped=view.equipped===id;card.className='shop-card '+kind+(owned?' owned':'')+(equipped?' equipped':'');card.dataset.item=id;
      img.src=p.sprite;img.alt=name(id);img.width=128;img.height=128;title.textContent=name(id);
      detail.textContent=kind==='potion'?t('shop.heal',{hp:p.heal}):t('shop.follows');price.className='shop-price';price.textContent=backpack?(kind==='potion'?t('backpack.quantity',{count:view.potions}):t('backpack.owned')):p.price===0?t('shop.free'):t('shop.price',{coins:p.price});
      button.dataset.shopItem=id;button.textContent=equipped?t('shop.selected'):owned?t('shop.equip'):t('shop.buy');button.disabled=busy||Boolean(pending)||equipped||(kind==='potion'&&view.potions>=99)||(!owned&&view.coins<p.price);
      button.addEventListener('click',()=>{if(owned){void mutate('EQUIP',id);}else{selection=id;document.getElementById('shopConfirmText').textContent=t('shop.confirmText',{name:name(id),coins:p.price});dialog.showModal();document.getElementById('shopCancel').focus();}});
      card.tabIndex=-1;
      card.append(img,title,detail,price);
      if(backpack&&kind==='potion'){const help=document.createElement('p');help.className='learning-note';help.textContent=t(view.potions?'backpack.potionHelp':'backpack.noPotions');card.append(help);}
      else card.append(button);
      return card;
    });document.getElementById(container).replaceChildren(...nodes);
  }
}
function token(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
async function fetchShop(options={cache:'no-store'}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try {const response=await fetch('/FYP/api/shop.php',{...options,signal:controller.signal});return {response,data:await response.json()};}
  finally{clearTimeout(timer);}
}
async function load(){busy=true;retry.classList.add('hidden');showStatus(messageKey('loading'));render();try{
  const {response,data}=await fetchShop();if(!response.ok||!data.ok||!validShopView(data.shop,catalog))throw Error();view=data.shop;showStatus(pending?messageKey('pending'):'');retry.classList.toggle('hidden',!pending);
}catch{showStatus(messageKey('unavailable'));retry.classList.remove('hidden');}finally{busy=false;render();window.EPQLoading?.ready();}}
async function mutate(action,item){
  if(busy||(backpack&&action!=='EQUIP'))return;if(!pending){pending={action,item,requestId:token()};persist();}busy=true;render();retry.classList.add('hidden');showStatus(messageKey('saving'));
  try {const {response,data}=await fetchShop({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...pending,csrfToken:config.csrfToken})});
    if(response.ok && data.ok && validShopView(data.shop,catalog)){view=data.shop;pending=null;persist();showStatus(messageKey('saved'));playSound('heal');}
    else if(response.status>=400&&response.status<500){const code=data.errorCode;pending=null;persist();await load();showStatus(backpack?messageKey('rejected'):code==='NOT_ENOUGH_COINS'?'shop.noCoins':'shop.rejected');}
    else throw Error();
  }catch{showStatus(messageKey('pending'));retry.classList.remove('hidden');}finally{busy=false;render();const button=document.querySelector(`[data-shop-item="${item}"]`);(button?.disabled?button.closest('.shop-card'):button)?.focus();}
}
retry.addEventListener('click',()=>pending?mutate(pending.action,pending.item):load());
document.getElementById('shopCancel')?.addEventListener('click',()=>dialog.close());
document.getElementById('shopBuy')?.addEventListener('click',()=>{const item=selection;dialog.close();void mutate('BUY',item);});
dialog?.addEventListener('close',()=>document.querySelector(`[data-shop-item="${selection}"]`)?.focus());
document.querySelectorAll('[data-set-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.setLanguage)));
onLanguageChange(()=>{render();showStatus(statusKey);});void load();
