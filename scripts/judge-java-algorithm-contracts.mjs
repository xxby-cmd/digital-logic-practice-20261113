// Private Java drivers/oracles. The public module never imports this file.
import {javaAlgorithmTaskGuides,javaAlgorithmTypes} from '../java-algorithm-task-guides.js';
const intro=n=>`P4-structures-1-D-${String(n).padStart(3,'0')}`;
const sort=n=>`P4-structures-10-D-${String(n).padStart(3,'0')}`;
const min=-2147483648,max=2147483647;
const ints=a=>'new int[]{'+a.join(',')+'}';
const ids=[max,-73,min,5,5,-2,19,8,3];
const records=(keys,salt=0)=>keys.map((key,i)=>({key,identity:ids[(i+salt)%ids.length]}));
const recs=a=>`records(${ints(a.map(x=>x.key))},${ints(a.map(x=>x.identity))})`;
const stable=a=>a.map((x,i)=>({...x,position:i})).sort((x,y)=>x.key-y.key||x.position-y.position).map(({key,identity})=>({key,identity}));
const sorted=a=>a.slice().sort((x,y)=>x-y);
const isHeap=a=>a.every((x,i)=>i===0||a[Math.floor((i-1)/2)]>=x);
const unique=a=>[...new Set(a)];
const row=(label,body,want=[1,1,1],meta={})=>({label,body,want:want.map(String),meta});
const specs=new Map();
const method=(name,returnType,parameterTypes)=>({name,returnType,parameterTypes});
export const javaAlgorithmInterfaceSpecs={
  [intro(1)]:method('iterativeSum','long',['int']),
  [intro(2)]:method('minMax','int[]',['int[]','int']),
  [intro(3)]:method('countParity','int[]',['int[]','int']),
  [intro(4)]:method('validIndex','int',['int','int']),
  [sort(1)]:method('stableInsertion','void',['SortRecord[]','int']),
  [sort(2)]:method('binaryInsertion','void',['SortRecord[]','int']),
  [sort(3)]:method('mergeStable','void',['SortRecord[]','int','SortRecord[]','int','SortRecord[]']),
  [sort(4)]:method('mergeSortBottomUp','void',['SortRecord[]','int','SortRecord[]']),
  [sort(5)]:method('isMaxHeap','int',['int[]','int']),
  [sort(6)]:method('heapInsert','int',['int[]','int','int']),
  [sort(7)]:method('countingSortStable','void',['SortRecord[]','int','int','int','SortRecord[]']),
  [sort(8)]:method('quickSelect','int',['int[]','int','int']),
  [sort(9)]:method('countInversions','long',['int[]','int','int[]'])
};
const copyInterface=s=>({name:s.name,returnType:s.returnType,parameterTypes:s.parameterTypes.slice()});
const common=String.raw`
  private static int bit(boolean value){return value?1:0;}
  private static void emit(int... values){StringBuilder s=new StringBuilder();for(int i=0;i<values.length;i++){if(i>0)s.append(' ');s.append(values[i]);}System.out.println(s);}
  private static boolean sameTail(int[] a,int[] before,int n){for(int i=n;i<a.length;i++)if(a[i]!=before[i])return false;return true;}
  private static boolean sameMultiset(int[] a,int n,int[] expected){int[] copy=java.util.Arrays.copyOf(a,n);java.util.Arrays.sort(copy);return java.util.Arrays.equals(copy,expected);}
  private static boolean heap(int[] a,int n){for(int i=1;i<n;i++)if(a[(i-1)/2]<a[i])return false;return true;}
`;
const recordHelpers=String.raw`
  private static SortRecord[] records(int[] keys,int[] identities){SortRecord[] a=new SortRecord[keys.length];for(int i=0;i<a.length;i++)a[i]=new SortRecord(keys[i],identities[i]);return a;}
  private static boolean equalRecord(SortRecord a,SortRecord b){return a==null?b==null:b!=null&&a.key==b.key&&a.identity==b.identity;}
  private static boolean sameRecords(SortRecord[] a,SortRecord[] b,int from,int to){for(int i=from;i<to;i++)if(!equalRecord(a[i],b[i]))return false;return true;}
  private static boolean resultRecords(SortRecord[] a,int n,SortRecord[] expected){return expected.length==n&&sameRecords(a,expected,0,n);}
`;

const sumInputs=unique([0,1,2,3,10,31,100,255,1024,10000,46340,46341,65535,65536,65537,99999,100000,...Array.from({length:12},(_,i)=>(7919*i+101)%100001)]);
specs.set(intro(1),{helpers:'',rows:sumInputs.map(n=>row('sum-'+n,`System.out.println(Solution.iterativeSum(${n}));`,[BigInt(n)*(BigInt(n)+1n)/2n],{n}))});

let seed=20261118;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const pool=[min,min+1,-999,-7,-3,-1,0,1,2,3,17,max];
const arrayBase=[[],[-5],[0],[7],[min],[max],[-10,-30,-20],[9,2,7,1],[min,0,max],[max,0,min],[-1,-3,-5,-7],[0,2,-4,min],
  [7,7,7,7],[max,min,max,min],[1,2,3,4,-100],[-2,-4,-6,-8,101],[8,-4,7],
  ...Array.from({length:16},()=>Array.from({length:2+rand(25)},()=>pool[rand(pool.length)])),
  Array.from({length:1024},(_,i)=>(i*101)%2001-1000),[...Array(1023).fill(-1),max],[...Array(1023).fill(1),min]];
const arrayCases=empty=>arrayBase.flatMap(a=>unique([0,1,Math.floor(a.length/2),a.length]).filter(n=>n<=a.length&&(empty||n>0)).map(n=>({a,n})))
  .concat([{a:[8,-4,7,min,max,0],n:3},{a:[8,-4,7,max,min,-1,2],n:3}]);
const introArrayHelpers=method=>String.raw`
  private static void arrayCase(int[] values,int n){
    int[] a=values==null?null:values.clone(),before=a==null?null:a.clone();
    int[] answer=Solution.${method}(a,n);boolean shape=answer!=null&&answer.length==2;
    emit(shape?answer[0]:0,shape?answer[1]:0,bit(shape),bit(java.util.Arrays.equals(a,before)));
  }
`;
specs.set(intro(2),{helpers:introArrayHelpers('minMax'),rows:arrayCases(false).map(({a,n},i)=>row('minmax-'+i,`arrayCase(${ints(a)},${n});`,[Math.min(...a.slice(0,n)),Math.max(...a.slice(0,n)),1,1],{n,physical:a.length}))});
const parityRows=arrayCases(true).map(({a,n},i)=>{const odd=a.slice(0,n).filter(x=>(BigInt(x)&1n)!==0n).length;return row('parity-'+i,`arrayCase(${ints(a)},${n});`,[odd,n-odd,1,1],{n,physical:a.length});});
parityRows.push(row('null-empty','arrayCase(null,0);',[0,0,1,1],{n:0,nullInput:true}));
specs.set(intro(3),{helpers:introArrayHelpers('countParity'),rows:parityRows});
const lengths=[min,min+1,-100,-2,-1,0,1,2,3,100,1024,max-1,max],positions=[min,min+1,-100,-2,-1,0,1,2,3,99,100,1023,1024,max-1,max];
specs.set(intro(4),{helpers:'',rows:lengths.flatMap(n=>unique([...positions,n-1,n,n+1]).filter(i=>i>=min&&i<=max).map(i=>row('index-'+n+'-'+i,`System.out.println(Solution.validIndex(${n},${i}));`,[Number(n>0&&i>=0&&i<=n-1)],{n,i})))});

const exhaustive=[];
for(let n=0;n<=4;n++)for(let code=0;code<3**n;code++){let x=code,a=[];for(let i=0;i<n;i++){a.push(x%3-1);x=Math.floor(x/3);}exhaustive.push(a);}
const base=[...exhaustive,[min,max,0,min,max],[-7,-7,-7,-7],[4,1,4,1,4,1,4],
  ...Array.from({length:18},()=>Array.from({length:5+rand(20)},()=>pool[rand(pool.length)]))];
const recSortHelpers=method=>recordHelpers+String.raw`
  private static void sortCase(SortRecord[] values,int n,SortRecord[] expected,boolean nullTail){
    SortRecord[] a=values.clone();if(nullTail&&a.length>n)a[a.length-1]=null;
    SortRecord[] before=a.clone(),work=new SortRecord[a.length];
    for(int i=0;i<work.length;i++)work[i]=i<n&&i%2==0?null:new SortRecord(-9171-i,9181+i);
    SortRecord[] oldWork=work.clone();
    Solution.${method}(a,n${method==='mergeSortBottomUp'?',work':''});
    emit(bit(resultRecords(a,n,expected)),bit(sameRecords(a,before,n,a.length)),bit(sameRecords(work,oldWork,n,work.length)));
  }
`;
const sortingRows=arrays=>arrays.map((a,i)=>{const all=records([...a,max,min],i);return row('record-sort-'+i,`sortCase(${recs(all)},${a.length},${recs(stable(all.slice(0,a.length)))},${i%2===0});`,undefined,{n:a.length,physical:all.length,nullTail:i%2===0});});
const insertion=[...base,Array.from({length:256},(_,i)=>256-i),Array(256).fill(7)];
for(const n of [1,2])specs.set(sort(n),{record:true,helpers:recSortHelpers(n===1?'stableInsertion':'binaryInsertion'),rows:sortingRows(insertion)});

const mergeHelpers=recordHelpers+String.raw`
  private static void mergeCase(SortRecord[] left,SortRecord[] right,int n,int m,boolean shared,SortRecord[] expected){
    SortRecord[] a=left.clone(),b=shared?a:right.clone(),oldA=a.clone(),oldB=b.clone(),out=new SortRecord[n+m+2];
    for(int i=0;i<out.length;i++)out[i]=new SortRecord(-8171-i,8181+i);
    SortRecord[] oldOut=out.clone();Solution.mergeStable(a,n,b,m,out);
    emit(bit(resultRecords(out,n+m,expected)),bit(sameRecords(a,oldA,0,a.length)&&sameRecords(b,oldB,0,b.length)),bit(sameRecords(out,oldOut,n+m,out.length)));
  }
`;
const mergeInputs=[...new Map(exhaustive.filter(a=>a.length<=3).map(a=>{const s=sorted(a);return [s.join(','),s];})).values()];
const mergeRows=[];
for(const a of mergeInputs)for(const b of mergeInputs){const left=records([...a,max,min],1),right=records([...b,min,max],3),expected=stable([...left.slice(0,a.length),...right.slice(0,b.length)]);
  mergeRows.push(row('merge-'+mergeRows.length,`mergeCase(${recs(left)},${recs(right)},${a.length},${b.length},false,${recs(expected)});`,undefined,{n:a.length,m:b.length,shared:false}));}
for(const [n,m]of [[0,0],[4,4],[3,4],[4,2],[0,4],[4,0]]){const a=records([-3,-3,0,2,7,max],2),expected=stable([...a.slice(0,n),...a.slice(0,m)]);
  mergeRows.push(row('shared-'+n+'-'+m,`mergeCase(${recs(a)},${recs([])},${n},${m},true,${recs(expected)});`,undefined,{n,m,shared:true}));}
{const a=records(Array.from({length:256},(_,i)=>Math.floor(i/3)-43),1),b=records(Array.from({length:256},(_,i)=>Math.floor(i/4)-30),3);mergeRows.push(row('merge-maximum',`mergeCase(${recs([...a,...records([min,max])])},${recs([...b,...records([max,min])])},256,256,false,${recs(stable([...a,...b]))});`,undefined,{n:256,m:256}));}
specs.set(sort(3),{record:true,helpers:mergeHelpers,rows:mergeRows});
specs.set(sort(4),{record:true,helpers:recSortHelpers('mergeSortBottomUp'),rows:sortingRows([...base,...[31,32,33,63,65,127,129].map(n=>Array.from({length:n},(_,i)=>(i*19)%31-15)),Array.from({length:1024},(_,i)=>1024-i),Array.from({length:1023},(_,i)=>i%7)])});

const heapHelpers=String.raw`
  private static void heapCase(int[] values,int n){int[] a=values.clone(),old=a.clone();int answer=Solution.isMaxHeap(a,n);emit(answer,bit(java.util.Arrays.equals(a,old)),bit(sameTail(a,old,n)));}
`;
const heaps=[...base,[10,4,8,3,2,7,6],[10,4,8,3,2,7,9],Array.from({length:1024},(_,i)=>1024-i),Array(1024).fill(min),[max,min,max,min,min,max]];
specs.set(sort(5),{helpers:heapHelpers,rows:heaps.map((a,i)=>row('heap-'+i,`heapCase(${ints([...a,max,min])},${a.length});`,[Number(isHeap(a)),1,1],{n:a.length}))});
const insertCases=[];
for(const a of exhaustive.filter(isHeap))for(const value of [min,-2,0,2,max])insertCases.push({a,value});
for(const a of [[10,4,8,3,2,7,6],Array.from({length:1023},(_,i)=>1023-i),Array(1023).fill(-7)])for(const value of [min,0,max])insertCases.push({a,value});
insertCases.push({a:[100,50,90,0],value:80});
specs.set(sort(6),{helpers:String.raw`
  private static void insertCase(int[] values,int n,int value,int[] expected){int[] a=java.util.Arrays.copyOf(values,n+3);for(int i=n;i<a.length;i++)a[i]=8181+i;int[] old=a.clone();int length=Solution.heapInsert(a,n,value);emit(bit(length==n+1&&sameMultiset(a,n+1,expected)),bit(heap(a,n+1)),bit(sameTail(a,old,n+1)));}
`,rows:insertCases.map(({a,value},i)=>row('insert-'+i,`insertCase(${ints(a)},${a.length},${value},${ints(sorted([...a,value]))});`,undefined,{n:a.length,value}))});

const counting=[];
for(const a of base.filter(a=>a.every(x=>x>=-3&&x<=2)))counting.push({a,v:-3,w:2});
for(const v of [min,-999,0,max-511])for(const range of [1,2,17,512]){const w=v+range-1;counting.push({a:[],v,w},{a:[v,w,v,w,v],v,w});if(range===1||range===512)counting.push({a:Array.from({length:1024},(_,i)=>v+(i*13)%range),v,w});}
counting.push({a:[max,max,max],v:max,w:max});
specs.set(sort(7),{record:true,helpers:recordHelpers+String.raw`
  private static void countCase(SortRecord[] values,int n,int low,int high,SortRecord[] expected){SortRecord[] a=values.clone(),old=a.clone(),out=new SortRecord[n+2];for(int i=0;i<out.length;i++)out[i]=new SortRecord(-8171-i,8181+i);SortRecord[] oldOut=out.clone();Solution.countingSortStable(a,n,low,high,out);emit(bit(resultRecords(out,n,expected)),bit(sameRecords(a,old,0,a.length)),bit(sameRecords(out,oldOut,n,out.length)));}
`,rows:counting.map(({a,v,w},i)=>{const all=records([...a,v,w],i);return row('counting-'+i,`countCase(${recs(all)},${a.length},${v},${w},${recs(stable(all.slice(0,a.length)))});`,undefined,{n:a.length,v,w,range:w-v+1});})});

const select=[];
for(const a of base.filter(a=>a.length))for(const k of unique([1,Math.ceil(a.length/2),a.length]))select.push({a,k});
for(const a of [Array(1024).fill(-7),Array.from({length:1024},(_,i)=>1024-i),Array.from({length:1024},(_,i)=>i%7)])for(const k of [1,512,1024])select.push({a,k});
specs.set(sort(8),{helpers:String.raw`
  private static void selectCase(int[] values,int n,int k,int answer,int[] expected){int[] a=values.clone(),old=a.clone();int actual=Solution.quickSelect(a,n,k);emit(bit(actual==answer),bit(sameMultiset(a,n,expected)),bit(sameTail(a,old,n)));}
`,rows:select.map(({a,k},i)=>row('select-'+i,`selectCase(${ints([...a,max,min])},${a.length},${k},${sorted(a)[k-1]},${ints(sorted(a))});`,undefined,{n:a.length,k}))});

// Independent rank/Fenwick oracle, not the student's merge recurrence.
function inversions(a){const keys=unique(a).sort((x,y)=>x-y),rank=new Map(keys.map((x,i)=>[x,i+1])),tree=Array(keys.length+1).fill(0);let answer=0n;for(let i=0;i<a.length;i++){const r=rank.get(a[i]);let notGreater=0;for(let p=r;p>0;p-=p&-p)notGreater+=tree[p];answer+=BigInt(i-notGreater);for(let p=r;p<tree.length;p+=p&-p)tree[p]++;}return answer;}
const inverseHelpers=String.raw`
  private static void inverseCase(int[] values,int n,int[] expected,long expectedCount){int[] a=values.clone(),old=a.clone(),work=new int[a.length];for(int i=0;i<work.length;i++)work[i]=-8171-i;int[] oldWork=work.clone();long actual=Solution.countInversions(a,n,work);emit(bit(actual==expectedCount&&sameMultiset(a,n,expected)),bit(sameTail(a,old,n)),bit(sameTail(work,oldWork,n)));}
`;
const inverseRows=[...base,...[255,256,257].map(n=>Array.from({length:n},(_,i)=>(i*19)%47-23))].map((a,i)=>row('inverse-'+i,`inverseCase(${ints([...a,max,min])},${a.length},${ints(sorted(a))},${inversions(a)}L);`,undefined,{n:a.length,inversions:inversions(a).toString()}));
for(const mode of ['descending','repeating','ascending']){const a=Array.from({length:4096},(_,i)=>mode==='descending'?4096-i:mode==='repeating'?(i*19)%47-23:i),expr=mode==='descending'?'4096-i':mode==='repeating'?'(i*19)%47-23':'i';
  inverseRows.push(row('inverse-4096-'+mode,`int[] values=new int[4098];for(int i=0;i<4096;i++)values[i]=${expr};values[4096]=${max};values[4097]=${min};inverseCase(values,4096,${ints(sorted(a))},${inversions(a)}L);`,undefined,{n:4096,mode,inversions:inversions(a).toString()}));}
specs.set(sort(9),{helpers:inverseHelpers,rows:inverseRows});

export const javaAlgorithmContractIds=[...specs.keys()];
export const javaAlgorithmCaseMetadata=Object.fromEntries([...specs].map(([id,s])=>[id,s.rows.map(({label,meta,want})=>({label,...meta,expected:want.slice()}))]));
function config(id,spec,rows){const groups=rows.map(r=>r.want.slice());return {
  interfaceSpec:copyInterface(javaAlgorithmInterfaceSpecs[id]),
  prelude:spec.record?javaAlgorithmTypes.sortRecord:'',
  harness:'public class JudgeMain {\n'+common+spec.helpers+'\n'+rows.map((r,i)=>`  private static void case${i}(){${r.body}}`).join('\n')+'\n  public static void main(String[] args){\n'+rows.map((_,i)=>`    case${i}();`).join('\n')+'\n  }\n}\n',
  groups,expected:groups.flat()
};}
export function javaAlgorithmContract(id){const spec=specs.get(id);if(!spec)return null;const parts=[];let rows=[],bytes=0;
  for(const r of spec.rows){if(bytes+Buffer.byteLength(r.body)>145000&&rows.length){parts.push(config(id,spec,rows));rows=[];bytes=0;}rows.push(r);bytes+=Buffer.byteLength(r.body);}
  parts.push(config(id,spec,rows));if(parts.length>4)throw new Error('Java驱动配置超过4个：'+id);
  return parts.length===1?parts[0]:{...parts[0],variants:parts};
}
export function javaAlgorithmExecutionConfig(config){
  if(!config?.interfaceSpec)throw new Error('缺少可信Java接口配置。');
  return {prelude:config.prelude||'',harness:config.harness||'',stdin:config.stdin||'',interfaceSpec:copyInterface(config.interfaceSpec)};
}
export const javaAlgorithmReferenceSources=Object.fromEntries(javaAlgorithmContractIds.map(id=>[id,javaAlgorithmTaskGuides[id].solution]));
const wrap=methods=>'public class Solution {\n'+methods+'\n}';
const change=(id,before,after)=>{const source=javaAlgorithmReferenceSources[id];if(!source.includes(before))throw new Error('Missing Java mutation '+id+': '+before);return source.replace(before,after);};
const sample=(id,label,source)=>({id,label,source});
export const javaAlgorithmEquivalentSources=[
  sample(intro(1),'first-term-initialization',wrap('public static long iterativeSum(int n){if(n==0)return 0;long sum=1;for(int i=2;i<=n;i++)sum+=i;return sum;}')),
  sample(intro(2),'reverse-scan',wrap('public static int[] minMax(int[] a,int n){int lo=a[n-1],hi=lo;for(int i=n-2;i>=0;i--){lo=Math.min(lo,a[i]);hi=Math.max(hi,a[i]);}return new int[]{lo,hi};}')),
  sample(intro(3),'reverse-count-even',wrap('public static int[] countParity(int[] a,int n){int even=0;for(int i=n;i>0;i--)if(a[i-1]%2==0)even++;return new int[]{n-even,even};}')),
  sample(intro(4),'guarded-unsigned-comparison',wrap('public static int validIndex(int n,int i){return n>=0&&Integer.compareUnsigned(i,n)<0?1:0;}')),
  sample(sort(1),'copy-equal-valued-records',wrap('public static void stableInsertion(SortRecord[] a,int n){for(int i=1;i<n;i++){SortRecord x=new SortRecord(a[i].key,a[i].identity);int j=i-1;while(j>=0&&a[j].key>x.key){a[j+1]=new SortRecord(a[j].key,a[j].identity);j--;}a[j+1]=x;}}')),
  sample(sort(2),'inclusive-upper-bound',wrap('public static void binaryInsertion(SortRecord[] a,int n){for(int i=1;i<n;i++){SortRecord x=a[i];int lo=0,hi=i-1;while(lo<=hi){int mid=lo+(hi-lo)/2;if(a[mid].key>x.key)hi=mid-1;else lo=mid+1;}for(int j=i-1;j>=lo;j--)a[j+1]=a[j];a[lo]=x;}}')),
  sample(sort(3),'copy-records-in-single-loop',wrap('public static void mergeStable(SortRecord[] a,int n,SortRecord[] b,int m,SortRecord[] out){int i=0,j=0;for(int k=0;k<n+m;k++){SortRecord x=j==m||(i<n&&a[i].key<=b[j].key)?a[i++]:b[j++];out[k]=new SortRecord(x.key,x.identity);}}')),
  sample(sort(4),'alternate-buffers',wrap('public static void mergeSortBottomUp(SortRecord[] a,int n,SortRecord[] work){SortRecord[] src=a,dst=work;for(int width=1;width<n;width*=2){for(int l=0;l<n;l+=2*width){int mid=Math.min(l+width,n),r=Math.min(l+2*width,n),i=l,j=mid;for(int k=l;k<r;k++)dst[k]=j==r||(i<mid&&src[i].key<=src[j].key)?src[i++]:src[j++];}SortRecord[] t=src;src=dst;dst=t;}if(src!=a)System.arraycopy(src,0,a,0,n);}')),
  sample(sort(5),'child-to-parent-scan',wrap('public static int isMaxHeap(int[] a,int n){for(int i=n-1;i>0;i--)if(a[(i-1)/2]<a[i])return 0;return 1;}')),
  sample(sort(6),'swap-sift-up',wrap('public static int heapInsert(int[] a,int n,int value){a[n]=value;for(int i=n;i>0;){int p=(i-1)/2;if(a[p]>=a[i])break;int x=a[p];a[p]=a[i];a[i]=x;i=p;}return n+1;}')),
  sample(sort(7),'forward-start-offsets',wrap('public static void countingSortStable(SortRecord[] a,int n,int v,int w,SortRecord[] out){int[] count=new int[w-v+1],next=new int[count.length];for(int i=0;i<n;i++)count[a[i].key-v]++;int start=0;for(int k=0;k<count.length;k++){next[k]=start;start+=count[k];}for(int i=0;i<n;i++)out[next[a[i].key-v]++]=a[i];}')),
  sample(sort(8),'median-pivot-three-way',wrap('private static int median(int x,int y,int z){if(x>y){int t=x;x=y;y=t;}if(y>z){y=z;if(x>y)y=x;}return y;}\npublic static int quickSelect(int[] a,int n,int k){int lo=0,hi=n,rank=k-1;while(lo<hi){int pivot=median(a[lo],a[lo+(hi-lo)/2],a[hi-1]),low=lo,i=lo,high=hi;while(i<high){if(a[i]>pivot){int x=a[--high];a[high]=a[i];a[i]=x;}else if(a[i]<pivot){int x=a[low];a[low++]=a[i];a[i++]=x;}else i++;}if(rank<low)hi=low;else if(rank>=high)lo=high;else return pivot;}return a[rank];}')),
  sample(sort(9),'bottom-up-merge-count',wrap('public static long countInversions(int[] a,int n,int[] work){long answer=0;for(int width=1;width<n;width*=2){for(int l=0;l<n;l+=2*width){int mid=Math.min(l+width,n),r=Math.min(l+2*width,n),i=l,j=mid,k=l;while(i<mid&&j<r){if(a[i]<=a[j])work[k++]=a[i++];else{work[k++]=a[j++];answer+=mid-i;}}while(i<mid)work[k++]=a[i++];while(j<r)work[k++]=a[j++];}System.arraycopy(work,0,a,0,n);}return answer;}')),
  sample(sort(9),'preserve-input-prefix',javaAlgorithmReferenceSources[sort(9)].replace('return countPart(a,work,0,n);','int[] copy=java.util.Arrays.copyOf(a,n);return countPart(copy,work,0,n);')),
  sample(sort(9),'domain-safe-int-accumulator',javaAlgorithmReferenceSources[sort(9)].replace('private static long countPart','private static int countPart').replace('long count=countPart','int count=countPart'))
];
export const javaAlgorithmWrongSources=[
  sample(intro(1),'omit-final-term',change(intro(1),'i<=n','i<n')),
  sample(intro(1),'int-sum-wraps',change(intro(1),'long sum=0','int sum=0')),
  sample(intro(1),'persistent-sum',wrap('private static long sum;public static long iterativeSum(int n){for(int i=1;i<=n;i++)sum+=i;return sum;}')),
  sample(intro(2),'fixed-zero-sentinels',change(intro(2),'int lo=a[0],hi=a[0]','int lo=0,hi=0')),
  sample(intro(2),'omit-last-element',change(intro(2),'i<n','i<n-1')),
  sample(intro(2),'reversed-result-order',change(intro(2),'new int[]{lo,hi}','new int[]{hi,lo}')),
  sample(intro(2),'uses-array-length',change(intro(2),'i<n','i<a.length')),
  sample(intro(3),'positive-odd-only',change(intro(3),'a[i]%2!=0','a[i]%2==1')),
  sample(intro(3),'null-result-for-empty',change(intro(3),'int odd=0;','if(n==0)return null;int odd=0;')),
  sample(intro(3),'uses-array-length',change(intro(3),'i<n','i<a.length')),
  sample(intro(3),'reversed-result-order',change(intro(3),'new int[]{odd,n-odd}','new int[]{n-odd,odd}')),
  sample(intro(4),'inclusive-upper-bound',change(intro(4),'i<n ?','i<=n ?')),
  sample(intro(4),'negative-index-unchecked',wrap('public static int validIndex(int n,int i){return n>=0&&i<n?1:0;}')),
  sample(intro(4),'unsigned-without-negative-n-check',wrap('public static int validIndex(int n,int i){return Integer.compareUnsigned(i,n)<0?1:0;}')),
  sample(sort(1),'equal-keys-reversed',change(sort(1),'a[j-1].key>x.key','a[j-1].key>=x.key')),
  sample(sort(1),'detaches-key-from-record',change(sort(1),'a[j]=a[j-1];','a[j]=new SortRecord(a[j-1].key,a[j].identity);')),
  sample(sort(1),'omit-last-record',change(sort(1),'i<n;i++','i<n-1;i++')),
  sample(sort(2),'lower-bound-reverses-ties',change(sort(2),'a[mid].key<=x.key','a[mid].key<x.key')),
  sample(sort(2),'forward-right-shift',change(sort(2),'for(int j=i;j>lo;j--)a[j]=a[j-1];','for(int j=lo;j<i;j++)a[j+1]=a[j];')),
  sample(sort(2),'drops-identity',change(sort(2),'a[lo]=x;','a[lo]=new SortRecord(x.key,0);')),
  sample(sort(3),'right-input-wins-ties',change(sort(3),'a[i].key<=b[j].key','a[i].key<b[j].key')),
  sample(sort(3),'drops-right-remainder',change(sort(3),'while(j<m)out[k++]=b[j++];','')),
  sample(sort(3),'concatenates-without-merging',wrap('public static void mergeStable(SortRecord[] a,int n,SortRecord[] b,int m,SortRecord[] out){for(int i=0;i<n;i++)out[i]=a[i];for(int j=0;j<m;j++)out[n+j]=b[j];}')),
  sample(sort(4),'unstable-equal-merge',change(sort(4),'a[i].key<=a[j].key','a[i].key<a[j].key')),
  sample(sort(4),'drops-unpaired-last-run',change(sort(4),'while(i<mid)work[k++]=a[i++];','if(mid<r)while(i<mid)work[k++]=a[i++];')),
  sample(sort(4),'omits-copy-back',change(sort(4),'for(int i=0;i<n;i++)a[i]=work[i];','')),
  sample(sort(5),'requires-total-descending-order',wrap('public static int isMaxHeap(int[] a,int n){for(int i=1;i<n;i++)if(a[i]>a[i-1])return 0;return 1;}')),
  sample(sort(5),'left-child-only',change(sort(5),' || (r<n && a[i]<a[r])','')),
  sample(sort(5),'root-only',change(sort(5),'i<n/2','i<(n>1?1:0)')),
  sample(sort(6),'wrong-zero-based-parent',change(sort(6),'int p=(i-1)/2;','int p=i/2;')),
  sample(sort(6),'returns-old-length',change(sort(6),'return n+1;','return n;')),
  sample(sort(6),'loses-inserted-value',change(sort(6),'a[i]=value;','a[i]=0;')),
  sample(sort(7),'forward-with-end-offsets',change(sort(7),'for(int i=n-1;i>=0;i--)','for(int i=0;i<n;i++)')),
  sample(sort(7),'drops-last-record',change(sort(7),'for(int i=n-1;i>=0;i--)','for(int i=n-2;i>=0;i--)')),
  sample(sort(7),'drops-record-identity',change(sort(7),'out[--count[a[i].key-v]]=a[i];','out[--count[a[i].key-v]]=new SortRecord(a[i].key,0);')),
  sample(sort(8),'one-based-rank-as-index',change(sort(8),'target=k-1','target=k%n')),
  sample(sort(8),'returns-pivot-for-left-rank',change(sort(8),'if(target<low)right=low;','if(target<low)return pivot;')),
  sample(sort(8),'loses-swapped-value',change(sort(8),'a[i]=x; } else i++;','a[i]=pivot; } else i++;')),
  sample(sort(9),'equal-values-counted',change(sort(9),'if(a[i]<=a[j])','if(a[i]<a[j])')),
  sample(sort(9),'omits-subproblem-counts',change(sort(9),'long count=countPart(a,work,l,mid)+countPart(a,work,mid,r);','countPart(a,work,l,mid);countPart(a,work,mid,r);long count=0;')),
  sample(sort(9),'cross-count-off-by-one',change(sort(9),'count+=mid-i;','count+=mid-i-1;'))
];
export const javaAlgorithmValidationSamples=[
  ...javaAlgorithmContractIds.map(id=>({id,kind:'reference',label:'reference',source:javaAlgorithmReferenceSources[id]})),
  ...javaAlgorithmEquivalentSources.map(s=>({...s,kind:'equivalent'})),
  ...javaAlgorithmWrongSources.map(s=>({...s,kind:'wrong'}))
];
export const javaAlgorithmOracles={stableRecords:stable,isMaxHeap:isHeap,inversions,sortedInts:sorted};
