import test from 'node:test';
import assert from 'node:assert/strict';
import {questionTermCandidates} from '../term-candidates.js';
const names=stem=>questionTermCandidates('network',{stem}).flatMap(c=>c.entry.aliases);
test('交换机的物理端口不引入临时运输端口或闭区间计数',()=>{
 const actual=names('交换机表中A→2，收到源B、目的A且来自端口2的帧。说明为何没有出口转发不等于没学到信息。');
 assert.ok(actual.length>=2);assert.ok(!actual.includes('临时端口'));assert.ok(!actual.includes('闭区间计数'));
 assert.ok(actual.includes('交换表'));assert.ok(actual.includes('自学习'));
});
test('真实临时端口及包含两端的区间仍可给相应短注',()=>{
 assert.ok(names('客户端使用临时端口建立TCP连接。').includes('临时端口'));
 assert.ok(names('端口号闭区间[49152,65535]内共有多少种选择，包含两端。').includes('闭区间计数'));
});
