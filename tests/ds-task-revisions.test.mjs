import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {dsLinearTaskGuides} from '../ds-linear-task-guides.js';
import {dsLinearReferenceSources} from '../scripts/judge-ds-linear-contracts.mjs';
import {dsStringTaskGuides} from '../ds-string-task-guides.js';
import {dsStringReferenceSources} from '../scripts/judge-ds-string-contracts.mjs';
import {dsArrayTaskGuides} from '../ds-array-task-guides.js';
import {dsArrayReferenceSources} from '../scripts/judge-ds-array-contracts.mjs';
import {dsAnalysisTaskGuides} from '../ds-analysis-task-guides.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {codeTaskGuide,codeEditor} from '../code-editor.js';
import {mergeBackup,reconcilePracticeRecords} from '../room-progress.js';
import {startChapterTest,submitExam,setMark,settleExam,totalPoints,applyCodeResult} from '../sessions.js';
import {composeChapterPractice} from '../chapter-practice.js';
const fixture=JSON.parse(await readFile(new URL('./fixtures/ds-linear-before-contract.json',import.meta.url),'utf8'));
const empty=()=>({version:2,attempts:[],practice:{}});
const ids=Object.keys(dsLinearTaskGuides);

test('五题修订保留旧版题面和自评，新版提供真实接口及公开实现，题量不增加',()=>{
 const current=getPracticeCourse('structures');assert.equal(current.questions.length,1024); // 源码不含176道本地原题。
 const old=getPracticeCourse('structures',{questionRevisions:Object.fromEntries(ids.map(id=>[id,1]))});
 assert.equal(current.questions.length,old.questions.length);
 for(const id of ids){
  const a=current.questions.find(q=>q.id===id),b=old.questions.find(q=>q.id===id),g=dsAnalysisTaskGuides[id];
  assert.equal(a.revision,3);assert.equal(a.judge,true);assert.equal(b.revision,1);assert.equal(b.judge,undefined);
  assert.equal(a.stem,g.publicStatement);assert.ok(a.model.includes(g.solution));assert.ok(!a.model.includes('undefined'));
  assert.equal(g.solution,dsLinearReferenceSources[id]);
  assert.equal(codeTaskGuide(a),g);assert.equal(codeTaskGuide(b),undefined);
  assert.equal(hasJudgeContract(id,1),false);assert.equal(hasJudgeContract(id,2),true);assert.equal(hasJudgeContract(id,3),true);
  assert.equal(codeTaskGuide({...a,revision:2}),dsLinearTaskGuides[id]);
  assert.ok(codeEditor(a,undefined,'test',false,true).includes('data-code-judge'));
  assert.ok(!codeEditor(b,undefined,'test',false,true).includes('data-code-judge'));
 }
 assert.throws(()=>getPracticeCourse('structures',{questionRevisions:{[ids[0]]:99}}),/版本/);
});

test('迁接口前真实生成的草稿和其首次自评可恢复，旧记录归档不丢答案',()=>{
 const restored=mergeBackup(empty(),fixture);assert.deepEqual(restored.tests,fixture.tests);
 const old=restored.tests[0];submitExam(old,2);for(const q of old.questions)setMark(old,q.id,q.points);settleExam(old);
 assert.equal(old.result.total,100);assert.equal(totalPoints([old]),0);
 assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[old]}).tests,[old]);
 const room={practice:{structures:{seen:[ids[0]],records:{[ids[0]]:{revision:1,answer:'previous reasoning',status:'review'}}}}};
 reconcilePracticeRecords(room,s=>getPracticeCourse(s).questions);
 assert.equal(room.practice.structures.records[ids[0]],undefined);
 assert.equal(room.practice.structures.archived[ids[0]+'@1'].answer,'previous reasoning');
});

test('新自动组题可恢复新版代码，旧/新题面互换及未知版本不能混过快照',()=>{
 const paper=composeChapterPractice('structures',2,{preset:'custom',custom:{choice:0,fill:0,code:5,judgement:0}},[],()=>.5);
 const a=startChapterTest('structures',paper,1,'ds-current');
 assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[a]}).tests,[a]);
 const bad=structuredClone(fixture);bad.tests[0].questions[0].revision=2;assert.throws(()=>mergeBackup(empty(),bad));
 const unknown=structuredClone(fixture);unknown.tests[0].questions[0].revision=99;assert.throws(()=>mergeBackup(empty(),unknown),/版本/);
 const altered=structuredClone(fixture);altered.tests[0].questions[0].stem+='changed';assert.throws(()=>mergeBackup(empty(),altered));
});

for(const [name,chapter,guides,sources,fixtureName]of [
 ['串',4,dsStringTaskGuides,dsStringReferenceSources,'ds-string-before-contract.json'],
 ['数组与广义表',5,dsArrayTaskGuides,dsArrayReferenceSources,'ds-array-before-contract.json']
])test(`${name}10题沿用相同版本规则，迁接口前整批答卷仍按原题恢复和自评`,async()=>{
 const before=JSON.parse(await readFile(new URL('./fixtures/'+fixtureName,import.meta.url),'utf8'));
 const ids=Object.keys(guides);
 const analysisVersion=getPracticeCourse('structures',{questionRevisions:Object.fromEntries(ids.map(id=>[id,3]))});
 const prior=getPracticeCourse('structures',{questionRevisions:Object.fromEntries(ids.map(id=>[id,1]))});
 assert.equal(analysisVersion.questions.length,prior.questions.length);
 for(const id of ids){
  const q=analysisVersion.questions.find(q=>q.id===id),old=prior.questions.find(q=>q.id===id),g=dsAnalysisTaskGuides[id];
  assert.equal(q.revision,3);assert.equal(q.judge,!g.manualReview);assert.equal(q.stem,g.publicStatement);
  assert.ok(q.model.includes(g.solution));assert.equal(g.solution,sources[id]);
  assert.equal(codeTaskGuide(q),g);assert.equal(hasJudgeContract(id,1),false);assert.equal(hasJudgeContract(id,2),true);
  assert.equal(hasJudgeContract(id,3),true);assert.equal(codeTaskGuide({...q,revision:2}),guides[id]);
  assert.equal(old.revision,1);assert.equal(old.judge,undefined);assert.equal(codeTaskGuide(old),undefined);
 }
 const restored=mergeBackup(empty(),before);assert.deepEqual(restored.tests,before.tests);
 const old=restored.tests[0];submitExam(old,2);for(const q of old.questions)setMark(old,q.id,q.points);settleExam(old);
 assert.equal(old.result.total,100);assert.equal(totalPoints([old]),0);
 assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[old]}).tests,[old]);
 const bad=structuredClone(before);bad.tests[0].questions[0].revision=2;assert.throws(()=>mergeBackup(empty(),bad));
 const paper=composeChapterPractice('structures',chapter,{preset:'custom',custom:{choice:0,fill:0,code:10,judgement:0}});
 const now=startChapterTest('structures',paper,1,'ds-current-'+chapter);
 assert.ok(now.questions.every(q=>hasJudgeContract(q.id,q.revision)&&q.judge===!q.manualReview));
 assert.deepEqual(now.questions.map(q=>[q.id,q.revision]).sort(),getPracticeCourse('structures').questions.filter(q=>ids.includes(q.id)).map(q=>[q.id,q.revision]).sort());
 assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[now]}).tests,[now]);
});

test('分析评分升版前真实自动答卷保留原题面、代码成绩与首次总分',async()=>{
 for(const chapter of [2,3,4,5]){
  const before=JSON.parse(await readFile(new URL(`./fixtures/ds-analysis-ch${chapter}-before.json`,import.meta.url),'utf8'));
  const old=mergeBackup(empty(),before).tests[0];assert.deepEqual(old,before.tests[0]);assert.ok(old.questions.some(q=>q.judge));
  submitExam(old,2);for(const q of old.questions){if(q.judge)assert.equal(applyCodeResult(old,q.id,old.answers[q.id],{status:'accepted',passed:4,total:4}),true);else assert.equal(setMark(old,q.id,q.points),true);}
  assert.equal(settleExam(old).total,100);assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[old]}).tests,[old]);
  for(const q of old.questions){assert.equal(setMark(old,q.id,0),false);assert.equal(applyCodeResult(old,q.id,old.answers[q.id],{status:'wrong_answer'}),false);}
  assert.equal(settleExam(old).total,100);
 }
});

test('新分析题不能删judge标记伪装旧版，栈新旧提示按准确版本选取',()=>{
 const current=getPracticeCourse('structures'),analysis=Object.entries(dsAnalysisTaskGuides).filter(([,g])=>g.manualReview);
 assert.equal(analysis.length,7);
 for(const [id,g]of analysis){const q=getPracticeCourse('structures',{questionRevisions:{[id]:g.revision}}).questions.find(q=>q.id===id);assert.equal(q.judge,false);assert.equal(q.manualReview,true);assert.equal(codeTaskGuide(q),g);assert.ok(hasJudgeContract(id,q.revision));}
 for(const id of ['P3-structures-3-97','P3-structures-3-98']){
  const old=getPracticeCourse('structures',{questionRevisions:{[id]:1}}).questions.find(q=>q.id===id);
  assert.equal(old.judge,true);assert.ok(!old.manualReview);assert.ok(!codeTaskGuide(old).manualReview);
  assert.ok(!codeTaskGuide({...old,revision:99}));
 }
 const a=startChapterTest('structures',composeChapterPractice('structures',4,{preset:'custom',custom:{choice:0,fill:0,code:10,judgement:0}}),1,'analysis-new');
 const bad=structuredClone(a),q=bad.questions.find(q=>q.manualReview);q.judge=true;
 assert.throws(()=>mergeBackup(empty(),{...empty(),tests:[bad]}),/题目内容/);
 const unknown=structuredClone(a);unknown.questions[0].revision=99;
 assert.throws(()=>mergeBackup(empty(),{...empty(),tests:[unknown]}),/版本/);
});

test('全部25个旧revision2接口准确恢复，其他既有revision2栈题仍有原提交说明',()=>{
 const previous={...dsLinearTaskGuides,...dsStringTaskGuides,...dsArrayTaskGuides};
 const stackIds=['P3-structures-3-92','P3-structures-3-94','P3-structures-3-96','P3-structures-3-99'];
 const old=getPracticeCourse('structures',{questionRevisions:Object.fromEntries([...Object.keys(previous),...stackIds].map(id=>[id,2]))});
 for(const [id,guide]of Object.entries(previous)){
  const q=old.questions.find(q=>q.id===id);assert.equal(q.revision,2);assert.equal(q.stem,guide.publicStatement);assert.equal(q.judge,true);assert.ok(!q.manualReview);assert.equal(codeTaskGuide(q),guide);
 }
 for(const id of stackIds){
  const q=old.questions.find(q=>q.id===id);assert.equal(q.revision,2);assert.ok(codeTaskGuide(q)?.instruction);assert.equal(hasJudgeContract(id,q.revision),true);
 }
});
