import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {questionTermCandidates} from '../term-candidates.js';

const questions=getPracticeCourse('digital').questions;
const q=id=>questions.find(question=>question.id===id);
const stem=id=>q(id).stem;
const entries=id=>questionTermCandidates('digital',q(id)).map(row=>row.entry);
const labels=id=>entries(id).flatMap(e=>e.aliases);

test('逻辑门计算按公开模型区分低态电流、阶段脉宽与混合逻辑极性',()=>{
 const inputs=[
  ['P2-digital-3-4',String(Math.floor((8-2*1.6)/.9)),'8'],
  ['P4-digital-3-F-009',String((3.3-.3)/(3-.6)),'1'],
  ['P4-digital-3-F-018',String(3+8+5),'18'],
  ['P4-digital-3-F-019',String(1000/((92-12)/(6-2))),'62.5'],
  ['P4-digital-3-F-020','与非','或非'],
 ];
 for(const [id,right,wrong]of inputs){const question=q(id);assert.equal(question.revision,2);assert.ok(grade(question,[right]).correct);assert.equal(grade(question,[wrong]).correct,false,id);}
 assert.match(stem('P4-digital-3-C-001'),/独立理想速度模型，忽略漏电/);
 const old=getPracticeCourse('digital',{questionRevisions:{'P4-digital-3-C-001':1}}).questions.find(v=>v.id==='P4-digital-3-C-001');
 assert.doesNotMatch(old.stem,/独立理想速度模型/);
});

test('传输门、输入保证区与使能各有独立短注，避免邻近概念误配',()=>{
 assert.ok(labels('P4-digital-3-R-013').includes('CMOS传输门'));
 assert.ok(labels('P4-digital-3-R-013').includes('互补控制'));
 assert.ok(!labels('P4-digital-3-R-013').includes('推挽输出'));
 assert.ok(labels('P4-digital-3-R-014').includes('总线争用'));
 assert.ok(labels('P4-digital-3-R-006').includes('输入识别保证范围'));
 assert.ok(!labels('P4-digital-3-R-006').includes('高低有效电平'));
 assert.ok(labels('P4-digital-3-S-007').includes('使能极性'));
 assert.ok(!labels('P4-digital-3-S-007').includes('覆盖关系'));
 assert.ok(labels('P4-digital-3-R-002').includes('释放态漏电'));
 assert.ok(!labels('P4-digital-3-R-008').includes('重叠匹配'));
 assert.ok(!labels('P2-digital-3-1').includes('上拉电阻'));
 assert.equal(entries('P4-digital-3-S-018').filter(e=>e.aliases.includes('噪声容限')).length,1);
});
