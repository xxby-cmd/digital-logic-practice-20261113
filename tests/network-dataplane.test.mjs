import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {networkDataplanePractice} from '../bank-network-dataplane.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade,normalize} from '../grading.js';

const bank=networkDataplanePractice.network;
const q=(tag,n)=>bank.find(q=>q.id===`NDP7-network-4-${tag}-${String(n).padStart(3,'0')}`);
const answer=n=>q('S',n).options[q('S',n).answer];
const oldIds=new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,19,20,21,22,23,24,28,29,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,60,61,62,63,64,65,66,67,68,69,71,72,74,75,76,79,80,83,85,86,87,88,89,92,93,94,95,96,97,98,99,100].map(n=>`P3-network-4-${n}`));
const original82=()=>getPracticeCourse('network').questions.filter(q=>oldIds.has(q.id));
const references=process.env.NETWORK_DATAPLANE_REFERENCES||fileURLToPath(new URL('../../制作记录/并行扩题/计网数据平面/独立参考候选.json',import.meta.url));
const sections=['选择题','填空题','分析题','计算题'];
const counts=rows=>sections.map(section=>rows.filter(q=>q.section===section).length);

test('16原创归数据平面，8选择1填空6分析1计算；与既有82逐题去重',()=>{
 assert.equal(bank.length,16);assert.equal(new Set(bank.map(q=>q.id)).size,16);assert.deepEqual(counts(bank),[8,1,6,1]);
 assert.equal(original82().length,82);assert.deepEqual(counts(original82()),[32,24,13,13]);
 const existing=getPracticeCourse('network').questions.filter(q=>!q.id.startsWith('NDP7-'));
 for(const item of bank){
  assert.equal(item.chapter,4);assert.equal(item.pool,'practice');assert.equal(item.origin,'原创');assert.equal(item.coding,false);
  assert.ok(!item.id.includes('undefined'));assert.ok(item.mechanism.length>=9);assert.ok(item.studyEvidence);assert.equal(item.studyWeight,{core:3,basic:2,supplement:1}[item.studyLevel]);
  assert.ok(!/沿用上一|同上|如前题/.test(item.stem));assert.ok(!existing.some(old=>old.id===item.id||normalize(old.stem)===normalize(item.stem)),item.id);
  if(item.type==='single'){
   assert.equal(item.options.length,4);assert.equal(new Set(item.options.map(normalize)).size,4);
   for(let i=0;i<4;i++)assert.equal(grade(item,i).correct,i===item.answer,item.id);
  }else if(item.type==='fill')assert.equal(grade(item,item.answers.map(xs=>xs[0])).correct,true,item.id);
  else {assert.ok(item.model.length>100);assert.ok(item.rubric.length>=3);}
 }
 assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,16);assert.equal(bank.filter(q=>q.studyLevel==='core').length,11);assert.equal(bank.filter(q=>q.studyLevel==='basic').length,5);
});

test('优先级匹配、并行交换、非抢占与轮询份额按公开条件核答',()=>{
 const packet={dst:'10.1.2.3',protocol:'TCP',port:80};
 const rules=[{name:'甲',priority:100,match:p=>p.dst==='10.1.2.3',out:2},{name:'乙',priority:200,match:p=>p.protocol==='TCP'&&p.port===80,out:3}];
 assert.equal(rules.filter(r=>r.match(packet)).sort((a,b)=>b.priority-a.priority)[0].out,3);assert.ok(answer(1).includes('乙'));
 const compatible=routes=>new Set(routes.map(r=>r[0])).size===routes.length&&new Set(routes.map(r=>r[1])).size===routes.length;
 assert.equal(compatible([['I1','O1'],['I2','O2']]),true);assert.equal(compatible([['I1','O1'],['I2','O1']]),false);assert.ok(answer(2).startsWith('能'));
 const currentlyFinishes=.4,highArrives=0;assert.equal(Math.max(currentlyFinishes,highArrives),.4);assert.ok(answer(3).startsWith('0.4'));
 const select=(high,low)=>high.length?high[0]:low[0];assert.equal(select(['H'],['L']),'H');assert.ok(answer(6).includes('一直等不到'));
 assert.equal(1000/500,2);assert.equal(answer(8),'2:1');assert.equal(grade(q('F',1),[8/2]).correct,true);
 assert.deepEqual([1,2].map(w=>12*w/3),[4,8]);assert.ok(answer(4).includes('A为4、B为8'));
});

test('分片层次、协议映射键及新前缀覆盖分别核对',()=>{
 assert.equal(new Set(['TCP|203.0.113.9|40000','UDP|203.0.113.9|40000']).size,2);assert.ok(answer(5).startsWith('不必然'));
 const tcpHeader=[0,19],secondFragment=[1000,1999];assert.equal(Math.max(tcpHeader[0],secondFragment[0])<=Math.min(tcpHeader[1],secondFragment[1]),false);assert.ok(answer(7).startsWith('不能'));
 const host=70,block=2**(32-26),network=Math.floor(host/block)*block;assert.deepEqual([network,network+block-1],[64,127]);assert.ok(host>=network&&host<network+block);
 assert.equal((12-10)*10,20);
 const wrongMatch=p=>p.src.startsWith('10.2.')&&p.protocol==='TCP'&&p.port===443;
 const fullMatch=p=>p.in===2&&wrongMatch(p);
 const counterexample={in:3,src:'10.2.1.8',protocol:'TCP',port:443};assert.equal(wrongMatch(counterexample),true);assert.equal(fullMatch(counterexample),false);
});

test('有限等待队列逐事件模拟，核对同刻顺序、丢弃和完整发送时间表',()=>{
 const data=q('C',1).verification,waiting=[],service=[],dropped=[];
 let current=null,finish=Infinity;
 const start=(packet,now)=>{current=packet;finish=now+packet.bytes*8*1e6/data.rateBitsPerSecond;service.push([packet.id,now,finish]);};
 for(const packet of data.packets){
  while(current&&finish<=packet.arrivalUs){const now=finish;current=null;finish=Infinity;if(waiting.length)start(waiting.shift(),now);}
  if(!current)start(packet,packet.arrivalUs);
  else if(waiting.length<data.waitingCapacity)waiting.push(packet);
  else dropped.push(packet.id);
 }
 while(current){const now=finish;current=null;finish=Infinity;if(waiting.length)start(waiting.shift(),now);}
 assert.deepEqual(service,data.service);assert.deepEqual(dropped,data.dropped);assert.equal(service.at(-1)[2],3500);
 assert.ok(q('C',1).stem.includes('正在发送的分组不计入'));assert.ok(q('C',1).stem.includes('先完成当前发送'));
 // Independent conservation check: the accepted bytes exactly occupy the link.
 const accepted=data.packets.filter(p=>!dropped.includes(p.id)).reduce((sum,p)=>sum+p.bytes,0);assert.equal(accepted*8*1e6/data.rateBitsPerSecond,3500);
});

test('两份参考独立保留来源；82+16原创+2参考形成100题方案',{
 skip:!existsSync(references)
},()=>{
 const refs=JSON.parse(readFileSync(references,'utf8'));assert.equal(refs.length,2);assert.deepEqual(counts(refs),[0,0,1,1]);
 for(const item of refs){assert.equal(item.origin,'参考题');assert.equal(item.chapter,4);assert.equal(item.reference.distribution,'local-only');assert.equal(item.reference.url,item.source.url);assert.ok(item.reference.page);assert.ok(item.reference.verification);}
 const all=[...original82(),...bank,...refs];assert.equal(all.length,100);assert.deepEqual(counts(all),[40,25,20,15]);assert.equal(new Set(all.map(q=>q.id)).size,100);assert.equal(new Set(all.map(q=>normalize(q.stem))).size,100);
 const nat=refs.find(q=>q.verification?.kind==='nat').verification;
 const outbound={number:2,src:[nat.public.ip,nat.public.port],dst:[nat.server.ip,nat.server.port]};
 const inbound={number:3,src:outbound.dst,dst:outbound.src};
 const delivered={number:4,src:inbound.src,dst:[nat.private.ip,nat.private.port]};assert.deepEqual([outbound,inbound,delivered],nat.packets);
 assert.equal(nat.server.ip,'128.119.40.186');
});
