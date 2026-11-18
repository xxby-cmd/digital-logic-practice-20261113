import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createContext,Script} from 'node:vm';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=q=>JSON.stringify({id:q.id,chapter:q.chapter,revision:q.revision??1,type:q.type,stem:q.stem,answers:q.answers,formats:q.formats});
const observations=[];
let delivery;
async function actualDelivery(){
 if(delivery)return delivery;
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script,'需要可执行的实际独立HTML，不能用源模块计数代替交付');
 const nodes=new Map(),node=key=>{if(!nodes.has(key))nodes.set(key,{innerHTML:'',dataset:{},addEventListener(){}});return nodes.get(key);};
 const context=createContext({document:{title:'',querySelector:node,querySelectorAll:()=>[]},window:{addEventListener(){}},location:{hash:'#/subjects'},localStorage:{getItem:()=>null,setItem(){}},setTimeout,clearTimeout});
 new Script(script.replace(/\}\)\(\);\s*$/,'globalThis.answerAudit=bundledModules;})();')).runInContext(context);
 delivery={sha256:hash(html),get:context.answerAudit['practice-library.js'].getPracticeCourse};return delivery;
}
async function question(subject,id){
 const q=getPracticeCourse(subject).questions.find(q=>q.id===id);assert.ok(q,id+'必须仍在实际练习池');
 assert.equal(q.type,'fill');
 const structuredRun=id==='P4-structures-11-F-011';
 const exactAddress=id==='P3-network-4-42';
 assert.equal(q.revision??1,structuredRun||exactAddress?2:1,'当前所审题版必须精确匹配；新题意需重新核定oracle');
 if(structuredRun)assert.deepEqual(q.formats,['integer-sequence'],'首段题干/推导未变，本次仅显式结构评分升版');
 if(exactAddress)assert.deepEqual(q.formats,['literal-string']);
 const current=await actualDelivery(),published=current.get(subject).questions.find(q=>q.id===id);assert.ok(published,id+'必须实际接入HTML');
 assert.equal(canonical(published),canonical(q),id+'源与交付题面/答案/版本必须一致');return q;
}
function parsed(q,pattern){const match=q.stem.match(pattern);assert.ok(match,q.id+'题干语义或格式变化，禁止沿用未解析的常量oracle');return match;}
function verify(q,answers,input,steps){
 const result=grade(q,answers);assert.equal(result.correct,true,q.id+'公开答案必须接受独立求得的结果');
 observations.push({id:q.id,revision:q.revision??1,questionSha256:hash(canonical(q)),input,steps,computedAnswers:answers,sourceEqualsPublished:true,acceptedByGrade:result.correct});
}

test('真实题P3-network-3-48：逐字节许可账本交叉核TCP可再发送额度',async()=>{
 const q=await question('network','P3-network-3-48');
 const m=parsed(q,/^rwnd=(\d+)B、cwnd=(\d+)B、未确认数据(\d+)B，其他条件不限制时还可发____B。$/);
 const [rwnd,cwnd,inFlight]=m.slice(1).map(Number);assert.ok([rwnd,cwnd,inFlight].every(Number.isSafeInteger));assert.ok(inFlight<=rwnd&&inFlight<=cwnd);
 // Mark simultaneous receiver/congestion permissions, then remove bytes that
 // already occupy the sending window. The public answer is never an input.
 const granted=[];for(let byte=0;byte<Math.max(rwnd,cwnd);byte++)if(byte<rwnd&&byte<cwnd&&byte>=inFlight)granted.push(byte);
 const allowance=granted.length;assert.equal(allowance,Math.min(rwnd,cwnd)-inFlight);
 verify(q,[String(allowance)],{rwnd,cwnd,inFlight},{firstFreeByte:granted[0],lastFreeByte:granted.at(-1),count:allowance});
});

test('真实题P3-network-4-42：BigInt按位掩码与整数网段分组交叉核网络地址',async()=>{
 const q=await question('network','P3-network-4-42'),m=parsed(q,/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})的网络地址为____。 按点分十进制连续填写，不插入空格或其他分隔符。$/);
 const octets=m[1].split('.').map(Number),prefix=Number(m[2]);assert.ok(octets.every(v=>v>=0&&v<=255));assert.ok(prefix>=0&&prefix<=32);
 const bits=octets.reduce((value,byte)=>(value<<8n)|BigInt(byte),0n),hostBits=32-prefix,size=1n<<BigInt(hostBits),mask=((1n<<32n)-1n)^(size-1n),network=bits&mask;
 assert.equal(network,(bits/size)*size);
 const address=[24n,16n,8n,0n].map(shift=>String((network>>shift)&255n)).join('.');
 verify(q,[address],{address:m[1],prefix},{inputDecimal:String(bits),maskHex:mask.toString(16),networkDecimal:String(network),networkAddress:address});
});

test('真实题P4-structures-11-F-009：枚举满k叉树叶数核最少补零段',async()=>{
 const q=await question('structures','P4-structures-11-F-009'),m=parsed(q,/^(\d+)路最优归并原有(\d+)段，为补成满(\d+)叉归并树，最少加____个零段。$/);
 const k=Number(m[1]),runs=Number(m[2]);assert.equal(k,Number(m[3]));assert.ok(k>=2&&runs>=2);
 // Expanding one leaf to k children increases leaves by k-1. Enumerate that
 // tree invariant rather than copying the common padding formula.
 const reachable=[1];while(reachable.at(-1)<runs)reachable.push(reachable.at(-1)+k-1);
 const leaves=reachable.at(-1),padding=leaves-runs,valid=[];for(let extra=0;extra<k-1;extra++)if((runs+extra-1)%(k-1)===0)valid.push(extra);
 assert.deepEqual(valid,[padding]);verify(q,[String(padding)],{k,runs},{reachableLeafCounts:reachable,minimumFullTreeLeaves:leaves,zeroRuns:padding});
});

test('真实题P4-structures-11-F-011：active/frozen状态模拟核置换选择首段',async()=>{
 const q=await question('structures','P4-structures-11-F-011'),m=parsed(q,/^容量(\d+)置换选择输入(-?\d+(?:,-?\d+)*)，第一段为____（逗号分隔）。$/);
 const capacity=Number(m[1]),input=m[2].split(',').map(Number);assert.ok(capacity>0&&capacity<=input.length);assert.ok(input.every(Number.isSafeInteger));
 const active=input.slice(0,capacity),frozen=[],firstRun=[],trace=[];let cursor=active.length;
 while(active.length){active.sort((a,b)=>a-b);const emitted=active.shift();firstRun.push(emitted);let incoming=null,destination=null;if(cursor<input.length){incoming=input[cursor++];destination=incoming>=emitted?'active':'frozen';(destination==='active'?active:frozen).push(incoming);}trace.push({emitted,incoming,destination,active:[...active],frozen:[...frozen]});}
 assert.ok(firstRun.every((value,i)=>i===0||firstRun[i-1]<=value));
 verify(q,[firstRun.join(',')],{capacity,input},{trace,firstRun,remainingFrozen:frozen});
});

test('真实题P4-structures-12-F-007：显式零起始布局核文件偏移',async()=>{
 const q=await question('structures','P4-structures-12-F-007'),m=parsed(q,/^记录0起始编号，文件头(\d+)字节、每记录(\d+)字节连续不分块，第(\d+)条起始偏移____。$/);
 const [header,recordSize,index]=m.slice(1).map(BigInt);assert.ok(recordSize>0n);
 const offset=header+index*recordSize;
 verify(q,[String(offset)],{header:String(header),recordSize:String(recordSize),zeroBasedIndex:String(index)},{headerEnd:String(header),precedingRecordBytes:String(index*recordSize),recordOffset:String(offset)});
});

test.after(async()=>{
 if(process.env.COURSE_ANSWER_ORACLE_REPORT)await writeFile(process.env.COURSE_ANSWER_ORACLE_REPORT,JSON.stringify({at:new Date().toISOString(),htmlSha256:delivery?.sha256,expectedCases:5,observedCases:observations.length,observations,scope:'实际qid/严格题干解析→独立计算→公开grade核答；只读既有实际HTML，无SDK/构建。'},null,2)+'\n');
});
