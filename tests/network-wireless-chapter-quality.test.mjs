import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const id=suffix=>'P6-network-7-'+suffix;
const question=(suffix,revision)=>getPracticeCourse('network',revision?{questionRevisions:{[id(suffix)]:revision}}:{}).questions.find(q=>q.id===id(suffix));

test('移动IP的内外目的地址按公开格式判分，旧版仍可恢复',()=>{
 const q=question('F-017');
 assert.ok(grade(q,['203.0.113.9','198.51.100.7']).correct);
 assert.equal(grade(q,['203.0.113.9','198.51.10 0.7']).correct,false);
 assert.ok(grade(question('F-017',1),['203.0.113.9','198.51.10 0.7']).correct);
});

test('实际重试次数、转发入口与学习条件都由题面给出',()=>{
 const retry=question('C-005'),switching=question('C-015');
 assert.match(retry.stem,/首次失败时必再试一次/);
 assert.match(switching.stem,/表项不老化.*从端口3收到.*从端口2收到/);
 assert.match(switching.model,/H→2.*第三帧刷新K→3.*送到2/);
 assert.match(question('R-009').stem,/未分片、非QoS.*重复检测状态仍有效/);
});
