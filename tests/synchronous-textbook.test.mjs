import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const jk=(j,k,q)=>j?(k?1-q:1):(k?0:q);
const bit=(value,index)=>value>>index&1;
function enters(start,step,valid){let q=start;for(let t=0;t<=8;t++){if(valid.has(q))return t;q=step(q);}return Infinity;}

test('流水线总时长和串行加法器由独立时间线/整数加法核验',()=>{
 const finish=Array.from({length:20},(_,i)=>(i+5));assert.equal(finish.at(-1),24);assert.equal(20*5,100);assert.equal(100/24,25/6);
 for(let a=0;a<16;a++)for(let b=0;b<16;b++){
  let carry=0,sum=0;for(let i=0;i<4;i++){const x=bit(a,i),y=bit(b,i),s=x^y^carry;sum|=s<<i;carry=(x&y)|((x^y)&carry);}assert.equal(sum+carry*16,a+b);
 }
});
test('非重叠101状态机与贪心不复用输入位的匹配结果交叉核验',()=>{
 const transition=[[[0,0],[1,0]],[[2,0],[1,0]],[[0,0],[0,1]]];
 for(let n=0;n<=10;n++)for(let value=0;value<2**n;value++){
  const input=n?value.toString(2).padStart(n,'0'):'',expected=Array(n).fill(0);for(let i=0;i+2<n;){if(input.slice(i,i+3)==='101'){expected[i+2]=1;i+=3;}else i++;}
  let state=0;const result=[];for(const x of input){const [next,z]=transition[state][Number(x)];state=next;result.push(z);}assert.deepEqual(result,expected);
 }
});
test('售货机余额、出货和找零按真实金额与译码逻辑独立核验',()=>{
 for(let s=0;s<4;s++)for(let coin=0;coin<3;coin++){
  const p0=Number(s===0),p1=Number(s===1),p2=Number(s===2),H=Number(coin===1),U=Number(coin===2),E=H|U;
  const n1=(p0&U)|(p1&H)|(p2&(1-E)),n0=(p0&H)|(p1&(1-E)),Y=(p1&U)|(p2&E),Z=p2&U;
  const total=s+coin,expected=s===3?[0,0,0]:[total>=3?0:total,Number(total>=3),Number(total===4)];assert.deepEqual([n1*2+n0,Y,Z],expected);
 }
});
test('模7JK、变模D、四位T和格雷码计数驱动全状态核验',()=>{
 const seven=[];for(let q=0;q<8;q++){const a=bit(q,2),b=bit(q,1),c=bit(q,0);seven.push(4*jk(b&c,b,a)+2*jk(c,a|c,b)+jk(1-(a&b),1,c));}assert.deepEqual(seven,[1,2,3,4,5,6,0,0]);
 for(let M=0;M<2;M++)for(let q=0;q<4;q++){const q1=q>>1,q0=q&1,n0=(1-q0)&((1-M)|(1-q1)),n1=((1-q1)&q0)|((1-M)&q1&(1-q0)),z=q1&(M^q0);assert.equal(n1*2+n0,M?(q<2?q+1:0):(q+1)%4);assert.equal(z,Number(M?q===2:q===3));}
 for(let q=0;q<16;q++){let next=0;for(let i=0;i<4;i++){const toggle=Number((q&((1<<i)-1))===(1<<i)-1);next|=(bit(q,i)^toggle)<<i;}assert.equal(next,(q+1)%16);}
 const sequence=[0,1,3,2,6,7,5,4];for(let i=0;i<sequence.length;i++){const q=sequence[i],a=bit(q,2),b=bit(q,1),c=bit(q,0),n2=(a&c)|(b&(1-c)),n1=((1-a)&c)|(b&(1-c)),n0=((1-a)&(1-b))|(a&b),next=4*n2+2*n1+n0;assert.equal(next,sequence[(i+1)%8]);const diff=q^next;assert.ok(diff!==0&&(diff&(diff-1))===0);}
});
test('只改首级反馈的环形/扭环形自启动不漏任何非法态',()=>{
 const ring=q=>{const a=bit(q,2),b=bit(q,1);return 4*Number(!(a||b))+2*a+b;},johnson=q=>{const a=bit(q,2),b=bit(q,1),c=bit(q,0);return 4*((1-c)&(a|(1-b)))+2*a+b;};
 const rings=new Set([4,2,1]),johnsons=new Set([0,4,6,7,3,1]);
 for(let q=0;q<8;q++){assert.ok(enters(q,ring,rings)<=2);assert.ok(enters(q,johnson,johnsons)<=2);if(rings.has(q))assert.equal(ring(q),((q&1)<<2)|(q>>1));if(johnsons.has(q))assert.equal(johnson(q),((1-(q&1))<<2)|(q>>1));}
 assert.equal(johnson(2),1);assert.equal(johnson(5),2);assert.equal(ring(0),4);
});

function partitionByRefinement(table){
 const states=Object.keys(table);let group=Object.fromEntries(states.map(s=>[s,table[s].map(t=>t[1]).join(',')]));
 while(true){const signatures=states.map(s=>[s,JSON.stringify([table[s].map(t=>t[1]),table[s].map(t=>group[t[0]])])]);const keys=[...new Set(signatures.map(t=>t[1]))];const next=Object.fromEntries(signatures.map(([s,v])=>[s,keys.indexOf(v)]));const stable=states.every(a=>states.every(b=>(group[a]===group[b])===(next[a]===next[b])));group=next;if(stable)break;}
 return [...new Set(Object.values(group))].map(g=>states.filter(s=>group[s]===g));
}
function equivalent(table,a,b){const seen=new Set(),todo=[[a,b]];while(todo.length){const [s,t]=todo.pop(),key=s+','+t;if(seen.has(key))continue;seen.add(key);for(let x=0;x<2;x++){if(table[s][x][1]!==table[t][x][1])return false;todo.push([table[s][x][0],table[t][x][0]]);}}return true;}
test('教材四张状态表分别用稳定划分和对积图独立核验',{timeout:2000},async t=>{
 let tables;try{tables=JSON.parse(await readFile(new URL('../../制作记录/并行扩题/同步时序核验/教材状态表转录.json',import.meta.url),'utf8'));}catch{t.skip('原题状态表只留本地，不随源码分发');return;}
 // 原页双层核验锚点：E行X=1为C/0，F行才为C/1。
 assert.deepEqual(tables['26b']['E'][1],['C',0]);assert.deepEqual(tables['26b']['F'][1],['C',1]);
 assert.equal(equivalent(tables['26b'],'E','D'),true);
 assert.equal(equivalent(tables['26b'],'E','B'),false);
 assert.equal(equivalent(tables['26b'],'E','F'),false);
 assert.notEqual(tables['26b']['E'][1][1],tables['26b']['B'][1][1]);
 const expected={'25a':[['A','F'],['B','E'],['C'],['D'],['G']],'25b':[['A','G'],['B'],['C','F'],['D'],['E']],'26a':[['A','E'],['B'],['C'],['D'],['F'],['G']],'26b':[['A'],['B','F'],['C'],['D','E']]};
 for(const [name,table]of Object.entries(tables)){
  const result=partitionByRefinement(table);assert.deepEqual(result,expected[name]);
  for(const a of Object.keys(table))for(const b of Object.keys(table))assert.equal(equivalent(table,a,b),result.some(g=>g.includes(a)&&g.includes(b)));
 }
 const audit=JSON.parse(await readFile(new URL('../../制作记录/并行扩题/同步时序核验/转录错误修正_6.26b.json',import.meta.url),'utf8'));
 const original=tables['26b'];
 for(const [representative,members]of Object.entries(audit.correctClasses))for(const state of members)for(let x=0;x<2;x++){
  const [next,output]=original[state][x];
  const nextGroup=Object.entries(audit.correctClasses).find(([,group])=>group.includes(next))[0];
  assert.deepEqual([nextGroup,output],audit.correctQuotient[representative][x]);
 }
});
test('教材候选独立可读、保留本地来源，与当前参考题无重号',async t=>{
 let candidates,verified;try{candidates=JSON.parse(await readFile(new URL('../../制作记录/并行扩题/同步时序核验/教材候选14题.json',import.meta.url),'utf8'));verified=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).digital;}catch{t.skip('本地参考材料不在源码分发范围');return;}
 assert.equal(candidates.length,14);assert.equal(new Set(candidates.map(q=>q.id)).size,14);
 for(const q of candidates){assert.equal(q.chapter,6);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.equal(q.reference.pdfPage,q.reference.printedPage+8);assert.ok(q.model.length>100&&q.rubric.length>=3);assert.ok(!q.stem.includes('上一题'));const same=verified.filter(v=>v.id===q.id);assert.ok(same.length<=1);}
 const corrected=candidates.find(q=>q.id==='FENG-CH6-26');assert.equal(corrected.revision,2);
 assert.ok(corrected.stem.includes('E:(E/0,C/0)'));assert.ok(corrected.walkthrough.steps.some(s=>s.includes('{B,F}')&&s.includes('{D,E}')));
 assert.ok(corrected.walkthrough.trap.includes('输出'));
});
