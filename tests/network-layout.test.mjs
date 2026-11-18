import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse,PRACTICE_LAYOUT_VERSION} from '../practice-library.js';
import {composeChapterPractice} from '../chapter-practice.js';
import {composeChapterTest} from '../chapter-tests.js';
import {startChapterTest,saveExamAnswer,submitExam,setMark,settleExam,totalPoints} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';
import {resolveRoute} from '../subjects.js';
import {grade} from '../grading.js';
const empty=()=>({version:2,attempts:[],practice:{}});
const moved=[15,16,17,18,25,26,27,30,59,70,73,77,78,81,82,84,90,91].map(n=>`P3-network-4-${n}`);
const fixture=JSON.parse(await readFile(new URL('./fixtures/network-layout-v1.json',import.meta.url),'utf8'));

test('计网完整目录保留，原18控制题迁章与新增两章相互独立',()=>{
 const current=getPracticeCourse('network'),old=getPracticeCourse('network',{layout:1});
 assert.equal(current.chapters.length,10);assert.equal(old.chapters.length,6);
 assert.deepEqual(current.chapters.filter(c=>c.id!=='physical').map(c=>Number(c.name.match(/^第(\d+)章/)[1])),[1,2,3,4,5,6,7,8,9]);
 assert.equal(current.questions.length,old.questions.length);assert.equal(current.questions.length,982);
 assert.deepEqual(current.questions.filter(q=>moved.includes(q.id)).map(q=>q.id),moved);
 assert.equal(current.chapters.find(c=>c.id==='control').count,95);
 assert.equal(current.chapters.find(c=>c.id===4).count,98);
 assert.equal(current.chapters.find(c=>c.id===7).count,98);
 assert.equal(current.chapters.find(c=>c.id===8).count,97);
 assert.equal(current.chapters.find(c=>c.id===9).count,90);
 for(const q of current.questions){const prior=old.questions.find(v=>v.id===q.id),copy={...q,chapter:prior.chapter};if(moved.includes(q.id))delete copy.legacyChapters;assert.deepEqual(copy,prior,q.id);}
 assert.throws(()=>getPracticeCourse('network',{layout:99}),/版本/);
});

test('迁章前实际构建的合成备份恢复原题、草稿及首次成绩，纯归类不归档答案',()=>{
 assert.ok(fixture.tests.some(a=>a.questions.some(q=>moved.includes(q.id))));
 const restored=mergeBackup(empty(),fixture);assert.deepEqual(restored.tests,fixture.tests);
 assert.deepEqual(restored.practice.network.records,fixture.practice.network.records);
 assert.equal(restored.practice.network.archived,undefined);
 assert.equal(mergeBackup(restored,fixture).tests.length,2);assert.equal(totalPoints(restored.tests),0);
 const latest=composeChapterTest('network',4);assert.equal(latest.chapterLayout,PRACTICE_LAYOUT_VERSION);
 assert.ok(latest.questions.every(q=>q.chapter===4&&!moved.includes(q.id)));
});

test('新控制平面组题可保存恢复，旧4章直达链接仍找到同题，错误章节不放行',()=>{
 const paper=composeChapterPractice('network','control',{preset:'custom',custom:{choice:5,fill:0,code:0,judgement:0}});
 const a=startChapterTest('network',paper,1,'new-control');saveExamAnswer(a,a.questions[0].id,a.questions[0].answer,2);
 assert.equal(a.chapterLayout,2);assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[a]}).tests,[a]);
 const bank=getPracticeCourse('network').questions,q=bank.find(q=>q.id===moved[0]);
 for(const chapter of ['control',4])assert.equal(resolveRoute(`#/subjects/network/chapter/${chapter}/question/${q.id}`,bank).question,q.id);
 assert.equal(resolveRoute(`#/subjects/network/chapter/3/question/${q.id}`,bank).question,null);
 const physical=bank.find(q=>q.chapter==='physical');assert.equal(resolveRoute(`#/subjects/network/chapter/physical/question/${physical.id}`,bank).question,physical.id);
});

test('旧布局兼容只认确切快照，不放宽题干、章节、分值和未知版本校验',()=>{
 for(const mutate of [a=>a.questions[0].stem+=' altered',a=>a.questions[0].points++,a=>a.questions[0].chapter='control',a=>a.chapterLayout=99]){
  const bad=structuredClone(fixture);mutate(bad.tests[0]);assert.throws(()=>mergeBackup(empty(),bad));
 }
});

test('正号等价修正不重写旧结算成绩，旧未提交答卷采用本次评分版本',()=>{
 const p=composeChapterPractice('network','physical',{preset:'mixed'}),a=startChapterTest('network',p,1,'number-new');
 const q=a.questions.find(q=>q.type==='fill'&&q.formats.every(f=>f==='number')&&q.answers.every(v=>Number(v[0])>0));assert.ok(q);
 const answers=q.answers.map(v=>'+'+v[0]);assert.equal(grade(q,answers).correct,true);assert.equal(grade(q,answers,1).correct,false);
 saveExamAnswer(a,q.id,answers,2);submitExam(a,3);for(const item of a.questions.filter(q=>q.type==='short'))setMark(a,item.id,0);settleExam(a);
 assert.equal(a.gradingVersion,2);assert.equal(a.result.scores[q.id],q.points);
 const old=structuredClone(a);delete old.gradingVersion;old.id='number-old';old.marks[q.id]=0;old.result.scores[q.id]=0;old.result.total-=q.points;
 const restored=mergeBackup(empty(),{...empty(),tests:[old,a]});assert.deepEqual(restored.tests,[old,a]);
 const pending=structuredClone(old);pending.status='active';delete pending.result;delete pending.submittedAt;submitExam(pending,4);assert.equal(pending.gradingVersion,2);assert.equal(pending.marks[q.id],q.points);
 const bad=structuredClone(old);bad.gradingVersion=99;assert.throws(()=>mergeBackup(empty(),{...empty(),tests:[bad]}),/版本/);
});
