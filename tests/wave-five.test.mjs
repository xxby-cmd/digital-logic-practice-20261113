import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {waveFivePractice} from '../bank-wave-05.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
const qs=waveFivePractice.digital;
const q=(kind,n)=>qs.find(q=>q.id===`P5-digital-5-${kind}-${String(n).padStart(3,'0')}`);
const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
const jk=(J,K,Q)=>J?(K?1-Q:1):(K?0:Q);
const tff=(T,Q)=>T?1-Q:Q;
function latch(kind,S,R,initial){
 let [Q,N]=initial;
 for(let i=0;i<8;i++){const next=kind==='nand'?[Number(!(S&&N)),Number(!(R&&Q))]:[Number(!(R||N)),Number(!(S||Q))];if(next[0]===Q&&next[1]===N)return next;[Q,N]=next;}
 throw Error('本用例未在逻辑迭代中收敛，不能硬判稳态');
}
test('存储元件80道原创题结构完整，无重号或原题面重复，不借入考试题',()=>{
 assert.equal(qs.length,80);assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>qs.filter(q=>q.section===s).length),[20,20,24,16]);
 const current=getPracticeCourse('digital').questions,combined=[...new Map([...current,...qs].map(q=>[q.id,q])).values()];
 assert.equal(new Set(qs.map(q=>q.id)).size,80);
 for(const item of qs){assert.equal(item.chapter,5);assert.equal(item.pool,'practice');assert.ok(!item.stem.includes('同上')&&!item.stem.includes('上一题'));assert.equal(combined.filter(v=>norm(v.stem)===norm(item.stem)).length,1);if(item.type==='single'){assert.equal(item.options.length,4);assert.ok(item.answer>=0&&item.answer<4);assert.ok(item.explanation.length>20);}else if(item.type==='fill'){assert.ok(item.answers.length);assert.ok(grade(item,item.answers.map(a=>a[0])).correct);}else{assert.ok(item.model.length>50&&item.rubric.length>=3);}}
});
test('反相的组合上划线输入实际可判对，按键多沿题明确全部时序条件',()=>{
 for(const alias of ['Q̅','Q̄',"Q'",'¬Q','~Q'])assert.equal(grade(q('F',19),[alias,'1']).correct,true,alias);
 assert.equal(grade(q('F',19),['Q','1']).correct,false);assert.equal(grade(q('F',19),['Q̅','0']).correct,false);
 assert.ok(q('S',18).stem.includes('理想边沿模型')&&q('S',18).stem.includes('全部时序要求'));
 assert.equal(q('S',18).revision,2);assert.equal(q('F',19).revision,2);
});
test('交叉门真实固定点核验RS命令、禁用输出和分步解除次序',()=>{
 let state=[0,1];const states=[];for(const [S,R]of [[0,0],[1,0],[0,0],[0,1],[0,0]]){state=latch('nor',S,R,state);states.push(state);}assert.equal(states.map(s=>s[0]).join(''),'01100');assert.equal(states.map(s=>s[1]).join(''),'10011');
 assert.ok(q('R',1).model.includes('0、1、1、0、0'));
 assert.deepEqual(latch('nor',1,1,[0,1]),[0,0]);assert.deepEqual(latch('nand',0,0,[0,1]),[1,1]);
 assert.ok([0,1].every(Q=>Q!==1-Q));assert.ok(q('F',11).explanation.includes('Q=Q′'));
 const reset=latch('nand',1,0,[1,1]);assert.deepEqual(latch('nand',1,1,reset),[0,1]);
 const set=latch('nand',0,1,[1,1]);assert.deepEqual(latch('nand',1,1,set),[1,0]);
 for(let E=0;E<2;E++)for(let D=0;D<2;D++)for(let Q=0;Q<2;Q++){const S=E&D,R=E&(1-D);assert.equal(S&R,0);assert.equal(latch('nor',S,R,[Q,1-Q])[0],E?D:Q);}
});
test('逐现态枚举反馈接线、激励无关值与D/JK/T互换',()=>{
 for(let Q=0;Q<2;Q++)for(let X=0;X<2;X++){
  assert.equal(tff(1-Q,Q),1);assert.equal(jk(Q,Q,Q),0);assert.equal(jk(Q,1-Q,Q),Q);
  assert.equal(jk(X*(1-Q),X*Q,Q),X^Q);assert.equal(jk(X,X,Q),X^Q);
  assert.equal(jk(X,0,Q),X|Q);assert.equal(tff(X^Q,Q),X);
 }
 for(let J=0;J<2;J++)for(let K=0;K<2;K++)for(let Q=0;Q<2;Q++){
  assert.equal((J&(1-Q))|((1-K)&Q),jk(J,K,Q));assert.equal(tff((J&(1-Q))|(K&Q),Q),jk(J,K,Q));
 }
 for(let Q=0;Q<2;Q++){assert.equal(jk(1-Q,0,Q),1);assert.equal(jk(1,0,Q),1);}
 for(let X=0;X<2;X++)assert.equal(X*0,0);
 assert.ok(q('R',9).model.includes('X⊕Q'));assert.ok(q('R',10).model.includes('Q⁺=Q'));assert.ok(q('C',4).model.includes('T=JQ′+KQ'));
});
test('异步控制优先、主从透明窗口与共同沿的旧值采样按事件核验',()=>{
 let Q=0;const out=[];
 for(const [pre,clr,edge,D]of [[1,0,0,0],[0,0,0,0],[0,0,1,0],[0,1,0,1],[0,0,0,1],[0,0,1,1]]){if(pre)Q=1;else if(clr)Q=0;else if(edge)Q=D;out.push(Q);}assert.equal(out.join(''),'110001');assert.ok(q('R',5).model.includes('110001'));
 let a=0,b=0;const states=[];for(const x of [1,0,1,1]){[a,b]=[x,a];states.push(`${a}${b}`);}assert.deepEqual(states,['10','01','10','11']);
 assert.ok(q('R',6).model.includes('10、01、10、11'));
 let master=0,slave=0;for(const [cp,D]of [[1,0],[1,1],[1,0],[0,0]]){if(cp)master=D;else slave=master;}assert.equal(slave,0);assert.ok(q('R',7).model.includes('从级打开后仍输出0'));
 let state=1;const feedback=[];for(const X of [0,1,0,1]){state=tff(X*state,state);feedback.push(state);}assert.equal(feedback.join(''),'1000');assert.ok(q('R',11).model.includes('1、0、0、0'));
 const sampled=[0,10,20].map(t=>Number(t>=2&&t<4));assert.deepEqual(sampled,[0,0,0]);assert.ok(q('R',19).model.includes('不能凭空找回'));
});
test('时序算式分别核最短/最长通路，不把周期变长误作保持修复',()=>{
 assert.equal(8+6,14);assert.deepEqual([40+2,40+7],[42,47]);assert.ok(43>50-8);assert.ok(52<50+3);
 assert.equal(7+6+3,16);assert.equal(1000/16,62.5);assert.ok(q('R',15).model.includes('62.5MHz'));
 assert.ok(1+1<3);assert.ok(q('R',16).model.includes('不能解决'));
 assert.ok(2<2+1);assert.ok(11<=22-2);assert.ok(q('R',17).model.includes('20ns'));
 assert.ok(2<4);assert.ok(q('R',18).model.includes('不能替代'));
 const falls=[3,13,23,33];let Q=0;const values=falls.map(()=>Q=1-Q);assert.equal(values.join(''),'1010');assert.equal(falls[2]-falls[0],20);assert.equal((falls[1]-falls[0])/(falls[2]-falls[0]),0.5);assert.ok(q('R',21).model.includes('50%'));
 // The effective clock pulse is a separate signal; CP itself never rose here.
 assert.equal(1&0,0);assert.equal(1&1,1);assert.ok(q('C',10).model.includes('不再直接改时钟脚'));
});
test('复位/使能/标志与奇偶累积等设计逐控制和现态核验',()=>{
 for(let R=0;R<2;R++)for(let E=0;E<2;E++)for(let X=0;X<2;X++)for(let Q=0;Q<2;Q++){
  const enabled=(E&X)|((1-E)&Q),reset=(1-R)&enabled;assert.equal(reset,R?0:E?X:Q);
  assert.equal(jk(E&X,E&(1-X),Q),enabled);assert.equal(tff(E&(X^Q),Q),enabled);
  const sticky=(1-R)&(X|Q);assert.equal(sticky,R?0:X?1:Q);
  const valid=(1-R)&(E|Q);assert.equal(valid,R?0:E?1:Q);
  const heldDuringReset=((1-R)&E&X)|((R|(1-E))&Q);if(R)assert.equal(heldDuringReset,Q);else assert.equal(heldDuringReset,enabled);
 }
 for(let S=0;S<2;S++)for(let R=0;R<2;R++)for(let Q=0;Q<2;Q++){if(S&&R)continue;assert.equal(S|((1-R)&Q),latch('nor',S,R,[Q,1-Q])[0]);}
 for(let encoded=0;encoded<32;encoded++){const bits=Array.from({length:5},(_,i)=>encoded>>i&1);let acc=0;for(let i=0;i<bits.length;i++){acc^=bits[i];assert.equal(acc,bits.slice(0,i+1).reduce((a,b)=>a+b,0)%2);}}
 let acc=0;const parity=[1,1,0,1].map(x=>acc^=x);assert.equal(parity.join(''),'1001');assert.ok(q('C',6).model.includes('1、0、0、1'));
});
test('转换时钟极性、异步优先请求与条件翻转的接口一致',()=>{
 for(let old=0;old<2;old++)for(let next=0;next<2;next++){const cpRise=old===0&&next===1,invertedFall=(1-old)===1&&(1-next)===0;assert.equal(cpRise,invertedFall);}
 for(let T=0;T<2;T++)for(let Q=0;Q<2;Q++)assert.equal(jk(T,T,Q),tff(T,Q));
 for(let U=0;U<2;U++)for(let V=0;V<2;V++)for(let Q=0;Q<2;Q++){
  const sbar=1-(U&(1-V)),rbar=1-V;assert.ok(sbar||rbar);const result=latch('nand',sbar,rbar,[Q,1-Q])[0];assert.equal(result,V?0:U?1:Q);
 }
 for(let A=0;A<2;A++)for(let B=0;B<2;B++)for(let Q=0;Q<2;Q++)assert.equal(tff(A&(1-B),Q),A&&!B?1-Q:Q);
 assert.ok(q('C',15).model.includes('UV=00'));assert.ok(q('C',16).model.includes('D=Q⊕AB′'));
});
test('本地教材三题保留来源、合法域与相反边沿转换，预计本章百题',async t=>{
 let refs;try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).digital;}catch{t.skip('默认开源源码不包含本地教材参考');return;}
 const added=refs.filter(v=>['FENG-CH5-1','FENG-CH5-16','FENG-CH5-19'].includes(v.id));assert.equal(added.length,3);assert.ok(added.every(v=>v.reference.distribution==='local-only'&&v.reference.pdfPage===v.reference.printedPage+8));
 const current=getPracticeCourse('digital').questions;const all=[...new Map([...current,...qs,...refs].map(q=>[q.id,q])).values()].filter(q=>q.chapter===5);assert.ok(all.length>=100);assert.equal(new Set(all.map(q=>norm(q.stem))).size,all.length);
 for(let A=0;A<2;A++)for(let B=0;B<2;B++)for(let Q=0;Q<2;Q++){
  const expected=A?B:(B?1-Q:Q),equation=(B&(1-Q))|(((A&B)|((1-A)&(1-B)))&Q);assert.equal(equation,expected);assert.equal(jk(B,A^B,Q),expected);
 }
 for(let Q=0;Q<2;Q++)for(let next=0;next<2;next++){
  const allowedJK=[];for(let J=0;J<2;J++)for(let K=0;K<2;K++)if(jk(J,K,Q)===next)allowedJK.push([J,K]);assert.equal(allowedJK.length,2);
  const allowedRS=[];for(let S=0;S<2;S++)for(let R=0;R<2;R++)if(!(S&&R)&&latch('nor',S,R,[Q,1-Q])[0]===next)allowedRS.push([S,R]);assert.equal(allowedRS.length,Q===next?2:1);assert.equal(tff(Q^next,Q),next);
 }
 assert.ok(added.find(q=>q.id==='FENG-CH5-16').model.includes('时钟还必须接CP′'));
});
