/* Person compositing: images stay in this browser; only model assets are fetched. */
(function () {
    'use strict';
    const state = { bg:null, original:null, person:null, x:.22, y:.72, size:.5, flip:false, busy:false, sequence:0, bgSequence:0, active:null, placements:new Map(), exporting:false };
    let dialog, previousFocus, segmenterPromise, drag;
    const $ = id => document.getElementById(id);
    function status(message, error) { $('icStatus').textContent=message; $('icStatus').dataset.error=!!error; }
    function enabled(){return $('icUsePerson').checked;}
    function controls() {
        const working=state.busy||state.exporting;
        $('icDownload').disabled=!state.bg||working||(enabled()&&!state.person);
        $('icAll').disabled=$('icDownload').disabled||_itFiles.length<2;
        $('icRetry').disabled=!state.original||working;
        $('icPerson').disabled=working;$('icAuto').disabled=working;
        $('icBackground').disabled=state.exporting;$('icClear').disabled=state.exporting;
        $('icRemove').disabled=!state.bg||state.exporting;
        $('icCutout').disabled=!state.person||working;
        ['icSize','icFlip','icReset'].forEach(id=>$(id).disabled=!state.person||state.exporting);
        $('icSizeValue').textContent=Math.round(state.size*100)+'%';
        $('icPersonBody').hidden=!enabled();
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
        for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++)if(data[(y*source.width+x)*4+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
        if(right<left || count<source.width*source.height*.001)throw Error('沒有辨識到清楚的人物，請換一張人物較清楚的照片。');
        const out=canvas(right-left+1,bottom-top+1);out.getContext('2d').drawImage(source,left,top,out.width,out.height,0,0,out.width,out.height);return out;
    }
    async function cutout() {
        if(!state.original || state.busy)return;
        const seq=++state.sequence;state.busy=true;controls();
        status($('icAuto').checked?'正在準備人物去背，首次使用需下載模型，請稍候…':'正在讀取人物…');
        try {
            const original=state.original, out=canvas(original.width,original.height);
            out.getContext('2d').drawImage(original,0,0);
            if($('icAuto').checked){
                let timeout;
                const model=await Promise.race([loadSegmenter(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('model timeout')),45000);})]).finally(()=>clearTimeout(timeout));
                if(seq!==state.sequence)return;
                status('正在去除人物背景…');
                await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
                model.segment(original,result=>{
                    // Selfie segmenter has one confidence mask: foreground/person probability.
                    const mask=result.confidenceMasks[0], values=mask.getAsFloat32Array();
                    const alpha=canvas(mask.width,mask.height),ac=alpha.getContext('2d'),pixels=ac.createImageData(mask.width,mask.height);
                    for(let i=0;i<values.length;i++){
                        const t=Math.max(0,Math.min(1,(values[i]-.2)/.6));
                        pixels.data[i*4+3]=Math.round(t*t*(3-2*t)*255);
                    }
                    ac.putImageData(pixels,0,0);
                    const ctx=out.getContext('2d');ctx.globalCompositeOperation='destination-in';ctx.drawImage(alpha,0,0,out.width,out.height);ctx.globalCompositeOperation='source-over';
                });
            }
            if(seq!==state.sequence)return;
            state.person=trim(out);
            const thumb=$('icThumb');thumb.width=state.person.width;thumb.height=state.person.height;thumb.getContext('2d').drawImage(state.person,0,0);thumb.hidden=false;
            status('人物已準備好。可直接拖曳人物，並調整大小。');
            render();
        } catch(e){ if(seq===state.sequence)status(e.message.includes('人物')?e.message:'去背未完成，請確認網路後按「重新處理」。也可取消自動去背，使用透明背景 PNG。',true); }
        finally { if(seq===state.sequence){state.busy=false;controls();} }
    }
    function remember(){if(state.active)state.placements.set(state.active,{x:state.x,y:state.y,size:state.size,flip:state.flip});}
    function geometry(w,h,pos=state,person=state.person){const ph=h*pos.size,pw=person?ph*person.width/person.height:0;return{x:w*pos.x-pw/2,y:h*pos.y-ph/2,w:pw,h:ph};}
    function draw(target,photo=state.bg,pos=state,options=itOpts(),person=enabled()?state.person:null){
        if(!photo)return;
        const base=canvas(target.width,target.height),ctx=base.getContext('2d');
        ctx.drawImage(photo,0,0,base.width,base.height);
        if(person){const r=geometry(base.width,base.height,pos,person);ctx.save();ctx.translate(r.x+(pos.flip?r.w:0),r.y);ctx.scale(pos.flip?-1:1,1);ctx.drawImage(person,0,0,r.w,r.h);ctx.restore();}
        itDraw(target,base,options,target.width,target.height);
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
        const options=itOpts();
        if(options.useWm&&!options.wmText){status('請輸入浮水印文字，或關閉浮水印。',true);$('itWmText').focus();return;}
        if(options.useCap&&!options.capText.trim()){status('請輸入加註文字，或關閉加註文字。',true);$('itCapText').focus();return;}
        remember();itSaveCfg();
        const photos=(all?_itFiles:_itFiles.filter(f=>f.id===state.active)).map(f=>({file:f,pos:{...(state.placements.get(f.id)||{x:.22,y:.72,size:.5,flip:false})}}));
        const person=enabled()?state.person:null;state.exporting=true;controls();
        try{let count=0;for(const {file,pos} of photos){const [w,h]=itOutSize(file,options),out=canvas(w,h);draw(out,file.img,pos,options,person);await download(out,file.name.replace(/\.[^.]+$/,'')+'_編輯.jpg','image/jpeg',options.q);status('已產生 '+(++count)+' / '+photos.length+' 張下載圖片。');await new Promise(resolve=>setTimeout(resolve,250));}status('完成，共 '+photos.length+' 張。原圖沒有被修改。');}
        catch(e){status(e.message||'下載未完成，請重試。',true);}finally{state.exporting=false;controls();}
    }
    function build(){
        dialog=document.createElement('dialog');dialog.className='ic-dialog';dialog.id='imageComposer';dialog.setAttribute('aria-labelledby','icTitle');
        dialog.innerHTML=`<div class="ic-shell"><header class="ic-head"><div><h2 id="icTitle">圖片工具</h2><p>人物・文字・浮水印，一次完成</p></div><button type="button" id="icClose" aria-label="關閉圖片工具">關閉</button></header>
        <div class="ic-toolbar"><label class="ic-file">＋ 選擇照片<input id="icBackground" type="file" accept="image/*" multiple></label><button type="button" id="icClear">清空照片</button><div class="ic-downloads"><button type="button" id="icDownload" class="ic-primary" disabled>下載這張</button><button type="button" id="icAll" disabled>全部下載</button></div></div>
        <div class="ic-body"><aside class="ic-controls">
        <section class="ic-section"><label class="ic-section-title"><input id="icUsePerson" type="checkbox">人物合成</label><div id="icPersonBody" hidden>
        <label class="ic-file">選擇人物照片<input id="icPerson" type="file" accept="image/*"></label><p class="ic-name" id="icPersonName">建議使用人物清楚的獨照</p><label class="ic-check"><input id="icAuto" type="checkbox" checked>自動去除背景</label><canvas id="icThumb" class="ic-thumb" hidden aria-label="人物去背預覽"></canvas><div class="ic-actions"><button type="button" id="icRetry" disabled>重新處理</button><button type="button" id="icCutout" disabled>下載去背人物</button></div>
        <label class="ic-size-label" for="icSize">人物大小 <strong id="icSizeValue">50%</strong></label><input id="icSize" type="range" min="10" max="120" value="50" disabled><div class="ic-actions"><button type="button" id="icFlip" disabled>左右翻轉</button><button type="button" id="icReset" disabled>重設位置</button></div><p class="ic-note">拖曳預覽中的人物即可移動。每張照片可分別調整位置；人物、文字及浮水印會一起輸出。</p></div></section>
        <section id="icCaptionSection" class="ic-section"></section><section id="icWatermarkSection" class="ic-section"></section><details class="ic-output"><summary>輸出設定</summary><div id="icOutput"></div></details><p class="ic-note">照片在本機處理，不會上傳。首次去背需連網下載模型。已去背的 PNG 可關閉「自動去除背景」。</p></aside>
        <main class="ic-preview"><div class="ic-preview-head"><span id="icPhotoName">尚未選擇照片</span><button type="button" id="icRemove" disabled>移除這張</button></div><div class="ic-stage" id="icStage"><p class="ic-empty" id="icEmpty"><strong>先選擇要編輯的照片</strong><br>也可以直接把照片拖到這裡<br><small>人物合成、加註文字、浮水印可自由搭配</small></p><canvas id="icCanvas" hidden tabindex="0" aria-label="圖片預覽，可拖曳人物或使用方向鍵移動"></canvas></div><div id="icPhotos" class="ic-photos" hidden aria-label="選擇要編輯的照片"></div><div id="icStatus" class="ic-status" role="status" aria-live="polite">選擇照片後，開啟需要的功能即可。</div></main></div></div>`;
        document.body.appendChild(dialog);
        // Reuse the existing settings and drawing engine, including saved preferences.
        for(const [section,toggle,box] of [['icCaptionSection','itUseCap','itCapBox'],['icWatermarkSection','itUseWm','itWmBox']]){
            const title=$(toggle).closest('label');title.className='ic-section-title';$(section).append(title,$(box));$(box).querySelector('.it-sec-t').hidden=true;
        }
        const output=$('itQ').closest('.it-sec');$('icOutput').append(output);output.querySelector('.it-sec-t').hidden=true;
        output.lastElementChild.textContent='下載檔名會加上「_編輯」，不會覆蓋原圖。';
        $('icClose').onclick=()=>dialog.close();
        dialog.addEventListener('close',()=>{drag=null;itSaveCfg();if(previousFocus&&previousFocus.isConnected)previousFocus.focus();});
        dialog.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});
        $('icUsePerson').onchange=render;
        $('icBackground').onchange=e=>{if(e.target.files.length)itAddFiles(e.target.files);e.target.value='';};
        $('icClear').onclick=()=>{state.placements.clear();state.active=null;itClear();status('照片已清空，可重新選擇照片。');};
        $('icRemove').onclick=()=>{if(!state.active)return;state.placements.delete(state.active);itRemove(state.active);};
        const stage=$('icStage');stage.ondragover=e=>e.preventDefault();stage.ondrop=e=>{e.preventDefault();if(!state.exporting)itAddFiles(e.dataTransfer.files);};
        $('icPerson').onchange=async e=>{
            const f=e.target.files[0];e.target.value='';if(!f||state.busy)return;
            state.busy=true;controls();status('正在讀取人物照片…');
            try{const image=await decode(f,1600);state.original=image;state.person=null;$('icThumb').hidden=true;$('icPersonName').textContent=f.name;reset();state.busy=false;await cutout();}catch(err){status(err.message,true);}finally{state.busy=false;controls();}
        };
        $('icRetry').onclick=cutout;$('icAuto').onchange=cutout;
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
    window.openImageComposer=function(){if(!dialog)build();previousFocus=document.activeElement;if(!dialog.open)dialog.showModal();refresh();};
})();
