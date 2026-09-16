(function () {
    'use strict';
    const P=window.TranscriptParser, undo=new WeakMap();
    const assetBase=new URL('.',document.currentScript.src);
    const clone=value=>JSON.parse(JSON.stringify(value));
    const fmt=value=>Number(value).toLocaleString('zh-TW',{maximumFractionDigits:2});
    const names={land:'土地',main:'主建物',ancillary:'附屬建物',common:'公設／車位'};
    let library;
    function loadScript(path){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL(path,assetBase).href;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('讀取元件失敗，請確認檔案完整。'));};document.head.append(s);});}
    function node(tag,text,cls){const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
    function button(text,fn,cls){const e=node('button',text,cls);e.type='button';e.onclick=fn;return e;}
    function labeled(text,control){const el=node('label',text);el.append(control);return el;}
    function field(value,label,change){const el=node('input');el.type='text';el.value=value??'';el.setAttribute('aria-label',label);el.oninput=()=>change(el.value);return el;}
    async function pdfLibrary(){
        if(!library)library=(async()=>{
            if(location.protocol==='file:'){
                if(!window.pdfjsLib)await loadScript('vendor/pdfjs/file/pdf.js');
                if(!window.pdfjsWorker)await loadScript('vendor/pdfjs/file/pdf.worker.js');
                if(!window.pdfjsLocalResources)await loadScript('vendor/pdfjs/file/resources.js');
                return window.pdfjsLib;
            }
            const pdf=await import(new URL('vendor/pdfjs/pdf.mjs',assetBase).href);pdf.GlobalWorkerOptions.workerSrc=new URL('vendor/pdfjs/pdf.worker.mjs',assetBase).href;return pdf;
        })().catch(e=>{library=null;throw e;});
        return library;
    }
    async function extract(files,progress,isCancelled=()=>false) {
        const pdf=await pdfLibrary(),pages=[],failures=[];let count=0;
        for(let i=0;i<files.length;i++) {
            if(isCancelled())break;
            const file=files[i];let task;const firstPage=pages.length;
            try {
                if(file.size>30*1024*1024)throw Error('檔案超過 30 MB，請分成較小的 PDF。');
                const localOptions=location.protocol==='file:'?{useWorkerFetch:false,BinaryDataFactory:class {async fetch({kind,filename}){const value=window.pdfjsLocalResources[kind+'/'+filename];if(typeof value!=='string')throw Error('缺少 PDF 字型資源');return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}}}:{};
                task=pdf.getDocument({data:new Uint8Array(await file.arrayBuffer()),cMapUrl:new URL('vendor/pdfjs/cmaps/',assetBase).href,cMapPacked:true,standardFontDataUrl:new URL('vendor/pdfjs/standard_fonts/',assetBase).href,wasmUrl:new URL('vendor/pdfjs/wasm/',assetBase).href,isEvalSupported:false,...localOptions});
                // Fail explicitly instead of leaving the password callback pending.
                task.onPassword=()=>{task.destroy();};
                const doc=await task.promise;
                if(count+doc.numPages>100)throw Error('每次最多分析 100 頁，請分批選取。');
                count+=doc.numPages;
                for(let pageNo=1;pageNo<=doc.numPages;pageNo++) {
                    if(isCancelled())break;
                    progress('分析 '+file.name+'（'+pageNo+' / '+doc.numPages+' 頁）');
                    const page=await doc.getPage(pageNo),content=await page.getTextContent();
                    pages.push({file:String(i),page:pageNo,text:P.textFromItems(content.items)});page.cleanup();
                }
            } catch(e) {
                pages.splice(firstPage);
                failures.push(file.name+'：'+(/password|destroyed|Password/i.test(e.message)?'PDF 有密碼，請先解鎖後再選取。':e.message||'無法讀取 PDF，請確認檔案完整。'));
            } finally {if(task)await task.destroy().catch(()=>{});}
        }
        return {pages,failures};
    }
    function areaRow(row,oldRows=[]) {
        row=P.effectiveRow(row);
        const previous=oldRows.find(old=>old.id===row.id&&old.parentBuildingId===row.group)||oldRows.find(old=>!old.parentBuildingId&&old.id===row.id)||oldRows.find(old=>row.parkingNo&&old.parkingNo===row.parkingNo);
        if(previous)oldRows.splice(oldRows.indexOf(previous),1);
        const result={id:row.id,area:String(Number(row.area).toFixed(2)),unit:'sqm',mode:row.mode,numerator:row.numerator,denominator:row.denominator};
        if(row.category==='common')Object.assign(result,{parentBuildingId:row.group,kind:row.kind,parkingNumerator:row.parkingNumerator,parkingDenominator:row.parkingDenominator,parkingNo:row.parkingNo||'',parking:previous?.parking||'',parkingPrice:previous?.parkingPrice||''});
        return result;
    }
    function mergedState(before,rows){
        const state=clone(before);
        for(const category of ['main','ancillary','land','common']) {
            const selected=rows.filter(r=>r.category===category);
            if(!selected.length)continue;
            if(category==='main'||category==='ancillary')state[category]=P.sumBuildingRows(selected);
            else {const available=before[category].slice();state[category]=selected.map(r=>areaRow(r,available));}
        }
        if(rows.some(r=>r.category==='common'))state.parkingIncluded=false;
        return state;
    }
    function totals(state){
        const measure=r=>r.pendingLegacy?+r.legacyPing||0:r.area===''?0:(+r.area||0)*(r.unit==='sqm'?0.3025:1)*(r.mode==='fraction'?+r.numerator/+r.denominator:1);
        const separate=state.common.filter(r=>r.kind==='parking').reduce((s,r)=>s+measure(r),0);
        const included=state.common.filter(r=>r.kind==='commonParking').reduce((s,r)=>s+(+r.area||0)*(r.unit==='sqm'?0.3025:1)*+r.parkingNumerator/+r.parkingDenominator,0);
        const common=state.common.filter(r=>r.kind!=='parking').reduce((s,r)=>s+measure(r),0)-included-(state.parkingIncluded?separate:0);
        const building=measure(state.main)+measure(state.ancillary)+common,parking=separate+included;
        return {building,parking,total:building+parking,ratio:building>0?common/building*100:0};
    }
    function attach(root,editor) {
        const previous=undo.get(root);
        if(previous?.after && previous.after!==JSON.stringify(window.areaEditorData(root)))undo.delete(root);
        const bar=node('div','','transcript-toolbar');
        bar.append(button('匯入謄本 PDF',()=>open(root),'transcript-launch'));
        if(undo.has(root))bar.append(button('復原上次匯入',()=>{const data=undo.get(root).before;undo.delete(root);window.mountAreaEditor(root,data);showToast('已復原匯入前的面積資料');}));
        editor.querySelector('.area-hint').after(bar);
    }
    function emptyState(){const simple=()=>({id:'',area:'',unit:'sqm',mode:'direct',numerator:'',denominator:''});return {version:3,main:simple(),ancillary:simple(),parking:simple(),parkingIncluded:false,land:[],common:[]};}
    function open(root,target={}) {
        if(document.querySelector('.transcript-dialog'))return;
        const readState=target.readState||(()=>window.areaEditorData(root));
        const before=readState();if(!before)return;
        const notify=target.notify||(text=>showToast(text));
        const previousFocus=document.activeElement,dialog=node('dialog','','transcript-dialog');
        dialog.setAttribute('aria-labelledby','transcript-title');
        const title=node('h2','匯入謄本');title.id='transcript-title';
        const head=node('div','','transcript-head');head.append(title,button('關閉',()=>dialog.close()));
        const intro=node('p','選取謄本 PDF → 核對結果 → 套入表單。可一次選多份。','transcript-muted');
        const fileInput=node('input');fileInput.type='file';fileInput.accept='.pdf,application/pdf';fileInput.multiple=true;fileInput.setAttribute('aria-label','選取謄本 PDF');
        const status=node('p','','transcript-status');status.setAttribute('role','status');
        const review=node('div'),footer=node('div','','transcript-footer');
        dialog.append(head,intro,fileInput,node('p','電子謄本 · 最多 20 檔／100 頁 · 僅在此裝置分析','transcript-muted'),status,review,footer);
        let cancelled=false,files=[],urls=[],run=0;
        dialog.addEventListener('keydown',e=>e.stopPropagation());
        dialog.addEventListener('close',()=>{cancelled=true;run++;urls.forEach(URL.revokeObjectURL);dialog.remove();previousFocus?.focus();});
        document.body.append(dialog);dialog.showModal();fileInput.focus();
        fileInput.onchange=async()=>{
            const token=++run;urls.forEach(URL.revokeObjectURL);urls=[];review.replaceChildren();footer.replaceChildren();files=Array.from(fileInput.files);
            if(!files.length)return;
            if(files.length>20){status.textContent='每次最多 20 份 PDF，請減少檔案數。';return;}
            if(files.some(f=>!f.name.toLowerCase().endsWith('.pdf'))){status.textContent='請選擇 PDF 檔案。';return;}
            fileInput.disabled=true;status.textContent='準備分析…';
            try {
                const extracted=await extract(files,text=>{if(token===run)status.textContent=text;},()=>cancelled||token!==run);
                if(cancelled||token!==run)return;
                const result=P.parse(extracted.pages);result.issues.unshift(...extracted.failures);
                urls=files.map(f=>URL.createObjectURL(f));
                status.textContent=result.rows.length?'已分析 '+files.length+' 份 PDF，請核對以下資料。':'未找到可填入的面積資料。若為掃描 PDF，請改用可選取文字的電子謄本。';
                render(result);
            } catch(e) {if(!cancelled)status.textContent='分析未完成：'+(e.message||'請重新選取檔案。');}
            finally {fileInput.disabled=false;}
        };
        function render(result) {
            const rows=result.rows.map(r=>({...r,selected:!r.blocked&&r.errors.length===0,verified:false}));
            let group=result.buildings[0]?.id||'';
            const groupSelect=node('select');groupSelect.setAttribute('aria-label','單一欄位資料來源建號');
            for(const building of result.buildings){const opt=node('option',building.address+'（'+building.id+'）');opt.value=building.id;groupSelect.append(opt);}
            if(result.buildings.length>1)review.append(labeled('地址及建物資料採用',groupSelect));
            groupSelect.value=group;groupSelect.onchange=()=>{group=groupSelect.value;confirmed.checked=false;draw();};
            const issues=node('div','','transcript-warnings');
            for(const issue of result.issues)issues.append(node('p',issue.replace(/^(\d+)(?= |：)/,(m,i)=>files[+i]?.name||i)));
            if(result.buildings.length>1)issues.append(node('p','已列出全部建號及地號，取消勾選不需要的資料；點開各筆可修改持分與分類。'));
            if(result.issues.length||result.buildings.length>1)review.append(issues);
            const list=node('div','','transcript-list');review.append(list);
            const preview=node('div','','transcript-preview');preview.setAttribute('aria-live','polite');
            const changed=node('p','','transcript-muted'),confirmed=node('input');confirmed.type='checkbox';
            const consent=labeled('已核對，取代勾選類別的原資料',confirmed);consent.prepend(confirmed);consent.className='transcript-confirm';
            const detailState=new Map();
            for(const b of result.buildings)detailState.set(b.id,Object.fromEntries(Object.entries(b.details||{}).filter(([key,value])=>value&&(!target.detailKeys||target.detailKeys.includes(key))).map(([key,value])=>[key,{value,selected:!!target.details&&result.buildings.length===1}])));
            const selectedDetails=()=>Object.fromEntries(Object.entries(detailState.get(group)||{}).filter(([,item])=>item.selected&&item.value.trim()).map(([key,item])=>[key,item.value.trim()]));
            const apply=button(target.applyLabel||'套入表單',()=>{
                const selected=getSelected();if(!confirmed.checked||!selectionValid(selected))return;
                if((root&&!root.isConnected)||(target.isCurrent&&!target.isCurrent())||JSON.stringify(readState())!==JSON.stringify(before)){status.textContent='原表單已變動，請關閉後重新匯入，以免覆蓋新資料。';apply.disabled=true;return;}
                const next=mergedState(before,selected);
                if(target.apply){target.apply(next,selected,selectedDetails(),result.buildings.find(b=>b.id===group));dialog.close();notify(target.success||'已套入資料');}
                else {const record={before:clone(before),after:null};undo.set(root,record);window.mountAreaEditor(root,next);record.after=JSON.stringify(window.areaEditorData(root));dialog.close();notify('已套入面積資料，請按表單的儲存完成更新');}
            },'transcript-primary');
            footer.append(preview,changed,consent,button('取消',()=>dialog.close()),apply);
            confirmed.onchange=update;
            function visible(r){return true;}
            function getSelected(){return rows.filter(r=>visible(r)&&r.selected).map(r=>r.destination?{...r,category:'common',kind:r.destination,id:r.id+(r.category==='ancillary'?'（附屬建物）':'')}:r);}
            function selectionValid(selected){
                const seen=new Set();
                return (selected.length>0||Object.keys(selectedDetails()).length>0)&&selected.every(r=>{const key=r.group+'|'+r.category+'|'+r.id;if(seen.has(key))return false;seen.add(key);return !r.blocked&&P.calculate(r)&&(!r.errors.length||r.verified);});
            }
            function update(){
                const selected=getSelected(),valid=selectionValid(selected);
                const categories=[...new Set(selected.map(r=>names[r.category]))];
                const selectionSummary='已選 '+selected.filter(r=>r.category==='main').length+' 個主建號、'+selected.filter(r=>r.category==='land').length+' 個地號。';
                if(Object.keys(selectedDetails()).length)categories.push('勾選的建物資料');
                changed.textContent=selectionSummary+(categories.length?'將取代：'+categories.join('、')+'。其他類別保留。':'請勾選要套用的資料。');
                if(valid){const n=totals(mergedState(before,selected));preview.textContent=Object.values(n).every(Number.isFinite)?'套用後試算：建坪 '+fmt(n.building)+(n.parking>0?' ＋ 車坪 '+fmt(n.parking):'')+' ＝ 總坪 '+fmt(n.total)+'　公設比 '+fmt(n.ratio)+'%':'已選資料可套用；原表單其他面積／持分尚未填完整，補齊後即可試算總坪。';}
                else preview.textContent='請選取有效資料，修正紅色欄位；同一來源的地／建號若有不同版本，請只選一筆。';
                apply.disabled=!confirmed.checked||!valid;
            }
            function draw(){
                list.replaceChildren();
                for(const row of rows.filter(visible)) {
                    const card=node('details','','transcript-card'),heading=node('summary','','transcript-row-head');card.open=!!row.expanded||row.blocked||row.errors.length>0;card.ontoggle=()=>{row.expanded=card.open;};
                    const check=node('input');check.type='checkbox';check.checked=row.selected;check.disabled=row.blocked;check.setAttribute('aria-label','匯入'+names[row.category]+' '+row.id);
                    check.onclick=e=>e.stopPropagation();check.onchange=()=>{row.selected=check.checked;confirmed.checked=false;update();};
                    const title=node('span',(row.destination?({common:'公設',parking:'車位'}[row.destination]):row.category==='common'?({common:'公設',parking:'車位',commonParking:'公設含車位'}[row.kind]):names[row.category])+'　'+row.id,'transcript-row-title');title.prepend(check);heading.append(title);
                    for(const source of row.sources){const link=node('a',(files[+source.file]?.name||source.file)+' · 第 '+source.page+' 頁');link.href=urls[+source.file]+'#page='+source.page;link.target='_blank';link.rel='noopener';card.append(link);}
                    card.prepend(heading);heading.append(node('span',row.blocked?'無法套用':row.errors.length?'待核對':'核對／修改','transcript-expand'));
                    if(row.category==='common')card.append(node('p','所屬主建號：'+row.group,'transcript-muted'));
                    if(row.category==='common'){
                        const kind=node('select');kind.setAttribute('aria-label','辨識面積歸類');for(const [value,label] of Object.entries({common:'公設',parking:'車位',commonParking:'公設含車位'})){const opt=node('option',label);opt.value=value;kind.append(opt);}kind.value=row.kind;kind.onchange=()=>{row.kind=kind.value;row.expanded=true;confirmed.checked=false;draw();};card.append(labeled('面積歸類',kind));
                    }
                    if(row.category==='main'||row.category==='ancillary'){
                        const destination=node('select');destination.setAttribute('aria-label','套入分類');
                        for(const [value,label] of [['',names[row.category]],['common','公設'],['parking','車位']]){const opt=node('option',label);opt.value=value;destination.append(opt);}
                        destination.value=row.destination||'';destination.onchange=()=>{row.destination=destination.value;row.expanded=true;confirmed.checked=false;draw();};
                        card.append(labeled('套入分類（獨立公設建號請選公設）',destination));
                    }
                    const controls=node('div','','transcript-fields');
                    function edit(key,label){const el=field(row[key],label,v=>{row[key]=v;confirmed.checked=false;refreshRow();update();});if(key!=='parkingNo')el.inputMode='decimal';controls.append(labeled(label,el));}
                    edit('area',row.mode==='direct'?'面積 m²':'總面積 m²');
                    if(row.mode==='fraction'){edit('numerator','分子');edit('denominator','分母');}
                    if(row.ownerNumerator!==undefined){edit('ownerNumerator','所有權分子');edit('ownerDenominator','所有權分母');card.append(node('p','總面積 × 共有部分持分 × 所屬建號所有權持分','transcript-muted'));}
                    if(row.kind==='commonParking'){edit('parkingNumerator','車位分子');edit('parkingDenominator','車位分母');}
                    if(row.kind==='parking'||row.kind==='commonParking')edit('parkingNo','車位編號');
                    card.append(controls);
                    for(const note of row.notes)card.append(node('p',note,'transcript-muted'));
                    for(const error of row.errors)card.append(node('p',error,'transcript-problem'));
                    if(row.errors.length&&!row.blocked){const verified=node('input');verified.type='checkbox';verified.checked=row.verified;verified.onchange=()=>{row.verified=verified.checked;confirmed.checked=false;update();};card.append(labeled('已查看原文並修正此筆資料',verified));}
                    if(row.blocked)card.append(node('p','此筆不會自動套用，請依原謄本手動填寫。','transcript-problem'));
                    const output=node('span','','transcript-result');heading.append(output);
                    function refreshRow(){const result=P.calculate(row);output.textContent=result?fmt(result.area)+' 坪'+(row.kind==='commonParking'?'（公設 '+fmt(result.area-result.parking)+' ＋ 車位 '+fmt(result.parking)+'）':''):'請填有效面積（最多小數 2 位）及正整數持分。';card.classList.toggle('transcript-invalid',!result);}
                    refreshRow();list.append(card);
                }
                if(target.details&&group){
                    const card=node('details','','transcript-card');card.append(node('summary','建物資料（用途、構造、完工日等）'));
                    const labels={usage:'主要用途',structure:'構造',builtDate:'建築完成日（民國年月日）',floor:'樓層',levels:'層數（謄本登記）'};
                    for(const [key,item] of Object.entries(detailState.get(group)||{})){
                        const check=node('input');check.type='checkbox';check.checked=item.selected;check.onchange=()=>{item.selected=check.checked;confirmed.checked=false;update();};
                        const control=field(item.value,labels[key],v=>{item.value=v;confirmed.checked=false;update();});const label=labeled(labels[key],control);label.prepend(check);card.append(label);
                    }
                    card.append(node('p','只帶入勾選項目；謄本未提供的建商、管理費、格局等欄位保留原值。','transcript-muted'));list.append(card);
                }
                update();
            }
            draw();
        }
    }
    function openStandalone(){
        const state=emptyState();
        open(null,{readState:()=>state,applyLabel:'帶入新增庫存',intro:'上傳同一物件的謄本，先分析坪數與持分；核對後可帶入新增庫存，或直接關閉。',success:'已建立庫存草稿，請補上屋主資料並儲存。',apply:(next,rows,details,building)=>{
            openAdd();selectedTypes=['庫存屋主'];activeView='庫存屋主';applyTypePicker();
            const district=building?.id.match(/^(.+?區)/)?.[1]||'';
            addSellerProperty({addr:building?.address?district+building.address:'',areaInput:next});
        }});
    }
    window.TranscriptImport={attach,open,openStandalone,extract,emptyState,totals,mergeState:mergedState};
})();
