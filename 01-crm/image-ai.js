/* Browser-only inference. No photo upload. Model versions and checksums are pinned.
 * LaMa: Apache-2.0. MI-GAN: Picsart AI Research, MIT.
 * See image-ai-licenses.txt for model and runtime notices. */
(function(){
 'use strict';
 let worker,url,cancelActive,sequence=0;
 function workerMain(){
  let session,kind;
  const models={inpaint:{url:'https://huggingface.co/g-ronimo/lama/resolve/418036c6b541e526cdbb0bead1ec3a87dabede53/lama_512_int8.onnx',size:62074990,hash:'cab19978adc306622fe37ef60d4a52103b99c98141d499c2a2366a7ed1255dbe'},remove:{url:'https://huggingface.co/andraniksargsyan/migan/resolve/406830d0fa60666da0071c342ad2fbc8f30c5c64/migan_pipeline_v2.onnx',size:28079181,hash:'6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b'}};
  async function load(mode,progress){
   if(session&&kind===mode)return session;
   if(session){await session.release();session=null;}
   const root='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
   if(!self.ort)importScripts(root+'ort.webgpu.min.js');ort.env.wasm.wasmPaths=root;ort.env.wasm.numThreads=1;
   const model=models[mode];let cache,bytes;
   try{cache=await caches.open('crm-model-photo-ai-v1');const saved=await cache.match(model.url);if(saved)bytes=new Uint8Array(await saved.arrayBuffer());}catch(_){}
   if(!bytes){bytes=new Uint8Array(model.size);const step=4*1024*1024;for(let offset=0;offset<model.size;offset+=step){const end=Math.min(model.size-1,offset+step-1);let part;
    for(let attempt=0;attempt<3;attempt++){try{const response=await fetch(model.url+'?download=true&segment='+offset,{headers:{Range:'bytes='+offset+'-'+end}});if(!response.ok)throw Error('模型下載失敗');part=new Uint8Array(await response.arrayBuffer());if(response.status===200&&part.length===model.size){bytes=part;offset=model.size;break;}if(response.status!==206||part.length!==end-offset+1)throw Error('模型下載不完整');bytes.set(part,offset);break;}catch(error){if(attempt===2)throw error;}}
    progress('首次下載 AI 模型 '+Math.min(100,Math.round((end+1)/model.size*100))+'%（約 '+Math.round(model.size/1048576)+' MB）');
   }}
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
   if(hash!==model.hash){await cache?.delete(model.url);throw Error('模型校驗失敗，請重試');}
   if(cache)try{await cache.put(model.url,new Response(bytes));}catch(_){}
   progress('正在啟動 AI 模型…');
   session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
   kind=mode;return session;
  }
  self.onmessage=async event=>{const {id,mode,pixels,width,height,mask}=event.data,progress=text=>self.postMessage({id,progress:text});let input,maskInput,outputs;
   try{const model=await load(mode,progress),n=width*height;
    if(mode==='inpaint'){
     const data=new Float32Array(n*4);for(let i=0;i<n;i++){const hole=mask[i]===0?1:0;for(let c=0;c<3;c++)data[c*n+i]=pixels[4*i+c]/255*(1-hole);data[3*n+i]=hole;}input=new ort.Tensor('float32',data,[1,4,height,width]);progress('LaMa 正在精細修補圈選範圍…');outputs=await model.run({[model.inputNames[0]]:input});const out=outputs[model.outputNames[0]],rgba=new Uint8ClampedArray(n*4);for(let i=0;i<n;i++){for(let c=0;c<3;c++)rgba[4*i+c]=Math.max(0,Math.min(255,out.data[c*n+i]*255));rgba[4*i+3]=pixels[4*i+3];}self.postMessage({id,pixels:rgba,width,height},[rgba.buffer]);
    }else if(mode==='remove'){
     const rgb=new Uint8Array(n*3);for(let i=0;i<n;i++)for(let c=0;c<3;c++)rgb[c*n+i]=pixels[4*i+c];
     input=new ort.Tensor('uint8',rgb,[1,3,height,width]);maskInput=new ort.Tensor('uint8',mask,[1,1,height,width]);progress('AI 正在修補圈選範圍…');
     outputs=await model.run({[model.inputNames[0]]:input,[model.inputNames[1]]:maskInput});const out=outputs[model.outputNames[0]],rgba=new Uint8ClampedArray(n*4);
     for(let i=0;i<n;i++){for(let c=0;c<3;c++)rgba[4*i+c]=out.data[c*n+i];rgba[4*i+3]=pixels[4*i+3];}self.postMessage({id,pixels:rgba,width,height},[rgba.buffer]);
    }
   }catch(error){self.postMessage({id,error:String(error.message||error)});}finally{input?.dispose();maskInput?.dispose();if(outputs)Object.values(outputs).forEach(t=>t.dispose());}
  };
 }
 function stop(){worker?.terminate();worker=null;if(url)URL.revokeObjectURL(url);url=null;}
 async function run(source,mode,rect,progress,maxEdge=768,variant='fine'){
  if(cancelActive)throw Error('已有 AI 工作正在處理');
  if(mode!=='remove')throw Error('未知的 AI 操作');
  const sw=source.naturalWidth||source.width,sh=source.naturalHeight||source.height;let x=0,y=0,w=sw,h=sh;
  if(mode==='remove'){if(!rect||rect.w<=0||rect.h<=0)throw Error('請先圈選要移除的雜物');const pad=Math.max(64,Math.max(rect.w*sw,rect.h*sh)*.8);x=Math.max(0,Math.floor(rect.x*sw-pad));y=Math.max(0,Math.floor(rect.y*sh-pad));w=Math.min(sw,Math.ceil((rect.x+rect.w)*sw+pad))-x;h=Math.min(sh,Math.ceil((rect.y+rect.h)*sh+pad))-y;}
  const fine=mode==='remove'&&variant==='fine';if(fine){const side=Math.min(Math.max(w,h),Math.min(sw,sh));if(side>=rect.w*sw&&side>=rect.h*sh){x=Math.max(0,Math.min(sw-side,(rect.x+rect.w/2)*sw-side/2));y=Math.max(0,Math.min(sh-side,(rect.y+rect.h/2)*sh-side/2));w=h=side;}}
  const ratio=Math.min(1,1024/Math.max(w,h)),width=fine?512:Math.max(16,Math.round(w*ratio)),height=fine?512:Math.max(16,Math.round(h*ratio)),c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.drawImage(source,x,y,w,h,0,0,width,height);const pixels=ctx.getImageData(0,0,width,height).data;let mask;
  if(mode==='remove'){mask=new Uint8Array(width*height).fill(255);for(let py=0;py<height;py++)for(let px=0;px<width;px++){const xx=x+px/width*w,yy=y+py/height*h;if(xx>=rect.x*sw&&xx<=(rect.x+rect.w)*sw&&yy>=rect.y*sh&&yy<=(rect.y+rect.h)*sh)mask[py*width+px]=0;}}
  if(!worker){url=URL.createObjectURL(new Blob(['('+workerMain.toString()+')()'],{type:'text/javascript'}));worker=new Worker(url);}
  const id=++sequence,result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{stop();reject(Error('AI 處理逾時，請縮小照片或改用較快模式。'));},1200000);cancelActive=()=>{clearTimeout(timer);stop();reject(Error('已取消 AI 處理'));};worker.onmessage=e=>{const data=e.data;if(data.id!==id)return;if(data.progress){progress?.(data.progress);return;}clearTimeout(timer);if(data.error){stop();reject(Error(data.error));}else resolve(data);};worker.onerror=()=>{clearTimeout(timer);stop();reject(Error('此瀏覽器未能啟動 AI，請更新瀏覽器後重試。'));};worker.postMessage({id,mode:fine?'inpaint':mode,pixels,width,height,mask},mask?[pixels.buffer,mask.buffer]:[pixels.buffer]);}).finally(()=>{cancelActive=null;});
  const out=document.createElement('canvas');out.width=result.width;out.height=result.height;out.getContext('2d').putImageData(new ImageData(result.pixels,result.width,result.height),0,0);

  // Keep every pixel outside the selected rectangle unchanged at original resolution.
  const final=document.createElement('canvas');final.width=sw;final.height=sh;const fc=final.getContext('2d');fc.drawImage(source,0,0);const left=Math.max(0,Math.floor(rect.x*sw)),top=Math.max(0,Math.floor(rect.y*sh)),rw=Math.min(sw-left,Math.ceil(rect.w*sw)),rh=Math.min(sh-top,Math.ceil(rect.h*sh)),patch=document.createElement('canvas');patch.width=rw;patch.height=rh;const pc=patch.getContext('2d');pc.drawImage(out,x-left,y-top,w,h);fc.putImageData(pc.getImageData(0,0,rw,rh),left,top);return final;
 }
 window.ImageAI={run,cancel:()=>cancelActive?.()};
})();
