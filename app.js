import {PI,clamp,snap,number,angleLabel,valueAt,metrics,curvesMatch,formula} from './math.js';

const $=id=>document.getElementById(id);
const initial=()=>({a:1,b:1,h:0,k:0});
const states=Object.fromEntries(['a','b','h','k','all'].map(key=>[key,initial()]));
const taskIndex={a:0,b:0,h:0,k:0,all:0};
const DEFAULT_X_EXTENT=4*PI;
let mode='a',unit='rad',xMin=-DEFAULT_X_EXTENT,xMax=DEFAULT_X_EXTENT,playing=false,timer=null,direction=1,drag=null,geometry=null;
let showOriginal=true,showGuides=true;
const label=x=>angleLabel(x,unit);
const eq=(a,b)=>Math.abs(a-b)<1e-5;
const data={
  a:{n:'01',name:'垂直伸縮',title:'改變高度，保留節奏。',description:'調整 A，看看波峰與波谷如何靠近或遠離 x 軸。曲線重複的速度會改變嗎？',parameter:'振幅係數',presets:[[-1,'翻轉 −1'],[.5,'壓縮 0.5'],[1,'原始 1'],[2,'放大 2']],think:'A 從 1 變成 −1，振幅也變成負的嗎？',answer:'不會。振幅是到中線的最大距離，所以永遠不小於 0。A = −1 的振幅仍是 1，但圖形會相對於 x 軸上下翻轉。',rule:()=>`記住：<b>振幅 = |A|</b>。|A| > 1 拉高，0 < |A| < 1 壓扁；A < 0 時上下翻轉。`,tasks:[{text:()=>`讓振幅變成 2，並保留原本波峰朝上的方向。`,hint:()=>`振幅等於 |A|；保留方向表示 A 要大於 0。`,test:s=>eq(s.a,2)},{text:()=>`把波形壓扁：讓振幅變成原來的一半，且不翻轉。`,hint:()=>`原來振幅是 1。一半是多少？把 A 調到 0 與 1 之間。`,test:s=>eq(s.a,.5)},{text:()=>`讓圖形上下翻轉，但振幅仍然是 1。`,hint:()=>`負號會讓每一個 y 值變號；振幅則看 A 的絕對值。`,test:s=>eq(s.a,-1)}]},
  b:{n:'02',name:'水平伸縮',title:'改變疏密，找到週期。',description:'調整 B，看看同一段 x 軸裡能放下幾個波。B 越大，波形會越寬還是越窄？',parameter:'頻率係數',presets:[[.5,'拉寬 0.5'],[1,'原始 1'],[2,'壓縮 2'],[3,'壓縮 3']],think:'B 變成 2，週期會變成原來的 2 倍嗎？',answer:'剛好相反。要讓 sin 裡的角度跑完一圈，x 只需要原來的一半，因此週期也變成一半。水平方向伸縮的倍率是 1/B。',rule:()=>`本頁取 B > 0。<b>週期 = ${label(2*PI)}/B</b>；B > 1 水平壓縮，0 < B < 1 水平拉寬。`,tasks:[{text:()=>`讓週期縮短成 ${label(PI)}，振幅維持 1。`,hint:()=>`把原本 ${label(2*PI)} 的週期減半，B 應該加倍。`,test:s=>eq(s.b,2)},{text:()=>`讓一個完整波形變得更寬：週期改為 ${label(4*PI)}。`,hint:()=>`要讓週期加倍，就把 B 減半。可按圖上的 ↔ 看完整週期。`,test:s=>eq(s.b,.5)},{text:()=>`讓 x 從 0 到 ${label(2*PI)} 的範圍內，剛好出現 3 個完整週期。`,hint:()=>`每個週期只剩原來的 1/3，想想 B 應該是多少。`,test:s=>eq(s.b,3)}]},
  h:{n:'03',name:'水平平移',title:'左右移動，形狀不變。',description:'調整 h，讓整條波形一起向左或向右移。注意公式中的減號，和實際移動方向。',parameter:'水平位移',presets:[[-PI/2,()=>`左移 ${label(PI/2)}`],[0,'原始 0'],[PI/2,()=>`右移 ${label(PI/2)}`]],think:'括號裡是 x − h，為什麼 h > 0 卻向右移？',answer:'原來 x = 0 的點，要等到 x = h 時，括號裡才會再次等於 0。所以每個對應點都向右移 h。試著盯住綠色控制點，就能看見這件事。',rule:()=>`<b>x − h：h > 0 向右，h < 0 向左。</b>每個點的 x 座標都加上 h；振幅與週期不變。`,tasks:[{text:()=>`把整條曲線向右平移 ${label(PI/2)}。`,hint:()=>`向右移時 h 是正數；公式會寫成 x 減去這個數。`,test:s=>eq(s.h,PI/2)},{text:()=>`把整條曲線向左平移 ${label(PI)}，讓 h 顯示負值。`,hint:()=>`向左移時 h < 0，所以 x − h 會變成 x 加上一個正數。`,test:s=>eq(s.h,-PI)},{text:()=>`讓原本 (0, 0) 的對應點移到 (${label(PI/3)}, 0)。`,hint:()=>`圖上綠色控制點標出原點的對應點，它的新 x 座標就是 h。`,test:s=>eq(s.h,PI/3)}]},
  k:{n:'04',name:'垂直平移',title:'上下移動，換一條中線。',description:'調整 k，讓每個點一起向上或向下移。波峰的高度改變了，振幅也會改變嗎？',parameter:'垂直位移',presets:[[-2,'下移 2'],[0,'原始 0'],[1,'上移 1'],[2,'上移 2']],think:'波峰從 1 升到 3，振幅就變成 3 了嗎？',answer:'不一定。當 k = 2 時，中線也上移到 y = 2；波峰到中線的距離仍是 3 − 2 = 1。振幅要從中線算起，不是從 x 軸算起。',rule:()=>`<b>中線：y = k</b>。k > 0 向上，k < 0 向下；最高點為 k + 1，最低點為 k − 1。`,tasks:[{text:()=>`把中線移到 y = 2，讓最高點到達 y = 3。`,hint:()=>`這一關振幅固定為 1，中線的高度就是 k。`,test:s=>eq(s.k,2)},{text:()=>`讓曲線的最高點剛好碰到 x 軸。`,hint:()=>`最高點的 y 座標是 k + 1；要碰到 x 軸，這個值必須是 0。`,test:s=>eq(s.k,-1)},{text:()=>`讓中線位於 y = 0.5，振幅維持 1。`,hint:()=>`上下平移不會改變振幅，只要把 k 調到指定的中線高度。`,test:s=>eq(s.k,.5)}]},
  all:{n:'05',name:'自由實驗',title:'把四種變化，組合起來。',description:'同時調整四個參數。綠點可移動 h 與 k；橘色虛線是下方任務的目標。',parameter:'',presets:[],think:'先伸縮還是先平移，會得到一樣的圖形嗎？',answer:'通常不會。對 y = A sin[B(x − h)] + k，可先以 y = sin x 為起點，將水平長度變成 1/B、垂直長度變成 |A|（A < 0 再上下翻轉），最後向右移 h、向上移 k。',rule:()=>`對應點：<b>(x, y) → (x/B + h, Ay + k)</b>。先做伸縮，再做平移；本頁 B > 0。`,tasks:[{text:()=>`讓綠色曲線與橘色虛線重合：振幅 2、中線 y = 1，週期 ${label(2*PI)}。`,hint:()=>`先保持 B = 1、h = 0，再調整 A 和 k。`,target:{a:2,b:1,h:0,k:1}},{text:()=>`挑戰 sin(2x − ${label(PI)})：讓綠色曲線與橘色虛線重合。`,hint:()=>`先改寫成 sin[2(x − ${label(PI/2)})]，所以 B = 2、h = ${label(PI/2)}。`,target:{a:1,b:2,h:PI/2,k:0}},{text:()=>`跟著線索重合：上下翻轉、週期 ${label(4*PI)}、向左移 ${label(PI/2)}、向上移 1。`,hint:()=>`振幅是 1。依序試試 A = −1、B = 0.5、h = −${label(PI/2)}、k = 1。`,target:{a:-1,b:.5,h:-PI/2,k:1}}]}
};

const config={a:{min:-3,max:3,step:.25,symbol:'A'},b:{min:.25,max:3,step:.25,symbol:'B'},h:{min:-2,max:2,step:1/12,symbol:'h'},k:{min:-3,max:3,step:.25,symbol:'k'}};
function parameterText(key,value){return key==='h'?label(value):number(value)}
function sliderValue(key,value){return key==='h'?value/PI:value}
function updateSlider(key,value){
  const el=$('slider-'+key);if(!el)return;
  el.value=sliderValue(key,value);el.style.setProperty('--fill',((Number(el.value)-config[key].min)/(config[key].max-config[key].min)*100)+'%');
  $('value-'+key).textContent=parameterText(key,value);el.setAttribute('aria-valuetext',parameterText(key,value));
}
function renderControls(){
  const keys=mode==='all'?['a','b','h','k']:[mode];
  $('controls').innerHTML=keys.map(key=>{const c=config[key];return `<div class="parameter-control"><div class="parameter-header"><label class="parameter-title" for="slider-${key}"><span class="parameter-symbol">${c.symbol}</span>${data[key].parameter}</label><output id="value-${key}" for="slider-${key}" class="parameter-value"></output></div><input type="range" id="slider-${key}" data-key="${key}" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.symbol} ${data[key].parameter}"><div class="range-labels"><span>${parameterText(key,key==='h'?c.min*PI:c.min)}</span><span>${key==='b'?'B > 0':'0'}</span><span>${parameterText(key,key==='h'?c.max*PI:c.max)}</span></div></div>`}).join('');
  keys.forEach(key=>updateSlider(key,states[mode][key]));
  $('presets').innerHTML=data[mode].presets.map(([value,text],i)=>`<button class="preset" data-preset="${i}">${typeof text==='function'?text():text}</button>`).join('');
  $('presets').hidden=mode==='all';
}
function resetFeedback(){ $('task-feedback').textContent='';$('task-feedback').className=''; }
function renderTask(){
  const task=data[mode].tasks[taskIndex[mode]];
  $('task-number').textContent=`${taskIndex[mode]+1} / ${data[mode].tasks.length}`;
  $('task-text').textContent=task.text();$('task-hint').textContent=task.hint();$('task-hint').hidden=true;
  $('hint-button').setAttribute('aria-expanded','false');$('hint-button').textContent='給我一點提示';
  $('task-prev').disabled=taskIndex[mode]===0;$('task-next').disabled=taskIndex[mode]===data[mode].tasks.length-1;
  $('target-legend').hidden=mode!=='all';resetFeedback();
}
function switchMode(next){
  stopAnimation();mode=next;
  document.querySelectorAll('[data-mode]').forEach(btn=>{const active=btn.dataset.mode===mode;btn.setAttribute('aria-selected',active);btn.tabIndex=active?0:-1});
  $('experiment').setAttribute('aria-labelledby','tab-'+mode);$('experiment').classList.toggle('all-mode',mode==='all');
  const d=data[mode];$('graph-kicker').textContent=`實驗 ${d.n} / ${d.name}`;$('mode-label').textContent=`EXPERIMENT ${d.n}`;
  $('mode-title').textContent=d.title;$('mode-description').textContent=d.description;
  $('think-question').textContent=d.think;$('think-answer').textContent=d.answer;$('think-details').open=false;
  $('animate-text').textContent=mode==='all'?'播放水平平移':'播放變化';
  $('drag-instruction').innerHTML=`<span class="drag-dot"></span>${mode==='all'?'拖曳綠點改變平移，使用滑桿調整伸縮':'拖曳綠色控制點，或試試參數滑桿'}`;
  renderControls();renderTask();resetView();render();
}
function observation(s){
  if(mode==='a'){
    if(eq(s.a,0))return 'A = 0，所有 y 值都變成 0，曲線成為 x 軸上的水平線，沒有基本週期。';
    return `振幅是 ${number(Math.abs(s.a))}，${eq(Math.abs(s.a),1)?'高度與原來相同':Math.abs(s.a)>1?'波形變高了':'波形被壓扁了'}。${s.a<0?'負號讓波峰與波谷上下翻轉；':''}週期仍是 ${label(2*PI)}。`;
  }
  if(mode==='b')return `${eq(s.b,1)?'現在與原始曲線完全重合':s.b>1?'波形變密，水平壓縮成原來的 '+number(1/s.b)+' 倍':'波形變疏，水平拉寬成原來的 '+number(1/s.b)+' 倍'}。週期是 ${label(2*PI/s.b)}，振幅仍是 1。`;
  if(mode==='h')return `${eq(s.h,0)?'曲線還在原位':`整條曲線向${s.h>0?'右':'左'}移了 ${label(Math.abs(s.h))}`}。綠色控制點現在位於 (${label(s.h)}, 0)，振幅與週期都不變。`;
  if(mode==='k')return `${eq(s.k,0)?'中線與 x 軸重合':`整條曲線向${s.k>0?'上':'下'}移了 ${number(Math.abs(s.k))}`}。最高點 ${number(s.k+1)}、最低點 ${number(s.k-1)}，它們到中線的距離仍是 1。`;
  if(eq(s.a,0))return `A = 0 時，曲線是一條 y = ${number(s.k)} 的水平線，改變 B 或 h 不會影響它，也沒有基本週期。`;
  return `振幅 ${number(Math.abs(s.a))}，週期 ${label(2*PI/s.b)}，中線 y = ${number(s.k)}。${s.a<0?'A < 0，波形也上下翻轉了。':'把橘色目標當作線索，試著讓兩條曲線重合。'}`;
}
function render(){
  const s=states[mode],m=metrics(s);
  $('live-formula').innerHTML=formula(s,unit,mode);
  $('metric-amplitude').textContent=number(m.amplitude);$('metric-period').textContent=m.period===null?'無基本週期':label(m.period);$('metric-period').style.fontSize=m.period===null?'16px':'';
  $('fit-cycle').disabled=m.period===null;
  $('metric-midline').textContent='y = '+number(m.midline);$('observation-text').textContent=observation(s);$('rule').innerHTML=data[mode].rule();
  $('unit-note').textContent=`x 軸單位：${unit==='rad'?'弧度':'角度'}`;
  (mode==='all'?['a','b','h','k']:[mode]).forEach(key=>updateSlider(key,s[key]));
  document.querySelectorAll('[data-preset]').forEach(el=>el.classList.toggle('selected',eq(s[mode],data[mode].presets[Number(el.dataset.preset)][0])));
  renderGraph();
}

function renderGraph(){
  const s=states[mode],svg=$('plot');
  const W=Math.max(440,svg.getBoundingClientRect().width),H=W<600?355:420;
  const pad={l:43,r:27,t:36,b:38},pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
  const yLimit=mode==='all'?7:4.5;
  const X=x=>pad.l+(x-xMin)/(xMax-xMin)*pw,Y=y=>pad.t+(yLimit-y)/(2*yLimit)*ph;
  geometry={W,H,pad,pw,ph,X,Y,yLimit};svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  let out=`<title id="plot-title">${data[mode].name}：${$('live-formula').textContent}</title><desc id="plot-desc">灰色虛線是原始 sin x，綠色實線是目前函數。振幅 ${number(Math.abs(s.a))}，中線 y 等於 ${number(s.k)}。請以參數滑桿或拖曳控制點互動。</desc><defs><clipPath id="plot-clip"><rect x="${pad.l}" y="${pad.t}" width="${pw}" height="${ph}"/></clipPath><marker id="arrow-green" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L6 3L0 6" fill="#68a48b"/></marker></defs>`;
  const line=(x1,y1,x2,y2,color,width=1,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
  const text=(x,y,t,color='#8d9b91',anchor='middle',size=12)=>`<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-size="${size}" class="axis-label">${t}</text>`;
  const span=xMax-xMin;
  const tickChoices=[PI/4,PI/2,PI,2*PI,4*PI,8*PI];
  const desired=span/(W<600?5:8);
  const tick=tickChoices.find(v=>v>=desired-.001)||8*PI;
  const gridTick=tick/2;
  for(let x=Math.ceil(xMin/gridTick)*gridTick;x<xMax+1e-5;x+=gridTick)out+=line(X(x),pad.t,X(x),H-pad.b,'#edf1e9');
  for(let y=-Math.floor(yLimit);y<=yLimit;y++)out+=line(pad.l,Y(y),W-pad.r,Y(y),'#edf1e9');
  const axisY=Y(0),axisX=X(0);
  out+=line(pad.l,axisY,W-pad.r+5,axisY,'#a8b5ab',1.1)+text(W-pad.r+8,axisY+4,'x','#6e8173','start',14);
  if(axisX>=pad.l&&axisX<=W-pad.r)out+=line(axisX,H-pad.b,axisX,pad.t-9,'#a8b5ab',1.1)+text(axisX+10,pad.t-12,'y','#6e8173','start',14);
  const yLabelX=clamp(axisX,pad.l+8,W-pad.r-8);
  for(let x=Math.ceil(xMin/tick)*tick;x<=xMax+1e-5;x+=tick){out+=line(X(x),axisY-3,X(x),axisY+3,'#a8b5ab');if(Math.abs(x)>.001)out+=text(X(x),axisY+19,label(x),'#8d9b91','middle',W<600?11:12)}
  for(let y=-Math.floor(yLimit);y<=yLimit;y++){if(y===0)continue;if(mode==='all'&&y%2!==0)continue;out+=text(yLabelX-8,Y(y)+4,String(y),'#94a095','end',11)}
  if(axisX>=pad.l&&axisX<=W-pad.r)out+=text(axisX-9,axisY+17,'0','#8d9b91','end',11);
  out+='<g clip-path="url(#plot-clip)">';
  if(showGuides){
    if(mode==='k'||mode==='all')out+=line(pad.l,Y(s.k),W-pad.r,Y(s.k),'#92b8a2',1,'5 5');
    if(mode==='a'||mode==='all'){
      out+=line(pad.l,Y(s.k+Math.abs(s.a)),W-pad.r,Y(s.k+Math.abs(s.a)),'#c1d9c7',1,'3 6');
      out+=line(pad.l,Y(s.k-Math.abs(s.a)),W-pad.r,Y(s.k-Math.abs(s.a)),'#c1d9c7',1,'3 6');
    }
    if(mode==='h'||mode==='all')out+=line(X(s.h),pad.t,X(s.h),H-pad.b,'#c0d7c5',1,'4 5');
  }
  function path(state){let d='';const count=Math.ceil(pw*1.7);for(let i=0;i<=count;i++){const x=xMin+span*i/count;d+=(i?'L':'M')+X(x).toFixed(2)+' '+Y(valueAt(x,state)).toFixed(2)}return d}
  if(showOriginal)out+=`<path id="original-curve" d="${path(initial())}" fill="none" stroke="#abb7ae" stroke-width="2" stroke-dasharray="6 6"/>`;
  if(mode==='all')out+=`<path id="target-curve" d="${path(data.all.tasks[taskIndex.all].target)}" fill="none" stroke="#cc7947" stroke-width="3" stroke-dasharray="8 7" opacity=".8"/>`;
  out+=`<path id="current-curve" d="${path(s)}" fill="none" stroke="#087f73" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(showGuides&&mode==='b'){
    const end=2*PI/s.b,bracketY=Y(-2.6);
    out+=`<line x1="${X(0)}" y1="${bracketY}" x2="${X(end)}" y2="${bracketY}" stroke="#68a48b" stroke-width="1.2" marker-start="url(#arrow-green)" marker-end="url(#arrow-green)"/>`;
    out+=line(X(0),Y(-.2),X(0),bracketY+9,'#c2d7c6',1,'3 5')+line(X(end),Y(-.2),X(end),bracketY+9,'#c2d7c6',1,'3 5');
    if(X(end)<=W-pad.r)out+=text(X(end/2),bracketY+21,'週期 '+label(end),'#6d9c7d','middle',12);
  }
  if(showGuides&&mode==='h'&&Math.abs(s.h)>.1){const y=Y(-2);out+=`<line x1="${X(0)}" y1="${y}" x2="${X(s.h)}" y2="${y}" stroke="#68a48b" stroke-width="1.2" marker-end="url(#arrow-green)"/>`;out+=text(X(s.h/2),y+20,(s.h>0?'右移 ':'左移 ')+label(Math.abs(s.h)),'#6d9c7d','middle',12)}
  out+='</g>';
  if(showGuides&&(mode==='k'||mode==='all'))out+=text(W-pad.r-4,Y(s.k)-9,'中線 y = '+number(s.k),'#7f9c86','end',11);
  let handle={x:PI/2,y:s.a,label:'A = '+number(s.a)};
  if(mode==='b')handle={x:PI/(2*s.b),y:1,label:'B = '+number(s.b)};
  if(mode==='h')handle={x:s.h,y:0,label:'h = '+label(s.h)};
  if(mode==='k')handle={x:0,y:s.k,label:'k = '+number(s.k)};
  if(mode==='all')handle={x:s.h,y:s.k,label:`(${label(s.h)}, ${number(s.k)})`};
  const hx=X(handle.x),hy=Y(handle.y);
  if(hx>=pad.l-1&&hx<=W-pad.r+1){
    const lx=clamp(hx+14,pad.l+4,W-pad.r-105),ly=clamp(hy-23,pad.t+3,H-pad.b-26),lw=Math.max(66,handle.label.length*7+16);
    out+=`<g class="handle" data-handle="true"><circle class="handle-hit" cx="${hx}" cy="${hy}" r="23"/><circle cx="${hx}" cy="${hy}" r="11" fill="#087f7315"/><circle cx="${hx}" cy="${hy}" r="6.5" fill="#087f73" stroke="white" stroke-width="2.5"/><rect class="graph-label-bg" x="${lx}" y="${ly-14}" width="${lw}" height="25" rx="5"/><text class="plot-handle-label" x="${lx+8}" y="${ly+3}">${handle.label}</text></g>`;
  }else{out+=text(pad.l+5,pad.t+15,'控制點在視野外，按 ⌂ 還原視野','#8a9a8c','start',11)}
  svg.innerHTML=out;
}

function changeParameter(key,value){
  const c=config[key];states[mode][key]=key==='h'?clamp(snap(value,PI/12),-2*PI,2*PI):clamp(snap(value,c.step),c.min,c.max);
  resetFeedback();render();
}
function stopAnimation(){playing=false;clearInterval(timer);timer=null;$('animate').setAttribute('aria-pressed','false');$('animate-icon').textContent='▷';$('animate-text').textContent=mode==='all'?'播放水平平移':'播放變化'}
function resetView(){xMin=-DEFAULT_X_EXTENT;xMax=DEFAULT_X_EXTENT;renderGraph()}
document.querySelectorAll('[data-mode]').forEach(btn=>{
  btn.addEventListener('click',()=>switchMode(btn.dataset.mode));
  btn.addEventListener('keydown',e=>{const modes=['a','b','h','k','all'];let index=modes.indexOf(mode);if(e.key==='ArrowRight')index=(index+1)%5;else if(e.key==='ArrowLeft')index=(index+4)%5;else if(e.key==='Home')index=0;else if(e.key==='End')index=4;else return;e.preventDefault();switchMode(modes[index]);$('tab-'+modes[index]).focus()});
});
$('controls').addEventListener('input',e=>{if(!e.target.matches('input[type=range]'))return;stopAnimation();const key=e.target.dataset.key;changeParameter(key,Number(e.target.value)*(key==='h'?PI:1))});
$('presets').addEventListener('click',e=>{const btn=e.target.closest('[data-preset]');if(!btn)return;stopAnimation();changeParameter(mode,data[mode].presets[Number(btn.dataset.preset)][0])});
document.querySelectorAll('[data-unit]').forEach(btn=>btn.addEventListener('click',()=>{
  unit=btn.dataset.unit;document.querySelectorAll('[data-unit]').forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',b===btn)});renderControls();renderTask();render();
}));
$('show-original').addEventListener('change',e=>{showOriginal=e.target.checked;renderGraph()});
$('show-guides').addEventListener('change',e=>{showGuides=e.target.checked;renderGraph()});
$('reset').addEventListener('click',()=>{stopAnimation();states[mode]=initial();resetFeedback();resetView();render()});
$('zoom-in').addEventListener('click',()=>{const center=(xMin+xMax)/2,half=Math.max(PI/2,(xMax-xMin)/2*.75);xMin=center-half;xMax=center+half;renderGraph()});
$('zoom-out').addEventListener('click',()=>{const center=(xMin+xMax)/2,half=Math.min(8*PI,(xMax-xMin)/2/0.75);xMin=center-half;xMax=center+half;renderGraph()});
$('fit-cycle').addEventListener('click',()=>{const s=states[mode],period=2*PI/s.b;xMin=s.h-period*.15;xMax=s.h+period*1.15;renderGraph()});
$('reset-view').addEventListener('click',resetView);
$('animate').addEventListener('click',()=>{
  if(playing){stopAnimation();return}playing=true;direction=1;$('animate').setAttribute('aria-pressed','true');$('animate-icon').textContent='Ⅱ';$('animate-text').textContent='暫停變化';
  const key=mode==='all'?'h':mode,c=config[key];
  timer=setInterval(()=>{let current=sliderValue(key,states[mode][key]);if(current>=c.max-1e-7)direction=-1;if(current<=c.min+1e-7)direction=1;changeParameter(key,(current+c.step*direction)*(key==='h'?PI:1))},160);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAnimation()});
$('task-prev').addEventListener('click',()=>{if(taskIndex[mode]>0){taskIndex[mode]--;renderTask();renderGraph()}});
$('task-next').addEventListener('click',()=>{if(taskIndex[mode]<data[mode].tasks.length-1){taskIndex[mode]++;renderTask();renderGraph()}});
$('hint-button').addEventListener('click',()=>{const hidden=!$('task-hint').hidden;$('task-hint').hidden=hidden;$('hint-button').setAttribute('aria-expanded',!hidden);$('hint-button').textContent=hidden?'給我一點提示':'收起提示'});
$('check-task').addEventListener('click',()=>{
  stopAnimation();const task=data[mode].tasks[taskIndex[mode]],ok=task.target?curvesMatch(states[mode],task.target):task.test(states[mode]);
  const el=$('task-feedback');el.className=ok?'success':'retry';el.textContent=ok?'✓ 做到了！再說說看：是哪個參數，讓圖形發生這個變化？':'還差一點。看看目前的數值和目標，再調整一次；也可以先打開提示。';
});
$('load-example').addEventListener('click',()=>{states.all={a:1,b:2,h:PI/2,k:0};taskIndex.all=1;switchMode('all');$('experiment').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'})});
$('guide-open').addEventListener('click',()=>{stopAnimation();$('guide').showModal()});
for(const id of ['guide-close','guide-start'])$(id).addEventListener('click',()=>$('guide').close());
$('guide').addEventListener('click',e=>{if(e.target===$('guide')){const r=$('guide').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('guide').close()}});
$('plot').addEventListener('pointerdown',e=>{
  if(!e.target.closest('[data-handle]'))return;
  e.preventDefault();stopAnimation();drag={pointerId:e.pointerId};$('plot').setPointerCapture(e.pointerId);$('plot').parentElement.classList.add('dragging');
});
$('plot').addEventListener('pointermove',e=>{
  if(!drag||drag.pointerId!==e.pointerId||!geometry)return;
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform($('plot').getScreenCTM().inverse());
  const g=geometry,x=xMin+(p.x-g.pad.l)/g.pw*(xMax-xMin),y=g.yLimit-(p.y-g.pad.t)/g.ph*(2*g.yLimit);
  if(mode==='a')changeParameter('a',y);
  if(mode==='b')changeParameter('b',PI/(2*Math.max(PI/6,x)));
  if(mode==='h')changeParameter('h',x);
  if(mode==='k')changeParameter('k',y);
  if(mode==='all'){
    states.all.h=clamp(snap(x,PI/12),-2*PI,2*PI);states.all.k=clamp(snap(y,.25),-3,3);resetFeedback();render();
  }
});
function stopDrag(e){if(drag?.pointerId!==e.pointerId)return;drag=null;$('plot').parentElement.classList.remove('dragging');if($('plot').hasPointerCapture(e.pointerId))$('plot').releasePointerCapture(e.pointerId)}
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('plot').addEventListener(type,stopDrag);
new ResizeObserver(()=>renderGraph()).observe($('plot').parentElement);
switchMode('a');
