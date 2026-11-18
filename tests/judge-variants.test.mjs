import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {evaluateContract} from '../scripts/judge-contracts.mjs';

const contract={variants:[2,4,null].map(value=>({prelude:value===null?'':`#define RATE ${value}\n`,harness:'\n#include <stdio.h>\nint main(void){printf("%d\\n",scale(3));return 0;}',groups:[[String((value??10)*3)]],expected:[String((value??10)*3)]}))};
const good='#ifndef RATE\n#define RATE 10\n#endif\nint scale(int x){return RATE*x;}';
function run(source,variants=contract.variants){const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify({source,variants}),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},windowsHide:true,timeout:22000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}

test('多配置成绩合并，每个配置都通过才能接受；服务结果缺失不判学生错',()=>{
 const complete={status:'variants',results:['6\n','12\n','30\n'].map(stdout=>({status:'ran',stdout}))};
 assert.deepEqual(evaluateContract(complete,contract),{status:'accepted',message:'答案正确。',passed:3,total:3,stderr:''});
 complete.results[1].stdout='30\n';let result=evaluateContract(complete,contract);assert.equal(result.status,'wrong_answer');assert.equal(result.passed,2);assert.equal(result.total,3);
 complete.results=[{status:'ran',stdout:'6\n'},{status:'compile_error',message:'编译未通过。'}];result=evaluateContract(complete,contract);assert.equal(result.status,'compile_error');assert.equal(result.passed,1);assert.equal(result.total,3);
 assert.equal(evaluateContract({status:'variants',results:[{status:'ran',stdout:'6\n'}]},contract).status,'unavailable');
 assert.equal(evaluateContract({status:'unavailable'},contract).status,'unavailable');
 for(const one of [{expected:['7']},{expected:[],groups:[]}]){
  const stdout=one.expected.length?'7 999\n':'unexpected\n';
  assert.equal(evaluateContract({status:'variants',results:[{status:'ran',stdout}]},{variants:[one]}).status,'wrong_answer');
 }
});

test('真实重新编译三配置，默认宏不覆盖预定义值；硬写默认值会失败',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const result=run(good);assert.equal(evaluateContract(result,contract).status,'accepted');
 assert.deepEqual(result.results.map(r=>r.stdout),['6\n','12\n','30\n']);
 const wrong=run('#define RATE 10\nint scale(int x){return RATE*x;}');assert.equal(evaluateContract(wrong,contract).status,'wrong_answer');
 assert.equal(evaluateContract(wrong,contract).passed,1);
});

test('多配置也分别保留输入、输出、源码预算；非法服务配置不冒充学生错',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const stdinVariants=['2 3','-5 1'].map(stdin=>({stdin,harness:''}));
 const result=run('#include <stdio.h>\nint main(void){int a,b;if(scanf("%d%d",&a,&b)==2)printf("%d",a+b);return 0;}',stdinVariants);
 assert.deepEqual(result.results.map(r=>r.stdout),['5','-4']);
 assert.equal(run(good,[]).status,'unavailable');assert.equal(run(good,Array(5).fill({})).status,'unavailable');
 assert.equal(run(good,[{stdin:123}]).status,'unavailable');
 assert.equal(run(good,[{harness:'/*'+'x'.repeat(262144)+'*/'}]).status,'unavailable');
 assert.equal(run(good,[{harness:'\n#include <forbidden.h>'}]).status,'unavailable');
 assert.equal(run(good+'/*'+'x'.repeat(33000)+'*/').status,'invalid');
 const bom=run('\ufeff'+good);assert.equal(evaluateContract(bom,contract).status,'accepted');
});
