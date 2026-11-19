import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {getPracticeCourse} from '../practice-library.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {codeEditor,bindCodeEditors} from '../code-editor.js';
import {composeChapterPractice} from '../chapter-practice.js';
import {startChapterTest,submitExam,setMark,settleExam,applyCodeResult,pendingCodeQuestions,totalPoints} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';
import {AI_GRADING_VERSION,enableAIGrading} from '../ai-grading.js';
const empty=()=>({version:2,attempts:[],practice:{}});
const intro=()=>getPracticeCourse('structures').questions.filter(q=>q.chapter===1&&q.coding);

test('代码测试能力与整题自动得分分开，分析子问仍保留',()=>{
 const qs=intro();assert.equal(qs.length,5);
 for(const q of qs){
  assert.equal(hasJudgeContract(q.id,q.revision),true);
  const manual=[1,2,5].includes(Number(q.id.slice(-3)));
  assert.equal(q.manualReview===true,manual);assert.equal(q.judge,!manual);
  const html=codeEditor(q,'submitted code','manual',true,true);
  assert.ok(html.includes('data-code-judge'));assert.ok(html.includes('disabled'));
  assert.ok(!html.includes('data-code-run'));assert.ok(!html.includes('data-code-stdin'));
  assert.ok(html.includes(manual?'测试代码':'提交判题'));
 }
});

test('分析题不能靠代码accepted绕过自评，锁答与首次成绩继续有效',()=>{
 const paper=composeChapterPractice('structures',1,{preset:'custom',custom:{choice:0,fill:0,code:5,judgement:0}},[],()=>.5);
 const a=startChapterTest('structures',paper,1,'manual-score');
 for(const q of a.questions)a.answers[q.id]='submitted code';
 submitExam(a,2);assert.equal(pendingCodeQuestions(a).length,2);
 for(const q of a.questions){
  const ok=applyCodeResult(a,q.id,a.answers[q.id],{status:'accepted',passed:10,total:10});
  assert.equal(ok,q.judge);
  if(q.manualReview){assert.equal(a.marks[q.id],undefined);assert.equal(setMark(a,q.id,7),true);}
 }
 const result=settleExam(a);assert.equal(result.total,61);assert.equal(totalPoints([a]),0);
 assert.equal(setMark(a,a.questions[0].id,20),false);
 assert.equal(applyCodeResult(a,a.questions[0].id,a.answers[a.questions[0].id],{status:'accepted'}),false);
 assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[a]}).tests,[a]);
 const tampered=structuredClone(a),q=tampered.questions.find(q=>q.manualReview);q.judge=true;
 assert.throws(()=>mergeBackup(empty(),{...empty(),tests:[tampered]}));
});

test('绪论真实旧版草稿与其自评结果不被新接口覆盖',async()=>{
 const before=JSON.parse(await readFile(new URL('./fixtures/ds-intro-before-contract.json',import.meta.url),'utf8'));
 const old=mergeBackup(empty(),before).tests[0];assert.ok(old.questions.every(q=>q.revision===1&&!q.judge));
 submitExam(old,2);for(const q of old.questions)setMark(old,q.id,q.points);settleExam(old);
 assert.equal(old.result.total,100);assert.deepEqual(mergeBackup(empty(),{...empty(),tests:[old]}).tests,[old]);
});

test('分析题测试结果不显示整题答案正确',async()=>{
 const oldFetch=globalThis.fetch,oldLocation=globalThis.location;let click,judged;
 const source={value:'code',addEventListener(){}},result={},button={hasAttribute:()=>true,addEventListener:(event,fn)=>{click=fn;}};
 const panel={dataset:{codeQuestion:intro()[0].id,codeReview:'true'},querySelector:s=>({'[data-code-source]':source,'.code-lines':{},'[data-code-result]':result,'[data-code-judge]':button}[s]??null)};
 try{
  globalThis.location={protocol:'http:'};
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'accepted',message:'答案正确。',passed:8,total:8})});
  bindCodeEditors({querySelectorAll:()=>[panel]},v=>{judged=v;});await click({currentTarget:button});
  assert.equal(judged.result.status,'accepted');assert.match(result.textContent,/代码测试通过；分析部分随作答提交评阅/);assert.ok(!result.textContent.includes('答案正确'));
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'wrong_answer',message:'部分测试未通过。',passed:2,total:8})});
  await click({currentTarget:button});assert.match(result.textContent,/代码测试未通过/);
 }finally{globalThis.fetch=oldFetch;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
});

// Executes the delivered application and event handlers; this is not visual browser QA.
async function render(hash,room,q,options={}){
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),nodes=new Map(),storage=new Map([['course-practice-room-v2',JSON.stringify(room)]]);
 const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',dataset:{},value:'',addEventListener(event,fn){this[event]=fn;},hasAttribute:name=>name==='data-code-judge',setAttribute(){}});return nodes.get(s);};
 const source=node('source');source.value=room.practice.structures?.records[q.id]?.answer||'submitted code';
 const panel={dataset:{codeQuestion:q.id,codeReview:String(q.manualReview===true)},querySelector:s=>({'[data-code-source]':source,'.code-lines':node('lines'),'[data-code-result]':node('result'),'[data-code-judge]':node('#app').innerHTML.includes('data-code-judge')?node('judge'):null}[s]??null)};
 const request=async(url,init)=>{
  if(String(url).endsWith('/api/review')){
   if(options.failReview)return {ok:false,status:503,json:async()=>({message:'评阅服务暂不可用，作答已保存。'})};
   const {items}=JSON.parse(init.body);return {ok:true,status:200,json:async()=>({reviews:items.map(item=>{const v=[q,...(room.tests||[]).flatMap(a=>a.questions)].find(v=>v.id===item.questionId),score=options.partial?Math.floor(item.points/2):item.points;return {version:AI_GRADING_VERSION,grader:'codex',questionId:item.questionId,revision:item.revision,answer:item.answer,language:item.language,points:item.points,score,feedback:'代码思路正确，分析部分仍可补充。',method:'code-reading',criteria:v.rubric.map((_,index)=>({index,verdict:options.partial?'partial':'met',comment:'按实际提交内容核对。'}))};})})};
  }
  return {ok:true,status:200,json:async()=>({status:'accepted',message:'答案正确。',passed:8,total:8})};
 };
 const context=createContext({document:{title:'',querySelector:s=>s===`textarea[data-answer="${q.id}"]`?source:node(s),querySelectorAll:s=>s==='[data-code-workspace]'&&node('#app').innerHTML.includes('data-code-workspace')?[panel]:[]},window:{addEventListener(){}},location:{hash,protocol:'http:'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},fetch:request,AbortSignal,setTimeout,clearTimeout,console});
 new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
 return {markup:()=>node('#app').innerHTML,node,room:()=>JSON.parse(storage.get('course-practice-room-v2'))};
}

test('真实应用单题练习：测试通过不标整题正确，提交后按分析完整度自动评阅',async()=>{
 const q=intro().find(q=>q.manualReview),room={...empty(),practice:{structures:{kind:'code',chapter:1,current:q.id,seen:[q.id],records:{[q.id]:{revision:q.revision,answer:'submitted code'}}}}};
 const view=await render('#/subjects/structures/practice',room,q,{partial:true});
 await view.node('judge').click({currentTarget:view.node('judge')});
 let r=view.room().practice.structures.records[q.id];assert.equal(r.judged.status,'accepted');assert.equal(r.correct,undefined);assert.equal(r.submitted,undefined);
 view.node('[data-practice-submit]').click();r=view.room().practice.structures.records[q.id];assert.equal(r.submitted,true);
 for(let n=0;n<30&&view.room().practice.structures.records[q.id].reviewPending;n++)await new Promise(resolve=>setImmediate(resolve));
 r=view.room().practice.structures.records[q.id];assert.equal(r.status,'wrong');assert.equal(r.correct,false);assert.equal(r.score,50);assert.match(view.markup(),/评阅得分：50 \/ 100/);assert.ok(!view.markup().includes('请对照参考答案和要点自评'));
});

test('旧C代码记录未写language时，单纯切列表不撤销原提交与正确状态',async()=>{
 const q=intro().find(q=>q.judge),answer='already accepted C source',record={revision:q.revision,answer,submitted:true,status:'correct',correct:true,score:100},room={...empty(),practice:{structures:{kind:'code',chapter:1,current:q.id,seen:[q.id],records:{[q.id]:record}}}};
 const view=await render('#/subjects/structures/practice',room,q);view.node('[data-practice-list]').click();
 const saved=view.room().practice.structures.records[q.id];assert.equal(saved.answer,answer);assert.equal(saved.submitted,true);assert.equal(saved.status,'correct');assert.equal(saved.correct,true);assert.equal(saved.score,100);
});

test('真实应用新整组由Codex自动结算，故障时锁答待评且不出现自评分入口',async()=>{
 const paper=composeChapterPractice('structures',1,{preset:'custom',custom:{choice:0,fill:0,code:5,judgement:0}},[],()=>.5),a=enableAIGrading(startChapterTest('structures',paper,1,'ai-ui'));
 const q=a.questions.find(q=>q.manualReview);for(const v of a.questions)a.answers[v.id]='submitted code';submitExam(a,2);
 let view=await render('#/subjects/structures/test/ai-ui',{...empty(),tests:[a]},q,{partial:true});
 for(let n=0;n<30&&view.room().tests[0].status==='marking';n++)await new Promise(resolve=>setImmediate(resolve));
 const graded=view.room().tests[0];assert.equal(graded.status,'settled');assert.equal(graded.result.total,70);assert.equal(totalPoints([graded]),0);assert.ok(!view.markup().includes('data-mark='));assert.ok(!view.markup().includes('data-settle'));
 view=await render('#/subjects/structures/test/ai-ui',{...empty(),tests:[a]},q,{failReview:true});
 for(let n=0;n<30&&!view.markup().includes('评阅服务暂不可用');n++)await new Promise(resolve=>setImmediate(resolve));
 const pending=view.room().tests[0];assert.equal(pending.status,'marking');assert.equal(pending.result,null);assert.equal(pending.marks[q.id],undefined);assert.match(view.markup(),/data-judge-retry/);assert.ok(!view.markup().includes('data-mark='));
});

test('整组提交前只开放公开样例，交卷后测试锁定代码并自评',async()=>{
 const paper=composeChapterPractice('structures',1,{preset:'custom',custom:{choice:0,fill:0,code:5,judgement:0}},[],()=>.5),a=startChapterTest('structures',paper,1,'manual-ui');
 const q=a.questions.find(q=>q.manualReview);for(const v of a.questions)a.answers[v.id]='submitted code';
 let view=await render('#/subjects/structures/test/manual-ui',{...empty(),tests:[a]},q);
 assert.ok(view.markup().includes('data-code-test'));
 assert.ok(!view.markup().includes('data-code-judge'));assert.ok(!view.markup().includes('参考答案与解析'));
 submitExam(a,2);for(const v of a.questions.filter(q=>q.judge))applyCodeResult(a,v.id,a.answers[v.id],{status:'accepted'});
 view=await render('#/subjects/structures/test/manual-ui',{...empty(),tests:[a]},q);
 assert.ok(view.markup().includes('data-code-judge'));assert.match(view.markup(),/测试代码/);assert.match(view.markup(),/data-code-source[^>]*disabled/);
 assert.ok(!view.markup().includes('data-code-run'));assert.match(view.markup(),/data-mark=/);assert.match(view.markup(),/参考答案与解析/);
 await view.node('judge').click({currentTarget:view.node('judge')});
 assert.equal(view.room().tests[0].marks[q.id],undefined);
});
