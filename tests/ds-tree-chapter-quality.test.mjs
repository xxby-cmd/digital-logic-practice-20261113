import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {dsTaskGuide} from '../ds-coding-task-guides.js';

const id=suffix=>'P4-structures-6-'+suffix;
const question=(suffix,revision)=>getPracticeCourse('structures',revision?{questionRevisions:{[id(suffix)]:revision}}:{}).questions.find(q=>q.id===id(suffix));

test('树的遍历、前缀解码填空接受连续的字面答案并保留原评分版本',()=>{
 assert.ok(grade(question('F-009'),['ACB']).correct);
 assert.equal(grade(question('F-009'),['A,C,B']).correct,false);
 assert.ok(grade(question('F-009',1),['A,C,B']).correct);
 assert.ok(grade(question('F-013'),['ACDB']).correct);
 assert.equal(grade(question('F-013'),['acdb']).correct,false);
 assert.ok(grade(question('F-013',1),['3']).correct);
});

test('三个树任务新旧题面均可恢复，继续使用原编辑模板及自动编译接口',()=>{
 for(const suffix of ['D-002','D-003','D-008']){
  const next=question(suffix),old=question(suffix,2),newGuide=dsTaskGuide(next.id,3),oldGuide=dsTaskGuide(old.id,2);
  assert.equal(next.stem,newGuide.publicStatement);
  assert.equal(old.stem,oldGuide.publicStatement);
  assert.notEqual(next.stem,old.stem);
  for(const field of ['starter','instruction','solution'])assert.equal(newGuide[field],oldGuide[field]);
  assert.equal(next.judge,true);
  assert.equal((next.model.match(/参考实现：/g)||[]).length,1);
 }
});
