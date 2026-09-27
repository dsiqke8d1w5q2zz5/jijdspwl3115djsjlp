/* Person compositing: images stay in this browser; only model assets are fetched. */
(function () {
    'use strict';
    const state = { bg:null, original:null, person:null, x:.22, y:.72, size:.5, flip:false, busy:false, sequence:0, bgSequence:0 };
    let dialog, previousFocus, segmenterPromise, drag;
    const $ = id => document.getElementById(id);
    function status(message, error) { $('icStatus').textContent=message; $('icStatus').dataset.error=!!error; }
    function controls() {
        $('icDownload').disabled=!state.bg || !state.person || state.busy;
        $('icRetry').disabled=!state.original || state.busy;
        $('icPerson').disabled=state.busy;
        $('icAuto').disabled=state.busy;
        $('icCutout').disabled=!state.person || state.busy;
        ['icSize','icFlip','icReset'].forEach(id=>$(id).disabled=!state.person);
        $('icSizeValue').textContent=Math.round(state.size*100)+'%';
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
    function geometry(w,h) {
        const ph=h*state.size,pw=state.person?ph*state.person.width/state.person.height:0;
        return {x:w*state.x-pw/2,y:h*state.y-ph/2,w:pw,h:ph};
    }
    function draw(target) {
        const ctx=target.getContext('2d');ctx.clearRect(0,0,target.width,target.height);
        if(!state.bg)return;
        ctx.drawImage(state.bg,0,0,target.width,target.height);
        if(state.person){const r=geometry(target.width,target.height);ctx.save();ctx.translate(r.x+(state.flip?r.w:0),r.y);ctx.scale(state.flip?-1:1,1);ctx.drawImage(state.person,0,0,r.w,r.h);ctx.restore();}
    }
    function render() {
        const c=$('icCanvas');c.hidden=!state.bg;$('icEmpty').hidden=!!state.bg;
        if(state.bg){const scale=Math.min(1,1000/Math.max(state.bg.width,state.bg.height));c.width=Math.round(state.bg.width*scale);c.height=Math.round(state.bg.height*scale);draw(c);}
        controls();
    }
    function reset() {state.x=.22;state.y=.72;state.size=.5;state.flip=false;$('icSize').value=50;render();}
    function point(e) {const r=$('icCanvas').getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
    function download(source,name,type) {
        source.toBlob(blob=>{
            if(!blob){status('無法產生圖片，請再試一次。',true);return;}
            const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
            status('已產生下載圖片，原圖沒有被修改。');
        },type,.94);
    }
    function build() {
        dialog=document.createElement('dialog');dialog.className='ic-dialog';dialog.id='imageComposer';dialog.setAttribute('aria-labelledby','icTitle');
        dialog.innerHTML=`<div class="ic-shell"><header class="ic-head"><h2 id="icTitle">人物合成</h2><button type="button" id="icClose" aria-label="關閉人物合成">關閉</button></header>
        <div class="ic-body"><aside class="ic-controls">
        <section class="ic-step"><h3>1 選擇背景</h3><label class="ic-file">選擇背景照片<input id="icBackground" type="file" accept="image/*"></label><p class="ic-name" id="icBgName">房屋照片或已排版的圖片</p></section>
        <section class="ic-step"><h3>2 加入人物</h3><label class="ic-file">選擇人物照片<input id="icPerson" type="file" accept="image/*"></label><p class="ic-name" id="icPersonName">建議使用人物清楚的獨照</p><label class="ic-check"><input id="icAuto" type="checkbox" checked>自動去除背景</label><canvas id="icThumb" class="ic-thumb" hidden aria-label="人物去背預覽"></canvas><button type="button" id="icRetry" disabled>重新處理</button></section>
        <section class="ic-step ic-position"><h3>3 調整位置與大小</h3><label for="icSize">人物大小 <strong id="icSizeValue">50%</strong></label><input id="icSize" type="range" min="10" max="120" value="50" disabled><div class="ic-actions"><button type="button" id="icFlip" disabled>左右翻轉</button><button type="button" id="icReset" disabled>重設位置</button></div><p class="ic-note">拖曳照片中的人物即可移動。也可點選預覽後，用方向鍵微調位置。</p></section>
        <p class="ic-note">照片只在本機處理，不會上傳。首次去背需連網下載模型；透明背景 PNG 可取消勾選自動去背。輸出最長邊為 2560 像素。</p></aside>
        <main class="ic-preview"><div id="icStatus" class="ic-status" role="status" aria-live="polite">先選擇背景照片，再加入人物。</div><div class="ic-stage"><p class="ic-empty" id="icEmpty">把人物放進房屋照片<br>選好背景後，合成結果會顯示在這裡。</p><canvas id="icCanvas" hidden tabindex="0" aria-label="合成預覽，可拖曳人物或使用方向鍵移動"></canvas></div></main></div>
        <footer class="ic-foot"><span>確認人物位置後，再下載合成圖。</span><button type="button" id="icCutout" disabled>下載去背人物</button><button type="button" id="icDownload" class="ic-primary" disabled>下載合成圖片</button></footer></div>`;
        document.body.appendChild(dialog);
        $('icClose').onclick=()=>dialog.close();
        dialog.addEventListener('close',()=>{drag=null;if(previousFocus&&previousFocus.isConnected)previousFocus.focus();});
        dialog.addEventListener('keydown',e=>{if(e.key!=='Escape')e.stopPropagation();});
        $('icBackground').onchange=async e=>{
            const f=e.target.files[0];e.target.value='';if(!f)return;const seq=++state.bgSequence;
            try{const image=await decode(f,2560);if(seq!==state.bgSequence)return;state.bg=image;state.name=f.name.replace(/\.[^.]+$/,'');$('icBgName').textContent=f.name;render();status(state.person?'可拖曳人物，調整位置後下載。':'背景已加入，請選擇人物照片。');}catch(err){if(seq===state.bgSequence)status(err.message,true);}
        };
        $('icPerson').onchange=async e=>{
            const f=e.target.files[0];e.target.value='';if(!f||state.busy)return;
            state.busy=true;controls();status('正在讀取人物照片…');
            try{const image=await decode(f,1600);state.original=image;state.person=null;$('icThumb').hidden=true;$('icPersonName').textContent=f.name;reset();state.busy=false;await cutout();}catch(err){status(err.message,true);}finally{state.busy=false;controls();}
        };
        $('icRetry').onclick=cutout;$('icAuto').onchange=cutout;
        $('icSize').oninput=e=>{state.size=Number(e.target.value)/100;render();};
        $('icFlip').onclick=()=>{state.flip=!state.flip;render();};$('icReset').onclick=reset;
        const c=$('icCanvas');
        c.onpointerdown=e=>{if(!state.person||e.button!==0)return;const p=point(e),r=geometry(1,state.bg.height/state.bg.width);const py=p.y*state.bg.height/state.bg.width;if(p.x<r.x||p.x>r.x+r.w||py<r.y||py>r.y+r.h)return;drag={id:e.pointerId,x:p.x-state.x,y:p.y-state.y};c.setPointerCapture(e.pointerId);c.focus();e.preventDefault();};
        c.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e);state.x=Math.max(0,Math.min(1,p.x-drag.x));state.y=Math.max(0,Math.min(1,p.y-drag.y));draw(c);};
        c.onpointerup=c.onpointercancel=c.onlostpointercapture=()=>{drag=null;};
        c.onkeydown=e=>{if(!state.person||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?.03:.005;state.x=Math.max(0,Math.min(1,state.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0)));state.y=Math.max(0,Math.min(1,state.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)));draw(c);};
        $('icDownload').onclick=()=>{if(!state.bg||!state.person||state.busy)return;const out=canvas(state.bg.width,state.bg.height);draw(out);download(out,(state.name||'照片')+'_人物合成.jpg','image/jpeg');};
        $('icCutout').onclick=()=>{if(state.person&&!state.busy)download(state.person,'人物_去背.png','image/png');};
    }
    window.openImageComposer=function(){if(!dialog)build();previousFocus=document.activeElement;if(!dialog.open)dialog.showModal();render();};
})();
