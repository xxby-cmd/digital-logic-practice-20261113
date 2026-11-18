import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
import {questionTermCandidates} from '../term-candidates.js';

const questions=getPracticeCourse('network').questions;
const q=id=>questions.find(item=>item.id===id);
const key=n=>'P3-network-4-'+n;
const terms=id=>questionTermCandidates('network',q(id)).flatMap(row=>row.entry.aliases);

test('地址题保持点与冒号边界，按明确的格式处理合法输入',()=>{
 const inputs=[
  [42,'10.20.30.64','10.20.30.6 4'],[43,'172.20.1.255','172.20.1.25,5'],
  [53,'10.0.4.0/23','10.0.4.0/ 23'],[55,'2001:db8::9','2001:db8: :9'],
 ];
 for(const [n,right,wrong]of inputs){
  const current=q(key(n));assert.equal(current.revision,2);assert.ok(grade(current,[right]).correct);
  assert.equal(grade(current,[wrong]).correct,false);
  const old=getPracticeCourse('network',{questionRevisions:{[key(n)]:1}}).questions.find(item=>item.id===key(n));
  assert.ok(grade(old,[wrong]).correct,'旧题必须继续按原约定恢复和判分');
 }
});

test('求精确TTL、最小分片数和分配结果均给定足够条件',()=>{
 assert.match(q(key(51)).stem,/每台转发时把TTL减1/);
 assert.match(q(key(86)).stem,/最小常规广播子网.*最低且对齐/);
 assert.match(q(key(88)).stem,/第一片携带能装下的最多数据/);
 assert.match(q(key(95)).stem,/最少需分几片/);
 assert.match(q(key(98)).stem,/忽略排队与处理时延/);
 assert.ok(grade(q(key(65)),['1']).correct);
 assert.equal(grade(q(key(65)),['2']).correct,false);
});

test('路由、查表动作、分片偏移和队列术语按可见题意区分',()=>{
 assert.ok(terms(key(1)).includes('控制平面'));
 assert.ok(terms(key(1)).includes('分组转发'));
 assert.ok(!terms(key(1)).includes('DNS'));
 assert.ok(terms(key(2)).includes('最长前缀匹配'));
 assert.ok(terms(key(7)).includes('片偏移'));
 assert.ok(!terms(key(7)).includes('首部长度'));
 assert.ok(terms(key(24)).includes('NAPT'));
 assert.ok(terms(key(58)).includes('点分十进制'));
 assert.ok(!terms(key(58)).includes('地址匹配'));
 assert.ok(terms('NDP7-network-4-R-001').includes('队头阻塞'));
 assert.ok(terms('NDP7-network-4-C-001').includes('FIFO'));
 assert.ok(!terms('NDP7-network-4-C-001').includes('队头阻塞'));
});
