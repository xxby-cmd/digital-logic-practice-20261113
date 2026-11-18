import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {highlightC,codingStatement,questionTitle,uiEscape} from '../workbench-ui.js';
import {getPracticeCourse} from '../practice-library.js';
import {practiceTypes,practiceType} from '../practice-types.js';

test('代码高亮只改变显示，转义用户代码并保留换行、注释与字符串',()=>{
 const source='int main(void) {\n // <script>\n printf("<img src=x>"); return 0;\n}';
 const output=highlightC(source);
 assert.ok(!output.includes('<script>'));assert.ok(!output.includes('<img'));
 assert.ok(output.includes('syntax-keyword'));assert.ok(output.includes('syntax-comment'));
 const plain=output.replace(/<\/?span[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 assert.equal(plain,source);
});

test('编程题分节保留约束和待补代码，不从标准答案提取题面或函数接口',()=>{
 const q={type:'short',coding:true,stem:'编写 int firstPeak(const int a[],int n)，n>=0，端点不算峰值。',model:'int secretAnswer(void) { return 42; }'};
 const html=codingStatement(q,uiEscape);
 assert.match(html,/n&gt;=0/);assert.match(html,/端点不算峰值/);assert.match(html,/函数接口/);
 assert.ok(!html.includes('secretAnswer'));assert.equal(questionTitle(q),'寻找首个峰值');
 const fill={...q,stem:'补齐以下代码：\n```c\nint f(int n) { return ___; }\n```\n不得使用循环。'};
 const block=codingStatement(fill,uiEscape);assert.match(block,/return ___/);assert.match(block,/不得使用循环/);assert.ok(!block.includes('secretAnswer'));
});

test('题型列表与题号跳转不清空已保存答案，未修改作答保留提交状态',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const bank=getPracticeCourse('network').questions.filter(q=>practiceType('network',q)==='choice');
 const first=bank[0],second=bank[1],nodes=new Map(),storage=new Map(),events=new Map();
 const key='course-practice-room-v2';
 storage.set(key,JSON.stringify({version:2,attempts:[],tests:[],practice:{network:{kind:'choice',chapter:'all',current:first.id,seen:[first.id],records:{[first.id]:{revision:first.revision||1,answer:first.answer,submitted:true,status:'correct'}}}}}));
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',dataset:{},value:'',addEventListener(event,fn){this[event]=fn;},setAttribute(){}});return nodes.get(selector);};
 const queryAll=selector=>{
  if(selector==='[data-practice-kind]')return practiceTypes.map(t=>Object.assign(node(`kind-${t.id}`),{dataset:{practiceKind:t.id}}));
  if(selector==='[data-practice-open]')return bank.map(q=>Object.assign(node(`open-${q.id}`),{dataset:{practiceOpen:q.id}}));
  return [];
 };
 const document={title:'',querySelector:selector=>selector.endsWith(':checked')?{value:first.answer}:node(selector),querySelectorAll:queryAll};
 const context=createContext({document,window:{addEventListener:(name,fn)=>events.set(name,fn),scrollTo(){}},location:{hash:'#/subjects/network/practice'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
 node('[data-practice-list]').click();
 let saved=JSON.parse(storage.get(key)).practice.network;
 assert.equal(saved.listView,true);assert.equal(saved.records[first.id].submitted,true);
 assert.match(node('#app').innerHTML,/题目列表/);assert.match(node('#app').innerHTML,/已答对/);
 node(`open-${second.id}`).click();
 saved=JSON.parse(storage.get(key)).practice.network;
 assert.equal(saved.current,second.id);assert.equal(saved.records[first.id].answer,first.answer);assert.equal(saved.records[first.id].submitted,true);
 assert.equal(saved.listView,false);assert.ok(saved.seen.includes(second.id));
 assert.match(node('#app').innerHTML,/data-code-problem="false"/);
});
