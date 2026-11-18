import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {fullExamPapers} from '../full-exams.js';
import {reviseQuestionLanguage} from '../question-language.js';
import {termCatalogue,questionTermCandidates} from '../term-candidates.js';
import {courseTermPlan} from '../term-planner.js';
import {auditReadingTerms} from '../scripts/audit-reading-terms.mjs';
import {visibleReadingQuestion} from '../java-reading.js';
import {javaTaskGuide} from '../java-task-guides.js';

const course=subject=>getPracticeCourse(subject).questions;
const question=(subject,id)=>{const q=course(subject).find(q=>q.id===id);assert.ok(q,id);return {id:q.id,stem:q.stem,options:q.options};};
const labels=(subject,q)=>questionTermCandidates(subject,q).flatMap(c=>c.entry.aliases);
const entry=(subject,label)=>{const e=termCatalogue(subject).find(e=>e.aliases.includes(label));assert.ok(e,label);return e;};
async function references(){try{return JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已接入题目.json',import.meta.url),'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}}

test('伙伴或相邻空闲块的合并不推成有序序列合并和双指针遍历',()=>{
 const stems=[question('structures','P4-structures-8-F-007').stem,'回收块与相邻空闲块归并回收，计算合并后的块长。','空闲链表按地址有序，相邻空闲块合并后如何回收？','比较两个集合的合并。','另有两条有序链表。现在只问伙伴池的空闲块合并。'];
 for(const stem of stems)for(const label of ['双指针遍历','合并有序序列'])assert.ok(!labels('structures',{stem}).includes(label),stem+':'+label);
 // Hidden metadata must not manufacture an ordered merge context.
 const q={stem:'将两个相邻空闲块合并。',topic:'有序链表归并',model:'两个递增序列合并'};
 assert.ok(!labels('structures',q).includes('合并有序序列'));
});

test('普通有序表、链表、数组和排序归并仍可得到对应提示',()=>{
 for(const stem of ['合并两个递增有序表，保留重复元素。','两个带头结点的非递减链表归并，重接结点。','数组A和B各自升序，把它们合并成一条升序序列。','顺序文件按键排序，主文件与事务文件进行归并更新。','二路归并排序，每次取两段中较小的关键字。']){
  assert.ok(labels('structures',{stem}).includes('合并有序序列'),stem);
 }
 for(const stem of ['合并两个有序链表。','两个递增数组二路归并。','两个非递减序列逐项比较后合并。'])assert.ok(labels('structures',{stem}).includes('双指针遍历'),stem);
 assert.ok(labels('structures',{stem:'两个指针协调扫描，完成链表逆置。'}).includes('双指针遍历'));
});

test('伙伴题标记默认两词已了解后，真实整科及Java分配仍相关、两词且不超5%',async()=>{
 const refs=await references(),subject='structures',id='P4-structures-8-F-007';
 const qs=[...course(subject),...(refs[subject]||[]).map(reviseQuestionLanguage),...fullExamPapers[subject].flatMap(p=>p.questions)];
 const known=Object.fromEntries(['空闲块','伙伴块寻址'].map(label=>[`${subject}:${entry(subject,label).id}`,true]));
 const related=['空闲块','伙伴块寻址','伙伴系统','空闲空间组织','内存分配'];
 for(const questions of [qs,qs.map(q=>visibleReadingQuestion(q,'java',javaTaskGuide(q.id,q.revision??1)))])for(const state of [{},known]){
  const plan=courseTermPlan(subject,questions,state);assert.ok(plan.complete);assert.ok([...plan.usage.values()].every(n=>n<=plan.limit));
  const selected=plan.byQuestion.get(id);assert.equal(selected.length,2);for(const term of selected)assert.ok(term.aliases.some(label=>related.includes(label)),term.id);
  for(const terms of plan.byQuestion.values())assert.equal(terms.length,2);
 }
 for(const term of termCatalogue(subject))for(const field of ['definition','purpose','example'])assert.ok(term[field]?.trim().length>=6,term.id+':'+field);
});

test('固定二进制分组映射用整数状态计数概念，不凭码元二字套非整数信息量',()=>{
 const actual=labels('network',question('network','P2-network-physical-78'));assert.ok(actual.includes('固定比特映射'));assert.ok(!actual.includes('码元信息量'));
 assert.ok(labels('network',{stem:'有若干等概率信号状态，比较码元信息量。'}).includes('码元信息量'));
 assert.ok(labels('network',{stem:'固定的r个二进制位映射为一个码元，不跨码元联合编码。'}).includes('固定比特映射'));
 assert.ok(labels('network',{stem:'比较码元信息量与固定k个二进制位到码元的映射。'}).includes('码元信息量'));
 assert.ok(!labels('network',{stem:'请作答。',model:'固定k位映射码元',topic:'固定比特映射'}).includes('固定比特映射'));
});

test('通用码字不被定义成必然保留信息位并附加校验，CRC语境仍可使用该词',()=>{
 const e=entry('network','码字');assert.ok(!e.definition.includes('通常含原始信息及附加校验信息'));assert.match(e.definition,/符号序列/);assert.match(e.definition,/不一定|不必|并非/);
 assert.ok(labels('network',question('network','P2-network-physical-80')).includes('码字'));assert.ok(labels('network',{stem:'CRC收到的码字用生成多项式检验。'}).includes('码字'));
});

test('普通数据沿和门延迟不局限于时钟触发，输出转换时间与输入到输出的参考点分开',()=>{
 for(const label of ['上升沿','下降沿']){const e=entry('digital',label);assert.match(e.definition,/信号/);assert.match(e.definition,/数据|控制/);assert.ok(!e.definition.startsWith('时钟信号'));}
 const delay=entry('digital','传播延迟');assert.match(delay.definition,/参考点|规定.*点/);assert.ok(!delay.definition.includes('输出完成相应改变'));
 const actual=labels('digital',question('digital','P4-digital-3-F-001'));assert.ok(actual.includes('传播延迟'));assert.ok(actual.includes('上升时间'));
 const q=question('digital','P4-digital-3-F-001'),score=value=>questionTermCandidates('digital',value).find(c=>c.entry.id==='delay').score;assert.ok(score({...q,stem:'传播延迟。'+q.stem})>=score(q),'显式写出同一概念不得降低测量语义优先级');
 const falling=labels('digital',{stem:'输入、输出按50%点测tPHL；输出下降沿经过90%、50%、10%的时刻依次给出。'});assert.ok(falling.includes('下降时间'));assert.ok(!falling.includes('上升时间'));
});

test('脉冲前沿取决于极性，往返计时明确包含可能的远端处理等待',()=>{
 const e=entry('network','脉冲前沿');assert.match(e.definition,/负脉冲/);assert.match(e.definition,/下降/);assert.match(e.definition,/正脉冲/);
 const rtt=entry('network','RTT');assert.match(rtt.definition,/等待|等候|处理/);assert.match(rtt.definition,/不等|不一定|并非/);
 const actual=labels('network',question('network','P2-network-physical-82'));assert.ok(actual.includes('脉冲前沿'));assert.ok(actual.includes('RTT'));
 assert.ok(labels('network',{stem:'探测为负脉冲，按前沿开始计时。'}).includes('脉冲前沿'));
});

test('链路实际在途量与满管道BDP分开，不把发送端未确认量混为同一口径',()=>{
 const bdp=entry('network','带宽时延积');assert.match(bdp.definition,/连续|填满|满管道/);assert.match(bdp.purpose+bdp.definition,/有限|短分组|更少|不一定/);
 const actual=labels('network',question('network','P2-network-physical-79'));assert.ok(actual.includes('末比特'));assert.ok(actual.includes('链路在途量'));
 assert.ok(!labels('network',{stem:'TCP发送方尚未得到确认的在途数据量。'}).includes('链路在途量'));
 assert.ok(labels('network',{stem:'连续发送足够久，计算链路的在途比特与带宽时延积。'}).includes('带宽时延积'));
});

test('五个修订题在真实整科分配中取得相关两词，新增三词已预存且C/Java变体仍守5%',async()=>{
 const refs=await references(),expected={network:{'P2-network-physical-78':['码元','固定比特映射'],'P2-network-physical-79':['末比特','链路在途量'],'P2-network-physical-80':['码字','发送速率'],'P2-network-physical-82':['脉冲前沿','RTT']},digital:{'P4-digital-3-F-001':['传播延迟','上升时间']}};
 for(const [subject,items]of Object.entries(expected)){
  const qs=[...course(subject),...(refs[subject]||[]).map(reviseQuestionLanguage),...fullExamPapers[subject].flatMap(p=>p.questions)],plan=courseTermPlan(subject,qs);assert.ok(plan.complete);assert.ok([...plan.usage.values()].every(n=>n<=plan.limit));
  for(const [id,names]of Object.entries(items)){const selected=plan.byQuestion.get(id);assert.equal(selected.length,2,id);for(const label of names)assert.ok(selected.some(e=>e.aliases.includes(label)),id+':'+label);}
 }
 for(const label of ['固定比特映射','脉冲前沿','链路在途量'])for(const key of ['definition','purpose','example'])assert.ok(entry('network',label)[key].trim().length>=6);
 const report=auditReadingTerms(refs);assert.equal(report.length,4);assert.ok(report.find(r=>r.subject==='structures').javaVariant);
});
