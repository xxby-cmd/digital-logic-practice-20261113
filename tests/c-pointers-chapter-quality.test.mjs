import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';

test('指针章的字符串终止符在正式题面保留为可复制的C转义',()=>{
 const ids=['C6P-programming-8-S-044','C6P-programming-8-S-045'];
 const current=getPracticeCourse('programming').questions.filter(q=>ids.includes(q.id));
 assert.equal(current.length,2);
 const original=getPracticeCourse('programming',{questionRevisions:Object.fromEntries(ids.map(id=>[id,1]))});
 for(const q of current){
  const old=original.questions.find(item=>item.id===q.id);
  assert.equal(q.revision,2);
  assert.ok(old.stem.includes('\0'));
  assert.ok(q.stem.includes("'\\0'"));
  assert.equal(q.stem,old.stem.replaceAll('\0','\\0'));
  assert.equal(q.options[q.answer],old.options[old.answer]);
 }
});
