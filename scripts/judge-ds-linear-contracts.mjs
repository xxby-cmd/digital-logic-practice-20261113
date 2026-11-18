// Server-only contracts. JS sets/identity graphs derive expected observations.
const key=n=>`P4-structures-2-D-${String(n).padStart(3,'0')}`;
const lit=a=>`{${a.length?a.join(','):0}}`, row=(body,out)=>({body,out});
const node='typedef struct Node { int data; struct Node *next; } Node;\n';
const limits=[-2147483648,2147483647],left=918273,right=-728193;
const specs=new Map();
let seed=1741;
const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const samples=[[],[-1],[0],[1],[limits[0]],[limits[1]],[-2,-1],[0,2,4],
 [-1,0,-2,0,8,-7],[5,-1,4,-2,3],[7,7,-7,-7,7,-7,0],
 [limits[0],0,limits[1],-1,1],Array(12).fill(-2),Array(12).fill(2),
 ...Array.from({length:12},()=>Array.from({length:3+random(16)},()=>random(17)-8)),
 Array.from({length:256},(_,i)=>i%3===0?-i-1:i)];
const unique=a=>[...new Set(a)];

specs.set(key(1),{prelude:'',helpers:'',build:()=>samples.flatMap(a=>unique([0,Math.floor(a.length/2),a.length]).map(n=>{
 const expected=a.slice(0,n).filter(x=>x>=0);
 return row(`int box[${a.length+2}]=${lit([left,...a,right])};int k=removeNegatives(box+1,${n});int valid=k>=0&&k<=${n};printf("%d %d ",k,box[0]==${left}&&box[${a.length+1}]==${right});if(valid)for(int i=0;i<k;i++)printf("%d ",box[i+1]);puts("");`,[expected.length,1,...expected]);
}))});

function sharedCases(){
 const out=[];
 for(const al of [0,1,3,11])for(const bl of [0,1,4])for(const sl of [0,1,3]){
  const av=Array.from({length:al},(_,i)=>i%2?7:-3),bv=Array.from({length:bl},(_,i)=>i%2?7:-3),sv=Array.from({length:sl},(_,i)=>i%2?7:-3);
  out.push({av,bv,sv});
 }
 out.push({av:Array(255).fill(7),bv:[],sv:[7]},{av:[],bv:Array(255).fill(7),sv:[7]},
  {av:[limits[0],limits[1]],bv:[limits[0],limits[1]],sv:[]});
 return out;
}
const sharesHelper=String.raw`
static void dslinear_share(const int *values,const int *next,int count,int ha,int hb,int scattered){
 Node pool[1027]={0};int slot[513];for(int i=0;i<count;i++)slot[i]=scattered?2*(count-1-i)+1:i;
 for(int i=0;i<count;i++){pool[slot[i]].data=values[i];pool[slot[i]].next=next[i]<0?NULL:&pool[slot[next[i]]];}
 int result=sharesNode(ha<0?NULL:&pool[slot[ha]],hb<0?NULL:&pool[slot[hb]]);int same=1;
 for(int i=0;i<count;i++)if(pool[slot[i]].data!=values[i]||pool[slot[i]].next!=(next[i]<0?NULL:&pool[slot[next[i]]]))same=0;
 printf("%d %d\n",result,same);
}
`;
specs.set(key(2),{prelude:'#include <stddef.h>\n'+node,helpers:sharesHelper,build:()=>sharedCases().flatMap(({av,bv,sv})=>{
 const values=[...av,...bv,...sv],start=av.length+bv.length;
 const next=values.map((_,i)=>i<av.length?(i+1<av.length?i+1:sv.length?start:-1):i<start?(i+1<start?i+1:sv.length?start:-1):i+1<values.length?i+1:-1);
 const ha=av.length?0:sv.length?start:-1,hb=bv.length?av.length:sv.length?start:-1;
 const reachable=h=>{const visited=new Set();for(let i=h;i>=0;i=next[i])visited.add(i);return visited;};
 const setA=reachable(ha),setB=reachable(hb),common=[...setA].some(i=>setB.has(i));
 return [0,1].map(scattered=>row(`const int values[]=${lit(values)},next[]=${lit(next)};dslinear_share(values,next,${values.length},${ha},${hb},${scattered});`,[Number(common),1]));
})});

// Actual heap allocation is retained. Before freeing, record allocation-instance
// identity and liveness; checks never read a recorded released allocation.
const allocationPrelude=String.raw`#include <stdlib.h>
#include <stddef.h>
#include <stdint.h>
`+node+String.raw`
static uintptr_t dslinear_address[1024],dslinear_map_address[2048];static int dslinear_live[1024],dslinear_map_slot[2048],dslinear_count,dslinear_badfree;static unsigned dslinear_used[2048],dslinear_epoch;
static int dslinear_bucket(uintptr_t address){unsigned i=(unsigned)(((address>>3)*(uintptr_t)2654435761u)&2047u);while(dslinear_used[i]==dslinear_epoch&&dslinear_map_address[i]!=address)i=(i+1)&2047u;return (int)i;}
static int dslinear_find(uintptr_t address){int b=dslinear_bucket(address);return dslinear_used[b]==dslinear_epoch?dslinear_map_slot[b]:-1;}
static void dslinear_record(void*p){if(p){if(dslinear_count==1024)exit(88);uintptr_t address=(uintptr_t)p;int b=dslinear_bucket(address);dslinear_used[b]=dslinear_epoch;dslinear_map_address[b]=address;dslinear_map_slot[b]=dslinear_count;dslinear_address[dslinear_count]=address;dslinear_live[dslinear_count++]=1;}}
static void*dslinear_malloc(size_t n){void*p=malloc(n);dslinear_record(p);return p;}
static void*dslinear_calloc(size_t n,size_t size){void*p=calloc(n,size);dslinear_record(p);return p;}
static void*dslinear_aligned_alloc(size_t alignment,size_t size){void*p=aligned_alloc(alignment,size);dslinear_record(p);return p;}
static void dslinear_free(void*p){if(!p)return;int b=dslinear_bucket((uintptr_t)p),i=dslinear_used[b]==dslinear_epoch?dslinear_map_slot[b]:-1;if(i<0){dslinear_badfree=1;return;}dslinear_live[i]=0;dslinear_map_slot[b]=-1;free(p);}
static void*dslinear_realloc(void*p,size_t n){int b=p?dslinear_bucket((uintptr_t)p):-1,i=p&&dslinear_used[b]==dslinear_epoch?dslinear_map_slot[b]:-1;if(p&&i<0){dslinear_badfree=1;return NULL;}void*q=realloc(p,n);if(q||n==0){if(i>=0){dslinear_live[i]=0;dslinear_map_slot[b]=-1;}dslinear_record(q);}return q;}
#define malloc dslinear_malloc
#define calloc dslinear_calloc
#define aligned_alloc dslinear_aligned_alloc
#define realloc dslinear_realloc
#define free dslinear_free
`;
const removeHelper=String.raw`
static void dslinear_remove(const int*values,int n,int x,int headValue){
 dslinear_count=dslinear_badfree=0;dslinear_epoch++;int original[256];
 Node*head=malloc(sizeof *head);if(!head)exit(90);int hs=dslinear_count-1;uintptr_t headAddress=(uintptr_t)head;
 head->data=headValue;head->next=NULL;Node*tail=head;
 for(int i=0;i<n;i++){Node*p=malloc(sizeof *p);if(!p)exit(90);original[i]=dslinear_count-1;p->data=values[i];p->next=NULL;tail->next=p;tail=p;}
 removeValue(head,x);
 int headAlive=dslinear_live[hs],released=1;
 for(int i=0;i<n;i++)if(values[i]==x&&dslinear_live[original[i]])released=0;
 int valid=headAlive&&!dslinear_badfree,k=0,output[257];Node*cursor=headAlive?((Node*)headAddress)->next:NULL;
 while(cursor&&k<=n){int slot=dslinear_find((uintptr_t)cursor);if(slot<0){valid=0;break;}output[k++]=cursor->data;cursor=cursor->next;}
 if(cursor||k>n)valid=0;
 printf("%d %d %d %d ",headAlive,released,valid,k);for(int i=0;i<k&&i<=n;i++)printf("%d ",output[i]);puts("");
 for(int i=0;i<dslinear_count;i++)if(dslinear_live[i])free((void*)dslinear_address[i]);
}
`;
specs.set(key(3),{prelude:allocationPrelude,helpers:removeHelper,build:()=>samples.flatMap(a=>unique([0,7,-7,limits[0],limits[1],...(a.length?[a[0],a.at(-1)]:[])]).map((x,j)=>{
 const after=a.filter(v=>v!==x);
 return row(`const int values[]=${lit(a)};dslinear_remove(values,${a.length},${x},${j%2?123:x});`,[1,1,1,after.length,...after]);
}))});

const kthHelper=String.raw`
static void dslinear_kth(const int*values,int n,int k,int scattered){
 Node pool[513]={0};int slot[256];for(int i=0;i<n;i++)slot[i]=scattered?2*(n-1-i)+1:i;
 for(int i=0;i<n;i++){pool[slot[i]].data=values[i];pool[slot[i]].next=i+1<n?&pool[slot[i+1]]:NULL;}
 const Node*p=kthFromEnd(n?&pool[slot[0]]:NULL,k);int index=p?-2:-1,same=1;
 for(int i=0;i<n;i++){if(p==&pool[slot[i]])index=i;if(pool[slot[i]].data!=values[i]||pool[slot[i]].next!=(i+1<n?&pool[slot[i+1]]:NULL))same=0;}
 printf("%d %d\n",index,same);
}
`;
specs.set(key(4),{prelude:'#include <stddef.h>\n'+node,helpers:kthHelper,build:()=>samples.filter(a=>a.length).flatMap(a=>unique([1,Math.max(1,Math.floor(a.length/2)),a.length,a.length+1,2147483647]).flatMap(k=>[0,1].map(scattered=>row(`const int values[]=${lit(a)};dslinear_kth(values,${a.length},${k},${scattered});`,[k<=a.length?a.length-k:-1,1]))))});

const intersectionHelper=String.raw`
static void dslinear_inter(const int*av,int ac,int n,const int*bv,int bc,int m,int alias,int offset){
 int a[260],b[260],c[258],cap=n<m?n:m; a[0]=b[0]=c[0]=918273;
 for(int i=0;i<ac;i++)a[i+1]=av[i];for(int i=0;i<bc;i++)b[i+1]=bv[i];
 a[ac+1]=b[bc+1]=-728193;for(int i=0;i<cap;i++)c[i+1]=68000+i;c[cap+1]=-728193;
 int k=intersection(a+1,n,alias?a+1+offset:b+1,m,c+1),same=1;
 for(int i=0;i<ac;i++)if(a[i+1]!=av[i])same=0;for(int i=0;i<bc;i++)if(b[i+1]!=bv[i])same=0;
 int guarded=a[0]==918273&&a[ac+1]==-728193&&b[0]==918273&&b[bc+1]==-728193&&c[0]==918273&&c[cap+1]==-728193;
 if(k>=0&&k<=cap)for(int i=1;i<k;i++){int x=c[i+1],j=i;while(j>0&&c[j]>x){c[j+1]=c[j];j--;}c[j+1]=x;}
 printf("%d %d %d ",k,same,guarded);if(k>=0&&k<=cap)for(int i=0;i<k;i++)printf("%d ",c[i+1]);puts("");
}
`;
function intersectionCases(){
 const bases=[[],[-3],[0],[7],[-9,-3,0,2,7],[limits[0],-7,0,9,limits[1]],[-5,-4,-2,3,8,12],Array.from({length:256},(_,i)=>i-128)];
 const out=[];
 for(const av of bases.slice(0,7))for(const bv of bases.slice(0,7))for(const [n,m]of [[av.length,bv.length],[Math.floor(av.length/2),bv.length],[av.length,Math.floor(bv.length/2)]])out.push({av,bv,n,m,alias:0,offset:0});
 out.push({av:bases[7],bv:bases[7].map(x=>x+100),n:256,m:256,alias:0,offset:0});
 for(const offset of [0,1,3])for(const n of [0,2,5]){const av=[-9,-3,0,2,7,10,13,19];out.push({av,bv:[],n,m:av.length-offset,alias:1,offset});}
 return out;
}
specs.set(key(5),{prelude:'',helpers:intersectionHelper,build:()=>intersectionCases().map(({av,bv,n,m,alias,offset})=>{
 const b=alias?av.slice(offset,offset+m):bv.slice(0,m),setB=new Set(b);
 const expected=av.slice(0,n).filter(x=>setB.has(x)).sort((a,b)=>a-b);
 return row(`const int av[]=${lit(av)},bv[]=${lit(bv)};dslinear_inter(av,${av.length},${n},bv,${bv.length},${m},${alias},${offset});`,[expected.length,1,1,...expected]);
})});

export const dsLinearContractIds=[...specs.keys()];
export function dsLinearContract(id){const spec=specs.get(id);if(!spec)return null;const tests=spec.build(),groups=tests.map(t=>t.out.map(String));return {prelude:spec.prelude,harness:'\n#include <stdio.h>\n'+spec.helpers+'\n'+tests.map((t,i)=>`static void dslinear_case_${i}(void){${t.body}}`).join('\n')+'\nint main(void){\n'+tests.map((_,i)=>`dslinear_case_${i}();`).join('\n')+'\nreturn 0;}\n',groups,expected:groups.flat()};}
export const dsLinearReferenceSources={
 [key(1)]:'int removeNegatives(int a[],int n){int w=0;for(int r=0;r<n;r++)if(a[r]>=0)a[w++]=a[r];return w;}',
 [key(2)]:'int sharesNode(const Node*a,const Node*b){if(!a||!b)return 0;while(a->next)a=a->next;while(b->next)b=b->next;return a==b;}',
 [key(3)]:'void removeValue(Node*head,int x){Node*pre=head;while(pre->next){Node*p=pre->next;if(p->data==x){pre->next=p->next;free(p);}else pre=p;}}',
 [key(4)]:'const Node*kthFromEnd(const Node*first,int k){const Node*fast=first,*slow=first;for(int i=0;i<k;i++){if(!fast)return NULL;fast=fast->next;}while(fast){fast=fast->next;slow=slow->next;}return slow;}',
 [key(5)]:'int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n&&j<m){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{c[k++]=a[i];i++;j++;}}return k;}'
};
