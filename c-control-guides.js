import {cControlPractice} from './bank-c-control.js';

// Public interfaces and incomplete starters only. Drivers stay on the server.
export const cControlGuides = Object.fromEntries(cControlPractice.programming.filter(q => q.coding).map(q => [q.id, {
 instruction: `只提交${q.section === '程序填空' ? '补全后的' : ''}完整函数 ${q.signature}，不需要main。可包含所需的C标准头文件；参数范围、返回值和输出规则按本题题面。`,
 starter: q.starter
}]));
