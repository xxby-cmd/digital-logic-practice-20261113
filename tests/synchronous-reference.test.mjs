import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const jk=(j,k,q)=>j?(k?1-q:1):(k?0:q);
test('同步参考JK电路完整八态与最长启动路径逐状态核验',()=>{
 const table=[];
 for(let s=0;s<8;s++){const q2=s>>2,q1=s>>1&1,q0=s&1;const n2=jk(q1,q1,q2),n1=jk(q0,q2|q0,q1),n0=jk(1-(q2&q1),1,q0);table.push(n2*4+n1*2+n0);}
 assert.deepEqual(table,[1,2,7,4,5,6,0,0]);const cycle=new Set([0,1,2,7]);let max=0;
 for(let initial=0;initial<8;initial++){let s=initial,steps=0;while(!cycle.has(s)&&steps<9){s=table[s];steps++;}assert.ok(cycle.has(s));max=Math.max(max,steps);}assert.equal(max,4);
});
test('1001与1101允许重叠检测的完整输入串与滑窗独立比较',()=>{
 const machines={
  '1001':[[[0,0],[1,0]],[[2,0],[1,0]],[[3,0],[1,0]],[[0,0],[1,1]]],
  '1101':[[[0,0],[1,0]],[[0,0],[2,0]],[[3,0],[2,0]],[[0,0],[1,1]]]
 };
 for(const [pattern,table]of Object.entries(machines))for(let n=0;n<=10;n++)for(let value=0;value<2**n;value++){
  const input=n?value.toString(2).padStart(n,'0'):'';let state=0;
  for(let i=0;i<input.length;i++){const [next,z]=table[state][Number(input[i])];assert.equal(z,Number(i>=3&&input.slice(i-3,i+1)===pattern));state=next;}
 }
});
test('六状态Mealy表以无限后续行为的有限对积图核等价类和最简性',()=>{
 const table={A:[['E',0],['B',0]],B:[['A',0],['D',1]],C:[['F',0],['D',0]],D:[['A',0],['B',1]],E:[['C',0],['A',0]],F:[['A',0],['C',0]]};
 function equivalent(a,b){const seen=new Set(),queue=[[a,b]];while(queue.length){const [s,t]=queue.pop(),key=s+t;if(seen.has(key))continue;seen.add(key);for(let x=0;x<2;x++){if(table[s][x][1]!==table[t][x][1])return false;queue.push([table[s][x][0],table[t][x][0]]);}}return true;}
 const pairs=[];for(const a of Object.keys(table))for(const b of Object.keys(table))if(a<b&&equivalent(a,b))pairs.push(a+b);assert.deepEqual(pairs,['AC','BD','EF']);
 const output=(s,input)=>{let result='';for(const x of input){const [next,z]=table[s][Number(x)];result+=z;s=next;}return result;};assert.equal(output('A','11'),'01');assert.equal(output('E','11'),'00');
});
test('JK和T两种实现覆盖同一合法表，并分别核实际非法态补全',()=>{
 for(let x=0;x<2;x++)for(let s=0;s<4;s++){
  const q1=s>>1,q0=s&1,nj=2*jk(x&q0,1-x,q1)+jk(x&(1-q1),1,q0),nt=2*(q1^(((1-x)&q1)|(x&q0)))+(q0^(q0|(x&(1-q1))));
  if(s!==3){const expected=x?[1,2,2][s]:0;assert.equal(nj,expected);assert.equal(nt,expected);}else{assert.equal(nj,x?2:0);assert.equal(nt,0);}
  const y=x&q1&(1-q0);assert.equal(y,Number(x===1&&s===2));
 }
});
test('六进制D计数器全部八态、终端进位与一拍自启动逐项核验',()=>{
 const table=[];for(let s=0;s<8;s++){const q2=s>>2,q1=s>>1&1,q0=s&1,d0=1-q0,d1=(1-q2)&(q1^q0),d2=(q2&(1-q0))|(q1&q0);table.push(4*d2+2*d1+d0);assert.equal(q2&(1-q1)&q0,Number(s===5));}assert.deepEqual(table,[1,2,3,4,5,0,5,4]);
});
test('六道参考题只在仓库外本地库中，来源和完整必要条件保留',async t=>{
 let data;try{data=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8'));}catch{t.skip('默认源码不附本地参考库');return;}
 const q=data.digital.filter(q=>q.id==='WHU-HW06-1'||/^WHU-HW07-[1-5]$/.test(q.id));assert.equal(q.length,6);assert.ok(q.every(q=>q.chapter===6&&q.pool==='practice'&&q.reference.distribution==='local-only'));
 assert.ok(q.find(q=>q.id==='WHU-HW06-1').model.includes('至多4个沿'));assert.ok(q.find(q=>q.id==='WHU-HW07-1').stem.includes('允许重叠'));assert.ok(q.find(q=>q.id==='WHU-HW07-2').model.includes('输出分别01、00'));
});
