import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {appendFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {javaAlgorithmTaskGuides,javaAlgorithmTypes} from '../java-algorithm-task-guides.js';
import {javaAlgorithmContract,javaAlgorithmContractIds,javaAlgorithmCaseMetadata,javaAlgorithmReferenceSources,javaAlgorithmEquivalentSources,javaAlgorithmWrongSources,javaAlgorithmValidationSamples,javaAlgorithmOracles,javaAlgorithmInterfaceSpecs,javaAlgorithmExecutionConfig} from '../scripts/judge-java-algorithm-contracts.mjs';
import {dsIntroTaskGuides} from '../ds-intro-task-guides.js';
import {dsSortTaskGuides} from '../ds-sort-task-guides.js';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const intro=n=>`P4-structures-1-D-${String(n).padStart(3,'0')}`;
const sort=n=>`P4-structures-10-D-${String(n).padStart(3,'0')}`;
const expectedIds=[...Array.from({length:4},(_,i)=>intro(i+1)),...Array.from({length:9},(_,i)=>sort(i+1))];
const configs=c=>c.variants||[c];
const hash=x=>createHash('sha256').update(x).digest('hex');

test('仅JS结构：13个Java接口保留各题revision、原分析标记与完整Solution类',()=>{
 assert.deepEqual(javaAlgorithmContractIds,expectedIds);assert.deepEqual(Object.keys(javaAlgorithmTaskGuides),expectedIds);
 const cGuides={...dsIntroTaskGuides,...dsSortTaskGuides};
 for(const id of expectedIds){const guide=javaAlgorithmTaskGuides[id];
  assert.equal(guide.revision,[intro(1),sort(8)].includes(id)?3:2);assert.equal(guide.language,'java');assert.equal(guide.testable,true);assert.equal(guide.manualReview,!!cGuides[id].manualReview);
  for(const field of ['publicStatement','instruction','signature','methodName','starter','solution'])assert.ok(typeof guide[field]==='string'&&guide[field].length,id+' '+field);
  assert.match(guide.signature,/^public static /);assert.ok(guide.signature.includes(guide.methodName+'('));assert.ok(guide.publicStatement.includes(guide.signature));
  for(const source of [guide.starter,guide.solution]){assert.match(source,/public class Solution\s*\{/);assert.ok(source.includes(guide.methodName+'('));assert.ok(!/\bpackage\s+[a-zA-Z_]|\bstatic\s+void\s+main\s*\(|\bclass\s+SortRecord\b|#include|\btypedef\b|\bmalloc\s*\(/.test(source));assert.ok(Buffer.byteLength(source)<=32768);}
  assert.equal(guide.solution,javaAlgorithmReferenceSources[id]);assert.ok(!/自评|free|指针/.test(guide.instruction));assert.ok(!/case\d+|JudgeMain|inverseCase|sortCase/.test(JSON.stringify(guide)));
  if(guide.manualReview){assert.ok(guide.instruction.includes('分析写在代码注释中'));assert.ok(guide.instruction.includes('随作答一并提交评阅'));}
 }
 assert.deepEqual(expectedIds.filter(id=>javaAlgorithmTaskGuides[id].manualReview),[intro(1),intro(2),sort(2),sort(8)]);
 assert.ok(javaAlgorithmTaskGuides[intro(3)].publicStatement.includes('n=0时a可为null'));
 assert.ok(javaAlgorithmTypes.sortRecord.includes('final int key, identity'));
 assert.ok(javaAlgorithmTaskGuides[sort(4)].publicStatement.includes('其元素调用前可为null或任意记录'));
});

test('仅JS结构：Java驱动与最多4配置、文本分组和预算一致',()=>{
 for(const id of expectedIds){const c=javaAlgorithmContract(id),variants=configs(c);assert.ok(variants.length>=1&&variants.length<=4);assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(javaAlgorithmContract(id))));
  let groups=0,outputBytes=0;
  for(const v of variants){
   assert.deepEqual(v.expected,v.groups.flat());assert.match(v.harness,/^public class JudgeMain\s*\{/);assert.match(v.harness,/public static void main\(String\[\] args\)/);
   assert.ok(!/^\s*import\b/m.test(v.harness),'prelude类型之后不能出现Java import');assert.ok(!/#include|\bprintf\s*\(|\bqsort\s*\(|\bint\s+main\s*\(/.test(v.harness));
   assert.ok(Buffer.byteLength(v.prelude+'\n'+v.harness)<=262144,id);assert.ok(v.groups.every(g=>g.length>0&&g.every(s=>typeof s==='string'&&/^-?\d+$/.test(s))));
   groups+=v.groups.length;outputBytes+=Buffer.byteLength(v.groups.map(g=>g.join(' ')).join('\n')+'\n');
   if(v.harness.includes('SortRecord'))assert.equal(v.prelude,javaAlgorithmTypes.sortRecord);else assert.equal(v.prelude,'');
  }
  assert.equal(groups,javaAlgorithmCaseMetadata[id].length);assert.ok(groups>=20);assert.ok(outputBytes<65536);
  const results=variants.map(v=>({status:'ran',stdout:v.groups.map(g=>g.join(' ')).join('\n')+'\n'}));
  const raw=c.variants?{status:'variants',results}:results[0];assert.equal(evaluateContract(raw,c).status,'accepted');
  results.at(-1).stdout+='extra';assert.equal(evaluateContract(raw,c).status,'wrong_answer');
 }
 assert.equal(javaAlgorithmContract('unknown'),null);
});

test('可信接口schema逐题匹配公开静态签名，各variant独立继承并仅投影执行字段',()=>{
 const parseSignature=signature=>{
  const m=signature.match(/^public static (\w+(?:\[\])?) (\w+)\((.*)\)$/);assert.ok(m,signature);
  return {name:m[2],returnType:m[1],parameterTypes:m[3]?m[3].split(',').map(p=>{const item=p.trim().match(/^(\w+(?:\[\])?)\s+\w+$/);assert.ok(item,p);return item[1];}):[]};
 };
 assert.deepEqual(Object.keys(javaAlgorithmInterfaceSpecs),expectedIds);
 for(const id of expectedIds){const expected=parseSignature(javaAlgorithmTaskGuides[id].signature);assert.deepEqual(javaAlgorithmInterfaceSpecs[id],expected);
  for(const c of configs(javaAlgorithmContract(id))){
   assert.deepEqual(c.interfaceSpec,expected);assert.deepEqual(Object.keys(c.interfaceSpec),['name','returnType','parameterTypes']);
   const executable=javaAlgorithmExecutionConfig(c);assert.deepEqual(Object.keys(executable),['prelude','harness','stdin','interfaceSpec']);assert.deepEqual(executable.interfaceSpec,expected);assert.equal(executable.stdin,'');assert.equal('groups'in executable,false);assert.equal('expected'in executable,false);
   executable.interfaceSpec.parameterTypes[0]='String';assert.deepEqual(c.interfaceSpec,expected,'投影修改不能污染可信契约');
  }
 }
 const counting=javaAlgorithmContract(sort(7));assert.ok(counting.variants.length>1);counting.variants[0].interfaceSpec.parameterTypes[0]='String';assert.deepEqual(counting.variants[1].interfaceSpec,javaAlgorithmInterfaceSpecs[sort(7)]);assert.deepEqual(configs(javaAlgorithmContract(sort(7)))[0].interfaceSpec,javaAlgorithmInterfaceSpecs[sort(7)]);
 assert.notDeepEqual(parseSignature('public static int stableInsertion(SortRecord[] a,int n)'),javaAlgorithmInterfaceSpecs[sort(1)],'void不能被忽略返回值的int方法冒充');
 assert.notDeepEqual(parseSignature('public static String validIndex(int n,int i)'),javaAlgorithmInterfaceSpecs[intro(4)],'打印碰巧相同的String不是int接口');
 assert.notDeepEqual(parseSignature('public static int validIndex(long n,int i)'),javaAlgorithmInterfaceSpecs[intro(4)],'参数精确类型必须匹配');
 assert.throws(()=>javaAlgorithmExecutionConfig({harness:'public class JudgeMain {}'}),/缺少可信Java接口配置/);
});

test('独立JS数学核验：稳定按原次序、极值、多解与严格逆序',()=>{
 const input=[{key:2,identity:8},{key:1,identity:5},{key:2,identity:3},{key:2,identity:3}],before=structuredClone(input);
 assert.deepEqual(javaAlgorithmOracles.stableRecords(input),[{key:1,identity:5},{key:2,identity:8},{key:2,identity:3},{key:2,identity:3}]);assert.deepEqual(input,before);
 assert.deepEqual(javaAlgorithmOracles.sortedInts([2147483647,-2147483648,0]),[-2147483648,0,2147483647]);
 assert.equal(javaAlgorithmOracles.isMaxHeap([10,4,8,3,2,7,6]),true);assert.equal(javaAlgorithmOracles.isMaxHeap([10,4,8,3,2,7,9]),false);
 for(let n=0;n<=6;n++)for(let code=0;code<3**n;code++){let x=code,a=[];for(let i=0;i<n;i++){a.push(x%3-1);x=Math.floor(x/3);}let brute=0n;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(a[i]>a[j])brute++;assert.equal(javaAlgorithmOracles.inversions(a),brute);}
 assert.equal(javaAlgorithmOracles.inversions(Array.from({length:4096},(_,i)=>4096-i)),8386560n);assert.ok(8386560<2147483647);
});

test('覆盖Java数组边界，归并同数组不同前缀，工作区与等价实现',()=>{
 const metadata=javaAlgorithmCaseMetadata;
 assert.ok(metadata[intro(1)].some(c=>c.n===100000&&c.expected[0]==='5000050000'));
 assert.ok(metadata[intro(2)].some(c=>c.n<c.physical));assert.ok(metadata[intro(3)].some(c=>c.nullInput&&c.n===0));assert.ok(metadata[intro(3)].some(c=>c.n===0&&c.physical>0));
 assert.ok(metadata[sort(3)].some(c=>c.shared&&c.n!==c.m));assert.ok(!javaAlgorithmContract(sort(3)).harness.includes('offset'));
 assert.ok(metadata[sort(4)].some(c=>c.n===1023));assert.ok(metadata[sort(6)].some(c=>c.n===4&&c.value===80));
 assert.ok(metadata[sort(7)].some(c=>c.v===-2147483648&&c.range===512));assert.ok(metadata[sort(7)].some(c=>c.w===2147483647&&c.range===1));
 assert.ok(metadata[sort(8)].some(c=>c.n===1024&&c.k===1024));assert.ok(metadata[sort(9)].some(c=>c.n===4096&&c.inversions==='8386560'));
 assert.ok(javaAlgorithmEquivalentSources.some(s=>s.id===sort(1)&&s.label==='copy-equal-valued-records'));assert.ok(javaAlgorithmEquivalentSources.some(s=>s.id===sort(9)&&s.label==='preserve-input-prefix'));assert.ok(javaAlgorithmEquivalentSources.some(s=>s.id===sort(9)&&s.label==='domain-safe-int-accumulator'));
 for(const id of expectedIds){assert.ok(javaAlgorithmEquivalentSources.some(s=>s.id===id));const wrong=javaAlgorithmWrongSources.filter(s=>s.id===id);assert.ok(wrong.length>=3);assert.equal(new Set(wrong.map(s=>s.source)).size,wrong.length);}
 for(const sample of javaAlgorithmValidationSamples){assert.ok(expectedIds.includes(sample.id));assert.ok(Buffer.byteLength(sample.source)<=32768);assert.match(sample.source,/public class Solution\s*\{/);assert.ok(sample.source.includes(javaAlgorithmTaskGuides[sample.id].methodName+'('));assert.ok(!/class\s+SortRecord\b|#include|\btypedef\b/.test(sample.source));}
});

const project=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/Java首批算法判题/',import.meta.url));
const runtimePaths={worker:project+'scripts/judge-java-worker.py',helper:project+'scripts/java_appcontainer.py'};
const runtimeFingerprint=()=>Object.fromEntries(Object.entries(runtimePaths).map(([key,path])=>[key+'Sha256',hash(readFileSync(path))]));
const executionConfig=javaAlgorithmExecutionConfig;
const coreDisposition=r=>r.kind==='wrong'?['wrong_answer','runtime_error'].includes(r.status):r.status==='accepted';
test('Java21隔离worker真实编译/运行：按角色串行并保留JSON行证据',{skip:process.env.JUDGE_JAVA_RUNTIME!=='1',timeout:7200000},()=>{
 mkdirSync(evidence,{recursive:true});
 const fingerprint=runtimeFingerprint(),freezePath=evidence+'运行器冻结指纹.json';
 const jdkHome=process.env.JUDGE_JAVA_HOME||'C:/Program Files/Java/jdk-21',release=readFileSync(jdkHome+'/release','utf8');
 const javaVersion=release.match(/^JAVA_VERSION="([^"]+)"/m)?.[1],javaRuntimeVersion=release.match(/^JAVA_RUNTIME_VERSION="([^"]+)"/m)?.[1],javaReleaseSha256=hash(release);
 assert.ok(/^21(?:\.|$)/.test(javaVersion));
 const frozen={...fingerprint,javaVersion,javaRuntimeVersion,javaReleaseSha256};
 if(existsSync(freezePath)){
  const saved=JSON.parse(readFileSync(freezePath,'utf8'));assert.notEqual(saved.awaitingInterfaceProtocol,true,'等待可信接口验证协议的新运行器冻结，暂不运行Java。');
  assert.deepEqual(saved.runtime,frozen,'运行器指纹已改变，请暂停并由主线核验新版本后再续测。');
 }
 else writeFileSync(freezePath,JSON.stringify({time:new Date().toISOString(),runtime:frozen,paths:runtimePaths,jdkHome},null,2)+'\n');
 const historyPath=evidence+'Java实际运行.jsonl',history=existsSync(historyPath)?readFileSync(historyPath,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
 const roles=process.env.JUDGE_JAVA_ROLES?.split(',')||['reference','equivalent','wrong'];
 const selected=process.env.JUDGE_JAVA_IDS?.split(',')||expectedIds,labels=process.env.JUDGE_JAVA_LABELS?.split(',');
 const samples=javaAlgorithmValidationSamples.filter(s=>roles.includes(s.kind)&&selected.includes(s.id)&&(!labels||labels.includes(s.label)));
 assert.ok(samples.length>0);const results=[];let complete=false;
 try{
  for(const sample of samples){
   assert.deepEqual(runtimeFingerprint(),fingerprint,'运行器变化，暂停后续运行。');
   const c=javaAlgorithmContract(sample.id),contractSha256=hash(JSON.stringify(c)),sourceSha256=hash(sample.source);
   const cached=history.findLast(r=>r.id===sample.id&&r.kind===sample.kind&&r.label===sample.label&&r.sourceSha256===sourceSha256&&r.contractSha256===contractSha256&&r.workerSha256===fingerprint.workerSha256&&r.helperSha256===fingerprint.helperSha256&&r.javaReleaseSha256===javaReleaseSha256&&coreDisposition(r));
   if(cached){results.push({...cached,reused:true});console.log(JSON.stringify({id:sample.id,kind:sample.kind,label:sample.label,status:cached.status,reused:true}));continue;}
   const payload=c.variants?{language:'java',source:sample.source,variants:c.variants.map(executionConfig),trusted_driver:true}:{language:'java',source:sample.source,...executionConfig(c),trusted_driver:true};
   const started=performance.now(),child=spawnSync(process.env.JUDGE_PYTHON||fileURLToPath(new URL('../../制作记录/判题运行环境/python/Scripts/python.exe',import.meta.url)),['scripts/judge-java-worker.py'],{cwd:project,input:JSON.stringify(payload),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:150000,windowsHide:true});
   const elapsedMs=Math.round(performance.now()-started);let raw;
   try{raw=JSON.parse(child.stdout||'');}catch{raw={status:'worker_protocol_error',stdout:child.stdout||'',stderr:child.stderr||''};}
   const unchanged=JSON.stringify(runtimeFingerprint())===JSON.stringify(fingerprint);
   const evaluated=evaluateContract(raw,c),{stdout,results:privateResults,...summary}=evaluated;
   const rawConfigs=raw.status==='variants'?raw.results||[]:[raw],contractConfigs=configs(c);
   const perConfiguration=rawConfigs.map((r,i)=>{const judged=contractConfigs[i]?evaluateContract(r,contractConfigs[i]):{status:'unavailable'};return {index:i,rawStatus:r.status,status:judged.status,passed:judged.passed,total:judged.total,message:r.message,stderr:r.stderr};});
   const result={time:new Date().toISOString(),id:sample.id,kind:sample.kind,label:sample.label,...summary,rawStatus:raw.status,sourceSha256,contractSha256,...fingerprint,javaVersion,javaRuntimeVersion,javaReleaseSha256,configurationCount:contractConfigs.length,configurations:perConfiguration,elapsedMs,workerExitCode:child.status,workerSignal:child.signal,workerSpawnError:child.error?String(child.error):undefined,runtimeUnchanged:unchanged,raw};
   appendFileSync(historyPath,JSON.stringify(result)+'\n');results.push(result);
   console.log(JSON.stringify({id:result.id,kind:result.kind,label:result.label,status:result.status,configurations:result.configurations.map(r=>({status:r.status,passed:r.passed,total:r.total})),elapsedMs,sourceSha256,contractSha256,...fingerprint}));
   assert.equal(child.error,undefined,'隔离worker调用失败；不归学生错误。');assert.equal(child.status,0,'worker异常退出；不归学生错误。');assert.equal(unchanged,true,'运行期间worker/helper发生变更，暂停核对。');
   if(sample.kind==='wrong'){
    assert.notEqual(result.status,'compile_error','算法错码不能以编译失败计为功能拦截：'+sample.label);
    assert.ok(coreDisposition(result),JSON.stringify({id:result.id,label:result.label,status:result.status,configurations:result.configurations}));
   }else{
    assert.equal(result.status,'accepted',JSON.stringify({id:result.id,label:result.label,status:result.status,configurations:result.configurations}));
    assert.equal(perConfiguration.length,contractConfigs.length);assert.ok(perConfiguration.every(r=>r.status==='accepted'));
   }
  }
  complete=true;
 }finally{
  const phase=roles.join('-'),path=evidence+'Java实编-'+phase+'.json';
  writeFileSync(path,JSON.stringify({time:new Date().toISOString(),complete,roles,ids:selected,runtime:frozen,javaVersion,javaRuntimeVersion,sourceFiles:['java-algorithm-task-guides.js','scripts/judge-java-algorithm-contracts.mjs','tests/java-algorithms.test.mjs'].map(path=>({path,sha256:hash(readFileSync(project+path))})),plannedSamples:samples.length,executedSamples:results.filter(r=>!r.reused).length,reusedSamples:results.filter(r=>r.reused).length,results},null,2)+'\n');
 }
});
