import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade} from '../grading.js';

// Only original question fixtures and source modules are used. No teacher
// slides, private exam payloads, AI receipts or external review records are read.
const fixture = JSON.parse(await readFile(new URL('./fixtures/network-transport-quality-20261118.json', import.meta.url), 'utf8'));
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const items = new Map(fixture.items.map(item => [item.id, item]));
const current = getPracticeCourse('network');
const historical = getPracticeCourse('network', {
  questionRevisions: Object.fromEntries(fixture.items.map(item => [item.id, item.baseRevision])),
});
const byId = new Map(current.questions.map(q => [q.id, q]));
const oldById = new Map(historical.questions.map(q => [q.id, q]));
const shortIds = [
  'P-N-04', ...[66,67,72,73,76,80,81,82,83,84,85,86,87,89,90,94,95,96,99,70,91,100].map(n => 'P3-network-3-' + n),
];
function question(number) {
  const id = typeof number === 'number' ? 'P3-network-3-' + number : number;
  const item = items.get(id), q = byId.get(id);
  assert.ok(item && q, id);
  assert.equal(q.revision, item.revision, id + '实际默认版本');
  assert.equal(hash(q), item.newQuestionSha256, id + '完整真实题面/模型/评分点');
  return q;
}
function publicNumbers(q, regex) {
  const matched = q.stem.match(regex);
  assert.ok(matched, q.id + '完整公开条件改变，须重新核独立推导');
  return matched.slice(1).map(Number);
}
function modelNumbers(q, regex) {
  const matched = q.model.match(regex);
  assert.ok(matched, q.id + '模型的结果字段须可明确定位');
  return matched.slice(1).map(Number);
}
function noIndependentExtraPoint(q, answers) {
  assert.equal(q.rubric.length, answers.length, q.id + '评分点只对应所求，不另列中间推导');
  for (const predicate of answers) assert.equal(q.rubric.filter(predicate).length, 1, q.id);
  assert.ok(q.rubric.every(point => answers.some(predicate => predicate(point))), q.id);
}

test('71项真实新旧完整快照、23个主观题集合和103题章库存保持，旧版不被新rubric覆盖', () => {
  assert.equal(fixture.items.length, 71);
  assert.equal(items.size, 71);
  assert.equal(fixture.entries.length, 103);
  assert.equal(new Set(fixture.entries.map(entry => entry.id)).size, 103);
  assert.deepEqual(fixture.items.filter(item => item.type === 'short').map(item => item.id).sort(), [...shortIds].sort());
  assert.equal(current.questions.filter(q => q.chapter === 3).length, 103);
  assert.equal(historical.questions.filter(q => q.chapter === 3).length, 103);
  assert.deepEqual(current.questions.map(q => q.id).sort(), historical.questions.map(q => q.id).sort());
  assert.deepEqual(fixture.entries.map(entry => entry.id).sort(), current.questions.filter(q => q.chapter === 3).map(q => q.id).sort());
  for (const entry of fixture.entries) {
    const old = oldById.get(entry.id);
    assert.equal(old.revision ?? 1, entry.baseRevision);
    assert.equal(hash(old), entry.baseQuestionSha256, entry.id + '全部103旧题的完整快照');
    assert.deepEqual(old, entry.original);
    if (!items.has(entry.id)) assert.deepEqual(byId.get(entry.id), entry.original, entry.id + '未修订32题不加字段/重算权重');
  }
  const weights = {2: 0, 3: 0};
  for (const item of fixture.items) {
    const q = question(item.id), old = oldById.get(item.id);
    assert.equal(item.subject, 'network');
    assert.equal(old.revision ?? 1, item.baseRevision, item.id);
    assert.equal(item.revision, item.baseRevision + 1);
    assert.equal(hash(old), item.baseQuestionSha256, item.id + '原版本全部字段');
    assert.deepEqual(old, item.original);
    assert.deepEqual(q, item.proposed);
    assert.equal(q.type, old.type);
    assert.equal(q.chapter, old.chapter);
    assert.equal(q.type, item.type);
    assert.equal(q.chapter, item.chapter);
    assert.equal(q.points, old.points, '学习抽取权重不改题目分值');
    assert.deepEqual(practiceQuestionRevisions[item.id][item.revision], item.patch);
    assert.ok(Object.hasOwn(weights, q.studyWeight), item.id);
    weights[q.studyWeight] += 1;
    assert.equal(q.studyWeight, item.studyWeight);
    assert.equal(typeof q.studyEvidence, 'string');
    assert.ok(q.studyEvidence.trim().length > 0);
    assert.equal(q.practiceWeight, 3 * q.studyWeight / 2, '仅新题按本章原章权重乘studyWeight/2');
  }
  assert.deepEqual(weights, {2: 12, 3: 59});
  for (const id of shortIds) assert.deepEqual(grade(question(id), '本测试不调用AI评阅'), {status: 'review', correct: null});
  assert.throws(() => getPracticeCourse('network', {questionRevisions: {'P3-network-3-96': 999}}), /版本/);
});

test('Q5只在普通数据无SYN边界解释SEQ，独立选语义而不从answer索引反推', () => {
  const q = question(5);
  assert.equal(q.type, 'single');
  assert.equal(q.stem, 'TCP序号一般给什么编号？');
  const matching = q.options.flatMap((option, index) => option === '字节流中的字节位置' ? [index] : []);
  assert.equal(matching.length, 1, '唯一正确语义是字节流位置，不是报文段或send计数');
  assert.equal(q.answer, matching[0]);
  for (let index = 0; index < q.options.length; index += 1) assert.equal(grade(q, index).correct, index === matching[0]);
  assert.match(q.explanation, /对于含数据且不带SYN或FIN的普通数据段，SEQ表示该段第一个数据字节在流中的位置，后续数据序号按载荷字节数推进/);
  assert.match(q.explanation, /SYN和FIN本身各占一个序号/);
  const coverage = (seq, bytes, syn, fin) => ({
    firstData: seq + Number(syn), nextSequence: seq + Number(syn) + bytes + Number(fin),
  });
  assert.deepEqual(coverage(800, 120, false, false), {firstData: 800, nextSequence: 920});
  assert.deepEqual(coverage(800, 120, true, false), {firstData: 801, nextSequence: 921});
  assert.deepEqual(coverage(800, 120, false, true), {firstData: 800, nextSequence: 921});
});

test('Q72新ACK逐次更新及有/无未确认数据的计时分支，由公开条件独算', () => {
  const q = question(72);
  const [base, next, sentFirst, sentLast, ack1, ack2] = publicNumbers(q,
    /^TCP发送方当前SendBase=(\d+)、NextSeqNum=(\d+)，(\d+)至(\d+)的数据字节都已发送，期间不再发送新数据。按课件简化规则，收到新ACK后如仍有未确认数据就重新启动计时器，否则停止。依次收到ACK(\d+)、ACK(\d+)后，分别说明SendBase、未确认字节范围和计时器动作。$/);
  assert.equal(base, sentFirst); assert.equal(next, sentLast + 1);
  const computed = [ack1, ack2].map(ack => ({base: ack, interval: ack === next ? null : [ack, next - 1], timer: ack === next ? 'stop' : 'restart'}));
  assert.deepEqual(computed, [
    {base: 1400, interval: [1400, 1599], timer: 'restart'},
    {base: 1600, interval: null, timer: 'stop'},
  ]);
  assert.deepEqual(modelNumbers(q, /ACK(\d+)把SendBase推进到(\d+)，(\d+)至(\d+)仍未确认/),
    [ack1, computed[0].base, ...computed[0].interval]);
  assert.match(q.model, /重新启动计时器/);
  assert.deepEqual(modelNumbers(q, /ACK(\d+)再把SendBase推进到(\d+)/), [ack2, computed[1].base]);
  assert.match(q.model, /没有未确认数据.*停止计时器/);
});

test('Q86过时/重复ACK不回退，最终剩余使用NextSeqNum减单调边界', () => {
  const q = question(86);
  const matched = q.stem.match(/^TCP发送方当前SendBase=(\d+)、NextSeqNum=(\d+)，已发送(\d+)至(\d+)的数据，之后不再发送新数据。序号不回绕，只按累计确认更新边界；期间没有超时或快速重传。按顺序收到(ACK\d+(?:、ACK\d+)*)后，分别写出每次处理后的SendBase，并求最后仍未累计确认的数据量。$/);
  assert.ok(matched);
  const [initial, next, first, last] = matched.slice(1, 5).map(Number);
  assert.equal(initial, first); assert.equal(next, last + 1);
  const acks = [...matched[5].matchAll(/ACK(\d+)/g)].map(match => Number(match[1]));
  let base = initial;
  const boundaries = acks.map(ack => (base = Math.max(base, ack)));
  assert.deepEqual(boundaries, [1400, 1400, 1400, 1800]);
  const stated = q.model.match(/SendBase依次为(\d+(?:、\d+)*)/);
  assert.ok(stated);
  assert.deepEqual(stated[1].split('、').map(Number), boundaries);
  assert.deepEqual(modelNumbers(q, /仍未累计确认的是(\d+)至(\d+)，共(\d+)B/), [base, last, next - base]);
});

test('Q87握手的两个SYN各占一序号，不混淆服务器和客户的ISN', () => {
  const q = question(87);
  const [client, server] = publicNumbers(q,
    /^TCP客户SYN段的SEQ=(\d+)，服务器回复SYN\+ACK段的SEQ=(\d+)。三次握手均不携带应用数据。求服务器SYN\+ACK段中的确认号，以及客户第三次握手报文中的序号、确认号。$/);
  const expected = [client + 1, client + 1, server + 1];
  assert.deepEqual(modelNumbers(q, /服务器ACK=(\d+)；客户第三段SEQ=(\d+)、ACK=(\d+)/), expected);
  assert.deepEqual(expected, [10001, 10001, 40001]);
});

test('Q89只计算不实际发送，第二额度已包含ACK释放，rubric不另设复述/在途5必答', () => {
  const q = question(89);
  const [rwnd, cwnd, flight, released, newRwnd] = publicNumbers(q,
    /^发送方rwnd=(\d+)MSS、cwnd=(\d+)MSS，已有(\d+)MSS未确认。只计算额度、不实际发送新数据：现在还能发多少？随后收到累计确认释放(\d+)MSS、cwnd不变且rwnd降为(\d+)MSS，又最多能发多少？$/);
  const credit = (window, outstanding) => Math.max(0, Math.min(window, cwnd) - outstanding);
  const first = credit(rwnd, flight), secondFlight = flight - released, second = credit(newRwnd, secondFlight);
  assert.deepEqual([first, secondFlight, second], [3, 5, 2]);
  assert.deepEqual(modelNumbers(q, /第一次额度为min\((\d+),(\d+)\)[−-](\d+)=(\d+)MSS/), [rwnd, cwnd, flight, first]);
  assert.deepEqual(modelNumbers(q, /第二次额度为min\((\d+),(\d+)\)[−-](\d+)=(\d+)MSS/), [newRwnd, cwnd, secondFlight, second]);
  noIndependentExtraPoint(q, [
    point => /3MSS/.test(point), point => /2MSS/.test(point),
  ]);
});

for (const [number, phase, pattern] of [
  [90, 'doubling', /^理想慢启动初始cwnd=(\d+)MSS，连续(\d+)轮始终处于慢启动，按每轮完整确认后窗口倍增的模型；每轮发送的都是满窗口新数据。求前5轮共发送多少个MSS的数据，以及第5轮确认完成后的窗口。$/],
  [91, 'additive', /^理想拥塞避免初始cwnd=(\d+)MSS，连续(\d+)轮始终处于拥塞避免，每轮发送满窗口新数据，轮末窗口增加1MSS。求4轮共发送多少个MSS的数据，以及第4轮结束后的窗口。$/],
]) test('Q' + number + '逐轮先发送后更新，分别求累计MSS数据量及最终窗口', () => {
  const q = question(number);
  const [initial, rounds] = publicNumbers(q, pattern);
  const sent = [];
  let window = initial;
  for (let round = 0; round < rounds; round += 1) {
    sent.push(window);
    window = phase === 'doubling' ? window * 2 : window + 1;
  }
  const total = sent.reduce((sum, value) => sum + value, 0);
  assert.deepEqual([total, window], number === 90 ? [31, 32] : [38, 12]);
  const stated = q.model.match(/(?:新数据量为|窗口为)(\d+(?:、\d+)*)MSS/);
  assert.ok(stated);
  assert.deepEqual(stated[1].split('、').map(Number), sent);
  const [statedTotal] = modelNumbers(q, /(?:共|累计发送)(\d+)MSS/);
  const [statedWindow] = modelNumbers(q, /(?:倍增到|更新为)(\d+)MSS/);
  assert.equal(statedTotal, total); assert.equal(statedWindow, window);
  assert.match(q.stem, /多少个MSS的数据/);
  assert.doesNotMatch(q.stem, /多少段/);
});

test('Q94累计确认是右开边界，不把末数据字节当段首或把新确认量多算1', () => {
  const q = question(94);
  const [oldAck, last, newAck] = publicNumbers(q,
    /^TCP发送方此前处理的累计确认号为(\d+)，数据字节已发送到(\d+)（含），期间没有SYN、FIN或新发送的数据。随后处理新的累计确认号(\d+)，问新确认了多少字节，仍有多少已发送数据未被累计确认。$/);
  const expected = [oldAck, newAck - 1, newAck - oldAck, newAck, last, last + 1 - newAck];
  assert.deepEqual(modelNumbers(q, /新确认(\d+)至(\d+)共(\d+)B；剩余(\d+)至(\d+)共(\d+)B/), expected);
  assert.deepEqual([expected[2], expected[5]], [1200, 800]);
});

test('Q95扣首部后用容量下界求5段，先装满策略才唯一确定尾段120B', () => {
  const q = question(95);
  const [mtu, ip, tcp, bytes] = publicNumbers(q,
    /^路径MTU为(\d+)B，使用IPv6基本首部(\d+)B、TCP首部(\d+)B，无扩展首部。每个数据段对应一个不分片的IP分组。发送(\d+)B应用数据时，按从首段起尽量用MSS装满、最后一段才允许不满的策略。求MSS上限、最少数据段数及最后一段载荷。$/);
  const mss = mtu - ip - tcp, count = Math.ceil(bytes / mss), tail = bytes - (count - 1) * mss;
  assert.deepEqual([mss, count, tail], [1220, 5, 120]);
  assert.deepEqual(modelNumbers(q, /MSS(\d+)B，ceil\((\d+)\/(\d+)\)=(\d+)段；前(\d+)段(\d+)B，末段(\d+)B/),
    [mss, bytes, mss, count, count - 1, (count - 1) * mss, tail]);
  assert.equal(5 * 1000, bytes);
  assert.ok(1000 <= mss);
  assert.notEqual(1000, tail, '仅最少5段允许每段1000，公开首段装满条件才排除这个反例');
});

test('Q96按序收到SYN后的数据与FIN，所求FIN/ACK不额外要求写两个中间端点', () => {
  const q = question(96);
  const [isn, bytes] = publicNumbers(q,
    /^TCP某一方向初始SYN序号为(\d+)。握手后该方向共发送(\d+)B数据，再发送无数据FIN；接收方按序接纳全部数据和FIN，且序号不回绕。求FIN的SEQ和确认该FIN后的累计确认号。$/);
  const fin = isn + 1 + bytes, ack = fin + 1;
  assert.deepEqual([fin, ack], [1201, 1202]);
  assert.deepEqual(modelNumbers(q, /FIN序号(\d+)，确认ACK=(\d+)/), [fin, ack]);
  noIndependentExtraPoint(q, [
    point => /FIN/.test(point) && /1201/.test(point),
    point => /确认|ACK/.test(point) && /1202/.test(point),
  ]);
});

test('Q99先缓存跨回绕后区间，再补缺口，只推进实际连续前缀', () => {
  const q = question(99);
  const captures = publicNumbers(q,
    /^TCP序号按2\^(\d+)回绕。接收方当前期待2\^(\d+)−(\d+)，此前数据已连续收齐。先收到并缓存SEQ=(\d+)、载荷(\d+)B的段，再收到SEQ=2\^(\d+)−(\d+)、载荷(\d+)B的段；均不带SYN或FIN。求两次到达后发送的累计确认号。$/);
  // The first exponent and the two starting-sequence expressions must agree.
  const [width, width2, offsetBack, sequence, length, width3, offsetBack2, fillLength] = captures;
  assert.equal(width, width2); assert.equal(width, width3); assert.equal(offsetBack, offsetBack2);
  const modulus = 1n << BigInt(width), firstExpected = modulus - BigInt(offsetBack);
  const received = new Set();
  let prefix = 0;
  const expectedAcks = [];
  for (const [seq, size] of [[BigInt(sequence), length], [firstExpected, fillLength]]) {
    const start = Number((seq - firstExpected + modulus) % modulus);
    for (let index = start; index < start + size; index += 1) received.add(index);
    while (received.has(prefix)) prefix += 1;
    expectedAcks.push(String((firstExpected + BigInt(prefix)) % modulus));
  }
  assert.deepEqual(expectedAcks, ['4294967196', '60']);
  assert.equal(prefix, 160);
  const first = q.model.match(/累计确认号保持2\^32−100=(\d+)/), second = q.model.match(/累计确认号推进到(\d+)/);
  assert.ok(first && second);
  assert.deepEqual([first[1], second[1]], expectedAcks);
});

function rateEquals(value, unit, expectedBytesNumerator, expectedBytesDenominator) {
  const decimal = value.match(/^(\d+)(?:\.(\d+))?$/);
  if (!decimal) return false;
  const factor = {'B/ms': [1000n, 1n], 'B/s': [1n, 1n], 'bit/s': [1n, 8n], 'Mb/s': [125000n, 1n], 'MB/s': [1000000n, 1n]}[unit];
  if (!factor) return false;
  const numerator = BigInt(decimal[1] + (decimal[2] ?? '')), denominator = 10n ** BigInt(decimal[2]?.length ?? 0);
  return numerator * factor[0] * expectedBytesDenominator === expectedBytesNumerator * denominator * factor[1];
}

test('Q100完整轮次与持续速率分开，接受带单位等价值且不混B/b或放无单位', () => {
  const q = question(100);
  const [rttMs, window, total] = publicNumbers(q,
    /^简化模型中RTT固定(\d+)ms，有效发送窗口(\d+)B，发送端每轮RTT发满窗口且无其他限制，按完整窗口轮次计，不另计握手。传送(\d+)B应用数据至少需几轮？持续满窗时的理想数据吞吐率是多少？$/);
  const rounds = Math.ceil(total / window), numerator = BigInt(window) * 1000n, denominator = BigInt(rttMs);
  assert.equal(rounds, 10);
  assert.deepEqual(modelNumbers(q, /每轮发送(\d+)B新数据，(\d+)B需要(\d+)\/(\d+)=(\d+)个完整窗口轮次/),
    [window, total, total, window, rounds]);
  const positiveRate = q.model.match(/持续满窗的数据速率为([^。]+)。/);
  assert.ok(positiveRate);
  // The following sentence labels 1.28MB/s as an error. Compare positive claims
  // separately so a quoted misconception is never mistaken for a valid unit.
  const claims = [...positiveRate[1].matchAll(/(\d+(?:\.\d+)?)\s*(B\/ms|B\/s|bit\/s|Mb\/s|MB\/s)/g)];
  assert.ok(claims.length > 0);
  for (const [, value, unit] of claims) assert.equal(rateEquals(value, unit, numerator, denominator), true);
  for (const [value, unit] of [['160', 'B/ms'], ['160000', 'B/s'], ['1.28', 'Mb/s']]) {
    assert.equal(rateEquals(value, unit, numerator, denominator), true);
    assert.ok(q.rubric.some(point => point.includes(value + unit) || point.includes(value + ' ' + unit)), value + unit);
  }
  assert.equal(rateEquals('1.28', 'MB/s', numerator, denominator), false);
  assert.equal(rateEquals('1.28', '', numerator, denominator), false);
  assert.match(q.model, /1\.28MB\/s.*混淆.*大8倍/);
  assert.equal(q.rubric.length, 2);
  assert.ok(q.rubric.some(point => /等价|等值/.test(point) && /单位/.test(point)));
});

test('Q66用明确ACK约定处理重复0，不能从疑错课件或模型反推反馈', () => {
  const q = question(66);
  const [delivered, acknowledged, waiting, incoming, forbiddenAck] = publicNumbers(q,
    /^rdt2\.2接收方已正确交付分组(\d+)并发送ACK(\d+)，正在等待分组(\d+)。这里ACKn表示确认正确收到的分组n。此时又收到一个校验正确的分组(\d+)，应不应该再次交付？应回复哪个ACK？为什么不能回复ACK(\d+)？$/);
  assert.equal(acknowledged, delivered);
  assert.equal(waiting, 1 - delivered);
  const deliver = incoming === waiting, next = deliver ? 1 - waiting : waiting, reply = deliver ? incoming : delivered;
  assert.deepEqual({deliver, next, reply}, {deliver: false, next: 1, reply: 0});
  assert.notEqual(reply, forbiddenAck);
  assert.match(q.model, /不再次交付/);
  assert.deepEqual(modelNumbers(q, /应再次回复ACK(\d+)，/), [reply]);
  assert.deepEqual(modelNumbers(q, /不能回复ACK(\d+)，/), [forbiddenAck]);
});

test('Q81坏反馈保持旧序号等待，正确ACK才停计时，超时重传缓存的旧0', () => {
  const q = question(81);
  const [sent, waiting, proposedNew, correctAck] = publicNumbers(q,
    /^rdt3\.0发送方发出分组(\d+)后正在等待ACK(\d+)，收到一个校验失败的反馈报文。有人据此改成发送分组(\d+)。指出问题：发送方此时应保持哪个等待状态？正确ACK(\d+)和超时事件各会使它采取什么动作？$/);
  assert.equal(sent, waiting); assert.equal(correctAck, waiting); assert.equal(proposedNew, 1 - sent);
  const corrupt = {waiting, timer: 'keep', send: null};
  const success = {waitUpper: 1 - sent, timer: 'stop', send: null};
  const timeout = {waiting, timer: 'restart', send: sent};
  assert.deepEqual(modelNumbers(q, /应保持等待ACK(\d+)/), [corrupt.waiting]);
  assert.deepEqual(modelNumbers(q, /收到正确ACK(\d+)后停止计时器，转到等待上层分组(\d+)的状态/), [correctAck, success.waitUpper]);
  assert.deepEqual(modelNumbers(q, /超时时重发分组(\d+)并重新启动计时器，仍等待ACK(\d+)/), [timeout.send, timeout.waiting]);
  assert.equal(corrupt.send, null); assert.equal(success.send, null);
  assert.notEqual(timeout.send, proposedNew, '不能用新序号替代旧数据重传');
  assert.equal(q.rubric.length, 3);
});

test('Q84按各自公开的累计ACK边界解释更新式，不把两协议都盲目加1', () => {
  const q = question(84);
  assert.match(q.stem, /^一个GBN实现约定ACK\(n\)表示到编号n的分组已按序收齐；TCP连接中的ACK=x表示下一个期待的字节序号。两种发送端都用base表示最早未确认位置，本题编号不回绕。收到一份新的累计确认后，各自应怎样更新base？为什么不能直接互换这两个更新式？$/);
  const firstUnconfirmed = (ack, meaning) => meaning === 'last-received' ? ack + 1 : ack;
  assert.equal(firstUnconfirmed(42, 'last-received'), 43);
  assert.equal(firstUnconfirmed(42, 'next-expected'), 42);
  const formulas = q.model.match(/^GBN在这一定义下更新为base=([^；。]+)；TCP更新为base=([^；。]+)。/);
  assert.ok(formulas);
  assert.deepEqual(formulas.slice(1), ['n+1', 'x'], '完整公式比较，不能将错误x+1的前缀x误当正确');
  assert.match(q.model, /最后一个已确认分组/);
  assert.match(q.model, /下一期待字节/);
});

test('Q85对端重复FIN不能代替服务端本地close，CLOSE_WAIT等待方向明确', () => {
  const q = question(85);
  assert.match(q.stem, /^服务端有一条TCP连接长期停在CLOSE_WAIT。已知它正确收到客户的FIN，并已经回了ACK，但服务端应用尚未执行本地关闭。按正常关闭状态机，它在等待哪一端的什么动作？再次收到客户重复的FIN能否直接代替这个动作？$/);
  const onPeerFinAgain = {state: 'CLOSE_WAIT', action: 'ACK peer FIN again'};
  const onLocalClose = {state: 'LAST_ACK', action: 'send local FIN'};
  assert.notEqual(onPeerFinAgain.state, onLocalClose.state);
  assert.match(q.model, /服务端本地应用关闭自己的发送方向/);
  assert.match(q.model, /由服务端发送FIN/);
  assert.match(q.model, /重复客户FIN.*再次确认.*不能代替服务端本地应用的关闭动作/);
  assert.equal(q.rubric.length, 2);
  assert.ok(q.rubric.some(point => /服务端本地应用关闭/.test(point)));
  assert.ok(q.rubric.some(point => /重复FIN.*不代替本地关闭/.test(point)));
});

test('其余8个概念题保公开所问的评分范围，不额外强制四元组/探测/业务完成/固定层次', () => {
  const q = question('P-N-04');
  assert.match(q.stem, /路由器.*设置拥塞标记；接收方.*反馈给发送方/);
  assert.match(q.model, /网络辅助拥塞反馈/);
  assert.match(q.model, /拥塞可以在丢包前出现/);
  assert.equal(q.rubric.length, 2);
  assert.ok(q.rubric.some(point => /网络辅助\/显式/.test(point)));
  assert.ok(q.rubric.some(point => /不以已发生丢包为必要条件/.test(point)));

  const port = question(67);
  assert.match(port.stem, /不同主机或TCP\/UDP/);
  assert.equal(port.rubric.length, 2);
  assert.ok(port.rubric.some(point => /主机\/本地地址作用域/.test(point)));
  assert.ok(port.rubric.some(point => /传输协议区分/.test(point)));
  assert.ok(port.rubric.every(point => !/对端/.test(point)), '对端四元组可作扩展，不能变成第三个独立必答');

  const zeroWindow = question(73);
  assert.match(zeroWindow.stem, /为什么立即关闭连接不是唯一合理选择/);
  assert.equal(zeroWindow.rubric.length, 2);
  assert.ok(zeroWindow.rubric.some(point => /暂时/.test(point)));
  assert.ok(zeroWindow.rubric.some(point => /空间释放.*窗口可以重新开放/.test(point)));
  assert.ok(zeroWindow.rubric.every(point => !/探测/.test(point)), '探测扩展不强制得分');

  const lowThroughput = question(76);
  assert.match(lowThroughput.stem, /列举三种可能因素/);
  assert.match(lowThroughput.model, /RTT.*应用.*磁盘\/CPU.*路径瓶颈/);
  assert.ok(lowThroughput.rubric.some(point => /3种相互不同/.test(point)));
  assert.ok(lowThroughput.rubric.some(point => /任3种合理因素即可/.test(point)));
  assert.ok(lowThroughput.rubric.some(point => /不要求必须覆盖固定层次/.test(point)));

  const close = question(80);
  assert.match(close.stem, /比较正常FIN关闭与RST中止/);
  assert.equal(close.rubric.length, 2);
  assert.ok(close.rubric.some(point => /FIN.*一个方向.*正常结束/.test(point)));
  assert.ok(close.rubric.some(point => /RST.*重置或中止/.test(point)));
  assert.ok(close.rubric.every(point => !/应用完成|业务/.test(point)));

  const udp = question(82);
  assert.match(udp.stem, /列出并说明三类相关机制及其作用/);
  assert.ok(udp.rubric.some(point => /3类.*独立机制.*各自作用/.test(point)));
  assert.ok(udp.rubric.some(point => /接受差错检测、序号、反馈、计时、乱序缓存\/交付规则等合理组合/.test(point)));
  assert.ok(udp.rubric.some(point => /不强制额外设计未问的拥塞或缓存容量管理方案/.test(point)));

  const queue = question(83);
  assert.match(queue.stem, /总到达速率长期高于该链路的发送速率/);
  assert.match(queue.model, /到达量长期超过输出服务量.*积压会持续增加/);
  assert.equal(queue.rubric.length, 2);
  assert.ok(queue.rubric.some(point => /未丢包不能.*否认拥塞/.test(point)));
  assert.ok(queue.rubric.some(point => /到达速率大于输出速率.*队列和排队时延增长/.test(point)));

  const controls = question(70);
  assert.match(controls.stem, /根据位置与目的区分/);
  assert.equal(controls.rubric.length, 2);
  assert.ok(controls.rubric.some(point => /接收端缓存和消费能力/.test(point)));
  assert.ok(controls.rubric.some(point => /网络路径负载及拥塞风险/.test(point)));
});
