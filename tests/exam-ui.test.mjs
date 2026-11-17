import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {examPapers} from '../exam-bank.js';
import {startExam,startChapterTest,submitExam,saveExamAnswer,setMark,settleExam} from '../sessions.js';
import {composeChapterTest} from '../chapter-tests.js';

// 轻量DOM桩用于验证真实构建脚本的页面输出与事件；不是浏览器视觉测试。
async function render(hash,room){
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const nodes=new Map(),events=new Map(),storage=new Map(room?[['course-practice-room-v2',JSON.stringify(room)]]:[]);
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',addEventListener(name,fn){this[name]=fn;}});return nodes.get(selector);};
 const context=createContext({document:{title:'',querySelector:node,querySelectorAll:()=>[]},window:{addEventListener:(name,fn)=>events.set(name,fn)},location:{hash},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
 return {markup:()=>node('#app').innerHTML,node,events,storage,context};
}
test('考试作答页无答案、解析、自评入口和知识点标签，交卷后才出现解析',async()=>{
 for(const subject of Object.keys(examPapers)){
  const a=startExam(subject,examPapers[subject][0]);
  const room={version:2,attempts:[a],practice:{}};
  let view=await render(`#/subjects/${subject}/exam/${a.id}`,room);
  assert.ok(view.markup().includes('countdown'));assert.ok(view.markup().includes('data-submit'));
  assert.ok(!view.markup().includes('参考答案与解析'));
  assert.ok(!view.markup().includes('data-mark'));
  assert.ok(!view.markup().includes('知识点'));
  for(const q of a.questions)if(q.explanation)assert.ok(!view.markup().includes(q.explanation));
  submitExam(a);view=await render(`#/subjects/${subject}/exam/${a.id}`,room);
  assert.ok(view.markup().includes('参考答案与解析'));
  assert.ok(view.markup().includes('disabled type="radio"'));
  assert.ok(!view.markup().includes('data-submit'));
 }
});
test('跨刷新已过期的答卷在首屏锁定并显示交卷后页面',async()=>{
 const a=startExam('network',examPapers.network[0],Date.now()-7201000,'expired');
 const view=await render('#/subjects/network/exam/expired',{version:2,attempts:[a],practice:{}});
 assert.ok(view.markup().includes('时间已到，已自动交卷'));
 assert.ok(view.markup().includes('参考答案与解析'));assert.ok(!view.markup().includes('id="countdown"'));
 const stored=JSON.parse(view.storage.get('course-practice-room-v2'));assert.equal(stored.attempts[0].status,'marking');
});
test('结算后仅显示错题，重做入口与下一批入口不更改成绩',async()=>{
 const a=startExam('network',examPapers.network[0]);
 const wrongId=a.questions[0].id;
 for(const q of a.questions)saveExamAnswer(a,q.id,q.type==='single'?(q.id===wrongId?(q.answer+1)%4:q.answer):q.type==='fill'?q.answers.map(v=>v[0]):'完成过程');
 submitExam(a);for(const q of a.questions.filter(q=>q.type==='short'))setMark(a,q.id,q.points);settleExam(a);
 const view=await render(`#/subjects/network/exam/${a.id}`,{version:2,attempts:[a],practice:{}});
 assert.equal((view.markup().match(/class="card exam-question"/g)||[]).length,1);
 assert.ok(view.markup().includes(`data-retry="${wrongId}"`));assert.ok(view.markup().includes('下一批'));
 assert.ok(!view.markup().includes('data-mark'));assert.ok(!view.markup().includes('data-settle'));
});
test('课程入口启动考试后保存快照，刷新不新开试卷',async()=>{
 const view=await render('#/subjects/structures');
 view.node('[data-exam]').click();
 const room=JSON.parse(view.storage.get('course-practice-room-v2'));assert.equal(room.attempts.length,1);
 assert.equal(room.attempts[0].questions.length,32);
 const next=await render('#/subjects/structures',room);next.node('[data-exam]').click();
 assert.equal(JSON.parse(next.storage.get('course-practice-room-v2')).attempts.length,1);
});
test('章节测验首屏整组展示，保存后仍无答案解析，提交后才显示全部解析',async()=>{
 const a=startChapterTest('network',composeChapterTest('network','physical'),1,'chapter-ui');
 const room={version:2,attempts:[],practice:{},tests:[a]};
 saveExamAnswer(a,a.questions[0].id,0,999999999);
 let view=await render('#/subjects/network/test/chapter-ui',room);
 assert.equal((view.markup().match(/class="card exam-question"/g)||[]).length,19);
 assert.ok(view.markup().includes('data-save-draft'));assert.ok(view.markup().includes('提交测验'));
 assert.ok(!view.markup().includes('参考答案与解析'));assert.ok(!view.markup().includes('countdown'));
 submitExam(a);view=await render('#/subjects/network/test/chapter-ui',room);assert.ok(view.markup().includes('参考答案与解析'));
 for(const q of a.questions.filter(q=>q.type==='short'))setMark(a,q.id,0);settleExam(a);
 view=await render('#/subjects/network/test/chapter-ui',room);assert.ok(view.markup().includes('不计积分'));assert.equal((view.markup().match(/class="card exam-question"/g)||[]).length,19);
});
