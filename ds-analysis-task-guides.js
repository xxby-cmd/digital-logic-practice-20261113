// New question revisions only. Historical guides and their scoring stay separate.
import {dsLinearTaskGuides} from './ds-linear-task-guides.js';
import {dsStringTaskGuides} from './ds-string-task-guides.js';
import {dsArrayTaskGuides} from './ds-array-task-guides.js';
import {dsIntroTaskGuides} from './ds-intro-task-guides.js';
import {dsSortTaskGuides} from './ds-sort-task-guides.js';

const questionId=(chapter,n)=>`P4-structures-${chapter}-D-${String(n).padStart(3,'0')}`;
const oldGuides={...dsLinearTaskGuides,...dsStringTaskGuides,...dsArrayTaskGuides};
const oldInstructionNotes=[
  '代码判题核对功能；正确性理由、遍历次数和时间/辅助空间分析请另按题目说明对照评阅。',
  '代码判题核对功能，原题的算法选择、正确性理由及时间/辅助空间分析仍需另行评阅。',
  '代码判题核对有限输入上的功能，原题的正确性、递归/算法选择及时间和辅助空间分析仍需另行评阅。'
];
const changes={
  [questionId(2,1)]:[['说明全负与无负的情形。','全负时返回0，无负时返回原长度。']],
  [questionId(2,2)]:[['，并说明判定理由。','。']],
  [questionId(2,3)]:[['，说明连续命中时的前驱处理。','；连续命中也应全部删除。']],
  [questionId(2,4)]:[['，并说明两个游标的关系。','。']],
  [questionId(2,5)]:[['，并说明为何可舍弃较小项。','。']],
  [questionId(4,1)]:[['，并说明双端比较和空串边界。','。']],
  [questionId(4,2)]:[['，说明任一串为空或先结束的情况。','。']],
  [questionId(4,3)]:[['，说明与子串的区别。','。']],
  [questionId(4,4)]:[['，并说明判据的必要性与充分性。','。']],
  [questionId(4,5)]:[['，说明读写位置的覆盖安全性。','。']],
  [questionId(4,7)]:[['，说明为何不能在尚未读完输入时就把当前只出现一次的字节判为答案。','。']],
  [questionId(4,9)]:[['，说明归一化k与空串处理；','；']],
  [questionId(4,10)]:[['，并说明稳定压缩。','。']],
  [questionId(5,2)]:[['；说明输出有序的理由。','。']],
  [questionId(5,3)]:[['，并说明前提。','。']],
  [questionId(5,4)]:[['只处理公开有效前缀，不展开矩阵','只处理公开有效前缀，采用一次线性扫描，不展开矩阵']],
  [questionId(5,5)]:[['，说明顺序为何保留。','。']],
  [questionId(5,6)]:[['要求递归处理并说明O(展开访问数)时间、O(嵌套深度)递归栈。','要求递归处理，时间O(展开访问数)，递归栈O(嵌套深度)。']],
  [questionId(5,7)]:[['说明无共享树及共享DAG的访问成本与递归栈。','']],
  [questionId(5,8)]:[['给出递归分类及成本说明。','使用递归算法。']],
  [questionId(5,9)]:[['说明递归或等价栈解析、错误分支及O(n)时间/深度栈。','可采用递归或等价栈解析，要求O(n)时间、O(解析深度+1)辅助栈。']]
};
const analysisNotes={
  [questionId(4,6)]:'边界与复杂度说明写在注释中。代码测试只核对运行结果，分析部分随作答一并提交评阅。',
  [questionId(4,8)]:'循环移位判定的证明写在注释中。代码测试只核对运行结果，分析部分随作答一并提交评阅。',
  [questionId(5,1)]:'长方阵不能直接套用该交换循环的说明写在注释中。代码测试只核对运行结果，分析部分随作答一并提交评阅。'
};
function revise(questionId,old){
  let publicStatement=old.publicStatement;
  for(const [before,after]of changes[questionId]||[]){
    if(!publicStatement.includes(before))throw new Error('DS分析修订缺少原句：'+questionId);
    publicStatement=publicStatement.replace(before,after);
  }
  let instruction=old.instruction;
  const oldNote=oldInstructionNotes.find(note=>instruction.endsWith(note));
  if(!oldNote)throw new Error('DS分析修订缺少旧提交提示：'+questionId);
  instruction=instruction.slice(0,-oldNote.length)+(analysisNotes[questionId]||'');
  return {...old,revision:3,publicStatement,instruction,manualReview:Object.hasOwn(analysisNotes,questionId)};
}

export const dsAnalysisTaskGuides={
  'P3-structures-3-97':{
    revision:2,
    publicStatement:'输入字符串只含(和)，长度n≥0。编写int match(const char s[],int n)，括号完整匹配返回1，否则0。可用计数器，不要求显式栈；说明为何单类型可简化。s为有效的只读字符数组，前n项是待检查的括号，不修改输入；只按n处理，不依赖终止零字节，空串完整匹配。',
    instruction:'只提交 int match(const char s[], int n) 函数，不需要main。单类型括号可简化的理由写在注释中。代码测试只核对运行结果，分析部分随作答一并提交评阅。',
    starter:'int match(const char s[], int n) {\n    /* 检查圆括号是否完整匹配 */\n}',
    solution:"int match(const char s[],int n){int depth=0;for(int i=0;i<n;i++){if(s[i]=='(')depth++;else if(--depth<0)return 0;}return depth==0;}\n/* 单类型只需记录尚未闭合的左括号数：任一前缀不为负，结束为0。多类型还需区分括号的嵌套顺序，不能仅计总数。 */",
    manualReview:true
  },
  'P3-structures-3-98':{
    revision:2,
    publicStatement:'整数数组a长n≥0，给一个容量至少n的辅助数组s。用栈逆置a，编写void reverseByStack(int a[],int n,int s[])。说明额外空间和是否优于原地双指针空间。a、s为有效且彼此独立的数组，元素为int；结果写回a的前n项，s用作辅助栈，返回后的工作区内容不评分，n=0时不访问数组元素。',
    instruction:'只提交 void reverseByStack(int a[], int n, int s[]) 函数，不需要main。额外空间及与原地双指针的空间比较写在注释中。代码测试只核对运行结果，分析部分随作答一并提交评阅。',
    starter:'void reverseByStack(int a[], int n, int s[]) {\n    /* 用辅助栈逆置数组 */\n}',
    solution:'void reverseByStack(int a[],int n,int s[]){int top=0;for(int i=0;i<n;i++)s[top++]=a[i];for(int i=0;i<n;i++)a[i]=s[--top];}\n/* 先逐项压栈，再按后进先出顺序弹回。时间O(n)，辅助栈占O(n)空间；原地双指针交换只需O(1)辅助空间，因此用栈并不更省空间。 */',
    manualReview:true
  },
  ...Object.fromEntries(Object.entries(oldGuides).map(([questionId,old])=>[questionId,revise(questionId,old)])),
  [questionId(1,1)]:{
    ...dsIntroTaskGuides[questionId(1,1)],revision:3,
    rubric:['迭代求和正确，空和及结果类型满足题目要求','按所选合法算法说明基本累加次数，区分循环变量更新；首项初始化写法可为n-1次','时间与辅助空间分析符合实际实现']
  },
  [questionId(10,8)]:{
    ...dsSortTaskGuides[questionId(10,8)],revision:3,
    rubric:['快速选择正确定位第k小，符合合法边界与多重集要求','正确说明等于枢轴区间与目标秩的关系','说明等值区间如何保证继续处理时区间缩小']
  }
};
