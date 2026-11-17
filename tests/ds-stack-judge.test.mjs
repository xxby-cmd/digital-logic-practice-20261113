import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {getPracticeCourse} from '../practice-library.js';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
import {dsStackContractIds, dsStackContract, dsStackReferenceSources} from '../scripts/judge-ds-stack-contracts.mjs';
import {dsCodingTaskGuides} from '../ds-coding-task-guides.js';

const id = n => `P3-structures-3-${n}`;
const ids = Array.from({length: 10}, (_, i) => id(91 + i));
const functions = ['push', 'pop', 'pushL', 'popL', 'enq', 'deq', 'match', 'reverseByStack', 'queueLen', 'validPop'];

test('数据结构栈队列10题的函数接口、独立分组期望及预算齐全', () => {
 assert.deepEqual(dsStackContractIds, ids);
 const questions = getPracticeCourse('structures').questions;
 for (const [i, questionId] of ids.entries()) {
  assert.ok(questions.some(q => q.id === questionId), questionId);
  const c = dsStackContract(questionId), guide = dsCodingTaskGuides[questionId];
  assert.ok(c.harness.includes('int main(void)'), questionId);
  assert.ok(c.harness.includes(`${functions[i]}(`), questionId);
  assert.ok(c.groups.length >= 4, questionId);
  assert.ok(c.groups.every(g => g.every(x => typeof x === 'string')), questionId);
  assert.deepEqual(c.expected, c.groups.flat(), questionId);
  assert.ok(Buffer.byteLength(dsStackReferenceSources[questionId]) <= 32768, questionId);
  assert.ok(Buffer.byteLength(c.prelude + c.harness + dsStackReferenceSources[questionId]) <= 262144, questionId);
  assert.ok(guide.instruction.includes('只提交'), questionId);
  assert.ok(guide.starter.includes(`${functions[i]}(`), questionId);
  const stdout = c.groups.map(g => g.join(' ')).join('\n') + '\n';
  assert.equal(evaluateContract({status: 'ran', stdout}, c).status, 'accepted', questionId);
  assert.equal(evaluateContract({status: 'ran', stdout: stdout + '999\n'}, c).status, 'wrong_answer', questionId);
  assert.equal(evaluateContract({status: 'ran', stdout: 'wrong\n' + stdout.split('\n').slice(1).join('\n')}, c).status,
   'wrong_answer', questionId);
 }
 assert.equal(dsStackContract('not-a-question'), null);
});

test('链栈结构体由系统提供，公有提交说明不泄露测试或参考解', () => {
 for (const n of [93, 94]) {
  assert.ok(dsCodingTaskGuides[id(n)].instruction.includes('系统已提供 typedef struct Node'));
  assert.ok(dsCodingTaskGuides[id(n)].instruction.includes('请勿重复定义'));
  assert.ok(dsStackContract(id(n)).prelude.includes('typedef struct Node{int v;struct Node *next;}Node;'));
  assert.ok(!dsCodingTaskGuides[id(n)].starter.includes('typedef'));
 }
 assert.ok(dsCodingTaskGuides[id(98)].instruction.includes('独立辅助数组'));
 assert.ok(dsCodingTaskGuides[id(100)].instruction.includes('与输入独立'));
 assert.ok(!dsCodingTaskGuides[id(94)].instruction.includes('不改*out'));
 assert.ok(!JSON.stringify(dsCodingTaskGuides).includes('dsjudge_'));
});

test('边界覆盖含零容量、标准分配失败、回绕、完整前缀和大m长度', () => {
 assert.ok(dsStackContract(id(91)).harness.includes('push(box+1,0,&top,'));
 assert.ok(dsStackContract(id(92)).harness.includes('out=682931'));
 const linked = dsStackContract(id(93));
 for (const allocation of ['malloc', 'calloc', 'realloc', 'aligned_alloc']) {
  assert.ok(linked.prelude.includes(`#define ${allocation} dsjudge_${allocation}`));
 }
 assert.ok(linked.harness.includes('dsjudge_fail_allocation=1'));
 assert.ok(dsStackContract(id(95)).harness.includes('enq(box+1,2,1,&rear,'));
 assert.ok(dsStackContract(id(96)).harness.includes('deq(box+1,2,&front,1,&out)'));
 const brackets = dsStackContract(id(97));
 assert.ok(brackets.groups.some(g => g[0] === '0'));
 assert.ok(brackets.groups.some(g => g[0] === '1'));
 assert.ok(brackets.harness.includes('s[]=")(";'));
 assert.ok(dsStackContract(id(99)).harness.includes('queueLen(2147483647,0,2147483646)'));
 assert.ok(dsStackContract(id(99)).expected.includes('2147483646'));
 assert.ok(dsStackContract(id(100)).groups.some(g => g[0] === '0'));
 assert.ok(dsStackContract(id(100)).groups.some(g => g[0] === '1'));
});

const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = fileURLToPath(new URL('../../制作记录/判题运行环境/', import.meta.url));
function run(questionId, source) {
 const c = dsStackContract(questionId);
 const result = spawnSync(process.env.JUDGE_PYTHON, ['scripts/judge-worker.py'], {
  cwd: root, input: JSON.stringify({source, prelude: c.prelude || '', harness: c.harness, stdin: ''}),
  encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}, timeout: 30000, windowsHide: true
 });
 assert.equal(result.error, undefined, `${questionId}: ${result.error}`);
 assert.equal(result.status, 0, `${questionId}: ${result.stderr}`);
 let raw;try {raw = JSON.parse(result.stdout);} catch {throw new Error(`${questionId}: ${result.stdout} ${result.stderr}`);}
 const evaluated = evaluateContract(raw, c);
 return {id: questionId, ...evaluated, ...(raw.status !== 'ran' ? {detail: raw.stderr || raw.message} : {})};
}

test('实际C17编译：栈队列10参考、等价实现通过，典型错解被拒绝', {
 skip: process.env.JUDGE_RUNTIME !== '1', timeout: 600000
}, () => {
 assert.ok(process.env.JUDGE_PYTHON, '真实编译须提供JUDGE_PYTHON');
 const results = [];
 const record = (n, source, kind) => {const r = {...run(id(n), source), kind};results.push(r);return r;};
 try {
  for (let n = 91; n <= 100; n++) {
   const r = record(n, dsStackReferenceSources[id(n)], 'reference');
   assert.equal(r.status, 'accepted', JSON.stringify(r));
  }
  const alternatives = [
   [91, 'int push(int a[],int cap,int*t,int x){if(*t<cap){a[(*t)++]=x;return 1;}return 0;}'],
   [92, 'int pop(int a[],int*t,int*out){if(!*t)return 0;*out=a[*t-1];--*t;a[*t]=0;return 1;}'],
   [93, '#include <stdlib.h>\nint pushL(Node**top,int x){Node*p=calloc(1,sizeof(Node));if(!p)return 0;p->v=x;p->next=*top;*top=p;return 1;}'],
   [93, '#include <stdlib.h>\nint pushL(Node**top,int x){Node*p=realloc(NULL,sizeof(Node));if(!p)return 0;p->v=x;p->next=*top;*top=p;return 1;}'],
   [93, '#include <stdlib.h>\nint pushL(Node**top,int x){Node*p=aligned_alloc(_Alignof(Node),sizeof(Node));if(!p)return 0;p->v=x;p->next=*top;*top=p;return 1;}'],
   // Values and shape are prescribed; successful push need not retain node identities.
   [93, '#include <stdlib.h>\nint pushL(Node**top,int x){Node*p=malloc(sizeof(Node));if(!p)return 0;if(*top){p->v=(*top)->v;p->next=(*top)->next;(*top)->v=x;(*top)->next=p;}else{p->v=x;p->next=NULL;*top=p;}return 1;}'],
   // Unlike array pop, empty popL has no output-preservation promise.
   [94, '#include <stdlib.h>\nint popL(Node**top,int*out){if(!*top){*out=-999;return 0;}Node*p=*top;*out=p->v;*top=p->next;free(p);return 1;}'],
   [94, '#include <stdlib.h>\nint popL(Node**top,int*out){if(!*top)return 0;Node*p=*top;*out=p->v;*top=p->next;void*unused=realloc(p,0);(void)unused;return 1;}'],
   // A full queue may write its unused reserved slot while retaining logical state.
   [95, 'int enq(int a[],int m,int front,int*rear,int x){a[*rear]=x;int next=*rear==m-1?0:*rear+1;if(next==front)return 0;*rear=next;return 1;}'],
   [96, 'int deq(int a[],int m,int*front,int rear,int*out){if(*front==rear)return 0;int f=*front;*out=a[f];a[f]=0;*front=f+1==m?0:f+1;return 1;}'],
   [97, "int match(const char s[],int n){char stack[n+1];int t=0;for(int i=0;i<n;i++){if(s[i]=='(')stack[t++]=s[i];else{if(!t)return 0;--t;}}return t==0;}"],
   [98, 'void reverseByStack(int a[],int n,int s[]){int*p=s;for(int i=0;i<n;i++)*p++=a[i];for(int i=0;i<n;i++)a[i]=*--p;}'],
   [99, 'int queueLen(int m,int front,int rear){return (int)(((long long)rear-front+m)%m);}'],
   [100, 'int validPop(const int in[],const int out[],int n,int s[]){int next=0,t=0;for(int j=0;j<n;j++){while((!t||s[t-1]!=out[j])&&next<n)s[t++]=in[next++];if(!t||s[--t]!=out[j])return 0;}return 1;}']
  ];
  for (const [n, source] of alternatives) {
   const r = record(n, source, 'equivalent');assert.equal(r.status, 'accepted', JSON.stringify(r));
  }
  const wrong = [
   [91, 'int push(int a[],int cap,int*t,int x){if(*t>cap)return 0;a[(*t)++]=x;return 1;}'],
   [91, 'int push(int a[],int cap,int*t,int x){if(*t==cap){--*t;return 0;}a[(*t)++]=x;return 1;}'],
   [92, 'int pop(int a[],int*t,int*out){if(!*t){*out=0;return 0;}*out=a[--*t];return 1;}'],
   [92, 'int pop(int a[],int*t,int*out){if(!*t)return 0;*out=a[(*t)--];return 1;}'],
   [93, '#include <stdlib.h>\nint pushL(Node**top,int x){Node*p=malloc(sizeof(Node));p->v=x;p->next=*top;*top=p;return 1;}'],
   [93, '#include <stdlib.h>\nint pushL(Node**top,int x){Node*p=malloc(sizeof(Node));if(!p){*top=NULL;return 0;}p->v=x;p->next=NULL;*top=p;return 1;}'],
   [94, 'int popL(Node**top,int*out){if(!*top)return 0;Node*p=*top;*out=p->v;*top=p->next;return 1;}'],
   [95, 'int enq(int a[],int m,int front,int*rear,int x){if(*rear==front)return 0;a[*rear]=x;*rear=(*rear+1)%m;return 1;}'],
   [95, 'int enq(int a[],int m,int front,int*rear,int x){int next=*rear+1;if(next==front)return 0;a[*rear]=x;*rear=next;return 1;}'],
   [96, 'int deq(int a[],int m,int*front,int rear,int*out){if(*front==rear)return 0;*front=(*front+1)%m;*out=a[*front];return 1;}'],
   [96, 'int deq(int a[],int m,int*front,int rear,int*out){if(*front==rear){*out=0;return 0;}*out=a[*front];*front=(*front+1)%m;return 1;}'],
   [97, "int match(const char s[],int n){int d=0;for(int i=0;i<n;i++)d+=s[i]=='('?1:-1;return d==0;}"],
   [97, "int match(const char s[],int n){int d=0;for(int i=0;i<n;i++){if(s[i]=='(')d++;else if(--d<0)return 0;}return 1;}"],
   [98, 'void reverseByStack(int a[],int n,int s[]){for(int i=0;i<n;i++)s[i]=a[i];for(int i=0;i<n;i++)a[i]=s[i];}'],
   [99, 'int queueLen(int m,int front,int rear){return (rear-front+m)%m;}'],
   [99, 'int queueLen(int m,int front,int rear){return rear-front;}'],
   [100, 'int validPop(const int in[],const int out[],int n,int s[]){for(int j=0;j<n;j++){int found=0;for(int i=0;i<n;i++)if(in[i]==out[j])found=1;if(!found)return 0;}return 1;}']
  ];
  for (const [n, source] of wrong) {
   const r = record(n, source, 'wrong');
   assert.ok(['wrong_answer', 'runtime_error', 'time_limit'].includes(r.status), JSON.stringify(r));
  }
 } finally {
  mkdirSync(evidence, {recursive: true});
  writeFileSync(`${evidence}DS栈队列10题真实判题验证.json`, JSON.stringify({time: new Date().toISOString(),
   contractCount: ids.length, testGroups: ids.reduce((sum, questionId) => sum + dsStackContract(questionId).groups.length, 0),
   limitations: ['功能测试不证明时间复杂度或内部必须用栈。',
    '分配失败覆盖标准malloc/calloc/realloc/aligned_alloc；自定义arena和非标准分配器未验证。',
    '链栈释放监视覆盖free及当前WASI libc的realloc(p,0)，不是通用内存泄漏检测器。',
    '辅助数组按与输入互不重叠测试，符合原参考代码语境；未测试重叠数组。'], results}, null, 2));
 }
});
