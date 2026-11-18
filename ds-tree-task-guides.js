export const dsTreeTypes={
 binary:'typedef struct TreeNode { int value; struct TreeNode *left, *right; } TreeNode;',
 ordered:'typedef struct CSNode { int value; struct CSNode *firstChild, *nextSibling; } CSNode;',
 capacity:'enum { DS_TREE_MAX_N = 256 };'
};
const binary='系统提供 '+dsTreeTypes.binary+'。root可以为NULL；非空时表示合法有限二叉树，从root可达结点至多256个，无环、无共享子树。value可为任意int，允许相同值出现在不同结点。';
const readonly='输入由调用方拥有，只读，不得修改或释放。';
const output='输出缓冲由调用方提供、容量足够，且与输入及其他输出不重叠；不得释放输出缓冲。';
const guide=(statement,signature,types='')=>({revision:2,publicStatement:statement,instruction:(types?'系统已提供 '+types+'，请勿重复定义。':'')+'只提交 '+signature+'，不写main，可同时提交自写辅助函数。',starter:signature+' {\n    /* 完成原题要求的算法 */\n}'});
export const dsTreeTaskGuides={
 'P4-structures-6-D-001':guide(binary+'实现 int isBalanced(const TreeNode *root)，每个结点左右子树高度差均至多1时返回1，否则0，空树返回1。空子树高度0、叶子高度1。要求设计一次后序遍历，将高度作为递归结果复用，避免在每个结点重新遍历求高，时间O(n)。'+readonly,'int isBalanced(const TreeNode *root)',dsTreeTypes.binary),
 'P4-structures-6-D-002':guide('系统提供 '+dsTreeTypes.binary+'。实现 TreeNode *rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[])。0≤n≤256，pre和in前n项是同一棵合法普通二叉树的先序和中序序列，标识为互异int，不保证有序；实际数组可能比n长，只处理前n项。nodes前n项是调用方提供的输出结点池，初值不作假设；将重建树写在这n项中并返回根指针，n=0返回NULL。所有返回树结点必须来自该池，每项恰使用一次，不限定池内排列；只可改写nodes前n项，不改变输入。允许建立索引表，要求O(n)时间（字典均摊假设），辅助空间O(n)。'+output,'TreeNode *rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[])',dsTreeTypes.binary),
 'P4-structures-6-D-003':guide(binary+'实现 int maxTreeWidth(const TreeNode *root)，返回同一层结点数的最大值，根在第1层，空树返回0。使用层序队列时，每轮先固定本层数，刚入队的下一层不能算入本层；也可用正确的等价按层统计。要求O(n)时间，允许O(n)辅助空间。'+readonly,'int maxTreeWidth(const TreeNode *root)',dsTreeTypes.binary),
 'P4-structures-6-D-004':guide(binary+'实现 int longestRootLeafPath(const TreeNode *root,const TreeNode *out[])，将最长根到叶路径的结点指针按根至叶顺序写入out，返回路径结点数；空树返回0。多条最长路径并列时，取先左后右访问最先遇到的一条。out至少256项，返回长度以外尾区不作要求。值可重复，路径以结点身份区分。允许O(n)辅助空间。'+readonly+output,'int longestRootLeafPath(const TreeNode *root,const TreeNode *out[])',dsTreeTypes.binary),
 'P4-structures-6-D-005':guide('实现 int lcaParent(const int parent[],int n,int p,int q)。0≤n≤256；n>0时parent[1..n]是合法有根树的双亲数组，恰一项为0表示根，其余为1..n，无环且全部连到根；n=0为空树。parent[0]及索引n之后的存储不参与含义。p、q可为任意int，任一不在1..n时返回0；合法时返回最近公共祖先编号，结点本身也是自己的祖先。允许O(n)标记空间，不要求编号按树层次或数值排序。数组至少n+1项且有效。'+readonly,'int lcaParent(const int parent[],int n,int p,int q)'),
 'P4-structures-6-D-006':guide('系统提供 '+dsTreeTypes.ordered+'。输入是合法有限孩子—兄弟表示，可含指定root的兄弟，相关森林合计至多256个结点，无环、无共享。实现 int orderedTreeHeight(const CSNode *root)，只求指定root作为根的那一棵原有序树高度，不把root的nextSibling所指兄弟计入本树。NULL高度0，叶子1；兄弟在同层，只有从父到孩子才加一层。value可为任意int。要求O(n)时间。'+readonly,'int orderedTreeHeight(const CSNode *root)',dsTreeTypes.ordered),
 'P4-structures-6-D-007':guide(binary+'系统另提供 '+dsTreeTypes.capacity+'。实现 int rootLeafPaths(const TreeNode *root,int paths[][DS_TREE_MAX_N],int lengths[])，按从左到右次序将所有根到叶路径的结点值逐行写入paths，lengths[i]记录第i行有效结点数，返回路径总数。paths有256行、每行256项，lengths有256项；只评分返回的路径及各行有效长度，其他尾区不作要求。空树返回0，不输出路径。相同值和完全相同的值序列也保留每条结构路径的出现次数。若全部路径的结点出现总数为L，分析成本须包含L。'+readonly+output,'int rootLeafPaths(const TreeNode *root,int paths[][DS_TREE_MAX_N],int lengths[])',dsTreeTypes.binary+' '+dsTreeTypes.capacity),
 'P4-structures-6-D-008':guide('实现 int isBinaryTreeTable(const int L[],const int R[],int n)，验证孩子编号表能否构成恰好一棵非空二叉树，成立返回1，否则0。0≤n≤256，结点编号1..n；L[i]、R[i]为任意int，0表示空，否则须为1..n。数组至少n+1项，索引0及n之后存储不参与含义。n=0返回0。必须核孩子编号、非根入度恰1、唯一根，以及全部结点属于该树；拒绝自环、重复孩子、共享孩子、环和断开的环分量。不得只凭唯一入度0结点便接受。要求O(n)时间、O(n)辅助空间。'+readonly,'int isBinaryTreeTable(const int L[],const int R[],int n)')
};
const solutions=[
 `static int balancedHeight(const TreeNode *p){if(!p)return 0;int l=balancedHeight(p->left);if(l<0)return -1;int r=balancedHeight(p->right);if(r<0||l>r+1||r>l+1)return -1;return 1+(l>r?l:r);}
int isBalanced(const TreeNode *root){return balancedHeight(root)>=0;}`,
 `#include <stdint.h>
static unsigned intKey(int value,unsigned mask){uint32_t x=(uint32_t)value;x^=x>>16;x*=0x7feb352dU;x^=x>>15;x*=0x846ca68bU;x^=x>>16;return (unsigned)x&mask;}
typedef struct {const int *pre,*in;int *index;unsigned mask;int cursor,used;TreeNode *nodes;} BuildState;
static TreeNode *buildRange(BuildState *s,int lo,int hi){if(lo>=hi)return NULL;int value=s->pre[s->cursor++];unsigned at=intKey(value,s->mask);while(s->index[at]<0||s->in[s->index[at]]!=value)at=(at+1)&s->mask;int middle=s->index[at];TreeNode *p=&s->nodes[s->used++];p->value=value;p->left=buildRange(s,lo,middle);p->right=buildRange(s,middle+1,hi);return p;}
TreeNode *rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[]){if(n==0)return NULL;unsigned cap=1;while(cap<(unsigned)n*2)cap*=2;int index[cap];for(unsigned i=0;i<cap;i++)index[i]=-1;for(int i=0;i<n;i++){unsigned at=intKey(in[i],cap-1);while(index[at]>=0)at=(at+1)&(cap-1);index[at]=i;}BuildState s={pre,in,index,cap-1,0,0,nodes};return buildRange(&s,0,n);}`,
 `int maxTreeWidth(const TreeNode *root){if(!root)return 0;const TreeNode *queue[256];int head=0,tail=0,best=0;queue[tail++]=root;while(head<tail){int count=tail-head;if(count>best)best=count;for(int i=0;i<count;i++){const TreeNode *p=queue[head++];if(p->left)queue[tail++]=p->left;if(p->right)queue[tail++]=p->right;}}return best;}`,
 `static void collectLongest(const TreeNode *p,int parent,int depth,const TreeNode *nodes[],int parents[],int *used,int *best,int *height){if(!p)return;int me=(*used)++;nodes[me]=p;parents[me]=parent;if(!p->left&&!p->right&&depth>*height){*height=depth;*best=me;}collectLongest(p->left,me,depth+1,nodes,parents,used,best,height);collectLongest(p->right,me,depth+1,nodes,parents,used,best,height);}
int longestRootLeafPath(const TreeNode *root,const TreeNode *out[]){if(!root)return 0;const TreeNode *nodes[256];int parents[256],used=0,best=-1,height=0;collectLongest(root,-1,1,nodes,parents,&used,&best,&height);int at=height;while(best>=0){out[--at]=nodes[best];best=parents[best];}return height;}`,
 `int lcaParent(const int parent[],int n,int p,int q){if(p<1||p>n||q<1||q>n)return 0;int seen[n+1];for(int i=0;i<=n;i++)seen[i]=0;for(int x=p;x;x=parent[x])seen[x]=1;for(int x=q;x;x=parent[x])if(seen[x])return x;return 0;}`,
 `int orderedTreeHeight(const CSNode *root){if(!root)return 0;int best=0;for(const CSNode *c=root->firstChild;c;c=c->nextSibling){int h=orderedTreeHeight(c);if(h>best)best=h;}return best+1;}`,
 `static int pathsHeight(const TreeNode *p){if(!p)return 0;int l=pathsHeight(p->left),r=pathsHeight(p->right);return 1+(l>r?l:r);}
static void collectPaths(const TreeNode *p,int depth,int current[],int paths[][DS_TREE_MAX_N],int lengths[],int *count){if(!p)return;current[depth++]=p->value;if(!p->left&&!p->right){int row=(*count)++;lengths[row]=depth;for(int i=0;i<depth;i++)paths[row][i]=current[i];return;}collectPaths(p->left,depth,current,paths,lengths,count);collectPaths(p->right,depth,current,paths,lengths,count);}
int rootLeafPaths(const TreeNode *root,int paths[][DS_TREE_MAX_N],int lengths[]){if(!root)return 0;int h=pathsHeight(root),current[h],count=0;collectPaths(root,0,current,paths,lengths,&count);return count;}`,
 `int isBinaryTreeTable(const int L[],const int R[],int n){if(n==0)return 0;int degree[n+1],seen[n+1],queue[n];for(int i=0;i<=n;i++)degree[i]=seen[i]=0;for(int i=1;i<=n;i++){int child[2]={L[i],R[i]};for(int k=0;k<2;k++){int x=child[k];if(x<0||x>n)return 0;if(x&&++degree[x]>1)return 0;}}int root=0;for(int i=1;i<=n;i++)if(degree[i]==0){if(root)return 0;root=i;}if(!root)return 0;int head=0,tail=0;queue[tail++]=root;seen[root]=1;while(head<tail){int x=queue[head++],child[2]={L[x],R[x]};for(int k=0;k<2;k++)if(child[k]){int y=child[k];if(seen[y])return 0;seen[y]=1;queue[tail++]=y;}}return tail==n;}`
];
for(let i=0;i<solutions.length;i++)dsTreeTaskGuides[`P4-structures-6-D-${String(i+1).padStart(3,'0')}`].solution=solutions[i];
dsTreeTaskGuides['P4-structures-6-D-007'].manualReview=true;
dsTreeTaskGuides['P4-structures-6-D-007'].instruction+='代码测试只核对运行结果，输出量与成本分析写在注释中，随作答一并提交评阅。';
dsTreeTaskGuides['P4-structures-6-D-007'].solution='/* 设各根到叶路径的结点出现总量为L。求高和DFS共O(n)，复制各条输出共O(L)，总时间O(n+L)；当前路径与递归栈O(h)，不含调用方的输出矩阵。 */\n'+solutions[6];

const revisedTreeStatements={
 "P4-structures-6-D-002": "系统提供 typedef struct TreeNode { int value; struct TreeNode *left, *right; } TreeNode;。实现 TreeNode *rebuildPreIn(const int pre[],const int in[],int n,TreeNode nodes[])。0≤n≤256，pre和in前n项是同一棵合法普通二叉树的先序和中序序列，标识为互异int，不保证有序；实际数组可能比n长，只处理前n项。nodes前n项是调用方提供的输出结点池，初值不作假设；将重建树写在这n项中并返回根指针，n=0返回NULL。所有返回树结点必须来自该池，每项恰使用一次，不限定池内排列；只可改写nodes前n项，不改变输入。允许建立索引表，若用散列表，在查找和插入平均为O(1)的假设下要求总时间O(n)，辅助空间O(n)。接受其他满足同等时间和空间要求的实现。输出缓冲由调用方提供、容量足够，且与输入及其他输出不重叠；不得释放输出缓冲。\n例如n＝3，pre是[7, -2, 9, 99]，in是[-2, 7, 9, 88]。返回的树应为根7、左叶−2、右叶9，数组在这3项之后的元素不参与重建。",
 "P4-structures-6-D-003": "系统提供 typedef struct TreeNode { int value; struct TreeNode *left, *right; } TreeNode;。root可以为NULL；非空时表示合法有限二叉树，从root可达结点至多256个，无环、无共享子树。value可为任意int，允许相同值出现在不同结点。实现 int maxTreeWidth(const TreeNode *root)，返回同一层结点数的最大值，根在第1层，空树返回0。使用层序队列时，每轮先固定本层数，刚入队的下一层不能算入本层；也可用正确的等价按层统计。要求O(n)时间，允许O(n)辅助空间。输入由调用方拥有，只读，不得修改或释放。\n例如根有左、右孩子，左孩子仅有左叶，右孩子仅有右叶。各层真实结点数为1、2、2，返回2。位置留空的槽位不计入宽度。",
 "P4-structures-6-D-008": "实现 int isBinaryTreeTable(const int L[], const int R[], int n)，判断孩子表是否恰好表示一棵非空二叉树，成立返回1，否则返回0。0≤n≤256，结点编号为1到n。L[i]、R[i]是任意int，0为空，其他值应落在1到n。两个数组各至少有n＋1项，索引0及n之后不参与判断。输入只读，不得释放。n＝0时返回0。必须排除越界孩子、同一个孩子重复出现、多个双亲、自环、环及不连通的部分。时间O(n)，辅助空间O(n)。\n例如n＝3，结点1无孩子，结点2的左孩子为3，结点3的左孩子为2，其余为空。虽然只有结点1的入度为0，仍应返回0。"
};
export const dsTreeQualityTaskGuides=Object.fromEntries(Object.entries(revisedTreeStatements).map(([id,publicStatement])=>[
 id,{...dsTreeTaskGuides[id],revision:3,publicStatement}
]));
