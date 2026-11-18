import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {mergeBackup} from '../room-progress.js';
import {submitExam,applyCodeResult,settleExam,totalPoints} from '../sessions.js';
import {applyAIReview,reviewRubric,pendingAIQuestions} from '../ai-grading.js';
const empty=()=>({version:2,attempts:[],practice:{}});
test('合法计数与实际分析要求修为revision3，历史revision2准确保留',()=>{
 const ids=['P4-structures-1-D-001','P4-structures-10-D-008'],current=getPracticeCourse('structures'),old=getPracticeCourse('structures',{questionRevisions:Object.fromEntries(ids.map(id=>[id,2]))});
 for(const id of ids){const q=current.questions.find(q=>q.id===id),before=old.questions.find(q=>q.id===id);assert.equal(q.revision,3);assert.equal(before.revision,2);assert.equal(q.stem,before.stem);assert.equal(q.model,before.model);assert.notDeepEqual(q.rubric,before.rubric);assert.equal(q.judge,false);assert.equal(q.manualReview,true);}
 assert.ok(current.questions.find(q=>q.id===ids[0]).rubric.some(s=>s.includes('n-1')));
 assert.ok(!current.questions.find(q=>q.id===ids[1]).rubric.some(s=>s.includes('概率成本')));
});
for(const name of ['intro','sort'])test(`${name}评分修订前真实生成的AI草稿及首次结果仍可恢复`,async()=>{
 const before=JSON.parse(await readFile(new URL(`./fixtures/ds-${name}-interface2-before-rubric.json`,import.meta.url),'utf8'));
 const a=mergeBackup(empty(),before).tests[0];assert.deepEqual(a,before.tests[0]);assert.equal(a.subjectiveGradingVersion,1);submitExam(a,2);
 // These explicit test receipts exercise persistence, not model grading quality.
 for(const q of a.questions){if(q.judge)assert.equal(applyCodeResult(a,q.id,a.answers[q.id],{status:'accepted',passed:1,total:1},'c'),true);else assert.equal(applyAIReview(a,{version:1,grader:'codex',questionId:q.id,revision:q.revision,language:'c',answer:a.answers[q.id],points:q.points,score:q.points,feedback:'用于验证历史恢复的模拟评阅。',criteria:reviewRubric(q).map((_,index)=>({index,verdict:'met',comment:'历史恢复测试要点。'}))}),true);}
 assert.equal(pendingAIQuestions(a).length,0);assert.equal(settleExam(a).total,100);assert.equal(totalPoints([a]),0);
 assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[a]}).tests,[a]);
 const invalid=structuredClone(before),target=invalid.tests[0].questions.find(q=>q.id===(name==='intro'?'P4-structures-1-D-001':'P4-structures-10-D-008'));target.rubric=getPracticeCourse('structures').questions.find(q=>q.id===target.id).rubric;
 assert.throws(()=>mergeBackup(empty(),invalid),/题目内容/);
 assert.equal(settleExam(a).total,100);
});
