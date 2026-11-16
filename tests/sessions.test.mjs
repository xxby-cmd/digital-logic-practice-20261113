import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAM_DURATION,startExam,submitExam,expireExam,saveExamAnswer,setMark,settleExam,totalPoints,nextPaper,drawPractice} from '../sessions.js';
import {examPapers,examBlueprints} from '../exam-bank.js';
import {practiceExtra} from '../practice-extra.js';
import {getCourse} from '../course-banks.js';

test('八批试卷题型题量与半卷约定一致，满分均100，练习考试严格隔离',()=>{
 const allIds=new Set(),stems=new Set();let total=0;
 for(const [subject,papers] of Object.entries(examPapers)){
  assert.equal(papers.length,2);
  const practice=[...getCourse(subject).questions,...(practiceExtra[subject]||[])];
  for(const paper of papers){
   assert.equal(paper.questions.reduce((s,q)=>s+q.points,0),100);
   for(const g of examBlueprints[subject].groups)assert.equal(paper.questions.filter(q=>q.section===g.name).length,g.count);
   for(const q of paper.questions){
    assert.ok(!allIds.has(q.id));allIds.add(q.id);assert.ok(!stems.has(q.stem));stems.add(q.stem);
    assert.ok(!practice.some(p=>p.id===q.id||p.stem===q.stem));
    assert.ok(q.stem&&q.points>0&&q.pool==='exam');
    if(q.type==='short')assert.ok(q.model&&q.rubric.length>=2);
    else if(q.type==='single')assert.ok(q.answer>=0&&q.answer<q.options.length);
    else assert.ok(q.answers.every(a=>a.length&&a[0]!==''));
    total++;
   }
  }
 }
 assert.equal(total,134);
});

test('刷新和离线跨过截止时间，迟到的输入不能进入答卷',()=>{
 const a=startExam('network',examPapers.network[0],1000,'test');
 assert.equal(a.deadline-a.startedAt,EXAM_DURATION);
 const q=a.questions[0];assert.ok(saveExamAnswer(a,q.id,2,a.deadline-1));
 const reloaded=JSON.parse(JSON.stringify(a));
 assert.equal(saveExamAnswer(reloaded,q.id,1,a.deadline),false);
 assert.equal(reloaded.answers[q.id],2);assert.equal(reloaded.status,'marking');assert.equal(reloaded.expired,true);
 assert.equal(saveExamAnswer(reloaded,q.id,0,a.deadline+500),false);
 const submitted=reloaded.submittedAt;expireExam(reloaded,a.deadline+10000);assert.equal(reloaded.submittedAt,submitted);
});

test('未作答不被当作选项A，主观自评在首次结算前完成，之后分数固定',()=>{
 const paper=examPapers.programming[0],a=startExam('programming',paper,1,'score');
 const objective=a.questions.find(q=>q.type==='single');
 const manual=a.questions.find(q=>q.type==='short');
 saveExamAnswer(a,manual.id,'我的代码',2);submitExam(a,3);
 assert.equal(a.marks[objective.id],0);
 assert.throws(()=>settleExam(a));
 for(const bad of [-1,manual.points+1,0.5,'NaN',''])assert.equal(setMark(a,manual.id,bad),false);
 assert.equal(setMark(a,objective.id,objective.points),false);
 assert.equal(setMark(a,manual.id,manual.points),true);
 const first=structuredClone(settleExam(a));
 assert.equal(first.total,manual.points);
 assert.equal(setMark(a,manual.id,0),false);
 assert.equal(saveExamAnswer(a,manual.id,'改答案',4),false);
 assert.deepEqual(settleExam(a),first);assert.equal(totalPoints([a]),manual.points);
 // 序列化、重开和重复点击都复用首次结算，不重复累计。
 assert.deepEqual(settleExam(JSON.parse(JSON.stringify(a))),first);
});

test('全卷独立给定答案可得100，下一批不重复，题库用完明确返回空',()=>{
 const attempts=[];
 for(const paper of examPapers.structures){
  assert.equal(nextPaper(examPapers.structures,attempts,'structures').id,paper.id);
  const a=startExam('structures',paper,1,paper.id);
  for(const q of a.questions)saveExamAnswer(a,q.id,q.type==='single'?q.answer:q.type==='fill'?q.answers.map(v=>v[0]):'已完成的过程',2);
  submitExam(a,3);
  for(const q of a.questions.filter(q=>q.type==='short'))setMark(a,q.id,q.points);
  assert.equal(settleExam(a).total,100);attempts.push(a);
 }
 assert.equal(totalPoints(attempts,'structures'),200);assert.equal(totalPoints(attempts,'network'),0);
 assert.equal(nextPaper(examPapers.structures,attempts,'structures'),null);
 const seen=[],bank=getCourse('structures').questions;
 for(let i=0;i<bank.length;i++){const q=drawPractice(bank,seen,()=>0);assert.ok(q&&!seen.includes(q.id));seen.push(q.id);}
 assert.equal(drawPractice(bank,seen),null);
});

test('独立推导网络分片、存储转发、堆调整、哈夫曼和数电状态',()=>{
 const payload=2420-20,max=Math.floor((1000-20)/8)*8;
 const sizes=[max,max,payload-2*max];assert.deepEqual(sizes,[976,976,448]);
 assert.deepEqual(sizes.map((_,i)=>sizes.slice(0,i).reduce((s,v)=>s+v,0)/8),[0,122,244]);
 const tx1=2000*8/1e7*1000,tx2=2000*8/5e6*1000;
 assert.equal(tx1+1+tx2+2,7.800000000000001);
 assert.equal(Math.max(2*tx1+1,tx1+1+tx2)+tx2+2,11);
 const heap=[9,4,7,1,6,3];function sift(i,n){while(2*i+1<n){let j=2*i+1;if(j+1<n&&heap[j+1]<heap[j])j++;if(heap[i]<=heap[j])break;[heap[i],heap[j]]=[heap[j],heap[i]];i=j;}}
 for(let i=2;i>=0;i--)sift(i,heap.length);assert.deepEqual(heap,[1,4,3,9,6,7]);heap[0]=heap.pop();sift(0,heap.length);assert.deepEqual(heap,[3,4,7,9,6]);
 let weights=[2,3,7,9,14],wpl=0;while(weights.length>1){weights.sort((a,b)=>a-b);const sum=weights.shift()+weights.shift();wpl+=sum;weights.push(sum);}assert.equal(wpl,73);
 let q1=0,q0=1;const states=[];for(const x of [0,1,1,0]){[q1,q0]=[q0,q1^x];states.push(`${q1}${q0}`);}assert.deepEqual(states,['10','00','01','10']);
 for(let a=0;a<4;a++)for(let b=0;b<4;b++){const A1=a>>1,A0=a&1,B1=b>>1,B0=b&1;assert.equal(Boolean(A1&&!B1||A1===B1&&A0&&!B0),a>b);}
});
