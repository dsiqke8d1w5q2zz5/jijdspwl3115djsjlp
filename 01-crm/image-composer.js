/* Person compositing: images stay in this browser; only model assets are fetched. */
(function () {
    'use strict';
    const state = { bg:null, original:null, matte:null, person:null, x:.22, y:.72, size:.5, flip:false, busy:false, sequence:0, bgSequence:0, active:null, placements:new Map(), exporting:false };
    let dialog, previousFocus, segmenterPromise, drag, studio, redaction, externalBusy=false, restoring=false;
    const photoSettings=new Map(),photoAux=new Map();let defaultAux={second:null,logo:null};let defaultSettings=null,history=[],historyIndex=-1,historyTimer,historyDirty=true;
    const busy=()=>state.busy||state.exporting||externalBusy;
    let defaultPlacement={x:.22,y:.72,size:.5,flip:false};
    const $ = id => document.getElementById(id);
    function status(message, error) { $('icStatus').textContent=message; $('icStatus').dataset.error=!!error; }
    function enabled(){return $('icUsePerson').checked;}
    function controls() {
        const working=busy();
        if(dialog){dialog.querySelectorAll('.ic-controls input,.ic-controls select,.ic-controls textarea,.ic-controls button,.ic-photos button,#icEditScope').forEach(el=>el.inert=working&&el.id!=='icCancel');}
        $('icDownload').disabled=!state.bg||working||(enabled()&&!state.person);
        $('icAll').disabled=$('icDownload').disabled||_itFiles.length<2;
        if($('icZip'))$('icZip').disabled=$('icAll').disabled;
        if($('icUndo')){$('icUndo').disabled=working||historyIndex<1;$('icRedo').disabled=working||historyIndex>=history.length-1;}
        for(const [tab,id] of [['person','icUsePerson'],['caption','itUseCap'],['watermark','itUseWm'],['brand','icUseBrand']])if($('icTab_'+tab))$('icTab_'+tab).dataset.enabled=$(id).checked?'true':'false';
        $('icRetry').disabled=!state.original||working;$('icCancel').hidden=!state.busy;
        $('icPerson').disabled=working;$('icAuto').disabled=working;$('icQuality').disabled=working;
        $('icMattingOptions').hidden=!$('icAuto').checked;
        $('icOutlineControls').hidden=$('icStyle').value!=='sticker';
        $('icOutlineValue').textContent=$('icOutline').value;
        $('icBackground').disabled=working;$('icClear').disabled=working;
        $('icRemove').disabled=!state.bg||working;if($('icApplyAll'))$('icApplyAll').disabled=!state.bg||working||_itFiles.length<2;
        $('icCutout').disabled=!state.person||working;
        if($('icRepair'))$('icRepair').disabled=!state.fullPerson||working;
        if($('icAssetSave'))$('icAssetSave').disabled=!state.person||working;
        ['icSize','icFlip','icReset'].forEach(id=>$(id).disabled=!state.person||state.exporting||studio?.locked('person'));
        $('icSizeValue').textContent=Math.round(state.size*100)+'%';
        $('icPersonBody').hidden=false;
        if($('icBrandBody'))$('icBrandBody').hidden=false;
        $('itWmBox').hidden=false;$('itCapBox').hidden=false;
    }
    function canvas(w,h) { const c=document.createElement('canvas'); c.width=w;c.height=h;return c; }
    async function decode(file, max) {
        if (!file || (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|avif|gif)$/i.test(file.name))) throw Error('請選擇 JPG、PNG 或其他圖片檔。');
        if(file.size>40*1024*1024) throw Error('圖片超過 40 MB，請先縮小圖片。');
        const url=URL.createObjectURL(file),img=new Image();
        try {
            await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('無法讀取圖片，請改用 JPG 或 PNG。'));img.src=url;});
            const ratio=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));
            const c=canvas(Math.max(1,Math.round(img.naturalWidth*ratio)),Math.max(1,Math.round(img.naturalHeight*ratio)));
            c.getContext('2d').drawImage(img,0,0,c.width,c.height);return c;
        } finally { URL.revokeObjectURL(url); }
    }
    async function loadSegmenter() {
        if(!segmenterPromise) segmenterPromise=(async()=>{
            const root='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32';
            const {FilesetResolver,ImageSegmenter}=await import(root+'/vision_bundle.mjs');
            const files=await FilesetResolver.forVisionTasks(root+'/wasm');
            return ImageSegmenter.createFromOptions(files,{
                baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',delegate:'CPU'},
                runningMode:'IMAGE',outputConfidenceMasks:true,outputCategoryMask:false
            });
        })().catch(e=>{segmenterPromise=null;throw e;});
        return segmenterPromise;
    }
    function trim(source) {
        const ctx=source.getContext('2d'), data=ctx.getImageData(0,0,source.width,source.height).data;
        let left=source.width,top=source.height,right=-1,bottom=-1,count=0;
        for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(data[(y*source.width+x)*4+3]>5){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
        if(right<left || count<source.width*source.height*.001)throw Error('沒有辨識到清楚的人物，請換一張人物較清楚的照片。');
        const out=canvas(right-left+1,bottom-top+1);out.getContext('2d').drawImage(source,left,top,out.width,out.height,0,0,out.width,out.height);return out;
    }
    function cancelCutout(){if(!state.busy)return;state.sequence++;PortraitMatting.cancel();state.busy=false;controls();status('已取消去背，可重新處理。');}
    async function cutout() {
        if(!state.original || state.busy)return;
        const seq=++state.sequence;state.busy=true;controls();
        status($('icAuto').checked?'正在載入自動去背工具，首次使用可能較久，請稍候…':'正在讀取人物…');
        try {
            const original=state.original, out=canvas(original.width,original.height);
            out.getContext('2d').drawImage(original,0,0);
            state.matte=null;
            if($('icAuto').checked){
                if($('icQuality').value!=='fast'){
                    state.matte=await PortraitMatting.run(original,message=>{if(seq===state.sequence)status(message);},$('icQuality').value);
                }else{
                    let timeout;
                    const model=await Promise.race([loadSegmenter(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('model timeout')),45000);})]).finally(()=>clearTimeout(timeout));
                    if(seq!==state.sequence)return;
                    status('正在快速去除人物背景…');
                    await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
                    model.segment(original,result=>{
                        const mask=result.confidenceMasks[0],values=mask.getAsFloat32Array(),alpha=canvas(mask.width,mask.height),ac=alpha.getContext('2d'),pixels=ac.createImageData(mask.width,mask.height);
                        for(let i=0;i<values.length;i++)pixels.data[i*4+3]=Math.round(Math.max(0,Math.min(1,values[i]))*255);
                        ac.putImageData(pixels,0,0);state.matte=alpha;
                    });
                }
                const ctx=out.getContext('2d');ctx.globalCompositeOperation='destination-in';ctx.drawImage(state.matte,0,0,out.width,out.height);ctx.globalCompositeOperation='source-over';
            }
            if(seq!==state.sequence)return;
            state.fullPerson=out;state.person=trim(out);
            const thumb=$('icThumb');thumb.width=state.person.width;thumb.height=state.person.height;thumb.getContext('2d').drawImage(state.person,0,0);thumb.hidden=false;
            status('人物已準備好。可直接拖曳人物，並調整大小。');
            render();
        } catch(e){ if(seq===state.sequence)status(/人物|精細去背/.test(e.message)?e.message:'去背未完成，請確認網路後按「重新處理」。也可取消自動去背，使用透明背景 PNG。',true); }
        finally { if(seq===state.sequence){state.busy=false;controls();} }
    }
    function remember(){if(state.active)state.placements.set(state.active,{x:state.x,y:state.y,size:state.size,flip:state.flip});}
    function geometry(w,h,pos=state,person=state.person){const ph=h*pos.size,pw=person?ph*person.width/person.height:0;return{x:w*pos.x-pw/2,y:h*pos.y-ph/2,w:pw,h:ph};}
    const whiteSilhouettes=new WeakMap(),artworkIds=new WeakMap();let artworkSequence=0;
    function frameKey(o=photoOptions(),aux=studio.aux()){const other=aux?.second;if(other&&!artworkIds.has(other))artworkIds.set(other,++artworkSequence);return JSON.stringify([o.studio.frame,other?artworkIds.get(other):null]);}
    function photoOptions(){return {...itOpts(),brand:BrandBanner.options(),personStyle:$('icStyle').value,outlineWidth:Number($('icOutline').value),studio:studio?.options(),usePerson:enabled()};}
    function drawPerson(ctx,w,h,pos,options,person){
        if(!person)return;const r=geometry(w,h,pos,person);ctx.save();ctx.translate(r.x+(pos.flip?r.w:0),r.y);ctx.scale(pos.flip?-1:1,1);
        if(options.personStyle==='sticker'){
            let white=whiteSilhouettes.get(person);if(!white){white=canvas(person.width,person.height);const wc=white.getContext('2d');wc.drawImage(person,0,0);wc.globalCompositeOperation='source-in';wc.fillStyle='#fff';wc.fillRect(0,0,white.width,white.height);whiteSilhouettes.set(person,white);}
            const radius=options.outlineWidth*w/1000;for(let i=0;i<24;i++){const angle=i*Math.PI/12;ctx.drawImage(white,Math.cos(angle)*radius,Math.sin(angle)*radius,r.w,r.h);}
        }ctx.drawImage(person,0,0,r.w,r.h);ctx.restore();
    }
    function draw(target,photo=state.bg,pos=state,options=photoOptions(),person=enabled()?state.person:null,aux=studio?.aux(),photoId=state.active){
        if(!photo)return;const base=canvas(target.width,target.height),ctx=base.getContext('2d'),w=base.width,h=base.height;
        if(studio)studio.background(ctx,photo,w,h,options.studio,aux.second);else ctx.drawImage(photo,0,0,w,h);
        if(!options.studio?.front)drawPerson(ctx,w,h,pos,options,person);
        itDraw(target,base,{...options,useCap:options.useCap&&options.capPos!=='free',brandInset:options.brand?.enabled?BrandBanner.height(h,options.brand):0},w,h);
        const final=target.getContext('2d');if(options.brand?.enabled)BrandBanner.draw(final,w,h,options.brand);
        if(options.studio?.front)drawPerson(final,w,h,pos,options,person);
        studio?.paint(final,w,h,options,target===$('icCanvas'),aux.logo);if(target===$('icCanvas')){const rect=geometry(w,h,pos,person);studio.setTargets(person?{id:'person',x:rect.x/w,y:rect.y/h,w:rect.w/w,h:rect.h/h}:null,options.brand);}redaction?.paint(target,photoId);if(target===$('icCanvas'))redaction?.overlay(target);
    }
    function outputSize(photo,options){
        const ratio=studio.aspect(photo,options.studio),max=options.max>0?Math.min(8000,options.max):Math.max(photo.width,photo.height);
        const long=options.brand?.enabled?Math.max(Math.min(2400,max),Math.min(max,Math.max(photo.width,photo.height))):Math.min(max,Math.max(photo.width,photo.height));
        return ratio>=1?[Math.round(long),Math.max(1,Math.round(long/ratio))]:[Math.max(1,Math.round(long*ratio)),Math.round(long)];
    }
    let thumbnailTimer;
    function scheduleThumbnails(){
        clearTimeout(thumbnailTimer);
        thumbnailTimer=setTimeout(()=>{
            if(!studio||!dialog)return;
            const buttons=new Map(Array.from($('icPhotos').querySelectorAll('button[data-id]'),b=>[b.dataset.id,b]));
            for(const file of _itFiles){
                const image=buttons.get(String(file.id))?.querySelector('img');if(!image)continue;
                const o=file.id===state.active?photoOptions():optionsFrom(photoSettings.get(file.id)||defaultSettings||layoutSnapshot());
                const aux=file.id===state.active?studio.aux():(photoAux.get(file.id)||defaultAux);
                const ratio=studio.aspect(file.img,o.studio),thumb=canvas(ratio>=1?320:Math.max(1,Math.round(320*ratio)),ratio>=1?Math.max(1,Math.round(320/ratio)):320);
                draw(thumb,file.img,file.id===state.active?state:(state.placements.get(file.id)||defaultPlacement),o,o.usePerson?state.person:null,aux,file.id);
                image.src=thumb.toDataURL('image/png');
            }
        },120);
    }
    function render(){
        if(!dialog)return;
        const c=$('icCanvas');c.hidden=!state.bg;$('icEmpty').hidden=!!state.bg;
        if(state.bg){const ratio=studio?studio.aspect(state.bg):state.bg.width/state.bg.height;c.width=ratio>=1?2400:Math.round(2400*ratio);c.height=ratio>=1?Math.round(2400/ratio):2400;c.style.setProperty('--ic-aspect',c.width/c.height);draw(c);if(studio){const [w,h]=outputSize(state.bg,photoOptions());$('icDimensions').textContent='這張成品：'+w+' × '+h+' 像素';}}
        if(studio&&!restoring){const snapshot=layoutSnapshot(),aux=studio.aux();if($('icEditScope').value==='all'){defaultSettings=snapshot;defaultAux=aux;for(const file of _itFiles){photoSettings.set(file.id,JSON.parse(JSON.stringify(snapshot)));photoAux.set(file.id,aux);}}else if(state.active){photoSettings.set(state.active,snapshot);photoAux.set(state.active,aux);}else{defaultSettings=snapshot;defaultAux=aux;}}
        studio?.afterRender();redaction?.sync();scheduleHistory();
        remember();controls();scheduleThumbnails();
    }
    function refresh(){
        if(!dialog)return;
        let active=_itFiles.find(f=>f.id===state.active);
        if(!active)active=_itFiles[0];
        if(active?.id!==state.active){remember();state.active=active?.id||null;const pos=state.placements.get(state.active)||defaultPlacement;Object.assign(state,pos);const saved=photoSettings.get(state.active)||defaultSettings;if(saved&&studio){restoreControls(saved);studio.restoreAux(photoAux.get(state.active)||defaultAux);}$('icSize').value=state.size*100;}
        state.bg=active?.img||null;
        $('icPhotoName').textContent=active?active.name+' · '+(_itFiles.indexOf(active)+1)+' / '+_itFiles.length:'尚未選擇照片';
        const strip=$('icPhotos');const key=_itFiles.map(f=>f.id).join('|');
        if(strip.dataset.key!==key){strip.dataset.key=key;strip.replaceChildren();for(const f of _itFiles){const b=document.createElement('button');b.type='button';b.dataset.id=f.id;b.title=f.name;b.setAttribute('aria-label','編輯照片：'+f.name);const image=new Image();image.src=f.url;image.alt=f.name;b.append(image);const label=document.createElement('span');label.className='ic-photo-label';label.textContent=(_itFiles.indexOf(f)+1)+' · '+f.name;b.append(label);b.onclick=()=>{flushHistory();remember();state.active=f.id;Object.assign(state,state.placements.get(f.id)||defaultPlacement);const saved=photoSettings.get(f.id)||defaultSettings;if(saved){restoreControls(saved);studio.restoreAux(photoAux.get(f.id)||defaultAux);}$('icSize').value=state.size*100;restoring=true;refresh();restoring=false;};const item=document.createElement('div');item.className='ic-photo-item';const remove=document.createElement('button');remove.type='button';remove.className='ic-photo-remove';remove.textContent='×';remove.title='移除這張照片';remove.setAttribute('aria-label','移除照片：'+f.name);remove.onclick=()=>removePhoto(f.id);item.append(b,remove);strip.append(item);}}
        strip.hidden=_itFiles.length===0;strip.querySelectorAll('button[data-id]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.id===state.active));});
        render();
    }
    function removePhoto(id){
        const file=_itFiles.find(f=>f.id===id);if(!file||busy())return;
        if(!confirm('移除「'+file.name+'」？這張照片的編輯會一併移除，原始檔案不受影響。'))return;
        const strip=$('icPhotos'),scroll=strip.scrollTop,left=strip.scrollLeft;
        flushHistory();remember();redaction.forget(id);photoSettings.delete(id);photoAux.delete(id);state.placements.delete(id);
        if(id===state.active){const index=_itFiles.indexOf(file),next=_itFiles[index+1]||_itFiles[index-1];state.active=null;if(next){state.active=next.id;Object.assign(state,state.placements.get(next.id)||defaultPlacement);restoreControls(photoSettings.get(next.id)||defaultSettings||layoutSnapshot());studio.restoreAux(photoAux.get(next.id)||defaultAux);$('icSize').value=state.size*100;}}
        itRemove(id);resetHistory();strip.scrollTop=scroll;strip.scrollLeft=left;
        const focus=Array.from(strip.querySelectorAll('button[data-id]')).find(b=>b.dataset.id===String(state.active));(focus||$('icBackground')).focus({preventScroll:true});
        status('已移除照片，原始檔案不受影響。');
    }
    function reset(){Object.assign(state,{x:.22,y:.72,size:.5,flip:false});$('icSize').value=50;render();}
    function point(e){const r=$('icCanvas').getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
    function download(source,name,type,q=.94){return new Promise((resolve,reject)=>source.toBlob(blob=>{
        if(!blob){reject(Error('無法產生圖片，請再試一次。'));return;}
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);resolve();
    },type,q));}
    async function exportPhotos(all,asZip=false){
        if($('icDownload').disabled)return;
        const options=photoOptions();
        if(options.brand.enabled&&!['company','name','phone','tagline'].some(k=>options.brand[k].trim())){status('請先輸入品牌底條的文字內容。',true);$('icTab_brand').click();$('icBrand_company').focus();return;}
        if(options.useWm&&!options.wmText){status('請輸入浮水印文字，或關閉浮水印。',true);$('icTab_watermark').click();$('itWmText').focus();return;}
        if(options.useCap&&!options.capText.trim()&&!options.studio.texts.some(t=>t.text.trim())){status('請輸入加註文字，或關閉加註文字。',true);$('icTab_caption').click();$('itCapText').focus();return;}
        remember();itSaveCfg();flushHistory();
        const selected=all?_itFiles:_itFiles.filter(f=>f.id===state.active),photos=[];
        for(const file of selected){const saved=photoSettings.get(file.id)||defaultSettings||layoutSnapshot(),o=optionsFrom(saved);if(redaction.pending(file.id,frameKey(o,photoAux.get(file.id)||defaultAux||studio.aux()))){status('「'+file.name+'」裁切或拼版已改變，請選取這張照片並到局部遮蔽核對後再下載。',true);$('icTab_redact').click();return;}if(o.studio.frame.mode!=='single'&&!(photoAux.get(file.id)||defaultAux||studio.aux()).second){status('拼版尚未選擇第二張照片。',true);$('icTab_crop').click();return;}if(o.usePerson&&!state.person){status('請先選擇人物照片，或關閉人物合成。',true);return;}if(o.brand.enabled&&!['company','name','phone','tagline'].some(k=>String(o.brand[k]||'').trim())||o.useWm&&!o.wmText||o.useCap&&!o.capText.trim()&&!o.studio.texts.some(t=>t.text.trim())){status('有照片的文字尚未填寫，請逐張檢查。',true);return;}photos.push({file,pos:{...(state.placements.get(file.id)||defaultPlacement)},options:o,aux:photoAux.get(file.id)||defaultAux||studio.aux()});}
        const portrait=state.person;state.exporting=true;controls();
        try{const entries=[];let count=0;for(const {file,pos,options:o,aux:photoArtwork} of photos){const [w,h]=outputSize(file.img,o),out=canvas(w,h);draw(out,file.img,pos,o,o.usePerson?portrait:null,photoArtwork,file.id);const ext=o.studio.format==='png'?'png':'jpg',blob=await ImageStorage.blob(out,ext==='png'?'image/png':'image/jpeg',o.q),name=(asZip?String(count+1).padStart(2,'0')+'_':'')+file.name.replace(/\.[^.]+$/,'')+'_編輯.'+ext;if(asZip)entries.push({name,blob});else ImageStorage.download(blob,name);status('已產生 '+(++count)+' / '+photos.length+' 張圖片。');await new Promise(resolve=>setTimeout(resolve,0));}if(asZip)ImageStorage.download(await ImageStorage.zip(entries),'房屋圖片.zip');status('完成，共 '+photos.length+' 張。原圖沒有被修改。');}
        catch(e){status(e.message||'下載未完成，請重試。',true);}finally{state.exporting=false;controls();}
    }
    const layoutControls=['icUsePerson','icStyle','icOutline','itUseCap','itUseWm','itCapText','itCapFont','itCapColor','itCapPos','itCapSz','itCapBg','itWmText','itWmOp','itWmSz','itWmGap','itWmAg','itQ','itMax'];
    function layoutSnapshot(){
        const values={};for(const id of layoutControls){const el=$(id);values[id]=el.type==='checkbox'?el.checked:el.value;}
        return {version:1,values,brand:BrandBanner.options(),wmColor:document.querySelector('input[name="itWmCol"]:checked')?.value||'auto',person:{x:state.x,y:state.y,size:state.size,flip:state.flip},studio:studio?.options()};
    }
    function restoreControls(saved){
        for(const id of layoutControls){
            const el=$(id),value=saved.values?.[id];if(value===undefined)continue;
            if(el.type==='checkbox'){el.checked=value===true;continue;}
            if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===value))continue;
            if(el.type==='range'&&!Number.isFinite(Number(value)))continue;
            if(el.type==='color'&&!/^#[0-9a-f]{6}$/i.test(value))continue;
            el.value=String(value);
        }
        BrandBanner.apply(saved.brand);
        document.querySelectorAll('input[name="itWmCol"]').forEach(el=>el.checked=el.value===saved.wmColor);
        studio?.set(saved.studio);itToggleSec();
    }
    function optionsFrom(saved){const v=saved.values||{};return {usePerson:v.icUsePerson===true,useCap:v.itUseCap===true,useWm:v.itUseWm===true,capText:v.itCapText||'',capFont:v.itCapFont||'sans',capColor:v.itCapColor||'#ffffff',capPos:v.itCapPos||'bottom',capSz:Number(v.itCapSz)||34,capBg:Number(v.itCapBg)/100||0,wmText:v.itWmText||'',wmOp:Number(v.itWmOp)/100||.18,wmSz:Number(v.itWmSz)||28,wmGap:Number(v.itWmGap)/10||1.6,wmAg:Number(v.itWmAg)||0,wmCol:saved.wmColor||'auto',q:Number(v.itQ)/100||.92,max:Number(v.itMax)||0,personStyle:v.icStyle||'natural',outlineWidth:Number(v.icOutline)||2,brand:saved.brand||BrandBanner.options(),studio:ImageStudio.clean(saved.studio)};}
    function applyLayout(saved,{scope='all',keepPerson=false}={}){
        flushHistory();restoring=true;restoreControls(saved);
        const p=saved.person||{},clamp=(v,lo,hi,fallback)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):fallback;
        const pos={x:clamp(p.x,0,1,.22),y:clamp(p.y,0,1,.72),size:clamp(p.size,.1,1.2,.5),flip:p.flip===true};
        if(!keepPerson||!_itFiles.length){Object.assign(state,pos);if(scope==='all'){defaultPlacement={...pos};for(const photo of _itFiles)state.placements.set(photo.id,{...pos});}else if(state.active)state.placements.set(state.active,{...pos});}
        const settings=layoutSnapshot();if(scope==='all'){defaultSettings=settings;for(const photo of _itFiles)photoSettings.set(photo.id,JSON.parse(JSON.stringify(settings)));}else if(state.active)photoSettings.set(state.active,settings);else defaultSettings=settings;
        $('icEditScope').value=scope;$('icSize').value=state.size*100;itSaveCfg();itToggleSec();render();restoring=false;historyDirty=true;recordHistory();
        status(enabled()&&!state.person?'已套用版面，請到「人物合成」選擇人物照片。':'版面已套用，可繼續微調後下載。');
    }
    function captureHistory(){return {settings:layoutSnapshot(),defaultSettings:defaultSettings&&JSON.parse(JSON.stringify(defaultSettings)),perPhoto:JSON.parse(JSON.stringify([...photoSettings])),placements:JSON.parse(JSON.stringify([...state.placements])),defaultPlacement:{...defaultPlacement},person:state.person,original:state.original,fullPerson:state.fullPerson,aux:studio.aux(),photoAux:[...photoAux],defaultAux,redactions:redaction?.snapshot()||[],active:state.active};}
    function recordHistory(){if(!studio||restoring||busy()||!historyDirty&&history.length)return;historyDirty=false;const entry=captureHistory(),last=history[historyIndex];const json=x=>JSON.stringify([x.settings,x.defaultSettings,x.perPhoto,x.placements,x.redactions]);if(last&&json(last)===json(entry)&&last.person===entry.person&&last.aux.logo===entry.aux.logo&&last.aux.second===entry.aux.second&&sameArtwork(last.photoAux,entry.photoAux))return;history=history.slice(0,historyIndex+1);history.push(entry);while(history.length>20||history.length>2&&historyBytes()>128*1024*1024)history.shift();historyIndex=history.length-1;controls();}
    function sameArtwork(a,b){return a.length===b.length&&a.every(([id,v])=>{const other=b.find(([key])=>key===id)?.[1];return other&&v.logo===other.logo&&v.second===other.second&&v.secondName===other.secondName;});}
    function historyBytes(){const images=new Set();for(const entry of history){for(const c of [entry.person,entry.original,entry.fullPerson,entry.aux.logo,entry.aux.second])if(c)images.add(c);for(const [,aux] of entry.photoAux)for(const c of [aux.logo,aux.second])if(c)images.add(c);}return [...images].reduce((sum,c)=>sum+c.width*c.height*4,0);}
    function scheduleHistory(){if(!studio||restoring)return;historyDirty=true;clearTimeout(historyTimer);historyTimer=setTimeout(recordHistory,200);}
    function flushHistory(){clearTimeout(historyTimer);recordHistory();}
    function undoRedo(step){if(busy())return;flushHistory();const index=historyIndex+step;if(index<0||index>=history.length)return;historyIndex=index;const e=history[index];restoring=true;restoreControls(e.perPhoto.find(([id])=>id===state.active)?.[1]||e.defaultSettings||e.settings);defaultSettings=e.defaultSettings&&JSON.parse(JSON.stringify(e.defaultSettings));defaultPlacement={...e.defaultPlacement};photoSettings.clear();for(const [id,value] of e.perPhoto)photoSettings.set(id,JSON.parse(JSON.stringify(value)));state.placements=new Map(e.placements.map(([id,v])=>[id,{...v}]));Object.assign(state,{person:e.person,original:e.original,fullPerson:e.fullPerson},state.placements.get(state.active)||e.settings.person);defaultAux=e.defaultAux;photoAux.clear();for(const [id,aux] of e.photoAux)photoAux.set(id,aux);studio.restoreAux(photoAux.get(state.active)||e.defaultAux||e.aux);redaction?.restore(e.redactions);$('icSize').value=state.size*100;render();restoring=false;controls();status(step<0?'已復原上一步。':'已重做。');}
    function resetHistory(){clearTimeout(historyTimer);history=[];historyIndex=-1;historyDirty=true;recordHistory();}
    function buildTabs(){
        const header=dialog.querySelector('.ic-head'),toolbar=dialog.querySelector('.ic-toolbar'),side=dialog.querySelector('.ic-controls');
        const uploads=document.createElement('div');uploads.className='ic-header-uploads';uploads.append($('icBackground').closest('label'),$('icClear'));header.insertBefore(uploads,$('icClose'));
        const nav=document.createElement('div');nav.className='ic-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','圖片編輯功能');toolbar.prepend(nav);
        const person=$('icUsePerson').closest('section'),output=dialog.querySelector('.ic-output');person.id='icPersonSection';output.id='icOutputSection';
        const note=side.querySelector(':scope > .ic-note');if(note)output.append(note);output.open=true;output.querySelector('summary').hidden=true;
        const panels=[['crop','裁切拼版',$('icCropSection')],['person','人物合成',person],['brand','品牌底條',$('icBrandSection')],['caption','文字',$('icCaptionSection')],['watermark','浮水印',$('icWatermarkSection')],['redact','局部遮蔽',$('icRedactSection')],['output','輸出設定',output],['layouts','我的版面',$('icLayoutsSection')]];
        function select(key){redaction?.cancel();for(const [id,,panel] of panels){const active=id===key;panel.hidden=!active;const button=$('icTab_'+id);button.setAttribute(id==='layouts'?'aria-pressed':'aria-selected',String(active));button.tabIndex=id==='layouts'||active||key==='layouts'&&id==='crop'?0:-1;}side.scrollTop=0;redaction?.sync();draw($('icCanvas'));}
        for(const [id,label,panel] of panels){const b=document.createElement('button');b.type='button';b.id='icTab_'+id;b.textContent=label;b.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',b.id);b.onclick=()=>select(id);
            if(id==='layouts'){panel.setAttribute('role','region');b.className='ic-layout-entry';uploads.append(b);continue;}
            b.setAttribute('role','tab');panel.setAttribute('role','tabpanel');b.onkeydown=e=>{const items=panels.filter(p=>p[0]!=='layouts'),index=items.findIndex(p=>p[0]===id);let next;if(e.key==='ArrowRight')next=(index+1)%items.length;if(e.key==='ArrowLeft')next=(index+items.length-1)%items.length;if(e.key==='Home')next=0;if(e.key==='End')next=items.length-1;if(next!==undefined){e.preventDefault();select(items[next][0]);$('icTab_'+items[next][0]).focus();}};nav.append(b);}
        select('crop');
    }
    function build(){
        dialog=document.createElement('dialog');dialog.className='ic-dialog';dialog.id='imageComposer';dialog.setAttribute('aria-labelledby','icTitle');
        dialog.innerHTML=`<div class="ic-shell"><header class="ic-head"><div><h2 id="icTitle">圖片工具</h2><p>人物・文字・浮水印，一次完成</p></div><button type="button" id="icClose" aria-label="關閉圖片工具">關閉</button></header>
        <div class="ic-toolbar"><label class="ic-file">＋ 選擇照片<input id="icBackground" type="file" accept="image/*" multiple></label><button type="button" id="icClear">清空照片</button><div class="ic-history"><button type="button" id="icUndo" title="復原編輯設定與去背修補；不含新增或移除照片" disabled>復原</button><button type="button" id="icRedo" disabled>重做</button></div><div class="ic-downloads"><button type="button" id="icDownload" class="ic-primary" disabled>下載這張</button><button type="button" id="icAll" disabled>全部下載</button><button type="button" id="icZip" disabled>打包 ZIP</button></div></div>
        <div class="ic-body"><aside class="ic-controls">
        <section class="ic-section"><label class="ic-section-title"><input id="icUsePerson" type="checkbox">人物合成</label><div id="icPersonBody" hidden>
        <label class="ic-file">選擇人物照片<input id="icPerson" type="file" accept="image/*"></label><p class="ic-name" id="icPersonName">建議使用人物清楚的獨照</p><label class="ic-check"><input id="icAuto" type="checkbox" checked>自動去除背景</label><div id="icMattingOptions"><label class="ic-size-label" for="icQuality">去背品質</label><select id="icQuality" class="it-in"><option value="best">高精細去背（品質優先）</option><option value="fine">人像柔邊（保留髮絲）</option><option value="fast">快速去背</option></select></div><label class="ic-size-label" for="icStyle">人物效果</label><select id="icStyle" class="it-in"><option value="natural">自然去背</option><option value="sticker">白邊貼紙</option></select><div id="icOutlineControls" hidden><label class="ic-size-label" for="icOutline">白邊粗細 <strong id="icOutlineValue">2</strong></label><input id="icOutline" type="range" min="1" max="8" value="2"></div><canvas id="icThumb" class="ic-thumb" hidden aria-label="人物去背預覽"></canvas><div class="ic-actions"><button type="button" id="icRetry" disabled>重新處理</button><button type="button" id="icCancel" hidden>取消處理</button><button type="button" id="icCutout" disabled>下載去背人物</button></div>
        <label class="ic-size-label" for="icSize">人物大小 <strong id="icSizeValue">50%</strong></label><input id="icSize" type="range" min="10" max="120" value="50" disabled><div class="ic-actions"><button type="button" id="icFlip" disabled>左右翻轉</button><button type="button" id="icReset" disabled>重設位置</button></div><p class="ic-note">拖曳預覽中的人物即可移動。每張照片可分別調整位置；人物、文字及浮水印會一起輸出。</p></div></section>
        <section id="icLayoutsSection" class="ic-section"></section><section id="icBrandSection" class="ic-section"></section><section id="icCaptionSection" class="ic-section"></section><section id="icWatermarkSection" class="ic-section"></section><details class="ic-output"><summary>輸出設定</summary><div id="icOutput"></div></details><p class="ic-note">照片在本機處理，不會上傳。首次自動去背需要連網載入工具，不必另外安裝。已去背的 PNG 可關閉「自動去除背景」。</p></aside>
        <main class="ic-preview"><div class="ic-preview-head"><span id="icPhotoName">尚未選擇照片</span><label>調整範圍 <select id="icEditScope"><option value="current">只有這張</option><option value="all">全部照片（持續連動）</option></select></label><button type="button" id="icApplyAll">套用全部</button><button type="button" id="icRemove" disabled>移除這張</button></div><div class="ic-stage" id="icStage"><p class="ic-empty" id="icEmpty"><strong>先選擇要編輯的照片</strong><br>也可以直接把照片拖到這裡<br><small>人物合成、加註文字、浮水印可自由搭配</small></p><canvas id="icCanvas" hidden tabindex="0" aria-label="圖片預覽，可拖曳人物或使用方向鍵移動"></canvas></div><div id="icPhotos" class="ic-photos" hidden aria-label="選擇要編輯的照片"></div><div id="icStatus" class="ic-status" role="status" aria-live="polite">選擇照片後，開啟需要的功能即可。</div></main></div></div>`;
        document.body.appendChild(dialog);
        // Reuse the existing settings and drawing engine, including saved preferences.
        for(const [section,toggle,box] of [['icCaptionSection','itUseCap','itCapBox'],['icWatermarkSection','itUseWm','itWmBox']]){
            const title=$(toggle).closest('label');title.className='ic-section-title';$(section).append(title,$(box));$(box).querySelector('.it-sec-t').hidden=true;
        }
        BrandBanner.mount($('icBrandSection'),render);BrandBanner.enhanceCaption(render);
        const output=$('itQ').closest('.it-sec');$('icOutput').append(output);output.querySelector('.it-sec-t').hidden=true;
        output.lastElementChild.textContent='下載檔名會加上「_編輯」，不會覆蓋原圖。';
        studio=ImageStudio.mount({render,flush:flushHistory,status,decode,busy,lock:value=>{externalBusy=value;controls();if(!value){studio?.afterRender();scheduleHistory();}},getPerson:()=>state.person,getOriginal:()=>state.original,getFullPerson:()=>state.fullPerson,hasPhoto:()=>!!state.bg,setPerson:(full,original)=>{flushHistory();const person=trim(full);state.person=person;state.original=original;state.fullPerson=full;$('icPersonName').textContent='已載入人物素材';const thumb=$('icThumb');thumb.width=person.width;thumb.height=person.height;thumb.getContext('2d').drawImage(person,0,0);thumb.hidden=false;}});
        redaction=ImageRedaction.mount({id:()=>state.active,frameKey:()=>frameKey(),busy,flush:flushHistory,changed:()=>{render();flushHistory();},preview:()=>draw($('icCanvas')),status});
        buildTabs();
        $('icUndo').onclick=()=>undoRedo(-1);$('icRedo').onclick=()=>undoRedo(1);
        dialog.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){e.preventDefault();undoRedo(e.key.toLowerCase()==='y'||e.shiftKey?1:-1);}});
        ImageLayouts.mount($('icLayoutsSection'),{snapshot:layoutSnapshot,apply:applyLayout,isBusy:busy,thumbnail:()=>{const c=canvas(320,200);if(state.bg)c.getContext('2d').drawImage($('icCanvas'),0,0,320,200);else{c.getContext('2d').fillStyle='#eeeae4';c.getContext('2d').fillRect(0,0,320,200);BrandBanner.draw(c.getContext('2d'),320,200,{...BrandBanner.options(),height:24});}return c.toDataURL('image/jpeg',.65);}});
        $('icClose').onclick=()=>dialog.close();
        dialog.addEventListener('close',()=>{drag=null;redaction.cancel();cancelCutout();flushHistory();itSaveCfg();if(previousFocus&&previousFocus.isConnected)previousFocus.focus();});
        dialog.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});
        $('icUsePerson').onchange=()=>{if(!enabled())cancelCutout();render();};
        $('icBackground').onchange=e=>{if(e.target.files.length){resetHistory();itAddFiles(e.target.files);}e.target.value='';};
        $('icClear').onclick=()=>{redaction.clear();photoSettings.clear();photoAux.clear();state.placements.clear();state.active=null;itClear();resetHistory();status('照片已清空，可重新選擇照片。');};
        $('icRemove').onclick=()=>removePhoto(state.active);
        const stage=$('icStage');stage.ondragover=e=>e.preventDefault();stage.ondrop=e=>{e.preventDefault();if(!busy())itAddFiles(e.dataTransfer.files);};
        $('icPerson').onchange=async e=>{
            const f=e.target.files[0];e.target.value='';if(!f||state.busy)return;
            const loadSeq=++state.sequence;state.busy=true;controls();status('正在讀取人物照片…');
            try{const image=await decode(f,2560);if(loadSeq!==state.sequence)return;state.original=image;state.person=null;$('icThumb').hidden=true;$('icPersonName').textContent=f.name;render();state.busy=false;await cutout();}catch(err){if(loadSeq===state.sequence)status(err.message,true);}finally{if(loadSeq===state.sequence){state.busy=false;controls();}}
        };
        $('icCancel').onclick=cancelCutout;$('icRetry').onclick=cutout;$('icAuto').onchange=cutout;$('icQuality').onchange=cutout;
        ['itMax','itQ'].forEach(id=>$(id).addEventListener('input',render));
        $('icStyle').onchange=render;$('icOutline').oninput=render;
        $('icSize').oninput=e=>{state.size=Number(e.target.value)/100;render();};
        $('icFlip').onclick=()=>{state.flip=!state.flip;render();};$('icReset').onclick=reset;
        const c=$('icCanvas');
        c.onpointerdown=e=>{if(busy()||e.button!==0)return;if(redaction.begin(point(e))){drag={id:e.pointerId,redact:true};c.setPointerCapture(e.pointerId);e.preventDefault();return;}const text=studio.hit(point(e));if(text){if(studio.locked(text.id)){status('🔒 這個元素已鎖定，請先取消鎖定。');return;}flushHistory();const pointer=point(e);drag={id:e.pointerId,text:text.id,w:text.w,h:text.h,x:pointer.x-text.x-text.w/2,y:pointer.y-text.y-text.h/2};c.setPointerCapture(e.pointerId);e.preventDefault();return;}if(!enabled()||!state.person)return;flushHistory();const p=point(e),r=geometry(1,c.height/c.width),py=p.y*c.height/c.width;if(p.x<r.x||p.x>r.x+r.w||py<r.y||py>r.y+r.h)return;if(studio.locked('person')){status('🔒 人物已鎖定，請到人物合成取消鎖定。');return;}drag={id:e.pointerId,x:p.x-state.x,y:p.y-state.y};c.setPointerCapture(e.pointerId);c.focus();e.preventDefault();};
        c.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);if(drag.redact){redaction.move({x:Math.max(0,Math.min(1,p.x)),y:Math.max(0,Math.min(1,p.y))});return;}if(drag.text){const snapped=studio.snap({x:p.x-drag.x,y:p.y-drag.y},{w:drag.w,h:drag.h},c,drag.text);studio.dragTo(drag.text,{x:snapped.x,y:snapped.y});draw(c);studio.guides(c,snapped.lines);return;}const snapped=studio.snap({x:p.x-drag.x,y:p.y-drag.y},{w:state.size*c.height/c.width*state.person.width/state.person.height,h:state.size},c,'person');state.x=snapped.x;state.y=snapped.y;remember();draw(c);studio.guides(c,snapped.lines);};
        c.onpointerup=c.onpointercancel=c.onlostpointercapture=e=>{if(drag){if(drag.redact)redaction.end(e.type!=='pointerup');drag=null;render();flushHistory();}};
        c.onkeydown=e=>{if(busy())return;if(!enabled()||!state.person||studio.locked('person')||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?.03:.005;state.x=Math.max(0,Math.min(1,state.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)));state.y=Math.max(0,Math.min(1,state.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)));remember();render();};
        $('icApplyAll').onclick=()=>{if(busy()||!state.bg)return;flushHistory();const snapshot=layoutSnapshot(),aux=studio.aux();defaultSettings=JSON.parse(JSON.stringify(snapshot));defaultAux=aux;for(const f of _itFiles){photoSettings.set(f.id,JSON.parse(JSON.stringify(snapshot)));photoAux.set(f.id,aux);}$('icEditScope').value='current';render();flushHistory();status('已套用設定至全部照片；人物位置與局部遮蔽各自保留。');};
        $('icDownload').onclick=()=>exportPhotos(false);$('icAll').onclick=()=>exportPhotos(true);$('icZip').onclick=()=>exportPhotos(true,true);
        $('icCutout').onclick=async()=>{if(state.person&&!state.busy)try{await download(state.person,'人物_去背.png','image/png');status('已產生去背人物下載。');}catch(e){status(e.message,true);}};
    }
    window.ImageComposer={refresh};
    window.openImageComposer=function(){const first=!dialog;if(first)build();if(dialog.open)return;previousFocus=document.activeElement;if(first)['icUsePerson','itUseCap','itUseWm','icUseBrand'].forEach(id=>$(id).checked=false);dialog.showModal();restoring=true;refresh();restoring=false;if(first){defaultSettings=layoutSnapshot();resetHistory();}};
})();
