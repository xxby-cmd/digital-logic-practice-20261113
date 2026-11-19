// Server-only hidden checks. Never copied into the standalone page.
import {arrayContract} from './judge-array-contracts.mjs';
import {examContract} from './judge-exam-contracts.mjs';
import {extraCContract} from './judge-c-practice-extra.mjs';
import {dsStackContract} from './judge-ds-stack-contracts.mjs';
import {cExpressionsContract} from './judge-c-expressions.mjs';
import {cControlContract} from './judge-c-control.mjs';
import {cFunctionsContract} from './judge-c-functions.mjs';
import {cPointersContract} from './judge-c-pointers.mjs';
import {cRecordsContract} from './judge-c-records.mjs';
import {cPreprocessorContract} from './judge-c-preprocessor.mjs';
import {cBasicsContract} from './judge-c-basics.mjs';
import {dsLinearContract} from './judge-ds-linear-contracts.mjs';
import {dsStringContract} from './judge-ds-string-contracts.mjs';
import {dsArrayContract} from './judge-ds-array-contracts.mjs';
import {dsIntroContract} from './judge-ds-intro-contracts.mjs';
import {dsGraphContract} from './judge-ds-graph-contracts.mjs';
import {dsTreeContract} from './judge-ds-tree-contracts.mjs';
import {dsSortContract} from './judge-ds-sort-contracts.mjs';
import {dsSearchContract} from './judge-ds-search-contracts.mjs';
import {javaContract} from './judge-java-contracts.mjs';
import {evaluateFileChecks} from './judge-file-checks.mjs';
import {cFilesContract} from './judge-c-files.mjs';
import {cFileCodingIds} from '../c-file-availability.js';
const releasedFileCodes=new Set(cFileCodingIds);
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
export function judgeContract(id,language='c',forSamples=false){
 if(language==='java')return javaContract(id);
 if(language!=='c')return null;
 const s=Object.hasOwn(specs,id)?specs[id]:null;if(!s)return arrayContract(id)||examContract(id)||extraCContract(id)||dsStackContract(id)||dsLinearContract(id)||dsStringContract(id)||dsArrayContract(id)||dsIntroContract(id)||dsGraphContract(id)||dsTreeContract(id,forSamples)||dsSortContract(id)||dsSearchContract(id)||cExpressionsContract(id)||cControlContract(id)||cFunctionsContract(id,forSamples)||cPointersContract(id)||cRecordsContract(id)||cPreprocessorContract(id,forSamples)||cBasicsContract(id)||(releasedFileCodes.has(id)?cFilesContract(id):null);
 const tests=arrays.map(a=>({call:`${s.fn}(${ints(a)},${a.length})`,expected:String(s.result(a))}));
 return {harness:`\n#include <stdio.h>\nint main(void){\n${tests.map(t=>`printf("%d\\n",${t.call});`).join('\n')}\nreturn 0;}`,expected:tests.map(t=>t.expected),groups:tests.map(t=>[t.expected])};
}
const visibleExecution=result=>Object.fromEntries(Object.entries(result).filter(([key])=>['status','message','stdout','stderr'].includes(key)));
const caseCount=c=>(typeof c.exactOutput==='string'?1:(c.groups?.length??c.expected?.length??0))+(Array.isArray(c.fileChecks)?c.fileChecks.length:0);
export function evaluateContract(result,contract){
 if(contract.variants){
  if(result.status!=='variants')return visibleExecution(result);
  const results=result.results,variants=contract.variants,total=variants.reduce((s,c)=>s+caseCount(c),0);
  if(!Array.isArray(results)||!results.length||results.length>variants.length)return {status:'unavailable',message:'运行服务未返回完整配置结果。'};
  let passed=0,allAccepted=true;
  for(let i=0;i<results.length;i++){
   const one=evaluateContract(results[i],variants[i]);passed+=one.passed||0;allAccepted&&=one.status==='accepted';
   if(!['accepted','wrong_answer'].includes(one.status))return {...one,passed,total};
  }
  if(results.length!==variants.length)return {status:'unavailable',message:'运行服务未完成全部配置。'};
  const accepted=allAccepted&&passed===total;
  return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'部分测试未通过。',passed,total,stderr:results.map(r=>r.stderr||'').filter(Boolean).join('\n')};
 }
 if(result.status!=='ran')return visibleExecution(result);
 if(typeof result.stdout!=='string')return {status:'unavailable',message:'运行服务未返回完整程序输出。'};
 if(contract.fileChecks!==undefined){
  const captured=contract.file_policy?.capture??contract.file_policy?.writable;
  if(!Array.isArray(contract.fileChecks)||!Array.isArray(captured)||contract.fileChecks.some(check=>!check||!captured.includes(check.name)))return {status:'unavailable',message:'文件测试配置未声明完整取回集合。'};
 }
 const output=evaluateOutput(result,contract);
 if(output.status==='unavailable')return output;
 if(contract.fileChecks===undefined)return output;
 const files=evaluateFileChecks(result.files,contract.fileChecks);
 if(files.status==='unavailable')return files;
 const passed=output.passed+files.passed,total=output.total+files.total;
 const accepted=output.status==='accepted'&&files.status==='accepted';
 return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'程序输出或文件结果不符合要求。',passed,total,stderr:result.stderr||''};
}
function evaluateOutput(result,contract){
 if(typeof contract.exactOutput==='string'){
  const accepted=result.stdout===contract.exactOutput;
  return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'输出内容或格式不符合要求。',passed:Number(accepted),total:1,stderr:result.stderr||''};
 }
 if(contract.groups){
  const lines=result.stdout.replace(/\r/g,'').replace(/\n$/,'').split('\n'),total=contract.groups.length;
  let passed=contract.groups.filter((group,i)=>{const actual=(lines[i]??'').trim().split(/\s+/).filter(Boolean);return actual.length===group.length&&group.every((v,j)=>actual[j]===v);}).length;
  if(lines.length!==total&&passed===total)passed=Math.max(0,total-1);
  const accepted=passed===total&&lines.length===total;
  return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'部分测试未通过。',passed,total,stderr:result.stderr||''};
 }
 if(!Array.isArray(contract.expected))return Array.isArray(contract.fileChecks)&&contract.fileChecks.length?{status:'accepted',passed:0,total:0}:{status:'unavailable',message:'本题的测试配置尚未完整。'};
 const actual=result.stdout.trim().split(/\s+/),passed=contract.expected.filter((v,i)=>actual[i]===v).length,total=contract.expected.length;
 const accepted=passed===total&&actual.length===total;
 return {status:accepted?'accepted':'wrong_answer',message:accepted?'答案正确。':'部分测试未通过。',passed,total,stderr:result.stderr||''};
}
