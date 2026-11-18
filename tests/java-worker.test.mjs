import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/Java判题预研/正式运行器/',import.meta.url));
const python=process.env.JUDGE_JAVA_PYTHON||process.env.JUDGE_PYTHON||'python';
const runtime=process.env.JUDGE_JAVA_RUNTIME==='1'&&process.platform==='win32';
const hash=s=>createHash('sha256').update(s).digest('hex');
const workerFiles=['scripts/java_appcontainer.py','scripts/judge-java-worker.py'];
const observations=[];
function call(payload,env={}){
 const child=spawnSync(python,['scripts/judge-java-worker.py'],{cwd:root,input:JSON.stringify(payload),env:{...process.env,...env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:150000,windowsHide:true,maxBuffer:1024*1024});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);assert.equal(child.stderr,'');
 const data=JSON.parse(child.stdout);observations.push({payloadSha256:hash(JSON.stringify(payload)),workerSha256:hash(readFileSync(root+'scripts/judge-java-worker.py')),result:data});return data;
}
const main=body=>'public class Main { public static void main(String[] args) throws Exception { '+body+' } }';
const driver=body=>'public class JudgeMain { public static void main(String[] args) throws Exception { '+body+' } }';
const addSpec={name:'add',returnType:'int',parameterTypes:['int','int']};
const fn=(source,harness,extra={})=>({language:'java',source,prelude:'',harness,trusted_driver:true,interfaceSpec:addSpec,...extra});
const noHostPath=result=>assert.ok(!/[A-Za-z]:[\\/]|AppData[\\/]|Packages[\\/]|CoursePractice\.Java\./.test(JSON.stringify(result)));
function pureWorker(script,input){
 const boot="import sys,json,importlib.util\nspec=importlib.util.spec_from_file_location('worker','scripts/judge-java-worker.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)\n";
 const child=spawnSync(python,['-c',boot+script],{cwd:root,input:JSON.stringify(input),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',windowsHide:true,timeout:10000});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);return JSON.parse(child.stdout);
}

test('Java请求字段/受信边界先校验，不允许客户端选择路径、命令或运行设置',()=>{
 for(const payload of [null,{}, {language:'c',source:'x'},{language:'java',source:''},{language:'java',source:'中'.repeat(11000)},{language:'java',source:'x',stdin:'中'.repeat(11000)},
  {language:'java',source:'x',filename:'Else.java'},{language:'java',source:'x',env:{JAVA_TOOL_OPTIONS:'x'}},{language:'java',source:'x',command:['java']},
  {language:'java',source:'x',harness:'x'},{language:'java',source:'x',variants:[{harness:'x'}]}]){
  const r=call(payload);assert.equal(r.status,'invalid');noHostPath(r);
 }
 for(const payload of [{language:'java',source:'x',trusted_driver:true,variants:[]},{language:'java',source:'x',trusted_driver:true,variants:Array(5).fill({harness:'x'})},fn('x',''),fn('x','x'.repeat(262145)),fn('x','x',{stdin:'x'.repeat(32769)})]){
  const r=call(payload);assert.equal(r.status,'unavailable');noHostPath(r);
 }
});

test('Java执行器源码保持独立OS隔离、可信健康检查及显式21编译目标',()=>{
 const helper=readFileSync(root+'scripts/java_appcontainer.py','utf8'),worker=readFileSync(root+'scripts/judge-java-worker.py','utf8');
 assert.ok(helper.indexOf('_verify_token(process.hProcess,profile)')<helper.indexOf('K.ResumeThread(process.hThread)'));
 for(const token of ['CreateAppContainerProfile','SECURITY_CAPABILITIES','GetTokenInformation','AssignProcessToJobObject','0x20002','0x20009','0x08000000|0x4','CapabilityCount'])assert.ok(helper.includes(token),token);
 assert.ok(helper.includes('inherited=(W.HANDLE*3)'));assert.ok(helper.includes('MEMORY_LIMIT=512*1024*1024'));assert.ok(helper.includes('ActiveProcessLimit=1'));
 for(const excluded of ['os.link(','shutil.copy','SetNamedSecurityInfo','CreateSymbolicLink','TEST_SECRET_OUTSIDE','TEST_VISIBLE_ENV','java.lang.foreign','owned-external-marker'])assert.ok(!helper.includes(excluded),excluded);
 assert.ok(worker.includes('JUDGE_JAVA_HOME'));assert.ok(worker.includes("'-source','21','-target','21','-proc:none'"));assert.ok(!worker.includes("'--release','21'"));
 assert.ok(worker.includes('java.security.Security.getProperty'));assert.ok(worker.includes('PriorityQueue'));assert.ok(worker.includes('health_check(home'));
 assert.ok(!helper.includes('subprocess.run('));assert.ok(!helper.includes('subprocess.Popen('));assert.ok(!worker.includes('subprocess.'));
});

test('功能判题运行stderr完全不转发，伪造栈、自定义异常名和ANSI均不能带出值',()=>{
 const strings=['private=765432101 (Solution.java:1)','Exception in thread "main" Leaked765432101Exception','\u001b[31mprivate=765432101\u001b[0m\n\tat Fake.read(Solution.java:1)','java.lang.RuntimeException: value=765432101\n\tat Solution.add(Solution.java:1)','compiler.err.fake: 765432101'];
 const r=pureWorker('payload=json.load(sys.stdin)\nprint(json.dumps([worker.runtime_diagnostic(text,True) for text in payload]))',strings);
 assert.deepEqual(r,strings.map(()=>''));
 const self=pureWorker('print(json.dumps(worker.runtime_diagnostic(json.load(sys.stdin),False)))','java.lang.IllegalStateException: own input\n\tat Main.main(Main.java:1)');assert.ok(self.includes('Main.java:1'));
});

test('接口元数据严格验证，学生编译提示仅保留本人行号与可读说明',()=>{
 for(const interfaceSpec of [null,{...addSpec,name:'x); evil();'}, {...addSpec,parameterTypes:['void']},{...addSpec,returnType:'int;class X{}'},{...addSpec,extra:true}]){
  assert.equal(call(fn('x',driver(''),{interfaceSpec})).status,'unavailable');
 }
 const spec=pureWorker('print(json.dumps(worker.validate_interface_spec(json.load(sys.stdin))))',{name:'transform',returnType:'String []',parameterTypes:['int[][]','Object']});
 assert.deepEqual(spec,{name:'transform',returnType:'java.lang.String[]',parameterTypes:['int[][]','java.lang.Object']});
 const own=pureWorker('print(json.dumps(worker.compiler_diagnostic(json.load(sys.stdin),False),ensure_ascii=False))','Main.java:4:9: compiler.err.expected: token.secret.765432101\n1 error');assert.ok(own.includes('Main.java:4'));assert.ok(!/compiler\.|765432101/.test(own));
 const worker=readFileSync(root+'scripts/judge-java-worker.py','utf8');
 for(const removed of ['_solution_call_at','_student_interface_error','_diagnostic_arguments'])assert.ok(!worker.includes(removed));
 for(const required of ["empty.mkdir()","'-implicit:none'","Class.forName(\"Solution\",false",'student.getMethod','method.getReturnType()==expectedReturn',"(profile.work/'Solution.class').unlink()",'trusted_classes.items()'])assert.ok(worker.includes(required),required);
});

test('Java真实自测：Scanner/集合/Security/中文与字节换行保真，父JDK注入环境不继承',{skip:!runtime,timeout:90000},()=>{
 const source='import java.util.*; '+main('Scanner in=new Scanner(System.in);HashMap<Integer,Integer> map=new HashMap<>();map.put(in.nextInt(),in.nextInt());PriorityQueue<Integer> q=new PriorityQueue<>();q.add(9);q.add(4);System.out.println(map.get(9)+q.remove());System.out.println(java.security.Security.getProperty("security.provider.1"));System.out.println("中文");System.out.print(System.getenv("JAVA_TOOL_OPTIONS")==null&&System.getenv("JDK_JAVA_OPTIONS")==null&&System.getenv("_JAVA_OPTIONS")==null?"CLEAN":"LEAK");');
 const r=call({language:'java',source,stdin:'9 4\r\n'},{JAVA_TOOL_OPTIONS:'-javaagent:course-owned-not-present',JDK_JAVA_OPTIONS:'--not-an-option',_JAVA_OPTIONS:'-not-an-option'});
 assert.equal(r.status,'ran');assert.equal(r.stdout,'8\r\nSUN\r\n中文\r\nCLEAN');assert.equal(r.stderr,'');noHostPath(r);
 const echo=call({language:'java',source:main('System.out.write(System.in.readAllBytes());'),stdin:'汉\r\n尾\n'});assert.equal(echo.status,'ran');assert.equal(echo.stdout,'汉\r\n尾\n');
});

test('Java真实函数/四配置：接口独立，目录和静态状态均不跨配置保留',{skip:!runtime,timeout:90000},()=>{
 const simple=call(fn('class Solution { public static int add(int a,int b){return a+b;} }',driver('System.out.println(Solution.add(2,3));')));assert.equal(simple.status,'ran');assert.equal(simple.stdout,'5\r\n');
 const source='class Solution { static int count; public static int probe() throws Exception {java.nio.file.Path p=java.nio.file.Path.of("state.txt");int old=java.nio.file.Files.exists(p)?9:0;java.nio.file.Files.writeString(p,"owned");return old+(++count);} }';
 const r=call({language:'java',source,trusted_driver:true,interfaceSpec:{name:'probe',returnType:'int',parameterTypes:[]},variants:Array.from({length:4},()=>({harness:driver('System.out.println(Solution.probe());')}))});
 assert.equal(r.status,'variants');assert.equal(r.results.length,4);for(const one of r.results){assert.equal(one.status,'ran');assert.equal(one.stdout,'1\r\n');assert.equal(one.stderr,'');noHostPath(one);}
});

test('Java真实诊断：只显示学生文件，私有行/测试值/残留输出不回传',{skip:!runtime,timeout:90000},()=>{
 const syntax=call({language:'java',source:main('int bad = ;')});assert.equal(syntax.status,'compile_error');assert.ok(syntax.stderr.includes('Main.java:'));noHostPath(syntax);
 const mismatch=call(fn('class Solution {static int other(){return 1;}}',driver('System.out.println(Solution.add(765432101,987654321));')));assert.equal(mismatch.status,'compile_error');assert.ok(mismatch.stderr.includes('接口'));assert.ok(!/765432101|987654321|JudgeMain/.test(JSON.stringify(mismatch)));noHostPath(mismatch);
 const fault=call(fn('class Solution {public static int add(int a,int b){System.out.print(a);throw new IllegalArgumentException("PRIVATE="+a);}}',driver('System.out.println(Solution.add(765432101,987654321));')));assert.equal(fault.status,'runtime_error');assert.equal(fault.stdout,'');assert.equal(fault.stderr,'');assert.ok(!/765432101|987654321|PRIVATE|JudgeMain/.test(JSON.stringify(fault)));noHostPath(fault);
 const broken=call(fn('class Solution {}','public class JudgeMain {public static void main(String[] args) {int privateTest = ;}}'));assert.equal(broken.status,'unavailable');assert.ok(!/privateTest|JudgeMain|\.java:/.test(JSON.stringify(broken)));
 const privateRuntime=call(fn('class Solution {public static int add(int a,int b){return a+b;}}',driver('throw new IllegalStateException("private expected 765432101");')));assert.equal(privateRuntime.status,'runtime_error');assert.ok(!/765432101|expected|JudgeMain/.test(JSON.stringify(privateRuntime)));
});

test('Java真实接口分类与stderr回显：driver缺helper待评，5种学生接口错误可结算，正确返回仍accepted且无私参', {skip:!runtime,timeout:90000},()=>{
 const standard=driver('int value=Solution.add(9,4);System.out.println(value);');
 for(const [kind,source]of [
  ['missing-method','class Solution {static int other(int a,int b){return a+b;}}'],
  ['wrong-parameters','class Solution {public static int add(String x){return 1;}}'],
  ['wrong-return','class Solution {public static String add(int a,int b){return "wrong";}}'],
  ['nonstatic','class Solution {int add(int a,int b){return a+b;}}'],
  ['private','class Solution {private static int add(int a,int b){return a+b;}}']
 ]){const r=call(fn(source,standard));assert.equal(r.status,'compile_error',kind+JSON.stringify(r));assert.ok(r.stderr.includes('接口'));assert.ok(!/compiler\.|JudgeMain|\.java:\d|9,4/.test(r.stderr));noHostPath(r);}
 const correct='class Solution {public static int add(int a,int b){return a+b;}}';
 for(const h of [
  driver('MissingDriverHelper.verify();int value=Solution.add(9,4);'),
  driver('int value=Solution.add(MissingDriverHelper.verify(),4);'),
  'public class JudgeMain {static String badDriverValue(){return "wrong";} public static void main(String[] args){int value=Solution.add((int)badDriverValue(),4);}}',
  'class DriverHelper {} '+driver('int value=DriverHelper.Solution;System.out.print(Solution.add(9,4)+value);')
 ]){const r=call(fn(correct,h));assert.equal(r.status,'unavailable');assert.ok(!/MissingDriverHelper|badDriverValue|DriverHelper|JudgeMain|compiler\.|\.java:\d/.test(JSON.stringify(r)));}
 const noisy='class Solution {public static int add(int a,int b){System.err.println("\\033[31mprivate="+a+" (Solution.java:1)\\033[0m");System.err.println("Leaked"+a+"Exception");return a+b;}}';
 const h=driver('System.out.println(Solution.add(765432101,4));');
 for(const [source,want]of [[noisy,'accepted'],[noisy.replace('return a+b;','return a-b;'),'wrong_answer']]){const r=call(fn(source,h));assert.equal(r.status,'ran');assert.equal(r.stderr,'');const scored=evaluateContract(r,{groups:[['765432105']],expected:['765432105']});assert.equal(scored.status,want);assert.equal(scored.stderr,'');assert.ok(!/Leaked|private=|Solution\.java:1|\u001b/.test(JSON.stringify(scored)));}
});

test('Java真实分阶段接口：精确返回/继承/变参/辅助类型/额外类与可信class保护', {skip:!runtime,timeout:90000},()=>{
 const voidSpec={name:'emit',returnType:'void',parameterTypes:[]};
 for(const source of ['class Solution {public static int emit(){System.out.print("PASS");return 1;}}','class Solution {public static String emit(){return "PASS";}}']){
  const r=call(fn(source,driver('Solution.emit();'),{interfaceSpec:voidSpec}));assert.equal(r.status,'compile_error');assert.equal(r.stdout,'');assert.ok(r.stderr.includes('接口')||r.stderr.includes('返回类型'));
 }
 const inherited=call(fn('class Base {public static int add(int a,int b){return a+b;}} class Extra {} class Solution extends Base {}',driver('System.out.print(Solution.add(2,3));')));assert.equal(inherited.status,'ran');assert.equal(inherited.stdout,'5');
 const varargs=call(fn('class Solution {public static int sum(int... values){int s=0;for(int v:values)s+=v;return s;}}',driver('System.out.print(Solution.sum(new int[]{2,3,4}));'),{interfaceSpec:{name:'sum',returnType:'int',parameterTypes:['int[]']}}));assert.equal(varargs.status,'ran');assert.equal(varargs.stdout,'9');
 const badVarargsDriver=call(fn('class Solution {public static int sum(int[] values){return 9;}}',driver('System.out.print(Solution.sum(2,3,4));'),{interfaceSpec:{name:'sum',returnType:'int',parameterTypes:['int[]']}}));assert.equal(badVarargsDriver.status,'unavailable');
 const arrays=call(fn('class Solution {public static Provided.Nested[] same(Provided.Nested[] a){return a;}}',driver('Provided.Nested[] a={new Provided.Nested()};System.out.print(Solution.same(a)==a);'),{prelude:'class Provided {static class Nested {}}',interfaceSpec:{name:'same',returnType:'Provided.Nested[]',parameterTypes:['Provided.Nested[]']}}));assert.equal(arrays.status,'ran');assert.equal(arrays.stdout,'true');
 const recordSort=call(fn('public class Solution {public static void stableInsertion(SortRecord[] a,int n){for(int i=1;i<n;i++){SortRecord x=a[i];int j=i;while(j>0&&a[j-1].key>x.key){a[j]=a[j-1];j--;}a[j]=x;}}}',driver('SortRecord[] a={new SortRecord(2,9),new SortRecord(1,7)};Solution.stableInsertion(a,2);System.out.print(a[0].key+","+a[0].identity);'),{prelude:'final class SortRecord { final int key, identity; SortRecord(int k,int i){ key=k; identity=i; } }',interfaceSpec:{name:'stableInsertion',returnType:'void',parameterTypes:['SortRecord[]','int']}}));assert.equal(recordSort.status,'ran');assert.equal(recordSort.stdout,'1,7');
 const shadow=call(fn('class System {} class Solution {public static int add(int a,int b){return a+b;}}',driver('System.out.print(Solution.add(2,3));')));assert.equal(shadow.status,'ran');assert.equal(shadow.stdout,'5');
 const noInit=call(fn('class Solution {static {if(java.lang.System.nanoTime()!=0)throw new IllegalStateException("PRIVATE");}public static int add(int a,int b){return a+b;}}',driver('System.out.print(Solution.add(2,3));')));assert.equal(noInit.status,'runtime_error');assert.equal(noInit.stderr,'');
 const wrongWithInit=call(fn('class Solution {static {while(java.lang.System.nanoTime()!=0){}}public static String add(int a,int b){return "bad";}}',driver('System.out.print(Solution.add(2,3));')));assert.equal(wrongWithInit.status,'compile_error');
 const missing=call(fn('class Other {}',driver('System.out.print(Solution.add(2,3));')));assert.equal(missing.status,'compile_error');assert.equal(missing.stdout,'');
 const duplicate=call(fn('class Provided {static class Nested {int changed=7;}}class Solution {public static int add(int a,int b){return a+b;}}',driver('System.out.print(Solution.add(2,3));'),{prelude:'class Provided {static class Nested {}}'}));assert.equal(duplicate.status,'compile_error');assert.equal(duplicate.stdout,'');
 const supportDriver='public class JudgeMain {static class Support {} public static void main(String[]args){System.out.print(Solution.add(2,3));}}';
 for(const type of ['JudgeMain','JudgeMain$Support']){
  const overwrite=call(fn(`class ${type} {int changed=7;}class Solution {public static int add(int a,int b){return a+b;}}`,supportDriver));assert.equal(overwrite.status,'compile_error');assert.ok(overwrite.stderr.includes('提供的类'));
 }
});

test('Java真实可信class缺失按服务故障处理，不能把不完整配置算作学生错误',{skip:!runtime,timeout:90000},()=>{
 const script=String.raw`import java_appcontainer as helper
original=helper.run_limited
removed=[False]
def missing_after_student(*args,**kwargs):
    result=original(*args,**kwargs)
    if '-sourcepath' in args[0] and result['status']=='exited' and result['exit_code']==0:
        (kwargs['profile'].work/'JudgeMain.class').unlink()
        removed[0]=True
    return result
helper.run_limited=missing_after_student
result=worker.process_request(json.load(sys.stdin))
print(json.dumps({'removed':removed[0],'result':result},ensure_ascii=False))`;
 const r=pureWorker("sys.path.insert(0,'scripts')\n"+script,fn('class Solution {public static int add(int a,int b){return a+b;}}',driver('System.out.print(Solution.add(2,3));')));
 assert.equal(r.removed,true);assert.equal(r.result.status,'unavailable');noHostPath(r);observations.push({missingTrustedClass:r});
});

test('Java真实限额：运行超时/堆内存/输出上限与多配置合计输出预算',{skip:!runtime,timeout:90000},()=>{
 const loop=call({language:'java',source:main('while(true)Thread.onSpinWait();')});assert.equal(loop.status,'time_limit');
 const memory=call({language:'java',source:main('byte[] data=new byte[1024*1024*1024];System.out.print(data.length);')});assert.equal(memory.status,'runtime_error');assert.ok(memory.message.includes('内存'));noHostPath(memory);
 const flood=call({language:'java',source:main('System.out.print("x".repeat(90000));')});assert.equal(flood.status,'output_limit');assert.ok(Buffer.byteLength(flood.stdout)+Buffer.byteLength(flood.stderr)<=65536);
 const binary=call({language:'java',source:main('for(int i=0;i<30000;i++)System.out.write(255);')});assert.equal(binary.status,'output_limit');assert.ok(Buffer.byteLength(binary.stdout)+Buffer.byteLength(binary.stderr)<=65536);
 const atLimit=call(fn('class Solution {public static void emit(){System.out.print("x".repeat(65536));}}',driver('Solution.emit();'),{interfaceSpec:{name:'emit',returnType:'void',parameterTypes:[]}}));assert.equal(atLimit.status,'ran');assert.equal(Buffer.byteLength(atLimit.stdout),65536);assert.equal(atLimit.stderr,'');
 const overLimit=call(fn('class Solution {public static void emit(){System.out.print("x".repeat(65537));}}',driver('Solution.emit();'),{interfaceSpec:{name:'emit',returnType:'void',parameterTypes:[]}}));assert.equal(overLimit.status,'output_limit');assert.equal(overLimit.stdout,'');
 const atLimitVariants=call({language:'java',source:'class Solution {public static void emit(){System.out.print("x".repeat(32768));}}',trusted_driver:true,interfaceSpec:{name:'emit',returnType:'void',parameterTypes:[]},variants:[{harness:driver('Solution.emit();')},{harness:driver('Solution.emit();')}]});assert.equal(atLimitVariants.status,'variants');assert.equal(atLimitVariants.results.length,2);for(const r of atLimitVariants.results)assert.equal(r.status,'ran');assert.equal(atLimitVariants.results.reduce((n,r)=>n+Buffer.byteLength(r.stdout),0),65536);
 const r=call({language:'java',source:'class Solution {public static void emit(){System.out.print("x".repeat(40000));}}',trusted_driver:true,interfaceSpec:{name:'emit',returnType:'void',parameterTypes:[]},variants:[{harness:driver('Solution.emit();')},{harness:driver('Solution.emit();')}]});
 assert.equal(r.status,'variants');assert.equal(r.results[0].status,'ran');assert.equal(r.results[1].status,'output_limit');assert.ok(r.results.reduce((n,r)=>n+Buffer.byteLength(r.stdout)+Buffer.byteLength(r.stderr),0)<=65536);
});

test('Java真实配置故障保持unavailable，token/Job失败时零Resume且无裸跑降级',{skip:!runtime,timeout:90000},()=>{
 const missing=call({language:'java',source:main('System.out.print("OK");')},{JUDGE_JAVA_HOME:root+'tests/no-such-owned-java-home'});assert.equal(missing.status,'unavailable');noHostPath(missing);
 const script=String.raw`import sys,importlib.util,json
sys.path.insert(0,'scripts')
spec=importlib.util.spec_from_file_location('javaworker','scripts/judge-java-worker.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
import java_appcontainer as helper
resumes=[0];original_resume=helper.K.ResumeThread
def resumed(handle):resumes[0]+=1;return original_resume(handle)
helper.K.ResumeThread=resumed
original_verify=helper._verify_token
def failed(*args):raise helper.HostError('owned verification test')
helper._verify_token=failed
payload={'language':'java','source':'public class Main {public static void main(String[]args){System.out.print("NEVER");}}'}
token=worker.process_request(payload);helper._verify_token=original_verify
original_assign=helper.K.AssignProcessToJobObject;helper.K.AssignProcessToJobObject=lambda *args:False
job=worker.process_request(payload);helper.K.AssignProcessToJobObject=original_assign
print(json.dumps({'token':token,'job':job,'resumes':resumes[0]}))`;
 const child=spawnSync(python,['-c',script],{cwd:root,env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',windowsHide:true,timeout:30000});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);const r=JSON.parse(child.stdout);assert.equal(r.token.status,'unavailable');assert.equal(r.job.status,'unavailable');assert.equal(r.resumes,0);assert.ok(!JSON.stringify(r).includes('NEVER'));noHostPath(r);observations.push({failureInjection:r});
});

test.after(()=>{
 if(!runtime)return;
 mkdirSync(evidence,{recursive:true});
 writeFileSync(evidence+'运行器回归实测.json',JSON.stringify({recordedAt:new Date().toISOString(),files:workerFiles.map(path=>({path,sha256:hash(readFileSync(root+path))})),testSha256:hash(readFileSync(new URL(import.meta.url))),actualJavaVia:'scripts/java_appcontainer.py AppContainer+Job only',observations},null,2)+'\n');
});
