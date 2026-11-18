import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade, GRADING_VERSION} from '../grading.js';
import {mergeBackup} from '../room-progress.js';
import {submitExam, settleExam, setMark, saveExamAnswer, totalPoints} from '../sessions.js';
import {practiceType, practiceTypes} from '../practice-types.js';
import {usesAIGrading, applyAIReview, automaticAIScore} from '../ai-grading.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/typed-fill-quality-20261118.json', import.meta.url), 'utf8'));
const before = Object.fromEntries(await Promise.all(['draft', 'marking', 'settled', 'tolerated'].map(async kind => [
  kind,
  JSON.parse(await readFile(new URL('./fixtures/typed-fill-before-20261118-' + kind + '.json', import.meta.url), 'utf8')),
])));
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const empty = () => ({version: 2, attempts: [], practice: {}, tests: []});
const structuredIds = [
  'P2-structures-2-9', 'P4-structures-2-F-005', 'P4-structures-2-F-002', 'P4-structures-2-F-012',
  'P4-structures-4-F-003', 'P4-structures-4-F-006', 'P4-structures-5-F-010', 'P4-structures-9-F-014',
  'P4-structures-10-F-003', 'P4-structures-10-F-004', 'P4-structures-10-F-010',
  'P4-structures-11-F-006', 'P4-structures-11-F-011',
  'P4-structures-12-F-001', 'P4-structures-12-F-002', 'P4-structures-12-F-003',
  'NC7-network-control-F-005', 'P6-network-7-F-010',
];
const digitalIds = [
  'P4-digital-1-F-001', 'P4-digital-1-F-002', 'P4-digital-1-F-015', 'P4-digital-1-F-017',
  'P4-digital-1-R-008', 'P4-digital-1-R-001', 'P4-digital-1-C-014',
];
const items = new Map(fixture.items.map(item => [item.id, item]));
const courses = new Map(['structures', 'network', 'digital'].map(subject => {
  const revisions = Object.fromEntries(fixture.items.filter(item => item.subject === subject).map(item => [item.id, item.baseRevision]));
  return [subject, {
    // Later chapter reviews retain this earlier structured-format revision.
    current: getPracticeCourse(subject,{questionRevisions:Object.fromEntries(
      fixture.items.filter(item=>item.subject===subject&&[
        'P4-structures-4-F-003','P4-structures-4-F-006','P4-structures-10-F-004','P4-structures-10-F-010','P4-structures-11-F-006'
      ].includes(item.id)).map(item=>[item.id,item.revision]))}),
    historical: getPracticeCourse(subject, {questionRevisions: revisions}),
  }];
}));
function question(id, historical = false) {
  const item = items.get(id);
  assert.ok(item, id);
  const q = courses.get(item.subject)[historical ? 'historical' : 'current'].questions.find(q => q.id === id);
  assert.ok(q, id);
  return q;
}
function expectAnswer(id, answer, correct) {
  const q = question(id), photo = hash(q);
  const result = grade(q, [answer]);
  assert.equal(result.correct, correct, id + ': ' + JSON.stringify(answer));
  assert.equal(result.status, correct ? 'correct' : 'wrong');
  assert.equal(result.correctBlanks, correct ? 1 : 0);
  assert.equal(hash(q), photo, '评分不可改写题目快照');
}

test('本轮25题默认新版本和显式旧版本全部字段锁定，题号/题型/章节不增改', () => {
  assert.equal(fixture.authorityHtmlSha256, 'e48ec0b993b242d2de1164c664fad17ad3586e161816b25f5a2df9f3388a3576');
  assert.equal(fixture.items.length, 25);
  assert.deepEqual([...items.keys()].sort(), [...structuredIds, ...digitalIds].sort());
  assert.deepEqual(fixture.items.filter(item => item.kind === 'structured-fill').map(item => item.id).sort(), [...structuredIds].sort());
  assert.deepEqual(fixture.items.filter(item => item.kind === 'numbers-quality').map(item => item.id).sort(), [...digitalIds].sort());
  for (const item of fixture.items) {
    const current = question(item.id), historical = question(item.id, true);
    assert.equal(current.revision, item.revision, item.id);
    assert.equal(historical.revision ?? 1, item.baseRevision, item.id);
    assert.equal(item.revision, item.baseRevision + 1, item.id);
    assert.equal(hash(current), item.newQuestionSha256, item.id + '新版完整字段');
    assert.equal(hash(historical), item.baseQuestionSha256, item.id + '旧版完整字段');
    assert.equal(current.type, item.type);
    assert.equal(current.chapter, item.chapter);
    assert.equal(current.type, historical.type);
    assert.equal(current.chapter, historical.chapter);
    assert.equal(current.section, historical.section);
    assert.deepEqual(practiceQuestionRevisions[item.id][item.revision], item.patch);
  }
  for (const [subject, {current, historical}] of courses) {
    assert.deepEqual(current.questions.map(q => q.id).sort(), historical.questions.map(q => q.id).sort(), subject);
    const item = fixture.items.find(item => item.subject === subject);
    assert.throws(() => getPracticeCourse(subject, {questionRevisions: {[item.id]: 999}}), /版本/);
  }
});

test('四份修前fixture的32张答卷逐字段恢复，包含旧宽容100与首次0且不改输入', () => {
  assert.deepEqual(Object.values(before).map(data => data.tests.length), [10, 10, 10, 2]);
  assert.equal(Object.values(before).flatMap(data => data.tests).length, 32);
  for (const [kind, data] of Object.entries(before)) {
    const current = empty(), currentPhoto = structuredClone(current), inputPhoto = structuredClone(data);
    const restored = mergeBackup(current, data);
    assert.deepEqual(restored, data, kind + '整个备份逐字段恢复');
    assert.deepEqual(current, currentPhoto, '不得改写本地输入');
    assert.deepEqual(data, inputPhoto, '不得改写导入输入');
    assert.equal(totalPoints([...restored.attempts, ...restored.tests]), 0, kind + '章节成绩不计考试积分');
    for (const attempt of restored.tests) {
      assert.equal(attempt.gradingVersion, 2);
      for (const q of attempt.questions) {
        const historical = question(q.id, true);
        const {points, ...snapshot} = q;
        assert.ok(Number.isInteger(points) && points > 0);
        assert.equal(attempt.practicePlan.version, 2);
        const section = practiceTypes.find(kind => kind.id === practiceType(attempt.subject, historical)).name;
        assert.deepEqual(snapshot, {...historical, section}, q.id + '沿实际旧题及原组卷题型名称，不换用新版格式/答案');
      }
    }
  }
});

test('旧草稿和待结算卷继续按旧题评分，旧已结算100/0保持锁定且章节积分仍0', () => {
  for (const kind of ['draft', 'marking']) {
    const restored = mergeBackup(empty(), before[kind]);
    for (const attempt of restored.tests) {
      if (attempt.status === 'active') submitExam(attempt, attempt.startedAt + 1);
      assert.equal(attempt.status, 'marking');
      for (const q of attempt.questions) {
        if (q.type === 'short') {
          assert.equal(usesAIGrading(attempt), true, '本批修前数电卷本来已启用AI评分');
          assert.equal(setMark(attempt, q.id, q.points), false);
          // 只复用修前已保存回执，验证旧题/原答案/分值的协议兼容，不重新请求AI评阅。
          const settled = before.settled.tests.find(old => old.id === attempt.id);
          const receipt = settled.aiReviews[q.id];
          assert.equal(applyAIReview(attempt, receipt), true);
          assert.equal(automaticAIScore(attempt, q), q.points);
        } else {
          assert.equal(attempt.marks[q.id], q.points, q.id + '原答案依旧满分');
        }
      }
      const result = settleExam(attempt);
      assert.equal(result.total, 100);
      assert.strictEqual(settleExam(attempt), result, '结算结果应复用');
    }
    assert.equal(totalPoints(restored.tests), 0);
  }
  for (const kind of ['settled', 'tolerated']) {
    const restored = mergeBackup(empty(), before[kind]);
    for (const attempt of restored.tests) {
      const photo = structuredClone(attempt), result = attempt.result;
      assert.strictEqual(settleExam(attempt), result);
      assert.strictEqual(submitExam(attempt, attempt.startedAt + 1), attempt);
      assert.equal(setMark(attempt, attempt.questions[0].id, attempt.questions[0].points), false);
      assert.equal(saveExamAnswer(attempt, attempt.questions[0].id, ['changed'], attempt.startedAt + 1), false);
      assert.deepEqual(attempt, photo, '首结算后的答案/分数/时间/快照均保持');
    }
    assert.equal(totalPoints(restored.tests), 0);
  }
  const [tolerated, firstZero] = before.tolerated.tests;
  assert.equal(tolerated.result.total, 100);
  assert.equal(firstZero.result.total, 0);
});

test('再次导入合法相反分数不覆盖本地首次100或0，旧快照注入新格式/版本必须拒绝', () => {
  const current = mergeBackup(empty(), before.tolerated);
  for (const original of current.tests) {
    const incoming = structuredClone(original);
    const newTotal = original.result.total === 0 ? 100 : 0;
    for (const q of incoming.questions) {
      incoming.answers[q.id] = [newTotal === 100 ? q.answers[0][0] : '__wrong__'];
      incoming.marks[q.id] = newTotal === 100 ? q.points : 0;
      incoming.result.scores[q.id] = incoming.marks[q.id];
    }
    incoming.result.total = newTotal;
    const imported = {...empty(), tests: [incoming]};
    const currentPhoto = structuredClone(current), importedPhoto = structuredClone(imported);
    const merged = mergeBackup(current, imported);
    assert.deepEqual(merged.tests, current.tests, '已有首次成绩优先，不能取新分或较高分');
    assert.deepEqual(current, currentPhoto);
    assert.deepEqual(imported, importedPhoto);
    assert.equal(totalPoints(merged.tests), 0);
  }
  const injectedFormat = structuredClone(before.draft);
  injectedFormat.tests[0].questions[0].formats = ['c-tokens'];
  assert.throws(() => mergeBackup(empty(), injectedFormat), /题目|版本|内容/);
  const injectedRevision = structuredClone(before.draft);
  const q = injectedRevision.tests[0].questions[0];
  q.revision = question(q.id).revision;
  assert.throws(() => mergeBackup(empty(), injectedRevision), /题目|版本|内容/);
});

test('18题默认grade逐一接受明确合法alias，C大小写/标记拆开/额外标点均拒绝', () => {
  const modes = new Map();
  for (const id of structuredIds) {
    const q = question(id);
    assert.equal(q.type, 'fill');
    assert.equal(q.answers.length, 1);
    const format = q.formats[0];
    assert.ok(['c-tokens', 'integer-sequence', 'integer-set'].includes(format), id);
    modes.set(format, (modes.get(format) ?? 0) + 1);
    for (const alias of q.answers[0]) expectAnswer(id, alias, true);
  }
  assert.deepEqual(Object.fromEntries(modes), {'c-tokens': 2, 'integer-sequence': 12, 'integer-set': 4});
  for (const wrong of [
    'HEAD->NEXT==NULL', 'head->next==null', 'he ad->next==NULL', 'head - >next==NULL',
    'head->next= =NULL', 'head->next==N U L L', 'head->next==NULL;', 'head->next==NULL,',
  ]) expectAnswer('P2-structures-2-9', wrong, false);
  expectAnswer('P2-structures-2-9', 'head /* node */ -> next == NULL // check', true);
  for (const wrong of ['NEXT', 'ne xt', 'ne\nxt', 'ne/**/xt', 'next;', 'next,']) {
    expectAnswer('P4-structures-2-F-005', wrong, false);
  }
  expectAnswer('P4-structures-2-F-005', 'ne\\\nxt', true);
  expectAnswer('P4-structures-2-F-005', 'next/* field */', true);
});

test('默认整数题保数量/重复/序次和分隔样式，不派生未授权括号组合', () => {
  for (const wrong of ['41,7,2,9', '4,17,2,9', '4,1,7,29', '4,1,7,2,9,9', '4 1 7 2 9', '4,1 7,2,9']) {
    expectAnswer('P4-structures-2-F-002', wrong, false);
  }
  expectAnswer('P4-structures-2-F-002', '4,\n1,7,\r\n2,9', true);
  for (const wrong of ['1,2,4,6,7', '12,4,4,6,7', '1,2,4,4,4,6,7', '2,1,4,4,6,7']) {
    expectAnswer('P4-structures-2-F-012', wrong, false);
  }
  expectAnswer('P4-structures-4-F-006', '0 0 1 2', true);
  expectAnswer('P4-structures-4-F-006', '00,1,2', false);
  expectAnswer('P4-structures-4-F-006', '0,1,2', false);
  expectAnswer('P4-structures-9-F-014', '70', false);
  expectAnswer('P4-structures-10-F-003', '21,3', false);
  for (const legal of ['5,2,-4', '(5,2,-4)', '（5，2，-4）', '5 2 -4']) {
    expectAnswer('P4-structures-5-F-010', legal, true);
  }
  for (const wrong of ['(5 2 -4)', '[5,2,-4]', '{5,2,-4}', '5,2 -4', '5,2,- 4']) {
    expectAnswer('P4-structures-5-F-010', wrong, false);
  }
  for (const legal of ['65010 65020 65030', '65010,65020,65030']) {
    expectAnswer('NC7-network-control-F-005', legal, true);
  }
  for (const wrong of ['6501065020 65030', '65020 65010 65030', '65010,65020 65030']) {
    expectAnswer('NC7-network-control-F-005', wrong, false);
  }
  for (const wrong of ['(-1,-1,1,1)', '-1 -1 1 1', '-1,-11,1', '1,-1,1,-1']) {
    expectAnswer('P6-network-7-F-010', wrong, false);
  }
});

test('外部排序候选三元组新版按既有元组写法收括号，旧版仍按原格式判分', () => {
  const id = 'P4-structures-11-F-006';
  const old = question(id);
  const current = getPracticeCourse('structures').questions.find(q => q.id === id);
  assert.equal(old.revision, 2);
  assert.equal(current.revision, 3);
  assert.equal(grade(old, ['(2,7,3)']).correct, false);
  for (const valid of ['2,7,3', '2 7 3', '(2,7,3)', '（2，7，3）']) assert.equal(grade(current, [valid]).correct, true);
  for (const invalid of ['[2,7,3]', '(2,3,7)', '(2,7,3,3)']) assert.equal(grade(current, [invalid]).correct, false);
});

test('内部排序序列新版收方括号，旧版保持原格式，仍检查元素次序', () => {
  const current = getPracticeCourse('structures').questions;
  for (const [id, expected, wrong] of [
    ['P4-structures-10-F-004', '[1,2,4,5]', '[1,2,5,4]'],
    ['P4-structures-10-F-010', '[21,12,13]', '[21,13,12]'],
  ]) {
    const old = question(id), revised = current.find(q => q.id === id);
    assert.equal(old.revision, 2);
    assert.equal(revised.revision, 3);
    assert.equal(grade(old, [expected]).correct, false);
    assert.equal(grade(revised, [expected]).correct, true);
    assert.equal(grade(revised, [wrong]).correct, false);
  }
});

test('四道集合仅允许换序，额外重复/缺成员/包围符/未授权分隔都不能去重放行', () => {
  const cases = [
    ['P4-structures-4-F-003', '4,2', ['2,4,4', '2,2', '4 2', '(4,2)']],
    ['P4-structures-12-F-001', '9,6', ['6,9,9', '6,6', '9 6', '(9,6)']],
    ['P4-structures-12-F-002', '5,1,3', ['1,3,3', '1,3,5,5', '5 1 3', '(5,1,3)']],
    ['P4-structures-12-F-003', '5,1', ['1,1', '1,5,5', '(5,1)', '5,1,']],
  ];
  for (const [id, legal, wrong] of cases) {
    expectAnswer(id, legal, true);
    for (const answer of wrong) expectAnswer(id, answer, false);
  }
  expectAnswer('P4-structures-12-F-003', '5 1', true);
});

test('新逻辑由题目formats控制且全局版本仍2；显式旧题继续原宽容，不反写旧成绩', () => {
  assert.equal(GRADING_VERSION, 2);
  for (const id of structuredIds) {
    const current = question(id), historical = question(id, true);
    const oldAlias = String(historical.answers[0][0]);
    const oldTolerated = current.formats[0] === 'c-tokens' ? oldAlias.toUpperCase() : oldAlias.replace(/[\s,，]/g, '');
    for (const version of [1, 2]) {
      assert.equal(grade(historical, [oldTolerated], version).correct, true, id + '旧题/评分版' + version);
      assert.equal(grade(current, [oldTolerated], version).correct, false, id + '新格式/评分版' + version);
    }
  }
  const legacyText = {type: 'fill', answers: [['A,B']], formats: ['text']};
  assert.equal(grade(legacyText, ['a b']).correct, true, '旧文本规则未整体收紧');
  const legacyNumber = {type: 'fill', answers: [['1.20']], formats: ['number']};
  assert.equal(grade(legacyNumber, ['+1.200'], 2).correct, true);
  assert.equal(grade(legacyNumber, ['+1.200'], 1).correct, false);
  assert.equal(grade(legacyNumber, ['1.200'], 1).correct, true);
});
