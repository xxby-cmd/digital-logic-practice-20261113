import {cBasicsPractice} from './bank-c-basics.js';
export const cBasicsGuides=Object.fromEntries(cBasicsPractice.programming.filter(q=>q.coding).map(q=>[q.id,{
 instruction:'提交包含int main(void)的完整C17程序；程序填空也提交补全后的整个程序。使用标准输入、标准输出，不输出输入提示。输入格式、空白与输出要求见本题题干。',starter:q.starter
}]));
