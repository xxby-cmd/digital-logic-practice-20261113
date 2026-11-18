import {makeQuestions} from './question-factory.js';

// 选择题先冻结；文件代码题按真实运行契约分批补齐，不在此保存私有参考源。
const rows=[],mechanisms=[],examples=new Map(),evidence=[];
function add(stem,options,answer,why,mechanism,pages,level='core'){
 rows.push([stem,options,answer,why]);mechanisms.push(mechanism);evidence.push({pages,level});
}
function trace(body,files,options,answer,why,mechanism,pages,level='core',extra={}){
 const source=`#include <stdio.h>\n#include <string.h>\nint main(void){\n${body}\nreturn 0;\n}`;
 const names=Object.keys(files),descriptions=names.map(name=>{
  const contents=files[name];
  return Array.isArray(contents)?`二进制文件${name}的字节依次为${contents.length?contents.join('、'):'空（0字节）'}。`:`文件${name}的完整内容用C字符串表示为${JSON.stringify(contents)}。`;
 }).join('');
 const premise=extra.premise??'所用文件均能按代码中的方式打开，读写不发生I/O错误，定位调用成功。';
 add(`本题采用ASCII编码，一个字节为8位。${descriptions}${extra.absent?.length?`${extra.absent.join('、')}原先不存在。`:''}${premise}${extra.question??'程序输出为：'}\n\`\`\`c\n${source}\n\`\`\``,options,answer,why,mechanism,pages,level);
 examples.set(rows.length,{files,absent:extra.absent??[],kind:extra.kind??'stdout'});
}

// 一、打开方式与流的关联。
add('关于<stdio.h>中的FILE和文件指针，哪项正确？',['通过FILE *和标准I/O函数访问流，不依赖FILE的内部成员','FILE *保存的就是磁盘文件的全部内容','每个程序都必须照课件手写struct _iobuf','FILE的各成员在所有C17实现中名称和排列都相同'],0,'FILE由实现提供。程序通过标准接口使用它即可；课件展示的某版库结构不能变成各平台共同的数据布局。','FILE类型的公开接口与实现内部表示',[4,6,7],'basic');
trace('FILE *f=fopen("data.bin","wb");\nfclose(f);\nf=fopen("data.bin","rb");\nint c=fgetc(f);\nprintf("%d",c==EOF);\nfclose(f);',{'data.bin':[65,66,67]},['1','0','3','必须先写入一个字符才会清空旧内容'],0,'wb成功打开已有文件时就截去旧内容；即使随后没有写数据，重新打开后也已经是空文件。','写模式在成功打开时截断文件',[9],'basic');
add('records.txt应当已经存在。程序需要读写它、保留原内容，并在文件不存在时报告失败。应使用哪种fopen方式？',['"r+"','"w+"','"a"','"w"'],0,'r+读写已有文件，缺文件时打开失败。w和w+会截断，a只提供追加输出，不能满足读取要求。','已有文件读写与缺文件不创建',[8,9],'basic');
trace('FILE *f=fopen("data.bin","ab");\nfseek(f,0,SEEK_SET);\nfputc(90,f);\nfclose(f);\nf=fopen("data.bin","rb");\nint c;while((c=fgetc(f))!=EOF)printf("%c",c);\nfclose(f);',{'data.bin':[65,66]},['ABZ','ZB','ZAB','AB'],0,'追加方式使每次写入落在当时的文件尾。定位到开头不把这次追加变成对首字节的覆盖。','追加写入不随之前的定位改为覆盖',[9]);
trace('FILE *f=fopen("data.bin","a+b");\nrewind(f);\nint c=fgetc(f);\nfseek(f,0,SEEK_SET);\nfputc(90,f);\nrewind(f);\nchar s[8]={0};fread(s,1,7,f);\nprintf("%c %s",c,s);\nfclose(f);',{'data.bin':[65,66]},['A ABZ','A ZB','B ABZ','A ZAB'],0,'先rewind明确从头读，避免猜a+初始读取位置。之后用定位完成读写方向切换；a+的输出仍追加，最后rewind再读到ABZ。','追加更新流的读取位置与写入位置',[9,20],'supplement');
add('用"rb"打开含十进制文本"123"的文件后，哪项正确？',['rb选择二进制流，不会自动把字符123转换成整数123','fgetc会一次返回整数123','fread会自动识别十进制数字串','文件扩展名必须是.bin，否则rb打开必失败'],0,'打开方式不替程序决定数据格式。要解析十进制字符可使用匹配的格式化读取；原始字节读取不会自动完成数值转换，扩展名也不决定C流的模式。','二进制打开方式不等于自动解析数值',[5,9],'basic');
trace('FILE *p=fopen("data.bin","rb");\nFILE *q=p;\nint a=fgetc(p);int b=fgetc(q);\nprintf("%c %c",a,b);\nfclose(p);',{'data.bin':[65,66,67]},['A B','A A','B B','B C'],0,'q复制的是同一个流的指针，两次读取推进同一个文件位置；复制指针没有重新打开文件。最后关闭一次即可。','复制FILE指针共享同一流的位置',[6,7]);
trace('FILE *p=fopen("data.bin","rb");\nFILE *q=fopen("data.bin","rb");\nint a=fgetc(p);int b=fgetc(q);\nprintf("%c %c",a,b);\nfclose(p);fclose(q);',{'data.bin':[65,66,67]},['A A','A B','B B','不能有两个文件指针变量'],0,'题设保证两次打开都成功。它们建立两个流，各自从开头读取，所以第一次都读A；这不同于把同一个FILE *赋给另一个变量。','分别打开的两个流分别维护位置',[4,8]);
add('程序向文件写数据后，要确认缓冲输出在关闭时没有报告错误。哪项判断正确？',['应检查fclose的返回值，0表示关闭成功','fwrite曾返回期望项数，fclose就一定不会失败','fclose返回非零表示成功','文件指针不为NULL，就能保证全部输出成功'],0,'缓冲写入可能在刷新或关闭阶段才暴露错误。fclose成功返回0，失败返回EOF；已完成的部分写调用不能替代最后的检查。','关闭阶段仍可能报告缓冲输出失败',[10,22],'basic');
add('程序先成功打开输入流in，随后打开输出文件失败，进入错误分支。哪项处理正确？',['关闭in，并且不向失败所得的空指针调用fclose','因为out为空，所以in也不能关闭','无条件执行fclose(out)，再决定是否关闭in','把in赋为NULL就等于已经关闭输入流'],0,'输入流已成功获得，应由错误分支关闭。输出流打开失败返回空指针，不能把它传给要求有效流的fclose；改变量的值也不执行资源释放。','第二个文件打开失败时关闭已获得的流',[8,10],'basic');

// 二、以读取结果驱动字符和格式化输入。
trace('FILE *f=fopen("data.bin","rb");\nint a=fgetc(f),b=fgetc(f);\nint c=fgetc(f);\nprintf("%d %d %d",a,b,c==EOF);\nfclose(f);',{'data.bin':[0,255]},['0 255 1','0 -1 1','0 255 0','读取到0就立即结束'],0,'fgetc成功时把读到的unsigned char值转换为int，0和255都是数据。再读一次才返回EOF；用int保留读取结果，不能先窄化为char再区分。','fgetc区分全体字节值与EOF',[11,12],'basic');
trace('FILE *f=fopen("data.bin","rb");\nint a=feof(f)!=0;\nint c=fgetc(f);int b=feof(f)!=0;\nint d=fgetc(f);int e=feof(f)!=0;\nprintf("%d %c %d %d %d",a,c,b,d==EOF,e);\nfclose(f);',{'data.bin':[75]},['0 K 0 1 1','0 K 1 1 1','1 K 1 1 1','0 K 0 1 0'],0,'读到最后一个已有字节仍是成功读取，不会因此预报下一次EOF。下一次尝试越过末尾时才返回EOF并设置结束标志。','文件位置已在末尾与结束标志已置位的区别',[11,12]);
trace('FILE *f=fopen("data.bin","rb");\nint tries=0,got=0;\nwhile(!feof(f)){\n    int c=fgetc(f);tries++;\n    if(c!=EOF)got++;\n}\nprintf("%d %d",tries,got);\nfclose(f);',{'data.bin':[75]},['2 1','1 1','2 2','1 0'],0,'第一次读取K后feof仍为0，所以进入第二次，才读到EOF。tries统计尝试，got只统计成功读出的字节，不能把它们混为一谈。','预判feof导致额外一次读取尝试',[3,12,18]);
trace('FILE *f=fopen("data.bin","rb");\nint c,total=0;\nwhile((c=fgetc(f)!=EOF))total+=c;\nprintf("%d",total);\nfclose(f);',{'data.bin':[65,66]},['2','131','0','代码中的c依次为65和66'],0,'!=先于赋值完成，c得到的是“本次是否成功”的0或1。两次成功各加1，最后失败得到0退出；要保存字符，应写(c=fgetc(f))!=EOF。','读取赋值的括号位置决定保留字符还是布尔结果',[11,14]);
trace('FILE *f=fopen("out.bin","wb");\nint r=fputc(90,f);fclose(f);\nf=fopen("out.bin","rb");int c=fgetc(f);\nprintf("%d %c",r==90,c);\nfclose(f);',{},['1 Z','0 Z','90 Z','1 0'],0,'成功的fputc返回写入的字符值（按unsigned char转换），不是统一返回0或1。读取出的字节也是Z；失败时才用EOF判断。','fputc成功返回所写字符而非统一状态码',[12,13],'basic',{absent:['out.bin']});
add('一次fgetc(fp)返回EOF。要区分正常结束与读取错误，应如何检查？',['分别检查feof(fp)和ferror(fp)','只看EOF是否等于-1','只检查fp是否仍不为NULL','再成功打开另一个文件就能清除fp的错误'],0,'EOF既可能表示正常末尾，也可能表示读取错误。结束标志和错误标志分别记录原因；EOF的具体负整数值和其他文件的状态都不能代替它们。','EOF返回值需要结合流状态解释',[11,12,22],'basic');
trace('FILE *f=fopen("data.txt","r");\nint x,n=0,sum=0;\nwhile(fscanf(f,"%d",&x)==1){n++;sum+=x;}\nprintf("%d %d",n,sum);\nfclose(f);',{'data.txt':'3 7 \n'},['2 10','3 17','2 7','3 10'],0,'循环只处理成功转换出的整数。末尾空白被跳过，随后的读取失败不执行循环体，因此不会再次累加上次的7。','格式化读文件按成功转换次数控制处理',[16,18]);
trace('FILE *f=fopen("data.txt","r");\nint x=9;int a=fscanf(f,"%d",&x);\nint b=fscanf(f,"%d",&x);\nint c=fgetc(f);\nprintf("%d %d %d %c %d",a,b,x,c,feof(f)!=0);\nfclose(f);',{'data.txt':'12 x 9\n'},['1 0 12 x 0','1 1 9 9 0','1 0 0 x 1','1 0 12 9 0'],0,'第二次%d跳过空格后在x处匹配失败，返回0，x变量保持12。导致匹配失败的字母还在流中，被fgetc读走；这时没有到文件末尾。','格式匹配失败后的变量值与流中剩余字符',[16,18]);
trace('FILE *f=fopen("data.txt","r");\nchar id[4];int score=0,n=0;\nwhile(fscanf(f,"%3s%d",id,&score)==2)n++;\nprintf("%d %s %d",n,id,score);\nfclose(f);',{'data.txt':'a1 80 b2\n'},['1 b2 80','2 b2 80','1 a1 80','2 b2 0'],0,'第一条记录的两个字段完整，计数1。第二次只读到b2，缺少成绩，所以返回1、不计为完整记录；已经成功的id仍会更新，未赋值的score仍为80。','多字段文件记录只在完整转换后接收',[16,25,27]);
trace('FILE *f=fopen("data.txt","r");\nint x,sum=0,bad=0,r;\nwhile((r=fscanf(f,"%d",&x))!=EOF){\n    if(r==1)sum+=x;\n    else{fgetc(f);bad++;}\n}\nprintf("%d %d",sum,bad);\nfclose(f);',{'data.txt':'2 X 5\n'},['7 1','2 1','7 0','循环在X处永远不前进'],0,'匹配失败返回0时消耗一个非数值字符X，流才继续前进。两个有效整数2和5都被累加；只重复fscanf而不消费失败字符才会停在同一位置。','文件格式错误后的消费与继续读取',[16,18]);

// 三、行、字符串与格式化文件的边界。
add('data.txt第一行是12，第二行是34。程序用一次fscanf(fp,"%d%d",&a,&b)读取两个整数。哪项正确？',['可能跨过换行读到两个数，不能用这种格式强制一行一条记录','遇到第一个换行就必定只返回1','第二个%d会把换行字符存入b','fscanf只允许读取当前行'],0,'数值转换前会跳过空白，其中包括换行。若文件格式要求每行恰有一条记录，应先获得行边界再解析，不能把空白分隔当作行分隔。','格式化文件读取不自动维护一行一记录',[16,25]);
trace('FILE *f=fopen("out.txt","w");\nint n=fprintf(f,"[%03d]",5);fclose(f);\nf=fopen("out.txt","r");\nchar s[16]={0};fgets(s,sizeof s,f);\nprintf("%d %s",n,s);fclose(f);',{},['5 [005]','3 [005]','5 5','0 [005]'],0,'写入的是左括号、三个数字和右括号，共5个字符。fprintf的结果是格式化后写入的字符数，而不是数值位数、参数个数或文件指针。','fprintf把格式化字符写入指定流并返回字符数',[16,17],'basic',{absent:['out.txt'],premise:'所用文件均成功打开，读写不发生I/O错误；本环境支持末行不带换行符的文本文件。'});
trace('FILE *f=fopen("data.bin","rb");\nchar s[8]={0};fgets(s,sizeof s,f);\nprintf("%zu %d",strlen(s),s[2]==\'B\');\nfclose(f);',{'data.bin':[65,0,66,10]},['1 1','3 1','1 0','fgets遇到字节0就停止读取'],0,'fgets按容量、换行和输入结束停止，不把文件中的NUL当成读取终点。数组中仍有B和换行，但strlen只数到第一个NUL，因此长度为1。','fgets可读入NUL而字符串长度不代表读入字节数',[15,19],'supplement');
trace(String.raw`FILE *f=fopen("data.txt","r");
char s[4];int calls=0,lines=0;
while(fgets(s,sizeof s,f)){
    calls++;if(strchr(s,'\n'))lines++;
}
printf("%d %d",calls,lines);
fclose(f);`,{'data.txt':'abcdef\nx\n'},['4 2','2 2','3 2','4 4'],0,'每次最多取3个字符，依次得到abc、def、换行、x加换行。调用成功4次，实际换行只有2个；缓冲块数不能直接当行数。','长行分块读取时区分块数与行数',[15]);
trace('FILE *f=fopen("data.txt","r");\nchar a[8],b[8];\nfgets(a,sizeof a,f);\nchar *p=fgets(b,sizeof b,f);\nprintf("%zu %zu %d %d",strlen(a),strlen(b),p!=NULL,feof(f)!=0);\nfclose(f);',{'data.txt':'hi\nthere'},['3 5 1 1','2 5 1 1','3 5 0 1','3 6 1 0'],0,'第一段保留换行，所以长度3。最后的there虽无换行，但已经读到5个字符，fgets仍成功返回数组地址；它继续尝试时遇到末尾，也会设置结束标志。','fgets保留换行并接收无换行的最后一段',[15],'core',{premise:'所用文件成功打开，读取不发生I/O错误；本环境支持末行不带换行符的文本文件。'});
trace('FILE *f=fopen("data.txt","r");\nchar s[8]="keep";\nchar *p=fgets(s,sizeof s,f);\nprintf("%d %s",p==NULL,s);\nfclose(f);',{'data.txt':''},['1 keep','1 空字符串','0 keep','0 空字符串'],0,'在没有读到任何字符时遇到正常EOF，fgets返回NULL，并保持目标数组原有内容。不能把返回NULL一概理解成已给数组写了空串。','空文件上的fgets不改原有目标数组',[15],'basic');
trace('FILE *f=fopen("out.bin","wb");\nfputs("ab",f);fputs("cd",f);fclose(f);\nf=fopen("out.bin","rb");\nint c;while((c=fgetc(f))!=EOF)putchar(c);\nfclose(f);',{},['abcd','ab和cd各占一行','ab cd','ab和cd后面各写出一个NUL'],0,'fputs不会自动追加换行，也不会写出字符串结尾NUL。连续两次输出直接相接；这与向stdout使用puts的行为不同。','fputs不自动补换行',[15],'basic',{absent:['out.bin']});
trace('FILE *f=fopen("out.bin","wb");\nchar s[4]={\'A\',0,\'B\',0};fputs(s,f);fclose(f);\nf=fopen("out.bin","rb");\nint c,n=0;while((c=fgetc(f))!=EOF)n++;\nprintf("%d",n);fclose(f);',{},['1','2','3','4'],0,'fputs把实参当NUL结尾字符串，在第一个0前只看到A。后面的B和两个NUL都不作为这次字符串输出的内容。','字符串输出只到首个NUL而非整个数组容量',[15],'basic',{absent:['out.bin']});
add('fputs("abc",fp)已经成功。仅依据C17，可以断定它的返回值满足哪项？',['非负','必为字符c的编码','必为3','必为0'],0,'fputs成功返回非负值，失败返回EOF。成功值不保证等于末字符、长度或0，不能把某个库的实际返回值写成语言共同保证。','fputs成功值的标准保证范围',[15],'basic');
add('一个不含NUL的文本文件有很长的行，char buf[16];。若输入输出都无错误，下面循环能否完整复制其中的字符？\n```c\nwhile(fgets(buf,sizeof buf,in)!=NULL)fputs(buf,out);\n```',['能，长行分多次读取，已有换行会随字符写出','不能，超过15字符的行会被fgets丢弃余部','不能，因为fputs每次都额外补一个换行','只能复制每行前15个字符'],0,'一次未读完的长行仍留在输入流中，后续继续读取。fputs既不补换行也不写NUL，分块相接仍是原字符序列；前提不含NUL不能省略。','字符串分块复制与长行的连续性',[15,39]);

// 四、块读写的项数、范围与文件格式。
trace('FILE *f=fopen("data.bin","rb");\nunsigned char a[6]={0};\nsize_t n=fread(a,2,3,f);\nprintf("%zu %d",n,feof(f)!=0);\nfclose(f);',{'data.bin':[1,2,3,4,5]},['2 1','3 1','5 1','0 1'],0,'请求三个2字节数据项，文件只够两个完整项和一个残余字节。返回完整项数2，短读到EOF时结束标志置位；不能把返回值当总字节数，也不能读出一个完整的第三项。','fread只返回完整数据项数',[19]);
trace('FILE *f=fopen("data.bin","rb");\nunsigned char a=99;\nsize_t n=fread(&a,0,5,f);\nint e=feof(f)!=0,c=fgetc(f);\nprintf("%zu %u %d %u",n,(unsigned)a,e,(unsigned)c);\nfclose(f);',{'data.bin':[42]},['0 99 0 42','5 99 0 42','0 0 1 42','0 99 0 0'],0,'size为0时fread返回0，不读取数据，目标和流状态都不变。随后第一次真正读取仍得到42；这次返回0不能被解释成已经到EOF。','零大小块读取返回0但不消费流',[19]);
trace('FILE *f=fopen("out.bin","wb");\nunsigned char a[3][2]={{1,2},{3,4},{5,6}};\nsize_t n=fwrite(a,2,3,f);long p=ftell(f);\nprintf("%zu %ld",n,p);\nfclose(f);',{},['3 6','6 6','3 3','6 3'],0,'每项2字节，共3项，写入6字节。fwrite返回成功写入的项数3，二进制流的当前位置则推进到偏移6。','fwrite返回项数而文件位置推进总字节数',[19,21],'core',{absent:['out.bin']});
trace('FILE *f=fopen("data.bin","rb");\nunsigned char a[6];\nsize_t n=fread(a,3,2,f);int c=fgetc(f);\nprintf("%zu %u",n,(unsigned)c);\nfclose(f);',{'data.bin':[1,2,3,4,5,6,7,8]},['2 7','6 7','2 3','2 6'],0,'两个3字节项一共消耗前6字节。返回值2不是位移2，下一次读取从第7个字节开始。','块读取的单项大小与当前位置的乘积关系',[19,21]);
trace('FILE *f=fopen("data.bin","rb");\nunsigned char a[8]={0};\nsize_t n=fread(a,1,8,f);unsigned sum=0;\nfor(size_t i=0;i<n;i++)sum+=a[i];\nprintf("%zu %u",n,sum);fclose(f);',{'data.bin':[1,0,255,2]},['4 258','1 1','3 258','4 3'],0,'块读取不把NUL或255当终止标志。实际读入4个字节，再按返回的n求和为258；数组中预先补的0不是额外读出的数据。','二进制块包含NUL和高位字节仍是普通数据',[19]);
add('char buf[3]; size_t n=fread(buf,1,sizeof buf,fp);已成功读入3个普通字母。若只显示这次读取的字符，哪种做法不会依赖buf之后是否碰巧有NUL？',['用for(size_t i=0;i<n;i++)putchar((unsigned char)buf[i]);','直接printf("%s",buf);','直接fputs(buf,stdout);','把n当作buf中已有NUL的位置，直接读buf[n]'],0,'fread不追加字符串终止符，三项都可能是字母。按返回字节数逐个输出只访问有效范围；其余写法会把非字符串当字符串或访问下标3。','fread结果应按实际长度访问而非默认字符串',[15,19]);
trace('int a=314,b=0;\nFILE *f=fopen("out.bin","wb");\nfwrite(&a,sizeof a,1,f);fclose(f);\nf=fopen("out.bin","rb");\nsize_t n=fread(&b,sizeof b,1,f);\nprintf("%zu %d",n,b);fclose(f);',{},['1 314','sizeof(int) 314','1 0','不指定大小端就连同一程序也不能读回'],0,'同一实现、相同类型且文件未改动时，写出的完整int对象表示可以读回相同类型对象。这里不解读单个字节，不需要猜int宽度或字节序；这不等于文件能跨实现移植。','本实现同类型对象表示的完整往返',[5,19],'core',{absent:['out.bin']});
add('希望把记录文件交给不同C实现读取。记录含int编号和double成绩。哪种设计更可靠？',['规定每个字段的文本格式，或明确规定二进制字段宽度、编码及字节顺序','直接fwrite整个结构体即可保证各实现一致','用memcmp比较结构体后就能排除填充差异','把扩展名改为.txt就能把对象表示变成文本'],0,'直接保存结构体可能含填充，还依赖各类型表示及字节序。跨实现的文件需要先约定外部格式，而不是依赖宿主对象布局。','外部文件格式与结构体对象表示分离',[5,19],'supplement');
add('二进制复制循环中，n=fread(buf,1,sizeof buf,in)得到正数n。将这一块写到out时，哪项检查正确？',['检查fwrite(buf,1,n,out)==n，并继续检查后续读取及最终关闭状态','始终写sizeof buf字节，最后一块也一样','只要fwrite返回非零就说明n字节全写完','把fwrite的返回值与EOF比较就足够'],0,'按实际读入的n写出才能避免把末块后的旧缓冲内容带入文件。短写可能是介于0和n之间的项数，需要与请求数比较；最后还要区分输入错误并检查缓冲关闭结果。','块复制按实际读取长度并检测短写',[19,22,39]);
trace('FILE *t=fopen("text.bin","wb");\nfprintf(t,"%d",10000);long a=ftell(t);fclose(t);\nunsigned char bytes[2]={39,16};\nFILE *b=fopen("raw.bin","wb");fwrite(bytes,1,2,b);\nlong n=ftell(b);fclose(b);\nprintf("%ld %ld",a,n);',{},['5 2','2 5','sizeof(int) 2','5 sizeof(int)'],0,'第一份文件保存十进制的五个数字字符，即使用二进制方式打开也仍是格式化文字。第二份按明确给出的两字节协议写出；二者长度由外部格式决定，不用猜int占几字节。','格式化文字与明确字节协议的存储长度',[5,16,19],'core',{absent:['text.bin','raw.bin']});

// 五、文件位置和回退。
trace('FILE *f=fopen("data.bin","rb");\nfseek(f,2,SEEK_SET);int c=fgetc(f);\nprintf("%c %ld",c,ftell(f));fclose(f);',{'data.bin':[65,66,67,68,69]},['C 3','B 2','C 2','D 3'],0,'SEEK_SET的偏移从文件开头按0计数。定位到偏移2读出C，读取后文件位置已推进到3。','二进制绝对偏移与读取后的下一位置',[20,21],'basic');
trace('FILE *f=fopen("data.bin","rb");\nfgetc(f);fgetc(f);\nfseek(f,-1,SEEK_CUR);\nint c=fgetc(f);printf("%c %ld",c,ftell(f));\nfclose(f);',{'data.bin':[65,66,67,68]},['B 2','A 1','C 3','D 4'],0,'读完A和B后当前位置是2，SEEK_CUR退1到1，再读取B并推进回2。负位移相对于当前指示器，而不是相对于上次已读字符的下标。','相对当前文件位置的有符号位移',[20,21]);
trace('FILE *f=fopen("data.bin","rb");\nfseek(f,-2,SEEK_END);\nint c=fgetc(f);printf("%c",c);fclose(f);',{'data.bin':[65,66,67,68,69]},['D','C','E','B'],0,'本题明确保证所用二进制SEEK_END定位受支持并成功。文件尾在最后一个字节之后，即偏移5；退2到3，读出D。不能把文件尾当成E所在偏移4。','支持的二进制尾相对定位以末字节之后为基准',[20],'supplement',{premise:'文件成功打开且读取无错误；本环境支持本题二进制文件的SEEK_END定位，该定位调用成功。'});
add('对一般C17文本流，两次成功ftell所得值相减，能否总当作两次位置之间的字符个数？',['不能；文本流的ftell值主要用来恢复位置，不保证差值就是字符数','能，所有文本字符都恰占一个磁盘字节','能，只要把返回值强制转换成int','只有文件扩展名为.txt时能'],0,'文本流可能进行换行等表示转换，位置值可包含实现所需的信息。用于fseek恢复同一文本流位置是规定用途，随意做差不能得到共同保证的字符计数。','文本流ftell位置值不是通用字符计数',[20,21]);
add('对已打开的文本输入流，已用long mark=ftell(fp);成功保存一个非零位置。继续读取若干字符后，要按C17规定回到原保存位置，哪项合适？',['fseek(fp,mark,SEEK_SET)','fseek(fp,mark,SEEK_CUR)','fseek(fp,mark,SEEK_END)','fseek(fp,mark+1,SEEK_SET)'],0,'恢复文本流的非零位置应使用先前ftell取得的值，并以SEEK_SET定位。把该值改作相对位移或自行加1，超出了这种位置标记的保证。','文本流恢复先前保存的位置标记',[20,21]);
trace('FILE *f=fopen("data.bin","rb");\nfgetc(f);fpos_t mark;fgetpos(f,&mark);\nint a=fgetc(f);fsetpos(f,&mark);int b=fgetc(f);\nprintf("%c %c",a,b);fclose(f);',{'data.bin':[65,66,67]},['B B','B C','A B','C C'],0,'保存位置时A已被读走，标记对应下一次读B的位置。fsetpos恢复这个标记后，下一次仍从B开始；不需要猜fpos_t内部是整数还是结构体。','fgetpos与fsetpos成对恢复流位置',[20,21],'supplement');
trace('FILE *f=fopen("data.bin","rb");\nint c,a=0,b=0;\nwhile((c=fgetc(f))!=EOF)a++;\nrewind(f);int e=feof(f)!=0;\nwhile((c=fgetc(f))!=EOF)b++;\nprintf("%d %d %d",a,e,b);fclose(f);',{'data.bin':[3,4,5]},['3 0 3','3 1 0','3 0 0','3 1 3'],0,'第一次遍历设置了EOF标志。rewind把位置移回开头并清除结束、错误标志，所以第二遍能重新读取全部3字节。','两遍扫描之间rewind同时复位位置与状态',[20,22]);
trace('FILE *f=fopen("data.bin","rb");\nfgetc(f);fgetc(f);int a=feof(f)!=0;\nungetc(90,f);int b=feof(f)!=0;\nint c=fgetc(f);int d=fgetc(f);\nprintf("%d %d %c %d",a,b,c,d==EOF);\nfclose(f);',{'data.bin':[65]},['1 0 Z 1','1 1 Z 1','1 0 A 1','0 0 Z 0'],0,'第二次读取越过末尾，a为1。成功推回一个字节会清除EOF标志，随后先读推回的Z，再次尝试读原文件才遇EOF；这里不依赖EOF的具体数值。','成功ungetc清除EOF并先交还推回字符',[11,12,20],'supplement',{premise:'文件成功打开，读取无错误，ungetc成功。'});
trace('FILE *f=fopen("data.bin","rb");\nint a=fgetc(f);ungetc(90,f);\nint b=fgetc(f);rewind(f);int c=fgetc(f);\nprintf("%c %c %c",a,b,c);fclose(f);',{'data.bin':[65,66]},['A Z A','A Z Z','A A A','A B A'],0,'ungetc改变后续从流取得的字符，不把Z写回底层文件。消费Z后rewind重新从文件头读，仍得到原来的A。','推回字符不修改外部文件内容',[11,20],'supplement',{premise:'文件成功打开，读取无错误，ungetc和定位均成功。'});
trace('FILE *f=fopen("data.bin","r+b");\nint c=fgetc(f);\nfseek(f,0,SEEK_CUR);fputc(88,f);\nrewind(f);\nchar s[8]={0};fread(s,1,7,f);\nprintf("%c %s",c,s);fclose(f);',{'data.bin':[65,66,67,68]},['A AXCD','A ABCDX','A XBCD','A ABCD'],0,'读A后位置在1。零距离fseek虽不改变位置，却完成输入到输出所需的定位间隔；随后覆盖偏移1的B为X，再rewind读出AXCD。','更新流由输入转输出需定位间隔且可原位覆盖',[9,20]);

// 六、结束标志、错误标志与文件生命周期。
trace('FILE *f=fopen("data.bin","rb");\nfgetc(f);fgetc(f);\nclearerr(f);int a=feof(f)!=0;\nint c=fgetc(f);\nprintf("%d %d %d",a,c==EOF,feof(f)!=0);\nfclose(f);',{'data.bin':[65]},['0 1 1','0 0 0','1 1 1','0 0 1'],0,'clearerr清除标志，但不把位置移回开头。a先为0，紧接着仍在末尾读取，再返回EOF并重新设置结束标志。','clearerr清状态但不重新定位',[22]);
add('某流的错误标志已经置位，程序没有调用clearerr、rewind或重新打开该流。随后一次普通读取成功。关于ferror(fp)，哪项正确？',['原错误标志仍然置位，读取成功本身不保证清除它','每次成功读取都自动把错误标志清零','每次读取都把它变成读取字符的编码','只有下一次读取失败后才允许调用ferror'],0,'错误标志会保留，便于程序事后检查；普通I/O成功不自动替程序清除历史错误。需要显式清除或使用规定会清除它的操作，不能沿用“每次自动刷新错误值”的旧讲义说法。','流错误标志保留到明确清除操作',[22]);
add('流fp的EOF标志和错误标志均已置位，随后fseek(fp,0L,SEEK_SET)成功，且没有新错误。此时哪项符合C17？',['EOF标志被清除，原错误标志仍保留','两个标志都必被清除','两个标志都必保留','错误标志清除而EOF标志保留'],0,'成功fseek清除EOF并建立新位置，但它不像rewind那样还明确清除错误标志。定位成功不能当作所有状态都复位。','成功fseek与rewind对错误标志的区别',[20,22]);
add('更新流fp已成功写入若干字符。程序接下来要从当前位置尝试读取，而非回到文件头。按C17，以下哪项能提供输出到输入之间所需的间隔？',['成功调用fflush(fp)','只调用ferror(fp)','只调用feof(fp)','把FILE *复制到另一个指针变量'],0,'输出直接转输入需要fflush或文件定位操作。fflush不负责回到开头，因此这里特意要求从当前位置继续；查状态或复制指针不会刷新输出并切换方向。','更新流输出转输入的刷新要求',[9,20,22]);
trace('FILE *f=fopen("data.bin","r+b");\nint c;while((c=fgetc(f))!=EOF){}\nfputc(90,f);fclose(f);\nf=fopen("data.bin","rb");\nwhile((c=fgetc(f))!=EOF)putchar(c);fclose(f);',{'data.bin':[65,66]},['ABZ','ZB','AB','直接写出在本题必违反更新流切换规则'],0,'输入转输出通常需要定位，但本次输入已经实际遇到EOF，属于规定的例外。位置在末尾，所以写Z形成ABZ；仅仅刚读完最后字节却还没遇EOF时，不能套此例外。','更新流输入已遇EOF后的输出例外',[9,20],'supplement');
add('程序只需可移植C17行为。fp是以"r"打开的纯输入流，且尚未关闭。对于fflush(fp)，哪项正确？',['不能把它当作标准规定的“清空剩余输入”方法','一定丢弃当前行所有剩余字符','一定把位置移回文件头','一定清除EOF和错误标志'],0,'C17的fflush规定用于输出流，以及最近一次操作不是输入的更新流；纯输入流不在其规定用法内。某些系统扩展的输入刷新行为不是通用C17保证。','不能用输入流fflush扩展代替可移植读取逻辑',[9,20],'supplement');
add('p成功打开一个文件后，执行FILE *q=p; fclose(p);。随后哪项判断正确？',['不能再通过q读写或再次关闭同一流','q是另一份FILE对象，因此还能独立读取','把q与NULL比较就能使已关闭流重新有效','关闭p只释放指针变量p，不影响流'],0,'p和q原来指向同一个流，fclose已经结束该流的使用。复制指针没有复制流的生存期，不能靠仍有一个非空指针就继续访问。','流关闭使同一流的所有借用指针失效',[6,7,10]);
trace('int r=remove("data.bin");\nFILE *f=fopen("data.bin","rb");\nprintf("%d %d",r==0,f==NULL);\nif(f)fclose(f);',{'data.bin':[65]},['1 1','0 1','1 0','删除文件只是清空内容所以仍可打开'],0,'remove成功表示这个文件名对应的文件被删除，不是只把内容截为0字节。题设没有其他创建动作，再用rb打开这个名字会失败。','删除关闭的文件与仅截断内容不同',[27],'core',{premise:'data.bin没有被其他流打开，remove调用成功；其后没有程序重新创建该文件。'});
trace('int r=rename("data.bin","moved.bin");\nFILE *a=fopen("data.bin","rb");\nFILE *b=fopen("moved.bin","rb");\nint c=fgetc(b);\nprintf("%d %d %c",r==0,a==NULL,c);\nif(a)fclose(a);fclose(b);',{'data.bin':[65,66]},['1 1 A','1 0 A','1 1 B','1 1 空文件'],0,'目标名原先不存在且rename成功，原内容通过新名字访问，旧名字不再打开同一文件。改名不是创建一个空副本，也不消费文件数据。','改名保留内容并改变可用文件名',[27],'core',{absent:['moved.bin'],premise:'data.bin没有被打开，rename调用成功，新名字的打开和读取成功；没有其他程序创建文件。'});
trace('freopen("out.txt","w",stdout);\nprintf("OK");fflush(stdout);\nfprintf(stderr,"done");',{},['out.txt含OK，标准错误流输出done','标准输出窗口显示OK，out.txt为空','out.txt含OKdone，标准错误流为空','out.txt含done，标准错误流输出OK'],0,'freopen把现有stdout流重新关联到out.txt，后续printf写入该文件。stderr是另一个流，不随stdout的重定向自动改变。','重新关联stdout不改变stderr的输出目标',[28,29,37],'core',{absent:['out.txt'],kind:'redirect',question:'程序结束后，out.txt和标准错误流的内容分别是：',premise:'freopen和其后的写入、刷新均成功，标准错误流没有重定向。'});

const questions=makeQuestions('programming',11,'选择题','C6L',rows);
questions.forEach((q,i)=>{
 const item=evidence[i],example=examples.get(i+1);
 q.coding=false;q.mechanism=mechanisms[i];q.trace=Boolean(example);q.points=2;
 q.studyLevel=item.level;q.studyWeight={basic:2,core:3,supplement:1}[q.studyLevel];
 q.studyEvidence=`马虹CYY9-23.ppt实际文件章第${item.pages.join('、')}页；C11课堂讨论第2—20页提供文件读写课堂机制。课件历史章号与练习室第11章分别保留。`;
 q.source={ppt:'马虹CYY9-23.ppt（实际标题：第九章 文件）；C11课堂讨论.pdf',answer:'按C17独立推导；本批有定义短程序另做真实文件核验'};
 if(example)q.fileExample=example;
});
const tasks=[
 {tag:'B',no:1,title:'读取已有文件的首字节',level:'basic',pages:[8,11,12],mechanism:'打开失败、空文件与全体字节值的分别处理',
 description:'本题只使用文件data.bin。它可能不存在；存在时为0—4096字节的二进制文件，每个字节的值为0—255。没有标准输入。若打开失败，输出MISSING；若成功打开但文件为空，输出EMPTY；否则输出首字节的十进制值。标准输出均以一个换行结束。不要修改文件。普通读取不发生I/O错误。\n例如data.bin依次为65、0时，输出65和换行。',
 starter:String.raw`#include <stdio.h>
int main(void){
    FILE *f=fopen("data.bin","rb");
    if(____){puts("MISSING");return 0;}
    int c=____;
    if(____)puts("EMPTY");
    else printf("%d\n",c);
    fclose(f);
    return 0;
}`,
 model:'用空指针判断打开失败，成功后把fgetc结果保存在int中；只有正常读取返回EOF才输出EMPTY，0和255都作为普通字节输出，关闭有效流。'},
 {tag:'B',no:2,title:'替换输出文件的全部旧内容',level:'basic',pages:[9,10,15],mechanism:'写模式截断旧内容及最终关闭状态',
 description:'标准输入是一行0—200个可打印ASCII字符，随后恰有一个换行。只允许访问文件out.txt；它可能不存在，也可能已有0—4096字节的旧内容。把输入行的正文写成out.txt的全部内容，不把输入末尾的换行写入文件，也不保留任何旧尾部。文件容量足够。成功时标准输出OK和换行；打开、写入或关闭报告失败时输出ERROR和换行。\n例如输入hi和换行后，out.txt恰含两个字符hi，标准输出OK和换行。',
 starter:String.raw`#include <stdio.h>
#include <string.h>
int main(void){
    char line[202];
    if(!fgets(line,sizeof line,stdin))return 0;
    line[strcspn(line,"\n")]='\0';
    FILE *f=fopen("out.txt",____);
    if(!f){puts("ERROR");return 0;}
    int failed=____;
    if(____)failed=1;
    puts(failed?"ERROR":"OK");
    return 0;
}`,
 model:'选用会截断旧文件的输出方式，写入去掉末尾LF后的正文；fputs失败与fclose失败都必须保留在最终失败状态中。'},
 {tag:'P',no:25,title:'确认小容量文件的写入结果',level:'supplement',pages:[10,19,22],mechanism:'真实输出容量不足及缓冲刷新关闭结果',
 description:'标准输入为两个十进制整数N和v，0≤N≤64，0≤v≤255。只允许新建文件out.bin，其容量上限为32字节，其他资源足够。尝试向这个二进制文件保存N个值为v的字节，并关闭文件。全部写入及刷新、关闭均成功时，标准输出OK和换行，文件必须恰含N个v；任一阶段报告失败时，标准输出ERROR和换行，文件可含已成功保存的前缀，但不得超过32字节，且其中每个字节仍须为v。缓冲可能使写入错误延迟到刷新或关闭时才报告。\n例如输入3 65后，out.bin为三个字节65，标准输出OK和换行。',
 starter:'#include <stdio.h>\nint main(void){\n    /* 完成输入、文件写入和结果检查 */\n    return 0;\n}',
 model:'使用真实文件流写入目标字节；逐次输出、块写等方式均可。保存任何写入错误，检查刷新和关闭返回值，不把缓冲接收数据误当全部写盘成功。失败后不补写其他字节。'}
];
// CODE_TASK_ADDITIONS_BEGIN
tasks.push(...[
  {
    "tag": "B",
    "no": 3,
    "title": "追加一条完整日志",
    "level": "basic",
    "pages": [
      9,
      16
    ],
    "mechanism": "追加模式创建或保留文件并写记录终止符",
    "description": "只允许访问文件log.txt。标准输入为id和score，id由1—8个字母或数字组成，0≤score≤100。log.txt可能不存在、为空，或已有至多4096字节的LF结尾记录。保留全部旧字节，在文件尾追加一行id、一个空格、成绩十进制和LF；同名记录也要追加。成功输出OK和换行；打开、写入或关闭失败输出ERROR和换行，文件容量足够。",
    "starter": "#include <stdio.h>\nint main(void){char id[9];int score;scanf(\"%8s%d\",id,&score);\n FILE*f=fopen(\"log.txt\",____);if(!f){puts(\"ERROR\");return 0;}\n int bad=____;if(fclose(f)!=0)bad=1;puts(bad?\"ERROR\":\"OK\");return 0;}",
    "model": "用追加方式打开log.txt，旧内容不被截断，文件缺失时可以创建。写出一条完整的id score记录并加LF，检查写入和关闭。误用w会丢旧日志，同名也不能擅自去重。"
  },
  {
    "tag": "B",
    "no": 4,
    "title": "接收完整的双字段记录",
    "level": "core",
    "pages": [
      16,
      18
    ],
    "mechanism": "fscanf返回值等于完整字段数才计数",
    "description": "只读pairs.txt，它包含0—100组整数对，字段用ASCII空白分隔，每个数在−1000—1000；末尾还可能只有一个未配对整数。没有标准输入。统计完整整数对的数量及每对第二项之和，输出count sum和换行。残缺的最后一项不计；文件不修改，读取不发生I/O错误。",
    "starter": "#include <stdio.h>\nint main(void){FILE*f=fopen(\"pairs.txt\",\"r\");if(!f){puts(\"ERROR\");return 0;}\n int a,b,n=0;long long sum=0;while(fscanf(f,\"%d%d\",&a,&b)==____){n++;sum+=____;}\n fclose(f);printf(\"%d %lld\\n\",n,sum);return 0;}",
    "model": "只有两个字段均成功转换才接收一对，数量加1、总和加第二项。残缺尾项已经可能写入第一个变量，但还不是完整记录，不能沿用上一对的第二项。"
  },
  {
    "tag": "B",
    "no": 5,
    "title": "跨缓冲块统计文本行",
    "level": "core",
    "pages": [
      15
    ],
    "mechanism": "fgets分块与物理行的区别",
    "description": "只读lines.txt，长度0—4096个ASCII字符且无NUL。LF结束一行；最后一段非空但没有LF也算一行，空文件0行。输出总字符数和行数，以一个空格分隔并换行。缓冲区只有16个字符，不能把一次fgets成功当一行。读取正常，文件不修改。",
    "starter": "#include <stdio.h>\n#include <string.h>\nint main(void){FILE*f=fopen(\"lines.txt\",\"r\");if(!f){puts(\"ERROR\");return 0;}\n char s[16];int chars=0,lines=0,last=-1;\n while(____){size_t n=strlen(s);chars+=(int)n;for(size_t i=0;i<n;i++){if(s[i]=='\\n')lines++;last=(unsigned char)s[i];}}\n if(____)lines++;fclose(f);printf(\"%d %d\\n\",chars,lines);return 0;}",
    "model": "对每个fgets读入块逐字符计数，遇LF才计一行；结束后，非空且最后字符不是LF时再计末行。长行可能跨许多块，块数不是行数；空文件不多加1行。"
  },
  {
    "tag": "B",
    "no": 6,
    "title": "写出带固定表头的文本表",
    "level": "basic",
    "pages": [
      16,
      17
    ],
    "mechanism": "fprintf字段格式与记录分隔",
    "description": "标准输入先给n（0≤n≤50），再给n组id score；id为1—8个字母或数字，成绩0—100。只写文件report.txt：第一行是id,score，后续每行是实际id、逗号和成绩十进制，所有行以LF结束，不保留旧内容。成功输出n和换行，I/O失败输出ERROR和换行，容量足够。",
    "starter": "#include <stdio.h>\nint main(void){int n;scanf(\"%d\",&n);FILE*f=fopen(\"report.txt\",\"w\");if(!f){puts(\"ERROR\");return 0;}\n int bad=fputs(\"id,score\\n\",f)==EOF;for(int i=0;i<n;i++){char id[9];int score;scanf(\"%8s%d\",id,&score);if(____)bad=1;}\n if(fclose(f)!=0)bad=1;if(bad)puts(\"ERROR\");else printf(\"%d\\n\",n);return 0;}",
    "model": "表头只写一次，n为0时仍保留表头；逐条按id,score和LF写文件，再检查关闭。不要把表格误写到标准输出，也不能因id重复就丢掉记录。"
  },
  {
    "tag": "B",
    "no": 7,
    "title": "按块备份并登记每块长度",
    "level": "core",
    "pages": [
      19,
      22
    ],
    "mechanism": "末块短读仍写实际长度，不泄漏旧缓冲内容",
    "description": "只读data.bin（0—4096个任意字节），只写backup.bin；标准输入块长k，1≤k≤16。backup.bin须与data.bin逐字节相同。标准输出依次列出按每块至多k字节划分的各非空块实际长度，空格分隔、末尾换行，空文件仅输出换行。文件操作正常，不保留backup.bin旧尾。",
    "starter": "#include <stdio.h>\nint main(void){int k;scanf(\"%d\",&k);FILE*in=fopen(\"data.bin\",\"rb\"),*out=fopen(\"backup.bin\",\"wb\");\n if(!in||!out){if(in)fclose(in);if(out)fclose(out);puts(\"ERROR\");return 0;}\n unsigned char b[16];size_t n;int first=1,bad=0;\n while((n=____)>0){if(____){bad=1;break;}printf(\"%s%zu\",first?\"\":\" \",n);first=0;}\n if(ferror(in))bad=1;if(fclose(in)!=0)bad=1;if(fclose(out)!=0)bad=1;\n if(bad)puts(\"ERROR\");else putchar('\\n');return 0;}",
    "model": "每次至多读k字节，按实际返回n写出并登记n，直到读不到数据。末块不足k时若仍写k，会把无关缓冲内容带入备份；空输入不产生长度为0的块。"
  },
  {
    "tag": "B",
    "no": 8,
    "title": "定位一个固定长度记录",
    "level": "core",
    "pages": [
      19,
      20,
      21
    ],
    "mechanism": "二进制记录偏移与完整项读取",
    "description": "只读slots.bin，它由n个3字节记录组成，0≤n≤64。标准输入记录下标k（−1≤k≤64，下标从0开始）。若0≤k<n，输出该记录的三个无符号字节值，以空格分隔并换行；否则输出RANGE和换行。不修改文件。文件为普通可定位二进制文件，读取及所需定位成功。",
    "starter": "#include <stdio.h>\nint main(void){int k;scanf(\"%d\",&k);FILE*f=fopen(\"slots.bin\",\"rb\");if(!f){puts(\"ERROR\");return 0;}\n fseek(f,0,SEEK_END);long bytes=ftell(f);if(k<0||k>=bytes/3){puts(\"RANGE\");fclose(f);return 0;}\n unsigned char b[3];fseek(f,____,SEEK_SET);size_t n=____;fclose(f);\n if(n!=3)puts(\"ERROR\");else printf(\"%u %u %u\\n\",(unsigned)b[0],(unsigned)b[1],(unsigned)b[2]);return 0;}",
    "model": "先求完整记录数，合法下标范围是0到n−1，再定位到3k读3字节。k是记录下标，不是字节偏移；空文件及负下标应在读取前判为RANGE。"
  },
  {
    "tag": "B",
    "no": 9,
    "title": "覆盖文件中的一个字节",
    "level": "core",
    "pages": [
      9,
      20
    ],
    "mechanism": "r+b不截断，切换方向及定位写回",
    "description": "data.bin已存在，长0—4096字节，允许读写；输入位置p和字节v，−1≤p≤4096、0≤v≤255。p指向已有字节时，仅把该字节改成v、其他字节和长度不变，输出OK和换行；否则文件完全不变，输出RANGE和换行。不允许扩展文件，合法范围的I/O及定位成功。",
    "starter": "#include <stdio.h>\nint main(void){int p,v;scanf(\"%d%d\",&p,&v);FILE*f=fopen(\"data.bin\",\"r+b\");if(!f){puts(\"ERROR\");return 0;}\n fseek(f,0,SEEK_END);long n=ftell(f);if(____){fclose(f);puts(\"RANGE\");return 0;}\n int bad=fseek(f,p,SEEK_SET)!=0;if(!bad&&____)bad=1;if(fclose(f)!=0)bad=1;puts(bad?\"ERROR\":\"OK\");return 0;}",
    "model": "用不截断原文件的读写方式打开，先检查p是否指向已有字节，再定位写1字节。p等于文件长已经越界，不能因fseek允许到末尾就扩展文件；其他内容须保持。"
  },
  {
    "tag": "B",
    "no": 10,
    "title": "预览后保留首字节供后续读取",
    "level": "supplement",
    "pages": [
      11,
      19,
      20
    ],
    "mechanism": "一次字符回推和随后的块读取",
    "description": "只读data.bin（0—4096个任意字节）。先预览首字节，再让后续读取仍能从该字节开始。空文件输出EMPTY和换行；否则第一行输出首字节十进制，第二行输出文件最前至多3字节十进制值，以空格分隔并换行。文件不变，读取及一次字符推回正常。",
    "starter": "#include <stdio.h>\nint main(void){FILE*f=fopen(\"data.bin\",\"rb\");if(!f){puts(\"ERROR\");return 0;}int c=fgetc(f);\n if(c==EOF){fclose(f);puts(\"EMPTY\");return 0;}printf(\"%d\\n\",c);____;\n unsigned char b[3];size_t n=fread(b,1,3,f);for(size_t i=0;i<n;i++)printf(\"%s%u\",i?\" \":\"\",(unsigned)b[i]);putchar('\\n');fclose(f);return 0;}",
    "model": "fgetc结果保存在int中，正常EOF单独处理。预览到的有效字节通过ungetc交还，后续最多读3字节时首字节仍包含在内；不能推回EOF或把255误作EOF。"
  },
  {
    "tag": "B",
    "no": 11,
    "title": "先写长度头再重放原文件",
    "level": "core",
    "pages": [
      19,
      20
    ],
    "mechanism": "首遍统计后重新定位并原样输出",
    "description": "只读data.bin（0—4096个任意字节），只写packet.bin。生成的packet.bin依次为原文件字节数的十进制ASCII表示、一个LF、原文件全部字节，不添加其他字节。标准输出OK和换行。输入输出及重新定位成功，输出容量足够，不保留旧内容。",
    "starter": "#include <stdio.h>\nint main(void){FILE*in=fopen(\"data.bin\",\"rb\");if(!in){puts(\"ERROR\");return 0;}int c,n=0;while(fgetc(in)!=EOF)n++;____;\n FILE*out=fopen(\"packet.bin\",\"wb\");if(!out){fclose(in);puts(\"ERROR\");return 0;}int bad=fprintf(out,\"%d\\n\",n)<0;\n while((c=fgetc(in))!=EOF)if(fputc(c,out)==EOF)bad=1;fclose(in);if(fclose(out)!=0)bad=1;puts(bad?\"ERROR\":\"OK\");return 0;}",
    "model": "第一遍只统计长度，随后重新定位到开头并清除EOF状态，再写ASCII长度头和全部原字节。只清状态而不回到开头，或省略重定位，都会只生成头而缺少正文。"
  },
  {
    "tag": "B",
    "no": 12,
    "title": "检查一个完整二进制包",
    "level": "core",
    "pages": [
      19,
      22
    ],
    "mechanism": "固定字段读取、短读和多余尾字节",
    "description": "只读frame.bin，其长度0—33字节。一个合法包由一字节长度L（0—31）、L字节正文和一字节校验值组成，校验值等于正文各字节之和模256；包后不得再有字节。符合协议输出VALID和L，以一个空格分隔；否则输出INVALID。均换行，读取正常且文件不修改。",
    "starter": "#include <stdio.h>\nint main(void){FILE*f=fopen(\"frame.bin\",\"rb\");if(!f){puts(\"ERROR\");return 0;}int l=fgetc(f),valid=0;\n if(l>=0&&l<=31){unsigned char b[31];size_t n=fread(b,1,(size_t)l,f);if(____){int check=fgetc(f);unsigned sum=0;for(int i=0;i<l;i++)sum+=b[i];valid=____;}}\n fclose(f);if(valid)printf(\"VALID %d\\n\",l);else puts(\"INVALID\");return 0;}",
    "model": "先确认长度字节有效，再要求正文读满L字节，检查校验和模256，最后还要确认没有多余尾字节。L为0的包仍须有校验字节；空文件不能当合法零长包。"
  },
  {
    "tag": "B",
    "no": 13,
    "title": "主文件缺失时使用备用文件",
    "level": "core",
    "pages": [
      8,
      10,
      15
    ],
    "mechanism": "两个打开分支与有效流关闭",
    "description": "只读primary.txt和fallback.txt，两者都可能不存在。能打开primary.txt就使用它，即使它为空；否则尝试fallback.txt。存在的文件只有0—200个可打印ASCII正文字符和可选末尾LF。两者均打不开只输出MISSING和换行；否则第一行输出PRIMARY或FALLBACK，第二行输出选中文件正文再加LF（不重复原末尾LF）。文件不修改，成功打开后的读取正常。",
    "starter": "#include <stdio.h>\n#include <string.h>\nint main(void){const char*kind=\"PRIMARY\";FILE*f=fopen(\"primary.txt\",\"r\");if(!f){kind=\"FALLBACK\";f=____;}\n if(!f){puts(\"MISSING\");return 0;}char line[202]=\"\";if(fgets(line,sizeof line,f))line[strcspn(line,\"\\n\")]='\\0';fclose(f);printf(\"%s\\n%s\\n\",kind,line);return 0;}",
    "model": "是否选择备用文件取决于主文件能否打开，不取决于主文件有没有内容。空主文件仍输出PRIMARY和空正文行；只关闭实际获得的流，且去掉正文原末尾LF后再输出一次LF。"
  },
  {
    "tag": "B",
    "no": 14,
    "title": "写完并关闭后发布到新名字",
    "level": "core",
    "pages": [
      10,
      27
    ],
    "mechanism": "关闭结果检查与rename目标不存在",
    "description": "输入一行0—200个可打印ASCII字符和末尾LF。只允许写draft.txt、published.txt；draft.txt可能已有0—4096字节的旧内容，published.txt原先不存在。先使draft.txt恰为输入正文加LF，成功关闭后把它改名published.txt。成功时draft.txt不存在、published.txt含规定内容，输出OK和换行；I/O或改名失败输出ERROR和换行，容量足够。",
    "starter": "#include <stdio.h>\n#include <string.h>\nint main(void){char line[202];fgets(line,sizeof line,stdin);line[strcspn(line,\"\\n\")]='\\0';FILE*f=fopen(\"draft.txt\",\"w\");if(!f){puts(\"ERROR\");return 0;}\n int bad=fprintf(f,\"%s\\n\",line)<0;if(____)bad=1;if(!bad&&____)bad=1;puts(bad?\"ERROR\":\"OK\");return 0;}",
    "model": "以截断方式写draft.txt，保留写入失败状态并检查fclose；正常关闭后改名。只写内容却忘记改名，会留下错误文件名；不能把成功缓冲写入当作关闭一定成功。"
  },
  {
    "tag": "B",
    "no": 15,
    "title": "统计完整的双字节数据项",
    "level": "core",
    "pages": [
      19
    ],
    "mechanism": "fread单项大小2与末尾不完整项",
    "description": "只读words.bin（0—129字节）。每两个字节按高字节在前组成一个0—65535的值，最后孤立的一个字节不组成数据项。输出完整数据项个数及这些值的和，以空格分隔并换行。读取正常，文件不修改。和用至少32位的无符号类型保存。",
    "starter": "#include <stdio.h>\nint main(void){FILE*f=fopen(\"words.bin\",\"rb\");if(!f){puts(\"ERROR\");return 0;}unsigned char b[2];unsigned long sum=0;int n=0;\n while(____){sum+=(unsigned long)b[0]*256+b[1];n++;}fclose(f);printf(\"%d %lu\\n\",n,sum);return 0;}",
    "model": "每次把2字节作为一个完整项，只有返回1时才累加。值为高字节乘256加低字节，孤立尾字节不能计入。返回值不是字节数，颠倒高低字节也会改变结果。"
  },
  {
    "tag": "P",
    "no": 1,
    "title": "汇总无预先计数的整数文件",
    "level": "basic",
    "pages": [
      16,
      18
    ],
    "mechanism": "文件EOF驱动的流式统计",
    "description": "只读numbers.txt。文件含0—1000个−1000—1000的十进制整数，ASCII空白分隔，无错误字段，没有标准输入。没有整数时输出EMPTY；否则输出个数、总和、最小值、最大值，空格分隔并换行。总和使用long long或足够宽的等价类型，文件不修改。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "以成功读取整数为循环条件；第一项初始化最小值和最大值，总和用足够宽类型。空文件单独输出EMPTY。把极值都初始化为0，会在全正数或全负数文件上错。"
  },
  {
    "tag": "P",
    "no": 2,
    "title": "把合格记录写入报告",
    "level": "core",
    "pages": [
      16,
      17,
      25
    ],
    "mechanism": "逐条解析、筛选与独立输出文件",
    "description": "只读scores.txt，只写passed.txt。输入文件有0—100行，每行为id和score：id为1—8个字母或数字，0≤score≤100，每行LF结尾。标准输入阈值t（0≤t≤100）。把score≥t的全部记录按原出现顺序写入passed.txt，同id记录也各自保留；每行id、一个空格、成绩十进制、LF。标准输出写出记录数和换行，不保留输出文件旧内容。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "逐条解析，成绩达到阈值就按原顺序输出，比较应含等号。重复id不表示重复记录，不能擅自合并；没有合格记录也应生成空输出文件并报告0。"
  },
  {
    "tag": "P",
    "no": 3,
    "title": "给日志的每一行编号",
    "level": "core",
    "pages": [
      15,
      23,
      39
    ],
    "mechanism": "文件行首状态和不完整最后一行",
    "description": "只读log.txt，只写numbered.txt。输入为0—4096个无NUL的ASCII字符，LF分行，非空末段无LF也算一行。给各行前加从1开始的十进制行号和一个冒号，原行字符及有无末尾LF保持不变；空文件输出文件为空。标准输出行数和换行，容量足够。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "在文件开头及LF之后的下一实际字符前写行号和冒号。空行也有行号；末尾LF后若没有字符，不能再造一行。最后一行原来无LF时，输出也不补LF。"
  },
  {
    "tag": "P",
    "no": 4,
    "title": "截取指定行范围",
    "level": "core",
    "pages": [
      15
    ],
    "mechanism": "按文本行边界输出完整原字符",
    "description": "只读lines.txt，只写selected.txt。文件长0—4096，无NUL，ASCII及LF分行，非空末段无LF也算一行。输入1≤first≤last≤1000，行号从1起。只把这个闭区间内存在的行写出，原字符及LF保持不变；范围超出时不虚造行。标准输出实际选中行数和换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "跟踪从1开始的行号，闭区间first到last都包括；只写实际存在的行，并保持原LF。不能把区间末端当成开区间，也不能遗漏没有LF的最后一行。"
  },
  {
    "tag": "P",
    "no": 5,
    "title": "合并两个文本片段",
    "level": "core",
    "pages": [
      11,
      15,
      20
    ],
    "mechanism": "空文件与末尾LF决定连接边界",
    "description": "只读left.txt、right.txt，只写joined.txt。两输入各0—2048个无NUL的ASCII字符，末尾可无LF。依次连接两者；仅当两者都非空且left.txt末尾不是LF时，在中间补一个LF。其他字符（包括right.txt开头已有空行）均保留。标准输出OK和换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "先判两边是否非空，只有两边非空且左侧末尾不是LF时补1个LF，再接右侧原字符。右侧为空时不能多补换行，左侧已有LF也不能再补；右侧开头空行照常保留。"
  },
  {
    "tag": "P",
    "no": 6,
    "title": "查找两个字节文件第一次差异",
    "level": "core",
    "pages": [
      11,
      12,
      19
    ],
    "mechanism": "独立流的联合终止和长度差异",
    "description": "只读a.bin、b.bin，各0—4096个任意字节。相同则输出EQUAL和换行；否则输出DIFF、从0开始的首差异位置、两边在该位置的十进制字节值，以空格分隔并换行。某边在该位置已结束则用END代替字节值。不修改文件。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "同步比较两个输入流，第一次字节不同或只有一边结束时停止。两边同时结束才相同；较短文件的末尾不是某个数值字节，要用END与另一边的实际字节区分。"
  },
  {
    "tag": "P",
    "no": 7,
    "title": "把三种换行统一为LF",
    "level": "core",
    "pages": [
      5,
      11,
      19
    ],
    "mechanism": "二进制读取避免系统文本转换干扰",
    "description": "只读source.bin，只写normalized.bin。输入0—4096个任意字节，CR为13、LF为10。每个CRLF变为一个LF，单独的CR也变LF，已有单独LF保留，其余字节原样复制。按字节处理，不能让文本模式的宿主转换改变规则。标准输出OK和换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "遇CR先输出LF；若紧接LF还要消费它，避免输出两次。单独CR同样转换，普通LF与NUL、高位字节保留。使用二进制读写，避免宿主先替换换行。"
  },
  {
    "tag": "P",
    "no": 8,
    "title": "导出定宽十六进制字节清单",
    "level": "core",
    "pages": [
      5,
      16,
      19
    ],
    "mechanism": "原始字节与可读文本外部格式",
    "description": "只读data.bin（0—1024个任意字节），只写dump.txt。每个字节输出为两位大写十六进制数字，每16个字节一行；同行相邻字节之间恰一个空格，无尾空格，每非空行以LF结束。空输入生成空文件。标准输出原字节数和换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "每个字节输出两位大写十六进制，不足两位补0。每16项或文件末项后结束该行，其余仅在相邻项之间加空格；空文件不输出空行或表头。"
  },
  {
    "tag": "P",
    "no": 9,
    "title": "生成文本行的二进制偏移目录",
    "level": "supplement",
    "pages": [
      19,
      20,
      21
    ],
    "mechanism": "明确编码的位置索引，不保存宿主long表示",
    "description": "只读data.txt，只写index.bin。按二进制字节读取输入，它长0—4096、无NUL，ASCII及LF分行；非空末段无LF也算一行，末尾LF后不再多算空行。index.bin先写2字节行数，再逐行写行首字节的2字节偏移，所有2字节值均高字节在前；首字节偏移0。标准输出行数和换行，不直接保存宿主整数表示。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "非空文件首行偏移为0，只有LF后还存在字节才新增行首。行数与偏移按明确的高字节、低字节编码，不直接fwrite宿主整数；空文件仍有两字节零行数头。"
  },
  {
    "tag": "P",
    "no": 10,
    "title": "复制一个合法字节区间",
    "level": "core",
    "pages": [
      19,
      20,
      21
    ],
    "mechanism": "显式范围校验与二进制定位",
    "description": "只读source.bin（0—4096个任意字节），只写part.bin。输入offset和length，均为0—8192。若offset≤文件长且length≤文件长−offset，输出文件恰为从offset开始的length个字节，标准输出OK；否则输出文件为空，标准输出RANGE。标准输出换行，零长度区间可以在文件末尾。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "先验证offset不超过文件长，再验证length不超过剩余长度。零长区间允许从文件末尾开始；无效范围应生成空输出，不能先写出合法前缀再报告RANGE。"
  },
  {
    "tag": "P",
    "no": 11,
    "title": "原位更新第一个匹配的固定记录",
    "level": "core",
    "pages": [
      9,
      19,
      20
    ],
    "mechanism": "定位覆盖字段，保留长度和其他记录",
    "description": "records.bin允许读写，含0—64个3字节记录，每条是1字节id和高字节在前的2字节value。输入id（0—255）与新value（0—65535）。只改第一个id相同记录的value，其余字节及文件长度保持；有匹配输出UPDATED，无匹配输出NOTFOUND，均换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "找到首个id匹配后立即确定目标，仅在记录起点后1字节处写两字节的新value。要按高字节在前编码，并保持id、后续同id记录及全部其他字节；无匹配不能改首记录。"
  },
  {
    "tag": "P",
    "no": 12,
    "title": "只把新名字追加到名单",
    "level": "core",
    "pages": [
      9,
      15,
      16
    ],
    "mechanism": "先检查后追加且不改原有字节",
    "description": "names.txt允许读写，原先存在且含0—100行，每行1—12个小写英文字母和LF，允许重复。输入同范围的一个名字。若任一旧行与它完全相同，文件全部不变、输出EXISTS；否则仅在尾部加新名字和LF、输出ADDED。标准输出换行，前缀相同不算同名。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "逐条按完整名字比较，不能用前缀相等代替全等。任意一条相同就保持原字节；只有完全没有匹配时追加一行，不能重写或去重原有名单。"
  },
  {
    "tag": "P",
    "no": 13,
    "title": "用临时文件替换指定文本行",
    "level": "core",
    "pages": [
      25,
      27
    ],
    "mechanism": "可变长度内容需要顺序重写而非原位硬覆盖",
    "description": "notes.txt允许读写，长度0—4096，无NUL，ASCII及LF分行，非空末段无LF也算一行；另可使用原先不存在的temp.txt。输入目标行号k（1—1000），换行，再输入0—100个可打印ASCII新正文及LF。若第k行存在，仅替换其正文并沿用这一行原有的LF有无，其他字节保持，输出UPDATED；否则notes.txt完全不变，输出NOTFOUND。均换行，结束时temp.txt不存在。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "定位目标行正文及其LF有无，拼接前缀、新正文、原终止符和后缀。新正文长度可变，直接原位覆盖会残留旧尾或破坏后行；行号不存在时文件完全不改。"
  },
  {
    "tag": "P",
    "no": 14,
    "title": "归并两个按时间有序的记录文件",
    "level": "core",
    "pages": [
      16,
      25,
      27
    ],
    "mechanism": "两个输入流独立到EOF与相同键稳定规则",
    "description": "只读early.txt、later.txt，只写merged.txt。两输入各0—100行，每行time label，以空格分隔、LF结尾；time0—1000且在各自文件内非递减，label为1—8字母。同时间时，early.txt的记录全部先于later.txt，各源内部顺序保持。输出按time非递减的全部记录，每行time、一个空格、label、LF；标准输出总记录数和换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "比较两边当前记录，时间相同先选early，再只推进被选中的流；一边结束后写完另一边。相同键还须保留各源内部顺序，比较时漏等号会颠倒两源的并列顺序。"
  },
  {
    "tag": "P",
    "no": 15,
    "title": "为等长数据文件逐项配对",
    "level": "core",
    "pages": [
      16,
      18,
      20
    ],
    "mechanism": "联合输入的完整性与失败输出约定",
    "description": "只读x.txt、y.txt，只写pairs.txt。两输入各0—100个−1000—1000整数，以空白分隔且无错误字段。长度相同时，每行依次写x_i、一个空格、y_i和LF，标准输出OK及配对数；长度不同时pairs.txt为空，标准输出LENGTH。标准输出均换行，空文件与空文件等长。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "先确认两个流都能配满所有项，再形成结果；长度不等时输出文件必须为空，不能保留已配好的前缀。两个空文件是合法等长情况，输出OK 0。"
  },
  {
    "tag": "P",
    "no": 16,
    "title": "报告数值文件停止读取的原因",
    "level": "core",
    "pages": [
      16,
      18,
      22
    ],
    "mechanism": "匹配失败与正常EOF必须分开",
    "description": "只读mixed.txt。文件含0—100个空白分隔的token，各为−1000—1000的十进制整数或单个大写字母。只累计首个非整数token之前的整数。全部读完则输出count sum END；遇字母则输出count sum INVALID和该字母，字段空格分隔并换行。文件不修改，不把匹配失败当正常EOF。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "fscanf成功为1，正常结束为EOF，遇字母为0；第三种不能当END。只报告首个字母之前的累计值，保留并读出导致失败的字母，后面的数字不能继续累计。"
  },
  {
    "tag": "P",
    "no": 17,
    "title": "按首个零字节分成两个文件",
    "level": "core",
    "pages": [
      11,
      19
    ],
    "mechanism": "NUL按协议为分隔符，EOF仍独立判断",
    "description": "只读source.bin（0—4096个任意字节），只写left.bin、right.bin。有字节0时，以首个0为分界：left.bin为其前字节，right.bin为其后字节，分界0本身不写，后续0仍保留；输出SPLIT和分界偏移。无0时left.bin为全文件、right.bin为空，输出NONE。标准输出均换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "只找第一个值为0的字节，去掉该分界，其他所有字节按原顺序分别写两边。0在这里由协议指定为分隔符，不是C的EOF；后续0仍是右侧普通数据。"
  },
  {
    "tag": "P",
    "no": 18,
    "title": "展开按双字节描述的短游程",
    "level": "core",
    "pages": [
      19,
      22
    ],
    "mechanism": "完整记录检查与输出长度上界",
    "description": "只读runs.bin，只写expanded.bin。输入0—128个任意字节，每完整的两个字节为count和value，合法记录的count为1—15，value为0—255。合法时依次把value重复count次，输出文件为展开字节（至多960字节），标准输出OK及展开长度；长度为奇数，或任一count不在1—15内（含0及16—255）时，输出文件为空，标准输出INVALID。标准输出均换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "先检查长度是否为偶数、每个count是否在1—15，再展开；格式错误必须留下空输出。value为0或255都可重复输出，count为0是错误，不能当结束标志。"
  },
  {
    "tag": "P",
    "no": 19,
    "title": "倒序读取固定长度记录",
    "level": "core",
    "pages": [
      19,
      20,
      21
    ],
    "mechanism": "随机定位改变记录次序但不反转记录内部字节",
    "description": "只读records.bin，只写reversed.bin。输入含0—64个4字节记录。输出的记录次序反转，每条内部4字节的原次序保留；标准输出记录数和换行。允许任何等价正确实现，不要求特定算法。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "按4字节划分记录，倒置记录次序但每条内部保持。可定位读取或在足够缓冲中重排；逐字节把整个文件反转，会把每条记录内部也颠倒。"
  },
  {
    "tag": "P",
    "no": 20,
    "title": "交换文件中两个固定槽位",
    "level": "core",
    "pages": [
      9,
      19,
      20
    ],
    "mechanism": "读出两个旧块后定位写回与同槽别名",
    "description": "slots.bin允许读写，含0—64个8字节槽。输入下标i、j，均为−1—64。两下标均有效时交换两个完整旧槽，同一下标时不改；其他字节及文件长度保持，输出OK。任一下标无效则全部不改，输出RANGE。均换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "先验证两个下标，再保留两个旧槽进行交换；同下标无需改动。若先覆盖第一槽又从它读回第二槽，会使两个槽都变成同一旧值；失败范围必须在任何写入前处理。"
  },
  {
    "tag": "P",
    "no": 21,
    "title": "输出文件最后若干行",
    "level": "core",
    "pages": [
      15,
      20,
      21
    ],
    "mechanism": "末行有无LF与从文件重新扫描的边界",
    "description": "只读log.txt（0—4096个无NUL ASCII字节），LF分行，非空末段无LF也算一行；输入n（0—50）。标准输出恰为最后至多n行的原字节，不添加标题、空格或LF。n=0或空文件时不输出任何字符。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "按实际行边界选最后至多n行，保持所选原字节。无LF末行仍算一行，末尾LF不额外制造一行；n为0直接无输出，不能顺手补一个换行。"
  },
  {
    "tag": "P",
    "no": 22,
    "title": "回填字节文件的记录数头",
    "level": "core",
    "pages": [
      19,
      20
    ],
    "mechanism": "先预留头部再定位写回明确外部编码",
    "description": "只写packet.bin。标准输入为0—1024个0—255的十进制字节值，以空白分隔且全合法。输出文件先保存总数n的2字节表示（高字节在前），随后为n个输入字节。标准输出n和换行，不直接保存宿主整数表示。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "用两字节预留计数头，写完字节后把总数按高、低字节回填；或采用等价缓冲实现。总数可能大于255，不能只写一字节，也不能因使用追加方式而把头写到末尾。"
  },
  {
    "tag": "P",
    "no": 23,
    "title": "按目录表查询另一个文件的片段",
    "level": "supplement",
    "pages": [
      19,
      20,
      21
    ],
    "mechanism": "在两个文件的不同坐标空间定位",
    "description": "只读index.bin、data.bin，只写selected.bin。目录含0—64个4字节项[offset_hi,offset_lo,length_hi,length_lo]，各2字节值高字节在前；data.bin长0—4096，所有目录区间均有效，允许重复、交叠及零长。输入目录下标k（−1—64）。有效时输出所指data.bin区间，标准输出OK及长度；否则selected.bin为空，标准输出RANGE。标准输出均换行。 除明确的文件格式/范围失败外，所需文件打开、读写及普通二进制定位正常，输出容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "先按4k找到目录项，再解码其中的数据偏移和长度，到data.bin相应区间取字节。目录中的坐标与数据坐标不同；零长区间可在数据末尾，下标越界应生成空输出。"
  },
  {
    "tag": "P",
    "no": 24,
    "title": "保留旧内容备份后更新源文件",
    "level": "core",
    "pages": [
      9,
      10,
      19
    ],
    "mechanism": "打开写模式的先后顺序决定备份所见内容",
    "description": "source.bin原先存在，0—4096个任意字节；backup.bin可存在，两者允许读写。输入一行0—200个可打印ASCII正文及LF。结束后backup.bin须恰为source.bin原先内容，source.bin恰为新正文（不含输入LF，不保留旧尾）。标准输出OK和换行。正常文件操作均成功，容量足够。",
    "starter": "#include <stdio.h>\nint main(void){\n    /* 完成题目要求 */\n    return 0;\n}",
    "model": "必须在源内容被截断前保存全部旧字节，再分别写备份与新正文。旧备份更长时要去掉它的旧尾；若拿新正文当备份或先截断源再读取，就失去了原内容。"
  }
]);
// CODE_TASK_ADDITIONS_END
tasks.sort((a,b)=>a.tag===b.tag?a.no-b.no:a.tag==='B'?-1:1);
for(const task of tasks){
 const section=task.tag==='B'?'程序填空':'编程题';
 const stem=`${task.description}${task.tag==='B'?`\n补全下面程序，提交完整程序（含main）：\n\`\`\`c\n${task.starter}\n\`\`\``:'\n提交完整C17程序（含main）。'}`;
 const q=makeQuestions('programming',11,section,'C6L',[[stem,task.model,[task.mechanism,'真实文件结果与标准输出','合法边界及错误状态']]])[0];
 q.id=`C6L-programming-11-${task.tag}-${String(task.no).padStart(3,'0')}`;
 q.coding=true;q.submissionKind='program';q.codeStarter=task.starter;q.mechanism=task.mechanism;
 q.submissionInstruction='提交完整C17程序（含main），可使用常用C17标准头文件。文件名、文件内容范围及标准输出约定见题目；文件名按题面填写，无须添加目录。';
 q.studyLevel=task.level;q.studyWeight={basic:2,core:3,supplement:1}[task.level];q.points=task.tag==='B'?5:10;
 q.studyEvidence=`马虹CYY9实际文件章第${task.pages.join('、')}页；C11课堂讨论文件打开、读写和关闭机制；错误与返回值按C17纠正。`;
 q.source={ppt:'马虹CYY9-23.ppt实际文件章；C11课堂讨论.pdf',answer:'独立任务规格；私有C17参考和JS期望以真实FILE核验'};
 questions.push(q);
}
export const cFilesPractice={programming:questions};
