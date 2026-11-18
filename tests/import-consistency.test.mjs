import test from 'node:test';
import assert from 'node:assert/strict';
import {fullExamPapers} from '../full-exams.js';
import {composeChapterPractice} from '../chapter-practice.js';
import {getPracticeCourse} from '../practice-library.js';
import {routeFor,resolveRoute} from '../subjects.js';
import {startExam,startChapterTest,submitExam,saveExamAnswer,settleExam,applyCodeResult,pendingCodeQuestions} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';
const empty=()=>({version:2,attempts:[],practice:{}}),withExam=a=>({...empty(),attempts:[a]});

test('新快照不能通过删除judge变成自评，旧快照模式独立于新评分规则保留',()=>{
 const modern=startExam('programming',fullExamPapers.programming[0],1,'modern-flags'),q=modern.questions.find(q=>q.judge);delete q.judge;
 assert.throws(()=>mergeBackup(empty(),withExam(modern)),/试卷版本/);
 const old=structuredClone(modern);delete old.gradingVersion;delete old.questionSnapshotVersion;
 const restored=mergeBackup(empty(),withExam(old)).attempts[0];submitExam(restored,2);
 assert.equal(restored.gradingVersion,2);assert.equal(restored.questionSnapshotVersion,1);
 assert.doesNotThrow(()=>mergeBackup(empty(),withExam(restored)));
});

test('待结算备份的客观分数从锁定作答重算，结算后可再次恢复',()=>{
 const a=startExam('network',fullExamPapers.network[0],1,'marks');const q=a.questions.find(q=>q.type==='single');
 saveExamAnswer(a,q.id,(q.answer+1)%q.options.length,2);submitExam(a,3);a.marks[q.id]=q.points;
 const restored=mergeBackup(empty(),withExam(a)).attempts[0];assert.equal(restored.marks[q.id],0);settleExam(restored);
 assert.equal(restored.result.scores[q.id],0);assert.doesNotThrow(()=>mergeBackup(empty(),withExam(restored)));
});

test('自动判题成绩必须与marks和判题终态一致，缺判题证据会恢复为待判',()=>{
 const a=startExam('programming',fullExamPapers.programming[0],1,'code-evidence'),q=a.questions.find(q=>q.judge);
 saveExamAnswer(a,q.id,'invalid C',2);submitExam(a,3);applyCodeResult(a,q.id,'invalid C',{status:'compile_error'});settleExam(a);
 const bad=structuredClone(a);bad.result.scores[q.id]=q.points;bad.result.total+=q.points;
 assert.throws(()=>mergeBackup(empty(),withExam(bad)),/判题记录/);bad.marks[q.id]=q.points;assert.throws(()=>mergeBackup(empty(),withExam(bad)),/判题记录/);
 const pending=structuredClone(a);pending.status='marking';pending.result=null;delete pending.judgements[q.id];pending.marks[q.id]=q.points;
 const restored=mergeBackup(empty(),withExam(pending)).attempts[0];assert.equal(restored.marks[q.id],undefined);assert.equal(pendingCodeQuestions(restored).length,1);assert.throws(()=>settleExam(restored),/判题/);
});

test('旧已提交答卷保留旧评分，旧未提交答卷提交时使用现行评分',()=>{
 const paper=composeChapterPractice('network','physical',{preset:'mixed'}),a=startChapterTest('network',paper,1,'old-number');
 const q=a.questions.find(q=>q.type==='fill'&&q.formats.every(f=>f==='number')&&q.answers.every(v=>Number(v[0])>0));assert.ok(q);
 saveExamAnswer(a,q.id,q.answers.map(v=>'+'+v[0]),2);submitExam(a,3);delete a.gradingVersion;delete a.questionSnapshotVersion;a.marks[q.id]=0;
 const old=mergeBackup(empty(),{...empty(),tests:[a]}).tests[0];settleExam(old);assert.equal(old.result.scores[q.id],0);assert.doesNotThrow(()=>mergeBackup(empty(),{...empty(),tests:[old]}));
 const active=structuredClone(a);active.status='active';submitExam(active,4);assert.equal(active.gradingVersion,2);assert.equal(active.marks[q.id],q.points);
});

test('当前章节目录中的字符串和数字章节均可往返路由',()=>{
 const bank=getPracticeCourse('network').questions;
 for(const chapter of ['control','physical',4,7,8,9])for(const view of ['practice','wrong','favorites','records']){
  const state={subject:'network',view,chapter,question:null};assert.deepEqual(resolveRoute('#'+routeFor(state),bank),state);
 }
});
