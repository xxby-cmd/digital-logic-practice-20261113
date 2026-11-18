import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {dsTreeTaskGuides} from '../ds-tree-task-guides.js';
import {dsTreeContract,dsTreeContractIds,dsTreeReferenceSources,dsTreeWrongSources,dsTreeEquivalentSources,dsTreeOracles,dsTreeCaseSets} from '../scripts/judge-ds-tree-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS树判题/',import.meta.url));
const hash=s=>createHash('sha256').update(s).digest('hex');
const id=n=>`P4-structures-6-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:8},(_,i)=>id(i+1));

test('原树8算法题接口、输出域及公开资料与判题资料分离',()=>{
 assert.deepEqual(dsTreeContractIds,ids);assert.deepEqual(Object.keys(dsTreeTaskGuides),ids);
 for(const key of ids){const guide=dsTreeTaskGuides[key],c=dsTreeContract(key);assert.equal(guide.revision,2);for(const field of ['publicStatement','instruction','starter','solution'])assert.ok(guide[field]?.length>30,key+': '+field);assert.equal(guide.solution,dsTreeReferenceSources[key]);assert.ok(!JSON.stringify(guide).includes('treeJudge_'));assert.ok(!guide.instruction.includes('另行评阅'));assert.ok(c.prelude.includes('#include <stddef.h>'));assert.ok(c.groups.length>0);assert.deepEqual(c.expected,c.groups.flat());assert.ok(Buffer.byteLength(c.prelude+c.harness+guide.solution)<=262144);assert.ok(Buffer.byteLength(guide.solution)<=32768);assert.ok(c.groups.map(g=>g.join(' ')).join('\n').length<65536);assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsTreeContract(key))));}
 assert.equal(dsTreeContract('missing'),null);
 assert.equal(dsTreeTaskGuides[id(7)].manualReview,true);assert.ok(dsTreeTaskGuides[id(7)].instruction.includes('随作答一并提交评阅'));assert.ok(!dsTreeTaskGuides[id(7)].instruction.includes('自评'));
 for(const key of ids.filter(x=>x!==id(7)))assert.notEqual(dsTreeTaskGuides[key].manualReview,true);
 assert.ok(dsTreeTaskGuides[id(2)].publicStatement.includes('不限定池内排列'));assert.ok(dsTreeTaskGuides[id(2)].publicStatement.includes('只处理前n项'));
 assert.ok(dsTreeTaskGuides[id(4)].publicStatement.includes('尾区不作要求'));assert.ok(dsTreeTaskGuides[id(7)].publicStatement.includes('其他尾区不作要求'));
 assert.ok(dsTreeTaskGuides[id(5)].publicStatement.includes('parent[0]'));assert.ok(dsTreeTaskGuides[id(6)].publicStatement.includes('不把root的nextSibling'));
});
test('驱动独立分组、拒绝额外输出，8题均有等价及三种错族',()=>{
 for(const key of ids){const c=dsTreeContract(key),stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:stdout+'1\n'},c).status,'wrong_answer');assert.ok(dsTreeEquivalentSources.some(s=>s.id===key));assert.ok(dsTreeWrongSources.filter(s=>s.id===key).length>=3);}
 const labels=new Set();for(const sample of [...dsTreeWrongSources,...dsTreeEquivalentSources]){assert.ok(ids.includes(sample.id));assert.ok(sample.source.length>20);assert.ok(Buffer.byteLength(sample.source)<=32768);assert.notEqual(sample.source,dsTreeReferenceSources[sample.id]);const label=sample.id+':'+sample.label;assert.ok(!labels.has(label));labels.add(label);}
});
test('独立JS预言机核对小树、重复值、并列路径和忽略根兄弟',()=>{
 const o=dsTreeOracles;
 const g={value:[7,7,7,0,0],left:[1,3,4,-1,-1],right:[2,-1,-1,-1,-1],root:0};
 assert.deepEqual(o.allPaths(g),[[0,1,3],[0,2,4]]);assert.deepEqual(o.longest(g),[0,1,3]);assert.equal(o.width(g),2);assert.equal(o.balanced(g),1);
 assert.equal(o.parentLca([999,3,3,0,1],4,1,4),1);assert.equal(o.parentLca([999,3,3,0,1],4,2,4),3);assert.equal(o.parentLca([999,3,3,0,1],4,2,2),2);assert.equal(o.parentLca([999,3,3,0,1],4,-2147483648,4),0);
 assert.equal(o.orderedHeight({root:0,first:[-1,2,3,-1],next:[1,-1,-1,-1]}),1);
 assert.ok(dsTreeCaseSets.binary.some(x=>x.value.length===256));assert.ok(dsTreeCaseSets.binary.some(x=>x.root>0));assert.ok(dsTreeCaseSets.binary.some(x=>new Set(x.value).size<x.value.length));
 assert.ok(dsTreeCaseSets.parents.some(x=>x.p===x.q&&x.p>0));assert.ok(dsTreeCaseSets.parents.some(x=>x.p===-2147483648));assert.ok(dsTreeCaseSets.paths.some(x=>x.value.length===256));
});
test('孩子表并查集预言机与独立有向可达检查穷举n≤3一致',()=>{
 function directed(L,R,n){if(!n)return 0;const incoming=Array(n+1).fill(0);for(let i=1;i<=n;i++)for(const c of [L[i],R[i]]){if(c<0||c>n)return 0;if(c&&++incoming[c]>1)return 0;}const roots=Array.from({length:n},(_,i)=>i+1).filter(x=>!incoming[x]);if(roots.length!==1)return 0;const seen=new Set(),todo=[roots[0]];while(todo.length){const x=todo.pop();if(seen.has(x))return 0;seen.add(x);for(const c of [L[x],R[x]])if(c)todo.push(c);}return Number(seen.size===n);}
 for(let n=0;n<=3;n++){const base=n+1,total=base**(2*n);for(let code=0;code<total;code++){let remaining=code;const L=Array(n+1).fill(0),R=Array(n+1).fill(0);for(let i=1;i<=n;i++){L[i]=remaining%base;remaining=Math.floor(remaining/base);R[i]=remaining%base;remaining=Math.floor(remaining/base);}assert.equal(dsTreeOracles.validTable(L,R,n),directed(L,R,n),JSON.stringify({L,R,n}));}}
 for(const [L,R,n]of [[[9,0,3,2],[8,0,0,0],3],[[0,-2147483648],[0,0],1],[[0,2147483647],[0,0],1]])assert.equal(dsTreeOracles.validTable(L,R,n),0);
});
export const dsTreeValidationSamples=[...ids.map(key=>({id:key,kind:'reference',source:dsTreeReferenceSources[key]})),...dsTreeEquivalentSources.map(s=>({...s,kind:'equivalent:'+s.label})),...dsTreeWrongSources.map(s=>({...s,kind:'wrong:'+s.label}))];
function execute(sample){
 const c=dsTreeContract(sample.id),workerSha256=hash(readFileSync(root+'scripts/judge-worker.py'));
 const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,input:JSON.stringify({source:sample.source,prelude:c.prelude,harness:c.harness}),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);let raw;try{raw=JSON.parse(child.stdout);}catch(error){throw Error('worker JSON: '+child.stdout.slice(0,800)+' '+error);}
 const {stdout,...out}=evaluateContract(raw,c);return {...out,id:sample.id,kind:sample.kind,sourceSha256:hash(sample.source),contractSha256:hash(JSON.stringify(c)),workerSha256,rawStatus:raw.status,...(raw.status!=='ran'?{detail:raw.stderr||raw.message}:{}),...(out.status==='wrong_answer'?{outputPreview:raw.stdout?.slice(0,160)}:{})};
}
test('实际C17树8参考、合法等价、可编译错解实测',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_TREE_TARGETS?.split(',')||ids,kinds=process.env.JUDGE_DS_TREE_KINDS?.split(','),results=[];let complete=false;
 try{for(const sample of dsTreeValidationSamples)if(selected.includes(sample.id)&&(!kinds||kinds.includes(sample.kind))){const r=execute(sample);results.push(r);console.log(JSON.stringify({id:r.id,kind:r.kind,status:r.status,passed:r.passed,total:r.total}));if(sample.kind.startsWith('wrong:'))assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));else assert.equal(r.status,'accepted',JSON.stringify(r));}complete=true;}
 finally{mkdirSync(evidence,{recursive:true});writeFileSync(evidence+(kinds||selected.length!==8?'定向复核.json':'真实判题验证.json'),JSON.stringify({time:new Date().toISOString(),complete,ids:selected,kinds:kinds||'all',optimization:'C17 -O1; 20M fuel; 64MiB memory; unchanged worker',sourceSamples:results.length,groups:selected.reduce((s,key)=>s+dsTreeContract(key).groups.length,0),sourceFiles:['ds-tree-task-guides.js','scripts/judge-ds-tree-contracts.mjs','tests/ds-tree-judge.test.mjs'].map(path=>({path:root+path,sha256:hash(readFileSync(root+path))})),limits:['有限黑盒测试仅核验运行结果、输入只读及公开输出域，不证明一次后序、均摊O(n)或其他渐近复杂度。','D7分析包含输出量L，manualReview保留；代码测试可用，不凭accepted自动认定完整论述。','结构检查允许重建池任意布局、指针身份路径及重复值路径；不比较padding，不要求尾区保留，不规定题面外的分配顺序。','普通二叉树均为合法树；只有孩子表验证题故意测试非法编号、重复孩子、环与断开的环。','第三方教材95道算法参考独立留在本地，本模块只修订8道已存在原创题，无题数增长。'],results},null,2)+'\n');}
});
