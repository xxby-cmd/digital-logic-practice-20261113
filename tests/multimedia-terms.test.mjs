import test from 'node:test';
import assert from 'node:assert/strict';
import {networkMultimediaPractice} from '../bank-network-multimedia.js';
import {questionTermCandidates} from '../term-candidates.js';
const names=q=>questionTermCandidates('network',q).flatMap(c=>c.entry.aliases);
const question=suffix=>networkMultimediaPractice.network.find(q=>q.id==='P6-network-9-'+suffix);

test('时间戳模2的幂回绕不被当成CRC多项式运算',()=>{
 const actual=names(question('F-007'));
 assert.ok(actual.includes('媒体采样时钟'));
 assert.ok(actual.includes('RTP时间戳'));
 assert.ok(actual.includes('模运算'));
 assert.ok(!actual.includes('二进制多项式'));
 assert.ok(names({stem:'CRC使用生成多项式进行模2除法。'}).includes('二进制多项式'));
});

test('由真实分包布局识别交织，媒体缩写不匹配其他英文单词',()=>{
 const actual=names(question('F-012'));
 assert.ok(actual.includes('音频分块'));
 assert.ok(actual.includes('交织'));
 const unrelated=names({stem:'AFTER RTPACKET RTCPER SSRCounter CSRCounter'});
 for(const alias of ['AF','RTP','RTCP','SSRC','CSRC'])assert.ok(!unrelated.includes(alias),alias);
});
