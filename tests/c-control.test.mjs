import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cControlPractice} from '../bank-c-control.js';
import {cControlGuides} from '../c-control-guides.js';
import {cControlContractIds,cControlContract,cControlReferenceSources} from '../scripts/judge-c-control.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';

const qid=(tag,n)=>`C6L-programming-4-${tag}-${String(n).padStart(3,'0')}`;
const questions=cControlPractice.programming;
const codeQuestions=questions.filter(q=>q.coding);
test('C控制结构100题具有56选择、15程序填空、29编程且接口自足',()=>{
 assert.equal(questions.length,100);
 assert.equal(new Set(questions.map(q=>q.id)).size,100);
 assert.equal(new Set(questions.map(q=>q.stem.replace(/\s+/g,''))).size,100);
 assert.equal(questions.filter(q=>q.type==='single').length,56);
 assert.equal(questions.filter(q=>q.section==='程序填空').length,15);
 assert.equal(questions.filter(q=>q.section==='编程题').length,29);
 assert.equal(codeQuestions.length,44);
 assert.deepEqual(cControlContractIds,[...Array.from({length:15},(_,i)=>qid('B',i+1)),...Array.from({length:29},(_,i)=>qid('P',i+1))]);
 for(const q of questions){
  assert.equal(q.chapter,4,q.id);assert.equal(q.origin,'原创',q.id);
  assert.ok(q.mechanism?.length>3,q.id);assert.ok(q.source?.ppt,q.id);
  assert.ok(['core','basic','supplement'].includes(q.studyLevel),q.id);
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel],q.id);
  assert.ok(q.studyEvidence,q.id);
  assert.ok(!/同上|沿用上一|前一题/.test(q.stem),q.id);
  if(q.type==='single'){
   assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);
   assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);
   assert.ok(q.explanation.length>20,q.id);
  }else{
   const guide=cControlGuides[q.id];assert.ok(guide,q.id);
   assert.ok(q.stem.includes(q.signature),q.id);assert.ok(guide.instruction.includes(q.signature),q.id);
   assert.ok(guide.starter.startsWith(q.signature),q.id);assert.ok(!guide.starter.includes('int main'),q.id);
   if(q.section==='程序填空')assert.ok(guide.starter.includes('/* 空1 */'),q.id);
  }
 }
});
test('44独立分组契约符合源码/驱动预算及逐行判分规则',()=>{
 for(const q of codeQuestions){
  const c=cControlContract(q.id),source=cControlReferenceSources[q.id];assert.ok(c,q.id);
  assert.ok(c.groups.length>=5,q.id);assert.deepEqual(c.expected,c.groups.flat(),q.id);
  assert.ok(c.groups.every(g=>g.every(v=>typeof v==='string')),q.id);
  assert.ok(Buffer.byteLength(source)<=32768,q.id);
  assert.ok(Buffer.byteLength(source+(c.prelude||'')+c.harness)<=262144,q.id);
  assert.ok(c.harness.includes(q.signature.match(/\b(\w+)\(/)[1]+'('),q.id);
  const stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';
  assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted',q.id);
  assert.equal(evaluateContract({status:'ran',stdout:stdout+'999\n'},c).status,'wrong_answer',q.id);
 }
 assert.equal(cControlContract('unknown'),null);
 assert.ok(cControlContract(qid('B',7)).expected.includes('100000000000'));
 assert.ok(cControlContract(qid('P',29)).harness.includes('1000000000000'));
 // No promise was made about failed output values in this question.
 assert.ok(questions.find(q=>q.id===qid('P',17)).stem.includes('失败时输出参数值不作要求'));
 assert.ok(cControlContract(qid('P',3)).harness.includes('triangleKind(9,1,2)'));
 assert.ok(cControlContract(qid('P',3)).harness.includes('triangleKind(2,9,1)'));
 assert.ok(cControlContract(qid('P',25)).harness.includes('longWordCount(s,0,3)'));
 assert.ok(cControlContract(qid('P',25)).harness.includes('const char s[3]={97,98,99}'));
 assert.ok(cControlContract(qid('P',26)).harness.includes('const char s[3]={97,10,97}'));
});
test('限步3n+1题的全部输入范围在参考状态类型中安全',()=>{
 let peak=1;
 for(let start=1;start<=1000;start++){
  let x=start;
  for(let i=0;i<100&&x!==1;i++){x=x%2?3*x+1:x/2;assert.ok(Number.isSafeInteger(x));peak=Math.max(peak,x);}
 }
 assert.ok(peak<2147483647);
});

const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/C控制结构/',import.meta.url));
function run(id,source){
 const c=cControlContract(id);
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,
  input:JSON.stringify({source,prelude:c.prelude||'',harness:c.harness,stdin:''}),encoding:'utf8',
  env:{...process.env,PYTHONIOENCODING:'utf-8'},timeout:30000,windowsHide:true});
 assert.equal(r.error,undefined,`${id}: ${r.error}`);assert.equal(r.status,0,`${id}: ${r.stderr}`);
 const raw=JSON.parse(r.stdout),evaluated=evaluateContract(raw,c);
 return {id,...evaluated,...(raw.status!=='ran'?{detail:raw.stderr||raw.message}:{})};
}
test('真实C17：44参考、等价实现通过，各题典型错误被拒绝',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:600000
},()=>{
 const results=[];
 const record=(id,source,kind)=>{const r={...run(id,source),kind};results.push(r);return r;};
 try{
  for(const id of cControlContractIds){const r=record(id,cControlReferenceSources[id],'reference');assert.equal(r.status,'accepted',JSON.stringify(r));}
  const alternatives=[
   ['B',1,'long long sumMultiples(int n,int d){long long k=n/d;return (long long)d*k*(k+1)/2;}'],
   ['B',2,'#include <stdio.h>\n#include <string.h>\nint matchingSuffixDigits(unsigned int a,unsigned int b){char x[16],y[16];snprintf(x,sizeof x,"%u",a);snprintf(y,sizeof y,"%u",b);int i=(int)strlen(x)-1,j=(int)strlen(y)-1,k=0;for(;i>=0&&j>=0&&x[i]==y[j];i--,j--)k++;return k;}'],
   ['B',3,'long long factorialTailSum(int k,int n){long long s=0;for(int i=k;i<=n;i++){long long p=1;for(int j=1;j<=i;j++)p*=j;s+=p;}return s;}'],
   ['B',4,'int ceilLogTwo(int n){int k=0;while(n>1){n=(n+1)/2;k++;}return k;}'],
   ['B',8,'int signFlips(const int a[],int n){int c=0;for(int i=1;i<n&&a[i-1]!=0&&a[i]!=0;i++)if(a[i-1]*a[i]<0)c++;return c;}'],
   ['B',11,'int divisiblePairCount(int n){int c=0;for(int j=1;j<=n;j++)for(int i=1;i<j;i++)if((i+j)%3==0)c++;return c;}'],
   ['P',4,'int monthDays(int y,int m){int days[12]={31,28,31,30,31,30,31,31,30,31,30,31};return days[m-1]+(m==2&&(y%400==0||(y%4==0&&y%100!=0)));}'],
   ['P',8,'#include <stdio.h>\nint digitPalindrome(int n){char s[16];int k=snprintf(s,sizeof s,"%d",n);for(int i=0;i<k/2;i++)if(s[i]!=s[k-1-i])return 0;return 1;}'],
   ['P',9,'#include <stdio.h>\nint eraseDecimalDigit(int n,int digit){char s[16];snprintf(s,sizeof s,"%d",n);int r=0;for(int i=0;s[i];i++)if(s[i]-48!=digit)r=r*10+s[i]-48;return r;}'],
   ['P',17,'int changeTwoFive(int amount,int*t,int*f){*t=*f=-99;for(int y=amount/5;y>=0;y--)if((amount-5*y)%2==0){*t=(amount-5*y)/2;*f=y;return 1;}return 0;}'],
   ['P',25,'int longWordCount(const char s[],int n,int minimum){int c=0,len=0;for(int i=0;i<=n;i++){if(i<n&&s[i]!=32)len++;else{c+=len>=minimum;len=0;}}return c;}'],
   ['P',28,'int modularPower(int base,int exponent,int modulus){long long r=1%modulus,b=base%modulus;while(exponent){if(exponent%2)r=r*b%modulus;b=b*b%modulus;exponent/=2;}return (int)r;}']
  ];
  for(const [tag,n,source]of alternatives){const r=record(qid(tag,n),source,'equivalent');assert.equal(r.status,'accepted',JSON.stringify(r));}
  const mutations=[
   ['B',1,'i<=n','i<n'],['B',2,'do{if(a%10!=b%10)break;k++;a/=10;b/=10;}while(a&&b);','while(a&&b){if(a%10!=b%10)break;k++;a/=10;b/=10;}'],
   ['B',3,'if(i>=k)','if(i>k)'],['B',4,'p<n','p<=n'],['B',5,'return rounds;','return a;'],
   ['B',6,'d<n','d<=n'],['B',7,'if(a[i]==0)break;','if(a[i]==0)continue;'],
   ['B',8,'last!=current','last==current'],['B',9,'if(d!=last)','if(d==last)'],
   ['B',10,'while(n&&n%10==0)','while(n%10==0)'],['B',11,'int j=i+1','int j=i'],
   ['B',12,'four*4<=amount','four*4<amount'],['B',13,'case 1:case 2:','case 1:case 3:'],
   ['B',14,'return i+1;','return i;'],['B',15,'empty=empty%rate+fresh','empty=fresh'],
   ['P',1,'case 1:bill+=300;break;','case 1:bill+=300;'],['P',2,'grams-1000+499','grams-1000'],
   ['P',3,'a+b<=c','a+b<c'],['P',4,'(year%400==0||(year%4==0&&year%100!=0))','(year%4==0)'],
   ['P',5,'day<=5','day<5'],['P',6,'k*k<=n','k*k<n'],['P',7,'steps<limit','steps<=limit'],
   ['P',8,'return r==old;','return r!=old;'],
   ['P',9,'if(d!=digit){result+=d*place;place*=10;}','if(d!=digit)result+=d*place;place*=10;'],
   ['P',10,'steps%=width','steps=steps>0?1:0'],['P',11,'while(n>=10)','while(n>10)'],
   ['P',12,'count>=2','count==2'],['P',13,'int x=n+1','int x=n'],['P',14,'count+=n','count=n'],
   ['P',15,'i%a==0||i%b==0','i%a==0&&i%b==0'],['P',16,'budget>=price','budget>price'],
   ['P',17,'y+rest/2<best','y+rest/2>best'],['P',18,'w<area/w','w<=area/w'],
   ['P',19,'int b=a','int b=1'],['P',20,'x<=hi','x<hi'],['P',21,'count+=max-b','count+=max-b+1'],
   ['P',22,'balance+delta[i]>=0','balance+delta[i]>0'],['P',23,'remaining<cost[i]','remaining<=cost[i]'],
   ['P',24,'total+=5;','if(d)total+=5;'],['P',25,'if(length>=minimum)count++;return count;','return count;'],
   ['P',26,'return count+has;','return count;'],['P',27,'a%10+b%10+carry','a%10+b%10'],
   ['P',28,'long long result','int result'],['P',29,'(long long)(a/x)*b','(long long)(a*b)/x']
  ];
  assert.equal(mutations.length,44);
  for(const [tag,n,before,after]of mutations){
   const id=qid(tag,n),source=cControlReferenceSources[id];assert.ok(source.includes(before),id);
   const r=record(id,source.replace(before,after),'wrong');
   assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));
  }
  const uncoveredRegressions=[
   [3,'if((long long)a+b<=c||(long long)a+c<=b||(long long)b+c<=a)','if((long long)a+b<=c)'],
   [25,'i<n','s[i]'],[26,'i<n','s[i]']
  ];
  for(const [n,before,after]of uncoveredRegressions){
   const id=qid('P',n),source=cControlReferenceSources[id];assert.ok(source.includes(before),id);
   const r=record(id,source.replace(before,after),'regression');
   assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));
  }
 }finally{
  mkdirSync(evidence,{recursive:true});writeFileSync(evidence+'44代码题实编核验.json',JSON.stringify({time:new Date().toISOString(),
   questions:44,groups:cControlContractIds.reduce((s,id)=>s+cControlContract(id).groups.length,0),
   limits:{studentBytes:32768,driverBytes:262144,memoryMB:64,fuel:20000000,stackBytes:1048576},
   limitations:['有限运行用例不证明必须保留填空骨架、使用指定循环或满足复杂度要求。',
    '仅按题目公开的合法输入范围测试；空闲输出区及未承诺的失败输出不强制不变。'],results},null,2));
 }
});
