import test from 'node:test';
import assert from 'node:assert/strict';
import {waveThreePractice} from '../bank-wave-03.js';
import {getPracticeCourse} from '../practice-library.js';
import {composeChapterTest} from '../chapter-tests.js';

test('绪论90与线性表63道原创题结构完整，完整目录不隐藏',()=>{
 assert.equal(waveThreePractice.structures.length,903);
 assert.equal(new Set(waveThreePractice.structures.map(q=>q.stem)).size,903);
 assert.deepEqual(getPracticeCourse('digital').chapters.map(c=>c.id),[1,2,3,4,5,6,7,8]);
 assert.deepEqual(getPracticeCourse('structures').chapters.map(c=>c.id),[1,2,3,4,5,6,7,8,9,10,11,12]);
 const paper=composeChapterTest('structures',1);assert.equal(paper.questions.length,17);assert.equal(paper.questions.reduce((s,q)=>s+q.points,0),100);
 assert.ok(paper.questions.every(q=>q.chapter===1));
});
test('独立整数预算修正公开习题答案：边界最大39与15，不是40与16',()=>{
 const budget=10n**12n;let exponential=0,polynomial=0;
 for(let n=0;n<60;n++){if(2n**BigInt(n)<=budget)exponential=n;if(BigInt(n)**10n<=budget)polynomial=n;}
 assert.equal(exponential,39);assert.equal(polynomial,15);
 assert.ok(2n**39n<=budget&&2n**40n>budget);assert.ok(15n**10n<=budget&&16n**10n>budget);
 const crossing=Array.from({length:1000},(_,i)=>i+2).find(n=>n*n>50*n*Math.log2(n));assert.equal(crossing,439);
 assert.ok(438<50*Math.log2(438));assert.ok(439>50*Math.log2(439));
});
test('独立检验频度、递推边界和错误处理接口的值域区分',()=>{
 for(let n=0;n<=30;n++){
  let count=0;for(let i=0;i<n;i++)for(let j=0;j<i;j++)count++;assert.ok(count===n*(n-1)/2);
  let c=0,i=n;while(i>=2){i=Math.floor(i/2);c++;}if(n>0)assert.equal(c,Math.floor(Math.log2(n)));
 }
 for(let k=2;k<=15;k++){const n=2**k;let count=0,x=2;while(x<n/2){x*=2;count++;}assert.equal(count,k-2);}
 // 0本身可为合法数据：状态与结果分开后，不会把0误当失败。
 const success={ok:true,value:0},failure={ok:false};assert.notEqual(success.ok,failure.ok);
});

test('独立追踪线性表搬移、稳定筛选、扩容总量与共享尾判据',()=>{
 for(let n=1;n<=40;n++){
  let total=0;for(let i=0;i<n;i++)total+=n-i-1;assert.equal(total/n,(n-1)/2);
  let moves=0;for(let cap=1;cap<n;cap*=2)moves+=cap;assert.ok(moves<2*n);
 }
 const bad=[10,20,30,40];for(let j=1;j<=3;j++)bad[j+1]=bad[j];assert.deepEqual(bad,[10,20,20,20,20]);
 const a=[-3,0,-1,5,5,-2],expected=a.filter(x=>x>=0);let w=0;for(let r=0;r<a.length;r++)if(a[r]>=0)a[w++]=a[r];a.length=w;assert.deepEqual(a,expected);
 const shared={value:8,next:null},left={value:1,next:shared},right={value:1,next:shared},separate={value:8,next:null};
 const tail=x=>{while(x?.next)x=x.next;return x;};assert.equal(tail(left),tail(right));assert.notEqual(tail(left),tail(separate));
 const linear=waveThreePractice.structures.filter(q=>q.chapter===2);assert.equal(linear.length,63);
 assert.equal(linear.filter(q=>q.section==='判断题').length,15);assert.equal(linear.filter(q=>q.section==='选择题').length,20);
 for(const q of linear.filter(q=>q.type==='single'))assert.ok(q.options[q.answer]!==undefined);
});

test('串章80原创题覆盖全部题型，独立穷举核对前缀函数、重叠匹配和比较次数',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===4);assert.equal(qs.length,80);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,20,10,10]);
 const pi=p=>{const a=Array(p.length).fill(0);for(let i=1;i<p.length;i++){let j=a[i-1];while(j&&p[i]!==p[j])j=a[j-1];if(p[i]===p[j])j++;a[i]=j;}return a;};
 const matches=(s,p)=>{const a=pi(p),out=[];let j=0;for(let i=0;i<s.length;i++){while(j&&s[i]!==p[j])j=a[j-1];if(s[i]===p[j])j++;if(j===p.length){out.push(i-j+1);j=a[j-1];}}return out;};
 const words=n=>Array.from({length:2**n},(_,v)=>v.toString(2).padStart(n,'0').replaceAll('0','a').replaceAll('1','b'));
 for(let m=1;m<=4;m++)for(const p of words(m)){
  const expected=Array.from(p,(_,i)=>{for(let k=i;k>0;k--)if(p.slice(0,k)===p.slice(i+1-k,i+1))return k;return 0;});assert.deepEqual(pi(p),expected);
  for(let n=m;n<=7;n++)for(const s of words(n)){const naive=[];for(let i=0;i<=n-m;i++)if(s.slice(i,i+m)===p)naive.push(i);assert.deepEqual(matches(s,p),naive);}
 }
 assert.deepEqual(pi('abab'),[0,0,1,2]);assert.deepEqual(pi('aaab'),[0,1,2,0]);assert.deepEqual(matches('ababa','aba'),[0,2]);
 for(let n=1;n<=15;n++)for(let k=1;k<=n;k++){
  const s='a'.repeat(n)+'b',p='a'.repeat(k)+'b';let normal=0,ends=0;
  for(let i=0;i<=n-k;i++){for(let j=0;j<p.length;j++){normal++;if(s[i+j]!==p[j])break;}}
  for(let i=0;i<=n-k;i++){ends++;if(s[i]!==p[0])continue;ends++;if(s[i+k]!==p[k])continue;for(let j=1;j<k;j++){ends++;if(s[i+j]!==p[j])break;}}
  assert.equal(normal,(n-k+1)*(k+1));assert.equal(ends,2*(n-k)+k+1);
 }
 const s='I AM A STUDENT';assert.equal(s.length,14);assert.equal(s.slice(5,7)+'GOOD'+s.slice(6,14),'A GOOD STUDENT');
 const a='THIS',f='A SAMPLE',x=a+f.slice(1,8)+a.slice(2,4);assert.equal(x,'THIS SAMPLEIS');assert.equal(x.length,13);
 assert.equal(x+'A GOOD'+'ONE','THIS SAMPLEISA GOODONE');
});

test('数组广义表80原创覆盖题型，枚举校验压缩下标双向公式及转置顺序',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===5);assert.equal(qs.length,80);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,20,10,10]);
 for(let n=2;n<=40;n++){
  let upper=0,lower=0,band=0;
  for(let i=1;i<=n;i++)for(let j=1;j<=n;j++){
   if(i<=j){assert.equal(((2*n+1)*i-i*i)/2+j-n-1,upper++);}
   if(j<=i){assert.equal(i*(i-1)/2+j-1,lower++);}
   if(Math.abs(i-j)<=1){const k=2*i+j-3;assert.equal(k,band++);const ri=Math.floor((k+1)/3)+1,rj=k+3-2*ri;assert.equal(ri,i);assert.equal(rj,j);}
  }
  assert.equal(upper,n*(n+1)/2);assert.equal(lower,upper);assert.equal(band,3*n-2);
 }
 const orig=[[0,3,7],[1,0,-2],[2,2,9]],want=[[0,1,-2],[2,2,9],[3,0,7]],counts=[0,0,0,0];
 for(const [,j]of orig)counts[j]++;
 const starts=[0];for(let j=1;j<4;j++)starts[j]=starts[j-1]+counts[j-1];const out=[];for(const[i,j,v]of orig)out[starts[j]++]=[j,i,v];assert.deepEqual(out,want);
 const atom=x=>typeof x==='string',depth=x=>atom(x)?0:x.length?1+Math.max(...x.map(depth)):1,count=x=>atom(x)?1:x.reduce((a,e)=>a+count(e),0);
 assert.equal(depth([[[]],'a',[['b','c'],[],'d'],[[['e']]]]),4);assert.equal(count(['a',['b','c'],[]]),3);assert.equal(depth([[]]),2);
 const byHeadTail=x=>atom(x)?0:!x.length?1:Math.max(1+byHeadTail(x[0]),byHeadTail(x.slice(1)));
 for(const g of [[],[[]],['a','b'],[['a'],[['b']],'c'],[[[],[]],['x']]])assert.equal(byHeadTail(g),depth(g));
 assert.equal(100+(((8*3+2)*5+4)*8+7)*4,4416);
});

test('树章78原创题型完整，穷举树形核叶子空链、祖先判据与中序线索后继',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===6);assert.equal(qs.length,78);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,15,15,8]);
 const shapes=n=>{if(!n)return[null];const out=[];for(let l=0;l<n;l++)for(const a of shapes(l))for(const b of shapes(n-1-l))out.push([a,b]);return out;};
 const materialize=t=>t?{left:materialize(t[0]),right:materialize(t[1])}:null;
 for(let n=1;n<=6;n++)for(const shape of shapes(n)){
  const root=materialize(shape),pre=[],ino=[],post=[],anc=new Map();let leaf=0,two=0,empty=0;
  const visit=(x,path=[])=>{if(!x){empty++;return;}anc.set(x,path);pre.push(x);visit(x.left,[...path,x]);ino.push(x);visit(x.right,[...path,x]);post.push(x);if(!x.left&&!x.right)leaf++;if(x.left&&x.right)two++;};visit(root);
  assert.equal(leaf,two+1);assert.equal(empty,n+1);
  for(const a of pre)for(const b of pre)if(a!==b)assert.equal(anc.get(b).includes(a),pre.indexOf(a)<pre.indexOf(b)&&post.indexOf(a)>post.indexOf(b));
  // 在独立递归中序结果上构造线索，再用候选后继规则逐点比较。
  ino.forEach((x,i)=>{x.ltag=x.left?0:1;x.rtag=x.right?0:1;if(x.ltag)x.left=ino[i-1]||null;if(x.rtag)x.right=ino[i+1]||null;});
  const succ=q=>{if(!q)return null;if(q.rtag===1)return q.right;let r=q.right;while(r&&r.ltag===0)r=r.left;return r;};
  ino.forEach((x,i)=>assert.equal(succ(x),ino[i+1]||null));assert.equal(succ(null),null);
 }
 for(let k=2;k<=6;k++)for(let p=1;p<=30;p++)for(let r=1;r<=k;r++){const child=k*(p-1)+r+1;assert.equal(Math.floor((child-2)/k)+1,p);assert.equal((child-2)%k<k-1,r<k);}
 const w=[1,1,2,4];let cost=0;while(w.length>1){w.sort((a,b)=>a-b);const sum=w.shift()+w.shift();cost+=sum;w.push(sum);}assert.equal(cost,14);
});

test('图章79原创题型完整，小图枚举交叉核可达、生成树与传递性反例',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===7);assert.equal(qs.length,79);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,15,15,9]);
 const edges=[];for(let u=0;u<4;u++)for(let v=u+1;v<4;v++)edges.push([u,v,((u*7+v*3)%9)-4]);
 const components=es=>{const seen=new Set();let c=0;for(let s=0;s<4;s++)if(!seen.has(s)){c++;const q=[s];seen.add(s);while(q.length){const u=q.shift();for(const[a,b]of es){const v=a===u?b:b===u?a:-1;if(v>=0&&!seen.has(v)){seen.add(v);q.push(v);}}}}return c;};
 for(let mask=0;mask<64;mask++){
  const es=edges.filter((_,i)=>mask>>i&1),cc=components(es),parent=[0,1,2,3];const find=x=>parent[x]===x?x:parent[x]=find(parent[x]);let sum=0,count=0;
  for(const[a,b,w]of [...es].sort((a,b)=>a[2]-b[2]))if(find(a)!==find(b)){parent[find(a)]=find(b);sum+=w;count++;}
  assert.equal(count,4-cc);
  if(cc===1){let best=Infinity;for(let bits=0;bits<2**es.length;bits++){const chosen=es.filter((_,i)=>bits>>i&1);if(chosen.length===3&&components(chosen)===1)best=Math.min(best,chosen.reduce((s,e)=>s+e[2],0));}assert.equal(sum,best);}
 }
 for(let mask=0;mask<64;mask++){
  const a=Array.from({length:3},()=>Array(3).fill(false));let bit=0;for(let u=0;u<3;u++)for(let v=0;v<3;v++)if(u!==v)a[u][v]=!!(mask>>bit++&1);
  const reach=a.map((r,i)=>r.map((x,j)=>x||i===j));for(let k=0;k<3;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)reach[i][j]||=reach[i][k]&&reach[k][j];
  for(let start=0;start<3;start++){const seen=new Set([start]),q=[start];while(q.length){const u=q.shift();for(let v=0;v<3;v++)if(a[u][v]&&!seen.has(v)){seen.add(v);q.push(v);}}for(let j=0;j<3;j++)assert.equal(reach[start][j],seen.has(j));}
 }
 const relation=[[false,true],[true,false]];assert.equal(relation[0][1]&&relation[1][0]&&!relation[0][0],true);
 const a=[[0,1],[1,0]],square=a.map((r,i)=>r.map((_,j)=>a[i].reduce((sum,x,k)=>sum+x*a[k][j],0)));assert.deepEqual(square,[[1,0],[0,1]]);
});

test('动态存储90原创题型完整，独立状态模拟适配、伙伴、引用计数与对齐',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===8);assert.equal(qs.length,90);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,20,20,10]);
 const fits=(requests,best)=>{const free=[100,200];for(const q of requests){let i=-1;free.forEach((v,j)=>{if(v>=q&&(i<0||best&&v<free[i]))i=j;});if(i<0)return false;free[i]-=q;}return true;};
 assert.equal(fits([110,80,100],false),false);assert.equal(fits([110,80,100],true),true);assert.equal(fits([110,80,90,20],false),true);assert.equal(fits([110,80,90,20],true),false);
 const free=Array.from({length:10},()=>new Set());free[9].add(0);const allocation=[];
 for(const request of [23,45,52,100,11,19]){let k=0;while(2**k<request)k++;let j=k;while(!free[j].size)j++;const start=Math.min(...free[j]);free[j].delete(start);while(j>k){j--;free[j].add(start+2**j);}allocation.push([start,k]);}
 assert.deepEqual(allocation.map(([a,k])=>[a,2**k]),[[0,32],[64,64],[128,64],[256,128],[32,16],[192,32]]);
 for(const i of [1,2,4]){let[a,k]=allocation[i];while(k<9&&free[k].has(a^(2**k))){const b=a^(2**k);free[k].delete(b);a=Math.min(a,b);k++;}free[k].add(a);}
 const intervals=free.flatMap((set,k)=>[...set].map(a=>[a,2**k])).sort((a,b)=>a[0]-b[0]);assert.deepEqual(intervals,[[32,32],[64,64],[128,64],[224,32],[384,128]]);assert.equal(intervals.reduce((s,x)=>s+x[1],0),320);
 const links={L:['L1','L3'],L1:['L2','L3','L4'],L2:['L3'],L3:[],L4:['L2']},rc=Object.fromEntries(Object.keys(links).map(k=>[k,0]));rc.L++;for(const refs of Object.values(links))for(const v of refs)rc[v]++;
 assert.deepEqual(rc,{L:1,L1:1,L2:2,L3:3,L4:1});const released=[];const drop=x=>{if(--rc[x]===0){released.push(x);for(const v of links[x])drop(v);}};drop('L1');assert.deepEqual(released,['L1','L4','L2']);assert.equal(rc.L3,1);
 for(let x=0;x<=200;x++)for(let a=1;a<=20;a++){const r=x%a,y=x+(r? a-r:0);assert.equal(y,Math.ceil(x/a)*a);assert.ok(y>=x&&y-x<a);}
});

test('查找80原创题型完整，独立穷举二分边界、ASL与墓碑探测',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===9);assert.equal(qs.length,80);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,15,15,10]);
 const bound=(a,k,upper)=>{let l=0,r=a.length;while(l<r){const m=l+Math.floor((r-l)/2);if(upper?a[m]<=k:a[m]<k)l=m+1;else r=m;}return l;};
 for(let n=0;n<=8;n++)for(let mask=0;mask<2**n;mask++){const a=Array.from({length:n},(_,i)=>mask>>i&1).sort((a,b)=>a-b);for(let k=-1;k<=2;k++){assert.equal(bound(a,k,false),a.filter(x=>x<k).length);assert.equal(bound(a,k,true),a.filter(x=>x<=k).length);}}
 let sum=0;for(let key=1;key<=10;key++){let l=1,r=10,c=0;while(l<=r){c++;const m=l+Math.floor((r-l)/2);if(key===m)break;if(key<m)r=m-1;else l=m+1;}sum+=c;}assert.equal(sum,29);
 const slots=Array(7).fill(null),deleted=Symbol('deleted');
 const lookup=k=>{for(let i=0;i<7;i++){const p=(k%7+i)%7;if(slots[p]===null)return-1;if(slots[p]===k)return p;}return-1;};
 const insert=k=>{let tomb=-1;for(let i=0;i<7;i++){const p=(k%7+i)%7;if(slots[p]===k)return false;if(slots[p]===deleted&&tomb<0)tomb=p;if(slots[p]===null){slots[tomb>=0?tomb:p]=k;return true;}}if(tomb>=0){slots[tomb]=k;return true;}return false;};
 [10,17,24].forEach(k=>assert.equal(insert(k),true));assert.deepEqual([lookup(10),lookup(17),lookup(24)],[3,4,5]);slots[3]=deleted;assert.equal(lookup(17),4);assert.equal(insert(17),false);assert.equal(insert(31),true);assert.equal(lookup(31),3);
 slots.fill(deleted);assert.equal(lookup(99),-1);assert.equal(insert(99),true);
 const N=[0,1];for(let h=2;h<=6;h++)N[h]=1+N[h-1]+N[h-2];assert.deepEqual(N,[0,1,2,4,7,12,20]);
});

test('内部排序79原创题型完整，穷举重复键核稳定性、冒泡末界、三路分区与逆序计数',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===10);assert.equal(qs.length,79);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,15,15,9]);
 const mergeCount=a=>{if(a.length<2)return{a:[...a],count:0};const mid=Math.floor(a.length/2),l=mergeCount(a.slice(0,mid)),r=mergeCount(a.slice(mid)),out=[];let i=0,j=0,c=l.count+r.count;while(i<l.a.length&&j<r.a.length)if(l.a[i]<=r.a[j])out.push(l.a[i++]);else{out.push(r.a[j++]);c+=l.a.length-i;}return{a:out.concat(l.a.slice(i),r.a.slice(j)),count:c};};
 for(let n=0;n<=7;n++)for(let code=0;code<3**n;code++){
  let x=code;const a=Array.from({length:n},()=>{const v=x%3;x=Math.floor(x/3);return v;}),want=[...a].sort((a,b)=>a-b),b=[...a];
  let end=n-1;while(end>0){let last=-1;for(let j=0;j<end;j++)if(b[j]>b[j+1]){[b[j],b[j+1]]=[b[j+1],b[j]];last=j;}if(last<0)break;end=last;}assert.deepEqual(b,want);
  const records=a.map((key,id)=>({key,id}));for(let i=1;i<n;i++){const v=records[i];let j=i;while(j>0&&records[j-1].key>v.key){records[j]=records[j-1];j--;}records[j]=v;}
  assert.deepEqual(records.map(r=>r.key),want);for(let i=1;i<n;i++)if(records[i-1].key===records[i].key)assert.ok(records[i-1].id<records[i].id);
  const d=[...a];let low=0,mid=0,high=n-1;while(mid<=high){if(d[mid]===0){[d[low],d[mid]]=[d[mid],d[low]];low++;mid++;}else if(d[mid]===1)mid++;else{[d[mid],d[high]]=[d[high],d[mid]];high--;}}assert.deepEqual(d,want);
  let brute=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(a[i]>a[j])brute++;const got=mergeCount(a);assert.equal(got.count,brute);assert.deepEqual(got.a,want);
 }
 const a=[503,87,512,61,908,170,897,275,653,426];for(let i=1;i<=3;i++){const v=a[i];let j=i;while(j>0&&a[j-1]>v){a[j]=a[j-1];j--;}a[j]=v;}assert.deepEqual(a,[61,87,503,512,908,170,897,275,653,426]);
});

test('外部排序90原创结构与独立置换选择、最优归并、趟数核验',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===11);assert.equal(qs.length,90);
 const replacement=(input,w)=>{let pos=0,active=input.slice(0,w),frozen=[],runs=[],run=[];pos=active.length;while(active.length||frozen.length){if(!active.length){runs.push(run);run=[];active=frozen;frozen=[];}active.sort((a,b)=>a-b);const x=active.shift();run.push(x);if(pos<input.length){const y=input[pos++];(y>=x?active:frozen).push(y);}}if(run.length)runs.push(run);return runs;};
 const source=[51,49,39,46,38,29,14,61,15,30,1,48,52,3,63,27,4,13,89,24,46,58,33,76];
 assert.deepEqual(replacement(source,6),[[29,38,39,46,49,51,61],[1,3,14,15,27,30,48,52,63,89],[4,13,24,33,46,58,76]]);
 for(let w=1;w<=8;w++)for(let n=1;n<=25;n++){const runs=replacement(Array.from({length:n},(_,i)=>n-i),w);assert.deepEqual(runs.map(a=>a.length),Array.from({length:Math.ceil(n/w)},(_,i)=>Math.min(w,n-i*w)));assert.deepEqual(replacement(Array.from({length:n},(_,i)=>i),w),[Array.from({length:n},(_,i)=>i)]);}
 const optimal=(values,k)=>{const a=[...values];a.push(...Array((k-1-(a.length-1)%(k-1))%(k-1)).fill(0));let sum=0;while(a.length>1){a.sort((a,b)=>a-b);const s=a.splice(0,k).reduce((a,b)=>a+b,0);sum+=s;a.push(s);}return sum*2;};
 assert.equal(optimal([47,9,39,18,4,12,23,7],3),550);assert.equal(optimal([...Array(8).fill(2),...Array(8).fill(3),...Array(7).fill(5),...Array(5).fill(12),...Array(3).fill(20)],5),800);
 let r=200,passes=0;while(r>1){r=Math.ceil(r/4);passes++;}assert.equal(passes,4);assert.equal(2*1000*(passes+1),10000);
});

test('外排全部题型与整数趟数、尾块分段、跨段稳定次序核验',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===11);
 assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,20,20,10]);
 for(let r=2;r<=100;r++)for(let p=1;p<=5;p++){
  const feasible=k=>{let left=r;for(let i=0;i<p&&left>1;i++)left=Math.floor(left/k)+(left%k!==0);return left<=1;};
  let low=2,high=r;while(low<high){const mid=low+Math.floor((high-low)/2);if(feasible(mid))high=mid;else low=mid+1;}
  let naive=2;while(BigInt(naive)**BigInt(p)<BigInt(r))naive++;assert.equal(low,naive);
 }
 assert.equal([25,25].reduce((s,n)=>s+Math.ceil(n/12),0),6);assert.equal(Math.ceil(50/12),5);
 const runs=[[{key:2,id:0},{key:2,id:3}],[{key:1,id:2},{key:2,id:1}]],positions=[0,0],out=[];
 while(true){const candidates=runs.flatMap((run,i)=>positions[i]<run.length?[{...run[positions[i]],source:i}]:[]);if(!candidates.length)break;candidates.sort((a,b)=>a.key-b.key||a.id-b.id);const x=candidates[0];out.push(x.id);positions[x.source]++;}
 assert.deepEqual(out,[2,0,1,3]);
});

test('文件94原创结构及倒排集合、事务顺序与物理块定位核验',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===12);assert.equal(qs.length,94);
 const intersect=(a,b)=>{let i=0,j=0,out=[];while(i<a.length&&j<b.length){if(a[i]===b[j]){out.push(a[i]);i++;j++;}else if(a[i]<b[j])i++;else j++;}return out;};
 for(let a=0;a<64;a++)for(let b=0;b<64;b++){const x=Array.from({length:6},(_,i)=>i).filter(i=>a>>i&1),y=Array.from({length:6},(_,i)=>i).filter(i=>b>>i&1);assert.deepEqual(intersect(x,y),x.filter(i=>y.includes(i)));}
 const update=(balance,txs)=>{const errors=[];txs.forEach((t,i)=>{if(!['deposit','withdraw'].includes(t.kind)||!Number.isFinite(t.amount)||t.amount<=0)errors.push(i);else if(t.kind==='deposit')balance+=t.amount;else if(balance<t.amount)errors.push(i);else balance-=t.amount;});return{balance,errors};};
 assert.deepEqual(update(50,[{kind:'withdraw',amount:60},{kind:'deposit',amount:20}]),{balance:70,errors:[0]});
 assert.deepEqual(update(50,[{kind:'deposit',amount:20},{kind:'withdraw',amount:60}]),{balance:10,errors:[]});
 assert.deepEqual(update(50,[{kind:'deposit',amount:-4},{kind:'invalid',amount:4},{kind:'deposit',amount:10}]),{balance:60,errors:[0,1]});
 assert.equal(Math.floor((1024-64)/80),12);assert.equal(100+7*20,240);
});

test('文件94原创全题型及集合差/并、稀疏索引边界交叉核验',()=>{
 const qs=waveThreePractice.structures.filter(q=>q.chapter===12);assert.deepEqual(['判断题','选择题','填空题','应用题','算法设计'].map(s=>qs.filter(q=>q.section===s).length),[20,20,20,20,14]);
 const merge=(a,b,minus=false)=>{let i=0,j=0,out=[];while(i<a.length&&j<b.length){if(a[i]===b[j]){if(!minus)out.push(a[i]);i++;j++;}else if(a[i]<b[j])out.push(a[i++]);else{if(!minus)out.push(b[j]);j++;}}out.push(...a.slice(i));if(!minus)out.push(...b.slice(j));return out;};
 for(let x=0;x<32;x++)for(let y=0;y<32;y++){const a=[0,1,2,3,4].filter(i=>x>>i&1),b=[0,1,2,3,4].filter(i=>y>>i&1);assert.deepEqual(merge(a,b),[...new Set([...a,...b])].sort((a,b)=>a-b));assert.deepEqual(merge(a,b,true),a.filter(i=>!b.includes(i)));}
 const blocks=[[2,5,10],[14,18,20],[25,30,35]],maxima=blocks.map(b=>b.at(-1)),minima=blocks.map(b=>b[0]);
 for(let key=0;key<=40;key++){let maxIndex=maxima.findIndex(x=>x>=key),minIndex=-1;for(let i=0;i<minima.length;i++)if(minima[i]<=key)minIndex=i;const truth=blocks.flat().includes(key);assert.equal(maxIndex>=0&&blocks[maxIndex].includes(key),truth);assert.equal(minIndex>=0&&blocks[minIndex].includes(key),truth);}
 for(let c=1;c<=20;c++)for(let n=0;n<=60;n++){const blocks=Math.ceil(n/c);for(let i=0;i<n;i++)assert.ok(Math.floor(i/c)<blocks&&i%c<c);}
});

test('数电概述新增80题结构完整，独立穷举补码、格雷码和奇偶校验',()=>{
 const qs=waveThreePractice.digital.filter(q=>q.chapter===1);assert.equal(qs.length,80);assert.ok(qs.every(q=>q.chapter===1&&q.pool==='practice'));
 assert.equal(new Set(qs.map(q=>q.stem)).size,80);
 const signed=(bits,n)=>bits>=2**(n-1)?bits-2**n:bits;
 assert.equal(signed(9,4),-7);assert.equal(signed(255,8),-1);assert.equal(signed(128,8),-128);assert.equal(signed(250,8),-6);
 for(let b=0;b<16;b++){const g=b^(b>>1);let decoded=0;for(let mask=g;mask;mask>>=1)decoded^=mask;assert.equal(decoded,b);if(b<15){const next=(b+1)^((b+1)>>1),diff=g^next;assert.ok(diff>0&&(diff&(diff-1))===0);}}
 assert.equal(10^(10>>1),15);assert.equal((13^15)+1,3);
 for(let value=0;value<256;value++){const ones=value.toString(2).replaceAll('0','').length,p=ones%2;assert.equal((ones+p)%2,0);for(let bit=0;bit<8;bit++){const changed=value^(1<<bit);assert.equal((changed.toString(2).replaceAll('0','').length+p)%2,1);}}
 assert.equal(2/8,0.25);assert.equal(2**-5,0.03125);
 for(const q of qs.filter(q=>q.type==='single'))assert.ok(q.answer>=0&&q.answer<q.options.length);
});

test('数电概述80原创题型与BCD修正、精度界、状态容量独立核验',()=>{
 const qs=waveThreePractice.digital.filter(q=>q.chapter===1);assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>qs.filter(q=>q.section===s).length),[20,20,25,15]);
 for(let a=0;a<=9;a++)for(let b=0;b<=9;b++)for(let carry=0;carry<=1;carry++){
  const sum=a+b+carry,raw=sum&15,correction=sum>15||raw>9,corrected=sum+(correction?6:0);assert.equal(corrected&15,sum%10);assert.equal(corrected>>4,Math.floor(sum/10));
 }
 assert.equal((9+8+6).toString(2),'10111');assert.equal(1*10+9+8,27);
 let trunc=0;while(2**-trunc>0.01)trunc++;let nearest=0;while(2**(-nearest-1)>0.01)nearest++;assert.equal(trunc,7);assert.equal(nearest,6);
 assert.equal(2**10-1000,24);assert.equal(2**12-1000,3096);assert.equal(2**12-13,4083);
 assert.equal(Math.floor(0.3*8)/8,0.25);assert.equal(Math.round(0.3*8)/8,0.25);
 assert.equal((7^(7>>1)).toString(2).padStart(4,'0'),'0100');assert.equal((8^(8>>1)).toString(2).padStart(4,'0'),'1100');
 assert.ok(Math.abs(1/(20e-6)-50000)<1e-8);assert.equal(12/20,0.6);
});

test('逻辑代数76原创结构与源题标准式/反相对偶独立穷举',()=>{
 const qs=waveThreePractice.digital.filter(q=>q.chapter===2);assert.equal(qs.length,76);assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>qs.filter(q=>q.section===s).length),[20,20,24,12]);
 const s1=[],s2=[],s4=[],non=[];
 for(let i=0;i<16;i++){const A=(i>>3)&1,B=(i>>2)&1,C=(i>>1)&1,D=i&1;const f=!!((B&&D)||(A&&C&&D)||(A&&B&&!D)||(A&&!C&&!D));if(f)s2.push(i);}
 for(let i=0;i<8;i++){const A=(i>>2)&1,B=(i>>1)&1,C=i&1;if((!B&&!C)||(B&&C)||A)s1.push(i);if(A^Number(!(B^C)))s4.push(i);if(!(A===B&&B===C))non.push(i);assert.equal(Boolean(A&&(B||C)),Boolean(A&&B||A&&C));assert.equal(Boolean(A||!A&&B),Boolean(A||B));}
 assert.deepEqual(s1,[0,3,4,5,6,7]);assert.deepEqual(s2,[5,7,8,11,12,13,14,15]);assert.deepEqual(s4,[0,3,5,6]);assert.deepEqual(non,[1,2,3,4,5,6]);
 const f=(A,B,C,D,E)=>Boolean(A&&!(B||!D)||((A&&C)||(B&&D))&&E);
 const dual=(A,B,C,D,E)=>Boolean((A||!(B&&!D))&&((A||C)&&(B||D)||E));
 for(let i=0;i<32;i++){const v=Array.from({length:5},(_,j)=>!!(i>>(4-j)&1)),[A,B,C,D,E]=v;const complement=Boolean((!A||B||!D)&&((!A||!C)&&(!B||!D)||!E));assert.equal(complement,!f(...v));assert.equal(dual(...v),!f(...v.map(x=>!x)));}
 const zeros=[0,2,3,4,7,8,10],ones=Array.from({length:16},(_,i)=>i).filter(i=>!zeros.includes(i));assert.deepEqual(ones,[1,5,6,9,11,12,13,14,15]);
});

test('逻辑代数新分析式全真值及最小覆盖下界独立核验',()=>{
 const targets=[0,1,2,5,6,7],all=Array.from({length:8},(_,i)=>i),cubes=[];
 for(const a of [-1,0,1])for(const b of [-1,0,1])for(const c of [-1,0,1]){const pattern=[a,b,c],cover=all.filter(i=>pattern.every((p,j)=>p<0||p===(i>>(2-j)&1)));if(cover.every(x=>targets.includes(x)))cubes.push({cover,literals:pattern.filter(x=>x>=0).length});}
 assert.ok(cubes.every(c=>c.cover.length<=2));let best=Infinity,bestLit=Infinity;
 for(let i=0;i<cubes.length;i++)for(let j=i;j<cubes.length;j++)for(let k=j;k<cubes.length;k++){const chosen=[cubes[i],cubes[j],cubes[k]],cover=new Set(chosen.flatMap(c=>c.cover));if(targets.every(x=>cover.has(x))){best=Math.min(best,3);bestLit=Math.min(bestLit,chosen.reduce((s,c)=>s+c.literals,0));}}
 assert.equal(best,3);assert.equal(bestLit,6);
 for(let i=0;i<8;i++){
  const A=!!(i&4),B=!!(i&2),C=!!(i&1),one=(!A&&!B)||(B&&!C)||(A&&C),two=(!A&&!C)||(!B&&C)||(A&&B);assert.equal(one,targets.includes(i));assert.equal(two,one);
  assert.equal(Boolean(B||!A&&!C),[0,2,3,6,7].includes(i));assert.equal(Boolean((B||!A)&&(B||!C)),[0,2,3,6,7].includes(i));
  assert.equal(Boolean(C||!A&&B),[1,2,3,5,7].includes(i));assert.equal(Boolean((!A&&B&&C)||(A&&B&&C)||(A&&!B&&!C)),[3,4,7].includes(i));
  assert.equal(Boolean((A&&B&&!C)||(!A&&!B&&!C)),!Boolean((A&&!B)||(!A&&B)||C));
  const parity=(a,b,c)=>a^b^c;assert.equal(parity(+A,+B,+C),Number(!parity(+!A,+!B,+!C)));
 }
 for(let i=0;i<16;i++){const A=!!(i&8),B=!!(i&4),C=!!(i&2),D=!!(i&1);assert.equal(Boolean(!A&&!B&&D||A&&B&&C),[1,3,14,15].includes(i));assert.equal(Boolean(!B&&!D),[0,2,8,10].includes(i));}
});

test('门电路76原创结构与互补开关、负逻辑、电流RC及环延迟独立核验',()=>{
 const qs=waveThreePractice.digital.filter(q=>q.chapter===3);assert.equal(qs.length,76);assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>qs.filter(q=>q.section===s).length),[20,20,24,12]);
 for(let A=0;A<=1;A++)for(let B=0;B<=1;B++){
  const nA=!!A,nB=!!B,pA=!A,pB=!B,nandDown=nA&&nB,nandUp=pA||pB,norDown=nA||nB,norUp=pA&&pB;assert.notEqual(nandDown,nandUp);assert.notEqual(norDown,norUp);assert.equal(Number(nandUp),1-(A&B));assert.equal(Number(norUp),1-(A|B));
  const physicalInputA=1-A,physicalInputB=1-B,physicalNand=1-(physicalInputA&physicalInputB),negativeLogicalOut=1-physicalNand;assert.equal(negativeLogicalOut,1-(A|B));
 }
 assert.equal(Math.floor(60/8),7);assert.equal(12/1,12);assert.equal(Math.min(12,7),7);assert.ok(Math.abs((5-0.2)/2400*1000-2)<1e-12);
 assert.equal(1000*20e-12/1e-9,20);assert.equal(2*3*10,60);assert.ok(Math.abs(1/(60e-9)/1e6-16.666666666666668)<1e-10);
 const classify=v=>v>=0&&v<=0.8?'L':v>=1.7&&v<=2.5?'H':'unproved';assert.deepEqual([0,0.6,1.6,1.8,2,2.5,-0.7,3.3].map(classify),['L','L','unproved','H','H','H','unproved','unproved']);
});

test('门电路综合约束、互斥极性、边沿时延与AOI/OAI开关核验',()=>{
 const lower=(5-0.4)/0.004,leakUpper=(5-3)/100e-6,speedUpper=0.5e-6/(Math.log(2)*100e-12);assert.ok(Math.abs(lower-1150)<1e-9);assert.equal(leakUpper,20000);assert.ok(speedUpper>7200&&speedUpper<7220);assert.ok(2200>=lower&&2200<=Math.min(leakUpper,speedUpper));
 const R=2200;assert.ok((5-0.4)/R<0.004);assert.ok(5-100e-6*R>=3);assert.ok(Math.log(2)*R*100e-12<=0.5e-6);
 for(let s=0;s<2;s++)for(let disabled=0;disabled<2;disabled++){const enableA=Number(!disabled&&!s),enableBPin=Number(!!disabled||!s),bActive=1-enableBPin;assert.ok(enableA+bActive<=1);if(disabled)assert.equal(enableA+bActive,0);else assert.equal(enableA+bActive,1);}
 assert.equal(6+12,18);assert.equal(10+7,17);assert.equal(50+(10+7)-(6+12),49);
 for(let i=0;i<16;i++){const A=!!(i&8),B=!!(i&4),C=!!(i&2),D=!!(i&1),aoiDown=(A&&B)||(C&&D),aoiUp=(!A||!B)&&(!C||!D),oaiDown=(A||B)&&(C||D),oaiUp=(!A&&!B)||(!C&&!D);assert.notEqual(aoiDown,aoiUp);assert.notEqual(oaiDown,oaiUp);}
 const dynamic=0.5*10e-12*3**2*20e6;assert.ok(Math.abs(dynamic-0.0009)<1e-12);assert.ok(Math.abs(0.0001+2*dynamic-0.0019)<1e-12);
 assert.equal(Math.min(Math.floor((1000-200)/50),Math.floor((10000-2000)/800)),10);
});

test('组合电路40原创及保密锁、优先编码、弃权投票与减法器独立枚举',()=>{
 const qs=waveThreePractice.digital.filter(q=>q.chapter===4);assert.equal(qs.length,40);assert.deepEqual(['选择题','填空题'].map(s=>qs.filter(q=>q.section===s).length),[20,20]);
 const y=[],z=[];for(let i=0;i<8;i++){const A=!!(i&4),B=!!(i&2),C=!!(i&1);y.push(Number(A&&(B||C)));z.push(Number(!A));}assert.equal(y.join(''),'00000111');assert.equal(z.join(''),'11110000');
 for(let v=0;v<16;v++){const H=!!(v&8),J=!!(v&4),W=!!(v&2),L=!!(v&1),out=[Number(H||J),Number(H||!J&&W)],valid=H||J||W||L,expected=H?3:J?2:W?1:0;assert.equal(out[0]*2+out[1],expected);assert.equal(!!valid,v!==0);}
 let validInputs=0;const pairs=new Set();for(let v=0;v<1024;v++){let s=0,o=0,valid=true;for(let p=0;p<5;p++){const code=v>>(p*2)&3;if(code===3)valid=false;else if(code===2)s++;else if(code===1)o++;}if(valid){validInputs++;pairs.add(s+','+o);const rule=o===0&&s>=1&&s<=5||o===1&&s>=2&&s<=4||o===2&&s===3;assert.equal(!!rule,s>o);}}assert.equal(validInputs,243);assert.equal(pairs.size,21);
 for(let A=0;A<2;A++)for(let B=0;B<2;B++)for(let bin=0;bin<2;bin++){const diff=A-B-bin,borrow=diff<0?1:0,d=(diff+2)%2;assert.equal(d-2*borrow,diff);assert.equal(d,A^B^bin);}
 assert.equal((10+6)&15,0);assert.equal((10+6)>>4,1);for(let A=0;A<2;A++)for(let S=0;S<2;S++)assert.equal(Number(!S&&A||S&&!A),A^S);
});
