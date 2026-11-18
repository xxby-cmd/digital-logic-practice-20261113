// Public interfaces and post-submission solutions; no private cases or drivers.
const bytes='一个字节用0至255的unsigned char值表示。数组均有效，只处理所给逻辑长度，不以零字节作为结束标志；零字节可以是普通数据。';
const readPair='两个只读输入可以同址或引用重叠片段，不得修改输入。';
const submit=signature=>'只提交 '+signature+'，不写main；可同时提交自写辅助函数。代码判题核对功能，原题的算法选择、正确性理由及时间/辅助空间分析仍需另行评阅。';
const g=(publicStatement,signature,starter)=>({revision:2,publicStatement,instruction:submit(signature),starter});
export const dsStringTaskGuides={
 'P4-structures-4-D-001':g(
  '显式长度字节串s有n项，0≤n≤1024。'+bytes+'实现 int isPalindrome(const unsigned char s[], int n)，是回文返回1，否则0，不修改输入。空串与单字节串均为回文。要求O(n)时间、O(1)辅助空间，并说明双端比较和空串边界。',
  'int isPalindrome(const unsigned char s[], int n)',
  'int isPalindrome(const unsigned char s[], int n) {\n    /* 判断显式长度字节串是否回文 */\n}'),
 'P4-structures-4-D-002':g(
  '字节串a、b的逻辑长度分别为n、m，0≤n,m≤1024。'+bytes+readPair+'实现 int commonPrefix(const unsigned char a[], int n, const unsigned char b[], int m)，返回最长公共前缀的字节数。不得分配子串。要求O(min(n,m)+1)时间、O(1)辅助空间，说明任一串为空或先结束的情况。',
  'int commonPrefix(const unsigned char a[], int n, const unsigned char b[], int m)',
  'int commonPrefix(const unsigned char a[], int n, const unsigned char b[], int m) {\n    /* 返回最长公共前缀长度 */\n}'),
 'P4-structures-4-D-003':g(
  '字节串s、t的逻辑长度分别为n、m，0≤n,m≤1024。'+bytes+readPair+'实现 int isSubsequence(const unsigned char s[], int n, const unsigned char t[], int m)，当t是s的子序列时返回1，否则0；不要求所取位置连续，空t总为子序列。要求O(n+m)时间、O(1)辅助空间，说明与子串的区别。',
  'int isSubsequence(const unsigned char s[], int n, const unsigned char t[], int m)',
  'int isSubsequence(const unsigned char s[], int n, const unsigned char t[], int m) {\n    /* 判断t是否为s的子序列 */\n}'),
 'P4-structures-4-D-004':g(
  '串s的前n项仅含小写英文字母a至z，0≤n≤1024，按显式长度给出，不要求终止零字节。实现 int canRearrangePalindrome(const unsigned char s[], int n)，判断其字母能否重新排列成回文，能则返回1，否则0。空串可行，不修改输入，也不要求生成排列。要求O(n+26)时间、O(26)辅助空间，并说明判据的必要性与充分性。',
  'int canRearrangePalindrome(const unsigned char s[], int n)',
  'int canRearrangePalindrome(const unsigned char s[], int n) {\n    /* 判断是否存在回文排列 */\n}'),
 'P4-structures-4-D-005':g(
  '可写字节串s的逻辑长度为n，0≤n≤1024。'+bytes+'实现 int compressSpaces(unsigned char s[], int n)，原地把每段连续普通空格（字节32）压缩为一个，返回新长度；原来存在的首、尾空格段也各保留一个。其他字节按原次序保留，制表符不当作空格。新长度至原逻辑长度n之间的尾部不作要求，n之后的存储不得改写，不必添加终止零字节。要求O(n)时间、O(1)辅助空间，说明读写位置的覆盖安全性。',
  'int compressSpaces(unsigned char s[], int n)',
  'int compressSpaces(unsigned char s[], int n) {\n    /* 压缩连续普通空格，返回新长度 */\n}'),
 'P4-structures-4-D-006':g(
  '主串s逻辑长度n为0至1024，非空模式t逻辑长度m为1至1024。'+bytes+readPair+'实现 int countPattern(const unsigned char s[], int n, const unsigned char t[], int m)，返回t在s中的出现次数，允许不同出现位置重叠。模式长于主串时为0。给出朴素匹配算法，并说明候选起点、边界与最坏复杂度；不得把空模式另行约定混入本题。',
  'int countPattern(const unsigned char s[], int n, const unsigned char t[], int m)',
  'int countPattern(const unsigned char s[], int n, const unsigned char t[], int m) {\n    /* 统计允许重叠的模式出现次数 */\n}'),
 'P4-structures-4-D-007':g(
  '字节串s的逻辑长度n为0至1024。'+bytes+'实现 int firstUnique(const unsigned char s[], int n)，返回第一个只出现一次的字节的0起始下标，没有则返回-1；不修改输入。要求O(n+256)时间、O(256)辅助空间，说明为何不能在尚未读完输入时就把当前只出现一次的字节判为答案。',
  'int firstUnique(const unsigned char s[], int n)',
  'int firstUnique(const unsigned char s[], int n) {\n    /* 返回首个唯一字节下标，无则-1 */\n}'),
 'P4-structures-4-D-008':g(
  '两个等长字节串s、t各有n项，0≤n≤1024。'+bytes+readPair+'实现 int isRotation(const unsigned char s[], const unsigned char t[], int n, unsigned char work[], int next[])，互为循环移位返回1，否则0，两个空串返回1。系统另提供与两个输入及彼此均不重叠的工作区：work至少2n字节，next至少n+1个int；返回后的工作区内容不评分。可用next、nextval或前缀函数等表示，不固定某一种表值/编号约定。设计借助一次模式匹配的算法并证明，要求O(n)时间、O(n)辅助空间。',
  'int isRotation(const unsigned char s[], const unsigned char t[], int n, unsigned char work[], int next[])',
  'int isRotation(const unsigned char s[], const unsigned char t[], int n, unsigned char work[], int next[]) {\n    /* 借助模式匹配判断等长串循环移位 */\n}'),
 'P4-structures-4-D-009':g(
  '可写字节串s的逻辑长度n为0至1024，k为任意unsigned int值。'+bytes+'实现 void rotateLeft(unsigned char s[], int n, unsigned int k)，原地向左循环移动k项，n=0时不作任何操作。只改变前n项，不添加终止字节。要求O(n)时间、O(1)辅助空间，说明归一化k与空串处理；不限定必须采用三次逆置。',
  'void rotateLeft(unsigned char s[], int n, unsigned int k)',
  'void rotateLeft(unsigned char s[], int n, unsigned int k) {\n    /* 原地向左循环移动k项 */\n}'),
 'P4-structures-4-D-010':g(
  '可写字节串s逻辑长度为n，字节集合由d的前m项给出，0≤n,m≤1024；d中允许重复。'+bytes+'实现 int removeBytes(unsigned char s[], int n, const unsigned char d[], int m)，稳定删除s中所有属于调用前集合d的字节，返回新长度。d可引用s中的重叠片段，仍按调用前的集合解释；除此种重叠随s写回变化外，不修改d。新长度至原逻辑长度n之间的尾部不作要求，n之后的存储不得改写，不必补终止字节。要求O(n+m+256)时间、O(256)辅助空间，并说明稳定压缩。',
  'int removeBytes(unsigned char s[], int n, const unsigned char d[], int m)',
  'int removeBytes(unsigned char s[], int n, const unsigned char d[], int m) {\n    /* 先确定删除集合，再稳定压缩并返回新长度 */\n}')
};
// Public reference answers for review after submission. Keep private drivers out.
const solutions={
 1:'int isPalindrome(const unsigned char s[],int n){for(int l=0,r=n-1;l<r;l++,r--)if(s[l]!=s[r])return 0;return 1;}',
 2:'int commonPrefix(const unsigned char a[],int n,const unsigned char b[],int m){int i=0;while(i<n&&i<m&&a[i]==b[i])i++;return i;}',
 3:'int isSubsequence(const unsigned char s[],int n,const unsigned char t[],int m){int j=0;for(int i=0;i<n&&j<m;i++)if(s[i]==t[j])j++;return j==m;}',
 4:'int canRearrangePalindrome(const unsigned char s[],int n){int count[26]={0},odd=0;for(int i=0;i<n;i++)count[s[i]-\'a\']++;for(int i=0;i<26;i++)odd+=count[i]%2;return odd<=1;}',
 5:'int compressSpaces(unsigned char s[],int n){int w=0;for(int r=0;r<n;r++)if(s[r]!=32||w==0||s[w-1]!=32)s[w++]=s[r];return w;}',
 6:'int countPattern(const unsigned char s[],int n,const unsigned char t[],int m){int count=0;for(int i=0;i<=n-m;i++){int j=0;while(j<m&&s[i+j]==t[j])j++;if(j==m)count++;}return count;}',
 7:'int firstUnique(const unsigned char s[],int n){int count[256]={0};for(int i=0;i<n;i++)count[s[i]]++;for(int i=0;i<n;i++)if(count[s[i]]==1)return i;return -1;}',
 8:'int isRotation(const unsigned char s[],const unsigned char t[],int n,unsigned char work[],int next[]){if(!n)return 1;for(int i=0;i<2*n;i++)work[i]=s[i%n];next[0]=0;for(int i=1,j=0;i<n;i++){while(j&&t[i]!=t[j])j=next[j-1];if(t[i]==t[j])j++;next[i]=j;}for(int i=0,j=0;i<2*n-1;i++){while(j&&work[i]!=t[j])j=next[j-1];if(work[i]==t[j])j++;if(j==n)return 1;}return 0;}',
 9:'static void reversePart(unsigned char s[],int l,int r){while(l<r){unsigned char x=s[l];s[l++]=s[r];s[r--]=x;}}\nvoid rotateLeft(unsigned char s[],int n,unsigned int k){if(!n)return;k%=(unsigned)n;int p=(int)k;reversePart(s,0,p-1);reversePart(s,p,n-1);reversePart(s,0,n-1);}',
 10:'int removeBytes(unsigned char s[],int n,const unsigned char d[],int m){unsigned char drop[256]={0};for(int i=0;i<m;i++)drop[d[i]]=1;int w=0;for(int i=0;i<n;i++)if(!drop[s[i]])s[w++]=s[i];return w;}'
};
for(const [n,solution]of Object.entries(solutions))dsStringTaskGuides[`P4-structures-4-D-${n.padStart(3,'0')}`].solution=solution;
