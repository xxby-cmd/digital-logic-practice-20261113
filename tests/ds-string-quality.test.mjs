import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade, GRADING_VERSION} from '../grading.js';
import {dsTaskGuide} from '../ds-coding-task-guides.js';
import {dsStringTaskGuides} from '../ds-string-task-guides.js';
import {dsAnalysisTaskGuides} from '../ds-analysis-task-guides.js';
import {dsStringQualityTaskGuides} from '../ds-string-quality-task-guides.js';
import {hasJudgeContract} from '../coding-catalog.js';
import {codeTaskGuide, codeEditor, isProgrammingQuestion} from '../code-editor.js';
import {waveThreePractice} from '../bank-wave-03.js';
import {reviseQuestionLanguage} from '../question-language.js';

const fixture = JSON.parse(await readFile(new URL('./fixtures/ds-string-quality-20261118.json', import.meta.url), 'utf8'));
const stable = value => Array.isArray(value) ? value.map(stable)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const entries = new Map(fixture.entries.map(row => [row.id, row]));
const items = new Map(fixture.items.map(row => [row.id, row]));
const current = new Map(getPracticeCourse('structures').questions.filter(q => String(q.chapter) === '4' && !q.reference).map(q => [q.id, q]));
const historical = new Map(getPracticeCourse('structures', {
  questionRevisions: Object.fromEntries(fixture.entries.map(row => [row.id, row.baseRevision])),
}).questions.map(q => [q.id, q]));
const programIds = [4, 6, 7, 8, 9].map(n => `P4-structures-4-D-${String(n).padStart(3, '0')}`);
const literalIds = [4, 12, 13, 14, 15].map(n => `P4-structures-4-F-${String(n).padStart(3, '0')}`);

test('串33道真实默认修订与80道完整旧题锁定字段和SHA，其余47题保持', () => {
  assert.equal(fixture.baselineHtmlSha256, '9f13d426e53366c89c08f9478d16dc5e1c196da0941c900d302bb71f782786f0');
  assert.equal(fixture.chapter, 4);
  assert.equal(fixture.originalCount, 80);
  assert.equal(entries.size, 80);
  assert.equal(fixture.entries.length, 80);
  assert.equal(items.size, 33);
  assert.equal(fixture.items.length, 33);
  assert.equal(current.size, 80);
  assert.deepEqual([...current.keys()].sort(), [...entries.keys()].sort());
  let retained = 0;
  for (const row of fixture.entries) {
    assert.ok(!row.id.startsWith('YAN-') && !row.original.reference, '第三方题目载荷不得进入此原创fixture');
    const old = historical.get(row.id), q = current.get(row.id), change = items.get(row.id);
    assert.ok(old && q, row.id);
    assert.equal(old.revision ?? 1, row.baseRevision, row.id);
    assert.deepEqual(old, row.original, row.id + '显式原版本全部字段');
    assert.equal(hash(old), row.baseQuestionSha256, row.id + '原版本SHA');
    if (!change) {
      assert.deepEqual(q, row.original, row.id + '未改47题全部字段');
      retained++;
      continue;
    }
    assert.equal(change.localOnly, false);
    assert.equal(change.baseRevision, row.baseRevision);
    assert.equal(change.revision, row.baseRevision + 1);
    assert.equal(q.revision, change.revision, row.id + '精确目标版本，不能用>=放宽');
    assert.deepEqual(change.original, row.original);
    assert.deepEqual(q, change.proposed, row.id + '真实默认题不是外部候选对象');
    assert.equal(hash(q), change.newQuestionSha256, row.id + '默认新版SHA');
    assert.deepEqual(practiceQuestionRevisions[row.id][change.revision], change.patch);
  }
  assert.equal(retained, 47);
  assert.deepEqual(fixture.items.filter(row => row.proposed.coding).map(row => row.id).sort(), programIds.slice().sort());
  assert.deepEqual(fixture.items.filter(row => row.proposed.formats?.includes('literal-string')).map(row => row.id).sort(), literalIds.slice().sort());
});

test('33修订拒绝未知999版本，不把未来版本回退为当前guide或旧题', () => {
  for (const item of fixture.items) {
    assert.throws(() => getPracticeCourse('structures', {questionRevisions: {[item.id]: 999}}), /版本/, item.id);
  }
  for (const id of programIds) {
    assert.equal(dsTaskGuide(id, 999), undefined);
    assert.equal(codeTaskGuide({id, revision: 999}, 'c'), undefined);
    assert.equal(hasJudgeContract(id, 999, 'c'), false);
  }
});

test('五道程序题新4与旧3/2保留各自内容、原C接口及判题能力，参考代码只附一次', () => {
  const version2 = new Map(getPracticeCourse('structures', {
    questionRevisions: Object.fromEntries(programIds.map(id => [id, 2])),
  }).questions.map(q => [q.id, q]));
  for (const id of programIds) {
    const item = items.get(id);
    assert.equal(item.baseRevision, 3);
    assert.equal(item.revision, 4);
    const g2 = dsTaskGuide(id, 2), g3 = dsTaskGuide(id, 3), g4 = dsTaskGuide(id, 4);
    assert.strictEqual(g2, dsStringTaskGuides[id], id + '原2接口仍可直接选中');
    assert.strictEqual(g3, dsAnalysisTaskGuides[id], id + '原3接口不能被新4覆盖');
    assert.strictEqual(g4, dsStringQualityTaskGuides[id]);
    assert.deepEqual(g4, {...g3, revision: 4}, id + '新guide只升版本并完整继承旧3');
    assert.equal(g4.starter, g2.starter, id + '同一C函数模板');
    assert.equal(g4.solution, g2.solution, id + '本轮不改功能参考C源码');
    assert.equal(g4.instruction, g3.instruction, id + '公开提交接口不变');
    const old2 = version2.get(id), old3 = historical.get(id), latest = current.get(id);
    assert.equal(old2.revision, 2);
    assert.equal(old3.revision, 3);
    assert.equal(latest.revision, 4);
    assert.deepEqual(old3, item.original);
    assert.deepEqual(latest, item.proposed);
    assert.equal(old2.stem, g2.publicStatement, id + '原2题面不能串入原3或新4内容');
    const raw = waveThreePractice.structures.find(q => q.id === id);
    assert.ok(raw);
    const base = reviseQuestionLanguage(raw);
    assert.equal(old2.model, base.model + '\n\n参考实现：\n```c\n' + g2.solution + '\n```', id + '原2沿原始说明和原代码，不读取新评分model');
    for (const [q, guide] of [[old2, g2], [old3, g3], [latest, g4]]) {
      assert.equal(isProgrammingQuestion(q), true);
      assert.strictEqual(codeTaskGuide(q, 'c'), guide);
      assert.equal(hasJudgeContract(id, q.revision, 'c'), true);
      assert.equal(q.model.split(guide.solution).length - 1, 1, id + '@' + q.revision + '原参考代码恰一次');
      assert.equal((q.model.match(/参考实现：/g) || []).length, 1, id + '@' + q.revision + '不双附参考代码');
      const editor = codeEditor(q, '', 'quality-' + q.revision, false, true, 'c');
      assert.ok(editor.includes('data-code-source') && editor.includes('data-code-judge'), id + '@' + q.revision);
    }
  }
});

function literalAnswer(q) {
  const n = Number(q.id.split('-').at(-1));
  if (n === 4) {
    const match = q.stem.match(/^串([A-Za-z]+)的最长相等真前缀与后缀是____。/);
    assert.ok(match, q.id);
    const value = match[1];
    for (let length = value.length - 1; length >= 0; length--) {
      if (value.slice(0, length) === value.slice(value.length - length)) return value.slice(0, length);
    }
  } else if (n === 12) {
    const match = q.stem.match(/^以1起始位置(\d+)开始，从串([A-Za-z]+)中删除(\d+)个字符/);
    assert.ok(match, q.id);
    const start = Number(match[1]) - 1, length = Number(match[3]);
    return match[2].slice(0, start) + match[2].slice(start + length);
  } else if (n === 13) {
    const match = q.stem.match(/^在串([A-Za-z]+)的第(\d+)项之前插入([A-Za-z]+)，结果为/);
    assert.ok(match, q.id);
    const at = Number(match[2]) - 1;
    return match[1].slice(0, at) + match[3] + match[1].slice(at);
  } else if (n === 14) {
    const match = q.stem.match(/^将串([A-Za-z]+)逆置，结果为/);
    assert.ok(match, q.id);
    return [...match[1]].reverse().join('');
  } else if (n === 15) {
    const initial = q.stem.match(/当前依次为([^。]+)。/);
    assert.ok(initial, q.id);
    const array = initial[1].split('、'), moves = [...q.stem.matchAll(/s\[(\d+)\]←s\[(\d+)\]/g)];
    assert.equal(array.length, 6);
    assert.equal(moves.length, 4);
    for (const move of moves) array[Number(move[1])] = array[Number(move[2])];
    return array.join('');
  }
  assert.fail(q.id + '缺少严格绑定题面的独立字面串求解');
}

test('五道literal由题干独算，按大小写与每个空白精确评分；旧text/number不全库收紧', () => {
  assert.equal(GRADING_VERSION, 2);
  for (const id of literalIds) {
    const q = current.get(id), answer = literalAnswer(q);
    assert.equal(q.revision, 2);
    assert.match(q.stem, /只填串本身，不加引号；大小写和空格按串内容判断/);
    assert.deepEqual(q.formats, ['literal-string']);
    assert.deepEqual(q.answers, [[answer]], id + '公开答案必须等于独立求得的串');
    assert.equal(grade(q, [answer]).correct, true, id);
    const wrong = new Set([answer.toUpperCase(), answer.toLowerCase(), ' ' + answer, answer + ' ',
      answer.slice(0, 1) + ' ' + answer.slice(1), answer.slice(0, 1) + '\n' + answer.slice(1),
      answer.split('').join(','), '"' + answer + '"', '[' + answer + ']', answer + ';']);
    wrong.delete(answer);
    for (const value of wrong) assert.equal(grade(q, [value]).correct, false, id + ': ' + JSON.stringify(value));
    if (id !== 'P4-structures-4-F-015') {
      const old = historical.get(id), oldAnswer = old.answers[0][0];
      assert.deepEqual(old.formats, ['text']);
      assert.equal(grade(old, [oldAnswer.toUpperCase()]).correct, true, id + '原text宽容规则保留给历史版');
    }
  }
  assert.equal(grade({type: 'fill', answers: [['Ab']], formats: ['text']}, ['a b']).correct, true);
  assert.equal(grade({type: 'fill', answers: [['1.20']], formats: ['number']}, ['+1.200'], 2).correct, true);
});
