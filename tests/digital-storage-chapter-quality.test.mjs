import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {questionTermCandidates} from '../term-candidates.js';

const question=id=>getPracticeCourse('digital').questions.find(q=>q.id===id);
const labels=q=>questionTermCandidates('digital',q).flatMap(option=>option.entry.aliases);

test('绑线限制JK激励，小占空比决定周期下限，脉冲采样明确前后状态',()=>{
 assert.ok(grade(question('P5-digital-5-F-001'),['1','1','0','0']).correct);
 assert.equal(grade(question('P5-digital-5-F-001'),['1','0','1','0']).correct,false);
 assert.ok(grade(question('P5-digital-5-F-005'),['32']).correct);
 assert.equal(grade(question('P5-digital-5-F-005'),['14']).correct,false);
 assert.match(question('P5-digital-5-R-017').stem,/只考虑这一次数据传递/);
 assert.deepEqual(question('5-16').rubric,['t₁后为(0，0)','t₂后为(1，1)','t₃后为(0，1)']);
});

test('触发器数据稳定和异步端解除有各自术语，单稳态恢复保持独立',()=>{
 const data=labels(question('P5-digital-5-R-017'));
 const reset=labels(question('P5-digital-5-S-015'));
 const clear=labels(question('P5-digital-5-S-019'));
 const jk=labels(question('P5-digital-5-R-012'));
 const pulse=labels({stem:'不可重触发单稳：脉宽为2 ms，恢复时间0.2 ms。'});
 assert.ok(data.includes('建立时间')&&data.includes('保持时间'));
 assert.ok(!data.includes('恢复时间')&&!data.includes('移除时间'));
 assert.ok(reset.includes('恢复时间')&&reset.includes('移除时间'));
 assert.ok(clear.includes('异步清零')&&clear.includes('同步清零'));
 assert.ok(jk.includes('激励表')&&jk.includes('激励无关位'));
 assert.ok(!jk.includes('状态编码位宽'));
 assert.ok(pulse.includes('单稳态恢复间隔')&&!pulse.includes('恢复时间'));
});
