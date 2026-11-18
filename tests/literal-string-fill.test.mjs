import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
import {grade, GRADING_VERSION, validAnswer} from '../grading.js';
import {formattedFillEqual} from '../fill-answer-formats.js';
import {mergeBackup} from '../room-progress.js';
import {settleExam, submitExam, saveExamAnswer, setMark, totalPoints} from '../sessions.js';

const ids = ['P4-structures-4-F-004', 'P4-structures-4-F-012', 'P4-structures-4-F-013', 'P4-structures-4-F-014'];
// Explicit original revisions keep this test independent of when the mainline
// registers new question metadata. Only the format is changed in synthetic
// comparison cases; those cases are not claimed to be real revision2 questions.
const pool = getPracticeCourse('structures', {questionRevisions: Object.fromEntries(ids.map(id => [id, 1]))});
const originals = new Map(ids.map(id => [id, pool.questions.find(q => q.id === id)]));
const legacyBackup = JSON.parse(await readFile(new URL('./fixtures/string-literal-before-20261118.json', import.meta.url), 'utf8'));
const literal = (actual, expected) => formattedFillEqual('literal-string', actual, expected);
const synthetic = q => ({...q, formats: ['literal-string']});
const emptyRoom = () => ({version: 2, attempts: [], tests: [], practice: {}});

function independentlySolve(q) {
  let matched;
  if (q.id === ids[0]) {
    matched = q.stem.match(/^串([A-Za-z]+)的最长相等真前缀与后缀是____。$/);
    assert.ok(matched);
    const text = matched[1];
    for (let length = text.length - 1; length > 0; length -= 1) {
      if (text.slice(0, length) === text.slice(-length)) return text.slice(0, length);
    }
    return '';
  }
  if (q.id === ids[1]) {
    matched = q.stem.match(/^以1起始位置(\d+)开始，从串([A-Za-z]+)中删除(\d+)个字符，结果为____。$/);
    assert.ok(matched);
    const first = Number(matched[1]) - 1, length = Number(matched[3]), text = matched[2];
    return text.slice(0, first) + text.slice(first + length);
  }
  if (q.id === ids[2]) {
    matched = q.stem.match(/^在串([A-Za-z]+)的第(\d+)项之前插入([A-Za-z]+)，结果为____。$/);
    assert.ok(matched);
    const before = Number(matched[2]) - 1, text = matched[1], insertion = matched[3];
    return text.slice(0, before) + insertion + text.slice(before);
  }
  matched = q.stem.match(/^将串([A-Za-z]+)逆置，结果为____。$/);
  assert.ok(matched);
  return [...matched[1]].reverse().join('');
}
const solved = new Map(ids.map(id => {
  const q = originals.get(id);
  assert.ok(q, id);
  return [id, independentlySolve(q)];
}));

test('原4实际题绑定显式revision1和严格题面独算，原值在旧text/派生新格式都正确', () => {
  assert.deepEqual([...solved.values()], ['aba', 'aef', 'abXYcd', 'acba']);
  const snapshot = new Map(legacyBackup.tests[0].questions.map(q => {
    const {points, ...original} = q;
    return [q.id, original];
  }));
  for (const id of ids) {
    const q = originals.get(id), value = solved.get(id);
    assert.equal(q.revision, 1);
    assert.equal(q.chapter, 4);
    assert.equal(q.type, 'fill');
    assert.deepEqual(q.formats, ['text']);
    assert.deepEqual(q.answers, [[value]]);
    assert.deepEqual(q, snapshot.get(id), id + '原题完整字段不得被新元数据覆盖');
    assert.equal(grade(q, [value]).correct, true);
    assert.equal(grade(synthetic(q), [value]).correct, true);
  }
});

test('8份大小写/内部空格反例复现旧text误收，派生literal-string全部拒绝', () => {
  let formerlyAccepted = 0;
  for (const id of ids) {
    const q = originals.get(id), value = solved.get(id), typed = synthetic(q);
    for (const wrong of [value.toUpperCase(), value.slice(0, 1) + ' ' + value.slice(1)]) {
      assert.notEqual(wrong, value);
      assert.equal(grade(q, [wrong]).correct, true, id + '旧行为复现');
      assert.equal(grade(typed, [wrong]).correct, false, id + '新显式格式');
      formerlyAccepted += 1;
    }
    assert.deepEqual(q.formats, ['text'], '派生题不能改写原题');
  }
  assert.equal(formerlyAccepted, 8);
  assert.equal(grade(synthetic(originals.get(ids[2])), ['abxycd']).correct, false, '插入XY不能统一小写');
});

test('首尾和内部所有空白都是串字符，不trim也不把换行/制表符折成空格', () => {
  const whitespace = [' ', '\t', '\n', '\r', '\v', '\f', '\r\n', '\u00a0', '\u3000', '\ufeff'];
  for (const id of ids) {
    const value = solved.get(id), q = synthetic(originals.get(id));
    for (const separator of whitespace) {
      for (const wrong of [separator + value, value + separator, value.slice(0, 1) + separator + value.slice(1)]) {
        assert.equal(literal(wrong, value), false, id + ': ' + JSON.stringify(wrong));
        assert.equal(grade(q, [wrong]).correct, false);
      }
    }
  }
  assert.equal(literal(' a ', ' a '), true);
  assert.equal(literal('a', ' a '), false);
  assert.equal(literal('a b', 'a b'), true);
  assert.equal(literal('a  b', 'a b'), false);
  assert.equal(literal('a\tb', 'a b'), false);
  assert.equal(literal('a\r\nb', 'a\nb'), false, '纯比较器不进行换行转换；DOM链由主线另测');
});

test('引号/标点/注释/转义/反斜线续行都按数据比较，不能借C-token处理', () => {
  for (const id of ids) {
    const value = solved.get(id), q = synthetic(originals.get(id));
    const comment = value + '/*x*/', continuation = value[0] + '\\\n' + value.slice(1);
    for (const wrong of [
      '"' + value + '"', "'" + value + "'", '“' + value + '”', comment, continuation,
      value + ',', value + ';', value.slice(0, 1) + '，' + value.slice(1),
    ]) assert.equal(grade(q, [wrong]).correct, false, JSON.stringify(wrong));
    assert.equal(formattedFillEqual('c-tokens', comment, value), true);
    assert.equal(formattedFillEqual('c-tokens', continuation, value), true);
    assert.equal(literal(comment, value), false);
    assert.equal(literal(continuation, value), false);
  }
  assert.equal(literal('a\\nb', 'a\nb'), false);
  assert.equal(literal('\\u0061ba', 'aba'), false);
  assert.equal(literal('\\x61ba', 'aba'), false);
  assert.equal(literal('a/*b*/c', 'a/*b*/c'), true, '这些字符不是全局禁用，而是不得被忽略');
  assert.equal(literal('"a"', '"a"'), true, '预期串本身有引号时照常逐字符比较');
});

test('Unicode原字符保持，NFC/NFKC/全角/同形或隐藏字符不产生隐式等价', () => {
  for (const id of ids) {
    const value = solved.get(id), q = synthetic(originals.get(id));
    const fullwidth = [...value].map(ch => String.fromCharCode(ch.charCodeAt(0) + 0xfee0)).join('');
    assert.equal(grade(originals.get(id), [fullwidth]).correct, true, '旧NFKC宽容行为保留');
    assert.equal(grade(q, [fullwidth]).correct, false);
    assert.equal(grade(q, [value[0] + '\u200b' + value.slice(1)]).correct, false);
  }
  assert.equal(literal('aᵇa', 'aba'), false);
  assert.equal(literal('é', 'e\u0301'), false);
  assert.equal(literal('αba', 'aba'), false);
  assert.equal(literal('中文 A🙂', '中文 A🙂'), true);
  assert.equal(literal('中文 a🙂', '中文 A🙂'), false);
});

test('两侧都必须是string，不调用对象转字符串；空答完成检测不由本格式擅改', () => {
  const throwing = {toString() { throw new Error('literal comparator must not coerce objects'); }};
  for (const value of [undefined, null, 42, 42n, true, false, NaN, Infinity, {}, [], ['aba'], new String('aba'), Symbol('aba'), throwing]) {
    assert.equal(literal(value, 'aba'), false);
    assert.equal(literal('aba', value), false);
    assert.equal(literal(value, value), false);
  }
  assert.equal(literal('42', '42'), true);
  assert.equal(literal(42, '42'), false);
  assert.equal(literal('42', 42), false);
  assert.equal(literal('', ''), true, '纯===比较器不承担作答完成检测');
  for (const q of originals.values()) {
    assert.equal(validAnswer(q, ['']), false);
    assert.equal(grade(synthetic(q), ['']).correct, false, '本4题的正确值均非空');
  }
});

test('新格式由每空formats控制，GRADING_VERSION仍2且旧text/未知格式回退不改', () => {
  assert.equal(GRADING_VERSION, 2);
  assert.equal(formattedFillEqual('text', 'ABA', 'aba'), null);
  assert.equal(formattedFillEqual('number', '1', '1'), null);
  assert.equal(formattedFillEqual('future-unknown-format', 'aba', 'aba'), null);
  for (const q of originals.values()) {
    const wrong = solved.get(q.id).toUpperCase();
    for (const version of [1, 2]) {
      assert.equal(grade(q, [wrong], version).correct, true);
      assert.equal(grade(synthetic(q), [wrong], version).correct, false);
    }
  }
});

test('仓库内原创旧100/0答卷逐字段恢复并锁定首分，章节成绩仍不计考试积分', () => {
  assert.equal(legacyBackup.tests.length, 2);
  assert.deepEqual(legacyBackup.tests.map(attempt => attempt.result.total), [100, 0]);
  const current = emptyRoom(), currentPhoto = structuredClone(current), inputPhoto = structuredClone(legacyBackup);
  const restored = mergeBackup(current, legacyBackup);
  assert.deepEqual(restored, legacyBackup);
  assert.deepEqual(current, currentPhoto);
  assert.deepEqual(legacyBackup, inputPhoto);
  for (const attempt of restored.tests) {
    assert.deepEqual(attempt.questions.map(q => q.id).sort(), [...ids].sort());
    const photo = structuredClone(attempt), result = attempt.result;
    assert.strictEqual(settleExam(attempt), result);
    assert.strictEqual(submitExam(attempt, attempt.startedAt + 1), attempt);
    assert.equal(setMark(attempt, attempt.questions[0].id, 0), false);
    assert.equal(saveExamAnswer(attempt, attempt.questions[0].id, ['changed'], attempt.startedAt + 1), false);
    assert.deepEqual(attempt, photo);
    for (const q of attempt.questions) {
      assert.equal(q.revision, 1);
      assert.deepEqual(q.formats, ['text']);
    }
  }
  assert.equal(totalPoints(restored.tests), 0);
});
