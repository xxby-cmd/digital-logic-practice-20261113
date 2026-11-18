import test from 'node:test';
import assert from 'node:assert/strict';
import {waveTwoPractice} from '../bank-wave-02.js';
import {getPracticeCourse} from '../practice-library.js';
import {composeChapterTest} from '../chapter-tests.js';
import {startChapterTest} from '../sessions.js';

test('第二轮578题保留，原六单元库存完整，当前达标单元可连续组多批',()=>{
 assert.equal(waveTwoPractice.network.length,397);assert.equal(waveTwoPractice.structures.length,100);assert.equal(waveTwoPractice.programming.length,81);
 const legacy=getPracticeCourse('network',{layout:1});assert.equal(legacy.chapters.length,6);assert.ok(legacy.chapters.every(c=>c.count>=100));
 // 数据/控制平面已分开计缺；这里验证既有已达标库存的多批能力，
 // 完整新章目录及82/18的未达标状态由network-layout专测和目标检查器核实。
 const units=[...getPracticeCourse('network').chapters.filter(c=>c.count>=100).map(c=>['network',c.id]),['structures',3],['programming',6]];
 for(const [subject,chapter] of units){
  const qs=getPracticeCourse(subject).questions.filter(q=>String(q.chapter)===String(chapter));assert.ok(qs.length>=100);
  const attempts=[],ids=new Set();
  for(let n=0;n<3;n++){const paper=composeChapterTest(subject,chapter,attempts,()=>0.3);assert.equal(paper.questions.reduce((s,q)=>s+q.points,0),100);
   for(const q of paper.questions){assert.ok(!ids.has(q.id));ids.add(q.id);}attempts.push(startChapterTest(subject,paper,n,`${subject}-${chapter}-${n}`));}
 }
 for(const [subject,qs]of Object.entries(waveTwoPractice)){
  assert.ok(qs.every(q=>q.stem&&q.chapter!==undefined&&q.origin==='原创'&&q.pool==='practice'));
  for(const q of qs){
   if(q.type==='single')assert.ok(q.options[q.answer]!==undefined&&new Set(q.options).size===q.options.length);
   if(q.type==='short')assert.ok(q.model&&q.rubric.length>=3);
   if(q.type==='fill')assert.ok(q.answers.every(v=>v.length));
  }
 }
});

test('独立Floyd-Warshall核对新路由题，并逐片核对再分片偏移',()=>{
 const n=5,d=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?0:Infinity));
 for(const [a,b,w]of [[0,1,3],[0,2,1],[2,1,1],[1,3,2],[2,3,6],[3,4,1],[2,4,8]])d[a][b]=d[b][a]=w;
 for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);
 assert.deepEqual(d[0],[0,2,1,4,5]);
 function fragment(length,mtu,start=0,last=true){const max=Math.floor((mtu-20)/8)*8,out=[];for(let used=0;used<length;used+=max){const size=Math.min(max,length-used);out.push({length:size,offset:(start+used)/8,mf:used+size<length||!last});}return out;}
 const first=fragment(2000,1020);assert.deepEqual(first.map(q=>q.offset),[0,125]);
 assert.deepEqual(fragment(first[1].length,620,1000,true),[{length:600,offset:125,mf:true},{length:400,offset:200,mf:false}]);
 assert.equal(1000+600-1,1599); // 次片末字节与后一片起点连续。
 assert.equal(0.8*5+0.2*205,45);assert.equal(12/(2+(12-2)/2),12/7);
 assert.equal((2**32-100+160)%(2**32),60);
});

test('穷举四元素栈的合法出栈集合，与候选序列模拟方法交叉检查',()=>{
 const legal=new Set();
 function enumerate(next,stack,out){if(out.length===4){legal.add(out.join(','));return;}if(next<=4)enumerate(next+1,[...stack,next],out);if(stack.length)enumerate(next,stack.slice(0,-1),[...out,stack.at(-1)]);}
 enumerate(1,[],[]);assert.equal(legal.size,14);
 function valid(out){const stack=[];let j=0;for(const x of [1,2,3,4]){stack.push(x);while(stack.length&&stack.at(-1)===out[j]){stack.pop();j++;}}return j===4;}
 function perms(a){if(!a.length)return [[]];return a.flatMap((x,i)=>perms(a.filter((_,j)=>j!==i)).map(p=>[x,...p]));}
 for(const out of perms([1,2,3,4]))assert.equal(valid(out),legal.has(out.join(',')));
 assert.ok(legal.has('2,4,3,1'));assert.ok(!legal.has('3,1,4,2'));
 for(let m=2;m<=12;m++)for(let f=0;f<m;f++)for(let size=0;size<m;size++){const r=(f+size)%m;assert.equal((r-f+m)%m,size);}
});

test('数组题算法思路对照独立集合与穷举窗口，覆盖负数、重复和空边界',()=>{
 // 这些是独立数学/状态检查，不冒充C编译执行。
 for(const a of [[],[-5,-3,-1],[0,0],[2,2,1,2,2],[7],[-2,3,-4,5]]){
  const expected=[];for(let i=0;i<a.length;i++)if(i===0||a[i]!==a[i-1])expected.push(a[i]);
  const b=a.slice();let k=b.length?1:0;for(let i=1;i<b.length;i++)if(b[i]!==b[k-1])b[k++]=b[i];assert.deepEqual(b.slice(0,k),expected);
  for(let width=1;width<=a.length;width++){
   const all=Array.from({length:a.length-width+1},(_,i)=>a.slice(i,i+width).reduce((s,x)=>s+x,0));
   let current=a.slice(0,width).reduce((s,x)=>s+x,0),best=current;for(let i=width;i<a.length;i++){current-=a[i-width];current+=a[i];best=Math.min(best,current);}assert.equal(best,Math.min(...all));
  }
 }
 for(let n=0;n<=12;n++)for(let missing=0;missing<=n;missing++){
  const a=Array.from({length:n+1},(_,i)=>i).filter(x=>x!==missing);let x=n;for(let i=0;i<n;i++)x^=i^a[i];assert.equal(x,missing);
 }
 const a=[[1,2,3],[4,5,6],[7,8,9]],b=a.map(row=>row.map(()=>0));
 for(let i=0;i<3;i++)for(let j=0;j<3;j++)b[j][2-i]=a[i][j];assert.deepEqual(b,[[7,4,1],[8,5,2],[9,6,3]]);
});
