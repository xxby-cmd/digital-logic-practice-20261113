import test from 'node:test';
import assert from 'node:assert/strict';
import {waveSixPractice} from '../bank-wave-06.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
const questions=waveSixPractice.digital;
const q=(kind,n)=>questions.find(item=>item.id===`P5-digital-6-${kind}-${String(n).padStart(3,'0')}`);
const bit=(n,i)=>n>>i&1;
const binary=(n,width=3)=>n.toString(2).padStart(width,'0');
const jk=(j,k,old)=>j?(k?1-old:1):(k?0:old);
const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
function trace(initial,inputs,step){let state=initial;return inputs.map(x=>(state=step(state,x)));}
function orbit(initial,step){const visited=[],seen=new Set();let state=initial;while(!seen.has(state)){seen.add(state);visited.push(state);state=step(state);assert.ok(visited.length<=32);}return {visited,repeat:state};}
function mealy(table,initial,input){let state=initial;const outputs=[];for(const x of input){const [next,y]=table[state][Number(x)];state=next;outputs.push(y);}return outputs.join('');}
function words(n){return Array.from({length:2**n},(_,i)=>n?binary(i,n):'');}

test('同步时序80题结构、去重、答题格式与练习池完整，不从考试借题',()=>{
 assert.equal(questions.length,80);assert.equal(new Set(questions.map(item=>item.id)).size,80);
 assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>questions.filter(item=>item.section===s).length),[20,20,24,16]);
 const current=getPracticeCourse('digital').questions;
 const all=[...new Map([...current,...questions].map(item=>[item.id,item])).values()];
 for(const item of questions){
  assert.equal(item.chapter,6);assert.equal(item.pool,'practice');assert.equal(item.origin,'原创');
  assert.ok(!/同上|上一题|沿用前题/.test(item.stem));
  assert.equal(all.filter(other=>norm(item.stem)===norm(other.stem)).length,1,item.id);
  if(item.type==='single'){assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);assert.ok(Number.isInteger(item.answer)&&item.answer>=0&&item.answer<4);assert.ok(item.explanation.length>25);}
  else if(item.type==='fill'){assert.equal(item.answers.length,item.formats.length);assert.equal(grade(item,item.answers.map(v=>v[0])).correct,true);}
  else {assert.ok(item.model.length>85,item.id);assert.ok(item.rubric.length>=4,item.id);}
 }
});
test('填空答案用独立容量、计数轨迹、字串移位核对，保留二进制前导0',()=>{
 const independentlyComputed={1:[6,Math.ceil(Math.log2(6))],2:[4*2**2],3:['输入','输出'],4:[binary((5+[1,0,1,1,0].reduce((a,b)=>a+b,0))%8)],5:[2**4],6:[4,2**4],7:[2*4,2**4],8:[2**3-1],9:[12*5],10:[16],11:['1010','0101'],12:[binary(9>>1,4),binary((9>>1)|8,4)],13:['0101'.slice(1)+'0',2],14:[0,1],15:['111','000'],16:['不完全'],17:[2**3-5],18:[1],19:[binary(3+1)],20:['01']};
 for(const [n,answers]of Object.entries(independentlyComputed))assert.equal(grade(q('F',Number(n)),answers.map(String)).correct,true,`填空${n}`);
 assert.equal(grade(q('F',4),['0']).correct,false);assert.equal(grade(q('F',20),['1']).correct,false);
 assert.equal(grade(q('F',5),['16.0']).correct,true);
});
test('MC实际答案在打乱选项后仍正确，依赖关系/优先级/状态容量逐项审阅',()=>{
 const expected=['所有触发器共用CP，高位是否翻转由低位状态控制','存储元件当前保存、能影响后续行为的信息','Moore型','Mealy输出包含当前输入的组合通路',String(Math.ceil(Math.log2(5))),'对应后继在任意后续输入下也不可区分','同时按新编码重写转移、输出及初态对应关系','把实际驱动式代回每个未用状态检查后继','输出相对于输入和时钟的时序是否仍符合要求','并行装入P','当前9','一直全0','不能，还要检查其余状态的转移','是一个不变状态','两片共用CP，低片终端条件控制高片计数使能','不足，还需考虑各状态位传播延迟及译码路径','已读后缀中仍可作为下次目标前缀的最长部分','Z是状态电平，其持续时间还取决于计数是否继续','检查每个未用初态是否在有限步内进入合法循环','b3、b2、b1、b0'];
 for(let i=0;i<20;i++)assert.equal(q('S',i+1).options[q('S',i+1).answer],expected[i]);
 for(let Q=0;Q<2;Q++)for(let X=0;X<2;X++)assert.equal((Q&X)|(Q&(1-X)),Q);
 const ordered=[1,0,1,1];assert.equal(trace(0,ordered,(old,x)=>((old<<1)|x)&15).at(-1),11);
});
test('D/JK/T驱动按沿前态同时更新，区分使能保持和错误全位翻转',()=>{
 const dstep=s=>2*bit(s,0)+1-bit(s,1);assert.deepEqual([0,1,2,3].map(dstep),[1,3,0,2]);
 const states=trace(0,[0,0,0,0],dstep);assert.deepEqual(states,[1,3,2,0]);assert.deepEqual(states.map(s=>bit(s,1)&bit(s,0)),[0,1,0,0]);assert.ok(q('R',1).model.includes('0、1、0、0'));
 const jstep=s=>{const a=bit(s,2),b=bit(s,1),c=bit(s,0);return jk(b&c,b&c,a)*4+jk(c,c,b)*2+jk(1,1,c);};
 for(let s=0;s<8;s++)assert.equal(jstep(s),(s+1)%8);assert.deepEqual(trace(6,[0,0,0,0],jstep),[7,0,1,2]);
 const tstep=(s,E)=>2*(bit(s,1)^(E&bit(s,0)))+(bit(s,0)^E);
 for(let s=0;s<4;s++)for(let E=0;E<2;E++)assert.equal(tstep(s,E),(s+E)%4);
 assert.deepEqual(trace(2,[1,0,1,1],tstep),[3,3,0,1]);assert.deepEqual(trace(2,[1,1],s=>s^3),[1,2]);
 let state=0;const ys=[],nexts=[];for(const X of [1,0,1,1]){ys.push(X&(1-bit(state,1)));state=2*(X^bit(state,0))+bit(state,1);nexts.push(state);}assert.equal(ys.join(''),'1011');assert.deepEqual(nexts,[2,1,0,2]);
 assert.ok(q('R',5).model.includes('沿前Y为1011'));
});
test('重叠检测状态机对全部短串与滑窗匹配相同，命中后保留正确后缀',()=>{
 const table101=[[[0,0],[1,0]],[[2,0],[1,0]],[[0,0],[1,1]]];
 const table00100=[[[1,0],[0,0]],[[2,0],[0,0]],[[2,0],[3,0]],[[4,0],[0,0]],[[2,1],[0,0]]];
 for(let n=0;n<=11;n++)for(const input of words(n))for(const [pattern,table]of [['101',table101],['00100',table00100]]){
  const expected=[...input].map((_,i)=>Number(i+1>=pattern.length&&input.slice(i+1-pattern.length,i+1)===pattern)).join('');
  assert.equal(mealy(table,0,input),expected);
 }
 assert.equal(mealy(table101,0,'110101'),'000101');assert.ok(q('R',4).model.includes('000101'));
 assert.equal(mealy(table00100,0,'00100100'),'00001001');assert.equal(mealy(table00100,3,'00100100'),'01001001');assert.ok(q('R',20).stem.includes('初始尚未匹配任何位'));assert.equal(q('R',20).revision,2);assert.ok(q('R',20).model.includes('保留“已匹配00”'));
});
test('原创建模的三组等价、不可达删除与改编码由全部短串行为核验',()=>{
 const table=[[[1,0],[2,0]],[[0,0],[2,1]],[[2,1],[0,0]],[[4,0],[5,0]],[[3,0],[5,1]],[[5,1],[3,0]]];
 const quotient=[[[1,0],[2,0]],[[0,0],[2,1]],[[2,1],[0,0]]];
 for(let initial=0;initial<6;initial++)for(let n=0;n<=7;n++)for(const input of words(n))assert.equal(mealy(table,initial,input),mealy(quotient,initial%3,input));
 for(const [a,b,x]of [[0,1,'1'],[0,2,'0'],[1,2,'0']])assert.notEqual(mealy(quotient,a,x),mealy(quotient,b,x));
 const reachable=new Set([0]),pending=[0],reduced=[[[0,0],[1,0]],[[0,0],[1,0]],[[2,1],[2,1]]];while(pending.length){const s=pending.pop();for(const [next]of reduced[s])if(!reachable.has(next)){reachable.add(next);pending.push(next);}}assert.deepEqual([...reachable],[0,1]);
 for(let n=0;n<=6;n++)for(const input of words(n))assert.equal(mealy(reduced,0,input),'0'.repeat(n));
 for(let old=0;old<2;old++)for(let X=0;X<2;X++){const encoded=1-old;assert.equal(1-(1-X),X);assert.equal((1-encoded)&X,old&X);}assert.ok(q('R',8).model.includes('复位应置Q=1'));
 const firstOutput=(newCode,X)=>(1-newCode)&X;
 assert.equal(firstOutput(1,1),0);assert.equal(firstOutput(0,1),1);
 assert.ok(q('R',8).stem.includes('原复位到A'));assert.equal(q('R',8).revision,2);
});
test('非法闭环与同步终端检测按实际驻留状态核验，不只看复位循环',()=>{
 const next=[1,2,3,4,0,6,5,0],valid=new Set([0,1,2,3,4]);assert.deepEqual(orbit(0,s=>next[s]).visited,[0,1,2,3,4]);assert.deepEqual(orbit(5,s=>next[s]).visited,[5,6]);
 for(let s=0;s<8;s++)assert.ok(valid.has(s<5?next[s]:0));
 const counter=terminal=>s=>s===terminal?0:(s+1)%16;assert.equal(orbit(0,counter(10)).visited.length,11);assert.equal(orbit(0,counter(9)).visited.length,10);
 const preset=orbit(6,s=>s===15?6:s+1).visited;assert.deepEqual(preset,[6,7,8,9,10,11,12,13,14,15]);assert.equal(preset.filter(s=>s===15).length/preset.length,0.1);
 const mod6=[0,1,2,3,4,5];assert.equal(mod6.filter(s=>bit(s,2)).length/mod6.length,1/3);assert.equal(mod6.filter(s=>s===5).length/mod6.length,1/6);
 assert.ok(q('R',10).model.includes('11态'));assert.ok(q('R',13).model.includes('占空比1/6'));
});
test('级联与终端暂停对联合计数整数值核验，不把持续电平当进位事件',()=>{
 for(let H=0;H<4;H++)for(let L=0;L<6;L++)for(let E=0;E<2;E++){const nl=E?(L+1)%6:L,nh=(H+(E&&L===5?1:0))%4;assert.equal(6*nh+nl,(6*H+L+E)%24);}
 assert.deepEqual(trace([2,4],[1,0,1,1,1],([H,L],E)=>[(H+Number(E&&L===5))%4,E?(L+1)%6:L]),[[2,5],[2,5],[3,0],[3,1],[3,2]]);
 let state=0;const z=[],c=[],after=[];for(const E of [1,1,1,0,0,1]){z.push(Number(state===3));c.push(Number(E&&state===3));state=(state+E)%4;after.push(binary(state,2));}assert.equal(z.join(''),'000111');assert.equal(c.join(''),'000001');assert.deepEqual(after,['01','10','11','11','11','00']);assert.ok(q('R',22).model.includes('C=000001'));
});
test('移位采样、通用寄存器、环形与可逆计数分别用字串/整数轨迹核验',()=>{
 let state=11;const output=[],shifted=[];for(let i=0;i<4;i++){output.push(state%2);state=Math.floor(state/2);shifted.push(binary(state,4));}assert.equal(output.join(''),'1101');assert.deepEqual(shifted,['0101','0010','0001','0000']);
 const input=[1,0,1,1,0,0],states=trace(0,input,(old,X)=>X*8+(old>>1));assert.deepEqual(states.map(s=>binary(s,4)),['1000','0100','1010','1101','0110','0011']);assert.equal(states.map(s=>s&1).join(''),'000101');for(let i=0;i<states.length;i++)assert.equal(states[i]&1,input[i-3]??0);
 const modes=[[1,0],[0,0],[2,1],[3,6],[1,1]],whole=trace(9,modes,(old,[S,P])=>S===0?old:S===1?(P<<3)|(old>>1):S===2?((old<<1)&15)|P:P);assert.deepEqual(whole.map(s=>binary(s,4)),['0100','0100','1001','0110','1011']);
 const rotate=s=>((s&1)<<3)|(s>>1);assert.deepEqual(orbit(10,rotate).visited,[10,5]);assert.equal(orbit(8,rotate).visited.length,4);
 assert.deepEqual(trace(0,[0,0,1,1],(old,U)=>(old+(U?1:-1)+8)%8),[7,6,7,0]);
});
test('具体异或反馈确有七态循环，Moore节点输出与未规定项补全不混用',()=>{
 const step=s=>((bit(s,1)^bit(s,0))<<2)|(s>>1);const cyc=orbit(1,step);assert.deepEqual(cyc.visited,[1,4,2,5,6,7,3]);assert.equal(cyc.repeat,1);assert.equal(step(0),0);
 const table=[[0,1],[2,1],[0,3],[0,1]],after=trace(0,[1,1,0,1,0],(s,x)=>table[s][x]);assert.deepEqual(after,[1,1,2,3,0]);assert.equal(after.map(s=>Number(s===2)).join(''),'00100');
 const completed=[[[1,0],[2,1]],[[1,0],[2,1]],[[1,0],[2,1]]];for(let s=0;s<3;s++)for(let n=0;n<=7;n++)for(const input of words(n))assert.equal(mealy(completed,s,input),input);
 const g=q=>[bit(q,1),bit(q,1)^bit(q,0)];assert.deepEqual(g(1),[0,1]);assert.deepEqual(g(2),[1,1]);assert.equal(g(0)[1],0);assert.equal(g(3)[1],0);assert.ok(q('R',24).model.includes('G0可能暂时从1变0再回1'));
});
test('模5全部八码与JK同步清零/使能对声明功能逐组合核验',()=>{
 for(let s=0;s<8;s++){const a=bit(s,2),b=bit(s,1),c=bit(s,0),next=4*((1-a)&b&c)+2*((1-a)&(b^c))+((1-a)&(1-c));assert.equal(next,s<4?s+1:0);}
 for(let s=0;s<4;s++)for(let R=0;R<2;R++)for(let E=0;E<2;E++){const c=bit(s,0),b=bit(s,1),n0=jk((1-R)&E,R|E,c),n1=jk((1-R)&E&c,R|(E&c),b);assert.equal(2*n1+n0,R?0:(s+E)%4);}
 assert.ok(q('C',1).model.includes('000、000、000、000'));assert.ok(q('C',2).model.includes('K1=R+EQ0'));
});
test('交通灯、仲裁、双向采样滤波与相邻位判断对需求级真值表核验',()=>{
 for(let s=0;s<4;s++)for(let T=0;T<2;T++){const a=bit(s,1),b=bit(s,0),n1=(a&b)|(a&(1-T))|(b&T),n0=(1-a)&(b^T);assert.equal(2*n1+n0,s===3?2:T?(s+1)%3:s);assert.equal(((1-a)&(1-b))+((1-a)&b)+a,1);}
 for(let P=0;P<2;P++)for(let A=0;A<2;A++)for(let B=0;B<2;B++){const ga=A&((1-B)|(1-P)),gb=B&((1-A)|P);assert.equal(ga&gb,0);assert.equal(ga|gb,A|B);if(A&&B){assert.equal(ga,1-P);assert.equal(gb,P);}assert.equal(P^(A&B),A&&B?1-P:P);}
 const filterTable=[[0,1],[0,3],[0,3],[2,3]];
 for(let s=0;s<4;s++)for(let X=0;X<2;X++){const a=bit(s,1),b=bit(s,0),next=2*((a&b)|(X&(a|b)))+X;assert.equal(next,filterTable[s][X]);}
 for(let n=0;n<=11;n++)for(const input of words(n)){let s=0,expected=0,pending=0;for(const value of input){const X=Number(value);if(X===expected)pending=0;else if(++pending===2){expected=X;pending=0;}s=filterTable[s][X];assert.equal(bit(s,1),expected);}}
 assert.ok(q('C',5).model.includes('D1=Q1Q0+X(Q1+Q0)'));
 const prevTable=[[[1,0,0],[2,0,0]],[[1,0,0],[2,1,0]],[[1,0,1],[2,0,0]],[[0,0,0],[0,0,0]]];
 for(let s=0;s<4;s++)for(let X=0;X<2;X++){const pa=Number(s===0),pb=Number(s===1),pc=Number(s===2),V=pa|pb|pc;assert.deepEqual([2*(V&X)+(V&(1-X)),pb&X,pc&(1-X)],prevTable[s][X]);}
 for(let n=0;n<=8;n++)for(const input of words(n)){let state=0;for(let i=0;i<input.length;i++){const X=Number(input[i]),[next,y,z]=prevTable[state][X];assert.equal(y,Number(i>0&&input.slice(i-1,i+1)==='01'));assert.equal(z,Number(i>0&&input.slice(i-1,i+1)==='10'));state=next;}}
});
test('三位分帧校验把末位计入，输出寄存时刻对全部短输入帧核验',()=>{
 for(let n=0;n<=12;n++)for(const input of words(n)){let c=0,P=0;for(let i=0;i<input.length;i++){const X=Number(input[i]),V=Number(c===2),Y=V&(1-(P^X));P=c===2?0:P^X;c=(c+1)%3;const atEnd=(i+1)%3===0;assert.equal(V,Number(atEnd));assert.equal(Y,Number(atEnd&&[...input.slice(i-2,i+1)].reduce((a,b)=>a+Number(b),0)%2===0));}}
 assert.ok(q('C',7).model.includes('Y⁺=[c=2]·(P⊕X)′'));assert.ok(q('C',7).model.includes('相位、P、V、Y全清0'));assert.equal(q('C',7).revision,2);assert.ok(q('C',7).model.includes('不能保证这一新分组起点'));assert.ok(!q('C',7).model.includes('重新对帧'));
});
test('定时器启动后两沿完成，饱和倒计时与忙时禁装避免边界错拍',()=>{
 for(let state=0;state<4;state++)for(let S=0;S<2;S++){const a=bit(state,1),b=bit(state,0),next=2*(a^b)+((1-b)&(a|S));assert.equal(next,state===0?S:(state+1)%4);}
 assert.deepEqual(trace(0,[1,1,1,1,0],(s,S)=>s===0?S:(s+1)%4),[1,2,3,0,0]);
 for(let old=0;old<8;old++)for(let N=0;N<8;N++)for(let L=0;L<2;L++)for(let E=0;E<2;E++){const next=L?N:E&&old?old-1:old;assert.ok(next>=0&&next<8);if(L)assert.equal(next,N);else if(!E||old===0)assert.equal(next,old);else assert.equal(next+1,old);}
 for(let P=0;P<16;P++){let Q=P,K=4;const sent=[];for(let i=0;i<4;i++){assert.ok(K>0);sent.push(bit(Q,3));Q=(Q<<1)&15;K--;}assert.equal(sent.join(''),binary(P,4));assert.equal(K,0);assert.equal(Q,0);}
 assert.ok(q('C',8).model.includes('t0+2T'));assert.ok(q('C',10).model.includes('装载沿只建立首个有效发送周期'));
});
test('百进制使能对全部100态及暂停核验，多数窗口不重复使用本拍输入',()=>{
 for(let H=0;H<10;H++)for(let L=0;L<10;L++)for(let E=0;E<2;E++){const nh=(H+Number(E&&L===9))%10,nl=(L+E)%10,carry=Number(E&&H===9&&L===9);assert.equal(nh*10+nl,(H*10+L+E)%100);assert.equal(carry,Number(H*10+L+E>=100));}
 for(let n=0;n<=10;n++)for(const input of words(n)){let old1=0,old2=0;for(let i=0;i<input.length;i++){const X=Number(input[i]),Y=(X&old1)|(X&old2)|(old1&old2),history=[...(input.slice(0,i+1).padStart(3,'0').slice(-3))].map(Number);assert.equal(Y,Number(history.reduce((a,b)=>a+b,0)>=2));[old1,old2]=[X,old1];}}
 assert.ok(q('C',12).model.includes('DY=XQ1+XQ0+Q1Q0'));
});
test('串行除3的余数机对整数前缀求余，非法码回零与初态输出明确',()=>{
 for(let s=0;s<4;s++)for(let X=0;X<2;X++){const p0=Number(s===0),p1=Number(s===1),p2=Number(s===2),n1=(p1&(1-X))|(p2&X),n0=(p0&X)|(p2&(1-X));assert.equal(n1*2+n0,s===3?0:(2*s+X)%3);}
 for(let n=1;n<=10;n++)for(const input of words(n)){let r=0;for(let i=0;i<input.length;i++){r=(2*r+Number(input[i]))%3;assert.equal(r,parseInt(input.slice(0,i+1),2)%3);}}
 assert.ok(q('C',13).stem.includes('空前缀也视为余数0'));
});
test('通用寄存器全控制数据组合、握手现态职责与格雷扫描使能核验',()=>{
 for(let s=0;s<4;s++)for(let S=0;S<4;S++)for(let XR=0;XR<2;XR++)for(let XL=0;XL<2;XL++)for(let P=0;P<4;P++){
  const e=[0,1,2,3].map(i=>Number(i===S)),a=bit(s,1),b=bit(s,0),n1=(e[0]&a)|(e[1]&XR)|(e[2]&b)|(e[3]&bit(P,1)),n0=(e[0]&b)|(e[1]&a)|(e[2]&XL)|(e[3]&bit(P,0));assert.equal(n1*2+n0,[s,XR*2+a,b*2+XL,P][S]);
 }
 for(let old=0;old<2;old++)for(let REQ=0;REQ<2;REQ++)for(let ACK=0;ACK<2;ACK++)assert.equal((old&(1-ACK))|((1-old)&REQ),old?1-ACK:REQ);
 const cycle=[0,1,3,2];for(let s=0;s<4;s++)for(let E=0;E<2;E++){const a=bit(s,1),b=bit(s,0),next=2*((E&b)|((1-E)&a))+((E&(1-a))|((1-E)&b));assert.equal(next,E?cycle[(cycle.indexOf(s)+1)%4]:s);const dec=[(1-a)&(1-b),(1-a)&b,a&b,a&(1-b)];assert.equal(dec.reduce((sum,v)=>sum+v,0),1);assert.equal(dec[cycle.indexOf(s)],1);}
});
