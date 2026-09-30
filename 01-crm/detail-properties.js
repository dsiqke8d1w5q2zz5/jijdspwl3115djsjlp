/* Read-only property pages: reuse existing detail rendering, never the edit form. */
(function () {
    'use strict';
    const original = window.typeDetail;
    let serial = 0;
    window.resetPropertyScroll=function(scope){for(let node=scope;node&&node!==document.body;node=node.parentElement){const style=getComputedStyle(node);if(/auto|scroll/.test(style.overflowY)&&node.clientHeight){node.scrollTop=0;return;}}};
    const style = document.createElement('style');
    style.textContent = '.det-property-tabs{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;padding:4px 1px 10px;max-width:100%}.det-property-tabs button{flex:0 0 auto;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#173756;font:inherit;font-size:14px;cursor:pointer}.det-property-tabs button[aria-selected=true]{background:#173756;color:white;border-color:#173756}.det-property-tabs button:focus-visible{outline:3px solid #0891b2;outline-offset:1px}.det-property-page[hidden]{display:none!important}.det-property-page{min-width:0}.det-property-more{margin-top:8px;border-top:1px solid #e7e5e4}.det-property-more>summary{padding:10px 0;cursor:pointer;color:#036986;font-weight:600}.det-property-page .det-val{white-space:pre-wrap;overflow-wrap:anywhere}.det-property-page a{overflow-wrap:anywhere}.det-property-title{font-weight:700;margin:8px 0;color:#173756}.det-property-readonly{font-size:12px;color:#78716c;margin:0 0 6px}';
    document.head.append(style);
    const layoutStyle=document.createElement('style');
    layoutStyle.textContent='.det-columns,.det-pane{display:contents}.det-pane-title,.det-pane-empty{display:none}@media(min-width:1050px){#dModal{align-items:center!important;padding:20px!important}#dModal>.modal{width:96vw;max-width:1560px!important;height:90dvh;max-height:90dvh;overflow:hidden}#detContent{height:100%;display:flex;flex-direction:column;min-height:0}#detContent>.det-head{position:static;flex-shrink:0;min-height:58px;padding:8px 18px}.det-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex:1;min-height:0;overflow:hidden}.det-pane{display:block;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:14px 18px;scrollbar-gutter:stable}.det-pane+.det-pane{border-left:1px solid #e7e5e4}.det-pane-title{display:block;font-size:17px;color:#173756;font-weight:700;margin:0 0 14px}.det-pane-empty{display:block;color:#78716c;font-size:14px}.det-pane .det-name{font-size:26px}.det-pane .det-phone{font-size:20px}.det-pane .det-row{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;align-items:start}.det-pane .det-key{width:auto!important;min-width:0;white-space:normal!important}.det-pane .det-val{min-width:0;overflow-wrap:anywhere;white-space:pre-wrap}.det-pane .sp-grid{grid-template-columns:1fr!important}.det-pane .sp-grid>div:empty{display:none}.det-pane .sp-grid>div{min-width:0}.det-pane .sp-grid .det-key{flex:0 0 92px}.det-pane .det-sec{margin-top:10px}}';
    document.head.append(layoutStyle);
    const polishStyle=document.createElement('style');
    polishStyle.textContent='@media(min-width:1050px){.det-columns{grid-template-columns:minmax(0,28fr) minmax(0,38fr) minmax(0,34fr)}.det-identity{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px!important;justify-content:normal!important;margin:2px 0 18px}.det-identity .det-name{grid-column:1/-1;text-align:left;margin:0;font-size:26px}.det-identity .det-phone{text-align:left;margin:0;font-size:20px;align-self:center;overflow-wrap:anywhere}.det-identity .det-copy-wrap{margin:0!important}.det-identity .det-copy-contact{padding:5px 9px;font-size:13px;min-height:32px}.det-identity .tags{grid-column:1/-1;margin:4px 0 0!important}.det-schedule-card{padding:12px;background:#f0f6fb;border:1px solid #dfebf4;border-radius:10px;margin:14px 0}.det-pane:nth-child(3)>.det-schedule-card{margin:0 0 14px}.det-schedule-card h3{margin:0 0 6px;font-size:17px;font-weight:700;color:#173756}.det-schedule-card .det-row{grid-template-columns:11.5em minmax(0,1fr);border-color:#dfe8f1;align-items:baseline}.det-schedule-card .det-key,.det-schedule-card .det-val{line-height:1.5}.det-schedule-card .det-row .det-key{white-space:nowrap!important;margin-right:0!important}.det-schedule-card .det-val{font-weight:500}#detLogList .det-val{font-weight:400;line-height:1.55}#detLogList .det-row{padding-top:6px;padding-bottom:6px}.det-log-filter{margin:0 0 12px}}';
    document.head.append(polishStyle);
    const pairStyle=document.createElement('style');
    pairStyle.textContent='.det-category-tabs{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;border-bottom:1px solid #e2e8f0;margin-bottom:14px;padding:0 0 8px}.det-category-tabs button{flex:0 0 auto;border:1px solid transparent;border-radius:8px;background:#f1f5f9;color:#475569;padding:9px 12px;font:inherit;font-weight:600;cursor:pointer}.det-category-tabs button[aria-selected=true]{background:#173756;color:white}.det-category-tabs button:focus-visible{outline:2px solid #0891b2;outline-offset:1px}'+'.det-field-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:0 14px}.det-property-page .det-row{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;align-items:start;min-width:0}.det-property-page .det-row>.det-key{width:auto!important;min-width:0}.det-field-pair>.det-row>.det-val{min-width:0;overflow-wrap:anywhere}.det-area-part{display:inline-block;margin-right:5px}';
    document.head.append(pairStyle);
    const spacingStyle=document.createElement('style');
    spacingStyle.textContent='@media(min-width:1050px){.det-pane:nth-child(2) .det-row{padding-top:4px;padding-bottom:4px}.det-pane:nth-child(2) .det-pane-title{margin-bottom:10px}.det-category-tabs{margin-bottom:8px;padding-bottom:6px}.det-property-title{margin:5px 0}.det-property-tabs{padding-bottom:6px}.det-property-more{margin-top:4px}.det-property-more>summary{padding:7px 0}.det-schedule-card{margin:10px 0;padding:10px}}';
    document.head.append(spacingStyle);
    const tripleStyle=document.createElement('style');
    tripleStyle.textContent='.det-property-page{container-type:inline-size}.det-field-triple{grid-template-columns:1fr}@container(min-width:440px){.det-field-triple{grid-template-columns:repeat(3,minmax(0,1fr));gap:0 12px}.det-property-page .det-field-triple>.det-row{grid-template-columns:5em minmax(0,1fr);gap:6px}}';
    document.head.append(tripleStyle);
    const otherStyle=document.createElement('style');
    otherStyle.textContent='.det-property-page .det-other-info .det-row{display:flex;flex-direction:column;gap:5px;padding:9px 0;min-width:0}.det-other-info .det-key{font-weight:400;color:#78716c}.det-other-info .det-val{width:100%;min-width:0}.det-other-info .det-field-pair{grid-template-columns:1fr;gap:0 16px}.det-equipment-list{display:flex;flex-wrap:wrap;gap:6px}.det-equipment-chip{display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:4px 8px;max-width:100%;overflow-wrap:anywhere;font-weight:500}.det-folder-link{display:inline-block;color:#173756!important;background:#f0f6fb;border:1px solid #d4e2ee;border-radius:7px;padding:7px 12px;text-decoration:none!important}.det-folder-link:focus-visible{outline:2px solid #0891b2}.det-property-page .det-other-info .det-folder-row{margin-top:6px;border-bottom:0}@container(min-width:440px){.det-other-info .det-field-pair{grid-template-columns:repeat(3,minmax(0,1fr))}}';
    document.head.append(otherStyle);
    const areaStyle=document.createElement('style');
    areaStyle.textContent='.det-area-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px 10px;margin:2px 0 6px}.det-property-page .det-area-grid>.det-row{display:flex;flex-direction:row;align-items:baseline;gap:6px;padding:5px 9px;background:#f6f8fa;border:1px solid #e8edf1;border-radius:7px}.det-area-grid .det-key{width:auto!important;white-space:normal!important}.det-area-grid .det-val{min-width:0}@container(min-width:440px){.det-area-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';
    document.head.append(areaStyle);
    areaStyle.textContent+='.det-area-section{margin:6px 0}.det-area-section h4{font-size:12px;color:#64748b;margin:0 0 4px;font-weight:600}.det-area-section .det-area-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.det-area-section .det-val small{font-size:11px;font-weight:400}.det-property-page .det-area-land .det-row{background:#fafafa}.det-area-section .det-row{min-width:0}.det-area-section .det-val{overflow-wrap:anywhere}@container(min-width:440px){.det-area-building .det-area-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}';
    const stickyStyle=document.createElement('style');
    stickyStyle.textContent='.det-property-header{display:contents}@media(min-width:1050px){.det-property-header{display:block;position:sticky;top:-14px;z-index:3;background:white;margin-top:-14px;padding:14px 0 1px}.det-property-header .det-category-tabs{margin-bottom:6px}}';
    document.head.append(stickyStyle);
    const propertyStickyStyle=document.createElement('style');
    propertyStickyStyle.textContent='@media(min-width:1050px){#dModal .det-property-toolbar{position:sticky;top:var(--detail-property-header-bottom,76px);z-index:2;background:white;box-shadow:0 -3px 0 white}}';
    document.head.append(propertyStickyStyle);
    const propertyHeaderObserver=new ResizeObserver(entries=>{for(const entry of entries)entry.target.parentElement.style.setProperty('--detail-property-header-bottom',(entry.target.offsetHeight-12)+'px');});
    const folderStyle=document.createElement('style');
    folderStyle.textContent='.det-property-toolbar{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;gap:12px;height:52px;box-sizing:border-box;margin:3px 0 5px}.det-property-toolbar>.det-property-title,.det-property-toolbar>.det-property-tabs{min-width:0;margin:0;height:52px;box-sizing:border-box;background:#f6f8fa;border:1px solid #e2e8f0;border-radius:8px;padding:3px 8px}.det-property-toolbar>.det-property-tabs{align-items:center;overflow-y:hidden;scrollbar-width:thin}.det-property-toolbar>.det-property-title{line-height:44px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.det-property-toolbar .det-property-tabs button{height:36px;box-sizing:border-box;padding:6px 12px}.det-folder-actions{display:flex;align-items:center;justify-content:flex-start;min-height:36px;margin:0 0 6px}.det-folder-actions:empty{display:none}.det-folder-actions>.det-folder-link{white-space:nowrap;font-size:14px;line-height:20px;padding:5px 9px;margin:0}.det-folder-actions>.det-folder-link[hidden]{display:none}';
    document.head.append(folderStyle);
    const historyStyle=document.createElement('style');
    historyStyle.textContent='.det-property-page .det-history-row>.det-val{display:flex;flex-direction:row;flex-wrap:wrap;align-items:baseline;gap:4px 14px}.det-history-time{font-weight:400;color:#78716c;line-height:1.5}.det-history-value:empty{display:none}';
    document.head.append(historyStyle);
    const dragStyle=document.createElement('style');
    dragStyle.textContent='.det-property-tabs{cursor:grab;user-select:none}.det-property-tabs.is-dragging,.det-property-tabs.is-dragging button{cursor:grabbing}';
    document.head.append(dragStyle);
    const compactStyle=document.createElement('style');
    compactStyle.textContent='@media(min-width:1050px){.det-pane:nth-child(2) .det-pane-title{margin-bottom:6px}.det-property-header .det-category-tabs{gap:5px;margin-bottom:3px;padding-bottom:4px}.det-category-tabs button{padding:5px 10px;min-height:30px}.det-property-toolbar{height:44px;margin:2px 0 3px}.det-property-toolbar>.det-property-title,.det-property-toolbar>.det-property-tabs{height:44px;padding:2px 8px}.det-property-toolbar>.det-property-title{line-height:38px}.det-property-toolbar .det-property-tabs button{height:30px;padding:3px 10px}.det-folder-actions{min-height:28px;margin-bottom:2px}.det-folder-actions>.det-folder-link{padding:3px 9px}.det-pane:nth-child(2) .det-row{padding-top:3px;padding-bottom:3px}.det-property-more{margin-top:2px}.det-property-more>summary{padding:5px 0}.det-property-page .det-other-info .det-row{padding-top:6px;padding-bottom:6px;gap:3px}}';
    document.head.append(compactStyle);
    const cardActionStyle=document.createElement('style');
    cardActionStyle.textContent='.card-quick-actions{display:flex;gap:6px}.card-action-label{display:none}@media(min-width:769px){.card-bottom-right{justify-content:center;gap:10px;margin-left:8px}.card-quick-actions{display:grid;grid-template-columns:repeat(3,64px);gap:2px;padding:6px 3px;background:#f6f8fa;border:1px solid #e8edf1;border-radius:12px}.card-quick-actions .btn-ic{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:74px;padding:10px 2px;border:1px solid transparent;border-radius:8px;background:transparent}.card-quick-actions .btn-ic:hover{background:white;border-color:#dbe5ee;box-shadow:0 2px 5px #1737560a}.card-quick-actions .btn-ic:focus-visible{outline:2px solid #0284c7;outline-offset:1px}.card-quick-actions .btn-ic i{font-size:23px}.card-action-label{display:block;font-size:14px;line-height:1.2;color:#526477;white-space:nowrap}.card-created-date{margin-top:0!important;padding-top:0!important;font-size:11px;color:#94a3b8;align-self:flex-end;text-align:right}}';
    document.head.append(cardActionStyle);
    const quickFormStyle=document.createElement('style');
    quickFormStyle.textContent='.fill-menu:has(#cl-date),.fill-menu:has(#qs-date){box-sizing:border-box;display:flex;flex-direction:column;width:520px!important;min-width:0!important;max-width:calc(100vw - 32px)!important;height:auto;max-height:calc(100dvh - 32px);overflow-y:auto;padding:18px!important;border-radius:16px}.fill-menu:has(#cl-date)>div:first-child,.fill-menu:has(#qs-date)>div:first-child{font-size:18px!important;color:#173756;margin-bottom:12px!important;line-height:1.4}.fill-menu:has(#cl-date)>div:last-child,.fill-menu:has(#qs-date)>div:last-child{margin-top:0;padding-top:4px;flex-shrink:0}.fill-menu:has(#cl-date)>div:last-child button,.fill-menu:has(#qs-date)>div:last-child button{min-height:44px;font-size:15px!important}.fill-menu #cl-save,.fill-menu #qs-save{background:#173756!important}.fill-menu #cl-memo,.fill-menu #qs-memo{height:56px;font-size:15px!important;box-sizing:border-box}.fill-menu:has(#cl-date) .roc-date-wrap,.fill-menu:has(#qs-date) .roc-date-wrap{min-width:0}.fill-menu #cl-date,.fill-menu #qs-date{min-width:0;width:100%;box-sizing:border-box}.fill-menu #qs-type,.fill-menu #qs-time{flex-shrink:0}@media(max-width:480px){.fill-menu:has(#cl-date),.fill-menu:has(#qs-date){padding:16px!important;height:auto}.fill-menu:has(#qs-date)>div:nth-child(2){flex-wrap:wrap}.fill-menu:has(#qs-date)>div:nth-child(2) .roc-date-wrap{flex-basis:calc(100% - 86px)!important}.fill-menu #qs-time{width:100%!important}}';
    quickFormStyle.textContent+='.fill-menu:has(#cl-date)>div:first-child,.fill-menu:has(#qs-date)>div:first-child{display:flex;align-items:center;justify-content:space-between;gap:12px}.fill-menu:has(#cl-date)>div:first-child>span,.fill-menu:has(#qs-date)>div:first-child>span{min-width:0;overflow-wrap:anywhere}.fill-menu #cl-del,.fill-menu #qs-del{flex-shrink:0;background:#fff1f2!important;color:#dc2626!important;border:1px solid #fecdd3!important;padding:6px 10px!important;font-size:13px!important;border-radius:7px!important}';
    document.head.append(quickFormStyle);
    document.addEventListener('click',event=>{const button=event.target.closest('.card-schedule-edit');if(!button)return;event.stopPropagation();const c=DB.find(c=>c.id===button.dataset.clientId),index=Number(button.dataset.scheduleIndex),s=c?.schedules?.[index];if(!s||s._deleted)return;quickSchedule(c.id,s.date,s.time||'',s.memo||'',s.schedType||'',s.recurrence||'',index);},true);
    const originalQuickSchedule=window.quickSchedule;
    window.quickSchedule=function(clientId,date,time,memo,type,recur,index){
        const result=originalQuickSchedule.apply(this,arguments);
        if(!date)return result;
        const customer=DB.find(c=>c.id===clientId),target=index!==undefined?customer?.schedules?.[index]:customer?.schedules?.find(s=>!s._deleted&&s.date===date&&(s.time||'')===(time||''));
        const save=document.getElementById('qs-save');if(!save||!target||target._deleted)return result;
        const box=save.closest('.fill-menu'),overlay=box.closest('.fill-overlay'),heading=box.firstElementChild,title=document.createElement('span'),remove=document.createElement('button');
        title.append(...heading.childNodes);remove.type='button';remove.id='qs-del';remove.textContent='刪除';remove.setAttribute('aria-label','刪除這筆行程');
        remove.onclick=()=>confirmAction('確定刪除此行程？',()=>{if(target._deleted)return;target._deleted=true;target.updatedAt=_nowISO();persistAndSyncNow();overlay.remove();render();});
        heading.append(title,remove);return result;
    };
    const originalQuickContact=window.quickContactLog;
    window.quickContactLog=function(){const result=originalQuickContact.apply(this,arguments);const remove=document.getElementById('cl-del');if(remove){const heading=remove.closest('.fill-menu').firstElementChild,title=document.createElement('span');title.append(...heading.childNodes);heading.append(title,remove);}return result;};
    const archiveStyle=document.createElement('style');
    archiveStyle.textContent='#archModal{z-index:1100}#archModal>.modal{width:calc(100% - 32px)!important;max-width:400px!important;height:auto;max-height:calc(100dvh - 32px)!important;border-radius:18px!important;overflow-y:auto;box-shadow:0 24px 70px #17375630}#archModal .modal-head{padding:22px 22px 12px;border:0;gap:12px;align-items:flex-start}#archModal .modal-title{display:flex;align-items:center;gap:11px;color:#173756;font-size:19px;letter-spacing:0}#archModal .archive-symbol{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:11px;background:#fff3dc;color:#b77916}#archModal .archive-symbol svg{width:22px;height:22px}#archModal .btn-x{font-size:20px;width:30px;height:30px;padding:0;border-radius:8px;color:#94a3b8}#archModal .btn-x:hover{background:#f1f5f9;color:#475569}#archModal .modal-body{padding:0 22px 22px}#archModal .archive-subtitle{margin:0 0 16px;color:#64748b;font-size:14px;line-height:1.6;overflow-wrap:anywhere}#archModal .arch-reasons{gap:8px}#archModal .arch-reason-btn{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#334155;font:inherit;font-size:14px;line-height:1.5;transition:background .12s,border-color .12s}#archModal .arch-reason-btn::after{content:"›";color:#94a3b8;font-size:20px;line-height:1}#archModal .arch-reason-btn:hover{background:#edf4fa;border-color:#b9ccdf;color:#173756}#archModal .arch-reason-btn:focus-visible{outline:2px solid #0284c7;outline-offset:2px}';
    document.head.append(archiveStyle);
    const originalArchive=window.archiveClient;
    window.archiveClient=function(id){
        originalArchive(id);const customer=DB.find(c=>c.id===id);if(!customer)return;
        const modal=document.getElementById('archModal'),heading=modal.querySelector('#archModalTitle');
        heading.innerHTML='<span class="archive-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="5" rx="1.5"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 12h4"/></svg></span><span>封存客戶</span>';
        let subtitle=modal.querySelector('.archive-subtitle');if(!subtitle){subtitle=document.createElement('p');subtitle.className='archive-subtitle';modal.querySelector('.modal-body').prepend(subtitle);}subtitle.textContent='請選擇封存「'+customer.name+'」的原因';
        modal.querySelector('.btn-x').setAttribute('aria-label','關閉封存視窗');
    };
    const originalConfirmArchive=window.confirmArchive;
    window.confirmArchive=function(reason){const id=archiveTargetId;originalConfirmArchive(reason);if(id&&currentDetId===id)closeDet();};
    let activityResizeObserver=null, activityFrame=0;
    let activityDraft={id:null,values:{}};
    function fitActivityLogs(){
        cancelAnimationFrame(activityFrame);
        activityFrame=requestAnimationFrame(()=>{
            const content=document.querySelector('#detContent .det-activity-content'),list=document.getElementById('detLogList');
            if(!content||!list||!matchMedia('(min-width:1050px)').matches)return;
            let more=document.getElementById('detLogMore'),toggle=document.getElementById('detLogToggle');
            const expanded=more&&more.style.display!=='none';
            const rows=[...list.querySelectorAll(':scope>.det-row'),...(more?[...more.children]:[])];
            if(!rows.length)return;
            if(!more){more=document.createElement('div');more.id='detLogMore';more.style.display='none';list.append(more);}
            if(!toggle){toggle=document.createElement('div');toggle.id='detLogToggle';toggle.setAttribute('role','button');toggle.tabIndex=0;toggle.style.cssText='font-size:13px;color:#059669;font-weight:600;cursor:pointer;padding:6px 0';toggle.onclick=()=>window.toggleDetLog();toggle.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.toggleDetLog();}};list.append(toggle);}
            for(const row of rows)list.insertBefore(row,more);
            toggle.style.display='';
            const scale=content.getBoundingClientRect().height/content.offsetHeight||1;
            const available=Math.max(0,(content.getBoundingClientRect().bottom-list.getBoundingClientRect().top)/scale-toggle.offsetHeight-4);
            let used=0,count=0;
            for(const row of rows){if(count>=10||used+row.offsetHeight>available)break;used+=row.offsetHeight;count++;}
            count=Math.max(1,count);
            rows.slice(count).forEach(row=>more.append(row));
            more.style.display=expanded?'':'none';toggle.style.display=more.children.length?'':'none';
            toggle.innerHTML=expanded?'收合 <i class="ti ti-chevron-up"></i>':'顯示其餘 '+more.children.length+' 筆 <i class="ti ti-chevron-down"></i>';
        });
    }
    const originalLogYear=window.selDetLogYear;
    window.selDetLogYear=function(){const result=originalLogYear.apply(this,arguments);fitActivityLogs();return result;};
    const originalShow=window.showDet;
    window.showDet=function(id,viewAs){
        propertyHeaderObserver.disconnect();
        activityResizeObserver?.disconnect();cancelAnimationFrame(activityFrame);
        const previousId=currentDetId;originalShow(id,viewAs);
        if(previousId!==id)document.querySelectorAll('#dModal>.modal,#detContent>.det-body').forEach(el=>el.scrollTop=0);
        const root=document.getElementById('detContent'),body=root.querySelector(':scope > .det-body');if(!body)return;
        const nav=root.querySelector('#detNavWrap');
        if(nav){
            const pager=document.createElement('div');pager.className='det-nav-pager';pager.setAttribute('aria-label','切換客戶');pager.append(...nav.childNodes);nav.append(pager);
            const actions=document.createElement('div');actions.className='det-header-actions';actions.style.cssText='display:flex;gap:5px;margin-right:6px';
            const add=(label,color,handler)=>{const button=document.createElement('button');button.type='button';button.className='btn-ic';const iconPaths=label==='編輯'?'<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/>':label==='刪除'?'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>':'<path d="M3 3h18v5H3zM5 8v13h14V8M9 12h6"/>';button.innerHTML='<svg class="det-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+iconPaths+'</svg><span>'+label+'</span>';button.setAttribute('aria-label',label==='編輯'?'編輯目前資料':label);button.style.cssText='font-size:14px;padding:4px 8px;white-space:nowrap;color:'+color;button.onclick=handler;actions.append(button);};
            add('編輯','#173756',()=>openEdit(id,viewAs));
            const customer=DB.find(c=>c.id===id);
            if(customer&&getTypes(customer).some(t=>ARCHIVABLE.includes(t)))add(customer.archived?'解除封存':'封存',customer.archived?'#059669':'#D97706',()=>{if(customer.archived){closeDet();unarchiveClient(id);}else archiveClient(id);});
            add('刪除','#DC2626',()=>del(id));nav.prepend(actions);
            nav.style.flexWrap='wrap';
        }
        const identity=root.querySelector('.det-name')?.parentElement;
        const columns=document.createElement('div');columns.className='det-columns';
        const panes=['基本資料','物件與其他資料','聯絡紀錄'].map(label=>{const pane=document.createElement('section');pane.className='det-pane';pane.setAttribute('aria-label',label);const heading=document.createElement('h2');heading.className='det-pane-title';heading.textContent=label;pane.append(heading);columns.append(pane);return pane;});
        if(identity)panes[0].append(identity);
        let contactLog=false,beforeTypes=true;
        for(const child of [...body.children]){
            if(child.classList.contains('det-sec')&&child.textContent.trim().startsWith('聯繫紀錄'))contactLog=true;
            if(child.classList.contains('det-sec')||child.id.startsWith('collapse_'))beforeTypes=false;
            if(contactLog)panes[2].append(child);
            else if(child.classList.contains('tags')||(beforeTypes&&child.style.borderBottom))panes[0].append(child);
            else panes[1].append(child);
        }
        for(const pane of panes)if(pane.children.length===1){const empty=document.createElement('p');empty.className='det-pane-empty';empty.textContent='尚無資料';pane.append(empty);}
        body.replaceWith(columns);
        for(const group of root.querySelectorAll('.det-property-group')){
            const toolbar=document.createElement('div');toolbar.className='det-property-toolbar';const heading=group.firstElementChild;group.prepend(toolbar);toolbar.append(heading);
            for(const page of group.querySelectorAll('.det-property-page')){
                const link=page.querySelector('.det-folder-row a');if(!link)continue;const row=link.closest('.det-row'),details=row.closest('details');const actions=document.createElement('div');actions.className='det-folder-actions';actions.append(link);page.prepend(actions);row.remove();if(details&&details.children.length===1)details.remove();
            }
        }
        for(const page of root.querySelectorAll('.det-property-page')){
            const details=[...page.querySelectorAll('.det-property-more')];
            details.forEach(detail=>detail.querySelector(':scope>summary').addEventListener('click',event=>{event.preventDefault();const opening=!detail.open;details.forEach(other=>{other.open=opening&&other===detail;});}));
        }
        if(matchMedia('(min-width:1050px)').matches){
            if(identity){identity.classList.add('det-identity');const copy=identity.querySelector('.det-copy-contact');if(copy){copy.parentElement.classList.add('det-copy-wrap');copy.textContent='複製';copy.setAttribute('aria-label','複製姓名與電話');copy.title='複製姓名與電話';}const tags=panes[0].querySelector(':scope>.tags');if(tags)identity.append(tags);}
            const first=panes[1].querySelector(':scope>[id^="collapse_"]');if(first){first.style.display='';const heading=first.previousElementSibling;heading.style.opacity='1';const label=heading.querySelector('span');if(label)label.textContent=label.textContent.replace('（點擊展開）','');const arrow=heading.querySelector('.collapse-arrow');if(arrow)arrow.textContent='⌄';}
            const schedule=[...panes[1].children].find(el=>el.textContent.trim()==='預排行程');if(schedule){const card=document.createElement('section');card.className='det-schedule-card';schedule.before(card);const heading=document.createElement('h3');heading.textContent='預排行程';card.append(heading);let next=schedule.nextElementSibling;schedule.remove();while(next?.classList.contains('det-row')){const following=next.nextElementSibling;card.append(next);next=following;}panes[2].prepend(card);}
            const logHeading=panes[2].querySelector(':scope>.det-sec');if(logHeading){const years=logHeading.querySelector('#detLogYears');if(years){years.classList.add('det-log-filter');logHeading.replaceWith(years);}else logHeading.remove();}
        }
        const activityContent=document.createElement('div');activityContent.className='det-activity-content';
        activityContent.append(...panes[2].childNodes);panes[2].append(activityContent);
        const activityActions=document.createElement('div');activityActions.className='det-activity-actions det-activity-editor';panes[2].append(activityActions);
        if(activityDraft.id!==id)activityDraft={id:id,values:{}};
        const forms=document.createElement('div');forms.className='det-activity-forms';activityActions.append(forms);
        const displayForm=kind=>{
            const section=document.createElement('section');section.className='det-quick-section';section.dataset.kind=kind;
            const title=document.createElement('h3');title.textContent=kind==='contact'?'新增聯繫':'預排行程';
            const mount=document.createElement('div');mount.className='det-activity-mount';section.append(title,mount);forms.append(section);
            const snapshot=()=>{const values={};mount.querySelectorAll('input[data-quick-field],select[data-quick-field]').forEach(el=>values[el.dataset.quickField]=el.value);activityDraft.values[kind]=values;};

            const overlay=kind==='schedule'?window.quickSchedule(id,undefined,undefined,undefined,undefined,undefined,undefined,mount):window.quickContactLog(id,undefined,mount);
            if(!overlay)return;
            const prefix=kind==='schedule'?'qs':'cl',box=overlay.querySelector('.fill-menu');
            box.firstElementChild.remove();
            const save=box.querySelector('[data-quick-field="'+prefix+'-save"]'),cancel=save.parentElement.querySelector('button');
            cancel.textContent='清空';cancel.type='button';cancel.onclick=()=>{delete activityDraft.values[kind];const next=section.nextSibling;section.remove();displayForm(kind);if(next)forms.insertBefore(forms.lastElementChild,next);};
            save.textContent=kind==='schedule'?'儲存行程':'儲存聯繫';
            for(const [key,value] of Object.entries(activityDraft.values[kind]||{})){const el=box.querySelector('[data-quick-field="'+key+'"]');if(el)el.value=value;}
            mount.oninput=snapshot;mount.onchange=snapshot;
            const originalSave=save.onclick;
            save.onclick=function(event){
                const category=root.querySelector('.det-category-tabs [aria-selected=true]')?.textContent;
                originalSave.call(this,event);
                if(!overlay.isConnected&&currentDetId===id){
                    delete activityDraft.values[kind];window.showDet(id,viewAs);
                    if(category)[...document.querySelectorAll('#detContent .det-category-tabs button')].find(el=>el.textContent===category)?.click();
                }
            };
            fitActivityLogs();
        };
        displayForm('contact');displayForm('schedule');
        activityResizeObserver=new ResizeObserver(fitActivityLogs);activityResizeObserver.observe(activityContent);
        const scheduleCard=activityContent.querySelector('.det-schedule-card');if(scheduleCard)activityResizeObserver.observe(scheduleCard);
        fitActivityLogs();
        const sections=[...panes[1].querySelectorAll(':scope>[id^="collapse_"]')];
        if(sections.length){
            const tabs=document.createElement('div');tabs.className='det-category-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','資料類別');sections[0].previousElementSibling.before(tabs);
            const initiallyOpen=sections.find(panel=>panel.style.display!=='none')||sections[0];
            const categoryOrder=['買方','庫存','租客','房東','成交','商機'];
            const categoryRank=panel=>{const text=panel.previousElementSibling.textContent.trim();const rank=categoryOrder.findIndex(label=>text.startsWith(label));return rank<0?categoryOrder.length:rank;};
            sections.sort((a,b)=>categoryRank(a)-categoryRank(b));
            const buttons=sections.map((panel,index)=>{const heading=panel.previousElementSibling,button=document.createElement('button');button.type='button';button.textContent=heading.textContent.replace('（點擊展開）','').replace(/[⌄›▾▸▼▶❯⌃]/g,'').trim();button.id='det-category-'+serial+'-'+index;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);heading.remove();tabs.append(button);return button;});
            function select(index,focus){if(buttons[index].getAttribute('aria-selected')!=='true')resetDetails(panes[1]);sections.forEach((panel,i)=>{const selected=i===index;panel.style.display=selected?'':'none';buttons[i].setAttribute('aria-selected',String(selected));buttons[i].tabIndex=selected?0:-1;});if(focus)buttons[index].focus({preventScroll:true});}
            buttons.forEach((button,index)=>{button.onclick=()=>select(index,false);button.onkeydown=event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%buttons.length;else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();event.stopPropagation();select(next,true);};});select(sections.indexOf(initiallyOpen),false);
        }
        const propertyHeader=document.createElement('div');propertyHeader.className='det-property-header';const propertyTitle=panes[1].querySelector(':scope>.det-pane-title'),categoryTabs=panes[1].querySelector(':scope>.det-category-tabs');panes[1].prepend(propertyHeader);if(propertyTitle)propertyHeader.append(propertyTitle);if(categoryTabs)propertyHeader.append(categoryTabs);
        propertyHeaderObserver.observe(propertyHeader);
    };
    window.compactPropertyAddress=function(value){
        const address=String(value||'').trim().replace(/^[0-9０-９]{3,6}\s*/,'').replace(/\s+/g,'').replace(/^(?:臺北市|台北市|新北市|桃園市|臺中市|台中市|臺南市|台南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|台東縣|澎湖縣|金門縣|連江縣)/,'');
        const district=address.match(/^([^號巷弄0-9０-９]{1,5}[區鄉鎮市])/);
        const prefix=district?district[1]:'',rest=address.slice(prefix.length);
        const road=rest.match(/^(.+?(?:大道|路|街|道)(?:[一二三四五六七八九十0-9０-９]+段)?)/);
        const tail=road?rest.slice(road[1].length):rest;
        const floor=tail.match(/(?:地下|地上|B)?(?:[0-9０-９]+|[一二三四五六七八九十百]+)(?:樓|F)(?:之[0-9０-９]+)?/i);
        return prefix+(road?road[1]:'')+(floor?floor[0]:'');
    };
    function title(p, i, kind) {
        const community=String(p.rCommunity||p.community||'').trim();if(community)return community;
        const address=String(p.rAddr||p.addr||'').trim().replace(/^\d{3,6}\s*/, '');
        return compactPropertyAddress(address)||address||'物件 '+(i+1);
    }
    function row(label,value){return value===undefined||value===null||value===''?'':dRow(esc(label),String(value));}
    function link(label,value){if(!value)return '';try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return row(label,value);return '<div class="det-row"><span class="det-key">'+esc(label)+'</span><span class="det-val"><a target="_blank" rel="noopener noreferrer" href="'+esc(u.href)+'">開啟物件資料夾</a></span></div>';}catch{return row(label,value);}}
    function history(label,list){return (list||[]).map((h,i)=>({h,i})).sort((a,b)=>String(b.h.date||b.h.time||'').localeCompare(String(a.h.date||a.h.time||''))||b.i-a.i).map(({h,i})=>{
        const amount=h.value==null?'':String(h.value).trim(),value=['開價歷程','底價歷程'].includes(label)&&/^\d[\d,]*(?:\.\d+)?$/.test(amount)?amount+'萬':h.value;
        const content=[value,h.action,h.reason].filter(v=>v!==undefined&&v!==null&&v!=='').join(' · ');
        const date=h.date?(/^\d{4}-\d{2}-\d{2}/.test(h.date)?isoToROC(String(h.date).slice(0,10)):String(h.date).split(' ')[0]):(h.time?toROCDateTime(h.time).replace(/^民國/,'').split(' ')[0]:'');
        return '<div class="det-row det-history-row"><span class="det-key">'+esc(label+' '+(i+1))+'</span><span class="det-val">'+(date?'<span class="det-history-time">'+esc(date)+'</span>':'')+'<span class="det-history-value">'+esc(content)+'</span></span></div>';
    }).join('');}
    function extras(kind,p){
        let html='';
        if(kind==='r'){
            const fields={rRentPeriod:'租金週期',rMgmtType:'管理費方式',rMgmtBuilding:'建物管理費',rMgmtCar:'汽車位管理費',rMgmtMoto:'機車位管理費',rMgmtOther:'其他管理費',rMeterElec:'電錶',rMeterWater:'水錶',rMeterGas:'瓦斯錶',rTrashSpot:'垃圾集中處',rTrashBag:'專用垃圾袋',rParkingNo:'車位編號'};
            for(const [key,label] of Object.entries(fields))html+=row(label,p[key]);
            html+=row('附屬設備',Object.entries(p.rEquipment||{}).map(([name,qty])=>name+' '+qty).join('、'));
            for(const [i,h] of (p.rpRenewals||[]).entries())html+=row('續約 '+(i+1),[isoToROC(h.oldStart||''),isoToROC(h.oldEnd||''),'→',isoToROC(h.newStart||''),isoToROC(h.newEnd||''),h.months? h.months+'個月':''].filter(Boolean).join(' '));
            html+=link('物件資料夾',p.rpDriveUrl);
        }else if(kind==='s'){
            html+=row('物件狀態',p.spArchived?'暫停':'');html+=row('暫停原因',p.spArchiveReason);
            html+=history('開價歷程',p.spPriceHistory)+history('底價歷程',p.spFloorPriceHistory)+history('暫停歷程',p.spPauseHistory)+link('物件資料夾',p.spDriveUrl);
            for(const [i,h] of (p.spRenewals||[]).entries())html+=row('續約 '+(i+1),[isoToROC(h.oldStart||''),isoToROC(h.oldEnd||''),'→',isoToROC(h.newStart||''),isoToROC(h.newEnd||''),h.months?h.months+'個月':''].filter(Boolean).join(' '));
            const area=p.areaInput||{};
            for(const [key,label] of Object.entries({main:'主建物原始面積',ancillary:'附屬建物原始面積',land:'土地原始面積',common:'公設原始面積',parking:'車位原始面積'})){
                const items=Array.isArray(area[key])?area[key]:(area[key]?[area[key]]:[]);
                items.forEach((a,i)=>{const text=[a.id,a.area!==''&&a.area!==undefined?a.area+(a.unit==='ping'?'坪':'m²'):'',a.base?'基地 '+a.base+(a.baseUnit==='ping'?'坪':'m²'):'',a.mode==='fraction'?'持分 '+a.numerator+'/'+a.denominator:'',a.parkingNumerator?'車位持分 '+a.parkingNumerator+'/'+a.parkingDenominator:''].filter(Boolean).join(' · ');html+=row(label+(items.length>1?' '+(i+1):''),text);});
            }
        }else html+=link('物件資料夾',p.dealDriveUrl||p.dAddrDriveUrl);
        return html;
    }
    areaStyle.textContent+='.det-property-page .det-area-section .det-area-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))}.det-property-page .det-area-land .det-area-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}.det-area-grid .det-val{white-space:nowrap}';
    function tenants(c,index){return DB.filter(t=>!t._deleted&&t.linkedLandlordId===c.id&&(t.linkedPropertyIdx||0)===index).map(t=>'<div class="det-row"><span class="det-key">租客</span><span class="det-val det-tenant-info"><span>'+esc([t.ttName||t.name,t.ttPhone||t.phone].filter(Boolean).join('　'))+'</span>'+[t.ttIdNo,t.ttOccupation].filter(Boolean).map(text=>'<small>'+esc(text)+'</small>').join('')+'</span></div>'+row('租客條件',[t.rSubsidy2?'租補':'',t.rSocialHouse2?'社宅':'',t.rRegister2?'設籍':'',t.rTax2?'報稅':'',t.rPet2?'寵物':'',t.rAltar2?'神桌':'',t.rGoodCitizen2?'良民':'',t.rNotarize2?'公證':''].filter(Boolean).join('、'))).join('');}
    function compact(html,extra,kind,property){
        const holder=document.createElement('div');holder.innerHTML=html;
        const core=new Set(['社區大樓','物件地址','地址','成交地址','開價','租金','成交價格','坪數','坪數/車位','登記面積','車位','車位型態','車位價格','車位編號','立約日','起租日','到期日','成交日期','租客','房東條件','租客條件','需求區域','房型需求','預算','身份','類別','房屋型態','物件等級','約種']);
        const main=document.createElement('div'),groups=['面積與持分明細','合約與價格歷程','其他資料'].map(label=>{const box=document.createElement('details');box.className='det-property-more';const summary=document.createElement('summary');summary.textContent=label;box.append(summary);return box;});
        const seen=new Set();
        function distribute(child){
            if(child.classList.contains('sp-grid')){for(const cell of [...child.children]){if(!cell.textContent.trim())continue;cell.removeAttribute('style');cell.className='det-row';distribute(cell);}return;}
            // Some older property renderers wrap multiple grids in a plain container.
            if(!child.classList.contains('det-row')&&child.querySelector(':scope > .sp-grid')){for(const cell of [...child.children])distribute(cell);return;}
            const label=child.querySelector('.det-key')?.textContent.trim()||'',text=child.textContent.trim();if(!text)return;
            if(child.classList.contains('det-row')){if(seen.has(text))return;seen.add(text);}
            if(core.has(label)){main.append(child);return;}
            const heading=label||text;
            const bucket=/歷程|續約|^第\d+次|暫停原因|物件狀態/.test(heading)?1:/面積|持分|坪數|主建物|附屬建物|共有部分|公設|土地|基地/.test(heading)?0:2;
            groups[bucket].append(child);
        }
        for(const child of [...holder.children])distribute(child);
        const added=document.createElement('div');added.innerHTML=extra;
        for(const child of [...added.children])distribute(child);
        if(kind==='s'){
            const pass=[...groups[2].children].find(el=>el.querySelector('.det-key')?.textContent==='PASS件');
            if(pass){
                let contractRow=[...main.children].find(el=>el.querySelector('.det-key')?.textContent==='約種');
                if(!contractRow){contractRow=document.createElement('div');contractRow.className='det-row';contractRow.innerHTML='<span class="det-key">約種</span><span class="det-val"></span>';main.prepend(contractRow);}
                const badge=pass.querySelector('.det-val>span');
                if(badge){badge.classList.add('det-pass-badge');badge.title='PASS件：非本人委託';contractRow.querySelector('.det-val').append(badge);}
                pass.remove();
            }
            const totalRow=[...main.children].find(el=>el.querySelector('.det-key')?.textContent==='登記面積');
            if(totalRow){const number=value=>Number.parseFloat(value)||0,building=number(property.mainBldg)+number(property.ancBldg)+number(property.common),parking=number(property.parkingSz),value=totalRow.querySelector('.det-val');value.replaceChildren();const parts=['建物 '+building.toFixed(2)+' 坪'];if(property.parkingSz!==undefined&&String(property.parkingSz).trim()!=='')parts.push('＋ 車位 '+parking.toFixed(2)+' 坪');parts.push('＝ 總計 '+(building+parking).toFixed(2)+' 坪');for(const text of parts){const span=document.createElement('span');span.className='det-area-part';span.textContent=text;value.append(span);}}
        }
        if(kind==='s'){
            const costs=['底價','服務費','管理費'].map(label=>[...groups[2].children].find(el=>el.querySelector('.det-key')?.textContent===label)).filter(Boolean);
            const management=costs.find(el=>el.querySelector('.det-key')?.textContent==='管理費')?.querySelector('.det-val');
            if(management){
                const entries=[['mgmtBuilding','建物'],['mgmtCar','車位'],['mgmtMoto','機車位'],['mgmtOther','其他']].filter(([key])=>String(property[key]??'').trim()!=='').map(([key,label])=>({label,value:Number(String(property[key]).replace(/,/g,''))}));
                if(entries.length&&entries.every(entry=>Number.isFinite(entry.value))){
                    const period=String(property.mgmtPeriod||'').trim(),periodLabel=({'月繳':'每月','季繳':'每季','半年繳':'每半年','年繳':'每年'})[period]||period;
                    const total=entries.reduce((sum,entry)=>sum+entry.value,0),headline=document.createElement('strong'),detail=document.createElement('small');
                    headline.textContent=(periodLabel?periodLabel+' ':'')+'合計 '+total.toLocaleString('zh-TW')+' 元';
                    detail.textContent=entries.map(entry=>entry.label+' '+entry.value.toLocaleString('zh-TW')).join(' ＋ ');
                    management.replaceChildren(headline,detail);management.classList.add('det-management-summary');
                }
            }
            const price=[...main.children].find(el=>el.querySelector('.det-key')?.textContent==='開價');
            if(price)price.after(...costs);else main.prepend(...costs);
        }
        if(kind==='r'){
            const tenantRows=[...main.children].filter(el=>['租客','租客條件'].includes(el.querySelector('.det-key')?.textContent));
            if(tenantRows.length){
                const anchor=document.createComment('tenants before conditions');tenantRows[0].before(anchor);
                for(const label of ['租客','租客條件'])for(const entry of tenantRows)if(entry.querySelector('.det-key')?.textContent===label)anchor.before(entry);
                anchor.remove();
            }
            const oldAreaRows=[...main.children].filter(el=>['坪數/車位','坪數','車位','車位型態','車位編號'].includes(el.querySelector('.det-key')?.textContent));
            const anchor=document.createComment('rental area and parking');
            if(oldAreaRows.length)oldAreaRows[0].before(anchor);else main.append(anchor);
            oldAreaRows.forEach(el=>el.remove());
            const size=String(property.rSz||'').trim();
            for(const [label,value] of [['坪數',size?(size.replace(/\s*坪$/, '')+' 坪'):''],['車位型態',property.rParking],['車位編號',property.rParkingNo]]){
                if(value===undefined||value===null||String(value).trim()==='')continue;
                const entry=document.createElement('div'),key=document.createElement('span'),content=document.createElement('span');
                entry.className='det-row';key.className='det-key';content.className='det-val';key.textContent=label;content.textContent=String(value);entry.append(key,content);anchor.before(entry);
            }
            anchor.remove();
            const feeLabels=['管理費','管理費方式','建物管理費','汽車位管理費','機車位管理費','其他管理費'];
            for(const container of [main,...groups])for(const entry of [...container.children])if(feeLabels.includes(entry.querySelector('.det-key')?.textContent))entry.remove();
            const rent=[...main.children].find(el=>el.querySelector('.det-key')?.textContent==='租金');
            const formatAmount=value=>{const raw=String(value??'').trim().replace(/\s*元$/,'');return /^\d[\d,]*(?:\.\d+)?$/.test(raw)?Number(raw.replace(/,/g,'')).toLocaleString('zh-TW',{maximumFractionDigits:10})+' 元':raw?raw+' 元':'';};
            if(rent)rent.querySelector('.det-val').textContent=formatAmount(property.rent);
            const period=[...groups[2].children].find(el=>el.querySelector('.det-key')?.textContent==='租金週期');
            if(period){if(rent)rent.after(period);else main.append(period);}
            const entries=[['rMgmtBuilding','建物'],['rMgmtCar','汽車位'],['rMgmtMoto','機車位'],['rMgmtOther','其他']].filter(([key])=>String(property[key]??'').trim()!=='');
            const amounts=entries.map(([key])=>Number(String(property[key]).replace(/,/g,'')));
            const type=({'不含管':'租金不含','含管':'租金已含','內含':'租金已含'})[property.rMgmtType]||property.rMgmtType||'';
            if(entries.length||type){
                const entry=document.createElement('div');entry.className='det-row';
                const key=document.createElement('span'),value=document.createElement('span');key.className='det-key';key.textContent='管理費';value.className='det-val det-rental-fee';
                const total=entries.length&&amounts.every(Number.isFinite)?formatAmount(amounts.reduce((a,b)=>a+b,0)):'';
                const headline=document.createElement('span');headline.textContent=total+(type?(total?'（':'')+type+(total?'）':''):'');value.append(headline);
                if(entries.length>1||!total){const detail=document.createElement('small');detail.textContent=entries.map(([key,label])=>label+' '+formatAmount(property[key])).join(' ＋ ');value.append(detail);}
                entry.append(key,value);if(period)period.after(entry);else if(rent)rent.after(entry);else main.append(entry);
            }
            for(const entry of [...groups[1].children]){
                const match=entry.querySelector('.det-key')?.textContent.match(/^續約 (\d+)$/);
                if(!match)continue;const renewal=property.rpRenewals?.[Number(match[1])-1],value=entry.querySelector('.det-val');if(!renewal||!value)continue;
                value.replaceChildren();value.classList.add('det-rental-renewal');
                for(const [label,start,end] of [['原租期',renewal.oldStart,renewal.oldEnd],['新租期',renewal.newStart,renewal.newEnd]]){
                    const line=document.createElement('span'),heading=document.createElement('span'),dates=document.createElement('span');
                    heading.className='det-renewal-label';heading.textContent=label;
                    dates.textContent=(start?isoToROC(start):'未填')+' ～ '+(end?isoToROC(end):'未填');line.append(heading,dates);value.append(line);
                }
            }
        }
        // Pair only short, related values; keep addresses, people and narrative text full-width.
        for(const container of [main,...groups]){
            const pairs=[['物件等級','約種'],(kind==='r'?['車位型態','車位編號']:['車位型態','車位價格']),['立約日','到期日'],['起租日','到期日'],['成交日期','身份'],['類別','房屋型態'],...(kind==='s'?[['開價','底價']]:[['底價','服務費','管理費']]),['主建物','附屬建物'],['基地面積','土地持分面積'],['土地坪數','建物坪數'],['汽車位管理費','機車位管理費'],...(kind==='r'?[['租金','租金週期'],['管理費方式','建物管理費']]:[['租金週期','管理費方式','建物管理費'],['建物管理費','其他管理費']]),['瓦斯錶','水錶','電錶'],['垃圾集中處','專用垃圾袋']];
            for(const labels of pairs){const children=[...container.children],rows=labels.map(label=>children.find(el=>el.matches('.det-row')&&el.querySelector('.det-key')?.textContent===label)).filter(Boolean);if(rows.length<2)continue;const pair=document.createElement('div');pair.className='det-field-pair'+(rows.length===3?' det-field-triple':'')+(labels[0]==='底價'?' det-cost-fields':'');children.find(el=>rows.includes(el)).before(pair);pair.append(...rows);}
        }
        const area=groups[0],areaGrid=document.createElement('div');areaGrid.className='det-area-grid';
        for(const item of [...area.children].slice(1)){
            const rows=item.classList.contains('det-field-pair')?[...item.children]:[item];
            for(const entry of rows){const label=entry.querySelector('.det-key')?.textContent||'';
                if(label.includes('原始面積'))entry.remove();else areaGrid.append(entry);
            }
            if(item.classList.contains('det-field-pair'))item.remove();
        }
        if(areaGrid.children.length){
            const sections=[['建物面積','building'],['車位與公設比','parking'],['土地資料','land']].map(([label,kind])=>{const section=document.createElement('section');section.className='det-area-section det-area-'+kind;const heading=document.createElement('h4');heading.textContent=label;const grid=document.createElement('div');grid.className='det-area-grid';section.append(grid);return {section,grid};});
            for(const entry of [...areaGrid.children]){const label=entry.querySelector('.det-key')?.textContent||'',value=entry.querySelector('.det-val');const index=/土地|基地/.test(label)?2:/^車位|公設比/.test(label)?1:0;
                if(value){const match=value.textContent.trim().match(/^([\d,.]+)\s*(坪|%)$/);if(match){const n=Number(match[1].replace(/,/g,''));if(Number.isFinite(n)){const unit=document.createElement('small');unit.textContent=' '+match[2];value.replaceChildren(document.createTextNode(n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:match[2]==='%'?1:2})),unit);}}}
                if(label.includes('共有部分'))entry.querySelector('.det-key').textContent='共用';
                sections[index].grid.append(entry);
            }
            for(const {section,grid} of sections)if(grid.children.length)area.append(section);
        }
        // Label complete records and show the newest first without modifying data.
        const contract=groups[1];
        const renewals=[...contract.children].filter(el=>/^續約\s+\d+$/.test(el.querySelector('.det-key')?.textContent.trim()||''));
        const records=kind==='r'?property.rpRenewals:property.spRenewals;
        for(const entry of renewals){
            const index=Number(entry.querySelector('.det-key').textContent.match(/\d+/)[0])-1,h=records?.[index];
            if(!h)continue;
            entry.dataset.historyDate=h.time||h.date||h.newStart||'';
            const value=entry.querySelector('.det-val');value.replaceChildren();value.className='det-val det-renewal-record';
            const date=h.time?toROCDateTime(h.time).replace(/^民國/,'').split(' ')[0]:h.date?isoToROC(h.date):'未記錄';
            const period=(start,end)=>(start?isoToROC(start):'未填')+' ～ '+(end?isoToROC(end):'未填');
            const detail=document.createElement('details'),summary=document.createElement('summary');
            detail.className='det-renewal-extra';summary.textContent=period(h.newStart,h.newEnd);
            summary.setAttribute('aria-label','新合約期間 '+summary.textContent+'，展開續約詳情');
            detail.append(summary);value.append(detail);
            for(const [label,text] of [['續約日期',date],['原合約期間',period(h.oldStart,h.oldEnd)],...(h.months?[['續約月數',h.months+' 個月']]:[])]){
                const line=document.createElement('span'),key=document.createElement('span'),content=document.createElement('span');
                key.className='det-renewal-label';key.textContent=label;content.textContent=text;line.append(key,content);detail.append(line);
            }
        }
        renewals.sort((a,b)=>(b.dataset.historyDate||'').localeCompare(a.dataset.historyDate||'')||Number(b.querySelector('.det-key').textContent.match(/\d+/)[0])-Number(a.querySelector('.det-key').textContent.match(/\d+/)[0]));
        function foldOlder(container,entries){
            container.append(...entries);
            if(entries.length<=3)return;
            const fold=document.createElement('details');fold.className='det-history-fold';
            const summary=document.createElement('summary'),closed=document.createElement('span'),opened=document.createElement('span');
            closed.className='det-history-collapsed';closed.textContent='展開其餘 '+(entries.length-3)+' 筆';
            opened.className='det-history-expanded';opened.textContent='收合較早紀錄';summary.append(closed,opened);fold.append(summary,...entries.slice(3));container.append(fold);
        }
        for(const entry of [...contract.children])if(entry.querySelector('.det-key')?.textContent.trim()==='到期歷程')entry.remove();
        const end=kind==='r'?property.rEndDate:property.contractEnd;
        if(kind!=='r'&&end&&renewals.length){const current=document.createElement('div');current.innerHTML=row('目前到期日',isoToROC(end));contract.children[0].after(...current.children);}
        if(renewals.length){
            const section=document.createElement(kind==='r'?'details':'section');section.className=kind==='r'?'det-property-more det-rental-history':'det-renewal-history';
            if(kind==='r'){const heading=document.createElement('summary');heading.textContent='續約歷程（'+renewals.length+'筆）';section.append(heading);}
            contract.append(section);foldOlder(section,renewals);
        }
        for(const label of ['開價歷程','底價歷程','暫停歷程']){
            const entries=[...contract.children].filter(el=>el.classList.contains('det-history-row')&&el.querySelector('.det-key')?.textContent.startsWith(label));
            if(entries.length){const section=document.createElement('section');section.className='det-price-history';contract.append(section);foldOlder(section,entries);}
        }
        const other=groups[2];other.classList.add('det-other-info');
        for(const item of other.querySelectorAll('.det-row')){
            const label=item.querySelector('.det-key')?.textContent,value=item.querySelector('.det-val');if(!value)continue;
            if(['瓦斯錶','水錶','電錶','垃圾集中處','專用垃圾袋'].includes(label))item.classList.add('det-utility-row');
            if(label==='專用垃圾袋'){const answer=value.textContent.trim().toUpperCase();if(answer==='N')value.textContent='否';else if(answer==='Y')value.textContent='是';}
            if(label==='附屬設備'){
                const entries=value.textContent.split('、').map(text=>text.trim()).filter(Boolean);value.replaceChildren();value.classList.add('det-equipment-list');
                for(const text of entries){const chip=document.createElement('span');chip.className='det-equipment-chip';chip.textContent=text.replace(/\s+(\d+)$/,' ×$1');value.append(chip);}
            }
            if(label==='物件資料夾'&&value.querySelector('a')){item.classList.add('det-folder-row');const link=value.querySelector('a');link.classList.add('det-folder-link');link.innerHTML='<svg class="det-folder-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2M3 7h5l2 3h11l-3 10H3V7Z"/></svg><span>開啟資料夾</span>';other.append(item);}
        }
        for(const group of groups)if(group.children.length>1){
            if(kind==='r'){
                const target=group===other?document.createElement('div'):main;
                if(target!==main){target.className='det-other-info';main.append(target);}
                for(const item of [...group.children].slice(1)){
                    if(item.querySelector('.det-key')?.textContent==='附屬設備'){
                        const equipment=document.createElement('details');equipment.className='det-property-more det-equipment-more';
                        const heading=document.createElement('summary');heading.textContent='附屬設備';equipment.append(heading,item.querySelector('.det-val'));target.append(equipment);
                    }else target.append(item);
                }
             }else if(kind==='d'&&group===area){
                const rows=[...area.querySelectorAll('.det-area-grid>.det-row')];
                if(rows.length>1){const pair=document.createElement('div');pair.className='det-field-pair det-opportunity-areas';pair.append(...rows);main.append(pair);}else main.append(...rows);
            }
            else main.append(group);
        }
        if(kind==='r'){
            const utilityRows=[...main.querySelectorAll('.det-utility-row')];
            const utilityGroups=[...new Set(utilityRows.map(row=>row.parentElement.classList.contains('det-field-pair')?row.parentElement:row))];
            if(utilityGroups.length){const section=document.createElement('section');section.className='det-utility-section';section.setAttribute('aria-label','水電與垃圾資訊');utilityGroups[0].before(section);const heading=document.createElement('h4');heading.textContent='裝置';section.append(heading,...utilityGroups);}
        }
        if(kind==='r'){const renewalHistory=main.querySelector('.det-rental-history');if(renewalHistory){const equipment=main.querySelector('.det-equipment-more');if(equipment)equipment.before(renewalHistory);else main.append(renewalHistory);}}
        main.querySelectorAll('.det-row').forEach(entry=>{if(['開價','底價','租金','成交價格','服務費','車位價格'].includes(entry.querySelector('.det-key')?.textContent.trim()))entry.classList.add('det-emphasis');});
        return main.innerHTML;
    }
    window.typeDetail=function(c,viewAs){
        const config={'庫存屋主':['sProperties','s'],'房東':['rProperties','r'],'租案管理':['rProperties','r'],'成交客戶':['deals','c'],'商機募集':['dAddrs','d']}[c.type];
        if(!config)return original(c,viewAs);
        const [key,kind]=config;let entries=(c[key]||[]).map((p,index)=>({p,index}));if(!entries.length)return original(c,viewAs);
        if(kind==='s'&&bfSGrade)entries.sort((a,b)=>Number(b.p.grade===bfSGrade)-Number(a.p.grade===bfSGrade));
        const group='property-detail-'+(++serial),names=entries.map(({p,index})=>title(p,index,kind));
        const labels=names.map((name,i)=>names.filter(n=>n===name).length>1?name+'（'+(i+1)+'）':name);
        const tabs='<div class="det-property-tabs" role="tablist" aria-label="切換物件">'+entries.map((_,i)=>'<button type="button" role="tab" id="'+group+'-tab-'+i+'" aria-controls="'+group+'-page-'+i+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'" title="'+esc(labels[i])+'">'+esc(labels[i])+'</button>').join('')+'</div>';
        const unlinked=c.type==='房東'?DB.filter(t=>!t._deleted&&t.linkedLandlordId===c.id&&!c.rProperties[t.linkedPropertyIdx||0]).map(t=>row('未指定物件的租客',[t.ttName||t.name,t.ttPhone||t.phone].filter(Boolean).join('　'))).join(''):'';
        return '<div class="det-property-group">'+tabs+entries.map(({p,index},i)=>{
            const copy={...c,[key]:[p]};
            // Render linked tenants using the original property index, not the single-item clone index.
            if(c.type==='房東'){copy.id='detail-only-'+group;copy.linkedTenantIds=[];}
            const body=original(copy,viewAs)+(c.type==='房東'?tenants(c,index):'');
            return '<section class="det-property-page" id="'+group+'-page-'+i+'" '+(entries.length>1?'role="tabpanel" aria-labelledby="'+group+'-tab-'+i+'"':'aria-label="'+esc(labels[i])+'"')+(i?' hidden':'')+'>'+compact(body,extras(kind,p),kind,p)+'</section>';
        }).join('')+unlinked+'</div>';
    };
    function resetDetails(scope){scope.querySelectorAll('.det-property-more[open]').forEach(detail=>detail.open=false);resetPropertyScroll(scope);}
    function activate(button){
        const group=button.closest('.det-property-group');if(!group)return;if(button.getAttribute('aria-selected')!=='true')resetDetails(group);
        group.querySelectorAll('[role=tab]').forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',selected);tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;});

    }
    let railDrag=null,suppressRailClick=null;
    document.addEventListener('pointerdown',event=>{
        if(event.pointerType!=='mouse'||event.button!==0)return;
        const rail=event.target.closest('.det-property-tabs,.edit-object-tabs');if(!rail||rail.scrollWidth<=rail.clientWidth)return;
        const rect=rail.getBoundingClientRect();if(event.clientY>=rect.top+(rail.clientTop+rail.clientHeight)*(rect.height/rail.offsetHeight))return;
        railDrag={rail,id:event.pointerId,x:event.clientX,left:rail.scrollLeft,scale:rect.width/rail.offsetWidth,moved:false};suppressRailClick=null;
    },true);
    document.addEventListener('pointermove',event=>{
        const drag=railDrag;if(!drag||event.pointerId!==drag.id)return;
        const delta=event.clientX-drag.x;if(!drag.moved&&Math.abs(delta)<6)return;
        if(!drag.moved){drag.moved=true;drag.rail.classList.add('is-dragging');drag.rail.setPointerCapture(event.pointerId);}
        event.preventDefault();drag.rail.scrollLeft=drag.left-delta/drag.scale;
    },true);
    function endRailDrag(event){const drag=railDrag;if(!drag||(event&&event.pointerId!==drag.id))return;railDrag=null;drag.rail.classList.remove('is-dragging');if(drag.rail.hasPointerCapture(drag.id))drag.rail.releasePointerCapture(drag.id);if(drag.moved){suppressRailClick=drag.rail;setTimeout(()=>{if(suppressRailClick===drag.rail)suppressRailClick=null;},0);}}
    document.addEventListener('pointerup',endRailDrag,true);document.addEventListener('pointercancel',endRailDrag,true);window.addEventListener('blur',()=>endRailDrag());
    document.addEventListener('click',event=>{if(suppressRailClick&&suppressRailClick.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();suppressRailClick=null;return;}const tab=event.target.closest('.det-property-tabs [role=tab]');if(tab)activate(tab);},true);
    document.addEventListener('keydown',event=>{const tab=event.target.closest('.det-property-tabs [role=tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...tab.parentElement.children],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activate(tabs[next]);tabs[next].focus({preventScroll:true});},true);
    // A horizontal swipe on property tabs must not trigger the detail modal's swipe-to-close shortcut.
    document.addEventListener('touchend',event=>{if(event.target.closest('.det-property-tabs,.det-category-tabs'))event.stopPropagation();},true);
})();
