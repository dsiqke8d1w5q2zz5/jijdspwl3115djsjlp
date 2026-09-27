/* Reusable local brand banners. Text is drawn as canvas text, never HTML. */
(function(){
'use strict';
const themes={navy:{name:'曜金名片',primary:'#173756',accent:'#d4af62'},ribbon:{name:'活力斜切',primary:'#ffbf00',accent:'#b82029'},clean:{name:'清透留白',primary:'#ffffff',accent:'#078b91'},editorial:{name:'暖調編輯',primary:'#f4eee3',accent:'#896441'},floating:{name:'懸浮圓角',primary:'#ffffff',accent:'#366653'},stacked:{name:'都會雙層',primary:'#23364d',accent:'#c7e5e8'},sticker:{name:'個性貼紙',primary:'#fff0b8',accent:'#cf4936'},outline:{name:'極簡框線',primary:'#f9f7f2',accent:'#393633'},arc:{name:'弧光名片',primary:'#342b48',accent:'#ead4bd'},twin:{name:'分離雙卡',primary:'#f2f5f8',accent:'#285776'}};
const defaults={theme:'navy',primary:'#173756',accent:'#d4af62',company:'',name:'',phone:'',tagline:'',height:15,font:'sans',brandSize:100,nameSize:100,phoneSize:100,tagSize:100,width:100,position:'right'};
let current={...defaults},host,onchange;
const $=id=>document.getElementById(id);
function contrast(hex){const n=parseInt(hex.slice(1),16);return (((n>>16)*.299+((n>>8)&255)*.587+(n&255)*.114)>155)?'#172b3b':'#ffffff';}
function height(h,o){return h*Math.max(10,Math.min(24,Number(o.height)||15))/100;}
function draw(ctx,w,h,o){
 const full=w;w=full*Math.max(45,Math.min(100,Number(o.width)||100))/100;const offset=o.position==='left'?0:o.position==='center'?(full-w)/2:full-w;
 const bh=height(h,o),y=h-bh,primary=o.primary,accent=o.accent,fg=contrast(primary),afg=contrast(accent);
 const family=({sans:'"Microsoft JhengHei","PingFang TC",sans-serif',serif:'"PMingLiU","Songti TC",serif',kai:'"DFKai-SB","BiauKai","KaiTi",serif'})[o.font==='book'?'serif':o.font]||'"Microsoft JhengHei","PingFang TC",sans-serif';
 const size=k=>Math.max(60,Math.min(160,Number(o[k])||100))/100;
 const font=(sz,weight)=>(o.font==='italic'?'italic ':'')+(['light','book'].includes(o.font)?Math.min(weight,500):weight)+' '+sz+'px '+family;
 function metric(value,sz,weight){ctx.font=font(sz,weight);const m=ctx.measureText(value);return {value,sz,weight,w:m.width,a:m.actualBoundingBoxAscent||0,d:m.actualBoundingBoxDescent||0};}
 function paint(t,x,cy,color){if(!t.value)return;ctx.font=font(t.sz,t.weight);ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillText(t.value,x,cy+(t.a-t.d)/2);}
 function roundedRect(x,yy,ww,hh,r){r=Math.max(0,Math.min(r,ww/2,hh/2));ctx.beginPath();ctx.moveTo(x+r,yy);ctx.arcTo(x+ww,yy,x+ww,yy+hh,r);ctx.arcTo(x+ww,yy+hh,x,yy+hh,r);ctx.arcTo(x,yy+hh,x,yy,r);ctx.arcTo(x,yy,x+ww,yy,r);ctx.closePath();}
 function rect(x,yy,ww,hh,color,r=bh*.10){if(ww<=0)return;ctx.fillStyle=color;roundedRect(x,yy,ww,hh,r);ctx.fill();}
 function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();const first=points[0],last=points[points.length-1];ctx.moveTo((first[0]+last[0])/2,(first[1]+last[1])/2);points.forEach((v,i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length],r=Math.min(bh*.09,Math.hypot(v[0]-prev[0],v[1]-prev[1])/4,Math.hypot(v[0]-next[0],v[1]-next[1])/4);ctx.arcTo(v[0],v[1],next[0],next[1],r);});ctx.closePath();ctx.fill();}
 function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
 ctx.save();ctx.translate(offset,0);roundedRect(0,y,w,bh,bh*.12);ctx.clip();ctx.lineCap='round';ctx.lineJoin='round';
 let brand=metric(o.company||'',bh*.235*size('brandSize'),700),name=metric(o.name||'',bh*.36*size('nameSize'),800),phone=metric(o.phone||'',bh*.35*size('phoneSize'),800),tag=metric(o.tagline||'',bh*.15*size('tagSize'),500);
 const stacked=o.theme==='stacked';
 let nameGap=brand.value&&name.value?bh*.13:0,contactGap=(brand.value||name.value)&&phone.value?bh*.42:0,pad=phone.value?bh*.16:0;
 let identityWidth=brand.w+nameGap+name.w;
 if(!identityWidth&&tag.value)identityWidth=Math.min(tag.w,w*.4);
 const naturalWidth=stacked?Math.max(identityWidth,phone.w+2*pad+(tag.value?tag.w+bh*.22:0)):identityWidth+contactGap+phone.w+2*pad;
 let rowH=Math.max(brand.a+brand.d,name.a+name.d,stacked?0:phone.a+phone.d),tagH=tag.a+tag.d,gap=tag.value?bh*.11:0;
 const naturalHeight=stacked?rowH+Math.max(phone.a+phone.d,tagH)+bh*.10:rowH+tagH+gap;
 const innerHeight=['floating','sticker','outline','twin'].includes(o.theme)?.66:.78;
 const fit=Math.min(1.65,w*.90/Math.max(1,naturalWidth),bh*(stacked?.82:innerHeight)/Math.max(1,naturalHeight));
 [brand,name,phone,tag]=[brand,name,phone,tag].map(t=>metric(t.value,t.sz*fit,t.weight));nameGap*=fit;contactGap*=Math.min(1,fit);pad*=Math.min(1,fit);identityWidth*=fit;gap*=fit;
 if(tag.w>Math.max(identityWidth,w*.15))tag=metric(tag.value,tag.sz*Math.max(identityWidth,w*.15)/tag.w,500);
 rowH=Math.max(brand.a+brand.d,name.a+name.d,stacked?0:phone.a+phone.d);tagH=tag.a+tag.d;
 const totalHeight=stacked?rowH+Math.max(phone.a+phone.d,tagH)+bh*.10*fit:rowH+tagH+gap;
 const cy=y+(bh-totalHeight)/2+rowH/2;
 const totalWidth=stacked?Math.max(identityWidth,phone.w+2*pad):identityWidth+contactGap+phone.w+2*pad;
 const bottomWidth=phone.w+(tag.value?tag.w+bh*.22*fit:0);
 const ix=(w-totalWidth)/2,px=stacked?(w-bottomWidth)/2+(tag.value?tag.w+bh*.22*fit:0):ix+identityWidth+contactGap+pad;
 const pc=stacked?cy+rowH/2+bh*.10*fit+Math.max(phone.a+phone.d,tagH)/2:cy;
 const boxX=px-pad,boxW=phone.w+pad*2,boxH=Math.max(phone.a+phone.d,stacked?0:rowH)+bh*(stacked?.12:.16)*fit;
 const split=boxX-contactGap*.45;
 const cardLeft=Math.max(w*.018,ix-bh*.18),cardRight=Math.min(w*.982,px+phone.w+bh*.18);
 let brandColor=fg,phoneColor=fg;
 if(!['floating','sticker','outline','twin'].includes(o.theme))rect(0,y,w,bh,primary);
 switch(o.theme){
 case 'floating':
  ctx.save();ctx.shadowColor='#00000020';ctx.shadowBlur=bh*.045;ctx.shadowOffsetY=bh*.02;rect(w*.018,y+bh*.07,w*.964,bh*.86,primary,bh*.16);ctx.restore();
  line(cardLeft,y+bh*.29,cardLeft,y+bh*.71,accent,Math.max(2,bh*.025));brandColor=accent;
  if(phone.value){rect(boxX,pc-boxH/2,boxW,boxH,accent,boxH/2);phoneColor=afg;}break;
 case 'ribbon':
  if(phone.value){ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(split+bh*.12,y);ctx.lineTo(w,y);ctx.lineTo(w,h);ctx.lineTo(split-bh*.12,h);ctx.closePath();ctx.fill();rect(boxX,pc-boxH/2,boxW,boxH,'#ffffff',bh*.06);phoneColor='#172b3b';}break;
 case 'clean':rect(0,y,w,bh*.025,accent);line(cardLeft,y+bh*.29,cardLeft,y+bh*.71,accent,Math.max(2,bh*.025));if(phone.value){ctx.globalAlpha=.08;rect(boxX,pc-boxH/2,boxW,boxH,accent,bh*.07);ctx.globalAlpha=1;}break;
 case 'editorial':rect(0,y,w*.009,bh,accent);line(w*.035,h-bh*.12,w*.965,h-bh*.12,accent,Math.max(1,w*.001));if(phone.value&&identityWidth)line(split,cy-rowH*.48,split,cy+rowH*.48,accent,Math.max(1,w*.001));break;
 case 'arc':if(phone.value){ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(split+bh*.15,y);ctx.bezierCurveTo(split-bh*.25,y+bh*.25,split-bh*.25,y+bh*.75,split+bh*.15,h);ctx.lineTo(w,h);ctx.lineTo(w,y);ctx.closePath();ctx.fill();phoneColor=afg;}break;
 case 'twin':rect(cardLeft,y+bh*.07,Math.max(identityWidth+bh*.30,split-cardLeft-bh*.05),bh*.86,primary,bh*.05);line(cardLeft,y+bh*.10,cardLeft,y+bh*.90,accent,Math.max(2,bh*.025));if(phone.value){rect(boxX,Math.max(y+bh*.07,pc-boxH*.7),boxW,Math.min(boxH*1.4,bh*.86),accent,bh*.06);phoneColor=afg;}break;
 case 'sticker':polygon([[cardLeft+bh*.05,y+bh*.15],[split,y+bh*.10],[split-bh*.06,h-bh*.06],[cardLeft,h-bh*.10]],accent);polygon([[cardLeft,y+bh*.07],[split-bh*.05,y+bh*.04],[split-bh*.10,h-bh*.12],[cardLeft-bh*.04,h-bh*.15]],primary);if(phone.value){rect(boxX,pc-boxH/2,boxW,boxH,accent,bh*.07);phoneColor=afg;}break;
 case 'outline':rect(w*.018,y+bh*.07,w*.964,bh*.86,primary);ctx.strokeStyle=accent;ctx.lineWidth=Math.max(1,w*.001);roundedRect(w*.03,y+bh*.14,w*.94,bh*.72,bh*.08);ctx.stroke();break;
 case 'stacked':if(phone.value){rect(w*.025,pc-boxH/2,w*.95,boxH,accent,bh*.04);phoneColor=afg;}break;
 default:rect(0,y,w,bh*.025,accent);brandColor=accent;if(phone.value&&identityWidth)line(split,cy-rowH*.48,split,cy+rowH*.48,accent,Math.max(1,w*.001));break;
 }
 const identityX=stacked?(w-identityWidth)/2:ix;
 paint(brand,identityX,cy,brandColor);paint(name,identityX+brand.w+nameGap,cy,fg);paint(phone,px,pc,phoneColor);
 if(tag.value){const tagCy=stacked?pc:cy+rowH/2+gap+tagH/2;paint(tag,stacked?(w-bottomWidth)/2:identityX,tagCy,stacked&&phone.value?afg:fg);}
 ctx.restore();
}
function save(){try{localStorage.setItem('_crmBrandBanner',JSON.stringify(current));}catch(_){}}
function mount(section,change){host=section;onchange=change;try{const saved=JSON.parse(localStorage.getItem('_crmBrandBanner')||'{}');for(const key of Object.keys(defaults))if(saved[key]!==undefined)current[key]=saved[key];}catch(_){}
 if(!themes[current.theme])current.theme='navy';for(const key of ['primary','accent'])if(!/^#[0-9a-f]{6}$/i.test(current[key]))current[key]=defaults[key];
 host.innerHTML='<label class="ic-section-title"><input type="checkbox" id="icUseBrand">個人品牌底條</label><div id="icBrandBody" hidden><div class="ic-brand-templates" id="icBrandTemplates"></div><p class="ic-note">選版型後可改內容與配色。設定保存在此瀏覽器。</p>'+[['company','品牌／店名'],['name','姓名／稱呼'],['phone','電話／聯絡方式'],['tagline','標語／補充文字']].map(([key,label])=>'<label class="it-lb" for="icBrand_'+key+'">'+label+'</label><input class="it-in" id="icBrand_'+key+'" maxlength="80" type="text">').join('')+[['brandSize','品牌大小'],['nameSize','姓名大小'],['phoneSize','電話大小'],['tagSize','標語大小']].map(([key,label])=>'<label class="it-lb" for="icBrand_'+key+'">'+label+' <span id="icBrandValue_'+key+'"></span></label><input type="range" min="60" max="160" step="5" id="icBrand_'+key+'">').join('')+'<label class="it-lb" for="icBrand_width">底條寬度 <span id="icBrandWidth"></span></label><input type="range" min="45" max="100" step="5" id="icBrand_width"><label class="it-lb" for="icBrand_position">底條位置</label><select class="it-in" id="icBrand_position"><option value="left">靠左</option><option value="center">置中</option><option value="right">靠右</option></select><div class="ic-actions" style="margin-top:10px"><button type="button" id="icBrandRoom">左側留人物</button><button type="button" id="icBrandFull">恢復滿版</button></div><p class="ic-note">縮窄底條後，可在「人物合成」拖曳人物至留出的空間。</p><div class="ic-brand-colors"><label>底色 <input type="color" id="icBrand_primary"></label><label>重點色 <input type="color" id="icBrand_accent"></label></div><label class="it-lb" for="icBrand_font">字體</label><select class="it-in" id="icBrand_font"><option value="sans">黑體</option><option value="serif">明體</option><option value="kai">楷體</option></select><label class="it-lb" for="icBrand_height">底條高度 <span id="icBrandHeight"></span></label><input type="range" min="10" max="24" id="icBrand_height"><p class="ic-note">長文字會自動縮小；建議品牌、姓名與電話保持簡短。人物可另行移動至底條上方。</p></div>';
 for(const [key,theme] of Object.entries(themes)){const b=document.createElement('button');b.type='button';b.dataset.theme=key;b.setAttribute('aria-label',theme.name);const c=document.createElement('canvas');c.width=720;c.height=144;const temp=document.createElement('canvas');temp.width=720;temp.height=600;draw(temp.getContext('2d'),720,600,{...defaults,...theme,theme:key,height:24,company:'品牌名稱',name:'您的姓名',phone:'0912-345-678',tagline:'陪你找到理想的家'});c.getContext('2d').drawImage(temp,0,456,720,144,0,0,720,144);const label=document.createElement('span');label.textContent=theme.name;b.append(c,label);b.onclick=()=>{current.theme=key;current.primary=theme.primary;current.accent=theme.accent;sync();save();onchange();};$('icBrandTemplates').append(b);}
 for(const key of Object.keys(defaults).filter(k=>k!=='theme')){$('icBrand_'+key).oninput=e=>{current[key]=(key==='height'||key==='width'||key.endsWith('Size'))?Number(e.target.value):e.target.value;sync();save();onchange();};}
 $('icBrandRoom').onclick=()=>{current.width=70;current.position='right';sync();save();onchange();};$('icBrandFull').onclick=()=>{current.width=100;sync();save();onchange();};
 palette($('icBrand_primary'));palette($('icBrand_accent'));fontOptions($('icBrand_font'));
 $('icUseBrand').onchange=()=>{sync();onchange();};sync();
}
function sync(){if(!host)return;$('icBrandBody').hidden=false;for(const key of Object.keys(defaults).filter(k=>k!=='theme'))$('icBrand_'+key).value=current[key];$('icBrandHeight').textContent=current.height+'%';$('icBrandWidth').textContent=current.width+'%';for(const key of ['brandSize','nameSize','phoneSize','tagSize'])$('icBrandValue_'+key).textContent=current[key]+'%';host.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===current.theme)));}
const colors=[['黑','#000000'],['白','#ffffff'],['灰','#808080'],['紅','#e53935'],['橘','#f57c00'],['黃','#ffca28'],['綠','#2e7d32'],['青','#008b8b'],['藍','#1565c0'],['深藍','#173756'],['紫','#7b1fa2'],['粉紅','#ec407a'],['棕','#795548'],['金','#d4af62'],['米白','#f4eee3'],['淺藍','#81d4fa']];
function palette(input){const wrap=document.createElement('div');wrap.className='ic-palette';wrap.setAttribute('role','group');wrap.setAttribute('aria-label','常用顏色');for(const [name,value] of colors){const b=document.createElement('button');b.type='button';b.title=name;b.setAttribute('aria-label',name);b.style.background=value;b.onclick=()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));};wrap.append(b);}const parent=input.closest('.ic-brand-colors');if(parent){const row=document.createElement('div');row.className='ic-brand-color-row';input.parentElement.append(row);row.append(wrap);}else input.parentElement.append(wrap);}
function fontOptions(select){for(const [value,label] of [['light','細黑體'],['book','細明體'],['italic','斜體黑體']]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}}
function enhanceCaption(){palette($('itCapColor'));fontOptions($('itCapFont'));}
window.BrandBanner={mount,enhanceCaption,options:()=>({...current,enabled:!!$('icUseBrand')?.checked}),height,draw};
})();
