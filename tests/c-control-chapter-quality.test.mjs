import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {codeTaskGuide} from '../code-editor.js';
import {questionTermCandidates,termCatalogue} from '../term-candidates.js';

const course=getPracticeCourse('programming');
const id=(kind,n)=>`C6L-programming-4-${kind}-${String(n).padStart(3,'0')}`;
const find=(kind,n)=>course.questions.find(q=>q.id===id(kind,n));
const labels=q=>questionTermCandidates('programming',q).flatMap(row=>row.entry.aliases);

test('控制结构实际新版解析与正确选项、C作用域和计数结果一致',()=>{
 for(const [n,answer]of [[22,'10'],[39,'22'],[54,'2 6']]){
  const q=find('S',n);assert.equal(q.revision,2);assert.equal(q.options[q.answer],answer);
 }
 const sign=find('S',34),loops=find('S',53);
 assert.equal(sign.answer,2);assert.match(sign.explanation,/^C先筛正数/);
 assert.equal(loops.answer,1);assert.match(loops.explanation,/^B每轮外层/);
 const entry=termCatalogue('programming').find(e=>e.aliases.includes('continue'));
 assert.match(entry.definition,/最近.*循环/);assert.match(entry.definition,/switch/);
});

test('C输出参数边界限制明确，原接口及两版判题保持',()=>{
 for(const [n,condition]of [[17,/两个不同的有效可写int对象/],[22,/与delta数组的前n项不重叠/]]){
  const q=find('P',n);
  const old=getPracticeCourse('programming',{questionRevisions:{[q.id]:1}}).questions.find(x=>x.id===q.id);
  assert.match(q.stem,condition);assert.doesNotMatch(old.stem,condition);
  assert.equal(q.revision,2);
  assert.equal(q.signature,old.signature);
  assert.equal(codeTaskGuide(q).starter,codeTaskGuide(old).starter);
  assert.ok(q.judge&&old.judge&&hasJudgeContract(q.id,2)&&hasJudgeContract(q.id,1));
  assert.ok(labels(q).includes('指针别名'));
  assert.ok(!labels(q).includes('输出格式化'));
 }
 const sentinel=labels(find('S',41));assert.ok(sentinel.includes('输入结束标记')&&sentinel.includes('终止条件'));
 assert.ok(labels(find('S',50)).includes('循环不变量'));
});
