// Server-only fixtures. Expected results are solved independently in JavaScript.
import {dsSearchTaskGuides,dsSearchTypes} from '../ds-search-task-guides.js';
const id=n=>`P4-structures-9-D-${String(n).padStart(3,'0')}`;
const arr=a=>'{'+(a.length?a.join(','):0)+'}',row=(body,out=[1,1,1])=>({body,out:out.map(String)});
const MIN=-2147483648,MAX=2147483647,uniq=a=>[...new Set(a)],prefixes=n=>uniq([0,Math.floor(n/2),n]);
let seed=20261120;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){let j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const specs=new Map();
const bases=[[],[0],[MIN],[MAX],[-7,0,7],[MIN,-7,0,0,MAX],[1,1,1,1],[MIN,MIN,0,MAX,MAX],[-9,-5,-5,2,7,7,12],Array.from({length:1024},(_,i)=>i-512),Array.from({length:1024},(_,i)=>Math.floor(i/8)-64)];
for(let k=0;k<10;k++)bases.push(Array.from({length:3+rand(24)},()=>rand(19)-9).sort((a,b)=>a-b));
const baseGlobals=bases.map((a,i)=>`static const int dss_values_${i}[]=${arr(a)};`).join('\n');
const arrayRead=String.raw`
static int dss_array_same(const int*a,const int*v,int physical){if(a[0]!=918273||a[physical+1]!=-728193)return 0;for(int i=0;i<physical;i++)if(a[i+1]!=v[i])return 0;return 1;}
`;
const boundRows=[];
for(let i=0;i<bases.length;i++){const a=bases[i],queries=uniq([MIN,MAX,-10,-1,0,1,10,...a.filter((_,j)=>j<2||j===a.length-1||j===Math.floor(a.length/2))]);for(const n of prefixes(a.length))for(const key of queries){const at=a.slice(0,n).findIndex(x=>x>=key);boundRows.push(row(`dss_bound(dss_values_${i},${a.length},${n},${key});`,[at<0?n:at,1,1]));}}
specs.set(id(1),{types:'',helpers:baseGlobals+arrayRead+String.raw`
static void dss_bound(const int*v,int physical,int n,int key){int a[1026];a[0]=918273;a[physical+1]=-728193;for(int i=0;i<physical;i++)a[i+1]=v[i];int result=lowerBound(a+1,n,key);printf("%d %d 1\n",result,dss_array_same(a,v,physical));}
`,rows:boundRows});
const rangeRows=[];
const ranges=[[MIN,MAX],[MIN,MIN],[MAX,MAX],[0,0],[-7,7],[7,-7],[-6,-1],[1,8],[MAX,MIN]];
for(let i=0;i<bases.length;i++)for(const n of prefixes(bases[i].length))for(const [L,R]of ranges){const expected=bases[i].slice(0,n).filter(v=>v>=L&&v<=R).length;rangeRows.push(row(`dss_range(dss_values_${i},${bases[i].length},${n},${L},${R});`,[expected,1,1]));}
specs.set(id(2),{types:'',helpers:baseGlobals+arrayRead+String.raw`
static void dss_range(const int*v,int physical,int n,int L,int R){int a[1026];a[0]=918273;a[physical+1]=-728193;for(int i=0;i<physical;i++)a[i+1]=v[i];int result=countInRange(a+1,n,L,R);printf("%d %d 1\n",result,dss_array_same(a,v,physical));}
`,rows:rangeRows});

const sorted=bases.filter((_,i)=>i<10).map(a=>uniq(a));
const commonCases=[];
for(let i=0;i<sorted.length;i++)for(let j=0;j<sorted.length;j++){const a=sorted[i],b=sorted[j];const n=i%3===0?Math.floor(a.length/2):a.length,m=j%3===1?Math.floor(b.length/2):b.length;commonCases.push({a,b,n,m,offset:-1});}
for(const a of sorted)for(const [start,m]of [[0,a.length],[0,Math.floor(a.length/2)],[Math.floor(a.length/2),a.length-Math.floor(a.length/2)]])commonCases.push({a,b:[],n:a.length,m,offset:start});
specs.set(id(3),{types:'',helpers:arrayRead+String.raw`
static void dss_common(const int*av,int ac,int n,const int*bv,int bc,int m,int offset,const int*allowed,int count,int initial){
 int a[1026],b[1026];a[0]=b[0]=918273;a[ac+1]=b[bc+1]=-728193;for(int i=0;i<ac;i++)a[i+1]=av[i];for(int i=0;i<bc;i++)b[i+1]=bv[i];int output[3]={918273,initial,-728193};
 int result=commonKey(a+1,n,offset<0?b+1:a+1+offset,m,output+1),good=result==(count>0);
 if(count){int member=0;for(int i=0;i<count;i++)if(allowed[i]==output[1])member=1;if(!member)good=0;}else if(output[1]!=initial)good=0;
 printf("%d %d %d\n",good,dss_array_same(a,av,ac)&&dss_array_same(b,bv,bc),output[0]==918273&&output[2]==-728193);
}
`,rows:commonCases.map(({a,b,n,m,offset},i)=>{const bs=offset<0?b.slice(0,m):a.slice(offset,offset+m),e=a.slice(0,n).filter(v=>bs.includes(v));return row(`const int a[]=${arr(a)},b[]=${arr(b)},allowed[]=${arr(e)};dss_common(a,${a.length},${n},b,${b.length},${m},${offset},allowed,${e.length},${[0,-7,MIN,MAX][i%4]});`);})});

function tree(keys){const data=[],left=[],right=[];for(const key of keys){if(data.includes(key))continue;if(!data.length){data.push(key);left.push(-1);right.push(-1);continue;}let at=0;for(;;){const links=key<data[at]?left:right;if(links[at]<0){links[at]=data.length;data.push(key);left.push(-1);right.push(-1);break;}at=links[at];}}return {keys:data,left,right};}
const trees=[tree([]),tree([0]),tree([MIN]),tree([MAX]),tree([0,MIN,MAX,-7,7]),tree([7,3,9,1,5,8,11,4,6]),tree(Array.from({length:256},(_,i)=>i-128)),tree(Array.from({length:256},(_,i)=>127-i))];
for(let i=0;i<18;i++)trees.push(tree(shuffle(uniq(Array.from({length:4+rand(20)},()=>rand(61)-30)))));
const treeGlobals=trees.map((t,i)=>`static const int dss_keys_${i}[]=${arr(t.keys)},dss_left_${i}[]=${arr(t.left)},dss_right_${i}[]=${arr(t.right)};`).join('\n');
const layout=String.raw`
static void dss_layout(int*where,int n,int salt){for(int i=0;i<n;i++)where[i]=i+1;uint32_t state=0xa1f34795u+(uint32_t)n*31u+(uint32_t)salt;for(int i=n-1;i>0;i--){state=state*1664525u+1013904223u;int j=(int)(state%(uint32_t)(i+1)),x=where[i];where[i]=where[j];where[j]=x;}}
`;
const treeHelper=layout+String.raw`
typedef struct {BSTNode pool[258];int where[256];BSTNode*root;} DSS_Tree;
static void dss_tree(DSS_Tree*x,const int*keys,const int*left,const int*right,int n){dss_layout(x->where,n,19);x->pool[0]=(BSTNode){918273,NULL,NULL};x->pool[n+1]=(BSTNode){-728193,NULL,NULL};for(int i=0;i<n;i++)x->pool[x->where[i]]=(BSTNode){keys[i],left[i]<0?NULL:x->pool+x->where[left[i]],right[i]<0?NULL:x->pool+x->where[right[i]]};x->root=n?x->pool+x->where[0]:NULL;}
static int dss_tree_same(const DSS_Tree*x,const int*keys,const int*left,const int*right,int n){int where[256];dss_layout(where,n,19);if(x->root!=(n?x->pool+where[0]:NULL)||x->pool[0].key!=918273||x->pool[0].left||x->pool[0].right||x->pool[n+1].key!=-728193||x->pool[n+1].left||x->pool[n+1].right)return 0;for(int i=0;i<n;i++){if(x->where[i]!=where[i])return 0;const BSTNode*p=x->pool+where[i];if(p->key!=keys[i]||p->left!=(left[i]<0?NULL:x->pool+where[left[i]])||p->right!=(right[i]<0?NULL:x->pool+where[right[i]]))return 0;}return 1;}
`;
const treeCall=(i,suffix)=>`dss_${suffix}(dss_keys_${i},dss_left_${i},dss_right_${i},${trees[i].keys.length}`;
specs.set(id(4),{types:dsSearchTypes.bst,helpers:treeGlobals+treeHelper+String.raw`
static void dss_minimum(const int*keys,const int*left,const int*right,int n,int initial){DSS_Tree x;dss_tree(&x,keys,left,right,n);int out[3]={918273,initial,-728193};int result=bstMinimum(x.root,out+1);printf("%d %d %d %d\n",result,out[1],dss_tree_same(&x,keys,left,right,n),out[0]==918273&&out[2]==-728193);}
`,rows:trees.flatMap((t,i)=>[0,MIN,MAX].map(initial=>row(treeCall(i,'minimum')+`,${initial});`,[Number(t.keys.length>0),t.keys.length?Math.min(...t.keys):initial,1,1])))});
specs.set(id(5),{types:dsSearchTypes.bst,helpers:treeGlobals+treeHelper+String.raw`
static void dss_bst_range(const int*keys,const int*left,const int*right,int n,int L,int R,const int*expected,int count){DSS_Tree x;dss_tree(&x,keys,left,right,n);int out[258];for(int i=0;i<n+2;i++)out[i]=123456789;int result=bstRange(x.root,L,R,out+1),good=result==count;if(good)for(int i=0;i<count;i++)if(out[i+1]!=expected[i])good=0;printf("%d %d %d\n",good,dss_tree_same(&x,keys,left,right,n),out[0]==123456789&&out[n+1]==123456789);}
`,rows:trees.flatMap((t,i)=>[...ranges.slice(0,7),[t.keys[0]??0,t.keys[0]??0]].map(([L,R])=>{const e=t.keys.filter(v=>v>=L&&v<=R).sort((a,b)=>a-b);return row(`const int expected[]=${arr(e)};`+treeCall(i,'bst_range')+`,${L},${R},expected,${e.length});`);}))});

// Record allocation instances before releasing them. Driver checks liveness and
// saved integer addresses, never dereferences a freed allocation.
const allocation=String.raw`
#include <stdlib.h>
#include <stdint.h>
static uintptr_t dss_address[2048],dss_map_address[4096];static size_t dss_size[2048];static unsigned dss_used[4096],dss_epoch;static int dss_live[2048],dss_slot[4096],dss_count,dss_badfree,dss_fail;
static int dss_bucket(uintptr_t address){unsigned i=(unsigned)(((address>>3)*(uintptr_t)2654435761u)&4095u);while(dss_used[i]==dss_epoch&&dss_map_address[i]!=address)i=(i+1)&4095u;return (int)i;}
static int dss_find(uintptr_t address){int b=dss_bucket(address);return dss_used[b]==dss_epoch?dss_slot[b]:-1;}
static void dss_record(void*p,size_t size){if(p){if(dss_count>=2048)exit(88);uintptr_t address=(uintptr_t)p;int b=dss_bucket(address);dss_used[b]=dss_epoch;dss_map_address[b]=address;dss_slot[b]=dss_count;dss_address[dss_count]=address;dss_size[dss_count]=size;dss_live[dss_count++]=1;}}
static void*dss_malloc(size_t n){if(dss_fail)return NULL;void*p=malloc(n);dss_record(p,n);return p;}
static void*dss_calloc(size_t n,size_t size){if(dss_fail)return NULL;void*p=calloc(n,size);dss_record(p,n*size);return p;}
static void*dss_aligned_alloc(size_t a,size_t n){if(dss_fail)return NULL;void*p=aligned_alloc(a,n);dss_record(p,n);return p;}
static void dss_free(void*p){if(!p)return;int b=dss_bucket((uintptr_t)p),i=dss_used[b]==dss_epoch?dss_slot[b]:-1;if(i<0||!dss_live[i]){dss_badfree=1;return;}dss_live[i]=0;dss_slot[b]=-1;free(p);}
static void*dss_realloc(void*p,size_t n){if(dss_fail)return NULL;int b=p?dss_bucket((uintptr_t)p):-1,i=p&&dss_used[b]==dss_epoch?dss_slot[b]:-1;if(p&&(i<0||!dss_live[i])){dss_badfree=1;return NULL;}void*q=realloc(p,n);if(q||n==0){if(i>=0){dss_live[i]=0;dss_slot[b]=-1;}dss_record(q,n);}return q;}
static void dss_reset(void){dss_count=dss_badfree=dss_fail=0;dss_epoch++;}
static void dss_cleanup(void){dss_fail=0;for(int i=0;i<dss_count;i++)if(dss_live[i])dss_free((void*)dss_address[i]);}
#define malloc dss_malloc
#define calloc dss_calloc
#define aligned_alloc dss_aligned_alloc
#define realloc dss_realloc
#define free dss_free
`;
const insertCases=[];
for(let i=0;i<trees.length;i++){const t=trees[i];for(const key of uniq([MIN,MAX,0,-7,7,t.keys[0]??19,t.keys.at(-1)??-19]))for(const fail of [0,1])insertCases.push({i,key,fail,alias:(i+key%3+3)%3});}
specs.set(id(6),{types:dsSearchTypes.bst,allocation:true,helpers:treeGlobals+layout+String.raw`
static void dss_insert(const int*keys,const int*left,const int*right,int n,int key,int fail,int alias,int expected,int parent,int direction){
 dss_reset();BSTNode*nodes[256];int original[256],where[256];dss_layout(where,n,43);for(int j=0;j<n;j++){int logical=where[j]-1;nodes[logical]=malloc(sizeof(BSTNode));if(!nodes[logical])exit(90);original[logical]=dss_count-1;}
 for(int i=0;i<n;i++)*nodes[i]=(BSTNode){keys[i],left[i]<0?NULL:nodes[left[i]],right[i]<0?NULL:nodes[right[i]]};BSTNode*root=n?nodes[0]:NULL;BSTNode owner={918273,NULL,NULL};BSTNode**slot=&root;if(alias==1){owner.left=root;slot=&owner.left;}if(alias==2){owner.right=root;slot=&owner.right;}
 dss_fail=fail;int result=bstInsert(slot,key);dss_fail=0;int good=result==expected,identity=1,liveNew=0;BSTNode*added=NULL;
 for(int i=n;i<dss_count;i++)if(dss_live[i]){liveNew++;if(dss_size[i]>=sizeof(BSTNode))added=(BSTNode*)dss_address[i];}
 if(expected==1){if(liveNew!=1||!added)good=0;}else if(liveNew)good=0;
 for(int i=0;i<n;i++){if(!dss_live[original[i]]){identity=0;continue;}BSTNode*expectLeft=left[i]<0?NULL:nodes[left[i]],*expectRight=right[i]<0?NULL:nodes[right[i]];if(expected==1&&parent==i){if(direction==0)expectLeft=added;else expectRight=added;}if(nodes[i]->key!=keys[i]||nodes[i]->left!=expectLeft||nodes[i]->right!=expectRight)identity=0;}
 if(expected==1&&added&&(added->key!=key||added->left||added->right))good=0;
 BSTNode*expectedRoot=n?nodes[0]:expected==1?added:NULL;if(*slot!=expectedRoot)good=0;
 if(owner.key!=918273||(alias!=1&&owner.left)||(alias!=2&&owner.right)||(alias&&root!=(n?nodes[0]:NULL)))identity=0;
 printf("%d %d %d\n",good,identity,!dss_badfree);dss_cleanup();
}
`,rows:insertCases.map(({i,key,fail,alias})=>{const t=trees[i],exists=t.keys.includes(key),expected=exists?0:fail?-1:1;let parent=-1,direction=-1,at=t.keys.length?0:-1;while(at>=0){parent=at;direction=key<t.keys[at]?0:1;at=(direction?t.right:t.left)[at];}return row(treeCall(i,'insert')+`,${key},${fail},${alias},${expected},${parent},${direction});`);})});

const mod=(key,m)=>((key%m)+m)%m;
function hashInsert(table,key){const m=table.length,home=mod(key,m);let tomb=-1;for(let step=0;step<m;step++){const at=(home+step)%m;if(table[at].state===1){if(table[at].key===key)return 0;}else if(table[at].state===2){if(tomb<0)tomb=at;}else{table[tomb<0?at:tomb]={key,state:1};return 1;}}if(tomb<0)return -1;table[tomb]={key,state:1};return 1;}
function hashTable(m,values,deleted=[]){const t=Array.from({length:m},(_,i)=>({key:[MIN,MAX,0,-7,19][i%5],state:0}));for(const v of uniq(values))hashInsert(t,v);for(const key of deleted){const at=t.findIndex(s=>s.state===1&&s.key===key);if(at>=0)t[at].state=2;}return t;}
const tables=[];
for(const m of [1,2,3,5,7,16,64,256]){
 const collisions=Array.from({length:m},(_,i)=>m-1+i*m),normal=Array.from({length:m},(_,i)=>i-2*Math.floor(m/2));
 tables.push(hashTable(m,[]),hashTable(m,collisions),hashTable(m,collisions,collisions),hashTable(m,collisions,collisions.filter((_,i)=>i%2===0)),hashTable(m,collisions.slice(0,Math.ceil(m/2)),collisions.slice(0,2)),hashTable(m,normal),hashTable(m,[MIN,MAX,0,-7,7]));
}
for(let i=0;i<16;i++){const m=2+rand(19),v=uniq(Array.from({length:m},()=>rand(101)-50));tables.push(hashTable(m,v,v.filter(()=>rand(3)===0)));}
function validTable(t){for(let i=0;i<t.length;i++)if(t[i].state===1){const home=mod(t[i].key,t.length);let reached=false;for(let step=0;step<t.length;step++){const at=(home+step)%t.length;if(t[at].state===0)break;if(at===i){reached=true;break;}}if(!reached)throw Error('invalid probing fixture');}if(uniq(t.filter(s=>s.state===1).map(s=>s.key)).length!==t.filter(s=>s.state===1).length)throw Error('duplicate fixture');}
tables.forEach(validTable);
const slotC=t=>'{'+t.map(s=>`{${s.key},${s.state}}`).join(',')+'}';
const tableGlobals=tables.map((t,i)=>`static const SearchSlot dss_table_${i}[]=${slotC([...t,{key:MIN,state:1},{key:0,state:2},{key:MAX,state:0}])};`).join('\n');
const slotInput=String.raw`
static int dss_slots_same(const SearchSlot*a,const SearchSlot*v,int physical){if(a[0].state!=-91||a[0].key!=918273||a[physical+1].state!=-92||a[physical+1].key!=-728193)return 0;for(int i=0;i<physical;i++)if(a[i+1].key!=v[i].key||a[i+1].state!=v[i].state)return 0;return 1;}
static void dss_slots(SearchSlot*a,const SearchSlot*v,int physical){a[0]=(SearchSlot){918273,-91};a[physical+1]=(SearchSlot){-728193,-92};for(int i=0;i<physical;i++)a[i+1]=v[i];}
`;
const probingCases=[];
tables.forEach((t,i)=>{const present=t.filter(s=>s.state===1).map(s=>s.key),keys=uniq([MIN,MAX,0,-7,t.length-1,t.length*3-1,present[0]??13,present.at(-1)??-13]);for(const key of keys)probingCases.push({i,t,key});});
specs.set(id(7),{types:dsSearchTypes.slot,helpers:tableGlobals+slotInput+String.raw`
static void dss_find_key(const SearchSlot*v,int m,int key){SearchSlot table[261];dss_slots(table,v,m+3);int result=probingFind(table+1,m,key);printf("%d %d 1\n",result,dss_slots_same(table,v,m+3));}
`,rows:probingCases.map(({i,t,key})=>row(`dss_find_key(dss_table_${i},${t.length},${key});`,[t.findIndex(s=>s.state===1&&s.key===key),1,1]))});
specs.set(id(8),{types:dsSearchTypes.slot,helpers:tableGlobals+slotInput+String.raw`
static void dss_insert_key(const SearchSlot*v,int m,int key,int expected,const unsigned char*allowed){
 SearchSlot table[261];dss_slots(table,v,m+3);int result=probingInsert(table+1,m,key),good=result==expected,added=-1,changes=0;
 for(int i=0;i<m;i++){SearchSlot before=v[i],after=table[i+1];if(before.state==OCCUPIED){if(after.state!=OCCUPIED||after.key!=before.key)good=0;}else if(after.state!=before.state){changes++;added=i;if(after.state!=OCCUPIED||after.key!=key)good=0;}}
 if(expected==1){if(changes!=1||added<0||!allowed[added])good=0;}else if(changes)good=0;
 int tail=table[0].state==-91&&table[0].key==918273&&table[m+4].state==-92&&table[m+4].key==-728193;for(int i=m;i<m+3;i++)if(table[i+1].key!=v[i].key||table[i+1].state!=v[i].state)tail=0;
 printf("%d 1 %d\n",good,tail);
}
`,rows:probingCases.map(({i,t,key})=>{const exists=t.some(s=>s.state===1&&s.key===key),allowed=Array(t.length).fill(0);for(let step=0;step<t.length;step++){const at=(mod(key,t.length)+step)%t.length;if(t[at].state!==1)allowed[at]=1;if(t[at].state===0)break;}const expected=exists?0:allowed.some(Boolean)?1:-1;return row(`const unsigned char allowed[]=${arr(allowed)};dss_insert_key(dss_table_${i},${t.length},${key},${expected},allowed);`);})});

const chains=[];
for(const m of [1,2,7,64]){
 chains.push({m,keys:[]},{m,keys:[0]},{m,keys:[MIN,MAX,-7,7,0]},
 {m,keys:Array.from({length:12},(_,i)=>(i-6)*m+(m-1))});
}
chains.push({m:1,keys:Array.from({length:256},(_,i)=>i-128)},{m:64,keys:Array.from({length:256},(_,i)=>(i-128)*64+63)});
for(let i=0;i<15;i++)chains.push({m:1+rand(16),keys:uniq(Array.from({length:rand(30)},()=>rand(101)-50))});
const chainRows=[];
chains.forEach(({m,keys},i)=>{const bucket=keys.map(v=>mod(v,m)),heads=Array(m).fill(-1),next=Array(keys.length).fill(-1);for(const at of shuffle(keys.map((_,j)=>j))){next[at]=heads[bucket[at]];heads[bucket[at]]=at;}const boundary=[];const head=heads.find(j=>j>=0&&next[j]>=0);if(head!==undefined){const order=[];for(let j=head;j>=0;j=next[j])order.push(j);boundary.push(keys[head],keys[order.at(-1)],keys[order[Math.floor(order.length/2)]]);}const queries=uniq([MIN,MAX,0,-7,7,keys[0]??11,keys.at(-1)??-11,keys[Math.floor(keys.length/2)]??19,...boundary]);for(const key of queries){const remove=keys.indexOf(key),after=next.slice(),eh=heads.slice();if(remove>=0){const b=bucket[remove];if(eh[b]===remove)eh[b]=next[remove];else{const p=after.findIndex((q,j)=>j!==remove&&q===remove);if(p<0)throw Error('missing predecessor');after[p]=next[remove];}}chainRows.push(row(`const int keys[]=${arr(keys)},next[]=${arr(next)},heads[]=${arr(heads)},expectedNext[]=${arr(after)},expectedHeads[]=${arr(eh)};dss_erase(keys,next,heads,${keys.length},${m},${key},${remove},expectedNext,expectedHeads,${i%3});`));}});
specs.set(id(9),{types:dsSearchTypes.chain,allocation:true,helpers:layout+String.raw`
static void dss_erase(const int*keys,const int*next,const int*heads,int n,int m,int key,int removed,const int*expectedNext,const int*expectedHeads,int tailMode){
 dss_reset();HashNode*nodes[256];int original[256],where[256];dss_layout(where,n,71);for(int j=0;j<n;j++){int logical=where[j]-1;nodes[logical]=malloc(sizeof(HashNode));if(!nodes[logical])exit(90);original[logical]=dss_count-1;}
 for(int i=0;i<n;i++)*nodes[i]=(HashNode){keys[i],next[i]<0?NULL:nodes[next[i]]};HashNode outside={-2147483648,NULL};HashNode*table[68];table[0]=&outside;for(int b=0;b<m;b++)table[b+1]=heads[b]<0?NULL:nodes[heads[b]];int alias=n?n-1:-1;if(alias==removed)alias=n>1?(removed+1)%n:-1;table[m+1]=tailMode==0?NULL:tailMode==1?&outside:(alias>=0?nodes[alias]:&outside);table[m+2]=&outside;HashNode*tail=table[m+1];
 int result=chainErase(table+1,m,key),good=result==(removed>=0),identity=1,released=removed<0?1:!dss_live[original[removed]];
 for(int i=0;i<n;i++)if(i!=removed){if(!dss_live[original[i]]){identity=0;continue;}if(nodes[i]->key!=keys[i]||nodes[i]->next!=(expectedNext[i]<0?NULL:nodes[expectedNext[i]]))identity=0;}
 for(int b=0;b<m;b++)if(table[b+1]!=(expectedHeads[b]<0?NULL:nodes[expectedHeads[b]]))good=0;
 for(int i=n;i<dss_count;i++)if(dss_live[i])good=0;
 int guard=table[0]==&outside&&table[m+1]==tail&&table[m+2]==&outside&&outside.key==-2147483648&&outside.next==NULL;
 printf("%d %d %d %d\n",good,identity,released,guard&&!dss_badfree);dss_cleanup();
}
`,rows:chainRows.map(r=>({...r,out:['1','1','1','1']}))});

function trie(words){const child=[Array(26).fill(-1)],terminal=[0];for(const word of words){let at=0;for(const c of word){const code=c.charCodeAt(0)-97;if(child[at][code]<0){child[at][code]=child.length;child.push(Array(26).fill(-1));terminal.push(0);}at=child[at][code];}terminal[at]=[1,-7,2,MIN][at%4];}const parent=Array(child.length).fill(-1),letter=Array(child.length).fill(-1);child.forEach((a,u)=>a.forEach((v,c)=>{if(v>=0){parent[v]=u;letter[v]=c;}}));return {words:new Set(words),parent,letter,terminal};}
const dictionaries=[null,trie([]),trie(['']),trie(['a']),trie(['abc']),trie(['a','abc','abz','az','zoo']),trie(['','b','be','bee','beer','been']),trie(['z','a','az','za','zzz']),trie(['a'.repeat(128),'b'.repeat(128),'c'.repeat(128),'d'.repeat(127)]),trie(['a'.repeat(511)])];
dictionaries[2].terminal[0]=-7;dictionaries[6].terminal[0]=MIN;
for(let i=0;i<15;i++)dictionaries.push(trie(uniq(Array.from({length:3+rand(10)},()=>Array.from({length:rand(9)},()=>String.fromCharCode(97+rand(26))).join('')))));
const trieGlobals=dictionaries.map((t,i)=>t?`static const int dss_parent_${i}[]=${arr(t.parent)},dss_letter_${i}[]=${arr(t.letter)},dss_terminal_${i}[]=${arr(t.terminal)};`:`static const int dss_parent_${i}[]={-1},dss_letter_${i}[]={-1},dss_terminal_${i}[]={0};`).join('\n');
const trieRows=[];
dictionaries.forEach((t,i)=>{const words=t?[...t.words]:[],queries=uniq(['','a','ab','abc','abcd','z','zz','x',...words.slice(0,3),...words.slice(0,3).map(w=>w.slice(0,-1)),...words.slice(0,2).map(w=>w+'x')]).filter(w=>w.length<=128);if(i===8)queries.push('d'.repeat(127),'d'.repeat(128));if(i===9)queries.push('a'.repeat(127),'a'.repeat(128));for(const word of queries){const bytes=[...Buffer.from(word,'ascii'),0,233,0,97];trieRows.push(row(`const unsigned char text[]=${arr(bytes)};dss_trie(${i},dss_parent_${i},dss_letter_${i},dss_terminal_${i},${t?.terminal.length||0},text,${bytes.length});`,[Number(t?.words.has(word)||false),1,1]));}});
specs.set(id(10),{types:dsSearchTypes.trie,helpers:trieGlobals+layout+String.raw`
static void dss_trie(int fixture,const int*parent,const int*letter,const int*terminal,int n,const unsigned char*text,int physical){
 static TrieNode pool[514];static int where[512],expected[512][26],cached=-1;
 if(cached!=fixture){cached=fixture;dss_layout(where,n,103);for(int i=0;i<n;i++)for(int c=0;c<26;c++)expected[i][c]=-1;for(int i=1;i<n;i++)expected[parent[i]][letter[i]]=i;
 pool[0].terminal=918273;pool[n+1].terminal=-728193;for(int c=0;c<26;c++)pool[0].child[c]=pool[n+1].child[c]=NULL;
 for(int i=0;i<n;i++){TrieNode*p=pool+where[i];p->terminal=terminal[i];for(int c=0;c<26;c++)p->child[c]=expected[i][c]<0?NULL:pool+where[expected[i][c]];}}
 unsigned char key[136];key[0]=219;key[physical+1]=231;for(int i=0;i<physical;i++)key[i+1]=text[i];int result=trieContains(n?pool+where[0]:NULL,(const char*)key+1),same=1;
 for(int i=0;i<n;i++){const TrieNode*p=pool+where[i];if(p->terminal!=terminal[i])same=0;for(int c=0;c<26;c++)if(p->child[c]!=(expected[i][c]<0?NULL:pool+where[expected[i][c]]))same=0;}
 for(int i=0;i<physical;i++)if(key[i+1]!=text[i])same=0;
 int guard=key[0]==219&&key[physical+1]==231&&pool[0].terminal==918273&&pool[n+1].terminal==-728193;for(int c=0;c<26;c++)if(pool[0].child[c]||pool[n+1].child[c])guard=0;
 printf("%d %d %d\n",result,same,guard);
}
`,rows:trieRows});

// Reference and equivalent/fault source inventories stay server-only.
export const dsSearchContractIds=Array.from({length:10},(_,i)=>id(i+1));
export const dsSearchReferenceSources=Object.fromEntries(dsSearchContractIds.map(key=>[key,dsSearchTaskGuides[key].solution]));
export function dsSearchContract(key){const s=specs.get(key);if(!s)return null;const prelude='#include <stddef.h>\n'+s.types+'\n'+(s.allocation?allocation:'')+'\n';const harness='\n#include <stdio.h>\n#include <stdint.h>\n'+s.helpers+'\n'+s.rows.map((r,i)=>`static void dss_case_${i}(void){${r.body}}`).join('\n')+'\nint main(void){\n'+s.rows.map((_,i)=>`dss_case_${i}();`).join('\n')+'\nreturn 0;}';const groups=s.rows.map(r=>r.out);return {prelude,harness,groups,expected:groups.flat()};}
const ref=n=>dsSearchReferenceSources[id(n)];
const change=(n,from,to)=>{if(!ref(n).includes(from))throw Error('Missing mutation '+n+':'+from);return ref(n).replace(from,to);};
const samples=a=>a.map(([n,label,source])=>({id:id(n),label,source}));
export const dsSearchEquivalentSources=samples([
 [1,'closed-interval-answer',String.raw`int lowerBound(const int a[],int n,int key){int low=0,high=n-1,answer=n;while(low<=high){int mid=low+(high-low)/2;if(a[mid]>=key){answer=mid;high=mid-1;}else low=mid+1;}return answer;}`],
 [2,'binary-first-and-last',String.raw`int countInRange(const int a[],int n,int L,int R){if(L>R)return 0;int low=0,high=n-1,first=n,last=-1;while(low<=high){int mid=low+(high-low)/2;if(a[mid]>=L){first=mid;high=mid-1;}else low=mid+1;}low=0;high=n-1;while(low<=high){int mid=low+(high-low)/2;if(a[mid]<=R){last=mid;low=mid+1;}else high=mid-1;}return last<first?0:last-first+1;}`],
 [3,'last-common-key',String.raw`int commonKey(const int a[],int n,const int b[],int m,int*out){int i=n-1,j=m-1;while(i>=0&&j>=0){if(a[i]>b[j])i--;else if(a[i]<b[j])j--;else{*out=a[i];return 1;}}return 0;}`],
 [4,'iterative-cursor',String.raw`/* O(h)时间与O(1)辅助，退化链的h可为n。 */int bstMinimum(const BSTNode*p,int*out){if(!p)return 0;const BSTNode*previous=NULL;while(p){previous=p;p=p->left;}*out=previous->key;return 1;}`],
 [5,'iterative-pruned-inorder',String.raw`int bstRange(const BSTNode*p,int L,int R,int out[]){if(L>R)return 0;const BSTNode*stack[256];int top=0,count=0;while(p||top){while(p){if(p->key<L){p=p->right;continue;}stack[top++]=p;p=p->left;}if(!top)break;p=stack[--top];if(p->key>R)break;out[count++]=p->key;p=p->right;}return count;}`],
 [6,'parent-cursor-calloc',String.raw`#include <stdlib.h>
int bstInsert(BSTNode**root,int key){BSTNode*p=*root,*parent=NULL;while(p){parent=p;if(key<p->key)p=p->left;else if(key>p->key)p=p->right;else return 0;}BSTNode*added=calloc(1,sizeof *added);if(!added)return -1;*added=(BSTNode){key,NULL,NULL};if(!parent)*root=added;else if(key<parent->key)parent->left=added;else parent->right=added;return 1;}`],
 [7,'bounded-offset-probes',String.raw`int probingFind(const SearchSlot table[],int m,int key){int home=key%m;if(home<0)home+=m;for(int i=0;i<m;i++){int at=(home+i)%m;if(table[at].state==EMPTY)break;if(table[at].state==OCCUPIED&&table[at].key==key)return at;}return -1;}`],
 [8,'last-tombstone-choice',change(8,'if(deleted<0)deleted=at;','deleted=at;')],
 [9,'explicit-previous-node',String.raw`#include <stdlib.h>
int chainErase(HashNode*buckets[],int m,int key){int bucket=key%m;if(bucket<0)bucket+=m;HashNode*previous=NULL,*p=buckets[bucket];while(p&&p->key!=key){previous=p;p=p->next;}if(!p)return 0;if(previous)previous->next=p->next;else buckets[bucket]=p->next;free(p);return 1;}`],
 [10,'advancing-key-pointer',String.raw`int trieContains(const TrieNode*p,const char*key){while(p&&*key){p=p->child[(unsigned char)*key-'a'];key++;}return p&&p->terminal!=0;}`]
]);
export const dsSearchWrongSources=samples([
 [1,'upper-instead-of-lower',change(1,'a[mid]<key','a[mid]<=key')],
 [1,'minus-one-on-no-bound',change(1,'return l;','return l==n?-1:l;')],
 [1,'last-logical-element-omitted',change(1,'int l=0,r=n;','int l=0,r=n?n-1:0;')],
 [2,'left-boundary-excluded',change(2,'a[mid]<L','a[mid]<=L')],
 [2,'right-boundary-excluded',change(2,'a[mid]<=R','a[mid]<R')],
 [2,'counts-distinct-instead-of-records',String.raw`int countInRange(const int a[],int n,int L,int R){int count=0;for(int i=0;i<n;i++)if(a[i]>=L&&a[i]<=R&&(i==0||a[i]!=a[i-1]))count++;return count;}`],
 [3,'zero-key-reported-as-failure',change(3,'*out=a[i];return 1;','*out=a[i];return a[i]!=0;')],
 [3,'advance-larger-side',change(3,'if(a[i]<b[j])i++;else if(a[i]>b[j])j++;','if(a[i]<b[j])j++;else if(a[i]>b[j])i++;')],
 [3,'failure-overwrites-output',change(3,'return 0;}','*out=0;return 0;}')],
 [4,'largest-key-instead',change(4,'while(root->left)root=root->left;','while(root->right)root=root->right;')],
 [4,'root-key-only',change(4,'while(root->left)root=root->left;','')],
 [4,'zero-key-used-as-failure',change(4,'return 1;}','return *out!=0;}')],
 [5,'open-instead-of-closed-range',change(5,'p->key>=L&&p->key<=R','p->key>L&&p->key<R')],
 [5,'reverse-key-order',change(5,'if(p->key>L)n=rangeVisit(p->left,L,R,out,n);if(p->key>=L&&p->key<=R)out[n++]=p->key;if(p->key<R)n=rangeVisit(p->right,L,R,out,n);','if(p->key<R)n=rangeVisit(p->right,L,R,out,n);if(p->key>=L&&p->key<=R)out[n++]=p->key;if(p->key>L)n=rangeVisit(p->left,L,R,out,n);')],
 [5,'prunes-the-wrong-subtree',change(5,'if(!p)return n;','if(!p||p->key<L||p->key>R)return n;')],
 [5,'inverted-range-returns-tree-size','static int wrongRangeSize(const BSTNode*p){return p?1+wrongRangeSize(p->left)+wrongRangeSize(p->right):0;}\n'+change(5,'if(L>R)return 0;','if(L>R)return wrongRangeSize(root);')],
 [6,'failure-clears-root',change(6,'if(!p)return -1;','if(!p){*root=NULL;return -1;}')],
 [6,'duplicate-replaces-existing-node',change(6,'else return 0;','else break;')],
 [6,'empty-root-not-updated',change(6,'*slot=p;return 1;','if(*root)*slot=p;return 1;')],
 [7,'tombstone-stops-search',change(7,'table[at].state==EMPTY','table[at].state!=OCCUPIED')],
 [7,'wrong-negative-remainder',change(7,'if(at<0)at+=m;','if(at<0)at=-at;')],
 [7,'no-full-cycle-bound',change(7,'for(int step=0;step<m;step++)','for(;;)')],
 [8,'insert-at-first-tombstone-before-duplicate-check',change(8,'if(deleted<0)deleted=at;','table[at]=(SearchSlot){key,OCCUPIED};return 1;')],
 [8,'never-reuses-tombstones',change(8,'if(deleted<0)deleted=at;','(void)deleted;')],
 [8,'omits-last-probe',change(8,'step<m;step++','step<m-1;step++')],
 [8,'wrong-negative-remainder',change(8,'if(at<0)at+=m;','if(at<0)at=-at;')],
 [9,'bucket-head-not-deleted',change(9,'HashNode**slot=buckets+at;','if(buckets[at]&&buckets[at]->key==key)return 0;HashNode**slot=buckets+at;')],
 [9,'unlinked-but-not-freed',change(9,'free(p);return 1;','return 1;')],
 [9,'missing-key-returns-success',change(9,'return 0;}','return 1;}')],
 [10,'path-is-treated-as-word',change(10,'return root->terminal!=0;','return 1;')],
 [10,'empty-string-always-missing',change(10,'if(!root)return 0;','if(!root||!key[0])return 0;')],
 [10,'terminal-must-equal-one',change(10,'return root->terminal!=0;','return root->terminal==1;')]
]);
