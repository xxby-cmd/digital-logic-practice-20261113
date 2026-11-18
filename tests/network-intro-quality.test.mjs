import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createContext,Script} from 'node:vm';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const sha=x=>createHash('sha256').update(x).digest('hex');
const observations=[];
let delivery;
async function actualDelivery(){
 if(delivery)return delivery;
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert.ok(script,'必须核对既有实际HTML');
 const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',dataset:{},addEventListener(){}});return nodes.get(key);};
 const context=createContext({document:{title:'',querySelector:node,querySelectorAll:()=>[]},window:{addEventListener(){}},location:{hash:'#/subjects'},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout});
 new Script(script.replace(/\}\)\(\);\s*$/,'globalThis.introAudit=bundledModules;})();')).runInContext(context);
 delivery={sha256:sha(html),questions:context.introAudit['practice-library.js'].getPracticeCourse('network').questions};return delivery;
}
async function current(id,stemPattern,type='fill'){
 const q=getPracticeCourse('network').questions.find(q=>q.id===id);assert.ok(q,id+'必须存在于当前练习题库');
 assert.equal(q.chapter,1);assert.equal(q.type,type);assert.equal(q.revision??1,1,'改题后应重新核定本oracle语义');
 const match=q.stem.match(stemPattern);assert.ok(match,id+'题干条件/格式已变，不可沿用旧常量');
 const published=(await actualDelivery()).questions.find(x=>x.id===id);assert.ok(published,id+'必须接入实际HTML');
 assert.equal(JSON.stringify(published),JSON.stringify(q),id+'源码与实际HTML的完整题目字段必须相同');
 return {q,m:match};
}
function accept(q,answers,inputs,derivation){
 // Oracle inputs contain only parsed stem values. Public answer/answers/model
 // are never used to calculate the expected result.
 const result=grade(q,answers);assert.equal(result.correct,true,q.id+'公开答案必须接受独算结果');
 observations.push({id:q.id,revision:q.revision??1,questionSha256:sha(JSON.stringify(q)),inputs,derivation,computedAnswer:answers,acceptedByGrade:result.correct,sourceEqualsActualHtml:true});
}
function fill(suffix,label,pattern,compute){
 test('网络第1章当前题 '+suffix+'：'+label,async()=>{
  const {q,m}=await current('P3-network-1-'+suffix,pattern);const {answer,inputs,derivation}=compute(m);
  accept(q,[String(answer)],inputs,derivation);
 });
}
const decimal=x=>{const [integer,fraction='']=x.split('.');return {n:BigInt(integer+fraction),d:10n**BigInt(fraction.length)};};
function finiteDecimal(n,d){
 let result=String(n/d),r=n%d;if(!r)return result;result+='.';
 for(let i=0;r&&i<30;i++){r*=10n;result+=String(r/d);r%=d;}
 assert.equal(r,0n,'本测试只接受能精确表示的有限小数');return result;
}

test('网络第1章当前题1-01：传播不变、逐比特序列化提速',async()=>{
 const pattern=/^一条点到点链路长(\d+) km，信号传播速度(\d+)×10⁸ m\/s，发送速率(\d+) Mb\/s。忽略排队与处理时延，一份长度(\d+) B的分组从首比特开始发送到末比特到达接收端需要([\d.]+) ms。若只将发送速率提高到(\d+) Mb\/s，该时间变为（ ）。$/;
 const {q,m}=await current('1-01',pattern,'single');const [km,factor,oldMbps,bytes,oldMeasuredMs,newMbps]=m.slice(1).map(Number);
 const propagationMs=km*1000/(factor*1e8)*1000,oldSerializationMs=bytes*8/(oldMbps*1e6)*1000,newSerializationMs=bytes*8/(newMbps*1e6)*1000;
 assert.equal(propagationMs+oldSerializationMs,oldMeasuredMs,'题干提供的原始观测也须自洽');
 const resultMs=propagationMs+newSerializationMs,parsedOptions=q.options.map(option=>{const p=option.match(/^([\d.]+) ms$/);assert.ok(p,'选项单位/语义改变');return Number(p[1]);});
 const matches=parsedOptions.flatMap((value,i)=>Math.abs(value-resultMs)<1e-12?[i]:[]);assert.equal(matches.length,1,'必须只有一个时间选项吻合');
 accept(q,matches[0],{km,speed:factor*1e8,oldMbps,bytes,newMbps},{propagationMs,oldSerializationMs,newSerializationMs,resultMs,parsedOptions});
});
fill(43,'逐层长度账本',/^一份应用数据(\d+)B，逐层增加传输首部(\d+)B、网络首部(\d+)B、链路首尾(\d+)B，不计其他开销，帧为____B。$/,m=>{
 const fields=m.slice(1).map(Number);const offsets=[0];for(const bytes of fields)offsets.push(offsets.at(-1)+bytes);
 return {answer:offsets.at(-1),inputs:{fields},derivation:{offsets}};
});
fill(44,'构造链形路径再排除端点',/^一条路径有(\d+)条链路，两端主机之外的中间串联节点为____个（简单链形路径）。$/,m=>{
 const links=Number(m[1]),nodes=[0];for(let edge=0;edge<links;edge++)nodes.push(edge+1);
 return {answer:nodes.slice(1,-1).length,inputs:{links},derivation:{nodes,internalNodes:nodes.slice(1,-1)}};
});
fill(45,'枚举无向端点对',/^无向简单全互连网络有(\d+)个节点，需要____条点到点链路。$/,m=>{
 const n=Number(m[1]),pairs=[];for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)pairs.push([a,b]);
 return {answer:pairs.length,inputs:{n},derivation:{pairs}};
});
fill(46,'每次添一个未连接顶点构造树',/^(\d+)个节点组成连通树，链路数为____。$/,m=>{
 const n=Number(m[1]),edges=[];for(let vertex=1;vertex<n;vertex++)edges.push([Math.floor((vertex-1)/2),vertex]);
 const seen=new Set([0]);for(const [parent,child] of edges){assert.ok(seen.has(parent));assert.ok(!seen.has(child));seen.add(child);}assert.equal(seen.size,n);
 return {answer:edges.length,inputs:{n},derivation:{edges,construction:'每步只接入一个新顶点，因此连通且不产生环'}};
});
fill(47,'逐次指示变量期望的精确相加',/^(\d+)次独立同分布传送中丢包率为([\d.]+)，期望丢包数为____。$/,m=>{
 const count=Number(m[1]),p=decimal(m[2]);let numerator=0n;for(let i=0;i<count;i++)numerator+=p.n;
 return {answer:finiteDecimal(numerator,p.d),inputs:{count,probability:m[2]},derivation:{summedNumerator:String(numerator),denominator:String(p.d)}};
});
fill(48,'四类时延用精确分数求和',/^某包处理、排队、发送、传播分别([\d.]+)、([\d.]+)、([\d.]+)、([\d.]+)ms，总节点\/链路时延为____ms。$/,m=>{
 const terms=m.slice(1).map(decimal),denominator=terms.reduce((d,t)=>d*t.d,1n),numerator=terms.reduce((n,t)=>n+t.n*(denominator/t.d),0n);
 return {answer:finiteDecimal(numerator,denominator),inputs:{delaysMs:m.slice(1)},derivation:{numerator:String(numerator),denominator:String(denominator)}};
});
fill(49,'由串联每段约束逐次收紧可行速率',/^三段链路可用速率为(\d+)、(\d+)、(\d+)Mb\/s，忽略其他限制，持续流的理想瓶颈速率为____Mb\/s。$/,m=>{
 const rates=m.slice(1).map(Number),feasible=[];for(let r=0;r<=Math.max(...rates);r++)if(rates.every(capacity=>r<=capacity))feasible.push(r);
 return {answer:feasible.at(-1),inputs:{rates},derivation:{feasibleWholeMbps:feasible}};
});
fill(50,'十进制应用字节量除观测时间',/^一分钟内应用成功接收(\d+)MB，十进制计量，平均有效吞吐率为____Mb\/s。$/,m=>{
 const megabytes=Number(m[1]),bits=megabytes*1e6*8,seconds=60;
 return {answer:bits/seconds/1e6,inputs:{megabytes,seconds},derivation:{bits,bitPerSecond:bits/seconds}};
});
fill(51,'载荷字节逐个计数占比',/^一个包总长(\d+)B，其中上层有效信息(\d+)B，有效比例为____%。$/,m=>{
 const total=Number(m[1]),payload=Number(m[2]);assert.ok(payload<=total);let valid=0;for(let i=0;i<total;i++)if(i<payload)valid++;
 return {answer:valid*100/total,inputs:{total,payload},derivation:{validBytes:valid,allBytes:total}};
});
fill(53,'探测未响应计数口径',/^实验发送(\d+)个探测，收到(\d+)个响应，按未响应当丢失的粗略口径，未响应率为____%。$/,m=>{
 const sent=Number(m[1]),received=Number(m[2]);assert.ok(received<=sent);const missing=sent-received;
 return {answer:missing*100/sent,inputs:{sent,received},derivation:{missing,interpretation:'只核未响应比例，不声称真实单向丢包率'}};
});
fill(54,'对称双程分解',/^一次测量RTT为(\d+)ms，若明确假设路径对称且处理、排队忽略，单向传播为____ms。$/,m=>{
 const roundTripMs=Number(m[1]),oneWayMs=roundTripMs/2;
 return {answer:oneWayMs,inputs:{roundTripMs,symmetric:true,processingAndQueueIgnored:true},derivation:{outboundMs:oneWayMs,inboundMs:oneWayMs}};
});
fill(55,'按包数累加到达比特',/^每秒到达(\d+)个平均长度(\d+)bit的包，平均输入负载为____Mb\/s。$/,m=>{
 const packetsPerSecond=Number(m[1]),bitsPerPacket=Number(m[2]);let offeredBits=0;for(let i=0;i<packetsPerSecond;i++)offeredBits+=bitsPerPacket;
 return {answer:offeredBits/1e6,inputs:{packetsPerSecond,bitsPerPacket},derivation:{offeredBitsInOneSecond:offeredBits}};
});
fill(56,'输入工作量与服务能力之比',/^出口容量(\d+)Mb\/s，输入负载(\d+)Mb\/s，简化平均利用率为____%。$/,m=>{
 const capacityMbps=Number(m[1]),offeredMbps=Number(m[2]);assert.ok(offeredMbps<=capacityMbps);
 return {answer:offeredMbps*100/capacityMbps,inputs:{capacityMbps,offeredMbps},derivation:{busyFraction:offeredMbps/capacityMbps}};
});
fill(57,'按可用小时占观察小时核比例',/^某网络在(\d+)小时观察中停用(\d+)小时，按时间比例的可用率为____%。$/,m=>{
 const observedHours=Number(m[1]),downHours=Number(m[2]);assert.ok(downHours<=observedHours);const upHours=observedHours-downHours;
 return {answer:upHours*100/observedHours,inputs:{observedHours,downHours},derivation:{upHours}};
});
fill(58,'串行依赖时刻模拟',/^一个发送任务需先完成(\d+)个串行交互，每次等待(\d+)ms，忽略其他时间，总等待____ms。$/,m=>{
 const count=Number(m[1]),perInteractionMs=Number(m[2]),completedAt=[];let now=0;for(let i=0;i<count;i++){now+=perInteractionMs;completedAt.push(now);}
 return {answer:now,inputs:{count,perInteractionMs},derivation:{completedAt}};
});
fill(59,'等待并行完成事件全到齐',/^三个相互独立任务同时开始，完成耗时(\d+)、(\d+)、(\d+)ms，等待三者全部完成需____ms。$/,m=>{
 const durationsMs=m.slice(1).map(Number),events=durationsMs.map((time,index)=>({time,index})).sort((a,b)=>a.time-b.time);const done=new Set();let finish=0;for(const event of events){done.add(event.index);if(done.size===durationsMs.length)finish=event.time;}
 return {answer:finish,inputs:{durationsMs},derivation:{events}};
});
fill(60,'固定两份均分的守恒',/^一条(\d+)Mb\/s链路向两个持续流固定均分，理想各分____Mb\/s。$/,m=>{
 const capacityMbps=Number(m[1]),each=capacityMbps/2;assert.equal(each+each,capacityMbps);
 return {answer:each,inputs:{capacityMbps,flows:2},derivation:{shares:[each,each]}};
});
fill(62,'固定等待占整体时间',/^传输完成时间为([\d.]+)s，其中握手等固定开销([\d.]+)s，固定开销占比为____%。$/,m=>{
 const total=decimal(m[1]),fixed=decimal(m[2]),numerator=fixed.n*total.d*100n,denominator=fixed.d*total.n;
 return {answer:finiteDecimal(numerator,denominator),inputs:{totalSeconds:m[1],fixedSeconds:m[2]},derivation:{percentageNumerator:String(numerator),denominator:String(denominator)}};
});
fill(63,'相同十进制前缀下的字节/比特比',/^在既有测量中将(\d+)MB误当(\d+)Mbit，会把同一数据量低估为实际的____分之一。$/,m=>{
 const actualMegabytes=Number(m[1]),mistakenMegabits=Number(m[2]),actualBits=actualMegabytes*1e6*8,mistakenBits=mistakenMegabits*1e6;
 return {answer:actualBits/mistakenBits,inputs:{actualMegabytes,mistakenMegabits},derivation:{actualBits,mistakenBits}};
});
fill(65,'独立两次重试失败的精确联合事件',/^单次丢失概率([\d.]+)，重复一次且两次独立，二次都丢失概率为____（写小数）。$/,m=>{
 const p=decimal(m[1]),numerator=p.n*p.n,denominator=p.d*p.d;
 return {answer:finiteDecimal(numerator,denominator),inputs:{lossProbability:m[1],independentAttempts:2},derivation:{jointFailureNumerator:String(numerator),denominator:String(denominator)}};
});

test.after(async()=>{
 if(process.env.NETWORK_INTRO_ORACLE_REPORT)await writeFile(process.env.NETWORK_INTRO_ORACLE_REPORT,JSON.stringify({at:new Date().toISOString(),actualHtmlSha256:delivery?.sha256,expectedCases:21,observedCases:observations.length,scope:'只核当前已接入的21道未变题；逐题严格解析条件，独立运算，再以grade核公开答案。尚未接入的修订候选不计入本测试的现题通过数。',observations},null,2)+'\n');
});
