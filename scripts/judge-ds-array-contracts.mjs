// Server-only drivers. JS solves expected values independently of submitted C.
import {dsArrayTaskGuides,dsArrayTypes} from '../ds-array-task-guides.js';
const id=n=>`P4-structures-5-D-${String(n).padStart(3,'0')}`;
const array=a=>`{${a.length?a.join(','):0}}`,triples=a=>`{${a.length?a.map(t=>array(t)).join(','):'{0,0,0}'}}`;
const prefixes=n=>[...new Set([0,Math.floor(n/2),n])];
const row=(body,out=[1,1,1])=>({body,out:out.map(String)});
const specs=new Map();
let seed=20261118;const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const ints=[-2147483648,2147483647,-1000000000,1000000000,-7,-1,1,9];
const equalTriple='static int dsa_same_triple(Triple a,Triple b){return a.row==b.row&&a.col==b.col&&a.value==b.value;}\n';
const transposeCases=[];
for(const n of [0,1,2,3,4,7,16,32])for(let mode=0;mode<3;mode++){
 const values=Array.from({length:n*n+5},(_,i)=>mode===0?i*3-57:mode===1?ints[i%ints.length]:rand(2000000001)-1000000000);
 const expected=values.slice(0,n*n).map((_,p)=>values[(p%n)*n+Math.floor(p/n)]);
 transposeCases.push(row(`const int v[]=${array(values)},e[]=${array(expected)};dsa_square(v,${values.length},${n},e);`));
}
specs.set(id(1),{helpers:String.raw`
static void dsa_square(const int*v,int physical,int n,const int*expected){
 int a[1034];a[0]=71234567;for(int i=0;i<physical;i++)a[i+1]=v[i];a[physical+1]=-71234567;
 transposeSquare(a+1,n);int good=1,tail=1;for(int i=0;i<n*n;i++)if(a[i+1]!=expected[i])good=0;
 for(int i=n*n;i<physical;i++)if(a[i+1]!=v[i])tail=0;
 printf("%d %d %d\n",good,tail,a[0]==71234567&&a[physical+1]==-71234567);
}`,rows:transposeCases});

const matrices=[];
for(const [rows,cols]of [[0,0],[0,4],[4,0],[1,1],[1,7],[7,1],[2,3],[3,2],[4,7],[7,4],[8,8],[16,16],[32,8],[8,32],[32,32]])for(let mode=0;mode<4;mode++){
 const data=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(data.length<256&&(mode===0?false:mode===1?(r+c)%3===1:mode===2?(r%3!==1&&c%3===2):true))data.push([r,c,ints[(r*cols+c)%ints.length]]);
 matrices.push({rows,cols,data});
}
const matrixPrefixes=matrices.flatMap(a=>prefixes(a.data.length).map(t=>({...a,t})));
const fastRows=matrixPrefixes.map(({rows,cols,data,t})=>{
 const expected=data.slice(0,t).map(([r,c,v])=>[c,r,v]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 return row(`const Triple v[]=${triples(data)},e[]=${triples(expected)};dsa_fast(v,${data.length},${rows},${cols},${t},e);`);
});
specs.set(id(2),{helpers:equalTriple+String.raw`
static void dsa_fast(const Triple*v,int physical,int rows,int cols,int t,const Triple*expected){
 Triple a[260],b[260],guard={-991,-992,-993};a[0]=a[physical+1]=b[0]=b[t+1]=guard;
 for(int p=0;p<physical;p++)a[p+1]=v[p];for(int p=0;p<t;p++)b[p+1]=(Triple){-1,-2,12345};
 fastTranspose(a+1,rows,cols,t,b+1);int good=1,same=1;for(int p=0;p<t;p++)if(!dsa_same_triple(b[p+1],expected[p]))good=0;
 for(int p=0;p<physical;p++)if(!dsa_same_triple(a[p+1],v[p]))same=0;
 printf("%d %d %d\n",good,same,dsa_same_triple(a[0],guard)&&dsa_same_triple(a[physical+1],guard)&&dsa_same_triple(b[0],guard)&&dsa_same_triple(b[t+1],guard));
}`,rows:fastRows});
const csrRows=matrixPrefixes.map(({rows,cols,data,t})=>{
 const src=data.slice(0,t),offsets=Array.from({length:rows+1},(_,r)=>src.filter(e=>e[0]<r).length);
 return row(`const Triple v[]=${triples(data)};const int er[]=${array(offsets)},ec[]=${array(src.map(e=>e[1]))},ev[]=${array(src.map(e=>e[2]))};dsa_csr(v,${data.length},${rows},${cols},${t},er,ec,ev);`);
});
specs.set(id(3),{helpers:equalTriple+String.raw`
static void dsa_csr(const Triple*v,int physical,int rows,int cols,int t,const int*er,const int*ec,const int*ev){
 Triple a[260],guard={-991,-992,-993};a[0]=a[physical+1]=guard;for(int p=0;p<physical;p++)a[p+1]=v[p];
 int r[36],c[260],value[260];for(int i=0;i<rows+3;i++)r[i]=-8181;for(int i=0;i<t+2;i++)c[i]=value[i]=-8181;
 tripletsToCSR(a+1,rows,cols,t,r+1,c+1,value+1);int good=1,same=1;
 for(int i=0;i<=rows;i++)if(r[i+1]!=er[i])good=0;for(int i=0;i<t;i++)if(c[i+1]!=ec[i]||value[i+1]!=ev[i])good=0;
 for(int i=0;i<physical;i++)if(!dsa_same_triple(a[i+1],v[i]))same=0;
 printf("%d %d %d\n",good,same,dsa_same_triple(a[0],guard)&&dsa_same_triple(a[physical+1],guard)&&r[0]==-8181&&r[rows+2]==-8181&&c[0]==-8181&&c[t+1]==-8181&&value[0]==-8181&&value[t+1]==-8181);
}`,rows:csrRows});
const sumMatrices=[...matrices,{rows:4,cols:4,data:[[0,0,2147483647],[0,1,2147483647],[2,0,-2147483648],[2,3,-2147483648]]},{rows:5,cols:3,data:[[1,0,7],[1,1,-7],[3,2,9]]}];
const sumsRows=sumMatrices.flatMap(({rows,cols,data})=>prefixes(rows).map(n=>{
 const offsets=Array.from({length:rows+1},(_,r)=>data.filter(e=>e[0]<r).length),expected=Array.from({length:n},(_,r)=>data.filter(e=>e[0]===r).reduce((s,e)=>s+e[2],0));
 return row(`const int rv[]=${array(offsets)},cv[]=${array(data.map(e=>e[1]))},vv[]=${array(data.map(e=>e[2]))};const long long e[]=${array(expected.map(v=>v+'LL'))};dsa_sums(rv,${rows+1},cv,vv,${data.length},${n},${cols},${offsets[n]},e);`);
}));
specs.set(id(4),{helpers:String.raw`
static void dsa_sums(const int*rv,int rc,const int*cv,const int*vv,int physical,int rows,int cols,int count,const long long*expected){
 int r[37],c[260],v[260];r[0]=r[rc+1]=-8181;c[0]=c[physical+1]=v[0]=v[physical+1]=-8181;
 for(int i=0;i<rc;i++)r[i+1]=rv[i];for(int i=0;i<physical;i++){c[i+1]=cv[i];v[i+1]=vv[i];}
 long long out[36];for(int i=0;i<rows+2;i++)out[i]=9876543210123LL;
 CSR a={rows,cols,count,r+1,c+1,v+1};csrRowSums(&a,out+1);int good=1,same=a.rows==rows&&a.cols==cols&&a.count==count&&a.row==r+1&&a.col==c+1&&a.value==v+1;
 for(int i=0;i<rows;i++)if(out[i+1]!=expected[i])good=0;for(int i=0;i<rc;i++)if(r[i+1]!=rv[i])same=0;
 for(int i=0;i<physical;i++)if(c[i+1]!=cv[i]||v[i+1]!=vv[i])same=0;
 printf("%d %d %d\n",good,same,out[0]==9876543210123LL&&out[rows+1]==9876543210123LL&&r[0]==-8181&&r[rc+1]==-8181&&c[0]==-8181&&c[physical+1]==-8181&&v[0]==-8181&&v[physical+1]==-8181);
}`,rows:sumsRows});
const zeroBases=matrices.filter(a=>[[0,0],[1,1],[1,7],[3,2],[4,7],[8,8],[16,16]].some(([r,c])=>a.rows===r&&a.cols===c)).map(a=>a.data);
zeroBases.push([[0,0,-2147483648],[0,31,2147483647],[15,9,-7],[31,0,9],[31,31,1]]);
const zeroRows=zeroBases.flatMap(data=>[data.map((e,i)=>[e[0],e[1],i%3?e[2]:0]),data.map(e=>[e[0],e[1],0]),data]).flatMap(data=>prefixes(data.length).map(t=>{
 const expected=data.slice(0,t).filter(e=>e[2]!==0);return row(`const Triple v[]=${triples(data)},e[]=${triples(expected)};dsa_remove(v,${data.length},${t},e,${expected.length});`,[expected.length,1,1,1]);
}));
specs.set(id(5),{helpers:equalTriple+String.raw`
static void dsa_remove(const Triple*v,int physical,int t,const Triple*expected,int expectedCount){
 Triple a[260],guard={-991,-992,-993};a[0]=a[physical+1]=guard;for(int i=0;i<physical;i++)a[i+1]=v[i];
 int n=removeZeroTriples(a+1,t),good=1,tail=1;for(int i=0;i<expectedCount;i++)if(!dsa_same_triple(a[i+1],expected[i]))good=0;
 for(int i=t;i<physical;i++)if(!dsa_same_triple(a[i+1],v[i]))tail=0;
 printf("%d %d %d %d\n",n,good,tail,dsa_same_triple(a[0],guard)&&dsa_same_triple(a[physical+1],guard));
}`,rows:zeroRows});

const A=atom=>({atom}),L=(...items)=>({items});
const shared=L(A(7),L(A(-3)),L()),sameAtom=A(9);
const graphs=[L(),L(A(0)),L(L()),L(A(1),A(1),A(-1)),L(A(1),L(A(2)),A(3)),L(L(),A(0),L(L(),A(-5)),A(4)),L(shared,shared),L(shared,L(shared)),L(shared,L(shared),shared,A(0)),L(sameAtom,sameAtom,L(sameAtom))];
let deep=L(A(2147483647),A(-2147483648)),emptyDeep=L();for(let i=1;i<32;i++){deep=L(deep);emptyDeep=L(emptyDeep);}graphs.push(deep,emptyDeep);
const repeated=L(...Array(30).fill(sameAtom));graphs.push(L(...Array(30).fill(repeated)),L(...Array.from({length:255},(_,i)=>A(ints[i%ints.length]))));
function randomGraph(depth){if(!depth||rand(3)===0)return A(ints[rand(ints.length)]);return L(...Array.from({length:rand(5)},()=>randomGraph(depth-1)));}
for(let i=0;i<30;i++)graphs.push(L(randomGraph(1+i%4),randomGraph(2),A(i-15)));
function graphData(root){const ids=new Map(),nodes=[];function visit(p){if(ids.has(p))return ids.get(p);const n=nodes.length;ids.set(p,n);nodes.push(null);if(p.items)nodes[n]={tag:1,atom:13579+n,children:p.items.map(visit)};else{const mode=(p.atom%4+4)%4;nodes[n]={tag:0,atom:p.atom,children:[],ignoredLength:[0,-3,0,1][mode],ignoredItems:mode!==0};}return n;}visit(root);const edges=[],offsets=[];for(const p of nodes){offsets.push(p.tag===0?(p.ignoredItems?-2:-1):edges.length);edges.push(...p.children);}return {nodes,edges,offsets};}
function appearances(root){const pending=[{p:root,depth:0}],out=[];for(let i=0;i<pending.length;i++){const {p,depth}=pending[i];out.push({p,depth});if(p.items)for(const child of p.items)pending.push({p:child,depth:depth+1});}return out;}
function flatten(root){const todo=[root],out=[];while(todo.length){const p=todo.pop();if(p.items)todo.push(...[...p.items].reverse());else out.push(p.atom);}return out;}
function serialize(root){const {nodes,edges,offsets}=graphData(root);if(nodes.length>256||appearances(root).length>1024)throw Error('广义表超过公开域');return `const int tag[]=${array(nodes.map(p=>p.tag))},atom[]=${array(nodes.map(p=>p.atom))},length[]=${array(nodes.map(p=>p.tag===0?p.ignoredLength:p.children.length))},offset[]=${array(offsets)},edges[]=${array(edges)};` ;}
const graphHelpers=String.raw`
static void dsa_make_graph(GNode*nodes,const GNode**links,const int*tag,const int*atom,const int*length,const int*offset,const int*edges,int nc,int ec){
 nodes[0]=nodes[nc+1]=(GNode){-771,-772,-773,NULL};links[0]=nodes;links[ec+1]=nodes+nc+1;
 nodes[nc+2]=(GNode){GL_LIST,24680,0,NULL};links[ec+2]=nodes+nc+2;
 for(int i=0;i<ec;i++)links[i+1]=nodes+1+edges[i];
 for(int i=0;i<nc;i++)nodes[i+1]=(GNode){tag[i],atom[i],length[i],tag[i]==GL_ATOM?(offset[i]==-2?(const GNode*const*)(links+ec+2):NULL):(length[i]?(const GNode*const*)(links+1+offset[i]):NULL)};
}
static int dsa_graph_same(const GNode*nodes,const GNode*const*links,const int*tag,const int*atom,const int*length,const int*offset,const int*edges,int nc,int ec){
 if(nodes[0].tag!=-771||nodes[0].atom!=-772||nodes[0].length!=-773||nodes[0].items!=NULL||nodes[nc+1].tag!=-771||nodes[nc+1].atom!=-772||nodes[nc+1].length!=-773||nodes[nc+1].items!=NULL||links[0]!=nodes||links[ec+1]!=nodes+nc+1)return 0;
 if(nodes[nc+2].tag!=GL_LIST||nodes[nc+2].atom!=24680||nodes[nc+2].length!=0||nodes[nc+2].items!=NULL||links[ec+2]!=nodes+nc+2)return 0;
 for(int i=0;i<ec;i++)if(links[i+1]!=nodes+1+edges[i])return 0;
 for(int i=0;i<nc;i++)if(nodes[i+1].tag!=tag[i]||nodes[i+1].atom!=atom[i]||nodes[i+1].length!=length[i]||nodes[i+1].items!=(tag[i]==GL_ATOM?(offset[i]==-2?(const GNode*const*)(links+ec+2):NULL):(length[i]?(const GNode*const*)(links+1+offset[i]):NULL)))return 0;
 return 1;
}
`;
const graphCall=(root,extra)=>{const d=graphData(root);return serialize(root)+`dsa_graphcase(tag,atom,length,offset,edges,${d.nodes.length},${d.edges.length}${extra});`;};
const levelRows=graphs.flatMap(root=>{const atoms=appearances(root).filter(x=>!x.p.items),max=atoms.reduce((n,x)=>Math.max(n,x.depth),0);return [...new Set([max,Math.min(32,max+2)])].map(levels=>{
 const expected=Array.from({length:levels},(_,i)=>atoms.filter(x=>x.depth===i+1).length);return row(`const long long expected[]=${array(expected.map(v=>v+'LL'))};`+graphCall(root,`,${levels},expected`));
});});
specs.set(id(6),{helpers:graphHelpers+String.raw`
static void dsa_graphcase(const int*tag,const int*atom,const int*length,const int*offset,const int*edges,int nc,int ec,int levels,const long long*expected){
 GNode nodes[259];const GNode*links[1027];dsa_make_graph(nodes,links,tag,atom,length,offset,edges,nc,ec);
 long long out[36];for(int i=0;i<levels+2;i++)out[i]=9876543210123LL;
 countAtomsByLevel(nodes+1,out+1,levels);int good=1;for(int i=0;i<levels;i++)if(out[i+1]!=expected[i])good=0;
 printf("%d %d %d\n",good,dsa_graph_same(nodes,links,tag,atom,length,offset,edges,nc,ec),out[0]==9876543210123LL&&out[levels+1]==9876543210123LL);
}`,rows:levelRows});
const allGraphs=[...graphs,A(0),A(-2147483648),A(2147483647),A(7)];
specs.set(id(7),{helpers:graphHelpers+String.raw`
static void dsa_graphcase(const int*tag,const int*atom,const int*length,const int*offset,const int*edges,int nc,int ec,const int*expected,int count){
 GNode nodes[259];const GNode*links[1027];dsa_make_graph(nodes,links,tag,atom,length,offset,edges,nc,ec);
 int out[1027];for(int i=0;i<count+2;i++)out[i]=71234567;
 int n=flattenAtoms(nodes+1,out+1),good=1;for(int i=0;i<count;i++)if(out[i+1]!=expected[i])good=0;
 printf("%d %d %d %d\n",n,good,dsa_graph_same(nodes,links,tag,atom,length,offset,edges,nc,ec),out[0]==71234567&&out[count+1]==71234567);
}`,rows:allGraphs.map(root=>{const expected=flatten(root);return row(`const int expected[]=${array(expected)};`+graphCall(root,`,expected,${expected.length}`),[expected.length,1,1,1]);})});
specs.set(id(8),{helpers:graphHelpers+String.raw`
static void dsa_graphcase(const int*tag,const int*atom,const int*length,const int*offset,const int*edges,int nc,int ec){
 GNode nodes[259];const GNode*links[1027];dsa_make_graph(nodes,links,tag,atom,length,offset,edges,nc,ec);
 long long result=sumAtoms(nodes+1);printf("%lld %d\n",result,dsa_graph_same(nodes,links,tag,atom,length,offset,edges,nc,ec));
}`,rows:allGraphs.map(root=>row(graphCall(root,''),[flatten(root).reduce((a,b)=>a+b,0),1]))});

const text=s=>Array.from(s,c=>c.charCodeAt(0));
function canonical(root){const todo=[root],out=[];while(todo.length){const p=todo.pop();if(typeof p==='string'){out.push(p);continue;}if(!p.items){out.push(String.fromCharCode(p.atom));continue;}todo.push(')');for(let i=p.items.length-1;i>=0;i--){todo.push(p.items[i]);if(i)todo.push(',');}todo.push('(');}return out.join('');}
function letterTree(p){return p.items?L(...p.items.map(letterTree)):A(65+((p.atom%52+52)%52<26?(p.atom%52+52)%52:((p.atom%52+52)%52)+6));}
const letterGraphs=allGraphs.filter(p=>appearances(p).length<=256).map(letterTree);
letterGraphs.push(L(...Array.from({length:255},()=>L())));
function validText(bytes){const tokens=bytes.filter(b=>b!==32),stack=[];let done=false;
 const expects=()=>stack.length?stack.at(-1)!==2:!done;
 const complete=()=>{if(stack.length)stack[stack.length-1]=2;else done=true;};
 for(const b of tokens){if(b>=65&&b<=90||b>=97&&b<=122){if(!expects())return false;complete();}
  else if(b===40){if(!expects())return false;stack.push(0);}
  else if(b===41){if(!stack.length||stack.at(-1)===1)return false;stack.pop();complete();}
  else if(b===44){if(!stack.length||stack.at(-1)!==2)return false;stack[stack.length-1]=1;}
  else return false;
 }return done&&stack.length===0;
}
const texts=['',' ','a','Z','()','(a)','(a,(),(b,C))',',','(',')','(,a)','(a,)','(a,,b)','(ab)','a b','aa','()a','(a)(b)','((a)','(a))','1','(a  b)','(a\t,b)','(a,[b])'];
for(const root of letterGraphs.slice(0,25)){const s=canonical(root);texts.push(s,s.split('').join(' '));}
for(let n=1;n<=3;n++)for(let mask=0;mask<5**n;mask++){let k=mask,s='';for(let j=0;j<n;j++){s+=['a','(',')',',',' '][k%5];k=Math.floor(k/5);}texts.push(s);}
texts.push('('.repeat(256)+')'.repeat(256),'('.repeat(255)+'a'+')'.repeat(255),'('.repeat(255)+'a'+')'.repeat(255)+'!','a'.repeat(512),'('.repeat(512),' '.repeat(512));
const textCases=[...new Set(texts.filter(s=>s.length<=512))].map(s=>({bytes:text(s),n:s.length}));
textCases.push({bytes:[97,0,98],n:3},{bytes:[40,97,44,0,98,41],n:6},{bytes:[97,255],n:2},{bytes:[255],n:1});
for(const s of ['a','()','(a,(),b)','('.repeat(255)+'a'+')'.repeat(255)]){const bytes=[...text(s),33];for(const n of prefixes(s.length))textCases.push({bytes,n});}
specs.set(id(9),{helpers:String.raw`
static void dsa_text(const unsigned char*v,int physical,int n){
 unsigned char s[520];s[0]=231;for(int i=0;i<physical;i++)s[i+1]=v[i];s[physical+1]=173;s[physical+2]=0;
 int result=isGListText(s+1,n),same=1;for(int i=0;i<physical;i++)if(s[i+1]!=v[i])same=0;
 printf("%d %d %d\n",result,same,s[0]==231&&s[physical+1]==173);
}`,rows:textCases.map(({bytes,n})=>row(`const unsigned char v[]=${array(bytes)};dsa_text(v,${bytes.length},${n});`,[Number(validText(bytes.slice(0,n))),1,1]))});
specs.set(id(10),{helpers:graphHelpers+String.raw`
static void dsa_graphcase(const int*tag,const int*atom,const int*length,const int*offset,const int*edges,int nc,int ec,const char*expected,int count){
 GNode nodes[259];const GNode*links[1027];dsa_make_graph(nodes,links,tag,atom,length,offset,edges,nc,ec);
 unsigned char out[1030];for(int i=0;i<count+3;i++)out[i]=231;out[count+2]=173;
 int n=formatGList(nodes+1,(char*)(out+1)),good=1;for(int i=0;i<=count;i++)if(out[i+1]!=(unsigned char)expected[i])good=0;
 printf("%d %d %d %d\n",n,good,dsa_graph_same(nodes,links,tag,atom,length,offset,edges,nc,ec),out[0]==231&&out[count+2]==173);
}`,rows:letterGraphs.map(root=>{const expected=canonical(root);return row(graphCall(root,`,${JSON.stringify(expected)},${expected.length}`),[expected.length,1,1,1]);})});

const signatures=[
 'void transposeSquare(int a[],int n)',
 'void fastTranspose(const Triple src[],int rows,int cols,int t,Triple dst[])',
 'void tripletsToCSR(const Triple src[],int rows,int cols,int t,int row[],int col[],int value[])',
 'void csrRowSums(const CSR*a,long long sums[])',
 'int removeZeroTriples(Triple a[],int t)',
 'void countAtomsByLevel(const GNode*root,long long counts[],int levels)',
 'int flattenAtoms(const GNode*root,int out[])',
 'long long sumAtoms(const GNode*root)',
 'int isGListText(const unsigned char s[],int n)',
 'int formatGList(const GNode*root,char out[])'
];
for(const spec of specs.values())spec.rows=[...new Map(spec.rows.map(r=>[r.body+'\n'+r.out.join(' '),r])).values()];
export const dsArrayContractIds=[...specs.keys()];
export function dsArrayContract(questionId){const spec=specs.get(questionId);if(!spec)return null;const n=Number(questionId.slice(-3)),type=n>=6&&n!==9?dsArrayTypes.glist:n===4?dsArrayTypes.csr:n===2||n===3||n===5?dsArrayTypes.triple:'';const groups=spec.rows.map(r=>r.out);return {prelude:'#include <stddef.h>\n'+type+'\n'+signatures[n-1]+';\n',harness:'\n#include <stdio.h>\n'+spec.helpers+'\n'+spec.rows.map((r,i)=>`static void dsa_case_${i}(void){${r.body}}`).join('\n')+'\nint main(void){\n'+spec.rows.map((_,i)=>`dsa_case_${i}();`).join('\n')+'\nreturn 0;}\n',groups,expected:groups.flat()};}
export const dsArrayReferenceSources=Object.fromEntries(dsArrayContractIds.map(id=>[id,dsArrayTaskGuides[id].solution]));
