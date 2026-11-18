// Server-only complete programs; expectations come from independent JS models.
import {cBasicsPractice} from '../bank-c-basics.js';
const qid=(tag,n)=>`C6B-programming-2-${tag}-${String(n).padStart(3,'0')}`;
const specs=new Map(),references={},wrong={},equivalents={};
const program=(body,headers='')=>`#include <stdio.h>\n${headers}\nint main(void){${body}return 0;}\n`;
const words=s=>s.trim().split(/\s+/);
const numbers=s=>words(s).map(Number);
function roundedMagnitude(x,p){
 // Exact binary64 rational rounding, ties to even, independent of C's printf.
 const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,x);const bits=view.getBigUint64(0);
 const e=Number((bits>>52n)&2047n),fraction=bits&((1n<<52n)-1n);
 let numerator=e?(1n<<52n)|fraction:fraction,denominator=1n,shift=e?e-1023-52:-1074;
 if(p>=0)numerator*=10n**BigInt(p);else denominator*=10n**BigInt(-p);
 if(shift>=0)numerator<<=BigInt(shift);else denominator<<=BigInt(-shift);
 let n=numerator/denominator;const r=numerator%denominator;if(r*2n>denominator||(r*2n===denominator&&n%2n))n++;
 return n;
}
function fixed(x,p){
 const n=roundedMagnitude(x,p),negative=x<0||Object.is(x,-0);
 let digits=n.toString().padStart(p+1,'0');if(p)digits=digits.slice(0,-p)+'.'+digits.slice(-p);
 return (negative?'-':'')+digits;
}
const integer=(n,width=0,zero=false,plus=false,precision=null)=>{
 const sign=n<0?'-':plus?'+':'',digits=Math.abs(n).toString().padStart(precision??0,'0'),value=sign+digits;
 if(Math.abs(width)<=value.length)return value;
 if(width<0)return value.padEnd(-width,' ');
 return zero?sign+digits.padStart(width-sign.length,'0'):value.padStart(width,' ');
};
const expo=(x,p)=>{
 let exp=x===0?0:Math.floor(Math.log10(Math.abs(x))),n=roundedMagnitude(x,p-exp);
 if(n>=10n**BigInt(p+1)){n/=10n;exp++;}
 const digits=n.toString().padStart(p+1,'0'),mantissa=digits[0]+(p?'.'+digits.slice(1):'');
 return (x<0||Object.is(x,-0)?'-':'')+mantissa+'e'+(exp<0?'-':'+')+String(Math.abs(exp)).padStart(2,'0');
};
const general3=x=>{const scientific=expo(x,2),exp=Number(scientific.split('e')[1]);if(exp<-4||exp>=3)return scientific.replace(/(\.\d*?)0+(e)/,'$1$2').replace(/\.(e)/,'$1');return fixed(x,Math.max(0,2-exp)).replace(/(\.\d*?)0+$/,'$1').replace(/\.$/,'');};
function add(tag,n,body,inputs,oracle,{exact=false,headers='',bad,alternatives=[]}={}){
 const id=qid(tag,n),source=program(body,headers);references[id]=source;
 if(!bad)throw Error('缺少实际错误族 '+id);
 wrong[id]=program(bad,headers);equivalents[id]=alternatives.map(a=>program(a,headers));
 specs.set(id,()=>({variants:inputs.map(stdin=>{
  const output=oracle(stdin);return exact?{stdin,exactOutput:output}:{stdin,groups:output.replace(/\n$/,'').split('\n').map(line=>line.trim().split(/\s+/).filter(Boolean)),expected:output.trim().split(/\s+/).filter(Boolean)};
 })}));
}
add('B',1,'int n;scanf("%d",&n);printf("%d\\n",n);',['0','-1000000','1000000','00010'],s=>`${Number(s)}\n`,{bad:'int n;scanf("%i",&n);printf("%d\\n",n);'});
add('B',2,'int a=0,b=0;scanf("%d,%d",&a,&b);printf("%d %d\\n",a,b);',['1,2','-1000,1000','0,-7',' 8, -3'],s=>s.split(',').map(Number).join(' ')+'\n',{bad:'int a=0,b=0;scanf("%d%d",&a,&b);printf("%d %d\\n",a,b);'});
add('B',3,'double x;scanf("%lf",&x);printf("%.2f\\n",x);',['0','-1000','1.125','2.005'],s=>fixed(Number(s),2)+'\n',{exact:true,bad:'double x;scanf("%lf",&x);printf("%.1f\\n",x);'});
add('B',4,'char a,b;scanf("%c%c",&a,&b);printf("[%c][%c]\\n",a,b);',['AZ',' A','B ','  '],s=>`[${s[0]}][${s[1]}]\n`,{exact:true,bad:'char a=\'?\',b=\'?\';scanf(" %c %c",&a,&b);printf("[%c][%c]\\n",a,b);'});
add('B',5,'char c;scanf(" %c",&c);printf("[%c]\\n",c);',[' A','\n\tZ','\t0','   !'],s=>`[${s.trimStart()[0]}]\n`,{exact:true,bad:'char c;scanf("%c",&c);printf("[%c]\\n",c);'});
const partial=s=>{const tokens=words(s);let a=11,b=22,r=0;const int=/^[+-]?\d+$/;if(int.test(tokens[0])){a=Number(tokens[0]);r=1;if(int.test(tokens[1]??'')){b=Number(tokens[1]);r=2;}}return `${r} ${a} ${b}\n`;};
add('B',6,'int a=11,b=22;int r=scanf("%d%d",&a,&b);printf("%d %d %d\\n",r,a,b);',['1 2','-1000 1000','5 x','x'],partial,{bad:'int a=11,b=22;scanf("%d%d",&a,&b);printf("%d %d %d\\n",2,a,b);'});
add('B',7,'int a,b;scanf("%d%*d%d",&a,&b);printf("%d %d\\n",a,b);',['1 2 3','-1000 0 1000','0 -9 0','7 1000 -8'],s=>{const a=numbers(s);return `${a[0]} ${a[2]}\n`;},{bad:'int a,b,c;scanf("%d%d%d",&a,&b,&c);printf("%d %d\\n",a,b);'});
add('B',8,'int n;char c;scanf("%2d%c",&n,&c);printf("%d %c\\n",n,c);',['12X','-45','+78','00!'],s=>`${Number(s.slice(0,2))} ${s[2]}\n`,{exact:true,bad:'int n;char c=\'?\';scanf("%d%c",&n,&c);printf("%d %c\\n",n,c);'});
add('B',9,'int c=getchar();printf("%d %d\\n",c==EOF,c==EOF?0:c);',['','A','0','~'],s=>`${Number(!s)} ${s?s.charCodeAt(0):0}\n`,{bad:'int c=getchar();printf("%d %d\\n",c==0,c==EOF?0:c);'});
add('B',10,'int c=getchar();int written=putchar(c);putchar(written);putchar(\'\\n\');',['A','0','!',' '],s=>s[0]+s[0]+'\n',{exact:true,bad:'int c=getchar();int written=putchar(c);putchar(written+1);putchar(\'\\n\');',alternatives:['int c=getchar();printf("%c%c\\n",c,c);']});
add('B',11,'int n;scanf("%d",&n);printf("rate=%d%%\\n",n);',['0','1','50','100'],s=>`rate=${Number(s)}%\n`,{exact:true,bad:'int n;scanf("%d",&n);printf("rate=%d\\n",n);'});
add('B',12,'int n;scanf("%d",&n);printf("[%6d]\\n",n);',['0','-12','123456','-999999'],s=>`[${integer(Number(s),6)}]\n`,{exact:true,bad:'int n;scanf("%d",&n);printf("[%06d]\\n",n);'});
add('B',13,'char s[9];scanf("%8s",s);printf("[%.3s]\\n",s);',['a','abc','abcdefgh','xy'],s=>`[${s.slice(0,3)}]\n`,{exact:true,bad:'char s[9];scanf("%8s",s);printf("[%3s]\\n",s);'});
const autoInt=s=>/^0[xX]/.test(s)?parseInt(s.slice(2),16):/^0\d/.test(s)?parseInt(s,8):Number(s);
add('B',14,'int n;scanf("%i",&n);printf("%d\\n",n);',['0','010','0xFF','10000'],s=>`${autoInt(s)}\n`,{bad:'int n;scanf("%d",&n);printf("%d\\n",n);'});
const tagged=s=>{const m=s.match(/^id=([+-]?\d+)/);return m?`1 ${Number(m[1])}\n`:s===''||s==='id='?'-1 -9\n':'0 -9\n';};
add('B',15,'int n=-9;int r=scanf("id=%d",&n);printf("%d %d\\n",r==EOF?-1:r,n);',['id=-12','value=7','','id='],tagged,{bad:'int n=-9;int r=scanf("%d",&n);printf("%d %d\\n",r==EOF?-1:r,n);'});

add('P',1,'int n;scanf("%d",&n);printf("[%+06d]\\n",n);',['0','12','-12','-999999'],s=>`[${integer(Number(s),6,true,true)}]\n`,{exact:true,bad:'int n;scanf("%d",&n);printf("[%06d]\\n",n);'});
add('P',2,'int n;scanf("%d",&n);printf("[%-7d]\\n",n);',['0','-12','123456','-1000000'],s=>`[${integer(Number(s),-7)}]\n`,{exact:true,bad:'int n;scanf("%d",&n);printf("[%7d]\\n",n);'});
add('P',3,'int n;scanf("%d",&n);printf("[%.4d]\\n",n);',['0','7','-12','10000'],s=>`[${integer(Number(s),0,false,false,4)}]\n`,{exact:true,bad:'int n;scanf("%d",&n);printf("[%04d]\\n",n);'});
add('P',4,'int w,n;scanf("%d%d",&w,&n);printf("[%*d]\\n",w,n);',['6 12','-6 -12','0 7','2 100000'],s=>{const[w,n]=numbers(s);return`[${integer(n,w)}]\n`;},{exact:true,bad:'int w,n;scanf("%d%d",&w,&n);printf("[%*d]\\n",w<0?-w:w,n);'});
add('P',5,'int p;double x;scanf("%d%lf",&p,&x);printf("[%.*f]\\n",p,x);',['0 2.5','2 -1.125','4 999.875','2 2.005'],s=>{const[p,x]=numbers(s);return`[${fixed(x,p)}]\n`;},{exact:true,bad:'int p;double x;scanf("%d%lf",&p,&x);printf("[%.2f]\\n",x);'});
const prefixed=n=>`[${n?'0'+n.toString(8):'0'}][${n?'0x'+n.toString(16):'0'}][${n?'0X'+n.toString(16).toUpperCase():'0'}]\n`;
add('P',6,'unsigned n;scanf("%u",&n);printf("[%#o][%#x][%#X]\\n",n,n,n);',['0','1','255','65535'],s=>prefixed(Number(s)),{exact:true,bad:'unsigned n;scanf("%u",&n);printf("[%o][%x][%X]\\n",n,n,n);'});
add('P',7,'unsigned a,b;scanf("%o%x",&a,&b);printf("%u %u\\n",a,b);',['10 10','0 0x0','23420 0x2710','17 ff'],s=>{const[a,b]=words(s);return`${parseInt(a,8)} ${parseInt(b,16)}\n`;},{bad:'unsigned a=0,b=0;scanf("%x%o",&a,&b);printf("%u %u\\n",a,b);'});
add('P',8,'int d,c;scanf("%d%d",&d,&c);printf("money=%d.%02d\\n",d,c);',['0 0','1 5','1000000 99','12 10'],s=>{const[d,c]=numbers(s);return`money=${d}.${String(c).padStart(2,'0')}\n`;},{exact:true,bad:'int d,c;scanf("%d%d",&d,&c);printf("money=%d.%d\\n",d,c);'});
add('P',9,'int a=getchar(),b=getchar(),c=getchar();putchar(a);putchar(b);putchar(c);',['ABC',' A ','A\nB','\n Q'],s=>s.slice(0,3),{exact:true,bad:'int a=getchar(),b=getchar(),c=getchar();putchar(a);putchar(b);putchar(c);putchar(\'\\n\');'});
const mixed=s=>s.match(/^([+-]?\d+)([^\d+-])([+-]?\d+)/);
add('P',10,'int a,b;char c;scanf("%d%c%d",&a,&c,&b);printf("%d %c %d\\n",a,c,b);',['1,2','-1000|1000','0/0','7:-8'],s=>{const[,a,c,b]=mixed(s);return`${Number(a)} ${c} ${Number(b)}\n`;},{bad:'int a,b;char c;scanf("%d%c%d",&a,&c,&b);printf("%d , %d\\n",a,b);'});
add('P',11,'char s[6];scanf("%5s",s);int c=getchar();printf("[%s][%c]\\n",s,c);',['a ','abcde ','abcdef ','abcdefghij '],s=>{const w=s.slice(0,-1);return`[${w.slice(0,5)}][${s[Math.min(w.length,5)]}]\n`;},{exact:true,bad:'char s[11];scanf("%10s",s);int c=getchar();printf("[%s][%c]\\n",s,c);'});
add('P',12,'char a[3];scanf("%3c",a);printf("[%.3s]\\n",a);',['ABC',' A ','   ','~0!'],s=>`[${s.slice(0,3)}]\n`,{exact:true,bad:'char a[3];scanf("%3c",a);printf("[%.2s]\\n",a);',alternatives:['char a[3];scanf("%3c",a);putchar(\'[\');putchar(a[0]);putchar(a[1]);putchar(a[2]);puts("]");']});
add('P',13,'char s[7];scanf("%6[abcdefghijklmnopqrstuvwxyz]",s);int c=getchar();printf("[%s][%c]\\n",s,c);',['a!','abcdef?','abc123','z_'],s=>{const w=s.match(/^[a-z]{1,6}/)[0];return`[${w}][${s[w.length]}]\n`;},{exact:true,bad:'char s[7];scanf("%6s",s);int c=getchar();printf("[%s][%c]\\n",s,c);'});
add('P',14,'int n=77;int r=scanf("%d",&n);printf("%d %d %d\\n",r==EOF,r==EOF?0:r,n);',['',' \n\t','x','-1000'],s=>s.trim()===''?'1 0 77\n':/^[+-]?\d+$/.test(s.trim())?`0 1 ${Number(s)}\n`:'0 0 77\n',{bad:'int n=77;int r=scanf("%d",&n);printf("%d %d %d\\n",r<=0,r==EOF?0:r,n);'});
add('P',15,'int n;scanf("%d ",&n);int c=getchar();printf("%d %c\\n",n,c);',['7 X','-1000\n\tZ','0  !','1000 \n A'],s=>{const m=s.match(/^([+-]?\d+)\s+([^\s])/);return`${Number(m[1])} ${m[2]}\n`;},{exact:true,bad:'int n;scanf("%d",&n);int c=getchar();printf("%d %c\\n",n,c);'});
add('P',16,'double x;scanf("%lf",&x);printf("[%.2e]\\n",x);',['0','2.005','1234','0.03125'],s=>`[${expo(Number(s),2)}]\n`,{exact:true,bad:'double x;scanf("%lf",&x);printf("[%.2f]\\n",x);'});
add('P',17,'double x;scanf("%lf",&x);printf("[%.3g]\\n",x);',['2.005','999.5','0.000125','0.0000125'],s=>`[${general3(Number(s))}]\n`,{exact:true,bad:'double x;scanf("%lf",&x);printf("[%.3f]\\n",x);'});
add('P',18,'char s[9];scanf("%8s",s);printf("\\"%s\\"\\n\\\\%s\\\\\\n",s,s);',['a','abc','abcdefgh','z'],s=>`"${s}"\n\\${s}\\\n`,{exact:true,bad:'char s[9];scanf("%8s",s);printf("%s\\n%s\\n",s,s);'});
add('P',19,'int n;scanf("%d",&n);int r=printf("<%04d>\\n",n);printf("%d\\n",r);',['0','-12','100000','-100000'],s=>{const line=`<${integer(Number(s),4,true)}>\n`;return line+line.length+'\n';},{exact:true,bad:'int n;scanf("%d",&n);printf("<%04d>\\n",n);printf("%d\\n",4);'});
add('P',20,'int id;double x;char c;scanf("%d%lf %c",&id,&x,&c);printf("id=%d,value=%.3f,tag=%c\\n",id,x,c);',['1 2.0005 Z','-1000 -1.125 !','0 0 A','1000 999.875\nQ'],s=>{const a=words(s);return`id=${Number(a[0])},value=${fixed(Number(a[1]),3)},tag=${a[2]}\n`;},{exact:true,bad:'int id;double x;char c;scanf("%d%lf%c",&id,&x,&c);printf("id=%d,value=%.3f,tag=%c\\n",id,x,c);'});
add('P',21,String.raw`unsigned code;scanf("\\x%x",&code);printf("[%c]\n",(int)code);`,['\\x41','\\x20','\\x7e','\\x30'],s=>`[${String.fromCharCode(parseInt(s.slice(2),16))}]\n`,{exact:true,bad:String.raw`unsigned code;scanf("\\x%x",&code);printf("[%u]\n",code);`,alternatives:[String.raw`unsigned code;scanf("\\x%x",&code);putchar('[');putchar((int)code);puts("]");`]});
add('P',22,'int a,b;scanf("%d%*c%d",&a,&b);printf("%d %d\\n",a,b);',['1|2','-1000/1000','0 0','7:-8'],s=>{const m=mixed(s);return`${Number(m[1])} ${Number(m[3])}\n`;},{bad:'int a=0,b=0;scanf("%d%d",&a,&b);printf("%d %d\\n",a,b);'});
add('P',23,'double x;char c;scanf("%5lf%c",&x,&c);printf("[%.2f][%c]\\n",x,c);',['123456X','+1.25x','-12345!','1e+02x'],s=>`[${fixed(Number(s.slice(0,5)),2)}][${s[5]}]\n`,{exact:true,bad:'double x;char c;scanf("%lf%c",&x,&c);printf("[%.2f][%c]\\n",x,c);'});
add('P',24,'int w,p;char s[9];scanf("%d%d%8s",&w,&p,s);printf("[%*.*s]\\n",w,p,s);',['6 3 abcdef','0 8 ab','8 0 abc','2 5 abcdefgh'],s=>{const[w,p,a]=words(s),value=a.slice(0,Number(p));return`[${value.padStart(Number(w),' ')}]\n`;},{exact:true,bad:'int w,p;char s[9];scanf("%d%d%8s",&w,&p,s);printf("[%*s]\\n",w,s);'});
add('P',25,'double x,r,s;scanf("%lf%lf%lf",&x,&r,&s);double a=x*(1+r),b=a*(1+s);printf("%.2f %.2f\\n",a,b);',['0 0.5 -0.5','1.234 0 0.4','128 -0.125 0.0625','9999 0.01 0.02'],s=>{const[x,r,t]=numbers(s),a=x*(1+r);return fixed(a,2)+' '+fixed(a*(1+t),2)+'\n';},{exact:true,bad:'double x,r,s;scanf("%lf%lf%lf",&x,&r,&s);double a=x*(1+r),b=x*(1+s);printf("%.2f %.2f\\n",a,b);'});

// Equivalence checks use real standard I/O, not a replacement scanf/printf.
equivalents[qid('B',2)]=[program('int a,b;char comma;scanf("%d%c%d",&a,&comma,&b);printf("%d %d\\n",a,b);')];
equivalents[qid('P',1)]=[program('int n;scanf("%d",&n);printf("[%+0*d]\\n",6,n);')];
equivalents[qid('P',3)]=[program('int n;scanf("%d",&n);printf("[%.*d]\\n",4,n);')];
equivalents[qid('P',9)]=[program('char a[3];fread(a,1,3,stdin);fwrite(a,1,3,stdout);')];
export const cBasicsContractIds=[...specs.keys()];
export const cBasicsReferenceSources=Object.freeze(references);
export const cBasicsWrongSources=Object.freeze(wrong);
export const cBasicsEquivalentSources=Object.freeze(equivalents);
export const cBasicsChoiceProbes=cBasicsPractice.programming.filter(q=>q.trace).map(q=>({
 id:q.id,source:q.stem.match(/```c\n([\s\S]*?)\n```/)[1],stdin:q.traceInput,expected:q.options[q.answer]
}));
export function cBasicsContract(id){return specs.get(id)?.()??null;}
