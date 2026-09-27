/* Crop, collage, movable text, reusable artwork and a local cutout repair brush. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id),copy=o=>JSON.parse(JSON.stringify(o));
 const defaults={guides:true,locks:{person:false,main:false,logo:false},frame:{ratio:'original',mode:'single',split:50,gap:0,zoom:100,x:50,y:50,secondZoom:100,secondX:50,secondY:50},texts:[],capPoint:{x:.5,y:.2},front:false,format:'jpeg',logo:{x:.85,y:.15,size:.15}};
 const families={sans:'"Microsoft JhengHei","PingFang TC",sans-serif',serif:'"PMingLiU","Songti TC",serif',kai:'"DFKai-SB","BiauKai",serif'};
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function clone(c){if(!c)return null;const out=canvas(c.width,c.height);out.getContext('2d').drawImage(c,0,0);return out;}
 const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
 function clean(raw={}){
  raw=raw&&typeof raw==='object'?raw:{};const s=copy(defaults),f=raw.frame||{};
  for(const k of ['ratio','mode'])if((k==='ratio'?['original','1','1.3333333333','1.7777777778','0.8','0.5625']:['single','lr','tb']).includes(f[k]))s.frame[k]=f[k];
  for(const k of ['x','y','secondX','secondY'])s.frame[k]=number(f[k],0,100,50);
  for(const k of ['zoom','secondZoom'])s.frame[k]=number(f[k],100,300,100);
  s.frame.split=number(f.split,25,75,50);s.frame.gap=number(f.gap,0,40,0);
  s.guides=raw.guides!==false;s.locks={person:raw.locks?.person===true,main:raw.locks?.main===true,logo:raw.locks?.logo===true};s.front=raw.front===true;s.format=raw.format==='png'?'png':'jpeg';
  s.capPoint={x:number(raw.capPoint?.x,0,1,.5),y:number(raw.capPoint?.y,0,1,.2)};
  s.logo={x:number(raw.logo?.x,0,1,.85),y:number(raw.logo?.y,0,1,.15),size:number(raw.logo?.size,.03,.5,.15)};
  s.texts=(Array.isArray(raw.texts)?raw.texts:[]).filter(t=>t&&typeof t==='object'&&!Array.isArray(t)).slice(0,6).map((t,i)=>({id:String(t.id||i).slice(0,80),locked:t.locked===true,text:String(t.text||'').slice(0,500),x:number(t.x,0,1,.5),y:number(t.y,0,1,.3),size:number(t.size,12,120,36),color:/^#[0-9a-f]{6}$/i.test(t.color)?t.color:'#ffffff',bg:number(t.bg,0,.9,.4),font:['sans','serif','kai','light','book','italic'].includes(t.font)?t.font:'sans'}));
  return s;
 }
 function mount(api){
  let settings=copy(defaults),second=null,secondName='',logo=null,boxes=[],targets=[],assetUrls=[],miniVisible=true;
  const change=()=>{api.render();};
  const crop=document.createElement('section');crop.id='icCropSection';crop.className='ic-section';
  crop.innerHTML=`<h3>裁切與拼版</h3><button type="button" id="icCropReset">還原裁切</button><p class="ic-note">回到原照片比例、單張與原始取景；已選的第二張照片仍保留。</p><label class="it-lb" for="icRatio">成品比例</label><select id="icRatio" class="it-in"><option value="original">原照片比例</option><option value="1">正方形 1:1</option><option value="1.3333333333">橫式 4:3</option><option value="1.7777777778">橫式 16:9</option><option value="0.8">直式 4:5</option><option value="0.5625">直式 9:16</option></select>
   <label class="it-lb" for="icFrameMode">排列</label><select id="icFrameMode" class="it-in"><option value="single">單張照片</option><option value="lr">左右雙圖</option><option value="tb">上下雙圖</option></select>
   <div id="icSecondControls"><label class="ic-file">選擇第二張照片<input type="file" id="icSecondFile" accept="image/*"></label><p id="icSecondName" class="ic-note">尚未選擇第二張照片</p><label class="it-lb">第一張占比 <input id="icSplit" type="range" min="25" max="75" value="50"></label><label class="it-lb">圖片間距 <input id="icFrameGap" type="range" min="0" max="40" value="0"></label></div>
   <p class="ic-note">裁切只影響成品，不改原圖。移動取景位置可保留重要區域。</p><div id="icFrameRanges"></div>`;
  $('icPersonSection')?.after(crop);if(!crop.isConnected)document.querySelector('.ic-controls').append(crop);
  for(const [id,title,min,max] of [['zoom','第一張放大',100,300],['x','第一張左右取景',0,100],['y','第一張上下取景',0,100],['secondZoom','第二張放大',100,300],['secondX','第二張左右取景',0,100],['secondY','第二張上下取景',0,100]]){
   const label=document.createElement('label');label.className='it-lb';label.textContent=title;
   const input=document.createElement('input');input.type='range';input.id='icFrame_'+id;input.min=min;input.max=max;input.value=settings.frame[id];label.append(input);$('icFrameRanges').append(label);input.oninput=()=>{settings.frame[id]=Number(input.value);change();};
  }
  for(const [id,key] of [['icRatio','ratio'],['icFrameMode','mode'],['icSplit','split'],['icFrameGap','gap']])$(id).oninput=()=>{settings.frame[key]=['ratio','mode'].includes(key)?$(id).value:Number($(id).value);sync();change();};
  $('icCropReset').onclick=()=>{if(api.busy())return;api.flush();settings.frame=copy(defaults.frame);sync();change();api.flush();api.status('已還原為原照片比例與單張取景，可按復原恢復。');};
  $('icSecondFile').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||api.busy())return;try{api.lock(true);second=await api.decode(f,4000);secondName=f.name;$('icSecondName').textContent=f.name;change();}catch(e){api.status(e.message,true);}finally{api.lock(false);}};
  const personBody=$('icPersonBody'),tools=document.createElement('div');tools.innerHTML=`<label class="ic-check"><input id="icLockPerson" type="checkbox">鎖定人物位置與大小</label><label class="ic-check"><input id="icPersonFront" type="checkbox">人物放在品牌底條前面</label><div class="ic-actions"><button id="icRepair" type="button">放大／修補去背</button></div>
   <details class="ic-asset-library"><summary>常用人物與標誌</summary><label class="it-lb" for="icAssetName">素材名稱</label><input id="icAssetName" class="it-in" maxlength="40" placeholder="例如：我的去背人物"><div class="ic-actions"><button id="icAssetSave" type="button">保存目前人物</button><label class="ic-file">匯入 PNG／圖片<input id="icAssetImport" type="file" accept="image/*"></label></div><p class="ic-note">素材存在這個瀏覽器。可選作人物或另加為標誌；更換裝置請另存 PNG。</p><div id="icAssets" class="ic-assets"></div><p id="icAssetStatus" class="ic-note" role="status"></p></details>
   <div id="icLogoControls" hidden><label class="ic-check"><input id="icLockLogo" type="checkbox">鎖定標誌位置與大小</label><label class="it-lb" for="icLogoSize">標誌大小</label><input id="icLogoSize" type="range" min="3" max="50" value="15"><button id="icLogoRemove" type="button">移除標誌</button><p class="ic-note">在預覽上拖曳標誌即可移動。</p></div>`;personBody.append(tools);
  for(const [id,key] of [['icLockPerson','person'],['icLockLogo','logo']])$(id).onchange=()=>{settings.locks[key]=$(id).checked;change();};
  $('icPersonFront').onchange=()=>{settings.front=$('icPersonFront').checked;change();};$('icLogoSize').oninput=()=>{settings.logo.size=Number($('icLogoSize').value)/100;change();};$('icLogoRemove').onclick=()=>{logo=null;sync();change();};
  $('icRepair').onclick=()=>repair(api);
  async function assets(){
   try{const rows=await ImageStorage.list();assetUrls.forEach(URL.revokeObjectURL);assetUrls=[];$('icAssets').replaceChildren();
    for(const row of rows){const card=document.createElement('div'),img=new Image(),name=document.createElement('span');card.className='ic-asset';const url=URL.createObjectURL(row.blob);assetUrls.push(url);img.src=url;img.alt=row.name;name.textContent=row.name;card.append(img,name);
     for(const [label,action] of [['用作人物',async()=>{const c=await api.decode(new File([row.blob],row.name+'.png',{type:'image/png'}),2560);api.setPerson(c,c);$('icUsePerson').checked=true;change();}],['加為標誌',async()=>{logo=await api.decode(new File([row.blob],row.name+'.png',{type:'image/png'}),1600);sync();change();}],['下載',()=>ImageStorage.download(row.blob,row.name+'.png')],['刪除',async()=>{if(confirm('確定刪除素材「'+row.name+'」？')){await ImageStorage.remove(row.id);await assets();}}]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=async()=>{if(api.busy())return;try{api.lock(true);await action();}catch(e){$('icAssetStatus').textContent='素材操作失敗，請重試。';}finally{api.lock(false);}};card.append(b);}$('icAssets').append(card);}
   }catch(e){$('icAssetStatus').textContent='無法讀取素材庫，請確認瀏覽器允許本機儲存。';}
  }
  async function saveAsset(c,fallback){const name=$('icAssetName').value.trim()||fallback;const rows=await ImageStorage.list();if(rows.length>=30)throw Error('最多保存 30 個素材，請先刪除不需要的素材。');await ImageStorage.put({id:crypto.randomUUID(),name,blob:await ImageStorage.blob(c)});await assets();$('icAssetStatus').textContent='已保存「'+name+'」。';}
  $('icAssetSave').onclick=async()=>{if(api.busy())return;if(!api.getPerson()){api.status('請先選擇人物照片。',true);return;}try{api.lock(true);await saveAsset(api.getPerson(),'去背人物');}catch(e){$('icAssetStatus').textContent=e.message||'素材儲存失敗。';}finally{api.lock(false);}};
  $('icAssetImport').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f||api.busy())return;try{api.lock(true);await saveAsset(await api.decode(f,2560),f.name.replace(/\.[^.]+$/,''));}catch(e){$('icAssetStatus').textContent=e.message;}finally{api.lock(false);}};assets();
  $('itCapPos').add(new Option('自由拖曳','free'));
  const texts=document.createElement('div');texts.innerHTML=`<label class="ic-check"><input id="icLockMain" type="checkbox">鎖定主文字位置與大小</label><p class="ic-note">選「自由拖曳」可移動主文字。新增文字可各自調整顏色、大小及位置。</p><button id="icTextAdd" type="button">＋ 新增文字</button><div id="icTextList"></div>`;$('itCapBox').append(texts);$('icLockMain').onchange=()=>{settings.locks.main=$('icLockMain').checked;change();};
  function textList(){
   const focus=document.activeElement,focusId=focus?.id,selection=focus?.selectionStart;$('icTextList').replaceChildren();
   for(const t of settings.texts){const box=document.createElement('div');box.className='ic-text-card';
    const input=document.createElement('textarea');input.id='icText_'+t.id;input.className='it-in';input.value=t.text;input.maxLength=500;input.setAttribute('aria-label','新增文字內容');input.oninput=()=>{t.text=input.value;change();};box.append(input);
    const row=document.createElement('div');row.className='ic-actions';
    const color=document.createElement('input');color.type='color';color.value=t.color;color.setAttribute('aria-label','文字顏色');color.oninput=()=>{t.color=color.value;change();};row.append(color);
    const font=document.createElement('select');font.setAttribute('aria-label','文字字體');for(const [v,n] of [['sans','黑體'],['serif','明體'],['kai','楷體'],['light','細黑體'],['book','細明體'],['italic','斜體黑體']])font.add(new Option(n,v));font.value=t.font;font.onchange=()=>{t.font=font.value;change();};row.append(font);
    const remove=document.createElement('button');remove.type='button';remove.textContent='刪除文字';remove.onclick=()=>{settings.texts=settings.texts.filter(x=>x.id!==t.id);textList();change();};row.append(remove);box.append(row);
    const palette=document.createElement('div');palette.className='ic-palette';for(const [label,value] of [['黑','#000000'],['白','#ffffff'],['灰','#808080'],['紅','#e53935'],['橘','#f57c00'],['黃','#ffca28'],['綠','#2e7d32'],['青','#008b8b'],['藍','#1565c0'],['深藍','#173756'],['紫','#7b1fa2'],['粉','#ec407a'],['棕','#795548'],['金','#d4af62'],['米白','#f4eee3'],['淺藍','#81d4fa']]){const b=document.createElement('button');b.type='button';b.style.background=value;b.title=label;b.setAttribute('aria-label',label);b.onclick=()=>{color.value=value;t.color=value;change();};palette.append(b);}box.append(palette);
    for(const [key,label,min,max,step] of [['size','字級',12,120,1],['bg','底色濃度',0,.9,.05]]){const l=document.createElement('label');l.className='it-lb';l.textContent=label;const r=document.createElement('input');r.type='range';r.min=min;r.max=max;r.step=step;r.value=t[key];r.oninput=()=>{t[key]=Number(r.value);change();};l.append(r);box.append(l);}
    const lock=document.createElement('label');lock.className='ic-check';const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=t.locked===true;toggle.setAttribute('aria-label','鎖定這組文字');toggle.onchange=()=>{t.locked=toggle.checked;textList();change();};lock.append(toggle,document.createTextNode('鎖定位置與大小'));box.append(lock);box.querySelector('input[type=range]').disabled=t.locked===true;$('icTextList').append(box);
   }
   if(focusId&&$(focusId)){$(focusId).focus({preventScroll:true});if(typeof selection==='number'&&typeof $(focusId).setSelectionRange==='function')$(focusId).setSelectionRange(selection,selection);}
  }
  $('icTextAdd').onclick=()=>{if(settings.texts.length>=6){api.status('最多可新增 6 組文字。',true);return;}settings.texts.push({id:crypto.randomUUID(),text:'輸入文字',x:.5,y:.25+settings.texts.length*.08,size:36,color:'#ffffff',bg:.4,font:'sans'});$('itUseCap').checked=true;textList();change();};
  const output=document.createElement('div');output.innerHTML=`<label class="it-lb" for="icFormat">下載格式</label><select id="icFormat" class="it-in"><option value="jpeg">JPG（照片檔案較小）</option><option value="png">PNG（文字與線條無損）</option></select><p id="icDimensions" class="ic-note"></p><p class="ic-note">PNG 為無損格式，不使用 JPG 品質設定。</p>`;$('icOutput').prepend(output);$('icFormat').onchange=()=>{settings.format=$('icFormat').value;change();};
  const zoom=document.createElement('div');zoom.className='ic-view-tools';zoom.innerHTML=`<label class="ic-check"><input id="icGuides" type="checkbox" checked>對齊吸附</label><label>檢視 <select id="icZoom"><option value="fit">符合視窗</option><option value="1">100%</option><option value="2">200%</option></select></label><label>背景 <select id="icViewBackground"><option value="neutral">灰</option><option value="light">白</option><option value="dark">黑</option></select></label><span class="ic-note">拖曳文字或人物可移動；放大後可捲動檢查。</span>`;$('icStage').before(zoom);
  $('icGuides').onchange=()=>{settings.guides=$('icGuides').checked;change();};$('icZoom').onchange=()=>view();$('icViewBackground').onchange=()=>{$('icStage').dataset.background=$('icViewBackground').value;};
  function view(){const c=$('icCanvas'),z=$('icZoom').value;$('icStage').classList.toggle('ic-zoomed',z!=='fit');c.style.width=z==='fit'?'':Math.round(c.width*Number(z))+'px';c.style.maxWidth=z==='fit'?'':'none';}
  const mini=document.createElement('div');mini.className='ic-mini';mini.innerHTML='<button id="icMiniToggle" type="button">收合小預覽</button><canvas id="icMiniCanvas" aria-label="即時小預覽"></canvas>';$('imageComposer').querySelector('.ic-body').prepend(mini);$('icMiniToggle').onclick=()=>{miniVisible=!miniVisible;$('icMiniCanvas').hidden=!miniVisible;$('icMiniToggle').textContent=miniVisible?'收合小預覽':'展開小預覽';};
  function sync(){
   $('icRatio').value=settings.frame.ratio;$('icFrameMode').value=settings.frame.mode;$('icSplit').value=settings.frame.split;$('icFrameGap').value=settings.frame.gap;$('icSecondControls').hidden=settings.frame.mode==='single';
   for(const k of ['zoom','x','y','secondZoom','secondX','secondY']){$('icFrame_'+k).value=settings.frame[k];$('icFrame_'+k).parentElement.hidden=k.startsWith('second')&&settings.frame.mode==='single';}
   for(const [id,key] of [['icLockPerson','person'],['icLockLogo','logo'],['icLockMain','main']])$(id).checked=settings.locks[key];$('icGuides').checked=settings.guides;$('itCapPos').disabled=settings.locks.main;$('itCapSz').disabled=settings.locks.main;$('icLogoSize').disabled=settings.locks.logo;$('icPersonFront').checked=settings.front;$('icFormat').value=settings.format;$('itQ').disabled=settings.format==='png';$('icLogoControls').hidden=!logo;$('icLogoSize').value=settings.logo.size*100;
  }
  function aspect(photo,o=settings){return o.frame.ratio==='original'?photo.width/photo.height:Number(o.frame.ratio);}
  function cover(ctx,img,x,y,w,h,z=100,fx=50,fy=50){const scale=Math.max(w/img.width,h/img.height)*z/100,sw=w/scale,sh=h/scale;ctx.drawImage(img,(img.width-sw)*fx/100,(img.height-sh)*fy/100,sw,sh,x,y,w,h);}
  function background(ctx,photo,w,h,o=settings,other=second){const f=o.frame;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
   if(f.mode==='single'){cover(ctx,photo,0,0,w,h,f.zoom,f.x,f.y);return;}
   const gap=f.gap*w/1000,split=f.split/100,lr=f.mode==='lr',a=(lr?w:h)*split-gap/2,b=(lr?w:h)-a-gap;
   cover(ctx,photo,0,0,lr?a:w,lr?h:a,f.zoom,f.x,f.y);
   if(other)cover(ctx,other,lr?a+gap:0,lr?0:a+gap,lr?b:w,lr?h:b,f.secondZoom,f.secondX,f.secondY);
   else{ctx.fillStyle='#e7e5e4';ctx.fillRect(lr?a+gap:0,lr?0:a+gap,lr?b:w,lr?h:b);}
  }
  function paintText(ctx,t,w,h){if(!t.text.trim())return null;const fs=t.size*w/1000,lines=t.text.split('\n').slice(0,12),pad=fs*.3;ctx.save();ctx.font=(t.font==='italic'?'italic ':'')+(['light','book'].includes(t.font)?'400 ':'700 ')+fs+'px '+(families[t.font==='book'?'serif':t.font]||families.sans);const widths=lines.map(l=>ctx.measureText(l).width),bw=Math.min(w,Math.max(...widths)+2*pad),bh=fs*1.25*lines.length+pad,xx=Math.max(0,Math.min(w-bw,t.x*w-bw/2)),yy=Math.max(0,Math.min(h-bh,t.y*h-bh/2));
   if(t.bg){ctx.fillStyle='rgba(0,0,0,'+t.bg+')';ctx.beginPath();ctx.roundRect(xx,yy,bw,bh,fs*.15);ctx.fill();}ctx.fillStyle=t.color;ctx.textBaseline='middle';ctx.textAlign='center';for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],xx+bw/2,yy+pad/2+fs*.625+i*fs*1.25,bw-2*pad);ctx.restore();return {id:t.id,x:xx/w,y:yy/h,w:bw/w,h:bh/h};}
  function paint(ctx,w,h,o,preview=false,logoImage=logo){const s=o.studio||settings,result=[];
   if(o.useCap){if(o.capPos==='free')result.push(paintText(ctx,{id:'main',text:o.capText,size:o.capSz,color:o.capColor,font:o.capFont,bg:o.capBg,...s.capPoint},w,h));for(const t of s.texts)result.push(paintText(ctx,t,w,h));}
   if(logoImage){const ph=h*s.logo.size,pw=ph*logoImage.width/logoImage.height;ctx.drawImage(logoImage,w*s.logo.x-pw/2,h*s.logo.y-ph/2,pw,ph);result.push({id:'logo',x:s.logo.x-pw/(2*w),y:s.logo.y-ph/(2*h),w:pw/w,h:ph/h});}
   if(preview)boxes=result.filter(Boolean);
  }
  function hit(p){const caption=$('icTab_caption')?.getAttribute('aria-selected')==='true';return boxes.slice().reverse().find(b=>(caption||b.id==='logo')&&p.x>=b.x&&p.x<=b.x+b.w&&p.y>=b.y&&p.y<=b.y+b.h);}
  function locked(id){return ['person','main','logo'].includes(id)?settings.locks[id]:settings.texts.find(t=>t.id===id)?.locked===true;}
  function dragTo(id,p){if(locked(id))return;if(id==='logo')Object.assign(settings.logo,{x:p.x,y:p.y});else if(id==='main')Object.assign(settings.capPoint,p);else{const t=settings.texts.find(t=>t.id===id);if(t)Object.assign(t,p);}}
  function setTargets(person,brand){targets=boxes.slice();if(person)targets.push(person);if(brand?.enabled){const w=brand.width/100,h=brand.height/100;targets.push({id:'brand',x:brand.position==='left'?0:brand.position==='center'?(1-w)/2:1-w,y:1-h,w,h});}}
  function snap(p,size,c,id){
   const result={x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y)),lines:[]};if(!settings.guides)return result;const b=c.getBoundingClientRect();
   for(const [axis,extent,pixels] of [['x',size.w,b.width],['y',size.h,b.height]]){const candidates=[{center:.5,line:.5},{center:extent/2,line:0},{center:1-extent/2,line:1},{center:.04+extent/2,line:.04},{center:.96-extent/2,line:.96}];for(const box of targets.filter(t=>t.id!==id)){const start=box[axis],length=box[axis==='x'?'w':'h'];for(const line of [start,start+length/2,start+length])for(const offset of [-extent/2,0,extent/2])candidates.push({center:line+offset,line});}const valid=candidates.filter(t=>t.center>=0&&t.center<=1);const nearest=valid.sort((a,b)=>Math.abs(a.center-result[axis])-Math.abs(b.center-result[axis]))[0];if(nearest&&Math.abs(nearest.center-result[axis])<=7/Math.max(1,pixels)){result[axis]=nearest.center;result.lines.push({axis,at:nearest.line});}}
   return result;
  }
  function guides(c,lines){const ctx=c.getContext('2d');ctx.save();ctx.strokeStyle='#00c9ef';ctx.lineWidth=c.width/600;ctx.setLineDash([c.width/150,c.width/200]);for(const line of lines){const at=clampLine(line.at);ctx.beginPath();if(line.axis==='x'){ctx.moveTo(at*c.width,0);ctx.lineTo(at*c.width,c.height);}else{ctx.moveTo(0,at*c.height);ctx.lineTo(c.width,at*c.height);}ctx.stroke();}ctx.restore();}
  function clampLine(v){return Math.max(.001,Math.min(.999,v));}
  function afterRender(){sync();view();$('icRepair').disabled=!api.getFullPerson()||api.busy();$('icAssetSave').disabled=!api.getPerson()||api.busy();const c=$('icCanvas'),m=$('icMiniCanvas');if(c.width&&c.height){m.width=280;m.height=Math.round(280*c.height/c.width);m.getContext('2d').drawImage(c,0,0,m.width,m.height);}mini.hidden=!api.hasPhoto();}
  sync();
  return {options:()=>copy(settings),set:value=>{settings=clean(value);sync();textList();},aspect,background,paint,hit,dragTo,locked,setTargets,snap,guides,afterRender,hasSecond:()=>!!second,aux:()=>({second,secondName,logo}),restoreAux:a=>{second=a.second;secondName=a.secondName||'';logo=a.logo;$('icSecondName').textContent=second?(secondName||'已載入拼版照片'):'尚未選擇第二張照片';sync();},clean,clone};
 }
 function repair(api){
  const source=api.getOriginal(),initial=api.getFullPerson();if(!source||!initial)return;
  let work=clone(initial),undo=[],redo=[],stroke=null,strokeId=null,priorRedo=null,droppedUndo=null;
  const dialog=document.createElement('dialog');dialog.className='ic-repair-dialog';dialog.id='icRepairDialog';dialog.innerHTML=`<h3>去背細節修補</h3><div class="ic-actions"><label>筆刷 <select id="icBrushMode"><option value="erase">擦除</option><option value="restore">恢復原圖</option></select></label><label>大小 <input id="icBrushSize" type="range" min="4" max="120" value="30"></label><label>柔邊 <input id="icBrushSoft" type="range" min="0" max="80" value="25"></label><label>檢視 <select id="icRepairZoom"><option value="fit">符合視窗</option><option value="1">100%</option><option value="2">200%</option></select></label><label>背景 <select id="icRepairBg"><option value="checker">透明格</option><option value="white">白</option><option value="black">黑</option></select></label><button id="icRepairUndo">復原</button><button id="icRepairRedo">重做</button></div><p class="ic-note">擦除殘留背景，或恢復誤刪的頭髮與衣服。恢復會帶回原照片，請使用小筆刷。放大後可用捲軸查看。</p><div class="ic-repair-stage"><canvas id="icRepairCanvas"></canvas></div><div class="ic-actions"><button id="icRepairCancel">取消</button><button id="icRepairApply" class="ic-primary">套用修補</button></div>`;document.body.append(dialog);dialog.showModal();
  const c=$('icRepairCanvas');c.width=work.width;c.height=work.height;
  function show(){c.getContext('2d').clearRect(0,0,c.width,c.height);c.getContext('2d').drawImage(work,0,0);$('icRepairUndo').disabled=!undo.length;$('icRepairRedo').disabled=!redo.length;}
  function brush(p){const ctx=work.getContext('2d'),radius=Number($('icBrushSize').value)*work.width/1000,soft=Number($('icBrushSoft').value)/100;
   const stamp=canvas(Math.ceil(radius*2+2),Math.ceil(radius*2+2)),sc=stamp.getContext('2d'),mid=stamp.width/2;
   if($('icBrushMode').value==='restore')sc.drawImage(source,-p.x+mid,-p.y+mid,work.width,work.height);
   if($('icBrushMode').value==='restore')sc.globalCompositeOperation='destination-in';
   const g=sc.createRadialGradient(mid,mid,radius*(1-Math.max(.001,soft)),mid,mid,radius);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');sc.fillStyle=g;sc.fillRect(0,0,stamp.width,stamp.height);
   ctx.save();ctx.globalCompositeOperation=$('icBrushMode').value==='restore'?'source-over':'destination-out';ctx.drawImage(stamp,p.x-mid,p.y-mid);ctx.restore();
  }
  function point(e){const b=c.getBoundingClientRect();return{x:(e.clientX-b.x)*c.width/b.width,y:(e.clientY-b.y)*c.height/b.height};}
  c.onpointerdown=e=>{if(e.button!==0||stroke)return;undo.push(clone(work));droppedUndo=undo.length>8?undo.shift():null;priorRedo=redo;redo=[];strokeId=e.pointerId;stroke=point(e);c.setPointerCapture(e.pointerId);brush(stroke);show();e.preventDefault();};
  c.onpointermove=e=>{if(!stroke||e.pointerId!==strokeId)return;const p=point(e),n=Math.max(1,Math.ceil(Math.hypot(p.x-stroke.x,p.y-stroke.y)/Math.max(1,Number($('icBrushSize').value)*work.width/3000)));for(let i=1;i<=n;i++)brush({x:stroke.x+(p.x-stroke.x)*i/n,y:stroke.y+(p.y-stroke.y)*i/n});stroke=p;show();};function endStroke(e,cancel){if(!stroke||e.pointerId!==strokeId)return;if(cancel){work=undo.pop();if(droppedUndo)undo.unshift(droppedUndo);redo=priorRedo;}stroke=null;strokeId=null;priorRedo=null;droppedUndo=null;show();}
  c.onpointerup=e=>endStroke(e,false);c.onpointercancel=c.onlostpointercapture=e=>endStroke(e,true);
  $('icRepairUndo').onclick=()=>{if(undo.length){redo.push(work);work=undo.pop();show();}};$('icRepairRedo').onclick=()=>{if(redo.length){undo.push(work);work=redo.pop();show();}};
  $('icRepairZoom').onchange=()=>{const z=$('icRepairZoom').value;c.style.width=z==='fit'?'':c.width*Number(z)+'px';c.style.maxWidth=z==='fit'?'':'none';};$('icRepairBg').onchange=()=>{c.parentElement.dataset.background=$('icRepairBg').value;};
  $('icRepairCancel').onclick=()=>dialog.close();$('icRepairApply').onclick=()=>{try{api.setPerson(work,source);api.render();dialog.close();api.status('修補已套用，可按復原回到修補前。');}catch(e){api.status(e.message,true);}};
  dialog.addEventListener('close',()=>{dialog.remove();$('icRepair')?.focus();});show();
 }
 window.ImageStudio={mount,clean};
})();
