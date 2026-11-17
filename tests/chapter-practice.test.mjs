import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {chapterPracticeCounts,composeChapterPractice,chapterPracticeStock,validateChapterPracticeSnapshot} from '../chapter-practice.js';
import {getPracticeCourse} from '../practice-library.js';
import {startChapterTest,saveExamAnswer,submitExam,setMark,settleExam,totalPoints} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';

test('C章节组练把程序填空纳入填空份额，保留代码判题并可恢复备份',()=>{
 for(const chapter of [3,4,5]){
  assert.equal(chapterPracticeStock('programming',chapter).fill,15);
  const paper=composeChapterPractice('programming',chapter,{preset:'code'});
  const fills=paper.questions.filter(q=>q.section==='填空题');
  assert.equal(fills.length,5);assert.equal(paper.questions.length,30);
  assert.ok(fills.every(q=>q.type==='short'&&q.coding&&q.judge));
  const a=startChapterTest('programming',paper,1,`c-fill-${chapter}`);
  const restored=mergeBackup({version:2,attempts:[],practice:{}},{version:2,attempts:[],practice:{},tests:[a]});
  assert.equal(restored.tests[0].questions.filter(q=>q.section==='填空题'&&q.judge).length,5);
 }
});

test('三种快捷方案题量准确，判断题为额外添加；本组不重复、不跨章节',()=>{
 const expected={choice:[30,0,0],mixed:[20,10,0],code:[20,5,5]};
 for(const [preset,counts]of Object.entries(expected))for(const extra of [0,3,4,5]){
  const p=composeChapterPractice('structures',1,{preset,addJudgement:extra>0,judgementCount:extra||3},[],()=>.4);
  assert.deepEqual(['选择题','填空题','编程题'].map(s=>p.questions.filter(q=>q.section===s).length),counts);
  assert.equal(p.questions.filter(q=>q.section==='判断题').length,extra);
  assert.equal(p.questions.length,30+extra);assert.equal(p.questions.reduce((s,q)=>s+q.points,0),100);
  assert.equal(new Set(p.questions.map(q=>q.sourceId||q.id)).size,p.questions.length);
  assert.ok(p.questions.every(q=>q.chapter===1));assert.equal(validateChapterPracticeSnapshot({...p,subject:'structures'}),true);
 }
});
test('缺少原生判断题时，从独立选择题改编；给定选项的真伪与原答案一致',()=>{
 assert.equal(chapterPracticeStock('network',2).judgement,0);
 const p=composeChapterPractice('network',2,{preset:'choice',addJudgement:true,judgementCount:5},[],()=>.4),bank=getPracticeCourse('network').questions;
 const judges=p.questions.filter(q=>q.section==='判断题');assert.equal(judges.length,5);
 assert.ok(judges.some(q=>q.answer===0)&&judges.some(q=>q.answer===1));
 for(const q of judges){const original=bank.find(p=>p.id===q.sourceId);assert.equal(q.answer,original.answer===q.judgementOption?0:1);assert.ok(!p.questions.some(p=>p.id===original.id));assert.equal(q.options[q.answer],original.answer===q.judgementOption?'正确':'错误');}
 validateChapterPracticeSnapshot({...p,subject:'network'});
 // Physical has only 32 choices; using 30 choices leaves two, not five, to convert.
 assert.throws(()=>composeChapterPractice('network','physical',{preset:'choice',addJudgement:true,judgementCount:5}),/判断题.*可用2道/);
});
test('自定义支持四类数量、纯判断和边界校验，缺题不跨章节补齐',()=>{
 const p=composeChapterPractice('structures',2,{preset:'custom',custom:{choice:7,fill:3,code:2,judgement:4}});
 assert.equal(p.questions.length,16);assert.equal(p.questions.reduce((s,q)=>s+q.points,0),100);
 assert.equal(validateChapterPracticeSnapshot({...p,subject:'structures'}),true);
 assert.equal(composeChapterPractice('structures',2,{preset:'custom',custom:{judgement:8}}).questions.length,8);
 for(const custom of [{},{choice:-1},{choice:1.5},{choice:101},{choice:90,fill:11}])assert.throws(()=>chapterPracticeCounts({preset:'custom',custom}));
 assert.throws(()=>composeChapterPractice('digital',1,{preset:'code'}),/编程题需5道.*现有0道/);
 const tampered=structuredClone({...p,subject:'structures'});tampered.questions[0].stem='changed';assert.throws(()=>validateChapterPracticeSnapshot(tampered),/内容/);
});
test('新组优先未练题；作答、提交、首次成绩与备份保持一致且不计积分',()=>{
 const plan={preset:'custom',custom:{choice:5,fill:3,judgement:2}},first=composeChapterPractice('structures',2,plan,[],()=>.4);
 const a=startChapterTest('structures',first,1,'chapter-composed');
 const next=composeChapterPractice('structures',2,plan,[a],()=>.4);assert.ok(next.questions.every(q=>!a.questions.some(p=>p.id===q.id)));
 for(const q of a.questions)saveExamAnswer(a,q.id,q.type==='single'?q.answer:q.answers.map(v=>v[0]),2);
 const restored=mergeBackup({version:2,attempts:[],practice:{}},{version:2,attempts:[],practice:{},tests:[a]}).tests[0];
 assert.deepEqual(restored.answers,a.answers);assert.deepEqual(restored.practicePlan,a.practicePlan);assert.equal(restored.deadline,null);
 submitExam(restored,3);assert.equal(saveExamAnswer(restored,restored.questions[0].id,99,4),false);
 for(const q of restored.questions.filter(q=>q.type==='short'))setMark(restored,q.id,0);
 assert.equal(settleExam(restored).total,100);assert.equal(totalPoints([restored]),0);
 const out=mergeBackup({version:2,attempts:[],practice:{}},{version:2,attempts:[],practice:{},tests:[restored]});assert.equal(out.tests[0].result.total,100);
 const code=startChapterTest('structures',composeChapterPractice('structures',1,{preset:'code'}),1,'codes');
 assert.ok(code.questions.filter(q=>q.section==='编程题').every(q=>q.type==='short'));
 const cCodes=composeChapterPractice('programming',6,{preset:'custom',custom:{code:31}});
 assert.ok(cCodes.questions.some(q=>q.judge));for(const q of cCodes.questions)assert.equal(q.judge,getPracticeCourse('programming').questions.find(p=>p.id===q.id).judge);
});
test('完整前端可配置并生成本章整组，作答时隐藏答案与知识点，提交后显示答案',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),nodes=new Map(),events=new Map(),storage=new Map();
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',dataset:{},addEventListener(name,fn){this[name]=fn;}});return nodes.get(selector);};
 const config={preset:'mixed',addJudgement:true,judgementCount:3,custom:{choice:20,fill:10,code:0,judgement:0}};
 storage.set('course-practice-room-v2',JSON.stringify({version:2,attempts:[],practice:{},chapterPracticeSettings:{network:{2:config}}}));
 const queryAll=selector=>{
  if(selector==='[data-chapter-preset]')return ['choice','mixed','code','custom'].map(value=>Object.assign(node(`preset-${value}`),{value}));
  if(selector==='[data-practice-count]')return ['choice','fill','code','judgement'].map(id=>{const el=node(`count-${id}`);el.dataset.practiceCount=id;return el;});
  return [];
 };
 const context=createContext({document:{title:'',querySelector:node,querySelectorAll:queryAll},window:{addEventListener:(name,fn)=>events.set(name,fn)},location:{hash:'#/subjects/network/chapter-practice/2'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 const script=new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);script.runInContext(context);
 assert.ok(node('#app').innerHTML.includes('自定义'));assert.ok(node('#app').innerHTML.includes('额外加入判断题'));
 node('preset-custom').change();assert.ok(node('#app').innerHTML.includes('data-practice-count="choice"'));
 node('count-choice').value='19';node('count-choice').input();
 let settings=JSON.parse(storage.get('course-practice-room-v2')).chapterPracticeSettings.network[2];assert.equal(settings.custom.choice,'19');
 node('preset-mixed').change();node('#chapter-add-judgement').change({target:{checked:false}});node('#chapter-add-judgement').change({target:{checked:true}});
 settings=JSON.parse(storage.get('course-practice-room-v2')).chapterPracticeSettings.network[2];assert.equal(settings.addJudgement,true);
 node('[data-build-practice]').click();events.get('hashchange')();
 const room=JSON.parse(storage.get('course-practice-room-v2')),a=room.tests[0];assert.equal(a.questions.length,33);assert.equal(a.chapter,2);
 assert.equal((node('#app').innerHTML.match(/class="card exam-question"/g)||[]).length,33);assert.ok(!node('#app').innerHTML.includes('参考答案与解析'));assert.ok(!node('#app').innerHTML.includes('知识点'));assert.ok(node('#app').innerHTML.includes('提交练习'));
 submitExam(a,Date.now());storage.set('course-practice-room-v2',JSON.stringify(room));events.get('storage')({key:'course-practice-room-v2'});
 assert.ok(node('#app').innerHTML.includes('参考答案与解析'));assert.ok(!node('#app').innerHTML.includes('data-submit'));
});
