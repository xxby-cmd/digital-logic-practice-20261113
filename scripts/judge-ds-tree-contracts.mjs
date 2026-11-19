// Server-side cases and independent JS oracles for eight existing original tasks.
import {dsTreeTaskGuides,dsTreeTypes} from '../ds-tree-task-guides.js';
const id=n=>`P4-structures-6-D-${String(n).padStart(3,'0')}`;
const array=a=>`{${a.length?a.join(','):0}}`;
let seed=20261117;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const shuffle=a=>{const out=a.slice();for(let i=out.length-1;i>0;i--){const j=rand(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;};
const extreme=[-2147483648,2147483647,0,-1,1,-7,29,1000000000,-1000000000];
function shape(n,kind){
 const left=Array(n).fill(-1),right=Array(n).fill(-1);
 if(kind==='complete')for(let i=0;i<n;i++){if(i*2+1<n)left[i]=i*2+1;if(i*2+2<n)right[i]=i*2+2;}
 else if(kind==='left'||kind==='right'||kind==='zigzag')for(let i=0;i<n-1;i++)(kind==='left'||kind==='zigzag'&&i%2===0?left:right)[i]=i+1;
 else if(kind==='broom'){const trunk=Math.floor(n*.6);for(let i=0;i<trunk;i++)if(i+1<n)left[i]=i+1;for(let i=trunk;i<n;i++){const a=trunk+2*(i-trunk)+1,b=a+1;if(a<n)left[i]=a;if(b<n)right[i]=b;}}
 else if(n){const slots=[[0,0],[0,1]];for(let child=1;child<n;child++){const at=rand(slots.length),[parent,side]=slots.splice(at,1)[0];(side?right:left)[parent]=child;slots.push([child,0],[child,1]);}}
 return {left,right};
}
function relabel(g,values){
 const n=g.left.length,permutation=shuffle(Array.from({length:n},(_,i)=>i)),left=Array(n),right=Array(n),value=Array(n);
 for(let old=0;old<n;old++){const now=permutation[old];left[now]=g.left[old]<0?-1:permutation[g.left[old]];right[now]=g.right[old]<0?-1:permutation[g.right[old]];value[now]=values[old];}
 return {left,right,value,root:n?permutation[0]:-1};
}
const binaryCases=[];
for(const n of [0,1,2,3,4,7,15,31,63,127,255,256])for(const kind of ['complete','left','right','zigzag','broom','random']){
 const mode=(n+kind.length)%3,values=Array.from({length:n},(_,i)=>mode===0?0:mode===1?extreme[i%extreme.length]:rand(2000001)-1000000);
 binaryCases.push({...relabel(shape(n,kind),values),label:`${kind}-${n}-${mode}`});
}
for(let i=0;i<18;i++){const n=5+rand(45);binaryCases.push({...relabel(shape(n,'random'),Array.from({length:n},(_,j)=>extreme[(j+i)%extreme.length])),label:'random-extra-'+i});}
// Identical value paths still represent distinct leaves; physical order is unrelated.
binaryCases.push({value:[8,3,3,9,9],left:[1,3,4,-1,-1],right:[2,-1,-1,-1,-1],root:0,label:'identical-left-right-values'});
binaryCases.push({value:[8,3,3,9,9],left:[1,-1,-1,-1,-1],right:[2,3,4,-1,-1],root:0,label:'identical-right-only-branches'});
binaryCases.push({value:[-2147483648,7,2147483647],left:[1,-1,-1],right:[2,-1,-1],root:-1,label:'empty-root-unrelated-storage'});

function allPaths(g){const paths=[];function visit(node,path){if(node<0)return;const next=[...path,node];if(g.left[node]<0&&g.right[node]<0)paths.push(next);else{visit(g.left[node],next);visit(g.right[node],next);}}visit(g.root,[]);return paths;}
function height(g,node){if(node<0)return 0;return 1+Math.max(height(g,g.left[node]),height(g,g.right[node]));}
function balanced(g){const pending=g.root<0?[]:[g.root];while(pending.length){const p=pending.pop();if(Math.abs(height(g,g.left[p])-height(g,g.right[p]))>1)return 0;if(g.left[p]>=0)pending.push(g.left[p]);if(g.right[p]>=0)pending.push(g.right[p]);}return 1;}
function width(g){const counts=[];function visit(p,depth){if(p<0)return;counts[depth]=(counts[depth]??0)+1;visit(g.left[p],depth+1);visit(g.right[p],depth+1);}visit(g.root,0);return Math.max(0,...counts);}
function longest(g){return allPaths(g).reduce((best,path)=>path.length>best.length?path:best,[]);}
function traversals(g){const pre=[],inorder=[];function visit(p){if(p<0)return;pre.push(g.value[p]);visit(g.left[p]);inorder.push(g.value[p]);visit(g.right[p]);}visit(g.root);return {pre,inorder};}
function uniqueVersion(g){const n=g.value.length;const values=Array.from({length:n},(_,i)=>i<5?extreme[i]:i*7919-900000);if(new Set(values).size!==n)throw Error('duplicate reconstruction IDs');return {...g,value:values};}
function parentLca(parent,n,p,q){if(p<1||p>n||q<1||q>n)return 0;const a=[],b=[];for(let x=p;x;x=parent[x])a.push(x);for(let x=q;x;x=parent[x])b.push(x);a.reverse();b.reverse();let answer=0;for(let i=0;i<Math.min(a.length,b.length)&&a[i]===b[i];i++)answer=a[i];return answer;}
function validTable(left,right,n){
 if(!n)return 0;const parent=Array.from({length:n+1},(_,i)=>i),incoming=Array(n+1).fill(0);const find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};let edges=0;
 for(let i=1;i<=n;i++)for(const child of [left[i],right[i]]){if(child<0||child>n)return 0;if(!child)continue;if(++incoming[child]>1)return 0;const a=find(i),b=find(child);if(a===b)return 0;parent[a]=b;edges++;}
 return Number(edges===n-1&&Array.from({length:n},(_,i)=>find(i+1)).every(x=>x===find(1)));
}
function orderedHeight(g){if(g.root<0)return 0;const queue=[[g.root,1]];let answer=0;for(let at=0;at<queue.length;at++){const [p,depth]=queue[at];answer=Math.max(answer,depth);for(let c=g.first[p];c>=0;c=g.next[c])queue.push([c,depth+1]);}return answer;}
const binaryBuild=String.raw`
static void treeJudge_make(TreeNode a[],const int*v,const int*l,const int*r,int n){
 a[0]=(TreeNode){71234567,NULL,NULL};a[n+1]=(TreeNode){-71234567,NULL,NULL};
 for(int i=0;i<n;i++)a[i+1]=(TreeNode){v[i],l[i]<0?NULL:a+l[i]+1,r[i]<0?NULL:a+r[i]+1};
}
static int treeJudge_same(const TreeNode a[],const int*v,const int*l,const int*r,int n){
 if(a[0].value!=71234567||a[0].left||a[0].right||a[n+1].value!=-71234567||a[n+1].left||a[n+1].right)return 0;
 for(int i=0;i<n;i++)if(a[i+1].value!=v[i]||a[i+1].left!=(l[i]<0?NULL:a+l[i]+1)||a[i+1].right!=(r[i]<0?NULL:a+r[i]+1))return 0;return 1;
}
`;
const graphCall=(g,fn,extra='')=>`const int v[]=${array(g.value)},l[]=${array(g.left)},r[]=${array(g.right)};${fn}(v,l,r,${g.value.length},${g.root}${extra});`;
const specs=new Map();
const row=(body,expected)=>({body,expected:expected.map(String)});
specs.set(id(1),{types:dsTreeTypes.binary,signature:'int isBalanced(const TreeNode*);',helpers:binaryBuild+String.raw`
static void treeJudge_balance(const int*v,const int*l,const int*r,int n,int root){TreeNode a[260];treeJudge_make(a,v,l,r,n);int answer=isBalanced(root<0?NULL:a+root+1);printf("%d %d\n",answer,treeJudge_same(a,v,l,r,n));}
`,rows:binaryCases.map(g=>row(graphCall(g,'treeJudge_balance'),[balanced(g),1]))});
specs.set(id(3),{types:dsTreeTypes.binary,signature:'int maxTreeWidth(const TreeNode*);',helpers:binaryBuild+String.raw`
static void treeJudge_width(const int*v,const int*l,const int*r,int n,int root){TreeNode a[260];treeJudge_make(a,v,l,r,n);int answer=maxTreeWidth(root<0?NULL:a+root+1);printf("%d %d\n",answer,treeJudge_same(a,v,l,r,n));}
`,rows:binaryCases.map(g=>row(graphCall(g,'treeJudge_width'),[width(g),1]))});
specs.set(id(4),{types:dsTreeTypes.binary,signature:'int longestRootLeafPath(const TreeNode*,const TreeNode*[]);',helpers:binaryBuild+String.raw`
static void treeJudge_longest(const int*v,const int*l,const int*r,int n,int root,const int*expected,int length){
 TreeNode a[260];treeJudge_make(a,v,l,r,n);const TreeNode*out[258];for(int i=0;i<258;i++)out[i]=a;
 int answer=longestRootLeafPath(root<0?NULL:a+root+1,out+1),good=1;for(int i=0;i<length;i++)if(out[i+1]!=a+expected[i]+1)good=0;
 printf("%d %d %d %d\n",answer,good,treeJudge_same(a,v,l,r,n),out[0]==a&&out[257]==a);
}
`,rows:binaryCases.map(g=>{const path=longest(g);return row(graphCall(g,'treeJudge_longest',`,(const int[])${array(path)},${path.length}`),[path.length,1,1,1]);})});

const reconstruction=binaryCases.filter(g=>g.root>=0||g.value.length===0).map(uniqueVersion);
specs.set(id(2),{types:dsTreeTypes.binary,signature:'TreeNode*rebuildPreIn(const int[],const int[],int,TreeNode[]);',helpers:String.raw`
static int treeJudge_pool_index(const TreeNode*p,const TreeNode*pool,int n){uintptr_t address=(uintptr_t)p,base=(uintptr_t)pool;if(address<base||address-base>=(uintptr_t)n*sizeof(TreeNode)||(address-base)%sizeof(TreeNode))return -1;return (int)((address-base)/sizeof(TreeNode));}
static int treeJudge_pool_valid(const TreeNode*root,const TreeNode*pool,int n){
 if(!n)return root==NULL;int start=treeJudge_pool_index(root,pool,n);if(start<0)return 0;int seen[256]={0},queue[256],head=0,tail=0;seen[start]=1;queue[tail++]=start;
 while(head<tail){const TreeNode*p=pool+queue[head++];const TreeNode*child[2]={p->left,p->right};for(int k=0;k<2;k++)if(child[k]){int j=treeJudge_pool_index(child[k],pool,n);if(j<0||seen[j])return 0;seen[j]=1;queue[tail++]=j;}}
 return tail==n;
}
static void treeJudge_pre(const TreeNode*p,int out[],int*used){if(!p)return;out[(*used)++]=p->value;treeJudge_pre(p->left,out,used);treeJudge_pre(p->right,out,used);}
static void treeJudge_in(const TreeNode*p,int out[],int*used){if(!p)return;treeJudge_in(p->left,out,used);out[(*used)++]=p->value;treeJudge_in(p->right,out,used);}
static void treeJudge_rebuild(const int*pre,const int*in,int physical,int n){
 int p[265],q[265];TreeNode pool[260];p[0]=q[0]=123456789;p[physical+1]=q[physical+1]=-123456789;
 for(int i=0;i<physical;i++){p[i+1]=pre[i];q[i+1]=in[i];}for(int i=0;i<n+4;i++)pool[i]=(TreeNode){91234567,pool,pool};
 TreeNode*answer=rebuildPreIn(p+1,q+1,n,pool+1);int good=treeJudge_pool_valid(answer,pool+1,n),same=1,guard=1;
 if(good){int a[256],b[256],na=0,nb=0;treeJudge_pre(answer,a,&na);treeJudge_in(answer,b,&nb);if(na!=n||nb!=n)good=0;for(int i=0;i<n;i++)if(a[i]!=pre[i]||b[i]!=in[i])good=0;}
 for(int i=0;i<physical;i++)if(p[i+1]!=pre[i]||q[i+1]!=in[i])same=0;
 if(p[0]!=123456789||q[0]!=123456789||p[physical+1]!=-123456789||q[physical+1]!=-123456789)same=0;
 for(int i=0;i<n+4;i++)if(i<1||i>n)if(pool[i].value!=91234567||pool[i].left!=pool||pool[i].right!=pool)guard=0;
 printf("%d %d %d\n",good,same,guard);
}
`,rows:reconstruction.map((g,i)=>{const {pre,inorder}=traversals(g),extra=i%3===0?[]:[0,-2147483648,2147483647];return row(`const int p[]=${array([...pre,...extra])},q[]=${array([...inorder,...extra.slice().reverse()])};treeJudge_rebuild(p,q,${pre.length+extra.length},${pre.length});`,[1,1,1]);})});

const parentCases=[];
for(const g of binaryCases.filter(g=>g.root>=0)){
 const n=g.value.length,parent=Array(n+1).fill(0);parent[0]=-2147483648;for(let i=0;i<n;i++)for(const c of [g.left[i],g.right[i]])if(c>=0)parent[c+1]=i+1;
 const pairs=[[g.root+1,g.root+1],[1,n],[n,1],[1,1],[n,n],[0,1],[1,0],[-1,n],[n+1,1],[-2147483648,2147483647]];
 if(n<=7)for(let p=1;p<=n;p++)for(let q=1;q<=n;q++)pairs.push([p,q]);
 for(const [p,q]of pairs)parentCases.push({parent,n,p,q});
}
parentCases.push({parent:[2147483647,99,-9],n:0,p:0,q:0},{parent:[-7,0,1,2,3,4,99],n:5,p:3,q:5});
const parentStorage=[...new Map(parentCases.map(c=>[JSON.stringify(c.parent),c.parent])).values()];
const parentStorageIndex=new Map(parentStorage.map((a,i)=>[JSON.stringify(a),i]));
specs.set(id(5),{types:'',signature:'int lcaParent(const int[],int,int,int);',helpers:String.raw`
static void treeJudge_lca(const int*value,int physical,int n,int p,int q){int a[264];a[0]=11223344;for(int i=0;i<physical;i++)a[i+1]=value[i];a[physical+1]=-11223344;int answer=lcaParent(a+1,n,p,q),same=1;for(int i=0;i<physical;i++)if(a[i+1]!=value[i])same=0;printf("%d %d %d\n",answer,same,a[0]==11223344&&a[physical+1]==-11223344);}
`+parentStorage.map((a,i)=>`static const int treeJudge_parent_${i}[]=${array(a)};`).join('\n'),rows:parentCases.map(c=>row(`treeJudge_lca(treeJudge_parent_${parentStorageIndex.get(JSON.stringify(c.parent))},${c.parent.length},${c.n},${c.p},${c.q});`,[parentLca(c.parent,c.n,c.p,c.q),1,1]))});
// Keep all queries, but pass their data through one runtime loop. Expanding over
// a thousand constant-specialized call sites makes normal correct submissions
// spend the compiler budget optimizing the driver instead of the submitted code.
const lcaSpec=specs.get(id(5));
lcaSpec.rows=[...new Map(lcaSpec.rows.map(r=>[r.body+'\n'+r.expected.join(' '),r])).values()];
lcaSpec.main=`static const struct {const int *parent;int physical,n,p,q;} treeJudge_queries[]={\n${lcaSpec.rows.map(r=>'{'+r.body.slice('treeJudge_lca('.length,-2)+'}').join(',\n')}\n};\nint main(void){for(unsigned i=0;i<sizeof treeJudge_queries/sizeof treeJudge_queries[0];i++)treeJudge_lca(treeJudge_queries[i].parent,treeJudge_queries[i].physical,treeJudge_queries[i].n,treeJudge_queries[i].p,treeJudge_queries[i].q);return 0;}\n`;

const orderedCases=[];
for(const n of [0,1,2,4,15,64,127,256])for(const mode of ['chain','star','random','forest']){
 const first=Array(n).fill(-1),next=Array(n).fill(-1),children=Array.from({length:n},()=>[]),roots=n?[0]:[];
 for(let i=1;i<n;i++){if(mode==='forest'&&(i===1||i%11===0))roots.push(i);else children[mode==='chain'?i-1:mode==='star'?0:rand(i)].push(i);}
 for(let p=0;p<n;p++)if(children[p].length){first[p]=children[p][0];for(let j=0;j<children[p].length-1;j++)next[children[p][j]]=children[p][j+1];}
 for(let i=0;i<roots.length-1;i++)next[roots[i]]=roots[i+1];
 orderedCases.push({first,next,value:Array.from({length:n},(_,i)=>extreme[i%extreme.length]),root:n?0:-1,label:mode+'-'+n});
 if(mode==='forest'&&roots.length>1)orderedCases.push({first,next,value:Array(n).fill(0),root:roots[1],label:'interior-forest-root-'+n});
}
orderedCases.push({value:[1,2,3,4,5],first:[-1,2,3,4,-1],next:[1,-1,-1,-1,-1],root:0,label:'leaf-with-deep-root-sibling'});
specs.set(id(6),{types:dsTreeTypes.ordered,signature:'int orderedTreeHeight(const CSNode*);',helpers:String.raw`
static void treeJudge_ordered(const int*v,const int*f,const int*s,int n,int root){CSNode a[260];a[0]=(CSNode){11223344,NULL,NULL};a[n+1]=(CSNode){-11223344,NULL,NULL};for(int i=0;i<n;i++)a[i+1]=(CSNode){v[i],f[i]<0?NULL:a+f[i]+1,s[i]<0?NULL:a+s[i]+1};int answer=orderedTreeHeight(root<0?NULL:a+root+1),same=1;
 for(int i=0;i<n;i++)if(a[i+1].value!=v[i]||a[i+1].firstChild!=(f[i]<0?NULL:a+f[i]+1)||a[i+1].nextSibling!=(s[i]<0?NULL:a+s[i]+1))same=0;
 printf("%d %d %d\n",answer,same,a[0].value==11223344&&!a[0].firstChild&&!a[0].nextSibling&&a[n+1].value==-11223344&&!a[n+1].firstChild&&!a[n+1].nextSibling);}
`,rows:orderedCases.map(g=>row(`const int v[]=${array(g.value)},f[]=${array(g.first)},s[]=${array(g.next)};treeJudge_ordered(v,f,s,${g.value.length},${g.root});`,[orderedHeight(g),1,1]))});

const pathCases=[...binaryCases.filter(g=>g.value.length<=7).slice(0,10),...binaryCases.filter(g=>g.value.length>=255&&g.label?.startsWith('broom')).slice(0,2),...binaryCases.filter(g=>g.value.length>=255&&g.label?.startsWith('complete')).slice(0,2),...binaryCases.filter(g=>g.value.length===256&&/^(left|right|zigzag)/.test(g.label)).slice(0,3),...binaryCases.filter(g=>/identical/.test(g.label)),binaryCases.at(-1)];
pathCases.push(
 {value:[10,20],left:[-1,-1],right:[1,-1],root:0,label:'paths-right-only'},
 {value:[1,2,3,4],left:[1,3,-1,-1],right:[2,-1,-1,-1],root:0,label:'paths-unequal-depth'},
 {value:[1,2,3],left:[1,-1,-1],right:[2,-1,-1],root:0,label:'paths-two-distinct-leaves'},
 {value:[7,4,12,3,5,11,13],left:[1,3,5,-1,-1,-1,-1],right:[2,4,6,-1,-1,-1,-1],root:0,label:'paths-four-distinct-leaves'},
 {value:[2147483647,-2147483648,0],left:[1,-1,-1],right:[2,-1,-1],root:0,label:'paths-extreme-values'},
 {value:[5,5,5],left:[1,2,-1],right:[-1,-1,-1],root:0,label:'paths-repeated-ancestors'}
);
specs.set(id(7),{types:dsTreeTypes.binary+'\n'+dsTreeTypes.capacity,signature:'int rootLeafPaths(const TreeNode*,int[][DS_TREE_MAX_N],int[]);',helpers:binaryBuild+String.raw`
static void treeJudge_paths(const int*v,const int*l,const int*r,int n,int root,const int*indices,const int*length,int count){
 TreeNode a[260];treeJudge_make(a,v,l,r,n);static struct {int before;int data[DS_TREE_MAX_N][DS_TREE_MAX_N];int after;} out;int lengths[258];out.before=123456789;out.after=-123456789;for(int i=0;i<258;i++)lengths[i]=7654321;
 for(int row=0;row<count;row++)for(int j=0;j<length[row];j++)out.data[row][j]=7654321;
 int answer=rootLeafPaths(root<0?NULL:a+root+1,out.data,lengths+1),good=1,at=0;
 for(int row=0;row<count;row++){if(lengths[row+1]!=length[row])good=0;for(int j=0;j<length[row];j++)if(out.data[row][j]!=v[indices[at++]])good=0;}
 printf("%d %d %d %d\n",answer,good,treeJudge_same(a,v,l,r,n),out.before==123456789&&out.after==-123456789&&lengths[0]==7654321&&lengths[257]==7654321);
}
`,rows:pathCases.map(g=>{const paths=allPaths(g);return row(graphCall(g,'treeJudge_paths',`,(const int[])${array(paths.flat())},(const int[])${array(paths.map(p=>p.length))},${paths.length}`),[paths.length,1,1,1]);})});

const tableCases=[];
for(const g of binaryCases.filter(g=>g.root>=0)){const n=g.value.length;tableCases.push({n,left:[-77,...g.left.map(x=>x+1),999],right:[2147483647,...g.right.map(x=>x+1),-1]});}
const addTable=(left,right,n=left.length-1)=>tableCases.push({n,left,right});
addTable([123,0],[456,0],0);addTable([8,1],[9,0]);addTable([8,2,1],[9,0,0]);addTable([8,2,0],[9,2,0]);addTable([8,2,0,0],[9,3,3,0]);
addTable([8,0,3,2],[9,0,0,0]);addTable([8,0,0],[9,0,0]);addTable([8,-1],[9,0]);addTable([8,2147483647],[9,0]);addTable([8,-2147483648],[9,0]);
for(const n of [2,3,4,7,16,64,256])for(let variant=0;variant<12;variant++){
 const left=Array(n+1).fill(0),right=Array(n+1).fill(0);left[0]=-19;right[0]=2147483647;
 for(let i=1;i<=n;i++){left[i]=rand(n+3)-1;right[i]=rand(n+3)-1;}tableCases.push({left,right,n});
}
specs.set(id(8),{types:'',signature:'int isBinaryTreeTable(const int[],const int[],int);',helpers:String.raw`
static void treeJudge_table(const int*l,const int*r,int physical,int n){int a[265],b[265];a[0]=b[0]=123456789;a[physical+1]=b[physical+1]=-123456789;for(int i=0;i<physical;i++){a[i+1]=l[i];b[i+1]=r[i];}int answer=isBinaryTreeTable(a+1,b+1,n),same=1;for(int i=0;i<physical;i++)if(a[i+1]!=l[i]||b[i+1]!=r[i])same=0;printf("%d %d %d\n",answer,same,a[0]==123456789&&b[0]==123456789&&a[physical+1]==-123456789&&b[physical+1]==-123456789);}
`,rows:tableCases.map(g=>row(`const int l[]=${array(g.left)},r[]=${array(g.right)};treeJudge_table(l,r,${g.left.length},${g.n});`,[validTable(g.left,g.right,g.n),1,1]))});

for(const spec of specs.values())spec.rows=[...new Map(spec.rows.map(r=>[r.body+'\n'+r.expected.join(' '),r])).values()];
export const dsTreeContractIds=Array.from({length:8},(_,i)=>id(i+1));
export function dsTreeContract(questionId,forSamples=false){const spec=specs.get(questionId);if(!spec)return null;const groups=spec.rows.map(r=>r.expected);return {prelude:'#include <stddef.h>\n#include <stdint.h>\n'+spec.types+'\n'+spec.signature+'\n',harness:'\n#include <stdio.h>\n'+spec.helpers+'\n'+((forSamples?null:spec.main)??(spec.rows.map((r,i)=>`static void treeJudge_case_${i}(void){${r.body}}`).join('\n')+'\nint main(void){\n'+spec.rows.map((_,i)=>`treeJudge_case_${i}();`).join('\n')+'\nreturn 0;}\n')),groups,expected:groups.flat()};}
export const dsTreeReferenceSources=Object.fromEntries(dsTreeContractIds.map(key=>[key,dsTreeTaskGuides[key].solution]));
export const dsTreeOracles={allPaths,height,balanced,width,longest,traversals,parentLca,validTable,orderedHeight};
export const dsTreeCaseSets={binary:binaryCases,reconstruction,parents:parentCases,ordered:orderedCases,paths:pathCases,tables:tableCases};

// These are validation samples, never imported into the public question bank.
const sample=(n,label,source)=>({id:id(n),label,source});
export const dsTreeEquivalentSources=[
 sample(1,'postorder-height-and-flag',String.raw`
typedef struct {int h,ok;} HeightResult;
static HeightResult inspect(const TreeNode*p){if(!p)return (HeightResult){0,1};HeightResult l=inspect(p->left),r=inspect(p->right);return (HeightResult){1+(l.h>r.h?l.h:r.h),l.ok&&r.ok&&l.h-r.h<=1&&r.h-l.h<=1};}
int isBalanced(const TreeNode*root){return inspect(root).ok;}`),
 sample(2,'iterative-stack-reversed-pool',String.raw`
TreeNode*rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[]){
 if(!n)return NULL;TreeNode*stack[256];int top=0,next=0;TreeNode*root=&nodes[n-1];*root=(TreeNode){pre[0],NULL,NULL};stack[top++]=root;
 for(int i=1;i<n;i++){TreeNode*parent=stack[top-1],*child=&nodes[n-1-i];*child=(TreeNode){pre[i],NULL,NULL};
  if(parent->value!=in[next])parent->left=child;else{while(top&&stack[top-1]->value==in[next]){parent=stack[--top];++next;}parent->right=child;}stack[top++]=child;}
 return root;
}`),
 sample(3,'dfs-depth-counts',String.raw`
static void countLevel(const TreeNode*p,int depth,int count[]){if(!p)return;++count[depth];countLevel(p->left,depth+1,count);countLevel(p->right,depth+1,count);}
int maxTreeWidth(const TreeNode*root){int count[256]={0},best=0;countLevel(root,0,count);for(int i=0;i<256;i++)if(count[i]>best)best=count[i];return best;}`),
 sample(4,'current-path-and-full-output-initialization',String.raw`
static void searchPath(const TreeNode*p,int depth,const TreeNode*current[],const TreeNode*out[],int*best){if(!p)return;current[depth++]=p;if(!p->left&&!p->right&&depth>*best){*best=depth;for(int i=0;i<depth;i++)out[i]=current[i];}searchPath(p->left,depth,current,out,best);searchPath(p->right,depth,current,out,best);}
int longestRootLeafPath(const TreeNode*root,const TreeNode*out[]){const TreeNode*current[256];int best=0;for(int i=0;i<256;i++)out[i]=NULL;searchPath(root,0,current,out,&best);return best;}`),
 sample(5,'align-ancestor-depths',String.raw`
int lcaParent(const int parent[],int n,int p,int q){if(p<1||q<1||p>n||q>n)return 0;int a=0,b=0;for(int x=p;x;x=parent[x])++a;for(int x=q;x;x=parent[x])++b;while(a>b){p=parent[p];--a;}while(b>a){q=parent[q];--b;}while(p!=q){p=parent[p];q=parent[q];}return p;}`),
 sample(6,'iterative-original-tree-depth',String.raw`
int orderedTreeHeight(const CSNode*root){if(!root)return 0;const CSNode*stack[256];int depth[256],top=0,best=0;stack[top]=root;depth[top++]=1;while(top){--top;const CSNode*p=stack[top];int d=depth[top];if(d>best)best=d;for(const CSNode*c=p->firstChild;c;c=c->nextSibling){stack[top]=c;depth[top++]=d+1;}}return best;}`),
 sample(7,'iterative-dfs-and-full-output-initialization',String.raw`
/* Full initialization costs capacity squared. Traversal/copies add O(n+L); the explicit stack is O(h), excluding caller-owned output. */
int rootLeafPaths(const TreeNode*root,int paths[][DS_TREE_MAX_N],int lengths[]){
 for(int i=0;i<DS_TREE_MAX_N;i++){lengths[i]=0;for(int j=0;j<DS_TREE_MAX_N;j++)paths[i][j]=0;}if(!root)return 0;
 const TreeNode*stack[DS_TREE_MAX_N];int phase[DS_TREE_MAX_N],top=1,count=0;stack[0]=root;phase[0]=0;
 while(top){int k=top-1;const TreeNode*p=stack[k];if(!p->left&&!p->right){lengths[count]=top;for(int i=0;i<top;i++)paths[count][i]=stack[i]->value;++count;--top;continue;}
  if(phase[k]==0){phase[k]=1;if(p->left){stack[top]=p->left;phase[top++]=0;}}else if(phase[k]==1){phase[k]=2;if(p->right){stack[top]=p->right;phase[top++]=0;}}else --top;
 }return count;
}`),
 sample(8,'union-find-and-incoming-degrees',String.raw`
static int leader(int parent[],int x){while(parent[x]!=x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
int isBinaryTreeTable(const int L[],const int R[],int n){if(!n)return 0;int parent[257],incoming[257]={0},edges=0;for(int i=1;i<=n;i++)parent[i]=i;for(int i=1;i<=n;i++){int child[2]={L[i],R[i]};for(int j=0;j<2;j++){int c=child[j];if(c<0||c>n)return 0;if(!c)continue;if(++incoming[c]>1)return 0;int a=leader(parent,i),b=leader(parent,c);if(a==b)return 0;parent[a]=b;++edges;}}return edges==n-1;}`)
];
const mutation=(n,label,from,to)=>{const source=dsTreeReferenceSources[id(n)];if(!source.includes(from)||source.indexOf(from)!==source.lastIndexOf(from))throw Error('non-unique mutation '+label);return sample(n,label,source.replace(from,to));};
const wrapper=(n,label,name,source)=>sample(n,label,dsTreeReferenceSources[id(n)].replace(new RegExp('\\b'+name+'\\b','g'),'original_'+name)+'\n'+source);
export const dsTreeWrongSources=[
 mutation(1,'empty-tree-is-not-balanced','return balancedHeight(root)>=0;','return root&&balancedHeight(root)>=0;'),
 mutation(1,'one-sided-height-difference','l>r+1||r>l+1','l>r+1'),
 sample(1,'checks-root-only',String.raw`static int h(const TreeNode*p){if(!p)return 0;int a=h(p->left),b=h(p->right);return 1+(a>b?a:b);}int isBalanced(const TreeNode*root){if(!root)return 1;int a=h(root->left),b=h(root->right);return a-b<=1&&b-a<=1;}`),
 wrapper(2,'mirrors-reconstructed-tree','rebuildPreIn',String.raw`static void mirror(TreeNode*p){if(!p)return;TreeNode*q=p->left;p->left=p->right;p->right=q;mirror(p->left);mirror(p->right);}TreeNode*rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[]){TreeNode*p=original_rebuildPreIn(pre,in,n,nodes);mirror(p);return p;}`),
 sample(2,'preorder-as-right-chain',String.raw`TreeNode*rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[]){(void)in;for(int i=0;i<n;i++)nodes[i]=(TreeNode){pre[i],NULL,i+1<n?nodes+i+1:NULL};return n?nodes:NULL;}`),
 wrapper(2,'mutates-readonly-preorder','rebuildPreIn',String.raw`TreeNode*rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[]){TreeNode*p=original_rebuildPreIn(pre,in,n,nodes);if(n)((int*)pre)[0]^=1;return p;}`),
 sample(3,'total-node-count',String.raw`int maxTreeWidth(const TreeNode*root){return root?1+maxTreeWidth(root->left)+maxTreeWidth(root->right):0;}`),
 sample(3,'total-leaf-count',String.raw`int maxTreeWidth(const TreeNode*root){if(!root)return 0;if(!root->left&&!root->right)return 1;return maxTreeWidth(root->left)+maxTreeWidth(root->right);}`),
 mutation(3,'empty-width-one','if(!root)return 0;','if(!root)return 1;'),
 mutation(4,'last-tie-instead-of-first','depth>*height','depth>=*height'),
 wrapper(4,'reversed-root-leaf-path','longestRootLeafPath',String.raw`int longestRootLeafPath(const TreeNode*root,const TreeNode*out[]){int n=original_longestRootLeafPath(root,out);for(int i=0;i<n/2;i++){const TreeNode*p=out[i];out[i]=out[n-i-1];out[n-i-1]=p;}return n;}`),
 sample(4,'always-chooses-left-child',String.raw`int longestRootLeafPath(const TreeNode*root,const TreeNode*out[]){int n=0;while(root){out[n++]=root;root=root->left?root->left:root->right;}return n;}`),
 mutation(5,'excludes-p-itself','for(int x=p;x;x=parent[x])seen[x]=1;','for(int x=parent[p];x;x=parent[x])seen[x]=1;'),
 sample(5,'numeric-smaller-is-ancestor',String.raw`int lcaParent(const int parent[],int n,int p,int q){(void)parent;if(p<1||p>n||q<1||q>n)return 0;return p<q?p:q;}`),
 mutation(5,'invalid-id-returns-one','if(p<1||p>n||q<1||q>n)return 0;','if(p<1||p>n||q<1||q>n)return 1;'),
 sample(6,'siblings-add-depth',String.raw`int orderedTreeHeight(const CSNode*root){if(!root)return 0;int a=orderedTreeHeight(root->firstChild),b=orderedTreeHeight(root->nextSibling);return 1+(a>b?a:b);}`),
 wrapper(6,'counts-root-sibling-forest','orderedTreeHeight',String.raw`int orderedTreeHeight(const CSNode*root){int best=0;for(const CSNode*p=root;p;p=p->nextSibling){int h=original_orderedTreeHeight(p);if(h>best)best=h;}return best;}`),
 mutation(6,'empty-height-one','if(!root)return 0;','if(!root)return 1;'),
 mutation(7,'right-before-left-leaf-order','collectPaths(p->left,depth,current,paths,lengths,count);collectPaths(p->right,depth,current,paths,lengths,count);','collectPaths(p->right,depth,current,paths,lengths,count);collectPaths(p->left,depth,current,paths,lengths,count);'),
 wrapper(7,'deduplicates-identical-value-paths','rootLeafPaths',String.raw`int rootLeafPaths(const TreeNode*root,int paths[][DS_TREE_MAX_N],int lengths[]){int n=original_rootLeafPaths(root,paths,lengths),used=0;for(int i=0;i<n;i++){int duplicate=0;for(int j=0;j<used;j++){int same=lengths[j]==lengths[i];for(int k=0;same&&k<lengths[i];k++)if(paths[j][k]!=paths[i][k])same=0;if(same)duplicate=1;}if(!duplicate){lengths[used]=lengths[i];for(int k=0;k<lengths[i];k++)paths[used][k]=paths[i][k];++used;}}return used;}`),
 mutation(7,'every-visited-node-is-path','if(!p->left&&!p->right){','if(1){'),
 sample(8,'unique-root-without-cycle-reachability',String.raw`int isBinaryTreeTable(const int L[],const int R[],int n){if(!n)return 0;int d[257]={0};for(int i=1;i<=n;i++){if(L[i]<0||L[i]>n||R[i]<0||R[i]>n)return 0;if(L[i])d[L[i]]++;if(R[i])d[R[i]]++;}int roots=0;for(int i=1;i<=n;i++)if(!d[i])roots++;return roots==1;}`),
 sample(8,'degrees-and-root-but-no-reachability',String.raw`int isBinaryTreeTable(const int L[],const int R[],int n){if(!n)return 0;int d[257]={0};for(int i=1;i<=n;i++){int a[2]={L[i],R[i]};for(int j=0;j<2;j++){int c=a[j];if(c<0||c>n)return 0;if(c&&++d[c]>1)return 0;}}int roots=0;for(int i=1;i<=n;i++)if(!d[i])roots++;return roots==1;}`),
 mutation(8,'accepts-empty-tree','if(n==0)return 0;','if(n==0)return 1;')
];
