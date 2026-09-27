/* Photographic portrait matting, executed locally in a worker.
 * Models: https://huggingface.co/CoderViking/birefnet-lite-onnx (MIT)
 *         https://huggingface.co/Xenova/modnet (Apache-2.0)
 * Runtime: https://github.com/microsoft/onnxruntime (MIT)
 * No image data leaves this browser. Versions are pinned for reproducibility.
 */
(function(){
    'use strict';
    let worker,workerURL,nextId=0,cancelActive;
    function workerMain(){
        let session,loadedQuality;
        self.onmessage=async function(event){
            const {id,pixels,width,height,quality}=event.data;
            let input,outputs;
            try{
                if(!session||loadedQuality!==quality){
                    if(session)await session.release();
                    session=null;
                    self.postMessage({id,progress:'正在載入精細去背工具，首次使用需要較久…'});
                    const root='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
                    if(!self.ort)importScripts(root+'ort.wasm.min.js');
                    ort.env.wasm.wasmPaths=root;ort.env.wasm.numThreads=1;
                    const url=quality==='best'?'https://huggingface.co/CoderViking/birefnet-lite-onnx/resolve/dc06453148f01ef4131f17e9b791345e32e8ee78/birefnet-lite-1024.onnx':'https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model.onnx';
                    let cache,bytes;
                    try{cache=await caches.open('crm-model-matting-v1');const cached=await cache.match(url);if(cached)bytes=new Uint8Array(await cached.arrayBuffer());}catch(_){}
                    if(!bytes){
                        if(quality==='best'){
                            const total=199681624,chunkSize=4*1024*1024;bytes=new Uint8Array(total);
                            for(let offset=0;offset<total;offset+=chunkSize){
                                const end=Math.min(total-1,offset+chunkSize-1);let chunk;
                                for(let attempt=0;attempt<3;attempt++){
                                    try{const response=await fetch(url+'?download=true&segment='+offset,{headers:{Range:'bytes='+offset+'-'+end}});if(response.status!==206)throw Error('range request failed');chunk=new Uint8Array(await response.arrayBuffer());if(chunk.length!==end-offset+1)throw Error('incomplete download');break;}
                                    catch(error){if(attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,1000));}
                                }
                                bytes.set(chunk,offset);self.postMessage({id,progress:'正在載入高精細去背工具：'+Math.round((end+1)/total*100)+'%（首次約 190 MB）'});
                            }
                            const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
                            if(hash!=='50a57872cc739192446da2a934159f957c81af8b5a161dfda8e3daa51660ca67')throw Error('model checksum mismatch');
                        }else{const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw Error('model download failed');bytes=new Uint8Array(await response.arrayBuffer());}
                        if(cache)try{await cache.put(url,new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}}));}catch(_){}
                    }
                    session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});loadedQuality=quality;
                }
                self.postMessage({id,progress:'正在精細處理髮絲與人物邊緣…'});
                input=new ort.Tensor('float32',pixels,[1,3,height,width]);
                outputs=await session.run({[session.inputNames[0]]:input});
                const result=outputs[session.outputNames[0]],dims=result.dims;
                const values=new Float32Array(result.data);
                if(quality==='best')for(let i=0;i<values.length;i++)values[i]=1/(1+Math.exp(-values[i]));
                self.postMessage({id,values,width:dims[dims.length-1],height:dims[dims.length-2]},[values.buffer]);
            }catch(error){self.postMessage({id,error:String(error.message||error)});}
            finally{input?.dispose();if(outputs)Object.values(outputs).forEach(t=>t.dispose());}
        };
    }
    function stop(){worker?.terminate();worker=null;if(workerURL)URL.revokeObjectURL(workerURL);workerURL=null;}
    async function run(source,progress,quality='best'){
        // Preserve aspect ratio; MODNet expects RGB normalized to [-1,1], multiples of 32.
        const scale=Math.min(512/Math.min(source.width,source.height),1024/Math.max(source.width,source.height));
        const width=quality==='best'?1024:Math.max(32,Math.round(source.width*scale/32)*32),height=quality==='best'?1024:Math.max(32,Math.round(source.height*scale/32)*32);
        const c=document.createElement('canvas');c.width=width;c.height=height;
        const ctx=c.getContext('2d');ctx.drawImage(source,0,0,width,height);
        const rgba=ctx.getImageData(0,0,width,height).data,n=width*height,pixels=new Float32Array(n*3);
        for(let i=0;i<n;i++)for(let channel=0;channel<3;channel++)pixels[channel*n+i]=quality==='best'?(rgba[i*4+channel]/255-[.485,.456,.406][channel])/[.229,.224,.225][channel]:rgba[i*4+channel]/127.5-1;
        if(!worker){workerURL=URL.createObjectURL(new Blob(['('+workerMain.toString()+')()'],{type:'text/javascript'}));worker=new Worker(workerURL);}
        const id=++nextId;
        const result=await new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>{stop();reject(Error('精細去背等候逾時，請重試或切換快速模式。'));},600000);
            cancelActive=()=>{clearTimeout(timer);stop();reject(Error('已取消去背'));};
            worker.onmessage=e=>{const data=e.data;if(data.id!==id)return;if(data.progress){progress?.(data.progress);return;}clearTimeout(timer);if(data.error){console.error("Portrait matting failed:",data.error);stop();reject(Error('精細去背未完成，請確認網路後重試，或切換快速模式。'));}else resolve(data);};
            worker.onerror=()=>{clearTimeout(timer);stop();reject(Error('此瀏覽器未能啟動精細去背，請重試或切換快速模式。'));};
            worker.postMessage({id,pixels,width,height,quality},[pixels.buffer]);
        }).finally(()=>{cancelActive=null;});
        const mask=document.createElement('canvas');mask.width=result.width;mask.height=result.height;
        const mx=mask.getContext('2d'),data=mx.createImageData(mask.width,mask.height);
        for(let i=0;i<result.values.length;i++)data.data[i*4+3]=Math.round(Math.max(0,Math.min(1,result.values[i]))*255);
        mx.putImageData(data,0,0);return mask;
    }
    window.PortraitMatting={run,cancel:()=>cancelActive?.()};
})();
