import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';

test('构建后的独立HTML在首页、三科题目与第六章直达页完成渲染',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const script=new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 for(const [hash,expected]of [
  ['','我的课程'],
  ['#/subjects/network/chapter/1/question/1-01','一条点到点链路'],
  ['#/subjects/structures/chapter/6/question/6-01','先序'],
  ['#/subjects/programming/chapter/6/question/6-01','a[5]'],
  ['#/subjects/programming/chapter/6/question/6-02','补全'],
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
 }
});
