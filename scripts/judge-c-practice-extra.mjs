// Trusted C17 practice drivers. Expected results are calculated separately in JS.
// Functional checks do not establish asymptotic complexity or forbidden algorithm use.
const lit = a => `{${a.length ? a.join(',') : 0}}`;
const arrays = [[], [0], [1], [-1], [2, 2], [3, 1, 3, 2, 1], [0, -2, 0, 5, 0],
 [-5, -3, -9], [1, 2, 3], [3, 2, 1], [2, 2, 1, 2, 2], [1, 4, 4, 1],
 [-2147483648, 0, 2147483647], Array.from({length: 41}, (_, i) => i * 17 % 13 - 6)];
const safeDiffArrays = arrays.filter(a => a.every((x, i) => !i || Math.abs(x - a[i - 1]) <= 2147483647));
const matrices3 = [[], [[-5, -2, -8]], [[1, 2, 3], [4, 5, 6]],
 [[-3, -7, -1], [-2, -8, -4], [-9, -6, -5]], [[5, 0, -5], [1, 1, -2], [0, 0, 0]],
 [[9, 1, 2], [3, 4, 5], [6, 7, 8]], [[2147483647, -2147483648, 0], [-1, 1, 2]]];
const squareMatrices = [
 [[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[-7, 2, 10], [-1, -5, 3], [8, 4, -2]],
 [[0, 0, 0], [0, 17, 0], [0, 0, 0]], [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
 [[2147483647, 0, 2147483647], [0, 2147483647, 0], [2147483647, 0, 2147483647]]];
const specs = new Map();
const add = (id, build) => specs.set(id, build);
const item = (body, out) => ({body, out});
const vectorPrint = (name, length, type = '%d') => `for(int i=0;i<${length};i++)printf("${type} ",${name}[i]);puts("");`;
const vectorItem = (a, call, out, {returned = false, output = 'a', type = 'int', capacity = Math.max(1, a.length + 1)} = {}) => item(
 `int a[${capacity}]=${lit(a)};${output !== 'a' ? `${type} ${output}[${capacity}]={0};` : ''}` +
 (returned ? `int k=${call};printf("%d ",k);if(k>=0&&k<=${a.length + 1}){${vectorPrint(output, 'k')}}else puts("");` :
 `${call};printf("%d ",${out.length});${vectorPrint(output, out.length, type === 'long long' ? '%lld' : '%d')}`),
 returned ? [out.length, ...out] : [out.length, ...out]);

add('6-02', () => [...arrays.filter(a => a.length && a.every(x => x >= -10000 && x <= 10000)),
 Array.from({length: 1000}, (_, i) => i % 19 - 9), Array.from({length: 201}, (_, i) => i - 100)]
 .map(a => vectorItem(a, `distinctFirst(a,${a.length},b)`, [...new Set(a)], {returned: true, output: 'b', capacity: 1000})));

add('P2-programming-6-11', () => [...arrays.filter(a => a.length), [1, 2], [-1, -2],
 [2147483647, 2147483647], [-2147483648, -2147483648]]
 .map(a => {
  const expected = a.reduce((s, x) => s + x, 0) / a.length;
  return item(`int a[]=${lit(a)};double actual=mean(a,${a.length}),expected=${expected};` +
   'double diff=actual-expected;if(diff<0)diff=-diff;double scale=expected<0?-expected:expected;' +
   'printf("%d\\n",actual==actual && diff<=1e-8+1e-12*scale);', [1]);
 }));

add('P2-programming-6-14', () => matrices3.map(a => item(
 `int a[64][3]=${lit(a.flat())};reverseRows(a,${a.length});printf("%d ",${a.length});` +
 `for(int i=0;i<${a.length};i++)for(int j=0;j<3;j++)printf("%d ",a[i][j]);puts("");`,
 [a.length, ...a.flatMap(row => [...row].reverse())])));

const sortedUnique = [[], [-1], [0], [1], [-9, -3, 0, 5, 12], [-2147483648, -1, 0, 2147483647],
 [2, 4, 6, 8], [1, 3, 5, 7], [-10, -5, 0, 5, 10]];
add('P2-programming-6-15', () => sortedUnique.flatMap(a => sortedUnique.map(b => {
 const out = a.filter(x => b.includes(x));
 return item(`int a[]=${lit(a)},b[]=${lit(b)},c[64]={0};int k=intersection(a,${a.length},b,${b.length},c);` +
  // The question does not prescribe output order. Canonicalize only in the trusted driver.
  `printf("%d ",k);if(k>=0&&k<=${Math.min(a.length, b.length)}){` +
  'for(int i=1;i<k;i++){int v=c[i],j=i;while(j>0&&c[j-1]>v){c[j]=c[j-1];j--;}c[j]=v;}' +
  `${vectorPrint('c', 'k')}}else puts("");`, [out.length, ...out]);
})));

add('P3-programming-6-44', () => arrays.filter(a => a.length).flatMap(a =>
 [...new Set([0, Math.floor(a.length / 2), a.length - 1])].map(k =>
  vectorItem(a, `eraseAt(a,${a.length},${k})`, a.filter((_, i) => i !== k), {returned: true}))));
add('P3-programming-6-45', () => arrays.flatMap(a => [...new Set([0, Math.floor(a.length / 2), a.length])]
 .flatMap(k => [-7, 0, 2147483647].map(x => vectorItem(a, `insertAt(a,${a.length},${k},${x})`,
  [...a.slice(0, k), x, ...a.slice(k)], {returned: true})))));
add('P3-programming-6-46', () => arrays.map(a => vectorItem(a, `compactNonzero(a,${a.length})`,
 a.filter(x => x !== 0), {returned: true})));
add('P3-programming-6-47', () => matrices3.filter(a => Array.from({length: 3}, (_, j) =>
 a.reduce((s, row) => s + row[j], 0)).every(x => x >= -2147483648 && x <= 2147483647)).map(a => item(
 `int a[64][3]=${lit(a.flat())},sum[3]={71,-99,28};columnSums(a,${a.length},sum);${vectorPrint('sum', 3)}`,
 Array.from({length: 3}, (_, j) => a.reduce((s, row) => s + row[j], 0)))));
add('P3-programming-6-48', () => arrays.map(a => vectorItem(a, `copyArray(a,${a.length},b)`, a, {output: 'b'})));
add('P3-programming-6-50', () => safeDiffArrays.filter(a => a.length).map(a => vectorItem(a,
 `adjacentDiff(a,${a.length},b)`, a.slice(1).map((x, i) => x - a[i]), {output: 'b'})));
add('P3-programming-6-51', () => matrices3.map(a => item(
 `int a[64][3]=${lit(a.flat())},result[64]={0};rowMaxima(a,${a.length},result);printf("%d ",${a.length});${vectorPrint('result', a.length)}`,
 [a.length, ...a.map(row => Math.max(...row))])));

const digits = [[], [0], [9], [4, 4, 4], [9, 0, 9, 0], [5, 5, 2, 2], [1, 9, 1, 9, 2, 2],
 Array.from({length: 10}, (_, i) => i), Array.from({length: 103}, (_, i) => (i * 7 + 3) % 10)];
const frequencies = a => Array.from({length: 10}, (_, d) => a.filter(x => x === d).length);
for (const [id, fn] of [['P3-programming-6-52', 'digitCounts'], ['P3-programming-6-71', 'digitFreq']])
 add(id, () => digits.map(a => item(`int a[]=${lit(a)},freq[10]={9,8,7,6,5,4,3,2,1,77};` +
  `${fn}(a,${a.length},freq);${vectorPrint('freq', 10)}`, frequencies(a))));
add('P3-programming-6-53', () => arrays.map(a => item(`int a[]=${lit(a)};printf("%d\\n",firstEqualPair(a,${a.length}));`,
 [a.findIndex((x, i) => i + 1 < a.length && x === a[i + 1])])));
add('P3-programming-6-54', () => squareMatrices.filter(a => {
 const s = a.reduce((v, row, i) => v + row[2 - i], 0);return s >= -2147483648 && s <= 2147483647;
}).map(a => item(`int a[3][3]=${lit(a.flat())};printf("%d\\n",antiDiagonalSum(a));`, [a.reduce((s, row, i) => s + row[2 - i], 0)])));
add('P3-programming-6-55', () => arrays.map(a => item(`int a[]=${lit(a)};printf("%d\\n",minPositive(a,${a.length}));`,
 [a.some(x => x > 0) ? Math.min(...a.filter(x => x > 0)) : 0])));
add('P3-programming-6-60', () => arrays.filter(a => a.length).flatMap(a => {
 const s = [0];for(const x of a)s.push(s.at(-1) + x);
 const ranges = [[0, 0], [0, a.length - 1], [a.length - 1, a.length - 1], [Math.floor(a.length / 2), a.length - 1]];
 return ranges.map(([l, r]) => item(`long long s[]=${lit(s.map(x => `${x}LL`))};printf("%lld\\n",rangeSum(s,${l},${r}));`,
  [a.slice(l, r + 1).reduce((v, x) => v + x, 0)]));
}));
add('P3-programming-6-63', () => arrays.flatMap(a => [a.length, a.length + 1, a.length + 3].flatMap(cap =>
 [...new Set([-1, 0, Math.floor(a.length / 2), a.length, a.length + 1])].flatMap(k => [-7, 0].map(x => {
 const ok = a.length < cap && k >= 0 && k <= a.length;
 const initial = [...a, ...Array.from({length: cap - a.length}, (_, i) => 918273 + i)];
 const out = ok ? [...a.slice(0, k), x, ...a.slice(k)] : initial;
 return item(`int a[${Math.max(1, cap)}]=${lit(initial)},n=${a.length};int ok=insert(a,&n,${cap},${k},${x});printf("%d %d ",ok,n);` +
  vectorPrint('a', ok ? a.length + 1 : cap), [Number(ok), a.length + Number(ok), ...out]);
})))));
add('P3-programming-6-65', () => [[], [[1, 2, 3, 4]], [[-7, -3, -2, -4], [1, 0, -3, 2]],
 [[2147483647, 2147483647, 2147483647, 2147483647], [-2147483648, -2147483648, -2147483648, -2147483648]],
 [[9, 2, 5, 1], [2, 8, 4, 3], [4, 4, 4, 4]]].map(a => item(
 `int a[64][4]=${lit(a.flat())};long long sums[64]={0};rowSums(a,${a.length},sums);printf("%d ",${a.length});${vectorPrint('sums', a.length, '%lld')}`,
 [a.length, ...a.map(row => row.reduce((s, x) => s + x, 0))])));
add('P3-programming-6-66', () => [...matrices3,
 [[2147483647, 2147483647, 2147483647], [2147483646, 2147483646, 2147483646]],
 [[-2147483648, -2147483648, -2147483648], [-1, -1, -1]], [[2, 2, 2], [3, 1, 2], [1, 1, 1]]]
 .map(a => {const sums = a.map(row => row.reduce((s, x) => s + x, 0));return item(
 `int a[64][3]=${lit(a.flat())};printf("%d\\n",largestRow(a,${a.length}));`, [a.length ? sums.indexOf(Math.max(...sums)) : -1]);}));
add('P3-programming-6-72', () => digits.filter(a => a.length).map(a => {
 const f = frequencies(a);return item(`int a[]=${lit(a)};printf("%d\\n",mostFrequentDigit(a,${a.length}));`, [f.indexOf(Math.max(...f))]);
}));
add('P3-programming-6-74', () => [[], [0], [1], [-1, -1], [0, 0], [1, 1, 2, 2, 3, 3],
 [-8, -3, -1, 0, 2, 5, 9], [-2147483648, -1, 0, 1, 2147483647],
 [1073741824, 1073741824], [-2147483648, -2147483648], [2147483647, 2147483647]]
 .flatMap(a => [...new Set([-2147483648, -9, -2, -1, 0, 1, 2, 3, 4, 8, 2147483647])].map(target => {
  const exists = a.some((x, i) => a.some((y, j) => j > i && x + y === target));
  return item(`int a[]=${lit(a)},l=-17,r=-29;int ok=twoSum(a,${a.length},${target},&l,&r);` +
   `int valid=${exists ? `ok==1&&l>=0&&l<${a.length}&&r>=0&&r<${a.length}&&l!=r&&(long long)a[l]+a[r]==${target}LL` : 'ok==0&&l==-17&&r==-29'};` +
   'printf("%d\\n",valid);', [1]);
 })));
add('P3-programming-6-77', () => matrices3.filter(a => a.length).map(a => item(
 `int a[64][3]=${lit(a.flat())},out[3]={123,456,789};colMax(a,${a.length},out);${vectorPrint('out', 3)}`,
 Array.from({length: 3}, (_, j) => Math.max(...a.map(row => row[j]))))));
add('P3-programming-6-78', () => squareMatrices.map(a => item(
 `int a[3][3]=${lit(a.flat())};long long x=-1,y=-2;diagonalSums(a,&x,&y);printf("%lld %lld\\n",x,y);`,
 [a.reduce((s, row, i) => s + row[i], 0), a.reduce((s, row, i) => s + row[2 - i], 0)])));
add('P3-programming-6-79', () => squareMatrices.map(a => item(
 `int a[3][3]=${lit(a.flat())},b[3][3]={{0}};rotate90(a,b);for(int i=0;i<3;i++)for(int j=0;j<3;j++)printf("%d ",b[i][j]);puts("");`,
 Array.from({length: 9}, (_, k) => a[2 - k % 3][Math.floor(k / 3)]))));

export const extraCContractIds = [...specs.keys()];
export function extraCContract(id) {
 const build = specs.get(id);if (!build) return null;
 const tests = build();
 return {harness: `\n#include <stdio.h>\nint main(void){\n${tests.map(t => `{${t.body}}`).join('\n')}\nreturn 0;}`,
  groups: tests.map(t => t.out.map(String)), expected: tests.flatMap(t => t.out.map(String))};
}

// Reference implementations are server/test-only; they are never frontend assets.
export const extraCReferenceSources = {
 '6-02': 'int distinctFirst(const int a[],int n,int b[]){int m=0;for(int i=0;i<n;i++){int j=0;while(j<m&&b[j]!=a[i])j++;if(j==m)b[m++]=a[i];}return m;}',
 'P2-programming-6-11': 'double mean(const int a[],int n){double s=0;for(int i=0;i<n;i++)s+=a[i];return s/n;}',
 'P2-programming-6-14': 'void reverseRows(int a[][3],int n){for(int i=0;i<n;i++){int t=a[i][0];a[i][0]=a[i][2];a[i][2]=t;}}',
 'P2-programming-6-15': 'int intersection(const int a[],int n,const int b[],int m,int c[]){int i=0,j=0,k=0;while(i<n&&j<m){if(a[i]<b[j])i++;else if(a[i]>b[j])j++;else{c[k++]=a[i++];j++;}}return k;}',
 'P3-programming-6-44': 'int eraseAt(int a[],int n,int k){for(int i=k;i+1<n;i++)a[i]=a[i+1];return n-1;}',
 'P3-programming-6-45': 'int insertAt(int a[],int n,int k,int x){for(int i=n;i>k;i--)a[i]=a[i-1];a[k]=x;return n+1;}',
 'P3-programming-6-46': 'int compactNonzero(int a[],int n){int k=0;for(int i=0;i<n;i++)if(a[i]!=0)a[k++]=a[i];return k;}',
 'P3-programming-6-47': 'void columnSums(const int a[][3],int n,int sum[3]){for(int j=0;j<3;j++){sum[j]=0;for(int i=0;i<n;i++)sum[j]+=a[i][j];}}',
 'P3-programming-6-48': 'void copyArray(const int a[],int n,int b[]){for(int i=0;i<n;i++)b[i]=a[i];}',
 'P3-programming-6-50': 'void adjacentDiff(const int a[],int n,int b[]){for(int i=0;i+1<n;i++)b[i]=a[i+1]-a[i];}',
 'P3-programming-6-51': 'void rowMaxima(const int a[][3],int n,int result[]){for(int i=0;i<n;i++){int x=a[i][0];for(int j=1;j<3;j++)if(a[i][j]>x)x=a[i][j];result[i]=x;}}',
 'P3-programming-6-52': 'void digitCounts(const int a[],int n,int freq[10]){for(int d=0;d<10;d++)freq[d]=0;for(int i=0;i<n;i++)freq[a[i]]++;}',
 'P3-programming-6-53': 'int firstEqualPair(const int a[],int n){for(int i=0;i+1<n;i++)if(a[i]==a[i+1])return i;return -1;}',
 'P3-programming-6-54': 'int antiDiagonalSum(const int a[3][3]){int s=0;for(int i=0;i<3;i++)s+=a[i][2-i];return s;}',
 'P3-programming-6-55': 'int minPositive(const int a[],int n){int b=0;for(int i=0;i<n;i++)if(a[i]>0&&(b==0||a[i]<b))b=a[i];return b;}',
 'P3-programming-6-60': 'long long rangeSum(const long long s[],int l,int r){return s[r+1]-s[l];}',
 'P3-programming-6-63': 'int insert(int a[],int *n,int cap,int k,int x){if(k<0||k>*n||*n==cap)return 0;for(int i=*n;i>k;i--)a[i]=a[i-1];a[k]=x;(*n)++;return 1;}',
 'P3-programming-6-65': 'void rowSums(const int a[][4],int n,long long sums[]){for(int i=0;i<n;i++){long long s=0;for(int j=0;j<4;j++)s+=a[i][j];sums[i]=s;}}',
 'P3-programming-6-66': 'int largestRow(const int a[][3],int n){if(!n)return -1;int best=0;long long mx=0;for(int j=0;j<3;j++)mx+=a[0][j];for(int i=1;i<n;i++){long long s=0;for(int j=0;j<3;j++)s+=a[i][j];if(s>mx){mx=s;best=i;}}return best;}',
 'P3-programming-6-71': 'void digitFreq(const int a[],int n,int freq[10]){for(int d=0;d<10;d++)freq[d]=0;for(int i=0;i<n;i++)freq[a[i]]++;}',
 'P3-programming-6-72': 'int mostFrequentDigit(const int a[],int n){int f[10]={0};for(int i=0;i<n;i++)f[a[i]]++;int b=0;for(int d=1;d<10;d++)if(f[d]>f[b])b=d;return b;}',
 'P3-programming-6-74': 'int twoSum(const int a[],int n,int target,int *l,int *r){int i=0,j=n-1;while(i<j){long long s=(long long)a[i]+a[j];if(s==target){*l=i;*r=j;return 1;}if(s<target)i++;else j--;}return 0;}',
 'P3-programming-6-77': 'void colMax(const int a[][3],int n,int out[3]){for(int j=0;j<3;j++){out[j]=a[0][j];for(int i=1;i<n;i++)if(a[i][j]>out[j])out[j]=a[i][j];}}',
 'P3-programming-6-78': 'void diagonalSums(const int a[3][3],long long *main,long long *anti){long long x=0,y=0;for(int i=0;i<3;i++){x+=a[i][i];y+=a[i][2-i];}*main=x;*anti=y;}',
 'P3-programming-6-79': 'void rotate90(const int a[3][3],int b[3][3]){for(int i=0;i<3;i++)for(int j=0;j<3;j++)b[j][2-i]=a[i][j];}'
};
