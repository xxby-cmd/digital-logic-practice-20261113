import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {dsIntroTaskGuides} from '../ds-intro-task-guides.js';
import {dsGraphTaskGuides} from '../ds-graph-task-guides.js';
import {dsTreeTaskGuides} from '../ds-tree-task-guides.js';
import {dsSortTaskGuides} from '../ds-sort-task-guides.js';
import {dsSearchTaskGuides} from '../ds-search-task-guides.js';
import {revisionedDsTaskGuides} from '../ds-coding-task-guides.js';
import {codeTaskGuide,codeEditor} from '../code-editor.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {composeChapterPractice} from '../chapter-practice.js';
import {startChapterTest,submitExam,setMark,settleExam,totalPoints} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';
const empty=()=>({version:2,attempts:[],practice:{}});
const revisionThree=new Set([
 'P4-structures-1-D-001','P4-structures-1-D-002','P4-structures-1-D-005','P4-structures-6-D-002','P4-structures-6-D-003',
 'P4-structures-6-D-008','P4-structures-10-D-002','P4-structures-10-D-008',
 'P4-structures-9-D-003','P4-structures-9-D-006',
 ...Array.from({length:9},(_,i)=>`P4-structures-7-D-00${i+1}`)
]);
for(const [name,chapter,guides]of [['intro',1,dsIntroTaskGuides],['tree',6,dsTreeTaskGuides],['graph',7,dsGraphTaskGuides],['sort',10,dsSortTaskGuides],['search',9,dsSearchTaskGuides]]){
 test(`DS ${name}现有题改接口不增量，测试能力与整题评分区分且旧版准确`,()=>{
  const current=getPracticeCourse('structures'),ids=Object.keys(guides),old=getPracticeCourse('structures',{questionRevisions:Object.fromEntries(ids.map(id=>[id,1]))});
  assert.equal(current.questions.length,1024);assert.equal(old.questions.length,current.questions.length);
  for(const [id,g]of Object.entries(guides)){
   const q=current.questions.find(q=>q.id===id),prior=old.questions.find(q=>q.id===id),latest=revisionedDsTaskGuides[id],revision=revisionThree.has(id)?3:2;
   assert.equal(q.revision,revision);assert.equal(q.stem,latest.publicStatement);assert.ok(q.model.includes(latest.solution));assert.equal(q.judge,!g.manualReview);
   const previous=getPracticeCourse('structures',{questionRevisions:{[id]:2}}).questions.find(q=>q.id===id);
   assert.ok(previous.model.includes(g.solution));assert.equal(previous.stem,g.publicStatement);
   assert.equal(hasJudgeContract(id,revision),true);assert.equal(codeTaskGuide(q),latest);assert.equal(codeTaskGuide({...q,revision:2}),g);assert.ok(codeEditor(q,undefined,'current',false,true).includes('data-code-judge'));
   assert.equal(hasJudgeContract(id,1),false);assert.equal(prior.revision,1);assert.ok(!prior.judge);assert.equal(codeTaskGuide(prior),undefined);
   assert.ok(!codeEditor(prior,undefined,'previous',false,true).includes('data-code-judge'));
   assert.equal(hasJudgeContract(id,1,'java'),false);assert.equal(hasJudgeContract(id,2,'unknown'),false);
  }
  const paper=composeChapterPractice('structures',chapter,{preset:'custom',custom:{choice:0,fill:0,code:ids.length,judgement:0}},[],()=>.5),a=startChapterTest('structures',paper,1,'revision-'+name);
  assert.equal(a.questions.length,ids.length);assert.equal(a.questions.reduce((n,q)=>n+q.points,0),100);
  assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[a]}).tests,[a]);
  const invalid=structuredClone(a);invalid.questions[0].revision=99;assert.throws(()=>mergeBackup(empty(),{...empty(),tests:[invalid]}),/版本/);
 });
 test(`DS ${name}迁接口前真实rev1整组作答和首次成绩保留`,async()=>{
  const before=JSON.parse(await readFile(new URL(`./fixtures/ds-${name==='sort'?'10':name==='search'?'9':name}-before-contract.json`,import.meta.url),'utf8'));
  const old=mergeBackup(empty(),before).tests[0];assert.deepEqual(old,before.tests[0]);
  assert.equal(new Set(old.questions.map(q=>q.id)).size,Object.keys(guides).length);
  submitExam(old,2);for(const q of old.questions)assert.equal(setMark(old,q.id,q.points),true);assert.equal(settleExam(old).total,100);assert.equal(totalPoints([old]),0);
  assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[old]}).tests,[old]);assert.equal(setMark(old,old.questions[0].id,0),false);
  const altered=structuredClone(before);altered.tests[0].questions[0].revision=2;assert.throws(()=>mergeBackup(empty(),altered));
 });
}
