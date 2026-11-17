import test from 'node:test';
import assert from 'node:assert/strict';
import {arrayContractIds,arrayContract} from '../scripts/judge-array-contracts.mjs';
import {judgeContract,evaluateContract} from '../scripts/judge-contracts.mjs';
import {hasJudgeContract} from '../coding-catalog.js';
import {getPracticeCourse} from '../practice-library.js';
import {examContractIds} from '../scripts/judge-exam-contracts.mjs';
import {fullExamPapers} from '../full-exams.js';
import {dsStackContractIds} from '../scripts/judge-ds-stack-contracts.mjs';
test('已开放判题题号必须有真实题目和服务端测试，不把客户端结果当答案',()=>{
 const bank=[...getPracticeCourse('programming').questions,...getPracticeCourse('structures').questions,...Object.values(fullExamPapers).flatMap(ps=>ps.flatMap(p=>p.questions))];
 for(const id of [...arrayContractIds,...examContractIds,...dsStackContractIds]){
  assert.ok(bank.some(q=>q.id===id),id);assert.ok(hasJudgeContract(id),id);
  const c=judgeContract(id);assert.ok(c.harness.includes('int main(void)'));assert.ok(c.expected.length>=9);
  const output=c.groups.map(g=>g.join(' ')).join('\n')+'\n';
  assert.equal(evaluateContract({status:'ran',stdout:output},c).status,'accepted');
  assert.equal(evaluateContract({status:'ran',stdout:output+'999\n'},c).status,'wrong_answer');
 }
 assert.equal(arrayContract('not-a-question'),null);
 for(const id of ['__proto__','constructor','toString'])assert.equal(judgeContract(id),null);
});
test('数组测试包含宽整数差值、稳定保序、单趟冒泡与连续去重的反例',()=>{
 assert.ok(arrayContract('P3-programming-6-61').expected.includes('-4294967295'));
 const contract=arrayContract('P3-programming-6-69');
 assert.ok(contract.harness.includes('3,2,1')); // Sorted output 1,2,3 must differ from one pass 2,1,3.
 assert.ok(arrayContract('P3-programming-6-80').harness.includes('3,1,3,2,1'));
});
test('现有C练习全部实质代码题都有服务端契约，别把解释型swap漏掉',()=>{
 const code=getPracticeCourse('programming').questions.filter(q=>q.coding);
 assert.equal(code.length,182); // 原50题＋表达式/控制结构/函数三章各44题。
 assert.ok(code.some(q=>q.id==='P-C-03'));
 for(const q of code){assert.equal(q.judge,true,q.id);assert.ok(judgeContract(q.id),q.id);}
});
