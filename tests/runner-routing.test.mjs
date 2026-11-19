import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {javaAlgorithmContract} from '../scripts/judge-java-algorithm-contracts.mjs';
const request=(data,url='/api/run')=>Object.assign(Readable.from([Buffer.from(JSON.stringify(data))]),{method:'POST',url,headers:{'content-type':'application/json'}});
const response=()=>({writeHead(status){this.status=status;},end(body){this.data=JSON.parse(body||'null');}});
async function fixture(){
 const children=[],timers=[];globalThis.__routingSpawn=(binary,args)=>{const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr={resume(){}};child.stdin=new EventEmitter();child.stdin.end=body=>{child.payload=JSON.parse(body);};child.kill=()=>{child.killed=true;};Object.assign(child,{binary,args});children.push(child);return child;};
 globalThis.__routingTimer=(callback,ms)=>{timers.push({callback,ms});return 0;};
 const previous={python:process.env.JUDGE_PYTHON,zig:process.env.JUDGE_ZIG,sdk:process.env.JUDGE_SDK};process.env.JUDGE_PYTHON='test-python';delete process.env.JUDGE_ZIG;delete process.env.JUDGE_SDK;
 const source=(await readFile(new URL('../scripts/run-api.mjs',import.meta.url),'utf8'))
  .replace("import {spawn} from 'node:child_process';",'const spawn=globalThis.__routingSpawn;')
  .replace(/from '(\.\/[^']+)'/g,(_,module)=>`from ${JSON.stringify(new URL(module,new URL('../scripts/run-api.mjs',import.meta.url)).href)}`)
  .replace('const timer=setTimeout(','const timer=globalThis.__routingTimer(');
 const api=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// fixture '+Math.random()).toString('base64'));
 return {...api,children,timers,close(){for(const key of ['JUDGE_PYTHON','JUDGE_ZIG','JUDGE_SDK']){const value=previous[{JUDGE_PYTHON:'python',JUDGE_ZIG:'zig',JUDGE_SDK:'sdk'}[key]];if(value===undefined)delete process.env[key];else process.env[key]=value;}delete globalThis.__routingSpawn;delete globalThis.__routingTimer;}};
}
test('Java独立选运行器和受信执行字段，不受缺C编译器阻挡或接纳客户端配置',async()=>{
 const f=await fixture();try{
  const res=response(),id='P4-structures-10-D-007';await f.handleRun(request({language:'java',questionId:id,source:'public class Solution {}',harness:'untrusted',variants:[{harness:'untrusted'}],interfaceSpec:{name:'untrusted',returnType:'void',parameterTypes:[]},env:{SECRET:'untrusted'}},'/api/judge'),res,4174);
  assert.equal(f.children.length,1);const c=f.children[0];assert.ok(c.args[0].endsWith('judge-java-worker.py'));assert.equal(c.payload.language,'java');assert.equal(c.payload.trusted_driver,true);
  assert.ok(c.payload.variants.length>1);for(const config of c.payload.variants){assert.deepEqual(Object.keys(config).toSorted(),['harness','interfaceSpec','prelude','stdin']);assert.deepEqual(config.interfaceSpec,javaAlgorithmContract(id).interfaceSpec);}assert.ok(!JSON.stringify(c.payload).includes('untrusted'));assert.equal(c.payload.env,undefined);
  const contract=javaAlgorithmContract(id);c.stdout.emit('data',Buffer.from(JSON.stringify({status:'variants',results:contract.variants.map(v=>({status:'ran',stdout:v.groups.map(g=>g.join(' ')).join('\n')+'\n',stderr:''}))})));c.emit('close',0,null);
  assert.equal(res.status,200);assert.equal(res.data.status,'accepted');assert.equal(res.data.total,162);assert.ok(!JSON.stringify(res.data).includes('JudgeMain'));
  const unknown=response();await f.handleRun(request({language:'unknown',source:'x'}),unknown,4174);assert.equal(unknown.status,400);assert.equal(f.children.length,1);
 }finally{f.close();}
});
test('父服务总截止属于服务故障，C与Java均保留待判，学生限时由运行器单独报告',async()=>{
 for(const language of ['c','java']){const f=await fixture();try{
  process.env.JUDGE_ZIG='test-zig';const res=response();await f.handleRun(request({language,source:'code'}),res,4174);assert.equal(f.children.length,1);assert.equal(f.timers[0].ms,language==='java'?150000:22000);f.timers[0].callback();
  assert.equal(f.children[0].killed,true);assert.equal(res.status,503);assert.equal(res.data.status,'unavailable');
  // Late successful JSON cannot overwrite the transport failure.
  f.children[0].stdout.emit('data',Buffer.from('{"status":"ran","stdout":"ok"}'));f.children[0].emit('close',0,null);assert.equal(res.data.status,'unavailable');
 }finally{f.close();}}
});

test('父服务协议结果超量保待判，学生程序输出上限由运行器独立报告',async()=>{
 for(const language of ['c','java']){const f=await fixture();try{
  process.env.JUDGE_ZIG='test-zig';const res=response();await f.handleRun(request({language,source:'code'}),res,4174);
  f.children[0].stdout.emit('data',Buffer.alloc((language==='java'?524288:200000)+1,97));
  assert.equal(f.children[0].killed,true);assert.equal(res.status,503);assert.equal(res.data.status,'unavailable');
  f.children[0].emit('close',0,null);assert.equal(res.data.status,'unavailable');
 }finally{f.close();}}
});
