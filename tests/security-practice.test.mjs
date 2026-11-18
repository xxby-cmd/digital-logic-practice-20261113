import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {networkSecurityPractice} from '../bank-network-security.js';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {examBlueprints} from '../exam-bank.js';
import {chapterCategory,assertChapterStock} from '../chapter-tests.js';
const qs=networkSecurityPractice.network;
const q=(type,n)=>qs.find(v=>v.id==='P6-network-8-'+type+'-'+String(n).padStart(3,'0'));
const fills=n=>q('F',n).answers.map(v=>v[0]);
const nums=n=>fills(n).map(Number);
const answer=n=>q('S',n).options[q('S',n).answer];
const has=(type,n,...parts)=>{for(const part of parts)assert.ok(q(type,n).model.includes(part),q(type,n).id+' 缺 '+part);};
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,'actual='+a+' expected='+b);
const gcd=(a,b)=>b?gcd(b,a%b):a;
function modpow(a,e,n){let x=1n,b=BigInt(a),k=BigInt(e),m=BigInt(n);while(k){if(k&1n)x=x*b%m;b=b*b%m;k>>=1n;}return Number(x);}
function repeatedPower(a,e,n){let x=1;for(let i=0;i<e;i++)x=x*a%n;return x;}
function replay(high,seen,width,events){
 const received=new Set(seen),bits=[];
 for(const {seq,valid} of events){const accept=valid&&seq>0&&(seq>high||seq>=Math.max(1,high-width+1)&&!received.has(seq));bits.push(Number(accept));if(accept){received.add(seq);high=Math.max(seq,high);for(const old of received)if(old<high-width+1)received.delete(old);}}
 return {high,received:[...received].sort((a,b)=>a-b),bits:bits.join('')};
}

test('97原创具有正确分类、独立题面及可追溯本地参考分界',async()=>{
 assert.equal(qs.length,97);assert.equal(new Set(qs.map(v=>v.id)).size,97);
 assert.deepEqual(['选择题','填空题','分析题','计算题'].map(s=>qs.filter(v=>v.section===s).length),[30,25,27,15]);
 let refs=[];try{refs=JSON.parse(await readFile(new URL('../../学习资料/外校题库参考/已核验题目.json',import.meta.url),'utf8')).network??[];}catch(e){if(e.code!=='ENOENT')throw e;}
 const all=[...new Map([...getPracticeCourse('network').questions,...refs,...qs].map(v=>[v.id,v])).values()];
 const norm=s=>s.normalize('NFKC').replace(/\s/g,'');
 for(const item of qs){assert.equal(item.pool,'practice');assert.equal(item.origin,'原创');assert.equal(item.chapter,8);assert.ok(!item.reference);assert.equal(all.filter(v=>norm(v.stem)===norm(item.stem)).length,1,item.id);assert.ok(!/同上|上一题|见图|按图/.test(item.stem),item.id);if(item.type==='short'){assert.ok(item.model.length>100,item.id);assert.ok(item.rubric.length>=4,item.id);}else assert.ok(item.explanation.length>15,item.id);}
 assert.equal(qs.filter(v=>v.id.startsWith('P6-network-8-C-')&&v.section==='计算题').length,15);
});
test('客观题全部经现有评分函数验证，错误选项不能误判为对',()=>{
 for(const item of qs){if(item.type==='single'){assert.equal(item.options.length,4);assert.equal(new Set(item.options).size,4);for(let i=0;i<4;i++)assert.equal(grade(item,i).correct,i===item.answer,item.id);}
  else if(item.type==='fill'){assert.equal(item.answers.length,item.formats.length);assert.equal(grade(item,item.answers.map(v=>v[0])).correct,true,item.id);}}
 assert.equal(grade(q('F',10),['99','3c']).correct,true);assert.equal(grade(q('F',20),['protect','bypass','discard']).correct,true);
});
test('保密、完整性、身份、签名与公共校验不相互冒充',()=>{
 assert.ok(answer(1).startsWith('不能'));assert.equal(answer(3),'机密性');assert.ok(answer(4).includes('两方都有生成能力'));
 assert.ok(answer(5).includes('B公钥'));assert.ok(answer(6).includes('A公钥'));assert.ok(answer(7).includes('重算公开哈希'));
 assert.ok(answer(10).includes('私钥签名'));assert.ok(answer(11).includes('公开校验规则'));assert.ok(answer(18).startsWith('不提供'));
 has('R',5,'可信摘要','不能单独');has('R',10,'签名','编码');
});
test('两两密钥逐边构造、AES字节换算和非重复穷举均值',()=>{
 const users=Array.from({length:6},(_,i)=>i),edges=users.flatMap(i=>users.filter(j=>i<j).map(j=>[i,j]));
 assert.deepEqual(nums(1),[edges.length,edges.filter(e=>e.includes(0)).length]);assert.deepEqual(nums(2),[128/8,192/8]);
 assert.deepEqual(nums(3),[2**20,(2**20+1)/2]);
});
test('RSA模幂双算法与全部35合法明文覆盖，包括非互素消息',()=>{
 assert.equal(nums(4)[0],modpow(3,13,17));assert.deepEqual(nums(5),[gcd(6,40),0]);
 assert.equal(modpow(17,29,35),12);assert.equal(modpow(47,5,35),17);assert.equal(modpow(5,5,35),10);assert.equal(modpow(10,29,35),5);
 const encryptions=new Set();for(let m=0;m<35;m++){const c=modpow(m,5,35);encryptions.add(c);assert.equal(c,repeatedPower(m,5,35));assert.equal(modpow(c,29,35),m);}
 assert.equal(encryptions.size,35);assert.notEqual(modpow(5,24,35),modpow(5,0,35));
 has('C',1,'=12','47不在0至34','5^5 mod35=10','10^29 mod35=5');
 assert.equal(nums(6)[0],Math.ceil(Math.log2(3233)));assert.ok(2**(nums(6)[0]-1)<3233);
});
test('有限哈希空间、编码宽度和密钥流复用的逐字节反例',()=>{
 assert.deepEqual(nums(7),[(10+20)%256,(11+19)%256]);assert.deepEqual(nums(8),[256/4,0]);assert.deepEqual(nums(9),[2**16]);
 assert.deepEqual(fills(10),[(0x3c^0xa5).toString(16).toUpperCase(),(0x3c^0xa5^0xa5).toString(16).toUpperCase()]);
 assert.deepEqual(fills(11),[(0x9a^0xf0).toString(16).toUpperCase(),(0x35^0x9a^0xf0).toString(16).toUpperCase()]);
 const passwordDomain=Array.from({length:10000},(_,i)=>String(i).padStart(4,'0'));assert.equal(passwordDomain[0],'0000');assert.equal(passwordDomain.at(-1),'9999');assert.equal(new Set(passwordDomain).size,10000);
 has('R',7,'10000','不同salt','仍可逐个测试');
 assert.equal('ab'+'c','a'+'bc');has('R',9,'相同字节串','长度前缀');
});
test('24bit IV容量是鸽巢上界，不是随机选择必等到此时才碰撞',()=>{
 assert.deepEqual(nums(12),[2**24,2**24+1]);assert.ok(q('F',12).explanation.includes('可能更早重复'));
 assert.ok(answer(28).includes('异或'));has('R',23,'独立','IV','不');
});
test('一个SA窗口与两个SA独立状态，失败认证永不占号或推进',()=>{
 const f=replay(10,[7,9,10],4,[8,9,6,11,7].map(seq=>({seq,valid:true})));assert.equal(f.bits,fills(13)[0]);assert.equal(f.high,11);
 const old=[{seq:101,valid:true},{seq:99,valid:true}],fresh=[{seq:1,valid:true},{seq:1,valid:true},{seq:2,valid:false},{seq:2,valid:true}];
 const a=replay(100,[99,100],4,old),b=replay(0,[],4,fresh);
 const combined=a.bits[0]+b.bits.slice(0,2)+a.bits[1]+b.bits.slice(2);assert.equal(combined,'110001');assert.deepEqual([a.high,b.high],[101,2]);has('C',10,combined,'101与2');
 const attack=replay(100,[100],4,[{seq:100000,valid:false},{seq:101,valid:true}]);assert.equal(attack.bits,'01');assert.equal(attack.high,101);has('R',21,'100','101');
});
test('TLS1.2固定首部与给定CBC模型按每个字段计算，不取课件误写宽度',()=>{
 assert.deepEqual(nums(14),[1+2+2,1+2+2+100]);
 const padding=Array.from({length:16},(_,i)=>i).find(i=>(100+16+1+i)%16===0);assert.equal(padding,11);
 assert.deepEqual(nums(15),[padding,100+16+1+padding+16+5]);
 assert.ok(!q('F',14).explanation.includes('课件'));has('R',16,'第四','100');
});
test('分段每记录附加开销与长度字段边界独立',()=>{
 let left=40000;const chunks=[];while(left){const n=Math.min(16384,left);chunks.push(n);left-=n;}
 assert.deepEqual(chunks,[16384,16384,7232]);assert.equal(chunks.reduce((s,n)=>s+n+5+16,0),40063);
 assert.deepEqual(chunks.map(n=>n+16),[16400,16400,7248]);has('C',3,'40063','16400、16400、7248');
});
test('记录接收逐项检查类型、认证、期望序号及关闭后行为',()=>{
 let expected=0,closed=false,app='';const inputs=[[0,'D','A',1],[2,'D','C',1],[1,'D','B',0],[1,'D','B',1],[2,'C','',1],[3,'D','D',1],[0,'D','A',1]],bits=[];
 for(const [seq,type,data,valid] of inputs){const ok=!closed&&Boolean(valid)&&seq===expected;bits.push(Number(ok));if(ok){expected++;if(type==='C')closed=true;else app+=data;}}
 assert.equal(bits.join(''),'1001100');assert.deepEqual([app,expected,closed],['AB',3,true]);has('C',4,'1001100','AB','序号3');
});
test('100次理想标签猜测累积概率，临界位长两侧验证',()=>{
 const risk=t=>-Math.expm1(100*Math.log1p(-(2**-t)));
 near(risk(16),.0015247269688252072);assert.ok(risk(16)>.001);assert.ok(risk(17)<=.001);assert.equal(Array.from({length:32},(_,i)=>i+1).find(t=>risk(t)<=.001),17);
 assert.ok(risk(16)<=100/2**16);has('C',2,'0.001524727','最小整数为17');
});
test('生日碰撞用整数下降阶乘交叉逐项概率，不等同固定目标第二原像',()=>{
 let numerator=1n,denominator=1n;for(let i=0;i<20;i++){numerator*=BigInt(256-i);denominator*=256n;}
 const exact=1-Number(numerator)/Number(denominator),product=1-Array.from({length:20},(_,i)=>1-i/256).reduce((a,b)=>a*b,1);
 near(exact,product);near(product,.5331670787195923);assert.notEqual(product,1-(255/256)**20);has('C',5,'0.533167','另一事件');
});
test('固定期限无重复覆盖比例与全程均值，不能把平均当最小',()=>{
 const N=2**24,speed=2**18,attempts=5*speed;
 assert.equal(attempts,1310720);assert.equal(attempts/N,5/64);near((N+1)/(2*speed),32.00000190734863);
 for(let n=2;n<30;n++)for(let k=0;k<=n;k++){let success=0,totalRank=0;for(let rank=1;rank<=n;rank++){success+=Number(rank<=k);totalRank+=rank;}near(success/n,k/n);near(totalRank/n,(n+1)/2);}
 has('C',6,'1310720','0.078125','32.0000019','并不为0');
});
test('证书路径必须同时有时间交集和既定信任锚，不能只看同公钥',()=>{
 const leaf=[10,25],paths=[{window:[1,20],root:'R1'},{window:[1,61],root:'R2'}];
 const usable=(day,p)=>p.root==='R1'&&day>=leaf[0]&&day<=leaf[1]&&day>=p.window[0]&&day<=p.window[1];
 assert.deepEqual(paths.map(p=>usable(17,p)),[true,false]);assert.deepEqual(paths.map(p=>usable(21,p)),[false,false]);
 assert.deepEqual([Math.max(leaf[0],paths[0].window[0]),Math.min(leaf[1],paths[0].window[1])],[10,20]);has('C',7,'10日至20日','R2却不受信');
 assert.ok(answer(15).startsWith('不能'));has('R',11,'lab','不匹配');
});
test('邮件保密收件角色与签名发送角色及方向/用途分离',()=>{
 assert.deepEqual(fills(16),['B','A']);assert.deepEqual(nums(17),[2*2]);
 const recipients=['B','C'],envelopes=recipients.map(to=>({to,wrapped:'Ks',publicKey:to}));assert.equal(envelopes.length,2);assert.equal(new Set(envelopes.map(e=>e.wrapped)).size,1);
 has('C',8,'密文1份','封装2份','签名1个','B私钥','可信A公钥','不自然阻止');
 assert.ok(answer(20).startsWith('不能'));has('R',15,'方向','密钥');
});
test('ESP长度用连续字段区间计数，公开字段可以仍受认证',()=>{
 const parts=[['outer',20],['esp',8],['iv',16],['cipher',96],['icv',16]],bytes=parts.flatMap(([field,n])=>Array(n).fill(field));
 assert.equal(bytes.length,156);assert.equal(bytes.filter(v=>['esp','iv','cipher'].includes(v)).length,120);assert.equal(bytes.filter(v=>v!=='cipher').length,60);
 assert.equal(96-(20+20+50)-2,4);assert.deepEqual(nums(18),[(32+32)/8]);assert.deepEqual(nums(25),[20+20+40,0]);
 has('C',9,'4byte','156byte','120byte','60byte');assert.ok(answer(23).includes('机密性'));assert.ok(answer(24).startsWith('不能'));
});
test('ACL首匹配穷举四目标流量，不把AND误写为两类的OR',()=>{
 const packets=[{inside:false,dst:'.10',proto:'TCP',port:443},{inside:true,dst:'.10',proto:'TCP',port:443},{inside:false,dst:'.10',proto:'UDP',port:443},{inside:false,dst:'.20',proto:'TCP',port:443}];
 const flawed=p=>p.proto==='TCP'&&p.port===443?true:false;
 const corrected=p=>p.inside?false:p.dst==='.10'&&p.proto==='TCP'&&p.port===443;
 assert.equal(packets.map(p=>Number(flawed(p))).join(''),'1101');assert.equal(packets.map(p=>Number(corrected(p))).join(''),'1000');has('C',11,'1000','相同效果');
 const f21=[{dst:'.10',proto:'TCP'},{dst:'.10',proto:'UDP'},{dst:'.20',proto:'TCP'}].map(p=>Number(p.dst==='.10'&&p.proto==='TCP')).join('');assert.equal(f21,fills(21)[0]);
 has('R',20,'BYPASS','SPD');assert.ok(answer(26).includes('SPD'));
});
test('有状态过滤按元组、方向、握手阶段和超时逐包模拟',()=>{
 let state=null;const accepted=[];
 const events=[['out','SYN',443],['in','ACK',443],['in','SYNACK',443],['out','ACK',443],['in','DATA',444],['in','DATA',443],['expire','',0],['in','DATA',443]];
 for(const [direction,kind,port] of events){if(direction==='expire'){state=null;continue;}let ok=false;
  if(port===443){if(direction==='out'&&kind==='SYN'&&!state){ok=true;state='Pending';}else if(direction==='in'&&kind==='SYNACK'&&state==='Pending'){ok=true;state='WaitAck';}else if(direction==='out'&&kind==='ACK'&&state==='WaitAck'){ok=true;state='Established';}else if(kind==='DATA'&&state==='Established')ok=true;}
  accepted.push(Number(ok));}
 assert.equal(accepted.join(''),'1011010');assert.equal(state,null);has('C',12,'1011010','Established','无该连接');assert.deepEqual(nums(22),[1,0]);
});
test('认证新鲜性要求同时核本次挑战，正确旧标签不等于本次有效',()=>{
 const current=40,received=39,validTag=true;assert.equal(Number(validTag&&received===current),nums(23)[0]);
 assert.ok(answer(12).includes('重放'));assert.ok(answer(13).includes('重放'));has('R',3,'时间','重放');has('R',4,'身份','R');
});
test('IDS基数计算告警精确率/检出率不同，按混淆计数交叉核验',()=>{
 assert.ok(q('F',24).stem.includes('每起事件最多产生一条告警'));assert.ok(q('F',24).stem.includes('16起不同'));
 assert.deepEqual(nums(24),[16/20,16/25]);
 const metrics=(detection,falsePositive)=>{const tp=100*detection,fp=100000*falsePositive;return {tp,fp,fn:100-tp,precision:tp/(tp+fp)};};
 const a=metrics(.9,.01),b=metrics(.8,.0001);assert.deepEqual([a.tp,a.fp,a.fn],[90,1000,10]);assert.deepEqual([b.tp,b.fp,b.fn],[80,10,20]);near(a.precision,9/109);near(b.precision,8/9);
 has('C',13,'8.26%','88.89%','代价');assert.ok(answer(30).includes('不'));has('R',27,'明文','长度、时序');
});
test('32bit序号预算含末值但不重复当前值，两个速率临界核验',()=>{
 const max=2**32-1,current=4290000000,left=max-current;assert.equal(nums(19)[0],max);assert.equal(left,4967295);
 assert.equal(5*1000000-left,32705);assert.equal(left-5*900000,467295);assert.ok(current+5*1000000>max);assert.ok(current+5*900000<=max);
 has('C',14,'4967295','32705','467295');has('R',22,'旧','新的关联');
});
test('双层加密分别在网关与应用终止，明文检查点跟随相应解密',()=>{
 const layers=[{name:'outerIP',visible:['X']},{name:'innerIP',visible:['Y','Z']},{name:'TCPport',visible:['Y','Z']},{name:'HTTP',visible:['Z']}];
 assert.deepEqual(layers.filter(v=>v.visible.includes('X')).map(v=>v.name),['outerIP']);assert.deepEqual(layers.filter(v=>v.visible.includes('Y')).map(v=>v.name),['innerIP','TCPport']);
 assert.deepEqual(layers.find(v=>v.name==='HTTP').visible,['Z']);assert.ok(q('C',15).stem.includes('并可读取该连接的IP端点和TCP端口信息'));
 has('C',15,'Y已解开ESP','HTTP仍在TLS密文','Z正常解开TLS','Z为是/是/是/是','连接信息','外层');has('R',26,'NAT','不');
});
test('题型标签满足现有蓝图库存，完整实际HTML/组卷仍交主线另核',()=>{
 const groups=examBlueprints.network.groups.map(g=>({...g,available:qs.filter(q=>chapterCategory('network',q)===g.name).length}));
 assert.doesNotThrow(()=>assertChapterStock(groups));assert.equal(groups.find(g=>g.name==='计算题').available,15);
 const max=Math.min(...groups.map(g=>Math.floor(g.available/g.count)));assert.equal(max,3);
});
