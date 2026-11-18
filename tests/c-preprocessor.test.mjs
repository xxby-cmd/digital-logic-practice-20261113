import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {cPreprocessorPractice} from '../bank-c-preprocessor.js';
import {cPreprocessorGuides} from '../c-preprocessor-guides.js';
import {cPreprocessorContract,cPreprocessorContractIds,cPreprocessorReferenceSources} from '../scripts/judge-c-preprocessor.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const bank=cPreprocessorPractice.programming,key=(kind,n)=>`C6M-programming-7-${kind}-${String(n).padStart(3,'0')}`;
const configs=c=>c.variants||[c];
const project=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/C预处理/',import.meta.url));
test('预处理100题为64选择15填空21宏任务，接口和私有36契约完整',()=>{
 assert.equal(bank.length,100);assert.equal(new Set(bank.map(q=>q.id)).size,100);
 assert.equal(new Set(bank.map(q=>q.stem.normalize('NFKC').replace(/\s/g,''))).size,100);
 assert.deepEqual(['选择题','程序填空','编程题'].map(s=>bank.filter(q=>q.section===s).length),[64,15,21]);
 const code=bank.filter(q=>q.coding);assert.equal(code.length,36);assert.deepEqual(code.map(q=>q.id).sort(),[...cPreprocessorContractIds].sort());
 for(const q of bank){assert.equal(q.chapter,7);assert.equal(q.pool,'practice');assert.equal(q.origin,'原创');assert.ok(!/上一题|同上|前题/.test(q.stem));assert.ok(q.studyEvidence);assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  if(q.type==='single'){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>30);continue;}
  assert.ok(cPreprocessorGuides[q.id].instruction.includes('提交'));assert.ok(cPreprocessorGuides[q.id].starter);assert.ok(q.model.length>45,q.id);assert.ok(q.rubric.length>=3);
  const c=cPreprocessorContract(q.id);assert.ok(configs(c).length>=1&&configs(c).length<=4);assert.ok(cPreprocessorReferenceSources[q.id]);
  for(const v of configs(c)){assert.ok(v.harness.includes('int main(void)'));assert.ok(v.groups.length>=1);assert.deepEqual(v.expected,v.groups.flat());assert.ok(Buffer.byteLength(v.prelude+v.harness)<262144);const out=v.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout:out},v).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:out+'extra\n'},v).status,'wrong_answer');}
 }
 assert.equal(cPreprocessorContract('unknown'),null);
});
test('配置按已定域独立变化，关闭配置、零配置、双功能和已有头均覆盖',()=>{
 const variants=n=>cPreprocessorContract(key('P',n)).variants;
 assert.equal(variants(10).length,3);assert.ok(variants(10).some(v=>v.prelude.includes('#define LIMIT 0')));
 assert.equal(variants(11).length,3);assert.equal(variants(12).length,2);assert.equal(variants(15).length,4);
 assert.ok(variants(13).some(v=>v.prelude.includes('#define FLAG 0')));
 assert.ok(variants(17).some(v=>v.prelude.includes('#define DEBUG -1')));
 assert.equal(variants(17).length,4);assert.ok(variants(17).some(v=>v.prelude.includes('#define DEBUG 2')));
 assert.ok(cPreprocessorContract(key('B',1)).harness.includes('#define BASE 1<<2'));
 assert.ok(cPreprocessorContract(key('B',1)).harness.includes('#define OFFSET 1<<2'));
 assert.ok(cPreprocessorContract(key('B',9)).harness.includes('mp_seq'));
 assert.ok(cPreprocessorContract(key('B',9)).harness.includes('mp_alias=1'));
 assert.ok(cPreprocessorContract(key('P',3)).harness.includes('ASSIGN_MIN(*mp_dstSlot()'));
 assert.ok(cPreprocessorContract(key('P',8)).harness.includes('FIELD_PTR(*box,count)'));
 assert.ok(variants(13).every(v=>v.harness.includes('external_FLAG')));
 assert.ok(variants(17).every(v=>v.harness.includes('external_DEBUG')));
 assert.ok(variants(18)[0].prelude.includes('safeVersion')&&!variants(18)[0].prelude.includes('fastVersion'));
 assert.ok(variants(18)[1].prelude.includes('fastVersion')&&!variants(18)[1].prelude.includes('safeVersion'));
 const c=cPreprocessorContract(key('P',10)),raw={status:'variants',results:c.variants.map(v=>({status:'ran',stdout:v.groups.map(g=>g.join(' ')).join('\n')+'\n'}))};assert.equal(evaluateContract(raw,c).status,'accepted');
 raw.results[1].stdout='8\n';assert.equal(evaluateContract(raw,c).status,'wrong_answer');
});
const bad={
 [key('B',1)]:'#define SPAN BASE+OFFSET',
 [key('B',2)]:'#define PRODUCT(a,b) (a*b)',
 [key('B',3)]:'#define BETWEEN(x,lo,hi) ((lo)<=(x)<=(hi))',
 [key('B',4)]:'#define CHOOSE(flag,a,b) ((flag)==1?(a):(b))',
 [key('B',5)]:'#define ALL_BITS(word,mask) (((word)&(mask))!=0)',
 [key('B',6)]:'#define RAW_TEXT(x) "x"',
 [key('B',7)]:'#define EXP_TEXT(x) #x',
 [key('B',8)]:'#define SLOT(n) MP_LOCAL_SLOT(n)\n#define MP_LOCAL_SLOT(n) item##n',
 [key('B',9)]:'#define RESET_BOTH(a,b) do{(a)=0;}while(0)',
 [key('B',10)]:'#define ADD_TO(total,delta) do{(total)=(total)+(delta);}while(0)',
 [key('B',11)]:'#define RETURN_UNLESS(cond,value) do{if(cond)return(value);}while(0)',
 [key('B',12)]:'#define SET_VALUE(dst,value) ((dst)=(value),(dst))',
 [key('B',13)]:'#define ELEMENTS(a) (sizeof(a)/sizeof(int))',
 [key('B',14)]:'#define AT(a,i) ((a)[0])',
 [key('B',15)]:'#define BOOL_VALUE(x) ((x)!=0?2:0)',
 [key('P',1)]:'#define MIN_ONCE(a,b) ((a)<(b)?(a):(b))',
 [key('P',2)]:'#define BOTH(a,b) ((a)&(b))',
 [key('P',3)]:'#define ASSIGN_MIN(dst,a,b) do{int temp=(a);int saved=(b);(dst)=temp<saved?temp:saved;}while(0)',
 [key('P',4)]:'#define REPEAT_N(n,statement) do{for(int MP_LOCAL_i=0;MP_LOCAL_i<(n);MP_LOCAL_i++){statement;}}while(0)',
 [key('P',5)]:'#define TEMP_FLAG(flag,statement) do{int saved=(flag);(flag)=1;statement;(flag)=saved;}while(0)',
 [key('P',6)]:'#define INDEX_LOOP(i,n) for(int i=0;i<(n);i++)',
 [key('P',7)]:'#define ZERO_ARRAY(name,type,n) int name[n]={0}',
 [key('P',8)]:'#define FIELD_PTR(obj,member) (&(a[0].member))',
 [key('P',9)]:'#define CAT_EXPAND(a,b) a##b',
 [key('P',10)]:'#if !defined(LIMIT) || LIMIT==0\n#undef LIMIT\n#define LIMIT 8\n#endif',
 [key('P',11)]:'#if VERSION==0\n#define API_LEVEL 10\n#else\n#define API_LEVEL 20\n#endif',
 [key('P',12)]:'#define MP_BOX_H\ntypedef struct{int number;}MacroBox;',
 [key('P',13)]:'#if defined(FLAG) && FLAG\n#define FLAG_PRESENT 1\n#else\n#define FLAG_PRESENT 0\n#endif',
 [key('P',14)]:'#define NEW_MODE 2',
 [key('P',15)]:'#ifdef FEATURE_A\n#define USE_A 1\n#endif\n#ifdef FEATURE_B\n#define USE_B 1\n#endif',
 [key('P',16)]:'typedef double Numeric;',
 [key('P',17)]:'#define DEBUG_LOG(expr) do{emit(expr);}while(0)',
 [key('P',18)]:'int compute(int x){return fastVersion(x);}',
 [key('P',19)]:'#define MAKE_GETTER(name,obj) int name(void){static int first=1,saved;if(first){saved=(obj);first=0;}return saved;}',
 [key('P',20)]:'#define CONST_DECLARE(type,name,value) const int name=(value)',
 [key('P',21)]:'#define LIT_JOIN(a,b) a'
};
test('合法宏语义样例在C17中执行，不执行未定序修改或无效记号拼接',{skip:process.env.JUDGE_MACRO_CHOICES!=='1'},()=>{
 const source=String.raw`#include <stdio.h>
#include <string.h>
#define MC_N 6
#define MC_BASE 4
#define MC_NEXT (MC_BASE+1)
#undef MC_BASE
#define MC_BASE 8
#define A 2
#define B 3
#define MC_TOTAL A+B
#define MC_SUM(a,b) ((a)+(b))
#define MC_PICK(a,b) ((a)>(b)?(a):(b))
int mc_ca,mc_cb;int mc_a(void){mc_ca++;return 5;}int mc_b(void){mc_cb++;return 2;}
#define MC_HALF(x) ((x)/2)
#define FLAG 0
#ifdef FLAG
enum{mc_has=1};
#else
enum{mc_has=0};
#endif
#if FLAG
enum{mc_truth=1};
#else
enum{mc_truth=0};
#endif
#if MC_UNKNOWN
enum{mc_unknown=1};
#else
enum{mc_unknown=0};
#endif
enum{MC_ENUM=3};
#if MC_ENUM==3
enum{mc_enum_condition=1};
#else
enum{mc_enum_condition=0};
#endif
#define MC_PTR int *
typedef int *McPtr;
#define MARK
#ifdef MARK
enum{mc_mark=1};
#else
enum{mc_mark=0};
#endif
int mc_unused(void){
#define MC_LOCAL 5
return 0;}
#define MC_F(x) ((x)+1)
#define MC_RAW(x) #x
#define N 9
#define MC_JOIN(a,b) a##b
#define MC_TEXT(x) "x"
#define MC_IGNORE(x) 1
int mc_tick_count;int mc_tick(void){mc_tick_count++;return 5;}
#define MC_WHEN(c,x) ((c)?(x):0)
#define MC_STOP do{break;}while(0)
#define MC_RETURN do{return 9;}while(0)
int mc_return(void){MC_RETURN;return 1;}
#define MC_SNAPSHOT_BASE 1
#define MC_V MC_SNAPSHOT_BASE
const int mc_saved=MC_V;
#undef MC_SNAPSHOT_BASE
#define MC_SNAPSHOT_BASE 2
int MC_LATE=5;
int mc_before(void){return MC_LATE;}
#define MC_LATE 8
int mc_after(void){return MC_LATE;}
int main(void){
printf("S4 N=%d\n",MC_N);
printf("S6 %d\n",MC_NEXT);
printf("S8 %d %d %d %d\n",20/MC_TOTAL,MC_TOTAL+1,MC_TOTAL-1,MC_TOTAL==5);
printf("S10 %d\n",12/MC_SUM(1,2));
int once=0;do{once++;}while(0);printf("S14 %d\n",once);
int chosen=MC_PICK(mc_a(),mc_b());printf("S17 %d %d %d\n",chosen,mc_ca,mc_cb);
printf("S18 %.1f %d\n",MC_HALF(5.0),MC_HALF(5));
printf("S21 %d %d\n",mc_has,mc_truth);printf("S23 %d\n",mc_unknown);
printf("S29 %d %d\n",MC_ENUM,mc_enum_condition);
MC_PTR pa,pb;McPtr pc,pd;printf("S30 %d %d %d %d\n",_Generic(&pa,int**:1,default:0),_Generic(&pb,int*:1,default:0),_Generic(&pc,int**:1,default:0),_Generic(&pd,int**:1,default:0));
printf("S32 %d\n",mc_mark);printf("S39 %d\n",MC_LOCAL);printf("S40 %d\n",MC_F (3));
printf("S45 %d\n",strcmp(MC_RAW(N),"N")==0);
int item2=7;printf("S46 %d\n",MC_JOIN(item,2));
char s[]="ab" "cd";printf("S48 %d %d\n",strcmp(s,"abcd")==0,(int)sizeof s);
printf("S49 %d\n",strcmp(MC_TEXT(hello),"x")==0);
int ignored=MC_IGNORE(mc_tick());printf("S50 %d %d\n",ignored,mc_tick_count);
int first=MC_WHEN(0,mc_tick());int second=MC_WHEN(1,mc_tick());printf("S51 %d %d %d\n",first,second,mc_tick_count);
int count=0;for(int i=0;i<3;i++){MC_STOP;count++;}printf("S55 %d\n",count);
printf("S56 %d\n",mc_return());printf("S62 %d %d\n",mc_saved,MC_V);printf("S64 %d %d\n",mc_before(),mc_after());
return 0;}`;
 const groups=[['S4','N=6'],['S6','9'],['S8','13','6','4','1'],['S10','4'],['S14','1'],['S17','5','2','1'],['S18','2.5','2'],['S21','1','0'],['S23','0'],['S29','3','0'],['S30','1','1','1','1'],['S32','1'],['S39','5'],['S40','4'],['S45','1'],['S46','7'],['S48','1','5'],['S49','1'],['S50','1','0'],['S51','0','5','1'],['S55','3'],['S56','9'],['S62','1','2'],['S64','5','8']];
 const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify({source}),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});assert.equal(child.error,undefined);const raw=JSON.parse(child.stdout),result=evaluateContract(raw,{groups,expected:groups.flat()});mkdirSync(evidence,{recursive:true});writeFileSync(evidence+'选择语义实编.json',JSON.stringify({time:new Date().toISOString(),ids:groups.map(g=>key('S',Number(g[0].slice(1)))),result,stdout:raw.stdout,detail:raw.stderr,scope:'24个合法语义示例；非64题所有选项穷举；不执行已知UB的SQR(i++)或无效##例。'},null,2));assert.equal(result.status,'accepted',JSON.stringify(raw));
});
function run(id,source){const c=cPreprocessorContract(id),payload=c.variants?{source,variants:c.variants}:{source,prelude:c.prelude,harness:c.harness};const child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify(payload),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});assert.equal(child.error,undefined,`${id}: ${child.error}`);assert.equal(child.status,0,`${id}: ${child.stderr}`);const raw=JSON.parse(child.stdout),result=evaluateContract(raw,c);return {...result,id,sourceSha256:createHash('sha256').update(source).digest('hex'),contractSha256:createHash('sha256').update(JSON.stringify(c)).digest('hex'),configurations:configs(c).length,...(!['ran','variants'].includes(raw.status)?{detail:raw.stderr||raw.message}:{}),...(raw.results?.some(v=>v.status!=='ran')?{details:raw.results.filter(v=>v.status!=='ran').map(v=>({status:v.status,detail:v.stderr||v.message}))}:{})};}
test('36宏/片段真实C17编译：53配置参考、逐题核心错码及等价定义',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const results=[],requested=process.env.JUDGE_MACRO_TARGETS?.split(','),selected=requested?cPreprocessorContractIds.filter(id=>requested.includes(id)):cPreprocessorContractIds;
 assert.equal(selected.length,requested?.length??36);let complete=false;
 const check=(id,source,kind)=>{const value={...run(id,source),kind};results.push(value);return value;};
 try{
  for(const id of selected){const result=check(id,cPreprocessorReferenceSources[id],'reference');assert.equal(result.status,'accepted',JSON.stringify(result));}
  assert.deepEqual(Object.keys(bad).sort(),[...cPreprocessorContractIds].sort());
  for(const id of selected){const result=check(id,bad[id],'core-error');assert.ok(['wrong_answer','compile_error'].includes(result.status),JSON.stringify(result));}
  const equal=[
   [key('B',2),'#define PRODUCT(a,b) ((b)*(a))'],
   [key('B',3),'#define BETWEEN(x,lo,hi) (!((x)<(lo)||(x)>(hi)))'],
   [key('B',4),'#define CHOOSE(flag,a,b) ((flag)==0?(b):(a))'],
   [key('P',1),'#define MIN_ONCE(a,b) (minInt((b),(a)))'],
   [key('P',3),'#define ASSIGN_MIN(dst,a,b) do{int MP_LOCAL_a=(a);int MP_LOCAL_b=(b);if(MP_LOCAL_a<MP_LOCAL_b)(dst)=MP_LOCAL_a;else (dst)=MP_LOCAL_b;}while(0)'],
   [key('P',10),'#if !defined(LIMIT)\n#define LIMIT 8\n#endif'],
   [key('P',12),'#if !defined(MP_BOX_H)\n#define MP_BOX_H\ntypedef struct{int number;}MacroBox;\n#endif'],
   [key('P',15),'#if FEATURE_A==1\n#define USE_A 1\n#endif\n#if FEATURE_B==1\n#define USE_B 1\n#endif'],
   [key('P',16),'#if USE_REAL==0\ntypedef int Numeric;\n#else\ntypedef double Numeric;\n#endif'],
   [key('P',17),'#if !defined(DEBUG) || DEBUG==0\n#define DEBUG_LOG(expr) ((void)0)\n#else\n#define DEBUG_LOG(expr) (emit((expr)))\n#endif'],
   [key('P',20),'#define CONST_DECLARE(type,name,value) type const name=(value)']
  ];
  for(const [id,source]of equal.filter(([id])=>selected.includes(id))){const result=check(id,source,'equivalent');assert.equal(result.status,'accepted',JSON.stringify(result));}
  const boundaryBad=[
   [key('B',2),'#define PRODUCT(a,b) (a)*(b)'],
   [key('B',9),'#define RESET_BOTH(a,b) {(a)=0;(b)=0;}'],
   [key('B',10),'#define ADD_TO(total,delta) {(total)+=(delta);}'],
   [key('P',3),'#define ASSIGN_MIN(dst,a,b) int MP_LOCAL_a=(a);int MP_LOCAL_b=(b);(dst)=MP_LOCAL_a<MP_LOCAL_b?MP_LOCAL_a:MP_LOCAL_b'],
   [key('P',5),'#define TEMP_FLAG(flag,statement) do{int MP_LOCAL_old=(flag);(flag)=1;statement;(flag)=0;}while(0)'],
   [key('P',15),'#if FEATURE_A\n#define USE_A 1\n#elif FEATURE_B\n#define USE_B 1\n#endif'],
   [key('P',17),'#if defined(DEBUG) && DEBUG==1\n#define DEBUG_LOG(expr) do{emit(expr);}while(0)\n#else\n#define DEBUG_LOG(expr) do{}while(0)\n#endif']
  ];
  for(const [id,source]of boundaryBad.filter(([id])=>selected.includes(id))){const result=check(id,source,'boundary-error');assert.ok(['wrong_answer','compile_error'].includes(result.status),JSON.stringify(result));}
  const reviewBad=[
   [key('B',1),'#define SPAN (BASE+OFFSET)','operand-grouping'],
   [key('B',9),'#define RESET_BOTH(a,b) do{(b)=0;(a)=0;}while(0)','reverse-assignment'],
   [key('P',3),'#define ASSIGN_MIN(dst,a,b) do{int MP_LOCAL_a=(a);int MP_LOCAL_b=(b);(dst)=MP_LOCAL_a<MP_LOCAL_b?MP_LOCAL_a:MP_LOCAL_b;(void)(dst);}while(0)','repeat-destination'],
   [key('P',8),'#define FIELD_PTR(obj,member) (&obj.member)','object-grouping'],
   [key('P',13),'#ifdef FLAG\n#define FLAG_PRESENT 1\n#else\n#define FLAG_PRESENT 0\n#endif\n#undef FLAG','remove-flag'],
   [key('P',17),'#if defined(DEBUG) && DEBUG\n#define DEBUG_LOG(expr) do{emit((expr));}while(0)\n#else\n#define DEBUG_LOG(expr) do{}while(0)\n#endif\n#undef DEBUG','remove-debug'],
   [key('P',17),'#if defined(DEBUG) && DEBUG<0\n#define DEBUG_LOG(expr) do{emit((expr));}while(0)\n#else\n#define DEBUG_LOG(expr) do{}while(0)\n#endif','negative-debug-only'],
   [key('B',3),'#define BETWEEN(x,lo,hi) ((x)>=(lo))&&((x)<=(hi))','range-whole-grouping'],
   [key('B',4),'#define CHOOSE(flag,a,b) (flag)?(a):(b)','choice-whole-grouping'],
   [key('B',5),'#define ALL_BITS(word,mask) ((word&mask)==mask)','bit-operand-grouping'],
   [key('P',2),'#define BOTH(a,b) (a)&&(b)','logic-whole-grouping'],
   [key('P',3),'#define ASSIGN_MIN(dst,a,b) do{int MP_LOCAL_a=(a);int MP_LOCAL_b=(b);(void)MP_LOCAL_b;(dst)=MP_LOCAL_a;}while(0)','always-first'],
   [key('P',7),'#define ZERO_ARRAY(name,type,n) type name[n]; for(int MP_LOCAL_i=0;MP_LOCAL_i<(n);MP_LOCAL_i++) name[MP_LOCAL_i]=0','block-only-declaration']
  ];
  for(const [id,source,label]of reviewBad.filter(([id])=>selected.includes(id))){const result=check(id,source,`review-error:${label}`);assert.ok(['wrong_answer','compile_error'].includes(result.status),JSON.stringify(result));}
  complete=true;
 }finally{mkdirSync(evidence,{recursive:true});const file=evidence+(requested?'定向复核.json':'真实判题验证.json');let prior;try{if(requested)prior=JSON.parse(readFileSync(file,'utf8'));}catch{}const records=[...(prior?.results||[]).filter(old=>!results.some(r=>r.id===old.id&&r.kind===old.kind)),...results],allIds=[...new Set([...(prior?.ids||[]),...selected])];writeFileSync(file,JSON.stringify({time:new Date().toISOString(),complete,ids:allIds,questionCount:allIds.length,configurations:allIds.reduce((s,id)=>s+configs(cPreprocessorContract(id)).length,0),groups:allIds.reduce((s,id)=>s+configs(cPreprocessorContract(id)).reduce((a,c)=>a+c.groups.length,0),0),limits:['所有配置由服务端契约生成，每个重新编译；无客户端注入。','有限测试不证明任意记号实参、所有命名冲突或全部源级要求。','测试不执行已知未定序修改表达式；重复求值用稳定返回且计数的函数观察。'],results:records},null,2));}
});
