import {examPapers} from './exam-bank.js';
import {getCourse} from './course-banks.js';
import {sanitizeImportedProgress,mergeProgress,emptyProgress} from './progress.js';
import {grade,validAnswer} from './grading.js';
import {EXAM_DURATION} from './sessions.js';
import {getPracticeCourse} from './practice-library.js';
import {chapterCategory} from './chapter-tests.js';

export function mergeBackup(current,input,subject){
 const room=JSON.parse(JSON.stringify(current));
 if(input?.version===1){
  if(!subject)throw Error('请进入对应科目后导入旧版记录');
  const incoming=sanitizeImportedProgress(input,subject,getCourse(subject).questions);
  const p=room.practice[subject]||(room.practice[subject]={seen:[],current:null,records:{}});
  const base={...emptyProgress(),...(p.legacy||{}),records:p.records};
  const merged=mergeProgress(base,incoming);p.legacy=merged;p.records=merged.records;return room;
 }
 if(input?.version!==2||!Array.isArray(input.attempts)||!input.practice||typeof input.practice!=='object')throw Error('备份格式不正确');
 for(const a of input.attempts){
  const paper=examPapers[a.subject]?.find(p=>p.id===a.paperId);
  if(!paper||typeof a.id!=='string'||!['active','marking','settled'].includes(a.status)||!a.answers||!a.marks||!Number.isFinite(a.startedAt)||a.deadline!==a.startedAt+EXAM_DURATION)throw Error('考试记录不完整');
  // 备份是练习数据而不是脚本/新题库；只接受当前试卷快照。
  if(JSON.stringify(a.questions)!==JSON.stringify(paper.questions))throw Error('试卷版本不同，请保留原备份');
  if(a.status==='settled'){
   if(!a.result||!a.result.scores)throw Error('结算记录不完整');
   let total=0;
   for(const q of a.questions){const score=a.result.scores[q.id];if(!Number.isInteger(score)||score<0||score>q.points)throw Error('成绩范围不正确');
    if(q.type!=='short'&&score!==(validAnswer(q,a.answers[q.id])&&grade(q,a.answers[q.id]).correct?q.points:0))throw Error('客观题成绩不一致');total+=score;}
   if(total!==a.result.total)throw Error('总分不一致');
  }
  // 同批已经有首次记录时始终保留本地记录，不用导入覆盖锁定成绩或延长考试。
  if(!room.attempts.some(old=>old.subject===a.subject&&(old.paperId===a.paperId||(old.status!=='settled'&&a.status!=='settled'))))room.attempts.push(JSON.parse(JSON.stringify(a)));
 }
 if(input.tests!==undefined&&!Array.isArray(input.tests))throw Error('章节记录格式不正确');
 room.tests=room.tests||[];
 for(const a of input.tests||[]){
  if(a.kind!=='chapter'||a.deadline!==null||typeof a.id!=='string'||!Number.isFinite(a.startedAt)||!['active','marking','settled'].includes(a.status)||!a.answers||!a.marks||!Array.isArray(a.questions))throw Error('章节记录不完整');
  const pool=getPracticeCourse(a.subject).questions.filter(q=>String(q.chapter)===String(a.chapter));
  const groups=examPapers[a.subject]?.[0]?.questions.reduce((m,q)=>{const g=m[q.section]||(m[q.section]={count:0,points:0});g.count++;g.points+=q.points;return m;},{});
  if(!groups)throw Error('章节科目不存在');
  const seen=new Set();
  for(const q of a.questions){const original=pool.find(p=>p.id===q.id);if(!original||seen.has(q.id))throw Error('章节题目版本不可恢复，请保留原备份');seen.add(q.id);
   const category=chapterCategory(a.subject,original);const index=a.questions.filter(p=>p.section===category).findIndex(p=>p.id===q.id);const g=groups[category];
   if(!g||JSON.stringify(q)!==JSON.stringify({...original,section:category,points:Math.floor(g.points/g.count)+(index<g.points%g.count?1:0)}))throw Error('章节题目内容或分值不匹配');
  }
  for(const [name,g]of Object.entries(groups))if(a.questions.filter(q=>q.section===name).length!==g.count)throw Error('章节题型数量不匹配');
  if(a.status==='settled'){
   let total=0;for(const q of a.questions){const score=a.result?.scores?.[q.id];if(!Number.isInteger(score)||score<0||score>q.points)throw Error('章节成绩不完整');if(q.type!=='short'&&score!==(validAnswer(q,a.answers[q.id])&&grade(q,a.answers[q.id]).correct?q.points:0))throw Error('章节客观成绩不一致');total+=score;}
   if(total!==a.result.total)throw Error('章节总分不一致');
  }
  if(!room.tests.some(old=>old.id===a.id))room.tests.push(JSON.parse(JSON.stringify(a)));
 }
 for(const id of Object.keys(examPapers)){
  const incoming=input.practice[id];if(!incoming||!incoming.records)continue;
  const p=room.practice[id]||(room.practice[id]={seen:[],current:null,records:{}});
  for(const [key,value]of Object.entries(incoming.records))if(value&&typeof value==='object'&&!p.records[key])p.records[key]=value;
  if(incoming.legacy)p.legacy=mergeProgress(p.legacy||emptyProgress(),sanitizeImportedProgress({...incoming.legacy,subject:id},id,getCourse(id).questions));
 }
 return room;
}
