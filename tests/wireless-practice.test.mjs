import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {networkWirelessPractice} from '../bank-network-wireless.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {composeChapterTest,chapterAvailability,chapterCategory} from '../chapter-tests.js';
import {composeChapterPractice} from '../chapter-practice.js';
const qs=networkWirelessPractice.network;
const q=(type,n)=>qs.find(v=>v.id==='P6-network-7-'+type+'-'+String(n).padStart(3,'0'));
const fills=n=>q('F',n).answers.map(v=>v[0]);
const numbers=n=>fills(n).map(Number);
const text=n=>q('S',n).options[q('S',n).answer];
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,'actual='+a+' expected='+b);
const round=(n,d)=>Math.round(n*10**d)/10**d;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const addSignals=(codes,data)=>codes[0].map((_,j)=>codes.reduce((s,c,i)=>s+c[j]*data[i],0));
const decode=(codes,y)=>codes.map(c=>dot(c,y)/c.length);
const normalize=s=>s.normalize('NFKC').replace(/\s/g,'');
function compete(initial,{difs=1,slot=1,collision=4,success=4,draws={},maxEvents=10}={}){
 const remaining={...initial},drawIndex={},events=[];let time=0;
 while(Object.keys(remaining).length&&events.length<maxEvents){
  time+=difs;const slots=Math.min(...Object.values(remaining));time+=slots*slot;
  for(const key of Object.keys(remaining))remaining[key]-=slots;
  const winners=Object.keys(remaining).filter(k=>remaining[k]===0);
  events.push({time,winners,remaining:{...remaining},collision:winners.length>1});
  if(winners.length===1){delete remaining[winners[0]];time+=success;}
  else{for(const k of winners){const index=drawIndex[k]??0;assert.ok(draws[k]?.[index]!==undefined,'碰撞后未给新抽签');remaining[k]=draws[k][index];drawIndex[k]=index+1;}time+=collision;}
 }
 return events;
}
function externalBusyBackoff(count,difs,busy){
 let time=0,wait=difs;
 while(time<100){if(busy(time)){wait=difs;time++;continue;}if(wait){wait--;time++;continue;}if(count===0)return time;count--;time++;}
 throw Error('未完成退避');
}
const cA=[1,1,1,1],cB=[1,-1,1,-1],cC=[1,1,-1,-1],cD=[1,-1,-1,1];

test('98原创分布与去重，联网原题只由本地参考读取、不混入原创标记',async()=>{
 assert.equal(qs.length,98);assert.equal(new Set(qs.map(v=>v.id)).size,98);
 assert.deepEqual(['选择题','填空题','分析题','计算题'].map(s=>qs.filter(v=>v.section===s).length),[30,25,28,15]);
 assert.equal(qs.filter(v=>v.id.startsWith('P6-network-7-C-')).length,15);
 assert.ok(qs.filter(v=>v.id.startsWith('P6-network-7-C-')).every(v=>v.section==='计算题'));
 let refs=[];try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).network??[];}catch(e){if(e.code!=='ENOENT')throw e;}
 const all=[...new Map([...getPracticeCourse('network').questions,...refs,...qs].map(v=>[v.id,v])).values()];
 for(const item of qs){assert.equal(item.chapter,7);assert.equal(item.pool,'practice');assert.equal(item.origin,'原创');assert.ok(!item.reference);assert.equal(all.filter(v=>normalize(v.stem)===normalize(item.stem)).length,1,item.id);assert.ok(!/同上|上一题|见图|前项相反|以上选项/.test(item.stem));if(item.type==='short'){assert.ok(item.model.length>100,item.id);assert.ok(item.rubric.length>=4);}else assert.ok(item.explanation.length>20,item.id);}
});
test('全部客观题结构与现有评分函数兼容',()=>{
 for(const item of qs){if(item.type==='single'){assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);assert.equal(grade(item,item.answer).correct,true);assert.ok(Number.isInteger(item.answer));}
  else if(item.type==='fill'){assert.equal(item.answers.length,item.formats.length);assert.equal(grade(item,item.answers.map(v=>v[0])).correct,true);}
 }
 assert.equal(grade(q('F',10),['−1，−1，1，1']).correct,true);
 assert.equal(grade(q('F',16),['probe','association']).correct,true);
});
test('无线/移动和AP职责分开，不用无关IP/NAT条件替代链路分类',()=>{
 assert.ok(text(1).includes('没有发生接入点迁移'));assert.equal(text(2),'为无线主机与分布系统之间转发帧');
 assert.equal(text(3),'无基础设施的多跳网络');assert.ok(text(4).includes('另一次无线传输'));
 assert.ok(q('R',1).model.includes('丙最后一跳是有线'));assert.ok(q('R',14).model.includes('不为此递减TTL'));
});
test('SNR与帧成功率/吞吐由独立比特模型计算，调制选择先满足误码门槛',()=>{
 assert.deepEqual(numbers(1),[10/.1,10*Math.log10(10/.1)]);
 const success=(1-.001)**1000;assert.deepEqual(numbers(2),[round(success,4),round(1-success,4)]);
 const modes=[{rate:12,ber:1e-2},{rate:6,ber:1e-5},{rate:3,ber:1e-7}];
 assert.equal(modes.filter(v=>v.ber<=1e-4).sort((a,b)=>b.rate-a.rate)[0].rate,6);
 const good=[12*(1-.001)**1000,6*(1-.0001)**1000];assert.ok(good[1]>good[0]);
 assert.ok(q('R',3).model.includes('4.41235'));assert.ok(q('R',3).model.includes('5.42900'));
});
test('净荷吞吐扣实际交换时间，两种等长帧发送机会并非空口公平',()=>{
 const transmit=1240*8/100,total=transmit+40;near(transmit,numbers(3)[0]);assert.equal(round(1200*8/total,2),numbers(3)[1]);
 const slow=12000/6e6,fast=12000/54e6,cycle=slow+fast;
 near(cycle,20/9e3);near(12000/cycle,5.4e6);near(slow/cycle,.9);
 assert.ok(q('R',16).model.includes('各自吞吐'));assert.ok(q('R',16).model.includes('5.4Mbit/s'));
});
test('无忙与外部忙条件的倒计时保留剩余，DIFS不可把忙时算入',()=>{
 assert.deepEqual(numbers(4),[34+5*9]);assert.deepEqual(numbers(5),[3,34+3*9]);
 assert.equal(externalBusyBackoff(4,2,t=>t>=4&&t<9),13);assert.ok(q('R',8).model.includes('t=13'));
 const dataEnd=100,ackEnd=dataEnd+16+20;assert.deepEqual(numbers(8),[ackEnd,ackEnd+34]);
 const longAckEnd=16+40;assert.equal(longAckEnd+34,90);assert.ok(q('R',10).model.includes('90μs'));
 assert.ok(text(11).startsWith('冻结'));assert.ok(text(12).startsWith('使当前交换'));
});
test('两站竞争的逐事件扣计数与忙冻结给A4/B13',()=>{
 const events=compete({A:2,B:4},{difs:2,success:5,maxEvents:2});
 assert.deepEqual(events.map(e=>[e.time,e.winners]),[[4,['A']],[13,['B']]]);
 assert.equal(events[0].remaining.B,2);assert.ok(q('C',1).model.includes('B在13'));
});
test('三站连续碰撞只重抽参与者，保留旁观者计数给2/9碰撞后B16',()=>{
 const events=compete({A:1,B:1,C:3},{draws:{A:[2,5],B:[4],C:[3]},maxEvents:3});
 assert.deepEqual(events.map(e=>[e.time,e.winners]),[[2,['A','B']],[9,['A','C']],[16,['B']]]);
 assert.equal(events[0].remaining.C,2);assert.equal(events[1].remaining.B,2);
 assert.ok(q('C',2).model.includes('B在16'));
});
test('随机退避包含0与上界，窗口封顶且两站同槽概率按全组合计算',()=>{
 const choices=Array.from({length:16},(_,i)=>i);assert.deepEqual(numbers(6),[choices.length,choices.reduce((a,b)=>a+b,0)/choices.length]);
 let cw=15;assert.deepEqual(numbers(7),Array.from({length:3},()=>cw=Math.min(2*(cw+1)-1,63)));
 let same=0;for(let a=0;a<8;a++)for(let b=0;b<8;b++)if(a===b)same++;
 near(same/64,numbers(24)[0]);assert.ok(text(14).includes('仍可能冲突'));
});
test('RTS/CTS的NAV倒数从当前帧结束后计，隐藏站仍需预约后重新DIFS',()=>{
 const sifs=10,ctsStart=20+sifs,ctsEnd=ctsStart+16,dataStart=ctsEnd+sifs,dataEnd=dataStart+200,ackStart=dataEnd+sifs,ackEnd=ackStart+16;
 assert.deepEqual([ctsStart,ctsEnd,dataStart,dataEnd,ackStart,ackEnd],[30,46,56,256,266,282]);
 assert.deepEqual(numbers(9),[ackEnd-20,ackEnd-ctsEnd]);
 near(ctsEnd+numbers(9)[1]+30,312);assert.ok(q('C',3).model.includes('312μs'));
 assert.ok(text(13).includes('NAV'));assert.ok(q('R',6).model.includes('C据预约时间'));
});
test('预约代价与几何失败次数求临界概率，独立求和交叉闭式',()=>{
 const expectation=(p,success,failure)=>{let sum=0;for(let n=0;n<300;n++)sum+=p**n*(1-p)*(success+n*failure);return sum;};
 for(const p of [0,.02,5/53,.2,.7]){near(expectation(p,1120,1000),1120+1000*p/(1-p),1e-7);near(expectation(p,1220,40),1220+40*p/(1-p),1e-7);}
 near(1120+1000*(5/53)/(1-5/53),1220+40*(5/53)/(1-5/53));
 assert.ok(q('C',4).model.includes('5/53'));assert.ok(q('C',4).model.includes('1220.82'));
});
test('有限两次重试枚举吸收路径，交付率提升不被硬写成净吞吐必提升',()=>{
 const p=.25,paths=[{p:1-p,tries:1,success:1},{p:p*(1-p),tries:2,success:1},{p:p*p,tries:2,success:0}];
 const delivered=paths.reduce((s,x)=>s+x.p*x.success,0),duration=paths.reduce((s,x)=>s+x.p*x.tries*120,0);
 near(delivered,.9375);near(duration,150);near(8000*delivered/duration,50);near(8000*.75/120,50);
 near(1/.8,numbers(14)[0]);assert.ok(q('C',5).model.includes('也为50Mbit/s'));
 assert.ok(text(16).startsWith('按协议确认'));assert.ok(q('R',9).model.includes('继续观测失败'));
});
test('CDMA正交码Gram全矩阵与全部27个含静默组合独立解码',()=>{
 const codes=[cA,cB,cC,cD];for(let i=0;i<4;i++)for(let j=0;j<4;j++)assert.equal(dot(codes[i],codes[j]),i===j?4:0);
 const bad=[1,1,1,-1];assert.equal(dot(bad,cA),2);assert.equal(dot(bad,cB),2);
 for(const a of [-1,0,1])for(const b of [-1,0,1])for(const c of [-1,0,1])assert.deepEqual(decode(codes.slice(0,3),addSignals(codes.slice(0,3),[a,b,c])),[a,b,c]);
 assert.deepEqual(addSignals(codes.slice(0,3),[1,-1,0]),[0,2,0,2]);
 assert.deepEqual(decode(codes.slice(0,3),[1,-1,-1,-3]),[-1,1,1]);
 assert.ok(q('C',6).model.includes('静默'));assert.ok(q('C',7).model.includes('C、D可以一起加入'));
});
test('单用户编码、多用户相关与码片率/错位计算不混淆',()=>{
 assert.equal(fills(10)[0],cC.map(x=>-x).join(','));
 assert.deepEqual(numbers(11),decode([cA,cB],[0,2,0,2]));
 assert.deepEqual(numbers(12),[2*8,1000/(2*8)]);
 near(dot([-1,1,1,-1],cC)/4,numbers(13)[0]);
 assert.ok(text(9).includes('乘积的和为0'));assert.ok(text(10).includes('错位'));
});
test('非正交相关失真不等于数学不存在联合解，穷举唯一发送组合',()=>{
 const a=cA,b=[1,1,1,-1],y=[0,0,0,2];assert.deepEqual(decode([a,b],y),[.5,-.5]);
 const solutions=[];for(const da of [-1,1])for(const db of [-1,1])if(JSON.stringify(addSignals([a,b],[da,db]))===JSON.stringify(y))solutions.push([da,db]);
 assert.deepEqual(solutions,[[1,-1]]);assert.ok(q('R',5).model.includes('da=1、db=−1'));
 for(const da of [-1,1])for(const db of [-1,1])near(decode([a,b],addSignals([a,b],[da,db]))[0],da+db*dot(a,b)/4);
});
test('关联/扫描/SSID/IP配置分层，固定地址仍需正确二层转发',()=>{
 assert.ok(text(17).startsWith('不能'));assert.ok(text(18).includes('Probe Request'));assert.ok(text(19).includes('不同标识'));
 assert.deepEqual(fills(16),['Probe','Association']);assert.ok(q('R',12).model.includes('优先核查DHCP'));
 assert.ok(q('R',13).model.includes('SSID名称相同不表示同一IP子网'));assert.ok(q('R',15).model.includes('暂存待发'));
});
test('上行三地址与桥接IP端点各司其职，同子网源MAC更新只改相关项',()=>{
 assert.deepEqual(fills(15),['AP','H','R']);
 const forwarding=new Map([['H',1],['K',3]]),before=forwarding.get('H');forwarding.set('H',2);const after=forwarding.get('H');
 assert.equal(before,1);assert.equal(after,2);assert.equal(forwarding.get('K'),3);
 assert.ok(q('C',15).model.includes('第二帧目的H'));assert.ok(q('C',15).model.includes('无须清空'));
 assert.ok(q('R',14).model.includes('IP源仍S、目的仍D'));
});
test('移动IP内外地址角色和直接/间接路径，反向隧道满足给定源前缀条件',()=>{
 assert.deepEqual(fills(17),['203.0.113.9','198.51.100.7']);
 near((30+40+2)-(10+2),numbers(19)[0]);near(30+40+2+8,numbers(19)[1]);
 assert.ok(text(22).startsWith('稳定身份'));assert.equal(text(23),'三角路由');assert.ok(text(24).startsWith('内层'));
 const prefix=ip=>ip.split('.').slice(0,3).join('.');assert.notEqual(prefix('198.51.100.7'),'203.0.113');assert.equal(prefix('203.0.113.9'),'203.0.113');
 assert.ok(q('R',20).model.includes('外层源203.0.113.9'));assert.ok(q('R',20).model.includes('目的198.51.100.1'));
});
test('绑定更新仅影响后续封装，在途旧包不得因活指针自动改变目的',()=>{
 let coa='203.0.113.1';const encapsulate=()=>({src:'198.51.100.1',dst:coa,innerSrc:'192.0.2.9',innerDst:'198.51.100.10'});
 const earlier=encapsulate();coa='192.0.2.200';const later=encapsulate();
 assert.equal(earlier.dst,'203.0.113.1');assert.equal(later.dst,'192.0.2.200');assert.equal(earlier.innerDst,later.innerDst);assert.equal(earlier.innerSrc,'192.0.2.9');assert.equal(later.innerSrc,'192.0.2.9');
 assert.ok(q('C',8).stem.includes('源和目的'));assert.ok(q('C',8).rubric.includes('内层源与目的保留'));
 assert.ok(q('C',8).model.includes('不会隔空改写'));
 assert.ok(text(25).startsWith('不必'));assert.ok(q('R',18).model.includes('内层目的分别仍是'));
});
test('有效绑定按授予期限更新，拒绝不改旧到期且边界到期无效',()=>{
 assert.deepEqual(numbers(20),[100+60,150+30]);
 const events=[{t:0,ok:true,life:60},{t:42,ok:true,life:30},{t:57,ok:false},{t:80,ok:true,life:10}];
 const validAt=t=>{let end=-Infinity;for(const e of events)if(e.t<=t&&e.ok)end=e.t+e.life;return t<end;};
 assert.deepEqual([71,72,75,88,90].map(validAt),[true,false,false,true,false]);
 assert.ok(q('C',9).model.includes('72至80s无有效绑定'));assert.ok(q('R',19).model.includes('原记录继续按原有效期'));
 assert.ok(text(26).startsWith('按协议及时续登记'));
});
test('隧道MTU/MSS逐层预算，以可容纳边界独立核最大值',()=>{
 assert.deepEqual(numbers(18),[980,1000]);
 const possible=[];for(let payload=0;payload<=1500;payload++)if(payload+20+20+20<=1500)possible.push(payload);
 assert.equal(Math.max(...possible),1440);assert.equal(1460+20+20+20,1520);
 assert.ok(q('R',21).model.includes('1440'));assert.ok(q('C',12).model.includes('1520'));
 assert.ok(q('R',18).model.includes('两个归属地址'));
});
test('LTE两段隧道移除旧头再封新头，而非用户包每跳累计套层',()=>{
 const extra=8+8+20;assert.deepEqual(numbers(22),[1024+extra,round(extra/1024*100,5)]);
 const inner={src:'10.0.0.8',dst:'203.0.113.80',length:1200};
 const first={src:'192.0.2.10',dst:'192.0.2.20',inner,length:inner.length+extra};
 const second={src:'198.51.100.20',dst:'198.51.100.30',inner:first.inner,length:first.inner.length+extra};
 assert.equal(first.length,1236);assert.equal(second.length,1236);assert.notEqual(second.length,1272);assert.deepEqual(first.inner,second.inner);
 assert.equal(text(27),'S-GW、P-GW');assert.ok(q('C',10).model.includes('先去旧封装再建新隧道'));
 assert.ok(q('R',24).model.includes('控制信令与用户数据'));
});
test('切换成功/两种失败分支的资源状态，不把锚点保持误写成无丢失保证',()=>{
 assert.ok(q('C',11).model.includes('确认新路径有效→释放旧资源'));assert.ok(q('R',22).model.includes('先使目标侧资源就绪'));
 assert.ok(q('R',23).model.includes('不自动证明切换无丢包'));assert.ok(text(28).includes('负载分担'));
 assert.ok(q('R',25).model.includes('VLR为当前访问用户'));assert.ok(q('R',17).model.includes('普通骨干不必'));
});
test('蜂窝时频容量与802.16配额先核资源守恒及保证可行性',()=>{
 near(10*(8-1),numbers(21)[0]);assert.deepEqual(numbers(23),[100-10-30-20,100-10-30-20-25]);
 const available=65-5,minimum=20+10,remaining=available-minimum;assert.deepEqual([20,10,remaining*2/3,remaining/3],[20,10,20,10]);
 const oldAllows=([a,b,c,d])=>a>=20&&b>=10&&a+b+c+d===60&&c===2*d;
 const policyAllows=([a,b,c,d])=>oldAllows([a,b,c,d])&&a===20&&b===10;
 assert.equal(oldAllows([23,10,18,9]),true);assert.equal(policyAllows([23,10,18,9]),false);
 const solutions=[];for(let a=0;a<=60;a++)for(let b=0;b<=60;b++)for(let c=0;c<=60;c++){const d=60-a-b-c;if(d>=0&&policyAllows([a,b,c,d]))solutions.push([a,b,c,d]);}
 assert.deepEqual(solutions,[[20,10,20,10]]);
 assert.ok(50+20>available);assert.equal(50+20-available,10);
 assert.ok(q('C',13).model.includes('至少缺10'));assert.ok(q('R',26).model.includes('不同环节'));
 assert.ok(q('C',13).stem.includes('恰给A20槽、B10槽'));assert.ok(q('C',13).stem.includes('全部剩余'));
 assert.ok(text(29).includes('宽带无线城域'));
});
test('替换重复上行地址题为归属网返回决策，注销前后HA路由状态不同',()=>{
 const home='198.51.100.10',haBinding=new Map([[home,'203.0.113.1']]);
 const destination=()=>haBinding.has(home)?haBinding.get(home):'归属网本地投递';
 assert.equal(destination(),'203.0.113.1');haBinding.delete(home);assert.equal(destination(),'归属网本地投递');
 assert.ok(text(21).startsWith('按协议注销外地登记'));assert.ok(q('S',21).stem.includes('回到归属网'));assert.ok(!q('S',21).stem.includes('ToDS'));
});
test('无线误码/底层恢复延迟可影响端到端窗口和超时，冲突指标无万能RTO',()=>{
 assert.deepEqual(numbers(25),[10,10*1000*8/.05/1e6]);
 assert.ok(200<300&&300<320);assert.ok(q('R',27).model.includes('到200ms仍无确认'));
 assert.equal(Array.from({length:1000},(_,i)=>i).some(v=>v>300&&v<=250),false);
 assert.ok(q('C',14).model.includes('交集为空'));assert.ok(text(30).startsWith('端到端观察'));
 assert.ok(q('R',28).model.includes('共享介质竞争'));assert.ok(q('R',28).model.includes('受控比较'));
});
test('实际章节旧约定连续三批19题100分不重复，第四批按选择库存不足拒绝',()=>{
 const available=chapterAvailability('network',7);
 assert.deepEqual(available.map(g=>[g.name,g.count]),[['选择题',8],['填空题',5],['分析题',3],['计算题',3]]);
 const prior=[],seen=new Set();
 for(let i=0;i<3;i++){const batch={subject:'network',...composeChapterTest('network',7,prior,()=>.271828)};
  assert.equal(batch.questions.length,19);assert.equal(batch.questions.reduce((s,q)=>s+q.points,0),100);
  for(const item of batch.questions){assert.equal(String(item.chapter),'7');assert.ok(!seen.has(item.id));seen.add(item.id);}
  assert.deepEqual(available.map(g=>batch.questions.filter(q=>q.section===g.name).length),[8,5,3,3]);prior.push(batch);
 }
 assert.equal(seen.size,57);assert.throws(()=>composeChapterTest('network',7,prior,()=>.271828),/未用题不足/);
 assert.equal(qs.filter(q=>q.type==='single'&&!seen.has(q.id)).length,6);
});
test('实际自动20题按新计算分类可抽取，题型分组与分值保持现有契约',()=>{
 let seed=246813579;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const batch=composeChapterPractice('network',7,{preset:'auto',total:20},[],random);
 assert.equal(batch.questions.length,20);assert.equal(batch.questions.reduce((s,q)=>s+q.points,0),100);
 assert.ok(batch.questions.every(q=>String(q.chapter)==='7'));
 assert.ok(batch.questions.some(q=>q.section==='计算题'));
 assert.ok(qs.filter(q=>q.id.startsWith('P6-network-7-C-')).every(q=>chapterCategory('network',q)==='计算题'));
});
