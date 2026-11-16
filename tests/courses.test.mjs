import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
import {getCourse,progressKey} from '../course-banks.js';
import {resolveRoute,routeFor} from '../subjects.js';
import {grade} from '../grading.js';
import {emptyProgress,sanitizeImportedProgress,sanitizeProgress} from '../progress.js';

test('三科九题可按真实章节号直达，科目与章节不能串题',()=>{
 for(const subject of ['network','structures','programming']){
  const course=getCourse(subject);assert.equal(course.questions.length,3);
  assert.equal(new Set(course.questions.map(q=>q.id)).size,3);
  for(const q of course.questions){
   assert.ok(course.chapters.some(c=>c.id===q.chapter));
   const state={subject,view:'practice',chapter:q.chapter,question:q.id};
   assert.deepEqual(resolveRoute('#'+routeFor(state)),state);
   assert.ok(q.stem&&q.source&&q.explanation);
   if(q.type!=='short')assert.equal(grade(q,q.type==='single'?q.answer:q.answers.map(a=>a[0])).correct,true);
   else assert.ok(q.model&&q.rubric.length>=3);
  }
 }
 assert.equal(resolveRoute('#/subjects/network/chapter/6/question/6-01').subject,null);
 assert.equal(resolveRoute('#/subjects/structures/practice/chapter/6').chapter,6);
 assert.equal(resolveRoute('#/subjects/programming').chapter,6);
});

test('同题号的跨科目备份被拒绝，旧数电备份仍兼容',()=>{
 const progress={...emptyProgress(),subject:'network'};
 progress.records['1-01']={answer:2,status:'correct',revision:1,attempts:1};
 assert.equal(sanitizeImportedProgress(progress,'network',getCourse('network').questions).records['1-01'].status,'correct');
 assert.throws(()=>sanitizeImportedProgress(progress,'digital',getCourse('digital').questions));
 assert.throws(()=>sanitizeImportedProgress(emptyProgress(),'network',getCourse('network').questions));
 assert.deepEqual(sanitizeImportedProgress(emptyProgress(),'digital',getCourse('digital').questions),emptyProgress());
 assert.equal(progressKey('digital'),'digital-logic-practice-v1');
 assert.equal(new Set(['digital','network','structures','programming'].map(progressKey)).size,4);
});

test('第六章等新章节的旧版本作答可以归档并再次读取',()=>{
 const course=getCourse('structures');const original=emptyProgress();
 original.records['6-01']={answer:['2','4'],status:'correct',revision:2,attempts:1};
 const next=course.questions.map(q=>q.id==='6-01'?{...q,revision:3}:q);
 const progress=sanitizeProgress(original,next);
 assert.ok(progress.archived['6-01@2']);
 assert.deepEqual(sanitizeProgress(progress,next),progress);
});

test('独立核对九题中的状态轨迹、时间线及程序补全边界',()=>{
 assert.equal(200000/2e8+8000/1e8,0.00108);
 const frames=8000/2e6;assert.equal(Math.ceil((frames+2*0.01)/frames),6);
 const list=[10,20,30,40];let moves=0;
 for(const [position,value]of [[2,50],[4,60]]){moves+=list.length-position+1;list.splice(position-1,0,value);}
 assert.equal(moves,5);assert.deepEqual(list,[10,50,20,60,30,40]);
 const array=[2,4,0,0,0];assert.equal(array.reduce((s,v,i)=>s+(v||i),0),15);
 for(const values of [[3,-1,3,0,-1],[0],[-3,-3,-3],Array.from({length:1000},(_,i)=>i)]){
  const result=[];let m=0;
  for(let i=0;i<values.length;i++){let j;for(j=0;j<m;j++)if(result[j]===values[i])break;if(j===m)result[m++]=values[i];}
  assert.deepEqual(result,[...new Set(values)]);
 }
});
