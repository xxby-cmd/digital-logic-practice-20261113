// Server-only drivers and sources. Expectations are independently derived in JS.
import {cRecordsPractice} from '../bank-c-records.js';
const bank=cRecordsPractice.programming;
const id=(tag,n)=>`C6R-programming-9-${tag}-${String(n).padStart(3,'0')}`;
const registry=new Map(),sources={};
const S=(id,name,score)=>({id,name,score});
const student=s=>`{${s.id},${JSON.stringify(s.name)},${s.score}}`;
const sv=s=>[s.id,`[${s.name}]`,s.score];
const stock=s=>`{${s.code},${s.quantity},${s.price}}`;
const kv=s=>[s.code,s.quantity,s.price];
const date=d=>`{${d.year},${d.month},${d.day}}`;
const dv=d=>[d.year,d.month,d.day];
const person=p=>`{${p.id},${JSON.stringify(p.name)},${date(p.birth)}}`;
const pv=p=>[p.id,`[${p.name}]`,...dv(p.birth)];
const pack=p=>`{${p.id},${date(p.expiry)},${p.count}}`;
const pkv=p=>[p.id,...dv(p.expiry),p.count];
const line=l=>`{${l.code},${l.units},${l.unitCents},${l.waived}}`;
const lv=l=>[l.code,l.units,l.unitCents,l.waived];
const booking=b=>`{${b.code},${b.available},${b.reserved}}`;
const bv=b=>[b.code,b.available,b.reserved];
const clone=x=>structuredClone(x);
const item=(body,out)=>({body,out});
const out=(type,name)=>({Student:`printf("%d [%s] %d ",${name}.id,${name}.name,${name}.score);`,
 Stock:`printf("%d %d %d ",${name}.code,${name}.quantity,${name}.price);`,
 Date:`printf("%d %d %d ",${name}.year,${name}.month,${name}.day);`,
 Booking:`printf("%d %d %d ",${name}.code,${name}.available,${name}.reserved);`,
 Line:`printf("%d %d %d %d ",${name}.code,${name}.units,${name}.unitCents,${name}.waived);`,
 Person:`printf("%d [%s] %d %d %d ",${name}.id,${name}.name,${name}.birth.year,${name}.birth.month,${name}.birth.day);`,
 Package:`printf("%d %d %d %d %d ",${name}.id,${name}.expiry.year,${name}.expiry.month,${name}.expiry.day,${name}.count);`}[type]);
const array=(type,name,a,format,capacity=Math.max(1,a.length))=>`${type} ${name}[${capacity}]={${a.length?a.map(format).join(','):'{0}'}};`;
const outputArray=(type,name,n)=>`for(int i=0;i<${n};i++){${out(type,`${name}[i]`)}}`;
function add(tag,n,source,build){const key=id(tag,n);registry.set(key,build);sources[key]=source;}
const students=[S(0,'',0),S(1,'a',60),S(-1,'li',100),S(1000000,'abcdefghijklmno',1),S(-1000000,'z',99),S(2,'li',60)];
const rosters=[[],[students[0]],[students[1]],[S(3,'c',90),S(1,'a',60),S(2,'b',90)],
 [S(2,'first',80),S(2,'second',80),S(1,'third',80)],
 [S(-1,'li',0),S(9,'li',100),S(-1,'',80),S(4,'z',59)],
 Array.from({length:20},(_,i)=>S(i%5,`n${'a'.repeat(i%4)}`,i*11%101))];
// All generated names obey the published lowercase-only contract.
for(const a of rosters)for(const s of a)if(/[^a-z]/.test(s.name))throw Error('测试名称不在公开范围');
const sentinel=[S(999999,'tail',17),S(-999999,'after',83)];
const prefixCases=rosters.map(a=>({a:[...clone(a),...clone(sentinel)],n:a.length}));
const pairs=a=>a.flatMap(x=>a.map(y=>[x,y]));
const compareDate=(a,b)=>{for(const k of ['year','month','day'])if(a[k]!==b[k])return Math.sign(a[k]-b[k]);return 0;};
const compareStudent=(a,b)=>b.score-a.score||a.id-b.id||(a.name<b.name?-1:a.name>b.name?1:0);
add('B',1,'Student blankStudent(int id){Student s={0};s.id=id;return s;}',()=>[-1000000,-1,0,1,1000000].map(x=>item(`Student r=blankStudent(${x});${out('Student','r')}puts("");`,sv(S(x,'',0)))));
add('B',2,'void copyStudent(Student*d,const Student*s){*d=*s;}',()=>students.flatMap(s=>[false,true].map(self=>item(
 `Student a=${student(s)},b={91,"old",12};copyStudent(${self?'&a':'&b'},&a);${out('Student','a')}${out('Student',self?'a':'b')}puts("");`,[...sv(s),...sv(s)]))));
add('B',3,'int sameStudent(Student a,Student b){return a.id==b.id&&a.score==b.score&&strcmp(a.name,b.name)==0;}',()=>[
 ...pairs(students).map(([a,b])=>item(`Student a=${student(a)},b=${student(b)};printf("%d\\n",sameStudent(a,b));`,[Number(a.id===b.id&&a.score===b.score&&a.name===b.name)])),
 item('Student a={7,"li",80},b={7,"li",80};a.name[15]=\'x\';b.name[15]=\'y\';printf("%d\\n",sameStudent(a,b));',[1])]);
add('B',4,'void renameStudent(Student*s,const char*n){strcpy(s->name,n);}',()=>students.flatMap(s=>['','a','abcdefghijklmno'].map(name=>item(
 `Student a=${student(s)};renameStudent(&a,${JSON.stringify(name)});${out('Student','a')}puts("");`,sv({...s,name})))));
add('B',5,'void swapStudent(Student*a,Student*b){Student t=*a;*a=*b;*b=t;}',()=>[
 ...pairs(students).map(([a,b])=>item(`Student a=${student(a)},b=${student(b)};swapStudent(&a,&b);${out('Student','a')}${out('Student','b')}puts("");`,[...sv(b),...sv(a)])),
 ...students.map(s=>item(`Student a=${student(s)};swapStudent(&a,&a);${out('Student','a')}puts("");`,sv(s)))]);
add('B',6,'int studentOrder(Student a,Student b){if(a.score!=b.score)return a.score>b.score?-1:1;if(a.id!=b.id)return a.id<b.id?-1:1;int c=strcmp(a.name,b.name);return (c>0)-(c<0);}',()=>pairs([...students,S(2,'a',60),S(2,'z',60)]).map(([a,b])=>item(
 `Student a=${student(a)},b=${student(b)};printf("%d\\n",studentOrder(a,b));`,[Math.sign(compareStudent(a,b))])));
add('B',7,'Student adjustedStudent(Student s,int d){int x=s.score+d;s.score=x<0?0:x>100?100:x;return s;}',()=>students.flatMap(s=>[-100,-1,0,1,100].map(d=>item(
 `Student a=${student(s)},r=adjustedStudent(a,${d});${out('Student','a')}${out('Student','r')}puts("");`,[...sv(s),...sv({...s,score:Math.min(100,Math.max(0,s.score+d))})]))));
add('B',8,'int updateFirstId(Student*a,int n,int id,int score){for(int i=0;i<n;i++)if(a[i].id==id){a[i].score=score;return 1;}return 0;}',()=>prefixCases.flatMap(({a,n})=>[-1,0,2,999999,77].map(key=>{
 const b=clone(a),at=b.slice(0,n).findIndex(s=>s.id===key);if(at>=0)b[at].score=37;
 return item(`${array('Student','a',a,student)}int r=updateFirstId(a,${n},${key},37);printf("%d ",r);${outputArray('Student','a',a.length)}puts("");`,[Number(at>=0),...b.flatMap(sv)]);
})));
add('B',9,'int findExactName(const Student*a,int n,const char*name){for(int i=0;i<n;i++)if(strcmp(a[i].name,name)==0)return i;return -1;}',()=>prefixCases.flatMap(({a,n})=>['','a','li','tail','none'].map(name=>item(
 `${array('Student','a',a,student)}printf("%d ",findExactName(a,${n},${JSON.stringify(name)}));${outputArray('Student','a',a.length)}puts("");`,[a.slice(0,n).findIndex(s=>s.name===name),...a.flatMap(sv)]))));
const stocks=[{code:0,quantity:0,price:0},{code:1,quantity:1,price:2},{code:-5,quantity:1000000,price:1000000},{code:1,quantity:7,price:100},{code:2,quantity:9,price:100}];
add('B',10,'long long stockValue(Stock s){return (long long)s.quantity*s.price;}',()=>stocks.map(s=>item(`Stock a=${stock(s)};printf("%lld\\n",stockValue(a));`,[BigInt(s.quantity)*BigInt(s.price)])));
add('B',11,'int takeStock(Stock*s,int amount){if(amount>s->quantity)return 0;s->quantity-=amount;return 1;}',()=>stocks.flatMap(s=>[0,1,s.quantity,1000000].map(amount=>item(
 `Stock a=${stock(s)};int r=takeStock(&a,${amount});printf("%d ",r);${out('Stock','a')}puts("");`,[Number(amount<=s.quantity),...kv({...s,quantity:amount<=s.quantity?s.quantity-amount:s.quantity})]))));

const chains=[[],[0],[2,0,3,1],[4,1,3],[0,2,1,4,3]];
const poolBase=[{id:1,score:10},{id:2,score:80},{id:1,score:90},{id:-3,score:0},{id:7,score:60},{id:8,score:100}];
function nodeInit(order,extraOrder=[]){const a=poolBase.map(p=>({...p,next:-1}));for(const seq of [order,extraOrder])seq.forEach((index,i)=>a[index].next=seq[i+1]??-1);return a;}
function nodeBody(a){return `Node a[${a.length}]={${a.map(s=>`{${s.id},${s.score},NULL}`).join(',')}};`+a.map((s,i)=>`a[${i}].next=${s.next<0?'NULL':`a+${s.next}`};`).join('');}
const ptr=i=>i<0?'NULL':`a+${i}`;
const pointerIndex=p=>`cr_node_index(a,${poolBase.length},${p})`;
const nodeOut=a=>a.flatMap(s=>[s.id,s.score,s.next]);
const nodePrint=`for(int i=0;i<${poolBase.length};i++)printf("%d %d %d ",a[i].id,a[i].score,${pointerIndex('a[i].next')});`;
add('B',12,'int linkMatches(const Node*h,int id){int n=0;for(;h;h=h->next)if(h->id==id)n++;return n;}',()=>chains.flatMap(order=>[1,7,99].map(key=>{const a=nodeInit(order);return item(
 `${nodeBody(a)}printf("%d ",linkMatches(${ptr(order[0]??-1)},${key}));${nodePrint}puts("");`,[order.filter(i=>a[i].id===key).length,...nodeOut(a)]);} )));
add('B',13,'void appendKnown(Node*tail,Node*item){tail->next=item;}',()=>[[0,1],[4,2],[2,5],[1,3],[5,0]].map(([tail,part])=>{const a=nodeInit([]),b=clone(a);b[tail].next=part;return item(
 `${nodeBody(a)}appendKnown(a+${tail},a+${part});${nodePrint}puts("");`,nodeOut(b));}));
add('B',14,'int firstStudent(const Student*a,int n,Student*out){if(!n)return 0;*out=a[0];return 1;}',()=>prefixCases.map(({a,n})=>{
 const old=S(72,'old',31);return item(`${array('Student','a',a,student)}Student r=${student(old)};int ok=firstStudent(a,${n},&r);printf("%d ",ok);${out('Student','r')}${outputArray('Student','a',a.length)}puts("");`,[Number(n>0),...sv(n?a[0]:old),...a.flatMap(sv)]);
}));
const dates=[{year:1,month:1,day:1},{year:1999,month:12,day:31},{year:2000,month:1,day:1},{year:2000,month:2,day:29},{year:2000,month:3,day:1},{year:9999,month:12,day:31}];
add('B',15,'int compareDate(Date a,Date b){if(a.year!=b.year)return (a.year>b.year)-(a.year<b.year);if(a.month!=b.month)return (a.month>b.month)-(a.month<b.month);return (a.day>b.day)-(a.day<b.day);}',()=>pairs(dates).map(([a,b])=>item(`Date a=${date(a)},b=${date(b)};printf("%d\\n",compareDate(a,b));`,[compareDate(a,b)])));

add('P',1,'Student makeStudent(int id,const char*name,int score){Student s={0};s.id=id;s.score=score;strcpy(s.name,name);return s;}',()=>students.map(s=>item(
 `char name[16]=${JSON.stringify(s.name)};Student r=makeStudent(${s.id},name,${s.score});${out('Student','r')}printf("[%s]\\n",name);`,[...sv(s),`[${s.name}]`])));
add('P',2,'int replaceRecord(Student*a,int n,int id,const Student*r){Student v=*r;for(int i=0;i<n;i++)if(a[i].id==id){a[i]=v;return 1;}return 0;}',()=>prefixCases.flatMap(({a,n})=>[-1,2,99].flatMap(key=>[0,a.length-1].map(src=>{
 const b=clone(a),at=b.slice(0,n).findIndex(s=>s.id===key);if(at>=0)b[at]=clone(a[src]);return item(
 `${array('Student','a',a,student)}int ok=replaceRecord(a,${n},${key},a+${src});printf("%d ",ok);${outputArray('Student','a',a.length)}puts("");`,[Number(at>=0),...b.flatMap(sv)]);
}))));
add('P',3,'int eraseFirstId(Student*a,int*n,int id){int k=0;while(k<*n&&a[k].id!=id)k++;if(k==*n)return 0;for(int i=k;i+1<*n;i++)a[i]=a[i+1];(*n)--;return 1;}',()=>rosters.flatMap(a=>[-1,1,2,99].map(key=>{
 const at=a.findIndex(s=>s.id===key),b=a.filter((_,i)=>i!==at);return item(
 `${array('Student','a',a,student,Math.max(1,a.length+2))}int n=${a.length};int ok=eraseFirstId(a,&n,${key});printf("%d %d ",ok,n);if(n>=0&&n<=${a.length}){${outputArray('Student','a','n')}}puts("");`,[Number(at>=0),b.length,...b.flatMap(sv)]);
})));
add('P',4,'int insertStudent(Student*a,int*n,int cap,int k,Student v){if(*n==cap||k<0||k>*n)return 0;for(int i=*n;i>k;i--)a[i]=a[i-1];a[k]=v;(*n)++;return 1;}',()=>rosters.filter(a=>a.length<20).flatMap(logical=>[logical.length,Math.min(20,logical.length+2)].flatMap(cap=>
 [...new Set([-1,0,Math.floor(logical.length/2),logical.length,logical.length+1])].map(k=>{
 const a=[...clone(logical),...Array.from({length:cap-logical.length},()=>S(88,'unused',12))],value=S(-7,'new',93),ok=k>=0&&k<=logical.length&&logical.length<cap;
 const b=ok?[...logical.slice(0,k),value,...logical.slice(k)]:a;const size=ok?logical.length+1:cap;
 return item(`${array('Student','a',a,student,Math.max(1,cap))}int n=${logical.length};Student v=${student(value)};int ok=insertStudent(a,&n,${cap},${k},v);printf("%d %d ",ok,n);${outputArray('Student','a',size)}puts("");`,[Number(ok),logical.length+Number(ok),...b.flatMap(sv)]);
}))));
add('P',5,'int bestStudent(const Student*a,int n,Student*out){if(!n)return 0;int best=0;for(int i=1;i<n;i++)if(a[i].score>a[best].score||(a[i].score==a[best].score&&a[i].id<a[best].id))best=i;*out=a[best];return 1;}',()=>prefixCases.map(({a,n})=>{
 const selected=a.slice(0,n).map((s,i)=>({s,i})).sort((x,y)=>y.s.score-x.s.score||x.s.id-y.s.id||x.i-y.i)[0]?.s,old=S(88,'old',7);
 return item(`${array('Student','a',a,student)}Student r=${student(old)};int ok=bestStudent(a,${n},&r);printf("%d ",ok);${out('Student','r')}${outputArray('Student','a',a.length)}puts("");`,[Number(!!selected),...sv(selected||old),...a.flatMap(sv)]);
}));
const uniqueRosters=[[],[S(1,'a',10)],[S(1,'a',10),S(2,'b',20),S(-1,'c',30)]];
add('P',6,'int mergeStudentScores(Student*a,int n,const Student*u,int m){int count=0;for(int j=0;j<m;j++)for(int i=0;i<n;i++)if(a[i].id==u[j].id){a[i].score=u[j].score;count++;break;}return count;}',()=>uniqueRosters.flatMap(logical=>[[],[S(1,'change',99)],[S(1,'x',0),S(1,'y',100),S(-1,'z',71),S(7,'missing',42)]].map(updates=>{
 const a=[...clone(logical),...clone(sentinel)],u=[...clone(updates),S(2,'ignored',93)],b=clone(a);let count=0;
 for(const row of updates){const at=logical.findIndex(s=>s.id===row.id);if(at>=0){b[at].score=row.score;count++;}}
 return item(`${array('Student','a',a,student)}${array('Student','u',u,student)}int c=mergeStudentScores(a,${logical.length},u,${updates.length});printf("%d ",c);${outputArray('Student','a',a.length)}${outputArray('Student','u',u.length)}puts("");`,[count,...b.flatMap(sv),...u.flatMap(sv)]);
})));
add('P',7,'int retainEligible(Student*a,int n,int min){int k=0;for(int i=0;i<n;i++)if(a[i].score>=min&&a[i].name[0])a[k++]=a[i];return k;}',()=>rosters.flatMap(a=>[0,60,80,100].map(min=>{const b=a.filter(s=>s.score>=min&&s.name);return item(
 `${array('Student','a',a,student)}int k=retainEligible(a,${a.length},${min});printf("%d ",k);if(k>=0&&k<=${a.length}){${outputArray('Student','a','k')}}puts("");`,[b.length,...b.flatMap(sv)]);} )));
add('P',8,'void sortRoster(Student*a,int n){for(int i=1;i<n;i++){Student v=a[i];int j=i;while(j>0&&(a[j-1].score<v.score||(a[j-1].score==v.score&&a[j-1].id>v.id))){a[j]=a[j-1];j--;}a[j]=v;}}',()=>prefixCases.map(({a,n})=>{
 const b=[...a.slice(0,n).map((s,i)=>({s,i})).sort((x,y)=>y.s.score-x.s.score||x.s.id-y.s.id||x.i-y.i).map(x=>x.s),...a.slice(n)];
 return item(`${array('Student','a',a,student)}sortRoster(a,${n});${outputArray('Student','a',a.length)}puts("");`,b.flatMap(sv));
}));
add('P',9,'int summarizeName(const Student*a,int n,const char*name,int*count,int*total){*count=*total=0;for(int i=0;i<n;i++)if(strcmp(a[i].name,name)==0){(*count)++;*total+=a[i].score;}return *count>0;}',()=>prefixCases.flatMap(({a,n})=>['','li','tail','none'].map(name=>{const b=a.slice(0,n).filter(s=>s.name===name);return item(
 `${array('Student','a',a,student)}int c=-9,t=777;int ok=summarizeName(a,${n},${JSON.stringify(name)},&c,&t);printf("%d %d %d ",ok,c,t);${outputArray('Student','a',a.length)}puts("");`,[Number(b.length>0),b.length,b.reduce((s,x)=>s+x.score,0),...a.flatMap(sv)]);
})));
add('P',10,'void orderTwo(Student a,Student b,Student*f,Student*s){if(a.score>=b.score){*f=a;*s=b;}else{*f=b;*s=a;}}',()=>pairs(students).flatMap(([a,b])=>[false,true].map(reverse=>{
 const first=a.score>=b.score?a:b,second=a.score>=b.score?b:a;return item(`Student a=${student(a)},b=${student(b)};orderTwo(a,b,${reverse?'&b,&a':'&a,&b'});${out('Student',reverse?'b':'a')}${out('Student',reverse?'a':'b')}puts("");`,[...sv(first),...sv(second)]);
})));
add('P',11,'int patchName(Student*s,const char*n){if(strlen(n)>15)return 0;strcpy(s->name,n);return 1;}',()=>students.flatMap(s=>['','a','a'.repeat(15),'b'.repeat(16),'z'.repeat(30)].map(name=>item(
 `Student a=${student(s)};char n[31]=${JSON.stringify(name)};int ok=patchName(&a,n);printf("%d ",ok);${out('Student','a')}printf("[%s]\\n",n);`,[Number(name.length<=15),...sv({...s,name:name.length<=15?name:s.name}),`[${name}]`]))));
const bookings=[{code:0,available:0,reserved:0},{code:1,available:5,reserved:7},{code:1,available:1000000,reserved:1000000},{code:2,available:1,reserved:0}];
add('P',12,'int reserveRooms(Booking*b,int n){if(n>b->available)return 0;b->available-=n;b->reserved+=n;return 1;}',()=>bookings.flatMap(b=>[0,1,5,1000000].map(n=>item(
 `Booking b=${booking(b)};int ok=reserveRooms(&b,${n});printf("%d ",ok);${out('Booking','b')}puts("");`,[Number(n<=b.available),...bv(n<=b.available?{...b,available:b.available-n,reserved:b.reserved+n}:b)]))));
add('P',13,'int mergeBooking(Booking*d,const Booking*s){if(d==s||d->code!=s->code)return 0;d->available+=s->available;d->reserved+=s->reserved;return 1;}',()=>[
 ...pairs(bookings).map(([a,b])=>item(`Booking a=${booking(a)},b=${booking(b)};int ok=mergeBooking(&a,&b);printf("%d ",ok);${out('Booking','a')}${out('Booking','b')}puts("");`,[Number(a.code===b.code),...bv(a.code===b.code?{...a,available:a.available+b.available,reserved:a.reserved+b.reserved}:a),...bv(b)])),
 ...bookings.map(b=>item(`Booking b=${booking(b)};int ok=mergeBooking(&b,&b);printf("%d ",ok);${out('Booking','b')}puts("");`,[0,...bv(b)]))]);
add('P',14,'void splitStock(const Stock*s,int n,Stock*p,Stock*r){Stock v=*s;*p=v;*r=v;p->quantity=n;r->quantity=v.quantity-n;}',()=>stocks.flatMap(s=>[0,s.quantity,Math.floor(s.quantity/2)].flatMap(n=>[0,1,2].map(alias=>item(
 `Stock src=${stock(s)},part={0},rest={0};splitStock(&src,${n},${alias===1?'&src':'&part'},${alias===2?'&src':'&rest'});${out('Stock',alias===1?'src':'part')}${out('Stock',alias===2?'src':'rest')}puts("");`,[...kv({...s,quantity:n}),...kv({...s,quantity:s.quantity-n})])))));
add('P',15,'int receiveStock(Stock*s,Stock d){if(s->code!=d.code||s->price!=d.price)return 0;s->quantity+=d.quantity;return 1;}',()=>pairs(stocks).map(([a,b])=>{const ok=a.code===b.code&&a.price===b.price;return item(
 `Stock a=${stock(a)},b=${stock(b)};int ok=receiveStock(&a,b);printf("%d ",ok);${out('Stock','a')}${out('Stock','b')}puts("");`,[Number(ok),...kv({...a,quantity:a.quantity+(ok?b.quantity:0)}),...kv(b)]);
}));
const lineArrays=[[],[{code:1,units:0,unitCents:100,waived:0}],
 [{code:1,units:2,unitCents:100,waived:0},{code:2,units:3,unitCents:200,waived:1},{code:1,units:1,unitCents:99,waived:0}],
 [{code:0,units:1000,unitCents:1000000,waived:0},{code:0,units:1,unitCents:1000000,waived:1}],
 Array.from({length:20},(_,i)=>({code:i%3,units:1000,unitCents:1000000,waived:0}))];
const linePrefix=lineArrays.map(a=>({a:[...clone(a),{code:7,units:1000,unitCents:1000000,waived:0}],n:a.length}));
add('P',16,'long long invoiceTotal(const Line*a,int n){long long s=0;for(int i=0;i<n;i++)if(!a[i].waived)s+=(long long)a[i].units*a[i].unitCents;return s;}',()=>linePrefix.map(({a,n})=>item(
 `${array('Line','a',a,line)}printf("%lld ",invoiceTotal(a,${n}));${outputArray('Line','a',a.length)}puts("");`,[a.slice(0,n).filter(x=>!x.waived).reduce((s,x)=>s+BigInt(x.units)*BigInt(x.unitCents),0n),...a.flatMap(lv)])));
add('P',17,'int applyCoupon(Line*a,int n,int code,int discount){int count=0;for(int i=0;i<n;i++)if(a[i].code==code&&!a[i].waived){a[i].unitCents=a[i].unitCents<discount?0:a[i].unitCents-discount;count++;}return count;}',()=>linePrefix.flatMap(({a,n})=>[0,1,7,99].flatMap(code=>[0,100,1000000].map(d=>{
 const b=clone(a);let count=0;for(const x of b.slice(0,n))if(x.code===code&&!x.waived){x.unitCents=Math.max(0,x.unitCents-d);count++;}
 return item(`${array('Line','a',a,line)}int k=applyCoupon(a,${n},${code},${d});printf("%d ",k);${outputArray('Line','a',a.length)}puts("");`,[count,...b.flatMap(lv)]);
}))));
add('P',18,'int consistentInvoice(const Line*a,int n){for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)if(a[i].code==a[j].code&&a[i].unitCents!=a[j].unitCents)return 0;return 1;}',()=>linePrefix.map(({a,n})=>{
 const map=new Map();let ok=true;for(const x of a.slice(0,n)){if(map.has(x.code)&&map.get(x.code)!==x.unitCents)ok=false;map.set(x.code,x.unitCents);}
 return item(`${array('Line','a',a,line)}printf("%d ",consistentInvoice(a,${n}));${outputArray('Line','a',a.length)}puts("");`,[Number(ok),...a.flatMap(lv)]);
}));
const packages=[[],[{id:1,expiry:dates[2],count:0}],[{id:7,expiry:dates[3],count:2},{id:2,expiry:dates[2],count:3},{id:1,expiry:dates[3],count:9}],[{id:3,expiry:dates[4],count:1},{id:1,expiry:dates[4],count:7}]];
add('P',19,'int earliestPackage(const Package*a,int n,Date today,Package*out){int best=-1;for(int i=0;i<n;i++){Date d=a[i].expiry;int valid=d.year>today.year||(d.year==today.year&&(d.month>today.month||(d.month==today.month&&d.day>=today.day)));if(!a[i].count||!valid)continue;if(best<0||d.year<a[best].expiry.year||(d.year==a[best].expiry.year&&(d.month<a[best].expiry.month||(d.month==a[best].expiry.month&&d.day<a[best].expiry.day))))best=i;}if(best<0)return 0;*out=a[best];return 1;}',()=>packages.flatMap(logical=>dates.map(today=>{
 const a=[...clone(logical),{id:999,expiry:today,count:1}],old={id:77,expiry:dates[0],count:19};
 const chosen=logical.map((x,i)=>({x,i})).filter(({x})=>x.count>0&&compareDate(x.expiry,today)>=0).sort((a,b)=>compareDate(a.x.expiry,b.x.expiry)||a.i-b.i)[0]?.x;
 return item(`${array('Package','a',a,pack)}Package r=${pack(old)};Date today=${date(today)};int ok=earliestPackage(a,${logical.length},today,&r);printf("%d ",ok);${out('Package','r')}${outputArray('Package','a',a.length)}puts("");`,[Number(!!chosen),...pkv(chosen||old),...a.flatMap(pkv)]);
})));
const people=[[],[{id:1,name:'a',birth:dates[3]}],[{id:1,name:'a',birth:dates[3]},{id:1,name:'b',birth:{year:2004,month:2,day:29}},{id:9,name:'c',birth:dates[2]}]];
add('P',20,'int birthdayCount(const Person*a,int n,Date d){int k=0;for(int i=0;i<n;i++)if(a[i].birth.month==d.month&&a[i].birth.day==d.day)k++;return k;}',()=>people.flatMap(logical=>dates.map(d=>{
 const a=[...clone(logical),{id:99,name:'tail',birth:d}];return item(`${array('Person','a',a,person)}Date d=${date(d)};printf("%d ",birthdayCount(a,${logical.length},d));${outputArray('Person','a',a.length)}puts("");`,[logical.filter(p=>p.birth.month===d.month&&p.birth.day===d.day).length,...a.flatMap(pv)]);
})));
const persons=dates.map((birth,i)=>({id:i,name:i%2?'li':'a',birth}));
add('P',21,'void moveBirthday(Person*d,const Person*s){d->birth=s->birth;}',()=>[...pairs(persons).map(([a,b])=>item(
 `Person a=${person(a)},b=${person(b)};moveBirthday(&a,&b);${out('Person','a')}${out('Person','b')}puts("");`,[...pv({...a,birth:b.birth}),...pv(b)])),...persons.map(p=>item(`Person a=${person(p)};moveBirthday(&a,&a);${out('Person','a')}puts("");`,pv(p)))]);
function validYear(d,y){const x=new Date(0);x.setUTCHours(0,0,0,0);x.setUTCFullYear(y,d.month-1,d.day);return x.getUTCFullYear()===y&&x.getUTCMonth()===d.month-1&&x.getUTCDate()===d.day;}
add('P',22,'int replaceBirthYear(Person*p,int y){if(p->birth.month==2&&p->birth.day==29&&!(y%400==0||(y%4==0&&y%100!=0)))return 0;p->birth.year=y;return 1;}',()=>persons.flatMap(p=>[1,4,100,400,1900,2000,2024,9999].map(y=>{const ok=validYear(p.birth,y);return item(
 `Person a=${person(p)};int ok=replaceBirthYear(&a,${y});printf("%d ",ok);${out('Person','a')}puts("");`,[Number(ok),...pv({...p,birth:ok?{...p.birth,year:y}:p.birth})]);})));

add('P',23,'Node*findNodeId(Node*h,int id){for(;h;h=h->next)if(h->id==id)return h;return NULL;}',()=>chains.flatMap(order=>[1,7,99].map(key=>{const a=nodeInit(order),found=order.find(i=>a[i].id===key)??-1;return item(
 `${nodeBody(a)}Node*r=findNodeId(${ptr(order[0]??-1)},${key});printf("%d ",${pointerIndex('r')});${nodePrint}puts("");`,[found,...nodeOut(a)]);
})));
add('P',24,'int nodeCountPassing(const Node*h,int min){int count=0;for(;h;h=h->next)if(h->score>=min)count++;return count;}',()=>chains.flatMap(order=>[0,60,80,100].map(min=>{const a=nodeInit(order);return item(
 `${nodeBody(a)}printf("%d ",nodeCountPassing(${ptr(order[0]??-1)},${min}));${nodePrint}puts("");`,[order.filter(i=>a[i].score>=min).length,...nodeOut(a)]);
})));
add('P',25,'Node*appendDetached(Node*h,Node*item){if(!h)return item;Node*p=h;while(p->next)p=p->next;p->next=item;return h;}',()=>chains.map(order=>{
 const a=nodeInit(order),nextOrder=[...order,5],b=nodeInit(nextOrder);return item(`${nodeBody(a)}Node*r=appendDetached(${ptr(order[0]??-1)},a+5);printf("%d ",${pointerIndex('r')});${nodePrint}puts("");`,[nextOrder[0],...nodeOut(b)]);
}));
add('P',26,'Node*unlinkFirstId(Node*h,int id,Node**removed){Node*prev=NULL,*p=h;while(p&&p->id!=id){prev=p;p=p->next;}*removed=p;if(!p)return h;if(prev)prev->next=p->next;else h=p->next;p->next=NULL;return h;}',()=>chains.flatMap(order=>[1,7,99].map(key=>{
 const a=nodeInit(order),at=order.findIndex(i=>a[i].id===key),removed=at<0?-1:order[at],seq=order.filter((_,j)=>j!==at),b=nodeInit(seq);
 return item(`${nodeBody(a)}Node*removed=a+5;Node*r=unlinkFirstId(${ptr(order[0]??-1)},${key},&removed);printf("%d %d ",${pointerIndex('r')},${pointerIndex('removed')});${nodePrint}puts("");`,[seq[0]??-1,removed,...nodeOut(b)]);
})));
add('P',27,'void swapPayload(Node*a,Node*b){int id=a->id,score=a->score;a->id=b->id;a->score=b->score;b->id=id;b->score=score;}',()=>[[0,0],[0,1],[1,3],[3,4],[4,2]].map(([u,v])=>{
 const a=nodeInit([2,0,3,1,4]),b=clone(a);[b[u].id,b[v].id]=[b[v].id,b[u].id];[b[u].score,b[v].score]=[b[v].score,b[u].score];
 return item(`${nodeBody(a)}swapPayload(a+${u},a+${v});${nodePrint}puts("");`,nodeOut(b));
}));
add('P',28,'int appendUniqueId(Node**h,Node*item){Node*p=*h,*last=NULL;for(;p;p=p->next){if(p->id==item->id)return 0;last=p;}if(last)last->next=item;else *h=item;return 1;}',()=>chains.flatMap(order=>[1,7,999].map(key=>{
 const a=nodeInit(order);a[5].id=key;const ok=!order.some(i=>a[i].id===key),seq=ok?[...order,5]:order,b=clone(a);
 if(ok&&order.length)b[order.at(-1)].next=5;
 return item(`${nodeBody(a)}Node*head=${ptr(order[0]??-1)};int ok=appendUniqueId(&head,a+5);printf("%d %d ",ok,${pointerIndex('head')});${nodePrint}puts("");`,[Number(ok),seq[0]??-1,...nodeOut(b)]);
})));
add('P',29,'int moveFirstId(Node**from,Node**to,int id){Node*prev=NULL,*p=*from;while(p&&p->id!=id){prev=p;p=p->next;}if(!p)return 0;if(prev)prev->next=p->next;else *from=p->next;p->next=*to;*to=p;return 1;}',()=>[[[],[]],[[2,0,3],[1,4]],[[1,3],[]],[[],[0,2]],[[0],[1]]].flatMap(([from,to])=>[1,2,7,99].map(key=>{
 const a=nodeInit(from,to),at=from.findIndex(i=>a[i].id===key),selected=at<0?-1:from[at],f=from.filter((_,i)=>i!==at),t=at<0?to:[selected,...to],b=nodeInit(f,t);
 return item(`${nodeBody(a)}Node*f=${ptr(from[0]??-1)},*t=${ptr(to[0]??-1)};int ok=moveFirstId(&f,&t,${key});printf("%d %d %d ",ok,${pointerIndex('f')},${pointerIndex('t')});${nodePrint}puts("");`,[Number(at>=0),f[0]??-1,t[0]??-1,...nodeOut(b)]);
})));

export const cRecordsContractIds=[...registry.keys()];
export const cRecordsReferenceSources=Object.freeze(sources);
export function cRecordsContract(key){
 const build=registry.get(key);if(!build)return null;
 const q=bank.find(q=>q.id===key),tests=build(),groups=tests.map(t=>t.out.map(String));
 const nodeHelper=q.recordType==='Node'?'static int cr_node_index(const Node*a,int n,const Node*p){if(!p)return -1;for(int i=0;i<n;i++)if(p==a+i)return i;return -2;}\n':'';
 return {prelude:'#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n'+q.structDefinition+'\n',
  harness:'\n'+nodeHelper+tests.map((t,i)=>`static void cr_case_${i}(void){${t.body}}`).join('\n')+'\nint main(void){'+tests.map((_,i)=>`cr_case_${i}();`).join('')+'return 0;}\n',groups,expected:groups.flat()};
}
export const cRecordsChoiceProbes=bank.filter(q=>q.trace).map(q=>({id:q.id,
 source:'#include <stdio.h>\n#include <string.h>\n#include <stdlib.h>\n'+q.stem.match(/```c\n([\s\S]*?)\n```/)[1],
 stdin:q.stem.startsWith('输入为83.5')?'83.5\n':'',expected:q.options[q.answer]}));
