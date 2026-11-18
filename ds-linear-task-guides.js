// Public revision-2 statements and submission interfaces; no private cases.
const node = 'typedef struct Node { int data; struct Node *next; } Node;';
const note = '代码判题核对功能；正确性理由、遍历次数和时间/辅助空间分析请另按题目说明对照评阅。';
const guide = (publicStatement,instruction,starter) => ({revision:2,publicStatement,instruction,starter});
export const dsLinearTaskGuides = {
 'P4-structures-2-D-001':guide(
  '整数顺序表存放在有效数组a的前n项，0≤n≤256，元素可为任意int值。实现 int removeNegatives(int a[], int n)，原地删除所有负数，保持其余元素的相对次序，返回新长度。只有返回长度内的前缀属于结果，尾部存储内容不作要求。不得另开与n同规模的数组，要求O(n)时间、O(1)辅助空间。说明全负与无负的情形。',
  '只提交 int removeNegatives(int a[], int n) 函数，不写main。n是逻辑长度，不一定等于数组的物理容量；返回新长度。'+note,
  'int removeNegatives(int a[], int n) {\n    /* 稳定删除负数并返回新长度 */\n}'),
 'P4-structures-2-D-002':guide(
  '系统提供 '+node+'。两条无头结点的单链表各有0至256个数据结点，NULL表示空表，两表均无环，可能共享同一后缀。实现 int sharesNode(const Node *a, const Node *b)：存在共同结点对象返回1，否则0。数据相等不代表结点共享；两条空表不算共享。不得修改或释放任何结点，要求O(m+n)时间、O(1)辅助空间，并说明判定理由。',
  '系统已提供 '+node+'，请勿重复定义。只提交 int sharesNode(const Node *a, const Node *b)，不写main。按结点地址身份判断，不按data值。'+note,
  'int sharesNode(const Node *a, const Node *b) {\n    /* 判断两表是否共享结点 */\n}'),
 'P4-structures-2-D-003':guide(
  '系统提供 '+node+'。head是有效头结点，head->next指向首个数据结点；头结点的data不属于表中元素。数据结点0至256个，链非循环、无共享，结点data和x可为任意int值。实现 void removeValue(Node *head, int x)，删除并释放原链中所有data等于x的数据结点，保持其余元素的相对次序，保留头结点。输入数据结点均由标准内存分配函数申请且可用free释放；结果链的数据结点仍由调用方拥有并可逐个free，不限定幸存数据结点的地址。要求O(n)时间、O(1)辅助空间，说明连续命中时的前驱处理。',
  '系统已提供 '+node+'，请勿重复定义。只提交 void removeValue(Node *head, int x)，可包含<stdlib.h>，不写main。不要把head的数据域当作待删元素；数据结点允许删除至空表。'+note,
  '#include <stdlib.h>\n\nvoid removeValue(Node *head, int x) {\n    /* 调整链接并释放被删除的数据结点 */\n}'),
 'P4-structures-2-D-004':guide(
  '系统提供 '+node+'。first指向无头结点非空单链表的首个数据结点，表无环，长度1至256，data可为任意int值。k为正int整数。实现 const Node *kthFromEnd(const Node *first, int k)：返回原链倒数第k个结点的地址，不足k项时返回NULL。不得修改或释放结点，不得用同值的新结点代替原结点。设计一次扫描算法，要求O(n)时间、O(1)辅助空间，并说明两个游标的关系。',
  '系统已提供 '+node+'，请勿重复定义。只提交 const Node *kthFromEnd(const Node *first, int k)，不写main；first非空、k>0。失败返回NULL，成功必须是原目标结点。'+note,
  'const Node *kthFromEnd(const Node *first, int k) {\n    /* 返回原链中倒数第k个结点，或NULL */\n}'),
 'P4-structures-2-D-005':guide(
  '整数数组a、b的有效前缀长度分别为n、m，0≤n,m≤256；各自严格递增，元素可为任意int值。实现 int intersection(const int a[], int n, const int b[], int m, int c[])，把交集中的每个值恰好一次写入c，返回结果长度。c与两个输入不重叠，容量至少为min(n,m)；a、b可以是同一数组或重叠片段。不得修改输入。结果次序不限制，返回长度以外的c尾区不作要求。要求O(n+m)时间，除输出外O(1)辅助空间，并说明为何可舍弃较小项。',
  '只提交 int intersection(const int a[], int n, const int b[], int m, int c[])，不写main。参数均有效；只处理各自前n/m项，c是独立且足够的结果数组。允许任意无重复的正确交集次序。'+note,
  'int intersection(const int a[], int n, const int b[], int m, int c[]) {\n    /* 写入交集并返回有效长度 */\n}')
};
// Public worked solutions are separate from server-only test drivers.
const solutions=[
 'int removeNegatives(int a[],int n){int w=0;for(int r=0;r<n;r++)if(a[r]>=0)a[w++]=a[r];return w;}',
 'int sharesNode(const Node*a,const Node*b){if(!a||!b)return 0;while(a->next)a=a->next;while(b->next)b=b->next;return a==b;}',
 'void removeValue(Node*head,int x){Node*pre=head;while(pre->next){Node*p=pre->next;if(p->data==x){pre->next=p->next;free(p);}else pre=p;}}',
 'const Node*kthFromEnd(const Node*first,int k){const Node*fast=first,*slow=first;for(int i=0;i<k;i++){if(!fast)return NULL;fast=fast->next;}while(fast){fast=fast->next;slow=slow->next;}return slow;}',
 'int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n&&j<m){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{c[k++]=a[i];i++;j++;}}return k;}'
];
for(let i=0;i<solutions.length;i++)dsLinearTaskGuides[`P4-structures-2-D-${String(i+1).padStart(3,'0')}`].solution=solutions[i];
