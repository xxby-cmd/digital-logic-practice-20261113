import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import {createReviewHandler,reviewExecutionContractHash} from '../scripts/ai-grading.mjs';
import {createHash} from 'node:crypto';
import {judgeContract} from '../scripts/judge-contracts.mjs';
import {getPracticeCourse} from '../practice-library.js';
import {listenForFetch} from './helpers/http-listener.mjs';
test('默认合同签名与真实编译证据使用同一范围，纯笔答不改变旧缓存身份',()=>{
 const q=getPracticeCourse('structures').questions.find(q=>q.id==='P3-structures-3-97');assert.ok(q.manualReview);
 assert.equal(reviewExecutionContractHash(q,'c'),createHash('sha256').update(JSON.stringify(judgeContract(q.id,'c'))).digest('hex'));
 assert.equal(reviewExecutionContractHash({...q,manualReview:false},'c'),undefined);assert.equal(reviewExecutionContractHash(q,'java'),undefined);
 const adapted=getPracticeCourse('structures').questions.find(q=>q.id==='P4-structures-1-D-001');
 assert.equal(reviewExecutionContractHash(adapted,'java'),createHash('sha256').update(JSON.stringify(judgeContract(adapted.id,'java'))).digest('hex'));
 assert.notEqual(reviewExecutionContractHash(adapted,'java'),reviewExecutionContractHash(adapted,'c'));
});
test('编译合同变化后新请求重新取得功能证据，相同合同仍复用首份，不覆盖原回执',async()=>{
 const q=getPracticeCourse('structures').questions.find(q=>q.id==='P3-structures-3-97'),directory=await mkdtemp(path.join(os.tmpdir(),'course-ai-evidence-'));let version='contract-one',compiles=0,generations=0;
 const handler=createReviewHandler({cacheDirectory:directory,resolve:async()=>q,contractHash:()=>{if(version==='unavailable')throw Error('代码测试合同暂不可用');return version;},compile:async()=>{compiles++;return {status:version==='contract-one'?'accepted':'wrong_answer',passed:version==='contract-one'?1:0,total:1};},generate:async tasks=>{generations++;return JSON.stringify({reviews:tasks.map(({q,item,execution})=>({id:q.id,score:execution.status==='accepted'?item.points:0,feedback:'仅用于核验合同变更和缓存的模拟评阅，不代表模型评分质量。',criteria:q.rubric.map((_,index)=>({index,verdict:execution.status==='accepted'?'met':'missing',comment:'按此次功能证据模拟评分。'}))}))});}});
 const server=http.createServer((req,res)=>handler(req,res)),base=await listenForFetch(server),payload={subject:'structures',items:[{questionId:q.id,revision:q.revision,points:10,answer:'缓存协议测试的模拟代码',language:'c'}]};
 const post=async()=>{const r=await fetch(base+'/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,200);return (await r.json()).reviews[0];};
 try{
  const first=await post(),firstBytes=JSON.stringify(first),firstFile=(await readdir(directory)).find(p=>p.endsWith('.json')),saved=await readFile(path.join(directory,firstFile),'utf8');assert.equal(first.score,10);assert.equal(compiles,1);
  assert.deepEqual(await post(),first);assert.equal(compiles,1);
  version='contract-two';const second=await post();assert.equal(second.score,0,'新合同不可命中旧accepted缓存');assert.equal(second.execution.status,'wrong_answer');assert.equal(compiles,2);assert.equal(generations,2);
  assert.deepEqual(await post(),second);assert.equal(compiles,2);assert.equal(await readFile(path.join(directory,firstFile),'utf8'),saved);assert.equal(JSON.stringify(first),firstBytes);assert.equal((await readdir(directory)).filter(p=>p.endsWith('.json')).length,2);
  version='unavailable';const unavailable=await fetch(base+'/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});assert.equal(unavailable.status,503);assert.match((await unavailable.json()).message,/代码测试/);assert.equal(compiles,2);assert.equal(generations,2);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));const target=path.resolve(directory);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('course-ai-evidence-'));await rm(target,{recursive:true,force:true});}
});
