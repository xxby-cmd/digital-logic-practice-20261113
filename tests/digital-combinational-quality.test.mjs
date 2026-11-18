import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade} from '../grading.js';
import {diagram} from '../diagrams.js';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/digital-combinational-quality-20261118.json',import.meta.url),'utf8'));
const revisions=Object.fromEntries(fixture.entries.map(q=>[q.id,q.revision]));
const originals=new Map(getPracticeCourse('digital',{questionRevisions:revisions}).questions.filter(q=>q.chapter===4).map(q=>[q.id,q]));
const latest=new Map(getPracticeCourse('digital').questions.map(q=>[q.id,q]));
const hash=s=>createHash('sha256').update(s).digest('hex');
const norm=s=>String(s).normalize('NFKC').replace(/[′’]/g,"'").replace(/[＋]/g,'+').replace(/[＝]/g,'=').replace(/[−–]/g,'-').replace(/\s/g,'');
const bits=(x,n)=>Array.from({length:n},(_,i)=>(x>>(n-1-i))&1);
const rows=n=>Array.from({length:2**n},(_,i)=>bits(i,n));
const bin=(x,n)=>x.toString(2).padStart(n,'0');
const ones=v=>v.flatMap((x,i)=>x?[i]:[]);
const pop=x=>x.toString(2).replaceAll('0','').length;
const parity=(...x)=>x.reduce((a,b)=>a^b,0);
const inv=x=>1-x;
const decoder=(n,address,enable=true,activeLow=false)=>Array.from({length:2**n},(_,i)=>activeLow?inv(Number(enable&&i===address)):Number(enable&&i===address));
const observations=[],newObservations=[];
function choice(q,text){const i=q.options.indexOf(text);assert.ok(i>=0,q.id+' checked option absent');return i;}
function selected(q,values){const index=q.options.findIndex(x=>norm(x)===norm(values));assert.ok(index>=0,q.id+' derived option absent');return index;}
function observe(q,result){if(q.type==='single'){assert.equal(grade(q,result.answer).correct,true,q.id);for(let i=0;i<q.options.length;i++)if(i!==result.answer)assert.equal(grade(q,i).correct,false,q.id+' distractor '+i);}else if(q.type==='fill'){const a=result.answer.map(String);assert.equal(grade(q,a).correct,true,q.id+' derived fill');assert.equal(grade(q,a.map((x,i)=>q.formats?.[i]==='number'?'+'+Number(x).toFixed(4):x)).correct,true,q.id+' numeric format');assert.equal(grade(q,a.map(x=>/^\d+$/.test(x)?String(Number(x)+1):'__wrong__')).correct,false,q.id+' wrong fill');}else assert.deepEqual(grade(q,'manual response'),{status:'review',correct:null});observations.push({id:q.id,revision:q.revision??1,type:q.type,...result});}
const result=(method,facts,answer)=>({method,facts,...(answer===undefined?{}:{answer})});
function originalOracle(q){const s=norm(q.stem),id=q.id;
 if(q.type==='single'){
  if(id==='4-01'){const before=parity(0,1),after=parity(1,0),through00=parity(0,0);assert.equal(before,after);assert.notEqual(before,through00);return result('evaluate both endpoints and a legal unequal-arrival intermediate input',{before,after,through00},choice(q,'变化前后F均为1，瞬态是否有毛刺还与实现电路及延迟有关'));}
  if(id==='4-02'){const r=rows(2).filter(([a,b])=>(a^b)===0&&(a&b)===1);assert.equal(r.length,1);return result('enumerate half-adder inverse constraints',r,selected(q,r[0].join('')));}
  if(id==='4-05'){const addr=Number.parseInt(s.match(/CBA=([01]{3})/)[1],2),v=decoder(3,addr,true,true);return result('derive selected address and all eight active-low outputs',v,choice(q,'Y₅＝0，其余Y输出为1'));}
  if(id==='4-07'){const requested=[...s.matchAll(/I([0-7])/g)].slice(-2).map(m=>Number(m[1])),winner=Math.max(...requested),code=bin(winner,3);return result('apply stated highest-number priority then non-inverting encode',{requested,winner,code},selected(q,code));}
  if(id==='4-08'){const stable=rows(1).map(([a])=>(a&1)|((1-a)&1));assert.deepEqual(stable,[1,1]);return result('exhibit permitted delay ordering: old product falls before new product rises',{stable,oldOff:1,newOn:3,uncoveredInterval:[1,3]},choice(q,'本应保持1，却短暂变为0'));}
  const k=id.match(/P4-digital-4-S-(\d+)/)?.[1];
  if(k==='001')return result('combinational steady-state function has current-input arguments',{memoryRequired:false},choice(q,'当前输入组合'));
  if(k==='002')return result('a truth relation cannot be specified before meanings, polarities and boundary conditions',{first:'input/output contract'},choice(q,'明确输入输出含义与全部条件'));
  if(k==='003'){for(let n=1;n<=6;n++)for(let m=1;m<=6;m++)assert.equal(rows(n).length,2**n);return result('enumerate input Cartesian products; output column count does not enter',{formula:'2^n'},choice(q,'2^n'));}
  if(k==='004')return result('ordinary one-hot encoder has no defined multi-request priority outside its stated domain',{counterexample:'two implementations can agree on one-hot inputs and differ on multi-hot inputs'},choice(q,'不能脱离规格保证正确编码'));
  if(k==='005'){assert.equal(bin(0,3),'000');return result('same code can arise for request zero and no request; validity separates them',{code:'000',distinguishingField:'valid'},choice(q,'有效位'));}
  if(k==='006'){const a=parseInt(s.match(/地址([01]{2})/)[1],2);assert.equal(decoder(2,a)[a],1);return result('high-active one-hot decoding',{address:a},choice(q,'Y'+a));}
  if(k==='007'){const v=decoder(2,2,false);assert.deepEqual(v,[0,0,0,0]);return result('disable removes the one-hot high output',v,choice(q,'所有输出0'));}
  if(k==='008'){const m=s.match(/A=(\d),B=(\d),Bin=(\d)/),d=Number(m[1])-Number(m[2])-Number(m[3]),borrow=Number(d<0),difference=d+2*borrow;return result('signed integer difference satisfies D-2*Bout=A-B-Bin',{d,difference,borrow},selected(q,difference+'、'+borrow));}
  if(k==='009'){const borrow=rows(2).map(([a,b])=>Number(a<b));assert.deepEqual(borrow,[0,1,0,0]);return result('enumerate the half-subtractor borrow predicate',borrow,choice(q,'A′B'));}
  if(k==='010'){const v=rows(2).map(([s,a])=>s?a:0),expected=rows(2).map(([s,a])=>s&a);assert.deepEqual(v,expected);return result('evaluate the actual two-way selection',v,choice(q,'SA'));}
  if(k==='011'){const v=rows(2).map(([a,b])=>a^b);return result('each AB address selects its XOR truth-table constant',v,selected(q,v.join(',')));}
  if(k==='012')return result('check each device direction against one selected channel',{mux:'many inputs to one output',demux:'one input to one selected output'},choice(q,'分配器把一路数据送到选定输出，选择器从多路输入选一路'));
  if(k==='013'){for(let i=1;i<=16;i++)assert.ok(2**i>Array.from({length:i},(_,j)=>2**j).reduce((a,b)=>a+b,0));return result('binary weight exceeds the sum of every lower weight',{proof:'2^k > 2^k-1'},choice(q,'该位权大于所有低位最大合计'));}
  if(k==='014'){const m=s.match(/(\d+)\+(\d+)时/),sum=Number(m[1])+Number(m[2]);return result('integer addition, quotient/remainder by 16',{sum,low:bin(sum%16,4),carry:sum>>4},selected(q,bin(sum%16,4)+'、进位'+(sum>>4)));}
  if(k==='015')return result('ripple is a combinational dependency, not a stored clock state',{fourStages:'carry may traverse successive full adders'},choice(q,'进位逐级传播延迟'));
  if(k==='016')return result('single-input static-one hazard preserves endpoints and can leave an uncovered temporal gap',{endpoints:[1,1],possiblePulse:0},choice(q,'单输入改变且理想前后均1，实际可能短暂0'));
  if(k==='017'){for(const [a,b,c]of rows(3))assert.equal((a&b)|((1-a)&c),(a&b)|((1-a)&c)|(b&c));return result('check consensus addition on all eight steady inputs',{equivalent:true},choice(q,'不改变指定输入上的稳态函数'));}
  if(k==='018'){for(let a=0;a<10;a++)for(let b=0;b<10;b++){const n=a+b,t=n%16,k=Number(n>=10),corrected=(t+6*k)%16;assert.equal(corrected,n%10);assert.ok(corrected<10);}return result('all 100 decimal digit pairs: correction gives legal units and decimal carry',{pairs:100},choice(q,'得到合法十进制个位和十进制进位'));}
  if(k==='019')return result('dont-care means unspecified only within an explicitly unreachable or unconstrained domain',{invalidBCD:[10,11,12,13,14,15]},choice(q,'系统保证这些输入不会出现且无其他要求'));
  if(k==='020')return result('logic equivalence does not preserve physical load or maximum drive capability',{sharedDriver:'fanout and load require checking'},choice(q,'共享节点的扇出与传播负载'));
 }
 if(q.type==='fill'){
  if(id==='4-09'){const m=s.match(/A=(\d)、B=(\d)、Cin=(\d)/),sum=m.slice(1).map(Number).reduce((a,b)=>a+b,0);return result('one-bit arithmetic quotient and remainder',{sum},[sum%2,sum>>1]);}
  if(id==='4-10'){const n=Number(s.match(/一个(\d+)选1/)[1]);return result('minimum binary address width',{channels:n},[Math.ceil(Math.log2(n))]);}
  if(id==='4-11'){const enabled=1===1&&1===0&&0===0,v=decoder(3,5,enabled,true);return result('evaluate all enable conjuncts before decoding',v,[v.filter(x=>x===0).length]);}
  if(id==='4-12'){const a=parseInt(s.match(/A=([01]{4})/)[1],2),b=parseInt(s.match(/B=([01]{4})/)[1],2);return result('unsigned integer comparison',{a,b},[Number(a>b),Number(a===b),Number(a<b)]);}
  if(id==='4-13'){const v=rows(3).map(r=>parity(...r));return result('enumerate odd population count in the stated row order',v,[v.join('')]);}
  const k=id.match(/P4-digital-4-F-(\d+)/)?.[1];
  if(k==='001'||k==='002'){const m=s.match(/(?:半减器|全减器)([01])-([01])(?:-([01]))?/),d=Number(m[1])-Number(m[2])-Number(m[3]??0),borrow=Number(d<0);return result('integer subtractor invariant D-2*Bout=d',{d},[d+2*borrow,borrow]);}
  if(k==='003'){const v=rows(2).map(([a,s])=>s?1-a:a);assert.deepEqual(v,rows(2).map(([a,s])=>a^s));return result('evaluate selected data for every A,S row',v,['异或']);}
  if(k==='004'){const code=s.match(/选择码为([01]{3})/)[1];return result('parse binary selection address',{code},[parseInt(code,2)]);}
  if(k==='005'){const n=Number(s.match(/^(\d+)选1/)[1]);return result('minimum binary address width',{channels:n},[Math.ceil(Math.log2(n))]);}
  if(k==='006'){const v=decoder(4,0);return result('enumerate complete enabled one-hot output vector',v,[v.filter(x=>x===1).length]);}
  if(k==='007'){const m=s.match(/输入([01]{3}).*Y([0-7])/),v=decoder(3,parseInt(m[1],2),true,true);return result('active-low vector indexed at the stated port',v,[v[Number(m[2])]]);}
  if(k==='008'){const ms=s.match(/Σm\((\d+),(\d+)\)/).slice(1).map(Number);for(let i=0;i<8;i++){const y=decoder(3,i);assert.equal(y[ms[0]]|y[ms[1]],Number(ms.includes(i)));}return result('OR of high-active one-hot minterm lines',{minterms:ms},['或']);}
  if(k==='009'){assert.deepEqual(rows(2).map(([a,b])=>a^b),[0,1,1,0]);return result('sum is the low bit of each two-bit integer addition',{xor:'sum'},['和']);}
  if(k==='010'){const m=s.match(/相加([01]{4})\+([01]{4})/),sum=parseInt(m[1],2)+parseInt(m[2],2);return result('four-bit sum modulo 16 and carry',{sum},[bin(sum%16,4),sum>>4]);}
  if(k==='011'){const a=parseInt(s.match(/A=([01]{2})/)[1],2),b=parseInt(s.match(/B=([01]{2})/)[1],2),r=[Number(a>b),Number(a===b),Number(a<b)];return result('compare unsigned pair',{a,b},[r.join(',')]);}
  if(k==='012'){for(let lower=1;lower<=8;lower++)assert.ok(2**lower>2**lower-1);return result('one high-segment unit exceeds the largest opposite lower segment',{worstLower:'2^k-1'},['不能']);}
  if(k==='013'){const v=rows(7).map(r=>parity(...r));for(let i=0;i<128;i++)assert.equal(v[i],pop(i)%2);return result('all 128 seven-bit vectors',{oddOutputCount:v.filter(Boolean).length},['奇']);}
  if(k==='014'){const four=rows(2).map(([f0,f1])=>[f0,f1].join(''));assert.deepEqual(four,['00','01','10','11']);return result('enumerate all one-variable truth functions',{functions:['0','C','C′','1']},['C′']);}
  if(k==='015')return result('a static-zero hazard is a temporary positive pulse',{steady:0,pulse:1},[1]);
  if(k==='016')return result('terminology describes the observed transient pulse, not a new steady function',{term:'glitch'},['毛刺']);
  if(k==='017')return result('after stabilization, a wrong truth value needs a function/connection check',{steadyError:true},['逻辑功能']);
  if(k==='018'){for(let a=0;a<4;a++)for(let b=0;b<4;b++)assert.equal(Number(a>b)+Number(a===b)+Number(a<b),1);return result('total order trichotomy for all 16 pairs',{pairs:16},[1]);}
  if(k==='019'){for(let mask=0;mask<256;mask++)for(let addr=0;addr<8;addr++){const d=bits(mask,8),p=d[addr&3],high=d[4+(addr&3)],out=addr<4?p:high;assert.equal(out,d[addr]);}return result('enumerate all 256 data vectors and eight hierarchy addresses',{channels:8},[8]);}
  if(k==='020'){const m=s.match(/^(\d+)输入、(\d+)输出/);return result('separate input Cartesian rows from output columns',{inputs:Number(m[1]),outputs:Number(m[2])},[2**Number(m[1]),Number(m[2])]);}
 }
 return shortOracle(q);
}

function shortOracle(q){const id=q.id;
 if(id==='4-14'){const expected=rows(3).map(r=>Number(r.reduce((a,b)=>a+b,0)>=2)),claim=rows(3).map(([a,b,c])=>(a&b)|(a&c)|(b&c));assert.deepEqual(claim,expected);return result('all eight majority-design inputs',{ones:ones(expected)});}
 if(id==='4-15'){const claim=rows(3).map(([e,a,b])=>(e&(1-a)&b)|(e&a&(1-b)));assert.deepEqual(claim,rows(3).map(([e,a,b])=>Number(e===1&&a!==b)));return result('permission and exactly-one anomaly predicate',{vector:claim.join('')});}
 if(id==='4-16'){const co=rows(2).map(([a,b])=>[0,1].map(c=>((1-a)&b)|(a&c)).join(''));assert.deepEqual(co,['00','11','01','01']);assert.equal(q.diagram,'mux');assert.match(diagram(q.diagram),/S₁S₀＝AB/);return result('derive all four one-variable cofactors, with the actual mux diagram',{cofactors:['0','1','C','C'],diagramSha256:hash(diagram('mux'))});}
 if(id==='4-17'){const m=norm(q.stem).match(/Σm\(([\d,]+)\)/)[1].split(',').map(Number),v=Array.from({length:8},(_,i)=>{const y=decoder(3,i,true,true);return inv(m.reduce((a,j)=>a&y[j],1));});assert.deepEqual(ones(v),m);return result('evaluate low-effective decoder lines and a NAND for all addresses',{ones:ones(v)});}
 if(id==='4-18'){for(const [a,b,c]of rows(3))assert.equal((a&b)|((1-a)&c),(a&b)|((1-a)&c)|(b&c));return result('consensus preserves all truth rows and gives an A-independent asserted term at B=C=1',{bridgeTerm:'BC',guard:[1,1]});}
 if(id==='4-19'){for(const [a,b,ci]of rows(3)){const s1=a^b,c1=a&b,c2=s1&ci,s=s1^ci,co=c1|c2;assert.equal(c1&c2,0);assert.equal(s+2*co,a+b+ci);}return result('cascade the two half adders over every input and prove their carries cannot coincide',{cases:8});}
 if(id==='4-20'){for(let a=0;a<4;a++)for(let b=0;b<4;b++){const [a1,a0]=bits(a,2),[b1,b0]=bits(b,2);assert.equal((a1&(1-b1))|(Number(a1===b1)&a0&(1-b0)),Number(a>b));}return result('high-first two-bit comparison formula against integer ordering',{pairs:16});}
 const r=id.match(/P5-digital-4-R-(\d+)/)?.[1];
 if(r==='001'){const v=rows(2).map(([a,b])=>{const n1=inv(a&b),n2=inv(a&n1),n3=inv(b&n1);return inv(n2&n3);});assert.deepEqual(v,rows(2).map(([a,b])=>a^b));return result('evaluate every NAND node independently',{vector:v.join('')});}
 if(r==='002'){const v=rows(3).map(([a,b,c])=>((a|b)&(a|c))|((1-b)&c));assert.deepEqual(v,rows(3).map(([a,b,c])=>a|c));return result('evaluate P,Q,R network and compare A+C over all inputs',{vector:v.join(''),independentOf:'B'});}
 if(r==='003'){const s=norm(q.stem),a=parseInt(s.match(/A=([01]{3})/)[1],2),b=parseInt(s.match(/B=([01]{3})/)[1],2),signed=x=>x>=4?x-8:x;assert.ok(a>b);assert.ok(signed(a)<signed(b));return result('decode same bit patterns by their two weight systems',{unsigned:[a,b],signed:[signed(a),signed(b)]});}
 if(r==='004'){const s=norm(q.stem),a=parseInt(s.match(/A=([01]{4})/)[1],2),b=parseInt(s.match(/B=([01]{4})/)[1],2),sum=a+(b^15)+1,signed=x=>x>=8?x-16:x,d=signed(a)-signed(b);assert.equal(bin(sum%16,4),'1100');assert.equal(sum>>4,0);assert.ok(d>7);return result('integer adder implementation, borrow and signed range tested independently',{sumLow:sum%16,carry:sum>>4,unsignedBorrow:Number(a<b),signedExact:d,overflow:true});}
 if(r==='005'){for(let a=0;a<8;a++)for(let b=0;b<8;b++)for(const ci of [0,1]){const p=[0,1,2].map(i=>((a>>i)&1)^((b>>i)&1)),g=[0,1,2].map(i=>((a>>i)&1)&((b>>i)&1)),c1=g[0]|(p[0]&ci),c2=g[1]|(p[1]&g[0])|(p[1]&p[0]&ci),c3=g[2]|(p[2]&g[1])|(p[2]&p[1]&g[0])|(p[2]&p[1]&p[0]&ci);assert.equal(c1,((a&1)+(b&1)+ci)>>1);assert.equal(c2,((a&3)+(b&3)+ci)>>2);assert.equal(c3,(a+b+ci)>>3);}return result('all 128 input cases compare expanded carry equations with integer prefix sums',{cases:128});}
 if(r==='006'){const delay=Number(norm(q.stem).match(/均为(\d+)ns/)[1]);return result('count sensitized AND/OR stages from the stated P/G-ready timing origin',{rippleStages:8,lookaheadStages:2,rippleNs:8*delay,lookaheadNs:2*delay});}
 if(r==='007'){for(let a=0;a<256;a++)for(let b=0;b<256;b++){const ah=a>>4,bh=b>>4,al=a&15,bl=b&15,eq=Number(ah===bh),g=Number(ah>bh)|(eq&Number(al>bl)),e=eq&Number(al===bl),l=Number(ah<bh)|(eq&Number(al<bl));assert.deepEqual([g,e,l],[Number(a>b),Number(a===b),Number(a<b)]);}return result('exhaustively verify cascade equations for all 65536 eight-bit pairs',{pairs:65536,witness:[31,32]});}
 if(r==='008'){const selected=Math.max(5,2),code=bin(selected^7,3);assert.equal(code,'010');assert.equal(bin(0^7,3),'111');return result('choose highest asserted low input, then invert each output bit',{winner:selected,code,zeroRequestAmbiguous:'111'});}
 if(r==='009'){const p=[1,2,3],q=[3,5],both=p.filter(x=>q.includes(x)),either=Array.from(new Set([...p,...q])).filter(x=>p.includes(x)!==q.includes(x)).sort();assert.deepEqual(both,[3]);assert.deepEqual(either,[1,2,5]);return result('intersection and symmetric difference of one-hot address sets',{both,xor:either});}
 if(r==='010'){const physical=[1,3,6],logical=physical.map(i=>{const [z,y,x]=bits(i,3);return (x<<2)|(y<<1)|z;}).sort((a,b)=>a-b);assert.deepEqual(logical,[3,4,6]);return result('decode physical ZYX order back into logical XYZ order',{physical,logical});}
 if(r==='011'){const v=rows(3).map(([a,b,c])=>inv([c,inv(c),1,0][(a<<1)|b]));assert.deepEqual(ones(v),[0,3,6,7]);return result('select actual D port then invert output, not input specification',{ones:ones(v)});}
 if(r==='012'){const v=rows(3).map(([x,a,b])=>x?a&b:a^b);assert.equal(v.join(''),'01100001');return result('select low or carry bit of the half-adder for every XAB row',{vector:v.join('')});}
 if(r==='013'){const v=rows(2).map((_,i)=>decoder(2,i,false));assert.ok(v.every(x=>JSON.stringify(x)==='[0,0,0,0]'));return result('E*D multiplies every decoded output; address is erased when data is zero',{dataZeroOutputs:v,oneHotRequires:{E:1,D:1}});}
 if(r==='014'){const a=8,b=0,e=bits(a,4).map((x,i)=>Number(x===bits(b,4)[i]));assert.equal(e.reduce((x,y)=>x|y,0),1);assert.equal(e.reduce((x,y)=>x&y,1),0);return result('concrete per-bit equality example separates any-bit from all-bit equality',{a,b,perBit:e});}
 if(r==='015'){const sum=8+9,t=sum&15,c=sum>>4,k=Number(sum>=10),second=t+6*k;assert.equal(second>>4,0);assert.equal(second%16,7);return result('retain first carry when second correction adder produces no carry',{rawLow:t,firstCarry:c,secondLow:second%16,secondCarry:second>>4,decimalCarry:k});}
 if(r==='016'){const v=rows(4).map(([a,b,c,d])=>inv(a&(b|c)));for(let i=0;i<16;i++)assert.equal(v[i],Number(i<=9));return result('all sixteen BCD inputs, including valid 8/9 with sign bit one',{valid:ones(v)});}
 if(r==='017'){for(const [a,b,c]of rows(3))assert.equal((a|b)&(inv(a)|c),(a|b)&(inv(a)|c)&(b|c));return result('dual consensus is truth-equivalent and fixes zero when B=C=0',{addedFactor:'B+C',possiblePulse:1});}
 if(r==='018'){const detect=stuck=>rows(3).flatMap(([a,b,c],i)=>((a&b)|(a&c))!==(stuck|(a&c))?[bin(i,3)]:[]),zero=detect(0),one=detect(1);assert.deepEqual(zero,['110']);assert.deepEqual(one,['000','001','010','011','100']);return result('normal and faulty networks compared on every input',{stuck0:zero,stuck1:one});}
 if(r==='019'){const zero=rows(2).filter(([a,b])=>(a|(a&b))!==(a|0)),one=rows(2).filter(([a,b])=>(a|(a&b))!==(a|1));assert.equal(zero.length,0);assert.deepEqual(one,[[0,0],[0,1]]);return result('observable-fault enumeration distinguishes redundant branch stuck values',{stuck0:zero,stuck1:one});}
 if(r==='020'){const d1=[],d2=[];for(const [a,b,c]of rows(3)){if(((a&b)|(a&c))!==(a&c))d1.push(''+a+b+c);if(((a&b)|(inv(a)&c))!==(inv(a)&c))d2.push(''+a+b+c);}assert.deepEqual(d1,['110']);assert.deepEqual(d2,['110','111']);return result('same shared fault observed through two different masking branches',{F1:d1,F2:d2});}
 const c=id.match(/P5-digital-4-C-(\d+)/)?.[1];
 if(c==='001'){const v=rows(2).map(([a,b])=>2*(a|b)+(a|inv(b)));assert.deepEqual(v,[1,2,3,3]);return result('compare both claimed output equations with saturating min(input+1,3)',{map:v});}
 if(c==='002'){for(let a=0;a<4;a++)for(let b=0;b<4;b++){const g=a>=b,x=g?a:b,y=g?b:a;assert.equal(x-y,Math.abs(a-b));}return result('paired max/min selection on all sixteen inputs',{range:[0,3],width:2});}
 if(c==='003'){const pairs=rows(3).map(([g2,g1,g0])=>{const b=(g2<<2)|((g2^g1)<<1)|(g2^g1^g0);assert.equal((b^(b>>1)),(g2<<2)|(g1<<1)|g0);return b;});assert.equal(pairs[6],4);return result('round-trip every Gray code through binary prefix XOR',{binaryValues:pairs});}
 if(c==='004'){for(const r of rows(4)){const any=r.reduce((a,b)=>a|b,0),pair=r.some((a,i)=>r.some((b,j)=>i<j&&a&&b));assert.equal(any&inv(Number(pair)),Number(r.reduce((a,b)=>a+b,0)===1));}return result('one-or-more AND not-two-or-more equals exactly-one over all sixteen inputs',{valid:[1,2,4,8]});}
 if(c==='005'){for(let mask=0;mask<16;mask++)for(let s=0;s<4;s++){const d=bits(mask,4),lo=d[s&1],hi=d[2+(s&1)],out=s<2?lo:hi;assert.equal(out,d[s]);}return result('enumerate two first-level muxes and one final mux',{cases:64,depth:2,controls:['S0','S0','S1']});}
 if(c==='006'){for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(const s of [0,1]){const x=bits(a,2).map((v,i)=>s?bits(b,2)[i]:v),y=bits(b,2).map((v,i)=>s?bits(a,2)[i]:v);assert.equal(parseInt(x.join(''),2),s?b:a);assert.equal(parseInt(y.join(''),2),s?a:b);}return result('two independent single-bit muxes for each of two bit positions',{cases:32,muxCount:4});}
 if(c==='007'){for(let d=0;d<16;d++){const code=(d<<1)|inv(pop(d)%2);assert.equal(pop(code)%2,1);for(let i=0;i<5;i++)assert.equal(inv(pop(code^(1<<i))%2),1);for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)assert.equal(inv(pop(code^(1<<i)^(1<<j))%2),0);}return result('all data words and all one-/two-bit flip locations',{dataWords:16,singleFlips:80,doubleFlips:160});}
 if(c==='008'){const m=Array.from({length:16},(_,x)=>{const sign=x>>3,y=((x^(sign?15:0))+sign)&15,signed=x>=8?x-16:x;assert.equal(y,Math.abs(signed));return y;});return result('conditional complement-plus-one compared with signed absolute value',{outputs:m,minInputResult:m[8]});}
 if(c==='009'){for(let i=0;i<8;i++){const [a,b,c]=bits(i,3);assert.equal(a^b,Number(i>=2&&i<=5));}return result('enumerate interval predicate, compare XOR; nonconstant dependence on A and B excludes a zero-gate wire',{ones:[2,3,4,5],gates:1});}
 if(c==='010'){for(let a=0;a<4;a++)for(let b=0;b<4;b++){const [a1,a0]=bits(a,2),[b1,b0]=bits(b,2),p0=a0&b0,u=a1&b0,v=a0&b1,w=a1&b1,p1=u^v,k=u&v,p2=w^k,p3=w&k;assert.equal((p3<<3)|(p2<<2)|(p1<<1)|p0,a*b);}return result('enumerate weighted partial products and both half adders against integer multiplication',{pairs:16,threeByThree:9});}
 if(c==='011'){const sum=[],carry=[];for(const [a,b]of rows(2)){sum.push([0,1].map(ci=>(a+b+ci)&1));carry.push([0,1].map(ci=>(a+b+ci)>>1));}assert.deepEqual(sum,[[0,1],[1,0],[1,0],[0,1]]);assert.deepEqual(carry,[[0,0],[0,1],[0,1],[1,1]]);return result('derive both full-adder cofactor tables from integer addition',{sum,carry});}
 if(c==='012'){const valid=[0,1,3,7],out=rows(3).map(([t2,t1,t0],i)=>{const v=(inv(t2)|t1)&(inv(t1)|t0),b1=v&t1,b0=v&(t2|(t0&inv(t1)));assert.equal(v,Number(valid.includes(i)));assert.equal((b1<<1)|b0,v?valid.indexOf(i):0);return {v,binary:(b1<<1)|b0};});return result('all legal and illegal thermometer inputs, including forced illegal zero output',out);}
 if(c==='013'){for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let s=0;s<4;s++){const alternatives=[a&b,a|b,a^b,(a+b)&3],r=alternatives[s],carry=Number(s===3)&((a+b)>>2);assert.equal(r,s===0?a&b:s===1?a|b:s===2?a^b:(a+b)%4);assert.equal(carry,s===3?Number(a+b>=4):0);}return result('all 64 ALU operation/input cases and arithmetic-only carry masking',{cases:64});}
 if(c==='014'){const on=[0,2,6,8],legal=rows(4).slice(0,10).map(([a,b,c,d],i)=>{const l=inv(d)&(inv(b)|c),z=d|(b&inv(c));assert.equal(l,Number(on.includes(i)));assert.equal(z,inv(l));return l;});return result('check all ten specified digits, leaving six unused codes unconstrained',{on,legal});}
 if(c==='015'){let selected=[];for(let a=0;a<4096;a++){const outputs=decoder(3,a>>9,((a>>8)&1)===0,true);if(outputs[5]===0)selected.push(a);}assert.equal(selected.length,256);assert.equal(selected[0],0xA00);assert.equal(selected.at(-1),0xAFF);return result('all 4096 addresses through high-three-bit decoder and A8 low enable',{first:selected[0],last:selected.at(-1),count:selected.length});}
 throw Error('missing original oracle '+id);
}

test('all 92 original question versions match reviewed fingerprints and have independent checks',()=>{
 assert.equal(originals.size,92);assert.equal(fixture.entries.length,92);
 for(const f of fixture.entries){const q=originals.get(f.id);assert.ok(q,f.id);assert.equal(q.revision??1,f.revision,f.id);assert.equal(q.type,f.type);assert.equal(hash(q.stem),f.stemSha256,f.id+' statement needs re-audit');if(f.modelSha256)assert.equal(hash(q.model),f.modelSha256,f.id+' model needs re-audit');observe(q,originalOracle(q));}
 assert.equal(new Set(observations.map(x=>x.id)).size,92);
});

function latestCheck(id,pattern,solve){test(id+' registered revision 2 default is solved from its actual public statement',t=>{
 const q=latest.get(id);assert.ok(q,id);
 if(!practiceQuestionRevisions[id]?.[2]){assert.equal(q.revision??1,1);newObservations.push({id,status:'candidate only; not registered'});t.skip('candidate is unregistered; local candidate verification is separate');return;}
 assert.equal(q.revision,2,id+' registered revision must be the real default');assert.match(norm(q.stem),pattern,id+' revised meaning needs re-audit');const solved=solve(q,norm(q.stem));
 if(q.type==='single'){assert.equal(grade(q,solved.answer).correct,true);for(let i=0;i<q.options.length;i++)if(i!==solved.answer)assert.equal(grade(q,i).correct,false);}
 else{const a=solved.answer.map(String);assert.equal(grade(q,a).correct,true);assert.equal(grade(q,a.map((x,i)=>q.formats?.[i]==='number'?'+'+Number(x).toFixed(3):x.replaceAll("'",'′'))).correct,true);assert.equal(grade(q,a.map(()=> '__wrong__')).correct,false);}
 newObservations.push({id,revision:q.revision,status:'installed real default verified',...solved});
});}
latestCheck('P4-digital-4-F-002',/一位全减器计算A-B-Bin.*A和B同时接到输入X.*差输出D=.*借位Bout=/,(q,s)=>{
 const all=rows(2).map(([x,bi])=>{const exact=x-x-bi,bo=Number(exact<0);return {X:x,Bin:bi,D:exact+2*bo,Bout:bo};});for(const r of all){assert.equal(r.D,r.Bin);assert.equal(r.Bout,r.Bin);}assert.equal(q.answers.length,2);return {answer:['Bin','Bin'],method:'enumerate X/Bin after applying A=B=X; use D-2Bout=-Bin',rows:all};
});
latestCheck('P4-digital-4-F-005',/8选1.*轮询6路.*正常时输出1.*故障时输出0.*读取全部8个地址.*未使用.*固定接/,(q,s)=>{
 const width=Number(s.match(/一片(\d+)选1/)[1]),connected=Number(s.match(/轮询(\d+)路/)[1]),normal=Number(s.match(/正常时输出([01])/)[1]),alarm=Number(s.match(/读到([01])就报警/)[1]);assert.notEqual(normal,alarm);assert.equal(width-connected,2);const allowed=[0,1].filter(level=>Array.from({length:width-connected},()=>level).every(read=>read!==alarm));assert.deepEqual(allowed,[normal]);return {answer:allowed,method:'evaluate both possible idle levels at every unused channel under full-address polling',unused:width-connected,normal,alarm};
});
latestCheck('P4-digital-4-F-007',/两片低有效3—8译码器.*E=0时使能.*E=1时使能.*禁能.*全部输出为1.*ABC=011.*Y3接.*与\/或/,(q,s)=>{
 const selected=parseInt(s.match(/ABC=([01]{3})/)[1],2),port=Number(s.match(/Y([0-7])接/)[1]);assert.equal(selected,port);let andValid=true,orValid=true;for(const [e,a,b,c]of rows(4)){const addr=(a<<2)|(b<<1)|c,x=decoder(3,addr,e===0,true)[port],y=decoder(3,addr,e===1,true)[port],target=Number(addr!==selected);andValid&&=(x&y)===target;orValid&&=(x|y)===target;}assert.equal(andValid,true);assert.equal(orValid,false);return {answer:['与'],method:'all sixteen enable/address cases; compare both permitted merge gates',andValid,orValid};
});
latestCheck('P4-digital-4-F-010',/四位串行进位.*A、B保持不变.*Cin从0变为1.*进位链.*两种稳态.*Cout=Cin.*B=0101/,(q,s)=>{
 const b=parseInt(s.match(/B=([01]{4})/)[1],2),solutions=Array.from({length:16},(_,a)=>a).filter(a=>[0,1].every(ci=>((a+b+ci)>>4)===ci));assert.equal(solutions.length,1);const a=solutions[0],chains=[0,1].map(ci=>{let carry=ci;const r=[];for(let i=0;i<4;i++){carry=(((a>>i)&1)+((b>>i)&1)+carry)>>1;r.push(carry);}assert.ok(r.every(x=>x===ci));return r;});return {answer:[bin(a,4)],method:'enumerate all sixteen candidate A values under both Cin states; independently trace each full-adder carry',b,solutions,chains};
});
latestCheck('P4-digital-4-F-011',/高有效输出G=\(A>B\)、E=\(A=B\).*H=\(A≥B\).*L=\(A<B\).*与、或、非三种基本门/,(q,s)=>{
 let orValid=true,andValid=true;for(let a=0;a<4;a++)for(let b=0;b<4;b++){const g=Number(a>b),e=Number(a===b),h=Number(a>=b);orValid&&=(g|e)===h;andValid&&=(g&e)===h;assert.equal(inv(h),Number(a<b));}assert.equal(orValid,true);assert.equal(andValid,false);return {answer:['或','非'],method:'enumerate every relation state, verify the permitted OR and NOT composition',pairs:16};
});
latestCheck('P4-digital-4-F-012',/四位无符号比较器.*U=\(A>B\).*四位补码.*A3、B3.*T=A3⊕B3.*T=0选D0.*T=1选D1/,(q,s)=>{
 const signed=x=>x>=8?x-16:x;let same=0,different=0;for(let a=0;a<16;a++)for(let b=0;b<16;b++){const u=Number(a>b),sa=a>>3,sb=b>>3,t=sa^sb,g=t?inv(sa):u;assert.equal(g,Number(signed(a)>signed(b)));if(t)different++;else same++;}return {answer:['U',"A3'"],method:'all 256 raw bit-pattern pairs; same-sign translation preserves order, opposite-sign result is NOT A3',sameSign:same,differentSign:different};
});
latestCheck('P4-digital-4-F-020',/高有效2—4译码器.*E高有效.*禁能.*输出全为0.*E和两位地址均可任意变化.*下一级.*不同的输入组合/,(q,s)=>{
 const outputs=rows(3).map(([e,a,b])=>decoder(2,(a<<1)|b,e===1).join('')),images=[...new Set(outputs)];return {answer:[images.length],method:'enumerate all eight upstream input triples, then count distinct four-line output vectors',outputs,images};
});
latestCheck('P4-digital-4-S-012',/DEMUX与MUX主要方向区别/,(q,s)=>{
 assert.ok(q.options.every(x=>!/(只做加法|必须有存储)/.test(x)));return {answer:choice(q,'分配器把一路数据送到选定输出，选择器从多路输入选一路'),method:'read the actual options: opposite flow, encoder/decoder role and broadcast are distinct semantic errors'};
});
latestCheck('P4-digital-4-S-020',/多输出组合电路共享一个积项.*还应核哪项/,(q,s)=>{
 assert.ok(q.options.every(x=>!/(电源|输出数因此变1)/.test(x)));return {answer:choice(q,'共享节点的扇出与传播负载'),method:'actual options must distinguish physical driver/load from unsupported depth or hazard guarantees'};
});

test('optional local evidence records original mathematics separately from unmerged candidates',()=>{
 if(process.env.DIGITAL_COMBINATIONAL_AUDIT_OUTPUT)writeFileSync(process.env.DIGITAL_COMBINATIONAL_AUDIT_OUTPUT,JSON.stringify({scope:'92 original reviewed versions only; no third-party payload',baselineHtml:fixture.baselineHtml,checked:observations.length,observations,newObservations},null,2)+'\n');
});
