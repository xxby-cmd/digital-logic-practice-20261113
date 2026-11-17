// Trusted server-side drivers. Expected values are computed independently in JS.
const literal=a=>`{${a.length?a.join(','):0}}`;
const cases=[[],[0],[1],[-1],[1,3,1],[3,2,1],[2,2,2],[1,4,4,1],[0,-2,0,5,0],[3,1,3,2,1],[-5,-3,-9],[2147483647,-2147483648,0,2147483647],Array.from({length:37},(_,i)=>(i*17%13)-6)];
const specs=new Map();
function register(id,build){specs.set(id,build);}
function scalar(id,fn,result,{nonempty=false,extra=''}={}){
 register(id,()=>cases.filter(a=>!nonempty||a.length).map(a=>({body:`int a[]=${literal(a)}; printf("%lld\\n",(long long)${fn}(a,${a.length}${extra}));`,out:[result(a)]})));
}
function vector(id,fn,result,{nonempty=false,returnLength=false,type='int',extra=''}={}){
 register(id,()=>cases.filter(a=>!nonempty||a.length).map(a=>{
  const expected=result(a),call=`${fn}(a,${a.length}${extra})`;
  return {body:`int a[128]=${literal(a)}; ${type} b[128]={0}; ${returnLength?`int k=${call}; printf("%d ",k);`:`${call};`} for(int i=0;i<${returnLength?'k':expected.length};i++)printf("%lld ",(long long)${extra.includes('b')?'b':'a'}[i]); puts("");`,out:returnLength?[expected.length,...expected]:expected};
 }));
}
scalar('P-C-04','lastZero',a=>a.lastIndexOf(0));
register('P-C-03',()=>[[0,1],[-1,1],[2,2],[-2147483648,2147483647],[7,-4]].map(([a,b])=>({body:`int a=${a},b=${b};swap(&a,&b);printf("%d %d ",a,b);swap(&a,&a);printf("%d\\n",a);`,out:[b,a,b]})));
scalar('P3-programming-6-56','countBelow',a=>a.filter(x=>x<2).length,{extra:',2'});
scalar('P3-programming-6-42','lastMax',a=>a.lastIndexOf(Math.max(...a)),{nonempty:true});
scalar('P3-programming-6-43','ordered',a=>Number(a.every((x,i)=>!i||x>=a[i-1])));
scalar('P3-programming-6-75','longestSame',a=>{let best=0;for(let i=0;i<a.length;i++){let j=i;while(j<a.length&&a[j]===a[i])j++;best=Math.max(best,j-i);}return best;});
scalar('P3-programming-6-41','less',a=>a.filter(x=>x<2).length,{extra:',2'});
vector('P2-programming-6-10','negatives',a=>a.filter(x=>x<0),{extra:',b',returnLength:true});
vector('P3-programming-6-58','compactPositive',a=>a.filter(x=>x>0),{returnLength:true});
vector('P3-programming-6-70','copyOdd',a=>a.filter(x=>x%2!==0),{extra:',b',returnLength:true});
vector('P3-programming-6-80','compressRuns',a=>a.filter((x,i)=>!i||x!==a[i-1]),{returnLength:true});
vector('P3-programming-6-59','prefix',a=>a.reduce((s,x)=>(s.push(s.at(-1)+x),s),[0]),{extra:',b',type:'long long'});
vector('P3-programming-6-61','differences',a=>a.slice(1).map((x,i)=>x-a[i]),{extra:',b',type:'long long',nonempty:true});
vector('P3-programming-6-69','bubblePass',a=>{const b=[...a];for(let i=1;i<b.length;i++)if(b[i-1]>b[i])[b[i-1],b[i]]=[b[i],b[i-1]];return b;});
register('P3-programming-6-62',()=>cases.flatMap(a=>[0,Math.floor(a.length/2),a.length].map(k=>({body:`int a[128]=${literal(a)};int n=shiftLeft(a,${a.length},${k});printf("%d ",n);for(int i=0;i<n;i++)printf("%d ",a[i]);puts("");`,out:[a.length-k,...a.slice(k)]}))));
register('P3-programming-6-64',()=>cases.filter(a=>a.length).flatMap(a=>[[0,0],[0,a.length-1],[Math.floor(a.length/2),a.length-1]].map(([l,r])=>{const out=[...a.slice(0,l),...a.slice(r+1)];return {body:`int a[128]=${literal(a)};int n=erase(a,${a.length},${l},${r});printf("%d ",n);for(int i=0;i<n;i++)printf("%d ",a[i]);puts("");`,out:[out.length,...out]};})));
register('P3-programming-6-68',()=>cases.flatMap(a=>[a,a.map((x,i)=>i===Math.floor(a.length/2)?(x===0?1:0):x)].map(b=>({body:`int a[]=${literal(a)},b[]=${literal(b)};printf("%d\\n",mismatch(a,b,${a.length}));`,out:[a.findIndex((x,i)=>x!==b[i])]}))));
register('P3-programming-6-49',()=>cases.flatMap(a=>[a,a.map((x,i)=>i===0?(x===0?1:0):x)].map(b=>({body:`int a[]=${literal(a)},b[]=${literal(b)};printf("%d\\n",equal(a,b,${a.length}));`,out:[Number(a.every((x,i)=>x===b[i]))]}))));
register('P3-programming-6-73',()=>[0,1,2,7,30].flatMap(n=>[...new Set([0,Math.floor(n/2),n])].map(m=>{const a=Array.from({length:n+1},(_,i)=>i).filter(x=>x!==m).reverse();return {body:`int a[]=${literal(a)};printf("%d\\n",missing(a,${n}));`,out:[m]};})));
register('P3-programming-6-76',()=>cases.filter(a=>a.length).flatMap(a=>[...new Set([1,Math.ceil(a.length/2),a.length])].map(k=>({body:`int a[]=${literal(a)};printf("%lld\\n",minWindowSum(a,${a.length},${k}));`,out:[Math.min(...Array.from({length:a.length-k+1},(_,i)=>a.slice(i,i+k).reduce((s,x)=>s+x,0)))]}))));
register('P3-programming-6-81',()=>cases.map(a=>{const v=[],lens=[];for(const x of a){if(v.length&&v.at(-1)===x)lens[lens.length-1]++;else{v.push(x);lens.push(1);}}return {body:`int a[]=${literal(a)},v[128]={0},lens[128]={0};int k=encodeRuns(a,${a.length},v,lens);printf("%d ",k);for(int i=0;i<k;i++)printf("%d %d ",v[i],lens[i]);puts("");`,out:[v.length,...v.flatMap((x,i)=>[x,lens[i]])]};}));
export const arrayContractIds=[...specs.keys()];
export function arrayContract(id){
 const build=specs.get(id);if(!build)return null;const tests=build();
 return {harness:`\n#include <stdio.h>\nint main(void){\n${tests.map(t=>`{${t.body}}`).join('\n')}\nreturn 0;}`,expected:tests.flatMap(t=>t.out.map(String)),groups:tests.map(t=>t.out.map(String))};
}
