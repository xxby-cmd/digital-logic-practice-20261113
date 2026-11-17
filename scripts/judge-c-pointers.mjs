// Trusted server-only pointer drivers. JS tracks values and object identities.
const qid=(tag,n)=>`C6P-programming-8-${tag}-${String(n).padStart(3,'0')}`;
const lit=a=>`{${a.length?a.join(','):0}}`;
const item=(body,out)=>({body,out});
const specs=new Map(),sources={};
function add(tag,n,source,build,{node=false,helpers=''}={}){const id=qid(tag,n);sources[id]=source;specs.set(id,{build,node,helpers});}
const sets=[[-9,0,8],[3,3,-2],[0,0,0],[-1000,1000,7]];
const wideSets=[...sets,[-1000000,1000000,999999],[1000000,-999999,0]];
const pairs=[0,1,2].flatMap(i=>[0,1,2].map(j=>[i,j]));
const objects=v=>`int ${v.map((x,i)=>`v${i}=${x}`).join(',')};int *objects[${v.length}]={${v.map((_,i)=>`&v${i}`).join(',')}};`;
const objPrint=n=>`for(int i=0;i<${n};i++)printf("%d ",*objects[i]);puts("");`;
const address=i=>i<0?'NULL':`objects[${i}]`;
function ptrCode(pointer,name,refs='objects',n=3){return `int ${name}=-2;if(${pointer}==NULL)${name}=-1;for(int j=0;j<${n};j++)if(${pointer}==${refs}[j])${name}=j;`;}
function arrayCode(pointer,name,n,base='a'){return `int ${name}=-2;if(${pointer}==NULL)${name}=-1;for(int j=0;j<=${n};j++)if(${pointer}==${base}+j)${name}=j;`;}
const intArray=n=>Array.from({length:n},(_,i)=>i===0?-2147483648:i===n-1?2147483647:i*17-43);
const arrayDecl=a=>`int a[${Math.max(1,a.length)}]=${lit(a)};`;
const arrayPrint=n=>`for(int i=0;i<${n};i++)printf("%d ",a[i]);puts("");`;
const textDecl=s=>`char text[]=${JSON.stringify(s)};`;
const textPrint=n=>`for(int i=0;i<=${n};i++)printf("%d ",(unsigned char)text[i]);puts("");`;
const textValues=s=>[...[...s].map(c=>c.charCodeAt(0)),0];

add('B',1,'void addTo(int *target,int delta){*target+=delta;}',()=>wideSets.flatMap(v=>[0,1,2].flatMap(i=>[-1000000,-7,0,11,1000000].map(d=>{
 const after=[...v];after[i]+=d;return item(objects(v)+`addTo(objects[${i}],${d});`+objPrint(3),after);
}))));
add('B',2,'int takeAndClear(int *target){int old=*target;*target=0;return old;}',()=>[...sets,[-2147483648,2147483647,-1]].flatMap(v=>[0,1,2].map(i=>{
 const after=[...v];after[i]=0;return item(objects(v)+`printf("%d ",takeAndClear(objects[${i}]));`+objPrint(3),[v[i],...after]);
})));
add('B',3,'void rotateObjects(int*a,int*b,int*c){int old=*a;*a=*c;*c=*b;*b=old;}',()=>[...sets,[-2147483648,2147483647,0]].map(v=>item(objects(v)+'rotateObjects(objects[0],objects[1],objects[2]);'+objPrint(3),[v[2],v[0],v[1]])));
add('B',4,'void exchangePointers(int**p,int**q){int*t=*p;*p=*q;*q=t;}',()=>[-1,0,1,2].flatMap(i=>[-1,0,1,2].flatMap(j=>[false,true].map(same=>item(
 objects(sets[0])+`int*p=${address(i)},*q=${address(j)};exchangePointers(&p,${same?'&p':'&q'});`+
 ptrCode('p','pc')+ptrCode('q','qc')+'printf("%d %d ",pc,qc);'+objPrint(3),[same?i:j,same?j:i,...sets[0]])))));
add('B',5,'int *largerObject(int*a,int*b){return *a>=*b?a:b;}',()=>[...sets,[-2147483648,2147483647,0]].flatMap(v=>pairs.map(([i,j])=>item(
 objects(v)+`int*p=largerObject(objects[${i}],objects[${j}]);`+ptrCode('p','code')+'printf("%d ",code);'+objPrint(3),[v[i]>=v[j]?i:j,...v]))));
add('B',6,'int *matrixCell(int(*a)[4],int row,int column){return *(a+row)+column;}',()=>Array.from({length:3},(_,r)=>Array.from({length:4},(_,c)=>{
 const a=Array.from({length:12},(_,i)=>i*7-13);
 return item(`int a[3][4]=${lit(a)};int*p=matrixCell(a,${r},${c});int code=-2;for(int i=0;i<3;i++)for(int j=0;j<4;j++)if(p==&a[i][j])code=i*4+j;printf("%d ",code);for(int i=0;i<3;i++)for(int j=0;j<4;j++)printf("%d ",a[i][j]);puts("");`,[r*4+c,...a]);
})).flat());
add('B',7,'void retarget(int**pointer,int*where){*pointer=where;}',()=>[-1,0,1,2].flatMap(i=>[-1,0,1,2].map(j=>item(
 objects(sets[0])+`int*p=${address(i)};retarget(&p,${address(j)});`+ptrCode('p','code')+'printf("%d ",code);'+objPrint(3),[j,...sets[0]]))));
add('B',8,'int advancePointer(int**cursor,int*end){if(*cursor==end)return 0;++*cursor;return 1;}',()=>[0,1,2,7,32].flatMap(n=>Array.from({length:n+1},(_,p)=>item(
 arrayDecl(intArray(n))+`int*p=a+${p};int result=advancePointer(&p,a+${n});`+arrayCode('p','code',n)+'printf("%d %d ",result,code);'+arrayPrint(n),[Number(p<n),p<n?p+1:p,...intArray(n)]))));
add('B',9,'int readAdvance(const int**cursor,const int*end,int*out){if(*cursor==end)return 0;*out=**cursor;++*cursor;return 1;}',()=>[0,1,2,7,32].flatMap(n=>Array.from({length:n+1},(_,p)=>item(
 arrayDecl(intArray(n))+`const int*p=a+${p};int out=-918273;int result=readAdvance(&p,a+${n},&out);`+arrayCode('p','code',n)+'printf("%d %d %d ",result,out,code);'+arrayPrint(n),[Number(p<n),p<n?intArray(n)[p]:-918273,p<n?p+1:p,...intArray(n)]))));
add('B',10,'void writePair(int*first,int*second,int value){*first=value;*second=value+1;}',()=>sets.flatMap(v=>pairs.flatMap(([i,j])=>[-1000000,-7,0,11,1000000].map(value=>{
 const after=[...v];after[i]=value;after[j]=value+1;return item(objects(v)+`writePair(objects[${i}],objects[${j}],${value});`+objPrint(3),after);
}))));
add('B',11,'void elementAddresses(int a[],int n,int*out[]){for(int i=0;i<n;i++)out[i]=a+i;}',()=>[0,1,3,9,32].map(n=>item(
 arrayDecl(intArray(n))+`int*out[${Math.max(1,n)}]={0};elementAddresses(a,${n},out);for(int i=0;i<${n};i++){int code=-2;for(int j=0;j<${n};j++)if(out[i]==a+j)code=j;printf("%d ",code);}`+arrayPrint(n),[...Array.from({length:n},(_,i)=>i),...intArray(n)])));
const texts=['','a','abc','  ab  ','path/test','x'.repeat(80)];
add('B',12,'const char *textEnd(const char*s){while(*s)++s;return s;}',()=>texts.map(s=>item(
 textDecl(s)+`const char*p=textEnd(text);`+arrayCode('p','code',s.length,'text')+'printf("%d ",code);'+textPrint(s.length),[s.length,...textValues(s)])));
const spaceCases=[['',0],['abc',0],[' abc',0],['   ',0],['ab   cd',2],['ab   cd',4],['  a ',4],[' '.repeat(80),0]];
add('B',13,"void skipInitialSpaces(const char**cursor){while(**cursor==' ')++*cursor;}",()=>spaceCases.map(([s,p])=>{
 const next=p+s.slice(p).match(/^ */)[0].length;
 return item(textDecl(s)+`const char*p=text+${p};skipInitialSpaces(&p);`+arrayCode('p','code',s.length,'text')+'printf("%d ",code);'+textPrint(s.length),[next,...textValues(s)]);
}));
const unaryHelpers=`static int cptr_calls,cptr_argument,cptr_before;static int*cptr_watch=NULL;
static int cptr_unary1(int x){cptr_calls++;cptr_argument=x;cptr_before=cptr_watch?*cptr_watch:0;return x*2+1;}
static int cptr_unary2(int x){cptr_calls++;cptr_argument=x;cptr_before=cptr_watch?*cptr_watch:0;return x-3;}
static int cptr_unary3(int x){cptr_calls++;cptr_argument=x;cptr_before=cptr_watch?*cptr_watch:0;return -x;}
static int cptr_unary4(int x){cptr_calls++;cptr_argument=x;cptr_before=cptr_watch?*cptr_watch:0;return x;}`;
const unary=(f,x)=>f===1?x*2+1:f===2?x-3:f===3?-x:x;
add('B',14,'int applyUnary(int value,int(*operation)(int)){return operation(value);}',()=>[1,2,3,4].flatMap(f=>(f===4?[-2147483648,0,2147483647]:[-1000,0,7,1000]).map(x=>item(
 `cptr_calls=0;cptr_watch=NULL;int result=applyUnary(${x},cptr_unary${f});printf("%d %d %d\\n",result,cptr_calls,cptr_argument);`,[unary(f,x),1,x]))),{helpers:unaryHelpers});
const nodeSource='typedef struct Node{int data;struct Node *next;}Node;\n';
function nodeSetup(n,values,links){return `Node nodes[${n}];`+values.map((v,i)=>`nodes[${i}].data=${v};nodes[${i}].next=${links[i]<0?'NULL':`&nodes[${links[i]}]`};`).join('');}
function nodePrint(n){return `for(int i=0;i<${n};i++){int code=-2;if(nodes[i].next==NULL)code=-1;for(int j=0;j<${n};j++)if(nodes[i].next==&nodes[j])code=j;printf("%d %d ",nodes[i].data,code);}puts("");`;}
const nodeExpected=(values,links)=>values.flatMap((v,i)=>[v,links[i]]);
add('B',15,'void linkAfter(Node*position,Node*node){node->next=position->next;position->next=node;}',()=>[1,2,3,4].flatMap(n=>Array.from({length:n},(_,pos)=>{
 const values=Array.from({length:n+2},(_,i)=>i*7-9),links=values.map((_,i)=>i+1<n?i+1:-1);links[n]=n+1;
 const after=[...links];after[n]=links[pos];after[pos]=n;
 return item(nodeSetup(n+2,values,links)+`linkAfter(&nodes[${pos}],&nodes[${n}]);`+nodePrint(n+2),nodeExpected(values,after));
})),{node:true});

add('P',1,'void addFrom(int*destination,const int*source){*destination+=*source;}',()=>wideSets.flatMap(v=>pairs.map(([i,j])=>{
 const after=[...v];after[i]+=v[j];return item(objects(v)+`addFrom(objects[${i}],objects[${j}]);`+objPrint(3),after);
})));
add('P',2,'int transferAmount(int*from,int*to,int amount){if(*from<amount)return 0;*from-=amount;*to+=amount;return 1;}',()=>[[0,0,7],[5,3,1],[10,10,0],[1000000,1000000,0]].flatMap(v=>[[0,1],[1,0],[0,0],[1,1]].flatMap(([i,j])=>[0,1,5,11,1000000].map(amount=>{
 const success=v[i]>=amount,after=[...v];if(success){after[i]-=amount;after[j]+=amount;}
 return item(objects(v)+`printf("%d ",transferAmount(objects[${i}],objects[${j}],${amount}));`+objPrint(3),[Number(success),...after]);
}))));
add('P',3,'void sumDifference(int*a,int*b){int x=*a,y=*b;*a=x+y;*b=x-y;}',()=>wideSets.flatMap(v=>pairs.filter(([i,j])=>i!==j).map(([i,j])=>{
 const after=[...v];after[i]=v[i]+v[j];after[j]=v[i]-v[j];return item(objects(v)+`sumDifference(objects[${i}],objects[${j}]);`+objPrint(3),after);
})));
add('P',4,'int replaceTarget(int**slot,int*expected,int*replacement){if(*slot!=expected)return 0;*slot=replacement;return 1;}',()=>[-1,0,1,2].flatMap(i=>[-1,0,1,2].flatMap(e=>[-1,0,1,2].map(r=>item(
 objects([3,3,-7])+`int*p=${address(i)};int result=replaceTarget(&p,${address(e)},${address(r)});`+ptrCode('p','code')+'printf("%d %d ",result,code);'+objPrint(3),[Number(i===e),i===e?r:i,3,3,-7])))));
add('P',5,'int clearAndDetach(int**slot){if(*slot==NULL)return 0;**slot=0;*slot=NULL;return 1;}',()=>sets.flatMap(v=>[-1,0,1,2].map(i=>{
 const after=[...v];if(i>=0)after[i]=0;return item(objects(v)+`int*p=${address(i)};int result=clearAndDetach(&p);`+ptrCode('p','code')+'printf("%d %d ",result,code);'+objPrint(3),[Number(i>=0),-1,...after]);
})));
add('P',6,'int *addressAt(int*base,int n,int index){if(index<0||index>n)return NULL;return base+index;}',()=>[0,1,3,9,32].flatMap(n=>[...new Set([-1,0,Math.floor(n/2),n,n+1])].map(index=>item(
 arrayDecl(intArray(n))+`int*p=addressAt(a,${n},${index});`+arrayCode('p','code',n)+'printf("%d ",code);'+arrayPrint(n),[index>=0&&index<=n?index:-1,...intArray(n)]))));
add('P',7,'int positionOf(const int*base,int n,const int*pointer){return (int)(pointer-base);}',()=>[0,1,4,7,64].flatMap(n=>Array.from({length:n+1},(_,p)=>item(
 arrayDecl(intArray(n))+`printf("%d ",positionOf(a,${n},a+${p}));`+arrayPrint(n),[p,...intArray(n)]))));
const tables=[[],[-1],[0,1],[2,0,2,-1],Array.from({length:16},(_,i)=>i%4-1)];
const tableDecl=ids=>`int*table[${Math.max(1,ids.length)}]={${ids.length?ids.map(address).join(','):'NULL'}};`;
const tablePrint=n=>`for(int i=0;i<${n};i++){int code=-2;if(table[i]==NULL)code=-1;for(int j=0;j<3;j++)if(table[i]==objects[j])code=j;printf("%d ",code);}`+objPrint(3);
add('P',8,'int *selectAddress(int*const table[],int n,int index){return index>=0&&index<n?table[index]:NULL;}',()=>tables.flatMap(ids=>[...new Set([-1,0,ids.length-1,ids.length])].map(index=>item(
 objects(sets[1])+tableDecl(ids)+`int*p=selectAddress(table,${ids.length},${index});`+ptrCode('p','code')+'printf("%d ",code);'+tablePrint(ids.length),[index>=0&&index<ids.length?ids[index]:-1,...ids,...sets[1]]))));
add('P',9,'void redirectMatches(int*table[],int n,int*oldTarget,int*newTarget){for(int i=0;i<n;i++)if(table[i]==oldTarget)table[i]=newTarget;}',()=>tables.flatMap(ids=>[-1,0,1,2].flatMap(old=>[-1,0,1,2].map(next=>item(
 objects(sets[1])+tableDecl(ids)+`redirectMatches(table,${ids.length},${address(old)},${address(next)});`+tablePrint(ids.length),[...ids.map(i=>i===old?next:i),...sets[1]])))));
const intervals=[0,1,4,9,64].flatMap(n=>[...new Set([0,Math.floor(n/2),n])].flatMap(lo=>[...new Set([lo,Math.min(n,lo+1),n])].map(hi=>({n,lo,hi}))));
add('P',10,'int *middleAddress(int*begin,int*end){return begin+(end-begin)/2;}',()=>intervals.map(({n,lo,hi})=>item(
 arrayDecl(intArray(n))+`int*p=middleAddress(a+${lo},a+${hi});`+arrayCode('p','code',n)+'printf("%d ",code);'+arrayPrint(n),[lo+Math.floor((hi-lo)/2),...intArray(n)])));
const paths=['','a','/','ab/cd','ab/','/ab//cd','////','a/b/c','x'.repeat(80)];
add('P',11,"const char *lastPathPart(const char*path){const char*result=path;for(;*path;path++)if(*path=='/')result=path+1;return result;}",()=>paths.map(s=>item(
 textDecl(s)+'const char*p=lastPathPart(text);'+arrayCode('p','code',s.length,'text')+'printf("%d ",code);'+textPrint(s.length),[s.lastIndexOf('/')+1,...textValues(s)])));
const splitTexts=['','a','abc','a,b:c d',',abc','abc,','a,,b',' a ','::'];
add('P',12,'int splitFirst(char*text,int separator,char**right){for(char*p=text;*p;p++)if(*p==separator){*p=0;*right=p+1;return 1;}*right=NULL;return 0;}',()=>splitTexts.flatMap(s=>[44,58,32].map(separator=>{
 const index=s.indexOf(String.fromCharCode(separator)),after=textValues(s);if(index>=0)after[index]=0;
 return item(textDecl(s)+`char outside='x';char*right=&outside;int result=splitFirst(text,${separator},&right);`+arrayCode('right','code',s.length,'text')+'printf("%d %d ",result,code);'+textPrint(s.length),[Number(index>=0),index>=0?index+1:-1,...after]);
})));
const moveCases=[];for(let from=0;from<=6;from++)for(let to=0;to<=6;to++)for(let n=0;n<=Math.min(6-from,6-to);n++)moveCases.push({a:[1,2,3,4,5,6],from,to,n});
for(const [from,to,n]of [[0,1,32],[1,0,32],[0,0,32],[33,33,0]])moveCases.push({a:intArray(33),from,to,n});
add('P',13,'void moveOverlapping(int*destination,const int*source,int n){if(destination<source){for(int i=0;i<n;i++)destination[i]=source[i];}else{for(int i=n;i>0;i--)destination[i-1]=source[i-1];}}',()=>moveCases.map(({a,from,to,n})=>{
 const after=[...a],snapshot=a.slice(from,from+n);snapshot.forEach((v,i)=>after[to+i]=v);
 return item(arrayDecl(a)+`moveOverlapping(a+${to},a+${from},${n});`+arrayPrint(a.length),after);
}));
const writableTables=[[],[0],[0,0,0],[2,0,2,1],Array.from({length:16},(_,i)=>i%3)];
add('P',14,'void bumpTargets(int*const targets[],int n,int delta){for(int i=0;i<n;i++)*targets[i]+=delta;}',()=>writableTables.flatMap(ids=>[-1000,-7,0,11,1000].map(delta=>{
 const v=sets[1],after=[...v];for(const i of ids)after[i]+=delta;
 return item(objects(v)+tableDecl(ids)+`bumpTargets(table,${ids.length},${delta});`+tablePrint(ids.length),[...ids,...after]);
})));
add('P',15,'int equalPointerPairs(int*const pointers[],int n){int count=0;for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if(pointers[i]==pointers[j])count++;return count;}',()=>[...tables,[-1,-1,-1],[0,0,0,0]].map(ids=>{
 const freq=new Map();for(const x of ids)freq.set(x,(freq.get(x)||0)+1);
 const count=[...freq.values()].reduce((s,n)=>s+n*(n-1)/2,0);
 return item(objects(sets[1])+tableDecl(ids)+`printf("%d ",equalPointerPairs(table,${ids.length}));`+tablePrint(ids.length),[count,...ids,...sets[1]]);
}));
const spans=[{a:[],lo:0,hi:0},{a:[97,98,99,100],lo:0,hi:2},{a:[97,0,98,99],lo:0,hi:4},
 {a:[97,0,98,99],lo:2,hi:4},{a:[0,97],lo:0,hi:2},{a:[97],lo:1,hi:1},
 {a:Array(80).fill(97),lo:0,hi:80},{a:Array(80).fill(97),lo:7,hi:27}];
add('P',16,'int visibleSpan(const char*begin,const char*end){const char*p=begin;while(p<end&&*p)++p;return (int)(p-begin);}',()=>spans.map(({a,lo,hi})=>{
 const data=a.slice(lo,hi),zero=data.indexOf(0),length=zero<0?data.length:zero;
 return item(`char a[${Math.max(1,a.length)}]=${lit(a)};printf("%d ",visibleSpan(a+${lo},a+${hi}));for(int i=0;i<${a.length};i++)printf("%d ",(unsigned char)a[i]);puts("");`,[length,...a]);
}));
const integerTexts=[['',0],['x12',0],['  007,z',0],['  007,z',1],['12x34',0],['12x34',3],['  ',0],['0',0],['999',0],['+12',0],['-12',0],['x 7',2],['12',2]];
add('P',17,"int readSmallInt(const char**cursor,int*out){const char*p=*cursor;while(*p==' ')p++;if(*p<'0'||*p>'9')return 0;int value=0;while(*p>='0'&&*p<='9'){value=value*10+*p-'0';p++;}*out=value;*cursor=p;return 1;}",()=>integerTexts.map(([s,p])=>{
 const match=s.slice(p).match(/^ *(\d+)/),next=match?p+match[0].length:p,value=match?Number(match[1]):-918273;
 return item(textDecl(s)+`const char*p=text+${p};int out=-918273;int result=readSmallInt(&p,&out);`+arrayCode('p','code',s.length,'text')+'printf("%d %d %d ",result,code,out);'+textPrint(s.length),[Number(!!match),next,value,...textValues(s)]);
}));
const literalTexts=[{s:'',p:0,w:''},{s:'',p:0,w:'a'},{s:'abcd',p:0,w:'ab'},
 {s:'abcd',p:0,w:'ax'},{s:'abc',p:0,w:'abcd'},{s:'abcd',p:2,w:'cd'},
 {s:'abcd',p:4,w:''},{s:'abcd',p:4,w:'a'},{s:'abcabc',p:0,alias:0},
 {s:'abcabc',p:0,alias:3},{s:'abcabc',p:3,alias:0},{s:'abcabc',p:3,alias:3}];
add('P',18,'int consumeLiteral(const char**cursor,const char*word){const char*p=*cursor;int i=0;while(word[i]){if(p[i]!=word[i])return 0;i++;}*cursor=p+i;return 1;}',()=>literalTexts.map(({s,p,w,alias})=>{
 const word=alias===undefined?w:s.slice(alias),success=s.slice(p).startsWith(word),next=success?p+word.length:p;
 return item(textDecl(s)+(alias===undefined?`const char word[]=${JSON.stringify(w)};`:`const char*word=text+${alias};`)+
  `const char*p=text+${p};int result=consumeLiteral(&p,word);`+arrayCode('p','code',s.length,'text')+'printf("%d %d ",result,code);'+textPrint(s.length),[Number(success),next,...textValues(s)]);
}));
add('P',19,'int **findPointerSlot(int*slots[],int n,int*target){for(int i=0;i<n;i++)if(slots[i]==target)return &slots[i];return NULL;}',()=>tables.flatMap(ids=>[-1,0,1,2].map(target=>item(
 objects(sets[1])+tableDecl(ids)+`int**p=findPointerSlot(table,${ids.length},${address(target)});int code=-2;if(p==NULL)code=-1;for(int i=0;i<${ids.length};i++)if(p==&table[i])code=i;printf("%d ",code);`+tablePrint(ids.length),[ids.indexOf(target),...ids,...sets[1]]))));
add('P',20,'int moveReference(int**from,int**to){if(*to!=NULL)return 0;*to=*from;*from=NULL;return 1;}',()=>[-1,0,1,2].flatMap(i=>[-1,0,1,2].map(j=>item(
 objects(sets[0])+`int*from=${address(i)},*to=${address(j)};int result=moveReference(&from,&to);`+
 ptrCode('from','fromCode')+ptrCode('to','toCode')+'printf("%d %d %d ",result,fromCode,toCode);'+objPrint(3),[Number(j<0),j<0?-1:i,j<0?i:j,...sets[0]]))));
add('P',21,'void prependGiven(Node**head,Node*node){node->next=*head;*head=node;}',()=>[0,1,2,4].flatMap(n=>[false,true].map(field=>{
 const values=Array.from({length:n+2},(_,i)=>i*7-9),links=values.map((_,i)=>i+1<n?i+1:-1),anchor=n+1;
 links[n]=anchor;if(field)links[anchor]=n?0:-1;
 const after=[...links];after[n]=n?0:-1;if(field)after[anchor]=n;
 return item(nodeSetup(n+2,values,links)+`Node*head=${n?'&nodes[0]':'NULL'};Node**slot=${field?`&nodes[${anchor}].next`:'&head'};prependGiven(slot,&nodes[${n}]);Node*p=*slot;int code=-2;for(int i=0;i<${n+2};i++)if(p==&nodes[i])code=i;printf("%d ",code);`+nodePrint(n+2),[n,...nodeExpected(values,after)]);
})),{node:true});
add('P',22,'Node *detachFirst(Node**head){Node*first=*head;if(!first)return NULL;*head=first->next;first->next=NULL;return first;}',()=>[0,1,2,4].flatMap(n=>[false,true].map(field=>{
 const values=Array.from({length:n+1},(_,i)=>i*7-9),links=values.map((_,i)=>i+1<n?i+1:-1),anchor=n;
 if(field)links[anchor]=n?0:-1;
 const after=[...links];if(n)after[0]=-1;if(field)after[anchor]=n>1?1:-1;
 return item(nodeSetup(n+1,values,links)+`Node*head=${n?'&nodes[0]':'NULL'};Node**slot=${field?`&nodes[${anchor}].next`:'&head'};Node*p=detachFirst(slot);int returned=-2,headCode=-2;if(p==NULL)returned=-1;if(*slot==NULL)headCode=-1;for(int i=0;i<${n+1};i++){if(p==&nodes[i])returned=i;if(*slot==&nodes[i])headCode=i;}printf("%d %d ",returned,headCode);`+nodePrint(n+1),[n?0:-1,n>1?1:-1,...nodeExpected(values,after)]);
})),{node:true});
const compareHelpers=`static int cptr_calls,cptr_arg1,cptr_arg2;
static int cptr_compare1(int a,int b){cptr_calls++;cptr_arg1=a;cptr_arg2=b;return a-b;}
static int cptr_compare2(int a,int b){cptr_calls++;cptr_arg1=a;cptr_arg2=b;return a<b?13:a>b?-29:0;}
static int cptr_compare3(int a,int b){cptr_calls++;cptr_arg1=a;cptr_arg2=b;return a%2==0?8:-3;}
static int cptr_compare4(int a,int b){cptr_calls++;cptr_arg1=a;cptr_arg2=b;return -2147483647-1;}
static int cptr_compare5(int a,int b){cptr_calls++;cptr_arg1=a;cptr_arg2=b;return 2147483647;}`;
const compare=(f,a,b)=>f===1?a-b:f===2?(a<b?13:a>b?-29:0):f===3?(a%2===0?8:-3):f===4?-2147483648:2147483647;
add('P',23,'int compareBy(int a,int b,int(*comparison)(int,int)){int result=comparison(a,b);return (result>0)-(result<0);}',()=>[1,2,3,4,5].flatMap(f=>[[-7,3],[5,5],[1000,-1000],[0,7]].map(([a,b])=>item(
 `cptr_calls=0;int result=compareBy(${a},${b},cptr_compare${f});printf("%d %d %d %d\\n",result,cptr_calls,cptr_arg1,cptr_arg2);`,[Math.sign(compare(f,a,b)),1,a,b]))),{helpers:compareHelpers});
add('P',24,'int updateBy(int*object,int(*operation)(int)){int value=operation(*object);*object=value;return value;}',()=>sets.flatMap(v=>[0,1,2].flatMap(i=>[1,2,3].map(f=>{
 const after=[...v],next=unary(f,v[i]);after[i]=next;
 return item(objects(v)+`cptr_watch=objects[${i}];cptr_calls=0;int result=updateBy(objects[${i}],cptr_unary${f});printf("%d %d %d %d ",result,cptr_calls,cptr_argument,cptr_before);`+objPrint(3),[next,1,v[i],v[i],...after]);
}))),{helpers:unaryHelpers});
const visitHelpers=`static int*cptr_objects[3];static int cptr_calls,cptr_visits[4];
static void cptr_visit1(int*p){int code=-2;for(int i=0;i<3;i++)if(p==cptr_objects[i])code=i;if(cptr_calls<4)cptr_visits[cptr_calls]=code;cptr_calls++;*p+=7;}
static void cptr_visit2(int*p){int code=-2;for(int i=0;i<3;i++)if(p==cptr_objects[i])code=i;if(cptr_calls<4)cptr_visits[cptr_calls]=code;cptr_calls++;*p-=3;}`;
add('P',25,'void visitObjects(int*a,int*b,void(*visit)(int*)){visit(a);if(a!=b)visit(b);}',()=>sets.flatMap(v=>pairs.flatMap(([i,j])=>[1,2].map(f=>{
 const after=[...v],order=i===j?[i]:[i,j];for(const p of order)after[p]+=f===1?7:-3;
 return item(objects(v)+`for(int k=0;k<3;k++)cptr_objects[k]=objects[k];cptr_calls=0;for(int k=0;k<4;k++)cptr_visits[k]=-9;visitObjects(objects[${i}],objects[${j}],cptr_visit${f});printf("%d ",cptr_calls);for(int k=0;k<${order.length};k++)printf("%d ",cptr_visits[k]);`+objPrint(3),[order.length,...order,...after]);
}))),{helpers:visitHelpers});
const preferHelpers=`static int*cptr_objects[3];static int cptr_calls,cptr_left,cptr_right;
static void cptr_arguments(const int*a,const int*b){cptr_left=cptr_right=-2;for(int i=0;i<3;i++){if(a==cptr_objects[i])cptr_left=i;if(b==cptr_objects[i])cptr_right=i;}cptr_calls++;}
static int cptr_prefer1(const int*a,const int*b){cptr_arguments(a,b);return 0;}
static int cptr_prefer2(const int*a,const int*b){cptr_arguments(a,b);return 1;}
static int cptr_prefer3(const int*a,const int*b){cptr_arguments(a,b);return *b>*a;}`;
add('P',26,'int *chooseBy(int*a,int*b,int(*preferred)(const int*,const int*)){int choice=preferred(a,b);return choice?b:a;}',()=>sets.flatMap(v=>pairs.flatMap(([i,j])=>[1,2,3].map(f=>{
 const chosen=f===1?i:f===2?j:v[j]>v[i]?j:i;
 return item(objects(v)+`for(int k=0;k<3;k++)cptr_objects[k]=objects[k];cptr_calls=0;int*p=chooseBy(objects[${i}],objects[${j}],cptr_prefer${f});`+ptrCode('p','code')+'printf("%d %d %d %d ",code,cptr_calls,cptr_left,cptr_right);'+objPrint(3),[chosen,1,i,j,...v]);
}))),{helpers:preferHelpers});
add('P',27,'double replaceMatrixCell(double(*a)[3],int row,int column,double value){double old=a[row][column];a[row][column]=value;return old;}',()=>Array.from({length:3},(_,row)=>Array.from({length:3},(_,column)=>[-1.5,0,2.25].map(value=>{
 const a=Array.from({length:9},(_,i)=>(i-4)*1.25),after=[...a],old=a[row*3+column];after[row*3+column]=value;
 return item(`double a[3][3]=${lit(a)};double result=replaceMatrixCell(a,${row},${column},${value});int unchanged=1;double expected[3][3]=${lit(after)};for(int i=0;i<3;i++)for(int j=0;j<3;j++)if(a[i][j]!=expected[i][j])unchanged=0;printf("%d %d\\n",result==${old},unchanged);`,[1,1]);
}))).flat(2));
add('P',28,'int distinctTargets(const int*a,const int*b,const int*c){if(a==b&&b==c)return 1;if(a==b||a==c||b==c)return 2;return 3;}',()=>sets.flatMap(v=>[0,1,2].flatMap(i=>[0,1,2].flatMap(j=>[0,1,2].map(k=>item(
 objects(v)+`printf("%d ",distinctTargets(objects[${i}],objects[${j}],objects[${k}]));`+objPrint(3),[new Set([i,j,k]).size,...v]))))));
add('P',29,'int rangeEndpoints(const int*begin,const int*end,const int**first,const int**last){if(begin==end){*first=*last=NULL;return 0;}*first=begin;*last=end-1;return 1;}',()=>intervals.map(({n,lo,hi})=>item(
 arrayDecl(intArray(n))+`const int*first=a,*last=a+${n};int result=rangeEndpoints(a+${lo},a+${hi},&first,&last);`+
 arrayCode('first','firstCode',n)+arrayCode('last','lastCode',n)+'printf("%d %d %d ",result,firstCode,lastCode);'+arrayPrint(n),
 [Number(lo<hi),lo<hi?lo:-1,lo<hi?hi-1:-1,...intArray(n)])));

export const cPointersContractIds=[...specs.keys()];
export const cPointersReferenceSources=sources;
export function cPointersContract(id){
 const spec=specs.get(id);if(!spec)return null;const tests=spec.build(),groups=tests.map(t=>t.out.map(String));
 return {prelude:'#include <stddef.h>\n'+(spec.node?nodeSource:''),harness:'\n#include <stdio.h>\n'+spec.helpers+'\n'+
  tests.map((t,i)=>`static void cptr_case_${i}(void){${t.body}}`).join('\n')+'\nint main(void){\n'+
  tests.map((_,i)=>`cptr_case_${i}();`).join('\n')+'\nreturn 0;}',groups,expected:groups.flat()};
}
