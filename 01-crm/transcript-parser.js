/* Local transcript extraction. No document content leaves the browser. */
(function (host) {
    'use strict';
    const RATE = 0.3025;
    // Keep redaction/padding stars as token boundaries; removing them can join a share to a nearby stamp number.
    const normalize = text => String(text).normalize('NFKC').replace(/\r/g,'').replace(/[：]/g,':');
    const compact = text => normalize(text).replace(/\s/g,'');
    const amount = text => Number(text.replace(/,/g,''));
    const areaPattern = /([\d,]+(?:\.\d+)?)平方公尺/g;
    function fraction(text) {
        const m=compact(text).match(/(\d+)分之(\d+)/);
        return m ? {numerator:m[2],denominator:m[1]} : {numerator:'',denominator:''};
    }
    function validShare(n,d) { return Number.isSafeInteger(+n)&&Number.isSafeInteger(+d)&&+n>0&&+d>0&&+n<=+d; }
    function gcd(a,b) { while(b){const next=a%b;a=b;b=next;}return a; }
    function addShares(shares) {
        if(shares.length&&shares.every(s=>validShare(s.numerator,s.denominator)&&s.denominator===shares[0].denominator)) {
            const n=shares.reduce((sum,s)=>sum+BigInt(s.numerator),0n);
            return n<=BigInt(Number.MAX_SAFE_INTEGER)?{numerator:String(n),denominator:shares[0].denominator}:null;
        }
        let n=0n,d=1n;
        for(const s of shares) { if(!validShare(s.numerator,s.denominator)) return null;const sn=BigInt(s.numerator),sd=BigInt(s.denominator);n=n*sd+sn*d;d*=sd;const g=gcd(n,d);n/=g;d/=g; }
        if(n>BigInt(Number.MAX_SAFE_INTEGER)||d>BigInt(Number.MAX_SAFE_INTEGER)) return null;
        return {numerator:String(n),denominator:String(d)};
    }
    // Horizontal text only: diagonal office watermarks are not part of the record.
    function textFromItems(items) {
        const lines=[];
        for(const item of items) {
            if(!item.str || !item.transform) continue;
            const [a,b,,,x,y]=item.transform;
            if(Math.abs(b)>Math.abs(a)*0.15) continue;
            let line=lines.find(l=>Math.abs(l.y-y)<2);
            if(!line){line={y,items:[]};lines.push(line);}line.items.push({x,text:item.str});
        }
        return lines.sort((a,b)=>b.y-a.y).map(l=>l.items.sort((a,b)=>a.x-b.x).map(i=>i.text).join('')).join('\n');
    }
    function parse(pages) {
        const docs=[],issues=[];let current=null;
        for(const page of pages) {
            const text=normalize(page.text), top=compact(text.slice(0,600));
            if(compact(text).length<30) {
                issues.push(page.file+' 第 '+page.page+' 頁：沒有足夠的文字，可能是掃描頁；請核對此頁是否有面積或持分。');
                if(current&&current.file===page.file)current.incomplete=true;
                continue;
            }
            const header=top.match(/(土地|建物)登記第[^謄]{1,12}謄本/);
            const id=text.slice(0,600).replace(/[ \t]/g,'').match(/([\u3400-\u9fff]+(?:段|小段))([0-9]+-[0-9]+)(地號|建號)/);
            if(header&&id) {
                const key=header[1]+':'+id[1]+id[2];
                if(!current || current.key!==key || current.file!==page.file || /(?:土地|建物)標示部/.test(text)) {
                    current={key,type:header[1],id:id[1]+id[2],file:page.file,pages:[],text:''};docs.push(current);
                }
            } else if(!current || current.file!==page.file) {
                issues.push(page.file+' 第 '+page.page+' 頁：未辨識到謄本標題／地建號，請核對是否為掃描檔或缺頁。');current=null;continue;
            }
            current.pages.push(page.page);current.text+='\n'+text;
        }
        const rows=[],buildings=[],seen=new Map();
        function push(row) {
            row.sources=row.sources.slice();
            const key=row.group+'|'+row.category+'|'+row.id;
            const signature=JSON.stringify([row.area,row.numerator,row.denominator,row.kind,row.parkingNumerator,row.parkingDenominator,row.parkingNo,row.ownerNumerator,row.ownerDenominator]);
            if(seen.has(key)) {
                const prior=seen.get(key);
                if(prior.signature===signature) {prior.row.sources.push(...row.sources);return;}
                row.errors.push('同一地／建號有不同版本或持分，請只選擇正確的一筆。');prior.row.errors.push('同一地／建號有不同版本或持分，請只選擇正確的一筆。');
            }
            seen.set(key,{signature,row});rows.push(row);
        }
        for(const doc of docs) {
            const t=compact(doc.text), mark=t.indexOf(doc.type+'標示部');
            if(mark<0) {issues.push(doc.file+'：'+doc.id+' 缺少標示部，未套用。');continue;}
            const own=t.indexOf(doc.type+'所有權部',mark),other=t.indexOf(doc.type+'他項權利部',mark);
            const description=t.slice(mark,own>=0?own:other>=0?other:undefined);
            const ownership=own>=0?t.slice(own,other>own?other:undefined):'';
            const ownShare=fraction((ownership.match(/權利範圍:([^權]{0,100})/)||[])[1]||'');
            const ownerCount=(ownership.match(/所有權人:/g)||[]).length;
            const errors=[];
            if(doc.incomplete)errors.push('此謄本包含無法辨識的頁面，請改用完整電子謄本。');
            if(ownerCount!==1 || !validShare(ownShare.numerator,ownShare.denominator)) errors.push('所有權資料不完整或有多位所有權人，請核對持分。');
            const sources=[{file:doc.file,page:doc.pages[0],pages:doc.pages,id:doc.id}];
            const base={unit:'sqm',mode:'fraction',sources,errors,notes:[],blocked:errors.length>0};
            if(doc.type==='土地') {
                const match=description.match(/面積:\**([\d,.]+)平方公尺/);
                push({...base,errors:[...errors,...(!match?['未辨識到土地總面積。']:[])],id:doc.id,category:'land',group:'land',area:match?String(amount(match[1])):'',...ownShare});
                continue;
            }
            const group=doc.id;
            const addr=(description.match(/建物門牌:(.*?)建物坐落/)||[])[1]||'';
            const date=description.match(/建築完成日期:民國(\d+)年(\d+)月(\d+)日/);
            const details={
                usage:description.match(/主要用途:(.*?)主要建材:/)?.[1]||'',
                structure:description.match(/主要建材:(.*?)層數:/)?.[1]||'',
                builtDate:date?date[1].padStart(3,'0')+date[2].padStart(2,'0')+date[3].padStart(2,'0'):'',
                floor:description.match(/層次:(.*?)層次面積:/)?.[1]||'',
                levels:description.match(/層數:(\d+)層/)?.[1]||''
            };
            if(!buildings.some(b=>b.id===group))buildings.push({id:group,address:addr,details});
            // Ownership applies to both the building and its subordinate common entitlements.
            base.blocked=errors.length>0;
            const main=description.match(/總面積:\**([\d,.]+)平方公尺/);
            push({...base,errors:[...errors,...(!main?['未辨識到主建物總面積。']:[])],group,category:'main',id:doc.id,area:main?String(amount(main[1])):'',mode:'fraction',...ownShare});
            const anc=(description.match(/附屬建物用途:(.*?)(?:共有部分:|其他登記事項:|$)/)||[])[1];
            if(anc!==undefined) {
                const amounts=Array.from(anc.matchAll(areaPattern),m=>amount(m[1]));
                const total=amounts.reduce((a,b)=>a+b,0);
                push({...base,errors:[...errors,...(!amounts.length&&!/空白|無/.test(anc)?['附屬建物未辨識完整，請核對。']:[])],group,category:'ancillary',id:doc.id,area:String(Number(total.toFixed(2))),mode:'fraction',...ownShare,notes:amounts.length>1?['附屬建物各項 m²：'+amounts.join(' + ')]:[]});
            } else issues.push(doc.id+'：未找到附屬建物欄，原欄位將保留。');
            const commonMatches=Array.from(description.matchAll(/共有部分:([^:]*?)建號\**([\d,.]+)平方公尺/g));
            const incompleteCommon=(description.match(/共有部分:/g)||[]).length!==commonMatches.length;
            if(incompleteCommon)issues.push(doc.id+'：部分共有部分的建號或面積未辨識完整，公設／車位請手動核對。');
            for(let i=0;i<commonMatches.length;i++) {
                const m=commonMatches[i],body=description.slice(m.index+m[0].length,commonMatches[i+1]?.index);
                const share=fraction((body.match(/權利範圍:([^其]{0,100})/)||[])[1]||'');
                const notes=[],rowErrors=[...errors],parking=[];
                const parkingText=body.match(/\(含停車位編號(.*?)(?=其他登記事項:|$)/)?.[1];
                if(parkingText!==undefined) {
                    for(const pm of parkingText.matchAll(/([^()]*?)[,，]?權利範圍:\**(\d+)分之(\d+)[^)]*\)/g)) {
                        parking.push({number:pm[1].replace(/^[,，]+|[,，]+$/g,'').trim(),numerator:pm[3],denominator:pm[2]});
                    }
                    if(!parking.length)rowErrors.push('有內含車位註記，但車位編號／持分未辨識完整。');
                    if(parking.length!==(parkingText.match(/權利範圍:/g)||[]).length)rowErrors.push('部分車位持分未辨識到，請對照原文補齊。');
                } else if(/停車/.test(body)) notes.push('用途含停車文字，未找到該戶車位持分；請核對分類。');
                let kind='common',parkingShare=null;
                if(parking.length) {
                    parkingShare=addShares(parking);
                    if(!parkingShare || !validShare(share.numerator,share.denominator) || +parkingShare.numerator/+parkingShare.denominator>+share.numerator/+share.denominator+1e-12)rowErrors.push('車位持分無法核對或大於整體持分。');
                    else kind=Math.abs(+parkingShare.numerator/+parkingShare.denominator-+share.numerator/+share.denominator)<1e-12?'parking':'commonParking';
                }
                if(!validShare(share.numerator,share.denominator))rowErrors.push('未辨識到有效的共有部分持分。');
                const localId=m[1].match(/([\u3400-\u9fff]+(?:段|小段)\d+-\d+)$/)?.[1]||m[1];
                push({...base,blocked:base.blocked||incompleteCommon,errors:rowErrors,notes,group,category:'common',id:localId,area:String(amount(m[2])),...share,ownerNumerator:ownShare.numerator,ownerDenominator:ownShare.denominator,kind,parkingNo:parking.map(p=>p.number).join('、'),parkingNumerator:parkingShare?.numerator||'',parkingDenominator:parkingShare?.denominator||'',parkingEntries:parking});
            }
            if(!commonMatches.length) issues.push(doc.id+'：未找到共有部分，原公設／車位欄位將保留。');
        }
        return {rows,buildings,issues:[...new Set(issues)]};
    }
    function effectiveRow(row) {
        if(row.ownerNumerator===undefined)return row;
        function multiply(n,d){
            if(!validShare(n,d)||!validShare(row.ownerNumerator,row.ownerDenominator))return null;
            let a=BigInt(n)*BigInt(row.ownerNumerator),b=BigInt(d)*BigInt(row.ownerDenominator);
            const g=gcd(a,b);a/=g;b/=g;
            return a<=BigInt(Number.MAX_SAFE_INTEGER)&&b<=BigInt(Number.MAX_SAFE_INTEGER)?{numerator:String(a),denominator:String(b)}:null;
        }
        const share=multiply(row.numerator,row.denominator);
        if(!share)return null;
        const result={...row,...share};delete result.ownerNumerator;delete result.ownerDenominator;
        if(row.kind==='commonParking'){
            const parking=multiply(row.parkingNumerator,row.parkingDenominator);if(!parking)return null;
            result.parkingNumerator=parking.numerator;result.parkingDenominator=parking.denominator;
        }
        return result;
    }
    function calculate(row) {
        row=effectiveRow(row);if(!row)return null;
        const gross=+row.area*RATE;
        if(!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(String(row.area))||!Number.isFinite(gross)||gross<0) return null;
        if(row.mode==='direct')return {area:gross,parking:0};
        if(!validShare(row.numerator,row.denominator))return null;
        const area=gross*+row.numerator/+row.denominator;
        let parking=row.kind==='parking'?area:0;
        if(row.kind==='commonParking'){
            if(!validShare(row.parkingNumerator,row.parkingDenominator))return null;
            parking=gross*+row.parkingNumerator/+row.parkingDenominator;
            if(parking>area+1e-10)return null;
        }
        return {area,parking};
    }
    function sumBuildingRows(rows){
        if(!rows.length||rows.some(r=>!calculate(r)))throw Error('建物面積不完整');
        return {id:rows.map(r=>r.id).join('、'),area:rows.reduce((sum,r)=>sum+calculate(r).area/RATE,0).toFixed(2),unit:'sqm',mode:'direct',numerator:'',denominator:'',components:rows.map(r=>({id:r.id,area:(calculate(r).area/RATE).toFixed(2),unit:'sqm'}))};
    }
    const api={parse,textFromItems,calculate,effectiveRow,addShares,sumBuildingRows};
    if(typeof module==='object'&&module.exports)module.exports=api;
    else host.TranscriptParser=api;
})(typeof window==='object'?window:globalThis);
