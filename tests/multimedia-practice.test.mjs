import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {networkMultimediaPractice} from '../bank-network-multimedia.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {examBlueprints,examPapers} from '../exam-bank.js';
import {chapterCategory,assertChapterStock} from '../chapter-tests.js';
import {practiceWeight} from '../study-priorities.js';
const qs=networkMultimediaPractice.network;
const q=(type,n)=>qs.find(v=>v.id==='P6-network-9-'+type+'-'+String(n).padStart(3,'0'));
const fills=n=>q('F',n).answers.map(v=>v[0]);
const nums=n=>fills(n).map(Number);
const choice=n=>q('S',n).options[q('S',n).answer];
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol,'actual='+a+' expected='+b);
const has=(type,n,...parts)=>{for(const s of parts)assert.ok(q(type,n).model.includes(s),q(type,n).id+' 缺 '+s);};
test('90原创分布、practice隔离及跨现有库/raw精确排重',async()=>{
 assert.equal(qs.length,90);assert.equal(new Set(qs.map(v=>v.id)).size,90);assert.deepEqual(['选择题','填空题','分析题','计算题'].map(s=>qs.filter(v=>v.section===s).length),[30,25,25,10]);
 let refs=[];try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).network??[];}catch(e){if(e.code!=='ENOENT')throw e;}
 const norm=s=>s.normalize('NFKC').replace(/\s/g,''),all=[...new Map([...getPracticeCourse('network').questions,...refs,...qs].map(v=>[v.id,v])).values()],exam=examPapers.network.flatMap(p=>p.questions);
 for(const item of qs){assert.equal(item.pool,'practice');assert.equal(item.origin,'原创');assert.equal(item.chapter,9);assert.ok(!item.reference);assert.equal(all.filter(v=>norm(v.stem)===norm(item.stem)).length,1,item.id);assert.ok(!exam.some(e=>e.id===item.id||norm(e.stem)===norm(item.stem)),item.id);assert.ok(!/同上|上一题|见图|按图/.test(item.stem));if(item.type==='short'){assert.ok(item.model.length>100,item.id);assert.ok(item.rubric.length>=4,item.id);}else assert.ok(item.explanation.length>15,item.id);}
 assert.equal(qs.filter(v=>v.id.startsWith('P6-network-9-C-')&&v.section==='计算题').length,10);
});
test('全部客观题经实际评分，字段归一化与错误选择均正确处理',()=>{
 for(const item of qs){if(item.type==='single'){assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);for(let i=0;i<4;i++)assert.equal(grade(item,i).correct,i===item.answer,item.id);}else if(item.type==='fill'){assert.equal(item.answers.length,item.formats.length);assert.equal(grade(item,item.answers.map(v=>v[0])).correct,true,item.id);}}
 assert.equal(grade(q('F',9),['c3','a5']).correct,true);assert.equal(grade(q('F',18),['gsm']).correct,true);
});
test('编码产生率、视频量与已有库存的物理量分别核算',()=>{
 assert.deepEqual(nums(1),[640*480*24*30,640*480*24*30/1e6]);assert.deepEqual(nums(2),[3e6*12*60/8/1e6]);assert.deepEqual(nums(3),[12/3]);assert.deepEqual(nums(4),[20+5+45+30+5,150-(20+5+45+30+5)]);assert.deepEqual(nums(5),[96000*.015/8]);
 assert.ok(choice(3).includes('时间冗余'));assert.ok(choice(4).startsWith('编码恒速'));assert.ok(choice(5).includes('抖动'));has('R',1,'暂停的60秒','不会');
 assert.ok(q('S',30).stem.includes('不允许丢弃'));assert.ok(q('S',30).explanation.includes('已接纳包的等待可以有界'));
});
test('RTP序号与媒体时钟的模空间不同，基本首部和MTU分包不混淆',()=>{
 assert.deepEqual(nums(6),[1,2,3].map(n=>(65534+n)%2**16));assert.deepEqual(nums(7),[(4294967040+48000*.02)%2**32]);assert.deepEqual(nums(8),[12+8+20]);
 const maximum=300-40;assert.deepEqual(nums(24),[maximum,Math.ceil(700/maximum)]);assert.ok([260,260,180].every(n=>n+40<=300));assert.equal([260,260,180].reduce((a,b)=>a+b,0),700);
 assert.ok(choice(17).startsWith('序号逐包变化'));assert.ok(choice(18).includes('本会话'));has('R',7,'96→A','正文B');
});
test('XOR恢复、冗余额外比例/总因子与交织丢失时长',()=>{
 assert.deepEqual(fills(9),[(0x3c^0xa5^0x5a).toString(16).toUpperCase(),(0xc3^0x3c^0x5a).toString(16).toUpperCase()]);assert.deepEqual(nums(10),[100/5,6/5]);assert.deepEqual(nums(11),[64+13,13/64*100]);assert.deepEqual(nums(12),[20/4,4*(20/4)]);
 assert.ok(choice(12).startsWith('不能'));assert.ok(choice(13).includes('增加重排等待'));assert.ok(choice(14).includes('低质量'));
});
test('EWMA偏差明确使用新d，新讲话段判据同时检查时钟和序号',()=>{
 const d=.9*60+.1*100,v=.9*5+.1*Math.abs(100-d);for(const [a,b] of nums(13).map((a,i)=>[a,[d,v,d+4*v][i]]))near(a,b);
 assert.deepEqual(nums(14),[(1320-1000)/8000*1000,1]);assert.ok((1320-1000)/8000>.02&&11-10===1);
});
test('RTCP带宽预算及报告比例编码独立于实际精确周期',()=>{
 assert.deepEqual(nums(15),[4e6*.05,4e6*.05*.25,4e6*.05*.75/30]);assert.deepEqual(nums(16),[(100-97)/100,Math.floor((100-97)/100*256)]);
 has('R',16,'1000kbit/s','1/10','十倍');assert.ok(choice(20).startsWith('给参与者提供反馈'));
 near(1000+999*(99000/999),100000);assert.ok(q('R',16).stem.includes('等额分配'));assert.ok(q('R',16).stem.includes('均一样长'));
});
test('共同时间映射先换各自时钟单位，协商还需共同编码',()=>{
 const a=10+(81200-80000)/8000,v=10+(913500-900000)/90000;near(a,v);assert.deepEqual(nums(17),[a,v]);assert.deepEqual(fills(18),['GSM']);
 assert.ok(q('F',17).stem.includes('各有一份RTCP发送者报告'));
 const left=new Set(['PCM','GSM']);assert.deepEqual(['GSM','Opus'].filter(x=>left.has(x)),['GSM']);
 assert.ok(choice(21).startsWith('不能'));has('R',17,'音频12与视频88','各流RTCP发送报告');
});
test('DSCP/ECN与AF两个层次，改类别时保留获准之外的位',()=>{
 assert.deepEqual(nums(19),[6,2,2**6]);assert.deepEqual(nums(20),[4*3]);assert.deepEqual(nums(25),[parseInt('101110',2),parseInt('10',2),parseInt('10111010',2)]);
 const input=parseInt('10111011',2),out=(input&3)|(parseInt('001010',2)<<2);assert.equal(out,43);assert.equal(out.toString(2).padStart(8,'0'),'00101011');assert.equal(out&3,input&3);assert.notEqual(parseInt('00101000',2)&3,input&3);has('R',23,'00101011','43','ECN从11改为00');
 assert.ok(choice(28).startsWith('在该类拥塞'));assert.ok(!q('S',28).stem.includes('不可抢占'));
});
test('令牌字节预算、流体延迟界与单瓶颈准入剩余量',()=>{
 assert.deepEqual(nums(21),[Math.floor((3000+2000*.25)/1400)]);assert.ok(2*1400<=3000);assert.ok(3*1400>3000+2000*.25);
 near(nums(22)[0],12000/1e6*1000);near(nums(23)[0],5-(1.8+1.4+1.1));assert.equal(nums(23)[1],0);assert.ok(600000<=1e6);
});
test('C1独立细步流量积分和质量守恒交叉开播/耗空/恢复',()=>{
 const dt=.0001;let stock=0,playing=false,started=false,totalReceived=0,totalPlayed=0;const starts=[],stops=[];
 for(let i=0;i<100000;i++){const t=i*dt,x=t<2?4:t<5?1:t<8?0:5;stock+=x*dt;totalReceived+=x*dt;
  if(playing){const used=Math.min(stock,2*dt);stock-=used;totalPlayed+=used;if(stock<1e-9){stock=0;playing=false;stops.push((i+1)*dt);}}
  else if(stock>=(started?2:8)-1e-9){playing=true;started=true;starts.push((i+1)*dt);}assert.ok(stock<=10+1e-8);}
 near(starts[0],2,dt);near(stops[0],7.5,dt);near(starts[1],8.4,dt);near(stock,6.8,.001);near(totalReceived-totalPlayed,stock,.001);near(starts[1]-stops[0],.9,2*dt);
 has('C',1,'7.5秒','8.4秒','0.9秒','6.8Mbit');
});
test('C2每包估计与段首一次排期独立，迟到包仍更新但不改旧期限',()=>{
 const generated=[0,20,40,60,200],arrivals=[40,75,85,130,260],pairs=[],delays=[];let d=40,v=0;
 for(let i=0;i<5;i++){const x=arrivals[i]-generated[i];d=.75*d+.25*x;v=.75*v+.25*Math.abs(x-d);pairs.push([d,v]);delays.push(d+2*v);}
 assert.deepEqual(pairs,[[40,0],[43.75,2.8125],[44.0625,2.34375],[50.546875,6.62109375],[52.91015625,6.73828125]]);
 const deadlines=generated.map((t,i)=>t+(i===4?delays[4]:delays[0]));assert.deepEqual(deadlines,[40,60,80,100,266.38671875]);assert.equal(arrivals.map((t,i)=>Number(t<=deadlines[i])).join(''),'10001');
 const fromModel=[...q('C',2).model.matchAll(/\(([\d.]+),([\d.]+)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);assert.deepEqual(fromModel,pairs);has('C',2,'10001','66.38671875');
});
test('C3枚举三凑包方案，带宽与时延约束交集唯一20ms',()=>{
 const modes=[10,20,40].map(ms=>{const bytes=64000*(ms/1000)/8,pps=1000/ms;return {ms,bytes,pps,kbps:(bytes+40)*8*pps/1000,delay:75+ms};});
 assert.deepEqual(modes.map(m=>m.bytes),[80,160,320]);assert.deepEqual(modes.map(m=>m.pps),[100,50,25]);assert.deepEqual(modes.map(m=>m.kbps),[96,80,72]);assert.deepEqual(modes.map(m=>m.delay),[85,95,115]);assert.deepEqual(modes.filter(m=>m.kbps<=82&&m.delay<=100).map(m=>m.ms),[20]);has('C',3,'只有20ms','96kbit/s','115ms');
});
test('C4穷举32种独立丢失模式交叉组成功和指定原块不可得概率',()=>{
 let all=0,unavailable=0,mass=0;
 for(let mask=0;mask<32;mask++){const losses=Array.from({length:5},(_,i)=>Boolean(mask&(1<<i))),count=losses.filter(Boolean).length,p=losses.reduce((p,l)=>p*(l?.1:.9),1);mass+=p;if(count<=1)all+=p;if(losses[0]&&count>=2)unavailable+=p;}
 near(mass,1);near(all,.9**5+5*.1*.9**4);near(unavailable,.1*(1-.9**4));near(all,.91854);near(unavailable,.03439);assert.ok(1-unavailable>all);has('C',4,'0.91854','0.03439','25%','0.96561');
});
test('C5丢失位置跨组/同组/含校验改变残缺，双未知有明确多解',()=>{
 const groups=[['A1','A2','A3','A4','PA'],['B1','B2','B3','B4','PB']],order=groups.flat();
 const remaining=lostPositions=>{const lost=new Set(lostPositions.map(i=>order[i-1]));return groups.flatMap(g=>{const missing=g.slice(0,4).filter(x=>lost.has(x));return missing.length===1&&!lost.has(g[4])?[]:missing;});};
 assert.deepEqual(remaining([5,6]),[]);assert.deepEqual(remaining([3,4]),['A3','A4']);assert.deepEqual(remaining([4,5]),['A4']);
 const candidates=[];for(let a=0;a<256;a++)for(let b=0;b<256;b++)if((a^b)===(4^8))candidates.push([a,b]);assert.equal(candidates.length,256);assert.ok(candidates.some(([a,b])=>a===0&&b===12));has('C',5,'最终缺0','共2','共1');
});
test('C6按接收目标枚举12条转发，服务器上传和输出不能混作一份',()=>{
 const n=6,edges=Array.from({length:n},(_,receiver)=>[(receiver+1)%n,(receiver+2)%n].map(sender=>({sender,receiver}))).flat();assert.equal(edges.length,12);assert.ok(edges.every(e=>e.sender!==e.receiver));
 near(n*.6,3.6);near(edges.length*.6,7.2);near(2*.6,1.2);assert.ok(edges.length*.6>6&&2*.6>.9);near(edges.length*.4,4.8);near(2*.4,.8);assert.ok(edges.length*.4<=6&&2*.4<=.9);has('C',6,'3.6Mbit/s','7.2Mbit/s','4.8','0.8Mbit/s');
});
test('C7两报告拟合实际媒体时钟，忽略漂移会形成5.5ms偏差',()=>{
 const audio=(160080-80000)/(20-10),video=(1800000-900000)/10;assert.equal(audio,8008);assert.equal(video,90000);
 const a=10+(124044-80000)/audio,v=10+(1395000-900000)/video;assert.equal(a,15.5);assert.equal(a,v);const nominal=10+(124044-80000)/8000;near(nominal,15.5055);near((nominal-a)*1000,5.5);has('C',7,'8008','15.5055','5.5ms');
});
test('C8以十分之一秒整数推进byte监管，不足不消费且不排队',()=>{
 const events=[[0,2500],[5,1200],[6,600],[7,600],[17,2400],[22,2500]],remaining=[],bits=[];let tokens=3000,last=0;
 for(const [tick,bytes] of events){tokens=Math.min(3000,tokens+(tick-last)*200);last=tick;const ok=tokens>=bytes;bits.push(Number(ok));if(ok)tokens-=bytes;remaining.push(tokens);}
 assert.equal(bits.join(''),'110101');assert.deepEqual(remaining,[500,300,500,100,2100,500]);has('C',8,'110101','500、300、500、100、2100、500','普通包也被转发');
});
test('C9独立逐bit FIFO事件最大延迟与峰积压，不把同一固定等待算两遍',()=>{
 const tickRate=3000000,start=45000;let departed=start,maxDelay=0;
 for(let i=0;i<12000;i++){departed+=3;maxDelay=Math.max(maxDelay,departed);}
 for(let k=1;k<=60000;k++){const arrival=k*5;departed=Math.max(departed,arrival)+3;maxDelay=Math.max(maxDelay,departed-arrival);}
 near(maxDelay/tickRate*1000,27);assert.equal(12000+600000*.015,21000);near(12000/(.025-.015),1200000);has('C',9,'21000bit','27ms','1.2Mbit/s');
});
test('C10全部必要链路原子接纳，反向顺序改变获准者而不改变瓶颈',()=>{
 const requests={X:{rate:1000,path:[0,1]},Y:{rate:1000,path:[1,2]}};
 const admit=order=>{const left=[2000,1200,1600],accepted=[];for(const id of order){const r=requests[id],ok=r.path.every(i=>left[i]>=r.rate);accepted.push(ok);if(ok)for(const i of r.path)left[i]-=r.rate;}return {left,accepted};};
 assert.deepEqual(admit(['X','Y']),{left:[1000,200,1600],accepted:[true,false]});assert.deepEqual(admit(['Y','X']),{left:[2000,200,600],accepted:[true,false]});assert.ok(2000>1200);has('C',10,'A1、B0.2、C1.6','A2、B0.2、C0.6','瓶颈B');
});
test('解释中的关键模型边界：时钟偏移、期限、依赖与重排',()=>{
 assert.deepEqual([20+100,40+100],[120,140]);assert.equal((40+100)-(20+100),20);has('R',5,'120ms、140ms','漂移');has('R',6,'10%','20%');
 const usable=new Map([['I1',true],['P2',false]]);usable.set('P3',usable.get('P2'));usable.set('I4',true);usable.set('P5',usable.get('I4'));assert.deepEqual([...usable].filter(([,ok])=>ok).map(([id])=>id),['I1','I4','P5']);has('R',3,'I1、I4、P5');
 assert.equal(Math.max(0,20,40),40);assert.equal(Math.max(10,30,50),50);has('R',11,'多等40ms');has('R',12,'L3','L4');has('R',13,'35ms','晚5ms');
 const received=[100,102,101,102];assert.deepEqual([...new Set(received)].sort(),[100,101,102]);has('R',14,'缺0个','重复1个');
 const frames=[{seq:100,ts:3000},{seq:101,ts:1000},{seq:102,ts:2000}];
 assert.deepEqual(frames.slice().sort((a,b)=>a.seq-b.seq).map(q=>q.seq),[100,101,102]);
 assert.deepEqual(frames.slice().sort((a,b)=>a.ts-b.ts).map(q=>q.seq),[101,102,100]);
 assert.ok(q('R',14).stem.includes('按序号重排后提交解码器'));has('R',14,'不能只凭序号确定播放顺序');
});
test('R15同会话随机SSRC冲突需要重选，同主机IP不能标识多个同步源',()=>{
 const occupied=new Set([7]),choices=[7,11];let replacement;
 for(const candidate of choices)if(!occupied.has(candidate)){replacement=candidate;break;}
 assert.equal(choices[0],7);assert.equal(replacement,11);assert.notEqual(replacement,7);
 const hosts=['192.0.2.1','192.0.2.1'];assert.equal(new Set(hosts).size,1);assert.equal(new Set([7,replacement]).size,2);
 assert.ok(q('R',15).stem.includes('同一RTP会话'));assert.ok(q('R',15).stem.includes('相关发送源应如何消除标识冲突'));has('R',15,'重新选择SSRC','随机选择只让冲突概率小','多个同步源可共用一个IP','若仍冲突');
 assert.ok(!/旧包|另有已确认|不要求实现/.test(q('R',15).stem));assert.ok(q('R',15).stem.length<150);
 assert.ok(!q('R',15).stem.includes('两个独立RTP会话'));
});
test('本章题型库存合既有蓝图，已去掉与数据平面重复的非抢占单题',()=>{
 const groups=examBlueprints.network.groups.map(g=>({...g,available:qs.filter(q=>chapterCategory('network',q)===g.name).length}));assert.doesNotThrow(()=>assertChapterStock(groups));assert.equal(Math.min(...groups.map(g=>Math.floor(g.available/g.count))),3);
 assert.ok(!q('S',28).stem.includes('低优先级大包'));assert.ok(!q('F',24).stem.includes('不可抢占'));
});
test('90题逐项有真实源机制分层，现有practiceWeight实际读相对权重',()=>{
 const mapping={basic:2,core:3,supplement:1};for(const item of qs){assert.ok(item.studyLevel in mapping,item.id);assert.equal(item.studyWeight,mapping[item.studyLevel]);assert.ok(item.studyEvidence.length>20,item.id);assert.ok(/PPT|教材/.test(item.studyEvidence));assert.ok(!/studyLevel|studyWeight|studyEvidence/.test(item.stem));}
 assert.deepEqual(Object.fromEntries(Object.keys(mapping).map(level=>[level,qs.filter(q=>q.studyLevel===level).length])),{basic:33,core:48,supplement:9});
 assert.equal(qs.reduce((n,q)=>n+q.studyWeight,0),219);assert.equal(q('F',9).studyLevel,'core');assert.equal(q('S',1).studyLevel,'basic');assert.equal(q('R',18).studyLevel,'supplement');
 const basic=practiceWeight('network',q('S',1)),core=practiceWeight('network',q('F',9)),supplement=practiceWeight('network',q('R',18));near(core,basic*1.5);near(supplement,basic*.5);near(core,supplement*3);
});
