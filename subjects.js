import {getCourse} from './course-banks.js';
import {getPracticeCourse} from './practice-library.js';
export const subjects=[
 {id:'network',name:'计算机网络',en:'COMPUTER NETWORKS',icon:'network',description:'从分层体系到协议分析，理解网络如何工作。',topics:['网络体系结构','数据链路层','网络层与传输层'],ready:true,needs:['教材封面与目录','当前授课范围','代表性习题与答案']},
 {id:'structures',name:'数据结构',en:'DATA STRUCTURES',icon:'structure',description:'从数据组织到算法过程，把分析落到每一步。',topics:['线性结构','树与图','查找与排序'],ready:true,needs:['教材封面与目录','使用的编程语言','PTA样题或作业题及答案']},
 {id:'digital',name:'数电设计',en:'DIGITAL LOGIC DESIGN',icon:'circuit',description:'从数制编码到时序与脉冲电路，按教材章节练习。',topics:['逻辑代数','组合与时序电路','脉冲产生'],ready:true,needs:[]},
 {id:'physics',name:'大学物理',en:'COLLEGE PHYSICS',icon:'physics',description:'从物理情境建立模型，再分析条件、关系与结果。',topics:['按实际教材分章','概念辨析','计算与应用'],ready:false,needs:['教材封面与上下册目录','当前讲授单元','作业或试卷样题及答案']},
 {id:'programming',name:'程序设计基础 C',en:'C PROGRAMMING',icon:'structure',description:'阅读、补全与分析程序，练习把思路落实为代码。',topics:['数组','指针','程序分析'],ready:true,needs:[]}
];
export function resolveRoute(hash,bank){
 let path;try{path=decodeURIComponent(hash.replace(/^#/,''));}catch{return {subject:null,question:null};}
 if(!path||path==='/'||path==='/subjects')return {subject:null,question:null};
 const parts=path.split('/').filter(Boolean);
 let subject='digital',rest=parts;
 if(parts[0]==='subjects'){
  subject=parts[1];
  if(!subjects.some(s=>s.id===subject))return {subject:null,question:null};
  rest=parts.slice(2);
  if(!rest.length)return {subject,view:'practice',chapter:getCourse(subject).chapters[0]?.id||1,question:null};
 }
 if(rest[0]==='chapter'&&rest[2]==='question'){
  const q=(bank||getPracticeCourse(subject).questions).find(q=>(q.id===rest[3]&&(String(q.chapter)===rest[1]||(q.legacyChapters||[]).some(c=>String(c)===rest[1])))||((q.legacyIds||[]).includes(rest[3])&&(q.legacyChapters||[]).some(c=>String(c)===rest[1])));
  if(q)return {subject,view:'practice',chapter:q.chapter,question:q.id};
 }
 if(['practice','wrong','favorites','records'].includes(rest[0])&&rest[1]==='chapter'){const c=getPracticeCourse(subject).chapters.find(c=>String(c.id)===rest[2]);if(c)return {subject,view:rest[0],chapter:c.id,question:null};}
 return {subject:null,question:null};
}
export function routeFor(state){
 if(!state.subject)return '/subjects';
 const prefix=`/subjects/${state.subject}`;
 if(!getCourse(state.subject).questions.length)return prefix;
 return state.question?`${prefix}/chapter/${state.chapter}/question/${state.question}`:`${prefix}/${state.view}/chapter/${state.chapter}`;
}
