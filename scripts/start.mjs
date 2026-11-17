import {access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const runtimeRoot=path.resolve(projectRoot,'../制作记录/判题运行环境/python');
const args=new Set(process.argv.slice(2));
const port=Number(process.env.PORT||4174);
if(!Number.isInteger(port)||port<1||port>65535){console.error('请将PORT设置为1至65535之间的端口。');process.exit(1);}
async function exists(file){try{await access(file);return true;}catch{return false;}}
function run(argv,env=process.env){return new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,argv,{cwd:projectRoot,env,stdio:'inherit',windowsHide:true});
 const stop=()=>child.kill();process.once('SIGINT',stop);process.once('SIGTERM',stop);
 child.once('error',reject);child.once('exit',(code,signal)=>{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);resolve(signal?0:code??1);});
});}
const buildMissing=!(await exists(path.join(projectRoot,'dist/index.html')));
if(buildMissing||args.has('--rebuild')||args.has('--local')){
 const code=await run(['scripts/build.mjs',...(args.has('--local')?['--local']:[])]);if(code)process.exit(code);
}
const python=process.env.JUDGE_PYTHON||path.join(runtimeRoot,'Scripts/python.exe');
const zig=process.env.JUDGE_ZIG||path.join(runtimeRoot,'Lib/site-packages/ziglang/zig.exe');
const judgeReady=(await exists(python))&&((await exists(zig))||!!process.env.JUDGE_SDK);
if(!judgeReady)console.log('网站可正常练习。需要编译代码时，请先准备本地判题环境。');
process.exitCode=await run(['scripts/serve.mjs'],{...process.env,PORT:String(port),...(judgeReady?{JUDGE_PYTHON:python,...(await exists(zig)?{JUDGE_ZIG:zig}:{})}:{})});
