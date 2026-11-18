import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolveReviewQuestion} from '../scripts/ai-grading.mjs';
import {readLocalReferenceRevisions} from '../scripts/local-reference-revisions.mjs';
import {practiceQuestionAtRevision,practiceQuestionRevisions} from '../bank-revisions.js';
import {reviseQuestionLanguage} from '../question-language.js';
let references;try{references=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已接入题目.json',import.meta.url),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
test('可选本地参考题的新旧评阅版本一致，私有题文与补丁不固化进源码',{
 skip:!references?.structures?.some(q=>q.id==='YAN-C-02-2-10')
},async()=>{
 const revisions=await readLocalReferenceRevisions();
 for(const id of ['YAN-C-02-2-10','YAN-C-02-2-24']){
  const raw=reviseQuestionLanguage(references.structures.find(q=>q.id===id));assert.ok(revisions[id]?.[2]);assert.equal(practiceQuestionRevisions[id],undefined);
  for(const revision of [1,2]){
   const actual=await resolveReviewQuestion('structures',{questionId:id,revision,language:'c'}),expected=practiceQuestionAtRevision(raw,revision,revisions[id]);assert.deepEqual(actual,expected,id+'@'+revision);
  }
  await assert.rejects(resolveReviewQuestion('structures',{questionId:id,revision:99,language:'c'}),/版本/);
 }
});
