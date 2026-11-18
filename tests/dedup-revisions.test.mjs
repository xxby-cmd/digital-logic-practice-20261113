import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {mergeBackup,reconcilePracticeRecords} from '../room-progress.js';
import {submitExam,settleExam,totalPoints,setMark} from '../sessions.js';
const ids=['P2-digital-3-3','P4-digital-3-F-001','P2-network-physical-78','P2-network-physical-79','P2-network-physical-80','P2-network-physical-82','P4-structures-8-F-007'],empty=()=>({version:2,attempts:[],practice:{}});

test('去重修订保原题号/题型，当前用revision2而明确请求1仍得原题',()=>{
 assert.equal(ids.length,7);assert.ok(ids.every(id=>Object.hasOwn(practiceQuestionRevisions,id)));
 for(const subject of ['network','digital','structures']){
  const current=getPracticeCourse(subject),historical=getPracticeCourse(subject,{questionRevisions:Object.fromEntries(ids.map(id=>[id,1]))});
  assert.equal(current.questions.length,historical.questions.length);
  for(const q of current.questions.filter(q=>ids.includes(q.id))){
   const old=historical.questions.find(p=>p.id===q.id);assert.equal(q.revision,2);assert.equal(old.revision,1);assert.equal(q.type,old.type);assert.equal(q.section,old.section);assert.equal(q.chapter,old.chapter);assert.notEqual(q.stem,old.stem);assert.notDeepEqual(q.answers,old.answers);
   assert.equal(grade(q,q.answers.map(a=>a[0])).correct,true);
   assert.throws(()=>getPracticeCourse(subject,{questionRevisions:{[q.id]:99}}),/版本/);
  }
 }
 const current=getPracticeCourse('network').questions.find(q=>q.id==='P2-network-physical-78'),old=getPracticeCourse('network',{questionRevisions:{[current.id]:1}}).questions.find(q=>q.id===current.id);
 assert.equal(current.studyWeight,1);assert.ok(current.practiceWeight<old.practiceWeight,'非二次幂边界是补充训练，不冒称新增本校高频重点');
});

test('修订前真实草稿精确恢复并按原答案结算，已结算首次100分保持且不计考试积分',async()=>{
 const draft=JSON.parse(await readFile(new URL('./fixtures/bank-dedup-before-20261118.json',import.meta.url),'utf8'));
 const old=mergeBackup(empty(),draft);assert.deepEqual(old.tests,draft.tests);assert.equal(old.tests.flatMap(a=>a.questions).length,7);
 for(const a of old.tests){submitExam(a,2);assert.equal(settleExam(a).total,100);assert.equal(setMark(a,a.questions[0].id,0),false);}
 assert.equal(totalPoints(old.tests),0);
 const settled=JSON.parse(await readFile(new URL('./fixtures/bank-dedup-settled-20261118.json',import.meta.url),'utf8'));
 assert.deepEqual(mergeBackup(empty(),settled).tests,settled.tests);
 for(const a of settled.tests)assert.equal(settleExam(a).total,100);
 const forged=structuredClone(draft);forged.tests[0].questions[0].revision=2;assert.throws(()=>mergeBackup(empty(),forged),/题目|版本/);
 const injected=structuredClone(draft),q=injected.tests[0].questions[0],now=getPracticeCourse('digital').questions.find(p=>p.id===q.id);q.answers=now.answers;q.formats=now.formats;assert.throws(()=>mergeBackup(empty(),injected),/题目|版本/);
});

test('单题旧掌握记录归档，不能把旧答64的正确状态套到新反求题',()=>{
 const id='P4-structures-8-F-007',record={revision:1,answer:['64'],submitted:true,status:'correct',score:100},data={...empty(),practice:{structures:{seen:[id],current:id,records:{[id]:record}}}};
 reconcilePracticeRecords(data,subject=>getPracticeCourse(subject).questions);
 assert.equal(data.practice.structures.records[id],undefined);assert.equal(data.practice.structures.archived[id+'@1'],record);assert.equal(record.score,100);assert.equal(record.submitted,true);assert.deepEqual(data.practice.structures.seen,[]);
});

test('再次导入旧版active记录不能覆盖本地已有同版本归档，既有记录优先而非取最高分',()=>{
 const id='P4-structures-8-F-007';
 for(const localScore of [0,100]){
  const local={revision:1,answer:[localScore===100?'64':'65'],submitted:true,status:localScore===100?'correct':'wrong',score:localScore};
  const imported={revision:1,answer:[localScore===100?'65':'64'],submitted:true,status:localScore===100?'wrong':'correct',score:100-localScore};
  const current={...empty(),practice:{structures:{seen:[],current:null,records:{},archived:{[id+'@1']:local}}}},input={...empty(),practice:{structures:{records:{[id]:imported}}}},photo=JSON.stringify(current),incomingPhoto=JSON.stringify(input);
  const merged=mergeBackup(current,input);assert.deepEqual(merged.practice.structures.archived[id+'@1'],local);assert.equal(merged.practice.structures.records[id],undefined);assert.equal(JSON.stringify(current),photo);assert.equal(JSON.stringify(input),incomingPhoto);
 }
});

test('实际伙伴反求题以分割树独立枚举原阶，一次合并条件排除多轮反例',()=>{
 const q=getPracticeCourse('structures').questions.find(q=>q.id==='P4-structures-8-F-007');assert.equal(q.revision,2);
 const match=q.stem.match(/^二进制伙伴池的基址为0。某空闲块起址为(\d+)，它与伙伴进行一次合并后，所得父块起址为(\d+)。若原块大小为2\^k，则k=____。$/);assert.ok(match,'题意改变须重新核定本oracle');
 const [childStart,parentStart]=match.slice(1).map(Number);
 function parents(order,start=0){if(order===0)return [];const half=2**(order-1);return [{order,start,children:[start,start+half]},...parents(order-1,start),...parents(order-1,start+half)];}
 for(let poolOrder=8;poolOrder<=12;poolOrder++){
  const matches=parents(poolOrder).filter(p=>p.start===parentStart&&p.children.includes(childStart));assert.equal(matches.length,1);
  const k=matches[0].order-1;assert.equal(grade(q,[String(k)]).correct,true);assert.equal(grade(q,[String(k+1)]).correct,false);assert.equal(grade(q,[String(2**k)]).correct,false);
 }
 const tree=parents(9),initialOrders=[];
 for(let k=0;k<9;k++){if(childStart%(2**k))continue;let start=childStart,order=k,steps=0;while(order<9){const p=tree.find(p=>p.order===order+1&&p.children.includes(start));assert.ok(p);start=p.start;order++;steps++;if(start===parentStart){initialOrders.push({k,steps});break;}}}
 assert.deepEqual(initialOrders.filter(p=>[4,5,6].includes(p.k)),[{k:4,steps:3},{k:5,steps:2},{k:6,steps:1}]);
});
