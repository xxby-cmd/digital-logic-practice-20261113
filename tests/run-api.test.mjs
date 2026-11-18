import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';

test('并发请求只启动一个程序，输入按UTF8恢复且自测不能注入受信驱动',async()=>{
 const children=[];
 globalThis.__practiceTestSpawn=()=>{
  const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr={resume(){}};c.stdin=new EventEmitter();c.stdin.end=body=>{c.body=JSON.parse(body);};c.kill=()=>{};children.push(c);return c;
 };
 process.env.JUDGE_PYTHON='test-python';process.env.JUDGE_ZIG='test-zig';
 const source=(await readFile(new URL('../scripts/run-api.mjs',import.meta.url),'utf8'))
  .replace("import {spawn} from 'node:child_process';",'const spawn=globalThis.__practiceTestSpawn;')
  .replace("'./judge-contracts.mjs'",JSON.stringify(new URL('../scripts/judge-contracts.mjs',import.meta.url).href));
 const {handleRun}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 let release;const gate=new Promise(resolve=>{release=resolve;});
 function req(data,url='/api/run',g=gate){const bytes=Buffer.from(JSON.stringify(data));const r=Readable.from((async function*(){await g;const i=bytes.indexOf(Buffer.from('注'))+1;yield bytes.subarray(0,i);yield bytes.subarray(i);})());r.method='POST';r.url=url;r.headers={'content-type':'application/json'};return r;}
 function res(){return {status:null,writeHead(s){this.status=s;},end(data){this.data=data;}};}
 const a=res(),b=res(),code='int main(void){return 0;} // 注释';
 const first=handleRun(req({source:code,prelude:'untrusted',harness:'untrusted',variants:[{prelude:'untrusted'}],file_policy:{names:['untrusted.txt'],writable:['untrusted.txt']}}),a,4174),second=handleRun(req({source:code}),b,4174);release();await Promise.all([first,second]);
 try{
  assert.equal(children.length,1);assert.equal(b.status,429);assert.equal(children[0].body.source,code);
  assert.equal(children[0].body.prelude,undefined);assert.equal(children[0].body.harness,undefined);
  assert.equal(children[0].body.variants,undefined);
  assert.equal(children[0].body.file_policy,undefined);
 }finally{const bytes=Buffer.from('{"status":"ran","stdout":"中文"}'),i=bytes.indexOf(Buffer.from('中'))+1;children[0]?.stdout.emit('data',bytes.subarray(0,i));children[0]?.stdout.emit('data',bytes.subarray(i));children[0]?.emit('close',0,null);}
 assert.equal(a.status,200);
 assert.equal(JSON.parse(a.data).stdout,'中文');
 const bad=res();await handleRun(req(null,'/api/run',Promise.resolve()),bad,4174);assert.equal(bad.status,400);
 delete globalThis.__practiceTestSpawn;
});

test('可信文件配置可取回受限完整结果，隐藏文件及计量字段不通过API返回',async()=>{
 const content='00'.repeat(65536),file_policy={names:['out.bin'],writable:['out.bin'],capture:['out.bin'],seeds:{}};
 const variants=Array.from({length:4},()=>({file_policy,exactOutput:'',fileChecks:[{name:'out.bin',mode:'bytes',expected:content}]}));
 const children=[];globalThis.__practiceFileTestSpawn=()=>{
  const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr={resume(){}};c.stdin=new EventEmitter();c.stdin.end=body=>{c.body=JSON.parse(body);};c.kill=()=>{c.killed=true;};children.push(c);return c;
 };
 process.env.JUDGE_PYTHON='test-python';process.env.JUDGE_ZIG='test-zig';
 const evaluator=JSON.stringify(new URL('../scripts/judge-contracts.mjs',import.meta.url).href);
 const source=(await readFile(new URL('../scripts/run-api.mjs',import.meta.url),'utf8'))
  .replace("import {spawn} from 'node:child_process';",'const spawn=globalThis.__practiceFileTestSpawn;')
  .replace("import {judgeContract,evaluateContract} from './judge-contracts.mjs';",`import {evaluateContract} from ${evaluator};\nconst judgeContract=id=>id==='file-fixture'?${JSON.stringify({variants})}:null;`);
 const {handleRun}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const req=Readable.from([Buffer.from(JSON.stringify({questionId:'file-fixture',source:'int main(void){return 0;}'}))]);
 req.method='POST';req.url='/api/judge';req.headers={'content-type':'application/json'};
 const res={writeHead(status){this.status=status;},end(body){this.body=body;}};
 await handleRun(req,res,4174);
 try{
  assert.equal(children.length,1);assert.deepEqual(children[0].body.variants,variants);
  const raw=JSON.stringify({status:'variants',results:variants.map(()=>({status:'ran',stdout:'',stderr:'',files:{'out.bin':{size:65536,hex:content}},file_usage:{guarded_calls:10}}))});
  assert.ok(Buffer.byteLength(raw)>200000&&Buffer.byteLength(raw)<1048576);
  children[0].stdout.emit('data',Buffer.from(raw));children[0].emit('close',0,null);
  assert.equal(children[0].killed,undefined);assert.equal(res.status,200);const result=JSON.parse(res.body);assert.equal(result.status,'accepted');assert.equal(result.total,8);
  assert.ok(!res.body.includes('out.bin'));assert.ok(!res.body.includes('file_usage'));assert.ok(!res.body.includes(content));
 }finally{children[0]?.emit('close',0,null);delete globalThis.__practiceFileTestSpawn;}
});

test('判题的多配置只取服务器契约，客户端不能替换配置或测试驱动',async()=>{
 const variants=[2,4].map(n=>({prelude:`#define RATE ${n}\n`,harness:'trusted',groups:[[String(n)]],expected:[String(n)]}));
 const children=[];
 globalThis.__practiceTestSpawn=()=>{const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr={resume(){}};c.stdin=new EventEmitter();c.stdin.end=body=>{c.body=JSON.parse(body);};c.kill=()=>{};children.push(c);return c;};
 process.env.JUDGE_PYTHON='test-python';process.env.JUDGE_ZIG='test-zig';
 const evaluator=JSON.stringify(new URL('../scripts/judge-contracts.mjs',import.meta.url).href);
 const source=(await readFile(new URL('../scripts/run-api.mjs',import.meta.url),'utf8'))
  .replace("import {spawn} from 'node:child_process';",'const spawn=globalThis.__practiceTestSpawn;')
  .replace("import {judgeContract,evaluateContract} from './judge-contracts.mjs';",`import {evaluateContract} from ${evaluator};\nconst judgeContract=id=>id==='fixture'?${JSON.stringify({variants})}:null;`);
 const {handleRun}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const code='int scale(int x){return x;}';
 const req=Readable.from([Buffer.from(JSON.stringify({source:code,questionId:'fixture',prelude:'untrusted',harness:'untrusted',variants:[{prelude:'untrusted'}]}))]);
 req.method='POST';req.url='/api/judge';req.headers={'content-type':'application/json'};
 const res={writeHead(status){this.status=status;},end(body){this.body=body;}};
 await handleRun(req,res,4174);
 try{assert.equal(children.length,1);assert.equal(children[0].body.source,code);assert.deepEqual(children[0].body.variants,variants);assert.equal(children[0].body.prelude,undefined);assert.equal(children[0].body.harness,undefined);}
 finally{children[0]?.stdout.emit('data',Buffer.from(JSON.stringify({status:'variants',results:[{status:'ran',stdout:'2\n'},{status:'ran',stdout:'4\n'}]})));children[0]?.emit('close',0,null);delete globalThis.__practiceTestSpawn;}
 assert.equal(res.status,200);const result=JSON.parse(res.body);assert.equal(result.status,'accepted');assert.equal(result.passed,2);
});

test('运行器异常退出或收到结束信号时，残留有效JSON也不能变成学生成绩',async()=>{
 const children=[];globalThis.__practiceExitTestSpawn=()=>{const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr={resume(){}};c.stdin=new EventEmitter();c.stdin.end=()=>{};c.kill=()=>{};children.push(c);return c;};
 process.env.JUDGE_PYTHON='test-python';process.env.JUDGE_ZIG='test-zig';
 const contract={exactOutput:'',file_policy:{names:['out.bin'],writable:['out.bin'],capture:['out.bin']},fileChecks:[{name:'out.bin',mode:'bytes',expected:'41'}]};
 const evaluator=JSON.stringify(new URL('../scripts/judge-contracts.mjs',import.meta.url).href);
 const source=(await readFile(new URL('../scripts/run-api.mjs',import.meta.url),'utf8'))
  .replace("import {spawn} from 'node:child_process';",'const spawn=globalThis.__practiceExitTestSpawn;')
  .replace("import {judgeContract,evaluateContract} from './judge-contracts.mjs';",`import {evaluateContract} from ${evaluator};\nconst judgeContract=id=>id==='exit-fixture'?${JSON.stringify(contract)}:null;`);
 const {handleRun}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 try{
  for(const [code,signal]of [[1,null],[null,'SIGTERM']]){
   const req=Readable.from([Buffer.from(JSON.stringify({source:'int main(void){return 0;}',questionId:'exit-fixture'}))]);req.method='POST';req.url='/api/judge';req.headers={'content-type':'application/json'};
   const res={writeHead(status){this.status=status;},end(body){this.body=body;}};await handleRun(req,res,4174);const child=children.at(-1);
   child.stdout.emit('data',Buffer.from(JSON.stringify({status:'ran',stdout:'',stderr:'',files:{'out.bin':{size:1,hex:'41'}}})));child.emit('close',code,signal);
   assert.equal(res.status,503);assert.equal(JSON.parse(res.body).status,undefined);assert.ok(!res.body.includes('out.bin'));
   const before=res.body;child.emit('close',0,null);assert.equal(res.body,before);
  }
 }finally{delete globalThis.__practiceExitTestSpawn;}
});
