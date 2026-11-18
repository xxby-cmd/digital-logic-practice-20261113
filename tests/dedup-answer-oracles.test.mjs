import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const decimal='[+-]?\\d+(?:\\.\\d+)?';
const superscripts='⁰¹²³⁴⁵⁶⁷⁸⁹';
const text=q=>q.stem.replace(/10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g,(_,digits)=>'10^'+[...digits].map(c=>superscripts.indexOf(c)).join('')).normalize('NFKC').replace(/µ/g,'μ');
const observations=[];
function current(subject,id){
 const q=getPracticeCourse(subject).questions.find(q=>q.id===id);assert.ok(q,id);assert.equal(q.revision,2,id+'必须读取当前修订');assert.equal(q.type,'fill');return q;
}
function match(s,pattern,label){const found=s.match(pattern);assert.ok(found,'公开题意未匹配：'+label);return found;}
function check(q,derived,wrong,details){
 const ordinary=derived.map(String),signed=derived.map(n=>(Number(n)<0?'−':'+')+Math.abs(Number(n)).toFixed(4));
 const fullwidth=signed.map(s=>'　'+s.replace('−','-').replace(/[0-9+.-]/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0))+'　');
 const leadingDot=ordinary.map(s=>s.replace(/^(-?)0\./,'$1.'));
 const accepted=[ordinary,signed,fullwidth,leadingDot].map(answer=>({answer,result:grade(q,answer)}));
 const rejected=wrong.map(({reason,answer})=>({reason,answer:answer.map(String),result:grade(q,answer.map(String))}));
 observations.push({id:q.id,revision:q.revision,stem:q.stem,derived:ordinary,details,accepted,rejected});
 for(const item of accepted)assert.equal(item.result.correct,true,q.id+'数字格式应接受 '+JSON.stringify(item.answer));
 for(const item of rejected)assert.equal(item.result.correct,false,q.id+'典型错因应拒绝 '+item.reason);
}
function exactDecimals(values){
 const digits=Math.max(...values.map(s=>(s.split('.')[1]||'').length)),scale=10n**BigInt(digits);
 const integers=values.map(s=>{const negative=s.startsWith('-'),[whole,fraction='']=s.replace(/^[+-]/,'').split('.');const n=BigInt(whole)*scale+BigInt(fraction.padEnd(digits,'0')||'0');return negative?-n:n;});
 return {integers,scale,digits};
}
const maximum=xs=>xs.reduce((a,b)=>a>b?a:b),minimum=xs=>xs.reduce((a,b)=>a<b?a:b);

test('电平干扰范围由实际四区间求连续最大边界，逐端点及边界外反例核答案',()=>{
 const q=current('digital','P2-digital-3-3'),s=text(q);
 assert.match(s,/接收端电压等于驱动输出加同一个干扰电压ΔV/);assert.match(s,/两段输出电压的整个范围均落在相应的保证识别区内/);
 const d0=match(s,new RegExp(`输出0时电压在(${decimal})~(${decimal})\\s*V`),'驱动低范围').slice(1);
 const d1=match(s,new RegExp(`输出1时在(${decimal})~(${decimal})\\s*V`),'驱动高范围').slice(1);
 const r0=match(s,new RegExp(`接收器将(${decimal})~(${decimal})\\s*V保证识别为0`),'接收低范围').slice(1);
 const r1=match(s,new RegExp(`(?:、|,)\\s*(${decimal})~(${decimal})\\s*V保证识别为1`),'接收高范围').slice(1);
 const {integers:v,scale}=exactDecimals([...d0,...d1,...r0,...r1]);
 const [a,b,c,d,e,f,g,h]=v;for(const [lo,hi]of [[a,b],[c,d],[e,f],[g,h]])assert.ok(lo<=hi);
 const lowerCandidates=[e-a,g-c],upperCandidates=[f-b,h-d],lower=maximum(lowerCandidates),upper=minimum(upperCandidates);assert.ok(lower<=upper);
 // Affine translation is increasing: both interval endpoints are necessary
 // and sufficient. Exact decimal integers avoid floating boundary tolerance.
 const contained=(delta,multiplier=1n)=>a*multiplier+delta>=e*multiplier&&b*multiplier+delta<=f*multiplier&&c*multiplier+delta>=g*multiplier&&d*multiplier+delta<=h*multiplier;
 assert.ok(contained(lower));assert.ok(contained(upper));
 assert.equal(contained(lower*10n-1n,10n),false);assert.equal(contained(upper*10n+1n,10n),false);
 const asNumber=n=>Number(n)/Number(scale),answer=[asNumber(lower),asNumber(upper)];
 check(q,answer,[
  {reason:'只检查高电平范围',answer:[asNumber(g-c),asNumber(h-d)]},
  {reason:'把低态两侧容许量误当对称范围',answer:[-asNumber(upper),asNumber(upper)]},
  {reason:'漏掉低态上界约束',answer:[asNumber(lower),asNumber(h-d)]}
 ],{driver:[d0,d1],receiver:[r0,r1],exactScale:String(scale),lowerConstraints:lowerCandidates.map(String),upperConstraints:upperCandidates.map(String),proof:'对单调仿射平移，四端点包含等价于整个两段区间包含；边界外1/(10*scale)即有端点超保证区。'});
});

test('传播延迟从实际50%交叉事件求得，输出10至90变化不混作传播时间',()=>{
 const q=current('digital','P4-digital-3-F-001'),s=text(q);
 const input=match(s,new RegExp(`输入下降沿经过(${decimal})%幅度的时刻为(${decimal})\\s*ns`),'输入下降交叉事件');
 const output=match(s,new RegExp(`输出上升沿经过(${decimal})%、(${decimal})%、(${decimal})%幅度的时刻依次为(${decimal})、(${decimal})、(${decimal})\\s*ns`),'输出三个交叉事件');
 const definition=match(s,/按输入、输出(\d+)%点计,tPLH/,'传播延迟定义');
 const duration=match(s,/输出由(\d+)%升至(\d+)%所需时间/,'输出变化时间定义');
 const events=new Map([0,1,2].map(i=>[Number(output[1+i]),Number(output[4+i])])),inputLevel=Number(input[1]),inputTime=Number(input[2]),level=Number(definition[1]);
 assert.equal(inputLevel,level);assert.ok(events.has(level));assert.ok(events.has(Number(duration[1])));assert.ok(events.has(Number(duration[2])));
 const propagation=events.get(level)-inputTime,rise=events.get(Number(duration[2]))-events.get(Number(duration[1]));
 assert.ok(propagation>0&&rise>0);
 check(q,[propagation,rise],[
  {reason:'把输出10%当传播测量点',answer:[events.get(Number(duration[1]))-inputTime,rise]},
  {reason:'把输出90%当传播测量点',answer:[events.get(Number(duration[2]))-inputTime,rise]},
  {reason:'直接拿输出上升段代替输入至输出传播',answer:[rise,rise]}
 ],{input:{direction:'falling',level:inputLevel,timeNs:inputTime},output:{direction:'rising',events:[...events]},propagationNs:propagation,outputTransitionNs:rise});
});

test('固定整数比特映射枚举全部二进制组合，最大可行k向下取整并保留闲置状态',()=>{
 const q=current('network','P2-network-physical-78'),s=text(q),states=Number(match(s,/每个码元有(\d+)种可区分/,'状态数')[1]);
 assert.match(s,/固定的k个二进制位一一映射成一个码元/);assert.match(s,/不跨码元联合编码/);assert.match(s,/k取最大整数/);
 let k=0,words=[''];const feasibility=[];
 while(true){const doubled=words.flatMap(w=>[w+'0',w+'1']);feasibility.push({k:k+1,combinations:doubled.length,feasible:doubled.length<=states});if(doubled.length>states)break;words=doubled;k++;}
 assert.equal(new Set(words).size,words.length);const unused=states-words.length;assert.ok(unused>=0);
 check(q,[k,unused],[
  {reason:'把给状态编号的ceil方向用于承载完整比特组',answer:[k+1,0]},
  {reason:'忽略非二次幂的闲置状态',answer:[k,0]},
  {reason:'把非整数平均信息量当固定整数分组',answer:[Math.log2(states),unused]}
 ],{states,binaryWords:words,feasibility,injectiveAssignment:words.map((word,i)=>({word,state:i})),unused});
});

test('有限单包在末位发完时按逐位入链与到达事件计数，不拿连续BDP代替占用',()=>{
 const q=current('network','P2-network-physical-79'),s=text(q);
 assert.match(s,/开始时空闲的链路/);assert.match(s,/只发送一个/);assert.match(s,/末比特刚发送完毕时/);
 const rateMb=Number(match(s,new RegExp(`发送速率为(${decimal})\\s*Mb/s`),'发送速率')[1]),propagationMs=Number(match(s,new RegExp(`单向传播时延为(${decimal})\\s*ms`),'单程传播')[1]),length=Number(match(s,/只发送一个(\d+)\s*bit分组/,'单包位数')[1]);
 const rate=rateMb*1e6,propagationTicks=rate*propagationMs/1000,observationTick=length;assert.ok(Number.isInteger(length)&&length>0);assert.ok(Number.isInteger(propagationTicks));
 let inFlight=0,alreadyArrived=0;
 for(let bit=0;bit<length;bit++){
  const frontEntered=bit,tailEntered=bit+1,frontArrives=frontEntered+propagationTicks;
  if(tailEntered<=observationTick&&frontArrives>observationTick)inFlight++;
  if(frontArrives<=observationTick)alreadyArrived++;
 }
 check(q,[inFlight],[
  {reason:'默认无穷连续满发而求链路容量',answer:[propagationTicks]},
  {reason:'把发送完成当作接收完成或改问已收到位数',answer:[alreadyArrived]},
  {reason:'Mb/s与ms相乘漏1000换算',answer:[rateMb*propagationMs]}
 ],{bits:length,rateBitsPerSecond:rate,clockTickSeconds:1/rate,observedAtMs:observationTick/rate*1000,firstArrivalMs:propagationTicks/rate*1000,actualInFlight:inFlight,alreadyArrived,continuousCapacity:propagationTicks});
});

test('线路编码按实际完整组和补零末组发送，再由线路位数反求速率',()=>{
 const q=current('network','P2-network-physical-80'),s=text(q);
 const mapping=match(s,/每(\d+)位数据编码成一个(\d+)位线路码字/,'定长编码'),dataPerGroup=Number(mapping[1]),wirePerGroup=Number(mapping[2]);
 const tail=match(s,/末组不足(\d+)位时补0/,'末组补零');assert.equal(Number(tail[1]),dataPerGroup);
 const rawLength=Number(match(s,/现发送(\d+)位原始数据/,'本次原始长度')[1]),sendUs=Number(match(s,new RegExp(`发出编码后的全部码字共耗时(${decimal})\\s*μs`),'线路发送时间')[1]);assert.ok(dataPerGroup>0&&wirePerGroup>=dataPerGroup&&sendUs>0);
 const data=Array.from({length:rawLength},(_,i)=>i%2),groups=[],wire=[];
 for(let i=0;i<data.length;i+=dataPerGroup){const actual=data.slice(i,i+dataPerGroup),padded=actual.slice();while(padded.length<dataPerGroup)padded.push(0);groups.push({actualBits:actual.length,padding:dataPerGroup-actual.length,padded});for(let j=0;j<wirePerGroup;j++)wire.push({group:groups.length-1,position:j});}
 const lineBits=wire.length,rateMb=lineBits/sendUs;
 check(q,[lineBits,rateMb],[
  {reason:'用连续比例后再对总数取整，漏整码字边界',answer:[Math.ceil(rawLength*wirePerGroup/dataPerGroup),Math.ceil(rawLength*wirePerGroup/dataPerGroup)/sendUs]},
  {reason:'忽略编码，原始位数直接除发送时间',answer:[rawLength,rawLength/sendUs]},
  {reason:'丢掉不足一个完整数据组的末组',answer:[Math.floor(rawLength/dataPerGroup)*wirePerGroup,Math.floor(rawLength/dataPerGroup)*wirePerGroup/sendUs]}
 ],{dataBits:rawLength,dataPerGroup,wirePerGroup,groups,lineBits,sendUs,rateMb,unitRelation:'1 bit/μs = 1 Mb/s'});
});

test('往返前沿计时含一次远端等待，按实际事件模型求距离并枚举反核',()=>{
 const q=current('network','P2-network-physical-82'),s=text(q);
 assert.match(s,/同一条直连链路/);assert.match(s,/从A发出探测脉冲的前沿,到A收到应答脉冲的前沿/);assert.match(s,/即发出应答前沿/);
 const totalUs=Number(match(s,new RegExp(`共经过(${decimal})\\s*μs`),'前沿往返总时间')[1]),waitUs=Number(match(s,new RegExp(`收到探测前沿后等待(${decimal})\\s*μs`),'远端等待')[1]);
 const v=match(s,new RegExp(`两个方向的传播速度均为(${decimal})×10\\^(\\d+)\\s*m/s`),'两向传播速度'),speed=Number(v[1])*10**Number(v[2]);assert.ok(totalUs>waitUs&&waitUs>=0&&speed>0);
 const distance=(totalUs-waitUs)*speed/2e6,nsPerMeter=1e9/speed;assert.ok(Number.isInteger(nsPerMeter));assert.ok(Number.isInteger(distance));
 const matches=[];for(let meters=0;meters<=Math.ceil(speed*totalUs/1e6);meters++)if(2*meters*nsPerMeter+waitUs*1000===totalUs*1000)matches.push(meters);
 assert.deepEqual(matches,[distance]);
 const receiveB=distance/speed*1e6,respondB=receiveB+waitUs,receiveA=respondB+distance/speed*1e6;assert.equal(receiveA,totalUs);
 check(q,[distance],[
  {reason:'忘记扣远端等待',answer:[totalUs*speed/2e6]},
  {reason:'扣等待后把去回两程当单程',answer:[(totalUs-waitUs)*speed/1e6]},
  {reason:'把一次远端等待扣了两次',answer:[(totalUs-2*waitUs)*speed/2e6]}
 ],{speedMetersPerSecond:speed,totalUs,waitUs,eventsUs:{Atransmits:0,Breceives:receiveB,Bresponds:respondB,Areceives:receiveA},distanceMeters:distance,integerDistanceMatches:matches,continuousProof:'2d/v+wait=total，2/v>0，因此实数域也只有一个解；枚举不是连续域唯一性的替代。'});
});

test.after(()=>{
 if(process.env.DEDUP_ORACLE_EVIDENCE!=='1')return;
 const directory=new URL('../../制作记录/总目标进度/去重实审_20261118/数电计网/',import.meta.url);mkdirSync(directory,{recursive:true});
 const report={at:new Date().toISOString(),testFile:'tests/dedup-answer-oracles.test.mjs',testSha256:createHash('sha256').update(readFileSync(fileURLToPath(import.meta.url))).digest('hex'),source:'当前getPracticeCourse公开stem；不读候选答案作输入、不用q.answers推导',questions:observations.length,observations,scope:'严格解析6题数据/语义，独立代数/事件/组合/分组求解并用实际grade核公开答案。无SDK/构建；普通测试默认不写记录。'};
 writeFileSync(new URL('六题现题答案核验.json',directory),JSON.stringify(report,null,2)+'\n');
});
