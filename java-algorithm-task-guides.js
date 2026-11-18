// Public Java interfaces and worked solutions. No private cases or driver code.
export const javaAlgorithmTypes={
  sortRecord:'final class SortRecord { final int key, identity; SortRecord(int k,int i){ key=k; identity=i; } }'
};
const intro=n=>`P4-structures-1-D-${String(n).padStart(3,'0')}`;
const sort=n=>`P4-structures-10-D-${String(n).padStart(3,'0')}`;
const record='系统提供 '+javaAlgorithmTypes.sortRecord+'。请勿重复定义SortRecord。只按key比较；identity为随记录保存的数据，可为任意int并允许重复，不能用来给等键重新排序。可以移动记录引用，也可复制为字段值相同的新记录，不要求保留同一对象引用。';
const prefix='数组下标从0开始，只处理给定的逻辑前缀，数组实际长度可能更大。输入a（归并时a、b）的有效记录前缀均非null；out或work若存在，其元素调用前可为null或任意记录。前缀以外的项不参与排序。除另有说明外，数组对象非null，长度满足题目容量要求。';
const stable='结果按key非递减，同键记录保持原出现次序，两个字段均须完整保留。';
const wrap=methods=>'public class Solution {\n'+methods+'\n}';
const definitions=[
  [intro(1),'iterativeSum','public static long iterativeSum(int n)',
    '输入非负整数n，0≤n≤100000。用迭代计算1+2+…+n，n=0返回0，不用递归，返回完整的long结果。在代码注释中说明所选算法的基本累加次数，并分析时间与辅助空间；区分累加语句和循环变量更新。',
    '    public static long iterativeSum(int n) { long sum=0; for(int i=1;i<=n;i++) sum+=i; return sum; }\n    // 此写法累加n次；从首项初始化再累加2..n的合法写法，在n>0时为n-1次。时间Theta(n)，辅助空间Theta(1)。',true],
  [intro(2),'minMax','public static int[] minMax(int[] a,int n)',
    '对整数数组a的前n项求最小值和最大值，1≤n≤1024，元素可为任意int。返回长度恰为2的数组，依次为[min,max]；不修改a，包括逻辑前缀以外的存储。a.length≥n，可由实际元素初始化，不得用0、9999等固定数据哨兵假定值域。分析最坏时间与辅助空间。',
    '    public static int[] minMax(int[] a,int n) { int lo=a[0],hi=a[0]; for(int i=1;i<n;i++){ if(a[i]<lo)lo=a[i]; if(a[i]>hi)hi=a[i]; } return new int[]{lo,hi}; }\n    // 首元素初始化也适用于单元素、全负数和int两端。最坏Theta(n)时间，除返回数组外Theta(1)辅助空间。',true],
  [intro(3),'countParity','public static int[] countParity(int[] a,int n)',
    '统计整数数组a前n项的奇数和偶数个数，0≤n≤1024，元素可为任意int。返回长度恰为2的数组，依次为[odd,even]。负数正常分类，0为偶数。n>0时a非null且a.length≥n；n=0时a可为null，也可有额外存储，均不读取元素并返回[0,0]。不修改输入。',
    '    public static int[] countParity(int[] a,int n) { int odd=0; for(int i=0;i<n;i++) if(a[i]%2!=0) odd++; return new int[]{odd,n-odd}; }',false],
  [intro(4),'validIndex','public static int validIndex(int n,int i)',
    '只根据数组长度n和目标下标i的数值判断是否合法。两个参数均可为任意int；当且仅当n≥0且0≤i<n时返回1，否则返回0。函数没有数组参数，不读取数组内容。',
    '    public static int validIndex(int n,int i) { return n>=0 && i>=0 && i<n ? 1 : 0; }',false],
  [sort(1),'stableInsertion','public static void stableInsertion(SortRecord[] a,int n)',
    record+'对a前n项作无专用监视哨的稳定直接插入排序，0≤n≤256，key可为任意int。'+stable+'只可改写前n项，空数组不操作；不另开与n同规模的数组，要求O(n+I)时间、O(1)额外记录空间，I为严格逆序对数。'+prefix,
    '    public static void stableInsertion(SortRecord[] a,int n) { for(int i=1;i<n;i++){ SortRecord x=a[i]; int j=i; while(j>0 && a[j-1].key>x.key){ a[j]=a[j-1]; j--; } a[j]=x; } }',false],
  [sort(2),'binaryInsertion','public static void binaryInsertion(SortRecord[] a,int n)',
    record+'采用折半定位和移动记录，对a前n项作稳定插入排序，0≤n≤256，key可为任意int。'+stable+'只可改写前n项，O(1)额外记录空间；定位每项用O(log(n+1))比较，最坏移动总量O(n²)。在代码注释中说明等键插入位置及右移记录采用所选方向的理由。'+prefix,
    '    public static void binaryInsertion(SortRecord[] a,int n) { for(int i=1;i<n;i++){ SortRecord x=a[i]; int lo=0,hi=i; while(lo<hi){ int mid=lo+(hi-lo)/2; if(a[mid].key<=x.key)lo=mid+1; else hi=mid; } for(int j=i;j>lo;j--)a[j]=a[j-1]; a[lo]=x; } }\n    // 找第一个key>x.key的位置，使新记录在原有等键之后。从后向前右移，避免覆盖尚未移动的记录。',true],
  [sort(3),'mergeStable','public static void mergeStable(SortRecord[] a,int n,SortRecord[] b,int m,SortRecord[] out)',
    record+'a前n项与b前m项各按key非递减，0≤n,m≤256。稳定归并到out前n+m项，任一输入可为空。稳定顺序以逻辑连接a后接b为基准，同键先取a中的记录。输入只读，a与b可以是同一个数组，n与m可不同；out与两输入为不同数组且长度至少n+m，out尾区不改。要求O(n+m)时间、除输出外O(1)辅助空间。'+prefix,
    '    public static void mergeStable(SortRecord[] a,int n,SortRecord[] b,int m,SortRecord[] out) { int i=0,j=0,k=0; while(i<n && j<m) out[k++]=a[i].key<=b[j].key?a[i++]:b[j++]; while(i<n)out[k++]=a[i++]; while(j<m)out[k++]=b[j++]; }',false],
  [sort(4),'mergeSortBottomUp','public static void mergeSortBottomUp(SortRecord[] a,int n,SortRecord[] work)',
    record+'按段宽1、2、4…自底向上二路归并排序a前n项，0≤n≤1024，key可为任意int。'+stable+'a和work是不同数组，work.length≥n；只可改写两数组前n项，work前n项最终内容不评分。空数组不操作，无配对右段时须完整保留末段。要求O(n log(n+1))时间、O(n)辅助缓冲。'+prefix,
    '    public static void mergeSortBottomUp(SortRecord[] a,int n,SortRecord[] work) { for(int width=1;width<n;width*=2){ for(int l=0;l<n;l+=2*width){ int mid=Math.min(l+width,n),r=Math.min(l+2*width,n),i=l,j=mid,k=l; while(i<mid && j<r)work[k++]=a[i].key<=a[j].key?a[i++]:a[j++]; while(i<mid)work[k++]=a[i++]; while(j<r)work[k++]=a[j++]; } for(int i=0;i<n;i++)a[i]=work[i]; } }',false],
  [sort(5),'isMaxHeap','public static int isMaxHeap(int[] a,int n)',
    '检查int数组a前n项是否为大根堆，成立返回1，否则0。0≤n≤1024，元素可为任意int，允许重复。空数组和单元素均为堆；父下标i的孩子为2i+1、2i+2，只检查存在的孩子。a.length≥n，实际数组可更长，所有输入只读，不得排序。要求O(n)时间、O(1)辅助空间。',
    '    public static int isMaxHeap(int[] a,int n) { for(int i=0;i<n/2;i++){ int l=2*i+1,r=l+1; if(a[i]<a[l] || (r<n && a[i]<a[r])) return 0; } return 1; }',false],
  [sort(6),'heapInsert','public static int heapInsert(int[] a,int n,int value)',
    'a前n项已为大根堆，0≤n≤1023，a.length≥n+1，键和值可为任意int，允许重复。追加value并上滤，形成包含原全部键及value的大根堆，返回新长度n+1。只可改写前n+1项，其他存储不改。允许不同的合法堆排列，不固定等键位置；n=0时形成单元素堆。要求O(log(n+1))时间、O(1)辅助空间。',
    '    public static int heapInsert(int[] a,int n,int value) { int i=n; while(i>0){ int p=(i-1)/2; if(a[p]>=value)break; a[i]=a[p]; i=p; } a[i]=value; return n+1; }',false],
  [sort(7),'countingSortStable','public static void countingSortStable(SortRecord[] a,int n,int v,int w,SortRecord[] out)',
    record+'采用计数和累计位置稳定排序a前n项，0≤n≤1024；v、w为int且v≤w，R=w-v+1满足1≤R≤512，前n项key均在[v,w]内。'+stable+'输入全部只读；out与a为不同数组、长度至少n，只可改写out前n项。允许按起点正向分配或末边界反向分配等稳定方案。要求O(n+R)时间，允许O(n+R)辅助空间。'+prefix,
    '    public static void countingSortStable(SortRecord[] a,int n,int v,int w,SortRecord[] out) { int[] count=new int[w-v+1]; for(int i=0;i<n;i++)count[a[i].key-v]++; for(int i=1;i<count.length;i++)count[i]+=count[i-1]; for(int i=n-1;i>=0;i--)out[--count[a[i].key-v]]=a[i]; }',false],
  [sort(8),'quickSelect','public static int quickSelect(int[] a,int n,int k)',
    '用快速选择返回a前n项按非递减排列后的第k小值，1≤n≤1024，1≤k≤n，元素可为任意int且允许重复。采用小于、等于、大于枢轴的三路分区。a.length≥n，允许重排前n项，但须保留原多重集，n之后不改，不固定最终排列。在代码注释中说明等于枢轴区间对定位目标秩及保证进度的作用。',
    '    public static int quickSelect(int[] a,int n,int k) { int left=0,right=n,target=k-1; while(left<right){ int pivot=a[left+(right-left)/2],low=left,i=left,high=right; while(i<high){ if(a[i]<pivot){ int x=a[low]; a[low++]=a[i]; a[i++]=x; } else if(a[i]>pivot){ int x=a[--high]; a[high]=a[i]; a[i]=x; } else i++; } if(target<low)right=low; else if(target>=high)left=high; else return pivot; } return a[target]; }\n    // 目标秩在[low,high)内时答案即pivot，否则只继续目标所在侧。非空等键段被一次排除，全相等时也能结束。',true],
  [sort(9),'countInversions','public static long countInversions(int[] a,int n,int[] work)',
    '用归并计数统计a前n项的严格逆序对：i<j且a[i]>a[j]，相等不计。0≤n≤4096，元素可为任意int，空数组返回0，返回类型为long。允许重排前n项或保持原序，但须保留原多重集，不要求最终有序。a、work是不同数组且长度至少n；work前n项最终内容不评分，两数组n之后均不改。要求O(n log(n+1))时间、O(n)辅助空间。',
    '    private static long countPart(int[] a,int[] work,int l,int r) { if(r-l<2)return 0; int mid=l+(r-l)/2; long count=countPart(a,work,l,mid)+countPart(a,work,mid,r); int i=l,j=mid,k=l; while(i<mid && j<r){ if(a[i]<=a[j])work[k++]=a[i++]; else { work[k++]=a[j++]; count+=mid-i; } } while(i<mid)work[k++]=a[i++]; while(j<r)work[k++]=a[j++]; for(i=l;i<r;i++)a[i]=work[i]; return count; }\n    public static long countInversions(int[] a,int n,int[] work) { return countPart(a,work,0,n); }',false]
];
export const javaAlgorithmTaskGuides=Object.fromEntries(definitions.map(([id,methodName,signature,publicStatement,methods,manualReview])=>{
  const initial=signature.includes(' int[] ')?'return new int[2];':signature.includes(' long ')?'return 0L;':signature.includes(' void ')?'':'return 0;';
  return [id,{revision:id===intro(1)||id===sort(8)?3:2,language:'java',testable:true,publicStatement:'实现 '+signature+'。'+publicStatement,
    instruction:'提交完整的Solution类，方法须为public static，不写package或main；可以import标准类及自写辅助方法或辅助类。'+(signature.includes('SortRecord')?'SortRecord由系统提供，请勿重复定义。':'')+(manualReview?'题目要求的分析写在代码注释中。代码测试只核对运行结果，分析部分随作答一并提交评阅。':''),
    signature,methodName,starter:wrap('    '+signature+' {\n        // 在这里完成方法\n        '+initial+'\n    }'),solution:wrap(methods),manualReview}];
}));
