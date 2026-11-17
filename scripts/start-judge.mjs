import {access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const runtimeRoot=path.resolve(projectRoot,'../制作记录/判题运行环境/python');
const pythonPath=path.join(runtimeRoot,'Scripts/python.exe');
const zigPath=path.join(runtimeRoot,'Lib/site-packages/ziglang/zig.exe');
try{await Promise.all([access(pythonPath),access(zigPath)]);}catch{
 console.error('本地运行环境尚未准备好，请先完成运行环境设置。');
 process.exitCode=1;
}
function run(args,env=process.env){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,args,{cwd:projectRoot,env,stdio:'inherit',windowsHide:true});
 child.once('error',reject);child.once('exit',(code,signal)=>resolve(signal?1:code??1));
});}
if(!process.exitCode){
 let built=true;
 try{await access(path.join(projectRoot,'dist/index.html'));}catch{built=false;}
 if(!built)process.exitCode=await run(['scripts/build.mjs']);
 if(!process.exitCode)process.exitCode=await run(['scripts/serve.mjs'],{...process.env,JUDGE_PYTHON:pythonPath,JUDGE_ZIG:zigPath,PORT:'4174'});
}
