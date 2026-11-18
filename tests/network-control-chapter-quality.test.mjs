import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const question=(id,revision)=>getPracticeCourse('network',revision?{questionRevisions:{[id]:revision}}:{}).questions.find(q=>q.id===id);

test('路径MTU题按新旧题面分别识别机制或术语，接受准确缩写',()=>{
 const id='NC7-network-control-F-013';
 for(const response of ['路径MTU发现','PMTUD','Path MTU Discovery'])assert.ok(grade(question(id),[response]).correct);
 assert.equal(grade(question(id),['MTU']).correct,false);
 assert.ok(grade(question(id,1),['MTU']).correct);
 assert.match(question('P3-network-4-73').stem,/IPv4.*DF.*ICMP差错/);
});

test('明确可达顶点含源点，控制器数据转发选项与给定流表对应',()=>{
 const tree=question('P3-network-4-59'),installed=question('P3-network-4-30'),miss=question('NC7-network-control-S-025');
 assert.match(tree.stem,/源点计在这9个顶点内/);
 assert.ok(grade(tree,['8']).correct);
 assert.match(installed.options[installed.answer],/按流表从端口3输出/);
 assert.match(miss.options[miss.answer],/丢弃分组/);
});
