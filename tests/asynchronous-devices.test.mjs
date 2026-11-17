import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../制作记录/并行扩题/异步与时序设计核验/',import.meta.url);
async function load(t){try{return {questions:JSON.parse(await readFile(new URL('集成与基础候选8题.json',root),'utf8')),data:JSON.parse(await readFile(new URL('器件与基础核验输入.json',root),'utf8'))};}catch(error){if(error.code!=='ENOENT')throw error;t.skip('教材原题、码表和电路网表仅本地保留');return null;}}
const bit=(n,i)=>n>>i&1;
const pack5421=raw=>((raw&1)<<3)|(raw>>1);
const decimal5421=raw=>5*bit(raw,0)+4*bit(raw,3)+2*bit(raw,2)+bit(raw,1);
function clock(type,raw,port){
 if(port==='A')return raw^1;
 const branch=raw>>1;let next;
 if(type==='90'){assert.ok(branch<5);next=(branch+1)%5;}
 else if(type==='92'){assert.ok([0,1,2,4,5,6].includes(branch));const index=((branch>>2)*3+(branch&3)+1)%6;next=(Math.floor(index/3)<<2)+(index%3);}
 else if(type==='93')next=(branch+1)%8;
 else throw Error('未声明器件模型');
 return (next<<1)|(raw&1);
}
function runCounter(config){
 const raw=config.types.map(()=>0);
 const decode=()=>{const L=raw[0],H=raw[1];switch(config.decoder){
  case 'none':return [];
  case 'six90':case 'six93':return (L&6)===6?[0]:[];
  case 'six92':return bit(L,3)?[0]:[];
  case 'eight5421':return (L&7)===7?[0]:[];
  case 'twentySix5421':return pack5421(H)===2&&pack5421(L)===9?[0,1]:[];
  case 'sixtyBCD':return bit(H,3)?[1]:[];
  case 'sixtySixBCD':return H===6&&L===6?[0,1]:(L&10)===10?[0]:[];
  default:throw Error('未声明反馈译码');
 }};
 const value=()=>raw.reduce((sum,r,i)=>sum+10**i*(config.display==='5421'?decimal5421(r):r),0);
 const step=()=>{
  const pending=[config.external],held=new Set(),events=[];
  const propagate=(index,old,next)=>{for(const [from,output,to,port]of config.links)if(from===index&&bit(old,output)===1&&bit(next,output)===0)pending.push([to,port]);};
  let count=0;
  while(pending.length){
   assert.ok(++count<64,'传播未结束，不能给稳定计数');
   const [index,port]=pending.shift();if(held.has(index))continue;
   const old=raw[index],next=clock(config.types[index],old,port);raw[index]=next;events.push({index,port,old,next});
   propagate(index,old,next);
   const resets=decode().filter(i=>!held.has(i));
   for(const i of resets)held.add(i);
   for(const i of resets){const previous=raw[i];raw[i]=0;propagate(i,previous,0);}
  }
  return {value:value(),raw:[...raw],events,held:[...held]};
 };
 return {step,value,raw};
}
test('第三批8题完整且原题数值26/66、图中三输入反馈与初态不误读',async t=>{
 const local=await load(t);if(!local)return;const {questions,data}=local;
 assert.equal(questions.length,8);assert.equal(new Set(questions.map(q=>q.id)).size,8);
 for(const q of questions){assert.equal(q.chapter,7);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.equal(q.reference.pdfPage,q.reference.printedPage+8);assert.ok(q.model.length>100);assert.ok(q.rubric.length>=4);}
 const byId=id=>questions.find(q=>q.id===id);
 assert.ok(byId('FENG-CH7-42').stem.includes('二十六进制'));assert.ok(byId('FENG-CH7-44').stem.includes('六十六进制'));
 assert.ok(byId('FENG-CH7-41').stem.includes('两个清0端都接QAQBQC'));
 for(const id of ['FENG-CH7-41','FENG-CH7-42'])assert.ok(byId(id).stem.includes('双R0同时为1异步清0'));
 assert.equal(data.exerciseTargets['FENG-CH7-42'],26);assert.equal(data.exerciseTargets['FENG-CH7-44'],66);
});
test('T触发器四类目标转移穷举事件/激励，保持允许两种不同机制',async t=>{
 const local=await load(t);if(!local)return;
 for(let Q=0;Q<2;Q++)for(let target=0;target<2;target++){
  const possible=[];for(let C=0;C<2;C++)for(let T=0;T<2;T++)if((C?Q^T:Q)===target)possible.push([C,T]);
  assert.deepEqual(possible,Q===target?[[0,0],[0,1],[1,0]]:[[1,1]]);
  assert.equal(Q^(Q^target),target);assert.equal(Q===target?Q:1-Q,target);
 }
 assert.ok(local.questions.find(q=>q.id==='FENG-CH7-8').stem.includes('不是把时钟脚接恒定高电平'));
});
function settleLatch(initial,X1,X2){
 const todo=[initial],seen=new Set(),ends=new Set();
 while(todo.length){const state=todo.pop();if(seen.has(state))continue;seen.add(state);const a=state>>1,z=state&1,target=2*(X1&(a|X2))+(X1&(z|(a&(1-X2)))),diff=state^target;if(!diff)ends.add(state);for(let i=0;i<2;i++)if(diff&(1<<i))todo.push(state^(1<<i));}
 return ends;
}
test('与非门RS固定点与两个历史状态方程一致，复位不靠默认软件初态',async t=>{
 const local=await load(t);if(!local)return;
 for(let X1=0;X1<2;X1++)for(let X2=0;X2<2;X2++){
  const actual=new Set(),expected=new Set();
  for(let bits=0;bits<16;bits++){
   const a=bit(bits,3),abar=bit(bits,2),z=bit(bits,1),zbar=bit(bits,0),sa=Number(!(X1&&X2)),sz=Number(!(X1&&a&&!X2));
   if(a===Number(!(sa&&abar))&&abar===Number(!(X1&&a))&&z===Number(!(sz&&zbar))&&zbar===Number(!(X1&&z)))actual.add(a*2+z);
  }
  for(let s=0;s<4;s++)if(settleLatch(s,X1,X2).has(s))expected.add(s);
  assert.deepEqual(actual,expected);
 }
 for(let s=0;s<4;s++)assert.deepEqual(settleLatch(s,0,0),new Set([0]));
});
test('基本模式逐输入位路径对边沿记忆规范交叉比较，两条同终值历史输出不同',async t=>{
 const local=await load(t);if(!local)return;
 const check=(input,state,expected,remaining)=>{
  if(!remaining)return;
  for(const nextInput of [input,input^1,input^2]){
   const X1=nextInput>>1,X2=nextInput&1,oldX2=input&1;
   const output=X1===0?0:oldX2===1&&X2===0?1:expected;
   const ends=settleLatch(state,X1,X2);assert.equal(ends.size,1);const next=[...ends][0];assert.equal(next&1,output);
   check(nextInput,next,output,remaining-1);
  }
 };check(0,0,0,9);
 const directly=[...settleLatch(0,1,0)][0];let viaRise=0;for(const input of [1,3,2])viaRise=[...settleLatch(viaRise,input>>1,input&1)][0];
 assert.equal(directly&1,0);assert.equal(viaRise&1,1);
});
test('器件基本计数码序对教材/TI原始表核对，LS92不冒充自然二进制',async t=>{
 const local=await load(t);if(!local)return;const {deviceTables:tables}=local.data;
 for(const [type,key]of [['90','LS90_BCD'],['92','LS92_12'],['93','LS93']]){
  const device=runCounter({types:[type],external:[0,'A'],links:[[0,0,0,'B']],decoder:'none',display:'binary'}),observed=[0];
  for(let i=1;i<tables[key].length;i++)observed.push(device.step().raw[0]);assert.deepEqual(observed,tables[key]);assert.equal(device.step().raw[0],0);
 }
 const reversed=runCounter({types:['90'],external:[0,'B'],links:[[0,3,0,'A']],decoder:'none',display:'5421'}),shown=[0];for(let i=1;i<10;i++)shown.push(pack5421(reversed.step().raw[0]));assert.deepEqual(shown,tables.LS90_5421);
 let branch=0;const out=[];for(let i=0;i<6;i++){out.push(branch>>1);branch=clock('92',branch,'B');}assert.deepEqual(out,tables.LS92_branch6);
 assert.equal(tables.LS92_12[6],8);assert.ok(!tables.LS92_12.includes(6));assert.equal(local.data.sourceAudit.officialCountTablePDFPage,3);
});
test('七个反馈/级联电路逐事件传播对整数模计数oracle，覆盖所有稳定状态',async t=>{
 const local=await load(t);if(!local)return;
 for(const config of local.data.cases){
  const device=runCounter(config),states=new Set([device.raw.join(',')]);assert.equal(device.value(),0);
  for(let n=1;n<=config.target*2;n++){
   const observed=device.step();assert.equal(observed.value,n%config.target,config.name+'第'+n+'拍');
   if(n<config.target)states.add(observed.raw.join(','));
   if(n%config.target===0)assert.ok(observed.raw.every(v=>v===0),config.name);
  }
  assert.equal(states.size,config.target,config.name+'不能只看显示周期而漏内部状态');
 }
});
test('复位引起的落沿会传播，整体复位期间必须覆盖所生成的级联事件',async t=>{
 const local=await load(t);if(!local)return;
 const config=local.data.cases.find(c=>c.decoder==='twentySix5421'),device=runCounter(config);let result;for(let n=1;n<=26;n++)result=device.step();
 assert.deepEqual(result.raw,[0,0]);assert.deepEqual(result.held,[0,1]);
 assert.ok(result.events.some(e=>e.index===0&&e.port==='B'));assert.ok(!result.events.some(e=>e.index===1),'整体清零时，个位QA回落不得让高位在复位后误加一');
 const c60=runCounter(local.data.cases.find(c=>c.decoder==='sixtyBCD'));for(let n=1;n<60;n++)c60.step();const terminal=c60.step();assert.equal(terminal.value,0);assert.ok(terminal.held.includes(1));assert.ok(terminal.events.some(e=>e.index===1&&e.port==='B'&&e.next===8));
});
test('容量上限与可达/稳定状态区别、异步反馈脉宽前提均明确',async t=>{
 const local=await load(t);if(!local)return;
 for(let n=1;n<=8;n++)assert.equal(new Set(Array.from({length:2**n},(_,i)=>i.toString(2).padStart(n,'0'))).size,2**n);
 assert.ok(local.questions.find(q=>q.id==='FENG-CH7-20').model.includes('最多2^n'));
 for(const id of [40,41,42,43,44])assert.ok(local.questions.find(q=>q.id==='FENG-CH7-'+id).stem.includes('复位优先且脉宽足够覆盖相关波纹传播'));
});
