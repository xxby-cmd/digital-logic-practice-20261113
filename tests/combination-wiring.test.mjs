import test from 'node:test';
import assert from 'node:assert/strict';
import {waveFourPractice} from '../bank-wave-04.js';
const bit=(x,n)=>(x>>n)&1;
test('绝对差电路按比较器同时交换两路后做二位补码减法',()=>{
 for(let A=0;A<4;A++)for(let B=0;B<4;B++){
  const select=Number(A>=B),X=select*A+(1-select)*B,Y=select*B+(1-select)*A;
  const actual=(X+(Y^3)+1)&3;assert.equal(actual,Math.abs(A-B));
 }
});
test('逐位MUX最小项选路与脉动全加器组合满足四种ALU功能',()=>{
 for(let A=0;A<4;A++)for(let B=0;B<4;B++)for(let S=0;S<4;S++){
  const a0=bit(A,0),b0=bit(B,0),a1=bit(A,1),b1=bit(B,1),c1=a0&b0;
  const sums=[a0^b0,a1^b1^c1],c2=(a1&b1)|((a1^b1)&c1),s0=bit(S,0),s1=bit(S,1);
  let R=0;
  for(let i=0;i<2;i++){const a=bit(A,i),b=bit(B,i),u=a&b,v=a|b,w=a^b,t=sums[i];
   R|=(((1-s1)&(1-s0)&u)|((1-s1)&s0&v)|(s1&(1-s0)&w)|(s1&s0&t))<<i;}
  assert.equal(R,S===0?A&B:S===1?A|B:S===2?A^B:(A+B)&3);
  assert.equal(s1&s0&c2,S===3?Number(A+B>=4):0);
 }
});
test('片选直接利用低有效使能，对全部4096地址匹配且无需反相器',()=>{
 const q=waveFourPractice.digital.find(q=>q.id==='P5-digital-4-C-015');
 assert.ok(q.model.includes('G1=1、G2A=A8、G2B=0'));
 for(let address=0;address<4096;address++){
  const G1=1,G2A=bit(address,8),G2B=0,C=bit(address,11),B=bit(address,10),A=bit(address,9);
  const Y5=1-Number(G1&&!G2A&&!G2B&&C&&!B&&A);
  assert.equal(Y5,Number(!(address>=0xA00&&address<=0xAFF)));
 }
});
