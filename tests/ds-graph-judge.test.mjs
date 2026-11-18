import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {dsGraphTaskGuides,dsGraphTypes} from '../ds-graph-task-guides.js';
import {dsGraphContract,dsGraphContractIds,dsGraphReferenceSources,dsGraphWrongSources,dsGraphEquivalentSources} from '../scripts/judge-ds-graph-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS图判题/',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
const id=n=>`P4-structures-7-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:9},(_,i)=>id(i+1));
test('9个原算法题接口修订独立且公开参考与真实提交相同',()=>{
 assert.deepEqual(dsGraphContractIds,ids);assert.deepEqual(Object.keys(dsGraphTaskGuides),ids);
 for(const key of ids){const guide=dsGraphTaskGuides[key],c=dsGraphContract(key);assert.equal(guide.revision,2);for(const field of ['publicStatement','instruction','starter','solution'])assert.ok(guide[field]?.length>30,key+': '+field);assert.equal(guide.solution,dsGraphReferenceSources[key]);assert.ok(!guide.solution.includes('dsg_'));assert.ok(!guide.instruction.includes('分析、正确性和成本分析仍需另行评阅'));assert.ok(c.prelude.includes('#include <stddef.h>'));assert.ok(c.prelude.endsWith('\n'));assert.ok(c.groups.length>0);assert.deepEqual(c.expected,c.groups.flat());assert.ok(Buffer.byteLength(c.prelude+c.harness)<=262144);assert.ok(Buffer.byteLength(guide.solution)<=32768);assert.ok(c.groups.map(g=>g.join(' ')).join('\n').length<65536);assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsGraphContract(key))));}
 assert.equal(dsGraphContract('missing'),null);
 assert.equal(dsGraphTaskGuides[id(6)].manualReview,true);assert.ok(dsGraphTaskGuides[id(6)].instruction.includes('不可达顶点的分析写在注释中'));
 for(const key of ids.filter(x=>x!==id(6)))assert.notEqual(dsGraphTaskGuides[key].manualReview,true);
 assert.ok(dsGraphTypes.graph.includes('const GArc *const *head'));
 assert.ok(dsGraphTaskGuides[id(3)].publicStatement.includes('无自环和重边'));assert.ok(dsGraphTaskGuides[id(4)].publicStatement.includes('不要求处理有环输入'));
 assert.ok(dsGraphTaskGuides[id(5)].publicStatement.includes('返回长度以外的输出尾区不评分'));assert.ok(dsGraphTaskGuides[id(7)].publicStatement.includes('对角及不可达项的next不评分'));
});
test('驱动逐组评分且拒多输出，独立错族与等价方案覆盖每题',()=>{
 for(const key of ids){const c=dsGraphContract(key),stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:stdout+'1\n'},c).status,'wrong_answer');assert.ok(dsGraphEquivalentSources.some(s=>s.id===key));assert.ok(dsGraphWrongSources.filter(s=>s.id===key).length>=3);}
 const labels=new Set();for(const sample of [...dsGraphWrongSources,...dsGraphEquivalentSources]){assert.ok(ids.includes(sample.id));assert.ok(sample.source.length>20);assert.ok(Buffer.byteLength(sample.source)<=32768);assert.notEqual(sample.source,dsGraphReferenceSources[sample.id]);const label=sample.id+':'+sample.label;assert.ok(!labels.has(label));labels.add(label);}
 for(const n of [1,3,4,8,9])assert.ok(dsGraphContract(id(n)).harness.includes('x->pool+x->where[q+1]'));
 assert.ok(dsGraphWrongSources.some(s=>s.id===id(1)&&s.label==='assumes-descending-contiguous-slots'));
 assert.ok(dsGraphContract(id(1)).harness.includes('1024'));assert.ok(dsGraphContract(id(2)).harness.includes('dsg_pool_index'));assert.ok(dsGraphContract(id(5)).harness.includes('weight!=expectedWeight'));assert.ok(dsGraphContract(id(7)).harness.includes('seen[at]'));assert.ok(dsGraphContract(id(8)).harness.includes('1000000000LL'));
});
export const dsGraphValidationSamples=[...ids.map(key=>({id:key,kind:'reference',source:dsGraphReferenceSources[key]})),...dsGraphEquivalentSources.map(s=>({...s,kind:'equivalent:'+s.label})),...dsGraphWrongSources.map(s=>({...s,kind:'wrong:'+s.label}))];
function execute(sample){
 const c=dsGraphContract(sample.id),workerSha256=hash(readFileSync(root+'scripts/judge-worker.py'));
 const payload=c.variants?{source:sample.source,variants:c.variants}:{source:sample.source,prelude:c.prelude,harness:c.harness};
 const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,input:JSON.stringify(payload),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
 let raw;try{raw=JSON.parse(child.stdout);}catch(error){throw Error('worker JSON: '+child.stdout.slice(0,800)+' '+error);}
 const {stdout,...out}=evaluateContract(raw,c);
 return {...out,id:sample.id,kind:sample.kind,sourceSha256:hash(sample.source),contractSha256:hash(JSON.stringify(c)),workerSha256,rawStatus:raw.status,...(raw.status!=='ran'?{detail:raw.stderr||raw.message,completedLines:raw.stdout?.split('\n').length-1}:{}),...(out.status==='wrong_answer'?{outputPreview:raw.stdout?.slice(0,160)}:{})};
}
test('真实C17图9参考/等价/多个错误族串行验证',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_GRAPH_TARGETS?.split(',')||ids,referenceOnly=process.env.JUDGE_DS_GRAPH_ROLES==='reference',kinds=process.env.JUDGE_DS_GRAPH_KINDS?.split(','),results=[];let complete=false;
 try{for(const sample of dsGraphValidationSamples)if(selected.includes(sample.id)&&(!referenceOnly||sample.kind==='reference')&&(!kinds||kinds.includes(sample.kind))){const r=execute(sample);results.push(r);if(sample.kind.startsWith('wrong:'))assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));else assert.equal(r.status,'accepted',JSON.stringify(r));}complete=true;}
 finally{mkdirSync(evidence,{recursive:true});writeFileSync(evidence+(referenceOnly?'参考初验.json':selected.length===9?'真实判题验证.json':'定向复核.json'),JSON.stringify({time:new Date().toISOString(),complete,ids:selected,referenceOnly,optimization:'C17 -O1; 20M fuel; 64MiB memory; unchanged worker',sourceSamples:results.length,groups:selected.reduce((s,key)=>s+dsGraphContract(key).groups.length,0),sourceFiles:['ds-graph-task-guides.js','scripts/judge-ds-graph-contracts.mjs','tests/ds-graph-judge.test.mjs'].map(path=>({path:root+path,sha256:hash(readFileSync(root+path))})),limits:['只核验有限合法域输入的功能，不自动证明DFS/BFS/最小堆/并查集/算法阶段及渐近复杂度。','图3和图9仅简单无向图；图4仅DAG；图7无负环；图8合法单源单汇AOE。没有用题外非法图强测。','最小生成森林不固定边集/顺序；Floyd不固定next表，对角及不可达next不评分；结构仅检查公开成员，不比较padding。','所有输入只读，逻辑前缀与更大物理缓冲分开；输出由调用方提供。除逆邻接表公开池所有权外，不新增malloc/free要求。','D006保留独立的不可达顶点原因分析，manualReview=true，代码可测但整题对照自评。'],results},null,2)+'\n');}
});
