import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {waveSevenPractice} from '../bank-wave-07.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
const qs=waveSevenPractice.digital;
const q=(kind,n)=>qs.find(v=>v.id==='P5-digital-7-'+kind+'-'+String(n).padStart(3,'0'));
const bit=(n,i)=>n>>i&1;
const binary=(n,width)=>n.toString(2).padStart(width,'0');
const pop=n=>n.toString(2).replace(/0/g,'').length;
const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
function trace(initial,inputs,step){let state=initial;return inputs.map(x=>(state=step(state,x)));}
function* words(alphabet,n){if(!n){yield '';return;}for(const prefix of words(alphabet,n-1))for(const x of alphabet)yield prefix+x;}
function ripple(initial,width,inverted=[],delay=1,enabled=1){
 let state=initial;const pending=[{index:0,time:delay}],steps=[];
 while(pending.length){const event=pending.shift(),old=bit(state,event.index);if(!enabled)continue;state^=1<<event.index;steps.push({time:event.time,state});if(event.index<width-1){const oldClock=inverted[event.index]?1-old:old,newClock=inverted[event.index]?old:1-old;if(oldClock===1&&newClock===0)pending.push({index:event.index+1,time:event.time+delay});}assert.ok(steps.length<=width);}
 return {state,steps};
}
function outcomes(initial,excitation,width){
 const seen=new Set(),active=new Set(),ends=new Set();let cyclic=false;
 function visit(state){if(active.has(state)){cyclic=true;return;}if(seen.has(state))return;seen.add(state);active.add(state);const target=excitation(state),diff=target^state;if(!diff)ends.add(state);else for(let i=0;i<width;i++)if(diff&(1<<i))visit(state^(1<<i));active.delete(state);}
 visit(initial);return {ends,cyclic};
}
function settle(initial,excitation,width){const result=outcomes(initial,excitation,width);assert.equal(result.cyclic,false,'固定输入有内部循环，不能报告收敛');assert.equal(result.ends.size,1,'不同内部先后得到不同稳定结局');return [...result.ends][0];}
test('异步原创80题结构、去重和练习池完整，源原题不混入原创载荷',async()=>{
 assert.equal(qs.length,80);assert.equal(new Set(qs.map(v=>v.id)).size,80);assert.deepEqual(['选择题','填空题','分析题','综合应用'].map(s=>qs.filter(v=>v.section===s).length),[20,20,24,16]);
 let references=[];try{references=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).digital;}catch(e){if(e.code!=='ENOENT')throw e;}
 const current=getPracticeCourse('digital').questions,all=[...new Map([...current,...references,...qs].map(v=>[v.id,v])).values()];
 for(const item of qs){assert.equal(item.chapter,7);assert.equal(item.pool,'practice');assert.equal(item.origin,'原创');assert.ok(!item.reference);assert.ok(!/同上|上一题|沿用前题/.test(item.stem));assert.equal(all.filter(other=>norm(item.stem)===norm(other.stem)).length,1,item.id);
  if(item.type==='single'){assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);assert.ok(Number.isInteger(item.answer)&&item.answer>=0&&item.answer<4);assert.ok(item.explanation.length>25);}
  else if(item.type==='fill'){assert.equal(item.answers.length,item.formats.length);assert.equal(grade(item,item.answers.map(v=>v[0])).correct,true);}
  else {assert.ok(item.model.length>100,item.id);assert.ok(item.rubric.length>=4,item.id);}
 }
});
test('填空容量、时间预算、流表稳定格和前导0答案由独立求值核验',()=>{
 const rows=[[0,1,1,0],[0,1,2,1],[2,1,2,0]];let stable=0;rows.forEach((row,s)=>row.forEach(next=>{if(next===s)stable++;}));
 const expected={1:[2**4],2:[2**4],3:[binary(3,2)],4:[3*6+2+5,1000/(3*6+2+5)],5:[2,1],6:[pop(1^2),pop(2^3)],7:[1],8:[stable,Math.ceil(Math.log2(3))],9:[2,1],10:['非临界'],11:[pop(0^3),1],12:[2**2,2**5],13:[0,1],14:[9,'过渡态'],15:['保持'],16:[12-8],17:['传播延迟'],18:['不能'],19:['不能'],20:['不必然']};
 for(const [n,answer]of Object.entries(expected))assert.equal(grade(q('F',Number(n)),answer.map(String)).correct,true,'填空'+n);
 assert.equal(grade(q('F',3),['3']).correct,false);assert.equal(grade(q('F',4),['25.0','40.0']).correct,true);
 assert.ok(q('F',17).stem.includes('无展宽元件'));
});
test('打乱选项后仍指向人工核对的实际答案，条件和事件关系无误',()=>{
 const answers=['本次哪些时钟端实际出现有效沿','自然二进制加一','按有效沿逐级传播直到稳定','按稳定循环的六个状态计模数','一次只变一位，并等内部稳定后再变','不满足，还违反等待内部稳定的要求','F(Y,X)=Y','内部状态可能保存不同历史','会继续到C并稳定','不同变化先后是否导致不同最终稳态','不能，还要检查其余编码','实际允许发生的状态转移边','除输出不冲突，还要满足后继的闭合要求','尚未限定，可在不破坏其余规定时补全','必须考虑满足单输入变位的实际路径','清0未被使能','清零/装载动作发生的时刻不同','最高位QD在9→0时的下降','不能，模数与具体编码次序是两件事','还要核最小复位脉宽与传播覆盖等时序'];
 answers.forEach((answer,i)=>assert.equal(q('S',i+1).options[q('S',i+1).answer],answer));
});
test('负沿Q波纹的传播时刻、反相高位clock的重排循环与事件独立性',()=>{
 assert.deepEqual(ripple(7,4,[],5).steps,[{time:5,state:6},{time:10,state:4},{time:15,state:0},{time:20,state:8}]);assert.ok(q('R',1).model.includes('15至20 ns'));
 for(let state=0;state<16;state++)assert.equal(ripple(state,4).state,(state+1)%16);
 const cycle=trace(0,Array(8).fill(0),s=>ripple(s,3,[false,true]).state);assert.deepEqual(cycle,[1,6,7,4,5,2,3,0]);assert.equal(new Set(cycle).size,8);
 const independent=trace(0,[1,1,2,1,2],(s,x)=>s^(x===1?1:2));assert.deepEqual(independent,[1,0,2,3,1]);assert.equal(independent.map(s=>bit(s,1)^bit(s,0)).join(''),'10101');
});
function mergedRiseCount(intervals){const events=intervals.flatMap(([a,b])=>[[a,1],[b,-1]]).sort((x,y)=>x[0]-y[0]);let active=0,rises=0;for(const [,change]of events){const before=active;active+=change;if(before===0&&active>0)rises++;}return rises;}
test('OR重叠事件丢沿与自由反馈无稳态分别由时段/固定点核验',()=>{
 assert.equal(mergedRiseCount([[0,4],[2,6]]),1);assert.equal(mergedRiseCount([[0,4],[6,10]]),2);
 const F=s=>2*(1-bit(s,0))+bit(s,1);assert.deepEqual(trace(0,[0,0,0,0],F),[2,3,1,0]);for(let s=0;s<4;s++)assert.notEqual(F(s),s);assert.equal(outcomes(0,F,2).cyclic,true);
 assert.ok(q('R',5).model.includes('周期4τ'));
});
test('稳定总态追踪与相同当前输入的两条不同历史不混同',()=>{
 const table=[[0,1],[2,1],[2,1]],outputs=[0,0,1],stable=[];table.forEach((row,s)=>row.forEach((to,x)=>{if(to===s)stable.push([x,s,outputs[s]]);}));assert.deepEqual(stable,[[0,0,0],[1,1,0],[0,2,1]]);
 const states=trace(0,[0,1,0,1,0],(s,x)=>table[s][x]);assert.deepEqual(states,[0,1,2,1,2]);assert.equal(states.map(s=>outputs[s]).join(''),'00101');
 const hold=(Y,x)=>x===0||x===3?Y:x===1?1:0;assert.equal(trace(0,[0,1,3],hold).at(-1),1);assert.equal(trace(0,[0,2,3],hold).at(-1),0);
 const agree=(Y,x)=>x===0?0:x===3?1:Y,total=[];for(let x=0;x<4;x++)for(let Y=0;Y<2;Y++)if(agree(Y,x)===Y)total.push([x,Y]);assert.equal(total.length,6);assert.equal(trace(0,[0,1,3,2,0],agree).join(''),'00110');
});
test('兼容不传递、星形编码下界与非临界仍有中间输出变化',()=>{
 const allowed=[new Set([0]),new Set([0,1]),new Set([1])],intersects=(a,b)=>[...a].some(v=>b.has(v));assert.equal(intersects(allowed[0],allowed[1]),true);assert.equal(intersects(allowed[1],allowed[2]),true);assert.equal(intersects(allowed[0],allowed[2]),false);
 for(let center=0;center<4;center++)assert.equal([0,1,2,3].filter(v=>pop(center^v)===1).length,2);for(const leaf of [1,2,4])assert.equal(pop(leaf),1);
 const fixed=outcomes(0,()=>3,2);assert.equal(fixed.cyclic,false);assert.deepEqual(fixed.ends,new Set([3]));assert.equal(bit(0,1)^bit(0,0),0);assert.equal(bit(3,1)^bit(3,0),0);for(const s of [1,2])assert.equal(bit(s,1)^bit(s,0),1);
});
function gateNetwork(spec,initial,external){
 const values={...initial},pending=[...external],log=[];let count=0;
 while(pending.length){pending.sort((a,b)=>a.time-b.time);const event=pending.shift();assert.ok(++count<100,'本用例网络未稳定');if(values[event.node]===event.value)continue;values[event.node]=event.value;log.push({...event});for(const [name,gate]of Object.entries(spec))if(gate.inputs.includes(event.node))pending.push({node:name,time:event.time+gate.delay,value:gate.run(values)});}
 return {values,log};
}
test('组合冒险实际进入反馈会丢状态，吸收/共识修复与布尔等价分开核验',()=>{
 const original={n:{inputs:['X'],delay:5,run:v=>1-v.X},t:{inputs:['n','Y'],delay:1,run:v=>v.n&v.Y},F:{inputs:['X','t'],delay:1,run:v=>v.X|v.t},Y:{inputs:['F'],delay:2,run:v=>v.F}};
 const observed=gateNetwork(original,{X:1,Y:1,n:0,t:0,F:1},[{node:'X',time:0,value:0}]);assert.ok(observed.log.some(e=>e.node==='F'&&e.value===0&&e.time===1));assert.ok(observed.log.some(e=>e.node==='Y'&&e.value===0&&e.time===3));assert.equal(observed.values.Y,0);
 const simplified={F:{inputs:['X','Y'],delay:1,run:v=>v.X|v.Y},Y:{inputs:['F'],delay:2,run:v=>v.F}},fixed=gateNetwork(simplified,{X:1,Y:1,F:1},[{node:'X',time:0,value:0}]);assert.equal(fixed.values.Y,1);
 for(let E=0;E<2;E++)for(let D=0;D<2;D++)for(let Q=0;Q<2;Q++)assert.equal((E&D)|((1-E)&Q)|(D&Q),E?D:Q);for(let E=0;E<2;E++)assert.equal((E&1)|((1-E)&1)|(1&1),1);
 assert.ok(q('C',3).model.includes('DQ'));assert.ok(q('R',16).model.includes('3 ns'));
});
test('错误进位源、单独清低位和C使能禁止更新对独立整数/有效沿核验',()=>{
 let L=0,H=0;const seen=new Set(['0,0']);for(let n=1;n<=20;n++){const old=L;L=(L+1)%10;if(old%2===1&&L%2===0)H=(H+1)%10;assert.equal(L,n%10);assert.equal(H,Math.floor(n/2)%10);if(n<20)seen.add(H+','+L);}assert.equal(seen.size,20);assert.equal(H*10+L,0);
 const lowBefore=5;assert.equal(bit(lowBefore,2),1);assert.equal(bit(0,2),0);assert.equal(ripple(2,3).state,3);assert.equal(ripple(2,3,[],1,0).state,2);
 for(let H0=0;H0<8;H0++)assert.equal(ripple(H0,3,[],1,0).state,H0);
 const joint=trace([0,0],Array(6).fill(0),([h,l])=>[(h+1)%2,(l+1)%3]);assert.deepEqual(joint,[[1,1],[0,2],[1,0],[0,1],[1,2],[0,0]]);assert.deepEqual([[0,0],...joint.slice(0,-1)].map(([h,l])=>3*h+l),[0,4,2,3,1,5]);
});
test('异步置9/释放不计数、复位与非极性错误和外部有效沿数',()=>{
 let state=0;const observed=[];for(const operation of ['clear','count','count','count','set9','release','count']){state=operation==='clear'?0:operation==='set9'?9:operation==='count'?(state+1)%10:state;observed.push(state);}assert.deepEqual(observed,[0,1,2,3,9,9,0]);
 assert.equal(Number(!((0>>3&1)&&(0>>1&1))),1);const correct=trace(0,Array(10).fill(0),s=>{const n=(s+1)%16;return (n&10)===10?0:n;});assert.deepEqual(correct,[1,2,3,4,5,6,7,8,9,0]);
 let old=1,value=0,falls=0;for(const level of [0,1,0,1,0]){if(old===1&&level===0){falls++;value=ripple(value,3).state;}old=level;}assert.equal(falls,3);assert.equal(value,3);
 const pairs=[];for(let Q=0;Q<2;Q++)for(let N=0;N<2;N++)if(N===1-Q)pairs.push([Q,N]);assert.equal(pairs.length,2);
 assert.equal(pop(0^2),1);assert.equal(pop(2^3),1);for(let X=0;X<2;X++)for(let Y=0;Y<2;Y++)assert.equal((X|Y)&((1-X)|Y),Y);assert.deepEqual([0,1,0].map(X=>X^1),[1,0,1]);
});
test('静态方向波纹连接对全部状态核加减，独立片内分频不误接',()=>{
 for(let U=0;U<2;U++)for(let state=0;state<16;state++)assert.equal(ripple(state,4,[!U,!U,!U]).state,(state+(U?1:15))%16);
 assert.ok(q('C',1).model.includes('CP2=UQ1+U′Q1′'));
 let qa=0,branch=0;const seenA=[],seenB=[];for(let n=1;n<=16;n++){qa^=1;branch=(branch+1)%8;seenA.push(qa);seenB.push(bit(branch,2));}assert.equal(seenA.join(''),'1010101010101010');assert.equal(seenB.slice(0,8).join(''),'00011110');
 assert.ok(q('C',2).model.includes('B直接送CPB'));
});
function gatedProtocol(state,event){const X1=Number(event==='1'),X2=1-X1,a=bit(state,1),b=bit(state,0),c0=(X1&(1-b))|(X2&((1-a)|(1-b))),c1=(1-a)&((X1&b)|(X2&(1-b)));return state^(c0|(c1<<1));}
test('脉冲交替错误保持与饱和占用门控对需求事件表/全部短串核验',()=>{
 const protocol=[[1,3],[3,0],[3,3],[3,3]];for(let s=0;s<4;s++)for(let e=0;e<2;e++)assert.equal(gatedProtocol(s,String(e+1)),protocol[s][e]);
 for(let n=0;n<=9;n++)for(const input of words('12',n)){let state=0,expectedNext='1',error=false;for(const event of input){if(!error){if(event!==expectedNext)error=true;else expectedNext=event==='1'?'2':'1';}state=gatedProtocol(state,event);assert.equal(state===3,error);}}
 const saturate=(s,U)=>{const D=1-U,a=bit(s,1),b=bit(s,0),c0=(1-a)&((U&(1-b))|(D&b)),c1=(U&(a^b))|(D&a);return s^(c0|(c1<<1));},codes=[0,1,3];
 for(let count=0;count<=2;count++)for(let U=0;U<2;U++)assert.equal(saturate(codes[count],U),codes[Math.max(0,Math.min(2,count+(U?1:-1)))]);for(let U=0;U<2;U++)assert.equal(saturate(2,U),0);
 assert.ok(q('C',4).model.includes('CP1=Q1′(X1Q0+X2Q0′)'));assert.ok(q('C',7).model.includes('CP1=U(Q1⊕Q0)+DQ1'));
});
test('独立完成标志、允许重叠的事件奇偶与单槽错误旗标按事件规范核验',()=>{
 for(let n=0;n<=8;n++)for(const input of words('123',n)){let seen=0,history=new Set();for(const e of input){if(e==='3'){seen=0;history.clear();}else {seen|=e==='1'?1:2;history.add(e);}assert.equal(Number(seen===3),Number(history.has('1')&&history.has('2')));}}
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let eventA=0;eventA<2;eventA++)for(let eventB=0;eventB<2;eventB++)assert.equal((a^eventA)^(b^eventB),(a^b)^((eventA+eventB)%2));
 const source=trace([0,0,0],['W','W','R','R','W','C'],([Q,OF,UF],e)=>e==='C'?[0,0,0]:e==='W'?[1,OF|Q,UF]:[0,OF,UF|(1-Q)]);assert.deepEqual(source,[[1,0,0],[1,1,0],[0,1,0],[0,1,1],[1,1,1],[0,0,0]]);
 assert.ok(q('C',14).model.includes('OF+Q'));assert.ok(q('C',14).model.includes('UF+Q′'));
});
test('不完全四态闭合合并两组及一变量反馈保留所有已规定行为',()=>{
 const table=[[[0,0],[1,0],[null,null],[0,0]],[[0,0],[1,0],[2,1],[null,null]],[[null,null],[3,0],[2,1],[2,1]],[[0,0],[3,0],[2,1],[null,null]]],group=[0,0,1,0],inputs=[0,1,3,2];
 for(let s=0;s<4;s++)for(let c=0;c<4;c++){const X=inputs[c],expected=(X>>1)&((X&1)|group[s]),[next,y]=table[s][c];if(next!==null)assert.equal(group[next],expected);if(y!==null)assert.equal(y,expected);}
 assert.notEqual(table[0][3][1],table[2][3][1]);assert.ok(q('C',6).model.includes('F=X1(X2+Q)'));
 for(let Q=0;Q<2;Q++)for(let E=0;E<2;E++)for(let A=0;A<2;A++)for(let B=0;B<2;B++){const F=(E&A&B)|(Q&((1-E)|A|B));assert.equal(F,E?(A===B?A:Q):Q);const sbar=Number(!(E&&A&&B)),rbar=Number(!(E&&!A&&!B));assert.ok(sbar||rbar);}
});
test('三位星形流表合法边单位距离、稳定行为与未用码实际收敛核验',()=>{
 const table={1:[1,0,0,0],0:[2,0,4,0],2:[2,0,0,0],4:[0,0,4,0]},inputs=[0,1,3,2],F=(s,X)=>{const e0=Number(X===0),e3=Number(X===3),a=bit(s,2),b=bit(s,1),c=bit(s,0);return 4*(e3&(1-c)&(1-b))+2*(e0&(1-c)&(1-a))+(e0&c);};
 for(const [from,row]of Object.entries(table))for(let col=0;col<4;col++){assert.equal(F(Number(from),inputs[col]),row[col]);assert.ok(pop(Number(from)^row[col])<=1);}
 for(let s=0;s<8;s++)for(const X of inputs){const ends=outcomes(s,v=>F(v,X),3);assert.equal(ends.cyclic,false);assert.equal(ends.ends.size,1);assert.ok([0,1,2,4].includes([...ends.ends][0]));}
 assert.ok(q('C',9).model.includes('F1=e00Q0′Q2′'));
});
test('复位期间高按钮的首次释放不计数，内部通行打开不制造下降沿',()=>{
 const F=(s,R,X)=>2*((1-R)&((1-X)|bit(s,1)))+((1-R)&((bit(s,1)&X)|bit(s,0))),clock=(s,X)=>X|(1-bit(s,0));
 const run=(inputs)=>{let state=0,R=1,X=0,falls=0;const log=[];for(const [nextR,nextX]of inputs){assert.ok(pop((R*2+X)^(nextR*2+nextX))<=1);let previous=clock(state,X);R=nextR;X=nextX;const immediate=clock(state,X);if(previous===1&&immediate===0)falls++;const next=settle(state,s=>F(s,R,X),2),after=clock(next,X);assert.ok(!(immediate===1&&after===0),'仅内部通行改变不能制造有效下降沿');state=next;log.push([state,after,falls]);}return {falls,log};};
 const high=run([[1,1],[0,1],[0,0],[0,1],[0,0]]);assert.equal(high.falls,1);assert.equal(high.log[2][2],0);
 const low=run([[0,0],[0,1],[0,0]]);assert.equal(low.falls,1);
 for(let s=0;s<4;s++)for(let X=0;X<2;X++)assert.equal(settle(s,v=>F(v,1,X),2),0);
});
test('双路待处理请求复位/请求优先和稳定授权互斥逐组合核验',()=>{
 for(let P=0;P<4;P++)for(let controls=0;controls<32;controls++){
  const RESET=bit(controls,4),r0=bit(controls,3),r1=bit(controls,2),a0=bit(controls,1),a1=bit(controls,0),old0=bit(P,0),old1=bit(P,1),n0=(1-RESET)&(r0|(old0&(1-a0))),n1=(1-RESET)&(r1|(old1&(1-a1)));
  assert.equal(n0,RESET?0:r0?1:a0?0:old0);assert.equal(n1,RESET?0:r1?1:a1?0:old1);
  const g0=old0,g1=(1-old0)&old1;assert.equal(g0&g1,0);assert.equal(g0|g1,old0|old1);
 }
 assert.ok(q('C',11).model.includes('REQ_i+P_i A_i′'));
});
test('四相协议全部短单输入位路径按正向/反向规范判断错误并保持',()=>{
 const next=[[0,4,4,1],[4,4,2,1],[4,3,2,4],[0,3,4,4],[4,4,4,4]],column=new Map([[0,0],[1,1],[3,2],[2,3]]),phases=[0,2,3,1];
 function visit(state,input,error,depth){if(!depth)return;for(const changed of [input,input^1,input^2]){const expectedError=error||(changed!==input&&changed!==phases[(phases.indexOf(input)+1)%4]),n=next[state][column.get(changed)];assert.equal(n===4,expectedError);visit(n,changed,expectedError,depth-1);}}
 visit(0,0,false,8);for(let state=0;state<5;state++)assert.equal(0,0);
 assert.ok(q('C',13).model.includes('RESET在外输入00时强回P0'));
});
test('321到8421有效六态真值全核，不用无关输入冒充合法数据',()=>{
 const codes=[0,1,2,4,5,6];for(let count=0;count<6;count++){const raw=codes[count],a=bit(raw,2),b=bit(raw,1),c=bit(raw,0),y2=a&(b|c),y1=((1-a)&b)|(a&(1-b)&(1-c)),y0=a^c;assert.equal(4*y2+2*y1+y0,count);assert.equal(3*a+2*b+c,count);}
 assert.ok(q('C',15).model.includes('y1=a′b+ab′c′'));
});
