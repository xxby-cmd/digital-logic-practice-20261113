import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {codeTaskGuide,codeEditor} from '../code-editor.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {resolveReviewQuestion} from '../scripts/ai-grading.mjs';
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const hash=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const fixture=JSON.parse(await readFile(new URL('./fixtures/chapter-quality-revisions-20261118.json',import.meta.url),'utf8'));
test('61修订默认新版本与明确历史版本完整字段一致，不增题号/型/章',()=>{
 assert.equal(fixture.items.length,61);
 for(const c of fixture.items){
  const course=getPracticeCourse(c.subject),current=course.questions.find(q=>q.id===c.id),old=getPracticeCourse(c.subject,{questionRevisions:{[c.id]:c.baseRevision}}).questions.find(q=>q.id===c.id);
  assert.equal(current.revision,c.revision,c.id);assert.equal(hash(current),c.newQuestionSha256,c.id+'新版全部字段');assert.equal(hash(old),c.baseQuestionSha256,c.id+'历史全部字段');
  assert.equal(current.type,c.type);assert.equal(current.chapter,c.chapter);assert.equal(current.type,old.type);assert.equal(current.chapter,old.chapter);assert.deepEqual(practiceQuestionRevisions[c.id][c.revision],c.patch);
  assert.throws(()=>getPracticeCourse(c.subject,{questionRevisions:{[c.id]:99}}),/版本/);
 }
});
test('公开栈队列补充分离数据与元数据、说明输入只读，6题仍有真实编辑器和功能契约',()=>{
 const qs=getPracticeCourse('structures').questions;
 for(const n of [91,92,94,95,96,100]){const q=qs.find(q=>q.id==='P3-structures-3-'+n);assert.equal(q.judge,true);assert.ok(hasJudgeContract(q.id,q.revision));assert.ok(codeTaskGuide(q));assert.ok(codeEditor(q,undefined,'quality',false,true).includes('data-code-judge'));assert.match(q.stem,/独立|不重叠/);}
 assert.match(qs.find(q=>q.id==='P3-structures-3-100').stem,/只读，不得修改/);
});
test('待评旧AI草稿和新作答各取自身版本的评分点，移除题外要求不改旧规则',async()=>{
 for(const [subject,id,oldRevision,newRevision]of [['structures','P3-structures-3-81',1,2],['structures','P3-structures-3-86',1,2],['structures','P3-structures-3-88',1,2],['digital','P4-digital-2-R-003',2,3]]){
  const seen=[];
  for(const revision of [oldRevision,newRevision]){const q=await resolveReviewQuestion(subject,{questionId:id,revision,language:'c'}),expected=getPracticeCourse(subject,{questionRevisions:{[id]:revision}}).questions.find(q=>q.id===id);assert.deepEqual(q,expected);assert.equal(q.revision,revision);seen.push(q);}
  assert.notDeepEqual(seen[0].rubric,seen[1].rubric,id);
  await assert.rejects(resolveReviewQuestion(subject,{questionId:id,revision:99,language:'c'}),/版本|评阅/);
 }
});
