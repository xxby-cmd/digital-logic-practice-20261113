import {cPointersPractice} from './bank-c-pointers.js';
export const cPointersGuides=Object.fromEntries(cPointersPractice.programming.filter(q=>q.coding).map(q=>[q.id,{
 instruction:(q.systemTypes||'')+`只提交${q.section==='程序填空'?'补全后的':''}完整函数 ${q.signature}，不需要main。可包含所需标准头文件，按本题公开的对象范围、别名和输出约定处理。`+(q.submissionConstraint||''),
 starter:q.starter
}]));
