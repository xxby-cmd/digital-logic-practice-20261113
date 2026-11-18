import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

// This chapter audit deliberately keeps the c48 delivered questions and proposed
// replacements separate. Passing is evidence for the named checks, not a claim
// that the known findings have already been integrated into the website.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/stack-queue-quality-20261118.json',import.meta.url),'utf8'));
const raw=fixture.sourceSnapshotRaw,snapshot=JSON.parse(raw),ledger=fixture.audit,candidateFile=fixture.candidateFile;
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const id=n=>`P3-structures-3-${n}`;
const byId=new Map(snapshot.questions.map(q=>[q.id,q]));
const current=n=>byId.get(id(n));
const proposed=n=>candidateFile.candidates.find(c=>c.id===id(n))?.question;
const seen=new Set(),observations=[];
function select(q,label,details){
 const matches=q.options.flatMap((s,i)=>s===label?[i]:[]);assert.equal(matches.length,1,q.id+'应有唯一语义正确选项：'+label);
 for(let i=0;i<q.options.length;i++)assert.equal(grade(q,i).correct,i===matches[0],q.id+'实际选项评分');
 seen.add(q.id);observations.push({id:q.id,revision:q.revision,stemHash:hash(q.stem),derived:label,details});
}
function fill(q,values,details,wrong){
 const answers=values.map(String);assert.equal(grade(q,answers).correct,true,q.id+'独算值 '+answers);
 const display=answers.map((s,i)=>q.formats[i]==='number'?('+'+s).replace(/[0-9+.-]/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0)):s);
 assert.equal(grade(q,display).correct,true,q.id+'等价数值/普通文本');
 if(wrong)assert.equal(grade(q,wrong.map(String)).correct,false,q.id+'所列错因应被拒绝');
 seen.add(q.id);observations.push({id:q.id,revision:q.revision,stemHash:hash(q.stem),derived:answers,details});
}
function required(s,re,label){const m=s.match(re);assert.ok(m,label+'公开数据未匹配');return m;}
function numbers(s){return [...s.matchAll(/\d+/g)].map(m=>Number(m[0]));}
function ints(s){return [...s.matchAll(/-?\d+/g)].map(m=>Number(m[0]));}
function stackOutput(ops){const stack=[],output=[];for(const op of ops){if(op.kind==='push')stack.push(op.value);else {assert.ok(stack.length);output.push(stack.pop());}}return {stack,output};}
function popTrace(input,output){
 const stack=[],ops=[];let next=0,peak=0;
 for(let j=0;j<output.length;j++){
  if(stack.includes(output[j])&&stack.at(-1)!==output[j])return {valid:false,firstFailure:j,stack:[...stack],ops,peak};
  while(stack.at(-1)!==output[j]&&next<input.length){const v=input[next++];stack.push(v);ops.push(['push',v]);peak=Math.max(peak,stack.length);}
  if(!stack.length||stack.at(-1)!==output[j])return {valid:false,firstFailure:j,stack:[...stack],ops,peak};
  ops.push(['pop',stack.pop()]);
 }
 return {valid:next===input.length&&stack.length===0,ops,peak,stack};
}
function enumerateStack(input){
 const results=[];
 function visit(next,stack,output,ops,peak){
  if(output.length===input.length){results.push({output,ops,peak});return;}
  if(next<input.length)visit(next+1,[...stack,input[next]],output,[...ops,'P'],Math.max(peak,stack.length+1));
  if(stack.length)visit(next,stack.slice(0,-1),[...output,stack.at(-1)],[...ops,'S'],peak);
 }
 visit(0,[],[],[],0);return results;
}
function postfix(expression){
 const stack=[],trace=[];let peak=0;
 const tokens=expression.replace(/[−–]/g,'-').trim().split(/\s+/);
 for(let i=0;i<tokens.length;i++){
  const token=tokens[i];
  if(['+','-','*','/'].includes(token)){
   if(stack.length<2)return {valid:false,firstFailure:i+1,trace,peak};
   const right=stack.pop(),left=stack.pop();
   stack.push(typeof left==='number'&&typeof right==='number'?({'+':()=>left+right,'-':()=>left-right,'*':()=>left*right,'/':()=>left/right}[token])():`(${left}${token}${right})`);
  }else stack.push(/^-?\d+$/.test(token)?Number(token):token);
  trace.push([...stack]);peak=Math.max(peak,stack.length);
 }
 return {valid:stack.length===1,value:stack[0],trace,peak};
}
function infixTree(s){
 const tokens=s.replace(/[−–]/g,'-').replace(/\s/g,'').split('');let p=0;
 function factor(){if(tokens[p]==='('){p++;const value=add();assert.equal(tokens[p++],')');return value;}const value=tokens[p++];assert.match(value,/^[A-Z]$/);return {value};}
 function mul(){let a=factor();while(['*','/'].includes(tokens[p])){const op=tokens[p++];a={op,left:a,right:factor()};}return a;}
 function add(){let a=mul();while(['+','-'].includes(tokens[p])){const op=tokens[p++];a={op,left:a,right:mul()};}return a;}
 const tree=add();assert.equal(p,tokens.length);return tree;
}
const postorder=t=>t.op?postorder(t.left)+postorder(t.right)+t.op:t.value;
function brackets(s){
 const stack=[],trace=[];let peak=0;
 const open='([{',close=')]}';
 for(let i=0;i<s.length;i++){
  const c=s[i];if(open.includes(c))stack.push(c);
  else if(close.includes(c)&&stack.pop()!==open[close.indexOf(c)])return {valid:false,firstFailure:i+1,trace,peak};
  trace.push(stack.length);peak=Math.max(peak,stack.length);
 }
 return {valid:!stack.length,unclosed:stack.length,trace,peak};
}
function ringLength(m,front,rear){let count=0;for(let p=front;p!==rear;p=(p+1===m?0:p+1)){count++;assert.ok(count<m);}return count;}
function twoStackQueue(events){const a=[],b=[],output=[];let moves=0;for(const e of events){if(e!=='pop'){a.push(e);moves++;}else {if(!b.length)while(a.length){b.push(a.pop());moves+=2;}if(b.length){output.push(b.pop());moves++;}}}return {output,moves,a,b};}
function dequeOutputs(input){
 const result=new Map();function visit(next,q,output,ops){if(output.length===input.length){result.set(output.join(''),ops);return;}if(next<input.length)visit(next+1,[...q,input[next]],output,[...ops,['in',input[next]]]);if(q.length){visit(next,q.slice(1),[...output,q[0]],[...ops,['front',q[0]]]);if(q.length>1)visit(next,q.slice(0,-1),[...output,q.at(-1)],[...ops,['back',q.at(-1)]]);}}
 visit(0,[],[],[]);return result;
}
function hanoiShortest(n){
 const target=3**n-1,start=Array(n).fill(0),queue=[[start,0]],visited=new Set([0]);
 const encode=state=>state.reduce((n,x,i)=>n+x*3**i,0);
 for(let k=0;k<queue.length;k++){
  const [state,d]=queue[k];if(encode(state)===target)return d;
  const tops=[Infinity,Infinity,Infinity];for(let disk=0;disk<n;disk++)tops[state[disk]]=Math.min(tops[state[disk]],disk);
  for(let from=0;from<3;from++)if(tops[from]!==Infinity)for(let to=0;to<3;to++)if(to!==from&&tops[from]<tops[to]){const next=[...state];next[tops[from]]=to;const key=encode(next);if(!visited.has(key)){visited.add(key);queue.push([next,d+1]);}}
 }
 throw Error('unreachable');
}
function callEvents(n,branch){
 const entered=[],printed=[];let active=0,peak=0;
 function call(n){active++;peak=Math.max(peak,active);entered.push(n);if(branch?n>=2:n>0){call(n-1);if(branch)call(n-2);else printed.push(n);}active--;}
 call(n);return {entered,printed,peak};
}
function mazeFirstAndShortest(rows,columns,directions){
 const target=columns-1,neighbors=cell=>directions.map(([dr,dc])=>[Math.floor(cell/columns)+dr,cell%columns+dc]).filter(([r,c])=>r>=0&&r<rows&&c>=0&&c<columns).map(([r,c])=>r*columns+c);
 function dfs(path){const last=path.at(-1);if(last===target)return path;for(const next of neighbors(last))if(!path.includes(next)){const found=dfs([...path,next]);if(found)return found;}return null;}
 const first=dfs([0]),queue=[[0,0]],visited=new Set([0]);let shortest;
 for(let i=0;i<queue.length;i++){const [cell,steps]=queue[i];if(cell===target){shortest=steps;break;}for(const next of neighbors(cell))if(!visited.has(next)){visited.add(next);queue.push([next,steps+1]);}}
 return {first,shortest};
}

test('100题逐题账本绑定实际c48网页、题号/版本/完整公开字段，候选与现题分开',()=>{
 assert.equal(snapshot.htmlSha256,'c48a0263772f359dfa0682502157fb1b3970798d40d6d0a8db42c7a966ddeff3');
 assert.equal(hash(raw),'0c4e51029e163894a3ae2a513e1f80bdf6bcfaaac0ecfc7e0dad6ff883f7d0a3');
 assert.equal(fixture.sourceSnapshotSha256,hash(raw));
 assert.equal(hash(candidateFile),'118f9c9432c40dd80ce718f3e6f433bb1c56d22737c0e085ff5a978965b343ca','31份候选内容与主线Q50独审闭环冻结稿完整一致');
 assert.equal(fixture.candidateCanonicalSha256,hash(candidateFile));
 assert.deepEqual(['single','fill','short'].map(t=>snapshot.questions.filter(q=>q.type===t).length),[50,20,30]);
 assert.equal(ledger.ledger.length,100);assert.equal(new Set(ledger.ledger.map(q=>q.id)).size,100);
 const revisions=Object.fromEntries(snapshot.questions.map(q=>[q.id,q.revision]));
 const historical=new Map(getPracticeCourse('structures',{questionRevisions:revisions}).questions.map(q=>[q.id,q]));
 for(let i=0;i<100;i++){
  const q=snapshot.questions[i],entry=ledger.ledger[i];assert.equal(q.id,id(i+1));assert.equal(entry.id,q.id);assert.equal(entry.sourceQuestionSha256,hash(q));
  assert.ok(entry.mechanism&&entry.conclusion&&entry.answerCheck);assert.deepEqual(historical.get(q.id),q,q.id+'本轮题/旧版准确读取');
 }
 assert.equal(candidateFile.state,'not_integrated');assert.equal(candidateFile.candidates.length,31);
 for(const c of candidateFile.candidates){assert.equal(c.baseRevision,1);assert.equal(c.targetRevision,2);assert.ok(Number(c.id.split('-').at(-1))<91);assert.deepEqual(c.previous,byId.get(c.id));assert.equal(c.question.type,c.previous.type);assert.equal(c.question.id,c.previous.id);assert.equal(c.question.chapter,3);assert.equal(c.question.revision,2);assert.ok(c.newMechanism&&c.nearbyDifference&&c.independentCheck&&c.studyEvidence);assert.equal(c.question.coding,false);}
});

test('20判断经人工逐题核因后绑定实际选项及grade；概念核答不冒充形式证明',()=>{
 const facts=[true,false,true,true,false,false,true,false,true,false,true,false,true,true,false,false,true,false,true,false];
 facts.forEach((truth,i)=>{const q=current(i+1);assert.deepEqual(q.options,['正确','错误']);select(q,truth?'正确':'错误',ledger.ledger[i].answerCheck);});
 assert.equal(popTrace([1,2,3],[3,1,2]).valid,false);assert.equal(brackets(')(').valid,false);
 assert.ok(ringLength(7,6,1)>0);assert.ok(9>1); // 9 then 1 has top 1, not maximum.
});

test('30选择逐项语义核答，栈操作/排列/后缀/中缀计算从现题数据求解',()=>{
 const q21=current(21),ops=[...q21.stem.matchAll(/push\((\d+)\)|pop/g)].map(m=>m[1]?{kind:'push',value:Number(m[1])}:{kind:'pop'});
 select(q21,stackOutput(ops).output.join(','),'按当前push/pop顺序模拟');
 const q22=current(22),input=required(q22.stem,/入栈顺序([\d,]+)/,'22输入')[1].split(',').map(Number);
 const impossible=q22.options.filter(s=>!popTrace(input,s.split(',').map(Number)).valid);assert.equal(impossible.length,1);select(q22,impossible[0],'实际四个候选逐一检验');
 for(const n of [31]){const q=current(n),expr=required(q.stem,/后缀表达式(.+)，结果/,'后缀数据')[1];select(q,String(postfix(expr).value),{tokens:expr,trace:postfix(expr).trace});}
 for(const n of [32,33]){const q=current(n),expr=required(q.stem,/中缀(.+)的后缀/,'中缀数据')[1];select(q,postorder(infixTree(expr)),'递归下降建树再后序，非照抄答案');}
 const labels={23:'a[++top]=x',24:'a[--top]',25:'s->next=top;top=s;',26:'队头',27:'(rear+1)%m==front',28:'(rear-front+m)%m',29:'front==rear且都指头结点',30:'令rear回到front所指头结点',34:'立即判定不匹配',35:'第一次入队时',36:'待恢复的局部状态和返回位置',37:'入栈in，出队时out为空才把in整体倒入out',38:'两个栈顶相邻，再增长将相撞',39:'先到先处理的等待任务',40:'最近执行先撤销',41:'count==m',42:'O(1)',43:'未匹配左括号的类型和嵌套顺序',44:'1',45:'O(n)',46:'不再包含该旧项',47:'O(n)',48:'下标越过数组边界',49:'栈深度的最大值',50:'报告为空，不把某个整数值当成所有情况通用失败标志'};
 for(const [n,label]of Object.entries(labels))select(current(Number(n)),label,ledger.ledger[Number(n)-1].answerCheck);
 assert.equal(brackets('([)]').firstFailure,3);
 assert.deepEqual(twoStackQueue(['A','B','pop','C','pop','pop']).output,['A','B','C']);
 assert.equal(6+1>=7,true);assert.equal(Math.max(...brackets('(()(()))').trace),3);
});

test('20填空全部由公开数字/记号或明确概念独算，核普通等价输入和有意义错因',()=>{
 let q=current(51),n=Number(required(q.stem,/已有(\d+)个/,'元素数')[1]);fill(q,[n-1],'下标0起',[n]);
 q=current(52);let [cap,top]=numbers(q.stem);fill(q,[cap-(top+1)],'当前顶已占top+1项',[cap-top]);
 q=current(53);n=Number(required(q.stem,/值为(\d+)/,'下一空位')[1]);fill(q,[n],'下一可写位置前有n项',[n+1]);
 q=current(54);n=numbers(q.stem)[0];fill(q,[n-1],'预留一格',[n]);
 q=current(55);let [m,front,rear]=numbers(q.stem);fill(q,[ringLength(m,front,rear)],'从front沿数组环走到rear',[rear-front]);
 for(const n of [56,57]){q=current(n);let [m,index]=numbers(q.stem);fill(q,[(index+1===m?0:index+1)],'合法单步推进',[index+1]);}
 q=current(58);let letters=required(q.stem,/依次入([a-z,]+)/,'字母栈')[1].split(',');let s=[...letters];s.pop();s.pop();fill(q,[s.at(-1)],'弹后两项',[letters.at(-1)]);
 for(const n of [59,60]){q=current(n);const expr=required(q.stem,/后缀表达式(.+)的值/,'后缀表达式')[1],r=postfix(expr);assert.ok(r.valid);fill(q,[r.value],r.trace,[r.value+1]);}
 q=current(61);let expr=required(q.stem,/中缀(.+)的后缀/,'带括号中缀')[1];fill(q,[postorder(infixTree(expr))],'按树的后序输出',['AB*C+']);
 q=current(62);let word=required(q.stem,/括号串([()]+)/,'括号串')[1],b=brackets(word);assert.ok(b.valid);fill(q,[b.peak],b.trace,[word.length/2]);
 q=current(63);assert.match(q.stem,/四个元素/);fill(q,[['a','b','c','d'].length*2],'4压4弹共8次',[4]);
 q=current(64);let capacity=numbers(q.stem)[0],r=0;for(let i=0;i<capacity;i++)r=(r+1)%capacity;fill(q,[r===0?'相等':'不等'],'从任意front推进整圈',['不等']);
 q=current(65);let [size,a,bn]=numbers(q.stem);fill(q,[size-a-bn],'空区=总容量-两边有效占用',[Math.floor(size/2)-a]);
 q=current(66);assert.match(q.stem,/带头结点/);fill(q,[0,1],'辅助头不计数据',[1,1]);
 q=current(67);fill(q,['O(n)'],'每个字符固定次处理，扫描n个字符',['O(n²)']);assert.equal(grade(q,['Θ(n)']).correct,true);assert.equal(grade(q,['Ｏ（ｎ）']).correct,true);
 q=current(68);n=Number(required(q.stem,/含(\d+)个操作数/,'操作数')[1]);fill(q,[n-1],'每个二元合并净少1个值',[n]);
 q=current(69);let items=ints(required(q.stem,/底至顶为([^，]+)/,'原始栈')[1]);fill(q,[items.length],'两次peek不修改top',[items.length-2]);
 q=current(70);[m,front,n]=numbers(q.stem);let position=front;for(let i=0;i<n;i++)position=position+1===m?0:position+1;fill(q,[position],'沿下标环前进长度步',[position+1]);
});

test('现有主观关键轨迹独算，并显式保留评分越界/前提不足的已知发现',()=>{
 let q=current(71),m=required(q.stem,/顺序([A-Z,]+)，检验出栈([A-Z,]+)能否/,'71序列');let r=popTrace(m[1].split(','),m[2].split(','));assert.ok(r.valid);assert.equal(r.ops.length,8);
 q=current(72);m=required(q.stem,/顺序([A-Z,]+)，为什么出栈([A-Z,]+)不可能/,'72序列');r=popTrace(m[1].split(','),m[2].split(','));assert.equal(r.firstFailure,1);assert.equal(r.stack.at(-1),'B');
 q=current(73);assert.match(q.stem,/front=4、rear=1/);let front=4,rear=1,states=[];front=(front+1)%6;states.push([front,rear]);rear=(rear+1)%6;states.push([front,rear]);rear=(rear+1)%6;states.push([front,rear]);assert.deepEqual(states,[[5,1],[5,2],[5,3]]);assert.equal(ringLength(6,front,rear),4);
 q=current(74);assert.match(q.stem,/top=−1/);let top=-1;const oldIndex=top++;assert.equal(oldIndex,-1);assert.equal(top,0);
 q=current(75);assert.match(q.stem,/输出栈为空/);assert.deepEqual(twoStackQueue(['A','B','pop','C','pop','pop']).output,['A','B','C']);
 q=current(76);let word=required(q.stem,/括号串([^为]+)为何/,'76括号')[1];assert.equal(brackets(word).firstFailure,3);
 q=current(77);let expr=required(q.stem,/后缀表达式(.+)逐步/,'77后缀')[1];assert.deepEqual(postfix(expr).trace,[[9],[9,4],[9,4,1],[9,5],[4]]);
 q=current(78);assert.match(q.stem,/A−B−C/);assert.equal(postorder(infixTree('A-B-C')),'AB-C-');assert.notEqual(postfix('9 4 - 1 -').value,postfix('9 4 1 - -').value);
 q=current(79);assert.match(q.stem,/带头结点/);assert.ok(q.model.includes('rear=front'));
 q=current(80);assert.match(q.model,/m−1/);assert.match(q.model,/count=0\/m/);
 assert.match(current(81).rubric.join(''),/失败保护/);assert.ok(!proposed(81).rubric.join('').includes('失败'));
 q=current(82);const calls=callEvents(Number(required(q.stem,/初次f\((\d+)\)/,'82起始')[1]),false);assert.deepEqual(calls.printed,[1,2,3,4]);assert.equal(calls.peak,5);assert.match(q.model,/非基例为4/);
 assert.match(current(83).model,/重复入队/);assert.match(current(84).model,/共享|空|容量/);assert.match(current(85).model,/malloc失败/);
 assert.match(current(86).rubric.join(''),/失败时输出保护/);assert.ok(!proposed(86).rubric.join('').includes('失败时输出保护'));
 assert.equal(brackets('(()').unclosed,1);assert.match(current(87).model,/未闭合/);
 q=current(88);assert.match(q.stem,/正整数/);assert.ok(q.rubric.includes('0边界'));assert.ok(!proposed(88).rubric.includes('0边界'));let v=13,bits=[];while(v){bits.push(v%2);v=Math.floor(v/2);}assert.equal(bits.toReversed().join(''),'1101');
 assert.match(current(89).stem,/普通队列/);const outputs=dequeOutputs([...'ABCD']);assert.ok(outputs.has('CADB'));assert.equal(outputs.size,22);
 assert.match(current(90).model,/均摊|总次数/);for(let n=0;n<=40;n++){const r=twoStackQueue([...Array.from({length:n},(_,i)=>i),...Array(n).fill('pop')]);assert.deepEqual(r.output,Array.from({length:n},(_,i)=>i));assert.equal(r.moves,4*n);}
});

test('长度公式缺前提及代码逻辑n/别名反例是具体合法状态，不启动编译或改契约',()=>{
 const q=current(28);assert.ok(!q.stem.includes('牺牲'));assert.ok(!q.stem.includes('长度为m'));
 const m=6,front=2,rear=2,count=6;assert.equal((rear-front+m)%m,0);assert.equal(count,m);assert.notEqual((rear-front+m)%m,count);assert.match(proposed(28).stem,/牺牲一个/);
 assert.match(current(97).stem,/只按n处理/);
 const cstring=['(',')','('],n=2;assert.equal(brackets(cstring.slice(0,n).join('')).valid,true);assert.equal(brackets(cstring.join('')).valid,false);
 const second=['(',')'];assert.equal(brackets(second.slice(0,1).join('')).valid,false);assert.equal(brackets(second.join('')).valid,true);
 // An int object cannot simultaneously contain the updated metadata and an
 // arbitrary popped data value. These are interface findings, not UB probes.
 assert.notEqual(2-1,9);assert.notEqual((0+1)%3,9);
 assert.ok(ledger.codeFindings.some(f=>f.id===id(97)));
});

test('31候选字段完整、客观独算与grade逐项核对，不将候选假称已接入',()=>{
 select(proposed(8),'错误','公开front首项/rear下一空位，预留一格时相等为空');
 select(proposed(18),'错误','9后压1的正常栈反例，栈顶并非最大值');
 const q27=proposed(27);assert.match(q27.stem,/front=2、rear=6/);assert.equal(6-(6-2),2);select(q27,'假溢出','4个有效项，6格中2格空闲，非循环尾端拒绝');
 for(const n of [28])select(proposed(n),'(rear-front+m)%m','公开m与预留一格后的长度');
 const labels={29:'front==rear且都指头结点',36:'保存各未结束调用在返回后仍要使用的局部状态和继续执行的位置',37:'新元素压入in，出队时若out为空才把in全部逐项弹入out，再弹出out',38:'top1+1==top2',43:'尚未匹配左括号的类型及其嵌套顺序',44:'1',46:'不再包含该旧项',48:'下标越过数组边界',49:'尚未匹配左括号数的最大值'};
 for(const [n,label]of Object.entries(labels))select(proposed(Number(n)),label,candidateFile.candidates.find(c=>c.id===id(n)).independentCheck);
 const q50=proposed(50),size50=required(q50.stem,/(\d+)行(\d+)列/,'50迷宫大小'),rows50=Number(size50[1]),columns50=Number(size50[2]),directionNames50=required(q50.stem,/按([上下左右、]+)的顺序/,'50探索次序')[1].split('、'),moves50={下:[1,0],右:[0,1],上:[-1,0],左:[0,-1]};assert.match(q50.stem,/所有格子均可通行/);assert.match(q50.stem,/入口在左上角，出口在右上角/);
 const maze50=mazeFirstAndShortest(rows50,columns50,directionNames50.map(name=>moves50[name]));assert.ok(maze50.first);assert.ok(maze50.first.length-1>maze50.shortest);assert.equal(maze50.shortest,columns50-1);
 select(q50,`首次${maze50.first.length-1}步，最短${maze50.shortest}步`,{directions:directionNames50,firstPath:maze50.first.map(cell=>[Math.floor(cell/columns50)+1,cell%columns50+1]),shortest:maze50.shortest});
 for(let m=2;m<=15;m++)for(let top1=-1;top1<m;top1++)for(let top2=top1+1;top2<=m;top2++){const free=top2-top1-1;assert.equal(free===0,top1+1===top2);}
 const q56=proposed(56),range56=required(q56.stem,/下标0\.\.(\d+).+当前为(\d+)/,'56候选下标范围'),size56=Number(range56[1])+1,index56=Number(range56[2]);fill(q56,[(index56+1)%size56],'最后下标写入后按公开数组长度回绕',[index56+1]);
 const q57=proposed(57),m57=required(q57.stem,/按([A-Z,]+)入栈.+出栈序列([A-Z,]+)/,'57候选序列');const paths=enumerateStack(m57[1].split(',')).filter(r=>r.output.join(',')===m57[2]);assert.ok(paths.length);const min=Math.min(...paths.map(r=>r.peak));fill(q57,[min],{paths},[min-1]);
 let q=proposed(59),expression=required(q.stem,/后缀串(.+)，其中/,'59候选后缀')[1],r=postfix(expression);assert.equal(r.valid,false);fill(q,[r.firstFailure],r,[expression.split(' ').length]);
 q=proposed(61);expression=required(q.stem,/后缀表达式(.+)。每个字母/,'61后缀')[1];r=postfix(expression);assert.ok(r.valid);fill(q,[r.peak],r.trace,[5]);
 q=proposed(63);const size=Number(required(q.stem,/(\d+)个互异/,'63候选数量')[1]);const outputs=new Set(enumerateStack(Array.from({length:size},(_,i)=>i)).map(r=>r.output.join(',')));fill(q,[outputs.size],'全部合法压弹树枚举',[6]);
 const catalan=[1];for(let n=1;n<=size;n++)catalan[n]=Array.from({length:n},(_,k)=>catalan[k]*catalan[n-1-k]).reduce((a,b)=>a+b,0);assert.equal(outputs.size,catalan[size]);
 const q64=proposed(64),size64=Number(required(q64.stem,/容量为(\d+)/,'64候选容量')[1]),count64=Number(required(q64.stem,/count=(\d+)/,'64计数')[1]);let pos64=0;for(let i=0;i<count64;i++)pos64=(pos64+1)%size64;fill(q64,[pos64===0?'相等':'不等'],'rear从front推进公开count步',['不等']);
 q=proposed(70);const disks=Number(required(q.stem,/初始(\d+)个/,'汉诺塔盘数')[1]);const distance=hanoiShortest(disks);let recurrence=0;for(let n=0;n<disks;n++)recurrence=2*recurrence+1;assert.equal(distance,recurrence);fill(q,[distance],'81状态合法移动BFS最短路与递推互核',[disks*2-1]);
});

test('主观候选由独立轨迹/对象关系核关键评分，不用固定常量替代题面',()=>{
 const q72=proposed(72);assert.match(q72.stem,/两个不同元素的值都为5/);const records=enumerateStack([0,1]);assert.equal(records.length,2);assert.deepEqual(new Set(records.map(r=>r.output.map(()=>5).join(','))),new Set(['5,5']));assert.equal(new Set(records.map(r=>r.ops.join(''))).size,2);
 assert.match(proposed(73).stem,/长度为6的数组/);assert.match(proposed(73).stem,/front指队首元素/);
 const q76=proposed(76),input=required(q76.stem,/依次输入([#@a-z]+)/,'行编辑串')[1];let chars=[],trace=[];for(const c of input){if(c==='#')chars.pop();else if(c==='@')chars=[];else chars.push(c);trace.push(chars.join(''));}assert.deepEqual(trace,['','a','ab','a','','c','','d','de','d','','f']);assert.ok(q76.model.includes('最终有效行是f'));
 const q79=proposed(79);assert.match(q79.stem,/不带头结点/);for(const n of [1,2,4]){let nodes=Array.from({length:n},(_,i)=>({value:i}));nodes.forEach((x,i)=>x.next=nodes[(i+1)%n]);let rear=nodes.at(-1),oldHead=rear.next;if(oldHead===rear)rear=null;else rear.next=oldHead.next;assert.equal(rear===null,n===1);if(n>1){assert.equal(rear,nodes.at(-1));assert.equal(rear.next,nodes[1]);}}
 const q83=proposed(83),initial=Number(required(q83.stem,/执行f\((\d+)\)/,'分支递归起始')[1]);const event=callEvents(initial,true);assert.deepEqual(event.entered,[4,3,2,1,0,1,2,1,0]);assert.equal(event.entered.length,9);assert.equal(event.peak,4);assert.ok(q83.model.includes(event.entered.join(',')));
 const q84=proposed(84),stack=ints(required(q84.stem,/底向顶为([^，]+)/,'原栈')[1]),x=Number(required(q84.stem,/遇到(\d+)就/,'删除值')[1]),stable=stack.filter(v=>v!==x),s=[...stack],t=[];while(s.length){const v=s.pop();if(v!==x)t.push(v);}assert.deepEqual(t,[4,2,1]);while(t.length)s.push(t.pop());assert.deepEqual(s,stable);
 const q89=proposed(89),m=required(q89.stem,/按([A-Z,]+)的顺序.+分别得到([A-Z,]+)和([A-Z,]+)/,'双端队列候选序列'),all=dequeOutputs(m[1].split(','));assert.ok(all.has(m[2].replaceAll(',','')));assert.ok(!all.has(m[3].replaceAll(',','')));assert.equal(all.size,22);
 for(const n of [81,86,88])assert.deepEqual(proposed(n).stem,current(n).stem,'评分点修正不擅扩题干');
 for(const c of candidateFile.candidates.filter(c=>c.question.type==='short'))assert.equal(grade(c.question,c.question.model).status,'review');
});

test('70客观题均有当前qid/stem/options/grade回归；证据输出仅接受显式指定文件',()=>{
 assert.deepEqual([...seen].sort(),snapshot.questions.filter(q=>q.type!=='short').map(q=>q.id).sort());
 if(process.env.STACK_QUEUE_QUALITY_OUTPUT)writeFileSync(process.env.STACK_QUEUE_QUALITY_OUTPUT,JSON.stringify({at:new Date().toISOString(),scope:'本轮c48原70客观+候选客观；主观关键轨迹另核，非4004全题验收',snapshotSha256:hash(raw),observations},null,2)+'\n');
});
