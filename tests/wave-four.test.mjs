import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {waveFourPractice} from '../bank-wave-04.js';
import {getPracticeCourse} from '../practice-library.js';
import {composeChapterTest} from '../chapter-tests.js';
const bit=(x,n)=>x>>n&1;
const r=n=>waveFourPractice.digital.find(q=>q.id===`P5-digital-4-R-${String(n).padStart(3,'0')}`);
const d=n=>waveFourPractice.digital.find(q=>q.id===`P5-digital-4-C-${String(n).padStart(3,'0')}`);
const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
test('组合逻辑新增35道不同设问，题面、解析与评分点完整，能在本章组卷',()=>{
 const qs=waveFourPractice.digital;assert.equal(qs.length,35);
 assert.deepEqual(['分析题','综合应用'].map(s=>qs.filter(q=>q.section===s).length),[20,15]);
 assert.equal(new Set(qs.map(q=>q.id)).size,35);
 const course=getPracticeCourse('digital');assert.ok(qs.every(q=>course.questions.some(p=>p.id===q.id)));
 const all=course.questions;assert.equal(new Set(all.map(q=>q.id)).size,all.length);
 for(const q of qs){assert.equal(q.chapter,4);assert.equal(q.pool,'practice');assert.equal(q.type,'short');assert.ok(q.stem.length>25&&q.model.length>40&&q.rubric.length>=3);assert.equal(all.filter(p=>norm(p.stem)===norm(q.stem)).length,1);}
 const p=composeChapterTest('digital',4);assert.equal(p.questions.length,13);assert.equal(p.questions.reduce((s,q)=>s+q.points,0),100);assert.ok(p.questions.every(q=>q.chapter===4));
});
test('逐级门网络、补码解释、加减与先行进位由独立整数模型核验',()=>{
 const xor=[];for(let x=0;x<4;x++){const A=bit(x,1),B=bit(x,0),n1=1-(A&B),n2=1-(A&n1),n3=1-(B&n1);xor.push(1-(n2&n3));}assert.equal(xor.join(''),'0110');assert.ok(r(1).model.includes('0110'));
 for(let x=0;x<8;x++){const A=bit(x,2),B=bit(x,1),C=bit(x,0);assert.equal(((A|B)&(A|C))|((1-B)&C),A|C);}
 assert.ok(r(2).model.includes('=A+C。'));assert.equal(5-8,-3);assert.ok(r(3).model.includes('−3与3'));
 for(let A=0;A<16;A++)for(let B=0;B<16;B++)for(let M=0;M<2;M++){
  const sum=A+(B^(M?15:0))+M,expected=A+(M?-B:B);assert.equal(sum&15,(expected+16)&15);
  if(M)assert.equal(sum>>4,Number(A>=B));
 }assert.equal((5+(9^15)+1)&15,12);assert.equal((5+(9^15)+1)>>4,0);assert.ok(r(4).model.includes('V=1'));
 for(let A=0;A<8;A++)for(let B=0;B<8;B++)for(let c0=0;c0<2;c0++){
  const P=[0,1,2].map(i=>bit(A^B,i)),G=[0,1,2].map(i=>bit(A&B,i));
  const c1=G[0]|P[0]&c0,c2=G[1]|P[1]&G[0]|P[1]&P[0]&c0,c3=G[2]|P[2]&G[1]|P[2]&P[1]&G[0]|P[2]&P[1]&P[0]&c0;
  assert.equal(c1,((A&1)+(B&1)+c0)>>1);assert.equal(c2,((A&3)+(B&3)+c0)>>2);assert.equal(c3,(A+B+c0)>>3);
 }assert.ok(r(5).model.includes('P2P1P0C0'));assert.equal(4*(4+4),32);assert.equal(4+4,8);assert.ok(r(6).model.includes('32ns'));
});
test('比较级联、编码极性、译码位序及MUX反相由全部输入核验',()=>{
 for(let A=0;A<256;A++)for(let B=0;B<256;B++){
  const ah=A>>4,bh=B>>4,al=A&15,bl=B&15;assert.equal(Number(ah>bh||ah===bh&&al>bl),Number(A>B));assert.equal(Number(ah===bh&&al===bl),Number(A===B));assert.equal(Number(ah<bh||ah===bh&&al<bl),Number(A<B));
 }assert.ok(r(7).model.includes('31'));
 for(let lowMask=1;lowMask<256;lowMask++){const chosen=Math.floor(Math.log2(lowMask));let reference=-1;for(let i=7;i>=0;i--)if(lowMask>>i&1){reference=i;break;}assert.equal(chosen,reference);}
 assert.equal(7^5,2);assert.ok(r(8).model.includes('010'));
 const intersection=[],symmetric=[],rewired=[],inverted=[],selected=[];
 for(let x=0;x<8;x++){
  const P=[1,2,3].includes(x),Q=[3,5].includes(x);if(P&&Q)intersection.push(x);if(P!==Q)symmetric.push(x);
  const A=bit(x,2),B=bit(x,1),C=bit(x,0),physical=C*4+B*2+A;if([1,3,6].includes(physical))rewired.push(x);
  const data=[C,1-C,1,0];if(1-data[A*2+B])inverted.push(x);
  const X=A,a=B,b=C;selected.push(X?a&b:a^b);
 }
 assert.deepEqual(intersection,[3]);assert.deepEqual(symmetric,[1,2,5]);assert.deepEqual(rewired,[3,4,6]);assert.deepEqual(inverted,[0,3,6,7]);assert.equal(selected.join(''),'01100001');
 assert.ok(r(9).model.includes('Σm(1,2,5)'));assert.ok(r(10).model.includes('Σm(3,4,6)'));assert.ok(r(11).model.includes('Σm(0,3,6,7)'));assert.ok(r(12).model.includes('01100001'));
 for(let E=0;E<2;E++)for(let D=0;D<2;D++)for(let S=0;S<4;S++){const out=Array.from({length:4},(_,i)=>E&D&Number(i===S));assert.equal(out.reduce((a,b)=>a+b,0),E&D);}
 for(let A=0;A<16;A++)for(let B=0;B<16;B++){const eq=[0,1,2,3].map(i=>Number(bit(A,i)===bit(B,i)));assert.equal(eq.reduce((a,b)=>a&b,1),Number(A===B));}
 assert.ok(r(13).model.includes('四条输出都为0'));assert.ok(r(14).model.includes('A=1000'));
});
test('BCD完整合法域、静态冒险与故障测试集合独立核验',()=>{
 for(let a=0;a<10;a++)for(let b=0;b<10;b++)for(let cin=0;cin<2;cin++){
  const sum=a+b+cin,t=sum&15,c4=sum>>4,K=c4|(bit(t,3)&(bit(t,2)|bit(t,1))),ones=(t+(K?6:0))&15;
  assert.equal(K*10+ones,sum);
 }assert.equal((((8+9)&15)+6)>>4,0);assert.ok(r(15).model.includes('0001 0111'));
 for(let x=0;x<16;x++){const A=bit(x,3),B=bit(x,2),C=bit(x,1);assert.equal(Number(!(A&&(B||C))),Number(x<10));}
 const f0=[],f1=[],shared1=[],shared2=[];
 for(let x=0;x<8;x++){
  const A=bit(x,2),B=bit(x,1),C=bit(x,0),F=(A|B)&((1-A)|C);assert.equal(F,F&(B|C));
  const normal=(A&B)|(A&C);if(normal!==(A&C))f0.push(x);if(normal!==1)f1.push(x);
  const out2=(A&B)|((1-A)&C);if(normal!==(A&C))shared1.push(x);if(out2!==((1-A)&C))shared2.push(x);
 }assert.deepEqual(f0,[6]);assert.deepEqual(f1,[0,1,2,3,4]);assert.deepEqual(shared1,[6]);assert.deepEqual(shared2,[6,7]);
 assert.ok(r(17).model.includes('(B+C)'));assert.ok(r(18).model.includes('ABC=110'));assert.ok(r(20).model.includes('110、111'));
 for(let A=0;A<2;A++)for(let B=0;B<2;B++)assert.equal(A|(A&B),A);assert.ok(r(19).model.includes('恒0不可'));
});
test('饱和、绝对值、编码转换、多路选择和奇校验由独立真值核验',()=>{
 for(let a=0;a<4;a++){const hi=bit(a,1),lo=bit(a,0);assert.equal((hi|lo)*2+(hi|(1-lo)),Math.min(a+1,3));}
 assert.ok(d(1).model.includes('11→11'));
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)assert.equal(Math.max(a,b)-Math.min(a,b),Math.abs(a-b));
 for(let binary=0;binary<8;binary++){const g=binary^(binary>>1),b2=bit(g,2),b1=b2^bit(g,1),b0=b1^bit(g,0);assert.equal(b2*4+b1*2+b0,binary);}
 assert.ok(d(3).model.includes('110时输出100'));
 for(let x=0;x<16;x++){
  const b=[0,1,2,3].map(i=>bit(x,i));const any=b.some(Boolean),pair=b.some((v,i)=>b.some((w,j)=>j>i&&v&&w));assert.equal(any&&!pair,x!==0&&(x&(x-1))===0);
  const parity=b.reduce((a,c)=>a^c,0),p=1-parity;assert.equal(parity^p,1);
  for(let i=0;i<5;i++){const code=[...b,p];code[i]^=1;assert.equal(code.reduce((a,c)=>a^c,0),0);for(let j=i+1;j<5;j++){const twice=[...code];twice[j]^=1;assert.equal(twice.reduce((a,c)=>a^c,0),1);}}
  for(let address=0;address<4;address++){const s0=address&1,s1=address>>1,P=b[s0],Q=b[2+s0];assert.equal(s1?Q:P,b[address]);}
  const X=x<8?x:x-16,S=bit(x,3),Y=((x^(S?15:0))+S)&15;assert.equal(Y,Math.abs(X));
 }
 for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let S=0;S<2;S++)for(let i=0;i<2;i++){assert.equal(((1-S)&bit(a,i))|(S&bit(b,i)),bit(S?b:a,i));}
 assert.ok(d(7).model.includes('两位翻转'));assert.ok(d(8).model.includes('无符号解释为8'));
});
test('乘法器、全加器MUX、温度计码、ALU、数码段与地址全域核验',()=>{
 for(let x=0;x<8;x++){const A=bit(x,2),B=bit(x,1),C=bit(x,0);assert.equal(A^B,Number(x>=2&&x<=5));const s=[C,1-C,1-C,C][A*2+B],co=[0,C,C,1][A*2+B];assert.equal(s+co*2,A+B+C);}
 for(let A=0;A<4;A++)for(let B=0;B<4;B++){
  const a=bit(A,0)&bit(B,0),b=bit(A,1)&bit(B,0),c=bit(A,0)&bit(B,1),d0=bit(A,1)&bit(B,1),k=b&c;assert.equal(a+2*(b^c)+4*(d0^k)+8*(d0&k),A*B);
  for(let mode=0;mode<4;mode++){const sum=A+B,candidates=[A&B,A|B,A^B,sum&3],selected=[0,1].reduce((acc,i)=>acc+(bit(candidates[mode],i)<<i),0);assert.equal(selected,candidates[mode]);assert.equal((mode===3?sum>>2:0),Number(mode===3&&sum>=4));}
 }
 for(let code=0;code<8;code++){const a=bit(code,2),b=bit(code,1),c=bit(code,0),V=Number((!a||b)&&(!b||c));assert.equal(V,Number([0,1,3,7].includes(code)));const out=V*(2*b+(a|(c&(1-b))));assert.equal(out,[0,1,3,7].includes(code)?[0,1,3,7].indexOf(code):0);}
 for(let digit=0;digit<10;digit++){const B=bit(digit,2),C=bit(digit,1),D=bit(digit,0),L=(1-D)&((1-B)|C),Z=D|(B&(1-C));assert.equal(L,Number([0,2,6,8].includes(digit)));assert.equal(Z,1-L);}
 for(let address=0;address<4096;address++){const enabled=!bit(address,8),index=address>>9,selected=enabled&&index===5;assert.equal(selected,address>=0xA00&&address<=0xAFF);}
 assert.ok(d(10).model.includes('1001'));assert.ok(d(12).model.includes('非法码被V清为00'));assert.ok(d(14).model.includes('D+BC′'));assert.ok(d(15).model.includes('256个地址'));
});
test('五道本地原题的完整输入域独立核答，原题不进入默认源码模块',async t=>{
 let local;try{local=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8'));}catch{t.skip('开源默认源码不附本地参考题');return;}
 const qs=local.digital.filter(q=>/^WHU-HW05-[1-5]$/.test(q.id));assert.equal(qs.length,5);assert.ok(qs.every(q=>q.reference.distribution==='local-only'));
 for(let n=0;n<16;n++){const selected=Array.from({length:10},(_,j)=>Number(n!==j));assert.equal(selected.filter(x=>!x).length,n<10?1:0);const K=Number(n>=10),ones=(n+K*6)&15;assert.equal(K*10+ones,n);}
 for(let n=0;n<8;n++){const low=Array.from({length:8},(_,j)=>Number(n!==j));assert.equal(low[1]&low[6],Number([0,2,3,4,5,7].includes(n)));const A=bit(n,2),B=bit(n,1),c=bit(n,0),diff=A-B-c;assert.equal(A^B^c,(diff+2)%2);assert.equal(Number(diff<0),Number([1,2,3,7].includes(n)));}
 for(let n=0;n<16;n++){const D=bit(n,0),inputs=[D,1,D,1-D,0,0,0,0];assert.equal(inputs[n>>1],Number([1,2,3,5,6].includes(n)));}
});
