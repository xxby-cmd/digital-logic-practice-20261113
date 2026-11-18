import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {visibleReadingQuestion,javaReadingNotes} from '../java-reading.js';
import {javaAlgorithmTaskGuides} from '../java-algorithm-task-guides.js';
import {getPracticeCourse} from '../practice-library.js';
import {fullExamPapers} from '../full-exams.js';
import {reviseQuestionLanguage} from '../question-language.js';
import {courseTermPlan} from '../term-planner.js';
import {termCatalogue,questionTermCandidates} from '../term-candidates.js';
import {auditReadingTerms} from '../scripts/audit-reading-terms.mjs';

const guideFor=(id,revision)=>javaAlgorithmTaskGuides[id]?.revision===revision?javaAlgorithmTaskGuides[id]:undefined;
const show=q=>visibleReadingQuestion(q,'java',guideFor(q.id,q.revision??1));
const cOnly=['concept:指针指向关系','concept:数组初始化规则','concept:元素类型与步长','concept:参数传递语义','concept:成员选择语义'];

test('Java阅读只复制公开题面，不改题目快照、参考答案或历史版本；未知适配仍保留原文',()=>{
 const original=getPracticeCourse('structures').questions,photo=JSON.stringify(original);
 for(const q of original.filter(q=>guideFor(q.id,q.revision??1))){const guide=guideFor(q.id,q.revision),visible=show(q);assert.notEqual(visible,q);assert.equal(visible.id,q.id);assert.equal(visible.revision,q.revision);assert.equal(visible.model,q.model);assert.equal(visible.stem,guide.publicStatement);assert.equal(visible.readingLanguage,'java');assert.equal(visibleReadingQuestion(q,'c',guide),q);assert.equal(visibleReadingQuestion(q,'java',{...guide,revision:99}),q);assert.equal(visibleReadingQuestion(q,'java',null),q);}
 assert.equal(JSON.stringify(original),photo);
});

test('Java候选不讲C指针、sizeof步长、C初始化或C形参规则；原C题仍保留C解释',()=>{
 const q={id:'language-probe',revision:1,stem:'编写int f(int *out)，对数组初始化，说明参数传递语义和成员选择语义。'};
 const c=questionTermCandidates('structures',q);assert.ok(c.some(c=>cOnly.includes(c.entry.id)));assert.ok(c.every(c=>!c.entry.id.startsWith('java:')));
 const java={...q,readingLanguage:'java',stem:'实现public static int[] f(int[] a)。输入可为null，返回一个新数组；分析数组引用。'};
 const candidates=questionTermCandidates('structures',java);assert.ok(candidates.length>=2);assert.ok(candidates.every(c=>!cOnly.includes(c.entry.id)));assert.ok(candidates.some(c=>c.entry.id==='java:array-reference'));assert.ok(candidates.some(c=>c.entry.id==='java:null'));
});

test('首13Java可见题面在整科、混合语言和已了解词场景均两词且不超5%，不从solution抽词',async()=>{
 let references={};try{references=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已接入题目.json',import.meta.url),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 const questions=[...getPracticeCourse('structures').questions,...(references.structures||[]).map(reviseQuestionLanguage),...fullExamPapers.structures.flatMap(p=>p.questions)],original=JSON.stringify(questions),adapted=questions.filter(q=>show(q)!==q);assert.equal(adapted.length,13);
 for(const mix of [q=>q,q=>show(q),(q,i)=>i%2?show(q):q,(q,i)=>i%2?q:show(q)]){
  const visible=questions.map(mix),known=Object.fromEntries(javaReadingNotes.map(e=>['structures:'+e.id,true]));
  for(const preferences of [{},known]){const plan=courseTermPlan('structures',visible,preferences);assert.ok(plan.complete);assert.ok([...plan.usage.values()].every(n=>n<=plan.limit));for(const q of visible){const terms=plan.byQuestion.get(q.id);assert.equal(terms.length,2);if(q.readingLanguage==='java')assert.ok(terms.every(e=>!cOnly.includes(e.id)));}}
 }
 const sample=show(adapted[0]),base=questionTermCandidates('structures',sample).map(c=>c.entry.id);assert.deepEqual(questionTermCandidates('structures',{...sample,model:'头指针 malloc free C17 sizeof 特殊后台名词'}).map(c=>c.entry.id),base);assert.equal(JSON.stringify(questions),original);
 const report=auditReadingTerms(references,{javaGuideFor:guideFor});assert.equal(report.length,4);assert.equal(report.find(r=>r.subject==='structures').javaVariant.adapted,13);
});

test('Java新词三字段提前保存，可见题面外的语言词不全库兜底，缓存按语言语境区分',()=>{
 for(const e of javaReadingNotes)for(const field of ['definition','purpose','example'])assert.ok(e[field].length>=6,e.id+field);
 assert.ok(javaReadingNotes.every(e=>termCatalogue('structures').some(t=>t.id===e.id)));
 assert.equal(questionTermCandidates('structures',{id:'unrelated',readingLanguage:'java',stem:'请作答。'}).length,0);
 const qs=Array.from({length:40},(_,i)=>({id:'language-'+i,stem:'实现public static int f(int n)，说明参数传递语义。'})),c=courseTermPlan('structures',qs),java=courseTermPlan('structures',qs.map(q=>({...q,readingLanguage:'java'})));assert.notEqual(java,c);
});
