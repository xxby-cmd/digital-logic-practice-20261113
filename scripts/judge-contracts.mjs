// Server-only hidden checks. Never copied into the standalone page.
import {arrayContract} from './judge-array-contracts.mjs';
import {examContract} from './judge-exam-contracts.mjs';
import {extraCContract} from './judge-c-practice-extra.mjs';
import {dsStackContract} from './judge-ds-stack-contracts.mjs';
import {cExpressionsContract} from './judge-c-expressions.mjs';
import {cControlContract} from './judge-c-control.mjs';
import {cFunctionsContract} from './judge-c-functions.mjs';
const ints=a=>`(int[]){${a.length?a.join(','):0}}`;
const arrays=[[],[1],[1,3,1],[1,2,3],[3,2,1],[2,2,2],[1,4,4,1],[0,-2,0,5,0],[3,1,3,2,1]];
const peak=a=>{for(let i=1;i<a.length-1;i++)if(a[i]>a[i-1]&&a[i]>a[i+1])return i;return-1;};
const runs=a=>a.length?1+a.slice(1).filter((x,i)=>x!==a[i]).length:0;
const specs={
 'P2-programming-6-12':{fn:'firstPeak',result:peak},
 'P2-programming-6-13':{fn:'countRuns',result:runs},
 'P3-programming-6-67':{fn:'nondecreasing',result:a=>Number(a.every((x,i)=>!i||a[i-1]<=x))},
 'P3-programming-6-57':{fn:'lastMin',result:a=>a.length?a.lastIndexOf(Math.min(...a)):-1}
};
export function judgeContract(id){
 const s=Object.hasOwn(specs,id)?specs[id]:null;if(!s)return arrayContract(id)||examContract(id)||extraCContract(id)||dsStackContract(id)||cExpressionsContract(id)||cControlContract(id)||cFunctionsContract(id);
 const tests=arrays.map(a=>({call:`${s.fn}(${ints(a)},${a.length})`,expected:String(s.result(a))}));
 return {harness:`\n#include <stdio.h>\nint main(void){\n${tests.map(t=>`printf("%d\\n",${t.call});`).join('\n')}\nreturn 0;}`,expected:tests.map(t=>t.expected),groups:tests.map(t=>[t.expected])};
}
export function evaluateContract(result,contract){
 if(contract.variants){
  if(result.status!=='variants')return result;
  const results=result.results,variants=contract.variants,total=variants.reduce((s,c)=>s+(c.groups?.length??c.expected.length),0);
  if(!Array.isArray(results)||!results.length||results.length>variants.length)return {status:'unavailable',message:'运行服务未返回完整配置结果。'};
  let passed=0;
  for(let i=0;i<results.length;i++){
   const one=evaluateContract(results[i],variants[i]);passed+=one.passed||0;
   if(!['accepted','wrong_answer'].includes(one.status))return {...one,passed,total};
  }
  if(results.length!==variants.length)return {status:'unavailable',message:'运行服务未完成全部配置。'};
  const accepted=passed===total;
  return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'部分测试未通过。',passed,total,stderr:results.map(r=>r.stderr||'').filter(Boolean).join('\n')};
 }
 if(result.status!=='ran')return result;
 if(contract.groups){
  const lines=result.stdout.replace(/\r/g,'').replace(/\n$/,'').split('\n'),total=contract.groups.length;
  let passed=contract.groups.filter((group,i)=>{const actual=(lines[i]??'').trim().split(/\s+/).filter(Boolean);return actual.length===group.length&&group.every((v,j)=>actual[j]===v);}).length;
  if(lines.length!==total&&passed===total)passed=Math.max(0,total-1);
  const accepted=passed===total&&lines.length===total;
  return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'部分测试未通过。',passed,total,stderr:result.stderr||''};
 }
 const actual=result.stdout.trim().split(/\s+/),passed=contract.expected.filter((v,i)=>actual[i]===v).length,total=contract.expected.length;
 const accepted=passed===total&&actual.length===total;
 return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'部分测试未通过。',passed,total,stderr:result.stderr||''};
}
