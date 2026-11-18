import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../制作记录/并行扩题/脉冲产生核验/',import.meta.url);
async function load(t){try{return JSON.parse(await readFile(new URL('教材候选20题.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;t.skip('第三方教材题载荷仅在本地保留');return null;}}
const near=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,'actual='+actual+' expected='+expected);
const get=(questions,n)=>questions.find(q=>q.id==='FENG-CH8-'+n);
// 根据RC指数轨迹寻找首次到达目标的时刻，不从题目答案读取时间公式。
function hit(start,end,target,tau){
 assert.ok((target-start)*(end-target)>0);
 const value=t=>end+(start-end)*Math.exp(-t/tau);
 let lo=0,hi=tau;
 while((value(hi)-target)*(start-target)>0)hi*=2;
 for(let i=0;i<80;i++){const mid=(lo+hi)/2;if((value(mid)-target)*(start-target)>0)lo=mid;else hi=mid;}
 return (lo+hi)/2;
}
const output555=(old,reset,trig,thr,lo,hi)=>!reset?0:trig<lo?1:thr>hi?0:old;
function astable(r1,r2,c,v=1,control=2*v/3){const h=hit(control/2,v,control,(r1+r2)*c),l=hit(control,0,control/2,r2*c);return {h,l,T:h+l,f:1/(h+l),q:h/(h+l)};}

test('二十教材题源页、范围、题意和本地分发标记完整',async t=>{
 const qs=await load(t);if(!qs)return;
 assert.equal(qs.length,20);assert.equal(new Set(qs.map(q=>q.id)).size,20);
 const keys=[2,3,'5-6',7,8,9,10,11,12,13,14,15,18,19,21,23,25,26,27,28].map(String);
 assert.deepEqual(qs.map(q=>q.id.replace('FENG-CH8-','')),keys);
 const stems=new Set();
 for(const q of qs){assert.equal(q.chapter,8);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.equal(q.reference.pdfPage,q.reference.printedPage+8);assert.ok(q.reference.adaptation);assert.ok(q.model.length>70,q.id);assert.ok(q.rubric.length>=4,q.id);assert.ok(q.walkthrough.steps.length>=3);assert.ok(!/同上|上一题|见图/.test(q.stem));assert.ok(!stems.has(q.stem));stems.add(q.stem);}
});
test('脉冲参数按相对幅度定义，40ns周期对应25MHz而非100MHz',async t=>{
 const qs=await load(t);if(!qs)return;const q2=get(qs,2),q3=get(qs,3);
 assert.ok(q2.model.includes('VH−VL'));assert.ok(q2.model.includes('10%到90%'));assert.ok(q2.model.includes('90%到10%'));
 const low=2,high=8;near(low+0.5*(high-low),5);assert.notEqual(high/2,5);
 near(1/(10e-9+30e-9),25e6,1e-7);near(10/40,.25);assert.ok(q3.model.includes('25 MHz'));
});
test('555全部初态/复位/双比较组合核保持条件，低TRIG含THR高也置位',async t=>{
 const qs=await load(t);if(!qs)return;const q=get(qs,'5-6');
 for(const old of [0,1])for(const reset of [0,1])for(const trigger of [0,2])for(const threshold of [1,3]){
  const next=output555(old,reset,trigger,threshold,1,2);
  const staysHigh=reset===1&&(trigger<1||threshold<2);
  const staysLow=reset===0||(reset===1&&trigger>1);
  if(old===1)assert.equal(next===1,Boolean(staysHigh));else assert.equal(next===0,Boolean(staysLow));
 }
 assert.ok(q.model.includes('TRIG低时置位优先'));assert.ok(q.model.includes('不把其直流电压强制为0'));
});
test('两门RC无隔离与有隔离的实际初值给出ln4和2ln3两种周期',async t=>{
 const qs=await load(t);if(!qs)return;
 near(hit(0,1,.5,1)+hit(1,0,.5,1),Math.log(4));
 near(hit(-.5,1,.5,1)+hit(1.5,0,.5,1),2*Math.log(3));
 near(1.4*2.2e3*.1e-6,.308e-3);near(1/(2.2*4.3e3*.1e-6),1057.0824524312897,1e-9);
 assert.ok(get(qs,7).model.includes('0.308 ms'));assert.ok(get(qs,8).model.includes('0.946 ms'));
 assert.ok(get(qs,8).stem.includes('Rs接x与a'));assert.ok(get(qs,7).stem.includes('R接a与b'));
});
test('标准555正R1时q严格大于1/2；逼近不等于实际短接R1',async t=>{
 const qs=await load(t);if(!qs)return;
 for(const r1 of [1e-6,.01,1,100])for(const r2 of [.01,1,100])assert.ok(astable(r1,r2,1).q>.5);
 near(astable(0,1,1).q,.5);assert.ok(get(qs,9).model.includes('不能据此把VCC直接短接'));
});
test('8.10双RC指数轨迹独立核T/f/q/阈值，起始稳态与首次上电分开',async t=>{
 const qs=await load(t);if(!qs)return;const q=get(qs,10),sim=astable(18e3,11e3,.05e-6,5);
 near(sim.h,29e3*.05e-6*Math.log(2));near(sim.l,11e3*.05e-6*Math.log(2));near(sim.q,.725);
 const factor=.69/Math.log(2);near(sim.h*factor,1.0005e-3);near(sim.l*factor,.3795e-3);near(1/(sim.T*factor),724.6376811594203,1e-8);
 assert.ok(hit(0,5,10/3,29e3*.05e-6)>sim.h);assert.ok(q.stem.includes('刚到下阈值'));assert.ok(q.model.includes('5/3 V'));
});
test('8.11给定元件同时满足两个时间目标，不能只验周期',async t=>{
 const qs=await load(t);if(!qs)return;const c=.1e-6,r2=.001/(4*.69*c),r1=2*r2;
 near(.69*(r1+r2)*c,.75e-3);near(.69*r2*c,.25e-3);near((r1+r2)/(r1+2*r2),.75);
 assert.ok(get(qs,11).model.includes('3.623'));assert.ok(get(qs,11).model.includes('7.246'));
});
test('8.12/15各参数变化对周期的符号，CO越高充电更长而放电不变',async t=>{
 const qs=await load(t);if(!qs)return;const ref=astable(3,2,1,5);
 assert.ok(astable(2,2,1,5).f>ref.f);assert.ok(astable(3,1,1,5).f>ref.f);assert.ok(astable(3,2,2,5).f<ref.f);
 near(astable(3,2,1,10).T,ref.T);
 let previous=0;
 for(let i=1;i<99;i++){const v=5*i/100,sim=astable(3,2,1,5,v);assert.ok(sim.h>previous);near(sim.l,ref.l);previous=sim.h;}
 assert.ok(astable(3,2,1,5,4).f<ref.f);assert.ok(get(qs,15).model.includes('1/[(1−a)(2−a)]'));
});
test('8.13电位器全行程周期不变，方波位置不是滑片中点',async t=>{
 const qs=await load(t);if(!qs)return;const r1=3.3e3,r2=2.2e3,rp=2e3,c=.1e-6;
 for(let i=0;i<=100;i++){const a=rp*i/100,h=.69*(r1+a)*c,l=.69*(r2+rp-a)*c;near(h+l,.5175e-3);near(h/(h+l),(r1+a)/7.5e3);}
 near((r1+450)/(r1+r2+rp),.5);assert.notEqual((r1+rp/2)/(r1+r2+rp),.5);
 near(r1/(r1+r2+rp),.44);near((r1+rp)/(r1+r2+rp),53/75);
 assert.ok(get(qs,13).model.includes('RP1=0.45'));assert.ok(get(qs,13).model.includes('RP2=1.55'));
});
test('8.14端点三约束同时回代，两个端点不以一个中点代替',async t=>{
 const qs=await load(t);if(!qs)return;const c=.1e-6,r=.001/(4*.69*c),rp=2*r;
 for(const a of [0,r,rp]){const h=.69*(r+a)*c,l=.69*(r+rp-a)*c;near(h+l,.001);near(h/(h+l),a===0?.25:a===r?.5:.75);}
 assert.ok(get(qs,14).model.includes('RP=2R1'));
});
test('555单稳充电至2/3VCC核脉宽、恢复条件及双周期',async t=>{
 const qs=await load(t);if(!qs)return;near(hit(0,10,20/3,51e3*.01e-6)*1.1/Math.log(3),.561e-3);
 const actual=hit(0,9,6,27e3*.05e-6);near(actual,1.483126589701948e-3,1e-12);
 const width=27e3*.05e-6*1.1;near(width,1.485e-3);assert.ok(.5e-3<width&&width<5e-3);
 for(let k=0;k<2;k++){assert.equal(output555(0,1,0,0,3,6),1);assert.equal(output555(1,1,9,6.01,3,6),0);near(9*(1-Math.exp(-actual/(27e3*.05e-6))),6);assert.ok(k*5e-3+width<(k+1)*5e-3);}
 assert.ok(get(qs,18).model.includes('tw+恢复时间'));assert.ok(get(qs,21).model.includes('1.48313 ms'));
});
test('单稳再次短触发不重建0V，持续低只是置位优先，不能误判可重触发',async t=>{
 const qs=await load(t);if(!qs)return;const tau=1,width=hit(0,1,2/3,tau),second=.4;
 const atSecond=1-Math.exp(-second/tau);assert.ok(atSecond>0);
 near(second+hit(atSecond,1,2/3,tau),width);assert.ok(second+width>width);
 assert.equal(output555(1,1,0,.9,1/3,2/3),1);assert.equal(output555(1,1,1,.9,1/3,2/3),0);
 assert.ok(get(qs,19).model.includes('没有把定时电容清0'));
});
test('74121与74122不同系数及I/O极性不混用，推荐范围内的元件反求',async t=>{
 const qs=await load(t);if(!qs)return;
 near(.5e-3/(.69*.04e-6),18115.942028985508,1e-7);near(.5e-3/(.69*2e3),.3623188405797102e-6,1e-15);
 const r=100e-6/(.32*.05e-6);near(r,6250);assert.ok(r>=5e3&&r<=50e3);assert.ok(.05e-6>1000e-12);
 assert.ok(get(qs,25).model.includes('Q̅'));assert.ok(get(qs,25).stem.includes('0.32'));assert.ok(get(qs,23).model.includes('RINT端接VCC'));
});
test('门反馈施密特在旧输出下由KCL求两阈值与极性',async t=>{
 const qs=await load(t);if(!qs)return;const r1=2e3,r2=3.6e3,supply=10;
 const atInput=(vi,vo)=>(vi/r1+vo/r2)/(1/r1+1/r2);
 near(atInput(70/9,0),supply/2);near(atInput(20/9,supply),supply/2);
 near(70/9-20/9,50/9);assert.ok(get(qs,26).model.includes('上升前Vo=0'));assert.ok(get(qs,26).model.includes('下降前Vo=10'));
});
test('正弦整形只在正确方向越阈值切换，事件区间由采样状态机交叉验证',async t=>{
 const qs=await load(t);if(!qs)return;
 const period=.001,t1=Math.asin(2/3)/(2*Math.PI*1000),t2=(Math.PI-Math.asin(1/3))/(2*Math.PI*1000);
 let output=1;const changes=[];
 for(let i=0;i<=200000;i++){const time=i*period/200000,input=9*Math.sin(2*Math.PI*1000*time),next=input<3?1:input>6?0:output;if(next!==output)changes.push(time);output=next;}
 assert.equal(changes.length,2);near(changes[0],t1,period/200000);near(changes[1],t2,period/200000);
 near(1-(t2-t1)/period,.6702265616252463,1e-7);
 assert.ok(get(qs,27).stem.includes('t=0'));assert.ok(get(qs,27).model.includes('0.11614 ms'));assert.ok(get(qs,27).model.includes('0.44591 ms'));
});
test('通用施密特RC周期分别用两个终值求解，阈值不可达时不能报告振荡',async t=>{
 const qs=await load(t);if(!qs)return;
 for(const [low,high,lo,hi] of [[0,5,1,3],[1,10,3,7],[-2,4,-1,2]]){
  const h=hit(lo,high,hi,1),l=hit(hi,low,lo,1);
  near(h,Math.log((high-lo)/(high-hi)));near(l,Math.log((hi-low)/(lo-low)));
 }
 assert.throws(()=>hit(1,2,3,1));assert.throws(()=>hit(3,2,1,1));
 assert.ok(get(qs,28).stem.includes('反相'));assert.ok(get(qs,28).stem.includes('VOL<VT−<VT+<VOH'));
});
