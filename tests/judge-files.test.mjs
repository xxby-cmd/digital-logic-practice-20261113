import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {evaluateFileChecks} from '../scripts/judge-file-checks.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const file=hex=>({size:hex.length/2,hex});
const policy=(seeds={},writable=['out.bin'],capture=['out.bin'])=>({names:['input.bin','out.bin'],writable,seeds,capture});
const single={exactOutput:'OK\n',file_policy:policy(),fileChecks:[{name:'out.bin',mode:'bytes',expected:'00ff0a'}]};
const ran=(files,stdout='OK\n')=>({status:'ran',stdout,stderr:'',files,file_usage:{guarded_calls:123}});

test('文件题同时核实际字节和标准输出，不接受只打印成功而没写文件',()=>{
 const good=evaluateContract(ran({'out.bin':file('00ff0a')}),single);assert.equal(good.status,'accepted');assert.equal(good.total,2);
 for(const files of [{},{'out.bin':file('')},{'out.bin':file('00ff')},{'out.bin':file('00ff0a00')}])assert.equal(evaluateContract(ran(files),single).status,'wrong_answer');
 assert.equal(evaluateContract(ran({'out.bin':file('00ff0a')},'ERROR\n'),single).status,'wrong_answer');
 assert.ok(!JSON.stringify(good).includes('file_usage'));assert.ok(!JSON.stringify(good).includes('00ff0a'));
});

test('文件整数语义、字面token和精确字节按声明区分，非ASCII字节不能被截去高位',()=>{
 const bytes=Buffer.from(' +001 -0 010\n').toString('hex'),files={'out.bin':file(bytes)};
 assert.equal(evaluateFileChecks(files,[{name:'out.bin',mode:'integers',expected:['1','0','10']}]).status,'accepted');
 assert.equal(evaluateFileChecks(files,[{name:'out.bin',mode:'tokens',expected:['1','0','10']}]).status,'wrong_answer');
 assert.equal(evaluateFileChecks(files,[{name:'out.bin',mode:'tokens',expected:['+001','-0','010']}]).status,'accepted');
 assert.equal(evaluateFileChecks({'out.bin':file('b1')},[{name:'out.bin',mode:'tokens',expected:['1']}]).status,'wrong_answer');
 assert.equal(evaluateFileChecks({'out.bin':file('')},[{name:'out.bin',mode:'tokens',expected:[]}]).status,'accepted');
});

test('文件不存在和失败后的受限前缀是不同检查，允许合法的不同部分写入长度',()=>{
 const check={name:'out.bin',mode:'prefix',expected:'41424344',maxBytes:3};
 for(const hex of ['','41','4142','414243'])assert.equal(evaluateFileChecks({'out.bin':file(hex)},[check]).status,'accepted');
 for(const hex of ['41424344','4144','4241'])assert.equal(evaluateFileChecks({'out.bin':file(hex)},[check]).status,'wrong_answer');
 assert.equal(evaluateFileChecks({},[check]).status,'wrong_answer');
 assert.equal(evaluateFileChecks({},[{name:'out.bin',mode:'absent'}]).status,'accepted');
 assert.equal(evaluateFileChecks({'out.bin':file('')},[{name:'out.bin',mode:'absent'}]).status,'wrong_answer');
});

test('缺文件结果或错误服务配置返回不可用，不把服务遗漏判作学生零分',()=>{
 assert.equal(evaluateContract({status:'ran',stdout:'OK\n'},single).status,'unavailable');
 for(const value of [{size:1,hex:'0001'},{size:1,hex:'zz'},null])assert.equal(evaluateContract(ran({'out.bin':value}),single).status,'unavailable');
 assert.equal(evaluateContract(ran({'out.bin':file('00ff0a')}),{...single,file_policy:policy({},[],[])}).status,'unavailable');
 assert.equal(evaluateContract(ran({}),{}).status,'unavailable');
 assert.equal(evaluateFileChecks({},[{name:'out.bin',mode:'unknown'}]).status,'unavailable');
});

test('多配置逐份核文件，运行异常也不把隐藏文件和计量数据返给前端',()=>{
 const contract={variants:[single,{...single,exactOutput:'',fileChecks:[{name:'out.bin',mode:'bytes',expected:''}]}]};
 const raw={status:'variants',results:[ran({'out.bin':file('00ff0a')}),ran({'out.bin':file('')},'')]};
 let result=evaluateContract(raw,contract);assert.equal(result.status,'accepted');assert.equal(result.total,4);
 raw.results[1]=ran({'out.bin':file('41')},'');result=evaluateContract(raw,contract);assert.equal(result.status,'wrong_answer');assert.equal(result.passed,3);
 for(const status of ['runtime_error','time_limit','output_limit','unavailable','compile_error']){
  const r=evaluateContract({...ran({'out.bin':file('deadbeef')}),status,message:'test'},single);
  assert.equal(r.status,status);assert.ok(!JSON.stringify(r).includes('deadbeef'));assert.equal(r.files,undefined);assert.equal(r.file_usage,undefined);
 }
});

test('真实worker：各配置有独立文件、复制实际字节、追加按EOF计量、配置错不记学生错',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:120000
},async()=>{
 const copy='#include <stdio.h>\nint main(void){FILE*in=fopen("input.bin","rb"),*out=fopen("out.bin","wb");if(!in||!out)return 2;int c,n=0;while((c=fgetc(in))!=EOF){if(fputc(c,out)==EOF)return 3;n++;}int bad=ferror(in);bad|=fclose(in)!=0;bad|=fclose(out)!=0;if(bad)return 4;printf("%d\\n",n);return 0;}';
 const configs=['','00ff0a','616263','61'].map(hex=>({file_policy:policy({'input.bin':hex,'out.bin':'6f6c64'}),exactOutput:hex.length/2+'\n',fileChecks:[{name:'out.bin',mode:'bytes',expected:hex}]}));
 const run=request=>{
  const p=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify(request),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},windowsHide:true,timeout:30000,maxBuffer:2*1024*1024});
  assert.equal(p.error,undefined);assert.equal(p.status,0,p.stderr);return JSON.parse(p.stdout);
 };
 const results=[];
 const raw=run({source:copy,variants:configs});let r=evaluateContract(raw,{variants:configs});results.push({kind:'fresh-copy',result:r});assert.equal(r.status,'accepted',JSON.stringify(r));assert.equal(r.total,8);
 const withoutCopy=copy.replace('if(fputc(c,out)==EOF)return 3;','');r=evaluateContract(run({source:withoutCopy,variants:configs}),{variants:configs});results.push({kind:'stdout-only-mistake',result:r});assert.equal(r.status,'wrong_answer');
 const append='#include <stdio.h>\nint main(void){FILE*f=fopen("out.bin","ab");if(!f)return 2;if(fseek(f,10,SEEK_SET))return 3;int ok=fputc(88,f)!=EOF;ok&=fflush(f)==0;ok&=fclose(f)==0;printf("%d\\n",ok);return 0;}';
 const p=policy({'out.bin':'616263'});p.limits={max_file_bytes:16,max_allocation_reservation_bytes:4,max_write_reservation_bytes:1};
 const c={file_policy:p,exactOutput:'1\n',fileChecks:[{name:'out.bin',mode:'bytes',expected:'61626358'}]};
 r=evaluateContract(run({source:append,...c,trusted_driver:true}),c);results.push({kind:'append-after-seek',result:r});assert.equal(r.status,'accepted',JSON.stringify(r));
 const invalid=policy({'input.bin':'41'},[],['input.bin']);invalid.limits={max_capture_bytes:0};
 r=run({source:copy,file_policy:invalid,trusted_driver:true});results.push({kind:'invalid-capture-policy',result:r});assert.equal(r.status,'unavailable');
 r=run({source:copy,file_policy:policy(),stdin:''});results.push({kind:'untrusted-file-policy',result:r});assert.equal(r.status,'unavailable');
 r=run({source:copy,stdin:''});results.push({kind:'ordinary-run-has-no-files',result:r});assert.equal(r.status,'runtime_error');
 await mkdir('../制作记录/文件判题调研',{recursive:true});await writeFile('../制作记录/文件判题调研/正式worker接线核验.json',JSON.stringify({at:new Date().toISOString(),results},null,2));
});
