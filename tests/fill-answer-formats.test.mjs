import test from 'node:test';
import assert from 'node:assert/strict';
import {formattedFillEqual, parseIntegerSequence, tokenizeCFragment} from '../fill-answer-formats.js';

const c = (actual, expected) => formattedFillEqual('c-tokens', actual, expected);
const sequence = (actual, expected) => formattedFillEqual('integer-sequence', actual, expected);
const set = (actual, expected) => formattedFillEqual('integer-set', actual, expected);
const canonical = 'head->next==NULL';
const cAliases = [
  canonical, 'head->next==0', '!head->next', '(head->next==NULL)',
  '(head->next)==NULL', 'NULL==head->next', '0==head->next', '!(head->next)',
];

test('未知格式交还原评分；已知格式的空值和非文本对象均不误收', () => {
  for (const format of [undefined, null, '', 'text', 'number', 'C-TOKENS', 'integer-list']) {
    assert.equal(formattedFillEqual(format, {}, {}), null);
  }
  const throwingObject = {toString() { throw new Error('must not coerce objects'); }};
  for (const format of ['c-tokens', 'integer-sequence', 'integer-set']) {
    for (const bad of [undefined, null, '', ' \t\n', {}, [], true, NaN, Infinity, throwingObject]) {
      assert.equal(formattedFillEqual(format, bad, bad), false, format + ': ' + typeof bad);
    }
  }
  assert.equal(sequence(12, '12'), true);
  assert.equal(sequence(12n, '+012'), true);
  assert.equal(sequence(Number.MAX_SAFE_INTEGER + 1, '9007199254740992'), false);
});

test('C按大小写与标记边界比较，保留实际题库的8个独立合法别名', () => {
  for (const expected of cAliases) {
    assert.equal(c(expected, expected), true, expected);
    assert.equal(c(' \t' + expected + '\r\n', expected), true, expected);
  }
  assert.equal(c('head /* node */ -> \t next == /* null */ NULL // done', canonical), true);
  assert.equal(c('next /* field */', 'next'), true);
  assert.equal(c('head->next==0', '!head->next'), false, '任意语义等价不由词法比较器猜测');
  const wrong = [
    'HEAD->NEXT==NULL', 'head->next==null', 'he ad->next==NULL', 'head->n ext==NULL',
    'head - > next == NULL', 'head->next= =NULL', 'head->next==N U L L',
    'head,->next==NULL', 'head->next;==NULL', 'head->next==NULL;',
    'head->next==NULL,', 'head->next==NULL;', '(head->next==NULL)',
    'ｈｅａｄ->next==NULL', 'head−>next==NULL', 'head\u00a0->next==NULL',
    'he/**/ad->next==NULL', 'head-/**/>next==NULL',
  ];
  for (const actual of wrong) assert.equal(c(actual, canonical), false, actual);
  assert.deepEqual(tokenizeCFragment('he/**/ad'), [
    {kind: 'identifier', text: 'he'}, {kind: 'identifier', text: 'ad'},
  ]);
  assert.deepEqual(tokenizeCFragment('- >'), [
    {kind: 'punctuator', text: '-'}, {kind: 'punctuator', text: '>'},
  ]);
  assert.deepEqual(tokenizeCFragment('->'), [{kind: 'punctuator', text: '->'}]);
});

test('C最长标记不可用删空白拼出；数字及复合运算符的边界独立保留', () => {
  for (const [actual, expected] of [
    ['a + + b', 'a++b'], ['a < < b', 'a<<b'], ['a & & b', 'a&&b'],
    ['a / * b', 'a/*x*/b'], ['1 2', '12'], ['1 e+2', '1e+2'],
    ['1e +2', '1e+2'], ['0xE + 2', '0xE+2'], ['. 5', '.5'],
    ['u8 "x"', 'u8"x"'], ['a # # b', 'a##b'],
  ]) assert.equal(c(actual, expected), false, actual + ' / ' + expected);
  assert.equal(c('a/*x*/+/*y*/b', 'a + b'), true);
  assert.deepEqual(tokenizeCFragment('0x1p-2 + 1e+3 >>= .5'), [
    {kind: 'number', text: '0x1p-2'}, {kind: 'punctuator', text: '+'},
    {kind: 'number', text: '1e+3'}, {kind: 'punctuator', text: '>>='},
    {kind: 'number', text: '.5'},
  ]);
  assert.equal(c('0x10', '16'), false, '本格式不做数值求值');
  assert.equal(c('<: 1 :>', '[1]'), false, '不同拼写仍须明确别名');
});

test('C续行在注释前处理，注释是边界而不是字符串删除器', () => {
  assert.equal(c('he\\\nad->next==NULL', canonical), true);
  assert.equal(c('head-\\\r\n>next==NULL', canonical), true);
  assert.equal(c('head-\\\r>next==NULL', canonical), true);
  assert.equal(c('he \\\nad->next==NULL', canonical), false);
  assert.equal(c('head// ignored\\\n BAD\n->next==NULL', canonical), true, '续行延长单行注释');
  assert.equal(c('head/\\\n* comment */->next==NULL', canonical), true, '续行可形成块注释');
  assert.equal(c('he/* comment */ad->next==NULL', canonical), false);
  assert.equal(c('head /\\\n/ ignored\n->next==NULL', canonical), true);
  assert.equal(c('head/**/->next==NULL', canonical), true);
  const phase2Remainder = '"' + '\\'.repeat(2) + '\n\n' + '"';
  assert.equal(tokenizeCFragment(phase2Remainder), null, '不重复拼接新形成的反斜线换行');
  for (const source of ['/* unfinished', 'head/* unfinished', '// only a comment', '/**/', 'head\\']) {
    assert.equal(tokenizeCFragment(source), null, source);
  }
});

test('C字面量内容不被大小写、空白或伪注释归一化，残缺字面量拒绝', () => {
  for (const source of ['"A B"', '"/* x */"', '"// x"', '"a\\"b"', "'\\n'", "L'x'", 'u8"hi"']) {
    assert.equal(c(source, source), true, source);
  }
  for (const [actual, expected] of [
    ['"A"', '"a"'], ['"he ad"', '"head"'], ['"/*x*/"', '""'],
    ['"//x"', '""'], ['"\\x41"', '"A"'], ["'A'", "'a'"],
  ]) assert.equal(c(actual, expected), false, actual);
  assert.equal(c('"ab\\\ncd"', '"abcd"'), true);
  for (const source of ['"unfinished', "'unfinished", '"" "', "' quote\n'", '"a\nb"', "''", '"\0"']) {
    assert.equal(tokenizeCFragment(source), null, source);
  }
});

test('整数只做明确数字排版转换，数值精确且分隔样式由expected别名指定', () => {
  assert.deepEqual(parseIntegerSequence(' ４，＋０１，−７，２，９ '), {
    wrapper: 'none', separatorFamily: 'comma', elements: [4n, 1n, -7n, 2n, 9n],
  });
  assert.deepEqual(parseIntegerSequence('65010  65020\t65030'), {
    wrapper: 'none', separatorFamily: 'whitespace', elements: [65010n, 65020n, 65030n],
  });
  assert.deepEqual(parseIntegerSequence('-0'), {
    wrapper: 'none', separatorFamily: 'none', elements: [0n],
  });
  assert.equal(sequence(' +004 , 01,7 , 2 ,009 ', '4,1,7,2,9'), true);
  assert.equal(sequence('４，１，７，２，９', '4,1,7,2,9'), true);
  assert.equal(sequence('1\t2\n3', '1 2 3'), true);
  assert.equal(sequence('1 2 3', '1,2,3'), false);
  assert.equal(sequence('1,2,3', '1 2 3'), false);
  assert.equal(sequence('65010,65020,65030', '65010 65020 65030'), false);
  const allowedAliases = ['65010 65020 65030', '65010,65020,65030'];
  for (const answer of allowedAliases) assert.equal(allowedAliases.some(alias => sequence(answer, alias)), true);
  assert.equal(sequence('0,+0,-00', '-0,0,0'), true);
  assert.equal(sequence('9007199254740992,1', '9007199254740993,1'), false);
  assert.equal(sequence('9007199254740993,1', '9007199254740993,1'), true);
  const huge = '123456789012345678901234567890123456789012345678901234567890';
  assert.equal(sequence(huge + ',-' + huge, '+0' + huge + ',-0' + huge), true);
  assert.equal(sequence(huge + ',1', huge + '0,1'), false);
  assert.equal(sequence('1²,3', '12,3'), false, '不使用会合并上标的NFKC');
});

test('整数空项、混合分隔、丢分隔符与符号分离均拒绝，不拼接元素', () => {
  for (const source of [
    ',', ',1', '1,', '1,,2', '1, ,2', '1， ，2', '1,2,', '1,2 3', '1 2,3',
    '1,\t2 3', '1 2 , 3', '- 1,2', '+ 1,2', '1,- 2', '1,+ 2',
    '1-2', '1+2', '1;2', '1；2', '1.0,2', '1e2,3', '0x10,2', '1/2,3',
    '1\u200b2', 'NaN,1', 'Infinity,1', '1,null', '1,2junk',
  ]) assert.equal(parseIntegerSequence(source), null, source);
  for (const actual of ['41,7,2,9', '4,17,2,9', '41729', '4,1,7,29', '4,1,7,2,9,9']) {
    assert.equal(sequence(actual, '4,1,7,2,9'), false, actual);
  }
  assert.equal(sequence('00,1,2', '0,0,1,2'), false);
  assert.equal(sequence('12,4,4,6,7', '1,2,4,4,6,7'), false);
  assert.equal(sequence('-1,-11,1', '-1,-1,1,1'), false);
  assert.equal(sequence('6501065020 65030', '65010 65020 65030'), false);
});

test('外包样式逐别名保持：裸写不自动接受括号，已存在圆括号别名正常', () => {
  assert.equal(sequence('(5,2,-4)', '(5,2,-4)'), true);
  assert.equal(sequence('（５，２，−４）', '(5,2,-4)'), true);
  assert.equal(sequence('5,2,-4', '(5,2,-4)'), false);
  assert.equal(sequence('(5,2,-4)', '5,2,-4'), false);
  assert.equal(sequence('[5,2,-4]', '(5,2,-4)'), false);
  assert.equal(sequence('{5,2,-4}', '[5,2,-4]'), false);
  assert.equal(sequence('[5,2,-4]', '[5,2,-4]'), true);
  assert.equal(sequence('{5 2 -4}', '{5 2 -4}'), true);
  const transposeAliases = ['(5,2,-4)', '5,2,-4', '（5，2，-4）'];
  for (const answer of transposeAliases) assert.equal(transposeAliases.some(alias => sequence(answer, alias)), true);
  assert.equal(sequence('(-1,-1,1,1)', '-1,-1,1,1'), false, 'CDMA裸写别名不接受额外括号');
  for (const source of ['', '()', '[]', '{}', '( )', '(1,2]', '[1,2)', '((1,2))', '(1,2)tail', '1,2)']) {
    assert.equal(parseIntegerSequence(source), null, source);
    assert.equal(sequence(source, source), false, source);
    assert.equal(set(source, source), false, source);
  }
});

test('序列保持顺序和重复，集合只放宽次序且双方都拒额外重复', () => {
  assert.equal(sequence('9,6', '6,9'), false);
  assert.equal(set('9,6', '6,9'), true);
  assert.equal(set('5 1 3', '1 3 5'), true);
  assert.equal(set('5,1,3', '1 3 5'), false, '集合也保分隔族');
  assert.equal(set('(9,6)', '6,9'), false, '集合也保外包样式');
  assert.equal(sequence('1,2,4,4,6,7', '1,2,4,4,6,7'), true);
  for (const [actual, expected] of [
    ['6,9,9', '6,9'], ['6,6,9', '6,9'], ['6,6,9', '6,9,9'],
    ['6,9', '6,6,9'], ['6,6', '6,6'], ['0,-0', '+00,0'],
    ['9007199254740992,1', '9007199254740993,1'],
  ]) assert.equal(set(actual, expected), false, actual + ' / ' + expected);
  assert.equal(set('9007199254740993,-7', '-7,9007199254740993'), true);
});

test('独立边界oracle：四个整数间任一分隔消失，都不能成为原五元素序列', () => {
  const expected = '4,1,7,2,9';
  const digits = ['4', '1', '7', '2', '9'];
  for (let mask = 0; mask < 16; mask += 1) {
    let actual = digits[0];
    for (let gap = 0; gap < 4; gap += 1) actual += ((mask & (1 << gap)) ? ',' : '') + digits[gap + 1];
    assert.equal(sequence(actual, expected), mask === 15, '逗号保留位图=' + mask + ': ' + actual);
  }
  const threePermutations = [
    '1,3,5', '1,5,3', '3,1,5', '3,5,1', '5,1,3', '5,3,1',
  ];
  for (const actual of threePermutations) {
    assert.equal(sequence(actual, '1,3,5'), actual === '1,3,5');
    assert.equal(set(actual, '1,3,5'), true);
    assert.equal(set(actual + ',3', '1,3,5'), false);
  }
});

test('当前next字段与判空式：换行和注释不拼标识符，六类ASCII空白不拼复合符号', () => {
  const splitNext = [
    'ne\nxt', 'ne\r\nxt', 'ne/**/xt', 'ne/*\n*/xt', 'ne// comment\nxt',
  ];
  for (const actual of splitNext) {
    assert.deepEqual(tokenizeCFragment(actual), [
      {kind: 'identifier', text: 'ne'}, {kind: 'identifier', text: 'xt'},
    ], actual);
    assert.equal(c(actual, 'next'), false, actual);
  }
  for (const whitespace of [' ', '\t', '\n', '\r', '\v', '\f', '\r\n']) {
    const visible = JSON.stringify(whitespace);
    assert.equal(c('ne' + whitespace + 'xt', 'next'), false, '字段中插入' + visible);
    assert.equal(c('head' + whitespace + '->' + whitespace + 'next' + whitespace + '==' + whitespace + 'NULL', canonical),
      true, '标记之间允许' + visible);
    assert.equal(c('head-' + whitespace + '>next==NULL', canonical), false, '箭头中插入' + visible);
    assert.equal(c('head->next=' + whitespace + '=NULL', canonical), false, '相等号中插入' + visible);
    assert.equal(c('!' + whitespace + 'head->next', '!head->next'), true, '单字符运算符后允许' + visible);
  }
});

test('phase2形成注释仍保持边界，残余反斜线不能被再次续行或吞掉', () => {
  assert.equal(c('ne\\\nxt', 'next'), true);
  assert.equal(c('next/\\\n* comment */', 'next'), true, '续行形成块注释');
  assert.equal(c('next/\\\r\n/ comment\n', 'next'), true, '续行形成行注释');
  assert.equal(c('next// ignored\\\nBAD', 'next'), true, '行注释跨被续接的物理行');
  assert.equal(c('ne/\\\n* comment */xt', 'next'), false, '新形成的注释仍分隔两个标识符');
  assert.deepEqual(tokenizeCFragment('ne// ignored\\\nxt\n'), [
    {kind: 'identifier', text: 'ne'},
  ], 'xt仍在续接后的行注释里');
  const doubleBackslash = '\\'.repeat(2);
  for (const source of [
    'ne' + doubleBackslash + '\nxt',
    'ne' + doubleBackslash + '\n\nxt',
    'next/' + doubleBackslash + '\n* comment */',
  ]) {
    assert.equal(tokenizeCFragment(source), null, JSON.stringify(source));
    assert.equal(c(source, 'next'), false, JSON.stringify(source));
  }
  assert.equal(c('next/*' + doubleBackslash + '\n\n*/', 'next'), true,
    '注释中的残余反斜线可以是注释文本，不能全局禁掉');
  for (const source of ['next/\\\n', 'next/\\\n* comment *\\\n//']) {
    assert.deepEqual(tokenizeCFragment(source), [
      {kind: 'identifier', text: 'next'}, {kind: 'punctuator', text: '/'},
    ], '续行或块注释之后剩余的斜杠必须保留');
    assert.equal(c(source, 'next'), false);
  }
  assert.equal(tokenizeCFragment('next/\\\n* unfinished'), null);
});

test('CSV换行只能作逗号旁空白，不能补缺失逗号；包装与分隔别名不交叉组合', () => {
  const csv = '4,1,7,2,9';
  assert.equal(sequence('4,\n1,\r\n7,\t2,\v9', csv), true);
  assert.equal(sequence('4\n,\n1\r\n,\t7\r,\v2\f,\r9', csv), true);
  assert.deepEqual(parseIntegerSequence('4,\n1'), {
    wrapper: 'none', separatorFamily: 'comma', elements: [4n, 1n],
  });
  for (const actual of [
    '4,\n1\n7,2,9', '4\n1,7,2,9', '4,\n,1,7,2,9',
    '4,1,7,2,9,\n', '4,1,7,2,9\n10',
  ]) assert.equal(sequence(actual, csv), false, JSON.stringify(actual));
  assert.equal(sequence('4\n1\n7\n2\n9', csv), false);
  assert.equal(sequence('4\n1\n7\n2\n9', '4 1 7 2 9'), true);

  const transposeAliases = ['5,2,-4', '(5,2,-4)', '（5，2，-4）', '5 2 -4'];
  for (const actual of ['5,\n2,-4', '(5,\n2,-4)', '（5，\n2，-4）', '5\n2 -4']) {
    assert.equal(transposeAliases.some(alias => sequence(actual, alias)), true, actual);
  }
  for (const actual of ['(5 2 -4)', '（5 2 -4）', '[5,2,-4]', '{5 2 -4}', '5,2 -4']) {
    assert.equal(transposeAliases.some(alias => sequence(actual, alias)), false, actual);
  }
  assert.equal(set('9,\n6', '6,9'), true);
  assert.equal(set('9\n6', '6,9'), false);
  assert.equal(set('(9,\n6)', '6,9'), false);
});

test('相邻超安全整数与负数保持不同，重复按整数值判定而不按字符或Set去重放行', () => {
  const lower = '9007199254740992', upper = '9007199254740993';
  assert.equal(sequence(lower + ',' + upper, lower + ',' + upper), true);
  assert.equal(sequence(upper + ',' + lower, lower + ',' + upper), false);
  assert.equal(sequence('-' + upper + ',1', '-' + lower + ',1'), false);
  assert.equal(sequence(lower, Number(upper)), false, '不接受已丢精度的Number期望');
  assert.equal(sequence(Number(upper), lower), false, '不接受已丢精度的Number作答');
  assert.equal(set(upper + ',' + lower, lower + ',' + upper), true);
  assert.equal(set(upper + ',+' + upper, lower + ',' + upper), false, '两项同值不能代替两个相邻大整数');
  assert.equal(set('06,+6', '6,9'), false, '符号和前导零不让重复变成新成员');
  assert.equal(set('０６,6,9', '6,9'), false);
  assert.equal(set('0,-0', '0,1'), false);
  assert.equal(sequence('06,+6', '6,6'), true, '序列的重复本来属于答案');
  assert.equal(sequence('6', '6,6'), false, '不得删去序列重复');
});
