import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const id=suffix=>'P5-digital-6-'+suffix;
const question=(suffix,revision)=>getPracticeCourse('digital',revision?{questionRevisions:{[id(suffix)]:revision}}:{}).questions.find(q=>q.id===id(suffix));

test('同步计数使用沿前现态并按两位字面串评分，旧填空仍可正确恢复',()=>{
 const fill=question('F-019');
 assert.match(fill.stem,/每空只写两位二进制数/);
 assert.ok(grade(fill,['10','00']).correct);
 assert.equal(grade(fill,['1,0','00']).correct,false);
 assert.equal(grade(fill,['10','0']).correct,false);
 assert.ok(grade(question('F-019',1),['100']).correct);
});

test('两种输出的沿前沿后分明，保持既有简答版本',()=>{
 const mealy=question('R-005'),moore=question('R-021'),framing=question('C-007');
 assert.match(mealy.model,/沿前Y为1011，沿后Y为0010/);
 assert.match(moore.model,/沿前Y为00010，沿后Y为00100/);
 assert.equal(framing.revision,3);
 assert.match(framing.stem,/未用码11.*丢弃该沿输入/);
 assert.doesNotMatch(question('C-007',2).stem,/丢弃该沿输入/);
});
