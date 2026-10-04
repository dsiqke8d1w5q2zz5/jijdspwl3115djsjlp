/* Local, reversible photo adjustments. Runs before text, logos, portraits and redaction. */
(function(){
 'use strict';
 const fields=[['brightness','明暗',-40,40],['shadows','暗部細節',0,60],['saturation','色彩',-40,40],['warmth','冷暖',-30,30],['sharpness','清晰度',0,60]];
 function clean(value){const raw=value&&typeof value==='object'?value:{};const out={auto:raw.auto===true};for(const [key,,min,max] of fields)out[key]=Number.isFinite(Number(raw[key]))?Math.max(min,Math.min(max,Number(raw[key]))):0;return out;}
 const active=s=>s.auto||fields.some(([key])=>s[key]!==0);
 function apply(canvas,raw){
  const s=clean(raw);if(!active(s))return;
  const ctx=canvas.getContext('2d'),image=ctx.getImageData(0,0,canvas.width,canvas.height),data=image.data;
  // A bounded midtone correction protects highlights and avoids amplifying very dark photos excessively.
  let gamma=1;
  if(s.auto){const hist=new Uint32Array(256);let total=0;for(let i=0;i<data.length;i+=64){if(data[i+3]<240)continue;hist[Math.round(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])]++;total++;}if(total){let n=0,median=128;for(let i=0;i<256;i++){n+=hist[i];if(n>=total/2){median=i;break;}}gamma=median>8&&median<247?Math.max(.82,Math.min(1.12,Math.log(.48)/Math.log(median/255))):1;}}
  gamma*=Math.pow(2,-s.brightness/70);
  const lut=new Float32Array(256);for(let i=0;i<256;i++)lut[i]=255*Math.pow(i/255,gamma);
  const saturation=1+(s.saturation+(s.auto?3:0))/100,shadow=(s.shadows+(s.auto?8:0))/100,warm=s.warmth*.3;
  for(let i=0;i<data.length;i+=4){if(!data[i+3])continue;const r=lut[data[i]],g=lut[data[i+1]],b=lut[data[i+2]],l=.2126*r+.7152*g+.0722*b,lift=shadow*55*Math.pow(1-l/255,2)*(l/(l+12));
   data[i]=l+(r-l)*saturation+lift+warm;data[i+1]=l+(g-l)*saturation+lift;data[i+2]=l+(b-l)*saturation+lift-warm;
  }
  if(s.sharpness){const source=new Uint8ClampedArray(data),stride=canvas.width*4,amount=s.sharpness/100;for(let y=1;y<canvas.height-1;y++)for(let x=1;x<canvas.width-1;x++){const i=y*stride+x*4;if(source[i+3]<250||source[i-4+3]<250||source[i+4+3]<250||source[i-stride+3]<250||source[i+stride+3]<250)continue;for(let k=0;k<3;k++){const detail=source[i+k]-(source[i-4+k]+source[i+4+k]+source[i-stride+k]+source[i+stride+k])/4;if(Math.abs(detail)>2)data[i+k]=source[i+k]+Math.max(-14,Math.min(14,detail*amount));}}}
  ctx.putImageData(image,0,0);
 }
 function mount(api){
  let settings=clean(),compare=false,frame=0;
  const host=document.createElement('section');host.id='icEnhanceSection';host.className='ic-section';
  host.innerHTML='<h3>圖片優化</h3><p class="ic-note">調整照片明暗、色彩與邊緣清晰度。</p><div class="ic-actions"><button type="button" id="icEnhanceAuto" class="ic-primary">自然優化</button><button type="button" id="icEnhanceReset">還原調整</button></div><p id="icEnhanceState" class="ic-note" role="status"></p><div class="ic-enhance-sliders"></div><p class="ic-note">照片原檔保留。清晰度可加強邊緣，無法還原失焦或原本沒有的細節。</p>';
  document.querySelector('.ic-controls').append(host);
  const button=document.createElement('button');button.type='button';button.id='icEnhanceCompare';button.textContent='查看優化前';button.setAttribute('aria-pressed','false');document.querySelector('.ic-view-tools').prepend(button);
  const inputs=new Map();
  for(const [key,label,min,max] of fields){const row=document.createElement('label');row.className='ic-enhance-slider';row.htmlFor='icEnhance_'+key;row.innerHTML='<span>'+label+'</span><output></output><input id="icEnhance_'+key+'" type="range" min="'+min+'" max="'+max+'" value="0" step="1">';host.querySelector('.ic-enhance-sliders').append(row);const input=row.querySelector('input');inputs.set(key,input);input.addEventListener('pointerdown',()=>api.flush());input.addEventListener('keydown',()=>api.flush());input.oninput=()=>{settings[key]=Number(input.value);compare=false;sync();cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>api.render());};input.onchange=()=>{cancelAnimationFrame(frame);api.render();api.flush();};}
  function sync(){const disabled=!api.hasPhoto()||api.busy();for(const [key,input]of inputs){input.value=settings[key];input.disabled=disabled;input.previousElementSibling.value=String(settings[key]);}host.querySelector('#icEnhanceAuto').disabled=disabled;host.querySelector('#icEnhanceReset').disabled=disabled||!active(settings);button.disabled=disabled||!active(settings);button.setAttribute('aria-pressed',String(compare));button.textContent=compare?'返回優化後':'查看優化前';host.querySelector('#icEnhanceState').textContent=!api.hasPhoto()?'先選擇照片，即可開始調整。':compare?'正在比較優化前；下載仍使用優化後的照片。':settings.auto?'自然優化已開啟，可繼續微調。':active(settings)?'已套用手動調整。':'尚未套用調整。';const tab=document.getElementById('icTab_enhance');if(tab)tab.dataset.enabled=String(active(settings));}
  function change(next){if(api.busy()||!api.hasPhoto())return;api.flush();settings=clean(next);compare=false;sync();api.render();api.flush();}
  host.querySelector('#icEnhanceAuto').onclick=()=>change({auto:true,sharpness:20});host.querySelector('#icEnhanceReset').onclick=()=>change({});
  button.onclick=()=>{if(api.busy())return;compare=!compare;sync();api.preview();};sync();
  return {options:()=>({...settings}),set:value=>{cancelAnimationFrame(frame);settings=clean(value);compare=false;sync();},sync,isComparing:()=>compare};
 }
 window.ImageEnhance={clean,apply,mount};
})();
