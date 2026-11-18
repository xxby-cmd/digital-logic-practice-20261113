import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {dsSearchTaskGuides} from '../ds-search-task-guides.js';
import {dsSearchContract,dsSearchContractIds,dsSearchReferenceSources,dsSearchEquivalentSources,dsSearchWrongSources} from '../scripts/judge-ds-search-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS查找判题/',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex'),id=n=>`P4-structures-9-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:10},(_,i)=>id(i+1));
test('10个查找原任务的接口/公开解/独立评阅字段及驱动预算一致',()=>{
 assert.deepEqual(dsSearchContractIds,ids);assert.deepEqual(Object.keys(dsSearchTaskGuides),ids);assert.equal(dsSearchContract('missing'),null);
 for(const key of ids){const g=dsSearchTaskGuides[key],c=dsSearchContract(key);assert.equal(g.revision,2);for(const name of ['publicStatement','instruction','starter','solution'])assert.ok(g[name]?.length>20,key+':'+name);assert.equal(g.solution,dsSearchReferenceSources[key]);assert.equal(g.solution.includes('dss_'),false);assert.ok(c.prelude.endsWith('\n'));assert.ok(c.groups.length>0);assert.deepEqual(c.expected,c.groups.flat());assert.ok(Buffer.byteLength(c.prelude+c.harness)<262144);assert.ok(Buffer.byteLength(g.solution)<32768);assert.ok(c.groups.map(g=>g.join(' ')).join('\n').length<65536);assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsSearchContract(key))));}
 assert.equal(dsSearchTaskGuides[id(4)].manualReview,true);for(const key of ids.filter(k=>k!==id(4)))assert.notEqual(dsSearchTaskGuides[key].manualReview,true);
 assert.ok(dsSearchTaskGuides[id(3)].publicStatement.includes('任意一个公共键'));assert.ok(dsSearchTaskGuides[id(8)].publicStatement.includes('任一DELETED'));
 assert.ok(dsSearchTaskGuides[id(6)].publicStatement.includes('已有结点可被调用方保留别名'));assert.ok(dsSearchTaskGuides[id(9)].publicStatement.includes('幸存结点地址与key不变'));
});
test('每题多个核心错族和合法等价，逐组结果拒多余输出',()=>{
 const labels=new Set();for(const key of ids){const c=dsSearchContract(key),stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:stdout+'1\n'},c).status,'wrong_answer');assert.ok(dsSearchEquivalentSources.some(s=>s.id===key));assert.ok(dsSearchWrongSources.filter(s=>s.id===key).length>=3);}
 for(const s of [...dsSearchEquivalentSources,...dsSearchWrongSources]){assert.ok(ids.includes(s.id));assert.notEqual(s.source,dsSearchReferenceSources[s.id]);assert.ok(Buffer.byteLength(s.source)<32768);const label=s.id+':'+s.label;assert.ok(!labels.has(label));labels.add(label);}
 for(const n of [4,5])assert.ok(dsSearchContract(id(n)).harness.includes('x->pool+x->where[left[i]]'));
 assert.ok(dsSearchContract(id(5)).harness.includes('if(good)for(int i=0;i<count;i++)'));
 assert.ok(dsSearchWrongSources.some(s=>s.id===id(5)&&s.label==='inverted-range-returns-tree-size'));
 assert.ok(dsSearchContract(id(6)).prelude.includes('#define calloc dss_calloc'));assert.ok(dsSearchContract(id(9)).harness.includes('!dss_live[original[removed]]'));
 assert.ok(dsSearchContract(id(10)).harness.includes('512'));assert.ok(dsSearchContract(id(7)).harness.includes('256'));
});
export const dsSearchValidationSamples=[...ids.map(id=>({id,kind:'reference',source:dsSearchReferenceSources[id]})),...dsSearchEquivalentSources.map(s=>({...s,kind:'equivalent:'+s.label})),...dsSearchWrongSources.map(s=>({...s,kind:'wrong:'+s.label}))];
function execute(s){
 const c=dsSearchContract(s.id),workerSha256=hash(readFileSync(root+'scripts/judge-worker.py')),payload=c.variants?{source:s.source,variants:c.variants}:{source:s.source,prelude:c.prelude,harness:c.harness};
 const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,input:JSON.stringify(payload),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
 const raw=JSON.parse(child.stdout),{stdout,...r}=evaluateContract(raw,c);
 return {...r,id:s.id,kind:s.kind,sourceSha256:hash(s.source),contractSha256:hash(JSON.stringify(c)),workerSha256,rawStatus:raw.status,...(raw.status!=='ran'?{detail:(raw.stderr||raw.message||'').slice(0,2500),completedLines:raw.stdout?.split('\n').length-1}:{}),...(r.status==='wrong_answer'?{outputPreview:raw.stdout?.slice(0,160)}:{})};
}
test('真实C17查找10题参考/等价/核心错族串行核验',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_SEARCH_TARGETS?.split(',')||ids,referenceOnly=process.env.JUDGE_DS_SEARCH_ROLES==='reference',kinds=process.env.JUDGE_DS_SEARCH_KINDS?.split(','),results=[];let complete=false;
 try{for(const s of dsSearchValidationSamples)if(selected.includes(s.id)&&(!referenceOnly||s.kind==='reference')&&(!kinds||kinds.includes(s.kind))){const r=execute(s);results.push(r);if(s.kind.startsWith('wrong:'))assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));else assert.equal(r.status,'accepted',JSON.stringify(r));}complete=true;}
 finally{mkdirSync(evidence,{recursive:true});const filename=process.env.JUDGE_DS_SEARCH_EVIDENCE|| (referenceOnly?'参考初验.json':selected.length===10?'真实判题验证.json':'定向复核.json');assert.ok(/^[^\\/]+\.json$/.test(filename));writeFileSync(evidence+filename,JSON.stringify({time:new Date().toISOString(),complete,ids:selected,referenceOnly,groups:selected.reduce((s,id)=>s+dsSearchContract(id).groups.length,0),sourceSamples:results.length,sourceFiles:['ds-search-task-guides.js','scripts/judge-ds-search-contracts.mjs','tests/ds-search-judge.test.mjs'].map(path=>({path:root+path,sha256:hash(readFileSync(root+path))})),limits:['只核验有限本练习合法域，不证明折半/线性扫描/剪枝/探测次数、指定算法或渐近复杂度。','D004保留原迭代分析独立问，manualReview:true，分析在注释中随答案评阅。','公共键和可复用墓碑位置允许多解，不固定首个；非占用槽key不评分。','malloc族按标准实际申请/释放，失败仅在被测调用期间注入；先记分配实例与存活，再释放，不读已释放成员。','原bank、公共接线、版本快照、HTML及Git均未改。'],results},null,2)+'\n');}
});
