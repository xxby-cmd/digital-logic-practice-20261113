import test from 'node:test';
import assert from 'node:assert/strict';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
test('已规范为旧revision2的题先按旧语言恢复，再选完整新版，不能被旧题面覆盖',()=>{
 const id='P3-structures-3-92',before=getPracticeCourse('structures',{questionRevisions:{[id]:2}}).questions.find(q=>q.id===id),saved=practiceQuestionRevisions[id],next=Math.max(3,...Object.keys(saved||{}).map(n=>Number(n)+1));
 assert.equal(before.revision,2);
 const stem=before.stem+'数组与元数据所指对象互不重叠。';
 try{
  practiceQuestionRevisions[id]={...(saved||{}),[next]:{stem}};
  const current=getPracticeCourse('structures').questions.find(q=>q.id===id);assert.equal(current.revision,next);assert.equal(current.stem,stem);
  assert.deepEqual(getPracticeCourse('structures',{questionRevisions:{[id]:2}}).questions.find(q=>q.id===id),before);
  assert.throws(()=>getPracticeCourse('structures',{questionRevisions:{[id]:99}}),/版本/);
 }finally{if(saved===undefined)delete practiceQuestionRevisions[id];else practiceQuestionRevisions[id]=saved;}
});
