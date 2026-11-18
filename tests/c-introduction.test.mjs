import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {cIntroductionPractice} from '../bank-c-introduction.js';
import {grade,normalize} from '../grading.js';
import {getPracticeCourse} from '../practice-library.js';

const bank=cIntroductionPractice.programming;
const id=(tag,n)=>`C6I-programming-1-${tag}-${String(n).padStart(3,'0')}`;
const question=(tag,n)=>bank.find(q=>q.id===id(tag,n));
const code=(tag,n)=>question(tag,n).stem.match(/```c\n([\s\S]*?)\n```/)[1];
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/C程序与语言概述/',import.meta.url));
const root=fileURLToPath(new URL('../',import.meta.url));

test('C1一百原创：60选择20普通填空20分析，全部明确非编程提交',()=>{
 assert.equal(bank.length,100);assert.equal(new Set(bank.map(q=>q.id)).size,100);
 assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,100);
 assert.deepEqual(['选择题','填空题','分析题'].map(section=>bank.filter(q=>q.section===section).length),[60,20,20]);
 const existing=getPracticeCourse('programming').questions.filter(q=>!q.id.startsWith('C6I-'));
 for(const q of bank){
  assert.equal(q.chapter,1,q.id);assert.equal(q.origin,'原创');assert.equal(q.pool,'practice');assert.equal(q.coding,false,q.id);
  assert.ok(q.mechanism?.length>5,q.id);assert.ok(q.studyEvidence.includes('70页'),q.id);assert.ok(q.source.ppt.includes('C01'));
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  assert.ok(!/同上|沿用上一|上一题/.test(q.stem),q.id);
  assert.ok(!existing.some(old=>old.id===q.id||normalize(old.stem)===normalize(q.stem)),q.id);
  if(q.type==='single'){
   assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(o=>o.normalize('NFKC').trim())).size,4,q.id);
   for(let i=0;i<4;i++)assert.equal(grade(q,i).correct,i===q.answer,q.id);
   assert.ok(q.explanation.length>=30,q.id);
  }else if(q.type==='fill'){
   assert.ok(q.answers.length>0);assert.equal(q.formats.length,q.answers.length);
   const answer=q.answers.map(variants=>variants[0]);assert.equal(grade(q,answer).correct,true,q.id);
   q.answers.forEach((variants,i)=>{for(const value of variants){const equivalent=[...answer];equivalent[i]=value;assert.equal(grade(q,equivalent).correct,true,q.id);}});
   assert.equal(grade(q,q.answers.map(()=>'未给出的答案')).correct,false,q.id);
   assert.ok(q.explanation.length>=30,q.id);
  }else{
   assert.equal(q.type,'short');assert.ok(q.model.length>=70,q.id);assert.ok(q.rubric.length>=3,q.id);
   assert.equal(grade(q,q.model).status,'review');
  }
 }
 assert.ok(bank.filter(q=>q.studyLevel!=='supplement').length>=90);
 assert.equal(grade(question('F',6),['预编译','调用']).correct,true);
 assert.equal(grade(question('F',17),['+1.20']).correct,true);
});

// Expected bytes are manually derived from the statements, not copied from a run.
const outputCases=[
 ['S',27,'start\n'],['S',28,'middle\nend\n'],['S',42,'/* note */\n'],['S',43,'final\n'],
 ['S',45,'redblue'],['S',48,'7'],['F',7,'24'],['F',9,'77'],['F',10,'"7"'],['F',11,'//9'],
 ['F',12,'8'],['F',13,'1\\n2'],['F',14,'value=6'],['F',15,'3\n\n4\n'],['R',13,'1\n3\n2\n'],['R',14,'1']
];
test('全部完整短程序均列入独立输出核验，普通填空答案对应实际提问',()=>{
 const contained=bank.filter(q=>q.stem.includes('```c')).map(q=>q.id);
 assert.deepEqual(new Set(contained),new Set(outputCases.map(([tag,n])=>id(tag,n))));
 for(const [tag,n,stdout]of outputCases){
  const q=question(tag,n);
  if(tag==='S')assert.equal(q.options[q.answer],n===28?stdout.trim().split('\n').join('、'):stdout.trim(),q.id);
  if(tag==='F'){
   const value=n===9?String(stdout.length):[13,15].includes(n)?String((stdout.match(/\n/g)||[]).length):n===14?stdout.split('=')[1]:stdout;
   assert.equal(grade(q,[value]).correct,true,q.id);
  }
 }
});

function run(source){
 const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,
  input:JSON.stringify({source,stdin:''}),encoding:'utf8',windowsHide:true,timeout:25000,
  env:{...process.env,PYTHONDONTWRITEBYTECODE:'1',PYTHONIOENCODING:'utf-8'}});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
}
test('真实C17：16完整读码及语法/入口/链接结论逐份核验，不执行UB',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:300000
},()=>{
 const results=[];
 const check=(label,source,status,stdout)=>{
  const raw=run(source);results.push({label,source,status:raw.status,stdout:raw.stdout,diagnostic:raw.stderr||raw.message});
  assert.equal(raw.status,status,JSON.stringify(results.at(-1)));if(stdout!==undefined)assert.equal(raw.stdout,stdout,label);
 };
 try{
  for(const [tag,n,stdout]of outputCases)check(id(tag,n),code(tag,n),'ran',stdout);
  for(const option of question('S',38).options)check('S038:'+option,option,option===question('S',38).options[question('S',38).answer]?'ran':'compile_error');
  for(const option of question('S',29).options)check('S029:'+option,option,option===question('S',29).options[question('S',29).answer]?'ran':option==='int main(void);'?'runtime_error':'compile_error');
  check('S039:multiline-call','#include <stdio.h>\nint main(void){printf(\n"ok"\n);return 0;}','ran','ok');
  check('S040:comment-after-return','int main(void){return 0; // successful\n}','ran','');
  for(const option of question('S',44).options){
   const statement=option.startsWith('printf(name);')?'printf(name);':option.startsWith('name("printf");')?'name("printf");':option;
   check('S044:'+option,'#include <stdio.h>\nint main(void){'+statement+'return 0;}',option===question('S',44).options[question('S',44).answer]?'ran':'compile_error');
  }
  for(const option of question('S',46).options)check('S046:'+option,'#include <stdio.h>\nint main(void){printf('+option+');return 0;}','ran',JSON.parse(option));
  check('S047:fullwidth-semicolon','int main(void){return 0；}','compile_error');
  check('S049:Main-is-not-main','int Main(void){return 0;}','runtime_error');
  check('R008:exit-status','#include <stdio.h>\nint main(void){puts("0");return 7;}','runtime_error','0\n');
  check('R017:previous-line-missing-semicolon','#include <stdio.h>\nint main(void){int value=3\nprintf("%d",value);return 0;}','compile_error');
  check('link:prototype-without-implementation','int render(void);int main(void){return render();}','compile_error');
  check('link:prototype-and-implementation','int render(void);int main(void){return render();}int render(void){return 0;}','ran','');
  check('source:duplicate-main','int main(void){return 0;}int main(void){return 0;}','compile_error');
 }finally{
  mkdirSync(evidence,{recursive:true});
  const hashes=Object.fromEntries(['bank-c-introduction.js','tests/c-introduction.test.mjs'].map(path=>[path,createHash('sha256').update(readFileSync(root+path)).digest('hex')]));
  writeFileSync(evidence+'短程序与语法实编.json',JSON.stringify({time:new Date().toISOString(),sourceHashes:hashes,
   scope:'16个题面完整程序全部实编；另核选项语法、入口缺失、库调用文字、返回状态与声明缺实现。非算法代码判题接口。',
   limitations:['构建情境题按明确工具链推理，不能把单文件worker执行冒称多文件项目实际构建。','本WASI启动库对缺少main定义的样例可在启动时陷阱；不把这一具体诊断阶段当标准C普遍保证。','非零退出的程序行为有定义；未执行越界、未初始化读取等UB。','有限程序样例不证明任意程序正确性。'],results},null,2));
 }
});
