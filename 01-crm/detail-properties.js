/* Read-only property pages: reuse existing detail rendering, never the edit form. */
(function () {
    'use strict';
    const original = window.typeDetail;
    let serial = 0;
    const style = document.createElement('style');
    style.textContent = '.det-property-tabs{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;padding:4px 1px 10px;max-width:100%}.det-property-tabs button{flex:0 0 auto;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;color:#173756;font:inherit;font-size:14px;cursor:pointer}.det-property-tabs button[aria-selected=true]{background:#173756;color:white;border-color:#173756}.det-property-tabs button:focus-visible{outline:3px solid #0891b2;outline-offset:1px}.det-property-page[hidden]{display:none!important}.det-property-page{min-width:0}.det-property-more{margin-top:8px;border-top:1px solid #e7e5e4}.det-property-more>summary{padding:10px 0;cursor:pointer;color:#036986;font-weight:600}.det-property-page .det-val{white-space:pre-wrap;overflow-wrap:anywhere}.det-property-page a{overflow-wrap:anywhere}.det-property-title{font-weight:700;margin:8px 0;color:#173756}.det-property-readonly{font-size:12px;color:#78716c;margin:0 0 6px}';
    document.head.append(style);
    const layoutStyle=document.createElement('style');
    layoutStyle.textContent='.det-columns,.det-pane{display:contents}.det-pane-title,.det-pane-empty{display:none}@media(min-width:1050px){#dModal{align-items:center!important;padding:20px!important}#dModal>.modal{width:96vw;max-width:1560px!important;height:90dvh;max-height:90dvh;overflow:hidden}#detContent{height:100%;display:flex;flex-direction:column;min-height:0}#detContent>.det-head{position:static;flex-shrink:0;min-height:58px;padding:8px 18px}.det-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));flex:1;min-height:0;overflow:hidden}.det-pane{display:block;min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:14px 18px;scrollbar-gutter:stable}.det-pane+.det-pane{border-left:1px solid #e7e5e4}.det-pane-title{display:block;font-size:17px;color:#173756;font-weight:700;margin:0 0 14px}.det-pane-empty{display:block;color:#78716c;font-size:14px}.det-pane .det-name{font-size:26px}.det-pane .det-phone{font-size:20px}.det-pane .det-row{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;align-items:start}.det-pane .det-key{width:auto!important;min-width:0;white-space:normal!important}.det-pane .det-val{min-width:0;overflow-wrap:anywhere;white-space:pre-wrap}.det-pane .sp-grid{grid-template-columns:1fr!important}.det-pane .sp-grid>div:empty{display:none}.det-pane .sp-grid>div{min-width:0}.det-pane .sp-grid .det-key{flex:0 0 92px}.det-pane .det-sec{margin-top:10px}}';
    document.head.append(layoutStyle);
    const polishStyle=document.createElement('style');
    polishStyle.textContent='@media(min-width:1050px){.det-columns{grid-template-columns:minmax(0,28fr) minmax(0,38fr) minmax(0,34fr)}.det-identity{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px!important;justify-content:normal!important;margin:2px 0 18px}.det-identity .det-name{grid-column:1/-1;text-align:left;margin:0;font-size:26px}.det-identity .det-phone{text-align:left;margin:0;font-size:20px;align-self:center;overflow-wrap:anywhere}.det-identity .det-copy-wrap{margin:0!important}.det-identity .det-copy-contact{padding:5px 9px;font-size:13px;min-height:32px}.det-identity .tags{grid-column:1/-1;margin:4px 0 0!important}.det-schedule-card{padding:12px;background:#f0f6fb;border:1px solid #dfebf4;border-radius:10px;margin:14px 0}.det-schedule-card h3{margin:0 0 6px;font-size:14px;color:#173756}.det-schedule-card .det-row{grid-template-columns:100px minmax(0,1fr);border-color:#dfe8f1}.det-schedule-card .det-row .det-key{white-space:pre-line!important;margin-right:0!important}.det-schedule-card .det-val{font-weight:500}#detLogList .det-val{font-weight:400;line-height:1.55}#detLogList .det-row{padding-top:6px;padding-bottom:6px}.det-log-filter{margin:0 0 12px}}';
    document.head.append(polishStyle);
    const pairStyle=document.createElement('style');
    pairStyle.textContent='.det-category-tabs{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;border-bottom:1px solid #e2e8f0;margin-bottom:14px;padding:0 0 8px}.det-category-tabs button{flex:0 0 auto;border:1px solid transparent;border-radius:8px;background:#f1f5f9;color:#475569;padding:9px 12px;font:inherit;font-weight:600;cursor:pointer}.det-category-tabs button[aria-selected=true]{background:#173756;color:white}.det-category-tabs button:focus-visible{outline:2px solid #0891b2;outline-offset:1px}'+'.det-field-pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:0 14px}.det-property-page .det-row{display:grid;grid-template-columns:92px minmax(0,1fr);gap:8px;align-items:start;min-width:0}.det-property-page .det-row>.det-key{width:auto!important;min-width:0}.det-field-pair>.det-row>.det-val{min-width:0;overflow-wrap:anywhere}.det-area-part{display:inline-block;margin-right:5px}';
    document.head.append(pairStyle);
    const originalShow=window.showDet;
    window.showDet=function(id,viewAs){
        originalShow(id,viewAs);
        const root=document.getElementById('detContent'),body=root.querySelector(':scope > .det-body');if(!body)return;
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
        if(matchMedia('(min-width:1050px)').matches){
            if(identity){identity.classList.add('det-identity');const copy=identity.querySelector('.det-copy-contact');if(copy){copy.parentElement.classList.add('det-copy-wrap');copy.textContent='複製';copy.setAttribute('aria-label','複製姓名與電話');copy.title='複製姓名與電話';}const tags=panes[0].querySelector(':scope>.tags');if(tags)identity.append(tags);}
            const first=panes[1].querySelector(':scope>[id^="collapse_"]');if(first){first.style.display='';const heading=first.previousElementSibling;heading.style.opacity='1';const label=heading.querySelector('span');if(label)label.textContent=label.textContent.replace('（點擊展開）','');const arrow=heading.querySelector('.collapse-arrow');if(arrow)arrow.textContent='⌄';}
            const schedule=[...panes[1].children].find(el=>el.textContent.trim()==='預排行程');if(schedule){const card=document.createElement('section');card.className='det-schedule-card';schedule.before(card);const heading=document.createElement('h3');heading.textContent='預排行程';card.append(heading);let next=schedule.nextElementSibling;schedule.remove();while(next?.classList.contains('det-row')){const following=next.nextElementSibling;const date=next.querySelector('.det-key');if(date)date.textContent=date.textContent.replace(/ (\d{1,2}:\d{2})$/,'\n$1');card.append(next);next=following;}}
            const logHeading=panes[2].querySelector(':scope>.det-sec');if(logHeading){const years=logHeading.querySelector('#detLogYears');if(years){years.classList.add('det-log-filter');logHeading.replaceWith(years);}else logHeading.remove();}
        }
        const sections=[...panes[1].querySelectorAll(':scope>[id^="collapse_"]')];
        if(sections.length){
            const tabs=document.createElement('div');tabs.className='det-category-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','資料類別');sections[0].previousElementSibling.before(tabs);
            const initiallyOpen=sections.find(panel=>panel.style.display!=='none')||sections[0];
            const buttons=sections.map((panel,index)=>{const heading=panel.previousElementSibling,button=document.createElement('button');button.type='button';button.textContent=heading.textContent.replace('（點擊展開）','').replace(/[⌄›▾▸▼▶❯⌃]/g,'').trim();button.id='det-category-'+serial+'-'+index;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',button.id);heading.remove();tabs.append(button);return button;});
            function select(index,focus){sections.forEach((panel,i)=>{const selected=i===index;panel.style.display=selected?'':'none';buttons[i].setAttribute('aria-selected',String(selected));buttons[i].tabIndex=selected?0:-1;});if(focus)buttons[index].focus();}
            buttons.forEach((button,index)=>{button.onclick=()=>select(index,false);button.onkeydown=event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%buttons.length;else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=buttons.length-1;else return;event.preventDefault();event.stopPropagation();select(next,true);};});select(sections.indexOf(initiallyOpen),false);
        }
    };
    function title(p, i) {
        const community=String(p.rCommunity||p.community||'').trim();if(community)return community;
        const address=String(p.rAddr||p.addr||'').trim().replace(/^\d{3,6}\s*/, '');
        const short=address.replace(/^.*?[縣市]/,'').replace(/^.*?[區鄉鎮市]/,'');
        const road=short.match(/^(.+?(?:路|街|大道)(?:[一二三四五六七八九十\d]+段)?)/);
        return road?road[1]:(address||'物件 '+(i+1));
    }
    function row(label,value){return value===undefined||value===null||value===''?'':dRow(esc(label),String(value));}
    function link(label,value){if(!value)return '';try{const u=new URL(value);if(!['https:','http:'].includes(u.protocol))return row(label,value);return '<div class="det-row"><span class="det-key">'+esc(label)+'</span><span class="det-val"><a target="_blank" rel="noopener noreferrer" href="'+esc(u.href)+'">開啟物件資料夾</a></span></div>';}catch{return row(label,value);}}
    function history(label,list){return (list||[]).map((h,i)=>row(label+' '+(i+1),[h.value,h.action,h.reason,h.date,h.time&&toROCDateTime(h.time)].filter(v=>v!==undefined&&v!=='').join(' · '))).join('');}
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
    function tenants(c,index){return DB.filter(t=>!t._deleted&&t.linkedLandlordId===c.id&&(t.linkedPropertyIdx||0)===index).map(t=>row('租客',[t.ttName||t.name,t.ttPhone||t.phone,t.ttIdNo,t.ttOccupation].filter(Boolean).join('　'))+row('租客條件',[t.rSubsidy2?'租補':'',t.rSocialHouse2?'社宅':'',t.rRegister2?'設籍':'',t.rTax2?'報稅':'',t.rPet2?'寵物':'',t.rAltar2?'神桌':'',t.rGoodCitizen2?'良民':'',t.rNotarize2?'公證':''].filter(Boolean).join('、'))).join('');}
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
            const totalRow=[...main.children].find(el=>el.querySelector('.det-key')?.textContent==='登記面積');
            if(totalRow){const number=value=>Number.parseFloat(value)||0,building=number(property.mainBldg)+number(property.ancBldg)+number(property.common),parking=number(property.parkingSz),value=totalRow.querySelector('.det-val');value.replaceChildren();const parts=['建物 '+building.toFixed(2)+' 坪'];if(property.parkingSz!==undefined&&String(property.parkingSz).trim()!=='')parts.push('＋ 車位 '+parking.toFixed(2)+' 坪');parts.push('＝ 總計 '+(building+parking).toFixed(2)+' 坪');for(const text of parts){const span=document.createElement('span');span.className='det-area-part';span.textContent=text;value.append(span);}}
        }
        // Pair only short, related values; keep addresses, people and narrative text full-width.
        for(const container of [main,...groups]){
            const pairs=[['物件等級','約種'],['車位型態','車位價格'],['立約日','到期日'],['起租日','到期日'],['身份','成交日期'],['類別','房屋型態'],['底價','服務費'],['主建物','附屬建物'],['基地面積','土地持分面積'],['土地坪數','建物坪數'],['汽車位管理費','機車位管理費'],['租金週期','管理費方式'],['建物管理費','其他管理費'],['電錶','水錶','瓦斯錶'],['垃圾集中處','專用垃圾袋']];
            for(const labels of pairs){const children=[...container.children],rows=labels.map(label=>children.find(el=>el.matches('.det-row')&&el.querySelector('.det-key')?.textContent===label)).filter(Boolean);if(rows.length<2)continue;const pair=document.createElement('div');pair.className='det-field-pair';rows[0].before(pair);pair.append(...rows);}
        }
        for(const group of groups)if(group.children.length>1)main.append(group);
        return main.innerHTML;
    }
    window.typeDetail=function(c,viewAs){
        const config={'庫存屋主':['sProperties','s'],'房東':['rProperties','r'],'租案管理':['rProperties','r'],'成交客戶':['deals','c'],'商機募集':['dAddrs','d']}[c.type];
        if(!config)return original(c,viewAs);
        const [key,kind]=config;let entries=(c[key]||[]).map((p,index)=>({p,index}));if(!entries.length)return original(c,viewAs);
        if(kind==='s'&&bfSGrade)entries.sort((a,b)=>Number(b.p.grade===bfSGrade)-Number(a.p.grade===bfSGrade));
        const group='property-detail-'+(++serial),names=entries.map(({p,index})=>title(p,index));
        const labels=names.map((name,i)=>names.filter(n=>n===name).length>1?name+'（'+(i+1)+'）':name);
        const tabs=entries.length>1?'<div class="det-property-tabs" role="tablist" aria-label="切換物件">'+entries.map((_,i)=>'<button type="button" role="tab" id="'+group+'-tab-'+i+'" aria-controls="'+group+'-page-'+i+'" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'" title="'+esc(labels[i])+'">'+esc(labels[i])+'</button>').join('')+'</div>':'<div class="det-property-title">'+esc(labels[0])+'</div>';
        const unlinked=c.type==='房東'?DB.filter(t=>!t._deleted&&t.linkedLandlordId===c.id&&!c.rProperties[t.linkedPropertyIdx||0]).map(t=>row('未指定物件的租客',[t.ttName||t.name,t.ttPhone||t.phone].filter(Boolean).join('　'))).join(''):'';
        return '<div class="det-property-group">'+tabs+entries.map(({p,index},i)=>{
            const copy={...c,[key]:[p]};
            // Render linked tenants using the original property index, not the single-item clone index.
            if(c.type==='房東'){copy.id='detail-only-'+group;copy.linkedTenantIds=[];}
            const body=original(copy,viewAs)+(c.type==='房東'?tenants(c,index):'');
            return '<section class="det-property-page" id="'+group+'-page-'+i+'" '+(entries.length>1?'role="tabpanel" aria-labelledby="'+group+'-tab-'+i+'"':'aria-label="'+esc(labels[i])+'"')+(i?' hidden':'')+'>'+compact(body,extras(kind,p),kind,p)+'</section>';
        }).join('')+unlinked+'</div>';
    };
    function activate(button){
        const group=button.closest('.det-property-group');if(!group)return;
        group.querySelectorAll('[role=tab]').forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',selected);tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;});
    }
    document.addEventListener('click',event=>{const tab=event.target.closest('.det-property-tabs [role=tab]');if(tab)activate(tab);},true);
    document.addEventListener('keydown',event=>{const tab=event.target.closest('.det-property-tabs [role=tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...tab.parentElement.children],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;activate(tabs[next]);tabs[next].focus({preventScroll:true});},true);
    // A horizontal swipe on property tabs must not trigger the detail modal's swipe-to-close shortcut.
    document.addEventListener('touchend',event=>{if(event.target.closest('.det-property-tabs,.det-category-tabs'))event.stopPropagation();},true);
})();
