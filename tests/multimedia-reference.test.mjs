import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../制作记录/并行扩题/计网多媒体核验/',import.meta.url);
async function local(t){try{return JSON.parse(await readFile(new URL('教材候选10题.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;t.skip('第三方课后习题载荷只在本地');return null;}}
const item=(qs,id)=>qs.find(q=>q.id==='KR7-MM-'+id);
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,'actual='+a+' expected='+b);
test('10正式课后题的题号、源页、范围和本地分发元数据完整',async t=>{
 const qs=await local(t);if(!qs)return;assert.equal(qs.length,10);assert.equal(new Set(qs.map(q=>q.id)).size,10);
 assert.deepEqual(qs.map(q=>q.reference.problem),['R3','R7','P4','P5','P7','P9','P11','P17','P20','P21']);
 assert.deepEqual(['分析题','计算题'].map(s=>qs.filter(q=>q.section===s).length),[5,5]);
 for(const q of qs){assert.equal(q.chapter,9);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.match(q.reference.sourceSHA256,/^[a-f0-9]{64}$/);assert.ok(q.reference.adaptation);assert.ok(q.model.length>100);assert.ok(q.rubric.length>=4);assert.equal(q.walkthrough.steps.length,3);assert.ok(!/同上|见图/.test(q.stem));}
});
test('R3保留原16000采样/1024量化值，位数与量化级数不可混淆',async t=>{
 const qs=await local(t);if(!qs)return;const q=item(qs,'R3');assert.ok(q.stem.includes('16000'));assert.ok(q.stem.includes('1024'));
 assert.equal(Math.log2(1024),10);assert.equal(16000*Math.log2(1024),160000);assert.ok(q.model.includes('160000bit/s'));
});
test('R7传输字节交付与应用播放阶段分开，不强定物理拷贝数',async t=>{
 const qs=await local(t);if(!qs)return;const q=item(qs,'R7');assert.ok(q.model.includes('不等于对应音画已经按时播放'));assert.ok(q.model.includes('共享内存'));
});
test('P4提前退出发送上限，用小步流体积分交叉有限/无限分支',async t=>{
 const qs=await local(t);if(!qs)return;
 function simulate(x,r,E,T){let sent=0,watched=0;const dt=1/10000;for(let i=0;i<Math.round(E/dt);i++){sent=Math.min(r*T,sent+x*dt);watched+=r*dt;}return sent-watched;}
 for(const [x,r,E,T] of [[3,1,1,2],[3,1,1,10],[8,2,3,5],[2,1,2,10]]){near(simulate(x,r,E,T),Math.min(x*E,r*T)-r*E,1e-8);near(simulate(x,r,E,1e10),(x-r)*E,1e-8);}
 assert.ok(item(qs,'P4').model.includes('min(xE,rT)−rE'));assert.ok(item(qs,'P4').model.includes('rT/x'));
});
test('P5枚举全部音视频笛卡尔组合，对比分离资源集',async t=>{
 const qs=await local(t);if(!qs)return;
 for(let n=1;n<=15;n++){const a=Array.from({length:n},(_,i)=>'a'+i),v=Array.from({length:n},(_,i)=>'v'+i);assert.equal(new Set(a.flatMap(x=>v.map(y=>x+y))).size,n*n);assert.equal(new Set([...a,...v]).size,2*n);}
 assert.ok(item(qs,'P5').model.includes('N²'));assert.ok(item(qs,'P5').model.includes('2N'));
 assert.ok(2*1>1**2);assert.equal(2*2,2**2);assert.ok(2*3<3**2);assert.ok(item(qs,'P5').model.includes('只有N>2'));assert.ok(item(qs,'P5').model.includes('N=1'));
});
test('P7正向递推交叉倒序指数展开，不能丢有限初值项',async t=>{
 const qs=await local(t);if(!qs)return;
 for(let n=1;n<40;n++){const history=Array.from({length:n},(_,i)=>10+(i*7)%23),initial=19;
  const recursive=history.reduce((d,x)=>.9*d+.1*x,initial),expanded=.9**n*initial+history.slice().reverse().reduce((d,x,i)=>d+.1*.9**i*x,0);
  near(recursive,expanded);near(.9**n+history.reduce((s,_,i)=>s+.1*.9**i,0),1);}
 const model=item(qs,'P7').model;for(const s of ['0.9^4 d0','0.1x1','0.09x2','0.081x3','0.0729x4'])assert.ok(model.includes(s));
 const sum=Array.from({length:500},(_,i)=>.1*.9**i*(i%2===0?50:20)).reduce((a,b)=>a+b,0);near(sum,.1*(50+.9*20)/(1-.9**2));assert.ok(50*.9**500<1e-18);
 assert.ok(item(qs,'P7').stem.includes('时延样本有界'));assert.ok(model.includes('0.1Σ[j=1..∞]'));
});
test('P9递推累计均值逐前缀等于直接求和，新样本权重随n减小',async t=>{
 const qs=await local(t);if(!qs)return;const samples=[5,100,3,30,18,99,12];let mean=samples[0];
 for(let n=2;n<=samples.length;n++){mean=((n-1)*mean+samples[n-1])/n;near(mean,samples.slice(0,n).reduce((a,b)=>a+b,0)/n);}
 assert.ok(1/1000<.1);assert.ok(item(qs,'P9').model.includes('(1−1/n)'));assert.ok(item(qs,'P9').model.includes('1/n'));
 assert.ok(.1<1/5);assert.equal(.1,1/10);assert.ok(.1>1/11);assert.ok(item(qs,'P9').stem.includes('0<u≤1'));assert.ok(item(qs,'P9').model.includes('n>1/u'));
});
test('P11原图到达台阶逐包算迟到，等号可用并区分两个延迟起点',async t=>{
 const qs=await local(t);if(!qs)return;const generated=[1,2,3,4,5,6,7,8],arrivals=[8,9,12,12,12,15,15,16];
 assert.deepEqual(arrivals.map((a,i)=>a-generated[i]),[7,7,9,8,7,9,8,8]);
 const late=start=>arrivals.flatMap((a,i)=>a>start+i?[i+1]:[]);assert.deepEqual(late(8),[3,4,6,7,8]);assert.deepEqual(late(9),[3,6]);assert.deepEqual(late(10),[]);
 const earliest=Math.max(...arrivals.map((a,i)=>a-i));assert.equal(earliest,10);assert.equal(earliest-generated[0],9);assert.equal(earliest-arrivals[0],2);
 const q=item(qs,'P11');assert.ok(q.stem.includes(arrivals.join('、')));assert.ok(q.model.includes('3、4、6、7、8'));assert.ok(q.model.includes('额外等待2'));
});
test('P17逐槽FIFO/桶封顶/槽末补充，按原图t6与t7到达',async t=>{
 const qs=await local(t);if(!qs)return;
 const arrivals={0:[1,2,3],1:[4],2:[5],3:[6],6:[7,8],7:[9,10]},before=[],outputs=[];let queue=[],tokens=2;
 for(let slot=0;slot<=8;slot++){queue.push(...arrivals[slot]??[]);before.push([queue.slice(),tokens]);const out=queue.splice(0,Math.min(tokens,queue.length,2));tokens-=out.length;outputs.push(out);tokens=Math.min(2,tokens+1);}
 assert.deepEqual(before,[[[1,2,3],2],[[3,4],1],[[4,5],1],[[5,6],1],[[6],1],[[],1],[[7,8],2],[[9,10],1],[[10],1]]);
 assert.deepEqual(outputs,[[1,2],[3],[4],[5],[6],[],[7,8],[9],[10]]);
 const q=item(qs,'P17');assert.ok(q.stem.includes('t6:{7,8}'));assert.ok(q.stem.includes('t7:{9,10}'));assert.ok(q.model.includes('t5空/1'));
});
test('P20容量1峰值桶形成1/p间距，保留首桶长期/突发预算',async t=>{
 const qs=await local(t);if(!qs)return;const p=2,b=1;let last=-Infinity;const arrivals=[0,0,0,2,2,2.1],released=arrivals.map(t=>last=Math.max(t,last+1/p));
 for(let i=1;i<released.length;i++)assert.ok(released[i]-released[i-1]>=1/p);assert.equal(b,1);assert.deepEqual(released,[0,.5,1,2,2.5,3]);
 assert.ok(item(qs,'P20').model.includes('容量1'));assert.ok(item(qs,'P20').model.includes('速率p'));
 const alreadyRelease=[0,.5,1,1.5];assert.ok(alreadyRelease.slice(1).every((t,i)=>t-alreadyRelease[i]>=1/2));assert.ok(item(qs,'P20').stem.includes('p>0'));assert.ok(item(qs,'P20').model.includes('不必额外增桶'));
});
test('P21穷举729种离散到达，所有区间合规流不等令牌；仅平均合规有反例',async t=>{
 const qs=await local(t);if(!qs)return;let conforming=0;
 for(let code=0;code<3**6;code++){let value=code;const a=Array.from({length:6},()=>{const d=value%3;value=Math.floor(value/3);return d;});let conforms=true;
  for(let i=0;i<6;i++)for(let j=i;j<6;j++)if(a.slice(i,j+1).reduce((s,x)=>s+x,0)>2+(j-i))conforms=false;
  if(!conforms)continue;conforming++;let tokens=2;for(let t=0;t<6;t++){if(t)tokens=Math.min(2,tokens+1);assert.ok(a[t]<=tokens);tokens-=a[t];}}
 assert.ok(conforming>100);const shortBurst=[3,0,0,0,0,0];assert.ok(shortBurst.reduce((a,b)=>a+b,0)/6<1);assert.ok(shortBurst[0]>2);
 assert.ok(item(qs,'P21').model.includes('最近一次满桶后开始消耗'));assert.ok(item(qs,'P21').stem.includes('没有输出瓶颈'));
 assert.ok(item(qs,'P21').stem.includes('区间两端'));assert.ok(item(qs,'P21').model.includes('消耗前的满桶'));
});
