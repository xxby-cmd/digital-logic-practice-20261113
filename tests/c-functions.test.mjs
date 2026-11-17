import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cFunctionsPractice} from '../bank-c-functions.js';
import {cFunctionsGuides} from '../c-functions-guides.js';
import {cFunctionsContract,cFunctionsContractIds,cFunctionsReferenceSources} from '../scripts/judge-c-functions.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const bank=cFunctionsPractice.programming;
const key=(kind,n)=>`C6F-programming-5-${kind}-${String(n).padStart(3,'0')}`;
test('函数章99题含55选择15程序填空29编程，44代码题接口与分组契约完整',()=>{
 assert.equal(bank.length,99);assert.equal(new Set(bank.map(q=>q.id)).size,99);
 assert.equal(new Set(bank.map(q=>q.stem.normalize('NFKC').replace(/\s/g,''))).size,99);
 assert.deepEqual(['选择题','程序填空','编程题'].map(s=>bank.filter(q=>q.section===s).length),[55,15,29]);
 const code=bank.filter(q=>q.coding);assert.equal(code.length,44);
 assert.deepEqual(code.map(q=>q.id).sort(),[...cFunctionsContractIds].sort());
 for(const q of bank){assert.equal(q.chapter,5);assert.equal(q.pool,'practice');assert.equal(q.origin,'原创');assert.ok(!/同上|上一题|前题定义/.test(q.stem));assert.ok(q.studyEvidence);assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  if(q.type==='single'){assert.equal(new Set(q.options).size,4);assert.ok(q.answer>=0&&q.answer<4);assert.ok(q.explanation.length>30);continue;}
  assert.ok(q.model.length>=55,q.id);assert.ok(q.rubric.length>=3,q.id);assert.ok(cFunctionsGuides[q.id].instruction.includes('提交'));assert.ok(cFunctionsGuides[q.id].starter.includes('('));
  if(q.section==='程序填空')assert.ok(q.codeStarter.includes('/* 空'),q.id);
  const c=cFunctionsContract(q.id);assert.ok(c.harness.includes('int main(void)'));assert.ok(c.groups.length>=3,q.id);assert.deepEqual(c.expected,c.groups.flat());assert.ok(cFunctionsReferenceSources[q.id]);
  const text=c.groups.map(g=>g.join(' ')).join('\n')+'\n';assert.equal(evaluateContract({status:'ran',stdout:text},c).status,'accepted');assert.equal(evaluateContract({status:'ran',stdout:text+'extra\n'},c).status,'wrong_answer');
 }
 assert.equal(cFunctionsContract('not-a-task'),null);
});
test('调用与状态题明确重置/对象，递归返回与期望由不同表示交叉核验',()=>{
 for(const [kind,n]of [['B',5],['P',16],['P',17],['P',29]]){const q=bank.find(q=>q.id===key(kind,n));assert.ok(/同一进程/.test(q.stem),q.id);assert.ok(/重置|清空|清零/.test(q.stem),q.id);}
 assert.ok(cFunctionsContract(key('B',7)).harness.includes('1,2,3,1'));
 assert.ok(cFunctionsContract(key('P',24)).harness.includes('optionalValue(0'));
 assert.ok(cFunctionsContract(key('P',3)).harness.includes('cf_calls'));
 assert.ok(cFunctionsContract(key('P',22)).harness.includes('qsort'));
 // A queue model of the halving chain includes the base activation.
 for(const n of [0,1,13,1000000000]){let values=[n];while(values.at(-1)!==0)values.push(Math.floor(values.at(-1)/2));assert.equal(values.length,n?Math.floor(Math.log2(n))+2:1);}
 const rank=[2,0,3,1],ids=[0,1,2,3];assert.equal(ids.reduce((a,b)=>rank[a]>rank[b]?a:b),2);
});

const mutations={
 [key('B',1)]:'int frames(unsigned n){if(!n)return 0;return 1+frames(n/2);}',
 [key('B',2)]:"void shells(int n){for(int i=0;i<n;i++){putchar('(');putchar(')');}}",
 [key('B',3)]:'int callNodes(int n){if(n<=1)return 1;return callNodes(n/2)+callNodes(n/3);}',
 [key('B',4)]:'int pipeline(int x){firstStep(x);return secondStep(x);}',
 [key('B',5)]:'int ticket(int reset){int serial=0;if(reset)return 0;return ++serial;}',
 [key('B',6)]:'void record(Count*s,int value){s->calls=1;s->total=value;}',
 [key('B',7)]:'int mirror(const int*a,int l,int r){return l>=r||a[l]==a[r];}',
 [key('B',8)]:"int unit(const char*s,int*p){if(s[*p]=='a'){(*p)++;return 1;}if(s[*p]=='('){(*p)++;if(unit(s,p)&&s[*p]==')'){(*p)++;return 1;}}return 0;}",
 [key('B',9)]:'void hanoi(int n,char a,char b,char c){if(!n)return;hanoi(n-1,a,b,c);move(a,c);hanoi(n-1,b,a,c);}',
 [key('B',10)]:'int journeys(int n,int previousTwo){if(!n)return 1;return journeys(n-1,0)+(n>=2?journeys(n-2,0):0);}',
 [key('B',11)]:"int readAB(const char*s){if(!*s)return 1;return *s=='a'&&needB(s+1);}int needB(const char*s){if(!*s)return 1;return *s=='b'&&readAB(s+1);}",
 [key('B',12)]:'int rise(int n,int*v){if(!n)return 0;(*v)++;return rise(n-1,v)+n;}',
 [key('B',13)]:'int getScaled(int x,int*out){int v;*out=0;if(!probe(x,&v))return 0;*out=v*2;return 1;}',
 [key('B',14)]:"void rows(int n){if(!n)return;for(int i=0;i<n;i++)putchar('*');putchar('\\n');rows(n-1);}",
 [key('B',15)]:'int lex(const char*a,const char*b){return *a==*b?0:*a<*b?-1:1;}',
 [key('P',1)]:'int joined(int x,int*out){int a,b;if(!stageA(x,&a))return 0;*out=a;if(!stageB(a,&b))return 0;*out=b;return 1;}',
 [key('P',2)]:'int repeatAdjust(int x,int n){int r=x;for(int i=0;i<n;i++)r=adjust(x);return r;}',
 [key('P',3)]:'int winner4(int a,int b,int c,int d){int r=a;if(b>r)r=b;if(c>r)r=c;if(d>r)r=d;return r;}',
 [key('P',4)]:"long long calcPrefix(const char*s,int*p){char op=s[(*p)++];if(op>='0'&&op<='9')return op-'0';long long a=calcPrefix(s,p),b=calcPrefix(s,p);return a*b;}",
 [key('P',5)]:"void showPath(int n){emitState('E',n);emitState('L',n);if(n)showPath(n/2);}",
 [key('P',6)]:'int appendLabel(char*out,int cap,const char*label){int n=0,m=0;while(n<cap&&out[n])n++;if(n==cap)return 0;while(label[m])m++;if(n+m+1>=cap)return 0;for(int i=0;i<=m;i++)out[n+i]=label[i];return 1;}',
 [key('P',7)]:'int readPair(int x,int*a,int*b){int p,q;if(!readLow(x,&p))return 0;*a=p;if(!readHigh(x,&q))return 0;*b=q;return 1;}',
 [key('P',8)]:'void addContributions(long long*t,const int*a,int n){*t=0;for(int i=0;i<n;i++)*t+=contribution(a[i]);}',
 [key('P',9)]:'int calculate(int mode,int x){int a=methodA(x),b=methodB(x);return mode==0?a:mode==1?b:-1;}',
 [key('P',10)]:"char*writeStars(char*p,int n){if(!n){*p=0;return p;}*p='*';writeStars(p+1,n-1);return p;}",
 [key('P',11)]:'void ends3(int a,int b,int c,int*f,int*l){*f=a<b?a:b;*l=a>b?a:b;if(c<*f)*f=c;if(c>*l)*l=c;}',
 [key('P',12)]:'int countAccepted(int lo,int hi){int n=0;for(int x=lo;x<hi;x++)if(accepted(x))n++;return n;}',
 [key('P',13)]:'int findReady(int lo,int hi,int*out){int ok=0;for(int x=lo;x<=hi;x++)if(ready(x)){*out=x;ok=1;}return ok;}',
 [key('P',14)]:'int runSteps(int*s,const int*a,int n){int k=0;for(int i=0;i<n;i++){int next;if(!tryStep(*s,a[i],&next)){*s=0;break;}*s=next;k++;}return k;}',
 [key('P',15)]:'int delta(Delta*s,int x){if(!s->ready){s->ready=1;return 0;}int d=x-s->previous;s->previous=x;return d;}',
 [key('P',16)]:'double meanStep(int x,int reset){static int sum=0,n=0;if(reset){sum=n=0;return 0;}sum+=x;n++;return sum/n;}',
 [key('P',17)]:'int firstKey(int key,int reset){static int last=-1;if(reset){last=-1;return 0;}int r=last!=key;last=key;return r;}',
 [key('P',18)]:'void intervals(int l,int r){if(l>r)return;if(l<r){int m=l+(r-l)/2;intervals(l,m);intervals(m+1,r);}visitRange(l,r);}',
 [key('P',19)]:'void mergeSort(int*a,int l,int r){if(l>=r)return;int m=l+(r-l)/2;mergePart(a,l,m,r);mergeSort(a,l,m);mergeSort(a,m+1,r);}',
 [key('P',20)]:'void applyMap(int*a,int n){for(int i=0;i<n;i++)mapValue(a[i]);}',
 [key('P',21)]:'int survivor(int n,int k){if(n==1)return 1;return (survivor(n-1,k)+k)%n;}',
 [key('P',22)]:'void permutations(const char*s){emitWord(s);}',
 [key('P',23)]:'int alternating(const int*a,int n,int e){if(!n)return 1;return a[0]==e&&alternating(a+1,n-1,e);}',
 [key('P',24)]:'int optionalValue(const int*p,int f){return p&&*p?*p:f;}',
 [key('P',25)]:"void ping(int n){emitState('P',n);if(n>0)pong(n-1);}void pong(int n){emitState('Q',n);if(n>0)ping(n/2);}",
 [key('P',26)]:'int reachable(int root,int goal,int budget){if(!root||!budget)return 0;if(root==goal)return 1;return reachable(child(root,0),goal,budget-1)||reachable(child(root,1),goal,budget-1);}',
 [key('P',27)]:'int chainValue(int n){if(!n)return 7;chainValue(n-1);return n%2?3:-2;}',
 [key('P',28)]:'int completeValue(int x,int*out){int a,b;if(!readBase(x,&a)||!finish(a,&b))return 0;*out=b;return 1;}',
 [key('P',29)]:'int scoreUndo(int op,int x){static int total=0,last=0,has=0;if(op==0){total=last=has=0;}else if(op==1){total+=x;last=x;has=1;}else if(op==2&&has)total-=last;return total;}'
};
const project=fileURLToPath(new URL('../',import.meta.url));
const recordDirectory=fileURLToPath(new URL('../../制作记录/并行扩题/C函数/',import.meta.url));
function run(id,source){const c=cFunctionsContract(id),r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify({source,prelude:c.prelude,harness:c.harness,stdin:''}),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},timeout:30000,windowsHide:true});assert.equal(r.error,undefined,`${id}: ${r.error}`);assert.equal(r.status,0,`${id}: ${r.stderr}`);const raw=JSON.parse(r.stdout),out=evaluateContract(raw,c);return {...out,id,...(raw.status!=='ran'?{detail:raw.stderr||raw.message}:{})};}
test('选择题22个调用输出样例以同一C17程序顺序执行核对',{skip:process.env.JUDGE_FUNCTIONS_CHOICES!=='1'&&(process.env.JUDGE_RUNTIME!=='1'||Boolean(process.env.JUDGE_FUNCTIONS_TARGETS))},()=>{
 const source=`#include <stdio.h>
int c5(void){return -3.8;} int c6(int x){return x+1;} int c12(int x){x+=5;return x;}
void c13(int a[]){a[0]=9;} void c14(int*p){p=0;}int c18(int x){return x*x;}
int c19(void){int n=0;return ++n;}int c20(void){static int n=0;return ++n;}
int c21f(void){static int n=0;return ++n;}int c21g(void){static int n=0;return ++n;}
int c23x=5;int c23(void){int c23x=2;return c23x;}int c24global;
int c29(unsigned n){if(!n)return 1;return 1+c29(n/2);}
void c31(int n){if(!n)return;putchar('A'+n);c31(n-1);}
void c32(int n){if(!n)return;putchar('(');c32(n-1);putchar(')');}
int c36calls,c37deep;void c36(int n,int depth){c36calls++;if(depth>c37deep)c37deep=depth;if(n>0){c36(n-1,depth+1);c36(n-1,depth+1);}}
int c41(int n){static int count=0;count++;if(n>0)c41(n-1);return count;}
int c48x=1;int c48(int c48x){c48x++;return c48x;}
int c52(int reset){static int n;if(reset){n=0;return 0;}return ++n;}
double c53(int n){return n/2.0;}
int main(void){
printf("S5 %d\\n",c5());
{int a=4;c6(a);printf("S6 %d\\n",a);}
{int a=2,b=c12(a);printf("S12 %d %d\\n",a,b);}
{int b[2]={1,2};c13(b);printf("S13 %d\\n",b[0]);}
{int x=4,*p=&x;c14(p);printf("S14 %d %d\\n",p==&x,x);}
printf("S18 %d\\n",c18(2)+c18(3));
{int a=c19(),b=c19();printf("S19 %d %d\\n",a,b);}
{int a=c20(),b=c20();printf("S20 %d %d\\n",a,b);}
{int a=c21f(),b=c21g(),c=c21f();printf("S21 %d %d %d\\n",a,b,c);}
printf("S23 %d %d\\n",c23(),c23x);printf("S24 %d\\n",c24global);
{int x=3;{int x=8;x++;}printf("S25 %d\\n",x);}
printf("S29 %d\\n",c29(13));printf("S31 ");c31(3);putchar('\\n');printf("S32 ");c32(2);putchar('\\n');
c36(3,1);printf("S36 %d\\n",c36calls);printf("S37 %d\\n",c37deep);
{int a=c41(2),b=c41(0);printf("S41 %d %d\\n",a,b);}
{int y=c48(5);printf("S48 %d %d\\n",c48x,y);}
printf("S52 ");for(int i=0;i<5;i++){int reset=i==0||i==3;int value=c52(reset);printf("%d ",value);}putchar('\\n');
printf("S53 %.1f\\n",c53(3.9));
printf("S7 ");c6(1);puts("no-output");return 0;}`;
 const groups=[['S5','-3'],['S6','4'],['S12','2','7'],['S13','9'],['S14','1','4'],['S18','13'],['S19','1','1'],['S20','1','2'],['S21','1','1','2'],['S23','2','5'],['S24','0'],['S25','3'],['S29','5'],['S31','DCB'],['S32','(())'],['S36','15'],['S37','4'],['S41','3','4'],['S48','1','6'],['S52','0','1','2','0','1'],['S53','1.5'],['S7','no-output']];
 const compiled=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify({source,stdin:''}),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},timeout:30000,windowsHide:true});
 assert.equal(compiled.error,undefined);const raw=JSON.parse(compiled.stdout),result=evaluateContract(raw,{groups,expected:groups.flat()});
 mkdirSync(recordDirectory,{recursive:true});writeFileSync(recordDirectory+'选择题调用样例执行.json',JSON.stringify({time:new Date().toISOString(),result,ids:groups.map(g=>key('S',Number(g[0].slice(1)))),expected:groups,stdout:raw.stdout,limits:'22个含具体调用/状态/输出的选择样例被执行；其余概念、声明和纠错题人工核对。'},null,2));assert.equal(result.status,'accepted',JSON.stringify(raw));
});
test('44题真实C17编译：参考码、逐题典型错码及等价实现串行核验',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const results=[];let complete=false;
 const requested=process.env.JUDGE_FUNCTIONS_TARGETS?.split(',');
 const selected=requested?cFunctionsContractIds.filter(id=>requested.includes(id)):cFunctionsContractIds;
 if(requested)assert.equal(selected.length,requested.length,'定向题号必须全部存在');
 const check=(id,source,kind)=>{const r={...run(id,source),kind};results.push(r);return r;};
 try{
  for(const id of selected){const r=check(id,cFunctionsReferenceSources[id],'reference');assert.equal(r.status,'accepted',JSON.stringify(r));}
  assert.deepEqual(Object.keys(mutations).sort(),[...cFunctionsContractIds].sort());
  for(const id of selected){const r=check(id,mutations[id],'typical-error');assert.equal(r.status,'wrong_answer',JSON.stringify(r));}
  const alternatives=[
   [key('P',3),'int winner4(int a,int b,int c,int d){int r=preferred(a,b);r=preferred(r,c);return preferred(r,d);}'],
   [key('P',6),'int appendLabel(char*out,int cap,const char*label){int n=0;while(n<cap&&out[n])n++;if(n==cap)return 0;int m=(int)strlen(label);if(n+m>=cap)return 0;memcpy(out+n,label,m+1);memset(out+n+m+1,0,cap-n-m-1);return 1;}'],
   [key('P',22),cFunctionsReferenceSources[key('P',22)].replace('for(int i=0;i<n;i++)','for(int i=n-1;i>=0;i--)')],
   [key('P',14),'int runSteps(int*s,const int*a,int n){int done=0;while(done<n){int v=*s;if(!tryStep(v,a[done],&v))return done;*s=v;done++;}return done;}']
  ];
  for(const [id,source]of alternatives.filter(([id])=>selected.includes(id))){const r=check(id,source,'equivalent');assert.equal(r.status,'accepted',JSON.stringify(r));}
  const independentBoundaries=[
   [key('P',3),'int winner4(int a,int b,int c,int d){int x=preferred(0,1),y=preferred(2,3);return preferred(x,y);}'],
   [key('P',11),'void ends3(int a,int b,int c,int*f,int*l){int low=0,high=1;if(!precedes(0,1)){low=1;high=0;}if(precedes(2,low))low=2;if(precedes(high,2))high=2;*f=low;*l=high;}'],
   [key('B',5),'int ticket(int r){static int n=0;if(r==1){n=0;return 0;}return ++n;}'],
   [key('P',8),'void addContributions(long long*t,const int*a,int n){for(int i=0;i<=n;i++)*t+=contribution(a[i]);}'],
   [key('P',14),'int runSteps(int*s,const int*a,int n){int done=0;for(int i=0;i<=n;i++){int v;if(!tryStep(*s,a[i],&v))break;*s=v;done++;}return done;}'],
   [key('P',16),'double meanStep(int x,int r){static int sum=0,n=0;if(r==1){sum=n=0;return 0;}sum+=x;return (double)sum/++n;}'],
   [key('P',17),'int firstKey(int key,int r){static unsigned seen=0;if(r==1){seen=0;return 0;}unsigned b=1u<<key;int first=!(seen&b);seen|=b;return first;}'],
   [key('P',19),'static void wrongDivide(int*a,int l,int r){if(l>=r)return;int m=l+(r-l)/2;wrongDivide(a,l,m);wrongDivide(a,m+1,r);mergePart(a,l,m,r);}void mergeSort(int*a,int l,int r){wrongDivide(a,0,r);}'],
   [key('P',20),'void applyMap(int*a,int n){for(int i=0;i<=n;i++)a[i]=mapValue(a[i]);}'],
   [key('P',23),'int alternating(const int*a,int n,int e){for(int i=0;i<=n;i++)if(a[i]!=(e+i)%2)return 0;return 1;}']
  ];
  for(const [id,source]of independentBoundaries.filter(([id])=>selected.includes(id))){const r=check(id,source,'boundary-error');assert.equal(r.status,'wrong_answer',JSON.stringify(r));}
  complete=true;
 }finally{mkdirSync(recordDirectory,{recursive:true});const file=recordDirectory+(requested?'定向边界复核.json':'真实判题验证.json');let prior;
  if(requested){try{prior=JSON.parse(readFileSync(file,'utf8'));}catch{/* first targeted run */}}
  const allIds=[...new Set([...(prior?.selectedIds||[]),...selected])];
  const merged=[...(prior?.results||[]).filter(old=>!results.some(r=>r.id===old.id&&r.kind===old.kind)),...results];
  const fullyChecked=complete&&allIds.every(id=>merged.some(r=>r.id===id&&r.kind==='reference'&&r.status==='accepted')&&merged.some(r=>r.id===id&&r.kind==='typical-error'&&r.status==='wrong_answer'))&&merged.every(r=>r.status===((r.kind==='reference'||r.kind==='equivalent')?'accepted':'wrong_answer'));
  writeFileSync(file,JSON.stringify({time:new Date().toISOString(),complete:fullyChecked,questionCount:allIds.length,selectedIds:allIds,allContractCount:44,groupCount:allIds.reduce((s,id)=>s+cFunctionsContract(id).groups.length,0),limits:['逐题有限功能及指定错误反例；不证明递归使用、渐近复杂度或全部源码限制。','选择题已人工核对，不以代码题编译通过代替55道选择题全项C17执行。'],results:merged},null,2));}
});
