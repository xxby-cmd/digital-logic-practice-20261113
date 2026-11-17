import {cExpressionsPractice} from './bank-c-expressions.js';

// Public function shells contain no hidden test data or completed implementation.
export const cExpressionsGuides = Object.fromEntries(cExpressionsPractice.programming.filter(q => q.coding).map(q => {
 const block = q.stem.match(/```c\n([\s\S]*?)\n```/);
 const signature = q.stem.match(/(?:long long|unsigned int|double|int)\s+\w+\([^)]*\)/)?.[0];
 if (!block && !signature) throw new Error(`缺少函数接口：${q.id}`);
 return [q.id, {instruction: q.section==='程序填空' ?
  '补全题中函数后提交整个函数，无需编写main；可以使用符合题意的等价实现。' :
  '按题目接口提交完整函数，无需编写main。',
  starter: block ? block[1] : `${signature} {\n    /* 在这里完成实现 */\n}`}];
}));
