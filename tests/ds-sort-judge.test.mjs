import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {dsSortTaskGuides,dsSortTypes} from '../ds-sort-task-guides.js';
import {dsSortContract,dsSortContractIds,dsSortReferenceSources,dsSortEquivalentSources,dsSortWrongSources} from '../scripts/judge-ds-sort-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS内部排序判题/',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const id=n=>`P4-structures-10-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:9},(_,i)=>id(i+1));
const configs=c=>c.variants||[c];
test('内部排序9道既有题的自足revision2、功能边界及中性评阅说明',()=>{
 assert.deepEqual(dsSortContractIds,ids);assert.deepEqual(Object.keys(dsSortTaskGuides),ids);
 for(const key of ids){const g=dsSortTaskGuides[key],c=dsSortContract(key);assert.equal(g.revision,2);assert.ok(g.publicStatement.length>100);assert.ok(g.instruction.includes('不写main'));assert.ok(g.starter);assert.equal(g.solution,dsSortReferenceSources[key]);assert.ok(!JSON.stringify(g).includes('dss_'));assert.ok(!/同上|上一题/.test(g.publicStatement));assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsSortContract(key))));
  assert.ok(dsSortEquivalentSources.some(s=>s.id===key));assert.ok(dsSortWrongSources.filter(s=>s.id===key).length>=3);
  if([id(2),id(8)].includes(key)){assert.equal(g.manualReview,true);assert.ok(g.instruction.includes('随作答一并提交评阅'));assert.ok(!g.instruction.includes('自评'));}else assert.equal(g.manualReview,undefined);
  assert.ok(Buffer.byteLength(g.solution)<=32768);assert.ok(configs(c).length<=4);
  for(const one of configs(c)){assert.deepEqual(one.expected,one.groups.flat());assert.ok(Buffer.byteLength(one.prelude+one.harness)+32768<=262144,key);assert.ok(one.groups.length);const stdout=one.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout},one).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:stdout+'extra\n'},one).status,'wrong_answer');}
 }
 assert.equal(dsSortContract('missing'),null);assert.ok(dsSortTypes.record.includes('int key, identity'));
});
test('稳定性按原次序和完整记录核对，输入重叠/逻辑前缀不误当独立数据',()=>{
 for(const n of [1,2,3,4,7]){const g=dsSortTaskGuides[id(n)];assert.ok(g.publicStatement.includes('identity'));assert.ok(g.publicStatement.includes('重复'));const c=dsSortContract(id(n));for(const one of configs(c))assert.ok(!one.harness.includes('memcmp'));}
 const merge=dsSortContract(id(3));assert.ok(dsSortTaskGuides[id(3)].publicStatement.includes('输入可以同址或引用重叠片段'));assert.ok(merge.harness.includes('shared?a+1+offsetB'));assert.ok(merge.harness.includes('dss_merge(a,6,0,4,a,6,0,4'));
 const insert=dsSortTaskGuides[id(6)].publicStatement;assert.ok(insert.includes('允许不同的合法堆排列'));assert.ok(dsSortContract(id(6)).harness.includes('qsort(copy'));
 const select=dsSortTaskGuides[id(8)].publicStatement;assert.ok(select.includes('保留原多重集'));assert.ok(select.includes('不固定最终排列'));
 const inv=dsSortTaskGuides[id(9)].publicStatement;assert.ok(inv.includes('0≤n≤4096'));assert.ok(inv.includes('不要求最终a有序'));assert.ok(dsSortEquivalentSources.some(s=>s.label==='leave-input-in-original-order'));assert.ok(dsSortEquivalentSources.some(s=>s.label==='domain-safe-unsigned-accumulator'));assert.ok(!dsSortWrongSources.some(s=>/32-bit|int-accumulator/.test(s.label)));
});
test('排序配置保持数值极端、合法最大域、等键稳定和大小缓冲分离',()=>{
 for(const n of [1,2,4,5,7,8,9])assert.ok(configs(dsSortContract(id(n))).some(c=>c.harness.includes('-2147483648')),id(n));
 const count=configs(dsSortContract(id(7)));assert.ok(count.length>1);assert.ok(count.some(c=>c.harness.includes('2147483136,2147483647')));assert.ok(count.some(c=>c.harness.includes('-2147483648,-2147483137')));
 const large=configs(dsSortContract(id(9)));assert.equal(large.length,4);assert.ok(large[1].harness.includes('8386560LL'));assert.ok(large[3].harness.includes(',0LL)'));assert.ok(large.every(c=>c.harness.includes('i=n+1;i<physical+2')));
 const labels=new Set();for(const s of [...dsSortEquivalentSources,...dsSortWrongSources]){assert.ok(ids.includes(s.id));assert.ok(s.source.length>20);assert.ok(Buffer.byteLength(s.source)<=32768);assert.notEqual(s.source,dsSortReferenceSources[s.id]);assert.ok(!labels.has(s.id+':'+s.label));labels.add(s.id+':'+s.label);}
});
export const dsSortValidationSamples=[...ids.map(key=>({id:key,kind:'reference',source:dsSortReferenceSources[key]})),...dsSortEquivalentSources.map(s=>({...s,kind:'equivalent:'+s.label})),...dsSortWrongSources.map(s=>({...s,kind:'wrong:'+s.label}))];
function execute(sample){const c=dsSortContract(sample.id),workerSha256=hash(readFileSync(root+'scripts/judge-worker.py'));const payload=c.variants?{source:sample.source,variants:c.variants}:{source:sample.source,prelude:c.prelude,harness:c.harness};const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,input:JSON.stringify(payload),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);const raw=JSON.parse(child.stdout),{stdout,results,...result}=evaluateContract(raw,c);return {...result,id:sample.id,kind:sample.kind,sourceSha256:hash(sample.source),contractSha256:hash(JSON.stringify(c)),workerSha256,rawStatus:raw.status,configurations:configs(c).length,...(raw.status!=='ran'&&raw.status!=='variants'?{detail:raw.message||raw.stderr}:{}),...(result.status==='wrong_answer'?{outputPreview:raw.stdout?.slice(0,180)}:{})};}
test('真实C17-O1排序参考、等价与各题至少三个独立错误族',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_SORT_TARGETS?.split(',')||ids,roles=process.env.JUDGE_DS_SORT_ROLES,results=[];let complete=false;
 try{for(const sample of dsSortValidationSamples)if(selected.includes(sample.id)&&(!roles||sample.kind.startsWith(roles))){const r=execute(sample);results.push(r);console.log(sample.id,sample.kind,r.status,r.passed+'/'+r.total);if(sample.kind.startsWith('wrong:'))assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));else assert.equal(r.status,'accepted',JSON.stringify(r));}complete=true;}
 finally{mkdirSync(evidence,{recursive:true});writeFileSync(evidence+(roles?'定向-'+roles+'.json':selected.length===9?'真实判题验证.json':'定向复核.json'),JSON.stringify({time:new Date().toISOString(),complete,ids:selected,roles:roles||'all',sourceSamples:results.length,groups:Object.fromEntries(selected.map(key=>[key,configs(dsSortContract(key)).reduce((s,c)=>s+c.groups.length,0)])),sourceFiles:['ds-sort-task-guides.js','scripts/judge-ds-sort-contracts.mjs','tests/ds-sort-judge.test.mjs'].map(path=>({path:root+path,sha256:hash(readFileSync(root+path))})),limits:['仅九道既有原创题；尚未接公共目录/API/HTML，不包含第三方题目。','C17-O1、20M fuel、64MiB内存沿用现worker；最多四配置，各自真实重编，不使用fast-math或宿主探针。','稳定次序由JS显式原位置排序，逆序数由独立Fenwick秩统计；功能用例不形式证明原算法/复杂度。','D2/D8保留移动方向/等枢轴区间的独立分析并manualReview，代码测试通过不替代整题评阅。','D6只核追加后的合法堆与多重集，不固定布局；D8不固定分区结果；D9允许不改输入且不要求输出有序。','D9接口范围4096是本练习新设范围，不是教材上限；域内最大8386560，未声称已验证int32累计溢出。70000单例正常归并参考20M超限的预检另留证据。'],results},null,2)+'\n');}
});
