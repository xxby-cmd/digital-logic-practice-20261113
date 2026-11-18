// Server-only C17 drivers. JS models compute the expected values separately.
// Finite execution checks establish behavior, not complexity or use of a stack.
const id = n => `P3-structures-3-${n}`;
const lit = a => `{${a.length ? a.join(',') : 0}}`;
const item = (body, out) => ({body, out});
const leftGuard = 918273, rightGuard = -728193;
const guard = (box, n) => `(${box}[0]==${leftGuard}&&${box}[${n + 1}]==${rightGuard})`;
const sameValues = (box, values) => `(${values.map((v,i)=>`${box}[${i+1}]==${v}`).join('&&')||'1'})`;
const specs = new Map();
const add = (n, build, prelude = '') => specs.set(id(n), {build, prelude});
const values = [[], [0], [-1], [2147483647], [-2147483648], [1, 3, 1],
 [0, -2, 0, 5, 0], [2147483647, -2147483648, 0, -1],
 Array.from({length: 37}, (_, i) => i * 17 % 23 - 11),
 Array.from({length: 257}, (_, i) => i % 7 === 0 ? -2147483648 : i - 128)];

add(91, () => [0, 1, 2, 3, 7, 31, 128].flatMap(cap =>
 [...new Set([0, Math.floor(cap / 2), Math.max(0, cap - 1), cap])].flatMap(top =>
 [-2147483648, -1, 0, 2147483647].map(x => {
  const initial = Array.from({length: cap}, (_, i) => i * 19 - 47);
  const success = top < cap, after = initial.slice(0, top);
  if (success) after.push(x);
  return item(`int box[${cap + 2}]=${lit([leftGuard, ...initial, rightGuard])};int top=${top};` +
   `int result=push(box+1,${cap},&top,${x});printf("%d %d %d ",result,top,${guard('box', cap)});` +
   `for(int i=0;i<${after.length};i++)printf("%d ",box[i+1]);puts("");`,
  [Number(success), top + Number(success), 1, ...after]);
 }))));

add(92, () => values.flatMap(a => [...new Set([0, Math.floor(a.length / 2), a.length])].map(top => {
 const remaining = a.slice(0, Math.max(0, top - 1)), sentinel = 682931;
 return item(`int box[${a.length + 2}]=${lit([leftGuard, ...a, rightGuard])};int top=${top},out=${sentinel};` +
  `int result=pop(box+1,&top,&out);printf("%d %d %d %d ",result,top,out,${guard('box', a.length)});` +
  `for(int i=0;i<${remaining.length};i++)printf("%d ",box[i+1]);puts("");`,
 [Number(top > 0), Math.max(0, top - 1), top ? a[top - 1] : sentinel, 1, ...remaining]);
})));

// Include standard headers before installing allocation wrappers, so a student's
// later standard includes remain ordinary includes. All C17 allocation APIs are
// supported; failure is injected only during a push, after the old list exists.
const nodePrelude = `#include <stdlib.h>\n#include <stddef.h>\ntypedef struct Node{int v;struct Node *next;}Node;\n` +
 `static int dsjudge_fail_allocation=0,dsjudge_watched_freed=0;\nstatic void *dsjudge_watched_node=NULL;\n` +
 `static void *dsjudge_malloc(size_t n){return dsjudge_fail_allocation?NULL:malloc(n);}\n` +
 `static void *dsjudge_calloc(size_t n,size_t size){return dsjudge_fail_allocation?NULL:calloc(n,size);}\n` +
 `static void *dsjudge_realloc(void *p,size_t n){int watched=p&&p==dsjudge_watched_node;` +
 `if(dsjudge_fail_allocation&&n)return NULL;void *q=realloc(p,n);if(watched&&n==0)dsjudge_watched_freed=1;return q;}\n` +
 `static void *dsjudge_aligned_alloc(size_t alignment,size_t n){return dsjudge_fail_allocation?NULL:aligned_alloc(alignment,n);}\n` +
 `static void dsjudge_free(void *p){if(p&&p==dsjudge_watched_node)dsjudge_watched_freed=1;free(p);}\n` +
 `#define malloc dsjudge_malloc\n#define calloc dsjudge_calloc\n#define realloc dsjudge_realloc\n` +
 `#define aligned_alloc dsjudge_aligned_alloc\n#define free dsjudge_free\n`;

// Retain original node addresses for failure checks. On success the statement
// specifies values and list structure, not preservation of every node address.
function makeList(a) {
 return `Node *nodes[${Math.max(1, a.length)}]={0};Node *top=NULL;` +
  a.map((v, i) => `nodes[${i}]=malloc(sizeof(Node));if(!nodes[${i}])exit(90);nodes[${i}]->v=${v};`).join('') +
  a.map((_, i) => `nodes[${i}]->next=${i + 1 < a.length ? `nodes[${i + 1}]` : 'NULL'};`).join('') +
  (a.length ? 'top=nodes[0];' : '');
}
function originalListUnchanged(a, start = 0) {
 return a.slice(start).map((v, j) => {
  const i = j + start;
  return `if(nodes[${i}]->v!=${v}||nodes[${i}]->next!=${i + 1 < a.length ? `nodes[${i + 1}]` : 'NULL'})same=0;`;
 }).join('');
}
function checkList(a) {
 return `int expected[${Math.max(1, a.length)}]=${lit(a)};Node *cursor=top;int valid=1;` +
  `for(int i=0;i<${a.length};i++){if(!cursor||cursor->v!=expected[i]){valid=0;break;}cursor=cursor->next;}` +
  'if(cursor)valid=0;';
}

add(93, () => values.filter(a => a.length <= 37).flatMap(a =>
 [-2147483648, 0, 2147483647].flatMap(x => [false, true].map(fail => item(
  makeList(a) + `Node *old=top;dsjudge_fail_allocation=${Number(fail)};` +
  `int result=pushL(&top,${x});dsjudge_fail_allocation=0;` +
  (fail ? 'int same=1;' + originalListUnchanged(a) + 'printf("%d %d %d\\n",result,top==old,same);' :
   checkList([x, ...a]) + 'printf("%d %d\\n",result,valid);'),
 fail ? [0, 1, 1] : [1, 1])))), nodePrelude);

add(94, () => values.filter(a => a.length <= 37).map(a => item(
 makeList(a) + 'Node *old=top;int out=682931;dsjudge_watched_node=old;dsjudge_watched_freed=0;' +
 'int result=popL(&top,&out);' +
 (a.length ? checkList(a.slice(1)) + 'printf("%d %d %d %d\\n",result,out,valid,dsjudge_watched_freed);' :
  // The statement promises no output value for an empty linked-stack pop.
  'printf("%d %d\\n",result,top==NULL);'),
 a.length ? [1, a[0], 1, 1] : [0, 1])), nodePrelude);

const queueStates = () => [2, 3, 4, 7, 17, 65].flatMap(m => {
 const indices = m <= 7 ? Array.from({length: m}, (_, i) => i) :
  [...new Set([0, 1, Math.floor(m / 2), m - 2, m - 1])];
 return indices.flatMap(front => indices.map(rear => ({m, front, rear})));
});
const queueLength = (m, front, rear) => (rear - front + m) % m;
add(95, () => queueStates().flatMap(({m, front, rear}) => [-2147483648, 0, 2147483647].map(x => {
 const initial = Array.from({length: m}, (_, i) => i * 29 - 63);
 const length = queueLength(m, front, rear), success = length < m - 1;
 const active = Array.from({length}, (_, i) => initial[(front + i) % m]);
 if (success) active.push(x);
 // The statement prescribes the logical queue. Even on failure a write to the
 // unused reserved slot is harmless when rear and all active elements remain.
 const out = active;
 return item(`int box[${m + 2}]=${lit([leftGuard, ...initial, rightGuard])};int rear=${rear};` +
  `int result=enq(box+1,${m},${front},&rear,${x});printf("%d %d %d ",result,rear,${guard('box', m)});` +
  `for(int i=0;i<${out.length};i++)printf("%d ",box[(${front}+i)%${m}+1]);puts("");`,
 [Number(success), success ? (rear + 1) % m : rear, 1, ...out]);
})));

add(96, () => queueStates().map(({m, front, rear}) => {
 const initial = Array.from({length: m}, (_, i) => i % 2 ? -2147483648 + i : 2147483647 - i);
 const length = queueLength(m, front, rear), success = length > 0;
 const remaining = Array.from({length: Math.max(0, length - 1)}, (_, i) => initial[(front + 1 + i) % m]);
 return item(`int box[${m + 2}]=${lit([leftGuard, ...initial, rightGuard])};int front=${front},out=682931;` +
  `int result=deq(box+1,${m},&front,${rear},&out);printf("%d %d %d %d ",result,front,out,${guard('box', m)});` +
  `for(int i=0;i<${remaining.length};i++)printf("%d ",box[(${front}+1+i)%${m}+1]);puts("");`,
 [Number(success), success ? (front + 1) % m : front, success ? initial[front] : 682931, 1, ...remaining]);
}));

function bracketWords(n) {
 return Array.from({length: 2 ** n}, (_, mask) =>
  Array.from({length: n}, (_, i) => mask & 2 ** i ? '(' : ')').join(''));
}
function balanced(word) {
 // Pair cancellation is independent of a student's depth-counter solution.
 let reduced = word;
 while (reduced.includes('()')) reduced = reduced.replaceAll('()', '');
 return Number(reduced === '');
}
add(97, () => {
 const complete=[...Array.from({length: 9}, (_, n) => bracketWords(n)).flat(),
  '('.repeat(257) + ')'.repeat(257), '()'.repeat(300), ')'.repeat(128) + '('.repeat(128),
  '('.repeat(513), '('.repeat(256) + ')'.repeat(255), '()'.repeat(257) + ')(']
  .map(word => item(`const char s[]=${JSON.stringify(word)};printf("%d\\n",match(s,${word.length}));`, [balanced(word)]));
 // n is the logical prefix length. Storage can continue after it and need not
 // end in NUL; the first three cases reject strlen scans without invoking UB.
 const prefixes=[{bytes:[40,41,40,0],n:2},{bytes:[40,41,0],n:1},{bytes:[40,0],n:0},
  {bytes:[40,41],n:2},{bytes:[41],n:1}].map(({bytes,n})=>item(
   `const char s[${bytes.length}]=${lit(bytes)};printf("%d\\n",match(s,${n}));`,
   [balanced(String.fromCharCode(...bytes.slice(0,n)))]));
 return [...complete,...prefixes];
});

add(98, () => values.map(a => item(
 `int box[${a.length + 2}]=${lit([leftGuard, ...a, rightGuard])};` +
 `int scratch[${a.length + 2}]={0};scratch[0]=${leftGuard};scratch[${a.length + 1}]=${rightGuard};` +
 `reverseByStack(box+1,${a.length},scratch+1);printf("%d %d ",${guard('box', a.length)},${guard('scratch', a.length)});` +
 `for(int i=0;i<${a.length};i++)printf("%d ",box[i+1]);puts("");`,
 [1, 1, ...a.toReversed()])));

add(99, () => [2, 3, 4, 7, 12, 1073741825, 2147483646, 2147483647].flatMap(m => {
 const indices = m <= 12 ? Array.from({length: m}, (_, i) => i) :
  [...new Set([0, 1, Math.floor(m / 2), m - 2, m - 1])];
 return indices.flatMap(front => indices.map(rear => item(
  `printf("%d\\n",queueLen(${m},${front},${rear}));`, [queueLength(m, front, rear)])));
}));

function permutations(a) {
 if (!a.length) return [[]];
 return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
}
function reachablePopSequences(input) {
 // Enumerate legal push/pop operation trees, not the greedy candidate checker.
 const reachable = new Set();
 function visit(next, stack, popped) {
  if (popped.length === input.length) {reachable.add(popped.join(','));return;}
  if (next < input.length) visit(next + 1, [...stack, input[next]], popped);
  if (stack.length) visit(next, stack.slice(0, -1), [...popped, stack.at(-1)]);
 }
 visit(0, [], []);
 return reachable;
}
add(100, () => {
 const cases = [];
 for (let n = 0; n <= 6; n++) {
  const input = [-2147483648, 73, -19, 2147483647, 0, -888].slice(0, n);
  const reachable = reachablePopSequences(input);
  const all = permutations(input);
  const candidates = n <= 5 ? all : all.filter((_, i) => i % 11 === 0);
  if (n) candidates.push(Array(n).fill(input[0]), [...input.slice(0, -1), 682931]);
  for (const output of candidates) cases.push({input, output, accepted: reachable.has(output.join(','))});
 }
 return cases.map(({input, output, accepted}) => item(
  `int inBox[${input.length + 2}]=${lit([leftGuard, ...input, rightGuard])};` +
  `int outBox[${input.length + 2}]=${lit([leftGuard, ...output, rightGuard])};` +
  `int scratch[${input.length + 2}]={0};scratch[0]=${leftGuard};scratch[${input.length + 1}]=${rightGuard};` +
  `int result=validPop(inBox+1,outBox+1,${input.length},scratch+1);` +
  `printf("%d %d %d %d\\n",result,${guard('inBox', input.length)}&&${sameValues('inBox',input)},${guard('outBox', input.length)}&&${sameValues('outBox',output)},${guard('scratch', input.length)});`,
 [Number(accepted), 1, 1, 1]));
});

export const dsStackContractIds = [...specs.keys()];
export function dsStackContract(questionId) {
 const spec = specs.get(questionId);if (!spec) return null;
 const tests = spec.build(), groups = tests.map(t => t.out.map(String));
 // Separate functions restore their stack frames between groups even at -O0.
 const functions = tests.map((t, i) => `static void dsjudge_case_${i}(void){${t.body}}`).join('\n');
 return {prelude: spec.prelude,
  harness: `\n#include <stdio.h>\n${functions}\nint main(void){\n` +
   tests.map((_, i) => `dsjudge_case_${i}();`).join('\n') + '\nreturn 0;}',
  groups, expected: groups.flat()};
}

export const dsStackReferenceSources = {
 [id(91)]: 'int push(int a[],int cap,int *top,int x){if(*top==cap)return 0;a[*top]=x;(*top)++;return 1;}',
 [id(92)]: 'int pop(int a[],int *top,int *out){if(*top==0)return 0;--*top;*out=a[*top];return 1;}',
 [id(93)]: '#include <stdlib.h>\nint pushL(Node **top,int x){Node *s=malloc(sizeof *s);if(!s)return 0;s->v=x;s->next=*top;*top=s;return 1;}',
 [id(94)]: '#include <stdlib.h>\nint popL(Node **top,int *out){if(!*top)return 0;Node *s=*top;*out=s->v;*top=s->next;free(s);return 1;}',
 [id(95)]: 'int enq(int a[],int m,int front,int *rear,int x){int next=(*rear+1)%m;if(next==front)return 0;a[*rear]=x;*rear=next;return 1;}',
 [id(96)]: 'int deq(int a[],int m,int *front,int rear,int *out){if(*front==rear)return 0;*out=a[*front];*front=(*front+1)%m;return 1;}',
 [id(97)]: "int match(const char s[],int n){int depth=0;for(int i=0;i<n;i++){if(s[i]=='(')depth++;else if(--depth<0)return 0;}return depth==0;}",
 [id(98)]: 'void reverseByStack(int a[],int n,int s[]){int top=0;for(int i=0;i<n;i++)s[top++]=a[i];for(int i=0;i<n;i++)a[i]=s[--top];}',
 [id(99)]: 'int queueLen(int m,int front,int rear){return rear>=front?rear-front:m-(front-rear);}',
 [id(100)]: 'int validPop(const int in[],const int out[],int n,int s[]){int top=0,j=0;for(int i=0;i<n;i++){s[top++]=in[i];while(top>0&&j<n&&s[top-1]==out[j]){top--;j++;}}return j==n;}'
};
