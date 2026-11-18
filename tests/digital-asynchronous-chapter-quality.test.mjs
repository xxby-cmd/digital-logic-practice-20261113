import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const id=suffix=>'P5-digital-7-'+suffix;
const question=(suffix,revision)=>getPracticeCourse('digital',revision?{questionRevisions:{[id(suffix)]:revision}}:{}).questions.find(q=>q.id===id(suffix));

test('异步复位两段脉冲取交集，固定两位输出且旧题按自身版本判分',()=>{
 const overlap=question('F-013'),result=question('F-003');
 assert.ok(grade(overlap,['13','8']).correct);
 assert.equal(grade(overlap,['8','13']).correct,false);
 assert.ok(grade(question('F-013',1),['0','1']).correct);
 assert.ok(grade(result,['11']).correct);
 assert.equal(grade(result,['1,1']).correct,false);
 assert.ok(grade(question('F-003',1),['1,1']).correct);
});

test('非法编码的模式输出须由完整状态判定，未要求的证明不扣分',()=>{
 const decoded=question('C-009');
 assert.match(decoded.stem,/所有未用编码均无指示/);
 assert.match(decoded.model,/INIT=Q2′Q1′Q0、MODE_A=Q2′Q1Q0′、MODE_B=Q2Q1′Q0′/);
 assert.doesNotMatch(question('C-009',1).stem,/所有未用编码均无指示/);
 assert.ok(question('R-018').rubric.some(row=>row.includes('或其他正确等价接法')));
 assert.ok(!question('C-013').rubric.some(row=>row.includes('编码范围')));
});
