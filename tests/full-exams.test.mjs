import test from 'node:test';
import assert from 'node:assert/strict';
import {fullExamPapers,fullExamBlueprints} from '../full-exams.js';
import {getPracticeCourse} from '../practice-library.js';
import {startExam,submitExam,drawPractice} from '../sessions.js';
import {codeEditor,isProgrammingQuestion} from '../code-editor.js';

test('完整卷题型题量总分按核验模板，考试专用题不进入练习',()=>{
 const expected={network:[15,9,5,5],structures:[10,9,6,5,2],digital:[5,3,3],programming:[20,5,10]};
 for(const [subject,papers]of Object.entries(fullExamPapers)){
  assert.equal(papers.length,1);const p=papers[0],groups=fullExamBlueprints[subject].groups;
  assert.deepEqual(groups.map(g=>p.questions.filter(q=>q.section===g.name).length),expected[subject]);
  assert.equal(p.questions.reduce((s,q)=>s+q.points,0),100);
  const practice=getPracticeCourse(subject).questions;assert.ok(p.questions.every(q=>q.pool==='exam'&&!practice.some(a=>a.id===q.id)));
  for(const g of groups)assert.equal(p.questions.filter(q=>q.section===g.name).reduce((s,q)=>s+q.points,0),g.points);
 }
 assert.deepEqual(fullExamPapers.digital[0].questions.map(q=>q.points),[6,8,8,8,6,8,12,12,12,8,12]);
 const fills=fullExamPapers.network[0].questions.filter(q=>q.type==='fill');assert.equal(fills.reduce((s,q)=>s+q.answers.length,0),10);
});
test('计网填空每空1分，空一部分仍保留其他正确空分',()=>{
 const p=fullExamPapers.network[0],a=startExam('network',p,1,'full-test'),q=a.questions.find(q=>q.type==='fill'&&q.answers.length===2);
 a.answers[q.id]=[q.answers[0][0],''];submitExam(a,2);assert.equal(a.marks[q.id],1);
});
test('数电完整卷的状态方程、译码、序列检测与占空比独立核验',()=>{
 let state=0;const trace=[];for(let i=0;i<5;i++){trace.push(state);state=((state&1)<<1)|((state&2)?0:1);}assert.deepEqual(trace,[0,1,3,2,0]);
 let s=0;const output=[];for(const x of [1,1,1,0,1,1,0]){const q1=s>>1,q0=s&1;output.push(Number(!!q1&&!q0&&!x));s=(Number(!!x&&!!(q1||q0))<<1)|Number(!!x&&!q1&&!q0);}assert.deepEqual(output,[0,0,0,1,0,0,1]);
 const cycle=[4,5,6,7,8,9];assert.equal(cycle.filter(x=>x&8).length/cycle.length,1/3);
 for(let x=0;x<10;x++){const abc=x>>1,d=x&1,inputs=[0,d,0,1-d,d,0,0,0];assert.equal(inputs[abc],Number([3,6,9].includes(x)));}
});
test('代码题统一编辑区，考试作答阶段无运行和答案入口',()=>{
 for(const section of ['编程题','程序填空','算法设计'])assert.ok(isProgrammingQuestion({section}));
 const q={id:'safe',section:'编程题'};const exam=codeEditor(q,'<script>','x',false,false);assert.ok(exam.includes('data-code-source'));assert.ok(exam.includes('&lt;script&gt;'));assert.ok(!exam.includes('data-code-run'));assert.ok(codeEditor(q,'','x',false,true).includes('data-code-run'));
});
test('重点加权抽取且不重复，定向练习仍能抽尽',()=>{
 const qs=[{id:'core',practiceWeight:3},{id:'extra',practiceWeight:1}];assert.equal(drawPractice(qs,[],()=>0.7).id,'core');assert.equal(drawPractice(qs,[],()=>0.8).id,'extra');assert.equal(drawPractice(qs,['core'],()=>0).id,'extra');assert.equal(drawPractice(qs,['core','extra']),null);
 // This assertion retains the historical language-normalization version;
 // the typed-fill and number-representation suites lock its new default 3.
 const q=getPracticeCourse('digital',{questionRevisions:{'P4-digital-1-R-001':2}}).questions.find(q=>q.id==='P4-digital-1-R-001');assert.equal(q.revision,2);assert.ok(q.stem.startsWith('将二进制数'));
});
