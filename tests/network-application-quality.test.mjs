import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {practiceWeight} from '../study-priorities.js';
import {grade} from '../grading.js';

// Repository-owned original questions only. No user's materials/local paths,
// third-party payload, browser storage, personal answer or score is required.
const fixture=JSON.parse(await readFile(new URL('./fixtures/network-application-quality-originals.json',import.meta.url),'utf8'));
const fields=['id','chapter','section','revision','pool','origin','stem','type','options','answer','answers','formats','explanation','model','rubric','coding','studyLevel','studyWeight','studyEvidence','practiceWeight'];
const canonical=q=>Object.fromEntries(fields.filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
const defaultQuestion=id=>getPracticeCourse('network').questions.find(q=>q.id===id);
function parse(q,regexp){const m=q.stem.match(regexp);assert.ok(m,q.id+'参数/前提改变，不应沿用旧oracle');return m;}
function accepted(q,answer){assert.equal(grade(q,answer).correct,true,q.id+'公开答案须接受独算结果');}
function option(q,label){const i=q.options.indexOf(label);assert.ok(i>=0,'概念答案描述必须仍在选项中');return i;}
function roundedPercent(part,total){const scaled=BigInt(part)*10000n,den=BigInt(total),rounded=(2n*scaled+den)/(2n*den);return String(rounded/100n)+'.'+String(rounded%100n).padStart(2,'0')+'%';}

// Strict fixture equality binds the interpretation before these independent
// numeric/classification oracles run. q.answer/answers/model are not inputs to
// an expected answer. Concept cases are read-reviewed classifications, not a
// claim of mathematical proof. Short answers retain manual/AI review status.
function checkNew(q){
 const n=Number(q.id.split('-').at(-1));
 const concepts={
  1:'提供所请求应用服务的进程或系统角色',
  2:'双方对应用消息格式和解析规则的约定不一致',
  3:'应用进程使用操作系统传输服务的接口',
  12:'指出接收该域邮件的邮件交换服务器',
  21:'可返回资源相关的响应首部，但不发送响应正文',
  32:'POST方法会自动加密请求内容，无需其他安全机制'
 };
 if(concepts[n])return accepted(q,option(q,concepts[n]));
 let result;
 if(n===42){
  assert.match(q.stem,/已缓存example.edu的权威DNS服务器地址，但没有www.example.edu的A记录/);
  assert.match(q.stem,/该权威服务器能直接返回所需答案/);assert.match(q.stem,/不考虑别名和重试/);
  const events=['miss final answer','select cached authority','external query','receive final A'];result=events.filter(x=>x==='external query').length;
 }else if(n===43){
  assert.match(q.stem,/HTTP\/1.1文本报文/);assert.match(q.stem,/分隔首部区与可能存在的消息体/);result='空行';
 }else if(n===44){
  const m=parse(q,/URL (http:\/\/[^ ]+) ，未使用代理/);const url=new URL(m[1]);result=url.port||80;
 }else if(n===45){
  const m=parse(q,/^HTTP常用状态码中，(OK)对应的三位数字代码为____。$/);result=new Map([['OK',200],['Created',201],['No Content',204]]).get(m[1]);
 }else if(n===54){
  const m=parse(q,/尚缺A、B、C三个片段.*分别为(\d+)、(\d+)、(\d+)。按最稀缺优先策略/),counts=m.slice(1).map(Number),minimum=Math.min(...counts),where=counts.flatMap((v,i)=>v===minimum?[i]:[]);assert.equal(where.length,1);result=['A','B','C'][where[0]];
 }else if(n===56){
  const m=parse(q,/每秒收到(\d+)次请求，每个对象平均(\d+)KB（1KB=1000B）。若(\d+)%的内容字节由本地缓存提供/),[count,kb,hitPercent]=m.slice(1).map(Number);result=count*kb*1000*8*(100-hitPercent)/100/1e6;
 }else if(n===57){
  assert.match(q.stem,/每3个原始字节编码为4个ASCII字符，末组不足3字节时仍输出4个字符/);const m=parse(q,/一个(\d+)B附件编码后占/),bytes=Number(m[1]);
  // Real standard-library encoding is separate from the exercise's ceil rule.
  result=Buffer.from(Array.from({length:bytes},(_,i)=>i)).toString('base64').length;assert.equal(result,4*Math.ceil(bytes/3));
 }else if(n===59){
  assert.match(q.stem,/先发送1B长度L，再发送L字节的正文，长度字节不计入正文/);
  const arrays=[...q.stem.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1].split(',').map(token=>/^\d+$/.test(token)?Number(token):token));assert.equal(arrays.length,2);
  const bytes=arrays.flat();let cursor=0,frames=0;const bodies=[];
  while(cursor<bytes.length){const length=bytes[cursor];assert.ok(Number.isInteger(length)&&length>=0);if(cursor+1+length>bytes.length)break;bodies.push(bytes.slice(cursor+1,cursor+1+length));cursor+=1+length;frames++;}
  assert.equal(cursor,bytes.length);assert.deepEqual(bodies,[['A','B','C'],['D','E']]);result=frames;
 }else if(n===60){
  assert.match(q.stem,/连接已经建立/);assert.match(q.stem,/允许流水线/);assert.match(q.stem,/无处理等待并按序立即响应/);assert.match(q.stem,/忽略所有报文发送时间/);
  const m=parse(q,/连续发出(\d+)个小对象请求/),count=Number(m[1]),completionTimes=Array.from({length:count},()=>1);assert.ok(count>0);result=Math.max(...completionTimes);
 }else if(n===61){
  const m=parse(q,/本机端口(\d+).*客户端(\d+(?:\.\d+){3})的源端口(\d+)/);const request={source:{ip:m[2],port:Number(m[3])},destination:{port:Number(m[1])}},reply={destination:request.source};result=reply.destination.port;
 }else if(n===64){
  const mx=parse(q,/只有一个MX：([^ ]+) MX ([^；]+)；/),a=parse(q,/另有([^ ]+) A (\d+(?:\.\d+){3})。/);assert.equal(mx[2],a[1]);result=new Map([[a[1],a[2]]]).get(mx[2]);
 }else if(n===65){
  assert.match(q.stem,/由A、B、C三个片段组成/);assert.match(q.stem,/源站已经离线/);
  const sources=[...q.stem.matchAll(/\{([^}]+)\}/g)].map(m=>m[1].split(',')),available=new Set(sources.flat()),missing=['A','B','C'].filter(x=>!available.has(x));assert.equal(missing.length,1);result=missing[0];
 }else if(n===84){
  assert.match(q.stem,/一个监听套接字/);assert.match(q.stem,/两个客户/);assert.match(q.stem,/两个客户连接均未关闭/);const resources=['listener','accepted-A','accepted-B'];assert.ok(q.model.includes('共'+resources.length+'个'));assert.match(q.model,/监听.*等待新的连接/);assert.match(q.model,/各自客户收发数据/);assert.equal(grade(q,'监听与两个已连接套接字，共'+resources.length+'个').status,'review');return;
 }else if(n===85){
  assert.match(q.stem,/^从建立控制连接并登录开始/);assert.match(q.stem,/连续下载两个文件/);assert.match(q.stem,/每次文件传输都新建并关闭一条数据连接/);const events=['open-control','open-data-1','close-data-1','open-data-2','close-data-2'],count=events.filter(x=>x.startsWith('open')).length;assert.ok(q.model.includes('共建立'+count+'条'));assert.match(q.model,/控制连接传送.*命令及其响应/);assert.match(q.model,/数据连接传送文件内容/);assert.equal(grade(q,'共'+count+'条TCP连接，控制和数据分离').status,'review');return;
 }else if(n===88){
  const m=parse(q,/共(\d+)次请求：(\d+)次各请求(\d+)KB的小对象，全部命中；(\d+)次各请求(\d+)MB的大对象，全部未命中/),[total,hits,kb,misses,mb]=m.slice(1).map(Number);assert.equal(hits+misses,total);let hitBytes=0,missBytes=0;for(let i=0;i<hits;i++)hitBytes+=kb*1000;for(let i=0;i<misses;i++)missBytes+=mb*1e6;
  const requestPercent=100*hits/total+'%',bytePercent=roundedPercent(hitBytes,hitBytes+missBytes),missBytePercent=roundedPercent(missBytes,hitBytes+missBytes);for(const term of [requestPercent,bytePercent,missBytePercent])assert.ok(q.model.includes(term),term+'须与独立累积结果相符');assert.equal(grade(q,[requestPercent,bytePercent,missBytePercent].join(',')).status,'review');return;
 }else if(n===93){
  const m=parse(q,/N=(\d+)、文件(\d+)Mb，源上传(\d+)Mb\/s，各对等上传(\d+)Mb\/s、下载至少(\d+)Mb\/s/),[count,file,server,peer,downloadLower]=m.slice(1).map(Number),origin=file/server,downloadUpper=file/downloadLower,total=file*count/(server+count*peer);assert.ok(total>=origin&&total>=downloadUpper);assert.ok(q.model.includes('≤'+downloadUpper+'s'));assert.ok(q.model.includes('下界'));assert.ok(q.model.includes('为'+total+'s'));assert.equal(grade(q,String(total)).status,'review');return;
 }else throw Error('缺少候选oracle '+n);
 accepted(q,[String(result)]);
}

for(const c of fixture.cases){
 test('应用层历史版本保持：'+c.id+' revision'+c.baselineRevision,()=>{
  const q=getPracticeCourse('network',{questionRevisions:{[c.id]:c.baselineRevision}}).questions.find(q=>q.id===c.id);assert.ok(q);assert.equal(q.revision??1,c.baselineRevision);
  const expected={...c.original,practiceWeight:practiceWeight('network',c.original)};assert.deepEqual(canonical(q),canonical(expected));
  // This is an explicit compatibility snapshot, not independent answer proof.
  if(q.type==='single')accepted(q,c.original.answer);else if(q.type==='fill')accepted(q,c.original.answers.map(v=>v[0]));else assert.equal(grade(q,c.original.model).status,'review');
 });
 test('应用层默认新版必须实际接入：'+c.id+' revision'+c.revision,t=>{
  const q=defaultQuestion(c.id);assert.ok(q);const registered=Object.hasOwn(practiceQuestionRevisions[c.id]||{},String(c.revision));
  if(!registered&&(q.revision??1)===c.baselineRevision){t.skip('完整候选尚未注册；不计实际交付验证通过');return;}
  assert.equal(q.revision,c.revision,'注册后必须由默认入口返回新版本，不允许回退旧题/改读候选充交付');
  const expected={...c.proposed,practiceWeight:practiceWeight('network',c.proposed)};assert.deepEqual(canonical(q),canonical(expected));checkNew(q);
 });
}

function fill(n,label,pattern,compute){test('应用层现题独算：'+n+' '+label,()=>{const q=defaultQuestion('P3-network-2-'+n);assert.equal(q.revision??1,1);assert.equal(q.type,'fill');const m=parse(q,pattern);accepted(q,[String(compute(m))]);});}
fill(46,'TTL从缓存建立计时',/^某DNS缓存TTL=(\d+)s，已过(\d+)s且未更新，剩余有效时间为____s。$/,m=>Number(m[1])-Number(m[2]));
fill(47,'HTML和独立资源请求计数',/^一个网页含HTML及(\d+)个独立图片，均未缓存，且每个资源一请求，不计重定向，共需____次HTTP请求。$/,m=>1+Number(m[1]));
fill(48,'逐次未命中指示期望',/^缓存命中率为(0\.\d+)，(\d+)次同分布请求中期望未命中次数为____。$/,m=>{const p=Number(m[1]),count=Number(m[2]);let expected=0;for(let i=0;i<count;i++)expected+=1-p;return Math.round(expected*1e9)/1e9;});
fill(49,'CBR媒体量及字节单位',/^一个(\d+)Mb\/s恒定码率视频播放(\d+)s，对应媒体数据____MB（十进制，不计开销）。$/,m=>Number(m[1])*Number(m[2])/8);
fill(50,'同时播放的净缓存秒数',/^下载速率(\d+)Mb\/s，媒体码率(\d+)Mb\/s，持续下载(\d+)s后净增加的可播放缓存为____s（已在播放且不计开销）。$/,m=>{const [download,play,time]=m.slice(1).map(Number);const received=download*time,consumed=play*time;return (received-consumed)/play;});
fill(51,'非持久首对象握手后请求',/^TCP非持久HTTP基础模型中，忽略传输和DNS，一个对象需一次连接握手(\d+)RTT及请求响应(\d+)RTT，共____RTT。$/,m=>m.slice(1).map(Number).reduce((a,b)=>a+b,0));
fill(52,'已建连接串行依赖',/^无流水持久HTTP已建连接，串行请求(\d+)个小对象，忽略发送时间，每对象等待(\d+)RTT，共____RTT。$/,m=>{const [count,rtt]=m.slice(1).map(Number);let time=0;for(let i=0;i<count;i++)time+=rtt;return time;});
fill(53,'向三层外部服务器查询',/^解析器依次向根、顶级域、权威服务器各发一次迭代查询且均无缓存，共外部查询____次。$/,()=>['root','TLD','authoritative'].length);
fill(55,'按对象逐次累加负载',/^每秒(\d+)次请求、每对象平均(\d+)KB（1KB=1000B），全部从源站取时，平均内容速率为____Mb\/s。$/,m=>{const [count,kb]=m.slice(1).map(Number);let bytes=0;for(let i=0;i<count;i++)bytes+=kb*1000;return bytes*8/1e6;});
fill(58,'HTTP首部也是TCP交付字节',/^HTTP响应实体为(\d+)B，首部(\d+)B，TCP层交付该完整HTTP响应需____B（忽略其他消息）。$/,m=>Number(m[1])+Number(m[2]));
fill(62,'单源发送量约束',/^理想源站上行(\d+)Mb\/s，单个文件(\d+)Mb，向一个客户发送一份至少需____s。$/,m=>Number(m[2])/Number(m[1]));
fill(63,'时间随机变量的期望',/^缓存命中耗(\d+)ms、未命中耗(\d+)ms，命中概率(0\.\d+)，平均耗时为____ms。$/,m=>{const [hit,miss,p]=m.slice(1).map(Number);return Math.round((hit*p+miss*(1-p))*1e9)/1e9;});
