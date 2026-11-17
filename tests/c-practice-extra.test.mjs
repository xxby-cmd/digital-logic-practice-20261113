import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {getPracticeCourse} from '../practice-library.js';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
import {extraCContractIds, extraCContract, extraCReferenceSources} from '../scripts/judge-c-practice-extra.mjs';
import {codingTaskGuides} from '../coding-task-guides.js';

const ids = ['6-02', 'P2-programming-6-11', 'P2-programming-6-14', 'P2-programming-6-15',
 ...[44, 45, 46, 47, 48, 50, 51, 52, 53, 54, 55, 60, 63, 65, 66, 71, 72, 74, 77, 78, 79].map(n => `P3-programming-6-${n}`)];
test('C练习补齐25题，每题具有独立分组期望和可编译参考源码', () => {
 assert.deepEqual([...extraCContractIds].sort(), [...ids].sort());
 const bank = getPracticeCourse('programming').questions;
 for (const id of ids) {
  assert.ok(bank.some(q => q.id === id && q.coding), id);
  assert.ok(extraCReferenceSources[id], id);
  const c = extraCContract(id);
  assert.ok(c.harness.includes('int main(void)'), id);
  assert.ok(c.groups.length >= 4, id);
  assert.deepEqual(c.expected, c.groups.flat(), id);
  assert.ok(c.groups.every(g => g.every(x => typeof x === 'string')), id);
  const stdout = c.groups.map(g => g.join(' ')).join('\n') + '\n';
  assert.equal(evaluateContract({status: 'ran', stdout}, c).status, 'accepted', id);
  assert.equal(evaluateContract({status: 'ran', stdout: stdout + '999\n'}, c).status, 'wrong_answer', id);
  assert.equal(evaluateContract({status: 'ran', stdout: 'wrong\n' + stdout.split('\n').slice(1).join('\n')}, c).status, 'wrong_answer', id);
 }
 assert.equal(extraCContract('not-a-question'), null);
});
test('缺少函数外壳的程序填空均提供一致的完整提交接口', () => {
 const functions = {'6-02': 'distinctFirst', 'P2-programming-6-11': 'mean',
  'P3-programming-6-44': 'eraseAt', 'P3-programming-6-45': 'insertAt',
  'P3-programming-6-46': 'compactNonzero', 'P3-programming-6-47': 'columnSums',
  'P3-programming-6-48': 'copyArray', 'P3-programming-6-50': 'adjacentDiff',
  'P3-programming-6-51': 'rowMaxima', 'P3-programming-6-52': 'digitCounts',
  'P3-programming-6-53': 'firstEqualPair', 'P3-programming-6-54': 'antiDiagonalSum',
  'P3-programming-6-55': 'minPositive'};
 for (const [id, fn] of Object.entries(functions)) {
  const g = codingTaskGuides[id];assert.ok(g, id);
  assert.ok(g.instruction.includes(fn), id);
  assert.ok(g.starter.includes(`${fn}(`), id);
  assert.ok(g.starter.includes('/* 空'), id);
  assert.ok(extraCContract(id).harness.includes(`${fn}(`), id);
 }
});
test('边界覆盖包含容量失败不变、宽整数、矩阵、平局和任意合法twoSum解', () => {
 assert.ok(extraCContract('6-02').harness.includes('distinctFirst(a,1000,b)'));
 assert.ok(extraCContract('P3-programming-6-63').harness.includes('n=0'));
 assert.ok(extraCContract('P3-programming-6-63').harness.includes('918273'));
 assert.ok(extraCContract('P3-programming-6-63').harness.includes(',0,-1,'));
 assert.ok(extraCContract('P3-programming-6-65').expected.includes('8589934588'));
 assert.ok(extraCContract('P3-programming-6-78').expected.includes('6442450941'));
 assert.ok(extraCContract('P3-programming-6-74').harness.includes('l!=r'));
 assert.ok(extraCContract('P3-programming-6-74').harness.includes('l==-17&&r==-29'));
 assert.ok(!extraCContract('P3-programming-6-74').harness.includes('l<r'));
 assert.ok(extraCContract('P2-programming-6-11').harness.includes('diff<=1e-8+1e-12*scale'));
});

const root = fileURLToPath(new URL('../', import.meta.url));
const evidence = fileURLToPath(new URL('../../制作记录/判题运行环境/', import.meta.url));
function run(id, source) {
 const c = extraCContract(id);
 const result = spawnSync(process.env.JUDGE_PYTHON, ['scripts/judge-worker.py'], {
  cwd: root, input: JSON.stringify({source, prelude: c.prelude || '', harness: c.harness, stdin: ''}),
  encoding: 'utf8', env: {...process.env, PYTHONIOENCODING: 'utf-8'}, timeout: 30000, windowsHide: true
 });
 assert.equal(result.error, undefined, `${id}: ${result.error}`);
 assert.equal(result.status, 0, `${id}: ${result.stderr}`);
 let raw;try {raw = JSON.parse(result.stdout);} catch {throw new Error(`${id}: ${result.stdout} ${result.stderr}`);}
 const evaluated = evaluateContract(raw, c);
 return {id, ...evaluated, ...(raw.status !== 'ran' ? {detail: raw.stderr || raw.message} : {})};
}
test('实际C17编译：25题参考代码、等价实现通过，典型错误被拒绝', {
 skip: process.env.JUDGE_RUNTIME !== '1', timeout: 600000
}, () => {
 assert.ok(process.env.JUDGE_PYTHON, '真实编译须提供JUDGE_PYTHON');
 const results = [];
 const record = (id, source, kind) => {const r = {...run(id, source), kind};results.push(r);return r;};
 try {
  for (const id of ids) {
   const r = record(id, extraCReferenceSources[id], 'reference');
   assert.equal(r.status, 'accepted', JSON.stringify(r));
  }
  const alternatives = [
   ['P3-programming-6-74', 'int twoSum(const int a[],int n,int target,int*l,int*r){for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if((long long)a[i]+a[j]==target){*l=j;*r=i;return 1;}return 0;}'],
   ['6-02', 'int distinctFirst(const int a[],int n,int b[]){int k=0;for(int i=0;i<n;i++){int found=0;for(int j=0;j<i;j++)if(a[j]==a[i]){found=1;break;}if(!found)b[k++]=a[i];}return k;}'],
   ['P2-programming-6-15', 'int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n){while(j<m&&b[j]<a[i])j++;if(j==m)break;if(a[i]==b[j])c[k++]=a[i];i++;}return k;}'],
   ['P2-programming-6-15', 'int intersection(const int a[],int n,const int b[],int m,int c[]){int i=n-1,j=m-1,k=0;while(i>=0&&j>=0){if(a[i]>b[j])i--;else if(a[i]<b[j])j--;else{c[k++]=a[i--];j--;}}return k;}']
  ];
  for (const [id, source] of alternatives) {
   const r = record(id, source, 'equivalent');assert.equal(r.status, 'accepted', JSON.stringify(r));
  }
  const wrong = [
   ['6-02', 'int distinctFirst(const int a[],int n,int b[]){int k=0;for(int i=0;i<n;i++)if(i==0||a[i]!=a[i-1])b[k++]=a[i];return k;}'],
   ['P2-programming-6-11', 'double mean(const int a[],int n){long long sum=0;for(int i=0;i<n;i++)sum+=a[i];return sum/n;}'],
   ['P3-programming-6-44', 'int eraseAt(int a[],int n,int k){for(int i=k;i+1<n;i++)a[i]=a[i+1];return n;}'],
   ['P3-programming-6-45', 'int insertAt(int a[],int n,int k,int x){for(int i=k;i<n;i++)a[i+1]=a[i];a[k]=x;return n+1;}'],
   ['P3-programming-6-63', 'int insert(int a[],int*n,int cap,int k,int x){if(k<0||k>*n||*n==cap){a[0]=0;return 0;}for(int i=*n;i>k;i--)a[i]=a[i-1];a[k]=x;(*n)++;return 1;}'],
   ['P3-programming-6-65', 'void rowSums(const int a[][4],int n,long long sums[]){for(int i=0;i<n;i++){int s=0;for(int j=0;j<4;j++)s+=a[i][j];sums[i]=s;}}'],
   ['P3-programming-6-66', 'int largestRow(const int a[][3],int n){int best=-1;long long max=0;for(int i=0;i<n;i++){long long s=0;for(int j=0;j<3;j++)s+=a[i][j];if(s>=max){max=s;best=i;}}return best;}'],
   ['P3-programming-6-71', 'void digitFreq(const int a[],int n,int freq[10]){for(int i=0;i<n;i++)freq[a[i]]++;}'],
   ['P3-programming-6-72', 'int mostFrequentDigit(const int a[],int n){int f[10]={0};for(int i=0;i<n;i++)f[a[i]]++;int b=0;for(int d=1;d<10;d++)if(f[d]>=f[b])b=d;return b;}'],
   ['P3-programming-6-74', 'int twoSum(const int a[],int n,int target,int*l,int*r){for(int i=0;i<n;i++)for(int j=i;j<n;j++)if((long long)a[i]+a[j]==target){*l=i;*r=j;return 1;}*l=0;*r=0;return 0;}'],
   ['P3-programming-6-77', 'void colMax(const int a[][3],int n,int out[3]){for(int j=0;j<3;j++){out[j]=0;for(int i=0;i<n;i++)if(a[i][j]>out[j])out[j]=a[i][j];}}'],
   ['P3-programming-6-78', 'void diagonalSums(const int a[3][3],long long *main,long long *anti){long long x=0,y=0;for(int i=0;i<3;i++){x+=a[i][i];if(i!=1)y+=a[i][2-i];}*main=x;*anti=y;}'],
   ['P3-programming-6-79', 'void rotate90(const int a[3][3],int b[3][3]){for(int i=0;i<3;i++)for(int j=0;j<3;j++)b[2-j][i]=a[i][j];}']
  ];
  for (const [id, source] of wrong) {
   const r = record(id, source, 'wrong');assert.ok(['wrong_answer', 'runtime_error', 'time_limit'].includes(r.status), JSON.stringify(r));
  }
 } finally {
  mkdirSync(evidence, {recursive: true});
  writeFileSync(`${evidence}C练习25题真实判题验证.json`, JSON.stringify({time: new Date().toISOString(),
   contractCount: ids.length, testGroups: ids.reduce((sum, id) => sum + extraCContract(id).groups.length, 0),
   limitations: ['测试验证功能结果；未据此证明渐近复杂度及禁止算法要求。'], results}, null, 2));
 }
});
