import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {resolveReviewQuestion} from '../scripts/ai-grading.mjs';
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const hash=x=>createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const fixture=JSON.parse(await readFile(new URL('./fixtures/core-quality-revisions-20261118.json',import.meta.url),'utf8'));
// Only these two reviewed revision-2 questions receive revision-3 answer formats.
// The typed-fill tests check their new defaults; this fixture retains old fields.
const structuredFillHistory={'P2-structures-2-9':2,'P4-structures-2-F-002':2};
test('62原创上一轮修订与历史版完整字段一致，仅两道格式升级题显式读取旧2版',()=>{
 assert.equal(fixture.items.length,62);
 const explicitlyHistorical=[];
 for(const c of fixture.items){
  const revision=structuredFillHistory[c.id];if(revision!==undefined){assert.equal(c.subject,'structures');assert.equal(c.revision,revision,c.id+'历史读取必须仍是该夹具所审版本');explicitlyHistorical.push(c.id);}
  const course=getPracticeCourse(c.subject,revision===undefined?undefined:{questionRevisions:{[c.id]:revision}}),current=course.questions.find(q=>q.id===c.id),old=getPracticeCourse(c.subject,{questionRevisions:{[c.id]:c.baseRevision}}).questions.find(q=>q.id===c.id);
  assert.equal(current.revision,c.revision,c.id);assert.equal(hash(current),c.newQuestionSha256,c.id+'新版全部字段');assert.equal(hash(old),c.baseQuestionSha256,c.id+'历史全部字段');
  assert.equal(current.type,c.type);assert.equal(current.chapter,c.chapter);assert.equal(current.type,old.type);assert.equal(current.chapter,old.chapter);assert.deepEqual(practiceQuestionRevisions[c.id][c.revision],c.patch);
  assert.throws(()=>getPracticeCourse(c.subject,{questionRevisions:{[c.id]:99}}),/版本/);
 }
 assert.deepEqual(explicitlyHistorical.sort(),Object.keys(structuredFillHistory).sort(),'历史读取仅覆盖本轮实际升级的两道旧2版');
});
test('本轮简答评分按作答自身题号版本取题面与评分点',async()=>{for(const c of fixture.items.filter(c=>c.type==='short'))for(const revision of [c.baseRevision,c.revision]){const q=await resolveReviewQuestion(c.subject,{questionId:c.id,revision,language:'c'}),expected=getPracticeCourse(c.subject,{questionRevisions:{[c.id]:revision}}).questions.find(q=>q.id===c.id);assert.deepEqual(q,expected,c.id+'@'+revision);}});
