import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {cBasicsPractice} from '../bank-c-basics.js';
import {cBasicsGuides} from '../c-basics-guides.js';
import {cBasicsContract,cBasicsContractIds,cBasicsReferenceSources,cBasicsWrongSources,cBasicsEquivalentSources,cBasicsChoiceProbes} from '../scripts/judge-c-basics.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
import {grade,normalize} from '../grading.js';
import {getPracticeCourse} from '../practice-library.js';
const bank=cBasicsPractice.programming,root=fileURLToPath(new URL('../',import.meta.url));
const dir=fileURLToPath(new URL('../../制作记录/并行扩题/C顺序与输入输出/',import.meta.url));
const hash=source=>createHash('sha256').update(source).digest('hex');
const hashes=()=>Object.fromEntries(['bank-c-basics.js','c-basics-guides.js','scripts/judge-c-basics.mjs','tests/c-basics.test.mjs'].map(p=>[p,hash(readFileSync(root+p))]));
test('C2原创100：60选择、15完整程序填空、25程序与有据重点',()=>{
 assert.equal(bank.length,100);assert.equal(bank.filter(q=>q.type==='single').length,60);
 assert.equal(bank.filter(q=>q.section==='程序填空').length,15);assert.equal(bank.filter(q=>q.section==='编程题').length,25);
 assert.equal(new Set(bank.map(q=>q.id)).size,100);assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,100);
 const old=getPracticeCourse('programming').questions.filter(q=>!q.id.startsWith('C6B-'));
 for(const q of bank){
  assert.equal(q.chapter,2);assert.equal(q.origin,'原创');assert.ok(q.mechanism);assert.ok(q.studyEvidence.includes('第2章'));
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  assert.ok(!old.some(x=>x.id===q.id||normalize(x.stem)===normalize(q.stem)),q.id);
  assert.ok(!/沿用上一|同上|见前题/.test(q.stem),q.id);
  if(q.type==='single'){assert.equal(new Set(q.options).size,4);for(let i=0;i<4;i++)assert.equal(grade(q,i).correct,i===q.answer,q.id);}
  else{assert.equal(q.submissionKind,'program');assert.ok(cBasicsGuides[q.id].instruction.includes('完整C17程序'));assert.ok(cBasicsGuides[q.id].starter.includes('int main(void)'));}
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(q.explanation??q.model),q.id+'解析隐藏控制字符');
 }
 const explanation=n=>bank.find(q=>q.id===`C6B-programming-2-S-${String(n).padStart(3,'0')}`).explanation;
 assert.ok(explanation(19).includes('\\0'));assert.ok(explanation(20).includes('\\\\')&&explanation(20).includes('\\"'));
 assert.ok(explanation(21).includes('\\x41'));assert.ok(explanation(23).includes('\\n'));
 assert.ok(bank.filter(q=>q.studyLevel!=='supplement').length>=80);
});
test('40题各四组真实stdin，精确输出不以分词判断宽度或换行',()=>{
 assert.equal(cBasicsContractIds.length,40);assert.equal(Object.keys(cBasicsGuides).length,40);
 for(const id of cBasicsContractIds){
  const c=cBasicsContract(id);assert.equal(c.variants.length,4,id);
  assert.equal(new Set(c.variants.map(v=>v.stdin)).size,4,id);
  assert.ok(cBasicsReferenceSources[id].includes('int main(void)'));
  assert.ok(Buffer.byteLength(cBasicsReferenceSources[id])<=32768);
  const results=c.variants.map(v=>({status:'ran',stdout:v.exactOutput??v.groups.map(g=>g.join(' ')).join('\n')+'\n'}));
  assert.equal(evaluateContract({status:'variants',results},c).status,'accepted',id);
  if(c.variants[0].exactOutput!==undefined){
   const changed=structuredClone(results);changed[0].stdout+=' ';
   assert.equal(evaluateContract({status:'variants',results:changed},c).status,'wrong_answer',id);
   assert.match(bank.find(q=>q.id===id).stem,/换行|不另加/);
  }
 }
 assert.equal(cBasicsContract('unknown'),null);
 assert.equal(cBasicsContract('C6B-programming-2-P-009').variants[2].stdin,'A\nB');
 assert.equal(cBasicsContract('C6B-programming-2-P-009').variants[2].exactOutput,'A\nB');
});
function worker(payload){
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},windowsHide:true,timeout:45000});
 assert.equal(r.error,undefined);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
}
test('真实C17四输入：所选题参考、核心错解与等价标准I/O，逐题串行',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000
},()=>{
 const selected=process.env.C_BASICS_TARGETS?process.env.C_BASICS_TARGETS.split(','):cBasicsContractIds,results=[];
 const check=(id,source,kind)=>{const c=cBasicsContract(id),raw=worker({source,variants:c.variants}),r={id,kind,sourceSha256:hash(source),contractSha256:hash(JSON.stringify(c)),...evaluateContract(raw,c),...(raw.status!=='variants'?{raw}:{})};results.push(r);return r;};
 try{
  for(const id of selected){assert.ok(cBasicsContractIds.includes(id));assert.equal(check(id,cBasicsReferenceSources[id],'reference').status,'accepted',id);}
  for(const id of selected)assert.equal(check(id,cBasicsWrongSources[id],'typical-error').status,'wrong_answer',id);
  for(const id of selected){
   if(['C6B-programming-2-B-003',...['005','016','017','020'].map(n=>'C6B-programming-2-P-'+n)].includes(id)){
    const source=cBasicsReferenceSources[id].replace('double x','float x').replaceAll('%lf','%f');
    assert.equal(check(id,source,'precision-error').status,'wrong_answer',id);
   }
   if(id==='C6B-programming-2-P-025'){
    const source='#include <math.h>\n'+cBasicsReferenceSources[id].replace('double a=x*(1+r),b=a*(1+s);','double a=x*(1+r),shown=round(a*100)/100,b=shown*(1+s);');
    assert.equal(check(id,source,'precision-error').status,'wrong_answer',id);
   }
  }
  for(const id of selected)for(const source of cBasicsEquivalentSources[id])assert.equal(check(id,source,'equivalent').status,'accepted',id);
 }finally{
  mkdirSync(dir,{recursive:true});writeFileSync(dir+(process.env.C_BASICS_REPORT||(process.env.C_BASICS_TARGETS?'定向代码回归.json':'40题真实输入输出核验.json')),JSON.stringify({time:new Date().toISOString(),selected,sourceHashes:hashes(),results,limitations:['每题4输入不能穷尽所有合法数据。','不要求与参考源码、算法或填空骨架逐字一致。','没有执行原材料UB当数值验证。']},null,2));
 }
});
test('真实C17选择题：定义明确的短程序核对实际输出',{
 skip:process.env.JUDGE_RUNTIME!=='1'||Boolean(process.env.C_BASICS_TARGETS),timeout:180000
},()=>{
 const results=[];
 try{for(const p of cBasicsChoiceProbes){
  const r=worker({source:p.source,stdin:p.stdin}),item={id:p.id,sourceSha256:hash(p.source),status:r.status,expected:p.expected,actual:r.stdout,stderr:r.stderr};results.push(item);
  assert.equal(r.status,'ran',JSON.stringify(item));assert.equal(r.stdout,p.expected,JSON.stringify(item));
 }}finally{mkdirSync(dir,{recursive:true});writeFileSync(dir+'选择题真实核验.json',JSON.stringify({time:new Date().toISOString(),sourceHashes:hashes(),programs:cBasicsChoiceProbes.length,results},null,2));}
});
