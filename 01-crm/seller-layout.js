/* Inventory identity fields keep full text visible at every editor width. */
(function(){
'use strict';
const style=document.createElement('style');
style.textContent=`
#sPropertyList .person-block{container-type:inline-size}
#sPropertyList .sp-identity{display:grid!important;grid-template-columns:140px minmax(0,1fr)!important;gap:8px;margin-bottom:6px}
#sPropertyList .sp-identity>.fg,#sPropertyList .sp-full-address{width:auto!important;min-width:0;margin:0 0 6px!important;display:block!important}
#sPropertyList .sp-identity label,#sPropertyList .sp-full-address label{display:block!important;margin:0 0 4px!important;text-align:left!important;font-size:14px!important}
#sPropertyList .sp-identity select{width:100%!important;max-width:100%;height:36px}
#sPropertyList textarea.sp-growing{display:block;width:100%!important;box-sizing:border-box;min-height:36px;resize:none;overflow:hidden;line-height:1.45;padding:7px 10px;white-space:pre-wrap;overflow-wrap:anywhere}
#sPropertyList .sp-price-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 90px!important}
#sPropertyList .sp-contract-row{flex-wrap:wrap}
#sPropertyList .sp-contract-row .rm-btn{min-width:70px}
#sPropertyList .sp-management-row{flex-wrap:wrap;row-gap:6px}
#sPropertyList .sp-management-row>.c-del{margin-left:6px!important;flex:none}
@container(max-width:360px){#sPropertyList .sp-identity{grid-template-columns:minmax(0,1fr)!important}#sPropertyList .sp-price-row{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}#sPropertyList .sp-price-row>.fg:last-child{max-width:110px}}
`;
document.head.append(style);
function grow(el){if(!el.getClientRects().length)return;el.style.height='auto';el.style.height=(el.scrollHeight+2)+'px';}
function mount(block){
 if(!block||block.dataset.identityLayout)return;block.dataset.identityLayout='1';
 const row=block.querySelector('.sp-addr-row'),purpose=block.querySelector('.sp-listing-purpose');if(!row||!purpose)return;
 const name=row.querySelector('[data-f=community]'),address=row.querySelector('[data-f=addr]'),addressGroup=address.parentElement;
 row.className='sp-identity';row.prepend(purpose);row.after(addressGroup);addressGroup.classList.add('sp-full-address');
 for(const input of [name,address]){const area=document.createElement('textarea');area.dataset.f=input.dataset.f;area.value=input.value;area.rows=1;area.className='sp-growing';input.replaceWith(area);area.addEventListener('input',()=>grow(area));area.addEventListener('blur',()=>grow(area));}
 const select=purpose.querySelector('select'),updateLabels=()=>{const land=select.value==='土地';row.querySelector('[data-f=community]').previousElementSibling.textContent=land?'物件名稱（選填）':'社區／物件名稱';addressGroup.querySelector('label').textContent=land?'土地位置／地號':'物件地址';};select.addEventListener('change',updateLabels);updateLabels();
 const prices=addressGroup.nextElementSibling;if(prices?.querySelector('[data-f=price]'))prices.classList.add('sp-price-row');
 block.firstElementChild.classList.add('sp-management-row');block.querySelector('[data-f=contractType]')?.parentElement.classList.add('sp-contract-row');
 let lastWidth=-1,resizeFrame=0;const observer=new ResizeObserver(()=>{const width=block.clientWidth;if(!width||width===lastWidth)return;lastWidth=width;cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(block.isConnected)block.querySelectorAll('.sp-growing').forEach(grow);});});observer.observe(block);block._identityResizeObserver=observer;requestAnimationFrame(()=>block.querySelectorAll('.sp-growing').forEach(grow));
}
const original=window.addSellerProperty;window.addSellerProperty=function(){const result=original.apply(this,arguments);mount(document.querySelector('#sPropertyList>.person-block:last-child'));return result;};
document.querySelectorAll('#sPropertyList>.person-block').forEach(mount);
})();
