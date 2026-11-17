// Public submission interfaces only. Hidden inputs and reference solutions stay on the server.
export const codingTaskGuides = {
 'P-C-03': {
  instruction: '提交指针版 void swap(int *x, int *y)。按值传递的原因和调用方式可在提交后对照解析核对。',
  starter: 'void swap(int *x, int *y) {\n    /* 完成两个整数的交换 */\n}'
 },
 '6-02': {
  instruction: '提交完整函数 int distinctFirst(const int a[], int n, int b[])。将原片段放入函数，写入容量1000的b并返回m；仍按题目要求保序且不排序、不用值域下标表。请按题设保留原方法。',
  starter: 'int distinctFirst(const int a[], int n, int b[]) {\n    int m = 0;\n    for (int i = 0; i < n; ++i) {\n        int j;\n        for (j = 0; j < m; ++j)\n            if (/* 空1 */) break;\n        if (/* 空2 */)\n            /* 空3 */;\n    }\n    return m;\n}'
 },
 'P2-programming-6-11': {
  instruction: '补全后提交完整的mean函数；只提交函数，不需要main。n>0。',
  starter: 'double mean(const int a[], int n) {\n    double sum = /* 空1 */;\n    for (int i = 0; i < n; i++) sum += /* 空2 */;\n    return /* 空3 */;\n}'
 },
 'P3-programming-6-44': {
  instruction: '提交完整函数 int eraseAt(int a[], int n, int k)。将题中片段放入函数，删除后返回更新的n；题目保证0≤k<n。',
  starter: 'int eraseAt(int a[], int n, int k) {\n    for (int i = k; i < /* 空1 */; i++) a[i] = /* 空2 */;\n    n = /* 空3 */;\n    return n;\n}'
 },
 'P3-programming-6-45': {
  instruction: '提交完整函数 int insertAt(int a[], int n, int k, int x)。将题中片段放入函数，插入后返回更新的n；容量至少n+1且0≤k≤n。',
  starter: 'int insertAt(int a[], int n, int k, int x) {\n    for (int i = n; i > /* 空1 */; i--) a[i] = /* 空2 */;\n    a[k] = x;\n    n = /* 空3 */;\n    return n;\n}'
 },
 'P3-programming-6-46': {
  instruction: '提交完整函数 int compactNonzero(int a[], int n)，原地稳定压缩非零项，返回新长度。',
  starter: 'int compactNonzero(int a[], int n) {\n    int k = 0;\n    for (int i = 0; i < n; i++) if (/* 空1 */) a[k++] = /* 空2 */;\n    return /* 空3 */;\n}'
 },
 'P3-programming-6-47': {
  instruction: '提交完整函数 void columnSums(const int a[][3], int n, int sum[3])。将题中片段放入函数，输出三列各自的和。',
  starter: 'void columnSums(const int a[][3], int n, int sum[3]) {\n    for (int j = 0; j < 3; j++) {\n        sum[j] = /* 空1 */;\n        for (int i = 0; i < n; i++) sum[j] += /* 空2 */;\n    }\n}'
 },
 'P3-programming-6-48': {
  instruction: '提交完整函数 void copyArray(const int a[], int n, int b[])，将n个元素复制到不重叠且容量足够的b。',
  starter: 'void copyArray(const int a[], int n, int b[]) {\n    for (int i = /* 空1 */; i < /* 空2 */; i++) b[i] = /* 空3 */;\n}'
 },
 'P3-programming-6-50': {
  instruction: '提交完整函数 void adjacentDiff(const int a[], int n, int b[])，将n−1个相邻差写入b。n≥1，差值保证int可表示。',
  starter: 'void adjacentDiff(const int a[], int n, int b[]) {\n    for (int i = 0; i < /* 空1 */; i++) b[i] = /* 空2 */;\n}'
 },
 'P3-programming-6-51': {
  instruction: '提交完整函数 void rowMaxima(const int a[][3], int n, int result[])，将每行的最大值写入result。',
  starter: 'void rowMaxima(const int a[][3], int n, int result[]) {\n    for (int i = 0; i < n; i++) {\n        int x = /* 空1 */;\n        for (int j = 1; j < 3; j++) if (/* 空2 */) x = a[i][j];\n        result[i] = /* 空3 */;\n    }\n}'
 },
 'P3-programming-6-52': {
  instruction: '提交完整函数 void digitCounts(const int a[], int n, int freq[10])，先清空freq再统计0至9的频率。',
  starter: 'void digitCounts(const int a[], int n, int freq[10]) {\n    for (int d = 0; d < 10; d++) freq[d] = /* 空1 */;\n    for (int i = 0; i < n; i++) freq[/* 空2 */]++;\n}'
 },
 'P3-programming-6-53': {
  instruction: '提交完整函数 int firstEqualPair(const int a[], int n)，返回第一个相邻相等对的左下标，无则返回−1。',
  starter: 'int firstEqualPair(const int a[], int n) {\n    for (int i = 0; i + 1 < n; i++) if (/* 空1 */) return /* 空2 */;\n    return /* 空3 */;\n}'
 },
 'P3-programming-6-54': {
  instruction: '提交完整函数 int antiDiagonalSum(const int a[3][3])，返回题中3×3矩阵的副对角线和。',
  starter: 'int antiDiagonalSum(const int a[3][3]) {\n    int s = 0;\n    for (int i = 0; i < 3; i++) s += a[i][/* 空1 */];\n    return /* 空2 */;\n}'
 },
 'P3-programming-6-55': {
  instruction: '提交完整函数 int minPositive(const int a[], int n)，返回最小正数元素，不存在时返回0。',
  starter: 'int minPositive(const int a[], int n) {\n    int best = 0;\n    for (int i = 0; i < n; i++) if (a[i] > 0 && (/* 空1 */)) best = /* 空2 */;\n    return best;\n}'
 }
};
