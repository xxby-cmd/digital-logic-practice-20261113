import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../制作记录/并行扩题/异步与时序设计核验/',import.meta.url);
async function load(t){try{return {data:JSON.parse(await readFile(new URL('流表进阶转录.json',root),'utf8')),questions:JSON.parse(await readFile(new URL('流表候选4题.json',root),'utf8'))};}catch(error){if(error.code!=='ENOENT')throw error;t.skip('第三方原流表和题面仅在本机，不随源码分发');return null;}}
const hamming=n=>n.toString(2).replace(/0/g,'').length;
const pair=(a,b)=>[a,b].sort().join('');
const pairs=states=>states.flatMap((a,i)=>states.slice(i+1).map(b=>[a,b]));
function settle(initial,step){let state=initial;const path=[state],seen=new Set();for(let i=0;i<32;i++){if(seen.has(state))throw Error('固定输入出现内部闭环');seen.add(state);const next=step(state);if(next===state)return {state,path};path.push(next);state=next;}throw Error('超过状态空间仍未稳定');}
function oneHotExpansion(table){
 const names=Object.keys(table),codes=Object.fromEntries(names.map((s,i)=>[s,1<<(names.length-1-i)]));
 function next(code,column){const members=names.filter(s=>code&codes[s]);
  if(members.length===0)return codes[names[0]];
  if(members.length===1){const s=members[0],target=table[s][column];return target===s?code:code|codes[target];}
  if(members.length===2){const [a,b]=members,forward=table[a][column]===b,backward=table[b][column]===a;assert.ok(!(forward&&backward),'原表固定输入的两态环不能凭编码变成收敛状态');return forward?codes[b]:backward?codes[a]:codes[a];}
  return code&~(code&-code);
 }
 return {codes,next};
}
test('流表候选4题完整、33/35合并计一题，给足编码/未限定项/初态',async t=>{
 const local=await load(t);if(!local)return;const {questions}=local;
 assert.equal(questions.length,4);assert.equal(new Set(questions.map(q=>q.id)).size,4);
 for(const q of questions){assert.equal(q.chapter,7);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.equal(q.reference.pdfPage,q.reference.printedPage+8);assert.ok(q.model.length>100);assert.ok(q.rubric.length>=4);}
 assert.ok(questions.find(q=>q.id==='FENG-CH7-33-35').stem.includes('下一个完整波形记为第1个'));
});
test('原两位编码临界竞争枚举所有单比特先后路径，确有两种稳定结局',async t=>{
 const local=await load(t);if(!local)return;const {table25:table,originalCodes25:codes}=local.data,inv=Object.fromEntries(Object.entries(codes).map(([s,c])=>[c,s]));
 const double=[];for(const [s,row]of Object.entries(table))row.forEach((target,c)=>{if(hamming(codes[s]^codes[target])>1)double.push([s,c,target]);});assert.deepEqual(double,[['A',2,'C'],['B',2,'D']]);
 for(const initial of ['A','B']){const todo=[initial],seen=new Set(),ends=new Set();while(todo.length){const s=todo.pop();if(seen.has(s))continue;seen.add(s);const target=table[s][2],diff=codes[s]^codes[target];if(!diff)ends.add(s);for(let i=0;i<2;i++)if(diff&(1<<i))todo.push(inv[codes[s]^(1<<i)]);}assert.deepEqual([...ends].sort(),['C','D']);}
 assert.equal(table.A[1],'A');assert.equal(table.B[1],'B');assert.equal(hamming(1^3),1);
});
test('一位有效加过渡码构造在全部16编码/四输入下仅单比特变化且收敛',async t=>{
 const local=await load(t);if(!local)return;const {table25:table}=local.data,{codes,next}=oneHotExpansion(table);
 assert.deepEqual(codes,{A:8,B:4,C:2,D:1});
 for(let code=0;code<16;code++)for(let c=0;c<4;c++){assert.ok(hamming(code^next(code,c))<=1);const end=settle(code,s=>next(s,c)).state;assert.ok(Object.values(codes).includes(end));}
 for(const [name,code]of Object.entries(codes))for(let c=0;c<4;c++){const expected=settle(name,s=>table[s][c]).state;assert.equal(settle(code,s=>next(s,c)).state,codes[expected]);}
 const edges=new Set();for(const [s,row]of Object.entries(table))for(const target of row)if(target!==s)edges.add(pair(s,target));assert.equal(edges.size,6);
});
test('另一原流表的十个稳定总态及20个单输入变化去向逐项核验',async t=>{
 const local=await load(t);if(!local)return;const {columns,table27:table}=local.data,codes={A:0,B:1,C:2,D:3},stable=[],adjacent=new Set();
 for(const [s,row]of Object.entries(table))row.forEach(([next,y],c)=>{assert.ok(hamming(codes[s]^codes[next])<=1);if(next===s)stable.push(s+columns[c]);else adjacent.add(pair(s,next));});
 assert.deepEqual(stable,['A00','A10','B01','B11','B10','C00','C01','D01','D11','D10']);assert.deepEqual([...adjacent].sort(),['AB','AC','CD']);
 const expected={A00:['C01','A10'],A10:['A00','B11'],B01:['A00','B11'],B11:['B01','B10'],B10:['A00','B11'],C00:['C01','A10'],C01:['C00','D11'],D01:['C00','D11'],D11:['D01','D10'],D10:['C00','D11']};
 for(const total of stable){const input=parseInt(total.slice(1),2),actual=[];for(const changed of columns.filter(x=>hamming(parseInt(x,2)^input)===1)){const column=columns.indexOf(changed),s=settle(total[0],v=>table[v][column][0]).state;actual.push(s+changed);}assert.deepEqual(actual.sort(),expected[total].sort());}
});
function compatibleByRefinement(table){const states=Object.keys(table);let possible=new Set(pairs(states).filter(([a,b])=>!table[a].some((cell,i)=>cell[1]!==null&&table[b][i][1]!==null&&cell[1]!==table[b][i][1])).map(([a,b])=>pair(a,b)));while(true){const next=new Set([...possible].filter(p=>!table[p[0]].some((cell,i)=>{const a=cell[0],b=table[p[1]][i][0];return a&&b&&a!==b&&!possible.has(pair(a,b));})));if(next.size===possible.size)return next;possible=next;}}
function compatibleByConflictReachability(table){const names=Object.keys(table),nodes=pairs(names),initial=new Set(),requires=new Map();for(const [a,b]of nodes){const key=pair(a,b),needed=[];table[a].forEach((cell,i)=>{const other=table[b][i];if(cell[1]!==null&&other[1]!==null&&cell[1]!==other[1])initial.add(key);if(cell[0]&&other[0]&&cell[0]!==other[0])needed.push(pair(cell[0],other[0]));});requires.set(key,needed);}return new Set(nodes.map(([a,b])=>pair(a,b)).filter(start=>{const todo=[start],seen=new Set();while(todo.length){const p=todo.pop();if(initial.has(p))return false;if(seen.has(p))continue;seen.add(p);todo.push(...requires.get(p));}return true;}));}
test('不完全流表兼容关系由逐次细分与冲突依赖可达性独立得到',async t=>{
 const local=await load(t);if(!local)return;const {table29:table}=local.data,a=compatibleByRefinement(table),b=compatibleByConflictReachability(table);assert.deepEqual([...a].sort(),['AC','BD','BE','DE','EF']);assert.deepEqual(a,b);
 const cliques=[];for(let mask=1;mask<64;mask++){const group=Object.keys(table).filter((_,i)=>mask>>i&1);if(pairs(group).every(([s,t])=>a.has(pair(s,t))))cliques.push(group.join(''));}const maximal=cliques.filter(g=>!cliques.some(h=>h.length>g.length&&[...g].every(v=>h.includes(v))));assert.deepEqual(maximal.sort(),['AC','BDE','EF']);
 for(const p of ['AB','AF','BF'])assert.equal(a.has(p),false);assert.ok(a.has('BE')&&a.has('EF')&&!a.has('BF'));
});
test('闭合三组合并覆盖所有已定后继/输出，三态下界与加T实现分别核验',async t=>{
 const local=await load(t);if(!local)return;const {table29:table}=local.data,groups={U:['A','C'],V:['B','D'],W:['E','F']},next={U:['U','V','W','U'],V:['V','V','W','W'],W:['U','V','W','W']},output={U:0,V:0,W:1};
 for(const [g,states]of Object.entries(groups))for(let c=0;c<4;c++)for(const state of states){const [target,y]=table[state][c];if(target!==null)assert.ok(groups[next[g][c]].includes(target));if(y!==null)assert.equal(output[g],y);}
 const assigned={U:0,V:1,W:3,T:2},expanded={U:['U','V','T','U'],V:['V','V','W','W'],W:['T','V','W','W'],T:['U','U','W','U']};
 for(const [s,row]of Object.entries(expanded))for(const to of row)assert.ok(hamming(assigned[s]^assigned[to])<=1);
 for(const s of ['U','V','W'])for(let c=0;c<4;c++){const expected=settle(s,v=>next[v][c]).state;assert.equal(settle(s,v=>expanded[v][c]).state,expected);}
});
test('奇偶完整波形滤除的反馈激励按异步收敛核验，不一次硬写两状态位',async t=>{
 const local=await load(t);if(!local)return;const candidate=local.questions.find(q=>q.id==='FENG-CH7-33-35');
 const excitation=(state,X)=>{const a=state>>1,b=state&1;return 2*(((1-X)&b)|(X&a))+(((1-X)&b)|(X&(1-a)));};
 for(let state=0;state<4;state++)for(let X=0;X<2;X++)assert.ok(hamming(state^excitation(state,X))<=1);
 for(let length=0;length<=12;length++)for(const input of (function* generate(n){if(!n){yield '';return;}for(const pre of generate(n-1)){yield pre+'0';yield pre+'1';}})(length)){let state=0,old=0,rises=0;for(const digit of input){const X=Number(digit);if(!old&&X)rises++;state=settle(state,s=>excitation(s,X)).state;assert.equal(Number(state===1),Number(X===1&&rises%2===1));old=X;}}
 assert.ok(candidate.model.includes('F1=X′Y0+XY1，F0=X′Y0+XY1′'));assert.ok(candidate.stem.includes('电路已复位'));
});
test('流表转录已定输出/列次序保持源页锚点，未限定项不强改0',async t=>{
 const local=await load(t);if(!local)return;const {data}=local;
 assert.deepEqual(data.columns,['00','01','11','10']);assert.equal(data.table25.C[1],'D');assert.equal(data.table25.D[2],'D');
 assert.deepEqual(data.table27.D[0],['C',0]);assert.deepEqual(data.table27.C[1],['C',1]);
 const known=[];for(const [s,row]of Object.entries(data.table29))row.forEach(([,out],i)=>{if(out!==null)known.push([s,data.columns[i],out]);});assert.deepEqual(known,[['A','00',0],['C','10',0],['F','10',1]]);
});
