import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {dsTaskGuide} from '../ds-coding-task-guides.js';
import {grade} from '../grading.js';

const id=suffix=>'P4-structures-7-'+suffix;
const question=(suffix,rev)=>getPracticeCourse('structures',rev?{questionRevisions:{[id(suffix)]:rev}}:{}).questions.find(q=>q.id===id(suffix));

test('图题区分有向零权与不可达、项目工期与单项活动时间',()=>{
 assert.ok(grade(question('F-013'),['3','不可达']).correct);
 assert.equal(grade(question('F-013'),['5','不可达']).correct,false);
 assert.ok(grade(question('F-011'),['1']).correct);
 assert.match(question('A-014').model,/另一条关键路径继续保持原长度/);
 assert.match(question('J-018').explanation,/0→3→2→1/);
});

test('图编程题新旧题面按版本保存，模板、参考实现与人工评分种类仍各取原值',()=>{
 const ids=Array.from({length:9},(_,i)=>`D-00${i+1}`);
 for(const suffix of ids){
  const current=question(suffix),previous=question(suffix,2);
  const g=dsTaskGuide(current.id,3),old=dsTaskGuide(previous.id,2);
  assert.equal(current.stem,g.publicStatement);
  assert.equal(previous.stem,old.publicStatement);
  assert.notEqual(g.publicStatement,old.publicStatement);
  assert.equal(g.starter,old.starter);
  assert.equal(g.solution,old.solution);
  assert.equal(current.judge,previous.judge);
 }
 assert.equal(question('D-006').manualReview,true);
 assert.match(question('D-007').stem,/沿各当前结点的next逐跳走原图已有弧，须最终到达t/);
 assert.match(question('D-008').stem,/1≤n≤32/);
});
