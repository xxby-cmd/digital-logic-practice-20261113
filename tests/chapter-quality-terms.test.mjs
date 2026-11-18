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

const q=(s,id)=>{const v=getPracticeCourse(s).questions.find(q=>q.id===id);assert.ok(v,id);return v;};
const names=(s,value)=>questionTermCandidates(s,typeof value==='string'?{stem:value}:value).flatMap(c=>c.entry.aliases);
const has=(s,value,...wanted)=>{const found=names(s,value);for(const n of wanted)assert.ok(found.includes(n),n);};
const lacks=(s,value,...unwanted)=>{const found=names(s,value);for(const n of unwanted)assert.ok(!found.includes(n),n);};
const targets={
 network:[1,10,12,15,19,26,28,41,42,52,61,64,94].map(n=>`P3-network-1-${n}`),
 structures:[8,18,27,28,29,36,37,38,43,44,46,48,49,50,56,57,59,61,63,64,70,72,73,76,79,81,83,84,86,88,89,91,92,94,95,96,100].map(n=>`P3-structures-3-${n}`),
 digital:['S-011','F-007','F-009','F-012','F-016','F-017','R-003','C-005'].map(n=>`P4-digital-2-${n}`),
 programming:['034','036','047'].map(n=>`C6B-programming-2-S-${n}`)
};

test('等待缓存不等于缓存过期，超限概率不等于平均值，分数不等于CIDR',()=>{
 const buffer=q('network','P3-network-1-52'),prob=q('network','P3-network-1-61');
 lacks('network',buffer,'缓存有效性');has('network',buffer,'排队缓存','尾丢弃');
 lacks('network',prob,'数学期望','CIDR','子网掩码','分组转发');has('network',prob,'尾概率','独立事件');
 has('network','DNS缓存记录超过TTL有效期，需要重新查询。','缓存有效性');
 has('network','按概率求平均等待时间的数学期望。','数学期望');
 has('network','IPv4地址192.0.2.0/24与相应子网掩码。','CIDR','子网掩码');
 has('network','路由器按转发表转发IP分组。','分组转发');
});

test('时隙等待和协议交互有独立语义，不以交付时延或消息顺序推有序交付',()=>{
 has('network',q('network','P3-network-1-42'),'时隙等待');
 has('network',q('network','P3-network-1-41'),'连接建立时延');
 const protocol=q('network','P3-network-1-1');lacks('network',protocol,'数据交付顺序');has('network',protocol,'协议语义','协议时序');
 lacks('network',q('network','P3-network-1-19'),'数据交付顺序');
 has('network','接收方把乱序数据缓存，随后按序交付。','数据交付顺序');
});

test('循环队列的回绕不推算法终止、顺序栈容量或数学括号中的函数调用',()=>{
 for(const n of [8,28,56,64,73,95,96]){
  const v=q('structures',`P3-structures-3-${n}`);lacks('structures',v,'顺序栈容量','算法终止性');has('structures',v,'环形回绕');
 }
 lacks('structures',q('structures','P3-structures-3-8'),'函数调用过程');
 has('structures',q('structures','P3-structures-3-27'),'假溢出');
 lacks('structures',q('structures','P3-structures-3-27'),'空闲空间组织');
 has('structures','顺序栈用top表示下一可写位置，检查容量。','顺序栈容量');
 has('structures','while循环每轮缩小剩余规模，证明算法终止。','算法终止性');
});

test('next链接、括号匹配、下标边界和区间点号不推字符串匹配、图或成员访问',()=>{
 for(const n of [43,49,79,94])lacks('structures',q('structures',`P3-structures-3-${n}`),'模式匹配进度');
 lacks('structures',q('structures','P3-structures-3-48'),'图的存储表示');
 lacks('structures',q('structures','P3-structures-3-38'),'成员选择语义');
 has('structures','KMP在模式串失配后利用next数组继续匹配主串。','模式匹配进度');
 has('structures','图用邻接表保存顶点和边。','图的存储表示');
 has('structures','结构体指针p用p->next读取成员。','成员选择语义');
});

test('汉诺塔、分支递归、行编辑、双端队列和迷宫回溯取得具体概念',()=>{
 const hanoi=q('structures','P3-structures-3-70');has('structures',hanoi,'汉诺塔','递归基例');lacks('structures',hanoi,'比较与移动','语句频度');
 has('structures',q('structures','P3-structures-3-83'),'活动记录','递归调用树');
 has('structures',q('structures','P3-structures-3-36'),'活动记录','递归工作栈');
 const edit=q('structures','P3-structures-3-76');has('structures',edit,'行编辑缓冲区','退格命令');lacks('structures',edit,'输入输出缓冲');
 has('structures',q('structures','P3-structures-3-89'),'操作序列');
 has('structures',q('structures','P3-structures-3-50'),'回溯','深度优先');
 for(const n of [79,81,84])lacks('structures',q('structures',`P3-structures-3-${n}`),'原地更新');
 const depth=termCatalogue('structures').find(e=>e.aliases.includes('深度'));assert.match(depth.definition,/搜索|调用|嵌套结构/);assert.ok(!depth.definition.startsWith('这里指括号'));
 has('structures','直接在原地逆置数组，只用常数额外空间。','原地更新');
 has('structures','外部排序用I/O缓冲，每路一块。','输入输出缓冲');
 has('structures','比较数组元素，并移动记录完成排序。','比较与移动');
 has('structures','计算for循环中累加语句的执行频度。','语句频度');
});

test('布尔输入约束、代换与恒等不推时序状态、使能或BCD子串',()=>{
 const constrained=q('digital','P4-digital-2-F-012');has('digital',constrained,'输入约束');lacks('digital',constrained,'使能控制');
 for(const id of ['P4-digital-2-F-007','P4-digital-2-F-017'])has('digital',q('digital',id),'变量代换');
 const law=q('digital','P4-digital-2-R-003');has('digital',law,'输入约束','逻辑恒等');lacks('digital',law,'输出与状态关系');
 lacks('digital',q('digital','P4-digital-2-C-005'),'编码约束');
 has('digital','8421BCD编码的无效码组合。','编码约束');
 has('digital','Moore机的输出取决于当前状态。','输出与状态关系');
 has('digital','EN使能端控制译码器是否工作。','使能控制');
});

test('scanf输入空白不推输出刷新，头文件不推成员，一元取址不推位与',()=>{
 for(const id of targets.programming){const v=q('programming',id);has('programming',v,'输入空白字符');lacks('programming',v,'成员选择语义','位与','缓冲与刷新');}
 for(const id of targets.programming.slice(1))has('programming',q('programming',id),'scanf空白指令');
 has('programming','int z = a & b; 按位与后输出。','位与');
 has('programming','结构体s通过s.value访问成员。','成员选择语义');
 has('programming','无换行输出后调用fflush(stdout)刷新输出缓冲。','缓冲与刷新');
});

test('收紧语义后保留其他章节的真实正向用例，不以无关候选填两词',()=>{
 has('network',q('network','P3-network-2-68'),'缓存命中');
 const expectedDelay=getPracticeCourse('network',{questionRevisions:{'P3-network-2-88':1}}).questions.find(q=>q.id==='P3-network-2-88');
 has('network',expectedDelay,'数学期望');
 has('structures',q('structures','P4-structures-10-J-005'),'比较与移动');
 has('structures',q('structures','P4-structures-4-J-018'),'模式匹配进度');
 has('structures',q('structures','P4-structures-7-F-013'),'图的存储表示');
 has('structures',q('structures','P4-structures-9-S-003'),'折半查找');
 has('structures',q('structures','P4-structures-2-F-013'),'同类项','零系数项');
 has('structures',q('structures','P4-structures-8-F-015'),'引用计数');
 for(const n of ['011','017'])has('structures',q('structures',`P4-structures-8-J-${n}`),'空闲空间组织');
});

test('实际61新版本的默认及逐题已了解状态、C/Java变体均2词且守整科5%',async()=>{
 let refs={};try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已接入题目.json',import.meta.url),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const referenceRevisions=await readLocalReferenceRevisions();
 assert.equal(Object.values(targets).flat().length,61);
 for(const [subject,ids]of Object.entries(targets)){
  const originals=[...getPracticeCourse(subject).questions,...(refs[subject]||[]).map(raw=>practiceQuestionAtRevision(reviseQuestionLanguage(raw),undefined,referenceRevisions[raw.id])),...fullExamPapers[subject].flatMap(p=>p.questions)];
  for(const id of ids)assert.ok(q(subject,id).revision>=2,id);
  const java=originals.map(q=>visibleReadingQuestion(q,'java',javaTaskGuide(q.id,q.revision??1)));
  for(const questions of [originals,...(java.some((q,i)=>q!==originals[i])?[java]:[])]){
   const base=courseTermPlan(subject,questions);assert.ok(base.complete);assert.ok([...base.usage.values()].every(n=>n<=base.limit));
   for(const id of ids){
    const v=questions.find(q=>q.id===id),selected=base.byQuestion.get(id);assert.equal(selected.length,2,id);
    const known=Object.fromEntries(selected.map(e=>[`${subject}:${e.id}`,true])),alternate=courseTermPlan(subject,questions,known);
    assert.ok(alternate.complete,id);assert.ok([...alternate.usage.values()].every(n=>n<=alternate.limit),id);
    const allowed=new Set(questionTermCandidates(subject,v).map(c=>c.entry.id));
    for(const e of alternate.byQuestion.get(id))assert.ok(allowed.has(e.id),id+':'+e.id);
    const publicOnly={id:v.id,stem:v.stem,options:v.options,readingLanguage:v.readingLanguage};
    assert.deepEqual(questionTermCandidates(subject,{...publicOnly,topic:'KMP BCD DNS',model:'隐藏内容'}).map(c=>c.entry.id),questionTermCandidates(subject,publicOnly).map(c=>c.entry.id));
   }
  }
  for(const e of termCatalogue(subject))for(const k of ['definition','purpose','example'])assert.ok(e[k]?.trim().length>=6,subject+':'+e.id+':'+k);
 }
});
