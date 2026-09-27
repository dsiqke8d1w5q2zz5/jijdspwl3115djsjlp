/* Per-photo rectangular redactions, flattened into exported pixels. */
(function(){
 'use strict';
 const labels={mosaic:'馬賽克',blur:'模糊',solid:'色塊'},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 function blur(c,r){
  const ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height),w=c.width,h=c.height;
  let src=data.data,dst=new Uint8ClampedArray(src.length);
  for(let pass=0;pass<4;pass++){
   const horizontal=pass%2===0,n=horizontal?w:h,lines=horizontal?h:w;
   for(let line=0;line<lines;line++)for(let channel=0;channel<4;channel++){
    const at=i=>((horizontal?line*w+clamp(i,0,n-1):clamp(i,0,n-1)*w+line)*4+channel);let sum=0;
    for(let k=-r;k<=r;k++)sum+=src[at(k)];
    for(let i=0;i<n;i++){dst[at(i)]=sum/(r*2+1);sum+=src[at(i+r+1)]-src[at(i-r)];}
   }const tmp=src;src=dst;dst=tmp;
  }
  data.data.set(src);ctx.putImageData(data,0,0);
 }
 function paint(target,regions){
  const ctx=target.getContext('2d'),w=target.width,h=target.height;
  for(const region of regions){
   const x=Math.floor(region.x*w),y=Math.floor(region.y*h),rw=Math.min(w-x,Math.ceil(region.w*w)),rh=Math.min(h-y,Math.ceil(region.h*h));if(rw<1||rh<1)continue;
   ctx.save();
   if(region.mode==='solid'){ctx.fillStyle=region.color;ctx.fillRect(x,y,rw,rh);}
   else{
    const strength=clamp(Number(region.strength)||50,1,100),block=(4+strength*.55)*w/1000;
    const scale=region.mode==='mosaic'?1/block:Math.min(1,400/Math.max(rw,rh));
    const sample=canvas(Math.max(1,Math.round(rw*scale)),Math.max(1,Math.round(rh*scale))),sc=sample.getContext('2d');sc.drawImage(target,x,y,rw,rh,0,0,sample.width,sample.height);
    if(region.mode==='blur')blur(sample,Math.max(1,Math.round((2+strength*.25)*w/1000*scale)));
    ctx.imageSmoothingEnabled=region.mode==='blur';ctx.drawImage(sample,x,y,rw,rh);
   }ctx.restore();
  }
 }
 function mount(api){
  const $=id=>document.getElementById(id),all=new Map();let selected='',gesture=null,newRegion=true;
  const panel=document.createElement('section');panel.id='icRedactSection';panel.className='ic-section';panel.innerHTML=`<h3>局部遮蔽</h3><p class="ic-note">在照片上拖曳框選範圍，可遮住車牌、人臉、門牌或私人照片。遮蔽只作用於這張照片。</p>
   <button type="button" id="icRedactNew" class="ic-primary">＋ 框選新範圍</button>
   <label class="it-lb" for="icRedactRegions">已建立的遮蔽區域</label><select id="icRedactRegions" class="it-in"></select>
   <label class="it-lb" for="icRedactMode">遮蔽方式</label><select id="icRedactMode" class="it-in"><option value="mosaic">馬賽克</option><option value="blur">模糊</option><option value="solid">色塊（完整遮住）</option></select>
   <label class="it-lb" id="icRedactStrengthLabel" for="icRedactStrength">強度 <span id="icRedactStrengthValue">50</span><input id="icRedactStrength" type="range" min="1" max="100" value="50"></label>
   <label class="it-lb" id="icRedactColorLabel" for="icRedactColor" hidden>色塊顏色 <input id="icRedactColor" type="color" value="#000000"></label>
   <div id="icRedactSize" class="ic-redact-size"></div><div class="ic-actions ic-layout-actions"><button type="button" id="icRedactDelete" disabled>刪除這個區域</button><button type="button" id="icRedactClear" disabled>清除這張遮蔽</button></div>
   <p id="icRedactStatus" class="ic-note" role="status">選擇方式後，在照片上框選。</p><p class="ic-note">可拖曳已選區域移動，或調整位置與大小。需要完整遮住資料時請選色塊。請先完成裁切；變更裁切後需重新確認遮蔽範圍。遮蔽不存入共用版面。</p>`;
  document.querySelector('.ic-controls').append(panel);
  const current=()=>all.get(api.id())||[],active=()=>current().find(r=>r.id===selected);
  const isOpen=()=>$('icTab_redact')?.getAttribute('aria-selected')==='true';
  function defaults(){return {mode:$('icRedactMode').value,strength:Number($('icRedactStrength').value),color:$('icRedactColor').value};}
  function list(){const select=$('icRedactRegions');select.replaceChildren(new Option(current().length?'選擇要調整的區域':'尚未建立遮蔽',''));current().forEach((r,i)=>select.add(new Option('區域 '+(i+1)+' · '+labels[r.mode],r.id)));select.value=selected;}
  function sync(){
   if(!active())selected='';list();const r=active();if(r){$('icRedactMode').value=r.mode;$('icRedactStrength').value=r.strength;$('icRedactColor').value=r.color;}$('icRedactDelete').disabled=!r||api.busy();$('icRedactClear').disabled=!current().length||api.busy();$('icRedactNew').disabled=!api.id()||api.busy();
   $('icRedactNew').setAttribute('aria-pressed',String(newRegion));$('icRedactSize').hidden=!r;
   $('icRedactColorLabel').hidden=$('icRedactMode').value!=='solid';$('icRedactStrengthLabel').hidden=$('icRedactMode').value==='solid';$('icRedactStrengthValue').textContent=$('icRedactStrength').value;
   if(r)for(const k of ['x','y','w','h'])$('icRedact_'+k).value=Math.round(r[k]*1000)/10;
   const tab=$('icTab_redact');if(tab)tab.dataset.enabled=current().length?'true':'false';
   $('icCanvas').classList.toggle('ic-redact-active',isOpen());
  }
  function choose(id){selected=id;newRegion=false;const r=active();if(r){$('icRedactMode').value=r.mode;$('icRedactStrength').value=r.strength;$('icRedactColor').value=r.color;}$('icRedactStatus').textContent=r?'可拖曳這個區域，或修改下方設定。':'按「框選新範圍」新增遮蔽。';sync();}
  for(const [key,label] of [['x','左邊 %'],['y','上方 %'],['w','寬度 %'],['h','高度 %']]){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.type='number';input.id='icRedact_'+key;input.min=key==='w'||key==='h'?.5:0;input.max=100;input.step=.1;l.append(input);$('icRedactSize').append(l);input.onchange=()=>{const r=active();if(!r||!Number.isFinite(input.valueAsNumber))return;api.flush();r[key]=clamp(input.valueAsNumber/100,key==='w'||key==='h'?.005:0,1);r.w=Math.min(r.w,1-r.x);r.h=Math.min(r.h,1-r.y);if(r.w<.005){r.w=.005;r.x=.995;}if(r.h<.005){r.h=.005;r.y=.995;}api.changed();};}
  $('icRedactNew').onclick=()=>{selected='';newRegion=true;$('icRedactStatus').textContent='請在照片上拖曳框選新範圍。';sync();};$('icRedactRegions').onchange=()=>choose($('icRedactRegions').value);
  for(const id of ['icRedactMode','icRedactStrength','icRedactColor'])$(id).oninput=()=>{const r=active();if(r){Object.assign(r,defaults());api.changed();}sync();};
  $('icRedactDelete').onclick=()=>{api.flush();all.set(api.id(),current().filter(r=>r.id!==selected));selected='';newRegion=true;api.changed();};
  $('icRedactClear').onclick=()=>{if(confirm('確定清除這張照片的所有遮蔽？')){api.flush();all.delete(api.id());selected='';newRegion=true;api.changed();}};
  function begin(p){if(!isOpen()||!api.id()||api.busy())return false;api.flush();const hit=!newRegion&&current().slice().reverse().find(r=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h);
   if(!hit&&current().length>=20){api.status('每張照片最多可建立 20 個遮蔽區域。',true);return true;}
   if(hit){choose(hit.id);gesture={start:p,original:{...hit},draft:{...hit}};}else gesture={start:p,draft:{id:crypto.randomUUID(),...defaults(),x:p.x,y:p.y,w:0,h:0}};return true;
  }
  function move(p){if(!gesture)return;const g=gesture;if(g.original){g.draft.x=clamp(g.original.x+p.x-g.start.x,0,1-g.original.w);g.draft.y=clamp(g.original.y+p.y-g.start.y,0,1-g.original.h);}else Object.assign(g.draft,{x:Math.min(g.start.x,p.x),y:Math.min(g.start.y,p.y),w:Math.abs(p.x-g.start.x),h:Math.abs(p.y-g.start.y)});api.preview();const ctx=$('icCanvas').getContext('2d'),c=ctx.canvas,r=g.draft;ctx.save();ctx.strokeStyle='#00d5ff';ctx.lineWidth=c.width/500;ctx.setLineDash([c.width/100,c.width/160]);ctx.strokeRect(r.x*c.width,r.y*c.height,r.w*c.width,r.h*c.height);ctx.restore();}
  function end(cancel=false){if(!gesture)return;const g=gesture;gesture=null;if(!cancel&&g.draft.w>=.005&&g.draft.h>=.005){const rows=current().filter(r=>r.id!==g.draft.id);rows.push(g.draft);all.set(api.id(),rows);choose(g.draft.id);api.changed();}else api.preview();sync();}
  return {sync,begin,move,end,paint:(c,id)=>paint(c,all.get(id)||[]),snapshot:()=>JSON.parse(JSON.stringify([...all])),restore:rows=>{all.clear();for(const [id,r] of rows||[])all.set(id,r.map(x=>({...x})));gesture=null;sync();},clear:()=>{all.clear();selected='';gesture=null;},forget:id=>all.delete(id),cancel:()=>end(true)};
 }
 window.ImageRedaction={mount};
})();
