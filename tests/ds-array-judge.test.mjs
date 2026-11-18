import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {dsArrayTaskGuides,dsArrayTypes} from '../ds-array-task-guides.js';
import {dsArrayContract,dsArrayContractIds,dsArrayReferenceSources} from '../scripts/judge-ds-array-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const id=n=>`P4-structures-5-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:10},(_,i)=>id(i+1));
const project=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS数组判题/',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('DS第5章10原题revision2、类型、公开解答和私有预算一致',()=>{
 assert.deepEqual(dsArrayContractIds,ids);assert.deepEqual(Object.keys(dsArrayTaskGuides),ids);
 for(const questionId of ids){const guide=dsArrayTaskGuides[questionId],c=dsArrayContract(questionId);
  assert.equal(guide.revision,2);assert.ok(guide.publicStatement.length>100);assert.ok(guide.instruction.includes('不写main'));assert.ok(guide.instruction.includes('另行评阅'));assert.ok(guide.starter);assert.equal(guide.solution,dsArrayReferenceSources[questionId]);
  assert.ok(!JSON.stringify(guide).includes('dsa_'));assert.ok(!/同上|上一题/.test(guide.publicStatement));
  assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsArrayContract(questionId))));assert.deepEqual(c.expected,c.groups.flat());assert.ok(c.groups.length>=20);
  assert.ok(Buffer.byteLength(guide.solution)<32768);assert.ok(Buffer.byteLength(c.prelude+c.harness)<262144,questionId);assert.ok(Buffer.byteLength(c.groups.map(g=>g.join(' ')).join('\n'))<65536);
  assert.equal(evaluateContract({status:'ran',stdout:c.groups.map(g=>g.join(' ')).join('\n')+'\n'},c).status,'accepted');
  assert.equal(evaluateContract({status:'ran',stdout:c.groups.map(g=>g.join(' ')).join('\n')+'\nextra'},c).status,'wrong_answer');
 }
 for(const n of [2,3,5])assert.ok(dsArrayContract(id(n)).prelude.includes(dsArrayTypes.triple));
 assert.ok(dsArrayContract(id(4)).prelude.includes(dsArrayTypes.csr));
 for(const n of [6,7,8,10])assert.ok(dsArrayContract(id(n)).prelude.includes(dsArrayTypes.glist));
 assert.equal(dsArrayContract('unknown'),null);
});
test('公开区分记录字段、逻辑前缀、空行、共享出现与完整语法',()=>{
 for(const n of [2,3])assert.ok(dsArrayTaskGuides[id(n)].publicStatement.includes('实际存储可能多于t'));
 assert.ok(dsArrayTaskGuides[id(3)].publicStatement.includes('rows=0'));assert.ok(dsArrayTaskGuides[id(4)].publicStatement.includes('long long'));
 assert.ok(dsArrayTaskGuides[id(5)].publicStatement.includes('尾区不作要求'));assert.ok(dsArrayTaskGuides[id(5)].publicStatement.includes('t以外存储不改'));
 for(const n of [6,7,8])assert.ok(dsArrayTaskGuides[id(n)].publicStatement.includes('共享'));
 assert.ok(dsArrayTaskGuides[id(6)].publicStatement.includes('空子表仍增加嵌套层级'));
 const parser=dsArrayTaskGuides[id(9)].publicStatement;assert.ok(parser.includes('内部NUL'));assert.ok(parser.includes('消费整个逻辑输入'));assert.ok(parser.includes('普通空格'));
 const harness=dsArrayContract(id(9)).harness;assert.ok(harness.includes('{97,0,98}'));assert.ok(harness.includes('{97,255}'));
 assert.ok(!dsArrayContract(id(2)).harness.includes('memcmp'));assert.ok(!dsArrayContract(id(5)).harness.includes('memcmp'));
 for(const n of [6,7,8,10]){const c=dsArrayContract(id(n));assert.ok(c.harness.includes('links+ec+2'));assert.ok(c.harness.includes('nodes[nc+2].tag!=GL_LIST'));assert.ok(c.harness.includes('-3'));}
 assert.ok(dsArrayContract(id(8)).harness.includes('atom[]={7},length[]={1},offset[]={-2}'));
 assert.ok(dsArrayContract(id(10)).groups.some(g=>g[0]==='766'));
});
const ref=n=>dsArrayReferenceSources[id(n)];
const equivalents=[
 [1,'lower-triangle','void transposeSquare(int a[],int n){for(int r=0;r<n;r++)for(int c=0;c<r;c++){int x=a[r*n+c];a[r*n+c]=a[c*n+r];a[c*n+r]=x;}}'],
 [2,'reverse-stable-placement','void fastTranspose(const Triple s[],int rows,int cols,int t,Triple d[]){(void)rows;int end[cols?cols:1];for(int c=0;c<cols;c++)end[c]=0;for(int p=0;p<t;p++)end[s[p].col]++;for(int c=1;c<cols;c++)end[c]+=end[c-1];for(int p=t-1;p>=0;p--)d[--end[s[p].col]]=(Triple){s[p].col,s[p].row,s[p].value};}'],
 [3,'scan-row-boundaries','void tripletsToCSR(const Triple s[],int rows,int cols,int t,int row[],int col[],int value[]){(void)cols;int p=0;for(int r=0;r<=rows;r++){while(p<t&&s[p].row<r)p++;row[r]=p;}for(int i=0;i<t;i++){col[i]=s[i].col;value[i]=s[i].value;}}'],
 [4,'single-record-scan','void csrRowSums(const CSR*a,long long sums[]){for(int r=0;r<a->rows;r++)sums[r]=0;int r=0;for(int p=0;p<a->count;p++){while(r+1<a->rows&&p>=a->row[r+1])r++;sums[r]+=(long long)a->value[p];}}'],
 [5,'clear-logical-tail','int removeZeroTriples(Triple a[],int t){int w=0;for(int p=0;p<t;p++)if(a[p].value)a[w++]=a[p];for(int p=w;p<t;p++)a[p]=(Triple){0,0,0};return w;}'],
 [6,'reverse-children-commute','static void visit(const GNode*p,int level,long long out[]){if(p->tag==GL_ATOM){out[level-1]++;return;}for(int i=p->length-1;i>=0;i--)visit(p->items[i],level+1,out);}\nvoid countAtomsByLevel(const GNode*root,long long out[],int levels){for(int i=0;i<levels;i++)out[i]=0;visit(root,0,out);}'],
 [7,'recursive-returned-length','int flattenAtoms(const GNode*p,int out[]){if(p->tag==GL_ATOM){out[0]=p->atom;return 1;}int n=0;for(int i=0;i<p->length;i++)n+=flattenAtoms(p->items[i],out+n);return n;}'],
 [8,'reverse-order-sum','long long sumAtoms(const GNode*p){if(p->tag==GL_ATOM)return p->atom;long long sum=0;for(int i=p->length-1;i>=0;i--)sum+=sumAtoms(p->items[i]);return sum;}'],
 [9,'explicit-parser-stack','int isGListText(const unsigned char s[],int n){int state[513],top=0,done=0;for(int i=0;i<n;i++){unsigned char c=s[i];if(c==32)continue;int expects=top?state[top-1]!=2:!done;if((c>=65&&c<=90)||(c>=97&&c<=122)){if(!expects)return 0;if(top)state[top-1]=2;else done=1;}else if(c==40){if(!expects)return 0;state[top++]=0;}else if(c==41){if(!top||state[top-1]==1)return 0;top--;if(top)state[top-1]=2;else done=1;}else if(c==44){if(!top||state[top-1]!=2)return 0;state[top-1]=1;}else return 0;}return done&&top==0;}'],
 [10,'recursive-buffer-slices','int formatGList(const GNode*p,char out[]){if(p->tag==GL_ATOM){out[0]=(char)p->atom;out[1]=0;return 1;}int at=0;out[at++]=\'(\';for(int i=0;i<p->length;i++){if(i)out[at++]=\',\';at+=formatGList(p->items[i],out+at);}out[at++]=\')\';out[at]=0;return at;}']
];
const wrong=[
 [1,'swap-twice','void transposeSquare(int a[],int n){for(int i=0;i<n;i++)for(int j=0;j<n;j++){int x=a[i*n+j];a[i*n+j]=a[j*n+i];a[j*n+i]=x;}}'],
 [1,'copy-one-triangle','void transposeSquare(int a[],int n){for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)a[i*n+j]=a[j*n+i];}'],
 [1,'omit-last-row',ref(1).replace('j<n;j++','j<n-1;j++')],
 [2,'swap-only-not-sort','void fastTranspose(const Triple a[],int rows,int cols,int t,Triple b[]){(void)rows;(void)cols;for(int i=0;i<t;i++)b[i]=(Triple){a[i].col,a[i].row,a[i].value};}'],
 [2,'copy-without-swap','void fastTranspose(const Triple a[],int rows,int cols,int t,Triple b[]){(void)rows;(void)cols;for(int i=0;i<t;i++)b[i]=a[i];}'],
 [2,'omit-last-record',ref(2).replace('for(int p=0;p<t;p++){int at=','for(int p=0;p<t-1;p++){int at=')],
 [2,'wrong-value-field',ref(2).replace('src[p].value};','src[p].row};')],
 [3,'counts-not-prefix',ref(3).replace('for(int i=1;i<=rows;i++)row[i]+=row[i-1];','')],
 [3,'column-value-swapped',ref(3).replace('col[p]=src[p].col;value[p]=src[p].value;','col[p]=src[p].value;value[p]=src[p].col;')],
 [3,'omit-terminal-row',ref(3).replace('i<=rows;i++)row[i]=0','i<rows;i++)row[i]=0').replace('i<=rows;i++)row[i]+=','i<rows;i++)row[i]+=')],
 [4,'sum-not-reset-between-rows','void csrRowSums(const CSR*a,long long s[]){long long sum=0;for(int r=0;r<a->rows;r++){for(int p=a->row[r];p<a->row[r+1];p++)sum+=a->value[p];s[r]=sum;}}'],
 [4,'int-accumulator',ref(4).replace('long long sum=0','int sum=0').replace('sum+=(long long)','sum+=')],
 [4,'row-count-as-end',ref(4).replace('p<a->row[r+1]','p<a->row[r+1]-a->row[r]')],
 [5,'drops-negative-records',ref(5).replace('a[p].value!=0','a[p].value>0')],
 [5,'unstable-tail-fill','int removeZeroTriples(Triple a[],int t){int n=t,i=0;while(i<n){if(!a[i].value)a[i]=a[--n];else i++;}return n;}'],
 [5,'copies-value-only','int removeZeroTriples(Triple a[],int t){int w=0;for(int p=0;p<t;p++)if(a[p].value)a[w++].value=a[p].value;return w;}'],
 [5,'returns-old-length',ref(5).replace('return w;','return t;')],
 [6,'counts-list-as-atom','static void go(const GNode*p,int level,long long out[]){if(level>0)out[level-1]++;if(p->tag==GL_LIST)for(int i=0;i<p->length;i++)go(p->items[i],level+1,out);}\nvoid countAtomsByLevel(const GNode*p,long long out[],int levels){for(int i=0;i<levels;i++)out[i]=0;go(p,0,out);}'],
 [6,'does-not-clear-output',ref(6).replace('for(int i=0;i<levels;i++)counts[i]=0;','(void)levels;')],
 [6,'deduplicates-shared-nodes','static const GNode*seen[256];static int used;static void visit(const GNode*p,int l,long long out[]){for(int i=0;i<used;i++)if(seen[i]==p)return;seen[used++]=p;if(p->tag==GL_ATOM){out[l-1]++;return;}for(int i=0;i<p->length;i++)visit(p->items[i],l+1,out);}\nvoid countAtomsByLevel(const GNode*p,long long out[],int levels){used=0;for(int i=0;i<levels;i++)out[i]=0;visit(p,0,out);}'],
 [7,'deduplicates-values','static int go(const GNode*p,int out[],int n){if(p->tag==GL_ATOM){for(int i=0;i<n;i++)if(out[i]==p->atom)return n;out[n++]=p->atom;return n;}for(int i=0;i<p->length;i++)n=go(p->items[i],out,n);return n;}\nint flattenAtoms(const GNode*p,int out[]){return go(p,out,0);}'],
 [7,'outer-atoms-only','int flattenAtoms(const GNode*p,int out[]){if(p->tag==GL_ATOM){out[0]=p->atom;return 1;}int n=0;for(int i=0;i<p->length;i++)if(p->items[i]->tag==GL_ATOM)out[n++]=p->items[i]->atom;return n;}'],
 [7,'reverse-child-order',ref(7).replace('for(int i=0;i<p->length;i++)','for(int i=p->length-1;i>=0;i--)')],
 [7,'deduplicates-shared-nodes','static const GNode*seen[256];static int used;static int go(const GNode*p,int out[],int n){for(int i=0;i<used;i++)if(seen[i]==p)return n;seen[used++]=p;if(p->tag==GL_ATOM){out[n++]=p->atom;return n;}for(int i=0;i<p->length;i++)n=go(p->items[i],out,n);return n;}\nint flattenAtoms(const GNode*p,int out[]){used=0;return go(p,out,0);}'],
 [8,'positive-atoms-only',ref(8).replace('return (long long)root->atom;','return root->atom>0?(long long)root->atom:0;')],
 [8,'includes-list-atom-field',ref(8).replace('long long sum=0','long long sum=root->atom')],
 [8,'int-accumulation',ref(8).replace('long long sum=0','int sum=0')],
 [8,'deduplicates-shared-nodes','static const GNode*seen[256];static int used;static long long go(const GNode*p){for(int i=0;i<used;i++)if(seen[i]==p)return 0;seen[used++]=p;if(p->tag==GL_ATOM)return p->atom;long long s=0;for(int i=0;i<p->length;i++)s+=go(p->items[i]);return s;}\nlong long sumAtoms(const GNode*p){used=0;return go(p);}'],
 [9,'balanced-parentheses-only','int isGListText(const unsigned char*s,int n){int d=0,any=0;for(int i=0;i<n;i++){int c=s[i];if(c==32)continue;any=1;if(c==40)d++;else if(c==41){if(--d<0)return 0;}else if(c!=44&&!((c>=65&&c<=90)||(c>=97&&c<=122)))return 0;}return any&&d==0;}'],
 [9,'ignores-trailing-input',ref(9).replace('return p==n;','return 1;')],
 [9,'nul-terminated','#include <string.h>\n'+ref(9).replace('int p=0;if(!parseG','n=(int)strlen((const char*)s);int p=0;if(!parseG')],
 [9,'empty-text-valid',ref(9).replace('int p=0;if(!parseG','if(n==0)return 1;int p=0;if(!parseG')],
 [9,'ignores-tabs',ref(9).replace('s[*p]==32','(s[*p]==32||s[*p]==9||s[*p]==10)')],
 [10,'no-terminator',ref(10).replace('out[n]=0;','')],
 [10,'trailing-comma','int formatGList(const GNode*p,char out[]){if(p->tag==GL_ATOM){out[0]=(char)p->atom;out[1]=0;return 1;}int at=0;out[at++]=\'(\';for(int i=0;i<p->length;i++){at+=formatGList(p->items[i],out+at);out[at++]=\',\';}out[at++]=\')\';out[at]=0;return at;}'],
 [10,'flattens-without-brackets','static int go(const GNode*p,char out[],int n){if(p->tag==GL_ATOM){out[n++]=(char)p->atom;return n;}for(int i=0;i<p->length;i++)n=go(p->items[i],out,n);return n;}\nint formatGList(const GNode*p,char out[]){int n=go(p,out,0);out[n]=0;return n;}']
];
for(const n of [6,7,8,10]){
 const receiver=n===8?'root':'p';
 wrong.push([n,'atom-requires-zero-ignored-length',ref(n).replace(receiver+'->tag==GL_ATOM',receiver+'->tag==GL_ATOM&&'+receiver+'->length==0')]);
 wrong.push([n,'atom-requires-null-ignored-items',ref(n).replace(receiver+'->tag==GL_ATOM',receiver+'->tag==GL_ATOM&&'+receiver+'->items==NULL')]);
}
wrong.push([10,'fixed-512-truncation',ref(10).replace('int n=emitG(root,out,0);out[n]=0;return n;','char temporary[1025];int n=emitG(root,temporary,0),keep=n<511?n:511;for(int i=0;i<keep;i++)out[i]=temporary[i];out[keep]=0;return keep;')]);
export const dsArrayValidationSamples=[...ids.map(questionId=>({id:questionId,kind:'reference',source:dsArrayTaskGuides[questionId].solution})),...equivalents.map(([n,label,source])=>({id:id(n),kind:'equivalent:'+label,source})),...wrong.map(([n,label,source])=>({id:id(n),kind:'wrong:'+label,source}))];
function run(questionId,source){const c=dsArrayContract(questionId),workerSha256=hash(readFileSync(project+'scripts/judge-worker.py')),child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify({source,prelude:c.prelude,harness:c.harness}),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);const raw=JSON.parse(child.stdout),{stdout,...result}=evaluateContract(raw,c);return {...result,id:questionId,sourceSha256:hash(source),contractSha256:hash(JSON.stringify(c)),workerSha256,...(!['ran'].includes(raw.status)?{detail:raw.stderr||raw.message,completedLines:raw.stdout?.split('\n').length-1}:{}),...(result.status==='wrong_answer'?{outputPreview:raw.stdout?.slice(0,160)}:{})};}
test('真实C17参考、等价和独立错误族逐个核验',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_ARRAY_TARGETS?.split(',')||ids,referenceOnly=process.env.JUDGE_DS_ARRAY_ROLES==='reference',results=[];let complete=false;
 const check=(questionId,source,kind)=>{const r={...run(questionId,source),kind};results.push(r);return r;};
 try{
  for(const sample of dsArrayValidationSamples)if(selected.includes(sample.id)&&(!referenceOnly||sample.kind==='reference')){const r=check(sample.id,sample.source,sample.kind);if(sample.kind.startsWith('wrong:'))assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));else assert.equal(r.status,'accepted',JSON.stringify(r));}
  complete=true;
 }finally{
  mkdirSync(evidence,{recursive:true});writeFileSync(evidence+(referenceOnly?'参考初验.json':selected.length===10?'真实判题验证.json':'定向复核.json'),JSON.stringify({time:new Date().toISOString(),complete,ids:selected,referenceOnly,sourceSamples:results.length,groups:selected.reduce((sum,id)=>sum+dsArrayContract(id).groups.length,0),sourceFiles:['ds-array-task-guides.js','scripts/judge-ds-array-contracts.mjs','tests/ds-array-judge.test.mjs'].map(path=>({path:project+path,sha256:hash(readFileSync(project+path))})),limits:['只核验有限合法输入功能，不自动证明复杂度、一次扫描、快速转置或递归等源级要求。','结构只比公开成员，不比padding；稳定压缩[k,t)尾区不作要求。','广义表按引用位置重复展开，输入只读，输出由调用方提供；没有新增分配/free义务。'],results},null,2)+'\n');
 }
});
