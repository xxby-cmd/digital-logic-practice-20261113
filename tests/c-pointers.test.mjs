import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cPointersPractice} from '../bank-c-pointers.js';
import {cPointersGuides} from '../c-pointers-guides.js';
import {cPointersContract,cPointersContractIds,cPointersReferenceSources} from '../scripts/judge-c-pointers.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const qid=(tag,n)=>`C6P-programming-8-${tag}-${String(n).padStart(3,'0')}`;
const questions=cPointersPractice.programming;
test('指针99原创含55选择、15填空、29编程，接口和别名约定自足',()=>{
 assert.equal(questions.length,99);assert.equal(new Set(questions.map(q=>q.id)).size,99);
 assert.equal(new Set(questions.map(q=>q.stem.replace(/\s+/g,''))).size,99);
 assert.equal(questions.filter(q=>q.type==='single').length,55);
 assert.equal(questions.filter(q=>q.section==='程序填空').length,15);
 assert.equal(questions.filter(q=>q.section==='编程题').length,29);
 assert.deepEqual(cPointersContractIds,[...Array.from({length:15},(_,i)=>qid('B',i+1)),...Array.from({length:29},(_,i)=>qid('P',i+1))]);
 for(const q of questions){
  assert.equal(q.chapter,8,q.id);assert.equal(q.origin,'原创',q.id);
  assert.ok(q.mechanism&&q.source?.ppt,q.id);assert.ok(q.studyEvidence,q.id);
  assert.ok(['core','basic','supplement'].includes(q.studyLevel),q.id);
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel],q.id);
  assert.ok(!/同上|沿用上一|前一题/.test(q.stem),q.id);
  if(q.type==='single'){
   assert.equal(q.options.length,4,q.id);assert.equal(new Set(q.options).size,4,q.id);
   assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4,q.id);
   assert.ok(q.explanation.length>15,q.id);
  }else{
   const guide=cPointersGuides[q.id];assert.ok(guide,q.id);
   assert.ok(q.stem.includes(q.signature)&&guide.instruction.includes(q.signature),q.id);
   assert.ok(guide.starter.startsWith(q.signature),q.id);
   if(q.section==='程序填空')assert.ok(guide.starter.includes('/* 空1 */'),q.id);
   if(q.signature.includes('Node')){
    assert.ok(q.stem.includes('typedef struct Node{int data;struct Node *next;}Node;'),q.id);
    assert.ok(guide.instruction.includes('不要重复定义'),q.id);
    assert.ok(cPointersContract(q.id).prelude.includes('typedef struct Node'),q.id);
   }
  }
 }
});
test('44契约以地址关系判分，独立分组与源码/驱动预算有效',()=>{
 for(const id of cPointersContractIds){
  const c=cPointersContract(id),source=cPointersReferenceSources[id];assert.ok(source,id);
  assert.ok(c.groups.length>=4,id);assert.deepEqual(c.expected,c.groups.flat(),id);
  assert.ok(c.groups.every(g=>g.every(v=>typeof v==='string')),id);
  assert.ok(Buffer.byteLength(source)<=32768,id);
  assert.ok(Buffer.byteLength(source+c.prelude+c.harness)<=262144,id);
  const stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';
  assert.ok(Buffer.byteLength(stdout)<=65536,id);
  assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted',id);
  assert.equal(evaluateContract({status:'ran',stdout:stdout+'extra\n'},c).status,'wrong_answer',id);
 }
 assert.equal(cPointersContract('unknown'),null);
 assert.ok(cPointersContract(qid('B',10)).harness.includes('writePair(objects[0],objects[0]'));
 assert.ok(cPointersContract(qid('P',2)).harness.includes('transferAmount(objects[0],objects[0]'));
 assert.ok(cPointersContract(qid('P',13)).harness.includes('moveOverlapping(a+1,a+0,32)'));
 assert.ok(cPointersContract(qid('P',13)).harness.includes('moveOverlapping(a+0,a+1,32)'));
 assert.ok(cPointersContract(qid('P',16)).harness.includes('char a[4]={97,98,99,100}'));
 assert.ok(cPointersContract(qid('P',16)).harness.includes('visibleSpan(a+0,a+2)'));
 assert.ok(cPointersContract(qid('P',17)).harness.includes('out=-918273'));
});

const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/C指针/',import.meta.url));
function run(id,source){
 const c=cPointersContract(id),result=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{
  cwd:root,input:JSON.stringify({source,prelude:c.prelude,harness:c.harness,stdin:''}),encoding:'utf8',
  env:{...process.env,PYTHONIOENCODING:'utf-8'},windowsHide:true,timeout:30000});
 assert.equal(result.error,undefined,`${id}: ${result.error}`);assert.equal(result.status,0,`${id}: ${result.stderr}`);
 const raw=JSON.parse(result.stdout),evaluated=evaluateContract(raw,c);
 return {id,...evaluated,...(raw.status!=='ran'?{detail:raw.stderr||raw.message}:{})};
}
test('真实C17：44指针参考、等价实现通过，44典型错解被拒绝',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:600000
},()=>{
 const results=[];
 const record=(id,source,kind)=>{const r={...run(id,source),kind};results.push(r);return r;};
 try{
  for(const id of cPointersContractIds){const r=record(id,cPointersReferenceSources[id],'reference');assert.equal(r.status,'accepted',JSON.stringify(r));}
  const alternatives=[
   ['B',3,'void rotateObjects(int*a,int*b,int*c){int x=*a,y=*b,z=*c;*a=z;*b=x;*c=y;}'],
   ['B',4,'void exchangePointers(int**p,int**q){if(p!=q){int*t=*q;*q=*p;*p=t;}}'],
   ['B',5,'int *largerObject(int*a,int*b){if(*b>*a)return b;return a;}'],
   ['B',6,'int *matrixCell(int(*a)[4],int row,int column){return &a[row][column];}'],
   ['B',10,'void writePair(int*a,int*b,int v){if(a==b){*a=v+1;return;}*b=v+1;*a=v;}'],
   ['P',2,'int transferAmount(int*from,int*to,int amount){if(*from<amount)return 0;if(from==to)return 1;int a=*from,b=*to;*from=a-amount;*to=b+amount;return 1;}'],
   ['P',7,'int positionOf(const int*base,int n,const int*p){ptrdiff_t position=p-base;return (int)position;}'],
   ['P',13,'#include <string.h>\nvoid moveOverlapping(int*d,const int*s,int n){memmove(d,s,(size_t)n*sizeof *d);}'],
   ['P',17,"#include <stdlib.h>\nint readSmallInt(const char**cursor,int*out){const char*p=*cursor;while(*p==' ')p++;if(*p<'0'||*p>'9')return 0;char*end;long x=strtol(p,&end,10);*out=(int)x;*cursor=end;return 1;}"],
   ['P',18,'#include <string.h>\nint consumeLiteral(const char**cursor,const char*word){size_t n=strlen(word);if(strncmp(*cursor,word,n)!=0)return 0;*cursor+=n;return 1;}'],
   ['P',19,'int **findPointerSlot(int*slots[],int n,int*target){for(int**p=slots;p<slots+n;p++)if(*p==target)return p;return NULL;}'],
   ['P',22,'Node *detachFirst(Node**head){Node*old=*head;if(old){*head=old->next;old->next=0;}return old;}'],
   ['P',23,'int compareBy(int a,int b,int(*cmp)(int,int)){int x=cmp(a,b);if(x<0)return -1;if(x>0)return 1;return 0;}'],
   ['P',25,'void visitObjects(int*a,int*b,void(*visit)(int*)){visit(a);if(a==b)return;visit(b);}']
  ];
  for(const [tag,n,source]of alternatives){const r=record(qid(tag,n),source,'equivalent');assert.equal(r.status,'accepted',JSON.stringify(r));}
  const mutations=[
   ['B',1,'*target+=delta','target+=delta'],['B',2,'int old=*target;*target=0','*target=0;int old=*target'],
   ['B',3,'*c=*b','*c=*a'],['B',4,'*p=*q;*q=t;','p=q;q=&t;'],['B',5,'*a>=*b','*a>*b'],
   ['B',6,'*(a+row)+column','*a+column'],['B',7,'*pointer=where','pointer=&where'],
   ['B',8,'++*cursor','++cursor'],['B',9,'*out=**cursor;++*cursor;','*out=**cursor;'],
   ['B',10,'*second=value+1','*second=value'],['B',11,'out[i]=a+i','out[i]=a'],
   ['B',12,'return s;','return s+1;'],['B',13,'while(','if('],
   ['B',14,'return operation(value);','return operation(value)+operation(value);'],
   ['B',15,'node->next=position->next;position->next=node;','position->next=node;node->next=position->next;'],
   ['P',1,'*destination+=*source','destination=(int*)source'],
   ['P',2,'*from-=amount;*to+=amount;','int x=*from,y=*to;*from=x-amount;*to=y+amount;'],
   ['P',3,'int x=*a,y=*b','int x=*a,y=*a'],['P',4,'if(*slot!=expected)','if(*slot&&expected&&**slot!=*expected)'],
   ['P',5,'**slot=0;*slot=NULL;','*slot=NULL;'],['P',6,'index>n','index>=n'],
   ['P',7,'(pointer-base)','(pointer-base)*sizeof(int)'],['P',8,'table[index]','*table'],
   ['P',9,'table[i]==oldTarget','table[i]!=oldTarget'],['P',10,'(end-begin)/2','(end-begin+1)/2'],
   ['P',11,'result=path+1','result=path'],['P',12,'*right=p+1','*right=p'],
   ['P',13,'else{for(int i=n;i>0;i--)destination[i-1]=source[i-1];}','else{for(int i=0;i<n;i++)destination[i]=source[i];}'],
   ['P',14,'*targets[i]+=delta','*targets[0]+=delta'],
   ['P',15,'pointers[i]==pointers[j]','pointers[i]&&pointers[j]&&*pointers[i]==*pointers[j]'],
   ['P',16,'p<end&&*p','*p'],
   ['P',17,"if(*p<'0'||*p>'9')return 0;","if(*p<'0'||*p>'9'){*cursor=p;return 0;}"],
   ['P',18,'if(p[i]!=word[i])return 0;','if(p[i]!=word[i]){*cursor=p+i;return 0;}'],
   ['P',19,'return &slots[i];','return (int**)slots[i];'],
   ['P',20,'*to=*from;*from=NULL;','*from=*to;*to=NULL;'],
   ['P',21,'node->next=*head;*head=node;','*head=node;node->next=*head;'],
   ['P',22,'*head=first->next;first->next=NULL;','first->next=NULL;*head=first->next;'],
   ['P',23,'return (result>0)-(result<0);','return result;'],
   ['P',24,'int value=operation(*object);*object=value;return value;','*object=operation(*object);return operation(*object);'],
   ['P',25,'visit(a);if(a!=b)visit(b);','visit(a);visit(b);'],
   ['P',26,'preferred(a,b)','preferred(b,a)'],['P',27,'a[row][column]=value','a[column][row]=value'],
   ['P',28,'a==b&&b==c','*a==*b&&*b==*c'],['P',29,'*last=end-1','*last=end']
  ];
  assert.equal(mutations.length,44);
  for(const [tag,n,before,after]of mutations){
   const id=qid(tag,n),source=cPointersReferenceSources[id];assert.ok(source.includes(before),id);
   const r=record(id,source.replace(before,after),'wrong');assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));
  }
 }finally{
  mkdirSync(evidence,{recursive:true});writeFileSync(evidence+'44代码题实编核验.json',JSON.stringify({time:new Date().toISOString(),questions:44,
   groups:cPointersContractIds.reduce((s,id)=>s+cPointersContract(id).groups.length,0),
   limits:{studentBytes:32768,driverBytes:262144,memoryMB:64,fuel:20000000,stackBytes:1048576},
   limitations:['测试核对公开范围内的结果、对象身份与副作用，不证明指定的指针写法或复杂度。',
    '不以数值地址常量判分；尾后地址只比较不解引用；不对未公开支持NULL的参数强测NULL。',
    'Node均由驱动提供，基本接链明确不分配/释放；没有声称这是一套通用内存安全检测器。'],results},null,2));
 }
});
