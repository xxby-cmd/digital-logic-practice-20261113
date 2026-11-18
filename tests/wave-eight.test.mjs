import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {waveEightPractice} from '../bank-wave-08.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
const qs=waveEightPractice.digital;
const q=(kind,n)=>qs.find(v=>v.id==='P5-digital-8-'+kind+'-'+String(n).padStart(3,'0'));
const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,'actual='+a+' expected='+b);
const choice=n=>q('S',n).options[q('S',n).answer];
const first=n=>q('F',n).answers.map(a=>a[0]);
const numeric=n=>first(n).map(Number);
const voltage=(start,end,tau,time)=>end+(start-end)*Math.exp(-time/tau);
function reach(start,end,target,tau){
 assert.ok((target-start)*(end-target)>0,'目标不在起点与渐近终值之间');
 let left=0,right=tau;
 while((voltage(start,end,tau,right)-target)*(start-target)>0)right*=2;
 for(let i=0;i<70;i++){const mid=(left+right)/2;if((voltage(start,end,tau,mid)-target)*(start-target)>0)left=mid;else right=mid;}
 return (left+right)/2;
}
const out555=(old,reset,trig,thr,lo,hi)=>reset===0?0:trig<lo?1:thr>hi?0:old;
function mono(events,width,{retrigger=false,recovery=0}={}){
 const intervals=[];let start=null,end=null,ready=-Infinity;
 for(const event of events){
  if(end!==null&&end<=event.time){intervals.push([start,end]);ready=end+recovery;start=end=null;}
  if(event.reset){if(end!==null)intervals.push([start,event.time]);start=end=null;ready=event.time+recovery;continue;}
  if(!event.trigger)continue;
  if(end!==null){if(retrigger)end=event.time+width;}
  else if(event.time>=ready){start=event.time;end=event.time+width;}
 }
 if(end!==null)intervals.push([start,end]);
 return intervals;
}
const triggers=times=>times.map(time=>({time,trigger:true}));
function schmitt(values,lo,hi,initial=1,inverting=true){
 let out=initial;
 return values.map(v=>{if(v<lo)out=inverting?1:0;else if(v>hi)out=inverting?0:1;return out;});
}

test('80原创按四类分布，题干全库精确去重且第三方不进源码',async()=>{
 assert.equal(qs.length,80);assert.equal(new Set(qs.map(v=>v.id)).size,80);
 assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>qs.filter(q=>q.section===s).length),[20,20,24,16]);
 let refs=[];try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).digital;}catch(e){if(e.code!=='ENOENT')throw e;}
 const all=[...new Map([...getPracticeCourse('digital').questions,...refs,...qs].map(v=>[v.id,v])).values()];
 for(const item of qs){assert.equal(item.pool,'practice');assert.equal(item.chapter,8);assert.equal(item.origin,'原创');assert.equal(item.revision,1);assert.ok(!item.reference);assert.equal(all.filter(v=>norm(v.stem)===norm(item.stem)).length,1,item.id);assert.ok(!/同上|上一题|沿用前题|见图/.test(item.stem));if(item.type==='short'){assert.ok(item.model.length>100,item.id);assert.ok(item.rubric.length>=4,item.id);}else assert.ok(item.explanation.length>35,item.id);}
});
test('全部客观题存储答案可评分，整数比常用写法等价',()=>{
 for(const item of qs){if(item.type==='single'){assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);assert.equal(grade(item,item.answer).correct,true);for(let i=0;i<4;i++)assert.equal(grade(item,i).correct,i===item.answer);}
  else if(item.type==='fill'){assert.equal(item.answers.length,item.formats.length);assert.equal(grade(item,item.answers.map(v=>v[0])).correct,true);for(let i=0;i<item.answers.length;i++)for(const alias of item.answers[i]){const answers=item.answers.map(v=>v[0]);answers[i]=alias;assert.equal(grade(item,answers).correct,true);}}
 }
 for(const alias of ['2:1','2∶1','2/1'])assert.equal(grade(q('F',7),[alias]).correct,true);
 assert.equal(grade(q('F',7),['1:2']).correct,false);
});
test('电路类别/输出极性与晶体作用是对应功能而非输出有脉冲即同类',()=>{
 assert.equal(choice(1),'无稳态多谐振荡器');assert.equal(choice(2),'单稳态电路');assert.equal(choice(3),'进入此区间以前的输出状态');
 assert.ok(choice(13).includes('谐振'));assert.ok(choice(14).includes('依赖更小'));assert.equal(choice(18),'取Q̅输出');
 assert.ok(q('C',1).model.includes('甲选多谐振荡器'));assert.ok(q('C',1).model.includes('乙选单稳态'));assert.ok(q('C',1).model.includes('丙选施密特'));
});
test('相对幅度、交点、平均电压与有抖动的周期统计独立核算',()=>{
 assert.deepEqual(numeric(1),[1+.1*4,1+.9*4]);assert.deepEqual(numeric(2),[3.7-1.2,25]);
 near(-1+.5*(3-(-1)),1);near((3-1)/(5-1),.5);
 const periods=[1-0,2.02-1,3-2.02];near(periods.reduce((a,b)=>a+b,0),3);near(3/(3e-3),1000);
 assert.ok(q('R',1).model.includes('0.98 ms'));assert.ok(q('R',2).model.includes('1 V'));assert.ok(q('R',24).model.includes('100Hz'));
 assert.equal(choice(16),'上升时间');assert.ok(choice(19).startsWith('不能'));
});
test('555复位优先、默认及外部CO阈值、七步输入跟踪完整',()=>{
 assert.equal(choice(4),'被强制为低');assert.deepEqual(numeric(4),[0,1]);assert.deepEqual(numeric(3),[6,3]);
 assert.deepEqual(numeric(6),[3,6,3]);assert.ok(choice(6).includes('默认分压'));
 let out=0;const inputs=[[1,3,3],[1,1,5],[1,3,3],[1,3,5],[0,1,1],[1,3,3],[1,1,1]];
 const trace=inputs.map(([reset,trig,thr])=>(out=out555(out,reset,trig,thr,2,4))).join('');
 assert.equal(trace,'0110001');assert.ok(q('R',3).model.includes(trace));
 assert.equal(out555(0,1,3,3,2,4),0);assert.equal(out555(1,1,3,3,2,4),1);assert.ok(q('R',4).model.includes('不能唯一确定'));
});
test('稳态/启动/预充三种起点给不同定时，电容短路与阈值不可达不硬套周期',()=>{
 near(reach(0,1,2/3,3),3*Math.log(3));near(reach(1/3,1,2/3,3),3*Math.log(2));
 assert.ok(q('R',6).model.includes('3.29584'));assert.ok(q('R',6).model.includes('2.07944'));
 near(reach(1/3,1,2/3,1)*.69/Math.log(2),numeric(10)[0]);
 assert.ok(q('R',5).model.includes('稳态电容在VCC/3与2VCC/3'));
 assert.equal(out555(0,1,0,0,1/3,2/3),1);assert.ok(q('R',7).model.includes('一直为高'));
 assert.throws(()=>reach(0,1,1,1));assert.ok(q('R',8).model.includes('不能完成正常周期'));
});
test('DIS截止节点由外电路决定，数值随电容变化且不能当推挽输出',()=>{
 for(const cap of [3,6]){const dis=(9+cap)/2;near((9-dis)/10,(dis-cap)/10);}
 assert.deepEqual(numeric(8),[6,7.5]);assert.ok(q('R',9).model.includes('电压随电容变化'));assert.equal(choice(5),'导通，使DIS提供放电通路');
 assert.ok(q('R',10).model.includes('导线却把CO直流电位强制为0'));assert.ok(choice(12).includes('电容两端电压'));
});
test('二极管压降的充电终值与放电电阻模型逐节点KCL交叉核',()=>{
 const coeff=reach(5/3,4.3,10/3,1);near(coeff,1.0021520224805474);assert.ok(q('R',11).model.includes('1.00215'));
 const supply=6,r1=10,r2=10,rd=1,final=supply*rd/(r1+rd),rth=r2+r1*rd/(r1+rd);
 near(final,6/11);near(rth,120/11);
 // 在多个电容电压处直接解DIS，再与戴维南模型给出的电容电流比较。
 for(const cap of [2,2.5,3,3.5,4]){const dis=(supply/r1+cap/r2)/(1/r1+1/r2+1/rd);near((dis-cap)/r2,(final-cap)/rth);}
 near(reach(4,final,2,rth*.1),.9436335681672049);assert.ok(q('R',12).model.includes('0.94363'));
});
test('时间缩放与联动调频保持占空比，单改R1不满足同一约束',()=>{
 assert.deepEqual(numeric(9),[2,.5]);
 const c=.1,r2=1/(.69*2.5*c),r1=r2/2;
 for(const scale of [1,.75,.5]){const h=.69*(r1+r2)*c*scale,l=.69*r2*c*scale;near(h+l,scale);near(h/(h+l),.6);}
 assert.notEqual((r1/2+r2)/(r1/2+2*r2),.6);
 assert.ok(q('C',3).model.includes('5.7971'));assert.ok(q('C',3).model.includes('1.44928'));
 assert.equal(choice(17),'占空比改变而总周期基本不变');assert.equal(first(7)[0],'2:1');
});
test('单一错误元件的两段测量可唯一定位，非只据总周期猜元件',()=>{
 const r1=(3.45/(.69*.1))-20;near(r1,30);
 const originalH=.69*(10+20)*.1,originalL=.69*20*.1;
 near(originalH,2.07);near(originalL,1.38);
 // 若只变C，两段同比例；若只变R2，两段变化量相同。测量均不满足。
 assert.notEqual(3.45/originalH,1.38/originalL);assert.notEqual(3.45-originalH,1.38-originalL);
 assert.ok(q('C',2).model.includes('实际R1=30kΩ'));
});
test('可重触发与不可重触发同样输入得到不同截止，且恢复限制独立存在',()=>{
 assert.equal(choice(9),'8 ms');assert.equal(choice(10),'5 ms');
 assert.deepEqual(mono(triggers([0,3]),5,{retrigger:true}),[[0,8]]);
 assert.deepEqual(mono(triggers([0,3]),5),[[0,5]]);
 assert.deepEqual(mono(triggers([0,3,8.5]),4,{retrigger:true}),[[0,7],[8.5,12.5]]);
 assert.deepEqual(numeric(12),[7,12.5]);
 assert.deepEqual(mono(triggers([0,1,5,5.5]),2,{recovery:.1}),[[0,2],[5,7]]);assert.deepEqual(numeric(13),[2,7]);
 assert.ok(q('R',15).model.includes('2.2ms'));assert.ok(choice(8).includes('不能按原定时刻结束'));
});
test('异步复位截断并使新一次定时独立起算',()=>{
 assert.deepEqual(mono([{time:0,trigger:true},{time:2,reset:true},{time:3,trigger:true}],5),[[0,2],[3,8]]);
 assert.deepEqual(numeric(11),[2,8]);assert.equal(choice(15),'被提前截短');
 assert.ok(q('R',14).model.includes('解除复位本身就可能产生'));
});
test('74121多输入各沿的许可条件先独立算再交单稳事件引擎',()=>{
 let state={a:1,b:1,B:0};const changes=[[0,'B',1],[1,'a',0],[2,'a',1],[3,'b',0],[4,'B',0],[5,'B',1]],accepted=[];
 for(const [time,pin,value] of changes){const old={...state};state[pin]=value;
  const yes=pin==='B'?old.B===0&&value===1&&(state.a===0||state.b===0):old[pin]===1&&value===0&&state[pin==='a'?'b':'a']===1&&state.B===1;
  if(yes)accepted.push(time);
 }
 assert.deepEqual(accepted,[1,3,5]);assert.deepEqual(mono(triggers(accepted),.4,{recovery:.1}),[[1,1.4],[3,3.4],[5,5.4]]);
 assert.ok(q('R',13).model.includes('[5,5.4)'));assert.ok(q('R',13).stem.includes('每次只改变一个输入'));assert.ok(q('R',13).model.includes('两A同时下降'));
 near(.69*10*.02,.138);assert.deepEqual(numeric(14),[.138,.138]);
});
test('74122复位释放和合格重触发与静态禁止/复位强清分开',()=>{
 const events=[{time:0,trigger:true},{time:2},{time:3,trigger:true},{time:5,reset:true},{time:6,trigger:true},{time:7},{time:8,trigger:true}];
 assert.deepEqual(mono(events,4,{retrigger:true}),[[0,5],[6,12]]);
 assert.ok(q('C',15).model.includes('[0,5)'));assert.ok(q('C',15).model.includes('[6,12)'));
 assert.ok(q('C',15).model.includes('不直接清掉'));assert.ok(q('R',14).stem.includes('RD由0升1也可触发'));
});
test('漏脉冲检测通过逐次刷新截止形成真实报警间隙',()=>{
 assert.deepEqual(mono(triggers([0,5,10,20,25]),7,{retrigger:true}),[[0,17],[20,32]]);
 assert.ok(q('C',4).model.includes('[17,20)'));assert.ok(q('C',4).stem.includes('首次触发后'));
});
test('定宽加延迟采样与双级延迟脉冲的沿时刻和元件值',()=>{
 for(const width of [2,5])assert.equal(3<width,width===5);
 assert.ok(q('C',6).model.includes('2ms脉冲已回0'));assert.ok(q('C',6).model.includes('不能改用Q̅下降沿'));
 near(1.1*(2/(1.1*.1))*.1,2);near(.69*(1.5/(.69*.1))*.1,1.5);
 assert.ok(q('C',10).model.includes('[2,3.5)'));assert.ok(q('C',10).model.includes('21.7391'));
 assert.deepEqual(numeric(19),[3,5]);
});
test('最小输入规格不是RC可替代，接口合格与输出幅度分开检查',()=>{
 const qualifies=(v,w)=>v<=.8&&w>=20;
 assert.equal(qualifies(1,50),false);assert.equal(qualifies(.2,10),false);assert.ok(choice(20).includes('不能保证'));
 assert.ok(q('R',23).model.includes('不能修复输入幅度'));
 const directA=2.4>=2.8&&20<=50,directB=3>=2.8&&1000<=50,bufferA=2.4>=2&&.4<=.8&&3>=2.8&&20<=50;
 assert.equal(directA,false);assert.equal(directB,false);assert.equal(bufferA,true);assert.ok(q('C',14).model.includes('A后接'));
});
test('微分触发由串联电容连续性和上拉恢复决定，非照搬输入低宽度',()=>{
 const duration=reach(0,5,5/3,10);near(duration,10*Math.log(1.5));near(duration,4.054651081081644);
 assert.ok(duration<100);assert.ok(q('R',16).model.includes('4.05465'));
 const slope=.1e-3/.1e-6;near((2*6/3)/slope,.004);near((2*8/3)/slope,16/3e3);
 assert.ok(q('R',17).model.includes('16/3ms'));
});
test('施密特8段轨迹、同反相和幅值鉴别按历史状态逐段验证',()=>{
 assert.equal(schmitt([0,3,5,3,1,3,5,1],2,4).join(''),first(5)[0]);
 assert.equal(choice(11),'一直为高');assert.equal(schmitt([.5,2],1,3).at(-1),1);assert.equal(schmitt([3.5,2],1,3).at(-1),0);
 assert.deepEqual(schmitt([0,4,0],1,3,0,false),[0,1,0]);assert.deepEqual(schmitt([0,4,0],1,3),[1,0,1]);
 const negative=[];for(const [i,peak] of [2.8,3.2,2.9,3.5].entries())if(schmitt([0,peak,0],1,3)[1]===0)negative.push(i+1);
 assert.deepEqual(negative,[2,4]);assert.ok(q('R',20).model.includes('第2、4'));assert.ok(q('R',18).model.includes('极性'));
});
test('施密特电阻比可行区间核双边严格裕量与回差，不只取中点',()=>{
 assert.deepEqual(numeric(16),[10,.4]);assert.deepEqual(numeric(20),[.4,.4]);
 for(let i=1;i<1000;i++){const r=i/1000,low=5*(1-r),high=5*(1+r),valid=low>3&&high<7&&10*r>=3;assert.equal(valid,r>=.3&&r<.4);}
 near(5*(1-.35),3.25);near(5*(1+.35),6.75);assert.ok(q('C',7).model.includes('0.3≤r<0.4'));
});
test('反相施密特振荡的占空比由阈值决定，RC整体缩放不能调对称',()=>{
 const h=reach(1,5,3,1),l=reach(3,0,1,1);near(h,Math.log(2));near(l,Math.log(3));near(h/(h+l),.3868528072345416);
 const symmetricH=reach(.25,1,.75,1),symmetricL=reach(.75,0,.25,1);near(symmetricH+symmetricL,2*Math.log(3));near(symmetricH/(symmetricH+symmetricL),.5);
 assert.deepEqual(numeric(17),[2,.5]);assert.ok(q('C',8).model.includes('38.685%'));
 assert.throws(()=>reach(0,3,3.2,1));assert.ok(q('R',22).model.includes('无法触发'));
});
test('按键RC分段延续初值，数值积分独立定位首次越阈值而非每段重置',()=>{
 let v=0,time=0,crossing=null;const dt=.00001;
 while(time<2){const target=time<.2?5:time<.4?0:5;const next=v+(target-v)*dt;if(crossing===null&&v<10/3&&next>=10/3)crossing=time+dt;v=next;time+=dt;}
 near(crossing,1.3379613697724038,3e-5);
 const v1=voltage(0,5,1,.2),v2=voltage(v1,0,1,.2);near(v1,.9063462346100909);near(v2,.7420535352117129);
 near(.4+reach(v2,5,10/3,1),1.3379613697724038);
 assert.ok(q('C',12).model.includes('1.33796'));assert.ok(q('C',12).model.includes('不把任意长抖动'));
});
test('容差四个角点与恢复预算校验，标称可行区间不能取±百分比相加',()=>{
 const corners=[];for(const r of [.9,1.1])for(const c of [.8,1.2])corners.push(10*r*c);
 near(Math.min(...corners),7.2);near(Math.max(...corners),13.2);assert.deepEqual(numeric(15),[7.2,13.2]);
 const allowed=[5/.855,7/1.155];assert.ok(allowed[0]<6&&6<allowed[1]);near(6*.855,5.13);near(6*1.155,6.93);near(8-(6.93+.4),.67);
 assert.ok(q('C',9).model.includes('0.67ms'));
});
test('二分频对称输出只需要等间隔同类沿，分频比例与RC反求正确',()=>{
 const R=.5/(.69*3*.1),h=.69*2*R*.1,l=.69*R*.1;near(h,1/3);near(l,1/6);near(h+l,.5);
 let state=0;const trace=[0,.5,1,1.5,2].map(time=>({time,state:state^=1}));assert.deepEqual(trace.map(x=>x.state),[1,0,1,0,1]);
 near(12.8e6/64/100/2,1000);assert.equal(Math.log2(64),6);assert.equal(Number.isInteger(Math.log2(12800)),false);
 assert.ok(q('C',5).model.includes('2.41546'));assert.ok(q('C',16).model.includes('6级'));
});
test('低相透明门控以相位约束避免假上升，固定延迟不能替代',()=>{
 const times=[0,.2,.6,1,1.6,2],cp=[1,1,0,1,0,1],enable=[0,1,1,1,1,1];
 let latch=0,oldDirect=0,oldSafe=0;const direct=[],safe=[];
 for(let i=0;i<times.length;i++){if(cp[i]===0)latch=enable[i];const d=cp[i]&enable[i],s=cp[i]&latch;if(d&&!oldDirect)direct.push(times[i]);if(s&&!oldSafe)safe.push(times[i]);oldDirect=d;oldSafe=s;}
 assert.deepEqual(direct,[.2,1,2]);assert.deepEqual(safe,[1,2]);assert.ok(q('C',11).model.includes('0.2ms'));
});
test('独立CO时供电改变充电差比，默认比例抵消不再适用',()=>{
 const expected=[[6,1.5040773967762742,664.8594029425111],[9,1.1394342831883648,877.6284992951065]];
 for(const [supply,T,f]of expected){const h=reach(1.5,supply,3,2),l=reach(3,0,1.5,1);near(h+l,T);near(1000/(h+l),f);}
 assert.ok(q('C',13).model.includes('1.139434'));assert.ok(q('C',13).model.includes('阈值没有随VCC同比例'));
});
test('晶体ppm绝对频差和每天累计时间偏差，频率误差不由缓冲修复',()=>{
 near(16e6*10e-6,160);assert.deepEqual(numeric(18),[160]);
 near(86400*.01,864);near(86400*20e-6,1.728);assert.ok(q('R',21).model.includes('14分24秒'));assert.ok(q('R',21).model.includes('1.728s'));
 assert.ok(q('C',14).model.includes('不能把B的频率误差'));
});
