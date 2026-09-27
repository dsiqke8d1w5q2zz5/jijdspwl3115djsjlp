/* Person compositing: images stay in this browser; only model assets are fetched. */
(function () {
    'use strict';
    const state = { bg:null, original:null, matte:null, person:null, x:.22, y:.72, size:.5, flip:false, busy:false, sequence:0, bgSequence:0, active:null, placements:new Map(), exporting:false };
    let dialog, previousFocus, segmenterPromise, drag;
    const $ = id => document.getElementById(id);
    function status(message, error) { $('icStatus').textContent=message; $('icStatus').dataset.error=!!error; }
    function enabled(){return $('icUsePerson').checked;}
    function controls() {
        const working=state.busy||state.exporting;
        $('icDownload').disabled=!state.bg||working||(enabled()&&!state.person);
        $('icAll').disabled=$('icDownload').disabled||_itFiles.length<2;
        $('icRetry').disabled=!state.original||working;$('icCancel').hidden=!state.busy;
        $('icPerson').disabled=working;$('icAuto').disabled=working;$('icQuality').disabled=working;
        $('icMattingOptions').hidden=!$('icAuto').checked;
        $('icOutlineControls').hidden=$('icStyle').value!=='sticker';
        $('icOutlineValue').textContent=$('icOutline').value;
        $('icBackground').disabled=state.exporting;$('icClear').disabled=state.exporting;
        $('icRemove').disabled=!state.bg||state.exporting;
        $('icCutout').disabled=!state.person||working;
        ['icSize','icFlip','icReset'].forEach(id=>$(id).disabled=!state.person||state.exporting);
        $('icSizeValue').textContent=Math.round(state.size*100)+'%';
        $('icPersonBody').hidden=!enabled();
        if($('icBrandBody'))$('icBrandBody').hidden=!$('icUseBrand').checked;
        $('itWmBox').hidden=!$('itUseWm').checked;$('itCapBox').hidden=!$('itUseCap').checked;
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
            state.person=trim(out);
            const thumb=$('icThumb');thumb.width=state.person.width;thumb.height=state.person.height;thumb.getContext('2d').drawImage(state.person,0,0);thumb.hidden=false;
            status('人物已準備好。可直接拖曳人物，並調整大小。');
            render();
        } catch(e){ if(seq===state.sequence)status(/人物|精細去背/.test(e.message)?e.message:'去背未完成，請確認網路後按「重新處理」。也可取消自動去背，使用透明背景 PNG。',true); }
        finally { if(seq===state.sequence){state.busy=false;controls();} }
    }
    function remember(){if(state.active)state.placements.set(state.active,{x:state.x,y:state.y,size:state.size,flip:state.flip});}
    function geometry(w,h,pos=state,person=state.person){const ph=h*pos.size,pw=person?ph*person.width/person.height:0;return{x:w*pos.x-pw/2,y:h*pos.y-ph/2,w:pw,h:ph};}
    const whiteSilhouettes=new WeakMap();
    function photoOptions(){return {...itOpts(),brand:BrandBanner.options(),personStyle:$('icStyle').value,outlineWidth:Number($('icOutline').value)};}
    function draw(target,photo=state.bg,pos=state,options=photoOptions(),person=enabled()?state.person:null){
        if(!photo)return;
        const base=canvas(target.width,target.height),ctx=base.getContext('2d');
        ctx.drawImage(photo,0,0,base.width,base.height);
        if(person){const r=geometry(base.width,base.height,pos,person);ctx.save();ctx.translate(r.x+(pos.flip?r.w:0),r.y);ctx.scale(pos.flip?-1:1,1);
            if(options.personStyle==='sticker'){
                let white=whiteSilhouettes.get(person);
                if(!white){white=canvas(person.width,person.height);const wc=white.getContext('2d');wc.drawImage(person,0,0);wc.globalCompositeOperation='source-in';wc.fillStyle='#fff';wc.fillRect(0,0,white.width,white.height);whiteSilhouettes.set(person,white);}
                const radius=options.outlineWidth*base.width/1000;
                for(let i=0;i<24;i++){const angle=i*Math.PI/12;ctx.drawImage(white,Math.cos(angle)*radius,Math.sin(angle)*radius,r.w,r.h);}
            }
            ctx.drawImage(person,0,0,r.w,r.h);ctx.restore();}
        const opts={...options,brandInset:options.brand?.enabled?BrandBanner.height(target.height,options.brand):0};
        itDraw(target,base,opts,target.width,target.height);
        if(options.brand?.enabled)BrandBanner.draw(target.getContext('2d'),target.width,target.height,options.brand);
    }
    function render(){
        if(!dialog)return;
        const c=$('icCanvas');c.hidden=!state.bg;$('icEmpty').hidden=!!state.bg;
        if(state.bg){const scale=Math.min(1,1000/Math.max(state.bg.width,state.bg.height));c.width=Math.max(1,Math.round(state.bg.width*scale));c.height=Math.max(1,Math.round(state.bg.height*scale));c.style.setProperty('--ic-aspect',c.width/c.height);draw(c);}
        remember();controls();
    }
    function refresh(){
        if(!dialog)return;
        let active=_itFiles.find(f=>f.id===state.active);
        if(!active)active=_itFiles[0];
        if(active?.id!==state.active){remember();state.active=active?.id||null;const pos=state.placements.get(state.active)||{x:.22,y:.72,size:.5,flip:false};Object.assign(state,pos);$('icSize').value=state.size*100;}
        state.bg=active?.img||null;
        $('icPhotoName').textContent=active?active.name+' · '+(_itFiles.indexOf(active)+1)+' / '+_itFiles.length:'尚未選擇照片';
        const strip=$('icPhotos');const key=_itFiles.map(f=>f.id).join('|');
        if(strip.dataset.key!==key){strip.dataset.key=key;strip.replaceChildren();for(const f of _itFiles){const b=document.createElement('button');b.type='button';b.dataset.id=f.id;b.title=f.name;b.setAttribute('aria-label','編輯照片：'+f.name);const image=new Image();image.src=f.url;image.alt=f.name;b.append(image);b.onclick=()=>{remember();state.active=f.id;Object.assign(state,state.placements.get(f.id)||{x:.22,y:.72,size:.5,flip:false});$('icSize').value=state.size*100;refresh();};strip.append(b);}}
        strip.hidden=_itFiles.length<2;strip.querySelectorAll('button').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.id===state.active));});
        render();
    }
    function reset(){Object.assign(state,{x:.22,y:.72,size:.5,flip:false});$('icSize').value=50;render();}
    function point(e){const r=$('icCanvas').getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
    function download(source,name,type,q=.94){return new Promise((resolve,reject)=>source.toBlob(blob=>{
        if(!blob){reject(Error('無法產生圖片，請再試一次。'));return;}
        const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);resolve();
    },type,q));}
    async function exportPhotos(all){
        if($('icDownload').disabled)return;
        const options=photoOptions();
        if(options.brand.enabled&&!['company','name','phone','tagline'].some(k=>options.brand[k].trim())){status('請先輸入品牌底條的文字內容。',true);$('icTab_brand').click();$('icBrand_company').focus();return;}
        if(options.useWm&&!options.wmText){status('請輸入浮水印文字，或關閉浮水印。',true);$('icTab_watermark').click();$('itWmText').focus();return;}
        if(options.useCap&&!options.capText.trim()){status('請輸入加註文字，或關閉加註文字。',true);$('icTab_caption').click();$('itCapText').focus();return;}
        remember();itSaveCfg();
        const photos=(all?_itFiles:_itFiles.filter(f=>f.id===state.active)).map(f=>({file:f,pos:{...(state.placements.get(f.id)||{x:.22,y:.72,size:.5,flip:false})}}));
        const person=enabled()?state.person:null;state.exporting=true;controls();
        try{let count=0;for(const {file,pos} of photos){const [w,h]=itOutSize(file,options),out=canvas(w,h);draw(out,file.img,pos,options,person);await download(out,file.name.replace(/\.[^.]+$/,'')+'_編輯.jpg','image/jpeg',options.q);status('已產生 '+(++count)+' / '+photos.length+' 張下載圖片。');await new Promise(resolve=>setTimeout(resolve,250));}status('完成，共 '+photos.length+' 張。原圖沒有被修改。');}
        catch(e){status(e.message||'下載未完成，請重試。',true);}finally{state.exporting=false;controls();}
    }
    function buildTabs(){
        const header=dialog.querySelector('.ic-head'),toolbar=dialog.querySelector('.ic-toolbar'),side=dialog.querySelector('.ic-controls');
        const uploads=document.createElement('div');uploads.className='ic-header-uploads';uploads.append($('icBackground').closest('label'),$('icClear'));header.insertBefore(uploads,$('icClose'));
        const nav=document.createElement('div');nav.className='ic-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','圖片編輯功能');toolbar.prepend(nav);
        const person=$('icUsePerson').closest('section'),output=dialog.querySelector('.ic-output');person.id='icPersonSection';output.id='icOutputSection';
        const note=side.querySelector(':scope > .ic-note');if(note)output.append(note);output.open=true;output.querySelector('summary').hidden=true;
        const panels=[['person','人物合成',person],['caption','文字',$('icCaptionSection')],['watermark','浮水印',$('icWatermarkSection')],['brand','品牌底條',$('icBrandSection')],['output','輸出設定',output]];
        function select(key){for(const [id,,panel] of panels){const active=id===key;panel.hidden=!active;const button=$('icTab_'+id);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}side.scrollTop=0;}
        for(const [id,label,panel] of panels){const b=document.createElement('button');b.type='button';b.id='icTab_'+id;b.textContent=label;b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',b.id);b.onclick=()=>select(id);b.onkeydown=e=>{const index=panels.findIndex(p=>p[0]===id);let next;if(e.key==='ArrowRight')next=(index+1)%panels.length;if(e.key==='ArrowLeft')next=(index+panels.length-1)%panels.length;if(e.key==='Home')next=0;if(e.key==='End')next=panels.length-1;if(next!==undefined){e.preventDefault();select(panels[next][0]);$('icTab_'+panels[next][0]).focus();}};nav.append(b);}
        select('person');
    }
    function build(){
        dialog=document.createElement('dialog');dialog.className='ic-dialog';dialog.id='imageComposer';dialog.setAttribute('aria-labelledby','icTitle');
        dialog.innerHTML=`<div class="ic-shell"><header class="ic-head"><div><h2 id="icTitle">圖片工具</h2><p>人物・文字・浮水印，一次完成</p></div><button type="button" id="icClose" aria-label="關閉圖片工具">關閉</button></header>
        <div class="ic-toolbar"><label class="ic-file">＋ 選擇照片<input id="icBackground" type="file" accept="image/*" multiple></label><button type="button" id="icClear">清空照片</button><div class="ic-downloads"><button type="button" id="icDownload" class="ic-primary" disabled>下載這張</button><button type="button" id="icAll" disabled>全部下載</button></div></div>
        <div class="ic-body"><aside class="ic-controls">
        <section class="ic-section"><label class="ic-section-title"><input id="icUsePerson" type="checkbox">人物合成</label><div id="icPersonBody" hidden>
        <label class="ic-file">選擇人物照片<input id="icPerson" type="file" accept="image/*"></label><p class="ic-name" id="icPersonName">建議使用人物清楚的獨照</p><label class="ic-check"><input id="icAuto" type="checkbox" checked>自動去除背景</label><div id="icMattingOptions"><label class="ic-size-label" for="icQuality">去背品質</label><select id="icQuality" class="it-in"><option value="best">高精細去背（品質優先）</option><option value="fine">人像柔邊（保留髮絲）</option><option value="fast">快速去背</option></select></div><label class="ic-size-label" for="icStyle">人物效果</label><select id="icStyle" class="it-in"><option value="natural">自然去背</option><option value="sticker">白邊貼紙</option></select><div id="icOutlineControls" hidden><label class="ic-size-label" for="icOutline">白邊粗細 <strong id="icOutlineValue">2</strong></label><input id="icOutline" type="range" min="1" max="8" value="2"></div><canvas id="icThumb" class="ic-thumb" hidden aria-label="人物去背預覽"></canvas><div class="ic-actions"><button type="button" id="icRetry" disabled>重新處理</button><button type="button" id="icCancel" hidden>取消處理</button><button type="button" id="icCutout" disabled>下載去背人物</button></div>
        <label class="ic-size-label" for="icSize">人物大小 <strong id="icSizeValue">50%</strong></label><input id="icSize" type="range" min="10" max="120" value="50" disabled><div class="ic-actions"><button type="button" id="icFlip" disabled>左右翻轉</button><button type="button" id="icReset" disabled>重設位置</button></div><p class="ic-note">拖曳預覽中的人物即可移動。每張照片可分別調整位置；人物、文字及浮水印會一起輸出。</p></div></section>
        <section id="icBrandSection" class="ic-section"></section><section id="icCaptionSection" class="ic-section"></section><section id="icWatermarkSection" class="ic-section"></section><details class="ic-output"><summary>輸出設定</summary><div id="icOutput"></div></details><p class="ic-note">照片在本機處理，不會上傳。首次自動去背需要連網載入工具，不必另外安裝。已去背的 PNG 可關閉「自動去除背景」。</p></aside>
        <main class="ic-preview"><div class="ic-preview-head"><span id="icPhotoName">尚未選擇照片</span><button type="button" id="icRemove" disabled>移除這張</button></div><div class="ic-stage" id="icStage"><p class="ic-empty" id="icEmpty"><strong>先選擇要編輯的照片</strong><br>也可以直接把照片拖到這裡<br><small>人物合成、加註文字、浮水印可自由搭配</small></p><canvas id="icCanvas" hidden tabindex="0" aria-label="圖片預覽，可拖曳人物或使用方向鍵移動"></canvas></div><div id="icPhotos" class="ic-photos" hidden aria-label="選擇要編輯的照片"></div><div id="icStatus" class="ic-status" role="status" aria-live="polite">選擇照片後，開啟需要的功能即可。</div></main></div></div>`;
        document.body.appendChild(dialog);
        // Reuse the existing settings and drawing engine, including saved preferences.
        for(const [section,toggle,box] of [['icCaptionSection','itUseCap','itCapBox'],['icWatermarkSection','itUseWm','itWmBox']]){
            const title=$(toggle).closest('label');title.className='ic-section-title';$(section).append(title,$(box));$(box).querySelector('.it-sec-t').hidden=true;
        }
        BrandBanner.mount($('icBrandSection'),render);BrandBanner.enhanceCaption(render);
        const output=$('itQ').closest('.it-sec');$('icOutput').append(output);output.querySelector('.it-sec-t').hidden=true;
        output.lastElementChild.textContent='下載檔名會加上「_編輯」，不會覆蓋原圖。';
        buildTabs();
        $('icClose').onclick=()=>dialog.close();
        dialog.addEventListener('close',()=>{drag=null;cancelCutout();itSaveCfg();if(previousFocus&&previousFocus.isConnected)previousFocus.focus();});
        dialog.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});
        $('icUsePerson').onchange=()=>{if(!enabled())cancelCutout();render();};
        $('icBackground').onchange=e=>{if(e.target.files.length)itAddFiles(e.target.files);e.target.value='';};
        $('icClear').onclick=()=>{state.placements.clear();state.active=null;itClear();status('照片已清空，可重新選擇照片。');};
        $('icRemove').onclick=()=>{if(!state.active)return;state.placements.delete(state.active);itRemove(state.active);};
        const stage=$('icStage');stage.ondragover=e=>e.preventDefault();stage.ondrop=e=>{e.preventDefault();if(!state.exporting)itAddFiles(e.dataTransfer.files);};
        $('icPerson').onchange=async e=>{
            const f=e.target.files[0];e.target.value='';if(!f||state.busy)return;
            const loadSeq=++state.sequence;state.busy=true;controls();status('正在讀取人物照片…');
            try{const image=await decode(f,2560);if(loadSeq!==state.sequence)return;state.original=image;state.person=null;$('icThumb').hidden=true;$('icPersonName').textContent=f.name;reset();state.busy=false;await cutout();}catch(err){if(loadSeq===state.sequence)status(err.message,true);}finally{if(loadSeq===state.sequence){state.busy=false;controls();}}
        };
        $('icCancel').onclick=cancelCutout;$('icRetry').onclick=cutout;$('icAuto').onchange=cutout;$('icQuality').onchange=cutout;
        $('icStyle').onchange=render;$('icOutline').oninput=render;
        $('icSize').oninput=e=>{state.size=Number(e.target.value)/100;render();};
        $('icFlip').onclick=()=>{state.flip=!state.flip;render();};$('icReset').onclick=reset;
        const c=$('icCanvas');
        c.onpointerdown=e=>{if(!enabled()||!state.person||e.button!==0)return;const p=point(e),r=geometry(1,state.bg.height/state.bg.width),py=p.y*state.bg.height/state.bg.width;if(p.x<r.x||p.x>r.x+r.w||py<r.y||py>r.y+r.h)return;drag={id:e.pointerId,x:p.x-state.x,y:p.y-state.y};c.setPointerCapture(e.pointerId);c.focus();e.preventDefault();};
        c.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);state.x=Math.max(0,Math.min(1,p.x-drag.x));state.y=Math.max(0,Math.min(1,p.y-drag.y));remember();draw(c);};
        c.onpointerup=c.onpointercancel=c.onlostpointercapture=()=>{drag=null;};
        c.onkeydown=e=>{if(!enabled()||!state.person||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?.03:.005;state.x=Math.max(0,Math.min(1,state.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)));state.y=Math.max(0,Math.min(1,state.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)));remember();draw(c);};
        $('icDownload').onclick=()=>exportPhotos(false);$('icAll').onclick=()=>exportPhotos(true);
        $('icCutout').onclick=async()=>{if(state.person&&!state.busy)try{await download(state.person,'人物_去背.png','image/png');status('已產生去背人物下載。');}catch(e){status(e.message,true);}};
    }
    window.ImageComposer={refresh};
    window.openImageComposer=function(){if(!dialog)build();previousFocus=document.activeElement;if(!dialog.open){['icUsePerson','itUseCap','itUseWm','icUseBrand'].forEach(id=>$(id).checked=false);dialog.showModal();}refresh();};
})();
