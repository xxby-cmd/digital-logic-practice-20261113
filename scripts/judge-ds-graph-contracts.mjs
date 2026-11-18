// Server-only graph drivers and independent JavaScript oracles.
import {dsGraphTaskGuides,dsGraphTypes} from '../ds-graph-task-guides.js';
const id=n=>`P4-structures-7-D-${String(n).padStart(3,'0')}`;
const INF=4000000000000000000n;
const arr=a=>`{${a.length?a.join(','):0}}`;
const ll=x=>typeof x==='string'?(x==='DSG_INF'?'4000000000000000000LL':x):BigInt(x)===INF?'DSG_INF':BigInt(x)+'LL';
const larr=a=>arr(a.map(ll));
const edgesC=a=>`{${a.length?a.map(e=>'{'+e[0]+','+e[1]+','+ll(e[2])+'}').join(','):'{0,0,0}'}}`;
const row=(body,out=[1,1,1])=>({body,out:out.map(String)});
let seed=20261119;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const ignored=[0,-7,11,'DSG_INF','9223372036854775807LL','(-9223372036854775807LL-1)'];
function graph(n,edges,undirected=false,weighted=false){
 const all=undirected?edges.flatMap(([u,v,w=0])=>[[u,v,w],[v,u,w]]):edges.map(([u,v,w=0])=>[u,v,w]);
 const rows=Array.from({length:n},()=>[]);for(const e of shuffle(all))rows[e[0]].push(e);
 const flat=rows.flat(),off=[0];for(const a of rows)off.push(off.at(-1)+a.length);
 return {n,edges:flat,off,to:flat.map(e=>e[1]),weight:flat.map((e,i)=>weighted?e[2]:ignored[(i+n)%ignored.length])};
}
const graphCall=(g,tail)=>`const int off[]=${arr(g.off)},to[]=${arr(g.to)};const long long weight[]=${larr(g.weight)};${tail}`;
function components(n,edges,removed=-1){
 const reach=Array.from({length:n},()=>[]);for(const [u,v]of edges)if(u!==removed&&v!==removed){reach[u].push(v);reach[v].push(u);}
 const seen=new Set(removed<0?[]:[removed]);let count=0;for(let s=0;s<n;s++)if(!seen.has(s)){count++;const stack=[s];seen.add(s);while(stack.length){const u=stack.pop();for(const v of reach[u])if(!seen.has(v)){seen.add(v);stack.push(v);}}}return count;
}
function bipartite(n,edges){
 // Parity union-find, independent of the submitted queue traversal.
 const p=Array.from({length:n},(_,i)=>i),parity=Array(n).fill(0);
 const find=x=>{let odd=0;while(p[x]!==x){odd^=parity[x];x=p[x];}return [x,odd];};
 for(const [u,v]of edges){const [a,x]=find(u),[b,y]=find(v);if(a===b){if(x===y)return 0;}else{p[a]=b;parity[a]=x^y^1;}}return 1;
}
function lexTopo(g){
 const selected=new Set(),out=[];while(out.length<g.n){let pick=-1;for(let v=0;v<g.n;v++)if(!selected.has(v)&&g.edges.every(([u,t])=>t!==v||selected.has(u))){pick=v;break;}if(pick<0)throw Error('non-DAG fixture');selected.add(pick);out.push(pick);}return out;
}
function forest(n,edges){
 // Dense Prim on every component: no edge sort or union-find oracle.
 const used=Array(n).fill(false),best=Array(n).fill(Infinity);let weight=0,k=0;
 for(let start=0;start<n;start++)if(!used[start]){best[start]=0;let root=true;for(;;){let v=-1;for(let u=0;u<n;u++)if(!used[u]&&best[u]!==Infinity&&(v<0||best[u]<best[v]))v=u;if(v<0)break;used[v]=true;weight+=best[v];if(!root)k++;root=false;for(const [a,b,w]of edges){if(a===b)continue;const other=a===v?b:b===v?a:-1;if(other>=0&&!used[other]&&w<best[other])best[other]=w;}}}return {weight,k};
}
function reachableNegative(n,edges,s){
 // All-pairs closure detects a reachable negative diagonal, not BF rounds.
 const d=Array.from({length:n},(_,u)=>Array.from({length:n},(_,v)=>u===v?0n:INF));
 for(const [u,v,w]of edges)if(BigInt(w)<d[u][v])d[u][v]=BigInt(w);
 for(let k=0;k<n;k++)for(let u=0;u<n;u++)for(let v=0;v<n;v++)if(d[u][k]!==INF&&d[k][v]!==INF&&d[u][k]+d[k][v]<d[u][v])d[u][v]=d[u][k]+d[k][v];
 return Number(d[s].some((value,k)=>value!==INF&&d[k][k]<0));
}
function shortest(n,a){
 // Snapshot Bellman-Ford per source, deliberately independent of Floyd stages.
 const edges=[];for(let u=0;u<n;u++)for(let v=0;v<n;v++)if(a[u*n+v]!==INF)edges.push([u,v,a[u*n+v]]);
 const answer=[];for(let s=0;s<n;s++){let d=Array(n).fill(INF);d[s]=0n;for(let round=0;round<n-1;round++){const next=d.slice();for(const [u,v,w]of edges)if(d[u]!==INF&&d[u]+w<next[v])next[v]=d[u]+w;d=next;}answer.push(...d);}return answer;
}
function activity(g,s,t){
 const from=Array(g.n).fill(-1n),to=Array(g.n).fill(-1n);from[s]=0n;to[t]=0n;
 for(let round=0;round<g.n;round++){const f=from.slice(),b=to.slice();for(const [u,v,w]of g.edges){if(from[u]>=0n&&from[u]+BigInt(w)>f[v])f[v]=from[u]+BigInt(w);if(to[v]>=0n&&to[v]+BigInt(w)>b[u])b[u]=to[v]+BigInt(w);}from.splice(0,g.n,...f);to.splice(0,g.n,...b);}
 if(from.some(x=>x<0n)||to.some(x=>x<0n))throw Error('invalid AOE fixture');
 return {duration:from[t],flags:g.edges.map(([u,v,w])=>Number(from[u]+BigInt(w)+to[v]===from[t]))};
}
const graphInput=String.raw`
typedef struct {Graph g;GArc pool[1026];const GArc*heads[35];int where[1024];} DSG_Input;
static void dsg_layout(int where[],int n,int m){
 for(int q=0;q<m;q++)where[q]=q+1;uint32_t state=0x95ef27adu+(uint32_t)n*31u+(uint32_t)m;
 for(int q=m-1;q>0;q--){state=state*1664525u+1013904223u;int k=(int)(state%(uint32_t)(q+1)),x=where[q];where[q]=where[k];where[k]=x;}
}
static void dsg_make(DSG_Input*x,int n,const int*off,const int*to,const long long*w){
 int m=off[n];x->g=(Graph){n,x->heads+1};dsg_layout(x->where,n,m);
 for(int i=0;i<n+3;i++)x->heads[i]=x->pool;
 x->pool[0]=(GArc){-917,9812345670123LL,NULL};x->pool[m+1]=(GArc){-918,-9812345670123LL,NULL};
 for(int u=0;u<n;u++){x->heads[u+1]=off[u]==off[u+1]?NULL:x->pool+x->where[off[u]];for(int q=off[u];q<off[u+1];q++)x->pool[x->where[q]]=(GArc){to[q],w[q],q+1<off[u+1]?x->pool+x->where[q+1]:NULL};}
}
static int dsg_same(const DSG_Input*x,int n,const int*off,const int*to,const long long*w){
 int m=off[n],where[1024];dsg_layout(where,n,m);for(int q=0;q<m;q++)if(x->where[q]!=where[q])return 0;if(x->g.n!=n||x->g.head!=x->heads+1||x->heads[0]!=x->pool||x->heads[n+1]!=x->pool||x->heads[n+2]!=x->pool)return 0;
 if(x->pool[0].to!=-917||x->pool[0].weight!=9812345670123LL||x->pool[0].next!=NULL||x->pool[m+1].to!=-918||x->pool[m+1].weight!=-9812345670123LL||x->pool[m+1].next!=NULL)return 0;
 for(int u=0;u<n;u++){const GArc*head=off[u]==off[u+1]?NULL:x->pool+where[off[u]];if(x->heads[u+1]!=head)return 0;for(int q=off[u];q<off[u+1];q++){const GArc*p=x->pool+where[q],*next=q+1<off[u+1]?x->pool+where[q+1]:NULL;if(p->to!=to[q]||p->weight!=w[q]||p->next!=next)return 0;}}return 1;
}
`;
const edgeInput=String.raw`
static int dsg_edge_same(GEdge a,GEdge b){return a.u==b.u&&a.v==b.v&&a.weight==b.weight;}
static int dsg_edges_readonly(const GEdge*a,const GEdge*v,int physical){for(int i=0;i<physical;i++)if(!dsg_edge_same(a[i+1],v[i]))return 0;return a[0].u==-917&&a[0].v==-918&&a[0].weight==9812345670123LL&&dsg_edge_same(a[0],a[physical+1]);}
`;
const specs=new Map();
const small=[];
for(let n=0;n<=4;n++){const possible=[];for(let u=0;u<n;u++)for(let v=u+1;v<n;v++)possible.push([u,v,0]);for(let mask=0;mask<2**possible.length;mask++)small.push({n,edges:possible.filter((_,i)=>mask&(1<<i))});}
const undirectedMore=[
 {n:5,edges:[[1,2],[2,3],[3,1]]},
 {n:6,edges:[[0,1],[1,2],[2,0],[2,3],[3,4],[4,5],[5,3]]},
 {n:7,edges:[[1,2],[2,3],[2,4],[5,6]]},
 {n:32,edges:Array.from({length:31},(_,i)=>[i,i+1])},
 {n:32,edges:Array.from({length:31},(_,i)=>[0,i+1])},
 {n:32,edges:Array.from({length:32},(_,i)=>[i,(i+1)%32])},
 {n:32,edges:Array.from({length:32},(_,u)=>Array.from({length:31-u},(_,i)=>[u,u+i+1])).flat()},
 {n:32,edges:[]},
 {n:32,edges:Array.from({length:20},(_,i)=>[i+10,i+11])}
];
const undirectedCases=[...small,...undirectedMore].map(({n,edges})=>graph(n,edges,true));
const componentCases=[...undirectedCases,graph(3,[[0,0],[0,1],[0,1],[2,2]],true),graph(2,Array.from({length:512},()=>[0,1]),true),graph(32,Array.from({length:512},(_,i)=>[i%32,i%32]),true)];
specs.set(id(1),{types:dsGraphTypes.graph,helpers:graphInput+String.raw`
static void dsg_components(int n,const int*off,const int*to,const long long*w){DSG_Input x;dsg_make(&x,n,off,to,w);int answer=countComponents(&x.g);printf("%d %d 1\n",answer,dsg_same(&x,n,off,to,w));}
`,rows:componentCases.map(g=>row(graphCall(g,`dsg_components(${g.n},off,to,weight);`),[components(g.n,g.edges),1,1]))});

const matrices=[];
for(let n=0;n<=2;n++)for(let mask=0;mask<2**(n*n);mask++)matrices.push({n,a:Array.from({length:n*n},(_,p)=>(mask&(1<<p))?BigInt([-7,0,11,1000000000][p%4]):INF)});
for(const n of [3,4,7,16,32])for(let mode=0;mode<3;mode++)matrices.push({n,a:Array.from({length:n*n},(_,p)=>mode===0?INF:mode===1?(p%(n+1)===0?0n:INF):BigInt([-1000000000,0,7,1000000000][p%4]))});
for(let k=0;k<12;k++){const n=3+rand(6);matrices.push({n,a:Array.from({length:n*n},()=>rand(3)?INF:BigInt(rand(13)-6))});}
specs.set(id(2),{types:dsGraphTypes.graph+'\n'+dsGraphTypes.infinity,helpers:String.raw`
static int dsg_pool_index(const GArc*p,const GArc*base,int m){uintptr_t address=(uintptr_t)p,start=(uintptr_t)base;if(address<start||address-start>=(uintptr_t)m*sizeof(GArc)||(address-start)%sizeof(GArc))return -1;return (int)((address-start)/sizeof(GArc));}
static void dsg_reverse(const long long*v,int n,int m){
 long long a[1030];int size=n*n;for(int i=0;i<size+3;i++)a[i+1]=v[i];a[0]=a[size+4]=9812345670123LL;
 GArc output[1026],guard={-917,9812345670123LL,NULL};output[0]=output[m+1]=guard;for(int q=0;q<m;q++)output[q+1]=(GArc){-1,-2,NULL};
 GArc*heads[35];for(int u=0;u<n+3;u++)heads[u]=output;int answer=reverseAdjacency(a+1,n,output+1,heads+1),good=answer==m,count=0;unsigned char seen[1024]={0},entries[1024]={0};
 for(int vtx=0;vtx<n;vtx++){GArc*p=heads[vtx+1];while(p){int index=dsg_pool_index(p,output+1,m);if(index<0||seen[index]){good=0;break;}seen[index]=1;count++;int u=p->to;if(u<0||u>=n||v[u*n+vtx]==DSG_INF||entries[u*n+vtx]||p->weight!=v[u*n+vtx])good=0;else entries[u*n+vtx]=1;p=p->next;}}
 if(count!=m)good=0;int same=1;for(int i=0;i<size+3;i++)if(a[i+1]!=v[i])same=0;
 int guardOK=a[0]==9812345670123LL&&a[size+4]==9812345670123LL&&heads[0]==output&&heads[n+1]==output&&heads[n+2]==output;
 guardOK=guardOK&&output[0].to==guard.to&&output[0].weight==guard.weight&&output[0].next==NULL&&output[m+1].to==guard.to&&output[m+1].weight==guard.weight&&output[m+1].next==NULL;
 printf("%d %d %d\n",good,same,guardOK);
}
`,rows:matrices.map(({n,a})=>row(`const long long a[]=${larr([...a,-1000000000n,0n,1000000000n])};dsg_reverse(a,${n},${a.filter(x=>x!==INF).length});`))});

specs.set(id(3),{types:dsGraphTypes.graph,helpers:graphInput+String.raw`
static void dsg_bipartite(int n,const int*off,const int*to,const long long*w){DSG_Input x;dsg_make(&x,n,off,to,w);int answer=isBipartite(&x.g);printf("%d %d 1\n",answer,dsg_same(&x,n,off,to,w));}
`,rows:undirectedCases.map(g=>row(graphCall(g,`dsg_bipartite(${g.n},off,to,weight);`),[bipartite(g.n,g.edges),1,1]))});

const dags=[];
for(let n=0;n<=4;n++){const ranks=shuffle(Array.from({length:n},(_,i)=>i)),possible=[];for(let u=0;u<n;u++)for(let v=u+1;v<n;v++)possible.push([ranks[u],ranks[v]]);for(let mask=0;mask<2**possible.length;mask++)dags.push(graph(n,possible.filter((_,i)=>mask&(1<<i))));}
dags.push(graph(3,[[0,1]]),graph(4,[[3,1],[1,0],[3,2]]),graph(32,[]),graph(32,Array.from({length:31},(_,i)=>[31-i,30-i])),graph(32,Array.from({length:1024},(_,i)=>[i%31,i%31+1])));
for(let k=0;k<12;k++){const n=5+rand(12),order=shuffle(Array.from({length:n},(_,i)=>i)),edges=[];for(let u=0;u<n;u++)for(let v=u+1;v<n;v++)if(rand(4)===0)edges.push([order[u],order[v]]);dags.push(graph(n,edges));}
specs.set(id(4),{types:dsGraphTypes.graph,helpers:graphInput+String.raw`
static void dsg_topo(int n,const int*off,const int*to,const long long*w,const int*expected){DSG_Input x;dsg_make(&x,n,off,to,w);int order[34];for(int i=0;i<n+2;i++)order[i]=-8181;lexicographicTopo(&x.g,order+1);int good=1;for(int i=0;i<n;i++)if(order[i+1]!=expected[i])good=0;printf("%d %d %d\n",good,dsg_same(&x,n,off,to,w),order[0]==-8181&&order[n+1]==-8181);}
`,rows:dags.map(g=>row(graphCall(g,`const int e[]=${arr(lexTopo(g))};dsg_topo(${g.n},off,to,weight,e);`)))});

const weighted=[];
for(const {n,edges}of [...small,...undirectedMore.slice(0,3)])for(let mode=0;mode<2;mode++)weighted.push({n,edges:shuffle(edges.map(([u,v],i)=>[u,v,mode?[-7,0,3,-1][i%4]:1]))});
weighted.push({n:4,edges:[[0,1,1],[0,2,1],[0,3,1],[1,2,1],[1,3,1],[2,3,1]]},{n:5,edges:[[0,0,-1000000000],[1,2,-7],[1,2,-9],[3,4,0],[4,4,-9]]},{n:32,edges:Array.from({length:512},(_,i)=>[i%32,(i*13+7)%32,[-1000000000,1000000000,0,9,-11][i%5]])});
const edgeCases=weighted.map(x=>({...x,m:x.edges.length,physical:[...x.edges,...(x.n?[ [x.n-1,x.n-1,-1000000000],[0,x.n-1,1000000000] ]:[])]}));
for(const n of [1,3,32]){const full=Array.from({length:Math.min(40,n*3)},(_,i)=>[i%n,(i+1)%n,rand(19)-9]);for(const m of [0,1,Math.floor(full.length/2)])edgeCases.push({n,m,edges:full.slice(0,m),physical:full});}
specs.set(id(5),{types:dsGraphTypes.edge,helpers:edgeInput+String.raw`
static int dsg_root(int*p,int x){while(p[x]!=x)x=p[x];return x;}
static void dsg_forest(const GEdge*v,int physical,int n,int m,int expectedCount,long long expectedWeight){
 GEdge a[516],guard={-917,-918,9812345670123LL};a[0]=a[physical+1]=guard;for(int i=0;i<physical;i++)a[i+1]=v[i];
 int selected[34],capacity=n?n-1:0;for(int i=0;i<capacity+2;i++)selected[i]=-8181;int count=minimumForest(n,a+1,m,selected+1),good=count==expectedCount;int p[32],orig[32];for(int u=0;u<n;u++)p[u]=orig[u]=u;
 for(int i=0;i<m;i++){int u=dsg_root(orig,v[i].u),w=dsg_root(orig,v[i].v);orig[u]=w;}
 long long weight=0;unsigned char seen[512]={0};if(count<0||count>capacity)good=0;else for(int i=0;i<count;i++){int at=selected[i+1];if(at<0||at>=m||seen[at]){good=0;continue;}seen[at]=1;int u=dsg_root(p,v[at].u),w=dsg_root(p,v[at].v);if(u==w)good=0;else p[u]=w;weight+=v[at].weight;}
 for(int u=0;u<n;u++)for(int vtx=0;vtx<n;vtx++)if((dsg_root(orig,u)==dsg_root(orig,vtx))!=(dsg_root(p,u)==dsg_root(p,vtx)))good=0;
 if(weight!=expectedWeight)good=0;printf("%d %d %d\n",good,dsg_edges_readonly(a,v,physical),selected[0]==-8181&&selected[capacity+1]==-8181);
}
`,rows:edgeCases.map(({n,m,edges,physical})=>{const expected=forest(n,edges);return row(`const GEdge e[]=${edgesC(physical)};dsg_forest(e,${physical.length},${n},${m},${expected.k},${ll(expected.weight)});`);})});

const negative=[];
const neg=(n,edges,s)=>negative.push({n,edges,m:edges.length,s,physical:[...edges,[n-1,n-1,-7],[0,n-1,-1000000000]]});
for(const n of [1,2,4,32])for(const s of [...new Set([0,n-1])]){neg(n,[],s);neg(n,[[s,s,0]],s);neg(n,[[s,s,1]],s);neg(n,[[s,s,-1]],s);}
neg(4,[[1,2,-7],[2,1,6]],0);neg(4,[[0,1,0],[1,2,-7],[2,1,6]],0);neg(4,[[3,2,-1000000000],[2,1,1000000000],[1,3,0]],3);
for(const n of [2,3,7,32]){const chain=Array.from({length:n-1},(_,i)=>[i,i+1,-1000000000]).reverse();neg(n,chain,0);neg(n,[...chain,[n-1,0,1000000000]],0);}
for(let k=0;k<35;k++){const n=2+rand(7),edges=Array.from({length:rand(n*n+1)},()=>[rand(n),rand(n),rand(13)-6]);neg(n,edges,rand(n));}
const maximal=Array.from({length:512},(_,i)=>[i%32,(i*7+3)%32,(i%5)*100000000-200000000]);neg(32,maximal,17);
for(const m of [0,1,7,256])negative.push({n:32,m,s:11,edges:maximal.slice(0,m),physical:maximal});
specs.set(id(6),{types:dsGraphTypes.edge+'\n'+dsGraphTypes.infinity,helpers:edgeInput+String.raw`
static void dsg_negative(const GEdge*v,int physical,int n,int m,int s){GEdge a[516],guard={-917,-918,9812345670123LL};a[0]=a[physical+1]=guard;for(int i=0;i<physical;i++)a[i+1]=v[i];int answer=hasReachableNegativeCycle(n,a+1,m,s);printf("%d %d 1\n",answer,dsg_edges_readonly(a,v,physical));}
`,rows:negative.map(({n,m,s,edges,physical})=>row(`const GEdge e[]=${edgesC(physical)};dsg_negative(e,${physical.length},${n},${m},${s});`,[reachableNegative(n,edges,s),1,1]))});

const floyd=[];
const fm=(n,edges)=>{const a=Array(n*n).fill(INF);for(let u=0;u<n;u++)a[u*n+u]=0n;for(const [u,v,w]of edges)if(BigInt(w)<a[u*n+v])a[u*n+v]=BigInt(w);floyd.push({n,a});};
fm(0,[]);fm(1,[]);fm(2,[[0,1,0]]);fm(3,[[1,2,-7]]);fm(4,[[0,3,5],[0,2,1],[2,1,1],[1,3,1]]);fm(4,[[0,1,1],[0,2,1],[1,3,1],[2,3,1]]);
for(let k=0;k<40;k++){const n=2+rand(8),pot=Array.from({length:n},()=>rand(21)-10),edges=[];for(let u=0;u<n;u++)for(let v=0;v<n;v++)if(u!==v&&rand(4)===0)edges.push([u,v,rand(7)+pot[v]-pot[u]]);fm(n,edges);}
fm(32,Array.from({length:31},(_,i)=>[i,i+1,-1000000000]));fm(32,Array.from({length:31},(_,i)=>[31-i,30-i,1000000000]));fm(32,Array.from({length:32},(_,u)=>Array.from({length:31-u},(_,j)=>[u,u+j+1,0])).flat());
specs.set(id(7),{types:dsGraphTypes.infinity,helpers:String.raw`
static void dsg_floyd(const long long*v,int n,const long long*expected){
 int size=n*n;long long a[1030],dist[1026];int next[1026];a[0]=a[size+4]=9812345670123LL;for(int i=0;i<size+3;i++)a[i+1]=v[i];for(int i=0;i<size+2;i++){dist[i]=9812345670123LL;next[i]=-8181;}
 floydPaths(a+1,n,dist+1,next+1);int good=1,paths=1,same=1;
 for(int i=0;i<size;i++)if(dist[i+1]!=expected[i])good=0;
 for(int u=0;u<n;u++)for(int t=0;t<n;t++)if(u!=t&&expected[u*n+t]!=DSG_INF){int at=u,steps=0;unsigned char seen[32]={0};long long sum=0;while(at!=t){if(at<0||at>=n||seen[at]||steps++>=n){paths=0;break;}seen[at]=1;int vtx=next[at*n+t+1];if(vtx<0||vtx>=n||v[at*n+vtx]==DSG_INF){paths=0;break;}sum+=v[at*n+vtx];at=vtx;}if(at==t&&sum!=expected[u*n+t])paths=0;}
 for(int i=0;i<size+3;i++)if(a[i+1]!=v[i])same=0;
 int guard=a[0]==9812345670123LL&&a[size+4]==9812345670123LL&&dist[0]==9812345670123LL&&dist[size+1]==9812345670123LL&&next[0]==-8181&&next[size+1]==-8181;
 printf("%d %d %d %d\n",good,paths,same,guard);
}
`,rows:floyd.map(({n,a})=>row(`const long long a[]=${larr([...a,-1000000000n,0n,1000000000n])},e[]=${larr(shortest(n,a))};dsg_floyd(a,${n},e);`,[1,1,1,1]))});

const aoe=[];
const ag=(n,edges,s,t)=>aoe.push({g:graph(n,edges,false,true),s,t});
ag(1,[],0,0);ag(2,[[0,1,0]],0,1);ag(2,[[1,0,1000000000]],1,0);
ag(4,[[0,1,0],[0,2,0],[1,3,0],[2,3,0]],0,3);
ag(5,[[4,1,2],[4,2,5],[1,3,3],[2,3,0],[3,0,7],[1,0,1]],4,0);
for(let k=0;k<45;k++){const n=2+rand(12),rank=shuffle(Array.from({length:n},(_,i)=>i)),edges=[];for(let u=0;u<n-1;u++)edges.push([rank[u],rank[u+1],rand(5)]);for(let u=0;u<n;u++)for(let v=u+1;v<n;v++)if(rand(5)===0)edges.push([rank[u],rank[v],rand(8)]);ag(n,edges,rank[0],rank[n-1]);}
ag(32,Array.from({length:31},(_,i)=>[31-i,30-i,1000000000]),31,0);ag(32,Array.from({length:1024},(_,i)=>[i%31,i%31+1,0]),0,31);
specs.set(id(8),{types:dsGraphTypes.graph,helpers:graphInput+String.raw`
static void dsg_activity(int n,const int*off,const int*to,const long long*w,int s,int t,long long duration,const unsigned char*expected){DSG_Input x;dsg_make(&x,n,off,to,w);int m=off[n];unsigned char out[1026];for(int i=0;i<m+2;i++)out[i]=219;long long answer=criticalActivities(&x.g,s,t,out+1);int good=answer==duration;for(int i=0;i<m;i++)if(out[i+1]!=expected[i])good=0;printf("%d %d %d\n",good,dsg_same(&x,n,off,to,w),out[0]==219&&out[m+1]==219);}
`,rows:aoe.map(({g,s,t})=>{const e=activity(g,s,t);return row(graphCall(g,`const unsigned char e[]=${arr(e.flags)};dsg_activity(${g.n},off,to,weight,${s},${t},${ll(e.duration)},e);`));})});

specs.set(id(9),{types:dsGraphTypes.graph,helpers:graphInput+String.raw`
static void dsg_cuts(int n,const int*off,const int*to,const long long*w,const unsigned char*expected){DSG_Input x;dsg_make(&x,n,off,to,w);unsigned char out[34];for(int i=0;i<n+2;i++)out[i]=219;articulationPoints(&x.g,out+1);int good=1;for(int i=0;i<n;i++)if(out[i+1]!=expected[i])good=0;printf("%d %d %d\n",good,dsg_same(&x,n,off,to,w),out[0]==219&&out[n+1]==219);}
`,rows:undirectedCases.map(g=>{const original=components(g.n,g.edges),e=Array.from({length:g.n},(_,v)=>Number(components(g.n,g.edges,v)>original));return row(graphCall(g,`const unsigned char e[]=${arr(e)};dsg_cuts(${g.n},off,to,weight,e);`));})});

export const dsGraphContractIds=[...specs.keys()];
export const dsGraphReferenceSources=Object.fromEntries(dsGraphContractIds.map(key=>[key,dsGraphTaskGuides[key].solution]));
export function dsGraphContract(key){
 const s=specs.get(key);if(!s)return null;
 const prelude='#include <stddef.h>\n'+s.types+'\n';
 const harness='\n#include <stdio.h>\n#include <stdint.h>\n'+s.helpers+'\n'+s.rows.map((r,i)=>`static void dsg_case_${i}(void){${r.body}}`).join('\n')+'\nint main(void){\n'+s.rows.map((_,i)=>`dsg_case_${i}();`).join('\n')+'\nreturn 0;}';
 const groups=s.rows.map(r=>r.out);return {prelude,harness,groups,expected:groups.flat()};
}

// Actual equivalent implementations and fault families are exported for the
// dedicated serial C17 verification. They never enter the public page.
const ref=n=>dsGraphReferenceSources[id(n)];
const change=(n,from,to)=>{const s=ref(n);if(!s.includes(from))throw Error('missing mutation '+n+': '+from);return s.replace(from,to);};
const samples=rows=>rows.map(([n,label,source])=>({id:id(n),label,source}));
export const dsGraphEquivalentSources=samples([
 [1,'queue-per-component',String.raw`int countComponents(const Graph*g){int seen[32]={0},q[32],count=0;for(int s=0;s<g->n;s++)if(!seen[s]){count++;int f=0,r=0;q[r++]=s;seen[s]=1;while(f<r){int u=q[f++];for(const GArc*p=g->head[u];p;p=p->next)if(!seen[p->to]){seen[p->to]=1;q[r++]=p->to;}}}return count;}`],
 [2,'tail-lists-ascending-neighbors',String.raw`int reverseAdjacency(const long long a[],int n,GArc storage[],GArc*head[]){GArc*tail[32];for(int v=0;v<n;v++)head[v]=tail[v]=NULL;int used=0;for(int u=0;u<n;u++)for(int v=0;v<n;v++)if(a[u*n+v]!=DSG_INF){GArc*p=storage+used++;*p=(GArc){u,a[u*n+v],NULL};if(tail[v])tail[v]->next=p;else head[v]=p;tail[v]=p;}return used;}`],
 [3,'opposite-initial-color',change(3,'color[start]=0;','color[start]=1;')],
 [4,'reverse-initial-heap-insertion',change(4,'for(int u=0;u<g->n;u++)if(!in[u])','for(int u=g->n-1;u>=0;u--)if(!in[u])')],
 [5,'reverse-index-equal-weight-choice',change(5,'a<b);','a>b);')],
 [6,'snapshot-bellman-ford',String.raw`int hasReachableNegativeCycle(int n,const GEdge e[],int m,int s){long long d[32],next[32];for(int u=0;u<n;u++)d[u]=u==s?0:DSG_INF;for(int r=0;r<n-1;r++){int changed=0;for(int u=0;u<n;u++)next[u]=d[u];for(int i=0;i<m;i++)if(d[e[i].u]!=DSG_INF&&d[e[i].u]+e[i].weight<next[e[i].v]){next[e[i].v]=d[e[i].u]+e[i].weight;changed=1;}for(int u=0;u<n;u++)d[u]=next[u];if(!changed)break;}for(int i=0;i<m;i++)if(d[e[i].u]!=DSG_INF&&d[e[i].u]+e[i].weight<d[e[i].v])return 1;return 0;}`],
 [7,'reverse-floyd-stages-and-unscored-next',change(7,'for(int k=0;k<n;k++)','for(int k=n-1;k>=0;k--)').replace('next[i*n+j]=a[i*n+j]==DSG_INF?-1:j;','next[i*n+j]=a[i*n+j]==DSG_INF?777:j;')],
 [8,'dfs-topological-order',String.raw`static void visitA(const Graph*g,int u,int seen[],int order[],int*at){seen[u]=1;for(const GArc*p=g->head[u];p;p=p->next)if(!seen[p->to])visitA(g,p->to,seen,order,at);order[(*at)++]=u;}long long criticalActivities(const Graph*g,int s,int t,unsigned char critical[]){(void)s;int seen[32]={0},order[32],size=0;long long ve[32]={0},vl[32];for(int u=g->n-1;u>=0;u--)if(!seen[u])visitA(g,u,seen,order,&size);for(int k=size-1;k>=0;k--){int u=order[k];for(const GArc*p=g->head[u];p;p=p->next)if(ve[u]+p->weight>ve[p->to])ve[p->to]=ve[u]+p->weight;}long long duration=ve[t];for(int u=0;u<g->n;u++)vl[u]=duration;for(int k=0;k<size;k++){int u=order[k];for(const GArc*p=g->head[u];p;p=p->next)if(vl[p->to]-p->weight<vl[u])vl[u]=vl[p->to]-p->weight;}int k=0;for(int u=0;u<g->n;u++)for(const GArc*p=g->head[u];p;p=p->next)critical[k++]=(unsigned char)(ve[u]==vl[p->to]-p->weight);return duration;}`],
 [9,'reverse-dfs-root-order',change(9,'for(int u=0;u<g->n;u++)if(!dfn[u])','for(int u=g->n-1;u>=0;u--)if(!dfn[u])')]
]);
export const dsGraphWrongSources=samples([
 [1,'only-start-zero',change(1,'for(int u=0;u<g->n;u++)if(!seen[u])','for(int u=0;u<(g->n?1:0);u++)if(!seen[u])')],
 [1,'omit-isolated-vertices',change(1,'if(!seen[u]){count++;','if(!seen[u]&&g->head[u]){count++;')],
 [1,'weight-controls-unweighted-edge',change(1,'if(!seen[p->to])','if(p->weight>0&&!seen[p->to])')],
 [1,'assumes-descending-contiguous-slots',change(1,'p;p=p->next)if(!seen[p->to])','p;p=p->next?p-1:NULL)if(p->to>=0&&p->to<g->n&&!seen[p->to])')],
 [2,'outgoing-instead-of-incoming',change(2,'storage[used]=(GArc){u,a[u*n+v],head[v]};head[v]=storage+used++;','storage[used]=(GArc){v,a[u*n+v],head[u]};head[u]=storage+used++;')],
 [2,'zero-weight-treated-as-missing',change(2,'if(a[u*n+v]!=DSG_INF)','if(a[u*n+v]!=DSG_INF&&a[u*n+v]!=0)')],
 [2,'skip-directed-loops',change(2,'if(a[u*n+v]!=DSG_INF)','if(u!=v&&a[u*n+v]!=DSG_INF)')],
 [2,'wrong-direction-weight',change(2,'{u,a[u*n+v],head[v]}','{u,a[v*n+u],head[v]}')],
 [3,'only-first-component',change(3,'start<g->n;start++','start<(g->n?1:0);start++')],
 [3,'missing-color-conflict',change(3,'else if(color[v]==color[u])return 0;','')],
 [3,'label-parity-as-color',String.raw`int isBipartite(const Graph*g){for(int u=0;u<g->n;u++)for(const GArc*p=g->head[u];p;p=p->next)if((u%2)==(p->to%2))return 0;return 1;}`],
 [4,'fifo-instead-of-min-heap',String.raw`void lexicographicTopo(const Graph*g,int out[]){int in[32]={0},q[32],f=0,r=0,k=0;for(int u=0;u<g->n;u++)for(const GArc*p=g->head[u];p;p=p->next)in[p->to]++;for(int u=0;u<g->n;u++)if(!in[u])q[r++]=u;while(f<r){int u=q[f++];out[k++]=u;for(const GArc*p=g->head[u];p;p=p->next)if(--in[p->to]==0)q[r++]=p->to;}}`],
 [4,'outdegree-as-indegree',change(4,'in[p->to]++;','in[u]++;')],
 [4,'valid-nonlex-dfs',String.raw`static void topoVisit(const Graph*g,int u,int seen[],int out[],int*at){seen[u]=1;for(const GArc*p=g->head[u];p;p=p->next)if(!seen[p->to])topoVisit(g,p->to,seen,out,at);out[--*at]=u;}void lexicographicTopo(const Graph*g,int out[]){int seen[32]={0},at=g->n;for(int u=0;u<g->n;u++)if(!seen[u])topoVisit(g,u,seen,out,&at);}`],
 [5,'maximum-spanning-forest',change(5,'e[a].weight<e[b].weight','e[a].weight>e[b].weight')],
 [5,'assumes-connected-return-count',change(5,'return count;}','return n?n-1:0;}')],
 [5,'skip-nonpositive-edges',change(5,'int at=index[i],u=','int at=index[i];if(e[at].weight<=0)continue;int u=')],
 [5,'does-not-join-components',change(5,'if(rank[u]<rank[v])parent[u]=v;else{parent[v]=u;if(rank[u]==rank[v])rank[u]++;}','if(count==n-1)break;')],
 [6,'infinity-added-without-reachability',change(6,'dist[e[i].u]!=DSG_INF&&','')],
 [6,'negative-cycle-anywhere',change(6,'dist[u]=u==s?0:DSG_INF;','dist[u]=0;')],
 [6,'nth-minus-one-change-is-cycle',String.raw`int hasReachableNegativeCycle(int n,const GEdge e[],int m,int s){long long d[32];for(int u=0;u<n;u++)d[u]=u==s?0:DSG_INF;int changed=0;for(int r=0;r<n-1;r++){changed=0;for(int i=0;i<m;i++)if(d[e[i].u]!=DSG_INF&&d[e[i].u]+e[i].weight<d[e[i].v]){d[e[i].v]=d[e[i].u]+e[i].weight;changed=1;}if(!changed)break;}return changed;}`],
 [7,'wrong-floyd-stage-order',change(7,'for(int k=0;k<n;k++)for(int i=0;i<n;i++)for(int j=0;j<n;j++)','for(int i=0;i<n;i++)for(int j=0;j<n;j++)for(int k=0;k<n;k++)')],
 [7,'intermediate-is-not-first-hop',change(7,'next[i*n+j]=next[i*n+k];','next[i*n+j]=k;')],
 [7,'infinity-added-without-guards',change(7,'dist[i*n+k]!=DSG_INF&&dist[k*n+j]!=DSG_INF&&','')],
 [7,'tie-rewrites-create-self-next',change(7,'dist[i*n+k]+dist[k*n+j]<dist[i*n+j]','dist[i*n+k]+dist[k*n+j]<=dist[i*n+j]')],
 [8,'latest-times-start-at-zero',change(8,'vl[u]=duration;','vl[u]=0;')],
 [8,'only-one-critical-outgoing',change(8,'for(int u=0;u<g->n;u++)for(const GArc*p=g->head[u];p;p=p->next)critical[at++]=(unsigned char)(ve[u]==vl[p->to]-p->weight);','for(int u=0;u<g->n;u++){int used=0;for(const GArc*p=g->head[u];p;p=p->next){int key=ve[u]==vl[p->to]-p->weight;critical[at++]=(unsigned char)(key&&!used);if(key)used=1;}}')],
 [8,'omit-zero-duration-critical-arcs',change(8,'(ve[u]==vl[p->to]-p->weight);','(p->weight>0&&ve[u]==vl[p->to]-p->weight);')],
 [8,'numeric-order-is-not-topological',change(8,'int u=queue[front++];','int u=front++;')],
 [9,'root-one-child-marked',change(9,'children>1','children>0')],
 [9,'strict-low-comparison',change(9,'low[v]>=dfn[u]','low[v]>dfn[u]')],
 [9,'only-first-component',change(9,'for(int u=0;u<g->n;u++)if(!dfn[u])','for(int u=0;u<(g->n?1:0);u++)if(!dfn[u])')],
 [9,'degree-at-least-two',String.raw`void articulationPoints(const Graph*g,unsigned char cut[]){for(int u=0;u<g->n;u++){int degree=0;for(const GArc*p=g->head[u];p;p=p->next)degree++;cut[u]=(unsigned char)(degree>=2);}}`]
]);
