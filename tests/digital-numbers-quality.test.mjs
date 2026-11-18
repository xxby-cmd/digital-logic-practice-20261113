import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade} from '../grading.js';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/digital-numbers-quality-20261118.json',import.meta.url),'utf8'));
const revisions=Object.fromEntries(fixture.entries.map(q=>[q.id,q.revision]));
const originals=new Map(getPracticeCourse('digital',{questionRevisions:revisions}).questions.filter(q=>String(q.chapter)==='1').map(q=>[q.id,q]));
const latest=new Map(getPracticeCourse('digital').questions.map(q=>[q.id,q]));
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>String(x).normalize('NFKC').replace(/[−–]/g,'-').replace(/[′’]/g,"'").replace(/\s/g,'');
const match=(s,p)=>{const m=s.match(p);assert.ok(m,'statement data not parsed: '+p+' / '+s);return m;};
const bits=(x,n)=>Number(x).toString(2).padStart(n,'0');
const pop=x=>Number(x).toString(2).replaceAll('0','').length;
const signed=(x,n)=>x>=2**(n-1)?x-2**n:x;
const tc=(x,n)=>bits(((x%2**n)+2**n)%2**n,n);
const gray=x=>x^(x>>1);
const ungray=g=>{let b=0;while(g){b^=g;g>>=1;}return b;};
const bcd=(n,digits=0)=>String(n).padStart(digits,'0').split('').map(c=>bits(Number(c),4)).join('');
const distance=(a,b)=>pop(a^b);
const gcd=(a,b)=>b===0n?a:gcd(b,a%b);
function rational(n,d=1n){n=BigInt(n);d=BigInt(d);if(d<0n){n=-n;d=-d;}assert.notEqual(d,0n);const g=gcd(n<0n?-n:n,d);return {n:n/g,d:d/g};}
const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d);
const subtract=(a,b)=>rational(a.n*b.d-b.n*a.d,a.d*b.d);
const divide=(a,b)=>rational(a.n*b.d,a.d*b.n);
const absolute=a=>rational(a.n<0n?-a.n:a.n,a.d);
const equal=(a,b)=>assert.equal(a.n*b.d,b.n*a.d);
const fractionText=x=>x.n+'/'+x.d;
function decimal(s){const [a,b='']=String(s).split('.');return rational(BigInt(a+b),10n**BigInt(b.length));}
function radix(s,r){const [whole,part='']=s.split('.');let a=0n;for(const c of whole.toUpperCase())a=a*BigInt(r)+BigInt(parseInt(c,36));let out=rational(a);for(let i=0;i<part.length;i++)out=add(out,rational(parseInt(part[i],36),BigInt(r)**BigInt(i+1)));return out;}
function exactDecimal(x){let d=x.d,a=0,b=0;while(d%2n===0n){d/=2n;a++;}while(d%5n===0n){d/=5n;b++;}assert.equal(d,1n,'finite decimal required');const places=Math.max(a,b),scale=10n**BigInt(places),scaled=x.n*scale/x.d,negative=scaled<0n,raw=(negative?-scaled:scaled).toString().padStart(places+1,'0');return (negative?'-':'')+(places?raw.slice(0,-places)+'.'+raw.slice(-places):raw);}
const floorIndex=(x,precision)=>x.n*(2n**BigInt(precision))/x.d;
function nearestEven(x,precision){const n=x.n*2n**BigInt(precision),lower=n/x.d,remainder=n%x.d;return remainder*2n<x.d?lower:remainder*2n>x.d?lower+1n:lower%2n===0n?lower:lower+1n;}
function findOption(q,text){const found=q.options.flatMap((v,i)=>norm(v)===norm(text)?[i]:[]);assert.equal(found.length,1,q.id+' must contain one independently derived option');return found[0];}
function numericOption(q,wanted){const values=q.options.flatMap((v,i)=>{try{const x=v.includes('/')?v.split('/').map(BigInt):[BigInt(v),1n];return x[0]*wanted.d===wanted.n*x[1]?[i]:[];}catch{return [];}});assert.equal(values.length,1,q.id);return values[0];}
const out=(method,facts,answer)=>({method,facts,...(answer===undefined?{}:{answer})});
const originalEvidence=[],newEvidence=[];

function solveOriginal(q){const id=q.id,s=norm(q.stem);
 if(q.type==='single'){
  if(id==='1-01'){const low=decimal(match(s,/不高于([\d.]+)V/)[1]),from=decimal(match(s,/由([\d.]+)V变/)[1]),to=decimal(match(s,/变为([\d.]+)V/)[1]);assert.ok(from.n*low.d<=low.n*from.d&&to.n*low.d<=low.n*to.d);return out('apply the two actual voltages to the guaranteed low interval',{low:fractionText(low),from:fractionText(from),to:fractionText(to)},findOption(q,'保持为0'));}
  if(id==='1-02'){const x=radix(match(s,/二进制数\(([01.]+)\)2/)[1],2);return out('exact positional expansion',{value:fractionText(x)},findOption(q,exactDecimal(x)));}
  if(id==='1-03'){const x=parseInt(match(s,/十六进制数\(([\dA-F]+)\)16/)[1],16),n=Number(match(s,/对应的(\d+)位/)[1]);return out('hex digit groups with the stated bit width',{x,n},findOption(q,bits(x,n)));}
  if(id==='1-04'){const states=Number(match(s,/为(\d+)种/)[1]),n=Math.ceil(Math.log2(states));assert.ok(2**(n-1)<states&&states<=2**n);return out('minimal binary capacity bounds',{states,n},findOption(q,String(n)));}
  if(id==='1-05'){const invalid=q.options.flatMap((v,i)=>{assert.match(v,/^[01]{4}$/);return parseInt(v,2)>9?[i]:[];});assert.equal(invalid.length,1);return out('each BCD nibble must decode to a digit from zero through nine',{invalid},invalid[0]);}
  if(id==='1-06'){const n=Number(match(s,/采用(\d+)位/)[1]),x=Number(match(s,/十进制数(\d+)对应的码字/)[1]);return out('standard reflected Gray transform from the actual requested position',{position:x,binary:bits(x,n),gray:bits(gray(x),n)},findOption(q,bits(gray(x),n)));}
  const k=id.match(/P4-digital-1-S-(\d+)/)?.[1];
  if(k==='001')return out('one logic symbol can occupy an allowed physical interval',{witness:'two distinct low voltages'},findOption(q,'一个允许的电压范围'));
  if(k==='002')return out('discrete time does not impose discrete amplitude',{timeDiscrete:true,amplitudeMayRemainReal:true},findOption(q,'不能，取样与量化不同'));
  if(k==='003')return out('base-r digit range is zero through r minus one',{base:8,maxDigit:7},findOption(q,'7'));
  if(k==='004'){const m=match(s,/\((\d+)\)r等于十进制(\d+)/),digits=m[1],target=BigInt(m[2]),lower=Math.max(...digits.split('').map(Number))+1,solutions=[];for(let r=lower;r<=Number(target);r++)if(radix(digits,r).n===target)solutions.push(r);assert.equal(solutions.length,1);return out('solve the actual unknown-radix equation and digit legality',{digits,target:String(target),lower,solutions},findOption(q,String(solutions[0])));}
  if(k==='005'){const x=radix(match(s,/二进制小数([01.]+)的/)[1],2);return out('negative exponent at the stated binary fraction position',{exact:fractionText(x)},numericOption(q,x));}
  if(k==='006')return out('sixteen symbols require four binary coordinates',{symbols:16,bits:Math.log2(16)},findOption(q,'4'));
  if(k==='007'){assert.equal(parseInt('01',2),parseInt('1',2));assert.notEqual(parseInt('10',2),parseInt('1',2));return out('a leading zero preserves an integer while an appended zero shifts its weight',{left:'01=1',right:'10=2'},findOption(q,'最左边'));}
  if(k==='008'){const [a,b]=match(s,/数值(\d+)\/(\d+)/).slice(1).map(BigInt),x=rational(a,b),terminates=(x.d&(x.d-1n))===0n;assert.equal(terminates,false);return out('reduce the rational denominator before checking for powers of two',{denominator:String(x.d)},findOption(q,'不能'));}
  if(k==='009'){const m=match(s,/(\d+)位位串([01]+)/),n=Number(m[1]),x=parseInt(m[2],2);return out('decode the same bits with unsigned and negative-sign weights',{unsigned:x,signed:signed(x,n)},findOption(q,x+'、'+signed(x,n)));}
  if(k==='010'||k==='011'){const m=match(s,/(\d+)位补码([01]+)加([01]+)/),n=Number(m[1]),a=parseInt(m[2],2),b=parseInt(m[3],2),exact=signed(a,n)+signed(b,n),low=(a+b)%2**n,overflow=exact<-(2**(n-1))||exact>2**(n-1)-1;return out('integer range overflow and modular carry are distinct',{exact,bits:bits(low,n),decoded:signed(low,n),carry:Math.floor((a+b)/2**n),overflow},findOption(q,k==='010'?'正溢出，结果位串'+bits(low,n):bits(low,n)+'，无有符号溢出'));}
  if(k==='012'){const m=match(s,/把(\d+)位补码([01]+)扩展到(\d+)位/),old=Number(m[1]),x=signed(parseInt(m[2],2),old),width=Number(m[3]);return out('preserve the signed integer under widening',{value:x,width,bits:tc(x,width)},findOption(q,tc(x,width)));}
  if(k==='013'){const x=parseInt(match(s,/二进制和为([01]+)/)[1],2),correction=16-10;assert.equal(x,10);return out('BCD invalid ten requires the six-value radix correction',{raw:x,correction},findOption(q,bits(correction,4)));}
  if(k==='014')return out('Excess-3 is per decimal digit',{zero:bits(0+3,4),nine:bits(9+3,4)},findOption(q,'数字0的余三码0011'));
  if(k==='015'){const distances=Array.from({length:15},(_,i)=>distance(gray(i),gray(i+1)));assert.ok(distances.every(x=>x===1));return out('verify adjacent reflected codes are single-bit transitions without claiming general error correction',{distances},findOption(q,'多位同时变化时中间码误读风险'));}
  if(k==='016'){const valid=q.options.flatMap((v,i)=>pop(parseInt(v,2))===1?[i]:[]);assert.equal(valid.length,1);return out('strict one-hot has exactly one asserted bit',{valid},valid[0]);}
  if(k==='017'){const data=match(s,/对数据([01]+)添加/)[1],p=pop(parseInt(data,2))%2;return out('the added parity bit must make the entire word even',{data,parity:p},findOption(q,String(p)));}
  if(k==='018'){for(let code=0;code<32;code++)if(pop(code)%2===0)for(let mask=0;mask<32;mask++)assert.equal(pop(code^mask)%2!==0,pop(mask)%2===1);return out('every five-bit even codeword and every final flip mask: detection exactly matches odd flip-set cardinality',{codewords:16,masksEach:32,oddFinalBitChangesDetected:true,noUniqueLocation:true},findOption(q,'任意奇数个位翻转'));}
  if(k==='019')return out('a character symbol is not the arithmetic value zero',{ASCII_digit_zero:0x30,numericZero:0},findOption(q,'编码对象不同，不能无条件混用'));
  if(k==='020')return out('the same physical high maps differently by the two declared conventions',{positiveLogic:1,negativeLogic:0},findOption(q,'1、0'));
 }
 if(q.type==='fill'){
  if(id==='1-07'){const m=match(s,/十进制整数(\d+)转换成(\d+)位/),x=Number(m[1]),n=Number(m[2]);return out('fixed-width integer radix conversion',{x,n},[bits(x,n)]);}
  if(id==='1-08'){const x=Number(match(s,/十进制数字(\d+)/)[1]);return out('Excess-3 per-digit offset',{digit:x},[bits(x+3,4)]);}
  if(id==='1-09'){const x=Number(match(s,/将十进制数(\d+)写成8421BCD/)[1]);return out('encode each decimal digit independently',{value:x},[bcd(x)]);}
  if(id==='P2-digital-1-1'){assert.match(s,/四位无符号.*四位补码/);return out('unsigned and signed positive endpoints at the same width',{width:4},[2**4-1,2**3-1]);}
  if(id==='P2-digital-1-2'){const digits=Number(match(s,/保存(\d+)位十进制数字/)[1]);return out('independent four-bit BCD storage per decimal place',{digits},[digits*4]);}
  const k=id.match(/P4-digital-1-F-(\d+)/)?.[1];
  if(k==='001'){const m=match(s,/等式\((\d+)\)r=(\d+)/),digits=m[1],target=BigInt(m[2]),minimum=Math.max(...digits.split('').map(Number))+1,solutions=[];for(let r=minimum;r<=Number(target);r++)if(radix(digits,r).n===target)solutions.push(r);assert.equal(solutions.length,1);return out('the actual linear radix equation plus legal digit constraint',{digits,target:String(target),minimum,solutions},solutions);}
  if(k==='002'){const x=radix(match(s,/二进制小数([01.]+)的/)[1],2);return out('exact binary fractional positional value',{exact:fractionText(x)},[exactDecimal(x)]);}
  if(k==='003'){const x=radix(match(s,/十六进制小数([\dA-F.]+)的/)[1],16);return out('hexadecimal fractional position',{exact:fractionText(x)},[exactDecimal(x)]);}
  if(k==='004'){const n=Number(match(s,/保留(\d+)位/)[1]),step=rational(1n,2n**BigInt(n));return out('nonnegative truncation error is below one quantization interval',{precision:n,strictUpperBound:fractionText(step)},[exactDecimal(step)]);}
  if(k==='005'){const raw=match(s,/无符号整数([01]+)/)[1];return out('unsigned weights of the stated nibble',{raw},[parseInt(raw,2)]);}
  if(k==='006'){const m=match(s,/(\d+)位补码([01]+)的/),n=Number(m[1]),raw=parseInt(m[2],2);return out('negative sign-bit weight of the same nibble',{raw,n},[signed(raw,n)]);}
  if(k==='007'){const n=Number(match(s,/(\d+)位补码/)[1]);return out('minimum signed integer is the negative sign-bit weight',{width:n},[-(2**(n-1))]);}
  if(k==='008'){assert.match(s,/n位补码.*种不同位模式/);return out('each coordinate independently has two physical bit patterns',{countsForWidths1to8:Array.from({length:8},(_,i)=>2**(i+1))},['2^n']);}
  if(k==='009'){const n=Number(match(s,/(\d+)位原码/)[1]);return out('sign magnitude has positive and negative zero',{zeroCodes:[bits(0,n),bits(2**(n-1),n)]},[2]);}
  if(k==='010'){const m=match(s,/无符号(\d+)位([01]+)扩展到(\d+)位/),a=Number(m[1]),b=Number(m[3]);return out('unsigned zero extension adds only the requested new high positions',{oldWidth:a,newWidth:b,value:parseInt(m[2],2)},[b-a]);}
  if(k==='011'){const m=match(s,/(\d+)位补码([01]+)取反加1/),n=Number(m[1]),x=signed(parseInt(m[2],2),n);assert.ok(-x<2**(n-1));return out('representable signed negation under the stated no-overflow condition',{original:x,negated:-x},[tc(-x,n)]);}
  if(k==='012'){const m=match(s,/BCD位组([01]{4})([01]{4})/),digits=m.slice(1).map(v=>parseInt(v,2));assert.ok(digits.every(x=>x<=9));return out('decode BCD digits then concatenate in decimal',{digits},[10*digits[0]+digits[1]]);}
  if(k==='013'){const all=Number(match(s,/共(\d+)种组合/)[1]);return out('one BCD digit has ten used patterns',{all,valid:10},[all-10]);}
  if(k==='014'){const a=Number(match(s,/A编码十进制(\d+)/)[1]);assert.match(s,/递增1/);return out('apply the expressly given ASCII consecutive-letter rule',{A:a},[a+1]);}
  if(k==='015'){const raw=match(s,/b3b2b1b0=([01]+)/)[1],x=parseInt(raw,2);return out('standard reflected Gray from the actual binary pattern',{raw,rightShift:bits(x>>1,raw.length)},[bits(gray(x),raw.length)]);}
  if(k==='016'){const m=match(s,/(\d+)位反射格雷码([01]+)/),n=Number(m[1]),g=parseInt(m[2],2);return out('cumulative XOR is the inverse of the reflected Gray transform',{gray:m[2]},[bits(ungray(g),n)]);}
  if(k==='017'){const data=match(s,/数据([01]+)加偶校验位/)[1];return out('even parity over the entire data-plus-check word',{data,ones:pop(parseInt(data,2))},[pop(parseInt(data,2))%2]);}
  if(k==='018'){const states=Number(match(s,/(\d+)个互斥状态采用严格one-hot/)[1]);return out('one dedicated coordinate for each strict one-hot state',{states},[states]);}
  if(k==='019'){const m=match(s,/(\d+)个互斥状态用(\d+)位/),states=Number(m[1]),n=Number(m[2]);return out('exact capacity boundary leaves no unused codeword',{states,n},[2**n-states]);}
  if(k==='020'){const m=match(s,/高电平(\d+)μs、周期(\d+)μs/),high=BigInt(m[1]),period=BigInt(m[2]),ratio=rational(high,period);return out('duty is high time divided by the whole period',{ratio:fractionText(ratio)},[exactDecimal(ratio)]);}
 }
 return solveShort(q);
}

function solveShort(q){const id=q.id,s=norm(q.stem);
 if(id==='1-10'){const x=decimal(match(s,/十进制数\(([\d.]+)\)10/)[1]),precision=Number(match(s,/小数部分保留(\d+)位/)[1]),scale=2n**BigInt(precision),index=x.n*scale/x.d,represented=rational(index,scale),error=absolute(subtract(x,represented));equal(represented,radix('11010.0100',2));equal(represented,radix('1A.4',16));return out('exact rational truncation then independent radix back-conversion',{input:fractionText(x),precision,index:String(index),represented:fractionText(represented),absoluteError:fractionText(error)});}
 if(id==='1-11'){const x=Number(match(s,/十进制数(\d+)/)[1]);return out('whole-number binary weights differ from decimal-digit BCD',{value:x,binary:x.toString(2),byte:bits(x,8),BCD:bcd(x)});}
 if(id==='P2-digital-1-3'){const upper=Number(match(s,/保存0至(\d+)的分钟数/)[1]),states=upper+1,n=Math.ceil(Math.log2(states));return out('separate digit-format legality from the minute business range',{naturalBits:n,naturalUnused:2**n-states,BCDbits:8,BCDunused:256-states,BCD99DigitLegal:true,BCD99MinuteLegal:99<=upper});}
 const r=id.match(/P4-digital-1-R-(\d+)/)?.[1];
 if(r==='001'){const input=match(s,/二进制数\(([01.]+)\)2/)[1],value=radix(input,2);equal(value,rational(9,4));return out('the actual integer and fractional positions, with zero terms optional',{input,value:fractionText(value),integer:2,fraction:'1/4'});}
 if(r==='002'){const input=match(s,/二进制小数\(([01.]+)\)2/)[1],value=radix(input,2);equal(value,radix('0.54',8));return out('group fractional bits outward from the binary point, padding only the far end',{input,octal:'0.54',value:fractionText(value)});}
 if(r==='003'){const x=decimal(match(s,/十进制数([\d.]+)转换/)[1]);equal(x,radix('0.011',2));assert.equal(x.d&(x.d-1n),0n);return out('repeated doubling plus reduced-denominator termination',{value:fractionText(x),bits:'011',denominator:String(x.d)});}
 if(r==='004'){const limit=divide(rational(1,4),subtract(rational(1),rational(1,2)));equal(limit,rational(1,2));for(let n=2;n<=12;n++){let partial=rational(0);for(let k=2;k<=n;k++)partial=add(partial,rational(1,2n**BigInt(k)));equal(subtract(limit,partial),rational(1,2n**BigInt(n)));}return out('exact geometric sum and finite truncation tails establish the real limit, not a machine-word approximation',{series:'(1/4)/(1-1/2)=1/2',finiteTail:'2^-n',equalTo:'0.1000...'});}
 if(r==='005')return out('one quantization interval versus half-interval, retaining tie and representability preconditions',{step:'1/16',truncation:'0 <= error < 1/16',nearestMaximum:'1/32',midpointRequiresRule:true});
 if(r==='006'){const raw=match(s,/位串([01]+)/)[1],x=parseInt(raw,2);return out('decode the same bit pattern with two different leading weights',{unsigned:x,signed:signed(x,raw.length),formatMustBeKnown:true});}
 if(r==='007'){const x=parseInt(match(s,/对([01]+)取反加1/)[1],2);assert.equal(tc(-x,4),'1000');return out('the asymmetric signed range makes the minimum integer non-negatable at the old width',{old:signed(x,4),exactOpposite:8,wrapped:tc(8,4),expandedOriginal:tc(-8,5),expandedOpposite:tc(8,5)});}
 if(r==='008'||r==='009'){const m=match(s,/计算([01]+)\+([01]+)/),a=parseInt(m[1],2),b=parseInt(m[2],2),n=m[1].length,exact=signed(a,n)+signed(b,n),raw=(a+b)%2**n;if(r==='009')for(let aa=0;aa<2**n;aa++)for(let bb=0;bb<2**n;bb++)if((aa>>(n-1))!==(bb>>(n-1))){const x=signed(aa,n),y=signed(bb,n),z=x+y;assert.ok(z>=Math.min(x,y)&&z<=Math.max(x,y));assert.ok(z>=-(2**(n-1))&&z<=2**(n-1)-1);}return out('integer signed sum, modular low bits and range overflow evaluated separately; all opposite-sign input pairs verify the interval argument',{a:signed(a,n),b:signed(b,n),exact,bits:bits(raw,n),decoded:signed(raw,n),overflow:exact<-(2**(n-1))||exact>2**(n-1)-1});}
 if(r==='010'){const m=match(s,/(\d+)位补码([01]+)直接截去高(\d+)位/),n=Number(m[1]),raw=parseInt(m[2],2),newN=n-Number(m[3]);for(let value=0;value<2**n;value++){const x=signed(value,n),y=signed(value%2**newN,newN),inRange=x>=-(2**(newN-1))&&x<=2**(newN-1)-1;assert.equal(x===y,inRange);assert.equal(tc(y,n)===bits(value,n),inRange);}return out('enumerate every old-width pattern: narrowing preserves value iff the signed new range fits and sign-extension recovers it',{before:signed(raw,n),after:signed(raw%2**newN,newN),newRange:[-(2**(newN-1)),2**(newN-1)-1],patterns:2**n});}
 if(r==='011'){const raw=match(s,/判断([01]{8})是否/)[1],values=[raw.slice(0,4),raw.slice(4)].map(v=>parseInt(v,2));return out('a numeric bit pattern need not be a valid two-digit BCD field',{nibbles:values,BCDvalid:values.every(x=>x<=9),unsigned:parseInt(raw,2)});}
 if(r==='012'){const a=parseInt(bcd(9,2),2),b=parseInt(bcd(10,2),2);assert.equal(distance(a,b),3);return out('decimal carry changes several bits across BCD digit groups',{nine:bcd(9,2),ten:bcd(10,2),changedBits:distance(a,b)});}
 if(r==='013'){const raw=parseInt(match(s,/码字([01]+)/)[1],2);return out('same bits have different codebook domains',{raw,Excess3Digit:raw-3,Excess3Legal:raw>=3&&raw<=12,BCDlegal:raw<=9});}
 if(r==='014'){const a=4+3,b=5+3;assert.notEqual(pop(a),pop(b));return out('constant Hamming weight differs from fixed positional numerical weights',{digit4:bits(a,4),ones4:pop(a),digit5:bits(b,4),ones5:pop(b)});}
 if(r==='015'){const g=parseInt(match(s,/格雷([01]+)为例/)[1],2);return out('Gray inverse transform differs from treating the codeword as weighted binary',{gray:g,decoded:ungray(g),weightedMisread:g});}
 if(r==='016'){assert.equal(distance(7,0)+distance(0,8),distance(7,8));return out('unequal arrival of distinct toggling inputs permits a concrete intermediate code',{before:'0111',after:'1000',intermediate:'0000',reducedRiskDoesNotGuaranteePerfectSampling:true});}
 if(r==='017'){const sent=0b10010,received=0b01010;assert.equal(pop(sent)%2,0);assert.equal(pop(received)%2,0);return out('two changed data positions preserve total even parity',{sent:'1001|0',received:'0101|0',undetected:true});}
 if(r==='018'){const syndromes=Array.from({length:5},(_,i)=>pop(1<<i)%2);assert.ok(syndromes.every(x=>x===1));return out('five possible single-error positions give the same syndrome',{syndromes,cannotLocate:true,alsoPossibleOddErrorWeights:[3,5]});}
 if(r==='019')return out('zero is outside strict one-hot unless an explicit extra idle state is defined',{zeroOnes:0,strictValid:false,extraIdleRequiresContract:true});
 if(r==='020'){const states=Number(match(s,/区分(\d+)个状态/)[1]),n=Math.ceil(Math.log2(states));return out('binary and strict one-hot use different valid subsets',{states,binaryBits:n,binaryUnused:2**n-states,oneHotBits:states,oneHotInvalid:2**states-states});}
 if(r==='021')return out('a sequence of three character digits is different from one byte carrying a numerical code value',{digitSequence:[49,50,51],singleCodeValue:123,numericByte:bits(123,8)});
 if(r==='022')return out('explicit-length three-character text excludes terminators by contract',{textBits:3*8,numericBits:8,ratio:3});
 if(r==='023')return out('a continuous physical transition is compatible with discrete guaranteed settled regions',{transitionMayBeContinuous:true,stableReadNeedsInterfaceTiming:true});
 if(r==='024'){const voltage=decimal(match(s,/测得([\d.]+)V/)[1]);assert.ok(voltage.n*10n>7n*voltage.d&&voltage.n*10n<21n*voltage.d);return out('the measured voltage is outside both explicitly guaranteed regions',{voltage:fractionText(voltage),guaranteedRead:false,noInventedMidpointThreshold:true});}
 if(r==='025')return out('fixed period preserves frequency while high time changes duty',{frequency:'1/T',duty:'tH/T',frequencyNecessarilyChanges:false});
 const c=id.match(/P4-digital-1-C-(\d+)/)?.[1];
 if(c==='001')return out('binary capacity, BCD digit legality and display drive are distinct contracts',{states:1000,binaryBits:10,binaryUnused:1024-1000,BCDbits:12,BCDunused:4096-1000,nibbles:[3,14,7],BCDvalid:false});
 if(c==='002'){let trunc=0,round=0;while(2n**BigInt(trunc)<100n)trunc++;while(2n**BigInt(round+1)<100n)round++;assert.deepEqual([trunc,round],[7,6]);return out('derive the least precisions from exact one-step and half-step bounds',{trunc,round,roundingRangePremiseRetained:true});}
 if(c==='003'){const raw=0b11110000;return out('offset and signed-byte interpretations have different ranges',{offsetRange:[-40,255-40],signedRange:[-128,127],offsetValue:raw-40,signedValue:signed(raw,8),offsetValueFitsSignedByte:false});}
 if(c==='004'){const raw=parseInt(match(s,/接收数据([01]+),/)[1],2),n=8,exact=signed(raw,n)+1;assert.equal(exact,128);return out('preserve the exact result by the smallest wider signed range',{exact,wrapped:tc(exact,n),decoded:signed(exact,n),minimumWidth:9,properBits:tc(exact,9)});}
 if(c==='005'){const units=9+8,corrected=units+6;assert.equal(corrected%16,7);return out('the original binary carry must still trigger decimal correction',{unitsRaw:bits(units,5),unitsCorrectedRaw:bits(corrected,5),units:7,decimalCarry:1,tens:2,BCD:bcd(27,2)});}
 if(c==='006')return out('construct actual adjacent binary and Gray pairs before comparing transition counts',{binary7:bits(7,4),binary8:bits(8,4),gray7:bits(gray(7),4),gray8:bits(gray(8),4),binaryChanges:distance(7,8),grayChanges:distance(gray(7),gray(8)),physicalSamplingStillMatters:true});
 if(c==='007'){const states=12,valid=states+1;return out('an expressly added zero idle state expands the valid one-hot subset',{valid,binaryBits:4,binaryUnused:16-valid,oneHotBits:states,oneHotInvalid:2**states-valid});}
 if(c==='008'){const even=Array.from({length:16},(_,d)=>(d<<1)|(pop(d)%2)),odd=even.map(x=>x^1);assert.ok(even.every(x=>pop(x)%2===0));assert.ok(odd.every(x=>pop(x)%2===1));for(const codes of [even,odd])for(const code of codes)for(let i=0;i<5;i++){assert.notEqual(pop(code^(1<<i))%2,pop(code)%2);for(let j=i+1;j<5;j++)assert.equal(pop(code^(1<<i)^(1<<j))%2,pop(code)%2);}const ambiguousReceived=1;assert.equal(distance(even[0],ambiguousReceived),1);assert.equal(distance(even[1],ambiguousReceived),1);return out('construct both codebooks, enumerate all one-/two-bit changes, and give a received word one bit from two valid originals',{evenCodes:even.length,oddCodes:odd.length,singleErrorDetectable:true,ambiguousReceived,possibleOriginals:[even[0],even[1]],arbitrarySingleErrorCorrectable:false});}
 if(c==='009'){const raw='000010011010',nibbles=raw.match(/.{4}/g).map(v=>parseInt(v,2));assert.equal(pop(parseInt(raw,2))%2,0);assert.ok(nibbles.some(v=>v>9));return out('parity, digit-format and business-domain validity are separate predicates',{raw,nibbles,even:true,BCDvalid:false});}
 if(c==='010')return out('two decimal BCD digits cannot use all byte patterns',{twoDigitValues:100,totalBytePatterns:256,invalidBCD:156,binaryMaximum:255,BCD255Width:12});
 if(c==='011')return out('explicit-length ASCII digit text versus a numerical byte',{textBytes:[0x30,0x30+7],textBits:16,numericByte:7,numericBits:8,leadingZeroIsContent:true});
 if(c==='012'){const x=decimal(match(s,/x=([\d.]+)用(\d+)位/)[1]),precision=Number(match(s,/x=[\d.]+用(\d+)位/)[1]),lo=floorIndex(x,precision),near=nearestEven(x,precision);assert.equal(lo,near);const y=rational(lo,2n**BigInt(precision));return out('derive both actual quantization indices with exact rational distances',{input:fractionText(x),trunc:String(lo),nearest:String(near),value:fractionText(y),error:fractionText(absolute(subtract(x,y)))});}
 if(c==='013'){const values=[[3,20],[7,16],[5,12],[9,40]].map(([a,b])=>rational(a,b)),finite=values.map(x=>(x.d&(x.d-1n))===0n);assert.deepEqual(finite,[false,true,false,false]);equal(rational(6,24),rational(1,4));return out('reduce fractions before testing their denominators',{fractions:values.map(fractionText),finite,reductionExample:'6/24=1/4'});}
 if(c==='014')return out('apply each declared voltage mapping then its already-defined alarm meaning',{highA:{logic:1,alarm:true},highB:{logic:0,alarm:false},wordingIssue:'old final question conflicts with its own logical-one alarm definitions'});
 if(c==='015'){const period=Number(match(s,/周期(\d+)μs/)[1]),m=match(s,/宽度由(\d+)μs改为(\d+)μs/),before=Number(m[1]),after=Number(m[2]);return out('same period fixes frequency, not duty',{frequencyHz:1e6/period,beforeDuty:before/period,afterDuty:after/period,widthRatio:after/before,frequencyRatio:1});}
 throw Error('unreviewed original '+id);
}

function verifyOriginal(q,derived){
 if(q.type==='single'){assert.equal(grade(q,derived.answer).correct,true,q.id+' independent choice');assert.equal(grade(q,derived.answer,2).correct,true,q.id+' historical grader');for(let i=0;i<q.options.length;i++)if(i!==derived.answer)assert.equal(grade(q,i).correct,false,q.id+' distractor');}
 else if(q.type==='fill'){const answer=derived.answer.map(String);assert.equal(grade(q,answer).correct,true,q.id+' independently computed key');assert.equal(grade(q,answer,2).correct,true,q.id+' historical grader');const alternate=answer.map((x,i)=>q.formats?.[i]==='number'?(Number(x)<0?'-':'+')+Math.abs(Number(x)).toFixed(6):x);assert.equal(grade(q,alternate).correct,true,q.id+' allowed numeric format');const wrong=answer.map(x=>/^[01]+$/.test(x)?(x[0]==='0'?'1':'0')+x.slice(1):/^[+-]?\d+(?:\.\d+)?$/.test(x)?String(Number(x)+1):'2^(n-1)');assert.equal(grade(q,wrong).correct,false,q.id+' typical wrong value');}
 else assert.deepEqual(grade(q,'manual answer'),{status:'review',correct:null});
 originalEvidence.push({id:q.id,revision:q.revision??1,type:q.type,...derived});
}

test('94 original number-representation questions use their reviewed old versions and independent mathematics',()=>{
 assert.equal(originals.size,94);assert.equal(fixture.entries.length,94);
 for(const f of fixture.entries){const q=originals.get(f.id);assert.ok(q,f.id);assert.equal(q.revision??1,f.revision);assert.equal(q.type,f.type);assert.equal(hash(q.stem),f.stemSha256,f.id+' statement changed');if(f.optionsSha256)assert.equal(hash(JSON.stringify(q.options)),f.optionsSha256,f.id+' options changed');if(f.modelSha256)assert.equal(hash(q.model),f.modelSha256,f.id+' old model changed');if(f.rubricSha256)assert.equal(hash(JSON.stringify(q.rubric)),f.rubricSha256,f.id+' old rubric changed');verifyOriginal(q,solveOriginal(q));}
 assert.equal(originalEvidence.length,94);assert.equal(originalEvidence.filter(x=>x.type!=='short').length,51);
});

function revised(id,revision,pattern,solve){test(id+' registered default revision '+revision+' is independently verified',t=>{
 const q=latest.get(id);assert.ok(q,id);
 if(!practiceQuestionRevisions[id]?.[revision]){assert.equal(q.revision??1,revisions[id],id+' must still be the old version until registration');newEvidence.push({id,status:'unregistered candidate; not delivered'});t.skip('unregistered candidate, verified separately outside the repository');return;}
 assert.equal(q.revision,revision,id+' registered target must be the actual default');assert.match(norm(q.stem),pattern,id+' new statement changed');const derived=solve(q,norm(q.stem));
 if(q.type==='fill'){const answer=derived.answer.map(String);assert.equal(grade(q,answer).correct,true,id);const wrong=answer.map(x=>x==='不能'?'能':x==='PA⊕PB'?'PA+PB':/^[01]{3}$/.test(x)?(x==='010'?'011':'000'):/^\d+$/.test(x)?String(Number(x)+1):'__wrong__');assert.equal(grade(q,wrong).correct,false,id+' wrong branch/value');}
 else assert.deepEqual(grade(q,'manual response'),{status:'review',correct:null});
 newEvidence.push({id,revision,status:'registered real default checked',...derived});
});}
revised('P4-digital-1-F-001',2,/非零二进制数.*小数点向右移动3位.*不截去.*非零八进制数.*向右移动1位/,(q,s)=>{const binary=Number(match(s,/二进制数.*?向右移动(\d+)位/)[1]),octal=Number(match(s,/八进制数.*?向右移动(\d+)位/)[1]);equal(radix('101010',2),rational(8*21,4));equal(radix('15',8),rational(8*13,8));return out('each retained positional weight is multiplied by its base to the shift power',{binaryShift:binary,octalShift:octal},[2**binary,8**octal]);});
revised('P4-digital-1-F-002',2,/x=0\.3125用3位二进制小数.*就近舍入.*中点.*末位为0.*3位0、1/,(q,s)=>{const m=match(s,/x=([\d.]+)用(\d+)位/),x=decimal(m[1]),precision=Number(m[2]),scaled=x.n*2n**BigInt(precision),lower=scaled/x.d,remainder=scaled%x.d;assert.equal(remainder*2n,x.d,'this must be an exact tie');const index=nearestEven(x,precision);assert.equal(index%2n,0n);const answer=bits(Number(index),precision);assert.equal(grade(q,[String(Number(answer))]).correct,false,'a fixed-width fraction must retain its leading zero');return out('exact rational equal-distance midpoint then the stated even-last-bit tie rule',{input:fractionText(x),lower:String(lower),index:String(index)},[answer]);});
revised('P4-digital-1-F-015',2,/3位标准反射格雷码.*位置0[~～]7.*码字001与101.*只差一位.*位置编号相邻/,(q,s)=>{const pair=match(s,/码字([01]{3})与([01]{3})/).slice(1).map(x=>parseInt(x,2)),positions=pair.map(ungray);assert.equal(distance(...pair),1);assert.notEqual(Math.abs(positions[0]-positions[1]),1);assert.equal(grade(q,['1','6','能']).correct,false);return out('decode both actual Gray codewords before testing the invalid converse of adjacent-code single change',{pair,positions,grayDistance:1,positionDifference:Math.abs(positions[0]-positions[1])},[...positions,'不能']);});
revised('P4-digital-1-F-017',2,/两组四位数据.*偶校验位PA、PB.*只拼接.*原始数据.*不包含原来的校验位.*总偶校验位P/,(q,s)=>{for(let a=0;a<16;a++)for(let b=0;b<16;b++){const pa=pop(a)%2,pb=pop(b)%2,p=pa^pb;assert.equal((pop(a)+pop(b)+p)%2,0);}for(const text of ['PB^PA','PA XOR PB'])assert.equal(grade(q,[text]).correct,true,'published equivalent XOR notation');assert.equal(grade(q,['0']).correct,false,'the original parity bits are excluded');return out('enumerate all 256 data-pair concatenations and independently compose parity summaries',{pairs:256,summary:[[0,0,0],[0,1,1],[1,0,1],[1,1,0]]},['PA⊕PB']);});
revised('P4-digital-1-R-008',3,/4位补码加法.*最高位进位C4.*溢出标志.*C4=1但不溢出.*C4=0却溢出.*符号判断/,(q,s)=>{const witnesses=[];for(let a=0;a<16;a++)for(let b=0;b<16;b++){const raw=a+b,sum=raw%16,exact=signed(a,4)+signed(b,4),overflow=exact< -8||exact>7,bySigns=(a>>3)===(b>>3)&&(sum>>3)!==(a>>3);assert.equal(bySigns,overflow);if((a===14&&b===3)||(a===6&&b===5))witnesses.push({a,b,carry:raw>>4,exact,stored:bits(sum,4),overflow});}assert.deepEqual(witnesses.map(x=>[x.carry,x.overflow]),[[0,true],[1,false]]);assert.match(norm(q.model),/1110\+0011=10001/);assert.match(norm(q.model),/0110\+0101=1011/);return out('all 256 raw input pairs verify the sign criterion; separately check both published witness classes',{pairs:256,witnesses});});
revised('P4-digital-1-R-001',3,/二进制数\(10\.01\)2.*十进制.*按位权展开/,(q,s)=>{const x=radix(match(s,/二进制数\(([01.]+)\)2/)[1],2);equal(x,add(rational(2),rational(1,4)));assert.match(norm(q.model),/2\+1\/4=2\.25/);assert.ok(q.rubric.every(x=>!/(一般规则|Σ)/.test(x)),'rubric must stay within the requested particular expansion');return out('derive this integer part and this fractional part, with no added general formula requirement',{value:fractionText(x),integer:2,fraction:'1/4'});});
revised('P4-digital-1-C-014',2,/正逻辑接口.*A=1表示报警.*负逻辑接口.*B=1表示报警.*都为高电平.*物理高电平统一解释为报警/,(q,s)=>{const logicA=1,logicB=0,alarmA=logicA===1,alarmB=logicB===1;assert.equal(alarmA,true);assert.equal(alarmB,false);assert.match(norm(q.model),/两接口都把逻辑1定义为报警/);assert.ok(!/不能把逻辑1等同/.test(q.stem));return out('first apply each explicitly defined voltage mapping, then its alarm meaning',{highA:{logic:logicA,alarm:alarmA},highB:{logic:logicB,alarm:alarmB}});});

test('optional evidence distinguishes old-version checks from installed new defaults',()=>{const file=process.env.DIGITAL_NUMBERS_AUDIT_OUTPUT;if(file)writeFileSync(file,JSON.stringify({baselineHtml:fixture.baselineHtml,previousHtml:fixture.previousHtml,scope:'94 original reviewed versions, 51 objective keys; local reference material excluded. New defaults count only after real registry registration.',questionRevisions:revisions,originalCount:originalEvidence.length,objectiveCount:originalEvidence.filter(x=>x.type!=='short').length,originalEvidence,newEvidence},null,2)+'\n');});
