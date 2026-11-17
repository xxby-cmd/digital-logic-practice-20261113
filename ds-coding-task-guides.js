// Public interfaces only. The node type is supplied before student functions.
export const dsCodingTaskGuides = {
 'P3-structures-3-91': {
  instruction: '只提交 int push(int a[], int cap, int *top, int x) 函数，不需要main。top指向下一可写位置；满栈返回0并保持原栈，否则入栈并返回1。',
  starter: 'int push(int a[], int cap, int *top, int x) {\n    /* 完成入栈操作 */\n}'
 },
 'P3-structures-3-92': {
  instruction: '只提交 int pop(int a[], int *top, int *out) 函数，不需要main。top指向下一可写位置；空栈返回0且不改*out，否则写入弹出值并返回1。',
  starter: 'int pop(int a[], int *top, int *out) {\n    /* 完成出栈操作 */\n}'
 },
 'P3-structures-3-93': {
  instruction: '系统已提供 typedef struct Node { int v; struct Node *next; } Node;，请勿重复定义。只提交 int pushL(Node **top, int x) 函数，可包含所需标准头文件，不需要main。申请失败返回0并保持原栈，成功返回1。',
  starter: '#include <stdlib.h>\n\nint pushL(Node **top, int x) {\n    /* 申请结点并完成入栈操作 */\n}'
 },
 'P3-structures-3-94': {
  instruction: '系统已提供 typedef struct Node { int v; struct Node *next; } Node;，请勿重复定义。只提交 int popL(Node **top, int *out) 函数，可包含所需标准头文件，不需要main。空栈返回0；否则输出栈顶值、释放该结点并返回1。',
  starter: '#include <stdlib.h>\n\nint popL(Node **top, int *out) {\n    /* 完成链栈出栈操作 */\n}'
 },
 'P3-structures-3-95': {
  instruction: '只提交 int enq(int a[], int m, int front, int *rear, int x) 函数，不需要main。循环队列牺牲一格；front指队头，rear指下一可写位置。满队返回0，否则入队并返回1。',
  starter: 'int enq(int a[], int m, int front, int *rear, int x) {\n    /* 完成循环队列入队操作 */\n}'
 },
 'P3-structures-3-96': {
  instruction: '只提交 int deq(int a[], int m, int *front, int rear, int *out) 函数，不需要main。沿用牺牲一格的循环队列约定；空队返回0且不改*out，否则写入出队值并返回1。',
  starter: 'int deq(int a[], int m, int *front, int rear, int *out) {\n    /* 完成循环队列出队操作 */\n}'
 },
 'P3-structures-3-97': {
  instruction: '只提交 int match(const char s[], int n) 函数，不需要main。s含n个左、右圆括号；完整匹配返回1，否则返回0。单一括号类型允许使用计数器。',
  starter: 'int match(const char s[], int n) {\n    /* 检查圆括号是否完整匹配 */\n}'
 },
 'P3-structures-3-98': {
  instruction: '只提交 void reverseByStack(int a[], int n, int s[]) 函数，不需要main。用题目提供的独立辅助数组s作栈，逆置a中的n个元素；空间比较在提交后对照解析。',
  starter: 'void reverseByStack(int a[], int n, int s[]) {\n    /* 用辅助栈逆置数组 */\n}'
 },
 'P3-structures-3-99': {
  instruction: '只提交 int queueLen(int m, int front, int rear) 函数，不需要main。沿用牺牲一格的循环队列约定，返回队列长度；m及下标均在题目规定范围内。',
  starter: 'int queueLen(int m, int front, int rear) {\n    /* 返回循环队列长度 */\n}'
 },
 'P3-structures-3-100': {
  instruction: '只提交 int validPop(const int in[], const int out[], int n, int s[]) 函数，不需要main。in中的n个整数互异；用容量n、与输入独立的辅助数组s作栈，判断out是否为可行的弹出序列，返回1或0。',
  starter: 'int validPop(const int in[], const int out[], int n, int s[]) {\n    /* 判断弹出序列是否可行 */\n}'
 }
};
