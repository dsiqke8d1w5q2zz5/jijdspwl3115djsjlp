/* Review AI results before adopting a separate photo. Originals remain in the editor. */
(function(){
 'use strict';
 function mount(api){
  const host=document.getElementById('icEnhanceSection'),box=document.createElement('div');box.className='ic-ai-entry';box.innerHTML='<h4>免費 AI 處理</h4><div class="ic-actions"><button type="button" id="icAIRemove">圈選移除雜物</button></div><p class="ic-note">照片留在瀏覽器內運算，無需金鑰或按張付費。首次使用需下載模型。</p>';
  host.querySelector('h3').after(box);
  function sync(){for(const button of box.querySelectorAll('button'))button.disabled=!api.source()||api.busy();}
  async function open(){
   const mode='remove';
   const source=api.source();if(!source||api.busy())return;api.lock(true);
   const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='ic-ai-dialog';dialog.id='icAIDialog';dialog.setAttribute('aria-labelledby','icAITitle');
   dialog.innerHTML='<header><h3 id="icAITitle">圈選移除雜物</h3><button type="button" id="icAIClose" aria-label="關閉 AI 處理">×</button></header><div class="ic-ai-body"><p class="ic-note" id="icAIHint"></p><div class="ic-ai-settings"><label id="icAIQualityLabel">處理品質 <select id="icAIQuality"></select></label><button type="button" id="icAIClear">清除圈選</button><button type="button" id="icAIRun" class="ic-primary">開始 AI 處理</button><button type="button" id="icAICancel" hidden>取消處理</button></div><p id="icAIStatus" role="status" aria-live="polite"></p><div class="ic-ai-images"><figure><figcaption>處理前 <span id="icAISourceSize"></span></figcaption><canvas id="icAIBefore" tabindex="0" aria-label="原照片；拖曳圈選雜物，可用方向鍵移動選區"></canvas></figure><figure id="icAIResult" hidden><figcaption>AI 成品 <span id="icAIResultSize"></span></figcaption><canvas id="icAIAfter"></canvas></figure></div><p class="ic-note">AI 處理照片底圖；採用後接回目前的裁切、文字與遮蔽設定。補出的細節及被遮住的區域屬於推測，請先核對成品。</p></div><footer><button type="button" id="icAIDownload" disabled>下載成品</button><button type="button" id="icAIAdopt" class="ic-primary" disabled>採用成品</button><span>原圖保留，成品另加一張。</span></footer>';
   document.body.append(dialog);dialog.showModal();
   const $=id=>dialog.querySelector('#'+id),before=$('icAIBefore'),after=$('icAIAfter'),sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height,scale=Math.min(1,1200/Math.max(sw,sh));before.width=Math.round(sw*scale);before.height=Math.round(sh*scale);before.style.setProperty('--ai-ratio',sw/sh);
   $('icAISourceSize').textContent=sw+' × '+sh;if(mode==='remove')$('icAIQuality').innerHTML='<option value="fine">精細修補 · LaMa（約 59 MB）</option><option value="fast">較快修補 · MI-GAN（約 27 MB）</option>';$('icAIClear').hidden=mode!=='remove';before.dataset.selectable=String(mode==='remove');
   $('icAIHint').textContent='在原圖拖曳框住一件雜物，包含物品邊緣，再開始處理。精細模式較適合牆面、地板與背景；每次處理一件物品。';
   let rect=null,start=null,result=null,running=false,closed=false,adopting=false;
   function draw(){const c=before.getContext('2d');c.clearRect(0,0,before.width,before.height);c.drawImage(source,0,0,before.width,before.height);if(rect){c.fillStyle='#e11d4855';c.strokeStyle='#e11d48';c.lineWidth=Math.max(2,before.width/350);c.fillRect(rect.x*before.width,rect.y*before.height,rect.w*before.width,rect.h*before.height);c.strokeRect(rect.x*before.width,rect.y*before.height,rect.w*before.width,rect.h*before.height);}}
   function controls(){const ready=!!result&&!running&&!adopting;$('icAIRun').disabled=running||adopting||(mode==='remove'&&!rect);$('icAIClear').disabled=running||adopting||!rect;$('icAIQuality').disabled=running||adopting;$('icAICancel').hidden=!running;$('icAIAdopt').disabled=!ready;$('icAIDownload').disabled=!ready;}
   const point=e=>{const r=before.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.x)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.y)/r.height))};};
   function invalidate(){result=null;$('icAIResult').hidden=true;controls();}
   before.onpointerdown=e=>{if(mode!=='remove'||running||adopting||e.button!==0)return;start=point(e);rect=null;invalidate();before.setPointerCapture(e.pointerId);before.focus();e.preventDefault();};
   before.onpointermove=e=>{if(!start)return;const p=point(e);rect={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(start.x-p.x),h:Math.abs(start.y-p.y)};draw();};
   before.onpointerup=e=>{if(!start)return;start=null;if(!rect||rect.w*sw<3||rect.h*sh<3)rect=null;draw();controls();};
   before.onpointercancel=before.onlostpointercapture=()=>{if(start){start=null;rect=null;draw();controls();}};
   before.onkeydown=e=>{if(!rect||running||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Delete'].includes(e.key))return;e.preventDefault();if(e.key==='Delete')rect=null;else{const step=e.shiftKey?.03:.005;rect.x=Math.max(0,Math.min(1-rect.w,rect.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)));rect.y=Math.max(0,Math.min(1-rect.h,rect.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)));}invalidate();draw();};
   $('icAIClear').onclick=()=>{rect=null;invalidate();draw();};$('icAIQuality').onchange=invalidate;
   $('icAIRun').onclick=async()=>{if(running||adopting)return;running=true;result=null;$('icAIResult').hidden=true;controls();$('icAIStatus').textContent='準備處理…';try{const output=await ImageAI.run(source,mode,rect,text=>{if(!closed)$('icAIStatus').textContent=text;},Number($('icAIQuality').value),$('icAIQuality').value);if(closed)return;result=output;const ratio=Math.min(1,1200/Math.max(output.width,output.height));after.width=Math.round(output.width*ratio);after.height=Math.round(output.height*ratio);after.style.setProperty('--ai-ratio',output.width/output.height);after.getContext('2d').drawImage(output,0,0,after.width,after.height);$('icAIResult').hidden=false;$('icAIResultSize').textContent=output.width+' × '+output.height;$('icAIStatus').textContent='處理完成。請比較細節，確認後採用或下載。';}catch(error){if(!closed)$('icAIStatus').textContent=error.message.includes('取消')?'已取消，原圖保留。':'處理未完成：'+String(error.message).slice(0,180)+'。可重試或改用較快品質。';}finally{running=false;if(!closed)controls();}};
   $('icAICancel').onclick=()=>ImageAI.cancel();$('icAIClose').onclick=()=>{if(!adopting)dialog.close();};
   $('icAIDownload').onclick=async()=>{if(!result)return;try{ImageStorage.download(await ImageStorage.blob(result),api.name().replace(/\.[^.]+$/,'')+'_AI去雜物'+'.png');}catch(error){$('icAIStatus').textContent='下載失敗：'+error.message;}};
   $('icAIAdopt').onclick=async()=>{if(!result||adopting)return;adopting=true;controls();try{await api.adopt(result,mode);dialog.close();}catch(error){$('icAIStatus').textContent='加入成品失敗：'+error.message;adopting=false;controls();}};
   dialog.addEventListener('cancel',e=>{if(adopting)e.preventDefault();});dialog.addEventListener('close',()=>{closed=true;ImageAI.cancel();api.lock(false);dialog.remove();previous?.focus();});draw();controls();
  }
  box.querySelector('#icAIRemove').onclick=()=>open('remove');sync();return {sync};
 }
 window.ImageAIEditor={mount};
})();
