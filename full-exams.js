import {examPapers as legacyPapers} from './exam-bank.js';
import {hasJudgeContract} from './coding-catalog.js';
const groups={
 network:[{name:'选择题',count:15,points:15},{name:'填空题',count:9,blankCount:10,points:10},{name:'分析题',count:5,points:30},{name:'计算题',count:5,points:45}],
 structures:[{name:'判断题',count:10,points:20},{name:'选择题',count:9,points:18},{name:'填空题',count:6,points:12},{name:'应用题',count:5,points:40},{name:'算法设计',count:2,points:10}],
 programming:[{name:'选择题',count:20,points:20},{name:'程序填空',count:5,points:20},{name:'编程题',count:10,points:60}],
 digital:[{name:'基本题',count:5,points:36},{name:'分析题',count:3,points:32},{name:'设计题',count:3,points:32}]
};
export const fullExamBlueprints={
 network:{reference:'用户提供2023计算机网络A卷：15/10/30/45分，填空9题10空',groups:groups.network},
 structures:{reference:'用户提供2021数据结构卷：20/18/12/40/10分',groups:groups.structures},
 digital:{reference:'用户提供2023—2024数电模拟：基本36、分析32、设计32分',groups:groups.digital},
 programming:{reference:'用户指定20选择、5程序填空、10编程；分值20/20/60为暂定，待真实卷校准',groups:groups.programming}
};
const fill=(stem,answer,why)=>({section:'填空题',type:'fill',stem,answers:[[String(answer)]],formats:[typeof answer==='number'?'number':'text'],explanation:why});
const dsFill=[
 fill('按从前向后顺序查找，序列为(18,7,25,11,30)。查找11需进行____次关键字比较。',4,'依次比较18、7、25、11。'),
 fill('一个连通无向图含12个顶点、15条边，删除____条适当选取的边可得到其一棵生成树。',4,'生成树11条边，15-11=4。'),
 fill('将关键字40、20、60、10、30依次插入空二叉排序树，查找30需比较____个结点。',3,'路径40→20→30。'),
 fill('含8个叶子的二元哈夫曼树共有____个结点。',15,'内部结点7，总15。'),
 fill('大根堆按0起始数组存储，下标5结点的双亲下标为____。',2,'floor((5-1)/2)=2。'),
 fill('从空表长11的散列表依次插入15、26、37，H(k)=k mod11，线性探测。37最终地址为____。',6,'三键初址4，依次占4、5、6。')
];
function assemble(subject){
 const pool=legacyPapers[subject].flatMap(p=>p.questions),out=[];
 for(const g of groups[subject]){
  let candidates=pool.filter(q=>q.section===g.name);
  if(subject==='structures'&&g.name==='填空题')candidates=dsFill;
  if(subject==='network'&&g.name==='填空题')candidates=[candidates.find(q=>q.answers.length===2),...candidates.filter(q=>q.answers.length===1)];
  if(candidates.length<g.count)throw Error(`${subject}/${g.name}整卷题量不足`);
  candidates.slice(0,g.count).forEach((q,i)=>out.push({...q,points:subject==='network'&&g.name==='填空题'?q.answers.length:g.points/g.count,blankPoints:subject==='network'&&g.name==='填空题'?1:undefined,section:g.name}));
 }
 return make(subject,out);
}
function make(subject,qs){return {id:`${subject}-full-v1-1`,title:'期末模拟 · 第1套',questions:qs.map((q,i)=>{const id=`FULL-${subject}-v1-${i+1}`;return {...q,id,revision:1,pool:'exam',origin:'原创',...(hasJudgeContract(id)?{judge:true}:{})};})};}
const written=(section,points,stem,model,rubric)=>({section,points,type:'short',stem,model,rubric});
const digital=[
 written('基本题',6,'设X=+0101110，Y=+1010011。用8位补码计算X-Y，并求结果真值。','X=46，Y=83；X补00101110，-Y补10101101。相加得11011011，真值-37，无有符号溢出。',['两补码','相加结果','-37']),
 written('基本题',8,'已知F′(A,B,C)=Σm(1,2,5,6)，A为最高位。写F及对偶函数Fd的最小项表达式。','F=Σm(0,3,4,7)；Fd(x)=¬F(¬x)，因此Fd=Σm(1,2,5,6)。本函数与A无关，F为B与C同或，对偶为B与C异或。',['原补集','对偶规则','编号']),
 written('基本题',8,'化简Y=(A+B)(A+C)，并写出只用二输入或非门的实现关系。','Y=A+BC。也可保留POS：(A+B)(A+C)。取N1=(A+B)′，N2=(A+C)′，Y=(N1+N2)′，三只或非门。',['化简','两中间项','末级或非']),
 written('基本题',8,'用卡诺图化简F(A,B,C,D)=Σm(1,5,13)+d(0,4,8,9,12)，A为最高位，求最简与或式。','全部指定1的B/D组合经无关扩展可圈C=0的8格0,1,4,5,8,9,12,13，故F=C′。指定0的其余8格均C=1。',['8格圈','C′','约束核验']),
 written('基本题',6,'两只兼容开漏缓冲器输出共线上拉。X输出0，Y输出1时，总线是什么逻辑值？两只都输出1时呢？若移除上拉电阻，第二种情况下能否保证为1？','0；有合法上拉时1；移除上拉不能保证，输出都释放为高阻，节点电位未定义。',['低主导','全释放上拉','无上拉不保证']),
 written('分析题',8,'电路定义为P=A⊕B，F1=P⊕C，F2=AB+PC。列出按ABC=000至111的两输出序列，说明电路功能。','F1=01101001，F2=00010111；为一位全加器，A/B为加数、C为输入进位，F1为和、F2为进位。',['两序列','全加器','位含义']),
 written('分析题',12,'3—8译码器正常使能，ABC为地址且A最高位，输出Y0至Y7低有效。电路F=(Y2·Y3·Y6·Y7)′。写F表达式，化简并说明功能。','F=Σm(2,3,6,7)=B。所列地址B均1且A/C任意，输出等于地址中间位；末级为与非，不能把低有效输出直接或起来。',['低有效转换','最小项','B']),
 written('分析题',12,'两个上升沿D触发器共用时钟，D1=Q0，D0=Q1′，输出Z=Q1Q0，初态00。写驱动、状态及输出方程，画状态转换图，说明功能。','Q1+=Q0，Q0+=Q1′；Z=Q1Q0。00→01→11→10→00，为4状态Johnson循环；Z仅11为1。每拍同时按旧状态更新。',['方程','四状态','输出及功能']),
 written('设计题',12,'用上升沿D触发器设计“110”序列检测器。输入逐拍读入，检测到最后一位0时输出1，其余0。画Mealy状态图，说明状态含义并给编码后的方程；不考虑非法状态。','S0未匹配，S1已见1，S2末尾至少11。S0:0→S0/0,1→S1/0；S1:0→S0/0,1→S2/0；S2:0→S0/1,1→S2/0。编码00,01,10时D1=X(Q1+Q0)，D0=XQ1′Q0′，Z=Q1Q0′X′，11无关。',['前缀状态','完整转移','方程']),
 written('设计题',8,'用8选1数据选择器实现四位8421BCD输入ABCD的判别函数：十进制值为3、6或9时F=1，其余合法数字F=0，非法BCD为无关。选择端S2S1S0=ABC，列D0至D7的一种连接，器件正常使能。','D0=0，D1=D，D2=0，D3=D′，D4=D，D5=0，D6=0，D7=0。合法3对应ABC001且D1，6对应011且D0，9对应100且D1；后面非法地址可取0。',['地址余因子','3/6/9','非法项']),
 written('设计题',12,'用4位同步二进制计数器设计模6计数器，要求最高位Q3的占空比1/3。器件在有效沿若低有效LOAD=0则并行装入，否则计数。可任取6个连续状态，不考虑自启动。给状态图、装入数据、控制式及终端进位信号。','选0100→0101→0110→0111→1000→1001→0100。数据固定0100；终端T=Q3Q2′Q1′Q0，在1001时LOAD=T′，下一沿装4；其余计数。计数使能开、异步清零保持无效，外部终端进位T；Q3高占8、9两状态，2/6=1/3。不能直接用只在1111有效的器件进位替代T。',['六状态','同步装4及控制','进位和占空比'])
];
export const fullExamPapers={network:[assemble('network')],structures:[assemble('structures')],programming:[assemble('programming')],digital:[make('digital',digital)]};
