import {spawn} from 'node:child_process';
import path from 'node:path';
import {StringDecoder} from 'node:string_decoder';
import {judgeContract,evaluateContract} from './judge-contracts.mjs';
let running=false;
export async function handleRun(req,res,port){
 const origin=req.headers.origin;
 const allowed=!origin||origin==='null'||[`http://127.0.0.1:${port}`,`http://localhost:${port}`].includes(origin);
 if(!allowed){res.writeHead(403);res.end();return;}
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
 if(origin)headers['Access-Control-Allow-Origin']=origin;
 if(req.method==='OPTIONS'){res.writeHead(204,{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});res.end();return;}
 const reply=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data));};
 if(req.method!=='POST'||!req.headers['content-type']?.startsWith('application/json'))return reply(400,{message:'请求格式不正确。'});
 let body='',payload,contract;
 try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000)throw Error('size');chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');payload=JSON.parse(body);if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('format');}catch{return reply(400,{message:'代码或输入格式不正确。'});}
 if(typeof payload.source!=='string')return reply(400,{message:'代码格式不正确。'});
 if(Buffer.byteLength(payload.source,'utf8')>32768)return reply(200,{status:'invalid',message:'代码不能超过32KB。'});
 if(new URL(req.url,'http://localhost').pathname==='/api/judge'){
  contract=judgeContract(payload.questionId);if(!contract)return reply(400,{message:'本题的自动测试尚未开放。'});
  payload=contract.variants?{source:payload.source,variants:contract.variants}:{source:payload.source,prelude:contract.prelude||'',harness:contract.harness,stdin:contract.stdin||''};
 }else{
  payload={source:payload.source,stdin:payload.stdin??''};
 }
 body=JSON.stringify(payload);
 if(!process.env.JUDGE_PYTHON||(!process.env.JUDGE_SDK&&!process.env.JUDGE_ZIG))return reply(503,{message:'运行环境尚未准备好。'});
 // Body reads yield; claim the worker slot only after the final await above.
 if(running)return reply(429,{message:'上一份程序正在运行，请稍后重试。'});
 running=true;
 const child=spawn(process.env.JUDGE_PYTHON,[path.resolve('scripts/judge-worker.py')],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['pipe','pipe','pipe']});
 let output='',size=0,finished=false;const decoder=new StringDecoder('utf8');
 const done=(status,data)=>{if(finished)return;finished=true;clearTimeout(timer);running=false;reply(status,data);};
 const timer=setTimeout(()=>{child.kill();done(200,{status:'time_limit',message:'编译或运行超时。'});},22000);
 child.stdout.on('data',b=>{size+=b.length;if(size>200000){child.kill();done(200,{status:'output_limit',message:'程序输出过多。'});}else output+=decoder.write(b);});
 child.stderr.resume();
 child.on('error',()=>done(503,{message:'运行环境暂不可用。'}));
 child.on('close',()=>{try{output+=decoder.end();const result=JSON.parse(output);done(200,contract?evaluateContract(result,contract):result);}catch{done(503,{message:'运行服务未返回完整结果。'});}});
 child.stdin.on('error',()=>{});child.stdin.end(body);
}
