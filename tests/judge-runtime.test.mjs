import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {getPracticeCourse} from '../practice-library.js';
import {fullExamPapers} from '../full-exams.js';
import {arrayContractIds} from '../scripts/judge-array-contracts.mjs';
import {examContractIds} from '../scripts/judge-exam-contracts.mjs';
import {judgeContract,evaluateContract} from '../scripts/judge-contracts.mjs';
const overrides={
 'P2-programming-6-10':'int negatives(const int a[],int n,int b[]){int k=0;for(int i=0;i<n;i++)if(a[i]<0)b[k++]=a[i];return k;}',
 'P3-programming-6-41':'int less(const int a[],int n,int x){int c=0;for(int i=0;i<n;i++)if(a[i]<x)c++;return c;}',
 'P3-programming-6-42':'int lastMax(const int a[],int n){int k=0;for(int i=1;i<n;i++)if(a[i]>=a[k])k=i;return k;}',
 'P3-programming-6-43':'int ordered(const int a[],int n){for(int i=1;i<n;i++)if(a[i]<a[i-1])return 0;return 1;}',
 'P3-programming-6-49':'int equal(const int a[],const int b[],int n){for(int i=0;i<n;i++)if(a[i]!=b[i])return 0;return 1;}',
 'FULL-programming-v1-21':'int longest(const int a[],int n){if(!n)return 0;int cur=1,best=1;for(int i=1;i<n;i++){if(a[i]>a[i-1])cur++;else cur=1;if(cur>best)best=cur;}return best;}',
 'FULL-programming-v1-22':"void compact(char s[]){int j=0;for(int i=0;s[i];i++)if(s[i]!=' ')s[j++]=s[i];s[j]=0;}",
 'FULL-programming-v1-23':'int find(const int a[],int l,int r,int x){if(l>r)return -1;int m=l+(r-l)/2;if(a[m]==x)return m;if(x<a[m])return find(a,l,m-1,x);return find(a,m+1,r,x);}',
 'FULL-programming-v1-24':'int pal(int x){if(x&&x%10==0)return 0;int r=0;while(x>r){r=r*10+x%10;x/=10;}return x==r||x==r/10;}',
 'FULL-programming-v1-25':'void reverse(int a[],int n){for(int i=0,j=n-1;i<j;i++,j--){int t=a[i];a[i]=a[j];a[j]=t;}}'
};
export function referenceSource(q){
 if(overrides[q.id])return overrides[q.id];
 const functions=[];const regex=/\b(?:int|void|long long)\s+\w+\([^{};]*\)\s*\{/g;let match;
 while((match=regex.exec(q.model))){let depth=1,i=regex.lastIndex;for(;depth&&i<q.model.length;i++){if(q.model[i]==='{')depth++;if(q.model[i]==='}')depth--;}functions.push(q.model.slice(match.index,i));regex.lastIndex=i;}
 if(!functions.length)throw Error(`缺参考代码 ${q.id}`);return functions.join('\n');
}
function run(id,source){
 const c=judgeContract(id);const result=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify({source,prelude:c.prelude||'',harness:c.harness,stdin:''}),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},timeout:25000,windowsHide:true});
 assert.equal(result.error,undefined,id);const raw=JSON.parse(result.stdout);return {...evaluateContract(raw,c),...(raw.status!=='ran'?{detail:raw.stderr}:{}),id};
}
test('实际编译和运行：新增题参考代码通过，常见错误实现必须失败',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const bank=[...getPracticeCourse('programming').questions,...Object.values(fullExamPapers).flatMap(ps=>ps.flatMap(p=>p.questions))],results=[];
 for(const id of [...arrayContractIds,...examContractIds]){const q=bank.find(q=>q.id===id),r=run(id,referenceSource(q));results.push(r);assert.equal(r.status,'accepted',`${id}: ${JSON.stringify(r)}`);}
 const mutants=[
 ['P3-programming-6-42','int lastMax(const int a[],int n){int k=0;for(int i=1;i<n;i++)if(a[i]>a[k])k=i;return k;}'],
 ['P3-programming-6-61','void differences(const int a[],int n,long long b[]){for(int i=0;i+1<n;i++)b[i]=a[i+1]-a[i];}'],
 ['P3-programming-6-69','void bubblePass(int a[],int n){for(int k=0;k<n;k++)for(int i=1;i<n;i++)if(a[i]<a[i-1]){int t=a[i];a[i]=a[i-1];a[i-1]=t;}}'],
 ['P3-programming-6-70','int copyOdd(const int a[],int n,int b[]){int k=0;for(int i=0;i<n;i++)if(a[i]%2==1)b[k++]=a[i];return k;}'],
 ['FULL-programming-v1-30','int dayOfYear(int y,int m,int d){return 0;}'],
 ['FULL-programming-v1-32','int isPrime(int n){return 1;}'],
 ['FULL-structures-v1-31','int removeLast(Node *h,int x){if(!h)return 0;while(h->next){if(h->next->data==x){Node*p=h->next;h->next=p->next;free(p);return 1;}h=h->next;}return 0;}']
 ];
 for(const [id,source]of mutants){const r=run(id,source);results.push({...r,mutant:true});assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),`${id}: ${r.status}`);}
 const hashCode="int letter(char c){return(c>='a'&&c<='z')||(c>='A'&&c<='Z');} int countWords(const char s[]){int count=0;char prev='#';for(int i=0;s[i];i++){if(letter(s[i])&&!letter(prev))count++;prev=s[i];}return count;} /* _Pragma __asm #embed in a comment is harmless */";
 assert.equal(run('FULL-programming-v1-28',hashCode).status,'accepted');
 const linked=bank.find(q=>q.id==='FULL-structures-v1-31');
 assert.equal(run(linked.id,referenceSource(linked)+'/*'+'注'.repeat(7600)+'*/').status,'accepted');
 writeFileSync('../制作记录/判题运行环境/判题覆盖实测.json',JSON.stringify(results,null,2));
});
