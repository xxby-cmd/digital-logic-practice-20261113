import test from 'node:test';
import assert from 'node:assert/strict';
import {startExam,submitExam,saveExamAnswer,setMark,settleExam,pendingCodeQuestions,applyCodeResult,EXAM_DURATION} from '../sessions.js';
import {fullExamPapers} from '../full-exams.js';
import {mergeBackup,reconcilePracticeRecords} from '../room-progress.js';
import {composeChapterTest} from '../chapter-tests.js';
import {startChapterTest} from '../sessions.js';
const room=a=>({version:2,attempts:[a],practice:{}});
test('代码交卷锁定作答，服务失败不计零分，判题完成后首次成绩不可修改',()=>{
 const a=startExam('programming',fullExamPapers.programming[0],1000,'code');const q=a.questions.find(q=>q.judge);
 saveExamAnswer(a,q.id,'int longest(const int a[],int n){return 0;}',1001);submitExam(a,1002);
 assert.equal(pendingCodeQuestions(a).length,1);assert.equal(saveExamAnswer(a,q.id,'new',1003),false);
 assert.equal(setMark(a,q.id,q.points),false);assert.throws(()=>settleExam(a),/判题/);
 assert.equal(applyCodeResult(a,q.id,'stale',{status:'accepted'}),false);
 assert.equal(applyCodeResult(a,q.id,a.answers[q.id],{status:'unavailable'}),false);assert.equal(a.marks[q.id],undefined);
 assert.equal(applyCodeResult(a,q.id,a.answers[q.id],{status:'accepted',passed:12,total:12}),true);
 assert.equal(a.marks[q.id],q.points);assert.equal(pendingCodeQuestions(a).length,0);
 settleExam(a);const snapshot=JSON.stringify(a.result);
 assert.equal(applyCodeResult(a,q.id,a.answers[q.id],{status:'wrong_answer'}),false);assert.equal(setMark(a,q.id,0),false);
 assert.equal(JSON.stringify(settleExam(a)),snapshot);
});
test('过期代码答卷保持原截止时间，编译错误记零；空代码不请求判题',()=>{
 const a=startExam('structures',fullExamPapers.structures[0],1000,'expiry');const qs=a.questions.filter(q=>q.judge);
 saveExamAnswer(a,qs[0].id,'invalid source',1001);submitExam(a,1000+EXAM_DURATION+20);
 assert.equal(a.expired,true);assert.equal(a.submittedAt,1000+EXAM_DURATION);
 assert.equal(a.marks[qs[1].id],0);assert.equal(pendingCodeQuestions(a).length,1);
 applyCodeResult(a,qs[0].id,a.answers[qs[0].id],{status:'compile_error'});assert.equal(a.marks[qs[0].id],0);
});
test('完整卷备份支持每空给分、判题状态与旧版自评快照恢复',()=>{
 const p=fullExamPapers.network[0],a=startExam('network',p,1000,'full-backup');
 for(const q of a.questions)saveExamAnswer(a,q.id,q.type==='single'?q.answer:q.type==='fill'?q.answers.map((v,i)=>i===1?'wrong':v[0]):'answer',1001);
 submitExam(a,1002);for(const q of a.questions.filter(q=>q.type==='short'))setMark(a,q.id,q.points);settleExam(a);
 const restored=mergeBackup({version:2,attempts:[],practice:{}},room(a));assert.equal(restored.attempts[0].result.total,99);
 const coding=startExam('programming',fullExamPapers.programming[0],1000,'old-c');for(const q of coding.questions)delete q.judge;
 const old=mergeBackup({version:2,attempts:[],practice:{}},room(coding));assert.ok(old.attempts[0].questions.every(q=>!q.judge));
 const modern=startExam('programming',fullExamPapers.programming[0],1000,'modern');const q=modern.questions.find(q=>q.judge);saveExamAnswer(modern,q.id,'code',1001);submitExam(modern,1002);
 assert.equal(pendingCodeQuestions(mergeBackup({version:2,attempts:[],practice:{}},room(modern)).attempts[0]).length,1);
});
test('旧章节答卷缺少新增编辑器和抽题元数据仍可恢复，题面被改则拒绝',()=>{
 const a=startChapterTest('network',composeChapterTest('network',1),1000,'old-chapter');
 for(const q of a.questions){delete q.coding;delete q.practiceWeight;delete q.judge;}
 const input={version:2,attempts:[],practice:{},tests:[a]};
 const restored=mergeBackup({version:2,attempts:[],practice:{}},input);assert.equal(restored.tests[0].id,'old-chapter');
 input.tests[0].questions[0].stem='changed';assert.throws(()=>mergeBackup({version:2,attempts:[],practice:{}},input),/题目内容/);
});
test('新版练习室直接加载也会归档旧题面作答，不覆盖原答案',()=>{
 const answer={answer:'old answer',revision:1,submitted:true,status:'correct'};
 const data={practice:{digital:{seen:['q'],current:'q',records:{q:answer}}}};
 reconcilePracticeRecords(data,()=>[{id:'q',revision:2}]);
 assert.equal(data.practice.digital.records.q,undefined);assert.equal(data.practice.digital.archived['q@1'],answer);assert.deepEqual(data.practice.digital.seen,[]);
 reconcilePracticeRecords(data,()=>[{id:'q',revision:2}]);assert.equal(data.practice.digital.archived['q@1'],answer);
});
