// Synthetic records only: no customer documents or identifiers are published.
const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../transcript-parser.js');
const building=(extra='',own='1分之1')=>`建物登記第二類謄本（所有權個人全部）
測試區測試段 00001-000建號
建物標示部
建物門牌：測試路一號
建物坐落地號：測試段 0001-0000
總面積：***100.00平方公尺
層次面積：***60.00平方公尺
二層 ***40.00平方公尺
附屬建物用途：陽台 面積：***10.00平方公尺
雨遮 ***2.00平方公尺
${extra}
建物所有權部
所有權人：測＊＊
權利範圍：***${own}***
建物他項權利部
權利範圍：2分之1`;
const land=(n='5',id='0001',area='1000.00')=>`土地登記第二類謄本（所有權個人全部）
測試區測試段 ${id}-0000地號
土地標示部 面 積：***${area}平方公尺
土地所有權部 所有權人：測＊＊
權利範圍：***10000分之${n}*******40
土地他項權利部 權利範圍：1分之1`;
const common=(share='6185',parking='2742')=>`共有部分：測試段00002-000建號*70,059.75平方公尺
權利範圍：**10000000分之${share}******
（含停車位編號001 ,權利範圍：**10000000分之${parking}******）
其他登記事項：停車位共計：1000位`;
const parse=text=>P.parse([{file:'sample',page:1,text}]);
test('uses main total once and sums all ancillary categories',()=>{
 const r=parse(building()).rows;assert.equal(r.find(r=>r.category==='main').area,'100');assert.equal(r.find(r=>r.category==='ancillary').area,'12');
});
test('keeps ten-million denominator and splits embedded parking without doubling',()=>{
 const r=parse(building(common())).rows.find(r=>r.category==='common');assert.equal(r.denominator,'10000000');assert.equal(r.parkingDenominator,'10000000');assert.equal(r.kind,'commonParking');
 const n=P.calculate(r);assert.equal(n.parking.toFixed(2),'5.81');assert.equal((n.area-n.parking).toFixed(2),'7.30');
});
test('padding stars stop adjacent stamp digits joining a numerator',()=>{assert.equal(parse(land('227')).rows[0].numerator,'227');});
test('does not use mortgage ownership share',()=>{assert.equal(parse(land()).rows[0].denominator,'10000');});
test('deduplicates identical records across PDFs',()=>{const r=P.parse([{file:'a',page:1,text:land()},{file:'b',page:1,text:land()}]);assert.equal(r.rows.length,1);assert.equal(r.rows[0].sources.length,2);});
test('conflicting duplicate shares require review',()=>{const r=P.parse([{file:'a',page:1,text:land('5')},{file:'b',page:1,text:land('6')}]);assert.equal(r.rows.length,2);assert(r.rows.every(r=>r.errors.length));});
test('separate parcels across three files are retained',()=>{const r=P.parse(['0001','0002','0003'].map((id,i)=>({file:String(i),page:1,text:land('5',id)})));assert.equal(r.rows.length,3);});
test('parking-purpose prose alone is not a parking entitlement',()=>{const r=parse(building('共有部分：測試段00002-000建號1000平方公尺\n權利範圍：100分之1\n其他登記事項：自行車停車區，停車位共計100位')).rows.find(r=>r.category==='common');assert.equal(r.kind,'common');assert(r.notes.length);});
test('aggregates individual parking numbers and classifies full parking allocation',()=>{
 const text='共有部分：測試段00002-000建號1000平方公尺\n權利範圍：74分之3\n（含停車位編號B1-01,權利範圍：74分之1）\n（B1-02,權利範圍：74分之1）\n（B2-03,權利範圍：74分之1）\n其他登記事項：空白';
 const r=parse(building(text)).rows.find(r=>r.category==='common');assert.equal(r.kind,'parking');assert.equal(r.parkingNo,'B1-01、B1-02、B2-03');assert.equal(r.parkingNumerator,'3');assert.equal(r.parkingDenominator,'74');
});
test('different parking denominators are added rationally',()=>{assert.deepEqual(P.addShares([{numerator:'1',denominator:'3'},{numerator:'1',denominator:'6'}]),{numerator:'1',denominator:'2'});});
test('parking larger than whole allocation requires correction',()=>{assert(parse(building(common('100','200'))).rows.find(r=>r.category==='common').errors.length);});
test('missing ownership and fractional building ownership are blocked',()=>{assert(parse(building('', '2分之1')).rows.every(r=>r.blocked));assert(parse(land().replace('所有權人：測＊＊','')).rows[0].blocked);});
test('scanned or unrelated PDF does not fabricate fields',()=>{const r=parse('');assert.equal(r.rows.length,0);assert(r.issues.length);});
test('fullwidth numerals and wrapped denominator normalize',()=>{const r=parse(land().replace('10000分之5','１００\n００分之５'));assert.equal(r.rows[0].denominator,'10000');assert.equal(r.rows[0].numerator,'5');});
test('reconstructs horizontal PDF text and drops diagonal watermark',()=>{
 const items=[{str:'主建物',transform:[10,0,0,10,20,100]},{str:'印章',transform:[7,7,0,10,35,100]},{str:'100',transform:[10,0,0,10,60,100]},{str:'下一行',transform:[10,0,0,10,20,80]}];assert.equal(P.textFromItems(items),'主建物100\n下一行');
});
test('rejects invalid edited amounts and parking shares',()=>{const r={area:'1.234',mode:'direct'};assert.equal(P.calculate(r),null);assert.equal(P.calculate({area:'100',mode:'fraction',numerator:'1',denominator:'0'}),null);});
test('building ownership on following page is associated with its building',()=>{const text=building();const cut=text.indexOf('建物所有權部');const r=P.parse([{file:'a',page:1,text:text.slice(0,cut)},{file:'a',page:2,text:'建物登記第二類謄本\n測試區測試段00001-000建號\n'+text.slice(cut)}]);assert(r.rows.length);assert(r.rows.every(r=>!r.blocked));});
test('extracts only explicit building metadata for review',()=>{
 const text=building().replace('總面積：','主要用途：住家用\n主要建材：鋼筋混凝土造\n層數：005層\n總面積：').replace('層次面積：','層次：五層 層次面積：').replace('附屬建物用途：','建築完成日期：民國070年09月07日\n附屬建物用途：');
 assert.deepEqual(parse(text).buildings[0].details,{usage:'住家用',structure:'鋼筋混凝土造',builtDate:'0700907',floor:'五層',levels:'005'});
});
