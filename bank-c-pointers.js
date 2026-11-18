import {makeQuestions} from './question-factory.js';

const choiceRows=[
 [
  "声明int *p, q;之后，p与q的类型分别是：",
  [
   "指向int的指针、int",
   "两个都是指向int的指针",
   "int、指向int的指针",
   "两个都是int"
  ],
  0,
  "*属于相应变量的声明部分，只有p前有*。若两个都要定义成指针，应写int *p, *q；不能把这一行中的*理解成自动作用于后续所有名字。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=4;\nint *p=&x;\n*p+=3;\nprintf(\"%d %d\",x,p==&x);\n```",
  [
   "7 1",
   "4 1",
   "7 0",
   "4 0"
  ],
  0,
  "p保存x的地址，*p就是被间接访问的x。写*p使x变7；这次写入没有改变p所保存的地址。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=2,y=6;\nint *p=&x,*q=p;\np=&y;\n*q=9;\nprintf(\"%d %d %d\",x,y,*p);\n```",
  [
   "9 6 6",
   "2 9 9",
   "9 9 9",
   "2 6 9"
  ],
  0,
  "q复制的是当时p保存的&x，不是对变量p建立动态链接。后来p改指向y，q仍指向x，所以*q=9只改x。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=3;\nint *p=&x,*q=&x;\n*p+=2;\n*q*=3;\nprintf(\"%d\",x);\n```",
  [
   "15",
   "9",
   "5",
   "6"
  ],
  0,
  "两个指针指向同一个x。第一条写后x为5，第二条通过q读到的也是这个新值，再乘3得15。不能把两个指针误当成两份数据副本。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=5;\nint *p=&x;\nprintf(\"%d %d\",&*p==p,*&p==p);\n```",
  [
   "1 1",
   "1 0",
   "0 1",
   "0 0"
  ],
  0,
  "&*p把间接引用和取址抵消，仍得到p的指针值；*&p先取得指针变量p本身的地址再解引用，也得到p。这里p已经有效初始化，不涉及无效引用。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint *p=NULL;\nprintf(\"%d %d\",p && *p,p==NULL);\n```",
  [
   "0 1",
   "0 0",
   "1 1",
   "发生空指针解引用"
  ],
  0,
  "p为空使逻辑与左侧为假，右侧*p不求值，因此没有空指针解引用。空指针可以比较，不能据此认为它能像普通对象地址一样读取内容。"
 ],
 [
  "下面代码的问题是什么？\n```c\nint *p;\n*p=8;\n```",
  [
   "p未指向已知有效对象，不能通过它写入",
   "*p=8会自动为一个int分配空间",
   "只需把8改成0就可以使用",
   "指针定义后默认指向最近声明的int"
  ],
  0,
  "局部指针没有初始化，声明指针变量并不会同时创建供它指向的int对象。应先令p指向一个存活且可写的对象，再通过*p写入。不能把某次偶然未崩溃当作有效。"
 ],
 [
  "函数返回局部变量地址：\n```c\nint *bad(void) {\n    int x=8;\n    return &x;\n}\n```\n调用者应怎样看待返回后的目标对象？",
  [
   "x的生存期已结束，不能通过返回地址访问它",
   "只要地址数值没有变化就仍可访问x",
   "x会因返回了地址而自动变成静态变量",
   "返回类型是指针就能延长x的生存期"
  ],
  0,
  "自动局部对象x在函数返回后结束生存期。传出其地址不会延长生存期；后来该位置看似仍有8也不构成有效对象。应使用仍存活的调用者对象或适当静态存储等设计。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[4]={6,2,9,4};\nint *p=&a[1];\np+=2;\n*p-=1;\nprintf(\"%td %d %d\",p-a,a[1],a[3]);\n```",
  [
   "3 2 3",
   "2 1 4",
   "3 1 4",
   "2 2 3"
  ],
  0,
  "指针加2按两个int元素推进，从下标1到下标3；接着减1的是下标3的值。p-a返回元素距离3，不是字节地址。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[7]={0};\nint *p=a+1,*q=a+6;\nprintf(\"%td %td\",q-p,p-q);\n```",
  [
   "5 -5",
   "20 -20",
   "6 -1",
   "1 6"
  ],
  0,
  "两指针在同一数组内，相减得到以元素为单位的有符号距离。q比p靠后5项，因此正向为5，反向为-5，不需要知道int占多少字节。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[3]={2,4,6};\nint *p=a+3;\nprintf(\"%td %d\",p-a,p>a+1);\n```",
  [
   "3 1",
   "2 1",
   "3 0",
   "不能形成p"
  ],
  0,
  "a+3是合法的尾后指针，允许与同数组中的指针比较和相减；它离首元素3项，位置也在a+1之后。能形成和比较并不代表可以读取*p。"
 ],
 [
  "有int a[3]={2,4,6}; int *p=a+3;。下列哪项会试图读取尾后位置的内容？",
  [
   "*p",
   "p==a+3",
   "p-a",
   "p-1"
  ],
  0,
  "p是尾后指针，不指向一个可读取的int元素，所以*p不能用作读取内容。比较、同数组差值以及退回到最后一项的p-1都是不同的合法操作。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[2]={3,8};\nint *p=a;\nint v=*p++;\nprintf(\"%d %d\",v,*p);\n```",
  [
   "3 8",
   "4 3",
   "8 8",
   "3 4"
  ],
  0,
  "*p++按*(p++)解释：v得到原目标a[0]的3，然后p移动到a[1]。数组数值没有被自增，后一次*p为8。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[2]={3,8};\nint *p=a;\nint v=(*p)++;\nprintf(\"%d %d %td\",v,a[0],p-a);\n```",
  [
   "3 4 0",
   "4 4 0",
   "3 3 1",
   "3 8 1"
  ],
  0,
  "括号把后缀++的对象限定成a[0]。v先得到旧值3，a[0]改为4，而p没有移动，偏移仍为0。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[2]={3,8};\nint *p=a;\nint v=*++p;\nprintf(\"%d %td\",v,p-a);\n```",
  [
   "8 1",
   "3 1",
   "4 0",
   "8 0"
  ],
  0,
  "++p先把指针移到a[1]，外层*再读取该目标8。它与先读旧目标再移动的*p++结果不同。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[2]={3,8};\nint *p=a;\nint v=++*p;\nprintf(\"%d %d %td\",v,a[0],p-a);\n```",
  [
   "4 4 0",
   "3 4 0",
   "8 3 1",
   "4 3 1"
  ],
  0,
  "++*p相当于++(*p)，先把a[0]从3增至4，再把新值4给v。没有对p做加法，它仍指向首元素。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[4]={9,2,5,7};\nint *p=a+2;\nprintf(\"%d %d\",p[-1],p[1]);\n```",
  [
   "2 7",
   "9 5",
   "5 7",
   "负下标一定越界"
  ],
  0,
  "下标运算p[k]表示*(p+k)。p指向下标2，减1到下标1，加1到下标3，二者都在同一数组中；不能只看到负号就判越界。"
 ],
 [
  "下面哪种指针相减不受C17“同一数组或其尾后位置”的规则保证？",
  [
   "a为五元素int数组时，(a+4)-(a+1)",
   "两个独立int对象x、y的地址相减：&x-&y",
   "a为五元素int数组时，(a+5)-a",
   "a为非空int数组时，a-a"
  ],
  1,
  "独立对象x、y不是同一个数组的元素，不能通过地址差推断它们之间有几个int。即使某次实现恰把它们相邻放置，也不会产生这项可移植保证。其余选项均在各自同一数组边界内。"
 ],
 [
  "已有int a[3]={0},b[3]={1,2,3};。下列哪项违反C17的类型或可赋值对象要求？",
  [
   "a=b;",
   "a[0]=b[0];",
   "int *p=b;",
   "a[1]=*(b+1);"
  ],
  0,
  "a代表整个数组对象，不能像指针变量一样通过a=b改指向或整体复制。元素可分别赋值，也可以用新的指针变量保存首元素地址；这并不使数组名成为可赋值的指针变量。"
 ],
 [
  "下面C17代码的输出为：\n```c\nint adjusted(int a[5]) {\n    return sizeof a==sizeof(int *);\n}\nint main(void) {\nint a[5]={0};\nprintf(\"%zu %d\",sizeof a/sizeof a[0],adjusted(a));\nreturn 0;\n}\n```",
  [
   "5 1",
   "1 1",
   "5 0",
   "1 0"
  ],
  0,
  "调用者处的a是五元素数组，sizeof得到整个数组的大小。函数形参int a[5]会调整为int*，所以函数内sizeof a与sizeof(int*)相等，不能用它取得实参数组长度。"
 ],
 [
  "下面C17代码的输出为：\n```c\nvoid redirect(int *p,int *q) {\n    p=q;\n    *p+=4;\n}\nint main(void) {\nint x=2,y=7;\nint *p=&x;\nredirect(p,&y);\nprintf(\"%d %d %d\",x,y,p==&x);\nreturn 0;\n}\n```",
  [
   "2 11 1",
   "6 7 1",
   "2 11 0",
   "6 11 0"
  ],
  0,
  "形参p接收调用者指针值的副本。函数把副本改成&y，再通过它修改y；调用者自己的p仍保存&x，x没有被写入。"
 ],
 [
  "已有int x=7; int *p=&x; int **pp=&p;。表达式*pp的类型和值分别对应哪项？",
  [
   "int *，值为&x",
   "int，值为7",
   "int **，值为&p",
   "int *，值为&p"
  ],
  0,
  "pp指向指针变量p，解引用一次得到的就是p保存的int*值&x；再解引用一次的**pp才是int对象x的值7。不能把指针变量的地址与它保存的地址混为一谈。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=1,y=2;\nint *p=&x,*q=&y;\nint **slots[2]={&p,&q};\n*slots[0]=*slots[1];\n**slots[0]=9;\nprintf(\"%d %d %d\",x,y,p==q);\n```",
  [
   "1 9 1",
   "9 2 0",
   "9 9 1",
   "1 2 1"
  ],
  0,
  "slots保存的是两个指针变量的地址。第一次赋值把p的值改成q保存的&y，第二次再经p访问y并写9。x保持1，p和q此时指向同一目标；不是把x的值复制给y。"
 ],
 [
  "已有int x=2,y=7; const int *p=&x;。下列哪条语句合法？",
  [
   "p=&y;",
   "*p=4;",
   "++*p;",
   "p[0]=4;"
  ],
  0,
  "const int *限制通过p修改所指int，并不把指针变量p本身设为常量，所以可以改为指向y。其余三项均试图经p写目标对象。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=4;\nint *const p=&x;\n*p+=2;\nprintf(\"%d\",x);\n```",
  [
   "6",
   "4",
   "2",
   "p带const所以*p不可修改"
  ],
  0,
  "int *const使p本身不能重新绑定，但它指向的int并未被该声明限定成只读。通过*p把x加2仍合法，得到6。"
 ],
 [
  "下面C17代码段的输出为：\n```c\ndouble x=1.5;\nvoid *v=&x;\ndouble *p=v;\n*p+=0.5;\nprintf(\"%.1f\",x);\n```",
  [
   "2.0",
   "1.5",
   "0.5",
   "C17中void *不能转回对象指针"
  ],
  0,
  "这里v最初来自double对象的地址，转回double*后仍指向同一存活对象。C允许void*与对象指针之间作这种转换；不能据此把它任意解释成不相容类型。"
 ],
 [
  "要定义一个指向“三个int组成的一维数组”的指针p，下列声明正确的是：",
  [
   "int (*p)[3];",
   "int *p[3];",
   "int **p;",
   "int p[3];"
  ],
  0,
  "括号先把*p结合起来，p是指针，目标是int[3]。int *p[3]则是三个指针元素的数组，int**指向的是一个int*对象，均不是同一种类型。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[3][2]={{1,4},{2,8},{3,12}};\nint (*p)[2]=a;\n++p;\nprintf(\"%td %d\",p-a,(*p)[1]);\n```",
  [
   "1 8",
   "2 8",
   "1 4",
   "1 2"
  ],
  0,
  "p的目标类型是包含两个int的整行，++p移到第二行。p-a以行对象为单位得到1，(*p)[1]是该行第二项8。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[2][3]={{2,4,6},{7,8,9}};\nint (*p)[3]=a;\nint *q=a[0];\nprintf(\"%d %d\",(*(p+1))[0],*(q+1));\n```",
  [
   "7 4",
   "4 4",
   "7 7",
   "4 7"
  ],
  0,
  "p+1移动一整行，读取第二行第一项7；q+1只在第一行中移动一个int，读取4。虽然起始处都对应矩阵开头，指针目标类型决定不同步长。"
 ],
 [
  "已知sizeof(int)==4。下面C17代码段的输出为：\n```c\nint a[2][4]={{0}};\nint (*p)[4]=a;\nint *q=a[0];\nprintf(\"%zu %zu\",sizeof *p,sizeof *q);\n```",
  [
   "16 4",
   "4 4",
   "16 16",
   "4 16"
  ],
  0,
  "*p是含四个int的数组对象，所以占4×4=16字节；*q是一个int，占4字节。这是在比较目标对象大小，没有指定任何固定机器地址。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[2][3]={{0}};\nint (*p)[2][3]=&a;\nprintf(\"%zu %d\",sizeof *p/sizeof(int),p+1==&a+1);\n```",
  [
   "6 1",
   "3 1",
   "6 0",
   "2 1"
  ],
  0,
  "p指向整个2×3数组，*p包含6个int。p+1和&a+1都表示整个数组对象之后的位置，而不是第二行的位置；这里只形成并比较，未解引用。"
 ],
 [
  "函数形参写成int a[][4]时，调整后的参数类型是：",
  [
   "int (*)[4]",
   "int **",
   "int *[4]",
   "int (*)[3]"
  ],
  0,
  "只有最外层数组形参调整为指针，指向的每一行仍是int[4]。int**需要指向存放int*的对象，不能直接代替连续矩阵的行指针。列数4参与类型和步长。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[3][2]={{1,4},{2,8},{3,12}};\nint (*p)[2]=a+1;\nprintf(\"%d %d\",p[-1][1],p[1][0]);\n```",
  [
   "4 3",
   "8 3",
   "4 2",
   "使用负下标必定越界"
  ],
  0,
  "p从中间一行开始。p[-1]退回第0行，列1为4；p[1]前进到第2行，列0为3，两个目标都仍在外层三行数组中。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[3][4]={{0}};\nprintf(\"%td %td\",&a[2]-&a[0],(a[1]+3)-a[1]);\n```",
  [
   "2 3",
   "8 3",
   "2 12",
   "32 12"
  ],
  0,
  "第一项的指针指向行，行差为2；第二项的两个int*都在同一行内，元素差为3。不能把一种差值再乘列数或字节数当作运算结果。"
 ],
 [
  "有int a[2][3]={{1,2,3},{4,5,6}}; int *p=a[0];。按C17每行数组的边界，下列哪项明确合法地读取第二行第一项？",
  [
   "a[1][0]",
   "p[3]",
   "*(p+4)",
   "*(p+6)"
  ],
  0,
  "a[1][0]先选择第二个行对象，再选择该行首项。p属于第一行的int数组；p+3是该行尾后位置，不能解引用。存储连续并不把每个子数组都自动改成一个更长的一维int数组。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=3,y=7,z=11;\nint *table[3]={&z,&x,&y};\n*table[1]+=*table[0];\nprintf(\"%d %d %d\",x,y,z);\n```",
  [
   "14 7 11",
   "3 18 11",
   "3 7 14",
   "11 7 3"
  ],
  0,
  "table[1]保存&x，table[0]保存&z。先取它们各自的目标值，执行x+=z后x为14；指针数组中的顺序不要求目标变量按同样顺序声明或连续存储。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[3]={1,2,3};\nint *p[2]={a,a+2};\np[0]=p[1];\n*p[0]=9;\nprintf(\"%d %d %d\",a[0],a[2],p[0]==p[1]);\n```",
  [
   "1 9 1",
   "9 3 0",
   "9 9 1",
   "1 9 0"
  ],
  0,
  "赋值改变的是第一项存的指针，令两项都指向a[2]。随后写*p[0]改变a[2]，不会把a[2]的值复制到a[0]。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint *table[3]={NULL,NULL,NULL};\nprintf(\"%zu %zu\",sizeof table/sizeof table[0],sizeof table[0]/sizeof(int *));\n```",
  [
   "3 1",
   "1 1",
   "3 3",
   "1 3"
  ],
  0,
  "table是三个指针元素的数组，整体大小除以一个表项大小为3；单个表项就是int*，与sizeof(int*)相除为1。不必假设指针固定占4字节或8字节。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint a[3]={4,6,8};\nint *p=a;\nint **pp=&p;\n(*pp)++;\n**pp=20;\nprintf(\"%td %d %d\",p-a,a[0],a[1]);\n```",
  [
   "1 4 20",
   "0 20 6",
   "1 20 6",
   "0 4 20"
  ],
  0,
  "*pp就是指针变量p，(*pp)++把p移到a[1]。**pp随后访问该新目标并改为20；pp本身没有前进到别的指针变量。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nint x=2,y=8;\nint *table[2]={&x,&y};\nint **pp=table;\n++pp;\n**pp=5;\nprintf(\"%d %d\",x,y);\n```",
  [
   "2 5",
   "5 8",
   "2 8",
   "5 5"
  ],
  0,
  "pp指向指针数组的一个表项，++pp移到第二项，*pp为&y，**pp才是y。这里前进的是表项指针，不是对x或y的值作自增。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nchar a[]=\"cat\";\nchar *p=a+1;\n*p='u';\nprintf(\"%s %s\",a,p);\n```",
  [
   "cut ut",
   "cat ut",
   "cut at",
   "cat at"
  ],
  0,
  "a是可修改字符数组，p指向其中的第二个字符。修改*p同时改变数组内容，a打印cut，从p起打印后缀ut；不是另开一份字符串。"
 ],
 [
  "C17中执行char *p=\"cat\";之后，关于p[0]='C';的判断正确的是：",
  [
   "试图修改字符串字面量，行为未定义",
   "因为p没有const，所以字面量可修改",
   "保证把所有相同字面量一同改成Cat",
   "与char a[]=\"cat\"; a[0]='C';完全相同"
  ],
  0,
  "指针声明未写const并不会使字符串字面量变成可写对象。char a[]=\"cat\"建立的是字符数组副本，可修改其元素；两种初始化得到的存储对象不同。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nchar a[]=\"sun\",b[]=\"sun\";\na[0]='r';\nprintf(\"%s %s\",a,b);\n```",
  [
   "run sun",
   "run run",
   "sun sun",
   "sun run"
  ],
  0,
  "两个字符数组是两份独立的可修改存储。初始化内容相同不代表共享字符；修改a[0]不会改b。这也避免了依赖编译器是否合并相同字面量的地址判断。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nchar s[]=\"plane\";\nchar *p=s+2;\ns[3]='\u0000';\nprintf(\"%s %zu\",p,strlen(s));\n```",
  [
   "a 3",
   "ane 5",
   "a 5",
   "ane 3"
  ],
  0,
  "插入终止符后，s的字符串部分是pla，长度3。p仍指向原下标2的a，但它之后立即就是新终止符，所以从p打印只得到a；指针没有因字符串变短而移动。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nchar s[]=\"red\";\nchar *p=s;\nwhile(*p) ++p;\nprintf(\"%td %d\",p-s,*p=='\u0000');\n```",
  [
   "3 1",
   "4 1",
   "2 0",
   "3 0"
  ],
  0,
  "循环在读到数组中保存的终止符时停下。p指向终止符本身，距离首字符3项，仍是数组内的有效元素；它不是整个四元素字符数组的尾后指针。"
 ],
 [
  "有char s[5]={'a','b','c','d','e'};，数组内没有终止符。哪一项能按给定长度安全输出这5个字符？",
  [
   "printf(\"%.5s\",s);",
   "printf(\"%s\",s);",
   "puts(s);",
   "printf(\"%zu\",strlen(s));"
  ],
  0,
  "%.5s把最多读取和输出的字符数限制为5，此时五个字符都在有效数组内，不需要继续寻找终止符。其他操作要求有可达的字符串终止符，题中并未提供。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nchar a[]=\"oak\",b[]=\"oak\";\nprintf(\"%d %d\",a==b,strcmp(a,b)==0);\n```",
  [
   "0 1",
   "1 1",
   "0 0",
   "1 0"
  ],
  0,
  "a和b是两个不同数组，各自首元素地址不同，所以a==b为0；strcmp比较的是字符内容，内容相同返回0，再与0比较为真1。不能用地址比较替代内容比较。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nconst char *name[3]={\"east\",\"west\",\"north\"};\nconst char **p=name+1;\nprintf(\"%s %c\",*p,(*p)[2]);\n```",
  [
   "west s",
   "east s",
   "west e",
   "north r"
  ],
  0,
  "p先选中name的第二个指针元素，*p是west的首地址；(*p)[2]再在该字符串内取下标2的s。两级索引分别作用于名单和字符串字符。"
 ],
 [
  "下面C17代码段的输出为：\n```c\nconst char *words[2]={\"red\",\"blue\"};\nwords[0]=words[1]+1;\nprintf(\"%s %s\",words[0],words[1]);\n```",
  [
   "lue blue",
   "red blue",
   "lue lue",
   "blue blue"
  ],
  0,
  "const限制的是通过指针写字符，不是禁止修改words中的指针表项。第一项改为指向blue的下标1，从那里输出lue，第二项仍输出完整blue。"
 ],
 [
  "下面C17代码的输出为：\n```c\nint *pick(int a[3]) {\n    return a+1;\n}\nint main(void) {\nint a[3]={2,4,6};\nint *p=pick(a);\n*p=12;\nprintf(\"%d %d\",a[1],p==a+1);\nreturn 0;\n}\n```",
  [
   "12 1",
   "4 1",
   "12 0",
   "函数返回指针就不能写回"
  ],
  0,
  "pick返回的是调用者仍存活的数组中的地址，不是函数内自动局部对象的地址。返回后通过p修改同一个a[1]，它变为12，p仍等于a+1。"
 ],
 [
  "要定义指针f，使它能够指向“接收两个int、返回int”的函数，哪项正确？",
  [
   "int (*f)(int,int);",
   "int *f(int,int);",
   "int (*f[2])(void);",
   "int **f;"
  ],
  0,
  "(*f)先表明f是一个指针，后面的(int,int)描述目标函数的参数。int *f(int,int)是返回int*的函数声明，并不是函数指针变量。"
 ],
 [
  "下面C17代码的输出为：\n```c\nint difference(int a,int b) { return a-b; }\nint add(int a,int b) { return a+b; }\nint main(void) {\nint (*f)(int,int)=difference;\nint (*g)(int,int)=f;\nf=add;\nprintf(\"%d %d\",f(7,2),g(7,2));\nreturn 0;\n}\n```",
  [
   "9 5",
   "9 9",
   "5 5",
   "5 9"
  ],
  0,
  "g复制的是difference的函数地址。后来只有f被改为add，所以f计算7+2得9，g仍计算7-2得5；不是让g始终跟随变量f。"
 ],
 [
  "下面C17代码的输出为：\n```c\nint triple(int x) { return 3*x; }\nint main(void) {\nint (*fp)(int)=triple;\nprintf(\"%d %d\",fp(4),(*fp)(4));\nreturn 0;\n}\n```",
  [
   "12 12",
   "4 12",
   "12 4",
   "两种形式不能混用"
  ],
  0,
  "fp(4)和(*fp)(4)都调用同一个已正确绑定的函数。显式写*不表示先取某个数据对象的int值，函数指针调用有自己的类型规则。"
 ],
 [
  "已声明int add(int,int); int (*f)(int,int)=add;。下列哪项不是C17允许的函数指针操作？",
  [
   "f+1",
   "f=add",
   "f==add",
   "(*f)(1,2)"
  ],
  0,
  "函数指针可以赋值、作相等比较并调用目标函数，但不能像数组元素指针那样加1走到“下一个函数”。函数的机器布局不提供这种C语言级算术。"
 ],
 [
  "有int x=0; int *p=&x;，要用scanf(\"%d\",...)把一个整数读入x，匹配该转换的实参应为：",
  [
   "p",
   "&p",
   "*p",
   "NULL"
  ],
  0,
  "%d需要指向可写int对象的int*。p已经是&x，直接传它即可；&p是int**，*p是int值，NULL不指向可写目标，均不能作为本次存储参数。"
 ]
];
const choiceMechanisms=[
 "同一声明中每个声明符分别确定指针层次",
 "间接写目标变量与指针自身保持",
 "复制指针值后独立重定向",
 "别名读写依次作用于同一对象",
 "区分目标地址与指针变量地址的两种抵消",
 "空指针短路检查不求值被保护的引用",
 "未初始化指针不自动获得目标存储",
 "返回地址不延长自动对象生存期",
 "指针步进后对新目标写入",
 "同数组内指针差的单位与方向",
 "尾后指针可形成和比较但不是数组元素",
 "尾后位置解引用与合法指针运算区分",
 "后缀自增作用于指针而非目标",
 "目标值后缀自增不移动指针",
 "指针前缀自增后再解引用",
 "目标值前缀自增的结果与对象",
 "相对指针的负下标仍可能在数组内",
 "独立对象之间不能推导指针距离",
 "数组对象不可赋值不等于数组元素不可写",
 "实参数组对象与形参数组调整后的sizeof区别",
 "形参指针重新绑定与通过新目标写回",
 "二级指针解引用一次得到一级指针值",
 "二级指针数组把指针变量与最终目标分开访问",
 "指向const对象的视图仍可重新绑定",
 "常量指针与目标只读限制方向不同",
 "void对象指针往返恢复原目标类型",
 "行指针与指针数组的声明结合",
 "行指针一步对应整行对象",
 "行目标与元素目标的加一步对照",
 "以sizeof目标对象验证行与元素的跨度",
 "指向整个二维数组的指针不同于行指针",
 "二维数组形参只调整最外层且保留列数",
 "中间行指针的相对下标与内层索引",
 "不同数组层级的合法指针差单位",
 "连续二维存储不取消子数组的指针边界",
 "指针数组按表项选择不同目标对象",
 "指针数组表项重新绑定产生目标别名",
 "指针数组对象大小与单个指针元素大小",
 "二级指针间接推进一级指针",
 "二级指针在指针数组中步进后访问目标",
 "字符数组后缀指针与原数组共享存储",
 "字符串字面量只读规则与字符数组副本区分",
 "相同初始化内容不使字符数组共享对象",
 "修改终止位置对已保存后缀指针的影响",
 "字符串终止符位置不是字符数组尾后位置",
 "有界字符串输出不强加终止符前提",
 "数组首地址相等与字符串内容相等是两种问题",
 "字符串指针数组的两级对象选择",
 "指向只读字符串的表项可重定向到后缀",
 "返回借用地址的有效性由目标对象生存期决定",
 "函数指针与返回指针函数的声明区分",
 "函数指针复制后分别绑定不同运算",
 "函数指针的两种合法调用形式",
 "函数指针不支持对象数组式步进",
 "输入函数需要目标对象地址而不是指针变量地址"
];
const choiceLevels=["basic","basic","core","basic","basic","core","core","core","basic","basic","core","core","basic","basic","core","core","core","supplement","basic","core","core","core","core","supplement","supplement","supplement","basic","core","core","core","supplement","core","core","core","supplement","basic","core","core","core","core","basic","core","basic","core","core","supplement","core","core","core","core","basic","core","core","supplement","basic"];
const nodeDefinition='系统提供typedef struct Node{int data;struct Node *next;}Node;，不要重复定义。';
const prependHeadConstraint='head所指的指针槽不能与node->next重叠；允许head指向其他独立结点的next成员。';
const tasks=[
 ['B','void addTo(int *target, int delta)','把delta加到target所指整数上。target有效，原值和delta均在[-1000000,1000000]内。',
  'void addTo(int *target, int delta) {\n    /* 空1 */ += /* 空2 */;\n}',
  '空1为*target，空2为delta。target中保存的是地址，要修改该地址对应的整数，需使用*target；只修改局部指针变量不会改变调用者的整数。','通过指针修改调用者对象'],
 ['B','int takeAndClear(int *target)','返回target所指整数的原值，并将该整数改为0。target有效，原值可为任意int。',
  'int takeAndClear(int *target) {\n    int old = /* 空1 */;\n    /* 空2 */ = 0;\n    return old;\n}',
  '空1、空2都是*target。先保存原值，再清零；若先清零再读取，返回的就不再是调用前的值。返回值与修改对象是两种不同效果。','先读后写与返回旧值'],
 ['B','void rotateObjects(int *a, int *b, int *c)','三个指针指向互不相同的有效int对象。将a、b、c对应的原值循环变成：a取原c，b取原a，c取原b。',
  'void rotateObjects(int *a, int *b, int *c) {\n    int oldA = /* 空1 */;\n    *a = *c;\n    *c = /* 空2 */;\n    *b = oldA;\n}',
  '空1为*a，空2为*b。原a先保存，原b在被覆盖前交给c，最后把原a交给b。例如(2,5,8)变为(8,2,5)；交换指针变量本身不能完成这些对象的写回。','三个不同对象的值迁移'],
 ['B','void exchangePointers(int **p, int **q)','交换p、q所指两个指针变量中保存的地址，不改变整数对象。p、q有效，可以指向同一个指针变量；*p、*q可为NULL或有效int地址。',
  'void exchangePointers(int **p, int **q) {\n    int *temporary = /* 空1 */;\n    *p = /* 空2 */;\n    *q = temporary;\n}',
  '空1为*p，空2为*q。临时变量应是int*，因为保存的是地址。p、q相同也安全：读出的地址被原样写回；不能用**p交换整数值。','二级指针修改地址值'],
 ['B','int *largerObject(int *a, int *b)','返回所指值较大的那个对象的原地址；值相等时返回a。a、b均有效，允许指向同一个对象，不修改对象。',
  'int *largerObject(int *a, int *b) {\n    if (/* 空1 */) return /* 空2 */;\n    return b;\n}',
  '空1为*a>=*b，空2为a。比较时读对象值，返回时交出地址。相等必须选a，不能返回局部临时整数的地址，也不能把较大的整数当指针返回。','区分比较值与返回身份'],
 ['B','int *matrixCell(int (*a)[4], int row, int column)','a指向一个3行4列int数组，0≤row<3、0≤column<4。返回指定单元的地址，不修改数组。',
  'int *matrixCell(int (*a)[4], int row, int column) {\n    return /* 空1 */ + /* 空2 */;\n}',
  '空1为*(a+row)，空2为column。a+row先按整行移动，解引用后得到该行元素首地址，再按int元素移动column；也可返回&a[row][column]。','行指针转换为元素指针'],
 ['B','void retarget(int **pointer, int *where)','将pointer所指指针变量改为where，不修改任何整数。pointer有效，原指针值和where均可为NULL或有效int地址。',
  'void retarget(int **pointer, int *where) {\n    /* 空1 */ = /* 空2 */;\n}',
  '空1为*pointer，空2为where。写回的是调用者的指针变量；pointer=where类型和层级均不对，只给局部形参重新赋地址也不会完成要求。','写回调用者的指针变量'],
 ['B','int advancePointer(int **cursor, int *end)','*cursor与end位于同一int数组中或其尾后，且*cursor不晚于end。若已等于end返回0且不移动；否则将*cursor推进一个元素并返回1。cursor有效，不修改数组。',
  'int advancePointer(int **cursor, int *end) {\n    if (/* 空1 */) return 0;\n    /* 空2 */;\n    return 1;\n}',
  '空1为*cursor==end，空2为++*cursor。先判断终点，再改变调用者游标；最后一个元素可推进到尾后，但不能在尾后继续加1，也不需要解引用end。','半开区间游标推进'],
 ['B','int readAdvance(const int **cursor, const int *end, int *out)','cursor与out有效且其存储互不重叠。*cursor与end位于同一int数组中或尾后，*cursor不晚于end；out独立于该数组。若已到end返回0且不改*out、游标；否则输出当前值、推进一个元素并返回1。不修改输入数组。',
  'int readAdvance(const int **cursor, const int *end, int *out) {\n    if (*cursor == end) return 0;\n    *out = /* 空1 */;\n    /* 空2 */;\n    return 1;\n}',
  '空1为**cursor，空2为++*cursor。读值要两次间接访问，移动的是*cursor。终点是允许形成但不能读取的位置，因此空检查必须在读取之前。','两级游标读取与输出参数'],
 ['B','void writePair(int *first, int *second, int value)','先给first所指对象写value，再给second所指对象写value+1。两指针有效，允许相同；相同时最终值为value+1。-1000000≤value≤1000000。',
  'void writePair(int *first, int *second, int value) {\n    /* 空1 */ = value;\n    /* 空2 */ = value + 1;\n}',
  '空1为*first，空2为*second。两指针不同时各写一个值；相同时两次写落在同一个对象，后一次覆盖前一次。这是题目明确规定的顺序，不是同时写两个不同结果。','公开别名下的按序写入'],
 ['B','void elementAddresses(int a[], int n, int *out[])','把a前n个元素的地址依次写入out[0]到out[n-1]。0≤n≤32，a有效，out独立且容量足够；不修改a。',
  'void elementAddresses(int a[], int n, int *out[]) {\n    for (int i = 0; i < n; ++i)\n        out[i] = /* 空1 */;\n}',
  '空1为a+i或&a[i]。out每一项保存的是int地址，不是a[i]的数值；a+i按元素而非字节前进。n=0时不写任何表项。','构造元素地址组成的指针表'],
 ['B','const char *textEnd(const char *s)','s指向有效的以空字符结尾的字符串，长度不超过80。返回该字符串终止符的原地址，不修改字符。',
  'const char *textEnd(const char *s) {\n    while (/* 空1 */) ++s;\n    return /* 空2 */;\n}',
  '空1为*s!=0，空2为s。退出时s正好指向终止符；不能再加1而返回尾后地址。空串的首字符就是终止符，直接返回原s。','返回终止符所在对象地址'],
 ['B','void skipInitialSpaces(const char **cursor)','cursor有效，*cursor指向有效的以空字符结尾的字符串（长度≤80）。把*cursor移过开头连续的普通空格，停在首个非空格或终止符处，不修改字符。',
  'void skipInitialSpaces(const char **cursor) {\n    while (/* 空1 */)\n        /* 空2 */;\n}',
  '空1为**cursor==\' \'，空2为++*cursor。判断的是当前字符，修改的是调用者保存的地址；字符串全为空格时应停在终止符，不能越过它继续读取。','字符串二级游标的前缀跳过'],
 ['B','int applyUnary(int value, int (*operation)(int))','operation是有效函数指针。用value调用它恰好一次，并返回它的结果。value和回调返回值均可用int表示。',
  'int applyUnary(int value, int (*operation)(int)) {\n    return /* 空1 */;\n}',
  '空1为operation(value)或(*operation)(value)。函数指针只是调用入口，具体运算由传入函数决定；不能自行猜成固定算式，也不能为检查结果多调用一次。','通过函数指针调用并传回结果'],
 ['B','void linkAfter(Node *position, Node *node)','position是无环单链中的有效结点，node是链外的独立有效结点，其原next值不作要求。把给定node插到position之后，保留其余结点的数据、身份和次序；不分配或释放结点。',
  'void linkAfter(Node *position, Node *node) {\n    node->next = /* 空1 */;\n    position->next = /* 空2 */;\n}',
  '空1为position->next，空2为node。先让node接住旧后继，再让position接node；反过来再读取position->next会让node指向自身。','给定结点插接与旧后继保护'],

 ['P','void addFrom(int *destination, const int *source)','将source所指整数加到destination所指整数。两指针有效，允许指同一对象，此时该整数变为原来的2倍。原值均在[-1000000,1000000]内，只修改destination所指对象。','',
  '通过*source读取，再将和写入*destination。两个地址相同也成立：赋值前先求出右侧和，得到原值的两倍。不要把const int*误解为该对象绝对不能经其他可写指针改变。','输入与输出允许指向同一对象'],
 ['P','int transferAmount(int *from, int *to, int amount)','两个指针指向余额，原余额和amount均在[0,1000000]内。余额不足返回0，两对象不变；否则from减amount、to加amount并返回1。允许指同一余额，此时成功转账后余额不变。','',
  '先看付款对象余额是否足够，再执行扣款和入账。同一对象作为付款和收款时应抵消；若先把两旧余额分别算好再依次覆盖同一个对象，可能错误地增加余额。','有别名的双对象状态更新'],
 ['P','void sumDifference(int *a, int *b)','a、b指向不同的有效对象，原值均在[-1000000,1000000]内。把a改为两原值之和，把b改为原a减原b的差。','',
  '保存调用前的两个值，再分别写和与差。不能先写*a，再直接用已更新的*a计算差，否则第二个结果不再来自原输入。','多输出共享原输入的快照'],
 ['P','int replaceTarget(int **slot, int *expected, int *replacement)','slot有效；*slot、expected、replacement均为NULL或有效int地址。仅当*slot与expected是相同指针值时，将*slot设为replacement并返回1；不相同时返回0且不变。不修改整数对象。','',
  '比较地址身份，不比较所指整数。即使两个不同对象都存5，也不满足指针相同。expected和replacement相同并不影响成功判定；NULL也可作为待比较、待写入的地址值。','按指针身份条件重定向'],
 ['P','int clearAndDetach(int **slot)','slot有效，*slot为NULL或有效int地址。为NULL时返回0；否则将所指整数改为0，再将*slot设为NULL并返回1。','',
  '原地址要用到清零完成之后，随后才能断开引用。若先*slot=NULL，再执行**slot=0，就会通过空指针访问；还应区分原对象与指针变量本身。','先修改目标再断开引用'],
 ['P','int *addressAt(int *base, int n, int index)','base为有效int数组的起点，0≤n≤32，其前n个元素构成当前区间。-1≤index≤n+1；0≤index≤n时返回base+index，否则返回NULL。index=n允许返回区间尾后地址，不读取数组。n=0时base仍有效。','',
  '先验证下标再形成对应地址，区间尾后的地址可返回但不能解引用。负下标及超过尾后的下标应返回NULL；不要把尾后位置和最后一个元素混同。','合法元素地址与尾后边界'],
 ['P','int positionOf(const int *base, int n, const int *pointer)','base与pointer属于同一有效int数组或其尾后，pointer保证在base到base+n之间（含两端），0≤n≤64。返回pointer相对base的元素位置，不读取数组。','',
  '同一数组内指针相减得到元素间距，而不是字节数。pointer=base+n时应返回n；只要不读取该位置，尾后指针可参与合法的距离计算。','同一数组内的指针差'],
 ['P','int *selectAddress(int *const table[], int n, int index)','table有n项，表项可为NULL或有效int地址。0≤n≤16，-1≤index≤n；合法下标0≤index<n时返回该项保存的地址，否则返回NULL。不修改表及整数对象。','',
  '应返回table[index]保存的int*，而非该表项本身的地址&table[index]。合法项也可能保存NULL，不能把数值0与下标错误混为同一种内部操作。','指针表项值与表项地址'],
 ['P','void redirectMatches(int *table[], int n, int *oldTarget, int *newTarget)','把table中所有与oldTarget相同的指针值改成newTarget，其他表项不变。0≤n≤16，所有指针值可为NULL或有效int地址。不修改所指整数。','',
  '逐项比较地址身份，命中才改地址值；重复表项要全部处理。两个对象数值相等不意味着地址相等，oldTarget与newTarget相同则自然保持原表。','批量重定向引用而非目标数据'],
 ['P','int *middleAddress(int *begin, int *end)','begin、end是同一int数组中的位置或尾后，begin不晚于end，间距不超过64。返回begin+(end-begin)/2，除法向下取整，不读取数组。空区间返回begin。','',
  '先按元素求区间长度，再移动半个长度。不能把两个机器地址直接相加求平均，也不能解引用端点后对数值求平均。','用合法距离构造区间中点'],
 ['P','const char *lastPathPart(const char *path)','path是长度不超过80的有效字符串，只含小写字母和/。返回最后一个/之后的位置；没有/返回path，以/结尾则返回终止符地址。不复制或修改字符串。','',
  '保存当前分量起点，每遇/就更新为其后一位，扫描结束返回保存的原地址。空路径返回自身，不能返回另行拼出的同内容字符串。','返回原字符串内的后缀地址'],
 ['P','int splitFirst(char *text, int separator, char **right)',"text是可写的有效字符串，长度≤80。separator为英文逗号','、英文冒号':'或普通空格' '。找到首个分隔符时将其改为空字符、*right指向其后一位并返回1；未找到返回0、*right设为NULL且text不变。除该分隔符外不改字符，right有效且独立于text。",'',
  '找到分隔符后保存后继位置，再写终止符，把一段存储分成左右两个字符串。分隔符在末尾时，右段为空串但地址有效；不能将右段指向分隔符本身。','原地截断与输出内部地址'],
 ['P','void moveOverlapping(int *destination, const int *source, int n)','两个范围均位于同一有效int数组中，范围内各有n个元素，允许任意重叠。将调用前source范围的n个值复制到destination，目标范围外的元素不变。0≤n≤32；n=0时两个指针仍为数组内或尾后合法位置。','',
  '重叠时要保住尚未读取的源值：目标在源前面可从前往后，目标在源后面需从后往前，或用临时存储/标准memmove。普通正向复制会在右移重叠时反复覆盖源。','允许重叠的复制语义'],
 ['P','void bumpTargets(int *const targets[], int n, int delta)','依次给每个表项所指整数加delta。表项均为有效int地址，可以重复；同一对象出现几次就增加几次。0≤n≤16，原值及delta均在[-1000,1000]，不改变指针表。','',
  '每个表项代表一次操作，不按不同对象去重。若同一地址出现3次、delta=2，该对象总共增加6；不能只修改表项地址或把相同数值的独立对象合并。','重复引用产生重复对象更新'],
 ['P','int equalPointerPairs(int *const pointers[], int n)','统计i<j且pointers[i]==pointers[j]的下标对个数。0≤n≤16，表项为NULL或有效int地址；两个NULL也算相同指针值。不修改任何对象。','',
  '比较的是指针值，不是解引用后的整数。三项保存同一地址会形成3对，而不是1对；NULL无需解引用，也可直接参与相等比较。','指针身份分组与组合数'],
 ['P','int visibleSpan(const char *begin, const char *end)','begin和end属于同一char数组或尾后，begin不晚于end，间距≤80。返回从begin开始、在end之前且在首个空字符之前的字符个数。区间内未必有空字符，不修改数组。','',
  '循环同时受范围终点和字符终止控制，必须先判断当前位置未到end再读取。仅依赖strlen会在没有终止符的合法区间中越界，也可能错误计算区间后的字符。','显式字符范围与终止符双重边界'],
 ['P','int readSmallInt(const char **cursor, int *out)','cursor和out有效；out目标与cursor变量及字符串存储互不重叠。*cursor指向有效字符串中某处（可为终止符）。从该处跳过普通空格后，若紧接一个数字段，则解析并写*out、将*cursor移到数字段之后，返回1；否则返回0，两输出均不变。所有连续数字段长度在1至3之间，不接受正负号，不改字符。','',
  '用局部游标先试读，确认有数字后才提交两个输出。空格之后没有数字也要回到原游标；不能把跳过空格当成部分成功。解析007得到7，游标仍须跨过全部3位。','二级字符游标与失败回滚'],
 ['P','int consumeLiteral(const char **cursor, const char *word)','*cursor和word均指向有效字符串，长度分别≤80和≤20；两字符串可共享存储。若当前位置以word开头，将*cursor移过word并返回1，否则返回0且游标不变。空word总成功且不移动；不修改字符，cursor有效。','',
  '先用局部位置比较全部字面量，完全匹配才写回调用者游标。部分字符相等后失败也不能留下已推进的位置；遇输入终止符而word未结束时应立即失败。','只在完整前缀匹配后提交游标'],
 ['P','int **findPointerSlot(int *slots[], int n, int *target)','在slots前n项中找首个与target相同的指针值，返回该表项本身的地址；没有则返回NULL。0≤n≤16，表项及target为NULL或有效int地址。不改表和整数对象。','',
  '命中i时返回&slots[i]，类型为int**；返回slots[i]会丢掉“是哪一个槽位”的信息。重复地址要选第一次，查找NULL也应正常比较。','查找并返回指针变量的地址'],
 ['P','int moveReference(int **from, int **to)','from、to指向不同的有效指针变量，二者保存NULL或有效int地址。若*to非NULL则返回0且两变量不变；否则把*from交给*to，再将*from设为NULL并返回1。不修改整数对象。','',
  '先检查接收槽是否空，再保存和移动地址。来源本来为NULL也允许成功，两个槽最终都为空。移动的是引用，不是整数值，也不释放目标对象。','指针槽之间的引用转移'],
 ['P','void prependGiven(Node **head, Node *node)',`head有效，*head为无环链的首结点或NULL；node是链外给定的独立有效结点，原next值不作要求。${prependHeadConstraint}将node变为新首结点，其余结点数据、身份和次序保持；不分配或释放结点。`,'',
  '先把原*head接到node->next，再通过*head写回新首地址。只改变局部head不能改变调用者；先覆盖*head再读旧首会丢失原链或形成自环。head若是独立anchor的next成员地址，这两步仍成立；若head就是&node->next，新首写回和新结点后继会争用同一对象，因此题目排除了这种输入。','二级指针写回给定链首'],
 ['P','Node *detachFirst(Node **head)','head有效，*head是无环链首或NULL。空链返回NULL；否则摘下首结点，将*head更新为后继，并将摘下结点next设为NULL后返回其原地址。不释放结点，其余结点数据、身份与次序不变。','',
  '保存原首，先用其后继更新链首，再把摘下结点next清空。调用者接收的是原结点本身，不能返回局部副本地址，也不能先清next再取后继。','摘取结点并分离引用'],
 ['P','int compareBy(int a, int b, int (*comparison)(int, int))','comparison为有效函数指针，恰好用(a,b)调用一次。将回调结果归一化：负数返回-1、零返回0、正数返回1。a、b及回调结果均可由int表示。','',
  '先保存一次回调结果，再按符号返回。不能假定回调只返回-1、0、1，也不能为了判断负和正而重复调用。回调规则不由a、b的普通大小关系决定。','回调返回值协议与单次调用'],
 ['P','int updateBy(int *object, int (*operation)(int))','object和operation有效。用对象原值调用operation恰好一次，将其返回值写回*object并返回新值。回调及读写结果均可用int表示。','',
  '先把原值交给回调，取得结果后再写回；不能调用两次分别用于写入和返回。回调调用时对象尚未被本函数改变，最终修改应落在原对象。','回调与对象写回的先后关系'],
 ['P','void visitObjects(int *a, int *b, void (*visit)(int *))','a、b、visit均有效。若a、b相同，只调用visit(a)一次；否则依次调用visit(a)、visit(b)，各一次。visit可修改所收对象，函数不自行作额外对象修改。','',
  '去重依据地址身份而非整数值。两个独立对象即使数值相同，也各需访问；同一对象经两个指针传入时只访问一次，避免重复副作用。','按对象身份去重回调副作用'],
 ['P','int *chooseBy(int *a, int *b, int (*preferred)(const int *, const int *))','a、b有效，可相同。preferred是只读回调，必须恰用原地址(a,b)调用一次，返回0表示选a，1表示选b。返回所选原地址，不修改对象。','',
  '把地址交给回调，再根据约定选择原指针。不能把两个值复制到局部对象后传其地址，也不能把返回编号0/1当成指针。','传递原对象身份的选择回调'],
 ['P','double replaceMatrixCell(double (*a)[3], int row, int column, double value)','a指向3行3列double数组，0≤row,column<3，所有数值有限且在[-1000,1000]内。只把指定单元改为value，并返回该单元原值。','',
  '先通过正确的行、列定位读取旧值，再写新值。a+1跨过一整行3个double，不能用int*或把列数当成字节数。其余单元应保持。','double行指针下的单元读改写'],
 ['P','int distinctTargets(const int *a, const int *b, const int *c)','三个指针均有效，允许任意相同，返回它们实际指向的不同int对象个数（1至3）。不修改对象。','',
  '用指针相等关系判断：都相同为1，只有两者相同为2，否则3。不能按所存数值去重，三个独立对象即使都存7，也仍是3个对象。','不同对象数与数值相等区分'],
 ['P','int rangeEndpoints(const int *begin, const int *end, const int **first, const int **last)','begin、end属于同一int数组或尾后，begin不晚于end，间距≤64。first、last指向不同的有效指针变量。非空时输出首元素和末元素地址并返回1；空区间时两输出都设为NULL、返回0。不读取或修改整数。','',
  '半开区间的首元素是begin，末元素是end-1；只有非空时才能形成需要的前一位置。空区间没有首末元素，按约定清空两个输出，不能把end当成末元素。','半开区间端点与多地址输出']
];

let blanks=0,programs=0;
const coding=tasks.map(([tag,signature,description,shell,model,mechanism])=>{
 const number=tag==='B'?++blanks:++programs;
 const node=tag==='B'&&number===15||tag==='P'&&[21,22].includes(number);
 const starter=shell||`${signature} {\n    /* 完成函数 */\n}`;
 const stem=(node?nodeDefinition:'')+`编写${signature}。${description}`+
  (tag==='B'?`补全下面函数，提交补全后的完整函数。\n\n\`\`\`c\n${starter}\n\`\`\``:'只提交函数，不需要main。');
 const [q]=makeQuestions('programming',8,tag==='B'?'程序填空':'编程题','C6P',[[stem,model,['按题意修改正确对象或返回正确地址','处理公开别名和合法边界','结合解析核对地址层级与调用过程']]]);
 q.id=`C6P-programming-8-${tag}-${String(number).padStart(3,'0')}`;
 const supplement=node||tag==='P'&&[17,25,26].includes(number);
 const basic=tag==='B'&&[1,2,4,7,10,12,14].includes(number)||tag==='P'&&[7,8,23,28].includes(number);
 const studyLevel=supplement?'supplement':basic?'basic':'core';
 return {...q,coding:true,signature,starter,mechanism,systemTypes:node?nodeDefinition:'',
  ...(tag==='P'&&number===21?{revision:2,submissionConstraint:prependHeadConstraint}:{}),
  studyLevel,studyWeight:{core:3,basic:2,supplement:1}[studyLevel],priority:{core:'重点',basic:'基础',supplement:'补充'}[studyLevel],
  studyEvidence:node?'简单结构仅提供类型练习引用修改，作为补充，不代替数据结构算法训练。':'当届《8 指针.pdf》8.1—8.5；C08课堂讨论的对象、步长、地址表、二级指针及回调机制；层级为编排判断。',
  source:{book:'独立编写；《程序设计导引及在线实践》1.14仅作补充参照',ppt:'当届8 指针.pdf；马虹CYY7-23实际第7章指针；C08-01/C08-02课堂讨论'}};
});
export const cPointersPractice={programming:[...makeQuestions('programming',8,'选择题','C6P',choiceRows).map((q,i)=>{
 const studyLevel=choiceLevels[i];
 return {...q,mechanism:choiceMechanisms[i],studyLevel,studyWeight:{core:3,basic:2,supplement:1}[studyLevel],
  priority:{core:'重点',basic:'基础',supplement:'补充'}[studyLevel],
  studyEvidence:'当届8 指针.pdf第8章；C08课堂讨论；按地址对象、合法步长、传参与二级指针优先，补充类型边界低权重。',
  source:{book:'独立编写',ppt:'当届8 指针.pdf；C08-01/C08-02；马虹实际指针章CYY7-23'}};
}),...coding]};
