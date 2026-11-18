// Server-only seeds, independent expected file bytes, and actual reference programs.
import {cFilesPractice} from '../bank-c-files.js';
const id=(tag,n)=>`C6L-programming-11-${tag}-${String(n).padStart(3,'0')}`;
const hex=bytes=>Buffer.from(bytes).toString('hex');
const ascii=text=>Buffer.from(text,'ascii').toString('hex');
const policy=(names,writable,seeds={},limits={})=>({names,writable,seeds,capture:[...names],limits:{
 max_file_bytes:4096,max_allocation_reservation_bytes:16384,max_write_reservation_bytes:65536,
 max_create_reservations:16,max_open_files:8,max_guarded_calls:32768,max_stream_bytes:4096,max_capture_bytes:16384,...limits
}});
const contracts=new Map();
contracts.set(id('B',1),{variants:[
 {file_policy:policy(['data.bin'],[]),exactOutput:'MISSING\n',fileChecks:[{name:'data.bin',mode:'absent'}]},
 {file_policy:policy(['data.bin'],[],{'data.bin':''}),exactOutput:'EMPTY\n',fileChecks:[{name:'data.bin',mode:'bytes',expected:''}]},
 ...[[0,65,255],[255,0,65]].map(bytes=>({file_policy:policy(['data.bin'],[],{'data.bin':hex(bytes)}),
  exactOutput:`${bytes[0]}\n`,fileChecks:[{name:'data.bin',mode:'bytes',expected:hex(bytes)}]}))
]});
contracts.set(id('B',2),{variants:[
 {line:'x',old:'a much longer old file\n'},
 {line:'',old:'keep this unless truncated'},
 {line:'  keep both ends  ',old:null},
 {line:'Z'.repeat(200),old:'old'}
].map(({line,old})=>({stdin:line+'\n',file_policy:policy(['out.txt'],['out.txt'],old===null?{}:{'out.txt':ascii(old)}),
 exactOutput:'OK\n',fileChecks:[{name:'out.txt',mode:'bytes',expected:ascii(line)}]}))});
contracts.set(id('P',25),{variants:[[0,0],[32,255],[33,65],[64,0]].map(([n,v])=>({stdin:`${n} ${v}\n`,
 file_policy:policy(['out.bin'],['out.bin'],{},{max_file_bytes:32,max_capture_bytes:32}),
 exactOutput:n<=32?'OK\n':'ERROR\n',fileChecks:[n<=32?{name:'out.bin',mode:'bytes',expected:hex(Array(n).fill(v))}:
  {name:'out.bin',mode:'prefix',expected:hex(Array(n).fill(v)),maxBytes:32}]}))});

export function cFilesContract(questionId){const contract=contracts.get(questionId);return contract?structuredClone(contract):null;}
export const cFilesReferenceSources={
 [id('B',1)]:String.raw`#include <stdio.h>
int main(void){FILE*f=fopen("data.bin","rb");if(!f){puts("MISSING");return 0;}int c=fgetc(f);if(c==EOF)puts("EMPTY");else printf("%d\n",c);fclose(f);return 0;}`,
 [id('B',2)]:String.raw`#include <stdio.h>
#include <string.h>
int main(void){char s[202];if(!fgets(s,sizeof s,stdin))return 0;s[strcspn(s,"\n")]='\0';FILE*f=fopen("out.txt","w");if(!f){puts("ERROR");return 0;}int bad=fputs(s,f)==EOF;if(fclose(f)!=0)bad=1;puts(bad?"ERROR":"OK");return 0;}`,
 [id('P',25)]:String.raw`#include <stdio.h>
int main(void){int n,v;if(scanf("%d%d",&n,&v)!=2)return 0;FILE*f=fopen("out.bin","wb");if(!f){puts("ERROR");return 0;}int bad=0;for(int i=0;i<n;i++)if(fputc(v,f)==EOF){bad=1;break;}if(fflush(f)==EOF)bad=1;if(fclose(f)!=0)bad=1;puts(bad?"ERROR":"OK");return 0;}`
};
export const cFilesWrongSources={
 [id('B',1)]:cFilesReferenceSources[id('B',1)].replace('int c=fgetc(f);','signed char c=(signed char)fgetc(f);'),
 [id('B',2)]:cFilesReferenceSources[id('B',2)].replace('"out.txt","w"','"out.txt","a"'),
 [id('P',25)]:cFilesReferenceSources[id('P',25)].replace('if(fflush(f)==EOF)bad=1;if(fclose(f)!=0)bad=1;','fclose(f);')
};
export const cFilesEquivalentSources={
 [id('B',1)]:[],[id('B',2)]:[],
 [id('P',25)]:[String.raw`#include <stdio.h>
int main(void){int n,v;scanf("%d%d",&n,&v);FILE*f=fopen("out.bin","wb");if(!f){puts("ERROR");return 0;}setvbuf(f,NULL,_IONBF,0);int bad=0;for(int i=0;i<n;i++){if(fputc(v,f)==EOF){bad=1;break;}}if(fclose(f)!=0)bad=1;puts(bad?"ERROR":"OK");return 0;}`]
};

const data=x=>typeof x==='string'?Buffer.from(x,'ascii'):Buffer.from(x);
function fileCase({seeds={},write=[],out={},absent=[],names=[],stdin='',stdout='',limits={},exact=false}){
 const all=[...new Set([...Object.keys(seeds),...write,...Object.keys(out),...absent,...names])];
 const final={...seeds,...out};for(const n of absent)delete final[n];
 return {stdin,file_policy:policy(all,write,Object.fromEntries(Object.entries(seeds).map(([n,v])=>[n,data(v).toString('hex')])),limits),
  ...(exact?{exactOutput:stdout}:{groups:stdout.replace(/\n$/,'').split('\n').map(line=>line.trim().split(/\s+/).filter(Boolean))}),
  fileChecks:all.map(name=>Object.hasOwn(final,name)?{name,mode:'bytes',expected:data(final[name]).toString('hex')}:{name,mode:'absent'})};
}
function register(tag,n,variants,source,wrong,equivalents=[]){
 const key=id(tag,n);if(contracts.has(key))throw Error('duplicate file contract '+key);
 if(source===wrong||variants.length!==4)throw Error('invalid file source/cases '+key);
 contracts.set(key,{variants});cFilesReferenceSources[key]=source;cFilesWrongSources[key]=wrong;cFilesEquivalentSources[key]=equivalents;
}
const fills={
 3:['"a"',String.raw`fprintf(f,"%s %d\n",id,score)<0`],4:['2','b'],
 5:['fgets(s,sizeof s,f)!=NULL',String.raw`chars>0&&last!='\n'`],6:[String.raw`fprintf(f,"%s,%d\n",id,score)<0`],
 7:['fread(b,1,(size_t)k,in)','fwrite(b,1,n,out)!=n'],8:['(long)k*3','fread(b,1,3,f)'],
 9:['p<0||p>=n','fputc(v,f)==EOF'],10:['ungetc(c,f)'],11:['rewind(in)'],
 12:['n==(size_t)l','check!=EOF&&check==(int)(sum%256)&&fgetc(f)==EOF'],13:['fopen("fallback.txt","r")'],
 14:['fclose(f)!=0','rename("draft.txt","published.txt")!=0'],15:['fread(b,2,1,f)==1']
};
const fillSource=n=>{let at=0;const text=cFilesPractice.programming.find(q=>q.id===id('B',n)).codeStarter.replaceAll('____',()=>fills[n][at++]);if(at!==fills[n].length)throw Error('blank mismatch');return text;};
const mutate=(source,from,to)=>{if(!source.includes(from)||from===to)throw Error('mutation mismatch '+from);return source.replace(from,to);};
const bWrong={3:['"log.txt","a"','"log.txt","w"'],4:['sum+=b','sum+=a'],5:[String.raw`if(s[i]=='\n')lines++`,String.raw`if(i==0)lines++`],
 6:[String.raw`"id,score\n"`,String.raw`"id score\n"`],7:['fwrite(b,1,n,out)!=n','fwrite(b,1,n-1,out)!=n'],8:['(long)k*3','(long)k'],
 9:['"data.bin","r+b"','"data.bin","w+b"'],10:['ungetc(c,f)','(void)c'],11:['rewind(in)','(void)in'],
 12:['&&fgetc(f)==EOF',''],13:['fopen("primary.txt","r")','fopen("fallback.txt","r")'],14:['rename("draft.txt","published.txt")!=0','0'],
 15:['(unsigned long)b[0]*256+b[1]','(unsigned long)b[1]*256+b[0]']};
const bCases={
3:[{old:null,who:'a1',score:0},{old:'x 90\n',who:'a1',score:100},{old:'same 10\nsame 20\n',who:'same',score:20},{old:'',who:'Z9',score:65}].map(x=>fileCase({
 seeds:x.old===null?{}:{'log.txt':x.old},write:['log.txt'],out:{'log.txt':(x.old??'')+`${x.who} ${x.score}\n`},stdin:`${x.who} ${x.score}\n`,stdout:'OK\n',limits:{max_file_bytes:8192}})),
4:[[],[-7,12],[3,-4,5,8,999],[999]].map(a=>fileCase({seeds:{'pairs.txt':a.join(' ')+'\n'},stdout:`${Math.floor(a.length/2)} ${a.filter((_,i)=>i%2===1).reduce((s,v)=>s+v,0)}\n`})),
5:['','\n','a'.repeat(47)+'\n'+'x\n','a\nlast'].map(text=>fileCase({seeds:{'lines.txt':text},stdout:`${text.length} ${text.split('\n').length-(text.endsWith('\n')||!text?1:0)}\n`})),
6:[[],[['a',0]],[['Z1',100],['a',9]],[['same',10],['same',10],['b9999999',99]]].map(records=>fileCase({write:['report.txt'],
 out:{'report.txt':'id,score\n'+records.map(([x,s])=>`${x},${s}\n`).join('')},stdin:records.length+'\n'+records.map(r=>r.join(' ')).join('\n')+'\n',stdout:`${records.length}\n`})),
7:[{a:[],k:1},{a:[0,255,65],k:2},{a:Array.from({length:32},(_,i)=>i),k:16},{a:Array.from({length:4096},(_,i)=>i%256),k:1}].map(({a,k})=>fileCase({seeds:{'data.bin':a},write:['backup.bin'],out:{'backup.bin':a},stdin:`${k}\n`,
 stdout:Array.from({length:Math.ceil(a.length/k)},(_,i)=>Math.min(k,a.length-i*k)).join(' ')+'\n',exact:a.length===0,limits:{max_stream_bytes:16384}})),
8:[{a:[],k:-1},{a:[0,255,1],k:0},{a:[9,8,7,6,5,4],k:1},{a:[1,2,3,4,5,6],k:2}].map(({a,k})=>fileCase({seeds:{'slots.bin':a},stdin:`${k}\n`,stdout:k>=0&&k<a.length/3?a.slice(k*3,k*3+3).join(' ')+'\n':'RANGE\n'})),
9:[{a:[1,2,3],p:0,v:255},{a:[0,7,8],p:2,v:0},{a:[5,6],p:2,v:10},{a:[],p:-1,v:1}].map(({a,p,v})=>{const b=[...a],ok=p>=0&&p<a.length;if(ok)b[p]=v;return fileCase({seeds:{'data.bin':a},write:['data.bin'],out:{'data.bin':b},stdin:`${p} ${v}\n`,stdout:ok?'OK\n':'RANGE\n'});}),
10:[[],[0],[255,0],[65,66,67,68]].map(a=>fileCase({seeds:{'data.bin':a},stdout:a.length?`${a[0]}\n${a.slice(0,3).join(' ')}\n`:'EMPTY\n'})),
11:[[],[0],[0,255,10,13],Array.from({length:4096},(_,i)=>i%256)].map(a=>fileCase({seeds:{'data.bin':a},write:['packet.bin'],out:{'packet.bin':Buffer.concat([data(`${a.length}\n`),data(a)])},stdout:'OK\n',limits:{max_file_bytes:8192}})),
12:[[],[0,0],[3,255,0,2,1],[1,65,65,99]].map(a=>{const l=a[0],valid=a.length===l+2&&l<=31&&a.at(-1)===a.slice(1,-1).reduce((s,v)=>s+v,0)%256;
 return fileCase({seeds:{'frame.bin':a},stdout:valid?`VALID ${l}\n`:'INVALID\n'});}),
13:[{'primary.txt':'main\n','fallback.txt':'backup\n'},{'primary.txt':'','fallback.txt':'backup\n'},{'fallback.txt':' side '},{}].map(seeds=>{
 const chosen=Object.hasOwn(seeds,'primary.txt')?'primary.txt':Object.hasOwn(seeds,'fallback.txt')?'fallback.txt':null;
 return fileCase({seeds,names:['primary.txt','fallback.txt'],stdout:chosen?(chosen==='primary.txt'?'PRIMARY\n':'FALLBACK\n')+seeds[chosen].replace(/\n$/,'')+'\n':'MISSING\n',exact:true});
}),
14:[{line:'',old:''},{line:'x',old:'very long old draft\n'},{line:' end ',old:null},{line:'Z'.repeat(200),old:'old'}].map(({line,old})=>fileCase({
 seeds:old===null?{}:{'draft.txt':old},write:['draft.txt','published.txt'],out:{'published.txt':line+'\n'},absent:['draft.txt'],stdin:line+'\n',stdout:'OK\n'})),
15:[[],[255],[1,2,0,255],[255,255,2,3,99]].map(a=>fileCase({seeds:{'words.bin':a},stdout:`${Math.floor(a.length/2)} ${Array.from({length:Math.floor(a.length/2)},(_,i)=>a[2*i]*256+a[2*i+1]).reduce((s,v)=>s+v,0)}\n`}))
};
for(let n=3;n<=15;n++){const source=fillSource(n);register('B',n,bCases[n],source,mutate(source,...bWrong[n]));}

const HELPERS=String.raw`#include <stdio.h>
#include <string.h>
#include <stdlib.h>
static int load(const char*name,unsigned char*b,int cap){FILE*f=fopen(name,"rb");if(!f)return -1;int n=0,c;while((c=fgetc(f))!=EOF){if(n==cap){fclose(f);return -1;}b[n++]=(unsigned char)c;}int bad=ferror(f)!=0;if(fclose(f)!=0)bad=1;return bad?-1:n;}
static int save(const char*name,const unsigned char*b,int n){FILE*f=fopen(name,"wb");if(!f)return -1;int bad=fwrite(b,1,(size_t)n,f)!=(size_t)n;if(fclose(f)!=0)bad=1;return bad?-1:0;}
`;
const program=body=>HELPERS+'\nint main(void){'+body+'return 0;}\n';
const pBodies={
1:String.raw`FILE*f=fopen("numbers.txt","r");if(!f){puts("ERROR");return 0;}int x,n=0,min=0,max=0;long long sum=0;while(fscanf(f,"%d",&x)==1){if(n==0){min=max=x;}if(x<min)min=x;if(x>max)max=x;n++;sum+=x;}fclose(f);if(n)printf("%d %lld %d %d\n",n,sum,min,max);else puts("EMPTY");`,
2:String.raw`int t;scanf("%d",&t);FILE*in=fopen("scores.txt","r"),*out=fopen("passed.txt","w");if(!in||!out){if(in)fclose(in);if(out)fclose(out);puts("ERROR");return 0;}char who[9];int score,n=0;while(fscanf(in,"%8s%d",who,&score)==2){if(score>=t){fprintf(out,"%s %d\n",who,score);n++;}}fclose(in);fclose(out);printf("%d\n",n);`,
3:String.raw`unsigned char b[8192];int n=load("log.txt",b,sizeof b);if(n<0){puts("ERROR");return 0;}FILE*f=fopen("numbered.txt","wb");if(!f){puts("ERROR");return 0;}int start=1,lines=0;for(int i=0;i<n;i++){if(start){fprintf(f,"%d:",++lines);start=0;}fputc(b[i],f);if(b[i]=='\n')start=1;}fclose(f);printf("%d\n",lines);`,
4:String.raw`int first,last;scanf("%d%d",&first,&last);unsigned char b[8192];int n=load("lines.txt",b,sizeof b);if(n<0){puts("ERROR");return 0;}FILE*f=fopen("selected.txt","wb");if(!f){puts("ERROR");return 0;}int line=1,start=1,count=0;for(int i=0;i<n;i++){if(line>=first&&line<=last){if(start)count++;fputc(b[i],f);}if(b[i]=='\n'){line++;start=1;}else start=0;}fclose(f);printf("%d\n",count);`,
5:String.raw`unsigned char a[8192],b[8192],out[8192];int na=load("left.txt",a,sizeof a),nb=load("right.txt",b,sizeof b);if(na<0||nb<0){puts("ERROR");return 0;}int k=0;memcpy(out,a,(size_t)na);k+=na;if(na&&nb&&a[na-1]!='\n')out[k++]='\n';memcpy(out+k,b,(size_t)nb);k+=nb;puts(save("joined.txt",out,k)?"ERROR":"OK");`,
6:String.raw`unsigned char a[8192],b[8192];int na=load("a.bin",a,sizeof a),nb=load("b.bin",b,sizeof b);if(na<0||nb<0){puts("ERROR");return 0;}int i=0;while(i<na&&i<nb&&a[i]==b[i])i++;if(i==na&&i==nb)puts("EQUAL");else{printf("DIFF %d ",i);if(i<na)printf("%u",(unsigned)a[i]);else printf("END");putchar(' ');if(i<nb)printf("%u\n",(unsigned)b[i]);else puts("END");}`,
7:String.raw`unsigned char b[8192],out[8192];int n=load("source.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}int k=0;for(int i=0;i<n;i++){if(b[i]==13){out[k++]=10;if(i+1<n&&b[i+1]==10)i++;}else out[k++]=b[i];}puts(save("normalized.bin",out,k)?"ERROR":"OK");`,
8:String.raw`unsigned char b[8192];int n=load("data.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}FILE*f=fopen("dump.txt","w");if(!f){puts("ERROR");return 0;}for(int i=0;i<n;i++){if(i%16)fputc(' ',f);fprintf(f,"%02X",(unsigned)b[i]);if(i%16==15||i==n-1)fputc('\n',f);}fclose(f);printf("%d\n",n);`,
9:String.raw`unsigned char b[8192],out[10000];int n=load("data.txt",b,sizeof b);if(n<0){puts("ERROR");return 0;}int start[4097],lines=0;if(n){start[lines++]=0;for(int i=0;i<n-1;i++)if(b[i]=='\n')start[lines++]=i+1;}out[0]=(unsigned char)(lines>>8);out[1]=(unsigned char)lines;for(int i=0;i<lines;i++){out[2+i*2]=(unsigned char)(start[i]>>8);out[3+i*2]=(unsigned char)start[i];}if(save("index.bin",out,2+2*lines))puts("ERROR");else printf("%d\n",lines);`,
10:String.raw`int off,count;scanf("%d%d",&off,&count);unsigned char b[8192];int n=load("source.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}if(off>n||count>n-off){save("part.bin",b,0);puts("RANGE");return 0;}puts(save("part.bin",b+off,count)?"ERROR":"OK");`,
11:String.raw`int wanted,value;scanf("%d%d",&wanted,&value);unsigned char b[8192];int n=load("records.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}int p=-1;for(int i=0;i<n;i+=3)if(b[i]==wanted){p=i;break;}if(p<0){puts("NOTFOUND");return 0;}FILE*f=fopen("records.bin","r+b");if(!f){puts("ERROR");return 0;}unsigned char v[2]={(unsigned char)(value>>8),(unsigned char)value};fseek(f,p+1,SEEK_SET);fwrite(v,1,2,f);fclose(f);puts("UPDATED");`,
12:String.raw`char word[13],s[13];scanf("%12s",word);FILE*f=fopen("names.txt","r");if(!f){puts("ERROR");return 0;}int found=0;while(fscanf(f,"%12s",s)==1)if(strcmp(s,word)==0){found=1;break;}fclose(f);if(found){puts("EXISTS");return 0;}f=fopen("names.txt","a");if(!f){puts("ERROR");return 0;}fprintf(f,"%s\n",word);fclose(f);puts("ADDED");`,
13:String.raw`int target;scanf("%d",&target);int c;while((c=getchar())!='\n'&&c!=EOF){}char text[102];fgets(text,sizeof text,stdin);text[strcspn(text,"\n")]='\0';unsigned char b[8192],out[8192];int n=load("notes.txt",b,sizeof b);if(n<0){puts("ERROR");return 0;}int begin=0,line=1;while(line<target&&begin<n){while(begin<n&&b[begin]!='\n')begin++;if(begin<n){begin++;line++;}}if(begin>=n||line!=target){puts("NOTFOUND");return 0;}int end=begin;while(end<n&&b[end]!='\n')end++;int k=0;memcpy(out,b,(size_t)begin);k=begin;int m=(int)strlen(text);memcpy(out+k,text,(size_t)m);k+=m;if(end<n&&b[end]=='\n')out[k++]='\n';int rest=end<n?end+1:end;memcpy(out+k,b+rest,(size_t)(n-rest));k+=n-rest;if(save("temp.txt",out,k)||remove("notes.txt")||rename("temp.txt","notes.txt")){puts("ERROR");return 0;}puts("UPDATED");`,
14:String.raw`FILE*a=fopen("early.txt","r"),*b=fopen("later.txt","r"),*out=fopen("merged.txt","w");if(!a||!b||!out){if(a)fclose(a);if(b)fclose(b);if(out)fclose(out);puts("ERROR");return 0;}int ta=0,tb=0,n=0;char sa[9],sb[9];int ha=fscanf(a,"%d%8s",&ta,sa)==2,hb=fscanf(b,"%d%8s",&tb,sb)==2;while(ha||hb){if(ha&&(!hb||ta<=tb)){fprintf(out,"%d %s\n",ta,sa);ha=fscanf(a,"%d%8s",&ta,sa)==2;}else{fprintf(out,"%d %s\n",tb,sb);hb=fscanf(b,"%d%8s",&tb,sb)==2;}n++;}fclose(a);fclose(b);fclose(out);printf("%d\n",n);`,
15:String.raw`int x[100]={0},y[100]={0},nx=0,ny=0;FILE*f=fopen("x.txt","r");if(!f){puts("ERROR");return 0;}while(nx<100&&fscanf(f,"%d",&x[nx])==1)nx++;fclose(f);f=fopen("y.txt","r");if(!f){puts("ERROR");return 0;}while(ny<100&&fscanf(f,"%d",&y[ny])==1)ny++;fclose(f);FILE*out=fopen("pairs.txt","w");if(!out){puts("ERROR");return 0;}if(nx!=ny){fclose(out);puts("LENGTH");return 0;}for(int i=0;i<nx;i++)fprintf(out,"%d %d\n",x[i],y[i]);fclose(out);printf("OK %d\n",nx);`,
16:String.raw`FILE*f=fopen("mixed.txt","r");if(!f){puts("ERROR");return 0;}int x,n=0,r;long long sum=0;while((r=fscanf(f,"%d",&x))==1){n++;sum+=x;}if(r==EOF)printf("%d %lld END\n",n,sum);else{int c=fgetc(f);printf("%d %lld INVALID %c\n",n,sum,c);}fclose(f);`,
17:String.raw`unsigned char b[8192];int n=load("source.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}unsigned char*p=memchr(b,0,(size_t)n);int k=p?(int)(p-b):n;save("left.bin",b,k);save("right.bin",b+(p?k+1:n),p?n-k-1:0);if(p)printf("SPLIT %d\n",k);else puts("NONE");`,
18:String.raw`unsigned char b[8192],out[960];int n=load("runs.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}int valid=n%2==0;if(valid)for(int i=0;i<n;i+=2)if(b[i]==0||b[i]>15)valid=0;if(!valid){save("expanded.bin",b,0);puts("INVALID");return 0;}int k=0;for(int i=0;i<n;i+=2)for(int j=0;j<b[i];j++)out[k++]=b[i+1];save("expanded.bin",out,k);printf("OK %d\n",k);`,
19:String.raw`FILE*in=fopen("records.bin","rb"),*out=fopen("reversed.bin","wb");if(!in||!out){if(in)fclose(in);if(out)fclose(out);puts("ERROR");return 0;}fseek(in,0,SEEK_END);long n=ftell(in)/4;unsigned char b[4];for(long i=n;i>0;i--){fseek(in,4*(i-1),SEEK_SET);fread(b,1,4,in);fwrite(b,1,4,out);}fclose(in);fclose(out);printf("%ld\n",n);`,
20:String.raw`int i,j;scanf("%d%d",&i,&j);unsigned char b[8192],temp[8];int n=load("slots.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}if(i<0||j<0||i>=n/8||j>=n/8){puts("RANGE");return 0;}if(i!=j){memcpy(temp,b+8*i,8);memcpy(b+8*i,b+8*j,8);memcpy(b+8*j,temp,8);}save("slots.bin",b,n);puts("OK");`,
21:String.raw`int wanted;scanf("%d",&wanted);unsigned char b[8192];int n=load("log.txt",b,sizeof b);if(n<0){puts("ERROR");return 0;}if(n&&wanted){int start[4097],lines=0;start[lines++]=0;for(int i=0;i<n-1;i++)if(b[i]=='\n')start[lines++]=i+1;int first=lines>wanted?lines-wanted:0;fwrite(b+start[first],1,(size_t)(n-start[first]),stdout);}`,
22:String.raw`FILE*f=fopen("packet.bin","wb");if(!f){puts("ERROR");return 0;}fputc(0,f);fputc(0,f);int x,n=0;while(scanf("%d",&x)==1){fputc(x,f);n++;}fseek(f,0,SEEK_SET);fputc(n>>8,f);fputc(n&255,f);fclose(f);printf("%d\n",n);`,
23:String.raw`int k;scanf("%d",&k);unsigned char b[8192]={0},a[8192]={0};int n=load("index.bin",b,sizeof b),m=load("data.bin",a,sizeof a);if(n<0||m<0){puts("ERROR");return 0;}if(k<0||k>=n/4){save("selected.bin",a,0);puts("RANGE");return 0;}int off=b[4*k]*256+b[4*k+1],len=b[4*k+2]*256+b[4*k+3];save("selected.bin",a+off,len);printf("OK %d\n",len);`,
24:String.raw`char text[202];fgets(text,sizeof text,stdin);text[strcspn(text,"\n")]='\0';int m=(int)strlen(text);unsigned char old[8192];int n=load("source.bin",old,sizeof old);if(n<0){puts("ERROR");return 0;}if(save("backup.bin",old,n)||save("source.bin",(unsigned char*)text,m))puts("ERROR");else puts("OK");`
};
const pWrong={
1:['min=max=x;','min=0;max=x;'],2:['score>=t','score>t'],3:['if(start){fprintf','if(start&&b[i]!=10){fprintf'],4:['line<=last','line<last'],
5:[String.raw`a[na-1]!='\n'`,'1'],6:['i<na&&i<nb&&a[i]==b[i]','i<na&&i<nb'],7:['if(i+1<n&&b[i+1]==10)i++;','(void)0;'],
8:['%02X','%02x'],9:['i<n-1','i<n'],10:['count>n-off','count>=n-off'],11:['p=i;break;','p=i;'],
12:['strcmp(s,word)==0','strncmp(s,word,strlen(word))==0'],13:[String.raw`if(end<n&&b[end]=='\n')out[k++]='\n';`,String.raw`out[k++]='\n';`],
14:['ta<=tb','ta<tb'],15:['if(nx!=ny)','if(0)'],16:['if(r==EOF)','if(r!=1)'],17:['memchr(b,0,(size_t)n)','memchr(b,255,(size_t)n)'],
18:['if(b[i]==0||b[i]>15)','if(b[i]>15)'],19:['fwrite(b,1,4,out);','for(int j=3;j>=0;j--)fputc(b[j],out);'],20:['memcpy(b+8*j,temp,8)','memcpy(b+8*j,b+8*i,8)'],
21:['fwrite(b+start[first],1,(size_t)(n-start[first]),stdout);',String.raw`fwrite(b+start[first],1,(size_t)(n-start[first]),stdout);putchar('\n');`],
22:['fputc(n>>8,f);fputc(n&255,f);','fputc(n&255,f);fputc(n>>8,f);'],23:['int off=b[4*k]*256+b[4*k+1]','int off=4*k'],24:['save("backup.bin",old,n)','save("backup.bin",(unsigned char*)text,m)']
};
const be16=x=>[x>>>8&255,x&255];
const lines=text=>{const a=text.split('\n');if(!text||text.endsWith('\n'))a.pop();return a;};
export function cFilesRunLengthCase(a){
 if(!Array.isArray(a)||a.length>128||a.some(x=>!Number.isInteger(x)||x<0||x>255))throw RangeError('invalid run-length fixture');
 const ok=a.length%2===0&&a.every((v,i)=>i%2===1||v>=1&&v<=15);
 const b=ok?Array.from({length:a.length/2},(_,i)=>Array(a[2*i]).fill(a[2*i+1])).flat():[];
 return fileCase({seeds:{'runs.bin':a},write:['expanded.bin'],out:{'expanded.bin':b},stdout:ok?`OK ${b.length}\n`:'INVALID\n'});
}
const pCases={
1:[[],[-7],[4,4,9],Array(1000).fill(-1000)].map(a=>fileCase({seeds:{'numbers.txt':a.join(' ')+'\n'},stdout:a.length?`${a.length} ${a.reduce((s,v)=>s+v,0)} ${Math.min(...a)} ${Math.max(...a)}\n`:'EMPTY\n',limits:{max_file_bytes:16384,max_allocation_reservation_bytes:65536,max_capture_bytes:32768}})),
2:[{a:[],t:0},{a:[['a',0],['b',100]],t:0},{a:[['same',60],['same',59],['c',60]],t:60},{a:[['a',9],['b',10]],t:100}].map(({a,t})=>{
 const selected=a.filter(r=>r[1]>=t);return fileCase({seeds:{'scores.txt':a.map(r=>r.join(' ')).join('\n')+(a.length?'\n':'')},write:['passed.txt'],out:{'passed.txt':selected.map(r=>r.join(' ')+'\n').join('')},stdin:`${t}\n`,stdout:`${selected.length}\n`});}),
3:['','\n\nx','long'.repeat(20)+'\nlast','\n'.repeat(4096)].map(text=>fileCase({seeds:{'log.txt':text},write:['numbered.txt'],
 out:{'numbered.txt':lines(text).map((s,i)=>`${i+1}:${s}${i<lines(text).length-1||text.endsWith('\n')?'\n':''}`).join('')},stdout:`${lines(text).length}\n`,
 limits:{max_file_bytes:65536,max_allocation_reservation_bytes:65536,max_capture_bytes:65536}})),
4:[{s:'',first:1,last:1},{s:'a\nb\n',first:3,last:8},{s:'\nx\nlast',first:1,last:2},{s:'a\nb\nlast',first:2,last:3}].map(({s,first,last})=>{
 const a=lines(s),picked=a.map((v,i)=>({v,i})).filter(x=>x.i+1>=first&&x.i+1<=last);return fileCase({seeds:{'lines.txt':s},write:['selected.txt'],
 out:{'selected.txt':picked.map(({v,i})=>v+(i<a.length-1||s.endsWith('\n')?'\n':'')).join('')},stdin:`${first} ${last}\n`,stdout:`${picked.length}\n`});}),
5:[['',''],['a',''],['a\n','\nb'],['a'.repeat(2048),'b'.repeat(2048)]].map(([a,b])=>fileCase({seeds:{'left.txt':a,'right.txt':b},write:['joined.txt'],
 out:{'joined.txt':a+(a&&b&&!a.endsWith('\n')?'\n':'')+b},stdout:'OK\n',limits:{max_file_bytes:8192}})),
6:[[[1],[]],[[0,255],[0,255]],[[0,7,9],[0,8,9]],[[1,2],[1,2,0]]].map(([a,b])=>{let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
 return fileCase({seeds:{'a.bin':a,'b.bin':b},stdout:i===a.length&&i===b.length?'EQUAL\n':`DIFF ${i} ${i<a.length?a[i]:'END'} ${i<b.length?b[i]:'END'}\n`});}),
7:[[],[13],[65,13,10,66,13,67,10],[0,13,13,10,255,13,10]].map(a=>{const b=[];for(let i=0;i<a.length;i++)if(a[i]===13){b.push(10);if(a[i+1]===10)i++;}else b.push(a[i]);
 return fileCase({seeds:{'source.bin':a},write:['normalized.bin'],out:{'normalized.bin':b},stdout:'OK\n'});}),
8:[[],[0,10,175,255],Array.from({length:16},(_,i)=>i),Array.from({length:17},(_,i)=>255-i)].map(a=>fileCase({seeds:{'data.bin':a},write:['dump.txt'],
 out:{'dump.txt':Array.from({length:Math.ceil(a.length/16)},(_,i)=>a.slice(16*i,16*i+16).map(v=>v.toString(16).toUpperCase().padStart(2,'0')).join(' ')+'\n').join('')},stdout:`${a.length}\n`})),
9:['','\n','\na\n\nlast','\n'.repeat(4096)].map(s=>{const starts=s?[0,...Array.from(s).flatMap((c,i)=>c==='\n'&&i<s.length-1?[i+1]:[])]:[];
 return fileCase({seeds:{'data.txt':s},write:['index.bin'],out:{'index.bin':[...be16(starts.length),...starts.flatMap(be16)]},stdout:`${starts.length}\n`,limits:{max_file_bytes:16384}});}),
10:[{a:[],off:0,n:0},{a:[0,255,5,6],off:1,n:3},{a:[1,2,3],off:3,n:0},{a:[1,2,3],off:2,n:2}].map(({a,off,n})=>{const ok=off<=a.length&&n<=a.length-off;
 return fileCase({seeds:{'source.bin':a},write:['part.bin'],out:{'part.bin':ok?a.slice(off,off+n):[]},stdin:`${off} ${n}\n`,stdout:ok?'OK\n':'RANGE\n'});}),
11:[{a:[],key:0,v:0},{a:[1,0,9],key:1,v:65535},{a:[2,0,1,2,0,2,3,0,3],key:2,v:256},{a:[1,0,9,3,0,7],key:3,v:0}].map(({a,key,v})=>{
 const b=[...a],p=Array.from({length:a.length/3},(_,i)=>3*i).find(i=>a[i]===key);if(p!==undefined)b.splice(p+1,2,...be16(v));return fileCase({seeds:{'records.bin':a},write:['records.bin'],out:{'records.bin':b},stdin:`${key} ${v}\n`,stdout:p===undefined?'NOTFOUND\n':'UPDATED\n'});}),
12:[{a:[],word:'a'},{a:['foo','bar'],word:'foo'},{a:['foobar','z'],word:'foo'},{a:['a','a','b'],word:'a'}].map(({a,word})=>{
 const old=a.map(s=>s+'\n').join(''),found=a.includes(word);return fileCase({seeds:{'names.txt':old},write:['names.txt'],out:{'names.txt':old+(found?'':word+'\n')},stdin:word+'\n',stdout:found?'EXISTS\n':'ADDED\n'});}),
13:[{s:'',k:1,t:'x'},{s:'a\nb\n',k:1,t:'a much longer line'},{s:'\na\n',k:1,t:''},{s:'a\nlast',k:2,t:'X'}].map(({s,k,t})=>{
 const a=lines(s),exists=k<=a.length,b=a.map((x,i)=>(i===k-1?t:x)+(i<a.length-1||s.endsWith('\n')?'\n':'')).join('');
 return fileCase({seeds:{'notes.txt':s},write:['notes.txt','temp.txt'],out:{'notes.txt':exists?b:s},absent:['temp.txt'],stdin:`${k}\n${t}\n`,stdout:exists?'UPDATED\n':'NOTFOUND\n',limits:{max_file_bytes:8192}});}),
14:[[[],[]],[[[1,'a'],[2,'b']],[]],[[[2,'a'],[2,'b'],[5,'c']],[[2,'x'],[2,'y'],[4,'z']]],[[[0,'a'],[9,'b']],[[1,'x'],[2,'y'],[10,'z']]]].map(([a,b])=>{
 const sorted=[...a.map((r,i)=>({r,source:0,i})),...b.map((r,i)=>({r,source:1,i}))].sort((x,y)=>x.r[0]-y.r[0]||x.source-y.source||x.i-y.i);
 const text=x=>x.map(r=>r.join(' ')+'\n').join('');return fileCase({seeds:{'early.txt':text(a),'later.txt':text(b)},write:['merged.txt'],out:{'merged.txt':text(sorted.map(x=>x.r))},stdout:`${a.length+b.length}\n`});}),
15:[[[],[]],[[0],[-5]],[[1,2,3],[4]],[[1],[4,5,6]]].map(([a,b])=>fileCase({seeds:{'x.txt':a.join(' ')+'\n','y.txt':b.join(' ')+'\n'},write:['pairs.txt'],
 out:{'pairs.txt':a.length===b.length?a.map((v,i)=>`${v} ${b[i]}\n`).join(''):''},stdout:a.length===b.length?`OK ${a.length}\n`:'LENGTH\n'})),
16:[[],['-1','0','1'],['X','9'],['2','-7','Q','1000']].map(a=>{const p=a.findIndex(x=>/^[A-Z]$/.test(x)),valid=a.slice(0,p<0?a.length:p),sum=valid.reduce((s,v)=>s+Number(v),0);
 return fileCase({seeds:{'mixed.txt':a.join(' ')+'\n'},stdout:`${valid.length} ${sum} ${p<0?'END':'INVALID '+a[p]}\n`});}),
17:[[],[1,255,2],[0,1,0,255],[1,2,0]].map(a=>{const k=a.indexOf(0);return fileCase({seeds:{'source.bin':a},write:['left.bin','right.bin'],out:{'left.bin':k<0?a:a.slice(0,k),'right.bin':k<0?[]:a.slice(k+1)},stdout:k<0?'NONE\n':`SPLIT ${k}\n`});}),
18:[[16,65],[15,0,15,255],[1,65,9],[0,65]].map(cFilesRunLengthCase),
19:[[],[0,1,2,255],[1,2,3,4,5,6,7,8],[0,0,0,0,9,8,7,6,0,0,0,0]].map(a=>fileCase({seeds:{'records.bin':a},write:['reversed.bin'],
 out:{'reversed.bin':Array.from({length:a.length/4},(_,i)=>a.slice(4*i,4*i+4)).reverse().flat()},stdout:`${a.length/4}\n`})),
20:[{a:[],i:0,j:0},{a:Array.from({length:24},(_,i)=>i),i:0,j:2},{a:[0,255,1,2,3,4,5,6],i:0,j:0},{a:Array(16).fill(7),i:-1,j:0}].map(({a,i,j})=>{
 const b=[...a],ok=i>=0&&j>=0&&i<a.length/8&&j<a.length/8;if(ok){const x=a.slice(8*i,8*i+8),y=a.slice(8*j,8*j+8);b.splice(8*i,8,...y);b.splice(8*j,8,...x);}
 return fileCase({seeds:{'slots.bin':a},write:['slots.bin'],out:{'slots.bin':b},stdin:`${i} ${j}\n`,stdout:ok?'OK\n':'RANGE\n'});}),
21:[{s:'',n:3},{s:'a\nb\n',n:0},{s:'a\n\n\n',n:2},{s:'first\nlast',n:8}].map(({s,n})=>{const a=lines(s),start=Math.max(0,a.length-n),output=n?a.slice(start).map((v,i)=>v+(start+i<a.length-1||s.endsWith('\n')?'\n':'')).join(''):'';
 return fileCase({seeds:{'log.txt':s},stdin:`${n}\n`,stdout:output,exact:true});}),
22:[[],[0],Array.from({length:256},(_,i)=>i),Array.from({length:1024},(_,i)=>i%256)].map(a=>fileCase({write:['packet.bin'],out:{'packet.bin':[...be16(a.length),...a]},stdin:a.join(' ')+'\n',stdout:`${a.length}\n`})),
23:[{index:[],a:[],k:0},{index:[[16,0]],a:Array.from({length:16},(_,i)=>i),k:0},{index:[[0,4],[5,3],[2,7]],a:Array.from({length:16},(_,i)=>255-i),k:2},{index:[[0,4]],a:[0,255,1,2],k:1}].map(({index,a,k})=>{
 const ok=k>=0&&k<index.length;return fileCase({seeds:{'index.bin':index.flatMap(([o,l])=>[...be16(o),...be16(l)]),'data.bin':a},write:['selected.bin'],out:{'selected.bin':ok?a.slice(index[k][0],index[k][0]+index[k][1]):[]},stdin:`${k}\n`,stdout:ok?`OK ${index[k][1]}\n`:'RANGE\n'});}),
24:[{a:[],old:null,t:''},{a:[0,255,1,2],old:[9,9,9,9,9,9],t:'x'},{a:Array.from({length:4096},(_,i)=>i%256),old:[],t:' end '},{a:[65],old:[66,67],t:'Z'.repeat(200)}].map(({a,old,t})=>fileCase({
 seeds:{'source.bin':a,...(old===null?{}:{'backup.bin':old})},write:['source.bin','backup.bin'],out:{'backup.bin':a,'source.bin':t},stdin:t+'\n',stdout:'OK\n'}))
};
for(let n=1;n<=24;n++){const source=program(pBodies[n]);register('P',n,pCases[n],source,mutate(source,...pWrong[n]));}
cFilesEquivalentSources[id('B',8)].push(program(String.raw`int k;scanf("%d",&k);unsigned char b[8192];int n=load("slots.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}if(k<0||k>=n/3)puts("RANGE");else printf("%u %u %u\n",(unsigned)b[3*k],(unsigned)b[3*k+1],(unsigned)b[3*k+2]);`));
cFilesEquivalentSources[id('B',15)].push(program(String.raw`unsigned char b[8192];int n=load("words.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}unsigned long sum=0;for(int i=0;i+1<n;i+=2)sum+=(unsigned long)b[i]*256+b[i+1];printf("%d %lu\n",n/2,sum);`));
cFilesEquivalentSources[id('P',6)].push(program(String.raw`FILE*a=fopen("a.bin","rb"),*b=fopen("b.bin","rb");if(!a||!b){if(a)fclose(a);if(b)fclose(b);puts("ERROR");return 0;}int pos=0,x,y;for(;;){x=fgetc(a);y=fgetc(b);if(x!=y||x==EOF)break;pos++;}fclose(a);fclose(b);if(x==EOF&&y==EOF)puts("EQUAL");else{printf("DIFF %d ",pos);if(x==EOF)printf("END");else printf("%d",x);putchar(' ');if(y==EOF)puts("END");else printf("%d\n",y);}`));
cFilesEquivalentSources[id('P',7)].push(program(String.raw`FILE*in=fopen("source.bin","rb"),*out=fopen("normalized.bin","wb");if(!in||!out){if(in)fclose(in);if(out)fclose(out);puts("ERROR");return 0;}int pending=0,c;while((c=fgetc(in))!=EOF){if(pending){fputc(10,out);pending=0;if(c==10)continue;}if(c==13)pending=1;else fputc(c,out);}if(pending)fputc(10,out);fclose(in);fclose(out);puts("OK");`));
cFilesEquivalentSources[id('P',14)].push(HELPERS+String.raw`
struct Rec{int time,source,order;char label[9];};
static int cmp(const void*x,const void*y){const struct Rec*a=x,*b=y;if(a->time!=b->time)return a->time<b->time?-1:1;if(a->source!=b->source)return a->source-b->source;return a->order-b->order;}
int main(void){struct Rec r[200];int n=0;const char*names[]={"early.txt","later.txt"};for(int source=0;source<2;source++){FILE*f=fopen(names[source],"r");if(!f){puts("ERROR");return 0;}int t,order=0;char s[9];while(fscanf(f,"%d%8s",&t,s)==2){r[n].time=t;r[n].source=source;r[n].order=order++;strcpy(r[n].label,s);n++;}fclose(f);}qsort(r,(size_t)n,sizeof r[0],cmp);FILE*f=fopen("merged.txt","w");if(!f){puts("ERROR");return 0;}for(int i=0;i<n;i++)fprintf(f,"%d %s\n",r[i].time,r[i].label);fclose(f);printf("%d\n",n);return 0;}`);
cFilesEquivalentSources[id('P',19)].push(program(String.raw`unsigned char b[8192],out[8192];int n=load("records.bin",b,sizeof b);if(n<0){puts("ERROR");return 0;}for(int i=0;i<n/4;i++)memcpy(out+4*i,b+n-4*(i+1),4);save("reversed.bin",out,n);printf("%d\n",n/4);`));

// Required final contents do not imply that a write-only target starts absent.
// Mix nonempty old targets with two different input boundaries, while retaining
// absent targets in the other configurations. Do not seed names explicitly
// promised absent (P025, P013 temp, B014 published).
const overwriteAdditions={
 [id('B',6)]:['report.txt'],[id('B',7)]:['backup.bin'],[id('B',11)]:['packet.bin'],
 ...Object.fromEntries([2,3,4,5,7,8,9,10,14,15,17,18,19,22,23].map(n=>[id('P',n),{
  2:['passed.txt'],3:['numbered.txt'],4:['selected.txt'],5:['joined.txt'],7:['normalized.bin'],8:['dump.txt'],9:['index.bin'],10:['part.bin'],
  14:['merged.txt'],15:['pairs.txt'],17:['left.bin','right.bin'],18:['expanded.bin'],19:['reversed.bin'],22:['packet.bin'],23:['selected.bin']
 }[n]]))
};
for(const [key,names] of Object.entries(overwriteAdditions)){
 const c=contracts.get(key);for(const i of [0,3])for(const name of names){
  if(!c.variants[i].file_policy.names.includes(name))throw Error('undeclared overwrite target');
  c.variants[i].file_policy.seeds[name]=ascii(`old ${name} ${i}\n`);
 }
}
export const cFilesOverwriteTargets=Object.freeze({...overwriteAdditions,
 [id('B',2)]:['out.txt'],[id('B',14)]:['draft.txt'],[id('P',24)]:['backup.bin']});
const appendOpen={
 [id('B',6)]:['report.txt','w'],[id('B',7)]:['backup.bin','wb'],[id('B',11)]:['packet.bin','wb'],
 [id('P',2)]:['passed.txt','w'],[id('P',3)]:['numbered.txt','wb'],[id('P',4)]:['selected.txt','wb'],
 [id('P',8)]:['dump.txt','w'],[id('P',14)]:['merged.txt','w'],[id('P',15)]:['pairs.txt','w'],
 [id('P',19)]:['reversed.bin','wb'],[id('P',22)]:['packet.bin','wb']
};
export const cFilesRegressionSources=Object.fromEntries(Object.keys(overwriteAdditions).map(key=>{
 const pair=appendOpen[key],from=pair?`fopen("${pair[0]}","${pair[1]}")`:'fopen(name,"wb")';
 const to=pair?`fopen("${pair[0]}","${pair[1]==='w'?'a':'ab'}")`:'fopen(name,"ab")';
 return [key,[{name:'append-instead-of-replace',source:mutate(cFilesReferenceSources[key],from,to)}]];
}));
cFilesRegressionSources[id('B',9)]=[{name:'negative-position-unchecked',source:mutate(cFilesReferenceSources[id('B',9)],'p<0||p>=n','p>=n')}];
cFilesRegressionSources[id('P',6)]=[{name:'right-first-eof-confused-with-equality',source:mutate(cFilesReferenceSources[id('P',6)],'if(i==na&&i==nb)','if(i==nb)')}];
export const cFilesContractIds=Object.freeze([...contracts.keys()]);
