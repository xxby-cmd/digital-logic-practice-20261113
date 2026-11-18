import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {cRecordsPractice} from '../bank-c-records.js';
import {cRecordsGuides} from '../c-records-guides.js';
import {cRecordsContractIds,cRecordsContract,cRecordsReferenceSources,cRecordsChoiceProbes} from '../scripts/judge-c-records.mjs';
import {grade,normalize} from '../grading.js';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
import {getPracticeCourse} from '../practice-library.js';
const bank=cRecordsPractice.programming,id=(tag,n)=>`C6R-programming-9-${tag}-${String(n).padStart(3,'0')}`;
const root=fileURLToPath(new URL('../',import.meta.url));
const evidence=fileURLToPath(new URL('../../制作记录/并行扩题/C结构体/',import.meta.url));

test('C9结构体100原创：56选择、15填空、29编程及有据权重',()=>{
 assert.equal(bank.length,100);assert.equal(new Set(bank.map(q=>q.id)).size,100);
 assert.equal(bank.filter(q=>q.type==='single').length,56);assert.equal(bank.filter(q=>q.section==='程序填空').length,15);
 assert.equal(bank.filter(q=>q.section==='编程题').length,29);assert.equal(bank.filter(q=>q.coding).length,44);
 assert.equal(new Set(bank.map(q=>normalize(q.stem))).size,100);
 const old=getPracticeCourse('programming').questions.filter(q=>!q.id.startsWith('C6R-'));
 for(const q of bank){
  assert.equal(q.chapter,9);assert.equal(q.origin,'原创');assert.equal(q.pool,'practice');
  assert.ok(q.mechanism?.length>3,q.id);assert.ok(q.studyEvidence.includes('9 结构体.pdf'));
  assert.equal(q.studyWeight,{core:3,basic:2,supplement:1}[q.studyLevel]);
  assert.ok(!old.some(x=>x.id===q.id||normalize(x.stem)===normalize(q.stem)),q.id);
  assert.ok(!/上一题|同上|沿用前题/.test(q.stem),q.id);
  if(q.type==='single'){
   assert.equal(q.options.length,4);assert.equal(new Set(q.options.map(normalize)).size,4,q.id);
   for(let i=0;i<4;i++)assert.equal(grade(q,i).correct,i===q.answer,q.id);
  }
 }
 assert.ok(bank.filter(q=>q.studyLevel!=='supplement').length>=80);
 assert.equal(cRecordsChoiceProbes.length,37);
});
test('44接口：公有typedef与private prelude相同，完整提交壳与分组预算自洽',()=>{
 const code=bank.filter(q=>q.coding);assert.deepEqual(cRecordsContractIds,code.map(q=>q.id));
 assert.deepEqual(Object.keys(cRecordsGuides),code.map(q=>q.id));
 for(const q of code){
  const g=cRecordsGuides[q.id],c=cRecordsContract(q.id),source=cRecordsReferenceSources[q.id];
  assert.ok(g.instruction.includes(q.structDefinition),q.id);assert.ok(c.prelude.includes(q.structDefinition),q.id);
  assert.ok(g.starter.startsWith(q.signature),q.id);assert.ok(c.groups.length>=5,q.id);
  assert.deepEqual(c.expected,c.groups.flat(),q.id);assert.ok(c.groups.every(g=>g.length>0),q.id);
  assert.ok(Buffer.byteLength(source)<=32768);assert.ok(Buffer.byteLength(c.prelude+source+c.harness)<=262144);
  const stdout=c.groups.map(g=>g.join(' ')).join('\n')+'\n';
  assert.equal(evaluateContract({status:'ran',stdout},c).status,'accepted',q.id);
  assert.equal(evaluateContract({status:'ran',stdout:stdout+'999\n'},c).status,'wrong_answer',q.id);
 }
 assert.equal(cRecordsContract('unknown'),null);
});
test('多字段/内存/别名边界具备可见约定及实际反例',()=>{
 assert.ok(cRecordsContract(id('B',3)).harness.includes("a.name[15]='x'"));
 assert.ok(cRecordsContract(id('B',10)).expected.includes('1000000000000'));
 assert.ok(cRecordsContract(id('P',16)).expected.includes('20000000000'));
 assert.ok(bank.find(q=>q.id===id('P',3)).stem.includes('不要求清理删除后尾部'));
 assert.ok(bank.find(q=>q.id===id('P',14)).stem.includes('s可与其中一个输出相同'));
 assert.ok(cRecordsContract(id('P',14)).harness.includes('&src,&rest'));
 assert.ok(cRecordsContract(id('P',14)).harness.includes('&part,&src'));
 assert.ok(cRecordsContract(id('P',8)).harness.includes('tail'));
 assert.ok(cRecordsContract(id('P',4)).harness.includes('unused'));
 assert.ok(cRecordsContract(id('P',25)).harness.includes('Node a[9]'));
 for(const n of [3,4])assert.ok(bank.find(q=>q.id===id('P',n)).stem.includes('独立长度变量'));
 assert.ok(cRecordsContract(id('P',18)).harness.includes('consistentInvoice(a,1)'));
 for(const q of bank.filter(q=>q.recordType==='Node'))assert.ok(q.stem.includes('不分配或释放结点'));
});
function run(key,source){
 const c=cRecordsContract(key),p=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{cwd:root,
  input:JSON.stringify({source,prelude:c.prelude,harness:c.harness,stdin:''}),encoding:'utf8',
  env:{...process.env,PYTHONIOENCODING:'utf-8'},timeout:30000,windowsHide:true});
 assert.equal(p.error,undefined);assert.equal(p.status,0,p.stderr);
 const raw=JSON.parse(p.stdout);return {id:key,...evaluateContract(raw,c),...(raw.status!=='ran'?{detail:raw.stderr||raw.message}:{})};
}
// Each mutation targets its question's actual record/interface invariant.
const mutations=[
 ['B',1,'s.id=id;','s.score=id;'],
 ['B',2,'*d=*s;','d->id=s->id;d->score=s->score;'],
 ['B',3,'return a.id==b.id&&a.score==b.score&&strcmp(a.name,b.name)==0;','return memcmp(&a,&b,sizeof a)==0;'],
 ['B',4,'strcpy(s->name,n);','strcpy(s->name,n);s->id=0;'],
 ['B',5,null,'void swapStudent(Student*a,Student*b){int t=a->score;a->score=b->score;b->score=t;}'],
 ['B',6,'a.score>b.score','a.score<b.score'],
 ['B',7,'x>100?100:x','x>100?0:x'],
 ['B',8,null,'int updateFirstId(Student*a,int n,int id,int score){int found=0;for(int i=0;i<n;i++)if(a[i].id==id){a[i].score=score;found=1;}return found;}'],
 ['B',9,'strcmp(a[i].name,name)==0','a[i].name==name'],
 ['B',10,'(long long)s.quantity*s.price','(long long)(s.quantity*s.price)'],
 ['B',11,'amount>s->quantity','amount>=s->quantity'],
 ['B',12,'if(h->id==id)n++;','if(h->id==id)return 1;'],
 ['B',13,'tail->next=item;','*tail=*item;'],
 ['B',14,'if(!n)return 0;','if(!n){memset(out,0,sizeof *out);return 0;}'],
 ['B',15,null,'int compareDate(Date a,Date b){int x=a.year+a.month+a.day,y=b.year+b.month+b.day;return (x>y)-(x<y);}'],
 ['P',1,'strcpy(s.name,name);','s.name[0]=0;'],
 ['P',2,'a[i]=v;','a[i].score=v.score;'],
 ['P',3,null,'int eraseFirstId(Student*a,int*n,int id){int k=0,found=0;for(int i=0;i<*n;i++){if(a[i].id==id)found=1;else a[k++]=a[i];}*n=k;return found;}'],
 ['P',4,'for(int i=*n;i>k;i--)a[i]=a[i-1];','for(int i=k;i<*n;i++)a[i+1]=a[i];'],
 ['P',5,'a[i].id<a[best].id','a[i].id<=a[best].id'],
 ['P',6,'a[i].score=u[j].score;','a[i]=u[j];'],
 ['P',7,'&&a[i].name[0]',''],
 ['P',8,'a[j-1].id>v.id','a[j-1].id>=v.id'],
 ['P',9,'(*count)++;*total+=a[i].score;','(*count)++;*total+=a[i].score;break;'],
 ['P',10,'if(a.score>=b.score)','if(a.score>b.score)'],
 ['P',11,'strlen(n)>15','strlen(n)>16'],
 ['P',12,'b->reserved+=n;',''],
 ['P',13,'d==s||',''],
 ['P',14,null,'void splitStock(const Stock*s,int n,Stock*p,Stock*r){*p=*s;p->quantity=n;*r=*s;r->quantity=s->quantity-n;}'],
 ['P',15,'||s->price!=d.price',''],
 ['P',16,'if(!a[i].waived)','if(a[i].waived)'],
 ['P',17,'&&!a[i].waived',''],
 ['P',18,'a[i].code==a[j].code&&',''],
 ['P',19,'d.day>=today.day','d.day>today.day'],
 ['P',20,'a[i].birth.month==d.month&&a[i].birth.day==d.day','a[i].birth.year==d.year&&a[i].birth.month==d.month&&a[i].birth.day==d.day'],
 ['P',21,'d->birth=s->birth;','*d=*s;'],
 ['P',22,null,'int replaceBirthYear(Person*p,int y){p->birth.year=y;return 1;}'],
 ['P',23,null,'Node*findNodeId(Node*h,int id){Node*last=NULL;for(;h;h=h->next)if(h->id==id)last=h;return last;}'],
 ['P',24,'h->score>=min','h->score>min'],
 ['P',25,'return h;','return item;'],
 ['P',26,'p->next=NULL;',''],
 ['P',27,null,'void swapPayload(Node*a,Node*b){Node t=*a;*a=*b;*b=t;}'],
 ['P',28,'if(p->id==item->id)','if(p==item)'],
 ['P',29,'p->next=*to;*to=p;','p->next=NULL;if(!*to)*to=p;else{Node*q=*to;while(q->next)q=q->next;q->next=p;}']
];
const boundaryMutations=[
 [18,cRecordsReferenceSources[id('P',18)].replace('j<n','j<=n')],
 [26,'Node*unlinkFirstId(Node*h,int id,Node**removed){Node*prev=NULL,*p=h;while(p&&p->id!=id){prev=p;p=p->next;}if(!p||(prev&&!p->next)){*removed=NULL;return h;}*removed=p;if(prev)prev->next=p->next;else h=p->next;p->next=NULL;return h;}'],
 [29,'int moveFirstId(Node**from,Node**to,int id){Node*prev=NULL,*p=*from;while(p&&p->id!=id){prev=p;p=p->next;}if(!p||(prev&&!p->next))return 0;if(prev)prev->next=p->next;else *from=p->next;p->next=*to;*to=p;return 1;}']
];
test('真实C17：所选题参考、典型错解和等价记录实现，逐份串行',{
 skip:process.env.JUDGE_RUNTIME!=='1',timeout:600000
},()=>{
 assert.ok(process.env.JUDGE_PYTHON);assert.equal(mutations.length,44);
 const selected=process.env.C_RECORDS_TARGETS?process.env.C_RECORDS_TARGETS.split(','):cRecordsContractIds;
 const wanted=new Set(selected);for(const key of selected)assert.ok(cRecordsContractIds.includes(key),key);
 const results=[];
 const check=(key,source,kind)=>{const r={kind,...run(key,source),sourceSha256:createHash('sha256').update(source).digest('hex'),...(kind==='boundary-error'?{source}:{})};results.push(r);return r;};
 try{
  for(const key of selected){const r=check(key,cRecordsReferenceSources[key],'reference');assert.equal(r.status,'accepted',JSON.stringify(r));}
  for(const [tag,n,before,after]of mutations){
   const key=id(tag,n);if(!wanted.has(key))continue;const reference=cRecordsReferenceSources[key];if(before)assert.ok(reference.includes(before),key);
   const r=check(key,before?reference.replace(before,after):after,'typical-error');
   assert.ok(['wrong_answer','runtime_error','time_limit'].includes(r.status),JSON.stringify(r));
  }
  for(const [n,source]of boundaryMutations){
   const key=id('P',n);if(!wanted.has(key))continue;
   const r=check(key,source,'boundary-error');assert.equal(r.status,'wrong_answer',JSON.stringify(r));
  }
  const alternatives=[
   [id('B',2),'void copyStudent(Student*d,const Student*s){memmove(d,s,sizeof *d);}'],
   [id('B',3),'int sameStudent(Student a,Student b){if(a.id!=b.id||a.score!=b.score)return 0;int i=0;while(a.name[i]&&a.name[i]==b.name[i])i++;return a.name[i]==b.name[i];}'],
   [id('B',15),'int compareDate(Date a,Date b){int x=a.year*10000+a.month*100+a.day,y=b.year*10000+b.month*100+b.day;return (x>y)-(x<y);}'],
   [id('P',8),'void sortRoster(Student*a,int n){for(int end=n-1;end>0;end--)for(int i=0;i<end;i++)if(a[i].score<a[i+1].score||(a[i].score==a[i+1].score&&a[i].id>a[i+1].id)){Student t=a[i];a[i]=a[i+1];a[i+1]=t;}}'],
   [id('P',14),'void splitStock(const Stock*s,int n,Stock*p,Stock*r){Stock first=*s,second=*s;first.quantity=n;second.quantity-=n;*p=first;*r=second;}'],
   [id('P',26),'Node*unlinkFirstId(Node*h,int id,Node**removed){Node**link=&h;while(*link&&(*link)->id!=id)link=&(*link)->next;Node*p=*link;*removed=p;if(p){*link=p->next;p->next=NULL;}return h;}']
  ];
  for(const [key,source]of alternatives){if(!wanted.has(key))continue;const r=check(key,source,'equivalent');assert.equal(r.status,'accepted',JSON.stringify(r));}
 }finally{
  mkdirSync(evidence,{recursive:true});
  const hashes=Object.fromEntries(['bank-c-records.js','c-records-guides.js','scripts/judge-c-records.mjs','tests/c-records.test.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(root+p)).digest('hex')]));
  writeFileSync(evidence+(process.env.C_RECORDS_REPORT||(process.env.C_RECORDS_TARGETS?'链表输入上界定向复核.json':'44代码题真实核验.json')),JSON.stringify({time:new Date().toISOString(),contracts:selected.length,allContracts:44,selectedIds:selected,
   groups:selected.reduce((s,k)=>s+cRecordsContract(k).groups.length,0),sourceHashes:hashes,
   boundaries:['typedef公私一致；不重复定义。','前缀n独立于物理存储，失败与别名按题意。','字符串按内容比较，未用尾区和结构填充不作统一相等条件。','Node原地址/数据与next分别核验，不分配释放系统结点。'],
   limitations:['有限测试不证明复杂度或要求的源码写法。','本模块就绪不等于主线已构建入库。'],results},null,2));
 }
});
