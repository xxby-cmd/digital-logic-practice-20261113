import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {networkControlPractice} from '../bank-network-control.js';
import {getPracticeCourse} from '../practice-library.js';
import {examBlueprints} from '../exam-bank.js';
import {grade,normalize} from '../grading.js';

const bank=networkControlPractice.network;
const id=(tag,n)=>`NC7-network-control-${tag}-${String(n).padStart(3,'0')}`;
const q=(tag,n)=>bank.find(x=>x.id===id(tag,n));
const calc=n=>q('C',n).verification;
const referencePath=process.env.NETWORK_CONTROL_REFERENCES||fileURLToPath(new URL('../../制作记录/并行扩题/计网控制平面/独立参考候选.json',import.meta.url));
const base=()=>getPracticeCourse('network').questions.filter(q=>q.chapter==='control'&&!q.id.startsWith('NC7-')&&!q.id.startsWith('REF-NC-'));

function adjacency(vertices,edges,directed=false){
 const g=new Map(vertices.map(v=>[v,[]]));
 for(const [a,b,w=1]of edges){g.get(a).push([b,w]);if(!directed)g.get(b).push([a,w]);}
 return g;
}
function floyd(vertices,edges,directed=false){
 const d=vertices.map((_,i)=>vertices.map((_,j)=>i===j?0:Infinity));
 for(const [a,b,w=1]of edges){const i=vertices.indexOf(a),j=vertices.indexOf(b);d[i][j]=Math.min(d[i][j],w);if(!directed)d[j][i]=Math.min(d[j][i],w);}
 for(let k=0;k<vertices.length;k++)for(let i=0;i<vertices.length;i++)for(let j=0;j<vertices.length;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
 return d;
}
// Enumerating paths is independent of greedy settlement and DV recurrences.
function pathCosts(vertices,edges,source,maxEdges=vertices.length-1,{directed=false,walks=false}={}){
 const g=adjacency(vertices,edges,directed),best=new Map(vertices.map(v=>[v,Infinity]));
 function visit(v,cost,path){best.set(v,Math.min(best.get(v),cost));if(path.length-1===maxEdges)return;
  for(const [to,w]of g.get(v))if(walks||!path.includes(to))visit(to,cost+w,[...path,to]);
 }
 visit(source,0,[source]);return vertices.map(v=>best.get(v));
}
function dijkstra(vertices,edges,source){
 const g=adjacency(vertices,edges),distance=new Map(vertices.map(v=>[v,Infinity])),previous=new Map(),settled=[],steps=[];
 distance.set(source,0);
 while(settled.length<vertices.length){
  const next=vertices.filter(v=>!settled.includes(v)).sort((a,b)=>distance.get(a)-distance.get(b)||a.localeCompare(b))[0];
  if(!Number.isFinite(distance.get(next)))break;settled.push(next);
  for(const [to,w]of g.get(next))if(!settled.includes(to)&&distance.get(next)+w<distance.get(to)){distance.set(to,distance.get(next)+w);previous.set(to,next);}
  steps.push({settled:[...settled],distances:vertices.map(v=>Number.isFinite(distance.get(v))?distance.get(v):null),previous:vertices.map(v=>previous.get(v)??null)});
 }
 const firstHop=target=>{if(!Number.isFinite(distance.get(target)))return null;let v=target;while(previous.get(v)!==source){v=previous.get(v);if(v===undefined)return null;}return v;};
 return {distances:vertices.map(v=>distance.get(v)),order:settled,firstHop,steps};
}
function trace(table,start,destination){const path=[start];let v=start;while(v!==destination){v=table[v];if(v===undefined)return path;path.push(v);if(path.slice(0,-1).includes(v))return path;}return path;}
const nullInfinity=row=>row.map(v=>v===null?Infinity:v);

test('77原创独立归control，32选择19填空14分析12计算，非编程提交',()=>{
 assert.equal(bank.length,77);assert.equal(new Set(bank.map(q=>q.id)).size,77);
 assert.deepEqual(['选择题','填空题','分析题','计算题'].map(s=>bank.filter(q=>q.section===s).length),[32,19,14,12]);
 assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,77);
 const existing=getPracticeCourse('network').questions.filter(q=>!q.id.startsWith('NC7-'));
 for(const question of bank){
  assert.equal(question.chapter,'control');assert.equal(question.pool,'practice');assert.equal(question.origin,'原创');assert.equal(question.coding,false);
  assert.ok(!question.id.includes('undefined'),question.id);assert.ok(question.mechanism.length>=7,question.id);
  assert.ok(question.studyEvidence);assert.equal(question.studyWeight,{core:3,basic:2,supplement:1}[question.studyLevel]);
  assert.ok(!/沿用上一|同上|如前题/.test(question.stem));assert.ok(!existing.some(old=>old.id===question.id||normalize(old.stem)===normalize(question.stem)),question.id);
  if(question.type==='single'){
   assert.equal(question.options.length,4);assert.equal(new Set(question.options.map(normalize)).size,4,question.id);
   for(let i=0;i<4;i++)assert.equal(grade(question,i).correct,i===question.answer,question.id);
  }else if(question.type==='fill'){
   const answer=question.answers.map(xs=>xs[0]);assert.equal(grade(question,answer).correct,true,question.id);
   question.answers.forEach((xs,i)=>{for(const value of xs){const alternate=[...answer];alternate[i]=value;assert.equal(grade(question,alternate).correct,true,question.id);}});
  }else{assert.ok(question.model.length>70,question.id);assert.ok(question.rubric.length>=3,question.id);}
 }
 assert.equal(bank.filter(q=>q.studyLevel==='core').length,50);assert.equal(bank.filter(q=>q.studyLevel==='basic').length,27);
 assert.equal(new Set(bank.filter(q=>q.verification).map(q=>q.verification.kind)).size,12);
});

test('断链与出口变化：Floyd、路径枚举和定点算法分别核对',()=>{
 const a=calc(1),after=a.edges.filter(([x,y])=>![x,y].every(v=>a.removed.includes(v)));
 for(const [edges,expected,next]of [[a.edges,a.before,a.nextBefore],[after,a.after,a.nextAfter]]){
  assert.deepEqual(floyd(a.vertices,edges)[0],expected);assert.deepEqual(pathCosts(a.vertices,edges,'A'),expected);
  const result=dijkstra(a.vertices,edges,'A');assert.deepEqual(result.distances,expected);assert.deepEqual(a.vertices.slice(1).map(v=>result.firstHop(v)),next);
 }
 const b=calc(6),modified=b.edges.map(e=>e[0]===b.changed[0]&&e[1]===b.changed[1]?b.changed:e);
 for(const [edges,expected]of [[b.edges,b.costs[0]],[modified,b.costs[1]]]){
  const distances=floyd(b.vertices,edges)[0];assert.deepEqual([distances[3],distances[4]],expected);assert.deepEqual(pathCosts(b.vertices,edges,'H'),distances);
 }
 assert.deepEqual(b.costs.map(cost=>cost[0]<cost[1]?'E1':'E2'),b.selected);
 assert.equal(q('S',1).options[q('S',1).answer],[Math.min(7,2+3),Math.min(9,2+4)].join('、'));
 assert.deepEqual(floyd(['A','B','C'],[['A','B',0],['B','C',2],['A','C',5]])[0],[0,0,2]);
 assert.deepEqual(pathCosts(['A','B','C'],[['A','B',2],['A','C',5],['C','B',-4]],'A',2,{directed:true}),[0,1,5]);
 for(const synonym of ['∞','无穷大','无穷','INF','inf','infinity','不可达'])assert.equal(grade(q('F',19),[5,synonym]).correct,true,synonym);
});

test('DV传播轮由有界游走独立核对；坏消息按给定事件顺序展开',()=>{
 const x=calc(2);
 x.rounds.forEach((expected,r)=>assert.deepEqual(pathCosts(x.vertices,x.edges,x.source,r+1,{walks:true}),nullInfinity(expected)));
 const y=calc(3),state=[...y.initial],log=[];
 for(let event=1;event<=y.events;event++){const who=(event-1)%2;state[who]=Math.min(y.cap,state[1-who]+1);log.push([event,...state]);}
 for(const row of y.snapshots)assert.deepEqual(log[row[0]-1],row);
 assert.equal(log.findIndex(([,x,y])=>x===16&&y===16)+1,15);
 assert.deepEqual(log.slice(0,3),[[1,3,2],[2,3,4],[3,5,4]]);
});

test('RIP保留未列项，处理同源变差、严格更优、并列与不可达',()=>{
 const x=calc(4),table=new Map(x.old.map(([name,distance,next])=>[name,{distance,next}]));
 for(const [name,distance]of x.advert){const old=table.get(name),candidate=Math.min(16,1+distance);
  if(!old||old.next==='V'||candidate<old.distance)table.set(name,{distance:candidate,next:candidate===16?null:'V'});
 }
 assert.deepEqual([...table].sort(([a],[b])=>a.localeCompare(b)).map(([name,{distance,next}])=>[name,distance,next]),x.expected);
 assert.equal(table.get('N4').next,'Z');assert.equal(table.get('N3').next,'W');assert.equal(table.get('N1').distance,9);
});

test('BGP按可行性和公开优先级选择；区域间代价比较完整路径',()=>{
 const x=calc(5),select=withdrawn=>x.routes.filter(r=>r.reachable&&!r.path.includes(x.own)&&!withdrawn.includes(r.id))
  .sort((a,b)=>b.pref-a.pref||a.path.length-b.path.length||a.cost-b.cost||a.id-b.id)[0].id;
 assert.deepEqual(x.withdrawals.map(select),x.selected);
 const y=calc(7),totals=y.summary.map(row=>row.map((v,i)=>v+y.internal[i]));assert.deepEqual(totals,y.totals);
 assert.deepEqual(totals.map(row=>row[0]<row[1]?'A':'B'),y.selected);
 assert.equal(4*3/2,Number(q('F',7).answers[0][0]));
});

test('首包控制因果链与混合规则表的路径逐步验证',()=>{
 const x=calc(8);assert.equal(x.data.reduce((s,v)=>s+v,0),x.later);assert.equal([...x.data,...x.control].reduce((s,v)=>s+v,0),x.first);
 const y=calc(9);assert.deepEqual(trace({...y.old,B:y.fresh.B},'A',y.destination),y.firstB);
 assert.deepEqual(trace({...y.old,A:y.fresh.A},'A',y.destination),y.firstA);
 assert.deepEqual(trace(y.fresh,'B',y.destination),['B','A','D']);
});

test('ICMP首部、管理双向流量、计数模数与区间速率分别计算',()=>{
 const x=calc(10),quoted=x.ihl*4+x.quotedData,icmp=quoted+x.icmpHeader;assert.deepEqual([quoted,icmp,icmp+x.outerHeader],x.expected);
 const y=calc(11),requests=y.devices*Math.ceil(y.objects/y.perRequest),bytes=requests*(y.requestBytes+y.responseBytes);
 assert.deepEqual([requests,requests,bytes,bytes*8/y.seconds],y.expected);
 assert.ok(q('C',11).stem.includes('请求数最少'));
 // An upper bound alone also permits one object per request; it does not fix
 // the polling traffic. The public grouping policy selects the minimum.
 const oneObjectRequests=y.devices*y.objects;
 assert.deepEqual([oneObjectRequests,oneObjectRequests*(y.requestBytes+y.responseBytes)],[96,21120]);
 assert.notEqual(oneObjectRequests,requests);
 const delta=(1n<<32n)-4294967200n+200n;assert.equal(delta,296n);assert.equal(Number(delta*8n),2368);
 assert.equal(q('S',32).options[q('S',32).answer],'2368 bit/s');assert.equal((145-100)/3,15);
 assert.deepEqual([(1000-1000+80)/10,(1300-1000+80)/10],[8,38]);
});

test('带序号泛洪按轮发送，重复抑制与度数恒等式互相核验',()=>{
 const x=calc(12),g=adjacency(x.vertices,x.edges),seen=new Set([x.source]),arrival=new Map([[x.source,0]]);
 let messages=g.get(x.source).map(([to])=>({from:x.source,to})),transmissions=messages.length,duplicates=0,round=0;
 while(messages.length){round++;const next=[];messages.sort((a,b)=>a.to.localeCompare(b.to)||a.from.localeCompare(b.from));
  for(const {from,to}of messages){if(seen.has(to)){duplicates++;continue;}seen.add(to);arrival.set(to,round);
   for(const [neighbor]of g.get(to))if(neighbor!==from)next.push({from:to,to:neighbor});
  }
  transmissions+=next.length;messages=next;
 }
 assert.equal(arrival.get(x.destination),x.round);assert.equal(transmissions,x.transmissions);assert.equal(duplicates,x.duplicates);
 assert.equal(transmissions,2*x.edges.length-(x.vertices.length-1));assert.equal(duplicates,transmissions-(x.vertices.length-1));
});

test('本地5参考候选核答并与18既有题形成100题方案；不假装已接入',{
 skip:!existsSync(referencePath)
},()=>{
 const refs=JSON.parse(readFileSync(referencePath,'utf8'));assert.equal(refs.length,5);assert.equal(base().length,18);
 const combined=[...base(),...bank,...refs];assert.equal(combined.length,100);assert.equal(new Set(combined.map(q=>q.id)).size,100);
 assert.equal(new Set(combined.map(q=>normalize(q.stem))).size,100);
 assert.deepEqual(['选择题','填空题','分析题','计算题'].map(s=>combined.filter(q=>q.section===s).length),[40,20,24,16]);
 for(const group of examBlueprints.network.groups)assert.ok(combined.filter(q=>q.section===group.name).length>=group.count*4,group.name);
 for(const q of refs){assert.equal(q.chapter,'control');assert.equal(q.origin,'参考题');assert.ok(q.source.url.startsWith('https://github.com/sysuexam/'));assert.ok(q.source.license.includes('本地'));
  assert.equal(q.reference.distribution,'local-only');assert.equal(q.reference.url,q.source.url);assert.equal(q.reference.page,q.source.page);assert.ok(q.reference.title);assert.ok(q.reference.adaptation);assert.ok(q.reference.verification);
 }
 const first=refs.find(q=>q.verification?.kind==='shortest').verification;
 assert.deepEqual(floyd(first.vertices,first.edges)[0],first.distances);assert.deepEqual(pathCosts(first.vertices,first.edges,first.source),first.distances);
 assert.deepEqual(dijkstra(first.vertices,first.edges,first.source).order,first.order);
 assert.deepEqual(dijkstra(first.vertices,first.edges,first.source).steps,first.steps);
 const second=refs.find(q=>q.verification?.kind==='dv').verification;
 assert.deepEqual(floyd(second.vertices,second.edges),second.final);
 assert.deepEqual(second.vertices.map(v=>pathCosts(second.vertices,second.edges,v,1)),second.initial);
 for(const table of second.tables){
  assert.equal(table.destinations.length,2);assert.equal(table.neighbors.length,2);
  const routerIndex=second.vertices.indexOf(table.router);
  const direct=floyd(second.vertices,second.edges.filter(edge=>edge.includes(table.router)))[routerIndex];
  assert.deepEqual(table.destinations.map(d=>table.neighbors.map(v=>d===v?direct[second.vertices.indexOf(v)]:null)),table.initial);
  assert.deepEqual(table.destinations.map(d=>table.neighbors.map(v=>direct[second.vertices.indexOf(v)]+second.final[second.vertices.indexOf(v)][second.vertices.indexOf(d)])),table.final);
 }
});
