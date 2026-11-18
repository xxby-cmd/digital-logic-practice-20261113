import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {fullExamPapers} from '../full-exams.js';
import {termCatalogue,questionTermCandidates} from '../term-candidates.js';
import {courseTermPlan} from '../term-planner.js';

const bytes=await readFile(new URL('./fixtures/network-transport-quality-20261118.json',import.meta.url));
const fixture=JSON.parse(bytes);
const revisions=Object.fromEntries(fixture.items.map(i=>[i.id,i.revision]));
const source=getPracticeCourse('network',{questionRevisions:revisions}).questions;
const q=id=>{const value=source.find(q=>q.id===id);assert.ok(value,id);return value;};
const labels=x=>questionTermCandidates('network',typeof x==='string'?{stem:x}:x).flatMap(c=>c.entry.aliases);
const has=(x,...terms)=>{const found=labels(x);for(const term of terms)assert.ok(found.includes(term),term);};
const lacks=(x,...terms)=>{const found=labels(x);for(const term of terms)assert.ok(!found.includes(term),term);};
const entry=label=>termCatalogue('network').find(e=>e.aliases.includes(label));

test('SendBase不是分贝，RTT测量不自动成为应用请求时序或故障诊断',()=>{
 for(const id of ['P3-network-3-72','P3-network-3-86']){has(q(id),'发送基序号','未确认数据量');lacks(q(id),'分贝','排队时延');}
 has('信噪比为20dB，说明这个分贝数的含义。','分贝');
 lacks('SendBase=30、NextSeqNum=70，记录发送边界。','分贝');
 for(const id of ['P3-network-3-14','P3-network-3-15'])lacks(q(id),'请求处理时序','故障定位');
 has(q('P3-network-3-14'),'时延估计','RTT');has(q('P3-network-3-15'),'重传测量歧义');
 has('HTTP请求后等待服务器响应，计算访问耗时。','请求处理时序');
 has('ping没有响应，进行连通故障定位。','故障定位');
});

test('教材分组确认约定与TCP字节序号分开，rdt等待ACK不是接收方排队或连续流水发送',()=>{
 for(const id of ['P3-network-3-58','P3-network-3-66','P3-network-3-84'])has(q(id),'确认号约定');
 has(q('P3-network-3-66'),'rdt协议模型','重复数据识别');
 lacks('接收方已正确交付分组0。此时又收到分组1。','重复数据识别');
 has(q('P3-network-3-81'),'rdt协议模型','等待确认状态','发送端状态');
 lacks(q('P3-network-3-81'),'连续发送','排队时延','二进制编码');
 lacks(q('P3-network-3-58'),'排队缓存','排队时延');
 has('滑动窗口允许多帧在途，发送窗口内可连续发送。','连续发送');
 assert.match(entry('确认号约定').definition,/分组/);assert.match(entry('确认号约定').definition,/字节/);
});

test('不回绕和无SYN/FIN约束不生成取模或实际控制段提示，真实回绕与控制段仍识别',()=>{
 for(const id of ['P3-network-3-56','P3-network-3-84','P3-network-3-86','P3-network-3-96'])lacks(q(id),'模运算','有限序号复用');
 for(const id of ['P3-network-3-94','P3-network-3-99','P3-network-3-57'])lacks(q(id),'SYN','FIN');
 lacks(q('P3-network-3-86'),'快速重传');
 has(q('P3-network-3-99'),'模运算','字节序号','确认号约定');
 has(q('P3-network-3-87'),'SYN','字节序号');has(q('P3-network-3-96'),'SYN','FIN');
});

test('窗口数据额度不等于链路在途容量，MSS计量不默认段数或首部开销',()=>{
 has(q('P3-network-3-10'),'拥塞窗口','接收窗口','未确认数据量');lacks(q('P3-network-3-10'),'带宽时延积');
 has(q('P3-network-3-89'),'接收窗口','拥塞窗口','未确认数据量');
 for(const id of ['P3-network-3-51','P3-network-3-90','P3-network-3-91'])lacks(q(id),'首部开销');
 assert.match(entry('MSS').purpose,/数据量/);assert.match(entry('MSS').purpose,/不表示/);
 assert.match(entry('未确认数据量').definition,/已经到达/);
 has('路径带宽与传播时延确定满管道的带宽时延积。','带宽时延积');
 has(q('P3-network-3-95'),'MSS','MTU','首部开销');lacks(q('P3-network-3-95'),'地址作用域');
 assert.match(entry('RTO').definition,/时间间隔/);assert.match(entry('RTO').definition,/不是.*绝对时刻/);
});

test('校验和反码求和与一般二进制编码分开，超时退避不推共享信道争用',()=>{
 has(q('P-N-02'),'反码加法','校验和');has(q('P3-network-3-55'),'检错能力','反码加法');
 for(const id of ['P-N-02','P3-network-3-55','P3-network-3-12'])lacks(q(id),'二进制编码');
 for(const id of ['P3-network-3-72','P3-network-3-86','P3-network-3-42'])lacks(q(id),'二进制编码');
 lacks(q('P3-network-3-30'),'信道争用');
 has('无线CSMA信道出现碰撞，需要进行退避。','信道争用');
 has('用二进制码元表示数据0101。','二进制编码');
 assert.ok(!entry('反码加法').example.includes('F234'));
});

test('FIN半关闭、RST、TIME_WAIT与CLOSE_WAIT按实际方向和状态解释，业务提交另有语义',()=>{
 has(q('P3-network-3-18'),'半关闭','FIN');has(q('P3-network-3-80'),'RST','FIN');
 has(q('P3-network-3-21'),'TIME_WAIT');has(q('P3-network-3-85'),'CLOSE_WAIT');lacks(q('P3-network-3-85'),'排队时延');
 has(q('P3-network-3-20'),'零窗口探测');has(q('P3-network-3-39'),'流结束通知');
 has(q('P3-network-3-32'),'事务提交');
 assert.match(entry('半关闭').definition,/另一个方向/);assert.match(entry('CLOSE_WAIT').definition,/本地应用/);
 assert.match(entry('事务提交').purpose,/网络.*应用.*数据库/);
});

test('UDP数据报、TCP字节流和四元组不混层，乱序标题不限于链路帧',()=>{
 has(q('P3-network-3-2'),'字节流');has(q('P3-network-3-4'),'连接四元组');
 has(q('P3-network-3-22'),'数据报');assert.equal(entry('数据报').aliases[0],'数据报');
 assert.match(entry('数据报').definition,/UDP.*IP.*不同层/);assert.equal(entry('乱序').aliases[0],'乱序到达');
 assert.ok(!entry('接收端状态').example.startsWith('先收到后面的数据时'));
});

test('71题实际指定新版本默认及逐题已了解均两词、静态三字段且整科含卷≤5%，隐藏字段不选词',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'0b743498eb251f0564b1f76c18b9ab7f1656bda0280da411acc07b13152eda9e');
 assert.equal(fixture.authorityHtmlSha256,'a1b8afcba948a9847df787f2a18a63ad66b212313d221982e28bb66413044c7c');
 assert.equal(fixture.items.length,71);
 const questions=[...source,...fullExamPapers.network.flatMap(p=>p.questions)],base=courseTermPlan('network',questions);
 assert.ok(base.complete,JSON.stringify(base.shortages));assert.ok([...base.usage.values()].every(n=>n<=base.limit));
 for(const item of fixture.items){
  const actual=q(item.id);assert.equal(actual.revision,item.revision);assert.equal(actual.stem,item.proposed.stem);assert.deepEqual(actual.options,item.proposed.options);
  const selected=base.byQuestion.get(actual.id);assert.equal(selected.length,2,item.id);
  const known=Object.fromEntries(selected.map(e=>['network:'+e.id,true])),alt=courseTermPlan('network',questions,known);
  assert.ok(alt.complete,item.id);assert.equal(alt.byQuestion.get(item.id).length,2,item.id);assert.ok([...alt.usage.values()].every(n=>n<=alt.limit));
  const visible={id:actual.id,stem:actual.stem,options:actual.options};
  assert.deepEqual(questionTermCandidates('network',{...visible,model:'RSA CRC 指针 接收源 同步',explanation:'隐藏答案',studyWeight:99}).map(c=>c.entry.id),questionTermCandidates('network',visible).map(c=>c.entry.id));
 }
 for(const e of termCatalogue('network'))for(const field of ['definition','purpose','example'])assert.ok(e[field]?.trim().length>=6,e.id+field);
});
