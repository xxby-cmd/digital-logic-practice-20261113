// Server-only C17 contracts. Explicit lengths preserve embedded zero bytes.
const id=n=>`P4-structures-4-D-${String(n).padStart(3,'0')}`;
const lit=a=>`{${a.length?a.join(','):0}}`,row=(body,out)=>({body,out});
const hex=a=>a.length?a.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase():'-';
const text=s=>Array.from(s,c=>c.charCodeAt(0)),unique=a=>[...new Set(a)];
const specs=new Map();
const signatures=[
 'int isPalindrome(const unsigned char s[],int n)',
 'int commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m)',
 'int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m)',
 'int canRearrangePalindrome(const unsigned char s[],int n)',
 'int compressSpaces(unsigned char s[],int n)',
 'int countPattern(const unsigned char s[],int n,const unsigned char t[],int m)',
 'int firstUnique(const unsigned char s[],int n)',
 'int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[])',
 'void rotateLeft(unsigned char s[],int n,unsigned int k)',
 'int removeBytes(unsigned char s[],int n,const unsigned char d[],int m)'
];
let seed=20261117;
const rand=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
const base=[[],[0],[255],[128],[1,1],[0,1,0],[0,255,128,255,0],[1,2,3,2],[4,5,4],
 text('abacaba'),text('aabb'),[32,32,0,32,32,9,32,32,255,32],
 ...Array.from({length:14},()=>Array.from({length:3+rand(20)},()=>[0,1,2,32,128,255][rand(6)])),
 Array.from({length:1024},(_,i)=>i%256)];
const prefixes=a=>unique([0,Math.floor(a.length/2),a.length]);
const palindrome=a=>a.every((v,i)=>v===a[a.length-1-i]);
const prefix=(a,b)=>{const n=Math.min(a.length,b.length),i=a.slice(0,n).findIndex((v,i)=>v!==b[i]);return i<0?n:i;};
function subsequence(s,t){let possible=new Set([0]);for(const byte of s){const next=new Set(possible);for(const n of possible)if(n<t.length&&t[n]===byte)next.add(n+1);possible=next;}return Number(possible.has(t.length));}
const occurrences=(s,t)=>s.slice(0,Math.max(0,s.length-t.length+1)).reduce((count,_,i)=>count+Number(t.every((v,j)=>v===s[i+j])),0);
const rotation=(s,t)=>!s.length||s.some((_,shift)=>t.every((v,j)=>v===s[(j+shift)%s.length]));
const unaryHelper=(call,{left=231,right=173}={})=>String.raw`
static void dsstring_unary(const unsigned char*values,int physical,int n){
 unsigned char s[1030];s[0]=${left};for(int i=0;i<physical;i++)s[i+1]=values[i];s[physical+1]=${right};s[physical+2]=0;
 int r=${call},same=1;for(int i=0;i<physical;i++)if(s[i+1]!=values[i])same=0;
 printf("%d %d %d\n",r,same,s[0]==${left}&&s[physical+1]==${right});
}
`;
const unaryRows=(cases,expected)=>cases.flatMap(values=>prefixes(values).map(n=>row(`const unsigned char values[]=${lit(values)};dsstring_unary(values,${values.length},${n});`,[expected(values.slice(0,n)),1,1])));
specs.set(id(1),{helpers:unaryHelper('isPalindrome(s+1,n)'),build:()=>unaryRows([...base,text('abcddcba'),[255,0,255],[1,2,3,1],Array(1024).fill(128)],a=>Number(palindrome(a)))});

const pairHelper=call=>String.raw`
static void dsstring_pair(const unsigned char*av,int ac,int n,const unsigned char*bv,int bc,int m,int alias,int offset){
 unsigned char a[1030],b[1030];a[0]=b[0]=231;
 for(int i=0;i<ac;i++)a[i+1]=av[i];for(int i=0;i<bc;i++)b[i+1]=bv[i];a[ac+1]=b[bc+1]=173;a[ac+2]=b[bc+2]=0;
 const unsigned char*p=alias?a+1+offset:b+1;int result=${call},same=1;
 for(int i=0;i<ac;i++)if(a[i+1]!=av[i])same=0;for(int i=0;i<bc;i++)if(b[i+1]!=bv[i])same=0;
 printf("%d %d %d\n",result,same,a[0]==231&&a[ac+1]==173&&b[0]==231&&b[bc+1]==173);
}
`;
function pairCases({nonempty=false}={}){
 const values=[[],[0],[255],[0,1,0],[0,255,128,255,0],text('aba'),text('aabb'),[32,32,0,32]],out=[];
 for(const a of values)for(const b of values)for(const [n,m]of [[a.length,b.length],[Math.floor(a.length/2),b.length],[a.length,Math.floor(b.length/2)]])if(!nonempty||m>0)out.push({a,b,n,m,alias:0,offset:0});
 for(const a of [[0,1,0,1,0,1],[1,2,1,3,1,4],text('aaaaabaaab'),base.at(-1)])for(const offset of [0,1,3])for(const n of unique([0,Math.floor(a.length/2),a.length])){
  const m=a.length-offset;if(!nonempty||m>0)out.push({a,b:[],n,m,alias:1,offset});
 }
 return out;
}
const pairRows=(cases,expected)=>cases.map(({a,b,n,m,alias=0,offset=0})=>row(`const unsigned char av[]=${lit(a)},bv[]=${lit(b)};dsstring_pair(av,${a.length},${n},bv,${b.length},${m},${alias},${offset});`,[expected(a.slice(0,n),alias?a.slice(offset,offset+m):b.slice(0,m)),1,1]));
specs.set(id(2),{helpers:pairHelper('commonPrefix(a+1,n,p,m)'),build:()=>pairRows(pairCases(),prefix)});
specs.set(id(3),{helpers:pairHelper('isSubsequence(a+1,n,p,m)'),build:()=>pairRows([...pairCases(),{a:text('axbxc'),b:text('abc'),n:5,m:3},{a:base.at(-1),b:[255,0,255],n:1024,m:3}],subsequence)});

const letters=['','a','aa','ab','aba','aabb','aabbc','abc','abca','abcdabcd','aaaabbbbccccd','aabbccddee',
 ...Array.from({length:18},()=>Array.from({length:1+rand(37)},()=>String.fromCharCode(97+rand(8))).join('')),
 'a'.repeat(1024),'a'.repeat(511)+'b'.repeat(513)].map(text);
specs.set(id(4),{helpers:unaryHelper('canRearrangePalindrome(s+1,n)',{left:98,right:97}),build:()=>unaryRows(letters,a=>{const odd=new Set();for(const v of a)odd.has(v)?odd.delete(v):odd.add(v);return Number(odd.size<=1);})});

const mutatingHelper=(call,{fixedLength=false,checkTail=false}={})=>String.raw`
static void dsstring_mutate(const unsigned char*values,int physical,int n,unsigned int shifts){
 unsigned char s[1030];s[0]=231;for(int i=0;i<physical;i++)s[i+1]=values[i];s[physical+1]=173;s[physical+2]=0;
 ${fixedLength?call+';int k=n;':'int k='+call+';'}int valid=k>=0&&k<=n,tail=1;
 ${checkTail?'for(int i=n;i<physical;i++)if(s[i+1]!=values[i])tail=0;':''}
 char encoded[2050];const char*digits="0123456789ABCDEF";
 if(valid&&k){for(int i=0;i<k;i++){encoded[2*i]=digits[s[i+1]>>4];encoded[2*i+1]=digits[s[i+1]&15];}encoded[2*k]=0;}else{encoded[0]='-';encoded[1]=0;}
 printf("%d %d %d %s\n",k,s[0]==231&&s[physical+1]==173,tail,encoded);
}
`;
const spaces=[...base,[32],[32,32],[32,32,65,32,32],[65,32,32,66],[32,9,32,10,32,0,32],[0,32,32,0],Array(1024).fill(32),Array.from({length:1024},(_,i)=>i%3?32:255)];
specs.set(id(5),{helpers:mutatingHelper('compressSpaces(s+1,n)',{checkTail:true}),build:()=>spaces.flatMap(values=>prefixes(values).map(n=>{const a=values.slice(0,n),result=a.filter((v,i)=>v!==32||i===0||a[i-1]!==32);return row(`const unsigned char values[]=${lit(values)};dsstring_mutate(values,${values.length},${n},0);`,[result.length,1,1,hex(result)]);}))});
specs.set(id(6),{helpers:pairHelper('countPattern(a+1,n,p,m)'),splitLast:1,build:()=>pairRows([...pairCases({nonempty:true}),{a:text('aaaaa'),b:text('aa'),n:5,m:2},{a:[0,1,0,1,0],b:[0,1,0],n:5,m:3},{a:Array(256).fill(1),b:Array(65).fill(1),n:256,m:65},{a:base.at(-1),b:[0],n:1024,m:1},{a:[0],b:Array(1024).fill(0),n:1,m:1024},{a:Array(1024).fill(1),b:Array(1024).fill(1),n:1024,m:1024},{a:Array(1024).fill(1),b:[...Array(1023).fill(1),2],n:1024,m:1024},{a:Array(1024).fill(0),b:Array(512).fill(0),n:1024,m:512}],occurrences)});
specs.set(id(7),{helpers:unaryHelper('firstUnique(s+1,n)'),build:()=>unaryRows([...base,[255,128,255],[255,0],[0,1,0],[1,0,1,2],[1,2,3,2],Array.from({length:1024},(_,i)=>i===1023?255:i%255)],a=>a.findIndex(v=>a.indexOf(v)===a.lastIndexOf(v)))});

const rotationHelper=String.raw`
static void dsstring_rotation(const unsigned char*av,int ac,const unsigned char*bv,int bc,int n,int alias,int offset){
 unsigned char a[1030],b[1030],work[2052];int next[1027];a[0]=b[0]=work[0]=231;next[0]=97123;
 for(int i=0;i<ac;i++)a[i+1]=av[i];for(int i=0;i<bc;i++)b[i+1]=bv[i];a[ac+1]=b[bc+1]=173;a[ac+2]=b[bc+2]=0;
 for(int i=0;i<2*n;i++)work[i+1]=(unsigned char)(110+i%13);work[2*n+1]=173;
 for(int i=0;i<n+1;i++)next[i+1]=12000+i;next[n+2]=-18231;
 int result=isRotation(a+1,alias?a+1+offset:b+1,n,work+1,next+1),same=1;
 for(int i=0;i<ac;i++)if(a[i+1]!=av[i])same=0;for(int i=0;i<bc;i++)if(b[i+1]!=bv[i])same=0;
 int guards=a[0]==231&&a[ac+1]==173&&b[0]==231&&b[bc+1]==173&&work[0]==231&&work[2*n+1]==173&&next[0]==97123&&next[n+2]==-18231;
 printf("%d %d %d\n",result,same,guards);
}
`;
function rotationCases(){
 const out=[];
 for(let n=0;n<=3;n++){const words=Array.from({length:2**n},(_,mask)=>Array.from({length:n},(_,i)=>mask>>i&1?255:0));for(const a of words)for(const b of words)out.push({a,b,n});}
 for(const a of [text('aabab'),text('aabb'),[0,255,0,128,1],base.at(-1),Array(1024).fill(0)])for(const shift of unique([0,1,Math.floor(a.length/2),a.length-1]))out.push({a,b:[...a.slice(shift),...a.slice(0,shift)],n:a.length});
 out.push({a:text('aabab'),b:text('abaab'),n:5},{a:text('aabb'),b:text('abab'),n:4});
 out.push({a:Array(1024).fill(0),b:[...Array(1023).fill(0),255],n:1024});
 for(const [a,offset,n]of [[base.at(-1),1,511],[text('abababab'),2,4],[text('abababab'),0,5]])out.push({a,b:[],offset,n,alias:1});
 return out;
}
specs.set(id(8),{helpers:rotationHelper,build:()=>rotationCases().map(({a,b,n,alias=0,offset=0})=>row(`const unsigned char av[]=${lit(a)},bv[]=${lit(b)};dsstring_rotation(av,${a.length},bv,${b.length},${n},${alias},${offset});`,[Number(rotation(a.slice(0,n),alias?a.slice(offset,offset+n):b.slice(0,n))),1,1]))});
specs.set(id(9),{helpers:mutatingHelper('rotateLeft(s+1,n,shifts)',{fixedLength:true,checkTail:true}),build:()=>base.flatMap(values=>prefixes(values).flatMap(n=>unique([0,1,n,n+1,n*3+2,4294967295]).map(k=>{const a=values.slice(0,n),shift=n?k%n:0,after=[...a.slice(shift),...a.slice(0,shift)];return row(`const unsigned char values[]=${lit(values)};dsstring_mutate(values,${values.length},${n},${k}u);`,[n,1,1,hex(after)]);}))) });

const removeHelper=String.raw`
static void dsstring_remove(const unsigned char*av,int ac,int n,const unsigned char*dv,int dc,int m,int alias,int offset){
 unsigned char a[1030],d[1030];a[0]=d[0]=231;for(int i=0;i<ac;i++)a[i+1]=av[i];for(int i=0;i<dc;i++)d[i+1]=dv[i];a[ac+1]=d[dc+1]=173;a[ac+2]=d[dc+2]=0;
 const unsigned char*drop=alias?a+1+offset:d+1;int k=removeBytes(a+1,n,drop,m),same=1;
 for(int i=0;i<dc;i++)if(d[i+1]!=dv[i])same=0;for(int i=n;i<ac;i++)if(a[i+1]!=av[i])same=0;
 char encoded[2050];const char*digits="0123456789ABCDEF";
 if(k>0&&k<=n){for(int i=0;i<k;i++){encoded[2*i]=digits[a[i+1]>>4];encoded[2*i+1]=digits[a[i+1]&15];}encoded[2*k]=0;}else{encoded[0]='-';encoded[1]=0;}
 printf("%d %d %d %s\n",k,same,a[0]==231&&a[ac+1]==173&&d[0]==231&&d[dc+1]==173,encoded);
}
`;
specs.set(id(10),{helpers:removeHelper,build:()=>[...pairCases(),{a:[1,2,1,2],b:[],n:4,m:1,alias:1,offset:1},{a:[0,255,0,128,255],b:[0,255,255],n:5,m:3},{a:Array(1024).fill(0),b:[0],n:1024,m:1}].map(({a,b,n,m,alias=0,offset=0})=>{const removed=new Set(alias?a.slice(offset,offset+m):b.slice(0,m)),after=a.slice(0,n).filter(v=>!removed.has(v));return row(`const unsigned char av[]=${lit(a)},dv[]=${lit(b)};dsstring_remove(av,${a.length},${n},dv,${b.length},${m},${alias},${offset});`,[after.length,1,1,hex(after)]);})});

export const dsStringContractIds=[...specs.keys()];
export function dsStringContract(questionId){const spec=specs.get(questionId);if(!spec)return null;const tests=spec.build(),n=Number(questionId.slice(-3));const make=rows=>{const groups=rows.map(t=>t.out.map(String));return {prelude:'#include <stddef.h>\n'+signatures[n-1]+';\n',harness:'\n#include <stdio.h>\n'+spec.helpers+'\n'+rows.map((t,i)=>`static void dsstring_case_${i}(void){${t.body}}`).join('\n')+'\nint main(void){\n'+rows.map((_,i)=>`dsstring_case_${i}();`).join('\n')+'\nreturn 0;}\n',groups,expected:groups.flat()};};const variants=(spec.splitLast?[tests.slice(0,-spec.splitLast),tests.slice(-spec.splitLast)]:[tests]).map(make);return variants.length===1?variants[0]:{...variants[0],variants};}
export const dsStringReferenceSources={
 [id(1)]:'int isPalindrome(const unsigned char s[],int n){for(int l=0,r=n-1;l<r;l++,r--)if(s[l]!=s[r])return 0;return 1;}',
 [id(2)]:'int commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m){int i=0;while(i<n&&i<m&&a[i]==b[i])i++;return i;}',
 [id(3)]:'int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m){int j=0;for(int i=0;i<n&&j<m;i++)if(s[i]==t[j])j++;return j==m;}',
 [id(4)]:'int canRearrangePalindrome(const unsigned char s[],int n){int count[26]={0},odd=0;for(int i=0;i<n;i++)count[s[i]-\'a\']++;for(int i=0;i<26;i++)odd+=count[i]%2;return odd<=1;}',
 [id(5)]:'int compressSpaces(unsigned char s[],int n){int w=0;for(int r=0;r<n;r++)if(s[r]!=32||w==0||s[w-1]!=32)s[w++]=s[r];return w;}',
 [id(6)]:'int countPattern(const unsigned char s[],int n,const unsigned char t[],int m){int count=0;for(int i=0;i<=n-m;i++){int j=0;while(j<m&&s[i+j]==t[j])j++;if(j==m)count++;}return count;}',
 [id(7)]:'int firstUnique(const unsigned char s[],int n){int count[256]={0};for(int i=0;i<n;i++)count[s[i]]++;for(int i=0;i<n;i++)if(count[s[i]]==1)return i;return -1;}',
 [id(8)]:'int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){if(!n)return 1;for(int i=0;i<2*n;i++)work[i]=s[i%n];next[0]=0;for(int i=1,j=0;i<n;i++){while(j&&t[i]!=t[j])j=next[j-1];if(t[i]==t[j])j++;next[i]=j;}for(int i=0,j=0;i<2*n-1;i++){while(j&&work[i]!=t[j])j=next[j-1];if(work[i]==t[j])j++;if(j==n)return 1;}return 0;}',
 [id(9)]:'static void reversePart(unsigned char s[],int l,int r){while(l<r){unsigned char x=s[l];s[l++]=s[r];s[r--]=x;}}\nvoid rotateLeft(unsigned char s[],int n,unsigned int k){if(!n)return;k%=(unsigned)n;int p=(int)k;reversePart(s,0,p-1);reversePart(s,p,n-1);reversePart(s,0,n-1);}',
 [id(10)]:'int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){unsigned char drop[256]={0};for(int i=0;i<m;i++)drop[d[i]]=1;int w=0;for(int i=0;i<n;i++)if(!drop[s[i]])s[w++]=s[i];return w;}'
};
