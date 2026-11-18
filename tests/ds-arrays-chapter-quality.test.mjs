import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {mergeBackup} from '../room-progress.js';
import {totalPoints} from '../sessions.js';
import {dsTaskGuide} from '../ds-coding-task-guides.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {questionTermCandidates} from '../term-candidates.js';

const id=(type,n)=>`P4-structures-5-${type}-${String(n).padStart(3,'0')}`;
const course=getPracticeCourse('structures');
const current=(type,n)=>course.questions.find(q=>q.id===id(type,n));
const labels=q=>questionTermCandidates('structures',q).map(row=>row.entry.aliases[0]);

test('实际修订保留压缩映射、共享引用与广义表的不同答案域',()=>{
 for(const [n,correct,wrong]of [
  [2,['36'],[['30'],['32']]],
  [6,['21'],[['16'],['20']]],
  [8,['5','1'],[['4','4'],['1','5']]],
  [18,['7'],[['2'],['3']]],
 ]){
  const q=current('F',n);assert.equal(q.revision,2);assert.ok(grade(q,correct).correct);
  for(const answer of wrong)assert.equal(grade(q,answer).correct,false,q.id);
 }
 for(const [n,legal,wrong]of [[16,['a'],['A','a,','a ','(a)']],[17,['(c)','（c）'],['(C)','(c,)','c','( c )']]]){
  const q=current('F',n);assert.deepEqual(q.formats,['literal-string']);
  for(const answer of legal)assert.ok(grade(q,[answer]).correct);
  for(const answer of wrong)assert.equal(grade(q,[answer]).correct,false,q.id);
 }
});

test('旧站实际生成的两份宽容与失败答卷保持题版、答案和首分',async()=>{
 const old=JSON.parse(await readFile(new URL('./fixtures/ds-arrays-literal-before-20261118.json',import.meta.url),'utf8'));
 const restored=mergeBackup({version:2,attempts:[],practice:{},tests:[]},old);
 assert.deepEqual(restored,old);
 assert.deepEqual(restored.tests.map(a=>a.result.total),[100,0]);
 assert.equal(totalPoints(restored.tests),0);
});

test('更新层数成本的C题继续支持旧版并沿用相同程序合同',()=>{
 for(const n of [3,6,7]){
  const q=current('D',n);
  assert.equal(q.revision,4);
  for(const version of [2,3,4])assert.ok(hasJudgeContract(q.id,version));
  assert.equal(dsTaskGuide(q.id,4).solution,dsTaskGuide(q.id,3).solution);
  assert.equal(dsTaskGuide(q.id,4).starter,dsTaskGuide(q.id,3).starter);
 }
 const q=current('D',6);
 assert.ok(q.stem.includes('展开访问数+levels'));
 const old=getPracticeCourse('structures',{questionRevisions:{[q.id]:3}}).questions.find(x=>x.id===q.id);
 assert.ok(!old.stem.includes('展开访问数+levels'));
});

test('CSR整数行界、广义表取尾、共享引用与链表指针的真实语境分开',()=>{
 for(const [kind,n]of [['S',10],['F',11]]){
  const terms=labels(current(kind,n));
  assert.ok(terms.includes('CSR行偏移'));
  assert.ok(!terms.includes('指针指向关系'));
 }
 assert.ok(labels(current('S',14)).includes('广义表表尾'));
 assert.ok(!labels(current('S',14)).includes('函数调用过程'));
 assert.ok(labels(current('F',18)).includes('按引用位置展开'));
 assert.ok(!labels(current('S',20)).includes('对角线'));
 const real=labels({stem:'结点指针p指向链表结点，通过p->next访问后继。'});
 assert.ok(real.includes('指针指向关系'));
});
