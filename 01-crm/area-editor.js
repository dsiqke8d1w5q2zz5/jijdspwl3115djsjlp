/* Area source values stay separate from the legacy ping totals used by CRM. */
(function () {
    'use strict';
    const RATE = 0.3025;
    const fields = {baseLand:'BaseLand',landShare:'LandShare',mainBldg:'MainBldg',ancBldg:'AncBldg',common:'Common',parkingSz:'ParkingSz'};
    const clone = value => JSON.parse(JSON.stringify(value));
    const fmt = n => Number(n).toLocaleString('zh-TW', {maximumFractionDigits:2});
    const number = value => value === '' ? 0 : Number(value);
    const ping = (value, unit) => number(value) * (unit === 'sqm' ? RATE : 1);
    function areaSum(value) {
        const text=String(value).replace(/＋/g,'+').trim();
        if(!/^(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\+\s*(?:\d+(?:\.\d*)?|\.\d+))*$/.test(text)) return NaN;
        const sum=text.split('+').reduce((total,part)=>total+Number(part.trim()),0);
        return Number.isFinite(sum)?Number(sum.toFixed(2)):NaN;
    }
    function field(root, key) { return root.querySelector(root.id === 'sellerFixedProperty' ? '#f-s'+fields[key] : '[data-f="'+key+'"]'); }
    function parkingField(root,key) { return root.querySelector(root.id==='sellerFixedProperty'?'#f-'+key:'[data-f="'+key+'"]'); }
    function row(area = '', unit = 'sqm') { return {id:'',area,unit,mode:'direct',numerator:'',denominator:''}; }
    function node(tag, text, className) { const el = document.createElement(tag); if(text) el.textContent=text; if(className) el.className=className; return el; }
    function button(text, action) { const el=node('button',text); el.type='button'; el.onclick=action; return el; }
    function input(value, label, change, numeric = true) {
        const el=node('input'); el.type=numeric?'number':'text'; el.value=value; el.setAttribute('aria-label',label);
        if(numeric) { el.min='0'; el.step='any'; el.inputMode='decimal'; }
        el.oninput=()=>change(el.value); return el;
    }
    function select(value, options, change, label) {
        const el=node('select'); el.setAttribute('aria-label',label);
        Object.entries(options).forEach(([key,title])=>{const opt=node('option',title);opt.value=key;el.append(opt);});
        el.value=value; el.onchange=()=>change(el.value); return el;
    }
    function labeled(label, control) { const el=node('label',label); el.append(control); return el; }
    function measure(item) { if(item.pendingLegacy) return item.legacyPing; return ping(item.area,item.unit) * (item.mode==='fraction' ? number(item.numerator)/number(item.denominator) : 1); }
    function invalid(item) {
        if(item.pendingLegacy) return false;
        if(item.area==='' && !item.id && !item.numerator && !item.denominator) return false;
        if(item.area==='' || !Number.isFinite(number(item.area)) || number(item.area)<0) return true;
        return item.mode==='fraction' && (!item.numerator || !item.denominator || !Number.isInteger(number(item.numerator)) || !Number.isInteger(number(item.denominator)) || number(item.numerator)<=0 || number(item.denominator)<=0 || number(item.numerator)>number(item.denominator));
    }
    function mount(root, saved) {
        if(!root || !field(root,'baseLand')) return;
        const previous=root.querySelector('.area-editor'); if(previous) previous.remove();
        const legacy=key=>field(root,key).value;
        const state=saved ? clone(saved) : {
            version:1, main:row(legacy('mainBldg'),legacy('mainBldg')?'ping':'sqm'), ancillary:row(legacy('ancBldg'),legacy('ancBldg')?'ping':'sqm'),
            parking:row(legacy('parkingSz'),legacy('parkingSz')?'ping':'sqm'), parkingIncluded:false,
            land:[Object.assign(row(legacy('landShare'),legacy('landShare')?'ping':'sqm'),{base:legacy('baseLand'),baseUnit:legacy('baseLand')?'ping':'sqm',mode:legacy('landShare')||legacy('baseLand')?'direct':'fraction'})],
            common:[Object.assign(row(legacy('common'),legacy('common')?'ping':'sqm'),{mode:legacy('common')?'direct':'fraction'})]
        };
        if(state.version < 2) {
            state.common.forEach(item=>item.kind='common');
            if(state.parking.area!=='') state.common.push(Object.assign(clone(state.parking),{kind:'parking'}));
            [...state.land,...state.common].forEach(item=>{
                if(item.mode==='direct' && (item.area!=='' || item.base)) {
                    item.legacyPing=ping(item.area,item.unit);
                    item.legacySource=clone(item);
                    item.pendingLegacy=true;
                    item.area=item.base?String(ping(item.base,item.baseUnit)/RATE):'';
                    item.unit='sqm';item.numerator='';item.denominator='';
                }
                item.mode='fraction';
            });
            state.version=2;
        }
        if(state.version < 3) {
            const details={};['parking','parkingPrice','parkingNo'].forEach(key=>{details[key]=parkingField(root,key).value;});
            let parked=state.common.find(item=>item.kind==='parking');
            if(!parked && Object.values(details).some(Boolean)) { parked=Object.assign(row(),{kind:'parking',mode:'fraction'});state.common.push(parked); }
            if(parked) Object.assign(parked,details);
            [...state.land,...state.common].forEach(item=>{
                if(item.mode==='direct' && item.area!=='') {
                    item.legacyPing=ping(item.area,item.unit);item.legacySource=clone(item);item.pendingLegacy=true;
                    item.area=item.base?String(ping(item.base,item.baseUnit)/RATE):'';item.unit='sqm';item.numerator='';item.denominator='';
                }
                item.mode='fraction';
            });
            state.version=3;
        }
        // Refresh defaults for previously saved empty fields; preserve entered values and units.
        const empty=value=>value===undefined || value===null || String(value).trim()==='';
        [state.main,state.ancillary].forEach(item=>{if(!empty(item.area)&&item.unit==='ping')item.area=String(Number(item.area)/RATE);item.unit='sqm';});
        [state.main,state.ancillary,state.parking,...state.land,...state.common].forEach(item=>{
            if(empty(item.area)) item.unit='sqm';
            else if(Number.isFinite(Number(item.area))) item.area=Number(item.area).toFixed(2);
        });
        [...state.land,...state.common].forEach(item=>{
            if(empty(item.base)) item.baseUnit='sqm';
            if(empty(item.area) && empty(item.base) && empty(item.numerator) && empty(item.denominator)) item.mode='fraction';
        });
        root._areaState=state;
        const editor=node('section','', 'area-editor');
        const baseGroup=field(root,'baseLand').closest('.fg').parentElement;
        baseGroup.before(editor);
        baseGroup.style.display='none';
        field(root,'mainBldg').closest('.fg').parentElement.style.display='none';
        field(root,'parkingSz').closest('.fg').style.display='none';
        field(root,'parkingSz').closest('.fg').parentElement.style.display='none';
        editor.append(node('strong','面積與持分'),node('p','依謄本填寫總面積與持分，自動換算坪數；車位請選擇「車位」分類。','area-hint'));
        const outputs=[];
        const summary=node('div','','area-summary-meta'); summary.setAttribute('aria-live','polite');
        const oldTotals=root.id==='sellerFixedProperty'?root.querySelector('#sRegSz'):root.querySelector('[data-f="regSz"]');
        if(oldTotals) oldTotals.parentElement.parentElement.style.display='none';
        let totals=root.querySelector('.area-totals');if(totals)totals.remove();
        totals=node('div','','area-totals');if(oldTotals)oldTotals.parentElement.parentElement.after(totals);
        const error=node('p','','area-error'); error.setAttribute('role','alert');
        function refresh() {
            const all=[state.main,state.ancillary,...state.land,...state.common];
            let bad=all.some(invalid) || state.land.some(r=>r.base!==undefined && (!Number.isFinite(number(r.base)) || number(r.base)<0));
            const total=rows=>rows.reduce((sum,r)=>sum+(invalid(r)?0:(r.area===''&&!r.pendingLegacy?0:measure(r))),0);
            const parking=total(state.common.filter(r=>r.kind==='parking'));
            const common=total(state.common.filter(r=>r.kind!=='parking'));
            if(state.parkingIncluded && parking>common) bad=true;
            editor.dataset.invalid=bad?'1':'0';
            error.textContent=bad?'請檢查面積與持分：面積不得為負數，分子／分母須為正整數且分子不大於分母；已含車位時，車位面積不得大於共有部分。':'';
            const values={mainBldg:total([state.main]),ancBldg:total([state.ancillary]),parkingSz:parking,common:Math.max(0,common-(state.parkingIncluded?parking:0)),landShare:total(state.land),baseLand:state.land.reduce((sum,r)=>sum+(r.mode==='fraction'&&!invalid(r)?ping(r.area,r.unit):ping(r.base||'',r.baseUnit||r.unit)),0)};
            Object.entries(values).forEach(([key,value])=>{field(root,key).value=value?String(value):'';});
            const parked=state.common.filter(item=>item.kind==='parking');
            parkingField(root,'parking').value=parked.length?(parked[0].parking||''):'';
            parkingField(root,'parkingNo').value=parked.map(item=>item.parkingNo||'').filter(Boolean).join('、');
            const prices=parked.filter(item=>item.parkingPrice!==undefined&&item.parkingPrice!=='');
            parkingField(root,'parkingPrice').value=prices.length?String(prices.reduce((sum,item)=>sum+(Number(item.parkingPrice)||0),0)):'';
            summary.replaceChildren(...['基地 '+fmt(values.baseLand)+' 坪','土地持分 '+fmt(values.landShare)+' 坪','公設（不含車位） '+fmt(values.common)+' 坪'].map(text=>node('span',text)));
            outputs.forEach(({el,item})=>{
                const gross=item.mode==='fraction'&&item.area!==''&&Number.isFinite(number(item.area))&&number(item.area)>=0?'總面積 '+fmt(ping(item.area,item.unit)/RATE)+' m² ≈ '+fmt(ping(item.area,item.unit))+' 坪　｜　':'';
                const result=item.pendingLegacy?'原持分面積 '+fmt(item.legacyPing)+' 坪（暫用舊值，請依謄本補總面積與持分）':invalid(item)?'請填完整面積與持分':item.area===''?'—':(item.mode==='fraction'?'持分面積 ':'')+fmt(measure(item)/RATE)+' m² ≈ '+fmt(measure(item))+' 坪';
                el.textContent=item.pendingLegacy&&state.common.includes(item)?gross.replace(/　｜　$/,''):gross+result;
                el.hidden=!el.textContent;
            });
            const building=values.mainBldg+values.ancBldg+values.common;
            const equation=node('div','','area-total-equation');
            equation.append(node('span','建坪 '+fmt(building)),node('b','＋'),node('span','車坪 '+fmt(parking)),node('b','＝'),node('strong','總坪 '+fmt(building+parking)));
            totals.replaceChildren(summary,equation,node('div','公設比 '+(building?(values.common/building*100).toFixed(1):'0')+'%','area-total-ratio'));
            if(root.id==='sellerFixedProperty') calcSellerSz(); else calcSpSellerSz(field(root,'mainBldg'));
        }
        function areaControls(item, label) {
            const wrap=node('div','','area-value');
            const areaInput=input(item.area,label,v=>{const sum=areaSum(v);item.area=Number.isFinite(sum)?String(sum):v;item.pendingLegacy=false;refresh();},false);
            areaInput.inputMode='text';areaInput.title='可輸入加法，例如 123+11；按 Enter 或離開欄位自動加總';
            const commitSum=()=>{const sum=areaSum(areaInput.value);if(Number.isFinite(sum)){item.area=String(sum);areaInput.value=item.area;refresh();}};
            areaInput.onblur=commitSum;
            areaInput.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();commitSum();}};
            wrap.append(areaInput,select(item.unit,{sqm:'m²',ping:'坪'},v=>{
                if(item.area!=='' && Number.isFinite(number(item.area))) item.area=(v==='ping'?number(item.area)*RATE:number(item.area)/RATE).toFixed(2);
                item.unit=v; render();
            },label+'單位'));
            return wrap;
        }
        function output(item,parent) { const el=node('div','','area-result'); outputs.push({el,item});parent.append(el); }
        function render() {
            editor.querySelectorAll('.area-content').forEach(el=>el.remove()); outputs.length=0;
            const body=node('div','','area-content'); const simple=node('div','','area-simple');
            [['主建物',state.main],['附屬建物',state.ancillary]].forEach(([title,item])=>{const box=node('div');box.append(labeled(title,areaControls(item,title)));output(item,box);simple.append(box);});
            const check=node('input');check.type='checkbox';check.checked=state.parkingIncluded;check.onchange=()=>{state.parkingIncluded=check.checked;refresh();};
            const checkLabel=node('label','','area-check');checkLabel.append(check,document.createTextNode('舊公設面積已含車位，合計時扣除車位（公設已分開填寫時請取消）'));
            ['land','common'].forEach(kind=>{
                const title=kind==='land'?'土地':'公設／車位'; const section=node('div','','area-section');section.append(node('strong',title));
                if(kind==='common'&&state.parkingIncluded)section.append(checkLabel);
                state[kind].forEach((item,index)=>{
                    const card=node('div','','area-row'); const head=node('div','','area-row-head');
                    if(kind==='common') {head.classList.add('area-common-head');head.append(select(item.kind||'common',{common:'公設',parking:'車位'},v=>{item.kind=v;render();},'面積歸類'));}
                    const idInput=input(item.id,(kind==='land'?'地號':'建號')+'（選填）',v=>{item.id=v;refresh();},false);idInput.placeholder=(kind==='land'?'地號':'建號')+'（選填）';
                    head.append(idInput,node('span','總面積 × 持分','area-method'),button('移除',()=>{state[kind].splice(index,1);render();}));card.append(head);
                    const fraction=node('div','','area-measure-line');
                    fraction.append(labeled('總面積',areaControls(item,title+'面積')),labeled('分子',input(item.numerator,'持分分子',v=>{item.numerator=v;item.pendingLegacy=false;refresh();})),node('span','／','area-slash'),labeled('分母',input(item.denominator,'持分分母',v=>{item.denominator=v;item.pendingLegacy=false;refresh();})),button('全部持有',()=>{item.numerator='1';item.denominator='1';item.pendingLegacy=false;render();}));card.append(fraction);
                    if(kind==='common'&&item.kind==='parking') {
                        const info=node('div','','area-parking-info');
                        const options={'':'選擇','坡道平面':'坡道平面','坡道機械':'坡道機械','升降平面':'升降平面','升降機械':'升降機械','塔式車位':'塔式車位','其他車位':'其他車位'};
                        info.append(labeled('車位型態',select(item.parking||'',options,v=>{item.parking=v;refresh();},'車位型態')),labeled('車位價格（萬）',input(item.parkingPrice||'','車位價格',v=>{item.parkingPrice=v;refresh();})),labeled('車位編號',input(item.parkingNo||'','車位編號',v=>{item.parkingNo=v;refresh();},false)));card.append(info);
                    }
                    output(item,card);section.append(card);
                });
                section.append(button('＋新增'+(kind==='land'?'土地':'公設／車位'),()=>{state[kind].push(Object.assign(row(),{mode:'fraction',kind:'common'}));render();}));
                body.append(section);
                if(kind==='land'){const buildingSection=node('div','','area-section');buildingSection.append(node('strong','建物'),simple);body.append(buildingSection);}
            });
            editor.append(body,totals,error);refresh();
        }
        render();
    }
    window.mountAreaEditor=mount;
    window.formatAreaPing=value=>Number.isFinite(Number(value))?fmt(value):value;
    window.areaEditorData=root=>root&&root._areaState?clone(root._areaState):null;
    window.validateAreaEditors=function(){const bad=document.querySelector('.area-editor[data-invalid="1"]');if(bad){bad.scrollIntoView({block:'center'});showToast('請先修正面積或持分欄位','warn');return false;}return true;};
    const originalReset=resetForm;
    resetForm=function(){const result=originalReset.apply(this,arguments);mount(document.getElementById('sellerFixedProperty'));return result;};
    mount(document.getElementById('sellerFixedProperty'));
})();
