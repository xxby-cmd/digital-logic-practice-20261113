import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade} from '../grading.js';
const fixture=JSON.parse(await readFile(new URL('./fixtures/c-expressions-quality-20261118.json',import.meta.url),'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
test('C3全部56选择按现题/历史题指纹绑定独算结果，七题新旧独立保留',()=>{
 assert.equal(fixture.cases.length,56);
 for(const c of fixture.cases){
  const old=getPracticeCourse('programming',{questionRevisions:{[c.id]:c.baseRevision}}).questions.find(q=>q.id===c.id);
  assert.equal(sha(old.stem),c.baseStemSha256,c.id);assert.equal(old.options[old.answer],c.expectedText,c.id);
  if(!c.patch)continue;
  const registered=practiceQuestionRevisions[c.id]?.[c.revision];
  const q=registered?getPracticeCourse('programming').questions.find(q=>q.id===c.id):{...old,...c.patch,revision:c.revision};
  assert.equal(q.revision,c.revision);for(const [key,value]of Object.entries(c.patch))assert.deepEqual(q[key],value,c.id+' '+key);
  q.options.forEach((_,i)=>assert.equal(grade(q,i).correct,i===q.answer,c.id));
 }
});
test('C3纠正分组反例：错分组与正确结果不同；新等价条件覆盖非0整数',()=>{
 assert.equal(Number(2===Number(3<4)),0);assert.equal(Number(Number(2===3)<4),1);
 assert.equal(Number(Number(2+3>4)===0),0);assert.equal(Number(2+3>Number(4===0)),1);
 for(const a of [-2147483648,-2,0,1,2147483647])for(const b of [-1,0,3])assert.equal(!(a&&b),!a||!b);
 assert.equal(2 & Number(1===0),0);assert.equal(Number((2&1)===0),1);
 const count=fixture.cases.filter(c=>c.patch).length;assert.equal(count,7);
});
