import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {examPapers} from '../exam-bank.js';
import {startExam} from '../sessions.js';

test('构建后的独立HTML在首页、三科题目与第六章直达页完成渲染',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const script=new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 for(const [hash,expected]of [
  ['','我的课程'],
  ['#/subjects/network/chapter/1/question/1-01','一条点到点链路'],
  ['#/subjects/structures/chapter/6/question/6-01','先序'],
  ['#/subjects/programming/chapter/6/question/6-01','a[5]'],
  ['#/subjects/programming/chapter/6/question/6-02','补全'],
  ['#/subjects/programming/chapter/6/question/P2-programming-6-12','测试样例'],
  ['#/subjects/programming/chapter/8/question/8-01','p'],
  ['#/subjects/digital/practice/chapter/1','逐题练习'],
  ['#/subjects/physics','暂无习题']
 ]){
  // 模拟DOM仅验证构建产物执行与首屏文本，不冒充浏览器视觉/交互测试。
  const nodes=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',addEventListener(){}});return nodes.get(selector);};
  const context=createContext({document:{title:'',querySelector:node,querySelectorAll:()=>[]},window:{addEventListener(){}},location:{hash},localStorage:{getItem:()=>null},setTimeout,clearTimeout,console});
  script.runInContext(context);
  const content=node('#app').innerHTML;
  assert.ok(content.includes(expected),hash||'home');
  assert.ok(!content.includes('undefined'),hash||'home');
  if(hash.includes('programming/chapter/8'))assert.ok(content.includes('problem-code'));
  if(hash.endsWith('P2-programming-6-12')){
   assert.equal([...content.matchAll(/data-problem-sample=/g)].length,2);
   assert.match(content,/调用样例 1/);
   assert.match(content,/输出样例 2/);
   assert.match(content,/data-code-test/);
   assert.match(content,/data-code-judge/);
  }
 }
});

test('已保存的旧模拟卷也显示两组样例，交卷前只开放公开测试',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const attempt=startExam('programming',examPapers.programming[1],Date.now(),'saved-legacy-code');
 const oldPaper=attempt.questions.find(q=>q.id==='programming-E2-13');
 assert.equal(oldPaper.judge,undefined);
 const storage=new Map([['course-practice-room-v2',JSON.stringify({version:2,practice:{},attempts:[attempt]})]]);
 const nodes=new Map();
 const select=selector=>{
  if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',addEventListener(){}});
  return nodes.get(selector);
 };
 const context=createContext({document:{title:'',querySelector:select,querySelectorAll:()=>[]},window:{addEventListener(){}},
  location:{hash:'#/subjects/programming/exam/saved-legacy-code'},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setTimeout,clearTimeout,console});
 new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
 const markup=select('#app').innerHTML;
 assert.match(markup,/首个指定字符位置/);
 assert.equal([...markup.matchAll(/data-problem-sample=/g)].length,16);
 assert.equal([...markup.matchAll(/data-code-test/g)].length,8);
 assert.doesNotMatch(markup,/data-code-judge|参考答案与解析/);
 assert.equal(JSON.parse(storage.get('course-practice-room-v2')).attempts[0].questions.find(q=>q.id===oldPaper.id).judge,undefined);
});
