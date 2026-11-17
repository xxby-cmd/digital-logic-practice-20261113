import {makeQuestions} from './question-factory.js';

export const cRecordsTypes={
 Student:'typedef struct { int id; char name[16]; int score; } Student;',
 Stock:'typedef struct { int code; int quantity; int price; } Stock;',
 Date:'typedef struct { int year; int month; int day; } Date;',
 Booking:'typedef struct { int code; int available; int reserved; } Booking;',
 Line:'typedef struct { int code; int units; int unitCents; int waived; } Line;',
 Node:'typedef struct Node { int id; int score; struct Node *next; } Node;'
};
cRecordsTypes.Person=cRecordsTypes.Date+'\ntypedef struct { int id; char name[16]; Date birth; } Person;';
cRecordsTypes.Package=cRecordsTypes.Date+'\ntypedef struct { int id; Date expiry; int count; } Package;';
const domains={
 Student:'输入Student的id在[-1000000,1000000]，score在0至100，name为长度至多15的小写字母串（可为空），以空字符结束。',
 Stock:'输入Stock的code在[-1000000,1000000]，quantity和price均在0至1000000。price单位为分。',
 Date:'输入Date均为有效公历日期，year在1至9999。',
 Booking:'输入Booking的code在[-1000000,1000000]，available和reserved均在0至1000000。',
 Line:'Line的code在[-1000000,1000000]，units在0至1000，unitCents在0至1000000，waived为0或1。',
 Person:'Person的id在[-1000000,1000000]，name为至多15个小写字母的空字符结尾串，可为空；birth为year在1至9999的有效公历日期。',
 Package:'Package的id在[-1000000,1000000]，count在0至1000000，expiry为year在1至9999的有效公历日期。',
 Node:'Node链表无头结点、有限无环且至多8个结点；id在[-1000000,1000000]，score在0至100。结点由调用者持有，不分配或释放结点。'
};
const S=[],traceRows=new Set(),mechanisms=[];
function add(stem,options,answer,why,mechanism){S.push([stem,options,answer,why]);mechanisms.push(mechanism);}
function trace(defs,body,options,answer,why,mechanism,helpers='',context=''){
 const code=`${defs}\n${helpers}\nint main(void){\n${body}\nreturn 0;\n}`;
 add(`${context}下面C17程序输出为：\n\`\`\`c\n${code}\n\`\`\``,options,answer,why,mechanism);traceRows.add(S.length);
}
add('只写struct Item { int id; int count; };之后，下列判断正确的是：',['定义了一个结构体类型，尚未定义该类型的对象','自动创建了名为Item的全局对象','id和count成为两个全局变量','必须立即分配一个结构体数组'],0,'大括号说明成员组成，分号结束类型定义；这里没有对象声明符。之后可用struct Item x;定义对象，成员不是独立的全局变量。','类型定义与对象定义分开');
add('一条商品记录需要整数编号、名称字符数组和整数库存。选择结构体而非单个int数组的主要理由是：',['把同一商品的不同字段组成一条记录','结构体所有成员必须是同一类型','结构体不能包含字符数组','结构体总比相同字段的数组少占字节'],0,'结构体组织的是同一对象的多个字段，允许不同类型。是否省内存取决于实际表示和对齐，不能据定义就下结论。','记录的异类字段关系');
add('有typedef struct { int id; } Item;。下面哪项合法定义一个Item对象？',['Item x={3};','struct Item x={3};','Item.id=3;','typedef Item=3;'],0,'这里Item是typedef创建的类型别名，结构体本身没有名为Item的标签。struct Item属于另一种标签写法，不能混作同一个类型。','typedef别名与结构体标签');
add('在C17中，关于函数内部自动存储期的结构体变量初始化，正确的是：',['可以在定义时用初始化列表初始化','只能全局或static结构体才能初始化','只要含数组成员就不能初始化','必须先malloc才能初始化'],0,'自动结构体对象也可以在定义时初始化。旧示例中“仅静态或全局可初始化”的限制不适用于C17，不应因此把正常局部初始化判错。','自动结构体初始化合法性');
trace('struct R {int a,b;};','struct R x={5};\nprintf("%d %d",x.a,x.b);',['5 0','5 5','0 0','b未初始化所以不能输出'],0,'部分聚合初始化会把未显式提供的成员初始化为相应零值，因此b为0。它不同于完全未初始化的自动对象。','部分初始化补零');
trace('struct R {int a,b;};','struct R x={.b=7,.a=2};\nprintf("%d %d",x.a,x.b);',['2 7','7 2','0 7','指定成员必须按声明顺序'],0,'指定初始化器按成员名对应，不要求书写顺序与声明顺序一致。这里.a接收2，.b接收7。','指定成员初始化');
trace(cRecordsTypes.Person,'Person p={7,"li",{2001,3,4}};\nprintf("%d %d %s",p.birth.year,p.birth.day,p.name);',['2001 4 li','7 3 li','2001 3 li','2001 4 7'],0,'birth本身是Date，嵌套列表依次对应year、month、day。外层id和name不会改变嵌套成员的对应位置。','嵌套成员初始化路径');
trace(cRecordsTypes.Student,'Student s={.name="li"};\nprintf("%d %s %d",s.id,s.name,s.score);',['0 li 0','0 li 1','1 li 0','其余成员值不确定'],0,'name数组由字符串初始化并获得终止符，未指定的id和score也被初始化为0。并非只有name才得到初值。','字符数组成员与其他成员的零初始化');
trace(cRecordsTypes.Student,'Student a[3]={{7,"m",80}};\nprintf("%d %d %d",a[1].id,a[2].score,a[1].name[0]==0);',['0 0 1','7 80 1','0 0 0','后两条记录未初始化'],0,'只显式给第一条记录时，剩余记录各成员仍被零初始化。第二条name的首字符就是空字符。','结构数组未列记录的成员初值');
trace(cRecordsTypes.Student,'Student a={1,"sun",70},b=a;\nb.name[0]=\'r\';\nprintf("%s %s",a.name,b.name);',['sun run','run run','sun sun','run sun'],0,'结构体赋值包含内嵌数组成员的内容复制。a和b各自拥有name数组，修改b的字符不会修改a。','结构赋值复制内嵌数组');
trace('struct Box {int *p;};','int x=3;\nstruct Box a={&x},b=a;\n*b.p=9;\nprintf("%d %d",x,a.p==b.p);',['9 1','3 1','9 0','3 0'],0,'结构体复制指针成员时复制的是指针值，不会复制另一个int目标。两份Box仍指向x，因此通过b.p写入也能经a.p观察到。','结构赋值的指针成员是浅复制');
trace(cRecordsTypes.Student,'Student a={1,"a",20},b={2,"b",80};\na=b;\nprintf("%d %s %d",a.id,a.name,a.score);',['2 b 80','1 b 80','2 a 20','1 a 80'],0,'同类型结构体可整体赋值，编号、名称与成绩一起复制。只改变某个字段不是这条赋值的含义。','整条记录赋值保留字段对应');
add('有Student s，Student的name成员声明为char name[16]。s已经定义后，哪项不能用作合法赋值？',['s.name="li";','s.score=80;','s.id=3;','strcpy(s.name,"li");'],0,'数组成员仍是数组，不能在定义后直接用=赋一个字符串指针。可在容量足够时复制字符串内容；其他标量成员可以正常赋值。','数组成员不可直接赋字符串');
add('两个同类型结构体对象a、b，要按成员定义判断内容相等，正确做法是：',['分别比较各数值字段和字符串内容','直接写a==b','只比较&a==&b','只要sizeof相同就相等'],0,'C17没有通用的结构体==运算。记录相等应按题意逐字段比较，字符串成员比较内容，不能用对象地址相同代替。','结构体语义相等');
add('两个结构体对象的所有有意义字段都相等，memcmp(&a,&b,sizeof a)仍可能不为0，主要原因是：',['结构体可能包含值不由字段语义决定的填充字节','memcmp会自动忽略字符数组','同类型结构体字段永远不能相等','memcmp只比较第一成员'],0,'字节比较还会观察可能存在的填充，不能把它当作所有结构类型的语义相等判断。应按字段的实际类型和相等定义处理。','填充字节不属于成员相等定义');
add('struct R { char c; int x; };在未给实现对齐规则时，关于sizeof(struct R)应怎样判断？',['不能仅把sizeof(char)+sizeof(int)当作精确结果','必定为5','必定为8','结构体内部不允许任何填充'],0,'实现可在成员之间及对象末尾插入对齐填充。题目若要固定字节数，需给对应实现布局；不能把常见机器上的数值当作语言统一保证。','结构大小须区分成员与对齐');
trace('struct R {int first;char mark;};','struct R r={3,\'a\'};\nprintf("%d",(void *)&r==(void *)&r.first);',['1','0','取决于后部填充','结构体不能取地址'],0,'C保证结构体对象开头没有位于第一成员之前的填充，适当转换后的结构体指针与第一成员指针对应。这里只比较关系，不输出地址数值。','结构首成员与对象起点关系');
trace(cRecordsTypes.Student,'Student a[2]={{1,"a",60},{2,"b",70}};\nStudent *p=a;\n++p;\nprintf("%td %d",p-a,sizeof a==2*sizeof a[0]);',['1 1','16 1','1 0','2 1'],0,'结构指针加1按一条完整Student记录前进，差值是记录数1。结构数组由两个相同完整元素组成，大小为单个元素的两倍，不需要猜成员填充。','结构数组步长是完整记录');
trace(cRecordsTypes.Student,'Student s={3,"li",60};\nint *p=&s.score;\n*p=85;\nprintf("%d %s %d",s.id,s.name,s.score);',['3 li 85','85 li 60','3 li 60','3 85 60'],0,'成员地址可以作为相应类型指针使用；p指向score而非整条记录。编号和名称未被修改。','成员地址的独立引用');
trace(cRecordsTypes.Student,'Student s={4,"a",70};\nStudent *p=&s;\nprintf("%d %d",p->id,(*p).id);',['4 4','4 70','70 4','两种写法类型不同不能同时用'],0,'p->id等价于(*p).id。括号确保先解引用结构指针再访问成员；不是把*p.id作为同一种写法。','箭头与解引用后成员访问');
trace(cRecordsTypes.Student,'Student a[2]={{1,"a",10},{2,"b",20}};\nStudent *p=a;\nint old=p->score++;\nprintf("%d %d %td",old,a[0].score,p-a);',['10 11 0','11 11 0','10 10 1','20 10 1'],0,'->先选出score成员，后缀++修改这个成员，提供旧值10。指针p没有自增，仍在第一条记录。','成员自增不移动结构指针');
trace(cRecordsTypes.Student,'Student a[2]={{1,"a",10},{2,"b",20}};\nStudent *p=a;\nint x=(++p)->score;\nprintf("%d %d",x,p->id);',['20 2','10 1','11 1','20 1'],0,'括号中的++p先移到第二条完整记录，再访问其score。这里改变的是记录指针的位置，不是第一条成绩。','先移动记录指针再选成员');
trace(cRecordsTypes.Student,'Student s={1,"a",60};\nchange(s);\nprintf("%d",s.score);',['60','90','0','结构体不能按值传参'],0,'形参接收整条结构的副本。函数只修改副本的标量成绩，调用者原对象仍为60。','按值传结构不写回标量成员','void change(Student s){s.score=90;}');
trace('struct Box {int local;int *shared;};','int x=3;\nstruct Box b={2,&x};\nchange(b);\nprintf("%d %d",b.local,x);',['2 9','9 9','2 3','9 3'],0,'按值传递使local成为副本，但shared这个指针值仍指向x。改副本local不写回，改它所指的外部x仍可见。','按值结构中指针成员仍指向外部对象','void change(struct Box b){b.local=9;*b.shared=9;}');
trace(cRecordsTypes.Student,'Student s={1,"a",60};\nchange(&s);\nprintf("%d",s.score);',['90','60','0','只改指针副本不能改其目标'],0,'指针形参本身是副本，但它指向调用者s。通过箭头赋值修改的是调用者的成绩成员。','结构指针参数修改调用者记录','void change(Student *s){s->score=90;}');
trace(cRecordsTypes.Student,'Student a={1,"a",60};\nStudent b=raised(a);\nprintf("%d %d",a.score,b.score);',['60 65','65 65','60 60','65 60'],0,'raised修改其按值形参，再把整条结果返回。原a未变，返回对象b保存修改后的成绩，不能把返回结构与传指针写回混同。','返回结构体与原参数的独立性','Student raised(Student s){s.score+=5;return s;}');
add('已有const Student *p，且指向有效对象。哪项符合C17的限制？',['可读取p->score，不能通过p给该成员赋值','p本身一定不能改指向','const只限制id，不限制score','可以无条件删除const并修改原本只读的对象'],0,'const Student *把经p访问的结构对象限定为只读视图；指针变量本身是否能重新绑定是另一个限定方向。不得据此任意写原本只读的对象。','const结构指针的成员限制');
trace('struct Box {int *p;};','int x=3;\nconst struct Box b={&x};\n*b.p=9;\nprintf("%d",x);',['9','3','不能读取b.p','const总会递归限定指针指向的对象'],0,'const使b的成员本身不能重新赋值，但b.p的目标int并没有因此变成const。读取这个地址再修改x合法；不要把浅层限定误认为递归只读。','const结构不递归限定指针目标');
trace(cRecordsTypes.Person,'Person p={1,"a",{2001,3,4}};\nint *m=&p.birth.month;\n*m=8;\nprintf("%d %d %d",p.birth.year,p.birth.month,p.birth.day);',['2001 8 4','8 3 4','2001 3 8','2001 3 4'],0,'成员路径先选择birth，再选择month。修改这个成员地址不会整体替换Date，也不会改year和day。','嵌套成员地址与局部更新');
trace(cRecordsTypes.Person,'Person a={1,"a",{2001,3,4}},b={2,"b",{1999,6,7}};\na.birth=b.birth;\nprintf("%d %s %d %d",a.id,a.name,a.birth.year,a.birth.day);',['1 a 1999 7','2 b 1999 7','1 a 2001 4','2 a 1999 4'],0,'birth是Date结构，可作为一个整体成员复制；外层id和name没有出现在赋值左侧，因此保留a原身份。','复制嵌套结构而非外层整记录');
trace('struct R {int v[2];};','struct R a={{2,3}},b=a;\nb.v[1]=8;\nprintf("%d %d",a.v[1],b.v[1]);',['3 8','8 8','3 3','数组成员使结构赋值不合法'],0,'整个结构赋值会复制内嵌数组，两份v分别属于各自结构对象。后续写b.v[1]不改a。','数值数组成员随结构按值复制');
trace(cRecordsTypes.Student,'Student a[2]={{1,"a",20},{2,"b",80}};\na[0].score=a[1].score;\nprintf("%d %s %d",a[0].id,a[0].name,a[0].score);',['1 a 80','2 b 80','1 b 20','2 a 20'],0,'这里只赋一个成员score，不能把它解读成a[0]=a[1]。编号和名称继续属于原第一条记录。','字段赋值与整条记录替换');
trace(cRecordsTypes.Student,'Student a={1,"a",20},b={2,"b",80};\nint t=a.score;a.score=b.score;b.score=t;\nprintf("%d %s %d",a.id,a.name,a.score);',['1 a 80','2 b 80','1 b 80','2 a 20'],0,'只交换成绩会让原身份搭配对方成绩。如果目的是交换完整学生位置，应交换整条记录，而非只交换一个排序关键字。','只交换关键字会改变记录字段关联');
trace(cRecordsTypes.Student,'Student a={1,"a",20},b={2,"b",80},t;\nt=a;a=b;b=t;\nprintf("%d %s %d",a.id,a.name,a.score);',['2 b 80','1 a 80','2 a 20','1 b 20'],0,'临时变量也是Student，三次赋值移动全部字段。交换后编号、名称和成绩仍来自同一条原记录。','整记录交换保持多字段关联');
trace(cRecordsTypes.Student,'Student a={1,"li",60},b={2,"li",70};\nprintf("%d %d",a.name==b.name,strcmp(a.name,b.name)==0);',['0 1','1 1','0 0','1 0'],0,'name分别嵌在两个独立结构对象中，首地址不同；字符串内容同为li，所以strcmp为0。记录里有字符串也要比较内容，不能比较数组地址。','字符数组成员的地址与内容比较');
trace(cRecordsTypes.Student,'Student s={1,"a",60};\nprintf("%zu %zu",sizeof s.name,strlen(s.name));',['16 1','1 1','16 16','17 1'],0,'成员name有固定16个char单元，sizeof反映容量。当前字符串只有一个可见字符，strlen为1，不含终止符。','成员容量与当前字符串长度');
trace(cRecordsTypes.Student,'Student a[2]={{1,"a",10},{2,"b",20}};\nStudent *p=a+1;\np[-1].score=p->score;\nprintf("%d %s %d",a[0].id,a[0].name,a[0].score);',['1 a 20','2 b 20','1 b 20','1 a 10'],0,'p[-1]回到第一条有效记录，只更新它的score。指针位置选择记录，成员名选择字段，身份未整体移动。','结构数组相对定位后的成员更新');
add('定义单向链表结点时，为什么可写struct Node *next，而不能在同一个尚未完成的struct Node定义内写struct Node next？',['指针大小可确定，直接内嵌自身则要求无限展开的完整对象','C不允许任何指针成员','next必须指向已malloc的对象才能声明','两种写法完全等价'],0,'自引用通过指针保存链接，不把另一个完整自身对象无限嵌入。定义中的类型尚未完成，但允许声明指向该类型的指针。','自引用结点类型的完成性');
trace(cRecordsTypes.Node,'Node a={1,10,NULL},b={2,20,&a},c={3,30,NULL};\na=c;\nprintf("%d %d",a.id,b.next==&a);',['3 1','1 1','3 0','2 0'],0,'a=c修改a这个对象内的数据，不会把所有指向a的外部指针改为&c。b.next仍指向原来的a地址，如今该对象的id为3。','整结点赋值不重定向其他结点的外部链接');
add('一个带头结点的单链表规定head总指向有效的哑结点，数据结点从head->next开始。空表条件应为：',['head->next==NULL','head==NULL','head->id==0','head->next==head'],0,'题目已经明确head是始终存在的头结点。数据链为空用next为空表示，不能套用无头结点表示下的head为空。','头结点表示与空表条件');
trace(cRecordsTypes.Node,'Node a={1,10,NULL},b={2,20,NULL},s={3,30,NULL};\na.next=&b;\ns.next=a.next;\na.next=&s;\nprintf("%d %d",a.next->id,a.next->next->id);',['3 2','2 3','3 3','1 2'],0,'先让s接住原后继b，再令a.next指向s，结果是a→s→b。先保存后继关系才能避免把后半段丢失。','插入前先接住原后继');
add('在有效结点p后插入独立结点s，p原后继需保留。若先执行p->next=s;再执行s->next=p->next;，会出现：',['s->next指向s自身，原后继也丢失','仍一定得到正确插入','p被自动释放','s变成空指针'],0,'第一步已经把p->next改成s，第二步读到的也就是s，所以形成自环。应先s->next=p->next，再修改p的next。','覆盖链接后再读会产生自环');
add('要删除并释放p后面的结点q（q由malloc创建，且q=p->next非空），正确顺序应保证：',['先取得q->next并修好p->next，再free(q)','先free(q)，再读取q->next','只令q=NULL即可释放结点','free(p)会自动只删除q'],0,'释放后不能继续通过q读取后继。需要在对象仍存活时接好链，再释放被移除对象；把一个局部指针置空并不是释放。','删除链接与结点生存期顺序');
add('有Node x={1,10,NULL}; Node *p=&x;，x为函数内普通自动对象。关于free(p)应怎样判断？',['不能释放不是动态分配得到的这个对象','p是指针，所以一定能free','只要next为空就能free','free只会把id设成0'],0,'free的参数必须符合动态分配接口的要求。指向自动对象的指针不能交给free；next是否为空与分配来源无关。','指针指向有效对象不等于可free');
trace(cRecordsTypes.Node,'Node b={2,80,NULL},a={1,60,&b};\nNode *head=&a;\nprintf("%d %d",head->id,head->next->score);',['1 80','2 60','1 60','2 80'],0,'head选择a，第一项取a的id；next选择b后再读score得到80。记录字段和链接选择的对象必须分别追踪，不能只按内存相邻想象。','沿链接访问另一条记录的字段');
add('无头结点单链表以Node *head表示，末结点next为NULL。若head==NULL，意味着：',['没有任何数据结点','存在一个id为0的结点','必须先访问head->next才能确认空表','尾结点已经存在但没有数据'],0,'这种表示直接用空指针表示零条数据。它与始终存在哑头结点的表示不同，不能在判断前解引用head。','无头结点表示的空链');
trace(cRecordsTypes.Node,'Node tail={3,70,NULL},a={1,10,&tail},b={2,20,&tail};\na.next->score=95;\nprintf("%d %d",b.next->score,tail.score);',['95 95','70 95','70 70','95 70'],0,'a与b的next都指向同一个tail对象。经a路径更新共享结点后，经b路径也读到95，这不是两份独立尾记录。','不同链入口共享目标记录');
trace(cRecordsTypes.Person,'Person a={1,"a",{2001,3,4}},b=a;\nb.birth.day=9;\nprintf("%d %d",a.birth.day,b.birth.day);',['4 9','9 9','4 4','日期成员只复制地址'],0,'birth直接内嵌在Person里，复制Person也会复制Date内容。它不是指向同一Date的指针成员，所以两份day分别修改。','嵌套值成员与共享指针成员不同');
add('要跨不同实现保存并恢复一条记录，较稳妥的做法是：',['规定各字段的格式后逐字段编码和解码','直接把sizeof结构体的全部字节当作永久统一格式','认为所有实现的int大小和填充都一样','用结构体变量地址当记录内容保存'],0,'稳定格式要明确字段含义和编码。对象的内存布局、填充及某些字段表示不等同于跨实现文件协议，地址更不代表记录内容。','字段语义与内存对象表示分开');
add('Student的name为char name[16]，用scanf读取一个不含空格的名字并确保为终止符留位，应采用：',['scanf("%15s",s.name);','scanf("%16s",s.name);','scanf("%s",&s);','scanf("%15s",&s.id);'],0,'最多读取15个字符，后面还需1个空字符，正好装入16单元。实参应指向name的字符存储，不是结构对象或整数成员。','成员字符串输入的容量与地址');
trace('struct R {float score;};','struct R s={0};\nscanf("%f",&s.score);\nprintf("%.1f",s.score);',['83.5','0.0','83.0','%f要求float值而非地址'],0,'输入转换%f需要float*，&s.score的类型匹配。这里读取的83.5在float中可精确表示，随后输出一个小数位。','输入格式与成员地址类型匹配','','输入为83.5。');
add('分别定义typedef struct {int id;} A;和typedef struct {int id;} B;。即使成员拼写相同，关于A与B的判断是：',['它们是不同的结构体类型，不能直接按兼容结构赋值','它们自动成为同一个类型','sizeof相等就允许任意赋值','只要用typedef就不再有类型区别'],0,'两个分别定义的结构体不是靠成员列表相同就变成兼容类型。需要按接口显式转换字段，不能用大小相同代替类型规则。','同形但分别定义的结构类型');
add('在struct Node尚未给出完整定义时，下面哪项可以先声明？',['struct Node *p;','struct Node x;','struct Node a[3];','sizeof(struct Node)'],0,'指向未完成结构类型的指针可以声明；直接创建对象、数组或求完整对象大小则需要完整定义。这与链结点中保存next的写法一致。','前向声明与未完成结构类型');
trace('struct R {int score;};','int score=7;\nstruct R r={9};\nprintf("%d %d",score,r.score);',['7 9','9 9','7 7','同名导致编译失败'],0,'成员名位于成员访问语境，r.score与当前局部变量score是两个不同对象。名称相同不会使这两个值相互覆盖。','成员名与外部变量名的作用域');
trace('struct Rule {int bias;int (*op)(int);};','struct Rule r={2,twice};\nprintf("%d",r.op(3)+r.bias);',['8','6','5','函数指针不能作成员'],0,'op是函数指针成员，r.op(3)调用twice得到6，再加该记录的bias=2，结果8。成员可以保存可调用接口，但需要相容原型。','函数指针成员与记录配置','int twice(int x){return 2*x;}');
trace(cRecordsTypes.Student+'\nstruct Group {Student items[2];int used;};','struct Group g={{{1,"a",60},{2,"b",90}},1};\nprintf("%d %d",g.items[g.used].id,g.used);',['2 1','1 1','2 2','数组成员不能按表达式下标'],0,'used当前只是值1，作为下标会选第二条记录；读取items[used]不会自动增加used。成员的业务含义与C表达式实际执行要分开。','结构内数组成员与同记录索引字段');

const code=[];
function task(tag,type,signature,description,model,starter,mechanism){code.push({tag,type,signature,description,model,starter,mechanism});}
task('B','Student','Student blankStudent(int id)','返回空白学生记录：id为参数，name为空串，score为0。','用零初始化建立所有成员，再设置编号。返回的是整条Student，不是指向局部变量的地址。','Student blankStudent(int id){\n    Student s=/* 空1 */;\n    s.id=/* 空2 */;\n    return s;\n}','结构返回与默认成员');
task('B','Student','void copyStudent(Student *dst,const Student *src)','把src整条记录复制给dst，允许dst==src；指针有效。','结构赋值会复制name数组及两个数值字段，不要只复制成绩或只复制数组地址。','void copyStudent(Student *dst,const Student *src){\n    /* 空1 */;\n}','全成员复制及自身赋值');
task('B','Student','int sameStudent(Student a,Student b)','三项字段语义相等返回1，否则0；名称比较内容。','编号和成绩分别比较，名称用字符串内容比较。不要用==比较整个结构，也不依赖填充字节。','int sameStudent(Student a,Student b){\n    return /* 空1 */;\n}','成员语义相等');
task('B','Student','void renameStudent(Student *s,const char *name)','把name改为新名称，保持id和score。name有效、长≤15且与s不重叠，s有效。','复制字符到成员数组，包括终止符；不能把char数组当作可重新绑定的指针。','void renameStudent(Student *s,const char *name){\n    /* 空1 */;\n}','字符串成员定向更新');
task('B','Student','void swapStudent(Student *a,Student *b)','交换两条完整记录，允许a==b，指针有效。','临时变量使用Student，整条移动使姓名、编号和成绩保持关联。','void swapStudent(Student *a,Student *b){\n    Student t=/* 空1 */;\n    *a=/* 空2 */;\n    *b=/* 空3 */;\n}','完整记录交换');
task('B','Student','int studentOrder(Student a,Student b)','按成绩降序、编号升序、姓名ASCII字典序升序比较。a应在前、相同、在后分别返回-1、0、1。','依次比较三个关键字，只有前一个相等时才看下一个。字符串比较只取符号并归一化。','int studentOrder(Student a,Student b){\n    if(a.score!=b.score)return /* 空1 */;\n    if(a.id!=b.id)return /* 空2 */;\n    int c=strcmp(a.name,b.name);\n    return /* 空3 */;\n}','多字段逐级排序关系');
task('B','Student','Student adjustedStudent(Student s,int delta)','返回把成绩增加delta后截在0至100的新记录，其他字段保持。-100≤delta≤100；调用者原记录不变。','形参是副本，改其score并返回整条副本；边界截断不应破坏身份字段。','Student adjustedStudent(Student s,int delta){\n    int x=s.score+delta;\n    s.score=/* 空1 */;\n    return /* 空2 */;\n}','按值调整记录并保留身份');
task('B','Student','int updateFirstId(Student a[],int n,int id,int score)','只把首条id相等记录的成绩改为score并返回1；无匹配返回0且记录不变。0≤n≤20，score在0至100，id可重复。只处理前n条。','按顺序找首条命中，修改该条score立即返回，不要改变名称或把所有重名编号一并更新。','int updateFirstId(Student a[],int n,int id,int score){\n    for(int i=0;i<n;i++)if(/* 空1 */){\n        /* 空2 */;\n        return 1;\n    }\n    return 0;\n}','按记录键更新首条匹配');
task('B','Student','int findExactName(const Student a[],int n,const char *name)','返回前n条中首个名称内容相同的下标，无则-1。不改输入；0≤n≤20，name有效、长≤15，可为空。','名称可以重复，strcmp相等后返回最早下标；比较地址会错过内容相同的不同存储。','int findExactName(const Student a[],int n,const char *name){\n    for(int i=0;i<n;i++)if(/* 空1 */)return /* 空2 */;\n    return -1;\n}','按名称内容定位首条记录');
task('B','Stock','long long stockValue(Stock s)','返回该条库存的quantity×price，以分计。','两字段相乘前扩大类型，库存金额最多10^12，不能先在int中溢出。','long long stockValue(Stock s){\n    return /* 空1 */;\n}','数量和单价的记录金额');
task('B','Stock','int takeStock(Stock *s,int amount)','amount在0至1000000。库存足够时扣amount、返回1；不足返回0且记录不变；code和price始终保持。s有效。','先检查数量，再只扣quantity。取0件也是成功，不能把amount当成新库存或改变单价。','int takeStock(Stock *s,int amount){\n    if(/* 空1 */)return 0;\n    /* 空2 */;\n    return 1;\n}','记录库存的条件提交');
task('B','Node','int linkMatches(const Node *head,int id)','统计链中id相同的记录数，编号可以重复，空链返回0，不修改结点。','沿next而非假定结点相邻；每条匹配记录计一次，不能找到第一条就停止。','int linkMatches(const Node *head,int id){\n    int count=0;\n    for(const Node *p=head;/* 空1 */;p=p->next)\n        if(/* 空2 */)count++;\n    return count;\n}','按链接遍历重复键记录');
task('B','Node','void appendKnown(Node *tail,Node *item)','tail、item是不同的有效结点，tail->next和item->next均为NULL。把item接到tail后，保留所有数据字段。','只设置tail的next，不能把整个item赋给tail，否则会覆盖原尾记录内容。','void appendKnown(Node *tail,Node *item){\n    /* 空1 */;\n}','已知尾结点追加不覆盖数据');
task('B','Student','int firstStudent(const Student a[],int n,Student *out)','前n条非空时复制首条到*out并返回1；n=0返回0且*out不变。0≤n≤20，out有效且与输入不重叠，不改输入。','先处理空记录集，再整条复制a[0]；输出不能只写某个字段，失败也不能清空原输出。','int firstStudent(const Student a[],int n,Student *out){\n    if(/* 空1 */)return 0;\n    /* 空2 */;\n    return 1;\n}','空记录集与完整输出');
task('B','Date','int compareDate(Date a,Date b)','按年月日先后比较，较早、同一天、较晚分别返回-1、0、1。','先年后月再日，不能把三项求和比较；同一年才比较月份。','int compareDate(Date a,Date b){\n    if(a.year!=b.year)return /* 空1 */;\n    if(a.month!=b.month)return /* 空2 */;\n    return /* 空3 */;\n}','嵌套日期记录的词典序');

task('P','Student','Student makeStudent(int id,const char *name,int score)','用三个参数构造并返回完整记录。id、score及name符合Student输入范围，name有效。','设置两数值字段并复制名称及终止符；不能返回局部Student指针。',null,'完整记录构造接口');
task('P','Student','int replaceRecord(Student a[],int n,int id,const Student *replacement)','把前n条中首个id相等的记录整体换成*replacement并返回1；无匹配返回0。0≤n≤20，replacement有效，可指向a中的记录；编号允许重复。新记录的编号可以变化。','先保存替换记录的完整值，再按旧id查找首条命中。复制所有字段，不要只写查找关键字或成绩。',null,'按键替换整记录及输入别名');
task('P','Student','int eraseFirstId(Student a[],int *n,int id)','删除首条id相等的记录，其右侧整记录左移并使*n减1，返回1；无则0且前*n条及*n不变。0≤*n≤20，n有效，编号可重复。不要求清理删除后尾部。','定位首条再移动整条Student，名称、编号、成绩一起移动。只删除一条，返回的新长度决定有效前缀。',null,'删除首条记录保持其余关联');
task('P','Student','int insertStudent(Student a[],int *n,int cap,int k,Student value)','0≤*n≤cap≤20。若已满或k不在[0,*n]，返回0且*n与前cap条存储记录不变；否则在k之前插入完整value并增*n，返回1。n有效，a容量至少cap。','先检查所有失败条件，再从后往前移动整记录，写入value并增长度；无需保持成功后未使用尾区内容。',null,'有容量约束的整记录插入');
task('P','Student','int bestStudent(const Student a[],int n,Student *out)','在前n条中选成绩最高者；并列选id较小者，再并列保留首次出现者。成功复制整条到out并返回1；空集返回0且out不变。0≤n≤20，out有效且不与输入重叠，不改输入。','维护候选下标，只在关键字严格更优时替换。最后输出整条记录，才能保留候选对应姓名与成绩。',null,'多字段选优并保留首次并列');
task('P','Student','int mergeStudentScores(Student a[],int n,const Student updates[],int m)','a前n条id互异。按updates前m条顺序处理，若id存在则只更新对应成绩，姓名不变；同id多次更新以后者为准。返回匹配成功的更新笔数。0≤n,m≤20，两数组不重叠，不改updates。','按键找到目标后只写score；更新姓名会混淆身份，每次命中都算一笔，重复id不是去重后才计。',null,'按键批量更新与记录身份保留');
task('P','Student','int retainEligible(Student a[],int n,int minimum)','将前n条中score≥minimum且name非空的记录稳定保留在前部，返回新长度。0≤n≤20，0≤minimum≤100。不要求清理尾区。','两个成员条件均满足才复制整条记录；写位置不超过读位置，保留原相对顺序。',null,'记录资格由多个字段共同决定');
task('P','Student','void sortRoster(Student a[],int n)','按score降序、id升序排列前n条；两关键字相同的记录保留原相对顺序，姓名不参与排序。0≤n≤20。n之后的存储不修改。','比较关键字时只在严格逆序才交换完整记录；仅交换score会把分数配给错误学生。',null,'稳定多字段排序保持整记录');
task('P','Student','int summarizeName(const Student a[],int n,const char *name,int *count,int *total)','统计前n条中名称内容等于name的记录数与成绩总和，分别写count、total；有匹配返回1，无则0且两输出均写0。0≤n≤20，name有效长≤15，两输出有效且互异并不与输入重叠，不改输入。','使用strcmp选中同名记录，两个统计量分别累计，不能只计算第一名或用id替代姓名条件。',null,'同名记录的关联聚合');
task('P','Student','void orderTwo(Student a,Student b,Student *first,Student *second)','把成绩较高的完整记录写first，另一条写second，成绩相等时a在前。输出有效且互异，可以指向调用者传入a、b值所来自的原对象。','a和b是按值副本，因此先后写输出不会破坏另一输入。整记录移动，平分按参数顺序。',null,'按值输入与可覆盖原对象的双记录输出');
task('P','Student','int patchName(Student *s,const char *name)','name为有效空字符结尾的小写串，长0至30，与s不重叠。长度≤15则改名返回1，保持id、score；否则返回0，原记录不变。s有效。','先确认新字符串能连同终止符装入成员数组，再复制；不允许截断名字后声称成功。',null,'字符串成员容量检查后提交');
task('P','Booking','int reserveRooms(Booking *b,int rooms)','0≤rooms≤1000000。可用房足够则available减rooms、reserved加rooms并返回1；不足则返回0且记录不变。code保持，b有效。','两个数量字段需要成对更新，不能只减可用而漏加已订；0房也属于合法成功请求。',null,'同记录关联数量守恒');
task('P','Booking','int mergeBooking(Booking *dst,const Booking *src)','仅当两个对象不同且code相等时，把src两种数量分别加到dst中，返回1；其余返回0且记录均不变。src始终不修改，指针有效。','先核对象身份和记录键，再逐字段合并。源数据保留；不是把available与reserved交叉相加。',null,'同键记录合并及自身合并拒绝');
task('P','Stock','void splitStock(const Stock *s,int amount,Stock *part,Stock *rest)','0≤amount≤s->quantity。把同一批次拆成两条记录，part数量为amount，rest为原数量减amount；两者code、price均来自原记录。输出有效且不同，s可与其中一个输出相同。','先取原记录副本，再生成两个结果，以免第一次输出覆盖源数量，导致第二份数量算错。',null,'记录拆分与源输出别名');
task('P','Stock','int receiveStock(Stock *s,Stock delivery)','只有code和price都相等才把delivery.quantity加到s->quantity并返回1；否则0且s不变。s有效。','批次身份包含编码和单价两个字段，只编码相同不能无条件合并。数量求和在给定范围内可用int表示。',null,'联合键决定记录是否可合并');
task('P','Line','long long invoiceTotal(const Line a[],int n)','求前n条未免单（waived=0）行的units×unitCents总和；免单行不计。0≤n≤20，不改输入。','每行先依据自己的标志决定是否计费，再以宽整数计算数量和单价的乘积。',null,'单据行标志与数量单价的联合金额');
task('P','Line','int applyCoupon(Line a[],int n,int code,int perUnit)','对前n条中code匹配且waived=0的行，把unitCents减perUnit但不低于0，返回实际选中的行数（即使原价为0仍计）。0≤n≤20，0≤perUnit≤1000000；其他成员与未选行不变。','先判断联合条件，只改每个目标行的单价，不能改商品数目或给免单行也算一次优惠。',null,'按键和标志更新记录的单个业务字段');
task('P','Line','int consistentInvoice(const Line a[],int n)','检查前n条中相同code的记录是否都具有相同unitCents，符合返回1，否则0。units与waived不影响一致性；0≤n≤20，不改输入。','只比较编号相同的行的单价；不同商品价格不同不算冲突，免单不取消批次单价一致要求。',null,'重复记录的跨行字段一致性');
task('P','Package','int earliestPackage(const Package a[],int n,Date today,Package *out)','从前n条中选count>0且expiry不早于today的记录，取到期日期最早者；日期并列保留首次出现者。空候选返回0且out不变，否则复制整条到out并返回1。0≤n≤20，today有效，out有效且不与输入重叠，不改输入。','按嵌套Date逐级比较，先排除无货及已过期批次。今天到期仍合法，不能只选最小id。',null,'嵌套日期与库存条件共同选记录');
task('P','Person','int birthdayCount(const Person a[],int n,Date date)','统计前n条中出生月、日与date相同的人数，忽略出生年份；0≤n≤20，date有效，不改输入。','生日匹配使用month与day两个成员，不是要求完整Date相同，姓名或编号重复也仍按记录计数。',null,'嵌套记录的部分语义相等');
task('P','Person','void moveBirthday(Person *dst,const Person *src)','把src的birth复制到dst，dst的id和name保持，允许dst==src，指针有效。','只复制嵌套Date成员，不能把整个Person赋给dst，否则会覆盖目标身份。',null,'嵌套成员复制与外层身份保持');
task('P','Person','int replaceBirthYear(Person *p,int year)','1≤year≤9999。若保留原月日并改为year仍是有效公历生日，则只改birth.year并返回1；否则返回0且整条记录不变。p有效。','普通日期只改年份，2月29日必须检查新年是否闰年；先确认再写，不改变id、name或月日。',null,'更新嵌套字段前维护日期不变量');
task('P','Node','Node *findNodeId(Node *head,int id)','返回首个id匹配结点的原地址，无则NULL，不修改链。编号可重复。','沿next找第一次命中并返回实际结点地址，而不是返回某个局部结构副本的地址。',null,'按记录键返回原结点身份');
task('P','Node','int nodeCountPassing(const Node *head,int minimum)','统计score≥minimum的结点记录数，0≤minimum≤100，不修改链；空链为0。','沿链接遍历，判断每个结点自己的成绩；链表结点不必在物理内存中相邻。',null,'链接记录的字段筛选计数');
task('P','Node','Node *appendDetached(Node *head,Node *item)','item为独立有效结点，next为NULL且不在原链。追加到链尾并返回新head；空链返回item，原非空head地址保持。数据字段不改。','空链和非空链分别处理，非空时找到尾结点再链接，不复制或释放结点。',null,'无头结点空链与尾追加');
task('P','Node','Node *unlinkFirstId(Node *head,int id,Node **removed)','摘除首个id匹配结点并返回新head，把其地址写removed且把被摘结点next设NULL；无匹配时head不变且*removed=NULL。removed有效并不与结点字段重叠，不释放结点，编号可重复。','保存后继后改头或前驱链接，最后断开被摘结点。只处理第一次匹配，记录数据不变。',null,'按键摘除同时返回脱链记录');
task('P','Node','void swapPayload(Node *a,Node *b)','交换两个结点的id和score，所有next链接保持不变。允许a==b，两个地址有效。','交换数据字段而非整条Node，避免把next一起交换而改变链的拓扑；自身交换应无变化。',null,'结点数据区与链接区分开修改');
task('P','Node','int appendUniqueId(Node **head,Node *item)','item为独立结点，next=NULL且不在原链。若链中已有相同id返回0且链与item不变；否则把item接到尾部（空链成为首结点）并返回1。head有效。','先完成重复键检查，确认后才链接。比较的是id内容，而不是结点地址；不用申请或释放。',null,'唯一记录键检查后插入');
task('P','Node','int moveFirstId(Node **from,Node **to,int id)','两链互不相交，from、to是不同有效头指针地址。把from链首个id匹配结点摘出并插到to链头，返回1；无匹配返回0且两链不变。不改结点id、score，不分配或释放。','先保存被选结点在源链的后继并修源头或前驱，再把结点next接到目标旧头并更新目标头，保留结点原身份。',null,'跨记录集合转移原结点');

const choices=makeQuestions('programming',9,'选择题','C6R',S);
choices.forEach((q,i)=>{q.mechanism=mechanisms[i];q.trace=traceRows.has(i+1);q.coding=false;});
const questions=[...choices];
for(const tag of ['B','P']){
 const items=code.filter(x=>x.tag===tag),section=tag==='B'?'程序填空':'编程题';
 const rows=items.map(x=>[
  `系统提供以下类型，提交时不要重复定义：\n\`\`\`c\n${cRecordsTypes[x.type]}\n\`\`\`\n实现${x.signature}。${x.description}${domains[x.type]}${tag==='B'?`\n补全后提交整个函数：\n\`\`\`c\n${x.starter}\n\`\`\``:''}`,
  x.model,[x.mechanism,'边界及等价正确实现']
 ]);
 makeQuestions('programming',9,section,'C6R',rows).forEach((q,i)=>{
  const x=items[i];q.coding=true;q.signature=x.signature;q.structDefinition=cRecordsTypes[x.type];q.recordType=x.type;q.mechanism=x.mechanism;
  q.codeStarter=x.starter||`${x.signature}{\n    /* 完成函数 */\n}`;
  q.submissionInstruction=`系统已提供以下类型，不要重复定义：\n${q.structDefinition}\n提交完整函数 ${q.signature}，无需main。可使用常用C17标准头文件。`;
  questions.push(q);
 });
}
const suppChoices=new Set([15,16,17,28,44,49,52,53,55]);
const basicChoices=new Set([1,2,3,4,5,6,7,8,9,12,13,19,20,25,36,38,40,46,50,54]);
for(const q of questions){
 const no=Number(q.id.split('-').at(-1));
 const supp=q.section==='选择题'?suppChoices.has(no):q.section==='编程题'&&[22,28,29].includes(no);
 const basic=q.section==='选择题'?basicChoices.has(no):q.section==='程序填空'&&[1,2,4,10,12,13,14,15].includes(no);
 q.studyLevel=supp?'supplement':basic?'basic':'core';q.studyWeight={core:3,basic:2,supplement:1}[q.studyLevel];
 q.studyEvidence='当届9 结构体.pdf第2—40页、45—46页；C09课堂讨论；马虹CYY8实际结构体补充（不同课件章号分别保留）。独立编写，不称学校必考。';
 q.source={ppt:'当届9 结构体.pdf；C09课堂讨论；马虹CYY8-23.pptx实际结构体',answer:'独立推导及本批C17核验'};
 q.points=q.section==='选择题'?2:q.section==='程序填空'?5:10;
}
export const cRecordsPractice={programming:questions};
