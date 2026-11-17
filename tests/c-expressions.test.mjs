import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cExpressionsPractice} from '../bank-c-expressions.js';
import {cExpressionsGuides} from '../c-expressions-guides.js';
import {cExpressionsContractIds,cExpressionsContract,cExpressionsReferenceSources,cExpressionsChoiceChecks} from '../scripts/judge-c-expressions.mjs';
import {grade,normalize} from '../grading.js';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
import {getPracticeCourse} from '../practice-library.js';

const bank=cExpressionsPractice.programming;
const id=(kind,n)=>`C6E-programming-3-${kind}-${String(n).padStart(3,'0')}`;
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/C表达式/',import.meta.url));
test('C3原创99题：55选择、15程序填空、29编程，题号/现有题无精确重复',()=>{
 assert.equal(bank.length,99);
 assert.equal(bank.filter(q=>q.section==='选择题').length,55);
 assert.equal(bank.filter(q=>q.section==='程序填空').length,15);
 assert.equal(bank.filter(q=>q.section==='编程题').length,29);
 assert.equal(new Set(bank.map(q=>q.id)).size,99);
 assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,99);
 const existing=getPracticeCourse('programming').questions.filter(q=>!q.id.startsWith('C6E-'));
 for(const q of bank){
  assert.equal(q.chapter,3);assert.equal(q.origin,'原创');assert.equal(q.pool,'practice');
  assert.ok(!existing.some(old=>old.id===q.id||normalize(old.stem)===normalize(q.stem)),q.id);
  assert.ok(['core','basic','supplement'].includes(q.studyLevel));
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  assert.ok(q.studyEvidence.includes('CYY3-23.pptx'));
  assert.ok(!/上一题|同上|沿用前题/.test(q.stem),q.id);
 }
 assert.ok(bank.filter(q=>q.studyLevel!=='supplement').length>bank.length*0.7);
});
test('选择题答案经工厂轮换后仍按标准客观判分，四个选项互异',()=>{
 for(const q of bank.filter(q=>q.type==='single')){
  assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options.map(normalize)).size,4,q.id);
  assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);
  q.options.forEach((_,i)=>assert.equal(grade(q,i).correct,i===q.answer,q.id));
  assert.ok(q.explanation.length>20,q.id);
 }
 // Rule-based questions never turn undefined/implementation-defined behavior into a numeric answer.
 assert.ok(bank.find(q=>q.id===id('S',49)).options[bank.find(q=>q.id===id('S',49)).answer].includes('未定义'));
 assert.equal(bank.find(q=>q.id===id('S',52)).options[bank.find(q=>q.id===id('S',52)).answer],'1U<<32');
 assert.ok(bank.find(q=>q.id===id('S',47)).options[bank.find(q=>q.id===id('S',47)).answer].includes('未排序'));
 assert.ok(bank.find(q=>q.id===id('S',48)).options[bank.find(q=>q.id===id('S',48)).answer].includes('实现定义'));
});
test('44代码题有完整公有提交壳和独立服务端分组期望，功能边界覆盖完整',()=>{
 const coding=bank.filter(q=>q.coding);
 assert.equal(coding.length,44);assert.equal(cExpressionsContractIds.length,44);
 assert.deepEqual([...cExpressionsContractIds].sort(),coding.map(q=>q.id).sort());
 assert.deepEqual(Object.keys(cExpressionsGuides).sort(),coding.map(q=>q.id).sort());
 for(const q of coding){
  const g=cExpressionsGuides[q.id],c=cExpressionsContract(q.id);
  assert.ok(g.instruction.includes('完整函数')||g.instruction.includes('整个函数'),q.id);
  assert.ok(g.starter.includes('{')&&g.starter.endsWith('}'),q.id);
  assert.ok(cExpressionsReferenceSources[q.id],q.id);
  assert.ok(c.groups.length>=9,q.id);assert.deepEqual(c.expected,c.groups.flat(),q.id);
  const stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';
  assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted',q.id);
  assert.equal(evaluateContract({status:'ran',stdout:stdout+'99\n'},c).status,'wrong_answer',q.id);
 }
 assert.equal(cExpressionsContract('unknown'),null);
 assert.ok(cExpressionsContract(id('B',12)).expected.includes('4294967295'));
 assert.ok(cExpressionsContract(id('P',2)).expected.includes('999999998000000001'));
 assert.ok(cExpressionsContract(id('P',3)).expected.includes('-999997000002999999'));
 assert.ok(cExpressionsContract(id('P',5)).expected.includes('-715827883'));
 assert.ok(cExpressionsContract(id('P',6)).expected.includes('2147483646'));
 assert.ok(cExpressionsContract(id('P',7)).expected.includes('2800000000'));
 assert.equal(cExpressionsContract(id('P',22)).groups.length,720);
 assert.equal(cExpressionsContract(id('P',24)).groups.length,128);
 assert.equal(cExpressionsContract(id('P',27)).groups.length,256);
 assert.ok(cExpressionsContract(id('B',7)).harness.includes('0.49999999999999994'));
 assert.ok(cExpressionsContract(id('B',7)).harness.includes('-0.49999999999999994'));
 assert.ok(!/\b(?:for|while)\s*\(/.test(Object.values(cExpressionsReferenceSources).join('\n')));
});

function worker(request){
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{
  cwd:fileURLToPath(new URL('../',import.meta.url)),input:JSON.stringify(request),encoding:'utf8',
  env:{...process.env,PYTHONIOENCODING:'utf-8'},timeout:30000,windowsHide:true
 });
 assert.equal(r.error,undefined,`${r.error}`);assert.equal(r.status,0,r.stderr);
 try{return JSON.parse(r.stdout);}catch{throw new Error(`运行服务返回异常：${r.stdout} ${r.stderr}`);}
}
function run(key,source){const c=cExpressionsContract(key);return {id:key,...evaluateContract(worker({source,harness:c.harness,prelude:c.prelude||'',stdin:''}),c)};}
const wrong={
 B1:'double meanPair(int a,int b){return (a+b)/2;}',
 B2:'int tensDigit(int n){return n/100;}',
 B3:'int leapExpr(int y){return y%4==0;}',
 B4:'int oneZero(int a,int b){return a*b==0;}',
 B5:'int inClosed(int x,int l,int h){return x>l&&x<h;}',
 B6:'long long totalSeconds(int h,int m,int s){return h*3600+m*60+s;}',
 B7:'int nearestAway(double x){return x>=0?(int)(x+0.5):(int)(x-0.5);}',
 B8:'int signValue(int x){return x?1:0;}',
 B9:'unsigned int bitValue(unsigned int x,int k){return x&(1U<<k);}',
 B10:'int shiftedHour(int h,int delta){return (h+delta)%24;}',
 B11:'double realQuotient(int a,int b){return (double)(a/b);}',
 B12:'long long absoluteGap(int a,int b){long long d=a-b;return d<0?-d:d;}',
 B13:'int sameParity(int a,int b){return a%2==b%2;}',
 B14:'int triangleSides(int a,int b,int c){return a+b>=c&&a+c>=b&&b+c>=a;}',
 B15:'int discountedCents(int c,int p){return c*(100-p)/100;}',
 P1:'long long addWide(int a,int b){return a+b;}',
 P2:'long long squareWide(int x){return x*x;}',
 P3:'long long cubeValue(int x){long long a=x<0?-(long long)x:x;return a*a*a;}',
 P4:'int boxesNeeded(int n,int k){return (n+k-1)/k;}',
 P5:'int floorQuotient(int a,int d){return a/d;}',
 P6:'int positiveRemainder(int a,int d){return (a%d+d)%d;}',
 P7:'long long nearestMultiple(int n,int s){return (long long)(n/s)*s;}',
 P8:'int compareFractions(int a,int b,int c,int d){return (a/b>c/d)-(a/b<c/d);}',
 P9:'int medianValue(int a,int b,int c){return (int)(((long long)a+b+c)/3);}',
 P10:'int clampValue(int x,int l,int h){return x<l?l:(x>h?h:0);}',
 P11:'int distanceToBoundary(int x,int l,int r){int a=x-l,b=r-x;return a>b?a:b;}',
 P12:'long long gridDistance(int x,int y,int u,int v){int a=x-u,b=y-v;return (a<0?-a:a)+(b<0?-b:b);}',
 P13:'int insideRectangle(int x,int y,int a,int b,int c,int d){return (x>=a&&x<=c)||(y>=b&&y<=d);}',
 P14:'int closedOverlap(int a,int b,int c,int d){return a<d&&c<b;}',
 P15:'int clockWindow(int t,int s,int e){return t>=s&&t<=e;}',
 P16:'long long parkingCents(int m){return m<=30?0:(m-30)/30*250LL;}',
 P17:'long long tierCents(int u){return u<=100?50LL*u:(u<=200?65LL*u:80LL*u);}',
 P18:'int fourDigitSum(int n){return n/100%10+n/10%10+n%10;}',
 P19:'int reversedFour(int n){return n/1000*1000+n/100%10*100+n/10%10*10+n%10;}',
 P20:'int palindromeFive(int n){return n/10000==n%10;}',
 P21:'int replaceHundreds(int n,int d){return n+d*100;}',
 P22:'int clockHalfDegrees(int h,int m){int d=60*h-12*m;if(d<0)d=-d;return d<720-d?d:720-d;}',
 P23:'int validCalendarDate(int y,int m,int d){if(m<1||m>12||d<1)return 0;int days=m==2?28+(y%4==0):((m==4||m==6||m==9||m==11)?30:31);return d<=days;}',
 P24:"int hexDigitValue(int ch){return ch>='0'&&ch<='9'?ch-'0':(ch>='a'&&ch<='f'?ch-'a'+10:-1);}",
 P25:'int flippedCase(int c){return c^32;}',
 P26:'unsigned int replacedLowByte(unsigned int x,unsigned int b){return x|b;}',
 P27:'unsigned int swappedNibbles(unsigned int x){return (x<<4)|(x>>4);}',
 P28:'int twoPositive(int a,int b,int c){return (a>0)+(b>0)+(c>0)>=2;}',
 P29:'int sameNonzeroSign(int a,int b){return a*b>0;}'
};

test('真实C17串行核验：44参考、44典型错解、等价写法及合法选择题轨迹',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:600000
},()=>{
 assert.ok(process.env.JUDGE_PYTHON,'请设置JUDGE_PYTHON');
 const results=[];
 const record=(key,source,kind)=>{const r={kind,...run(key,source)};results.push(r);return r;};
 try{
  for(const key of cExpressionsContractIds){
   const r=record(key,cExpressionsReferenceSources[key],'reference');assert.equal(r.status,'accepted',JSON.stringify(r));
  }
  for(const [short,source]of Object.entries(wrong)){
   const match=/^([BP])(\d+)$/.exec(short),r=record(id(match[1],Number(match[2])),source,'wrong');
   assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));
  }
  const alternatives=[
   [id('B',7),'#include <math.h>\nint nearestAway(double x){return (int)round(x);}'],
   [id('P',4),'int boxesNeeded(int n,int k){return (int)(((long long)n+k-1)/k);}'],
   [id('P',9),'int medianValue(int a,int b,int c){int t;if(a>b){t=a;a=b;b=t;}if(b>c){t=b;b=c;c=t;}if(a>b){t=a;a=b;b=t;}return b;}'],
   [id('P',26),'unsigned int replacedLowByte(unsigned int x,unsigned int b){return x/256U*256U+b;}']
  ];
  for(const [key,source]of alternatives){const r=record(key,source,'equivalent');assert.equal(r.status,'accepted',JSON.stringify(r));}
  const harness='\n#include <stdio.h>\n#include <limits.h>\n#include <math.h>\nint main(void){\n'+cExpressionsChoiceChecks.map(([,body])=>`{${body}puts("");}`).join('\n')+'\nreturn 0;}';
  const raw=worker({source:'/* 合法客观代码的独立C17交叉核验 */',harness,stdin:''});
  assert.equal(raw.status,'ran',JSON.stringify(raw));
  const lines=raw.stdout.trim().split(/\r?\n/);
  assert.deepEqual(lines,cExpressionsChoiceChecks.map(([,body,expected])=>expected));
  results.push({kind:'choice-traces',count:lines.length,status:'accepted',questions:cExpressionsChoiceChecks.map(([n])=>id('S',n))});
  for(const [n,source]of [
   [24,'int main(void){int a=2,b=3;return ++(a+b);}'],
   [25,'int main(void){int x;3=x;return 0;}'],
   [53,'int main(void){return 5.5%2;}']
  ]){const r=worker({source,stdin:''});assert.equal(r.status,'compile_error',JSON.stringify(r));results.push({kind:'constraint-diagnostic',id:id('S',n),status:r.status});}
 }finally{
  mkdirSync(evidence,{recursive:true});
  writeFileSync(`${evidence}C3真实编译核验.json`,JSON.stringify({time:new Date().toISOString(),questionCount:bank.length,
   contracts:cExpressionsContractIds.length,groups:cExpressionsContractIds.reduce((s,k)=>s+cExpressionsContract(k).groups.length,0),
   limitations:['有限测试核验功能结果，不证明复杂度。','未执行未定义行为或把实现定义行为当唯一数值。','本文件就绪不等于主线已接入题库构建。'],results},null,2));
 }
});
