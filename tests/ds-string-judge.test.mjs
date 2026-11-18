import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {dsStringTaskGuides} from '../ds-string-task-guides.js';
import {dsStringContract,dsStringContractIds,dsStringReferenceSources} from '../scripts/judge-ds-string-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
const id=n=>`P4-structures-4-D-${String(n).padStart(3,'0')}`;
const ids=Array.from({length:10},(_,i)=>id(i+1));
const project=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/DS串判题/',import.meta.url));
const hash=x=>createHash('sha256').update(x).digest('hex');
const unique=values=>[...new Set(values)];
const configs=c=>c.variants||[c];
test('串10题revision2接口、公开答案与私有参考一致，显式长度及预算完整',()=>{
 assert.deepEqual(dsStringContractIds,ids);assert.deepEqual(Object.keys(dsStringTaskGuides),ids);
 for(const questionId of ids){const guide=dsStringTaskGuides[questionId],c=dsStringContract(questionId);
  assert.equal(guide.revision,2);assert.ok(guide.publicStatement.includes('1024'));assert.ok(guide.instruction.includes('只提交'));assert.ok(guide.starter);assert.equal(guide.solution,dsStringReferenceSources[questionId]);
  assert.ok(!JSON.stringify(guide).includes('dsstring_'));assert.ok(!JSON.stringify(guide).includes('dsStringContract'));assert.ok(!/上一题|同上|沿用前/.test(guide.publicStatement));
  assert.ok(c.groups.length>50);assert.equal(hash(JSON.stringify(c)),hash(JSON.stringify(dsStringContract(questionId))));assert.ok(Buffer.byteLength(guide.solution)<=32768);
  for(const v of configs(c)){assert.deepEqual(v.expected,v.groups.flat());assert.ok(Buffer.byteLength(v.prelude+v.harness)<262144,questionId);assert.ok(Buffer.byteLength(v.groups.map(g=>g.join(' ')).join('\n'))<65536);}
  const outputs=configs(c).map(v=>({status:'ran',stdout:v.groups.map(g=>g.join(' ')).join('\n')+'\n'})),raw=c.variants?{status:'variants',results:outputs}:outputs[0];
  assert.equal(evaluateContract(raw,c).status,'accepted');outputs.at(-1).stdout+='extra';assert.equal(evaluateContract(raw,c).status,'wrong_answer');
 }
 assert.equal(dsStringContract('unknown'),null);
});
test('0字节/高字节/独立前缀/重叠/工作表和尾区条件均有对应公开约定',()=>{
 for(const n of [1,2,3,5,6,7,8,9,10])assert.ok(dsStringTaskGuides[id(n)].publicStatement.includes('零字节可以是普通数据'));
 for(const n of [2,3,6,8])assert.ok(dsStringTaskGuides[id(n)].publicStatement.includes('重叠片段'));
 for(const n of [5,10])assert.ok(dsStringTaskGuides[id(n)].publicStatement.includes('尾部不作要求'));
 for(const n of [5,9,10])assert.ok(dsStringTaskGuides[id(n)].publicStatement.includes(n===9?'只改变前n项':'n之后的存储不得改写'));
 assert.ok(dsStringTaskGuides[id(6)].publicStatement.includes('非空模式'));assert.ok(dsStringTaskGuides[id(6)].publicStatement.includes('重叠'));
 assert.ok(dsStringTaskGuides[id(8)].publicStatement.includes('next至少n+1'));assert.ok(dsStringTaskGuides[id(8)].publicStatement.includes('不固定某一种表值'));
 assert.ok(dsStringTaskGuides[id(10)].publicStatement.includes('调用前的集合'));
 assert.ok(dsStringContract(id(8)).harness.includes('{97,97,98,97,98},bv[]={97,98,97,97,98}'));
 assert.ok(dsStringContract(id(9)).harness.includes('4294967295u'));
 assert.ok(dsStringContract(id(10)).harness.includes('dsstring_remove(av,4,4,dv,0,1,1,1)'));
 assert.equal(dsStringContract(id(6)).variants.length,2);assert.deepEqual(dsStringContract(id(6)).variants[1].groups,[['513','1','1']]);
});
const equivalent=[
 [1,'half-count','int isPalindrome(const unsigned char s[],int n){for(int i=0;i<n/2;i++)if(s[i]!=s[n-1-i])return 0;return 1;}'],
 [2,'for-loop','int commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m){int count=0;for(int i=0;i<n&&i<m;i++){if(a[i]!=b[i])break;count++;}return count;}'],
 [3,'reverse-greedy','int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m){int i=n-1,j=m-1;while(i>=0&&j>=0){if(s[i]==t[j])j--;i--;}return j<0;}'],
 [4,'parity-mask','int canRearrangePalindrome(const unsigned char s[],int n){unsigned long mask=0;for(int i=0;i<n;i++)mask^=1UL<<(s[i]-\'a\');return (mask&(mask-1UL))==0;}'],
 [5,'previous-input-flag','int compressSpaces(unsigned char s[],int n){int w=0,wasSpace=0;for(int i=0;i<n;i++){unsigned char x=s[i];if(x!=32||!wasSpace)s[w++]=x;wasSpace=x==32;}return w;}'],
 [5,'clear-unused-tail','int compressSpaces(unsigned char s[],int n){int w=0;for(int i=0;i<n;i++)if(s[i]!=32||w==0||s[w-1]!=32)s[w++]=s[i];for(int i=w;i<n;i++)s[i]=0;return w;}'],
 [6,'memcmp-at-each-start','#include <string.h>\nint countPattern(const unsigned char s[],int n,const unsigned char t[],int m){int count=0;for(int i=0;i<=n-m;i++)if(memcmp(s+i,t,(size_t)m)==0)count++;return count;}'],
 [7,'first-position-table','int firstUnique(const unsigned char s[],int n){int count[256]={0},position[256];for(int i=0;i<256;i++)position[i]=n;for(int i=0;i<n;i++){if(count[s[i]]++==0)position[s[i]]=i;}int best=n;for(int b=0;b<256;b++)if(count[b]==1&&position[b]<best)best=position[b];return best==n?-1:best;}'],
 [8,'minus-one-next-virtual-double','int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){(void)work;if(!n)return 1;int i=0,j=-1;next[0]=-1;while(i<n){if(j<0||t[i]==t[j])next[++i]=++j;else j=next[j];}i=j=0;while(i<2*n-1&&j<n){if(j<0||s[i%n]==t[j]){i++;j++;}else j=next[j];}return j==n;}'],
 [9,'gcd-cycles','void rotateLeft(unsigned char s[],int n,unsigned int k){if(!n)return;k%=(unsigned)n;int shift=(int)k;if(!shift)return;int a=n,b=shift;while(b){int t=a%b;a=b;b=t;}for(int start=0;start<a;start++){unsigned char saved=s[start];int at=start;while(1){int next=at+shift;if(next>=n)next-=n;if(next==start)break;s[at]=s[next];at=next;}s[at]=saved;}}'],
 [10,'bitset-before-writing','int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){unsigned char bits[32]={0};for(int i=0;i<m;i++)bits[d[i]>>3]|=(unsigned char)(1u<<(d[i]&7));int w=0;for(int i=0;i<n;i++)if(!(bits[s[i]>>3]&(1u<<(s[i]&7))))s[w++]=s[i];return w;}'],
 [10,'clear-unused-tail','int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){unsigned char drop[256]={0};for(int i=0;i<m;i++)drop[d[i]]=1;int w=0;for(int i=0;i<n;i++)if(!drop[s[i]])s[w++]=s[i];for(int i=w;i<n;i++)s[i]=0;return w;}']
];
const wrong=[
 [1,'empty-is-false','int isPalindrome(const unsigned char s[],int n){if(!n)return 0;for(int i=0;i<n/2;i++)if(s[i]!=s[n-1-i])return 0;return 1;}'],
 [1,'outer-pair-only','int isPalindrome(const unsigned char s[],int n){return n<2||s[0]==s[n-1];}'],
 [1,'nul-terminated','#include <string.h>\nint isPalindrome(const unsigned char s[],int n){n=(int)strlen((const char*)s);for(int i=0;i<n/2;i++)if(s[i]!=s[n-1-i])return 0;return 1;}'],
 [2,'length-only','int commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m){(void)a;(void)b;return n<m?n:m;}'],
 [2,'off-by-one','int commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m){int i=0;while(i<n&&i<m&&a[i]==b[i])i++;return i+1;}'],
 [2,'nul-lengths','#include <string.h>\nint commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m){n=(int)strlen((const char*)a);m=(int)strlen((const char*)b);int i=0;while(i<n&&i<m&&a[i]==b[i])i++;return i;}'],
 [3,'substring-instead','int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m){for(int i=0;i<=n-m;i++){int j=0;while(j<m&&s[i+j]==t[j])j++;if(j==m)return 1;}return 0;}'],
 [3,'empty-target-false','int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m){if(!m)return 0;int j=0;for(int i=0;i<n&&j<m;i++)if(s[i]==t[j])j++;return j==m;}'],
 [3,'first-target-byte-enough','int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m){if(!m)return 1;for(int i=0;i<n;i++)if(s[i]==t[0])return 1;return 0;}'],
 [4,'requires-all-even','int canRearrangePalindrome(const unsigned char s[],int n){int c[26]={0};for(int i=0;i<n;i++)c[s[i]-\'a\']++;for(int i=0;i<26;i++)if(c[i]%2)return 0;return 1;}'],
 [4,'already-palindrome-only','int canRearrangePalindrome(const unsigned char s[],int n){for(int i=0;i<n/2;i++)if(s[i]!=s[n-1-i])return 0;return 1;}'],
 [4,'only-one-distinct','int canRearrangePalindrome(const unsigned char s[],int n){int c[26]={0},distinct=0;for(int i=0;i<n;i++)c[s[i]-\'a\']=1;for(int i=0;i<26;i++)distinct+=c[i];return distinct<=1;}'],
 [5,'trims-ends','int compressSpaces(unsigned char s[],int n){int w=0;for(int i=0;i<n;i++)if(s[i]!=32||(w>0&&s[w-1]!=32))s[w++]=s[i];if(w&&s[w-1]==32)w--;return w;}'],
 [5,'all-whitespace','#include <ctype.h>\nint compressSpaces(unsigned char s[],int n){int w=0;for(int i=0;i<n;i++)if(!isspace(s[i])||w==0||s[w-1]!=32)s[w++]=isspace(s[i])?32:s[i];return w;}'],
 [5,'nul-length','#include <string.h>\nint compressSpaces(unsigned char s[],int n){n=(int)strlen((char*)s);int w=0;for(int i=0;i<n;i++)if(s[i]!=32||!w||s[w-1]!=32)s[w++]=s[i];return w;}'],
 [6,'non-overlap-only','int countPattern(const unsigned char s[],int n,const unsigned char t[],int m){int count=0;for(int i=0;i<=n-m;i++){int j=0;while(j<m&&s[i+j]==t[j])j++;if(j==m){count++;i+=m-1;}}return count;}'],
 [6,'miss-last-start','int countPattern(const unsigned char s[],int n,const unsigned char t[],int m){int count=0;for(int i=0;i<n-m;i++){int j=0;while(j<m&&s[i+j]==t[j])j++;if(j==m)count++;}return count;}'],
 [6,'first-byte-only','int countPattern(const unsigned char s[],int n,const unsigned char t[],int m){int count=0;for(int i=0;i<=n-m;i++)if(s[i]==t[0])count++;return count;}'],
 [7,'unique-in-prefix','int firstUnique(const unsigned char s[],int n){int c[256]={0};for(int i=0;i<n;i++){c[s[i]]++;if(c[s[i]]==1)return i;}return -1;}'],
 [7,'last-unique','int firstUnique(const unsigned char s[],int n){int c[256]={0};for(int i=0;i<n;i++)c[s[i]]++;for(int i=n-1;i>=0;i--)if(c[s[i]]==1)return i;return -1;}'],
 [7,'ignores-high-bytes','int firstUnique(const unsigned char s[],int n){int c[128]={0};for(int i=0;i<n;i++)if(s[i]<128)c[s[i]]++;for(int i=0;i<n;i++)if(s[i]<128&&c[s[i]]==1)return i;return -1;}'],
 [7,'nul-length','#include <string.h>\nint firstUnique(const unsigned char s[],int n){n=(int)strlen((const char*)s);int c[256]={0};for(int i=0;i<n;i++)c[s[i]]++;for(int i=0;i<n;i++)if(c[s[i]]==1)return i;return -1;}'],
 [8,'equal-only','int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){(void)work;(void)next;for(int i=0;i<n;i++)if(s[i]!=t[i])return 0;return 1;}'],
 [8,'anagram-only','int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){(void)work;(void)next;int c[256]={0};for(int i=0;i<n;i++){c[s[i]]++;c[t[i]]--;}for(int i=0;i<256;i++)if(c[i])return 0;return 1;}'],
 [8,'wrong-fallback','int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){(void)next;if(!n)return 1;for(int i=0;i<2*n;i++)work[i]=s[i%n];int j=0;for(int i=0;i<2*n-1;i++){if(work[i]!=t[j])j=0;if(work[i]==t[j])j++;if(j==n)return 1;}return 0;}'],
 [8,'strstr-ignores-nul','#include <stdlib.h>\n#include <string.h>\nint isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){(void)work;(void)next;if(!n)return 1;char*p=malloc((size_t)(2*n+1));if(!p)return 0;memcpy(p,s,(size_t)n);memcpy(p+n,s,(size_t)n);p[2*n]=0;int yes=strstr(p,(const char*)t)!=NULL;free(p);return yes;}'],
 [9,'right-rotation','static void r(unsigned char*s,int a,int b){while(a<b){unsigned char x=s[a];s[a++]=s[b];s[b--]=x;}}\nvoid rotateLeft(unsigned char s[],int n,unsigned int k){if(!n)return;int p=(int)(k%(unsigned)n);r(s,0,n-1);r(s,0,p-1);r(s,p,n-1);}'],
 [9,'no-modulo','static void r(unsigned char*s,int a,int b){while(a<b){unsigned char x=s[a];s[a++]=s[b];s[b--]=x;}}\nvoid rotateLeft(unsigned char s[],int n,unsigned int k){if(!n||k>=(unsigned)n)return;int p=(int)k;r(s,0,p-1);r(s,p,n-1);r(s,0,n-1);}'],
 [9,'nul-length','#include <string.h>\nstatic void r(unsigned char*s,int a,int b){while(a<b){unsigned char x=s[a];s[a++]=s[b];s[b--]=x;}}\nvoid rotateLeft(unsigned char s[],int n,unsigned int k){n=(int)strlen((char*)s);if(!n)return;int p=(int)(k%(unsigned)n);r(s,0,p-1);r(s,p,n-1);r(s,0,n-1);}'],
 [10,'empty-drop-clears-all','int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){if(!m)return 0;unsigned char drop[256]={0};for(int i=0;i<m;i++)drop[d[i]]=1;int w=0;for(int i=0;i<n;i++)if(!drop[s[i]])s[w++]=s[i];return w;}'],
 [10,'alias-reloads-mutated-set','int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){int w=0;for(int i=0;i<n;i++){int found=0;for(int j=0;j<m;j++)if(s[i]==d[j])found=1;if(!found)s[w++]=s[i];}return w;}'],
 [10,'nul-drop-length','#include <string.h>\nint removeBytes(unsigned char s[],int n,const unsigned char d[],int m){m=(int)strlen((const char*)d);unsigned char drop[256]={0};for(int i=0;i<m;i++)drop[d[i]]=1;int w=0;for(int i=0;i<n;i++)if(!drop[s[i]])s[w++]=s[i];return w;}'],
 [10,'modifies-drop','int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){unsigned char drop[256]={0};for(int i=0;i<m;i++)drop[d[i]]=1;int w=0;for(int i=0;i<n;i++)if(!drop[s[i]])s[w++]=s[i];if(m)((unsigned char*)d)[0]=0;return w;}']
];
function run(questionId,source){const c=dsStringContract(questionId),payload=c.variants?{source,variants:c.variants}:{source,prelude:c.prelude,harness:c.harness,stdin:''},workerSha256=hash(readFileSync(project+'scripts/judge-worker.py')),child=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:project,input:JSON.stringify(payload),env:{...process.env,PYTHONIOENCODING:'utf-8'},encoding:'utf8',timeout:25000,windowsHide:true});assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);const raw=JSON.parse(child.stdout),{stdout,results,...evaluated}=evaluateContract(raw,c);return {...evaluated,id:questionId,sourceSha256:hash(source),contractSha256:hash(JSON.stringify(c)),workerSha256,configurations:configs(c).length,...(!['ran','variants'].includes(raw.status)?{detail:raw.stderr||raw.message,outputPreview:raw.stdout?.slice(0,160),completedLines:raw.stdout?.split('\n').length-1}:{}),...(raw.results?.some(r=>r.status!=='ran')?{details:raw.results.map((r,i)=>({configuration:i,status:r.status,detail:r.message,completedLines:r.stdout?.split('\n').length-1}))}:{})};}
test('真实C17：公开参考10、等价12、错误族33串行核验',{skip:process.env.JUDGE_RUNTIME!=='1',timeout:900000},()=>{
 const selected=process.env.JUDGE_DS_STRING_TARGETS?.split(',')||ids,results=[];let complete=false;
 const check=(questionId,source,kind)=>{const r={...run(questionId,source),kind};results.push(r);return r;};
 try{
  for(const questionId of selected){const r=check(questionId,dsStringTaskGuides[questionId].solution,'reference');assert.equal(r.status,'accepted',JSON.stringify(r));}
  for(const [n,label,source]of equivalent)if(selected.includes(id(n))){const r=check(id(n),source,'equivalent:'+label);assert.equal(r.status,'accepted',JSON.stringify(r));}
  for(const [n,label,source]of wrong)if(selected.includes(id(n))){const r=check(id(n),source,'wrong:'+label);assert.ok(['wrong_answer','compile_error','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));}
  complete=true;
 }finally{
  mkdirSync(evidence,{recursive:true});const file=evidence+(selected.length===10?'真实判题验证.json':'定向复核.json');let prior;try{if(selected.length!==10)prior=JSON.parse(readFileSync(file,'utf8'));}catch{}
  const merged=[...(prior?.results||[]).filter(old=>!results.some(r=>r.id===old.id&&r.kind===old.kind)),...results],allIds=unique([...(prior?.ids||[]),...selected]);
  writeFileSync(file,JSON.stringify({time:new Date().toISOString(),complete,ids:allIds,questionCount:allIds.length,configurations:allIds.reduce((s,id)=>s+configs(dsStringContract(id)).length,0),groups:allIds.reduce((s,id)=>s+configs(dsStringContract(id)).reduce((a,v)=>a+v.groups.length,0),0),sourceFiles:['ds-string-task-guides.js','scripts/judge-ds-string-contracts.mjs','tests/ds-string-judge.test.mjs'].map(path=>({path:project+path,sha256:hash(readFileSync(project+path))})),limits:['功能测试不证明一次模式匹配、朴素法、复杂度或辅助空间要求；原说明与证明保留独立评阅。','公开显式长度包含零字节；driver尾外额外终止零只为安全观察错误的strlen实现，不构成题面终止符承诺。','next/nextval/前缀函数仅工作区，不以参考表字面作学生输出；虚拟双串等价实现可不使用work。','覆盖公开重叠输入与删除集合调用前快照语义，不擅自要求互不重叠。'],results:merged},null,2));
 }
});
