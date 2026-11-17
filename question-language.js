// 已逐题核对的题干修订：不改题意，旧作答按revision归档。
const revisedStems={
 'P3-structures-3-92':'数组栈用top记录当前元素个数，也指向下一可写位置。编写int pop(int a[],int *top,int *out)：栈空时返回0且不改变*out；否则弹出栈顶元素，写入*out，更新*top并返回1。参数均有效。',
 'P3-structures-3-94':'链栈结点定义为typedef struct Node{int v;struct Node *next;}Node;，*top指向栈顶，空栈时为NULL。编写int popL(Node **top,int *out)：栈空时返回0；否则把栈顶值写入*out，更新栈顶指针并释放被弹出的结点，返回1。top和out均为有效指针。',
 'P3-structures-3-96':'数组循环队列容量为m，牺牲一个单元区分空、满，front指向队首元素，rear指向下一可写位置。编写int deq(int a[],int m,int *front,int rear,int *out)：空队列返回0且不改变*out；否则输出队首值、更新*front并返回1。m≥2，指针有效，下标均在[0,m)内。',
 'P3-programming-6-60':'实现long long rangeSum(const long long s[],int l,int r)。s是一个数组的前缀和：s[0]=0，s[i]表示原数组前i项元素之和。求原数组闭区间[l,r]的元素和。已知0≤l≤r，s[r+1]存在，结果可由long long表示。',
 'P4-digital-1-R-001':'将二进制数(10.01)₂转换为十进制数，写出按位权展开的过程。',
 'P4-digital-1-R-002':'将二进制小数(0.1011)₂转换为八进制数，写出分组过程，并用十进制值核对。',
 'P4-digital-1-R-003':'将十进制数0.375转换为二进制小数。用乘2取整法求解，再按位权验证，并说明它能精确表示的原因。',
 'P4-digital-1-R-006':'位串10000000分别按8位无符号整数和8位补码解释，结果各是多少？读取数值前，为什么必须知道编码格式？',
 'P4-digital-1-R-008':'用4位补码计算0101+0100。写出保留4位的结果、对应真值，并判断是否溢出。',
 'P4-digital-1-R-009':'用4位补码计算1011+0011，求结果并判断是否溢出。说明异号相加的溢出情况。',
 'P4-digital-1-R-010':'将8位补码11110110直接截去高4位。比较截位前后的真值，并说明补码缩短位数时保持数值不变的条件。',
 'P4-digital-1-R-011':'判断0011 1110是否为合法的两位8421BCD码；若按8位无符号二进制数解释，它的值是多少？',
 'P4-digital-2-R-001':'由AB=AC能否推出B=C？若不能，请举反例，并说明增加什么条件后可以推出。',
 'P4-digital-2-R-003':'化简F=(A+B)(A′+B)，并分别令B=0、B=1检验结果。',
 'P4-digital-2-R-007':'三变量函数F按ABC=000至111的输出依次为00110101。写出标准与或式和标准或与式，并判断F是否只与C有关。',
 'P4-digital-2-R-010':'已知F=AB+AC，分别求A=0和A=1时的余因子，并判断F中能否消去B。',
 'P4-digital-2-R-012':'三变量F=Σm(0,1)+d(2)，其余输入输出为0。用卡诺图化简。能否把0、1、2三格圈为一组？说明理由。',
 'P4-digital-3-R-003':'某开漏总线的电阻需同时满足：灌电流约束R≥2kΩ、漏电约束R≤10kΩ、上升时间约束R≤4kΩ。求可行范围，并判断3kΩ和6kΩ是否可用。',
 'P4-digital-3-R-008':'两个三态驱动器交接时，旧驱动最晚在10ns关断，新驱动最早在3ns导通。求可能的最大重叠时间，并说明如何避免总线争用。'
};
const revisedModels={
 'P3-structures-3-99':'int queueLen(int m,int front,int rear){return rear>=front?rear-front:m-(front-rear);}\nrear≥front时直接相减；发生回绕时，用数组长度减去front到rear的反向距离。也可写return (int)(((long long)rear-front+m)%m);，先转为long long再相加。不能直接用int计算rear-front+m：m很大时，中间结果可能溢出，即使最终队列长度仍能用int表示。'
};
export function reviseQuestionLanguage(q){
 const stem=revisedStems[q.id],model=revisedModels[q.id];
 return stem||model?{...q,...(stem?{stem}:{}),...(model?{model}:{}),revision:Math.max(2,q.revision||1)}:q;
}
