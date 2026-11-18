import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {mergeBackup} from '../room-progress.js';
import {practiceType, practiceTypes} from '../practice-types.js';
import {submitExam, settleExam, saveExamAnswer, setMark, totalPoints} from '../sessions.js';
import {applyAIReview, automaticAIScore, reviewRubric, usesAIGrading} from '../ai-grading.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/network-transport-quality-20261118.json', import.meta.url), 'utf8'));
const before = Object.fromEntries(await Promise.all(['draft', 'marking', 'settled'].map(async state => [
  state, JSON.parse(await readFile(new URL('./fixtures/transport-before-20261118-' + state + '.json', import.meta.url), 'utf8')),
])));
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const empty = () => ({version: 2, attempts: [], practice: {}, tests: []});
const originals = new Map(fixture.entries.map(row => [row.id, row.original]));
const revisions = Object.fromEntries(fixture.entries.map(row => [row.id, row.baseRevision]));
const historical = new Map(getPracticeCourse('network', {questionRevisions: revisions}).questions.map(q => [q.id, q]));

test('运输层103个真实旧1题和6张修前快照完整绑定，保留原字段的缺省状态', () => {
  assert.equal(fixture.authorityHtmlSha256, 'a1b8afcba948a9847df787f2a18a63ad66b212313d221982e28bb66413044c7c');
  assert.equal(fixture.entries.length, 103);
  assert.equal(originals.size, 103);
  assert.equal(fixture.items.length, 71);
  for (const row of fixture.entries) {
    assert.equal(row.baseRevision, 1);
    assert.equal(row.original.revision ?? 1, 1);
    assert.ok(!row.original.reference, row.id + '只能包含原创题载荷，旧题可无origin字段');
    assert.deepEqual(historical.get(row.id), row.original, row.id + '显式旧1全部字段');
    assert.equal(digest(historical.get(row.id)), row.baseQuestionSha256);
  }
  let snapshots = 0;
  for (const [state, data] of Object.entries(before)) {
    assert.equal(data.tests.length, 2, state);
    assert.deepEqual(data.tests.map(a => a.questions.length), [52, 51]);
    const ids = [];
    for (const attempt of data.tests) {
      snapshots++;
      assert.equal(attempt.kind, 'chapter');
      assert.equal(attempt.deadline, null);
      assert.equal(attempt.subject, 'network');
      assert.equal(attempt.chapter, 3);
      assert.equal(attempt.practicePlan.version, 2);
      assert.ok(attempt.questions.length <= 100);
      assert.equal(attempt.questions.reduce((sum, q) => sum + q.points, 0), 100);
      for (const q of attempt.questions) {
        const old = historical.get(q.id);
        assert.ok(old, q.id);
        const section = practiceTypes.find(kind => kind.id === practiceType('network', old)).name;
        assert.deepEqual(q, {...old, section, points: q.points}, q.id + '组卷只适配分值和题型名称');
        assert.equal(q.revision ?? 1, 1);
        assert.ok(!q.reference && !q.judge);
        ids.push(q.id);
      }
    }
    assert.equal(ids.length, 103);
    assert.equal(new Set(ids).size, 103);
    assert.deepEqual(ids.sort(), [...originals.keys()].sort(), state + '完整覆盖103题，不截到100');
  }
  assert.equal(snapshots, 6);
});

test('运输层三状态6张备份真实merge逐字段恢复，不修改任一输入且章积分为0', () => {
  for (const [state, incoming] of Object.entries(before)) {
    const current = empty(), currentPhoto = structuredClone(current), inputPhoto = structuredClone(incoming);
    const restored = mergeBackup(current, incoming);
    assert.deepEqual(restored, incoming, state + '整个答卷包含旧题面/答案/格式/评分方式');
    assert.deepEqual(current, currentPhoto);
    assert.deepEqual(incoming, inputPhoto);
    assert.equal(totalPoints([...restored.attempts, ...restored.tests]), 0);
  }
});

test('旧草稿及待评卷沿旧1评分点结算100，主观回执仅验证兼容而不请求模型', () => {
  for (const state of ['draft', 'marking']) {
    const restored = mergeBackup(empty(), before[state]);
    for (const attempt of restored.tests) {
      if (attempt.status === 'active') submitExam(attempt, attempt.startedAt + 1);
      assert.equal(attempt.status, 'marking');
      assert.equal(usesAIGrading(attempt), true);
      const settled = before.settled.tests.find(a => a.id === attempt.id);
      for (const q of attempt.questions) {
        if (q.type === 'short') {
          const receipt = settled.aiReviews[q.id];
          assert.match(receipt.feedback, /模拟.*不代表真实模型/);
          assert.equal(receipt.revision, q.revision ?? 1);
          assert.equal(setMark(attempt, q.id, q.points), false);
          assert.equal(applyAIReview(attempt, receipt), true, q.id + '只重用保存的兼容模拟回执');
          assert.equal(automaticAIScore(attempt, q), q.points);
        } else assert.equal(attempt.marks[q.id], q.points, q.id + '修前答案依旧按旧题满分');
      }
      const result = settleExam(attempt);
      assert.equal(result.total, 100);
      assert.strictEqual(settleExam(attempt), result);
    }
    assert.equal(totalPoints(restored.tests), 0);
  }
});

test('旧结算卷的答案、题面、首分和时间不因再次提交/重做保存/结算而变化', () => {
  const restored = mergeBackup(empty(), before.settled);
  for (const attempt of restored.tests) {
    const photo = structuredClone(attempt), result = attempt.result;
    assert.equal(result.total, 100);
    assert.strictEqual(submitExam(attempt, attempt.startedAt + 5), attempt);
    assert.equal(saveExamAnswer(attempt, attempt.questions[0].id, '__retry__', attempt.startedAt + 6), false);
    assert.equal(setMark(attempt, attempt.questions[0].id, 0), false);
    assert.strictEqual(settleExam(attempt), result);
    assert.deepEqual(attempt, photo);
  }
  assert.equal(totalPoints(restored.tests), 0);
});

// This is a protocol compatibility fixture, not an independent answer oracle or
// real model evaluation. Use the actual submit/apply/settle chain so a conflict
// is itself importable and cannot be dismissed as an invalid score injection.
function compatibleFirstScore(total) {
  const attempt = structuredClone(before.draft.tests.find(a => a.questions.some(q => q.type === 'short')));
  attempt.answers = {};
  attempt.marks = {};
  let left = total;
  const scores = new Map();
  for (const q of attempt.questions) {
    const score = q.type === 'short' ? Math.min(left, q.points) : q.points <= left ? q.points : 0;
    scores.set(q.id, score);
    left -= score;
    if (!score) continue;
    const answer = q.type === 'short' ? q.model : q.type === 'single' ? q.answer : q.answers.map(v => v[0]);
    assert.equal(saveExamAnswer(attempt, q.id, answer, attempt.startedAt), true);
  }
  assert.equal(left, 0);
  submitExam(attempt, attempt.startedAt + 1);
  for (const q of attempt.questions.filter(q => q.type === 'short' && scores.get(q.id) > 0)) {
    const score = scores.get(q.id);
    assert.equal(applyAIReview(attempt, {
      version: 1, grader: 'codex', questionId: q.id, revision: q.revision ?? 1,
      language: 'c', answer: attempt.answers[q.id], points: q.points, score,
      feedback: '仅用于首次成绩兼容检查的模拟回执，不代表真实模型评阅。',
      criteria: reviewRubric(q).map((_, index) => ({index, verdict: score === q.points ? 'met' : 'partial', comment: '仅协议兼容模拟。'})),
    }), true);
  }
  assert.equal(settleExam(attempt).total, total);
  return attempt;
}

test('合法同批0/17与100分冲突导入始终保留本地首次成绩，而非取最高分', () => {
  for (const score of [0, 17]) {
    const low = compatibleFirstScore(score), high = before.settled.tests.find(a => a.id === low.id);
    assert.ok(high);
    const lowBackup = {...empty(), tests: [low]}, highBackup = {...empty(), tests: [high]};
    assert.equal(mergeBackup(empty(), lowBackup).tests[0].result.total, score, '低分备份自身合法');
    for (const [current, incoming, kept] of [[lowBackup, highBackup, score], [highBackup, lowBackup, 100]]) {
      const currentPhoto = structuredClone(current), inputPhoto = structuredClone(incoming);
      const restored = mergeBackup(current, incoming);
      assert.deepEqual(restored.tests, current.tests);
      assert.equal(restored.tests[0].result.total, kept);
      assert.equal(totalPoints(restored.tests), 0);
      assert.deepEqual(current, currentPhoto);
      assert.deepEqual(incoming, inputPhoto);
    }
  }
});

test('未知未来题目版本及篡改的旧1内容不能伪装成可恢复历史快照', () => {
  const changedId = fixture.items[0].id;
  for (const mutate of [q => {q.revision = 999;}, q => {q.stem += '\n伪造旧题内容';}, q => {q.revision = 2;}]) {
    const incoming = structuredClone(before.draft), q = incoming.tests.flatMap(a => a.questions).find(q => q.id === changedId);
    assert.ok(q);
    mutate(q);
    assert.throws(() => mergeBackup(empty(), incoming), /版本|题目|内容/);
  }
});
