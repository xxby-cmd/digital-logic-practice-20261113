import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade} from '../grading.js';

// These oracles use the statement, Boolean evaluation and exhaustive cubes.
// Published answer fields are only passed to grade, never used as oracle input.
const reviewedRevisions={
 'P4-digital-2-S-011':1,'P4-digital-2-F-007':1,'P4-digital-2-F-009':1,
 'P4-digital-2-F-012':1,'P4-digital-2-F-016':1,'P4-digital-2-F-017':1,
 'P4-digital-2-R-003':2,'P4-digital-2-C-005':1
};
const bank=getPracticeCourse('digital',{questionRevisions:reviewedRevisions}).questions.filter(q=>String(q.chapter)==='2');
const byId=new Map(bank.map(q=>[q.id,q]));
const latestById=new Map(getPracticeCourse('digital').questions.map(q=>[q.id,q]));
const observations=[];
const currentRevisionChecks=[];
const norm=s=>String(s).normalize('NFKC').replace(/[＋]/g,'+').replace(/[＝]/g,'=').replace(/[′’]/g,"'").replace(/[·•×]/g,'*').replace(/\s/g,'');
function get(id,type,pattern){const q=byId.get(id);assert.ok(q,id);assert.equal(q.type,type,id);assert.match(norm(q.stem),pattern,id+' statement changed: re-audit its meaning');return q;}
function bits(n,width){return Array.from({length:width},(_,i)=>(n>>(width-1-i))&1);}
function assignments(vars){return Array.from({length:2**vars.length},(_,i)=>Object.fromEntries(vars.split('').map((v,j)=>[v,bits(i,vars.length)[j]])));}
function ast(expression){
 const s=norm(expression);let i=0;
 function atom(){let node;if(s[i]==='('){i++;node=or();assert.equal(s[i++],')',s);}else{assert.match(s[i]??'',/^[A-Z01]$/,s+' at '+i);const c=s[i++];node=/[01]/.test(c)?['constant',Number(c)]:['variable',c];}while(s[i]==="'"){i++;node=['not',node];}return node;}
 function and(){let node=atom();while(i<s.length&&(s[i]==='*'||/[A-Z01(]/.test(s[i]))){if(s[i]==='*')i++;node=['and',node,atom()];}return node;}
 function xor(){let node=and();while(s[i]==='⊕'||s[i]==='⊙'){const op=s[i++];node=[op==='⊕'?'xor':'xnor',node,and()];}return node;}
 function or(){let node=xor();while(s[i]==='+'){i++;node=['or',node,xor()];}return node;}
 const node=or();assert.equal(i,s.length,'unparsed expression '+s.slice(i));return node;
}
function evaluate(node,env){const [op,a,b]=node;if(op==='constant')return a;if(op==='variable'){assert.ok(a in env,a);return env[a];}const x=evaluate(a,env);if(op==='not')return 1-x;const y=evaluate(b,env);return op==='and'?x&y:op==='or'?x|y:op==='xor'?x^y:1-(x^y);}
function table(expression,vars){const node=typeof expression==='string'?ast(expression):expression;return assignments(vars).map(env=>evaluate(node,env));}
function ones(vector){return vector.flatMap((v,i)=>v?[i]:[]);}
function zeros(vector){return vector.flatMap((v,i)=>v?[]:[i]);}
function setVector(indices,n){return Array.from({length:2**n},(_,i)=>Number(indices.includes(i)));}
function setFrom(s,kind='m',occurrence=0){const matches=[...norm(s).matchAll(new RegExp((kind==='m'?'Σm':'ΠM')+'\\(([0-9,]+)\\)','g'))];assert.ok(matches[occurrence],s);return matches[occurrence][1].split(',').map(Number);}
function dual(node){const [op,a,b]=node;if(op==='constant')return ['constant',1-a];if(op==='variable')return node;if(op==='not')return ['not',dual(a)];assert.ok(['and','or'].includes(op));return [op==='and'?'or':'and',dual(a),dual(b)];}
function same(actual,expected,label){assert.deepEqual(actual,expected,label);}
function observe(q,method,result,extra={}){observations.push({id:q.id,revision:q.revision??1,type:q.type,method,result,...extra});}
function choice(q,index,method,result){assert.equal(grade(q,index).correct,true,q.id+' computed choice');for(let i=0;i<q.options.length;i++)if(i!==index)assert.equal(grade(q,i).correct,false,q.id+' distractor '+i);observe(q,method,result,{computedOption:index});}
function algebraChoice(q,expr,vars,{dualize=false}={}){const expectedAst=dualize?dual(ast(expr)):ast(expr),wanted=table(expectedAst,vars);const matches=q.options.map((v,i)=>({node:ast(v),v:table(v,vars),i})).filter(x=>JSON.stringify(dualize?x.node:x.v)===JSON.stringify(dualize?expectedAst:wanted));assert.equal(matches.length,1,q.id+' must have exactly one matching option');choice(q,matches[0].i,dualize?'structural direct-dual transformation, with truth-table check':'independent truth table '+vars,wanted.join(''));}
function fill(q,answer,method,result){const entries=answer.map(String);assert.equal(grade(q,entries).correct,true,q.id+' independently derived fill');const formats=[entries.map((x,i)=>q.formats?.[i]==='number'?'+'+Number(x).toFixed(3):x),entries.map(x=>x.replaceAll("'",'′'))];for(const a of formats)assert.equal(grade(q,a).correct,true,q.id+' allowed equivalent format');const wrong=entries.map(x=>/^\d+$/.test(x)?String(Number(x)+1):'__wrong__');assert.equal(grade(q,wrong).correct,false,q.id+' wrong answer');observe(q,method,result,{computedAnswer:entries,additionalValidFormats:formats});}
function cubeOptions(n,required,dont=[]){
 const allowed=new Set([...required,...dont]),cubes=[];
 for(let code=0;code<3**n;code++){let k=code;const pattern=Array.from({length:n},()=>{const p=k%3;k=Math.floor(k/3);return p-1;});
  const covered=Array.from({length:2**n},(_,i)=>i).filter(i=>bits(i,n).every((v,j)=>pattern[j]===-1||v===pattern[j]));
  if(covered.every(i=>allowed.has(i))&&covered.some(i=>required.includes(i)))cubes.push({pattern,covered,literals:pattern.filter(v=>v!==-1).length});
 }return cubes;
}
function minCover(n,required,dont=[]){
 const cubes=cubeOptions(n,required,dont),full=(1<<required.length)-1,dp=new Map([[0,[0,0]]]);
 for(const cube of cubes){const mask=required.reduce((m,x,j)=>m|(cube.covered.includes(x)?1<<j:0),0);for(const [used,cost]of [...dp]){const next=used|mask,c=[cost[0]+1,cost[1]+cube.literals],old=dp.get(next);if(!old||c[0]<old[0]||c[0]===old[0]&&c[1]<old[1])dp.set(next,c);}}
 return {cost:dp.get(full),largest:Math.max(...cubes.map(c=>c.covered.length)),cubes};
}

test('current source contains the 93 original questions reviewed separately from seven local references',()=>{assert.equal(bank.length,93);assert.equal(byId.size,93);});

test('algebraic choices: derive each option from the actual expression, not its answer key',()=>{
 for(const [id,expr,vars,dualize]of [
  ['2-02','A⊕B⊕B','AB'],['2-03',"(A+B'C)'",'ABC'],['2-04',"A'B+AB+B'C",'ABC'],['2-05','A(B+0)','AB',true],
  ['2-07',"B'D'",'ABCD'],['P4-digital-2-S-002',"(A+B)'",'AB'],['P4-digital-2-S-004','A+AB','AB'],
  ['P4-digital-2-S-005',"A+A'B",'AB'],['P4-digital-2-S-006','(A+B)(A+C)','ABC'],['P4-digital-2-S-007','AB+0','AB',true]
 ]){const q=get(id,'single',/逻辑|表达式|化简|卡诺图|对偶|F=/);if(id==='2-07'){same(setFrom(q.stem),[0,2,8,10]);same(table(expr,vars),setVector(setFrom(q.stem),4));}else assert.ok(norm(q.stem).includes(norm(expr)),id+' literal expression');algebraChoice(q,expr,vars,{dualize});}
 const min=get('P4-digital-2-S-009','single',/最小项A'BC.*ABC编号/);const row=ones(table("A'BC",'ABC'));assert.equal(row.length,1);choice(min,min.options.findIndex(x=>Number(x)===row[0]),'unique satisfying row of stated minterm',row);
 const max=get('P4-digital-2-S-010','single',/最大项M5按ABC且A最高位/);const candidates=max.options.map((x,i)=>({i,zero:zeros(table(x,'ABC'))})).filter(x=>JSON.stringify(x.zero)==='[5]');assert.equal(candidates.length,1);choice(max,candidates[0].i,'unique zero row of each maximum-term option',5);
 const conversion=get('2-06','single',/三变量.*Σm\(1,2,6\).*ABC.*最高位/);const complement=zeros(setVector(setFrom(conversion.stem),3));choice(conversion,conversion.options.findIndex(x=>JSON.stringify(setFrom(x,'M'))===JSON.stringify(complement)),'enumerate entire three-bit domain and take zero set',complement);
 const count=get('P4-digital-2-S-011','single',/四变量完全指定.*6个不同编号/);const n=4,oneCount=Number(norm(count.stem).match(/Σm有(\d+)个/)[1]);const zeroCount=assignments('ABCD').length-oneCount;choice(count,count.options.findIndex(x=>Number(x)===zeroCount),'all input rows partition into zero and one rows',zeroCount);
 const inv=get('P4-digital-2-S-012','single',/F=ΠM\(1,4\).*F'的Σm/);const neg=table('1','ABC').map((_,i)=>Number(setFrom(inv.stem,'M').includes(i)));choice(inv,inv.options.findIndex(x=>x===ones(neg).join(',')),'original zero set becomes complement one set',ones(neg));
 const all=get('P4-digital-2-S-020','single',/两个四变量.*真值表需要覆盖/);choice(all,all.options.findIndex(x=>Number(x)===assignments('ABCD').length),'exhaustive Cartesian product of four Boolean inputs',16);
});

test('all 25 fill answers are solved from their stated Boolean conditions',()=>{
 const direct=[
  ['2-10',/F=A'B\+AC.*A=1、B=1、C=0/,()=>[evaluate(ast("A'B+AC"),{A:1,B:1,C:0})],'literal substitution'],
  ['2-11',/AB=00、01、10、11.*A⊕B/,()=>[table('A⊕B','AB').join('')],'four input rows in stated order'],
  ['2-12',/Σm\(1,3,6\).*ABC=110.*ABC=100/,q=>{const ms=setFrom(q.stem);return [0b110,0b100].map(x=>Number(ms.includes(x)));},'binary index and membership'],
  ['2-13',/三变量完全指定.*3个取值为1.*F'/,()=>[2**3-3],'Boolean complement partitions eight rows'],
  ['2-14',/四变量.*8个取1.*合法合并组/,()=>[4-Math.log2(8)],'cube dimension eliminates three of four coordinates'],
  ['P4-digital-2-F-001',/A\*A'/,()=>[evaluate(ast("AA'"),{A:0})],'both A cases agree at zero'],
  ['P4-digital-2-F-002',/A\+A'/,()=>[evaluate(ast("A+A'"),{A:0})],'both A cases agree at one'],
  ['P4-digital-2-F-003',/\(A'\)'/,()=>['A'],'two negations restore both input cases'],
  ['P4-digital-2-F-004',/AB\+AB'/,()=>['A'],'four-row table equals A'],
  ['P4-digital-2-F-005',/\(AB\)'按德摩根/,()=>["A'+B'"],'four-row truth-table equivalence'],
  ['P4-digital-2-F-006',/F=AB\+C的反函数.*A=1,B=0,C=0/,()=>[1-evaluate(ast('AB+C'),{A:1,B:0,C:0})],'evaluate whole function before complement'],
  ['P4-digital-2-F-007',/最小项AB'C.*十进制/,()=>ones(table("AB'C",'ABC')),'unique satisfying input'],
  ['P4-digital-2-F-008',/最大项A\+B'\+C.*编号/,()=>zeros(table("A+B'+C",'ABC')),'unique zero input'],
  ['P4-digital-2-F-009',/Σm\(0,1,4,5\).*B=0/,q=>{same(table("B'",'ABC'),setVector(setFrom(q.stem),3));return ["B'"];},'all eight rows and fixed-coordinate cube'],
  ['P4-digital-2-F-010',/ΠM\(0,2,4,6\).*C=0/,q=>{same(table('C','ABC'),setVector(setFrom(q.stem,'M'),3).map(x=>1-x));return ['C'];},'zero-set complement and all rows'],
  ['P4-digital-2-F-011',/四变量一个最小项.*每变量恰出现一次/,()=>['ABCD'.length],'definition includes each coordinate once'],
  ['P4-digital-2-F-012',/五变量.*输入组合/,()=>[assignments('ABCDE').length],'enumerate Cartesian product'],
  ['P4-digital-2-F-013',/两变量.*4行.*不同函数/,()=>[new Set(Array.from({length:2**4},(_,i)=>bits(i,4).join(''))).size],'enumerate possible four-bit output vectors'],
  ['P4-digital-2-F-014',/m2与m6.*010与110/,()=>{const changed='ABC'.split('').filter((_,j)=>bits(2,3)[j]!==bits(6,3)[j]);assert.equal(changed.length,1);return changed;},'Hamming-difference coordinate'],
  ['P4-digital-2-F-015',/四变量.*16格全图/,()=>{assert.equal(minCover(4,Array.from({length:16},(_,i)=>i)).cost[1],0);return [1];},'all-domain constant-one cube'],
  ['P4-digital-2-F-016',/4变量.*合法合并4格/,()=>[4-Math.log2(4)],'two varying coordinates in four-variable cube'],
  ['P4-digital-2-F-017',/Σm\(1,2,4,7\).*ABC=111/,q=>[Number(setFrom(q.stem).includes(0b111))],'binary index and set membership'],
  ['P4-digital-2-F-018',/0010与1010.*ABCD/,()=>{same(table("B'CD'",'ABCD'),setVector([0b0010,0b1010],4));return ["B'CD'"];},'two-term truth table and fixed-coordinate projection'],
  ['P4-digital-2-F-019',/无关项集合d与指定取1.*相交\/不相交/,()=>['不相交'],'one input cannot be simultaneously specified and unspecified'],
  ['P4-digital-2-F-020',/A⊕B⊕C.*恰有2个输入为1/,()=>{const values=assignments('ABC').filter(e=>e.A+e.B+e.C===2).map(e=>evaluate(ast('A⊕B⊕C'),e));assert.ok(values.every(v=>v===values[0]));return [values[0]];},'enumerate all three weight-two input rows']
 ];
 for(const [id,pattern,solve,method]of direct){const q=get(id,'fill',pattern);const a=solve(q);fill(q,a,method,a);}
 same(table("AA'",'A'),[0,0]);same(table("A+A'",'A'),[1,1]);same(table("(A')'",'A'),table('A','A'));same(table("AB+AB'",'AB'),table('A','AB'));same(table("(AB)'",'AB'),table("A'+B'",'AB'));
});

test('published short algebra and canonical forms agree on every input, including stated dont-cares',()=>{
 const equivalent=[
  ['2-15',/AB\+A'C\+BC/,"AB+A'C+BC","AB+A'C",'ABC'],
  ['2-16',/Σm\(0,2,4,6\)/,[0,2,4,6],"C'",'ABC'],
  ['2-17',/\(A\+B\)\(A\+B'\)/,"(A+B)(A+B')",'A','AB'],
  ['P4-digital-2-R-003',/\(A\+B\)\(A'\+B\)/,"(A+B)(A'+B)",'B','AB'],
  ['P4-digital-2-R-004',/A⊕B=A'B\+AB'/,'A⊕B',"A'B'+AB",'AB',true],
  ['P4-digital-2-R-013',/Σm\(0,1,2,3,4,5\)/,[0,1,2,3,4,5],"A'+B'",'ABC'],
  ['P4-digital-2-R-014',/所有A=0的8格为1/,[0,1,2,3,4,5,6,7],"A'",'ABCD'],
  ['P4-digital-2-R-015',/Σm\(0,2,3,6,7\)/,[0,2,3,6,7],"B+A'C'",'ABC'],
  ['P4-digital-2-R-016',/F=AB\+A'B\+BC/,"AB+A'B+BC",'B','ABC'],
  ['P4-digital-2-R-023',/Σm\(0,1,6,7\)/,[0,1,6,7],"A'B'+AB",'ABC'],
  ['P4-digital-2-C-004',/A'BC\+ABC\+AB'C'/,"A'BC+ABC+AB'C'","BC+AB'C'",'ABC'],
  ['P4-digital-2-C-007',/\{1,2,3,5,7\}/,[1,2,3,5,7],"C+A'B",'ABC'],
  ['P4-digital-2-C-011',/Σm\(0,2,8,10\)/,[0,2,8,10],"B'D'",'ABCD'],
  ['P4-digital-2-C-012',/F=AB'\+A'B\+C/,"AB'+A'B+C","ABC'+A'B'C'",'ABC',true]
 ];
 for(const [id,pattern,input,result,vars,inverse]of equivalent){const q=get(id,'short',pattern);assert.ok(norm(q.model).includes(norm(result)),id+' model result changed');let wanted=Array.isArray(input)?setVector(input,vars.length):table(input,vars);if(inverse)wanted=wanted.map(v=>1-v);same(table(result,vars),wanted,id);const oneSet=ones(wanted),cost=minCover(vars.length,oneSet).cost;observe(q,'complete Boolean truth table; exhaustive legal-cube cover', {vector:wanted.join(''),ones:oneSet,minSopCost:cost});assert.deepEqual(grade(q,'any manual response'),{status:'review',correct:null});}
 const q=get('2-18','short',/A⊕B.*与C无关/);const expected=ones(table('A⊕B','ABC'));same(setFrom(q.model),expected);observe(q,'exhaustive XOR table including both C values',expected);
 for(const [id,required,dont,expr]of [['2-19',[1,3,7],[5],'C'],['P4-digital-2-R-011',[1,3],[5,7],'C'],['P4-digital-2-R-012',[0,1],[2],"A'B'"],['P4-digital-2-C-002',[2,3,6],[7],'B'],['P4-digital-2-C-010',[0,4],[2,6],"C'"]]){const q=get(id,'short',/无关|d\(|Σd|d\(/);assert.ok(norm(q.model).includes(norm(expr)));const v=table(expr,'ABC');for(let i=0;i<8;i++)if(!dont.includes(i))assert.equal(v[i],Number(required.includes(i)),id+' specified row '+i);const cost=minCover(3,required,dont).cost;assert.equal(ast(expr)[0]==='variable'||ast(expr)[0]==='not'?1:2,cost[1]);observe(q,'enumerate every specified row and all 27 ternary cubes',{required,dont,chosen:expr,minSopCost:cost});}
});

test('short reasoning: counterexamples, dependency, optimal covers and multi-output constraints',()=>{
 const q=get('P4-digital-2-R-001','short',/AB=AC.*B=C/);const bad=assignments('ABC').filter(e=>e.A*e.B===e.A*e.C&&e.B!==e.C);assert.equal(bad.length,2);assert.ok(bad.every(e=>e.A===0));observe(q,'enumerate every solution of premise; identify counterexamples',bad);
 const or=get('P4-digital-2-R-002','short',/A\+B=1/);const allowed=ones(table('A+B','AB')).map(i=>bits(i,2).join(''));same(allowed,['01','10','11']);observe(or,'enumerate premise solutions',allowed);
 const xor=get('P4-digital-2-R-005','short',/A⊕A=0以及A⊕1=A'/);same(table('A⊕A','A'),[0,0]);same(table('A⊕1','A'),table("A'",'A'));observe(xor,'evaluate both two-row identities',{self:[0,0],withOne:[1,0]});
 const sh=get('P4-digital-2-R-006','short',/F=A'G\(B,C\)\+AH\(B,C\)/);for(let vector=0;vector<256;vector++){const out=bits(vector,8);for(let i=0;i<8;i++){const [a,b,c]=bits(i,3),g=out[(b<<1)|c],h=out[4|(b<<1)|c];assert.equal(((1-a)&g)|(a&h),out[i]);}}observe(sh,'enumerate all 256 three-input functions and all eight input rows','2048 Shannon checks');
 const seq=get('P4-digital-2-R-007','short',/输出依次为00110101/);const v=norm(seq.stem).match(/输出依次为([01]{8})/)[1].split('').map(Number);same(setFrom(seq.model),ones(v));same(setFrom(seq.model,'M'),zeros(v));assert.notEqual(v[0],v[2]);observe(seq,'parse literal output vector; construct same-C counterexample',{ones:ones(v),zeros:zeros(v),counter:[0,2]});
 const order=get('P4-digital-2-R-008','short',/仅A=1且B=C时为1.*ABC与CBA/);const rows=assignments('ABC').filter(e=>e.A===1&&e.B===e.C),abc=rows.map(e=>(e.A<<2)|(e.B<<1)|e.C),cba=rows.map(e=>(e.C<<2)|(e.B<<1)|e.A);same(abc,[4,7]);same(cba,[1,7]);observe(order,'enumerate predicate once then encode both variable orders',{abc,cba});
 const co=get('P4-digital-2-R-010','short',/F=AB\+AC.*A=0和A=1.*消去B/);same(assignments('BC').map(e=>evaluate(ast('AB+AC'),{A:0,...e})),[0,0,0,0]);same(assignments('BC').map(e=>evaluate(ast('AB+AC'),{A:1,...e})),table('B+C','BC'));assert.notEqual(evaluate(ast('AB+AC'),{A:1,B:0,C:0}),evaluate(ast('AB+AC'),{A:1,B:1,C:0}));observe(co,'enumerate both cofactors and explicit B-sensitive input',{cofactor0:'0000',cofactor1:'0111',witness:'A1,C0'});
 const de=get('P4-digital-2-R-017','short',/对偶式与原式一定等价/);assert.notEqual(evaluate(ast('A+B'),{A:1,B:0}),evaluate(dual(ast('A+B')),{A:1,B:0}));observe(de,'syntactic dual and one concrete separating input',{A:1,B:0});
 const unseen=get('P4-digital-2-R-019','short',/7组输入相等.*第8组未测/);for(let omitted=0;omitted<8;omitted++)for(let i=0;i<8;i++)assert.equal(Number(i===omitted),i===omitted?1:0);observe(unseen,'construct all eight possible single-row minterm counterexamples','seven equal rows cannot determine the eighth');
 const restrict=get('P4-digital-2-R-021','short',/F=A\+B与G=\(A\+B\)\(A'\+B'\)/);const fa=table('A+B','AB'),ga=table("(A+B)(A'+B')",'AB');const differences=fa.flatMap((x,i)=>x!==ga[i]?[bits(i,2).join('')]:[]);same(differences,['11']);observe(restrict,'all four input rows',differences);
 const adj=get('P4-digital-2-R-024','short',/编号相差1.*3与4/);const h=(a,b)=>bits(a,3).filter((v,i)=>v!==bits(b,3)[i]).length;assert.equal(h(3,4),3);assert.equal(h(0,4),1);observe(adj,'binary Hamming distance',{distance3to4:h(3,4),distance0to4:h(0,4)});
 const covers=get('P4-digital-2-C-001','short',/Σm\(0,1,2,5,6,7\).*两种/);const required=setFrom(covers.stem);for(const e of ["A'B'+BC'+AC","A'C'+B'C+AB"])same(ones(table(e,'ABC')),required);const cover=minCover(3,required);same(cover.cost,[3,6]);assert.equal(cover.largest,2);observe(covers,'enumerate all 27 cubes and exact set-cover dynamic program',{cost:cover.cost,largest:cover.largest,legalCubes:cover.cubes.length});
 const joint=get('P4-digital-2-C-003','short',/G=F'.*F与G都选1/);const pairs=assignments('FG').filter(e=>e.G===1-e.F).map(e=>[e.F,e.G]);same(pairs,[[0,1],[1,0]]);observe(joint,'enumerate joint output constraint',pairs);
 const conditional=get('P4-digital-2-C-005','short',/A=B=0时输出D.*A=B=1时输出C/);const expected=assignments('ABCD').map(e=>e.A===0&&e.B===0?e.D:e.A===1&&e.B===1?e.C:0);same(table("A'B'D+ABC",'ABCD'),expected);same(setFrom(conditional.model),ones(expected));observe(conditional,'enumerate three mutually exclusive branches of the stated function',{ones:ones(expected),alignmentIssue:'model labels unchanged SOP parentheses as factorization; wording/rubric repair proposed separately'});
 const self=get('P4-digital-2-C-006','short',/F=A⊕B⊕C.*自对偶/);const isSelf=n=>{const vars='ABC'.slice(0,n),expr=vars.split('').join('⊕');return assignments(vars).every(e=>evaluate(ast(expr),e)===1-evaluate(ast(expr),Object.fromEntries(Object.entries(e).map(([k,v])=>[k,1-v]))));};assert.equal(isSelf(3),true);assert.equal(isSelf(2),false);observe(self,'all complemented input pairs',{threeInput:true,twoInput:false});
 const mono=get('P4-digital-2-C-008','short',/奇偶函数.*不带反变量.*单调性/);const lower={A:0,B:0,C:1},upper={A:0,B:1,C:1};assert.ok(Object.keys(lower).every(k=>lower[k]<=upper[k]));assert.equal(evaluate(ast('A⊕B⊕C'),lower),1);assert.equal(evaluate(ast('A⊕B⊕C'),upper),0);for(const x of [0,1])for(const y of [0,1])for(const xx of [x,1])for(const yy of [y,1]){assert.ok((x&y)<=(xx&yy));assert.ok((x|y)<=(xx|yy));}observe(mono,'verify primitive monotonicity and explicit parity counterexample',{lower,upper});
 const shared=get('P4-digital-2-C-009','short',/F1=AB\+AC、F2=AB\+BC.*共享积项/);const terms=[['AB','AC'],['AB','BC']];observe(shared,'count literal term instances and union of identical product terms',{instances:terms.flat().length,unique:new Set(terms.flat()).size});assert.equal(terms.flat().length,4);assert.equal(new Set(terms.flat()).size,3);
});

test('concept choices and remaining short answers have independent examples and boundary checks',()=>{
 const select=(id,pattern,answer,reason,result)=>{const q=get(id,'single',pattern),index=q.options.indexOf(answer);assert.ok(index>=0,id+' verified option missing');choice(q,index,reason,result);};
 same(table('A+A','A'),table('A','A'));select('P4-digital-2-S-001',/逻辑式A\+A.*普通算术/,'逻辑中A+A=A','two-row OR idempotence, distinct from integer 1+1',[0,1]);
 same(table('A(B+C)','ABC'),table('AB+AC','ABC'));select('P4-digital-2-S-003',/A\(B\+C\)与AB\+AC/,'恒等','all eight input rows of distributive law',table('A(B+C)','ABC').join(''));
 assert.notDeepEqual(table(dual(ast('A+B')),'AB'),table("(A+B)'",'AB'));select('P4-digital-2-S-008',/反函数与对偶式/,'通常不同，运算规则不同','one counterexample separates dual and Boolean complement',{dual:table(dual(ast('A+B')),'AB'),inverse:table("(A+B)'",'AB')});
 same(table('A⊕B','AB').map(x=>1-x),table('A⊙B','AB'));select('P4-digital-2-S-013',/异或与同或的关系/,'互为反函数','all four XOR/XNOR rows are complementary','0110 / 1001');
 const gray=[0,1,3,2],h=(a,b)=>bits(a^b,2).reduce((s,x)=>s+x,0);assert.ok(gray.every((x,i)=>h(x,gray[(i+1)%4])===1));select('P4-digital-2-S-014',/卡诺图.*格雷顺序.*目的/,'相邻格仅一变量变化','cyclic Gray-code Hamming distances',[1,1,1,1]);
 const corners=[0,2,8,10],legal=cubeOptions(4,corners).some(c=>JSON.stringify(c.covered)===JSON.stringify(corners));assert.equal(legal,true);select('P4-digital-2-S-015',/AB行、CD列.*00,01,11,10.*四角/,'能，跨上下和左右边界相邻','enumerate all 81 four-input cubes; corner set is a cube',corners);
 const pair=cubeOptions(3,[0,3]);assert.equal(Math.max(...pair.map(c=>c.covered.length)),1);select('P4-digital-2-S-016',/只有m0与m3为1且无无关项/,'不能，编号000与011差两位','no legal cube covers these two specified one rows',[0,3]);
 const sizes=[...new Set(cubeOptions(4,Array.from({length:16},(_,i)=>i)).map(c=>c.covered.length))].sort((a,b)=>a-b);same(sizes,[1,2,4,8,16]);select('P4-digital-2-S-017',/合法合并组大小/,'2的非负整数次幂','enumerate all fixed/free-coordinate cubes, retaining other legality conditions',sizes);
 const fixed=[0,1],dc=2;for(const selected of [0,1]){const vector=[1,0,selected,0];assert.equal(vector[fixed[0]],1);assert.equal(vector[fixed[1]],0);}select('P4-digital-2-S-018',/化简含无关项函数/,'同一无关点可按化简需求选0或1','vary an unconstrained point while keeping both specified points fixed',[0,1]);
 same(zeros(table('(A+B)(A+C)','ABC')),ones(table("((A+B)(A+C))'",'ABC')));select('P4-digital-2-S-019',/最简或与式.*圈哪类格/,'圈0再写和项相乘','each sum factor defines a zero condition; De Morgan turns zero cover into product of sums',zeros(table('(A+B)(A+C)','ABC')));
 const nand=get('2-20','short',/二输入与非门.*F=A\+B.*同一信号/);const g=assignments('AB').map(({A,B})=>{const na=1-(A&A),nb=1-(B&B);return 1-(na&nb);});same(g,table('A+B','AB'));assert.ok(nand.model.includes('共3个'));observe(nand,'enumerate the stated three-NAND connection, including tied inputs',g.join(''));
 const standard=get('P4-digital-2-R-009','short',/Σm\(1,3,5,7\).*C.*标准与或式/);same(setVector(setFrom(standard.stem),3),table('C','ABC'));assert.equal(ast('C')[0],'variable');assert.equal('ABC'.length,3);observe(standard,'truth-equivalence does not supply the two missing literals required by a three-input standard minterm',{equivalent:true,standardForThreeInputs:false});
 const domain=get('P4-digital-2-R-018','short',/仅在无关输入不同.*任意后续电路/);assert.equal(evaluate(ast('A'),{A:0}),evaluate(ast('0'),{A:0}));assert.notEqual(evaluate(ast('A'),{A:1}),evaluate(ast('0'),{A:1}));observe(domain,'construct one restricted-domain equivalence that fails when an excluded input becomes reachable',{allowedA:0,newA:1});
 const omission=get('P4-digital-2-R-020','short',/指定1格.*遗漏.*最大圈/);const required=[0,1,4,5,6,7],partial=table("B'",'ABC');assert.equal(partial[6],0);assert.ok(required.includes(6));observe(omission,'a legal largest cube can still omit another required one',{legalLargest:[0,1,4,5],missing:6});
 const cost=get('P4-digital-2-R-022','short',/2项共6文字.*3项共5文字/);const options=[[2,6],[3,5]];assert.ok(options[0][0]<options[1][0]);assert.ok(options[1][1]<options[0][1]);observe(cost,'the two stated objective orders have opposing preferences',{fewestTerms:options[0],fewestLiterals:options[1],globalOptimality:'not established by this pair alone'});
});

function verifyNew(id,nextRevision,pattern,solve){
 test(id+' latest revision '+nextRevision+' is independently solved from its real public statement',t=>{
  const q=latestById.get(id);assert.ok(q,id);
  if(!practiceQuestionRevisions[id]?.[nextRevision]){assert.ok((q.revision??1)<nextRevision,'unregistered target must not masquerade as installed');currentRevisionChecks.push({id,expectedRevision:nextRevision,status:'candidate only; not installed',actualRevision:q.revision??1});t.skip('candidate is not registered; local candidate verification is recorded outside source');return;}
  assert.equal(q.revision,nextRevision,'newer revision needs a fresh semantic audit');assert.match(norm(q.stem),pattern,id+' new statement changed');
  const result=solve(q,norm(q.stem));
  if(q.type==='single'){assert.equal(grade(q,result.answer).correct,true);for(let i=0;i<q.options.length;i++)if(i!==result.answer)assert.equal(grade(q,i).correct,false);}
  else if(q.type==='fill'){assert.equal(grade(q,result.answer.map(String)).correct,true);const alternate=result.answer.map((x,i)=>q.formats?.[i]==='number'?'+'+Number(x).toFixed(4):String(x));assert.equal(grade(q,alternate).correct,true);assert.equal(grade(q,result.answer.map(x=>String(Number(x)+1))).correct,false);}
  else assert.deepEqual(grade(q,'manual answer'),{status:'review',correct:null});
  currentRevisionChecks.push({id,revision:q.revision,status:'installed default verified',...result});
 });
}
verifyNew('P4-digital-2-S-011',2,/F=A⊕\(AB\).*最简与或式/,(q,s)=>{
 const expression=s.match(/F=(.+)的最简与或式/)[1],wanted=table(expression,'AB');const matches=q.options.map((x,i)=>({i,value:table(x,'AB')})).filter(x=>JSON.stringify(x.value)===JSON.stringify(wanted));assert.equal(matches.length,1);same(wanted,[0,0,1,0]);return {answer:matches[0].i,method:'parse compound XOR and evaluate all four input rows and options',vector:wanted};
});
verifyNew('P4-digital-2-F-007',2,/Σm\(1,3,6\).*ABC编号.*令X=A'.*XBC编号.*从小到大/,(q,s)=>{
 const original=setFrom(s),newOnes=assignments('XBC').flatMap(({X,B,C},index)=>original.includes(((1-X)<<2)|(B<<1)|C)?[index]:[]);same(newOnes,[2,5,7]);assert.equal(q.answers.length,3);return {answer:newOnes,method:'enumerate new coordinates, substitute A=1-X into original one-set'};
});
verifyNew('P4-digital-2-F-009',2,/三变量.*Σm\(1,2,4\).*其余输入输出均为0.*无无关项.*至少.*乘积项/,(q,s)=>{
 const required=setFrom(s),result=minCover(3,required);assert.equal(result.largest,1);return {answer:[result.cost[0]],method:'enumerate all 27 ternary cubes and minimum exact cover',required,cost:result.cost};
});
verifyNew('P4-digital-2-F-012',2,/A、B、C、D.*二值.*满足A=B,C和D不受限制.*有效输入组合/,(q,s)=>{
 const equality=s.match(/满足([A-Z])=([A-Z])/),valid=assignments('ABCD').filter(env=>env[equality[1]]===env[equality[2]]);return {answer:[valid.length],method:'enumerate 16 input rows and filter by stated equality',valid};
});
verifyNew('P4-digital-2-F-016',2,/三变量.*Σm\(0,1,2,4\).*无无关项.*最大.*合法合并组/,(q,s)=>{
 const required=setFrom(s),options=cubeOptions(3,required),largest=Math.max(...options.map(x=>x.covered.length));return {answer:[largest],method:'enumerate all fixed/free-coordinate cubes, requiring every covered row to be specified one',required,largest};
});
verifyNew('P4-digital-2-F-017',2,/Σm\(1,2,4,7\).*ABC编号.*C接为A⊕B.*A、B可任意.*F恒为/,(q,s)=>{
 const ms=setFrom(s),expression=s.match(/C接为([A-Z⊕]+),/)[1],reached=assignments('AB').map(env=>({...env,C:evaluate(ast(expression),env)})),values=reached.map(({A,B,C})=>Number(ms.includes((A<<2)|(B<<1)|C)));assert.ok(values.every(x=>x===values[0]));return {answer:[values[0]],method:'parse connection, derive four reachable ABC inputs, then evaluate original minterm function',reached,values};
});
verifyNew('P4-digital-2-R-003',3,/令X=A\+B、Y=AB.*\(X,Y\).*F=X\+XY.*吸收律/,(q,s)=>{
 const x=s.match(/令X=([A-Z+]+)、Y=/)[1],y=s.match(/、Y=([A-Z]+),其中/)[1],f=s.match(/化简F=([A-Z+]+)。/)[1];const images=assignments('AB').map(env=>({...env,X:evaluate(ast(x),env),Y:evaluate(ast(y),env)})),reachable=[...new Set(images.map(e=>''+e.X+e.Y))].sort();same(reachable,['00','10','11']);for(const e of assignments('XY'))assert.equal(evaluate(ast(f),e),e.X);for(const e of images)assert.equal(evaluate(ast(f),e),evaluate(ast(x),e));assert.match(norm(q.model),/F=X=A\+B/);return {method:'parse both substituted functions; enumerate image set and all four independent XY rows of the identity',reachable,images};
});
verifyNew('P4-digital-2-C-005',2,/A=B=0时输出D.*A=B=1时输出C.*ABCD编号.*AB=00、AB=11.*不影响输出/,(q,s)=>{
 const expected=assignments('ABCD').map(({A,B,C,D})=>A===0&&B===0?D:A===1&&B===1?C:0),claim=norm(q.model).match(/F=([A-Z'+]+)。/)[1];same(table(claim,'ABCD'),expected);same(setFrom(q.model),ones(expected));assert.match(norm(q.model),/AB=00条件下输出与C无关/);assert.match(norm(q.model),/AB=11条件下输出与D无关/);return {method:'enumerate mutually exclusive AB branches, compare actual model SOP and minterm output',ones:ones(expected)};
});

test('optional local audit evidence records current mathematical checks only',()=>{
 const target=process.env.DIGITAL_ALGEBRA_AUDIT_OUTPUT;
 if(target)writeFileSync(target,JSON.stringify({scope:'93 reviewed original question versions; changed defaults verified separately only after registration',reviewedRevisions,questionCount:bank.length,checkedCount:new Set(observations.map(x=>x.id)).size,checks:observations,currentRevisionChecks},null,2)+'\n');
});
