import test from 'node:test';
import assert from 'node:assert/strict';
import {questions} from '../bank.js';
import {retiredQuestionIds} from '../bank-revisions.js';
import {getCourse} from '../course-banks.js';
import {emptyProgress,sanitizeProgress} from '../progress.js';
import {resolveRoute} from '../subjects.js';

test('撤下题目及仅收藏状态可归档，重复读取不丢失',()=>{
 assert.equal(retiredQuestionIds.length,10);
 for(const id of retiredQuestionIds)assert.equal(questions.some(q=>q.id===id),false);
 const original=emptyProgress();
 original.records['4-04']={answer:2,status:'correct',revision:1,attempts:3};
 original.favorites=['4-04','5-07'];original.last='4-04';
 const next=sanitizeProgress(original,questions);
 assert.equal(next.records['4-04'],undefined);assert.equal(next.last,null);
 assert.equal(next.archived['4-04@1'].attempts,3);assert.equal(next.archived['4-04@1'].favorite,true);
 assert.equal(next.archived['5-07@0'].favorite,true);
 assert.deepEqual(sanitizeProgress(next,questions),next);
});

test('C数组题改归第六章，旧记录、收藏及直达链接对应新位置',()=>{
 const original=emptyProgress();original.records['5-01']={answer:2,status:'correct',revision:1,attempts:2};
 original.favorites=['5-01'];original.last='5-01';
 const next=sanitizeProgress(original,getCourse('programming').questions);
 assert.equal(next.records['6-01'].status,'correct');assert.equal(next.records['6-01'].attempts,2);
 assert.deepEqual(next.favorites,['6-01']);assert.equal(next.last,'6-01');
 assert.deepEqual(resolveRoute('#/subjects/programming/chapter/5/question/5-01'),{subject:'programming',chapter:6,question:'6-01',view:'practice'});
 assert.deepEqual(sanitizeProgress(next,getCourse('programming').questions),next);
});

test('独立枚举五结点树检验遍历约束，验证半加器与异步采样',()=>{
 function shapes(n){if(!n)return [null];const out=[];for(let k=0;k<n;k++)for(const l of shapes(k))for(const r of shapes(n-1-k))out.push([l,r]);return out;}
 const pre='ABDCE';let count=0;
 for(const shape of shapes(5)){
  let i=0;function label(t){return t?{id:pre[i++],l:label(t[0]),r:label(t[1])}:null;}
  const root=label(shape);function post(t){return t?post(t.l)+post(t.r)+t.id:'';}
  if(post(root)==='DBECA'){count++;assert.ok(root.l&&root.r);}
 }
 assert.equal(count,4);assert.deepEqual(getCourse('structures').questions.find(q=>q.id==='6-01').answers,[['2'],['4']]);
 for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++){
  const s1=a^b,c1=a&b,s=s1^c,c2=s1&c;
  assert.equal(c1&c2,0);assert.equal(s+2*(c1|c2),a+b+c);
 }
 const d=[1,0,1,1,0],reset=[false,false,true,false,false];
 const sampled=d.map((v,i)=>reset[i]?0:v).join('');assert.equal(sampled,'10010');
 assert.equal(questions.find(q=>q.id==='5-10').answers[0][0],sampled);
 const value=26+Math.floor(0.3*16)/16;assert.equal(value,26.25);assert.ok(Math.abs((26.3-value)-0.05)<1e-12);
});
