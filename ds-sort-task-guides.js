// Revision-2 interfaces for the nine existing internal-sorting exercises.
// Public statements/solutions only; finite test drivers remain server-side.
export const dsSortTypes={record:'typedef struct { int key, identity; } SortRecord;'};
const record='系统提供 '+dsSortTypes.record+'。只按key比较；identity是随记录整体保存的数据，可为任意int，也允许重复，不能作为等键排序条件。';
const prefix='数组下标从0开始，int为32位有符号类型。只处理指定的逻辑前缀，实际缓冲可能更长。所有缓冲由调用方拥有，不得释放；参数有效，不要求处理NULL。';
const stable='结果按key非递减，同键记录保持原出现次序；必须整体保留两个字段。';
const make=(publicStatement,signature,types='')=>({revision:2,publicStatement,instruction:(types?'系统已提供 '+types+'，请勿重复定义。':'')+'只提交 '+signature+' 的完整定义，不写main；可同时提交自写辅助函数。',starter:signature+' {\n    /* 完成函数 */\n}'});
export const dsSortTaskGuides={
 'P4-structures-10-D-001':make(record+'实现 void stableInsertion(SortRecord a[], int n)，对前n项作无专用监视哨的稳定直接插入排序。0≤n≤256，key可为任意int；空数组不操作。'+stable+'只可改写a前n项，不另开与n同规模的数组；要求O(n+I)时间、O(1)额外记录空间，I为严格逆序对数。'+prefix,'void stableInsertion(SortRecord a[], int n)',dsSortTypes.record),
 'P4-structures-10-D-002':make(record+'实现 void binaryInsertion(SortRecord a[], int n)，采用折半定位及移动记录完成稳定插入排序。0≤n≤256，key可为任意int；空数组不操作。'+stable+'只可改写前n项，O(1)额外记录空间；定位每项用O(log(n+1))比较，最坏移动总量O(n²)。在代码注释中说明等键时选择的插入位置，以及右移记录为什么采用所选方向。'+prefix,'void binaryInsertion(SortRecord a[], int n)',dsSortTypes.record),
 'P4-structures-10-D-003':make(record+'实现 void mergeStable(const SortRecord a[], int n, const SortRecord b[], int m, SortRecord out[])。a前n项、b前m项各自按key非递减，0≤n,m≤256。将全部n+m条记录稳定归并到out前n+m项；任一输入可为空。稳定次序以逻辑连接a后接b为基准，同键时先保留a中的记录。两个输入可以同址或引用重叠片段，均只读；out与输入不重叠、容量至少n+m，只可改写out前n+m项，尾区不作改动。要求O(n+m)时间、除输出外O(1)辅助空间。'+prefix,'void mergeStable(const SortRecord a[], int n, const SortRecord b[], int m, SortRecord out[])',dsSortTypes.record),
 'P4-structures-10-D-004':make(record+'实现 void mergeSortBottomUp(SortRecord a[], int n, SortRecord work[])，按段宽1、2、4…自底向上二路归并排序。0≤n≤1024，key可为任意int。'+stable+'a和work互不重叠，work至少n项；只可改写两数组前n项，work前n项结束内容不评分。空数组不操作，无配对右段时仍须完整保留末段。要求O(n log(n+1))时间、O(n)辅助缓冲。'+prefix,'void mergeSortBottomUp(SortRecord a[], int n, SortRecord work[])',dsSortTypes.record),
 'P4-structures-10-D-005':make('实现 int isMaxHeap(const int a[], int n)，检查前n项能否按完全二叉树顺序表示大根堆；成立返回1，否则0。0≤n≤1024，元素可为任意int，允许重复。空数组和单元素都为堆；父下标i的孩子为2i+1和2i+2，仅检查存在的孩子。不得排序或修改输入，包括逻辑前缀以外存储。要求O(n)时间、O(1)辅助空间。'+prefix,'int isMaxHeap(const int a[], int n)'),
 'P4-structures-10-D-006':make('实现 int heapInsert(int a[], int n, int value)。调用前a前n项是合法大根堆，0≤n≤1023，缓冲容量至少n+1；键和值可为任意int，允许重复。追加value并通过上滤形成含原全部键及value的大根堆，返回新长度n+1。只可改写a前n+1项，其他存储不改。结果允许不同的合法堆排列，不要求等键采用固定位置；n=0时直接形成单元素堆。要求O(log(n+1))时间、O(1)辅助空间。'+prefix,'int heapInsert(int a[], int n, int value)'),
 'P4-structures-10-D-007':make(record+'实现 void countingSortStable(const SortRecord a[], int n, int v, int w, SortRecord out[])，采用计数与累计位置完成稳定排序。0≤n≤1024，v、w可为任意int且v≤w，R=w-v+1满足1≤R≤512，全部key在[v,w]内。'+stable+'输入全部只读，out与输入不重叠且至少n项；只可改写out前n项，不要求处理值域外的非法数据。允许按起点正向分配或按末边界反向分配等稳定方案。要求O(n+R)时间，允许O(n+R)辅助空间。'+prefix,'void countingSortStable(const SortRecord a[], int n, int v, int w, SortRecord out[])',dsSortTypes.record),
 'P4-structures-10-D-008':make('实现 int quickSelect(int a[], int n, int k)，用快速选择返回前n项按非递减排列后的第k小值。1≤n≤1024，1≤k≤n，键可为任意int且允许重复。采用小于、等于、大于枢轴的三路分区；允许原地重排前n项，但必须保留原多重集，n之后存储不改，不固定最终排列。在代码注释中说明等于枢轴区间对定位目标秩和保证进度的作用。'+prefix,'int quickSelect(int a[], int n, int k)'),
 'P4-structures-10-D-009':make('实现 long long countInversions(int a[], int n, int work[])，用归并计数统计前n项中的严格逆序对：i<j且a[i]>a[j]，相等不计。0≤n≤4096，元素可为任意int，空数组结果0；返回类型为long long。允许重排a前n项，也允许保持原序，但必须保留原多重集；不要求最终a有序。work与a不重叠且至少n项，work前n项结束内容不评分；两数组n之后存储均不改。要求O(n log(n+1))时间、O(n)辅助空间。'+prefix,'long long countInversions(int a[], int n, int work[])')
};
const solutions=[
 'void stableInsertion(SortRecord a[],int n){for(int i=1;i<n;i++){SortRecord x=a[i];int j=i;while(j>0&&a[j-1].key>x.key){a[j]=a[j-1];j--;}a[j]=x;}}',
 'void binaryInsertion(SortRecord a[],int n){for(int i=1;i<n;i++){SortRecord x=a[i];int lo=0,hi=i;while(lo<hi){int mid=lo+(hi-lo)/2;if(a[mid].key<=x.key)lo=mid+1;else hi=mid;}for(int j=i;j>lo;j--)a[j]=a[j-1];a[lo]=x;}}\n/* 折半查找首个key>x.key的位置，新记录排在已有等键之后。右移从末项向前，避免覆盖尚未移动的记录。 */',
 'void mergeStable(const SortRecord a[],int n,const SortRecord b[],int m,SortRecord out[]){int i=0,j=0,k=0;while(i<n&&j<m)out[k++]=a[i].key<=b[j].key?a[i++]:b[j++];while(i<n)out[k++]=a[i++];while(j<m)out[k++]=b[j++];}',
 'void mergeSortBottomUp(SortRecord a[],int n,SortRecord work[]){for(int width=1;width<n;width*=2){for(int left=0;left<n;left+=2*width){int mid=left+width<n?left+width:n,right=left+2*width<n?left+2*width:n;int i=left,j=mid,k=left;while(i<mid&&j<right)work[k++]=a[i].key<=a[j].key?a[i++]:a[j++];while(i<mid)work[k++]=a[i++];while(j<right)work[k++]=a[j++];}for(int i=0;i<n;i++)a[i]=work[i];}}',
 'int isMaxHeap(const int a[],int n){for(int i=0;i<n/2;i++){int l=2*i+1,r=l+1;if(a[i]<a[l]||(r<n&&a[i]<a[r]))return 0;}return 1;}',
 'int heapInsert(int a[],int n,int value){int i=n;while(i>0){int p=(i-1)/2;if(a[p]>=value)break;a[i]=a[p];i=p;}a[i]=value;return n+1;}',
 'void countingSortStable(const SortRecord a[],int n,int v,int w,SortRecord out[]){int count[512]={0};int range=w-v+1;for(int i=0;i<n;i++)count[a[i].key-v]++;for(int i=1;i<range;i++)count[i]+=count[i-1];for(int i=n-1;i>=0;i--)out[--count[a[i].key-v]]=a[i];}',
 'int quickSelect(int a[],int n,int k){int left=0,right=n,target=k-1;while(left<right){int pivot=a[left+(right-left)/2],low=left,i=left,high=right;while(i<high){if(a[i]<pivot){int x=a[low];a[low++]=a[i];a[i++]=x;}else if(a[i]>pivot){int x=a[--high];a[high]=a[i];a[i]=x;}else i++;}if(target<low)right=low;else if(target>=high)left=high;else return pivot;}return a[target];}\n/* 全局秩target落在[low,high)时答案就是pivot；否则只继续目标所在侧。非空等键段被一次排除，全部相等也能一趟结束，避免重复键使区间不收缩。 */',
 'static long long countPart(int a[],int work[],int l,int r){if(r-l<2)return 0;int mid=l+(r-l)/2;long long count=countPart(a,work,l,mid)+countPart(a,work,mid,r);int i=l,j=mid,k=l;while(i<mid&&j<r){if(a[i]<=a[j])work[k++]=a[i++];else{work[k++]=a[j++];count+=(long long)(mid-i);}}while(i<mid)work[k++]=a[i++];while(j<r)work[k++]=a[j++];for(i=l;i<r;i++)a[i]=work[i];return count;}\nlong long countInversions(int a[],int n,int work[]){return countPart(a,work,0,n);}'
];
for(let i=0;i<solutions.length;i++)dsSortTaskGuides[`P4-structures-10-D-${String(i+1).padStart(3,'0')}`].solution=solutions[i];
for(const n of [2,8]){const guide=dsSortTaskGuides[`P4-structures-10-D-${String(n).padStart(3,'0')}`];guide.manualReview=true;guide.instruction+='代码可运行核对结果；题目要求的分析写在代码注释中，随作答一并提交评阅。';}
const binaryInsertionId='P4-structures-10-D-002';
const binaryInsertion=dsSortTaskGuides[binaryInsertionId];
export const dsSortQualityTaskGuides={
 [binaryInsertionId]:{...binaryInsertion,revision:3,publicStatement:binaryInsertion.publicStatement.replace(
  '以及右移记录为什么采用所选方向',
  '以及所选搬移方法怎样避免覆盖尚未搬移的记录（可用倒序逐项搬移或支持重叠区间的等价操作）'
 )}
};
