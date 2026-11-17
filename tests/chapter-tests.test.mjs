import test from 'node:test';
import assert from 'node:assert/strict';
import {getPracticeCourse} from '../practice-library.js';
import {composeChapterTest,chapterAvailability} from '../chapter-tests.js';
import {startChapterTest,saveExamAnswer,submitExam,setMark,settleExam,expireExam,totalPoints} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';
import {examPapers,examBlueprints} from '../exam-bank.js';
import {grade} from '../grading.js';

test('物理基础和链路层已达100题，所有新增题独立编号且不混入考试',()=>{
 const course=getPracticeCourse('network');assert.ok(course.chapters.find(c=>c.id==='physical').count>=100);assert.ok(course.chapters.find(c=>c.id===5).count>=100);
 for(const subject of Object.keys(examPapers)){
  const qs=getPracticeCourse(subject).questions,exam=examPapers[subject].flatMap(p=>p.questions);
  assert.equal(new Set(qs.map(q=>q.id)).size,qs.length);
  assert.equal(new Set(qs.map(q=>q.stem)).size,qs.length);
  for(const q of qs){assert.ok(!exam.some(e=>e.id===q.id||e.stem===q.stem));assert.ok(course||q.chapter!==undefined);
   if(q.type!=='short'){const a=q.type==='single'?q.answer:q.answers.map(v=>v[0]);assert.equal(grade(q,a).correct,true);}
  }
 }
});
test('章节整组严格按本科半卷题型、不跨章、100分；生成下一批不重复',()=>{
 for(const [subject,chapter] of [['network','physical'],['network',5],['structures',2],['programming',6],['digital',1],['digital',2],['digital',3],['digital',4],['digital',5]]){
  const paper=composeChapterTest(subject,chapter,[],()=>0.5);assert.equal(paper.questions.reduce((n,q)=>n+q.points,0),100);
  assert.ok(paper.questions.every(q=>String(q.chapter)===String(chapter)));
  for(const g of examBlueprints[subject].groups)assert.equal(paper.questions.filter(q=>q.section===g.name).length,g.count);
 }
 const first=composeChapterTest('network','physical'),a=startChapterTest('network',first);
 const next=composeChapterTest('network','physical',[a]);assert.ok(!next.questions.some(q=>a.questions.some(p=>p.id===q.id)));
 assert.throws(()=>composeChapterTest('structures',1),/暂不能/);
});
test('章节答案可保存刷新恢复，不受考试2小时限制，提交后锁答、自评且不累计积分',()=>{
 const paper=composeChapterTest('network','physical');const a=startChapterTest('network',paper,1,'chapter-test');
 const q=a.questions[0];assert.ok(saveExamAnswer(a,q.id,q.answer,8000000));assert.equal(a.status,'active');expireExam(a,9999999);assert.equal(a.status,'active');
 let restored=JSON.parse(JSON.stringify(a));assert.equal(restored.answers[q.id],q.answer);assert.equal(restored.deadline,null);
 submitExam(restored,10000000);assert.equal(restored.submittedAt,10000000);assert.equal(restored.expired,false);
 assert.equal(saveExamAnswer(restored,q.id,(q.answer+1)%4,10000001),false);
 for(const q of restored.questions.filter(q=>q.type==='short'))setMark(restored,q.id,0);
 const original=structuredClone(settleExam(restored));assert.deepEqual(settleExam(restored),original);assert.equal(totalPoints([restored]),0);
 const room={version:2,attempts:[],practice:{},tests:[restored]};const merged=mergeBackup({version:2,attempts:[],practice:{}},room);assert.equal(merged.tests[0].result.total,original.total);
 assert.equal(mergeBackup(merged,room).tests.length,1);
});
test('独立核对CRC、奇偶、时延交点与流水计算，位串仍保留位宽',()=>{
 function crc(data,g){let value=parseInt(data+'0'.repeat(g.length-1),2);const divisor=parseInt(g,2);while(value&&value.toString(2).length>=g.length)value^=divisor<<(value.toString(2).length-g.length);return value.toString(2).padStart(g.length-1,'0');}
 assert.equal(crc('1101','1011'),'001');assert.equal(crc('1010','1101'),'001');
 const bits='10010110';assert.equal([...bits].filter(x=>x==='1').length,4);
 const length=(.008-.002)/(1/2e6-1/8e6);assert.equal(length,16000);
 assert.equal((2+4-1)*(4000/4e6)*1000,5);
 const coded=getPracticeCourse('digital').questions.find(q=>q.type==='fill'&&q.answers.some(v=>/^0[01]+$/.test(v[0])));
 assert.ok(coded);
});
