import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {cFilesPractice} from '../bank-c-files.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade,normalize} from '../grading.js';
import {isProgrammingQuestion} from '../code-editor.js';
import {cFileCodingIds} from '../c-file-availability.js';
import {composeChapterPractice} from '../chapter-practice.js';
import {composeChapterTest} from '../chapter-tests.js';
const bank=cFilesPractice.programming.filter(q=>q.type==='single'),hash=s=>createHash('sha256').update(s).digest('hex');

test('文件章60原创选择不误出代码编辑器，完整程序阅读与语义题分别核验',()=>{
 assert.equal(bank.length,60);assert.equal(new Set(bank.map(q=>q.id)).size,60);assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,60);
 assert.equal(bank.filter(q=>q.trace).length,41);assert.deepEqual(['basic','core','supplement'].map(s=>bank.filter(q=>q.studyLevel===s).length),[15,36,9]);
 const other=getPracticeCourse('programming').questions.filter(q=>!bank.some(n=>n.id===q.id));
 for(const q of bank){
  assert.equal(q.chapter,11);assert.equal(q.type,'single');assert.equal(q.origin,'原创');assert.equal(q.pool,'practice');
  assert.equal(q.coding,false);assert.equal(isProgrammingQuestion(q),false);assert.equal(q.judge,undefined);
  assert.ok(q.mechanism);assert.ok(q.studyEvidence.includes('课件历史章号'));assert.equal(q.studyWeight,{basic:2,core:3,supplement:1}[q.studyLevel]);
  assert.equal(new Set(q.options).size,4);for(let i=0;i<4;i++)assert.equal(grade(q,i).correct,i===q.answer);
  assert.ok(!other.some(v=>normalize(v.stem)===normalize(q.stem)),q.id);assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(q.stem+q.explanation+q.options.join('')),q.id);
 }
});

test('当前41程序的题面及源码匹配真实文件运行，S024旧失败与修正后通过分开',async t=>{
 const folder=new URL('../../制作记录/并行扩题/C文件/',import.meta.url);let reports;
 try{reports=await Promise.all(['选择题真实文件核验.json','选择题定向回归.json'].map(async n=>JSON.parse(await readFile(new URL(n,folder),'utf8'))));}
 catch(e){if(e.code!=='ENOENT')throw e;t.skip('真实编译证据仅在本地制作记录保留');return;}
 const runs=reports.flatMap(r=>r.results);
 for(const q of bank.filter(q=>q.trace)){
  const source=q.stem.match(/```c\n([\s\S]*?)\n```/)[1],r=runs.findLast(r=>r.id===q.id&&r.questionSha256===hash(JSON.stringify(q))&&r.sourceSha256===hash(source)&&r.passed);
  assert.ok(r,q.id);assert.equal(r.compilerExitCode,0);assert.equal(r.childExitCode,0);assert.equal(r.status,'ran');
  if(q.fileExample.kind==='redirect'){assert.equal(r.stdout,'');assert.equal(r.stderr,'done');assert.equal(r.files['out.txt'],'4f4b');}else assert.equal(r.stdout,q.options[q.answer]);
 }
 assert.ok(runs.some(r=>r.id==='C6L-programming-11-S-024'&&!r.passed));assert.ok(runs.some(r=>r.id==='C6L-programming-11-S-024'&&r.passed));
});

test('正式题池只收核准的文件代码，可抽20题100分，草稿不被被动接入',()=>{
 const qs=getPracticeCourse('programming').questions.filter(q=>q.chapter===11);
 assert.equal(qs.filter(q=>q.type==='single').length,60);assert.deepEqual(new Set(qs.filter(q=>q.coding).map(q=>q.id)),new Set(cFileCodingIds));
 assert.ok(qs.filter(q=>q.coding).every(q=>q.judge));
 const p=composeChapterPractice('programming',11);assert.equal(p.questions.length,20);assert.equal(p.questions.reduce((n,q)=>n+q.points,0),100);
 if(cFileCodingIds.length<40)assert.throws(()=>composeChapterTest('programming',11),/本章暂不能/);
});
