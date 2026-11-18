import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/linear-list-quality-20261118.json',import.meta.url),'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const original=new Map(fixture.originalQuestions.map(q=>[q.id,q]));
const latest=new Map(getPracticeCourse('structures').questions.map(q=>[q.id,q]));
// Only these two prior revision-2 questions now have revision-3 fill formats.
const structuredFillHistory={'P2-structures-2-9':2,'P4-structures-2-F-002':2};
const historicalFormats=new Map(getPracticeCourse('structures',{questionRevisions:structuredFillHistory}).questions.map(q=>[q.id,q]));
const candidate=new Map(fixture.candidates.map(c=>[c.id,c]));
const p2=n=>`P2-structures-2-${n}`,j=n=>`P4-structures-2-J-${String(n).padStart(3,'0')}`,s=n=>`P4-structures-2-S-${String(n).padStart(3,'0')}`,f=n=>`P4-structures-2-F-${String(n).padStart(3,'0')}`,a=n=>`P4-structures-2-A-${String(n).padStart(3,'0')}`;
const q=id=>original.get(id),checked=new Set(),observations=[];
function revised(id){const c=candidate.get(id),historical=structuredFillHistory[id],actual=(historical===undefined?latest:historicalFormats).get(id);assert.ok(c&&actual,id);if(historical!==undefined)assert.equal(c.targetRevision,historical,id+'历史读取必须仍是该夹具所审版本');assert.equal(actual.revision,c.targetRevision,id+'必须读取真实所审版本，不能回退候选');assert.deepEqual(actual,c.question,id+(historical===undefined?'必须核真实默认新版全部字段':'必须核明确旧2版全部字段'));return actual;}
function select(question,label,reason){const indices=question.options.flatMap((v,i)=>v===label?[i]:[]);assert.equal(indices.length,1,question.id+'唯一正确语义选项 '+label);for(let i=0;i<question.options.length;i++)assert.equal(grade(question,i).correct,i===indices[0],question.id);checked.add(question.id);observations.push({id:question.id,revision:question.revision??1,stemSha256:hash(question.stem),derived:label,reason});}
function fill(question,answer,reason,wrong){const values=answer.map(String);assert.equal(grade(question,values).correct,true,question.id+'独算 '+values);if(wrong)assert.equal(grade(question,wrong.map(String)).correct,false,question.id+'典型错因');checked.add(question.id);observations.push({id:question.id,revision:question.revision??1,stemSha256:hash(question.stem),derived:values,reason});}
function match(text,regex,label){const m=text.match(regex);assert.ok(m,label+'公开条件未匹配');return m;}
const nums=text=>[...text.matchAll(/\d+/g)].map(m=>Number(m[0]));
const list=text=>text.split(',').map(Number);
function polynomial(text){const result=new Map();for(const term of text.replace(/[−–]/g,'-').replace(/-/g,'+-').split('+').filter(Boolean)){const m=match(term,/^([+-]?\d*)(x(?:\^(\d+))?)?$/,'多项式项');const coefficient=m[1]===''?1:m[1]==='-'?-1:Number(m[1]),exponent=m[2]?m[3]?Number(m[3]):1:0;result.set(exponent,(result.get(exponent)||0)+coefficient);}return result;}
function adjacentCompress(values){return values.filter((v,i)=>i===0||v!==values[i-1]);}
function candidateSingleConcepts(){return {'P-S-01':'前驱的next及后继的prev',[j(7)]:'正确',[j(11)]:'正确',[j(14)]:'正确',[s(6)]:'s->prev=q; s->next=p; q->next=s; p->prev=s;',[s(10)]:'顺序存储',[s(13)]:'数组下标或游标',[s(16)]:'链接字段的存储开销',[s(17)]:'每个原有不同值保留一次且仍有序'};}

test('便携夹具80原创及24上一轮修订锁定，仅两道格式升级题显式读取旧2版',()=>{
 assert.equal(fixture.authorityHtmlSha256,'f4cd9e12ce7679cdb273ab4bfa769004e1ba581bd8034e21c785d75e0d14b29d');
 assert.equal(fixture.originalQuestions.length,80);assert.equal(fixture.candidates.length,24);assert.ok(fixture.originalQuestions.every(q=>!q.reference&&!q.id.startsWith('YAN-')));assert.ok(fixture.candidates.every(c=>!c.question.reference&&!c.id.startsWith('YAN-')));
 assert.equal(hash(fixture.originalQuestions),'c4892f8ffa538a12423099a3d2cd2517b849248deb89a73e18afe3fa6821e8ed');
 assert.equal(hash(fixture.candidates),'ec77df6c1a17132c822a315e88fd628f8e3aaa1ff4ccab8a64f78e37041ebc41');
 const revisions=Object.fromEntries(fixture.originalQuestions.map(q=>[q.id,q.revision??1]));const historical=new Map(getPracticeCourse('structures',{questionRevisions:revisions}).questions.map(q=>[q.id,q]));
 for(const item of fixture.originalQuestions){assert.deepEqual(historical.get(item.id),item,item.id+'原字段/历史版本');const row=fixture.ledger.find(x=>x.id===item.id);assert.ok(row&&row.mechanism&&row.independentCheck);assert.equal(hash(item),row.questionSha256);}
 const explicitlyHistorical=[];
 for(const c of fixture.candidates){assert.deepEqual(c.previous,original.get(c.id));assert.equal(c.targetRevision,c.baseRevision+1);assert.equal(c.question.id,c.id);assert.equal(c.question.type,c.previous.type);assert.equal(c.question.chapter,2);assert.equal(c.question.revision,c.targetRevision);if(Object.hasOwn(structuredFillHistory,c.id))explicitlyHistorical.push(c.id);revised(c.id);}
 assert.deepEqual(explicitlyHistorical.sort(),Object.keys(structuredFillHistory).sort(),'历史读取仅覆盖本轮实际升级的两道旧2版');
});

test('20判断独立概念审读后核实际选项/grade，保留关键约束而非数字归一粗删',()=>{
 const truth=[false,true,false,true,true];truth.forEach((v,i)=>select(q(p2(i+1)),v?'正确':'错误',fixture.ledger.find(x=>x.id===p2(i+1)).independentCheck));
 const later=[false,false,true,false,false,true,true,false,true,false,false,true,false,true,false];later.forEach((v,i)=>select(q(j(i+1)),v?'正确':'错误',fixture.ledger.find(x=>x.id===j(i+1)).independentCheck));
 const first={data:1},second={data:2};first.next=second;second.next=first;assert.notEqual(first.next,null);assert.equal(first.next.next,first);
});

test('25选择的原题选项绑定，连续插入、地址、平均成本及项数由题面计算',()=>{
 let question=q('2-01'),values=list(match(question.stem,/初始为\(([^)]+)\)/,'初始表')[1]),moves=0;for(const m of question.stem.matchAll(/ListInsert\(L,(\d+),(\d+)\)/g)){const position=Number(m[1]),value=Number(m[2]);moves+=values.length-(position-1);values.splice(position-1,0,value);}select(question,String(moves),{after:values,moves});
 const labels={'P-S-01':'前驱的next及后继的prev',[p2(6)]:'s->next=head->next; head->next=s;',[p2(7)]:'n-k-1',[p2(8)]:'C B A',[s(2)]:'n-i+1',[s(3)]:'0',[s(4)]:'(n-1)/2',[s(5)]:'s->next=h; h=s;',[s(6)]:'s->next=p->next; p->next=s;',[s(7)]:'q的后继地址',[s(8)]:'head->next==head',[s(9)]:'h->next=h且h->prev=h',[s(10)]:'顺序存储',[s(11)]:'查找尾结点',[s(12)]:'p->next=r; r->prev=p;',[s(13)]:'数组下标或游标',[s(14)]:'报告失败并保持原表内容有效',[s(15)]:'O(m+n)',[s(16)]:'链接字段的存储开销',[s(17)]:'每个原有不同值保留一次且仍有序',[s(18)]:'尚未搬移的原值被覆盖',[s(19)]:'含悬空指针'};
 for(const [id,label]of Object.entries(labels))select(q(id),label,fixture.ledger.find(x=>x.id===id).independentCheck);
 question=q(s(1));let m=match(question.stem,/起始地址为(\d+).*每个元素占(\d+)字节.*a\[(\d+)\]/,'地址数据');select(question,String(Number(m[1])+Number(m[2])*Number(m[3])),'基址+下标×跨度');
 question=q(s(20));const terms=polynomial(match(question.stem,/表示(.+)时/,'多项式')[1]);select(question,String([...terms.values()].filter(v=>v!==0).length),Object.fromEntries(terms));
 for(let n=1;n<=20;n++){const shift=Array.from({length:n},(_,i)=>n-i-1);assert.equal(shift.reduce((a,b)=>a+b,0)/n,(n-1)/2);}
});

test('18原填空逐题独算，位序/下标、循环边界和已有普通等价答案核grade',()=>{
 fill(q(p2(9)),['head->next==NULL'],'辅助头存在而无首数据',['head==NULL']);let question=q(p2(10)),deletion=match(question.stem,/长度(\d+)，删除下标(\d+)/,'删除的长度与位置'),[n,index]=deletion.slice(1).map(Number);fill(question,[n-index-1],'删除后缀项数',[n-index]);
 fill(q(p2(11)),['O(m)','O(1)'],'每结点固定处理、常数指针',['O(m²)','O(m)']);assert.equal(grade(q(p2(11)),['Θ(m)','Θ(1)']).correct,true);
 question=q(f(1));let [size,ordinal]=nums(question.stem);fill(question,[size-ordinal],'1起位序后缀',[size-ordinal+1]);
 question=q(f(2));[size,ordinal]=nums(question.stem);fill(question,[size-ordinal+1],'插入前i..n后移',[size-ordinal]);
 fill(q(f(3)),['n/2'],'0..n等可能的均值',['(n-1)/2']);fill(q(f(4)),['NULL'],'无头空表没有首数据',['head']);fill(q(f(5)),['next'],'head之后首元',['data']);fill(q(f(6)),['NULL'],'非循环尾无后继',['p']);
 question=q(f(7));[size,ordinal]=nums(question.stem);let hops=0;for(let p=1;p<ordinal;p++)hops++;fill(question,[hops],'从首数据起，不把起点算一条边',[ordinal]);
 question=q(f(8));let address=match(question.stem,/基地址为(\d+).*每项(\d+)字节.*第(\d+)个/,'1起位序寻址'),[base,width,position]=address.slice(1).map(Number);fill(question,[base+(position-1)*width],'第i项是下标i-1',[base+position*width]);
 fill(q(f(9)),[1+1],'一个辅助头+一个数据结点',[1]);question=q(f(10));size=nums(question.stem)[0];const nodes=Array.from({length:size},()=>({}));nodes.forEach((x,i)=>x.next=nodes[(i+1)%size]);let p=nodes[0];hops=0;do{p=p.next;hops++;}while(p!==nodes[0]);fill(question,[hops],'沿实际对象环首次回起点',[size-1]);
 question=q(f(11));let [cap,length]=nums(question.stem);fill(question,[cap-length],'真实剩余容量',[cap]);
 question=q(f(12));let m=match(question.stem,/A=\(([^)]+)\)、B=\(([^)]+)\)/,'归并数据');fill(question,[[...list(m[1]),...list(m[2])].sort((a,b)=>a-b).join(',')],'独立多重集排序保重',['1,2,4,6,7']);
 question=q(f(13));const parts=match(question.stem,/多项式\(([^)]+)\)\+\(([^)]+)\)/,'相加多项式'),total=new Map();for(const expr of parts.slice(1))for(const [exp,c]of polynomial(expr))total.set(exp,(total.get(exp)||0)+c);fill(question,[[...total.values()].filter(v=>v!==0).length],Object.fromEntries(total),[3]);
 fill(q(f(14)),['尾'],'有后继才继续，停在尾而非NULL',['首']);fill(q(f(15)),['原q结点'],'p/q复制地址后变量独立',['新q结点']);
});

test('上一轮24修订客观题求解绑定真实所审2版，分式/括号等价必须真实grade',()=>{
 for(const [id,label]of Object.entries(candidateSingleConcepts()))select(revised(id),label,candidate.get(id).independentCheck);
 select(revised(p2(8)),'C B A','明确空初态下依次头插');
 for(const value of revised(p2(9)).answers[0])assert.equal(grade(revised(p2(9)),[value]).correct,true);fill(revised(p2(9)),['!(head->next)'],'常见等价C判空',['head==NULL']);
 let question=revised(p2(10)),data=match(question.stem,/数据依次为([\d、]+)/,'ASL数据')[1].split('、').map(Number),probabilities=[...question.stem.matchAll(/(\d+)\/(\d+)/g)].map(m=>Number(m[1])/Number(m[2]));assert.equal(data.length,probabilities.length);assert.equal(probabilities.reduce((a,b)=>a+b,0),1);const expected=probabilities.reduce((sum,p,i)=>sum+p*(i+1),0);fill(question,[expected],{data,probabilities},[2]);for(const value of ['7/4','+1.750','１．７５'])assert.equal(grade(question,[value]).correct,true);assert.equal(grade(question,['7/3']).correct,false);
 question=revised(s(12));let location=match(question.stem,/有(\d+)个数据结点.*第(\d+)个数据结点/,'双向定位'),[count,wanted]=location.slice(1).map(Number);const header={},nodes=Array.from({length:count},()=>({})),ring=[header,...nodes];ring.forEach((x,i)=>{x.next=ring[(i+1)%ring.length];x.prev=ring[(i+ring.length-1)%ring.length];});const distances=['next','prev'].map(field=>{let p=header,steps=0;while(p!==nodes[wanted-1]){p=p[field];steps++;}return steps;});select(question,String(Math.min(...distances)),{distances});
 question=revised(s(18));assert.match(question.stem,/每轮.+记1次/);assert.match(question.stem,/一表耗尽后直接接上/);for(let m=1;m<=5;m++)for(let n=1;n<=5;n++){let maximum=0;function split(i,aa,bb){if(i===m+n){if(aa.length!==m||bb.length!==n)return;let x=0,y=0,comp=0;while(x<m&&y<n){comp++;if(aa[x]<bb[y])x++;else y++;}maximum=Math.max(maximum,comp);return;}if(aa.length<m)split(i+1,[...aa,i],bb);if(bb.length<n)split(i+1,aa,[...bb,i]);}split(0,[],[]);assert.equal(maximum,m+n-1);}select(question,'m+n-1','独立枚举互异键的所有两表分配');
 question=revised(f(2));let m=match(question.stem,/A=\(([^)]+)\)、B=\(([^)]+)\)/,'集合并'),result=list(m[1]);for(const value of list(m[2]))if(!new Set(result).has(value))result.push(value);fill(question,[result.join(',')],'不排序，B中仅新值追加',['1,2,4,7,9']);
 for(const value of revised(f(3)).answers[0])assert.equal(grade(revised(f(3)),[value]).correct,true);fill(revised(f(3)),['0.5*n'],'数学表达式等价',['(n-1)/2']);
 for(const n of [4,6]){question=revised(f(n));fill(question,['0'],'抽象空指针概念，不声称nullptr为C17源码',['1']);assert.equal(grade(question,['空指针']).correct,true);}
 question=revised(f(13));const groups=[...question.stem.matchAll(/\[([^\]]+)\]/g)].map(m=>[...m[1].matchAll(/\((-?\d+),(\d+)\)/g)].map(m=>[Number(m[1]),Number(m[2])])),product=new Map();assert.equal(groups.length,2);for(const [ac,ae]of groups[0])for(const [bc,be]of groups[1])product.set(ae+be,(product.get(ae+be)||0)+ac*bc);fill(question,[[...product.values()].filter(v=>v!==0).length],Object.fromEntries(product),[2]);
 question=revised(f(15));assert.match(question.stem,/q原先指向有效结点/);fill(question,['原q结点'],'复制地址不绑定变量后续取值',['新q结点']);
});

test('原12非代码简答的关键轨迹/边界独解，候选四题不强加题外评分',()=>{
 const buggy=[{data:3},{data:3}];buggy[0].next=buggy[1];buggy[1].next=null;const head={next:buggy[0]};let p=head;while(p.next!==null){let r=p.next;if(r.data===3)p.next=r.next;p=p.next;}assert.equal(head.next,buggy[1]);const only={next:{data:3,next:null}};p=only;assert.throws(()=>{while(p.next!==null){let r=p.next;if(r.data===3)p.next=r.next;p=p.next;}},TypeError);assert.match(q('2-02').model,/连续命中/);
 let chain=[3,6,9],insert=5;chain.splice(1,0,insert);assert.deepEqual(chain,[3,5,6,9]);assert.match(q(p2(12)).model,/自环/);assert.match(q(p2(13)).model,/定位|遍历/);
 assert.ok(!q(p2(14)).stem.includes('互不共享'));assert.match(revised(p2(14)).stem,/数据结点互不共享/);assert.ok(!revised(p2(14)).rubric.join('').includes('头结点管理'));
 for(let n=1;n<=30;n++){let one=0,doubled=0,capacity=1;for(let i=1;i<n;i++){one+=i;if(i===capacity){doubled+=capacity;capacity*=2;}}assert.equal(one,n*(n-1)/2);assert.ok(doubled<2*n);}assert.match(q(a(2)).model,/均摊/);
 const shared={alive:true},first={next:shared},second={next:shared};shared.alive=false;assert.equal(second.next.alive,false);assert.match(q(a(3)).model,/重复释放/);
 const h={},nodes=[{},{},{}];[h,...nodes].forEach((node,i,all)=>node.next=all[(i+1)%all.length]);const visited=[];for(let p=h.next;p!==h;p=p.next)visited.push(p);assert.equal(visited.length,3);assert.match(q(a(4)).model,/p!=head/);
 let values=[2,5,5,5,8],positions=values.flatMap((v,i)=>v===5?[i+1]:[]);assert.deepEqual(positions,[2,3,4]);assert.match(q(a(5)).model,/第2、3、4/);
 const sum=new Map();for(const [c,e]of [[6,4],[2,1],[-6,4],[3,2]])sum.set(e,(sum.get(e)||0)+c);assert.deepEqual([...sum].filter(([,c])=>c!==0).sort((a,b)=>b[0]-a[0]),[[2,3],[1,2]]);assert.match(q(a(6)).model,/系数为0/);
 let wrong=[10,20,30,40,0];for(let i=1;i<=3;i++)wrong[i+1]=wrong[i];assert.deepEqual(wrong,[10,20,20,20,20]);assert.match(revised(a(7)).stem,/容量至少为5/);assert.deepEqual(revised(a(7)).rubric,['追踪覆盖得10,20,20,20,20','指出后向搬移避免读源被覆盖']);assert.match(q(a(8)).stem,/失败时表必须不变/);
 let question=revised(a(1)),m=match(question.stem,/A=\(([^)]+)\)、B=\(([^)]+)\)、C=\(([^)]+)\)/,'三表数据'),aa=list(m[1]),bb=new Set(list(m[2])),cc=new Set(list(m[3])),and=aa.filter(v=>!(bb.has(v)&&cc.has(v))),or=aa.filter(v=>!(bb.has(v)||cc.has(v)));assert.deepEqual(and,[4,5,7]);assert.deepEqual(or,[5]);assert.ok(question.model.includes(and.join(',')));
 question=revised(a(3));values=match(question.stem,/依次为([\d,]+)。/,'无序链').slice(1)[0].split(',').map(Number);assert.deepEqual(adjacentCompress(values),[2,1,2]);assert.deepEqual([...new Set(values)],[2,1]);assert.ok(question.rubric.every(r=>!/O\(|辅助空间/.test(r)));
});

test('63原客观题全部经过实际grade，夹具无本地参考依赖；可选证据显式指定',()=>{
 assert.deepEqual([...checked].filter(id=>original.get(id)?.type!=='short').sort(),fixture.originalQuestions.filter(q=>q.type!=='short').map(q=>q.id).sort());assert.equal(fixture.originalQuestions.filter(q=>q.type!=='short').length,63);
 if(process.env.LINEAR_LIST_QUALITY_OUTPUT)writeFileSync(process.env.LINEAR_LIST_QUALITY_OUTPUT,JSON.stringify({at:new Date().toISOString(),authorityHtmlSha256:fixture.authorityHtmlSha256,originalObjective:63,observations,scope:'原创80及24上一轮修订；第三方参考20仅外部独核，非整库验收'},null,2)+'\n');
});
