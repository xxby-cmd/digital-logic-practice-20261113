import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../../制作记录/并行扩题/计网安全核验/',import.meta.url);
async function local(t){try{return JSON.parse(await readFile(new URL('参考候选3题.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;t.skip('第三方课件例题载荷仅本地保留');return null;}}
function powmod(base,exponent,modulus){let value=1n,a=BigInt(base),n=BigInt(modulus),e=BigInt(exponent);while(e){if(e&1n)value=value*a%n;a=a*a%n;e>>=1n;}return Number(value);}
test('三个原课件例题保留页码、模型范围与本地来源，未入原创模块',async t=>{
 const qs=await local(t);if(!qs)return;assert.equal(qs.length,3);assert.equal(new Set(qs.map(q=>q.id)).size,3);
 assert.deepEqual(qs.map(q=>q.reference.slide),[12,24,90]);
 for(const q of qs){assert.equal(q.chapter,8);assert.equal(q.pool,'practice');assert.equal(q.reference.distribution,'local-only');assert.ok(q.reference.adaptation);assert.ok(q.reference.sourceSHA256);assert.ok(q.rubric.length>=4);assert.ok(q.walkthrough.steps.length===3);assert.ok(q.model.length>100);assert.ok(!/同上|见图/.test(q.stem));}
 assert.ok(qs[1].reference.adaptation.includes('十进制'));assert.ok(!qs[1].model.includes('图中的位串'));
 assert.ok(qs[1].reference.adaptation.includes('原页中间幂文字为24832'));assert.ok(qs[1].reference.adaptation.includes('实际12^5=248832'));assert.ok(!qs[1].model.includes('原页'));
});
test('完整26字母双射与原句编码/逆表复核，不偷换成Caesar平移',async t=>{
 const qs=await local(t);if(!qs)return;
 const plain='abcdefghijklmnopqrstuvwxyz',cipher='mnbvcxzasdfghjklpoiuytrewq';
 assert.equal(new Set(cipher).size,26);const encode=Object.fromEntries([...plain].map((v,i)=>[v,cipher[i]])),decode=Object.fromEntries([...cipher].map((v,i)=>[v,plain[i]]));
 const original='bob. i love you. alice',encoded=[...original].map(c=>encode[c]??c).join('');
 assert.equal(encoded,'nkn. s gktc wky. mgsbc');assert.equal([...encoded].map(c=>decode[c]??c).join(''),original);
 for(const letter of plain)assert.equal(decode[encode[letter]],letter);assert.ok(qs[0].model.includes(encoded));
});
test('RSA原例十进制及全部剩余类两种模幂算法核验，不用不成立的一般降阶恒等式',async t=>{
 const qs=await local(t);if(!qs)return;const n=5*7,phi=4*6;
 assert.equal(n,35);assert.equal(phi,24);assert.equal(5*29%phi,1);assert.equal(powmod(12,5,n),17);assert.equal(powmod(17,29,n),12);
 const repeated=(base,exponent,modulus)=>{let value=1;for(let i=0;i<exponent;i++)value=value*base%modulus;return value;};
 for(let m=0;m<n;m++){assert.equal(powmod(m,5,n),repeated(m,5,n));assert.equal(powmod(powmod(m,5,n),29,n),m);}
 assert.notEqual(powmod(5,24,n),powmod(5,24%phi,n));
 assert.ok(qs[1].model.includes('(35,29)'));assert.ok(qs[1].model.includes('c=17'));
});
test('星形n+1对端逐边枚举两方向，与总部SAD条目公式相符，不计IKE',async t=>{
 const qs=await local(t);if(!qs)return;
 for(let n=0;n<=30;n++){const peers=['B',...Array.from({length:n},(_,i)=>'U'+i)],sas=peers.flatMap(p=>[['H',p],[p,'H']]);assert.equal(sas.length,2+2*n);assert.equal(new Set(sas.map(x=>x.join('>'))).size,sas.length);}
 assert.ok(qs[2].stem.includes('每个方向恰建立一条'));assert.ok(qs[2].stem.includes('不计IKE'));assert.ok(qs[2].model.includes('2(n+1)'));
});
