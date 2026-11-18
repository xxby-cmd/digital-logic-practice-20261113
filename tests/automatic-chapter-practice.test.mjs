import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {composeChapterPractice,validateChapterPracticeSnapshot,DEFAULT_CHAPTER_PRACTICE_TOTAL} from '../chapter-practice.js';
import {getPracticeCourse} from '../practice-library.js';
import {isProgrammingQuestion} from '../code-editor.js';
import {startChapterTest,saveExamAnswer,submitExam,setMark,settleExam,totalPoints} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';

test('四科可用章节默认20道、100分、不跨章不重复，同题型连续且保留各原生题型',()=>{
 assert.equal(DEFAULT_CHAPTER_PRACTICE_TOTAL,20);
 for(const subject of ['network','structures','digital','programming'])for(const chapter of getPracticeCourse(subject).chapters){
  if(chapter.count<20){assert.throws(()=>composeChapterPractice(subject,chapter.id),/不足20道/);continue;}
  const paper=composeChapterPractice(subject,chapter.id,undefined,[],()=>.37);
  assert.equal(paper.questions.length,20);assert.equal(paper.questions.reduce((s,q)=>s+q.points,0),100);
  assert.equal(new Set(paper.questions.map(q=>q.id)).size,20);assert.ok(paper.questions.every(q=>String(q.chapter)===String(chapter.id)));
  const blocks=paper.questions.map(q=>q.section).filter((v,i,a)=>i===0||v!==a[i-1]);
  assert.equal(blocks.length,new Set(blocks).size);assert.equal(validateChapterPracticeSnapshot({...paper,subject}),true);
 }
 const c=composeChapterPractice('programming',3,undefined,[],()=>.6);
 assert.ok(c.questions.some(q=>q.section==='程序填空题'));assert.ok(c.questions.filter(q=>q.section==='程序填空题').every(isProgrammingQuestion));
});

test('题型数目由抽取结果决定，优先未练题，库存未练不足时仅跨批复习不在本组重复',()=>{
 const first=composeChapterPractice('structures',1,undefined,[],()=>.01);
 const second=composeChapterPractice('structures',1,{preset:'auto'},[],()=>.99);
 assert.notDeepEqual(first.practicePlan.counts,second.practicePlan.counts);
 const previous=[],seen=new Set();
 for(let i=0;i<4;i++){
  const paper=composeChapterPractice('structures',1,undefined,previous,()=>.5);
  for(const q of paper.questions){assert.ok(!seen.has(q.id));seen.add(q.id);}
  previous.push(startChapterTest('structures',paper,i,`auto-${i}`));
 }
 const paper=composeChapterPractice('structures',1,undefined,previous,()=>.5);
 assert.equal(paper.questions.length,20);assert.equal(new Set(paper.questions.map(q=>q.id)).size,20);
});

test('自动练习草稿和首次成绩可恢复，提交后再核对，不计考试积分；破坏快照被拒绝',()=>{
 const paper=composeChapterPractice('structures',3),a=startChapterTest('structures',paper,1,'automatic-restore');
 const q=a.questions[0];saveExamAnswer(a,q.id,q.type==='single'?q.answer:q.type==='fill'?q.answers.map(v=>v[0]):'我的作答',2);
 const room={version:2,attempts:[],practice:{},tests:[a]},restored=mergeBackup({version:2,attempts:[],practice:{}},room).tests[0];
 assert.deepEqual(restored.answers,a.answers);assert.equal(restored.practicePlan.mode,'auto');assert.equal(restored.deadline,null);
 submitExam(restored,3);assert.equal(saveExamAnswer(restored,q.id,'change',4),false);
 for(const item of restored.questions.filter(q=>q.type==='short'&&!q.judge))setMark(restored,item.id,0);
 assert.equal(settleExam(restored).total>=0,true);assert.equal(totalPoints([restored]),0);
 const back=mergeBackup({version:2,attempts:[],practice:{}},{version:2,attempts:[],practice:{},tests:[restored]});assert.equal(back.tests[0].result.total,restored.result.total);
 const changed=structuredClone(a);changed.practicePlan.total=19;assert.throws(()=>validateChapterPracticeSnapshot(changed),/数量/);
});

test('网站章节开始入口直接生成20题，刷新恢复原批次，旧自定义入口仍可使用',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),nodes=new Map(),events=new Map(),storage=new Map();
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',dataset:{},addEventListener(name,fn){this[name]=fn;},setAttribute(){}});return nodes.get(selector);};
 const location={hash:'#/subjects/network'},context=createContext({document:{title:'',querySelector:node,querySelectorAll:()=>[]},window:{addEventListener:(name,fn)=>events.set(name,fn)},location,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
 assert.match(node('#app').innerHTML,/#\/subjects\/network\/chapter-start\/2/);assert.match(node('#app').innerHTML,/自定义组题/);
 location.hash='#/subjects/network/chapter-start/2';events.get('hashchange')();events.get('hashchange')();
 const key='course-practice-room-v2',room=JSON.parse(storage.get(key));assert.equal(room.tests.length,1);assert.equal(room.tests[0].questions.length,20);
 assert.match(location.hash,/\/test\//);assert.equal((node('#app').innerHTML.match(/class="card exam-question"/g)||[]).length,20);
 assert.ok(!node('#app').innerHTML.includes('快捷选择'));assert.ok(!node('#app').innerHTML.includes('参考答案与解析'));assert.ok(!node('#app').innerHTML.includes('知识点'));
 assert.match(node('#app').innerHTML,/question-type-heading/);events.get('hashchange')();assert.equal(JSON.parse(storage.get(key)).tests.length,1);
 location.hash='#/subjects/network/chapter-start/2';events.get('hashchange')();assert.equal(JSON.parse(storage.get(key)).tests.length,1);
});
