// Revision-2 public interfaces and worked functions for existing search tasks.
export const dsSearchTypes={
 bst:'typedef struct BSTNode { int key; struct BSTNode *left, *right; } BSTNode;',
 slot:'enum { EMPTY=0, OCCUPIED=1, DELETED=2 };\ntypedef struct { int key; int state; } SearchSlot;',
 chain:'typedef struct HashNode { int key; struct HashNode *next; } HashNode;',
 trie:'typedef struct TrieNode { int terminal; struct TrieNode *child[26]; } TrieNode;'
};
const own='所有未明确修改的输入均只读，由调用方拥有，不得释放。数组参数有效，逻辑长度为0时也提供有效存储；逻辑范围之外可能仍有物理存储。输出由调用方提供、容量足够且不与输入重叠。';
const ordered='升序整数数组a的前n项有效，允许重复，0≤n≤1024，元素与查询值均可为任意int。该长度上限仅为本练习范围。';
const bst='系统提供 '+dsSearchTypes.bst+'。root指向互异键普通二叉排序树，NULL表示空树，各结点无共享且无环，key可为任意int；本练习至多256个输入结点，不保证平衡。';
const probing='系统提供 '+dsSearchTypes.slot+'。表长1≤m≤256，table前m槽有效。OCCUPIED的键在全表唯一，EMPTY表示从未使用，DELETED为墓碑，两类非占用槽的key不参与含义。表由线性探测插入、墓碑删除形成，每个已占键从其散列初址按模m逐槽探测，遇EMPTY前必能找到。散列初址为key对m的非负余数，负键也须落在0至m-1。没有EMPTY的表同样合法。该容量上限仅为本练习范围。';
const make=(publicStatement,signature,types='')=>({revision:2,publicStatement,instruction:(types?'系统已提供 '+types+'，请勿重复定义。':'')+'只提交 '+signature+'，不写main；可提交自写辅助函数。',starter:signature+' {\n    /* 完成原题算法 */\n}'});
export const dsSearchTaskGuides={
 'P4-structures-9-D-001':make(ordered+'实现 int lowerBound(const int a[], int n, int key)，返回第一个大于或等于key的0起始位置；不存在则返回n，空数组返回0。使用折半查找，要求O(log(n+1))时间、O(1)辅助空间。'+own,'int lowerBound(const int a[], int n, int key)'),
 'P4-structures-9-D-002':make(ordered+'实现 int countInRange(const int a[], int n, int L, int R)，返回闭值域[L,R]内的元素个数，重复元素逐个计数；L>R返回0。L、R也可为任意int，不得依赖R+1仍可表示。使用两个折半边界，要求O(log(n+1))时间、O(1)辅助空间。'+own,'int countInRange(const int a[], int n, int L, int R)'),
 'P4-structures-9-D-003':make('两个整数数组a、b的有效前缀各自严格递增，长度n、m各为0至1024，键可为任意int；本练习长度范围如此。输入可以是同一个数组或互相重叠的片段。实现 int commonKey(const int a[], int n, const int b[], int m, int *out)，若有公共键返回1并把任意一个公共键写到*out；没有则返回0且*out原值不变。状态和值分开，0、负数和int极值均是正常键。一次双指针线性扫描，要求O(n+m)时间、O(1)辅助空间。out有效且与两个输入独立。'+own,'int commonKey(const int a[], int n, const int b[], int m, int *out)'),
 'P4-structures-9-D-004':make(bst+'实现 int bstMinimum(const BSTNode *root, int *out)，树非空时返回1并把最小键写到*out，空树返回0且*out原值不变。out有效且与树结点独立。给出迭代实现，并在注释中分析时间与辅助空间，不得假定树高必为对数。'+own,'int bstMinimum(const BSTNode *root, int *out)',dsSearchTypes.bst),
 'P4-structures-9-D-005':make(bst+'实现 int bstRange(const BSTNode *root, int L, int R, int out[])，将闭区间[L,R]内全部键按升序写到out，返回写入数；L>R为空结果。L、R可为任意int，out容量至少为树的结点数。用BST的范围关系剪枝，要求O(h+k)时间、O(h)递归栈，其中h为树高、k为输出数；返回长度以外的输出尾区不作要求。'+own,'int bstRange(const BSTNode *root, int L, int R, int out[])',dsSearchTypes.bst),
 'P4-structures-9-D-006':make(bst+'实现 int bstInsert(BSTNode **root, int key)，root是有效的根指针对象地址，*root可为NULL；该指针对象可为独立变量或不属于本次树的结构体中的left/right字段。按普通BST迭代插入：已有key返回0且树不变；新结点申请成功返回1，并接到查找落点的空链接；分配失败返回-1，树与根指针保持原状。已有结点可被调用方保留别名，其地址、key与原有非空链接不得改变，不做平衡旋转，也不得释放已有结点。新结点用标准动态内存分配函数申请并可用free释放，左右链接初始化为NULL；结果全部结点归调用方所有。重复键即使当时分配不可用仍应返回0。要求O(h)时间、O(1)搜索辅助空间。本题的根指针本身是输出，不适用输入只读约定。','int bstInsert(BSTNode **root, int key)',dsSearchTypes.bst),
 'P4-structures-9-D-007':make(probing+'实现 int probingFind(const SearchSlot table[], int m, int key)，找到时返回该OCCUPIED槽的0起始下标，未找到返回-1。遇EMPTY可停止，遇DELETED必须继续，每次查询至多检查m槽，以保证全占用或全墓碑表也终止。要求最坏O(m)时间、O(1)辅助空间。'+own,'int probingFind(const SearchSlot table[], int m, int key)',dsSearchTypes.slot),
 'P4-structures-9-D-008':make(probing+'实现 int probingInsert(SearchSlot table[], int m, int key)，按集合语义插入：已存在返回0且不改变各槽状态与已占键；无可用槽返回-1且表不变；新增返回1。新增只把一个先前非占用槽变为OCCUPIED，保留其他各槽状态及全部原有已占键的位置和值。可选从散列初址到首EMPTY之前的任一DELETED或该首EMPTY；若整圈没有EMPTY，可选任一墓碑。无论选择哪个空位，都须先排除探测序列上已有同键，不能遇墓碑立即插入。非占用槽的key始终不评分。最多检查m槽，要求最坏O(m)时间、O(1)辅助空间；只处理table前m槽，物理尾区保持不变。','int probingInsert(SearchSlot table[], int m, int key)',dsSearchTypes.slot),
 'P4-structures-9-D-009':make('系统提供 '+dsSearchTypes.chain+'。buckets前m项为无头结点链地址表的桶头，1≤m≤64，本练习总共0至256个结点；每条链无环，桶间无共享，所有key唯一且可为任意int。各结点都由标准动态内存分配函数申请，可用free释放。key的桶号为key对m的非负余数，桶内次序任意，空桶为NULL。实现 int chainErase(HashNode *buckets[], int m, int key)，存在则摘除该结点、恰好释放它并返回1，不存在则返回0且不改表。调用方可保留其他结点别名，幸存结点地址与key不变，链接只跳过被删结点；保留其他桶。桶指针数组本身不属于结点对象，结果归调用方拥有；不得在释放后再读取目标成员。要求O(桶长)时间、O(1)辅助空间。只处理前m个桶，物理尾区保持不变。','int chainErase(HashNode *buckets[], int m, int key)',dsSearchTypes.chain),
 'P4-structures-9-D-010':make('系统提供 '+dsSearchTypes.trie+'。这是按小写ASCII字母a至z逐字符分支的Trie，child[0]到child[25]对应a至z，无相应边为NULL；结点无环无共享。terminal为0表示不是完整词，非零表示已登记完整词。root=NULL表示空词集合，否则根也有自己的terminal，空串可以登记。本练习至多512个结点，待查key为有效NUL终止串，终止前仅含a至z，长度0至128。实现 int trieContains(const TrieNode *root, const char key[])，完整存在返回1，否则0；只有路径存在不代表该前缀已登记，空串应检查根的terminal。要求O(L+1)时间、O(1)查询辅助空间，不得修改或释放Trie与key。所有存储归调用方，NUL之后可能仍有物理字节，不属于键。','int trieContains(const TrieNode *root, const char key[])',dsSearchTypes.trie)
};
const solutions=[
 'int lowerBound(const int a[],int n,int key){int l=0,r=n;while(l<r){int mid=l+(r-l)/2;if(a[mid]<key)l=mid+1;else r=mid;}return l;}',
 'int countInRange(const int a[],int n,int L,int R){if(L>R)return 0;int l=0,r=n;while(l<r){int mid=l+(r-l)/2;if(a[mid]<L)l=mid+1;else r=mid;}int first=l;l=0;r=n;while(l<r){int mid=l+(r-l)/2;if(a[mid]<=R)l=mid+1;else r=mid;}return l-first;}',
 'int commonKey(const int a[],int n,const int b[],int m,int*out){int i=0,j=0;while(i<n&&j<m){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{*out=a[i];return 1;}}return 0;}',
 '/* 沿left迭代到最左端，时间O(h)，辅助空间O(1)。普通BST可退化成链，h可为n，不能保证O(log n)。 */\nint bstMinimum(const BSTNode*root,int*out){if(!root)return 0;while(root->left)root=root->left;*out=root->key;return 1;}',
 'static int rangeVisit(const BSTNode*p,int L,int R,int out[],int n){if(!p)return n;if(p->key>L)n=rangeVisit(p->left,L,R,out,n);if(p->key>=L&&p->key<=R)out[n++]=p->key;if(p->key<R)n=rangeVisit(p->right,L,R,out,n);return n;}\nint bstRange(const BSTNode*root,int L,int R,int out[]){if(L>R)return 0;return rangeVisit(root,L,R,out,0);}',
 '#include <stdlib.h>\nint bstInsert(BSTNode**root,int key){BSTNode**slot=root;while(*slot){if(key<(*slot)->key)slot=&(*slot)->left;else if(key>(*slot)->key)slot=&(*slot)->right;else return 0;}BSTNode*p=malloc(sizeof *p);if(!p)return -1;*p=(BSTNode){key,NULL,NULL};*slot=p;return 1;}',
 'int probingFind(const SearchSlot table[],int m,int key){int at=key%m;if(at<0)at+=m;for(int step=0;step<m;step++){if(table[at].state==EMPTY)return -1;if(table[at].state==OCCUPIED&&table[at].key==key)return at;if(++at==m)at=0;}return -1;}',
 'int probingInsert(SearchSlot table[],int m,int key){int at=key%m;if(at<0)at+=m;int deleted=-1;for(int step=0;step<m;step++){if(table[at].state==OCCUPIED){if(table[at].key==key)return 0;}else if(table[at].state==DELETED){if(deleted<0)deleted=at;}else{if(deleted>=0)at=deleted;table[at]=(SearchSlot){key,OCCUPIED};return 1;}if(++at==m)at=0;}if(deleted<0)return -1;table[deleted]=(SearchSlot){key,OCCUPIED};return 1;}',
 '#include <stdlib.h>\nint chainErase(HashNode*buckets[],int m,int key){int at=key%m;if(at<0)at+=m;HashNode**slot=buckets+at;while(*slot){HashNode*p=*slot;if(p->key==key){*slot=p->next;free(p);return 1;}slot=&p->next;}return 0;}',
 'int trieContains(const TrieNode*root,const char key[]){if(!root)return 0;for(int i=0;key[i];i++){root=root->child[(unsigned char)key[i]-\'a\'];if(!root)return 0;}return root->terminal!=0;}'
];
for(let i=0;i<solutions.length;i++)dsSearchTaskGuides[`P4-structures-9-D-${String(i+1).padStart(3,'0')}`].solution=solutions[i];
dsSearchTaskGuides['P4-structures-9-D-004'].manualReview=true;
dsSearchTaskGuides['P4-structures-9-D-004'].instruction+='代码可运行核对结果；迭代方法的时间与辅助空间分析写在注释中，随答案提交评阅。';

export const dsSearchQualityTaskGuides=Object.fromEntries(
 ['P4-structures-9-D-003','P4-structures-9-D-006'].map(id=>[id,{...dsSearchTaskGuides[id],revision:3}])
);
