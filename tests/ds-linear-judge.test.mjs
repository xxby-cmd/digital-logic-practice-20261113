import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {dsLinearTaskGuides} from '../ds-linear-task-guides.js';
import {dsLinearContract,dsLinearContractIds,dsLinearReferenceSources} from '../scripts/judge-ds-linear-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const key=n=>`P4-structures-2-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:5},(_,i)=>key(i+1));
const project=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS线性表判题/',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
test('线性表5个revision2公有接口与私有契约一致，独立期望和预算完整',()=>{
 assert.deepEqual(dsLinearContractIds,ids);assert.deepEqual(Object.keys(dsLinearTaskGuides),ids);
 for(const id of ids){const c=dsLinearContract(id),g=dsLinearTaskGuides[id];
  assert.equal(g.revision,2);assert.ok(g.instruction.includes('只提交'));assert.ok(g.starter);assert.ok(g.publicStatement.includes('O('));assert.ok(g.publicStatement.includes('256'));
  assert.ok(!JSON.stringify(g).includes('dslinear_'));assert.ok(c.groups.length>10);assert.deepEqual(c.expected,c.groups.flat());
  assert.ok(Buffer.byteLength(c.prelude+c.harness)<262144);assert.ok(Buffer.byteLength(dsLinearReferenceSources[id])<=32768);
  assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsLinearContract(id))),id);
  assert.equal(evaluateContract({status:'ran',stdout:c.groups.map(g=>g.join(' ')).join('\n')+'\n'},c).status,'accepted');
  assert.equal(evaluateContract({status:'ran',stdout:c.groups.map(g=>g.join(' ')).join('\n')+'\nextra'},c).status,'wrong_answer');
 }
 for(const n of [2,3,4]){assert.ok(dsLinearTaskGuides[key(n)].publicStatement.includes('typedef struct Node { int data; struct Node *next; } Node;'));assert.ok(dsLinearContract(key(n)).prelude.includes('typedef struct Node { int data; struct Node *next; } Node;'));}
 assert.equal(dsLinearContract('unknown'),null);
});
test('合法边界独立变化，查询按身份、删除按释放、交集不限次序',()=>{
 assert.ok(dsLinearTaskGuides[key(1)].publicStatement.includes('尾部存储内容不作要求'));
 assert.ok(dsLinearContract(key(1)).harness.includes('removeNegatives(box+1,0)'));
 for(const layout of [0,1])assert.ok(dsLinearContract(key(2)).harness.includes(`dslinear_share(values,next,0,-1,-1,${layout})`));
 assert.ok(dsLinearContract(key(2)).groups.some(g=>g[0]==='0'));assert.ok(dsLinearContract(key(2)).groups.some(g=>g[0]==='1'));
 const c=dsLinearContract(key(3));assert.ok(c.prelude.includes('uintptr_t'));assert.ok(c.harness.includes('dslinear_live[original[i]]'));
 assert.ok(c.harness.includes('dslinear_remove(values,0,'));assert.ok(c.harness.includes('dslinear_remove(values,256,'));
 for(const layout of [0,1])assert.ok(dsLinearContract(key(4)).harness.includes(`,2147483647,${layout})`));assert.ok(!dsLinearContract(key(4)).harness.includes('dslinear_kth(values,0,'));
 assert.ok(dsLinearTaskGuides[key(5)].publicStatement.includes('结果次序不限制'));
 assert.ok(dsLinearTaskGuides[key(5)].publicStatement.includes('重叠片段'));
 assert.ok(dsLinearContract(key(5)).harness.includes('int alias,int offset'));
});
const equivalents=[
 [1,'clear-unused-tail','int removeNegatives(int a[],int n){int k=0;for(int i=0;i<n;i++)if(a[i]>=0)a[k++]=a[i];for(int i=k;i<n;i++)a[i]=0;return k;}'],
 [2,'align-lengths','int sharesNode(const Node*a,const Node*b){int na=0,nb=0;for(const Node*p=a;p;p=p->next)na++;for(const Node*p=b;p;p=p->next)nb++;while(na>nb){a=a->next;na--;}while(nb>na){b=b->next;nb--;}while(a&&b){if(a==b)return 1;a=a->next;b=b->next;}return 0;}'],
 [2,'switch-heads','int sharesNode(const Node*a,const Node*b){if(!a||!b)return 0;const Node*p=a,*q=b;while(p!=q){p=p?p->next:b;q=q?q->next:a;}return p!=NULL;}'],
 [3,'pointer-to-link','void removeValue(Node*head,int x){Node**link=&head->next;while(*link){Node*p=*link;if(p->data==x){*link=p->next;free(p);}else link=&p->next;}}'],
 [3,'function-pointer-release','void removeValue(Node*head,int x){void(*release)(void*)=free;Node*p=head;while(p->next){Node*q=p->next;if(q->data==x){p->next=q->next;release(q);}else p=q;}}'],
 [3,'replace-survivors','void removeValue(Node*head,int x){Node*p=head->next,*tail=head;head->next=NULL;while(p){Node*next=p->next;if(p->data==x)free(p);else{Node*q=malloc(sizeof *q);if(q){q->data=p->data;free(p);}else q=p;q->next=NULL;tail->next=q;tail=q;}p=next;}}'],
 [4,'gap-k-minus-one','const Node*kthFromEnd(const Node*first,int k){const Node*p=first,*q=first;for(int i=1;i<k;i++){if(!p->next)return NULL;p=p->next;}while(p->next){p=p->next;q=q->next;}return q;}'],
 [5,'descending-output','int intersection(const int a[],int n,const int b[],int m,int c[]){int i=n-1,j=m-1,k=0;while(i>=0&&j>=0){if(a[i]>b[j])i--;else if(a[i]<b[j])j--;else{c[k++]=a[i];i--;j--;}}return k;}'],
 [5,'monotone-inner-loop','int intersection(const int a[],int n,const int b[],int m,int c[]){int j=0,k=0;for(int i=0;i<n;i++){while(j<m&&b[j]<a[i])j++;if(j<m&&b[j]==a[i])c[k++]=a[i];}return k;}']
];
const wrong=[
 [1,'drop-zero','int removeNegatives(int a[],int n){int k=0;for(int i=0;i<n;i++)if(a[i]>0)a[k++]=a[i];return k;}'],
 [1,'unstable-swap-tail','int removeNegatives(int a[],int n){int i=0;while(i<n){if(a[i]<0)a[i]=a[--n];else i++;}return n;}'],
 [1,'ignore-new-length','int removeNegatives(int a[],int n){int k=0;for(int i=0;i<n;i++)if(a[i]>=0)a[k++]=a[i];return n;}'],
 [1,'reads-past-logical-n','int removeNegatives(int a[],int n){int k=0;for(int i=0;i<=n;i++)if(a[i]>=0)a[k++]=a[i];return k;}'],
 [2,'equal-data-is-sharing','int sharesNode(const Node*a,const Node*b){for(const Node*p=a;p;p=p->next)for(const Node*q=b;q;q=q->next)if(p->data==q->data)return 1;return 0;}'],
 [2,'only-equal-heads','int sharesNode(const Node*a,const Node*b){return a&&a==b;}'],
 [2,'empty-tails-compare-equal','int sharesNode(const Node*a,const Node*b){while(a&&a->next)a=a->next;while(b&&b->next)b=b->next;return a==b;}'],
 [2,'mutates-input','int sharesNode(const Node*a,const Node*b){if(a)((Node*)a)->data=0;if(!a||!b)return 0;while(a->next)a=a->next;while(b->next)b=b->next;return a==b;}'],
 [3,'no-free','void removeValue(Node*head,int x){Node*p=head;while(p->next){Node*q=p->next;if(q->data==x)p->next=q->next;else p=q;}}'],
 [3,'skip-consecutive','void removeValue(Node*head,int x){Node*p=head;while(p&&p->next){Node*q=p->next;if(q->data==x){p->next=q->next;free(q);}p=p->next;}}'],
 [3,'first-match-only','void removeValue(Node*head,int x){Node*p=head;while(p->next){Node*q=p->next;if(q->data==x){p->next=q->next;free(q);return;}p=q;}}'],
 [3,'frees-header','void removeValue(Node*head,int x){if(head->data==x){Node*q=head;head=head->next;free(q);}if(!head)return;Node*p=head;while(p->next){Node*q=p->next;if(q->data==x){p->next=q->next;free(q);}else p=q;}}'],
 [4,'off-by-one','const Node*kthFromEnd(const Node*first,int k){const Node*p=first,*q=first;for(int i=1;i<k;i++){if(!p)return NULL;p=p->next;}while(p){p=p->next;q=q->next;}return q;}'],
 [4,'equal-data-copy','const Node*kthFromEnd(const Node*first,int k){static Node copy;const Node*p=first,*q=first;for(int i=0;i<k;i++){if(!p)return NULL;p=p->next;}while(p){p=p->next;q=q->next;}copy=*q;return &copy;}'],
 [4,'first-equal-value','const Node*kthFromEnd(const Node*first,int k){const Node*p=first,*q=first;for(int i=0;i<k;i++){if(!p)return NULL;p=p->next;}while(p){p=p->next;q=q->next;}for(p=first;p;p=p->next)if(p->data==q->data)return p;return NULL;}'],
 [5,'first-match-only','int intersection(const int a[],int n,const int b[],int m,int c[]){for(int i=0;i<n;i++)for(int j=0;j<m;j++)if(a[i]==b[j]){c[0]=a[i];return 1;}return 0;}'],
 [5,'only-equal-indices','int intersection(const int a[],int n,const int b[],int m,int c[]){int k=0;for(int i=0;i<n&&i<m;i++)if(a[i]==b[i])c[k++]=a[i];return k;}'],
 [5,'miss-last-values','int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n-1&&j<m-1){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{c[k++]=a[i++];j++;}}return k;}'],
 [5,'double-count','int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n&&j<m){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{c[k++]=a[i++];j++;}}return 2*k;}'],
 [5,'modifies-input','int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n&&j<m){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{c[k++]=a[i++];j++;}}if(n)((int*)a)[0]=0;return k;}']
];
function run(id,source){const c=dsLinearContract(id),child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify({source,prelude:c.prelude,harness:c.harness,stdin:''}),encoding:'utf8',timeout:25000,windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'}});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);const raw=JSON.parse(child.stdout);return {...evaluateContract(raw,c),id,sourceSha256:hash(source),contractSha256:hash(JSON.stringify(c)),...(raw.status!=='ran'?{detail:raw.stderr||raw.message}:{} )};}
test('真实C17：5参考、9等价、20个独立错误族串行核验',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:600000},()=>{
 const results=[];let complete=false;const selected=process.env.JUDGE_DS_LINEAR_TARGETS?.split(',')||ids;
 const check=(id,source,kind)=>{const r={...run(id,source),kind};results.push(r);return r;};
 try{
  for(const id of selected){const r=check(id,dsLinearReferenceSources[id],'reference');assert.equal(r.status,'accepted',JSON.stringify(r));}
  for(const [n,label,source]of equivalents)if(selected.includes(key(n))){const r=check(key(n),source,'equivalent:'+label);assert.equal(r.status,'accepted',JSON.stringify(r));}
  for(const [n,label,source]of wrong)if(selected.includes(key(n))){const r=check(key(n),source,'wrong:'+label);assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));}
  complete=true;
 }finally{mkdirSync(evidence,{recursive:true});writeFileSync(evidence+(selected.length===5?'真实判题验证.json':'定向复核.json'),JSON.stringify({time:new Date().toISOString(),complete,ids:selected,questionCount:selected.length,groups:selected.reduce((s,id)=>s+dsLinearContract(id).groups.length,0),sourceFiles:['ds-linear-task-guides.js','scripts/judge-ds-linear-contracts.mjs','tests/ds-linear-judge.test.mjs'].map(path=>({path:project+path,sha256:hash(readFileSync(project+path))})),limits:['有限执行核验功能，不自动证明O(n)复杂度、一次扫描、O(1)空间或所有源级要求。','真实动态结点在释放前记录分配实例代号，原被释放实例不再解引用；追踪标准分配调用路径，非全域内存安全或任意自定义分配器证明。','交集在可信驱动内规范化结果顺序，仍核数量/重复与输入不变；尾区没有承诺则不比较。','仅在公开合法域测边界，不把空链/k≤0追加给非空倒数题。'],results},null,2));}
});
