// Public revision-2 interfaces and solutions, shown under the existing answer rules.
export const dsIntroTypes = {};
const arrays = '本题int为32位有符号整数，元素可取INT_MIN至INT_MAX。a由调用方提供，至少有n项，实际存储可能更长；只处理前n项，全部输入只读，不得修改或释放。';
const outputs = '输出指针均有效，指向调用方独立的int对象，彼此及与输入存储不重叠；调用前的旧输出值任意，应写入本次结果。';
const make = (publicStatement, signature, solution) => ({
  revision: 2,
  publicStatement,
  instruction: '只提交 ' + signature + ' 的完整定义，不写main；可同时提交自写辅助函数。',
  starter: signature + ' {\n    /* 完成函数 */\n}',
  solution
});
export const dsIntroTaskGuides = {
  'P4-structures-1-D-001': make(
    '输入非负整数n，0≤n≤100000。实现 long long iterativeSum(int n)，用迭代计算1+2+…+n，n=0时返回0，不用递归。结果类型应能保存完整的和。在代码注释中说明所选算法的基本累加操作次数，并分析时间与辅助空间；计数时区分累加语句和循环变量更新。',
    'long long iterativeSum(int n)',
    'long long iterativeSum(int n){long long sum=0;for(int i=1;i<=n;i++)sum+=i;return sum;}\n/* 此写法sum+=i执行n次，n=0时0次；时间Theta(n)，辅助空间Theta(1)。若n>0时从sum=1开始、只加入2..n，累加为n-1次；应按实际算法说明，不能把循环变量更新混入这一计数。 */'
  ),
  'P4-structures-1-D-002': make(
    '对非空整数序列同时求最小值和最大值。实现 void minMax(const int a[], int n, int *minimum, int *maximum)，1≤n≤1024，把结果分别写入*minimum、*maximum。不得用0、9999等固定数据哨兵假定元素范围，可由实际元素初始化或采用等价的正确方法；分析最坏时间与辅助空间。' + arrays + outputs + '不要求处理NULL。',
    'void minMax(const int a[], int n, int *minimum, int *maximum)',
    'void minMax(const int a[],int n,int *minimum,int *maximum){int low=a[0],high=a[0];for(int i=1;i<n;i++){if(a[i]<low)low=a[i];if(a[i]>high)high=a[i];}*minimum=low;*maximum=high;}\n/* 由首元素初始化，单元素、全负数和整数极值均无需特殊数据哨兵。扫描n-1项，最坏Theta(n)时间、Theta(1)辅助空间；成对比较可改变比较次数的常数。 */'
  ),
  'P4-structures-1-D-003': make(
    '统计整数数组前n项的奇数和偶数个数。实现 void countParity(const int a[], int n, int *oddCount, int *evenCount)，0≤n≤1024，分别写入两个输出对象；负数正常分类，0为偶数，空数组两个结果均为0。' + arrays + outputs + 'n>0时a有效；n=0时a可为NULL，也可指向有额外存储的缓冲，此时均不读取a，仍写出两个0。',
    'void countParity(const int a[], int n, int *oddCount, int *evenCount)',
    'void countParity(const int a[],int n,int *oddCount,int *evenCount){int odd=0,even=0;for(int i=0;i<n;i++){if(a[i]%2==0)even++;else odd++;}*oddCount=odd;*evenCount=even;}\n/* 空数组仍写两个0。C的负奇数除2余数可为-1，因此按是否等于0分类；时间Theta(n)，辅助空间Theta(1)。 */'
  ),
  'P4-structures-1-D-004': make(
    '实现 int validIndex(int n, int i)，只根据数组长度n与目标下标i的数值判断是否合法。两个参数均可为任意32位有符号int；当且仅当n≥0且0≤i<n时返回1，否则返回0。函数没有数组参数，不读取任何数组内容。',
    'int validIndex(int n, int i)',
    'int validIndex(int n,int i){return n>=0&&i>=0&&i<n;}\n/* n<0、i<0及i==n均非法，n=0没有合法下标。只作固定次比较，不读数组，时间及辅助空间均Theta(1)。 */'
  ),
  'P4-structures-1-D-005': make(
    '给定正整数n，实现 int floorLog2(unsigned long long n)，通过反复整除2求floor(log2 n)，不得用递归。n的范围为1至ULLONG_MAX，本题unsigned long long为64位无符号整数；返回值为0至63。给出n=1和n=10的结果，并分析时间与辅助空间；允许功能等价的无符号右移。',
    'int floorLog2(unsigned long long n)',
    'int floorLog2(unsigned long long n){int count=0;while(n>=2){n/=2;count++;}return count;}\n/* n=1返回0；n=10经历10->5->2->1，返回3。恰好除floor(log2 n)次；n增长时Theta(log n)时间，辅助空间Theta(1)。 */'
  )
};
for(const number of [1,2,5]){
  const guide=dsIntroTaskGuides[`P4-structures-1-D-${String(number).padStart(3,'0')}`];
  guide.manualReview=true;
  guide.instruction+='代码可运行核对结果；方法与次数/复杂度说明写在注释中，随作答一并提交评阅。';
}

const minMaxId='P4-structures-1-D-002';
const floorLogId='P4-structures-1-D-005';
const minMax=dsIntroTaskGuides[minMaxId];
const floorLog=dsIntroTaskGuides[floorLogId];
export const dsIntroQualityTaskGuides={
  [minMaxId]:{...minMax,revision:3,publicStatement:minMax.publicStatement.replace(
    '可由实际元素初始化或采用等价的正确方法',
    '可由实际元素初始化，也可用INT_MAX初始化最小值、INT_MIN初始化最大值，或采用覆盖全部int值域的等价方法'
  )},
  [floorLogId]:{...floorLog,revision:3,publicStatement:floorLog.publicStatement.replace(
    '并分析时间与辅助空间',
    '用n表示循环轮数和渐近时间阶，给出64位题域的最大轮数，并分析辅助空间'
  ),solution:floorLog.solution.replace(
    'n增长时Theta(log n)时间，辅助空间Theta(1)。',
    '按n的数值估计，时间Theta(log(n+1))，辅助空间Theta(1)。在本题64位输入域内，最多整除63次。'
  )}
};
