import test from 'node:test';
import assert from 'node:assert/strict';
import {PI,angleLabel,piLabel,valueAt,metrics,transformPoint,curvesMatch,formula} from '../math.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('stretch and translation map known sine points correctly',()=>{
  const s={a:-2,b:3,h:PI/6,k:1};
  for(const x of [0,PI/2,PI,3*PI/2,2*PI]){
    const p=transformPoint(x,Math.sin(x),s);
    close(valueAt(p.x,s),p.y);
  }
  const peak=transformPoint(PI/2,1,s);close(peak.x,PI/3);close(peak.y,-1);
});
test('B=2 halves period without changing amplitude',()=>{
  const s={a:1,b:2,h:0,k:0};close(metrics(s).period,PI);
  close(valueAt(PI/4,s),1);close(valueAt(3*PI/4,s),-1);
});
test('horizontal shift is divided by B in expanded form',()=>{
  const s={a:1,b:2,h:PI/2,k:0};
  for(const x of [0,.2,1,2.5])close(valueAt(x,s),Math.sin(2*x-PI));
});
test('amplitude and midline stay distinct; constant has no fundamental period',()=>{
  assert.deepEqual(metrics({a:-2,b:.5,h:1,k:3}),{amplitude:2,period:4*PI,midline:3});
  assert.equal(metrics({a:0,b:2,h:1,k:2}).period,null);
});
test('angle labels preserve exact common fractions and degree conversion',()=>{
  assert.equal(piLabel(PI/6),'π/6');assert.equal(piLabel(-3*PI/2),'−3π/2');assert.equal(piLabel(8*PI/3),'8π/3');assert.equal(angleLabel(PI/2,'deg'),'90°');assert.equal(angleLabel(-PI,'deg'),'−180°');
});
test('shape challenges accept equivalent parameters and reject wrong ones',()=>{
  const target={a:1,b:2,h:PI/2,k:0};assert.ok(curvesMatch(target,{a:-1,b:2,h:0,k:0}));
  assert.ok(!curvesMatch(target,{a:1,b:1,h:PI/2,k:0}));
});
test('formula handles negative shifts, vertical offsets and zero amplitude',()=>{
  const strip=s=>s.replace(/<[^>]*>/g,'');
  assert.equal(strip(formula({a:1,b:1,h:-PI/2,k:0},'deg','h')),'y = sin(x + 90°)');
  assert.equal(strip(formula({a:1,b:1,h:0,k:-2},'rad','k')),'y = sin x − 2');
  assert.equal(strip(formula({a:0,b:2,h:1,k:3})),'y = 3');
});
