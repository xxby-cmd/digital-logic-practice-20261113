import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {questionTermCandidates} from '../term-candidates.js';

const question=(n,revision)=>{
 const id='P2-network-5-'+n;
 return getPracticeCourse('network',revision?{questionRevisions:{[id]:revision}}:{}).questions.find(q=>q.id===id);
};
const terms=q=>questionTermCandidates('network',q).flatMap(row=>row.entry.aliases);

test('链路层新题的初始交换表和指定最简分数均明确，旧版题仍可恢复',()=>{
 assert.match(question(92).stem,/动态表仅有A→2.*表项不老化/);
 assert.match(question(92,2).stem,/动态表有A→2/);
 assert.ok(grade(question(54),['1/6']).correct);
 assert.equal(grade(question(54),['1 /6']).correct,false);
 assert.ok(grade(question(54,1),['1 /6']).correct);
 assert.ok(grade(question(59),['2','1']).correct);
 assert.equal(grade(question(59),['1','2']).correct,false);
});

test('按题意区分交换机端口、二维奇偶与未计入时延',()=>{
 for(const n of [53,71,92]){
  const labels=terms(question(n));
  assert.ok(labels.includes('交换表'));
  assert.ok(!labels.includes('端口号'));
 }
 assert.ok(terms({stem:'经二层交换机，TCP连接的源端口是15000。'}).includes('端口号'));
 assert.ok(terms(question(59)).includes('奇偶校验'));
 assert.ok(!terms(question(59)).includes('多项式阶数'));
 assert.ok(terms({stem:'CRC生成多项式的阶数与校验位数有何关系？'}).includes('多项式阶数'));
 assert.ok(terms(question(54)).includes('信道利用率'));
 assert.ok(!terms(question(54)).includes('处理时延'));
 assert.ok(terms({stem:'路由器处理时延为2 ms，另外有3 ms的排队时延。'}).includes('处理时延'));
 assert.ok(terms(question(61)).includes('信道利用率'));
 assert.ok(!terms(question(61)).includes('误码'));
});
