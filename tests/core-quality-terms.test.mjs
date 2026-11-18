import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {fullExamPapers} from '../full-exams.js';
import {reviseQuestionLanguage} from '../question-language.js';
import {practiceQuestionAtRevision} from '../bank-revisions.js';
import {readLocalReferenceRevisions} from '../scripts/local-reference-revisions.mjs';
import {termCatalogue,questionTermCandidates} from '../term-candidates.js';
import {courseTermPlan} from '../term-planner.js';
import {visibleReadingQuestion} from '../java-reading.js';
import {javaTaskGuide} from '../java-task-guides.js';

const q=(s,id)=>{const x=getPracticeCourse(s).questions.find(q=>q.id===id);assert.ok(x,id);return x;};
const labels=(s,value)=>questionTermCandidates(s,typeof value==='string'?{stem:value}:value).flatMap(c=>c.entry.aliases);
const has=(s,x,...words)=>{const found=labels(s,x);for(const word of words)assert.ok(found.includes(word),word);};
const lacks=(s,x,...words)=>{const found=labels(s,x);for(const word of words)assert.ok(!found.includes(word),word);};
const targets={
 network:[1,2,3,12,21,32,42,43,44,45,54,56,57,59,60,61,64,65,84,85,88,93].map(n=>`P3-network-2-${n}`),
 structures:['P-S-01',...[8,9,10,14].map(n=>`P2-structures-2-${n}`),...['J-007','J-011','J-014','S-006','S-010','S-012','S-013','S-016','S-017','S-018','F-002','F-003','F-004','F-006','F-013','F-015','A-001','A-003','A-007'].map(n=>`P4-structures-2-${n}`)],
 digital:['F-002','F-005','F-007','F-010','F-011','F-012','F-020','S-012','S-020'].map(n=>`P4-digital-4-${n}`),
 programming:['006','009','027','028','046','051','055'].map(n=>`C6E-programming-3-S-${n}`)
};
const localTargets=['YAN-C-02-2-10','YAN-C-02-2-24'];

test('应用消息定界、MX、URL与连接角色有具体提示，已建立不自动表示建立耗时',()=>{
 has('network',q('network','P3-network-2-2'),'消息定界','长度前缀');
 has('network',q('network','P3-network-2-59'),'消息定界','长度前缀');
 lacks('network',q('network','P3-network-2-21'),'消息定界');
 has('network',q('network','P3-network-2-12'),'MX记录');
 has('network',q('network','P3-network-2-44'),'URL','端口号');
 has('network',q('network','P3-network-2-61'),'端口号');
 has('network',q('network','P3-network-2-84'),'监听套接字','已连接套接字');
 has('network',q('network','P3-network-2-85'),'控制连接','数据连接');
 for(const n of [2,44,60,64,85])lacks('network',q('network',`P3-network-2-${n}`),'连接建立时延');
 has('network','建立TCP连接耗时5ms，然后发送数据。','连接建立时延');
});

test('片段可用性不推物理邻居可达或网络连通，平均回源负载不推CDN或突发',()=>{
 for(const n of [54,65]){
  const x=q('network',`P3-network-2-${n}`);lacks('network',x,'邻居可达性','图的连通性','网络拓扑','内容分发网络');has('network',x,'片段可用性','对等网络');
 }
 has('network',q('network','P3-network-2-54'),'最稀缺优先');
 lacks('network',q('network','P3-network-2-56'),'突发流量','内容分发网络');
 lacks('network',q('network','P3-network-2-88'),'松弛操作');has('network',q('network','P3-network-2-88'),'缓存命中率','字节命中率');
 has('network',q('network','P3-network-2-57'),'Base64','编码填充');
 has('network','ARP查询下一跳网关，检查邻居可达性。','邻居可达性');
 has('network','无向图的一条边断开后判断连通。','图的连通性');
 has('network','CDN在不同地区部署边缘缓存。','内容分发网络');
 has('network','Dijkstra通过候选距离改善当前最短路估计。','松弛操作');
});

test('同一归并的前提允许跨句继承，内部链表归并不推外存块访问',()=>{
 const merge=q('structures','P2-structures-2-14');has('structures',merge,'合并有序序列','双指针遍历');lacks('structures',merge,'块访问次数');
 has('structures',q('structures','P4-structures-2-S-018'),'合并有序序列');lacks('structures',q('structures','P4-structures-2-S-018'),'块访问次数');
 lacks('structures','另有两个有序链表。现在只问相邻空闲块的归并回收。','合并有序序列','双指针遍历');
 has('structures','外部排序逐趟读写磁盘块。','块访问次数');
});

test('集合成员条件、相对次序和顺序表搬移不依赖隐藏题目标签',()=>{
 const intersection=q('structures','P4-structures-2-A-001');has('structures',intersection,'集合交集','集合成员关系');
 const move={stem:'顺序表删除一段后，把其后的整个后缀一次搬移到左边。非法参数不改变表。'};
 has('structures',move,'元素移动');lacks('structures',move,'表达式优先级','操作数','运算符','栈顶位置');
 lacks('structures',q('structures','P4-structures-2-A-003'),'稳定排序');
 lacks('structures',q('structures','P4-structures-2-J-014'),'记录定位');
 has('structures','把中缀表达式转成后缀表达式，按操作数和运算符处理。','表达式优先级','操作数','运算符');
 has('structures','稳定排序要求相同关键字保留原序。','稳定排序');
});

test('填空括注和相邻选项不组成函数调用，真正调用仍可识别',()=>{
 lacks('structures',q('structures','P4-structures-2-F-015'),'函数调用过程','函数接口');
 lacks('programming',q('programming','C6E-programming-3-S-051'),'函数调用过程','函数接口');
 lacks('structures',{stem:'填写值____（用整数表示）。',options:['a>b','(a+b)>2*b']},'函数调用过程');
 has('structures','int y = sum(a, n); 返回计算结果。','函数调用过程','函数接口');
 has('structures',{stem:'```c\nint y = sum\n(\n a, n\n);\n```'},'函数调用过程','函数接口');
});

test('组合减法与数字比较不推触发器激励、模拟阈值、状态寄存器或反馈保持',()=>{
 const subtract=q('digital','P4-digital-4-F-002');has('digital',subtract,'全减器');lacks('digital',subtract,'输入激励');
 lacks('digital',q('digital','P4-digital-4-F-010'),'反馈与保持');
 for(const n of ['011','012'])lacks('digital',q('digital',`P4-digital-4-F-${n}`),'阈值切换');
 lacks('digital',q('digital','P4-digital-4-S-012'),'状态编码位宽');has('digital',q('digital','P4-digital-4-S-012'),'数据分配器');
 has('digital','D触发器的激励决定下一状态。','输入激励');
 has('digital','施密特输入超过阈值时翻转。','阈值切换');
 has('digital','状态数为5，采用二进制状态编码。','状态编码位宽');
 has('digital','锁存器由反馈保持逻辑状态。','反馈与保持');
});

test('C表达式按实际运算解释，unsigned char数值场景不推字符串终止边界',()=>{
 const invert=q('programming','C6E-programming-3-S-009');lacks('programming',invert,'字符与字符串边界');has('programming',invert,'位取反','逻辑非','显式转换');
 has('programming',q('programming','C6E-programming-3-S-006'),'复合赋值','优先级');
 for(const n of ['027','028','046'])has('programming',q('programming',`C6E-programming-3-S-${n}`),'优先级');
 has('programming',q('programming','C6E-programming-3-S-051'),'有符号算术溢出');
 has('programming',q('programming','C6E-programming-3-S-055'),'逻辑非');
 has('programming','char text[]="hi"; 求字符串终止边界。','字符与字符串边界');
});

test('共享规则收紧后，旧题恢复真实上界/归并段/广义表/时序概念而非泛词兜底',()=>{
 has('structures',q('structures','P4-structures-1-J-008'),'渐近上界');
 has('structures',q('structures','P4-structures-11-F-003'),'归并路数','合并有序序列');
 has('structures',q('structures','P4-structures-11-J-010'),'归并段');
 has('structures',q('structures','P4-structures-9-F-012'),'装载因子');
 has('structures','对广义表取表头、再取表尾。','广义表表头','广义表表尾');
 has('digital',q('digital','P4-digital-1-F-010'),'无符号数');
 has('digital',q('digital','P5-digital-5-F-007'),'建立时间','保持时间');
 has('network',q('network','P3-network-2-82'),'请求处理时序');
});

test('known替代不把连续下载当窗口发送、关系信号当逐位比较、数学或搬移算法当代码接口',()=>{
 lacks('network',q('network','P3-network-2-85'),'连续发送');
 lacks('digital',q('digital','P4-digital-4-F-011'),'高位优先');
 lacks('structures',q('structures','P4-structures-2-F-013'),'操作接口','函数接口');
 const algorithm='顺序表按位序删除一段，设计整体搬移算法；零长删除合法，非法参数不改表。';
 lacks('structures',algorithm,'操作接口','函数接口');has('structures',algorithm,'逻辑位置','边界处理');
 has('network','滑动窗口允许多帧在途，发送窗口内不必逐帧等待确认。','连续发送');
 has('digital','比较等位宽无符号数，从最高位查首个不同位。','高位优先');
 has('structures','实现int erase(int a[],int n,int i)，接口返回新长度。','操作接口','函数接口');
});

test('小数点移动位数不是定宽，二进制小数舍入按可见中点规则解释',()=>{
 const shift=q('digital','P4-digital-1-F-001');lacks('digital',shift,'定宽表示');has('digital',shift,'位权','数制基数');
 lacks('digital','小数点向右移动的位数为3，不截去数码。','定宽表示');
 has('digital',q('digital','P4-digital-1-F-002'),'就近舍入','二进制小数');
 has('digital','将一个8位寄存器右移3位。','定宽表示');
 has('digital','无符号8位数据扩展到12位。','定宽表示');
 const round=termCatalogue('digital').find(e=>e.aliases.includes('就近舍入'));assert.match(round.definition,/约定|规定/);assert.match(round.definition,/中点|相同/);
});

test('标准反射格雷码逆向题可解释译码，未给码表的任意编码不套公式',()=>{
 has('digital',q('digital','P4-digital-1-F-015'),'格雷码译码');
 lacks('digital','某自定义单步格雷码的码字需要还原位置编号，但未提供编码表。','格雷码译码');
 const decode=termCatalogue('digital').find(e=>e.aliases.includes('格雷码译码'));assert.match(decode.definition,/标准反射/);assert.ok(!decode.example.includes('001与101'));
});

test('物理高低电平不默认等于逻辑1/0，正负逻辑与信号是否有效分开',()=>{
 has('digital',q('digital','P4-digital-1-C-014'),'正逻辑','负逻辑');
 for(const label of ['高电平','低电平']){const e=termCatalogue('digital').find(e=>e.aliases.includes(label));assert.ok(!/通常对应逻辑[01]/.test(e.definition));assert.match(e.definition,/约定|正逻辑|负逻辑/);}
 const positive=termCatalogue('digital').find(e=>e.aliases.includes('正逻辑')),negative=termCatalogue('digital').find(e=>e.aliases.includes('负逻辑'));
 for(const e of [positive,negative])assert.match(e.purpose,/含义|有效|作用|报警/);
});

test('π前缀函数与数学函数不推C调用接口，公开具名函数实现仍保留',()=>{
 const prefix=q('structures','P4-structures-4-F-006');has('structures',prefix,'前缀函数','最长公共前后缀');lacks('structures',prefix,'函数接口','操作接口','函数调用过程','参数传递语义','边界处理');
 for(const label of ['前缀函数','最长公共前后缀']){const e=termCatalogue('structures').find(e=>e.aliases.includes(label));assert.match(e.definition,/不包含|不能取/);assert.match(e.definition,/整个.*串/);}
 lacks('structures','数学函数f(x)=x*x，求其数值。','函数接口','操作接口','函数调用过程');
 has('structures','前缀函数采用π记号。编写int prefixLength(const char *s,int n)，返回末位置的值。','函数接口','操作接口');
 has('programming','C语言中的数学函数sqrt(x)返回平方根。','函数接口','函数调用过程');
 has('structures',q('structures','P4-structures-1-A-012'),'渐近增长');
 has('structures',q('structures','P4-structures-1-F-015'),'渐近增长');
 has('structures',q('structures','P4-structures-8-J-006'),'边界标识','空闲空间组织');
});

test('25题实际新版本保持两词和配额，18格式修订的可见题面与候选不变',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/typed-fill-quality-20261118.json',import.meta.url),'utf8'));assert.equal(fixture.items.length,25);
 let refs={},versions={};try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已接入题目.json',import.meta.url),'utf8'));versions=await readLocalReferenceRevisions();}catch(e){if(e.code!=='ENOENT')throw e;}
 assert.equal(fixture.items.filter(i=>i.kind==='structured-fill').length,18);
 for(const subject of ['network','structures','digital','programming']){
  const qs=[...getPracticeCourse(subject).questions,...(refs[subject]||[]).map(raw=>practiceQuestionAtRevision(reviseQuestionLanguage(raw),undefined,versions[raw.id])),...fullExamPapers[subject].flatMap(p=>p.questions)];
  const plan=courseTermPlan(subject,qs);assert.ok(plan.complete);assert.ok([...plan.usage.values()].every(n=>n<=plan.limit));
  for(const item of fixture.items.filter(i=>i.subject===subject)){
   const current=getPracticeCourse(subject,{questionRevisions:{[item.id]:item.revision}}).questions.find(q=>q.id===item.id),old=getPracticeCourse(subject,{questionRevisions:{[item.id]:item.baseRevision}}).questions.find(q=>q.id===item.id);assert.equal(current.revision,item.revision);assert.equal(old.revision,item.baseRevision);
   if(item.kind==='structured-fill'){assert.equal(current.stem,old.stem);assert.deepEqual(current.options,old.options);assert.deepEqual(questionTermCandidates(subject,current).map(c=>c.entry.id),questionTermCandidates(subject,old).map(c=>c.entry.id));}
   const selected=plan.byQuestion.get(item.id);assert.equal(selected.length,2,item.id);
   const known=Object.fromEntries(selected.map(e=>[`${subject}:${e.id}`,true])),alternate=courseTermPlan(subject,qs,known);assert.ok(alternate.complete);assert.ok([...alternate.usage.values()].every(n=>n<=alternate.limit));assert.equal(alternate.byQuestion.get(item.id).length,2,item.id);
  }
 }
});

test('AS_PATH序列变换不推路径比较/收敛，AS同义共配额且旧已了解键仍有效',()=>{
 const actual=q('network','NC7-network-control-F-005');has('network',actual,'AS_PATH','外部邻居');lacks('network',actual,'路径代价比较','路由收敛');
 const a=termCatalogue('network').find(e=>e.aliases.includes('AS')),b=termCatalogue('network').find(e=>e.aliases.includes('自治系统'));assert.equal(a.id,b.id);
 assert.equal(questionTermCandidates('network',actual).filter(c=>c.entry.aliases.includes('AS')).length,1);
 const score=known=>questionTermCandidates('network',actual,known).find(c=>c.entry.id===a.id).score,baseline=score({});
 for(const id of ['concept:AS','concept:自治系统'])assert.equal(score({[`network:${id}`]:true}),baseline-1000,id);
 has('network','比较到同一目的地的两条路径代价，选择较短路径。','路径代价比较');
 has('network','链路故障后RIP反复更新，最终路由收敛到稳定状态。','路由收敛');
});

test('CDMA发送符号映射不推接收同步、相关解码或未给的正交关系',()=>{
 const actual=q('network','P6-network-7-F-010');has('network',actual,'双极性码片','码片');lacks('network',actual,'码片同步','相关解码','正交码');
 has('network','CDMA接收机使本地码片与接收码片边界同步，再用相关器解码。','码片同步','相关解码');
 has('network','两用户CDMA码间内积为0，说明这两组码正交。','正交码');
 has('network',q('network','NC7-network-control-F-001'),'路径总代价','第一跳');lacks('network',q('network','NC7-network-control-F-001'),'路径代价比较');
 has('network',q('network','NC7-network-control-F-004'),'RIP','路由跳数');lacks('network',q('network','NC7-network-control-F-004'),'路由收敛');
});

test('散列槽地址区别于指针与物理寻址，散列表容量不覆写线性表长定义',()=>{
 const actual=q('structures','P4-structures-9-F-014');has('structures',actual,'线性探测','散列表容量');lacks('structures',actual,'表长','指针指向关系','连续存储寻址','元素类型与步长');
 const length=termCatalogue('structures').find(e=>e.aliases.includes('表长')),capacity=termCatalogue('structures').find(e=>e.aliases.includes('散列表容量'));
 assert.match(length.definition,/实际.*元素个数/);assert.match(capacity.definition,/槽位/);assert.notEqual(length.id,capacity.id);
 const example=termCatalogue('structures').find(e=>e.aliases.includes('线性探测')).example;assert.ok(!/长度为8|地址6|6、7、0/.test(example));
 const bubble=q('structures','P4-structures-10-F-003');has('structures',bubble,'冒泡排序','数组');lacks('structures',bubble,'连续存储寻址','元素类型与步长');
 has('structures','C语言中int *p指向数组a的首地址，sizeof(int)=4字节，求p+1的地址与元素类型步长。','指针指向关系','连续存储寻址','元素类型与步长');
 has('structures','顺序表当前表长为5，删除第2个元素。','表长');
});

test('交集不推并集，LSD稳定分配收集不暗示按关键字大小比较',()=>{
 const intersection=q('structures','P4-structures-12-F-001');has('structures',intersection,'集合交集','倒排索引');lacks('structures',intersection,'集合并集');
 has('structures','查询P OR Q，求两个倒排表的并集。','集合并集');
 has('structures',q('structures','P4-structures-2-F-002'),'集合并集');
 const radix=q('structures','P4-structures-10-F-010');has('structures',radix,'稳定排序','元素保持顺序');lacks('structures',radix,'比较与移动');
 has('structures','比较冒泡排序的关键字比较次数与元素移动次数。','比较与移动');
});

test('62原创及可用的两本地修订，默认/逐题已了解/C-Java均2词、全候选三字段且整科≤5%',async()=>{
 let refs={},versions={};try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已接入题目.json',import.meta.url),'utf8'));versions=await readLocalReferenceRevisions();}catch(e){if(e.code!=='ENOENT')throw e;}
 assert.equal(Object.values(targets).flat().length,62);
 for(const [subject,ids]of Object.entries(targets)){
  const local=(refs[subject]||[]).map(raw=>practiceQuestionAtRevision(reviseQuestionLanguage(raw),undefined,versions[raw.id]));
  for(const x of local.filter(x=>x.id==='YAN-C-02-2-10'))lacks(subject,x,'函数接口');
  const qs=[...getPracticeCourse(subject).questions,...local,...fullExamPapers[subject].flatMap(p=>p.questions)];
  const tested=[...ids,...local.filter(q=>localTargets.includes(q.id)).map(q=>q.id)];
  for(const id of tested)assert.ok(qs.find(q=>q.id===id).revision>=2,id);
  const java=qs.map(q=>visibleReadingQuestion(q,'java',javaTaskGuide(q.id,q.revision??1)));
  for(const questions of [qs,...(java.some((q,i)=>q!==qs[i])?[java]:[])]){
   const base=courseTermPlan(subject,questions);assert.ok(base.complete,JSON.stringify(base.shortages));assert.ok([...base.usage.values()].every(n=>n<=base.limit));
   for(const id of tested){const actual=questions.find(q=>q.id===id),selected=base.byQuestion.get(id);assert.equal(selected.length,2,id);
    const known=Object.fromEntries(selected.map(e=>[`${subject}:${e.id}`,true])),alt=courseTermPlan(subject,questions,known);assert.ok(alt.complete,id);assert.ok([...alt.usage.values()].every(n=>n<=alt.limit));assert.equal(alt.byQuestion.get(id).length,2,id);
    const visible={id,stem:actual.stem,options:actual.options,readingLanguage:actual.readingLanguage};
    assert.deepEqual(questionTermCandidates(subject,{...visible,model:'隐藏答案',topic:'DNS KMP next'}).map(c=>c.entry.id),questionTermCandidates(subject,visible).map(c=>c.entry.id));
   }
  }
  for(const e of termCatalogue(subject))for(const k of ['definition','purpose','example'])assert.ok(e[k]?.trim().length>=6,e.id+':'+k);
 }
});
