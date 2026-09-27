/* Reusable local brand banners. Text is drawn as canvas text, never HTML. */
(function(){
'use strict';
const themes={navy:{name:'曜金名片',primary:'#173756',accent:'#d4af62'},ribbon:{name:'活力斜切',primary:'#ffbf00',accent:'#b82029'},clean:{name:'清透留白',primary:'#ffffff',accent:'#078b91'},editorial:{name:'暖調編輯',primary:'#f4eee3',accent:'#896441'}};
const defaults={theme:'navy',primary:'#173756',accent:'#d4af62',company:'',name:'',phone:'',tagline:'',height:15,font:'sans'};
let current={...defaults},host,onchange;
const $=id=>document.getElementById(id);
function contrast(hex){const n=parseInt(hex.slice(1),16);return (((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)>155)?'#172b3b':'#ffffff';}
function height(h,o){return h*Math.max(10,Math.min(24,Number(o.height)||15))/100;}
function draw(ctx,w,h,o){
 const bh=height(h,o),y=h-bh,p=w*.035,primary=o.primary,accent=o.accent,fg=contrast(primary),afg=contrast(accent);
 ctx.save();ctx.beginPath();ctx.rect(0,y,w,bh);ctx.clip();ctx.fillStyle=primary;ctx.fillRect(0,y,w,bh);
 const families={sans:'"Microsoft JhengHei","PingFang TC",sans-serif',serif:'"PMingLiU","Songti TC",serif',kai:'"DFKai-SB","BiauKai","KaiTi",serif'};
 function text(value,x,cy,maxWidth,size,color,weight=700){if(!value)return;ctx.fillStyle=color;ctx.textBaseline='middle';ctx.textAlign='left';let sz=size;const font=()=> (o.font==='italic'?'italic ':'')+(['light','book'].includes(o.font)?Math.min(weight,500):weight)+' '+sz+'px '+(families[o.font==='book'?'serif':o.font]||families.sans);ctx.font=font();const measured=ctx.measureText(value).width;if(measured>maxWidth){sz*=maxWidth/measured;ctx.font=font();}ctx.fillText(value,x,cy);}
 function rect(x,yy,ww,hh,color,r=0){ctx.fillStyle=color;ctx.beginPath();if(r&&ctx.roundRect)ctx.roundRect(x,yy,ww,hh,r);else ctx.rect(x,yy,ww,hh);ctx.fill();}
 function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
 // A consistent hierarchy: name first, then contact, then supporting brand copy.
 const name=o.name||o.company||o.tagline,brand=o.name?o.company:'',tag=o.name||o.company?o.tagline:'';
 if(o.theme==='ribbon'){
  ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(w*.57,y);ctx.lineTo(w,y);ctx.lineTo(w,h);ctx.lineTo(w*.50,h);ctx.closePath();ctx.fill();
  ctx.globalAlpha=.14;ctx.beginPath();ctx.moveTo(w*.54,y);ctx.lineTo(w*.56,y);ctx.lineTo(w*.49,h);ctx.lineTo(w*.47,h);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  text(brand,p,y+bh*.22,w*.42,bh*.16,fg,600);text(name,p,y+bh*.55,w*.40,bh*.36,fg,800);text(tag,p,y+bh*.85,w*.39,bh*.13,fg,500);
  text('預約賞屋',w*.63,y+bh*.25,w*.30,bh*.12,afg,600);
  rect(w*.59,y+bh*.43,w*.375,bh*.39,'#ffffff',bh*.09);
  text(o.phone,w*.615,y+bh*.635,w*.325,bh*.245,'#172b3b',700);
 }else if(o.theme==='clean'){
  rect(0,y,w,bh*.025,accent);rect(p,y+bh*.23,w*.005,bh*.53,accent,bh*.02);
  text(brand,p+w*.021,y+bh*.22,w*.42,bh*.145,fg,500);text(name,p+w*.021,y+bh*.55,w*.42,bh*.36,fg,800);text(tag,p+w*.021,y+bh*.85,w*.42,bh*.13,fg,500);
  ctx.globalAlpha=.08;rect(w*.57,y+bh*.16,w*.40,bh*.69,accent,bh*.12);ctx.globalAlpha=1;
  text('CONTACT  /  歡迎洽詢',w*.595,y+bh*.34,w*.34,bh*.115,fg,500);text(o.phone,w*.595,y+bh*.64,w*.34,bh*.245,fg,700);
 }else if(o.theme==='editorial'){
  rect(0,y,w*.012,bh,accent);line(p,y+bh*.14,w*.95,y+bh*.14,accent,Math.max(1,w*.001));
  text(brand,p,y+bh*.32,w*.25,bh*.15,fg,600);text(tag,p,y+bh*.63,w*.25,bh*.135,fg,500);
  line(w*.32,y+bh*.29,w*.32,y+bh*.83,accent,Math.max(1,w*.001));
  text(name,w*.35,y+bh*.57,w*.285,bh*.36,fg,700);
  rect(w*.685,y+bh*.32,w*.265,bh*.04,accent);text(o.phone,w*.685,y+bh*.63,w*.27,bh*.24,fg,700);
 }else{
  rect(0,y,w,bh*.025,accent);ctx.globalAlpha=.07;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(w*.96,y-bh*.18,bh*1.55,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  line(p,y+bh*.22,p+w*.04,y+bh*.22,accent,Math.max(1,bh*.018));text(brand,p+w*.055,y+bh*.22,w*.39,bh*.145,accent,500);
  text(name,p,y+bh*.56,w*.46,bh*.37,fg,800);text(tag,p,y+bh*.86,w*.46,bh*.13,accent,500);
  line(w*.57,y+bh*.24,w*.57,y+bh*.79,accent,Math.max(1,w*.001));text('預約專線',w*.615,y+bh*.31,w*.32,bh*.115,accent,500);text(o.phone,w*.615,y+bh*.63,w*.32,bh*.245,fg,700);
 }
 ctx.restore();
}
function save(){try{localStorage.setItem('_crmBrandBanner',JSON.stringify(current));}catch(_){}}
function mount(section,change){host=section;onchange=change;try{const saved=JSON.parse(localStorage.getItem('_crmBrandBanner')||'{}');for(const key of Object.keys(defaults))if(saved[key]!==undefined)current[key]=saved[key];}catch(_){}
 if(!themes[current.theme])current.theme='navy';for(const key of ['primary','accent'])if(!/^#[0-9a-f]{6}$/i.test(current[key]))current[key]=defaults[key];
 host.innerHTML='<label class="ic-section-title"><input type="checkbox" id="icUseBrand">個人品牌底條</label><div id="icBrandBody" hidden><div class="ic-brand-templates" id="icBrandTemplates"></div><p class="ic-note">選版型後可改內容與配色。設定保存在此瀏覽器。</p>'+[['company','品牌／店名'],['name','姓名／稱呼'],['phone','電話／聯絡方式'],['tagline','標語／補充文字']].map(([key,label])=>'<label class="it-lb" for="icBrand_'+key+'">'+label+'</label><input class="it-in" id="icBrand_'+key+'" maxlength="80" type="text">').join('')+'<div class="ic-brand-colors"><label>底色 <input type="color" id="icBrand_primary"></label><label>重點色 <input type="color" id="icBrand_accent"></label></div><label class="it-lb" for="icBrand_font">字體</label><select class="it-in" id="icBrand_font"><option value="sans">黑體</option><option value="serif">明體</option><option value="kai">楷體</option></select><label class="it-lb" for="icBrand_height">底條高度 <span id="icBrandHeight"></span></label><input type="range" min="10" max="24" id="icBrand_height"><p class="ic-note">長文字會自動縮小；建議品牌、姓名與電話保持簡短。人物可另行移動至底條上方。</p></div>';
 for(const [key,theme] of Object.entries(themes)){const b=document.createElement('button');b.type='button';b.dataset.theme=key;b.setAttribute('aria-label',theme.name);const c=document.createElement('canvas');c.width=720;c.height=144;const temp=document.createElement('canvas');temp.width=720;temp.height=600;draw(temp.getContext('2d'),720,600,{...defaults,...theme,theme:key,height:24,company:'品牌名稱',name:'您的姓名',phone:'0912-345-678',tagline:'陪你找到理想的家'});c.getContext('2d').drawImage(temp,0,456,720,144,0,0,720,144);const label=document.createElement('span');label.textContent=theme.name;b.append(c,label);b.onclick=()=>{current.theme=key;current.primary=theme.primary;current.accent=theme.accent;sync();save();onchange();};$('icBrandTemplates').append(b);}
 for(const key of Object.keys(defaults).filter(k=>k!=='theme')){$('icBrand_'+key).oninput=e=>{current[key]=key==='height'?Number(e.target.value):e.target.value;sync();save();onchange();};}
 palette($('icBrand_primary'));palette($('icBrand_accent'));fontOptions($('icBrand_font'));
 $('icUseBrand').onchange=()=>{sync();onchange();};sync();
}
function sync(){if(!host)return;$('icBrandBody').hidden=false;for(const key of Object.keys(defaults).filter(k=>k!=='theme'))$('icBrand_'+key).value=current[key];$('icBrandHeight').textContent=current.height+'%';host.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===current.theme)));}
const colors=[['黑','#000000'],['白','#ffffff'],['灰','#808080'],['紅','#e53935'],['橘','#f57c00'],['黃','#ffca28'],['綠','#2e7d32'],['青','#008b8b'],['藍','#1565c0'],['深藍','#173756'],['紫','#7b1fa2'],['粉紅','#ec407a'],['棕','#795548'],['金','#d4af62'],['米白','#f4eee3'],['淺藍','#81d4fa']];
function palette(input){const wrap=document.createElement('div');wrap.className='ic-palette';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','常用顏色');for(const [name,value] of colors){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.style.background=value;b.onclick=()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};wrap.append(b);}const parent=input.closest('.ic-brand-colors');if(parent){const row=document.createElement('div');row.className='ic-brand-color-row';input.parentElement.append(row);row.append(wrap);}else input.parentElement.append(wrap);}
function fontOptions(select){for(const [value,label] of [['light','細黑體'],['book','細明體'],['italic','斜體黑體']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}}
function enhanceCaption(){palette($('itCapColor'));fontOptions($('itCapFont'));}
window.BrandBanner={mount,enhanceCaption,options:()=>({...current,enabled:!!$('icUseBrand')?.checked}),height,draw};
})();
