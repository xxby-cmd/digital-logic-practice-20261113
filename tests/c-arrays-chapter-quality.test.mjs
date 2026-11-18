import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {extraCContract} from '../scripts/judge-c-practice-extra.mjs';

const question=(id,revision)=>getPracticeCourse('programming',revision?{questionRevisions:{[id]:revision}}:{}).questions.find(q=>q.id===id);

test('数组章候选比较与未初始化边界明确，填空只按给定空位校验',()=>{
 const init=question('P3-programming-6-2'),min=question('P3-programming-6-22'),dedup=question('6-02');
 assert.match(init.options[init.answer],/a的后三项初始化为0.*b的对应元素没有初始化/);
 assert.equal(min.options[min.answer],'4、4、2');
 assert.equal(dedup.rubric.length,3);
 assert.equal(question('6-02',1).rubric.length,4);
});

test('数组输出约束与现有实际判题接受的有效答案一致',()=>{
 const pair=question('P3-programming-6-74'),insert=question('P3-programming-6-63');
 assert.match(pair.stem,/任意一对下标，顺序不限/);
 assert.match(pair.stem,/两个不同下标.*不同的可写int对象/);
 assert.doesNotMatch(extraCContract(pair.id).harness,/l<r/);
 assert.match(extraCContract(pair.id).harness,/l!=r/);
 assert.match(insert.stem,/返回0且不改变a及\*n/);
 assert.match(question('P3-programming-6-52').stem,/freq至少有10项且与a不重叠/);
});
