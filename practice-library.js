import {reviseQuestionLanguage} from './question-language.js';
import {practiceQuestionAtRevision,practiceQuestionRevisions} from './bank-revisions.js';
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
import {waveSixPractice} from './bank-wave-06.js';
import {cExpressionsPractice} from './bank-c-expressions.js';
import {cControlPractice} from './bank-c-control.js';
import {cFunctionsPractice} from './bank-c-functions.js';
import {cPointersPractice} from './bank-c-pointers.js';
import {cRecordsPractice} from './bank-c-records.js';
import {cPreprocessorPractice} from './bank-c-preprocessor.js';
import {cIntroductionPractice} from './bank-c-introduction.js';
import {cBasicsPractice} from './bank-c-basics.js';
import {cFilesPractice} from './bank-c-files.js';
import {cFileCodingIds} from './c-file-availability.js';
import {waveSevenPractice} from './bank-wave-07.js';
import {waveEightPractice} from './bank-wave-08.js';
import {networkControlPractice} from './bank-network-control.js';
import {networkWirelessPractice} from './bank-network-wireless.js';
import {networkDataplanePractice} from './bank-network-dataplane.js';
import {networkSecurityPractice} from './bank-network-security.js';
import {networkMultimediaPractice} from './bank-network-multimedia.js';
import {revisionedDsTaskGuides,dsTaskGuide} from './ds-coding-task-guides.js';

export const PRACTICE_LAYOUT_VERSION=2;
const acceptedCFileCodes=new Set(cFileCodingIds);
const legacyNetworkChapters=[{id:1,name:'第1章 计算机网络概述'},{id:'physical',name:'物理层基础',note:'绪论中物理介质与接入网相关内容，独立学习单元，不改写课件正式章号'},{id:5,name:'第5章 数据链路层'},{id:4,name:'第4章 网络层'},{id:3,name:'第3章 传输层'},{id:2,name:'第2章 应用层'}];
const controlQuestionIds=new Set([15,16,17,18,25,26,27,30,59,70,73,77,78,81,82,84,90,91].map(n=>`P3-network-4-${n}`));
const catalog={
 network:[{id:1,name:'第1章 计算机网络和因特网'},{id:'physical',name:'物理层基础',note:'第1章物理介质与接入网内容的独立学习单元'},{id:2,name:'第2章 应用层'},{id:3,name:'第3章 运输层'},{id:4,name:'第4章 网络层：数据平面'},{id:'control',name:'第5章 网络层：控制平面'},{id:5,name:'第6章 链路层和局域网'},{id:7,name:'第7章 无线网络和移动网络'},{id:8,name:'第8章 计算机网络中的安全'},{id:9,name:'第9章 多媒体网络'}],
 structures:[{id:1,name:'第1章 绪论'},{id:2,name:'第2章 线性表'},{id:3,name:'第3章 栈和队列'},{id:4,name:'第4章 串'},{id:5,name:'第5章 数组和广义表'},{id:6,name:'第6章 树和二叉树'},{id:7,name:'第7章 图'},{id:8,name:'第8章 动态存储管理'},{id:9,name:'第9章 查找'},{id:10,name:'第10章 内部排序'},{id:11,name:'第11章 外部排序'},{id:12,name:'第12章 文件'}],
 programming:[{id:1,name:'第1章 程序设计和C语言'},{id:2,name:'第2章 最简单的C程序设计'},{id:3,name:'第3章 运算符和表达式'},{id:4,name:'第4章 控制结构'},{id:5,name:'第5章 函数'},{id:6,name:'第6章 数组'},{id:7,name:'第7章 预处理'},{id:8,name:'第8章 指针'},{id:9,name:'第9章 结构体'},{id:10,name:'第10章 共用体、枚举与位运算',note:'按同作者出版社目录对应，第三版页码待复核'},{id:11,name:'第11章 文件'},{id:12,name:'综合实验',note:'综合训练单元；教材第三版章号待复核'}],
 digital:[{id:1,name:'第1章 概述'},{id:2,name:'第2章 逻辑代数基础'},{id:3,name:'第3章 逻辑门电路'},{id:4,name:'第4章 组合逻辑电路'},{id:5,name:'第5章 时序逻辑电路的存储元件'},{id:6,name:'第6章 同步时序逻辑电路'},{id:7,name:'第7章 异步时序逻辑电路'},{id:8,name:'第8章 脉冲产生电路'}]
};
const extraChapters={network:[1,3,1,3],structures:[2,6,7,10],programming:[3,6,5,6]};
export function getPracticeCourse(subject,{layout=PRACTICE_LAYOUT_VERSION,questionRevisions={}}={}){
 if(![1,PRACTICE_LAYOUT_VERSION].includes(layout))throw Error('章节版本不受支持，请保留原备份。');
 const course=getCourse(subject);
 const qs=[...course.questions,...(practiceExtra[subject]||[]).map((q,i)=>({...q,chapter:extraChapters[subject][i]})),...(expandedPractice[subject]||[]),...(referenceQuestions[subject]||[]),...(waveTwoPractice[subject]||[]),...(waveThreePractice[subject]||[]),...(waveFourPractice[subject]||[]),...(waveFivePractice[subject]||[]),...(waveSixPractice[subject]||[]),...(cExpressionsPractice[subject]||[]),...(cControlPractice[subject]||[]),...(cFunctionsPractice[subject]||[])];
 qs.push(...(cPointersPractice[subject]||[]),...(cRecordsPractice[subject]||[]),...(cPreprocessorPractice[subject]||[]),...(cIntroductionPractice[subject]||[]),...(cBasicsPractice[subject]||[]),...(cFilesPractice[subject]||[]).filter(q=>q.type==='single'||acceptedCFileCodes.has(q.id)),...(waveSevenPractice[subject]||[]),...(waveEightPractice[subject]||[]),...(networkControlPractice[subject]||[]),...(networkWirelessPractice[subject]||[]),...(networkDataplanePractice[subject]||[]),...(networkSecurityPractice[subject]||[]),...(networkMultimediaPractice[subject]||[]));
 const chapters=(subject==='network'&&layout===1?legacyNetworkChapters:catalog[subject])||course.chapters.map(c=>({id:c.id,name:`第${c.id}章 ${c.name}`}));
 const questions=qs.map(original=>{
  const base=reviseQuestionLanguage(original);
  const latest=revisionedDsTaskGuides[base.id];
  const selected=questionRevisions[base.id]??latest?.revision;
  const guide=dsTaskGuide(base.id,selected);
  // An older coding guide may use the base text while a newer guide has a
  // separate content patch. Select the exact guide before applying that patch.
  const usesBaseText=guide&&!Object.hasOwn(practiceQuestionRevisions[base.id]??{},guide.revision);
  const source=practiceQuestionAtRevision(base,usesBaseText?base.revision??1:selected);
  const revision=selected??source.revision??1;
  if(latest&&!guide&&revision!==(source.revision??1))throw Error('题目版本不受支持，请保留原备份。');
  const task=guide?{...source,stem:guide.publicStatement,revision:guide.revision,coding:true,...(guide.manualReview?{manualReview:true}:{}),...(guide.rubric?{rubric:guide.rubric}:{}),model:source.model+'\n\n参考实现：\n```c\n'+guide.solution+'\n```'}:source;
  const q=subject==='network'&&layout===2&&controlQuestionIds.has(task.id)?{...task,chapter:'control',legacyChapters:[...(task.legacyChapters||[]),4]}:task;
  return {...q,...(hasJudgeContract(q.id,q.revision??1)?{judge:!q.manualReview}:{}),coding:q.coding===true||(q.coding!==false&&q.type==='short'&&subject==='programming'&&/编写|实现|补全|补齐|代码|程序|函数/.test(q.stem)),practiceWeight:practiceWeight(subject,q)};
 });
 return {questions,chapters:chapters.map(c=>({...c,count:questions.filter(q=>String(q.chapter)===String(c.id)).length,target:100}))};
}
