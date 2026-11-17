import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceType,practiceTypes,filterPracticeTypes,practiceTypeCounts} from '../practice-types.js';
import {getPracticeCourse} from '../practice-library.js';
import {drawPractice} from '../sessions.js';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
test('选择、填空、分析、编程与程序填空分开，判断和计算也保持独立',()=>{
 assert.equal(practiceType('programming',{type:'short',section:'程序填空',stem:'补齐函数'}),'code-fill');
 assert.equal(practiceType('programming',{type:'short',stem:'补全三处代码'}),'code-fill');
 assert.equal(practiceType('structures',{type:'short',section:'算法设计',stem:'编写函数'}),'code');
 assert.equal(practiceType('structures',{type:'single',section:'判断题'}),'judgement');
 assert.equal(practiceType('network',{type:'short',section:'计算题'}),'calculation');
 assert.equal(practiceType('digital',{type:'short',section:'分析题'}),'analysis');
});
test('首次进入先选题型，选择程序填空后换题与刷新仍只显示程序填空',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),nodes=new Map(),events=new Map(),storage=new Map();
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',dataset:{},addEventListener(name,fn){this[name]=fn;}});return nodes.get(selector);};
 const context=createContext({document:{title:'',querySelector:node,querySelectorAll:selector=>selector==='[data-practice-kind]'?practiceTypes.map(t=>{const el=node(`kind-${t.id}`);el.dataset.practiceKind=t.id;return el;}):[]},window:{addEventListener:(name,fn)=>events.set(name,fn),scrollTo(){}},location:{hash:'#/subjects/programming/practice'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 const script=new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);script.runInContext(context);
 assert.ok(node('#app').innerHTML.includes('想练哪一种题'));assert.ok(!node('#app').innerHTML.includes('class="card exam-question"'));
 node('kind-code-fill').click();
 let saved=JSON.parse(storage.get('course-practice-room-v2')).practice.programming;
 assert.equal(saved.kind,'code-fill');assert.ok(node('#app').innerHTML.includes('程序填空题练习'));
 for(let i=0;i<4;i++){
  const q=getPracticeCourse('programming').questions.find(q=>q.id===saved.current);assert.equal(practiceType('programming',q),'code-fill');
  node('[data-practice-next]').click();saved=JSON.parse(storage.get('course-practice-room-v2')).practice.programming;
 }
 events.get('hashchange')();assert.ok(node('#app').innerHTML.includes('程序填空题练习'));
 node('#practice-chapter').change({target:{value:'1'}});assert.ok(node('#app').innerHTML.includes('当前章节暂无此类题目'));assert.ok(node('#app').innerHTML.includes('id="practice-kind"'));
});
test('各科所有练习恰好属于一个题型，连续抽题不会越过题型和章节',()=>{
 for(const subject of ['network','structures','digital','programming']){
  const {questions,chapters}=getPracticeCourse(subject),groups=practiceTypeCounts(subject,questions);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),questions.length);
  assert.deepEqual(filterPracticeTypes(subject,questions,'all',undefined),[]);
  for(const t of practiceTypes)for(const chapter of chapters){
   const bank=filterPracticeTypes(subject,questions,chapter.id,t.id),seen=[];
   for(let i=0;i<Math.min(5,bank.length);i++){
    const q=drawPractice(bank,seen,()=>.5);assert.equal(practiceType(subject,q),t.id);assert.equal(String(q.chapter),String(chapter.id));assert.ok(!seen.includes(q.id));seen.push(q.id);
   }
  }
 }
});
