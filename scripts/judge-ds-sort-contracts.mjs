// Server-only finite checks and independent oracles. Never enter the public page.
import {dsSortTaskGuides,dsSortTypes} from '../ds-sort-task-guides.js';
const id=n=>`P4-structures-10-D-${String(n).padStart(3,'0')}`;
const imin=-2147483648,imax=2147483647;
const ints=a=>'{'+(a.length?a.join(','):0)+'}';
const records=a=>'{'+(a.length?a.map(x=>'{'+x.key+','+x.identity+'}').join(','):'{0,0}')+'}';
const makeRecords=(a,offset=0)=>a.map((key,i)=>({key,identity:[imax,-73,imin,5,5,-2,19][(i+offset)%7]}));
// Explicit position breaks equal-key ties; identities are data, never sort keys.
const stable=a=>a.map((x,index)=>({...x,index})).sort((a,b)=>a.key-b.key||a.index-b.index).map(({key,identity})=>({key,identity}));
const row=(body,want=[1,1,1])=>({body,want:want.map(String)});
let seed=20261120;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const pool=[imin,imax,-999,-3,-1,0,1,2,17];
const exhaustive=[];
for(let n=0;n<=4;n++)for(let code=0;code<3**n;code++){let x=code,a=[];for(let i=0;i<n;i++){a.push(x%3-1);x=Math.floor(x/3);}exhaustive.push(a);}
const base=[...exhaustive,[imin,imax,0,imin,imax],[-7,-7,-7,-7],[4,1,4,1,4,1,4],
 ...Array.from({length:18},()=>Array.from({length:5+rand(20)},()=>pool[rand(pool.length)]))];
const specs=new Map();
const common=String.raw`
static int dss_record_equal(SortRecord a,SortRecord b){return a.key==b.key&&a.identity==b.identity;}
static int dss_int_compare(const void*a,const void*b){int x=*(const int*)a,y=*(const int*)b;return (x>y)-(x<y);}
`;
const recSortHelpers=call=>common+String.raw`
static void dss_sort(const SortRecord*values,int physical,int n,const SortRecord*expected){
 SortRecord a[1030],work[1030],guard={981711,-982733};
 a[0]=a[physical+1]=guard;for(int i=0;i<physical;i++)a[i+1]=values[i];
 for(int i=0;i<physical+2;i++)work[i]=(SortRecord){-9171-i,9181+i};
 ${call};
 int result=1,tail=1,bound=a[0].key==guard.key&&a[0].identity==guard.identity&&dss_record_equal(a[physical+1],guard);
 for(int i=0;i<n;i++)if(!dss_record_equal(a[i+1],expected[i]))result=0;
 for(int i=n;i<physical;i++)if(!dss_record_equal(a[i+1],values[i]))tail=0;
 for(int i=n+1;i<physical+2;i++)if(work[i].key!=-9171-i||work[i].identity!=9181+i)bound=0;
 if(work[0].key!=-9171||work[0].identity!=9181)bound=0;
 printf("%d %d %d\n",result,tail,bound);
}
`;
function sortingRows(arrays){return arrays.map((keys,k)=>{const all=makeRecords([...keys,imax,imin,7],k),n=keys.length;return row(`const SortRecord a[]=${records(all)},e[]=${records(stable(all.slice(0,n)))};dss_sort(a,${all.length},${n},e);`);});}
const insertion=[...base,Array.from({length:256},(_,i)=>256-i),Array(256).fill(7)];
for(const n of [1,2])specs.set(id(n),{record:true,helpers:recSortHelpers(`${n===1?'stableInsertion':'binaryInsertion'}(a+1,n)`),rows:sortingRows(insertion)});
const mergeInputs=[...new Map(exhaustive.filter(a=>a.length<=3).map(a=>{const sorted=a.slice().sort((a,b)=>a-b);return [sorted.join(','),sorted];})).values()];
const mergeRows=[];
for(const a of mergeInputs)for(const b of mergeInputs){const left=makeRecords(a,1),right=makeRecords(b,3);mergeRows.push(row(`const SortRecord a[]=${records([...left,{key:imax,identity:-91}])},b[]=${records([...right,{key:imin,identity:91}])},e[]=${records(stable([...left,...right]))};dss_merge(a,${left.length+1},0,${a.length},b,${right.length+1},0,${b.length},e,0);`));}
for(const [offset1,n,offset2,m]of [[0,4,0,4],[0,3,1,3],[2,0,1,3],[0,4,0,0]]){const all=makeRecords([-3,-3,0,2,7,imax]);mergeRows.push(row(`const SortRecord a[]=${records(all)},e[]=${records(stable([...all.slice(offset1,offset1+n),...all.slice(offset2,offset2+m)]))};dss_merge(a,6,${offset1},${n},a,6,${offset2},${m},e,1);`));}
{const a=makeRecords(Array.from({length:256},(_,i)=>Math.floor(i/3)-43)),b=makeRecords(Array.from({length:256},(_,i)=>Math.floor(i/4)-30),3);mergeRows.push(row(`const SortRecord a[]=${records([...a,{key:imin,identity:32}])},b[]=${records([...b,{key:imax,identity:23}])},e[]=${records(stable([...a,...b]))};dss_merge(a,257,0,256,b,257,0,256,e,0);`));}
specs.set(id(3),{record:true,helpers:common+String.raw`
static void dss_merge(const SortRecord*av,int ap,int offsetA,int n,const SortRecord*bv,int bp,int offsetB,int m,const SortRecord*expected,int shared){
 SortRecord a[260],b[260],out[518],guard={981711,-982733};
 a[0]=a[ap+1]=b[0]=b[bp+1]=guard;for(int i=0;i<ap;i++)a[i+1]=av[i];for(int i=0;i<bp;i++)b[i+1]=bv[i];
 for(int i=0;i<n+m+3;i++)out[i]=(SortRecord){-8171-i,8181+i};
 mergeStable(a+1+offsetA,n,shared?a+1+offsetB:b+1+offsetB,m,out+1);
 int result=1,readonly=1,bounds=1;for(int i=0;i<n+m;i++)if(!dss_record_equal(out[i+1],expected[i]))result=0;
 for(int i=0;i<ap;i++)if(!dss_record_equal(a[i+1],av[i]))readonly=0;for(int i=0;i<bp;i++)if(!dss_record_equal(b[i+1],bv[i]))readonly=0;
 if(!dss_record_equal(a[0],guard)||!dss_record_equal(a[ap+1],guard)||!dss_record_equal(b[0],guard)||!dss_record_equal(b[bp+1],guard))bounds=0;
 for(int i=0;i<n+m+3;i++)if((i==0||i>n+m)&&(out[i].key!=-8171-i||out[i].identity!=8181+i))bounds=0;
 printf("%d %d %d\n",result,readonly,bounds);
}
`,rows:mergeRows});
const mergeSort=[...base,...[31,32,33,63,65,127,129].map(n=>Array.from({length:n},(_,i)=>(i*19)%31-15)),Array.from({length:1024},(_,i)=>1024-i),Array.from({length:1023},(_,i)=>i%7)];
specs.set(id(4),{record:true,helpers:recSortHelpers('mergeSortBottomUp(a+1,n,work+1)'),rows:sortingRows(mergeSort)});
const isHeap=a=>a.every((x,i)=>!i||a[Math.floor((i-1)/2)]>=x);
const heapChecks=[...base,[10,4,8,3,2,7,6],[10,4,8,3,2,7,9],Array.from({length:1024},(_,i)=>1024-i),Array(1024).fill(imin),[imax,imin,imax,imin,imin,imax]];
specs.set(id(5),{helpers:String.raw`
static void dss_heap(const int*v,int physical,int n,int expected){int a[1028];a[0]=a[physical+1]=981711;for(int i=0;i<physical;i++)a[i+1]=v[i];int answer=isMaxHeap(a+1,n),same=1;for(int i=0;i<physical;i++)if(a[i+1]!=v[i])same=0;printf("%d %d %d\n",answer==expected,same,a[0]==981711&&a[physical+1]==981711);}
`,rows:heapChecks.map(a=>row(`const int a[]=${ints([...a,imax,imin])};dss_heap(a,${a.length+2},${a.length},${Number(isHeap(a))});`))});
const insertCases=[];
for(const a of exhaustive.filter(isHeap))for(const x of [imin,-2,0,2,imax])insertCases.push({a,x});
for(const a of [[10,4,8,3,2,7,6],Array.from({length:1023},(_,i)=>1023-i),Array(1023).fill(-7)])for(const x of [imin,0,imax])insertCases.push({a,x});
specs.set(id(6),{helpers:String.raw`
static int dss_int_compare(const void*a,const void*b){int x=*(const int*)a,y=*(const int*)b;return (x>y)-(x<y);}
static void dss_insert(const int*v,int n,int value,const int*expected){int a[1028],copy[1024];int physical=n+3;for(int i=0;i<n;i++)a[i+1]=v[i];for(int i=n;i<physical;i++)a[i+1]=8181+i;a[0]=a[physical+1]=981711;int length=heapInsert(a+1,n,value),result=length==n+1,heap=1,tail=a[0]==981711&&a[physical+1]==981711;for(int i=0;i<=n;i++){copy[i]=a[i+1];if(i&&a[(i-1)/2+1]<a[i+1])heap=0;}qsort(copy,n+1,sizeof(int),dss_int_compare);for(int i=0;i<=n;i++)if(copy[i]!=expected[i])result=0;for(int i=n+1;i<physical;i++)if(a[i+1]!=8181+i)tail=0;printf("%d %d %d\n",result,heap,tail);}
`,rows:insertCases.map(({a,x})=>row(`const int a[]=${ints(a)},e[]=${ints([...a,x].sort((a,b)=>a-b))};dss_insert(a,${a.length},${x},e);`))});
const counting=[];
for(const a of base.filter(a=>a.every(x=>x>=-3&&x<=2)))counting.push({a,v:-3,w:2});
for(const v of [imin,-999,0,imax-511])for(const range of [1,2,17,512]){const w=v+range-1;if(w>imax)continue;counting.push({v,w,a:[]},{v,w,a:[v,w,v,w,v]},{v,w,a:Array.from({length:1024},(_,i)=>v+(i*13)%range)});}
specs.set(id(7),{record:true,helpers:common+String.raw`
static void dss_count(const SortRecord*v,int physical,int n,int low,int high,const SortRecord*expected){SortRecord a[1028],out[1028],guard={981711,-982733};a[0]=a[physical+1]=guard;for(int i=0;i<physical;i++)a[i+1]=v[i];for(int i=0;i<n+3;i++)out[i]=(SortRecord){-8171-i,8181+i};countingSortStable(a+1,n,low,high,out+1);int result=1,same=1,bounds=dss_record_equal(a[0],guard)&&dss_record_equal(a[physical+1],guard);for(int i=0;i<n;i++)if(!dss_record_equal(out[i+1],expected[i]))result=0;for(int i=0;i<physical;i++)if(!dss_record_equal(a[i+1],v[i]))same=0;for(int i=0;i<n+3;i++)if((i==0||i>n)&&(out[i].key!=-8171-i||out[i].identity!=8181+i))bounds=0;printf("%d %d %d\n",result,same,bounds);}
`,rows:counting.map(({a,v,w},k)=>{const all=makeRecords([...a,v,w],k);return row(`const SortRecord a[]=${records(all)},e[]=${records(stable(all.slice(0,a.length)))};dss_count(a,${all.length},${a.length},${v},${w},e);`);})});
const selectCases=[];
for(const a of base.filter(a=>a.length))for(const k of [...new Set([1,Math.ceil(a.length/2),a.length])])selectCases.push({a,k});
for(const a of [Array(1024).fill(-7),Array.from({length:1024},(_,i)=>1024-i),Array.from({length:1024},(_,i)=>i%7)])for(const k of [1,512,1024])selectCases.push({a,k});
specs.set(id(8),{helpers:String.raw`
static int dss_int_compare(const void*a,const void*b){int x=*(const int*)a,y=*(const int*)b;return (x>y)-(x<y);}
static void dss_select(const int*v,int physical,int n,int k,const int*expected){int a[1028],copy[1024];a[0]=a[physical+1]=981711;for(int i=0;i<physical;i++)a[i+1]=v[i];int answer=quickSelect(a+1,n,k),result=answer==expected[k-1],tail=a[0]==981711&&a[physical+1]==981711;for(int i=0;i<n;i++)copy[i]=a[i+1];qsort(copy,n,sizeof(int),dss_int_compare);for(int i=0;i<n;i++)if(copy[i]!=expected[i])result=0;for(int i=n;i<physical;i++)if(a[i+1]!=v[i])tail=0;printf("%d %d 1\n",result,tail);}
`,rows:selectCases.map(({a,k})=>row(`const int a[]=${ints([...a,imax,imin])},e[]=${ints(a.slice().sort((a,b)=>a-b))};dss_select(a,${a.length+2},${a.length},${k},e);`))});
// Rank Fenwick counts strictly greater earlier items; independent of merge logic.
function inversions(a){const keys=[...new Set(a)].sort((a,b)=>a-b),rank=new Map(keys.map((x,i)=>[x,i+1])),tree=Array(keys.length+1).fill(0);let answer=0n;for(let i=0;i<a.length;i++){let r=rank.get(a[i]),small=0;for(let p=r;p>0;p-=p&-p)small+=tree[p];answer+=BigInt(i-small);for(let p=r;p<tree.length;p+=p&-p)tree[p]++;}return answer;}
const invSmall=[...base,...[255,256,257].map(n=>Array.from({length:n},(_,i)=>(i*19)%47-23))];
const invRows=invSmall.map(a=>row(`const int a[]=${ints([...a,imax,imin])},e[]=${ints(a.slice().sort((a,b)=>a-b))};dss_inverse(a,${a.length+2},${a.length},e,${inversions(a)}LL);`));
const inverseHelpers=String.raw`
static int dss_int_compare(const void*a,const void*b){int x=*(const int*)a,y=*(const int*)b;return (x>y)-(x<y);}
static void dss_inverse(const int*v,int physical,int n,const int*expected,long long expectedCount){
 int a[4101],work[4101],copy[4096];a[0]=a[physical+1]=981711;for(int i=0;i<physical;i++)a[i+1]=v[i];for(int i=0;i<physical+2;i++)work[i]=-8171-i;
 long long answer=countInversions(a+1,n,work+1);int result=answer==expectedCount,tail=a[0]==981711&&a[physical+1]==981711,bounds=work[0]==-8171;
 for(int i=0;i<n;i++)copy[i]=a[i+1];qsort(copy,n,sizeof(int),dss_int_compare);for(int i=0;i<n;i++)if(copy[i]!=expected[i])result=0;
 for(int i=n;i<physical;i++)if(a[i+1]!=v[i])tail=0;for(int i=n+1;i<physical+2;i++)if(work[i]!=-8171-i)bounds=0;
 printf("%d %d %d\n",result,tail,bounds);
}
`;
const largeInv=[];
for(const mode of ['descending','repeating','ascending']){
 const n=4096,a=Array.from({length:n},(_,i)=>mode==='descending'?n-i:mode==='repeating'?(i*19)%47-23:i);
 largeInv.push(row(`int a[4098],e[4096];for(int i=0;i<4096;i++)a[i]=${mode==='descending'?'4096-i':mode==='repeating'?'(i*19)%47-23':'i'};a[4096]=2147483647;a[4097]=-2147483648;for(int i=0;i<4096;i++)e[i]=a[i];qsort(e,4096,sizeof(int),dss_int_compare);dss_inverse(a,4098,4096,e,${inversions(a)}LL);`));
}
specs.set(id(9),{helpers:inverseHelpers,rows:invRows,large:largeInv});
export const dsSortContractIds=[...specs.keys()];
function config(spec,rows){const groups=rows.map(r=>r.want);return {prelude:'#include <stddef.h>\n'+(spec.record?dsSortTypes.record+'\n':''),harness:'\n#include <stdio.h>\n#include <stdlib.h>\n'+spec.helpers+'\n'+rows.map((r,i)=>`static void dss_case_${i}(void){${r.body}}`).join('\n')+'\nint main(void){'+rows.map((_,i)=>`dss_case_${i}();`).join('')+'return 0;}\n',groups,expected:groups.flat()};}
export function dsSortContract(key){
 const spec=specs.get(key);if(!spec)return null;
 if(spec.large)return {variants:[config(spec,spec.rows),...spec.large.map(r=>config(spec,[r]))]};
 // Bound every trusted translation unit, leaving room for 32KB student code.
 const parts=[];let rows=[],bytes=0;
 for(const r of spec.rows){if(bytes+Buffer.byteLength(r.body)>190000&&rows.length){parts.push(config(spec,rows));rows=[];bytes=0;}rows.push(r);bytes+=Buffer.byteLength(r.body);}
 parts.push(config(spec,rows));if(parts.length>4)throw Error('too many sorting configurations');
 return parts.length===1?parts[0]:{variants:parts};
}
export const dsSortReferenceSources=Object.fromEntries(dsSortContractIds.map(key=>[key,dsSortTaskGuides[key].solution]));
const ref=n=>dsSortReferenceSources[id(n)];
const change=(n,from,to)=>{const value=ref(n);if(!value.includes(from))throw Error('missing sort mutation '+n+': '+from);return value.replace(from,to);};
const samples=rows=>rows.map(([n,label,source])=>({id:id(n),label,source}));
export const dsSortEquivalentSources=samples([
 [1,'last-valid-index-insertion','void stableInsertion(SortRecord a[],int n){for(int i=1;i<n;i++){SortRecord x=a[i];int j=i-1;while(j>=0&&a[j].key>x.key){a[j+1]=a[j];j--;}a[j+1]=x;}}'],
 [2,'inclusive-upper-bound','void binaryInsertion(SortRecord a[],int n){for(int i=1;i<n;i++){SortRecord x=a[i];int low=0,high=i-1;while(low<=high){int mid=low+(high-low)/2;if(a[mid].key>x.key)high=mid-1;else low=mid+1;}for(int j=i-1;j>=low;j--)a[j+1]=a[j];a[low]=x;}}'],
 [3,'single-output-loop','void mergeStable(const SortRecord a[],int n,const SortRecord b[],int m,SortRecord out[]){int i=0,j=0;for(int k=0;k<n+m;k++){if(j==m||(i<n&&a[i].key<=b[j].key))out[k]=a[i++];else out[k]=b[j++];}}'],
 [4,'alternating-buffers','void mergeSortBottomUp(SortRecord a[],int n,SortRecord work[]){SortRecord*src=a,*dst=work;for(int width=1;width<n;width*=2){for(int l=0;l<n;l+=2*width){int mid=l+width<n?l+width:n,r=l+2*width<n?l+2*width:n,i=l,j=mid;for(int k=l;k<r;k++){if(j==r||(i<mid&&src[i].key<=src[j].key))dst[k]=src[i++];else dst[k]=src[j++];}}SortRecord*tmp=src;src=dst;dst=tmp;}if(src!=a)for(int i=0;i<n;i++)a[i]=src[i];}'],
 [5,'scan-child-parent','int isMaxHeap(const int a[],int n){for(int i=1;i<n;i++)if(a[(i-1)/2]<a[i])return 0;return 1;}'],
 [6,'swap-instead-of-hole','int heapInsert(int a[],int n,int x){a[n]=x;for(int i=n;i>0;){int p=(i-1)/2;if(a[p]>=a[i])break;int temp=a[p];a[p]=a[i];a[i]=temp;i=p;}return n+1;}'],
 [7,'forward-start-offsets','void countingSortStable(const SortRecord a[],int n,int v,int w,SortRecord out[]){int count[512]={0},next[512],range=w-v+1;for(int i=0;i<n;i++)count[a[i].key-v]++;int start=0;for(int key=0;key<range;key++){next[key]=start;start+=count[key];}for(int i=0;i<n;i++)out[next[a[i].key-v]++]=a[i];}'],
 [8,'median-three-way','static int selectPivot(int a,int b,int c){if(a>b){int x=a;a=b;b=x;}if(b>c){b=c;if(a>b)b=a;}return b;}\nint quickSelect(int a[],int n,int k){int lo=0,hi=n,rank=k-1;while(lo<hi){int pivot=selectPivot(a[lo],a[lo+(hi-lo)/2],a[hi-1]),less=lo,scan=lo,greater=hi;while(scan<greater){if(a[scan]>pivot){int x=a[--greater];a[greater]=a[scan];a[scan]=x;}else if(a[scan]<pivot){int x=a[less];a[less++]=a[scan];a[scan++]=x;}else scan++;}if(rank<less)hi=less;else if(rank>=greater)lo=greater;else return pivot;}return a[rank];}'],
 [9,'bottom-up-merge-count','long long countInversions(int a[],int n,int work[]){long long count=0;for(int width=1;width<n;width*=2){for(int l=0;l<n;l+=2*width){int mid=l+width<n?l+width:n,r=l+2*width<n?l+2*width:n,i=l,j=mid,k=l;while(i<mid&&j<r){if(a[i]<=a[j])work[k++]=a[i++];else{work[k++]=a[j++];count+=(long long)(mid-i);}}while(i<mid)work[k++]=a[i++];while(j<r)work[k++]=a[j++];}for(int i=0;i<n;i++)a[i]=work[i];}return count;}'],
 [9,'leave-input-in-original-order','#include <stdlib.h>\n#include <string.h>\n'+ref(9).replace('long long countInversions(int a[],int n,int work[]){return countPart(a,work,0,n);}','long long countInversions(int a[],int n,int work[]){if(n==0)return 0;int*temp=malloc((size_t)n*sizeof(int));if(!temp)return -1;memcpy(work,a,(size_t)n*sizeof(int));long long answer=countPart(work,temp,0,n);free(temp);return answer;}')],
 [9,'domain-safe-unsigned-accumulator',ref(9).replace('long long count=countPart','unsigned int count=(unsigned int)countPart')]
]);
export const dsSortWrongSources=samples([
 [1,'equal-keys-moved-before-earlier-records',change(1,'a[j-1].key>x.key','a[j-1].key>=x.key')],
 [1,'moves-keys-without-records',change(1,'a[j]=a[j-1];','a[j].key=a[j-1].key;')],
 [1,'omit-final-input',change(1,'i<n;i++','i<n-1;i++')],
 [2,'lower-bound-reverses-ties',change(2,'a[mid].key<=x.key','a[mid].key<x.key')],
 [2,'forward-right-shift-overwrites-unread-records',change(2,'for(int j=i;j>lo;j--)a[j]=a[j-1];','for(int j=lo;j<i;j++)a[j+1]=a[j];')],
 [2,'inserts-key-only',change(2,'a[lo]=x;','a[lo].key=x.key;')],
 [3,'right-input-wins-equal-keys',change(3,'a[i].key<=b[j].key','a[i].key<b[j].key')],
 [3,'drops-right-remainder',change(3,'while(j<m)out[k++]=b[j++];','')],
 [3,'copies-key-only',change(3,'out[k++]=a[i].key<=b[j].key?a[i++]:b[j++];','out[k++].key=a[i].key<=b[j].key?a[i++].key:b[j++].key;')],
 [4,'unstable-equal-merge',change(4,'a[i].key<=a[j].key','a[i].key<a[j].key')],
 [4,'skips-unpaired-last-run',change(4,'while(i<mid)work[k++]=a[i++];','if(mid<right)while(i<mid)work[k++]=a[i++];')],
 [4,'omits-copy-back',change(4,'for(int i=0;i<n;i++)a[i]=work[i];','')],
 [4,'starts-with-unsorted-two-runs',change(4,'int width=1;','int width=2;')],
 [5,'requires-entire-array-descending','int isMaxHeap(const int a[],int n){for(int i=1;i<n;i++)if(a[i]>a[i-1])return 0;return 1;}'],
 [5,'checks-only-left-children',change(5,'||(r<n&&a[i]<a[r])','')],
 [5,'checks-root-only',change(5,'i<n/2','i<(n>1?1:0)')],
 [6,'wrong-zero-based-parent',change(6,'int p=(i-1)/2;','int p=i/2;')],
 [6,'returns-old-length',change(6,'return n+1;','return n;')],
 [6,'new-value-lost',change(6,'a[i]=value;','a[i]=0;')],
 [7,'forward-scan-with-end-offsets-reverses-ties',change(7,'for(int i=n-1;i>=0;i--)','for(int i=0;i<n;i++)')],
 [7,'drops-last-record',change(7,'for(int i=n-1;i>=0;i--)','for(int i=n-2;i>=0;i--)')],
 [7,'copies-keys-only',change(7,'out[--count[a[i].key-v]]=a[i];','out[--count[a[i].key-v]].key=a[i].key;')],
 [8,'one-based-rank-used-as-index',change(8,'target=k-1','target=k')],
 [8,'returns-pivot-even-when-rank-is-left',change(8,'if(target<low)right=low;','if(target<low)return pivot;')],
 [8,'partition-drops-swapped-key',change(8,'a[i]=x;}else i++;','a[i]=pivot;}else i++;')],
 [9,'equal-values-count-as-inversions',change(9,'if(a[i]<=a[j])','if(a[i]<a[j])')],
 [9,'omits-recursive-subproblem-counts',change(9,'long long count=countPart(a,work,l,mid)+countPart(a,work,mid,r);','countPart(a,work,l,mid);countPart(a,work,mid,r);long long count=0;')],
 [9,'cross-count-off-by-one',change(9,'count+=(long long)(mid-i);','count+=(long long)(mid-i-1);')],
 [9,'changes-multiset-after-counting',change(9,'return countPart(a,work,0,n);','long long answer=countPart(a,work,0,n);if(n)a[0]=0;return answer;')]
]);
