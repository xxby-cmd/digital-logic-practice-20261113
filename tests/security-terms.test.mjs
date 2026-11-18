import test from 'node:test';
import assert from 'node:assert/strict';
import {questionTermCandidates} from '../term-candidates.js';

const names=stem=>questionTermCandidates('network',{id:'security-term-probe',stem}).flatMap(c=>c.entry.aliases);

test('消息认证MAC不被解释成链路访问，MAC地址仍保持链路语义',()=>{
 const security=names('A、B共用同一个MAC密钥，双方都能生成有效标签。');
 assert.ok(!security.includes('介质访问控制'));
 assert.ok(!security.includes('MAC地址'));
 const link=names('以太网使用MAC地址标识接口，并按CSMA/CD争用共享链路。');
 assert.ok(link.includes('介质访问控制'));
});

test('安全缩写不从其他英文单词内部推断',()=>{
 const unrelated=names('RSAFETY PRIVATE DRIVER SAMPLE SADNESS');
 for(const alias of ['RSA','IV','SA','SAD'])assert.ok(!unrelated.includes(alias),alias);
});
