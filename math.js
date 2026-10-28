export const PI = Math.PI;
export const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
export const snap = (v,step)=>Math.round(v/step)*step;
export const clean = v=>Math.abs(v)<1e-8?0:Math.round(v*10000)/10000;
export const number = v=>String(clean(v)).replace('-', '−');
export function piLabel(value){
  if(Math.abs(value)<1e-7)return '0';
  const ratio=value/PI,sign=ratio<0?'−':'';
  for(let d=1;d<=48;d++){
    const n=Math.round(Math.abs(ratio)*d);
    if(Math.abs(n/d-Math.abs(ratio))<1e-6)return sign+(n===1?'':n)+'π'+(d===1?'':'/'+d);
  }
  return number(ratio)+'π';
}
export const angleLabel=(rad,unit)=>unit==='deg'?number(rad*180/PI)+'°':piLabel(rad);
export const valueAt=(x,s)=>s.a*Math.sin(s.b*(x-s.h))+s.k;
export const metrics=s=>({amplitude:Math.abs(s.a),period:Math.abs(s.a)<1e-8||Math.abs(s.b)<1e-8?null:2*PI/Math.abs(s.b),midline:s.k});
export const transformPoint=(x,y,s)=>({x:x/s.b+s.h,y:s.a*y+s.k});
export function curvesMatch(s,t){
  let error=0;for(let i=0;i<=120;i++){const x=-2*PI+i*4*PI/120;error+=(valueAt(x,s)-valueAt(x,t))**2;}return Math.sqrt(error/121)<.025;
}
export function formula(s,unit='rad',active='all'){
  const highlight=(key,text)=>active===key||active==='all'?`<span class="formula-active">${text}</span>`:text;
  if(Math.abs(s.a)<1e-8)return `y = ${highlight('k',number(s.k))}`;
  const a=highlight('a',number(s.a));
  const b=highlight('b',number(s.b));
  const h=s.h<0?`x + ${highlight('h',angleLabel(-s.h,unit))}`:`x − ${highlight('h',angleLabel(s.h,unit))}`;
  const k=s.k<0?` − ${highlight('k',number(-s.k))}`:` + ${highlight('k',number(s.k))}`;
  if(active==='a')return `y = ${a} sin x`;
  if(active==='b')return `y = sin(${b}x)`;
  if(active==='h')return `y = sin(${h})`;
  if(active==='k')return `y = sin x${k}`;
  return `y = ${a} sin[${b}(${h})]${k}`;
}
