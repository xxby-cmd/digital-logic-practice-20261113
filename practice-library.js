import {reviseQuestionLanguage} from './question-language.js';
import {hasJudgeContract} from './coding-catalog.js';
import {practiceWeight} from './study-priorities.js';
import {getCourse} from './course-banks.js';
import {practiceExtra} from './practice-extra.js';
import {expandedPractice} from './expanded-practice.js';
import {referenceQuestions} from './reference-bank.js';
import {waveTwoPractice} from './bank-wave-02.js';
import {waveThreePractice} from './bank-wave-03.js';
import {waveFourPractice} from './bank-wave-04.js';
import {waveFivePractice} from './bank-wave-05.js';

const catalog={
 network:[{id:1,name:'第1章 计算机网络概述'},{id:'physical',name:'物理层基础',note:'绪论中物理介质与接入网相关内容，独立学习单元，不改写课件正式章号'},{id:5,name:'第5章 数据链路层'},{id:4,name:'第4章 网络层'},{id:3,name:'第3章 传输层'},{id:2,name:'第2章 应用层'}],
 structures:[{id:1,name:'第1章 绪论'},{id:2,name:'第2章 线性表'},{id:3,name:'第3章 栈和队列'},{id:4,name:'第4章 串'},{id:5,name:'第5章 数组和广义表'},{id:6,name:'第6章 树和二叉树'},{id:7,name:'第7章 图'},{id:8,name:'第8章 动态存储管理'},{id:9,name:'第9章 查找'},{id:10,name:'第10章 内部排序'},{id:11,name:'第11章 外部排序'},{id:12,name:'第12章 文件'}],
 programming:[{id:1,name:'第1章 程序设计和C语言'},{id:2,name:'第2章 最简单的C程序设计'},{id:3,name:'第3章 运算符和表达式'},{id:4,name:'第4章 控制结构'},{id:5,name:'第5章 函数'},{id:6,name:'第6章 数组'},{id:7,name:'第7章 预处理'},{id:8,name:'第8章 指针'},{id:9,name:'第9章 结构体'},{id:10,name:'第10章 共用体、枚举与位运算',note:'按同作者出版社目录对应，第三版页码待复核'},{id:11,name:'第11章 文件'},{id:12,name:'综合实验',note:'综合训练单元；教材第三版章号待复核'}],
 digital:[{id:1,name:'第1章 概述'},{id:2,name:'第2章 逻辑代数基础'},{id:3,name:'第3章 逻辑门电路'},{id:4,name:'第4章 组合逻辑电路'},{id:5,name:'第5章 时序逻辑电路的存储元件'},{id:6,name:'第6章 同步时序逻辑电路'},{id:7,name:'第7章 异步时序逻辑电路'},{id:8,name:'第8章 脉冲产生电路'}]
};
const extraChapters={network:[1,3,1,3],structures:[2,6,7,10],programming:[3,6,5,6]};
export function getPracticeCourse(subject){
 const course=getCourse(subject);
 const qs=[...course.questions,...(practiceExtra[subject]||[]).map((q,i)=>({...q,chapter:extraChapters[subject][i]})),...(expandedPractice[subject]||[]),...(referenceQuestions[subject]||[]),...(waveTwoPractice[subject]||[]),...(waveThreePractice[subject]||[]),...(waveFourPractice[subject]||[]),...(waveFivePractice[subject]||[])];
 const chapters=catalog[subject]||course.chapters.map(c=>({id:c.id,name:`第${c.id}章 ${c.name}`}));
 return {questions:qs.map(q=>({...reviseQuestionLanguage(q),...(hasJudgeContract(q.id)?{judge:true}:{}),coding:q.coding===true||(q.type==='short'&&subject==='programming'&&/编写|实现|补全|补齐|代码|程序|函数/.test(q.stem)),practiceWeight:practiceWeight(subject,q)})),chapters:chapters.map(c=>({...c,count:qs.filter(q=>String(q.chapter)===String(c.id)).length,target:100}))};
}
