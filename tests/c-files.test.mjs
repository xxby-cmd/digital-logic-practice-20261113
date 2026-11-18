import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {cFilesPractice} from '../bank-c-files.js';
import {cFilesGuides} from '../c-files-guides.js';
import {cFilesContract,cFilesContractIds,cFilesReferenceSources,cFilesWrongSources,cFilesEquivalentSources,cFilesRunLengthCase,cFilesOverwriteTargets,cFilesRegressionSources} from '../scripts/judge-c-files.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
import {grade,normalize} from '../grading.js';
const bank=cFilesPractice.programming,root=fileURLToPath(new URL('../',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');

test('文件章选择题与当前已落地代码接口独立且自足',()=>{
 const choices=bank.filter(q=>q.type==='single'),code=bank.filter(q=>q.coding);
 assert.equal(choices.length,60);assert.equal(new Set(bank.map(q=>q.id)).size,bank.length);
 assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,bank.length);
 assert.deepEqual(new Set(Object.keys(cFilesGuides)),new Set(code.map(q=>q.id)));
 for(const id of cFilesContractIds){assert.ok(code.some(q=>q.id===id),id);assert.ok(cFilesGuides[id],id);}
 for(const q of bank){
  assert.equal(q.chapter,11);assert.equal(q.origin,'原创');assert.ok(q.mechanism);assert.ok(q.studyEvidence);
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  if(q.type==='single')for(let i=0;i<4;i++)assert.equal(grade(q,i).correct,i===q.answer,q.id);
  else{assert.equal(q.submissionKind,'program');assert.match(cFilesGuides[q.id].instruction,/完整C17程序/);assert.match(cFilesGuides[q.id].starter,/int main\(void\)/);}
 }
});
test('真实文件契约使用四独立配置、显式文件检查和server-only种子',()=>{
 for(const id of cFilesContractIds){
  const c=cFilesContract(id);assert.equal(c.variants.length,4,id);
  for(const v of c.variants){
   assert.ok(v.file_policy);assert.ok(v.fileChecks.length);assert.ok(typeof v.exactOutput==='string'||Array.isArray(v.groups));
   assert.ok(v.fileChecks.every(x=>v.file_policy.capture.includes(x.name)));
   assert.ok(Object.keys(v.file_policy.seeds).every(n=>v.file_policy.names.includes(n)));
  }
  assert.match(cFilesReferenceSources[id],/int main\(void\)/);assert.ok(Buffer.byteLength(cFilesReferenceSources[id])<=32768);
  assert.notEqual(cFilesWrongSources[id],cFilesReferenceSources[id]);
 }
 assert.equal(cFilesContract('unknown'),null);
 const c=cFilesContract('C6L-programming-11-P-025');
 const run=length=>({status:'variants',results:c.variants.map((v,i)=>({status:'ran',stdout:v.exactOutput,stderr:'',files:{'out.bin':{
  size:i===0?0:i===1?32:length,hex:Buffer.alloc(i===0?0:i===1?32:length,i===1?255:i===2?65:0).toString('hex')
 }}}))});
 assert.equal(evaluateContract(run(0),c).status,'accepted');
 assert.equal(evaluateContract(run(32),c).status,'accepted');
 assert.equal(evaluateContract(run(33),c).status,'wrong_answer');
});
function worker(payload){
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,input:JSON.stringify(payload),encoding:'utf8',
  env:{...process.env,PYTHONIOENCODING:'utf-8'},windowsHide:true,timeout:60000,maxBuffer:1048576});
 assert.equal(r.error,undefined);assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
}
test('P018完整协议：所有0到255计数字节分类、空文件和残缺记录',()=>{
 const allowed=new Set(Array.from({length:15},(_,i)=>i+1));
 for(let count=0;count<=255;count++){
  const c=cFilesRunLengthCase([count,65]),valid=allowed.has(count);
  assert.deepEqual(c.groups,valid?[['OK',String(count)]]:[['INVALID']],String(count));
  assert.equal(c.fileChecks.find(x=>x.name==='expanded.bin').expected,valid?Buffer.alloc(count,65).toString('hex'):'',String(count));
 }
 assert.deepEqual(cFilesRunLengthCase([]).groups,[['OK','0']]);
 assert.equal(cFilesRunLengthCase([]).fileChecks.find(x=>x.name==='expanded.bin').expected,'');
 assert.deepEqual(cFilesRunLengthCase([1,65,9]).groups,[['INVALID']]);
});
test('可覆盖输出的旧/缺失初态、合法最大输入和独立双流结束均有区分配置',()=>{
 for(const [id,names] of Object.entries(cFilesOverwriteTargets))for(const name of names){
  const variants=cFilesContract(id).variants;
  assert.ok(variants.some(v=>Object.hasOwn(v.file_policy.seeds,name)&&v.file_policy.seeds[name].length>0),id+' old '+name);
  assert.ok(variants.some(v=>!Object.hasOwn(v.file_policy.seeds,name)),id+' absent '+name);
 }
 for(const id of ['C6L-programming-11-P-025','C6L-programming-11-P-013','C6L-programming-11-B-014']){
  const forbidden=id.endsWith('P-025')?'out.bin':id.endsWith('P-013')?'temp.txt':'published.txt';
  assert.ok(cFilesContract(id).variants.every(v=>!Object.hasOwn(v.file_policy.seeds,forbidden)),id);
 }
 const blocks=cFilesContract('C6L-programming-11-B-007').variants.find(v=>v.stdin==='1\n'&&v.file_policy.seeds['data.bin'].length===8192);
 assert.ok(blocks);assert.equal(blocks.groups[0].length,4096);assert.ok(blocks.groups[0].every(x=>x==='1'));
 assert.ok(blocks.file_policy.limits.max_stream_bytes>=8192);assert.ok(blocks.file_policy.seeds['backup.bin']);
 const nums=cFilesContract('C6L-programming-11-P-001').variants.find(v=>v.file_policy.seeds['numbers.txt'].length===12000);
 assert.ok(nums);assert.equal(Buffer.from(nums.file_policy.seeds['numbers.txt'],'hex').toString('ascii').trim().split(/\s+/).length,1000);
 assert.ok(nums.file_policy.limits.max_file_bytes>=6000&&nums.file_policy.limits.max_capture_bytes>=6000);
 assert.ok(cFilesContract('C6L-programming-11-B-009').variants.some(v=>v.stdin.startsWith('-1 ')));
 const compare=cFilesContract('C6L-programming-11-P-006').variants;
 assert.ok(compare.some(v=>v.file_policy.seeds['a.bin'].length>v.file_policy.seeds['b.bin'].length));
 assert.ok(compare.some(v=>v.file_policy.seeds['a.bin'].length<v.file_policy.seeds['b.bin'].length));
});
test('当前文件题参考、核心错误及等价缓冲策略真实C17串行编译',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000
},()=>{
 const selected=process.env.C_FILES_TARGETS?process.env.C_FILES_TARGETS.split(','):cFilesContractIds,results=[];
 const check=(id,source,kind)=>{
  const contract=cFilesContract(id),raw=worker({source,variants:contract.variants}),judged=evaluateContract(raw,contract);
  const item={id,kind,sourceSha256:hash(source),contractSha256:hash(JSON.stringify(contract)),...judged,raw};results.push(item);return item;
 };
 try{
  if(process.env.C_FILES_EQUIVALENTS_ONLY!=='1'){
   for(const id of selected){assert.ok(cFilesContractIds.includes(id));assert.equal(check(id,cFilesReferenceSources[id],'reference').status,'accepted',id);}
   for(const id of selected)assert.equal(check(id,cFilesWrongSources[id],'typical-error').status,'wrong_answer',id);
   for(const id of selected)for(const {name,source} of cFilesRegressionSources[id]??[])assert.equal(check(id,source,'regression-error:'+name).status,'wrong_answer',id+' '+name);
  }
  for(const id of selected)for(const source of cFilesEquivalentSources[id]??[])assert.equal(check(id,source,'equivalent').status,'accepted',id);
 }finally{
  const report=process.env.C_FILES_REPORT??'40题真实文件核验.json';
  writeFileSync(new URL(`../../制作记录/并行扩题/C文件/${report}`,import.meta.url),JSON.stringify({time:new Date().toISOString(),selected,
   runtimeModuleSha256:hash(readFileSync(root+'scripts/judge_file_runtime.py')),results,
   limits:['每题四配置不能穷尽合法输入。','不按源码或算法逐字判等；文件错误时允许契约指定的不同合法前缀。']},null,2));
 }
});
test('P018合法空文件单独真实核验（不增加生产四配置）',{
 skip:process.env.C_FILES_EMPTY_CASE!=='1',timeout:60000
},()=>{
 const id='C6L-programming-11-P-018',source=cFilesReferenceSources[id],contract={variants:[cFilesRunLengthCase([])]};
 const raw=worker({source,variants:contract.variants}),judged=evaluateContract(raw,contract);
 writeFileSync(new URL('../../制作记录/并行扩题/C文件/P018合法空文件真实核验.json',import.meta.url),JSON.stringify({time:new Date().toISOString(),id,
  sourceSha256:hash(source),contractSha256:hash(JSON.stringify(contract)),contract,raw,...judged},null,2));
 assert.equal(judged.status,'accepted');
});
