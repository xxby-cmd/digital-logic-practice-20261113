import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../制作记录/并行扩题/计网无线移动核验/',import.meta.url);
async function local(t){try{return {qs:JSON.parse(await readFile(new URL('首批参考2题.json',root),'utf8')),html:await readFile(new URL('作者CDMA基础_本次实例.html',root),'utf8')};}catch(e){if(e.code!=='ENOENT')throw e;t.skip('第三方原题及动态实例HTML只保留本地');return null;}}
test('两道不同机制参考题来源/中文化范围/本地隔离清楚，不把参考转为原创',async t=>{
 const data=await local(t);if(!data)return;assert.equal(data.qs.length,2);
 assert.equal(new Set(data.qs.map(q=>q.id)).size,2);
 for(const q of data.qs){assert.equal(q.chapter,7);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.ok(q.reference.adaptation);assert.ok(q.reference.verification);assert.ok(q.model.length>100);assert.ok(q.rubric.length>=4);assert.ok(q.walkthrough.steps.length>=3);assert.ok(!/同上|上一题|见图/.test(q.stem));}
 assert.ok(data.qs[0].reference.answerPdfPage===2);assert.ok(data.qs[0].origin.includes('独立撰写'));
});
test('CDMA本次HTML实例与手算序列逐项一致，相关值按M归一化',async t=>{
 const data=await local(t);if(!data)return;const c=[1,-1,-1,1,1,-1,-1,1],y=[1,-1,-1,1,1,-1,-1,1];
 const plain=data.html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 assert.ok(plain.includes('code of size 8'));assert.ok(plain.includes('M = 1, -1, -1, 1, 1, -1, -1, 1.'));
 const encoded=c.map(v=>1*v);assert.deepEqual(encoded,c);
 const products=c.map((v,i)=>v*y[i]);assert.deepEqual(products,Array(8).fill(1));assert.equal(products.reduce((a,b)=>a+b,0)/c.length,1);
 assert.equal(c.reduce((sum,v,i)=>sum+v*(-y[i]),0)/c.length,-1);
 const q=data.qs[1];assert.ok(q.model.includes('8项和为8'));assert.ok(q.model.includes('d=+1'));
});
test('CSMA退避在忙时冻结，恢复空闲后先重等DIFS再续，不从头丢弃剩余值',async t=>{
 const data=await local(t);if(!data)return;
 // 单位是抽象时隙；DIFS=1，初始退避3。忙区间[2,5)，其他无忙。
 let remaining=3,sent=null,needsDifs=true,time=0,spent=0;
 const busy=time=>time>=2&&time<5;
 while(time<20){
  if(busy(time)){time++;needsDifs=true;continue;}
  if(needsDifs){time++;needsDifs=false;continue;}
  time++;remaining--;spent++;if(!remaining){sent=time;break;}
 }
 assert.equal(sent,8);assert.equal(spent,3);assert.equal(remaining,0);
 assert.ok(data.qs[0].model.includes('忙时冻结'));assert.ok(data.qs[0].model.includes('SIFS'));
});
test('缺链路ACK不能唯一推出数据碰撞，数据丢与ACK丢两个观测世界一致',async t=>{
 const data=await local(t);if(!data)return;
 const observe=({dataLost,ackLost})=>!dataLost&&!ackLost;
 assert.equal(observe({dataLost:true,ackLost:false}),false);
 assert.equal(observe({dataLost:false,ackLost:true}),false);
 assert.equal(observe({dataLost:false,ackLost:false}),true);
 assert.ok(data.qs[0].model.includes('不必然证明发生碰撞'));assert.ok(data.qs[0].model.includes('降低冲突概率'));
});
