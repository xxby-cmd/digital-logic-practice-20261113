import {getCourse} from './course-banks.js';
import {practiceExtra} from './practice-extra.js';
import {expandedPractice} from './expanded-practice.js';
import {referenceQuestions} from './reference-bank.js';

const catalog={
 network:[{id:1,name:'第1章 计算机网络概述'},{id:'physical',name:'物理层基础',note:'绪论中物理介质与接入网相关内容，独立学习单元，不改写课件正式章号'},{id:5,name:'第5章 数据链路层'},{id:4,name:'第4章 网络层'},{id:3,name:'第3章 传输层'},{id:2,name:'第2章 应用层'}],
 structures:[{id:1,name:'第1章 绪论'},{id:2,name:'第2章 线性表'},{id:3,name:'第3章 栈和队列'},{id:4,name:'第4章 串'},{id:5,name:'第5章 数组和广义表'},{id:6,name:'第6章 树和二叉树'},{id:7,name:'第7章 图'},{id:9,name:'第9章 查找'},{id:10,name:'第10章 内部排序'}],
 programming:[{id:1,name:'第1章 程序设计和C语言'},{id:2,name:'第2章 最简单的C程序设计'},{id:3,name:'第3章 运算符和表达式'},{id:4,name:'第4章 控制结构'},{id:5,name:'第5章 函数'},{id:6,name:'第6章 数组'},{id:7,name:'第7章 预处理'},{id:8,name:'第8章 指针'},{id:9,name:'第9章 结构体'},{id:11,name:'第11章 文件'}]
};
const extraChapters={network:[1,3,1,3],structures:[2,6,7,10],programming:[3,6,5,6]};
export function getPracticeCourse(subject){
 const course=getCourse(subject);
 const qs=[...course.questions,...(practiceExtra[subject]||[]).map((q,i)=>({...q,chapter:extraChapters[subject][i]})),...(expandedPractice[subject]||[]),...(referenceQuestions[subject]||[])];
 const chapters=catalog[subject]||course.chapters.map(c=>({id:c.id,name:`第${c.id}章 ${c.name}`}));
 return {questions:qs,chapters:chapters.map(c=>({...c,count:qs.filter(q=>String(q.chapter)===String(c.id)).length,target:100}))};
}
