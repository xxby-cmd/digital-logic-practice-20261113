import {spawn} from 'node:child_process';
import path from 'node:path';
import {StringDecoder} from 'node:string_decoder';
import {judgeContract,evaluateContract} from './judge-contracts.mjs';
import {publicCodeCases,evaluatePublicCodeCases} from './public-code-cases.mjs';
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
 let body='',payload,contract,examples;
 try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100000)throw Error('size');chunks.push(chunk);}body=Buffer.concat(chunks).toString('utf8');payload=JSON.parse(body);if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('format');}catch{return reply(400,{message:'代码或输入格式不正确。'});}
 if(typeof payload.source!=='string')return reply(400,{message:'代码格式不正确。'});
 const language=payload.language??'c';
 if(!['c','java'].includes(language))return reply(400,{message:'请选择受支持的编程语言。'});
 if(Buffer.byteLength(payload.source,'utf8')>32768)return reply(200,{status:'invalid',message:'代码不能超过32KB。'});
 const route=new URL(req.url,'http://localhost').pathname;
 const executionConfig=c=>({prelude:c.prelude||'',harness:c.harness,stdin:c.stdin||'',...(language==='java'&&c.interfaceSpec?{interfaceSpec:c.interfaceSpec}:{})});
 if(route==='/api/test'){
  examples=publicCodeCases(payload.questionId,language);
  if(examples.length!==2)return reply(400,{message:'本题尚未开放所选语言的样例测试。'});
  const variants=examples.map(({contract})=>({...executionConfig(contract),...(contract.file_policy?{file_policy:contract.file_policy}:{})}));
  payload={source:payload.source,variants,trusted_driver:true};
 }else if(route==='/api/judge'){
  contract=judgeContract(payload.questionId,language);if(!contract)return reply(400,{message:'本题尚未开放所选语言的自动测试。'});
  payload=contract.variants?{source:payload.source,variants:language==='java'?contract.variants.map(executionConfig):contract.variants,trusted_driver:true}:{source:payload.source,...executionConfig(contract),trusted_driver:true,...(contract.file_policy?{file_policy:contract.file_policy}:{})};
 }else{
  payload={source:payload.source,stdin:payload.stdin??''};
 }
 payload.language=language;
 body=JSON.stringify(payload);
 if(!process.env.JUDGE_PYTHON||(language==='c'&&!process.env.JUDGE_SDK&&!process.env.JUDGE_ZIG))return reply(503,{message:'运行环境尚未准备好。'});
 // Body reads yield; claim the worker slot only after the final await above.
 if(running)return reply(429,{message:'上一份程序正在运行，请稍后重试。'});
 running=true;
 const child=spawn(process.env.JUDGE_PYTHON,[path.resolve(language==='java'?'scripts/judge-java-worker.py':'scripts/judge-worker.py')],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['pipe','pipe','pipe']});
 const usesFiles=contract?.file_policy||contract?.variants?.some(c=>c.file_policy)||examples?.some(c=>c.contract.file_policy);
 const responseLimit=language==='java'?524288:usesFiles?1048576:200000;
 let output='',size=0,finished=false;const decoder=new StringDecoder('utf8');
 const done=(status,data)=>{if(finished)return;finished=true;clearTimeout(timer);running=false;reply(status,data);};
 const timer=setTimeout(()=>{child.kill();done(503,{status:'unavailable',message:'运行服务处理超时，代码与答卷已保留，请稍后重试。'});},language==='java'?150000:22000);
 child.stdout.on('data',b=>{size+=b.length;if(size>responseLimit){child.kill();done(503,{status:'unavailable',message:'运行服务未返回可处理的完整结果，代码与答卷已保留。'});}else output+=decoder.write(b);});
 child.stderr.resume();
 child.on('error',()=>done(503,{message:'运行环境暂不可用。'}));
 child.on('close',(code,signal)=>{
  if(finished)return;
  if(code!==0||signal)return done(503,{message:'运行环境暂不可用，代码与答卷已保留。'});
  try{
   output+=decoder.end();
   const result=JSON.parse(output);
   if(examples)return done(200,evaluatePublicCodeCases(result,examples));
   if(contract){
    const {status,message,passed,total}=evaluateContract(result,contract);
    return done(200,{status,message:status==='compile_error'?'编译未通过。可运行公开样例查看编译提示。':message,passed,total});
   }
   done(200,result);
  }catch{done(503,{message:'运行服务未返回完整结果。'});}
 });
 child.stdin.on('error',()=>{});child.stdin.end(body);
}
