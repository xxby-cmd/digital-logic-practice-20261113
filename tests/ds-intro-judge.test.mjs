import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {dsIntroTaskGuides,dsIntroTypes} from '../ds-intro-task-guides.js';
import {dsIntroContract,dsIntroContractIds,dsIntroReferenceSources,dsIntroWrongSources,dsIntroEquivalentSources} from '../scripts/judge-ds-intro-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const id=n=>`P4-structures-1-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:5},(_,i)=>id(i+1));
const project=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS绪论判题/',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
const caseGroup=(c,fragment)=>{
 const lines=c.harness.split('\n').filter(line=>line.startsWith('static void dsintro_case_'));
 const index=lines.findIndex(line=>line.includes(fragment));assert.ok(index>=0,fragment);return c.groups[index];
};

test('绪论5原题revision2、自足接口与私有判题预算一致',()=>{
 assert.deepEqual(dsIntroContractIds,ids);assert.deepEqual(Object.keys(dsIntroTaskGuides),ids);assert.deepEqual(dsIntroTypes,{});
 for(const questionId of ids){
  const guide=dsIntroTaskGuides[questionId],c=dsIntroContract(questionId);
  assert.equal(guide.revision,2);assert.ok(guide.publicStatement);assert.ok(guide.instruction.includes('不写main'));assert.ok(guide.starter);
  if([1,2,5].includes(Number(questionId.slice(-3)))){assert.equal(guide.manualReview,true);assert.ok(guide.instruction.includes('随作答一并提交评阅'));}else assert.equal(guide.manualReview,undefined);
  assert.equal(guide.solution,dsIntroReferenceSources[questionId]);assert.ok(!JSON.stringify(guide).includes('dsintro_'));assert.ok(!/上一题|同上|沿用/.test(guide.publicStatement));
  assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsIntroContract(questionId))));assert.deepEqual(c.expected,c.groups.flat());assert.ok(c.groups.length>=20);
  assert.ok(Buffer.byteLength(guide.solution)<32768);assert.ok(Buffer.byteLength(c.prelude+c.harness)<262144);assert.ok(Buffer.byteLength(c.groups.map(g=>g.join(' ')).join('\n'))<65536);
  const stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:stdout+'extra'},c).status,'wrong_answer');
  assert.ok(dsIntroWrongSources[questionId].length>=4);assert.ok(dsIntroEquivalentSources[questionId].length>=1);
 }
 assert.equal(dsIntroContract('unknown'),null);
});

test('独立边界包括空和、32位和上溢、空数组、全负和逻辑前缀',()=>{
 const sum=dsIntroContract(id(1));assert.deepEqual(caseGroup(sum,'iterativeSum(0)'),['0']);assert.deepEqual(caseGroup(sum,'iterativeSum(65536)'),['2147516416']);assert.deepEqual(caseGroup(sum,'iterativeSum(100000)'),['5000050000']);
 const extrema=dsIntroContract(id(2));assert.ok(extrema.groups.some(g=>g[0]==='-2147483648'&&g[1]==='-2147483648'));assert.ok(extrema.groups.some(g=>g[0]==='2147483647'&&g[1]==='2147483647'));assert.ok(extrema.groups.some(g=>g[0]==='-30'&&g[1]==='-10'));
 assert.deepEqual(caseGroup(extrema,'const int values[]={8,-4,7,-2147483648,2147483647,0};'),['-4','8','1','1']);assert.deepEqual(caseGroup(extrema,'const int values[]={8,-4,7,2147483647,-2147483648,-1,2};'),['-4','8','1','1']);
 const parity=dsIntroContract(id(3));assert.deepEqual(caseGroup(parity,'dsintro_array(values,1,0,'),['0','0','1','1']);assert.deepEqual(caseGroup(parity,'countParity(0,0,'),['0','0','1','1']);assert.ok(dsIntroTaskGuides[id(3)].publicStatement.includes('n=0时a可为NULL'));assert.ok(parity.groups.some(g=>g[0]==='4'&&g[1]==='0'));assert.ok(parity.groups.some(g=>g[0]==='0'&&g[1]==='4'));
 for(const n of [2,3]){const text=dsIntroTaskGuides[id(n)].publicStatement;for(const term of ['实际存储可能更长','只处理前n项','全部输入只读','彼此及与输入存储不重叠'])assert.ok(text.includes(term));}
});

test('完整int下标域和ULL精确位宽，方法与操作次数仍独立评阅',()=>{
 const c=dsIntroContract(id(4));
 for(const [n,i,want]of [[-2147483648,0,0],[0,0,0],[1,-1,0],[1,0,1],[1,1,0],[2147483647,2147483646,1],[2147483647,2147483647,0]])assert.deepEqual(caseGroup(c,`validIndex(${n},${i})`),[String(want)]);
 const log=dsIntroContract(id(5));
 for(const [n,want]of [['1',0],['10',3],['9007199254740991',52],['9007199254740992',53],['9223372036854775808',63],['18446744073709551615',63]])assert.deepEqual(caseGroup(log,`floorLog2(${n}ULL)`),[String(want)]);
 assert.ok(dsIntroTaskGuides[id(1)].publicStatement.includes('代码注释'));assert.ok(dsIntroEquivalentSources[id(1)].some(s=>s.label==='initialize-from-first-term'));
 assert.ok(dsIntroTaskGuides[id(5)].publicStatement.includes('ULLONG_MAX'));
});

export const dsIntroValidationSamples=ids.flatMap(questionId=>[
 {id:questionId,kind:'reference',source:dsIntroReferenceSources[questionId]},
 ...dsIntroEquivalentSources[questionId].map(s=>({id:questionId,kind:'equivalent:'+s.label,source:s.source})),
 ...dsIntroWrongSources[questionId].map(s=>({id:questionId,kind:'wrong:'+s.label,source:s.source}))
]);
function run(sample){
 const c=dsIntroContract(sample.id),workerSha256=hash(readFileSync(project+'scripts/judge-worker.py'));
 const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify({source:sample.source,prelude:c.prelude,harness:c.harness,stdin:''}),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
 const raw=JSON.parse(child.stdout),{stdout,results,...result}=evaluateContract(raw,c);
 return {...result,id:sample.id,kind:sample.kind,sourceSha256:hash(sample.source),contractSha256:hash(JSON.stringify(c)),workerSha256,rawStatus:raw.status,
  ...(raw.status!=='ran'?{detail:raw.message||raw.stderr}:{}),...(result.status==='wrong_answer'?{outputPreview:raw.stdout?.slice(0,180)}:{})};
}
test('真实C17-O1：指定题集的参考、等价与核心错码串行验证',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_INTRO_TARGETS?.split(',')||ids,roles=process.env.JUDGE_DS_INTRO_ROLES,results=[];let complete=false;
 try{
  for(const sample of dsIntroValidationSamples)if(selected.includes(sample.id)&&(!roles||sample.kind.startsWith(roles))){
   const result=run(sample);results.push(result);
   if(sample.kind.startsWith('wrong:'))assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(result.status),JSON.stringify(result));
   else assert.equal(result.status,'accepted',JSON.stringify(result));
   console.log(sample.id,sample.kind,result.status,result.passed+'/'+result.total);
  }
  complete=true;
 }finally{
  mkdirSync(evidence,{recursive:true});
  writeFileSync(evidence+(roles?'定向-'+roles+'.json':selected.length===5?'真实判题验证.json':'定向复核.json'),JSON.stringify({time:new Date().toISOString(),complete,ids:selected,roles:roles||'all',sourceSamples:results.length,questionGroups:Object.fromEntries(selected.map(questionId=>[questionId,dsIntroContract(questionId).groups.length])),sourceFiles:['ds-intro-task-guides.js','scripts/judge-ds-intro-contracts.mjs','tests/ds-intro-judge.test.mjs'].map(path=>({path:project+path,sha256:hash(readFileSync(project+path))})),limits:['仅5道既有原创题，不包含本地教材载荷；未接公共目录、未构建、未运行共享HTTP。','20M fuel/64MB、C17-O1沿用现worker，驱动与学生源码分别按现预算校验。','有限功能检查不能证明迭代、基本操作真实执行次数、无数据哨兵或复杂度。D1允许从首项初始化等合法迭代，次数在注释中说明并另行评阅；D1/D2/D5 manualReview:true，D3/D4纯功能自动计分。','数组只读/输出独立前提公开；逻辑n与物理额外存储独立；D3 n=0允许NULL并有独立例。','求和闭式BigInt、奇偶精确位、log2二进制位宽是独立JS真值，不以C参考输出生成期望。'],results},null,2)+'\n');
 }
});
