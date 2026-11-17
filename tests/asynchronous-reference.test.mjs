import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const localRoot=new URL('../../制作记录/并行扩题/异步与时序设计核验/',import.meta.url);
async function material(t){try{return {questions:JSON.parse(await readFile(new URL('教材候选8题.json',localRoot),'utf8')),data:JSON.parse(await readFile(new URL('教材事件与流表转录.json',localRoot),'utf8'))};}catch(error){if(error.code!=='ENOENT')throw error;t.skip('第三方题面/表格/电路转录仅在本机材料目录，不随源码分发');return null;}}
const bit=(value,index)=>value>>index&1;
function* words(alphabet,length){if(length===0){yield '';return;}for(const prefix of words(alphabet,length-1))for(const symbol of alphabet)yield prefix+symbol;}
const question=(questions,n)=>questions.find(q=>q.id===`FENG-CH7-${n}`);

test('第7章候选8题来源、完整事件条件和独立可读性检查',async t=>{
 const local=await material(t);if(!local)return;const {questions}=local;
 assert.equal(questions.length,8);assert.equal(new Set(questions.map(q=>q.id)).size,8);
 for(const q of questions){assert.equal(q.chapter,7);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.equal(q.reference.pdfPage,q.reference.printedPage+8);assert.ok(q.model.length>150);assert.ok(q.rubric.length>=4);assert.ok(!/同上|前题|上一题/.test(q.stem));}
 assert.ok(question(questions,2).stem.includes('CP1接Q0，CP2接Q1'));
 assert.ok(question(questions,17).stem.includes('初始尚无匹配历史'));
 assert.ok(question(questions,31).stem.includes('初始输入11且内部B稳定'));
});
test('正沿Q级联逐事件传播，八个稳定后继与模8减法交叉核验',async t=>{
 const local=await material(t);if(!local)return;const {questions,data}=local;
 assert.equal(data.ripple7_2.edge,'rising');assert.deepEqual(data.ripple7_2.clockSources,['CP','Q0','Q1']);assert.equal(data.ripple7_2.invertD,true);
 function externalEvent(initial){let state=initial;const queue=[0],steps=[];while(queue.length){const i=queue.shift(),old=bit(state,i);state^=1<<i;steps.push(state);if(old===0&&i<2)queue.push(i+1);assert.ok(steps.length<=3);}return {state,steps};}
 for(let initial=0;initial<8;initial++){const {state}=externalEvent(initial);assert.equal(state,(initial+7)%8);let value=initial;for(let i=0;i<8;i++)value=externalEvent(value).state;assert.equal(value,initial);}
 assert.deepEqual(externalEvent(0).steps,[1,3,7]);assert.ok(question(questions,2).model.includes('111、000、001、010、011、100、101、110'));
});
test('三类非重叠脉冲的负沿JK门控与原状态/输出表逐格对照',async t=>{
 const local=await material(t);if(!local)return;const {questions,data}=local,names=['A','B','C','D'];
 for(let state=0;state<4;state++)for(let event=0;event<3;event++){
  const X=[0,1,2].map(i=>Number(i===event)),a=bit(state,1),b=bit(state,0);
  const clocks=[X[1],(X[1]&b)|X[2]],output=(X[1]&a&(1-b))|(X[2]&(a|(1-b)));
  const next=state^(clocks[0]|(clocks[1]<<1));
  assert.deepEqual([names[next],output],data.pulse7_9[names[state]][event]);
  assert.equal(next,event===0?state:event===1?(state+1)%4:(state+2)%4);
 }
 assert.ok(question(questions,9).model.includes('CP1=X2Q0+X3'));
});
test('脉冲序列检测按门控时钟求值，对全部短事件串与滑窗匹配核验',async t=>{
 const local=await material(t);if(!local)return;const {questions}=local;
 const step=(state,event)=>{const X1=Number(event==='1'),X2=1-X1,a=bit(state,1),b=bit(state,0),c0=(X1&(1-b))|(X2&b),c1=(X1&a)|(X2&(a|b));return [state^(c0|(c1<<1)),X1&a&(1-b)];};
 for(let length=0;length<=11;length++)for(const input of words('12',length)){let state=0;for(let i=0;i<input.length;i++){const [next,output]=step(state,input[i]);assert.equal(output,Number(input.slice(Math.max(0,i-2),i+1)==='121'));state=next;}}
 assert.equal(step(3,'1')[0],1);assert.equal(step(3,'2')[0],0);
 assert.ok(question(questions,17).model.includes('CP0=X1Q0′+X2Q0'));assert.ok(question(questions,17).model.includes('CP1=X1Q1+X2(Q1+Q0)'));
});
test('序列完成后保持的输出对输入历史oracle核验，不误当窄脉冲',async t=>{
 const local=await material(t);if(!local)return;const {questions}=local;
 const next=[[1,0,0],[1,2,0],[1,0,3],[3,0,3]];
 assert.equal(next[0][2]===3,false);assert.equal(next[2][2]===3,true);
 assert.ok(question(questions,16).stem.includes('匹配进度清空，从未匹配状态A开始'));assert.equal(question(questions,16).revision,2);
 for(let length=0;length<=7;length++)for(const input of words('123',length)){let state=0,latched=false,history='';for(const event of input){if(latched){if(event==='2'){latched=false;history='';}}else {history+=event;if(history.endsWith('123'))latched=true;}state=next[state][Number(event)-1];assert.equal(state===3,latched);}}
 assert.ok(question(questions,16).model.includes('D1D0在每类事件下就取表中的二位次态'));
 assert.ok(question(questions,16).stem.includes('不要求门级接线'));
});
test('电子锁五态对全部短按键串与密码/复位规范交叉核验',async t=>{
 const local=await material(t);if(!local)return;const {questions}=local,next=[[1,0,0],[1,2,0],[1,3,0],[4,0,0],[4,4,0]];
 assert.equal(next[0][0]===4,false);assert.equal(next[3][0]===4,true);
 assert.ok(question(questions,18).stem.includes('匹配进度已清空，复位到未匹配状态A'));assert.equal(question(questions,18).revision,2);
 for(let length=0;length<=8;length++)for(const input of words('123',length)){let state=0,unlocked=false,history='';for(const event of input){if(event==='3'){unlocked=false;history='';}else if(!unlocked){history+=event;if(history.endsWith('1221'))unlocked=true;}state=next[state][Number(event)-1];assert.equal(state===4,unlocked);assert.equal(bit(state,2)&(1-bit(state,1))&(1-bit(state,0)),Number(unlocked));}}
 assert.equal(Math.ceil(Math.log2(5)),3);for(let invalid=5;invalid<8;invalid++)assert.equal(bit(invalid,2)&(1-bit(invalid,1))&(1-bit(invalid,0)),0);
 assert.ok(question(questions,18).model.includes('其他三码可规定遇任意按键事件回000'));
});
test('流表固定输入逐非稳态追踪，稳定总态按输入/内部状态共同计数',async t=>{
 const local=await material(t);if(!local)return;const {questions,data}=local,{columns,table}=data.flow7_31;
 function settle(initial,input){const column=columns.indexOf(input),states=[initial],outputs=[];let current=initial;for(let count=0;count<8;count++){const [next,y]=table[current][column];outputs.push(y);if(next===current)return {states,outputs,final:current,output:y};current=next;states.push(current);}throw Error('固定输入下未收敛，不能硬报稳定态');}
 const stable=[];for(const [state,row]of Object.entries(table))row.forEach(([next,y],i)=>{if(state===next)stable.push([columns[i],state,y]);});
 assert.deepEqual(stable,[['10','A',0],['11','B',1],['00','C',0],['01','C',1],['00','D',0]]);
 for(const state of Object.keys(table))for(const input of columns)assert.ok(settle(state,input).states.length<=3);
 let state='B';const output=[1],inputs=['11','10','00','01'],paths=[];for(let i=1;i<inputs.length;i++){const change=parseInt(inputs[i],2)^parseInt(inputs[i-1],2);assert.ok(change!==0&&(change&(change-1))===0);const result=settle(state,inputs[i]);state=result.final;output.push(result.output);paths.push(result.states);}
 assert.deepEqual(paths,[['B','D','A'],['A','D'],['D','C']]);assert.deepEqual(output,[1,0,0,1]);assert.ok(question(questions,31).model.includes('1、0、0、1'));
});
test('源页保真和数学求解分别留证，不将脉冲末态表套为同步一次更新',async t=>{
 const local=await material(t);if(!local)return;const {questions,data}=local;
 assert.deepEqual(data.sourceAudit.pages,[404,405,406,410]);assert.ok(data.sourceAudit.status.includes('待主线独立源页复核'));
 assert.deepEqual(data.pulse7_9.C[1],['D',1]);assert.deepEqual(data.pulse7_9.B[2],['D',0]);
 assert.deepEqual(data.flow7_31.table.C[3],['D',1]);assert.deepEqual(data.flow7_31.table.D[2],['C',0]);
 assert.ok(question(questions,19).model.includes('不能仍套单事件次态表给唯一结果'));
});
