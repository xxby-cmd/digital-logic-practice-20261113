import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readLocalReferenceRevisions} from '../scripts/local-reference-revisions.mjs';
import {practiceQuestionAtRevision,practiceQuestionRevisions} from '../bank-revisions.js';
test('参考题复用原版本入口，私有补丁不进入默认原创注册表',async()=>{
 const versions=await readLocalReferenceRevisions(fileURLToPath(new URL('./fixtures/local-reference-revisions/',import.meta.url)));
 const q={id:'QA-LOCAL-REFERENCE',revision:1,type:'short',chapter:2,stem:'原始题干',model:'原解答',rubric:['原评分点'],walkthrough:{idea:'旧提示',steps:['旧步骤']}},snapshot=JSON.stringify(q);
 const next=practiceQuestionAtRevision(q,undefined,versions[q.id]);
 assert.equal(next.revision,2);assert.equal(next.stem,'独立的新版题干');assert.deepEqual(next.rubric,['仅考题面公开要求']);
 assert.deepEqual(next.walkthrough,{idea:'先读题设',steps:['依据公开条件逐步推导'],result:'修订后的解释',pitfalls:['不要推定未提供条件']});
 assert.equal(next.model,q.model);assert.equal(next.id,q.id);assert.equal(next.chapter,q.chapter);assert.equal(next.type,q.type);
 assert.equal(practiceQuestionAtRevision(q,1,versions[q.id]),q);assert.deepEqual(practiceQuestionAtRevision(q,2,versions[q.id]),next);
 assert.throws(()=>practiceQuestionAtRevision(q,99,versions[q.id]),/版本/);assert.equal(JSON.stringify(q),snapshot);assert.equal(practiceQuestionRevisions[q.id],undefined);
});
test('参考修订缺文件可继续，无效数据或改题号不能静默忽略',async()=>{
 const missing=fileURLToPath(new URL('./fixtures/local-reference-revisions/missing/',import.meta.url));assert.deepEqual(await readLocalReferenceRevisions(missing),{});
 await assert.rejects(readLocalReferenceRevisions(fileURLToPath(new URL('./fixtures/invalid-reference-revisions/',import.meta.url))),/格式无效/);
});
