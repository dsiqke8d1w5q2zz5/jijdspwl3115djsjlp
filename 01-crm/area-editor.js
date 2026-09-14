/* Area source values stay separate from the legacy ping totals used by CRM. */
(function () {
    'use strict';
    const RATE = 0.3025;
    const fields = {baseLand:'BaseLand',landShare:'LandShare',mainBldg:'MainBldg',ancBldg:'AncBldg',common:'Common',parkingSz:'ParkingSz'};
    const clone = value => JSON.parse(JSON.stringify(value));
    const fmt = n => Number(n).toLocaleString('zh-TW', {maximumFractionDigits:2});
    const number = value => value === '' ? 0 : Number(value);
    const ping = (value, unit) => number(value) * (unit === 'sqm' ? RATE : 1);
    function field(root, key) { return root.querySelector(root.id === 'sellerFixedProperty' ? '#f-s'+fields[key] : '[data-f="'+key+'"]'); }
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
    function measure(item) { return ping(item.area,item.unit) * (item.mode==='fraction' ? number(item.numerator)/number(item.denominator) : 1); }
    function invalid(item) {
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
        // Refresh defaults for previously saved empty fields; preserve entered values and units.
        const empty=value=>value===undefined || value===null || String(value).trim()==='';
        [state.main,state.ancillary,state.parking,...state.land,...state.common].forEach(item=>{
            if(empty(item.area)) item.unit='sqm';
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
        editor.append(node('strong','面積與持分'),node('p','依謄本輸入平方公尺，自動換算坪。已有分算結果可選「直接填持分後面積」。','area-hint'));
        const outputs=[];
        const summary=node('p','','area-result'); summary.setAttribute('aria-live','polite');
        const error=node('p','','area-error'); error.setAttribute('role','alert');
        function refresh() {
            const all=[state.main,state.ancillary,state.parking,...state.land,...state.common];
            let bad=all.some(invalid) || state.land.some(r=>r.base!==undefined && (!Number.isFinite(number(r.base)) || number(r.base)<0));
            const total=rows=>rows.reduce((sum,r)=>sum+(invalid(r)?0:(r.area===''?0:measure(r))),0);
            const parking=invalid(state.parking)?0:measure(state.parking);
            const common=total(state.common);
            if(state.parkingIncluded && parking>common) bad=true;
            editor.dataset.invalid=bad?'1':'0';
            error.textContent=bad?'請檢查面積與持分：面積不得為負數，分子／分母須為正整數且分子不大於分母；已含車位時，車位面積不得大於共有部分。':'';
            const values={mainBldg:total([state.main]),ancBldg:total([state.ancillary]),parkingSz:parking,common:Math.max(0,common-(state.parkingIncluded?parking:0)),landShare:total(state.land),baseLand:state.land.reduce((sum,r)=>sum+(r.mode==='fraction'&&!invalid(r)?ping(r.area,r.unit):ping(r.base||'',r.baseUnit||r.unit)),0)};
            Object.entries(values).forEach(([key,value])=>{field(root,key).value=value?String(value):'';});
            summary.textContent='基地總面積 '+fmt(values.baseLand)+' 坪　｜　土地持分面積 '+fmt(values.landShare)+' 坪　｜　共有部分（不含車位） '+fmt(values.common)+' 坪';
            outputs.forEach(({el,item})=>{el.textContent=invalid(item)?'請填完整面積與持分':item.area===''?'—':fmt(measure(item)/RATE)+' m² ≈ '+fmt(measure(item))+' 坪';});
            if(root.id==='sellerFixedProperty') calcSellerSz(); else calcSpSellerSz(field(root,'mainBldg'));
        }
        function areaControls(item, label) {
            const wrap=node('div','','area-value');
            wrap.append(input(item.area,label,v=>{item.area=v;refresh();}),select(item.unit,{sqm:'m²',ping:'坪'},v=>{
                if(item.area!=='' && Number.isFinite(number(item.area))) item.area=String(v==='ping'?number(item.area)*RATE:number(item.area)/RATE);
                item.unit=v; render();
            },label+'單位'));
            return wrap;
        }
        function output(item,parent) { const el=node('div','','area-result'); outputs.push({el,item});parent.append(el); }
        function render() {
            editor.querySelectorAll('.area-content').forEach(el=>el.remove()); outputs.length=0;
            const body=node('div','','area-content'); const simple=node('div','','area-simple');
            [['主建物',state.main],['附屬建物',state.ancillary],['車位面積',state.parking]].forEach(([title,item])=>{const box=node('div');box.append(labeled(title,areaControls(item,title)));output(item,box);simple.append(box);});
            body.append(simple);
            const check=node('input');check.type='checkbox';check.checked=state.parkingIncluded;check.onchange=()=>{state.parkingIncluded=check.checked;refresh();};
            const checkLabel=node('label','','area-check');checkLabel.append(check,document.createTextNode('車位面積已包含在下方共有部分內（避免重複加總）'));body.append(checkLabel);
            ['land','common'].forEach(kind=>{
                const title=kind==='land'?'土地':'公設（共有部分）'; const section=node('div','','area-section');section.append(node('strong',title));
                state[kind].forEach((item,index)=>{
                    const card=node('div','','area-row'); const head=node('div','','area-row-head');
                    head.append(input(item.id,(kind==='land'?'地號':'建號')+'（選填）',v=>{item.id=v;refresh();},false));head.firstChild.placeholder=(kind==='land'?'地號':'建號')+'（選填）';
                    head.append(select(item.mode,{direct:'直接填持分後面積',fraction:'總面積 × 持分'},v=>{item.mode=v;render();},title+'輸入方式'),button('移除',()=>{state[kind].splice(index,1);render();}));card.append(head);
                    card.append(labeled(item.mode==='fraction'?'整筆總面積':'持分後面積',areaControls(item,title+'面積')));
                    if(item.mode==='fraction') {
                        const fraction=node('div','','area-fraction');
                        fraction.append(labeled('持分分子',input(item.numerator,'持分分子',v=>{item.numerator=v;refresh();})),node('span','／'),labeled('持分分母',input(item.denominator,'持分分母',v=>{item.denominator=v;refresh();})),button('全部持有',()=>{item.numerator='1';item.denominator='1';render();}));card.append(fraction);
                    } else if(kind==='land') {
                        const base={area:item.base||'',unit:item.baseUnit||'sqm'};
                        const baseWrap=node('div','','area-value');baseWrap.append(input(base.area,'基地總面積（選填）',v=>{item.base=v;refresh();}),select(base.unit,{sqm:'m²',ping:'坪'},v=>{if(item.base) item.base=String(v==='ping'?number(item.base)*RATE:number(item.base)/RATE);item.baseUnit=v;render();},'基地總面積單位'));
                        card.append(labeled('基地總面積（選填，未乘持分）',baseWrap));
                    }
                    output(item,card);section.append(card);
                });
                section.append(button('＋新增'+(kind==='land'?'土地':'公設'),()=>{state[kind].push(Object.assign(row(),{mode:'fraction'}));render();}));
                const sum=node('div','','area-hint');sum.textContent=kind==='common'?'下方共有部分與公設比以不含車位面積計算，登記總坪數含車位。':'多筆土地會分別計算持分面積後加總。';section.append(sum);body.append(section);
            });
            editor.append(body,summary,error);refresh();
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
