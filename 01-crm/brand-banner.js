/* Reusable local brand banners. Text is drawn as canvas text, never HTML. */
(function(){
'use strict';
const themes={navy:{name:'沉穩金線',primary:'#173756',accent:'#d4af62'},ribbon:{name:'亮眼招牌',primary:'#ffbf00',accent:'#b82029'},clean:{name:'清爽名片',primary:'#ffffff',accent:'#078b91'},editorial:{name:'暖白質感',primary:'#f4eee3',accent:'#896441'}};
const defaults={theme:'navy',primary:'#173756',accent:'#d4af62',company:'',name:'',phone:'',tagline:'',height:15,font:'sans'};
let current={...defaults},host,onchange;
const $=id=>document.getElementById(id);
function contrast(hex){const n=parseInt(hex.slice(1),16);return (((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)>155)?'#172b3b':'#ffffff';}
function height(h,o){return h*Math.max(10,Math.min(24,Number(o.height)||15))/100;}
function draw(ctx,w,h,o){
 const bh=height(h,o),y=h-bh,p=w*.025,primary=o.primary,accent=o.accent,fg=contrast(primary);
 ctx.save();ctx.fillStyle=primary;ctx.fillRect(0,y,w,bh);
 const families={sans:'"Microsoft JhengHei","PingFang TC",sans-serif',serif:'"PMingLiU","Songti TC",serif',kai:'"DFKai-SB","BiauKai",serif'};
 function text(value,x,cy,maxWidth,size,color,weight=700){if(!value)return;ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign='left';let s=size;ctx.font=(o.font==='italic'?'italic ':'')+(['light','book'].includes(o.font)?400:weight)+' '+s+'px '+(families[o.font==='book'?'serif':o.font]||families.sans);const measured=ctx.measureText(value).width;if(measured>maxWidth){s*=maxWidth/measured;ctx.font=(o.font==='italic'?'italic ':'')+(['light','book'].includes(o.font)?400:weight)+' '+s+'px '+(families[o.font==='book'?'serif':o.font]||families.sans);}ctx.fillText(value,x,cy);}
 const title=o.company||o.tagline,sub=o.company?o.tagline:'';
 if(o.theme==='ribbon'){
  ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(w*.43,y);ctx.lineTo(w,y);ctx.lineTo(w,h);ctx.lineTo(w*.37,h);ctx.closePath();ctx.fill();
  text(title,p,y+bh*.34,w*.36,bh*.24,fg);text(sub,p,y+bh*.72,w*.32,bh*.16,fg,500);
  text(o.name,w*.46,y+bh*.27,w*.5,bh*.19,contrast(accent));text(o.phone,w*.44,y+bh*.69,w*.53,bh*.34,contrast(accent));
 }else if(o.theme==='clean'){
  ctx.fillStyle=accent;ctx.fillRect(0,y,w,bh*.055);ctx.fillRect(p,y+bh*.23,w*.004,bh*.54);
  text(title,p*1.5,y+bh*.34,w*.43,bh*.23,fg);text(sub,p*1.5,y+bh*.71,w*.43,bh*.15,fg,500);
  text(o.name,w*.55,y+bh*.30,w*.42,bh*.18,fg);text(o.phone,w*.55,y+bh*.69,w*.42,bh*.29,accent);
 }else if(o.theme==='editorial'){
  ctx.strokeStyle=accent;ctx.lineWidth=Math.max(1,w*.001);ctx.beginPath();ctx.moveTo(p,y+bh*.12);ctx.lineTo(w-p,y+bh*.12);ctx.stroke();
  text(title,p,y+bh*.46,w*.44,bh*.24,fg);text(sub,p,y+bh*.79,w*.44,bh*.14,fg,500);
  text(o.name,w*.56,y+bh*.40,w*.41,bh*.18,accent);text(o.phone,w*.56,y+bh*.77,w*.41,bh*.28,fg);
 }else{
  ctx.fillStyle=accent;ctx.fillRect(0,y,w,bh*.045);ctx.fillRect(w*.5,y+bh*.22,w*.001,bh*.58);
  text(title,p,y+bh*.37,w*.44,bh*.25,accent);text(sub,p,y+bh*.75,w*.44,bh*.16,fg,500);
  text(o.name,w*.54,y+bh*.30,w*.43,bh*.19,accent);text(o.phone,w*.54,y+bh*.70,w*.43,bh*.32,fg);
 }
 ctx.restore();
}
function save(){try{localStorage.setItem('_crmBrandBanner',JSON.stringify(current));}catch(_){}}
function mount(section,change){host=section;onchange=change;try{const saved=JSON.parse(localStorage.getItem('_crmBrandBanner')||'{}');for(const key of Object.keys(defaults))if(saved[key]!==undefined)current[key]=saved[key];}catch(_){}
 if(!themes[current.theme])current.theme='navy';for(const key of ['primary','accent'])if(!/^#[0-9a-f]{6}$/i.test(current[key]))current[key]=defaults[key];
 host.innerHTML='<label class="ic-section-title"><input type="checkbox" id="icUseBrand">個人品牌底條</label><div id="icBrandBody" hidden><div class="ic-brand-templates" id="icBrandTemplates"></div><p class="ic-note">選版型後可改內容與配色。設定保存在此瀏覽器。</p>'+[['company','品牌／店名'],['name','姓名／稱呼'],['phone','電話／聯絡方式'],['tagline','標語／補充文字']].map(([key,label])=>'<label class="it-lb" for="icBrand_'+key+'">'+label+'</label><input class="it-in" id="icBrand_'+key+'" maxlength="80" type="text">').join('')+'<div class="ic-brand-colors"><label>底色 <input type="color" id="icBrand_primary"></label><label>重點色 <input type="color" id="icBrand_accent"></label></div><label class="it-lb" for="icBrand_font">字體</label><select class="it-in" id="icBrand_font"><option value="sans">黑體</option><option value="serif">明體</option><option value="kai">楷體</option></select><label class="it-lb" for="icBrand_height">底條高度 <span id="icBrandHeight"></span></label><input type="range" min="10" max="24" id="icBrand_height"><p class="ic-note">長文字會自動縮小；建議品牌、姓名與電話保持簡短。人物可另行移動至底條上方。</p></div>';
 for(const [key,theme] of Object.entries(themes)){const b=document.createElement('button');b.type='button';b.dataset.theme=key;b.setAttribute('aria-label',theme.name);const c=document.createElement('canvas');c.width=360;c.height=64;const temp=document.createElement('canvas');temp.width=360;temp.height=270;draw(temp.getContext('2d'),360,270,{...defaults,...theme,theme:key,height:24,company:'品牌名稱',name:'您的姓名',phone:'0912-345-678',tagline:'陪你找到理想的家'});c.getContext('2d').drawImage(temp,0,270-64.8,360,64.8,0,0,360,64);const label=document.createElement('span');label.textContent=theme.name;b.append(c,label);b.onclick=()=>{current.theme=key;current.primary=theme.primary;current.accent=theme.accent;sync();save();onchange();};$('icBrandTemplates').append(b);}
 for(const key of Object.keys(defaults).filter(k=>k!=='theme')){$('icBrand_'+key).oninput=e=>{current[key]=key==='height'?Number(e.target.value):e.target.value;sync();save();onchange();};}
 palette($('icBrand_primary'));palette($('icBrand_accent'));fontOptions($('icBrand_font'));
 $('icUseBrand').onchange=()=>{sync();onchange();};sync();
}
function sync(){if(!host)return;$('icBrandBody').hidden=!$('icUseBrand').checked;for(const key of Object.keys(defaults).filter(k=>k!=='theme'))$('icBrand_'+key).value=current[key];$('icBrandHeight').textContent=current.height+'%';host.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===current.theme)));}
const colors=[['黑','#000000'],['白','#ffffff'],['灰','#808080'],['紅','#e53935'],['橘','#f57c00'],['黃','#ffca28'],['綠','#2e7d32'],['青','#008b8b'],['藍','#1565c0'],['深藍','#173756'],['紫','#7b1fa2'],['粉紅','#ec407a'],['棕','#795548'],['金','#d4af62'],['米白','#f4eee3'],['淺藍','#81d4fa']];
function palette(input){const wrap=document.createElement('div');wrap.className='ic-palette';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','常用顏色');for(const [name,value] of colors){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.style.background=value;b.onclick=()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};wrap.append(b);}const parent=input.closest('.ic-brand-colors');if(parent){const row=document.createElement('div');row.className='ic-brand-color-row';input.parentElement.append(row);row.append(wrap);}else input.parentElement.append(wrap);}
function fontOptions(select){for(const [value,label] of [['light','細黑體'],['book','細明體'],['italic','斜體黑體']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}}
function enhanceCaption(){palette($('itCapColor'));fontOptions($('itCapFont'));}
window.BrandBanner={mount,enhanceCaption,options:()=>({...current,enabled:!!$('icUseBrand')?.checked}),height,draw};
})();
