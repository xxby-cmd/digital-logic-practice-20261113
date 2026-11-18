// Server-only finite functional checks for the five existing original questions.
import {dsIntroTaskGuides} from '../ds-intro-task-guides.js';
const id = n => `P4-structures-1-D-${String(n).padStart(3,'0')}`;
const minInt = -2147483648, maxInt = 2147483647;
const lit = a => `{${a.length ? a.join(',') : '0'}}`;
const unique = a => [...new Set(a)];
const row = (body, expected) => ({body, expected: expected.map(String)});
const signatures = [
  'long long iterativeSum(int n)',
  'void minMax(const int a[],int n,int *minimum,int *maximum)',
  'void countParity(const int a[],int n,int *oddCount,int *evenCount)',
  'int validIndex(int n,int i)',
  'int floorLog2(unsigned long long n)'
];
const specs = new Map();

const sumInputs = unique([0,1,2,3,4,10,31,100,255,1024,10000,46340,46341,65534,65535,65536,65537,99999,100000,
  ...Array.from({length:12},(_,i)=>(i*7919+101)%100001)]);
specs.set(id(1), {helpers:'', rows:sumInputs.map(n => row(
  `printf("%lld\\n",iterativeSum(${n}));`,
  [BigInt(n)*(BigInt(n)+1n)/2n]
))});

let state=20261117;
const rand = n => {state=(Math.imul(state,1664525)+1013904223)>>>0;return state%n;};
const pool=[minInt,minInt+1,-999999,-7,-3,-1,0,1,2,3,9,999999,maxInt];
const base=[[],[-5],[0],[7],[minInt],[maxInt],[-10,-30,-20],[9,2,7,1],
  [minInt,0,maxInt],[maxInt,0,minInt],[-1,-3,-5,-7],[0,2,-4,minInt],
  [7,7,7,7],[maxInt,minInt,maxInt,minInt],[1,2,3,4,-100],[-2,-4,-6,-8,101],
  [7,-9,31,-100,maxInt,minInt,3],
  ...Array.from({length:15},()=>Array.from({length:2+rand(31)},()=>pool[rand(pool.length)])),
  Array.from({length:1024},(_,i)=>(i*101)%2001-1000),
  [...Array(1023).fill(-1),maxInt],
  [...Array(1023).fill(1),minInt]];
const cases = allowEmpty => base.flatMap(values => unique([0,1,Math.floor(values.length/2),values.length])
  .filter(n=>n<=values.length&&(allowEmpty||n>0)).map(n=>({values,n})))
  .concat([{values:[8,-4,7],n:3},{values:[8,-4,7,minInt,maxInt,0],n:3},
    {values:[8,-4,7,maxInt,minInt,-1,2],n:3}]);
const arrayHelpers = signatureCall => String.raw`
static void dsintro_array(const int *values,int physical,int n,int initial1,int initial2){
 int a[1027],first[3]={113,initial1,-227},second[3]={337,initial2,-449};
 a[0]=1267611;for(int i=0;i<physical;i++)a[i+1]=values[i];a[physical+1]=-1267613;
 ${signatureCall};
 int unchanged=1;for(int i=0;i<physical;i++)if(a[i+1]!=values[i])unchanged=0;
 int guards=a[0]==1267611&&a[physical+1]==-1267613&&first[0]==113&&first[2]==-227&&second[0]==337&&second[2]==-449;
 printf("%d %d %d %d\n",first[1],second[1],unchanged,guards);
}
`;
const minMaxRows = cases(false).map(({values,n},i) => {
  const prefix=values.slice(0,n);
  return row(`const int values[]=${lit(values)};dsintro_array(values,${values.length},${n},${101+i},${-211-i});`,
    [Math.min(...prefix),Math.max(...prefix),1,1]);
});
specs.set(id(2), {helpers:arrayHelpers('minMax(a+1,n,first+1,second+1)'),rows:minMaxRows});
const parityRows = cases(true).map(({values,n},i) => {
  // The oracle uses exact integer low bits, independently of the C remainder test.
  const odd=values.slice(0,n).filter(v=>(BigInt(v)&1n)!==0n).length;
  return row(`const int values[]=${lit(values)};dsintro_array(values,${values.length},${n},${-101-i},${211+i});`,
    [odd,n-odd,1,1]);
});
parityRows.push(row('int odd[3]={113,91,-227},even[3]={337,-82,-449};countParity(0,0,odd+1,even+1);printf("%d %d %d %d\\n",odd[1],even[1],1,odd[0]==113&&odd[2]==-227&&even[0]==337&&even[2]==-449);',[0,0,1,1]));
specs.set(id(3), {helpers:arrayHelpers('countParity(a+1,n,first+1,second+1)'),rows:parityRows});

const lengths=[minInt,minInt+1,-100,-2,-1,0,1,2,3,100,1024,maxInt-1,maxInt];
const indices=[minInt,minInt+1,-100,-2,-1,0,1,2,3,99,100,1023,1024,maxInt-1,maxInt];
const indexPairs=lengths.flatMap(n=>unique([...indices,n-1,n,n+1]).filter(i=>i>=minInt&&i<=maxInt).map(i=>[n,i]));
specs.set(id(4), {helpers:'',rows:indexPairs.map(([n,i])=>row(
  `printf("%d\\n",validIndex(${n},${i}));`,[Number(n>0&&i>=0&&i<=n-1)]
))});

const ullMax=(1n<<64n)-1n;
const logInputs=unique([1n,2n,3n,10n,ullMax-1n,ullMax,
  ...Array.from({length:64},(_,k)=>1n<<BigInt(k)).flatMap(p=>[p-1n,p,p+1n]).filter(v=>v>=1n&&v<=ullMax),
  ...Array.from({length:24},()=>((BigInt(rand(0x100000000))<<32n)|BigInt(rand(0x100000000)))||1n)]);
specs.set(id(5), {helpers:'',rows:logInputs.map(n=>row(
  `printf("%d\\n",floorLog2(${n}ULL));`,[n.toString(2).length-1]
))});

export const dsIntroContractIds=[...specs.keys()];
export function dsIntroContract(questionId){
  const spec=specs.get(questionId);if(!spec)return null;
  const number=Number(questionId.slice(-3)),groups=spec.rows.map(r=>r.expected.slice());
  return {
    prelude:'#include <limits.h>\n'+signatures[number-1]+';\n',
    harness:'\n#include <stdio.h>\n'+spec.helpers+'\n'+spec.rows.map((r,i)=>`static void dsintro_case_${i}(void){${r.body}}`).join('\n')+
      '\nint main(void){\n'+spec.rows.map((_,i)=>`dsintro_case_${i}();`).join('\n')+'\nreturn 0;}\n',
    groups,expected:groups.flat()
  };
}
export const dsIntroReferenceSources=Object.fromEntries(dsIntroContractIds.map(questionId=>[questionId,dsIntroTaskGuides[questionId].solution]));

// These maps are server/test data, never public problem payloads.
const samples = rows => Object.fromEntries(dsIntroContractIds.map(questionId=>[questionId,rows.filter(r=>id(r[0])===questionId).map(([,label,source])=>({label,source}))]));
const ref=n=>dsIntroReferenceSources[id(n)];
export const dsIntroEquivalentSources=samples([
  [1,'initialize-from-first-term','long long iterativeSum(int n){if(n==0)return 0;long long sum=1;for(int i=2;i<=n;i++)sum+=i;return sum;}'],
  [1,'reverse-iteration','long long iterativeSum(int n){long long sum=0;while(n>0){sum+=n;--n;}return sum;}'],
  [2,'reverse-data-initialization','void minMax(const int a[],int n,int *lo,int *hi){int x=a[n-1],y=x;for(int i=n-2;i>=0;i--){if(a[i]<x)x=a[i];if(a[i]>y)y=a[i];}*lo=x;*hi=y;}'],
  [2,'type-limit-initialization','#include <limits.h>\nvoid minMax(const int a[],int n,int *lo,int *hi){int x=INT_MAX,y=INT_MIN;for(int i=0;i<n;i++){if(a[i]<x)x=a[i];if(a[i]>y)y=a[i];}*lo=x;*hi=y;}'],
  [3,'reverse-and-nonzero-remainder','void countParity(const int a[],int n,int *o,int *e){int odd=0;for(int i=n;i>0;i--)odd+=a[i-1]%2!=0;*o=odd;*e=n-odd;}'],
  [4,'guarded-unsigned-range','int validIndex(int n,int i){return n>=0&&(unsigned int)i<(unsigned int)n;}'],
  [5,'unsigned-right-shift','int floorLog2(unsigned long long n){int count=-1;do{++count;n>>=1;}while(n);return count;}']
]);
export const dsIntroWrongSources=samples([
  [1,'omit-last-term',ref(1).replace('i<=n','i<n')],
  [1,'32-bit-unsigned-sum','long long iterativeSum(int n){unsigned int sum=0;for(int i=1;i<=n;i++)sum+=(unsigned int)i;return sum;}'],
  [1,'empty-case-one','long long iterativeSum(int n){long long sum=1;for(int i=2;i<=n;i++)sum+=i;return sum;}'],
  [1,'persistent-accumulator','long long iterativeSum(int n){static long long sum;for(int i=1;i<=n;i++)sum+=i;return sum;}'],
  [2,'fixed-zero-sentinels',ref(2).replace('int low=a[0],high=a[0]','int low=0,high=0')],
  [2,'omit-last-element',ref(2).replace('i<n','i<n-1')],
  [2,'reverse-output-meaning',ref(2).replace('*minimum=low;*maximum=high','*minimum=high;*maximum=low')],
  [2,'include-one-past-logical-end',ref(2).replace('i<n','i<=n')],
  [2,'modify-input',ref(2).replace('*minimum=low;','((int*)a)[0]=0;*minimum=low;')],
  [3,'positive-odd-remainder-only','void countParity(const int a[],int n,int *o,int *e){int x=0,y=0;for(int i=0;i<n;i++){if(a[i]%2==1)x++;else y++;}*o=x;*e=y;}'],
  [3,'does-not-reset-outputs','void countParity(const int a[],int n,int *o,int *e){for(int i=0;i<n;i++){if(a[i]%2)(*o)++;else (*e)++;}}'],
  [3,'empty-leaves-outputs',ref(3).replace('{int odd=','{if(n==0)return;int odd=')],
  [3,'omit-last-element',ref(3).replace('i<n','i<n-1')],
  [3,'include-one-past-logical-end',ref(3).replace('i<n','i<=n')],
  [4,'unsigned-without-negative-length-check','int validIndex(int n,int i){return (unsigned int)i<(unsigned int)n;}'],
  [4,'inclusive-upper-end','int validIndex(int n,int i){return n>=0&&i>=0&&i<=n;}'],
  [4,'negative-index-unchecked','int validIndex(int n,int i){return n>=0&&i<n;}'],
  [4,'requires-positive-index','int validIndex(int n,int i){return n>=0&&i>0&&i<n;}'],
  [5,'ceil-log2','int floorLog2(unsigned long long n){int count=0;while(n>1){n=n/2+n%2;count++;}return count;}'],
  [5,'floating-log2-rounding','#include <math.h>\nint floorLog2(unsigned long long n){return (int)log2((double)n);}'],
  [5,'narrow-to-32-bits','int floorLog2(unsigned long long n){unsigned int x=(unsigned int)n;int k=0;while(x>=2){x/=2;k++;}return k;}'],
  [5,'bit-length-not-floorlog',ref(5).replace('int count=0','int count=1')],
  [5,'divide-by-four',ref(5).replace('n/=2','n/=4')]
]);
