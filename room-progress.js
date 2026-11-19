import {examPapers} from './exam-bank.js';
import {fullExamPapers} from './full-exams.js';
import {courseBanks,getCourse} from './course-banks.js';
import {sanitizeImportedProgress,mergeProgress,emptyProgress} from './progress.js';
import {grade,validAnswer,GRADING_VERSION} from './grading.js';
import {AI_GRADING_VERSION,usesAIGrading,isAIQuestion,pendingAIQuestions,automaticAIScore} from './ai-grading.js';
import {EXAM_DURATION,refreshObjectiveMarks,pendingCodeQuestions,automaticCodeScore} from './sessions.js';
import {getPracticeCourse} from './practice-library.js';
import {chapterCategory} from './chapter-tests.js';
import {validateChapterPracticeSnapshot,normalizeChapterDefault} from './chapter-practice.js';
import {mergePracticeStudy} from './study-progress.js';
function snapshotVersion(attempt){return attempt.questionSnapshotVersion??(attempt.gradingVersion===GRADING_VERSION?2:1);}
function validateReviewMode(attempt){
 if(attempt.subjectiveGradingVersion!==undefined&&attempt.subjectiveGradingVersion!==AI_GRADING_VERSION)throw Error('AI评分版本暂不支持，请保留原备份。');
 if(attempt.aiReviews!==undefined&&(!usesAIGrading(attempt)||!attempt.aiReviews||Array.isArray(attempt.aiReviews)||typeof attempt.aiReviews!=='object'||Object.keys(attempt.aiReviews).some(id=>!attempt.questions?.some(q=>q.id===id))))throw Error('AI评阅记录与评分版本不一致，请保留原备份。');
 if(attempt.answerLanguages!==undefined&&(!attempt.answerLanguages||Array.isArray(attempt.answerLanguages)||typeof attempt.answerLanguages!=='object'||Object.entries(attempt.answerLanguages).some(([id,lang])=>!attempt.questions?.some(q=>q.id===id)||!['c','java'].includes(lang))))throw Error('作答语言记录不完整，请保留原备份。');
}
function sameQuestionSnapshot(actual,expected,legacy){
 const compatible={...expected};
 if(legacy)for(const field of ['judge','coding','practiceWeight'])if(!Object.hasOwn(actual,field))delete compatible[field];
 return JSON.stringify(actual)===JSON.stringify(compatible);
}
export function reconcilePracticeRecords(room,bankForSubject){
 for(const [subject,p]of Object.entries(room.practice||{})){
  if(!p?.records)continue;
  for(const q of bankForSubject(subject)){
   const r=p.records[q.id];if(!r||(r.revision||1)===(q.revision||1))continue;
   const archived=p.archived||(p.archived={}),key=`${q.id}@${r.revision||1}`;
   if(!Object.hasOwn(archived,key))archived[key]=r;
   delete p.records[q.id];p.seen=(p.seen||[]).filter(id=>id!==q.id);
  }
 }
 return room;
}

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
  validateReviewMode(a);
  if(![1,GRADING_VERSION].includes(a.gradingVersion??1))throw Error('评分版本不受支持，请保留原备份。');
  if(![1,2].includes(snapshotVersion(a)))throw Error('题目快照版本不受支持，请保留原备份。');
  const paper=[...(examPapers[a.subject]||[]),...(fullExamPapers[a.subject]||[])].find(p=>p.id===a.paperId);
  if(!paper||typeof a.id!=='string'||!['active','marking','settled'].includes(a.status)||!a.answers||!a.marks||!Number.isFinite(a.startedAt)||a.deadline!==a.startedAt+EXAM_DURATION)throw Error('考试记录不完整');
  // 备份是练习数据而不是脚本/新题库；只接受当前试卷快照。
  // Before automatic judging was introduced these same papers were self-marked.
  // Keep those frozen answer sheets restorable without changing their scoring mode.
  if(!Array.isArray(a.questions)||a.questions.length!==paper.questions.length||!a.questions.every((q,i)=>sameQuestionSnapshot(q,paper.questions[i],snapshotVersion(a)===1)))throw Error('试卷版本不同，请保留原备份');
  if(a.status==='settled'){
   if(!a.result||!a.result.scores)throw Error('结算记录不完整');
   let total=0;
   for(const q of a.questions){const score=a.result.scores[q.id];if(!Number.isInteger(score)||score<0||score>q.points)throw Error('成绩范围不正确');
    if(a.marks[q.id]!==score||(q.judge&&automaticCodeScore(a,q)!==score)||(usesAIGrading(a)&&isAIQuestion(q)&&automaticAIScore(a,q)!==score))throw Error('成绩与判题记录不一致');
    const objective=q.type==='fill'&&q.blankPoints?Math.min(q.points,grade(q,Array.isArray(a.answers[q.id])?a.answers[q.id]:[],a.gradingVersion??1).correctBlanks*q.blankPoints):(validAnswer(q,a.answers[q.id])&&grade(q,a.answers[q.id],a.gradingVersion??1).correct?q.points:0);
    if(q.type!=='short'&&score!==objective)throw Error('客观题成绩不一致');total+=score;}
   if(total!==a.result.total)throw Error('总分不一致');
  }
  // 同批已经有首次记录时始终保留本地记录，不用导入覆盖锁定成绩或延长考试。
  if(!room.attempts.some(old=>old.subject===a.subject&&(old.paperId===a.paperId||(old.status!=='settled'&&a.status!=='settled')))){const copy=JSON.parse(JSON.stringify(a));if(copy.status==='marking'){refreshObjectiveMarks(copy);pendingCodeQuestions(copy);pendingAIQuestions(copy);}room.attempts.push(copy);}
 }
 if(input.tests!==undefined&&!Array.isArray(input.tests))throw Error('章节记录格式不正确');
 room.tests=room.tests||[];
 for(const a of input.tests||[]){
  validateReviewMode(a);
  if(![1,GRADING_VERSION].includes(a.gradingVersion??1))throw Error('评分版本不受支持，请保留原备份。');
  if(![1,2].includes(snapshotVersion(a)))throw Error('题目快照版本不受支持，请保留原备份。');
  if(a.kind!=='chapter'||a.deadline!==null||typeof a.id!=='string'||!Number.isFinite(a.startedAt)||!['active','marking','settled'].includes(a.status)||!a.answers||!a.marks||!Array.isArray(a.questions))throw Error('章节记录不完整');
  if(a.practicePlan){validateChapterPracticeSnapshot(a);}else{
  const questionRevisions=Object.fromEntries(a.questions.map(q=>[q.id,q.revision??1]));
  const pool=getPracticeCourse(a.subject,{layout:a.chapterLayout??1,questionRevisions}).questions.filter(q=>String(q.chapter)===String(a.chapter));
  const groups=examPapers[a.subject]?.[0]?.questions.reduce((m,q)=>{const g=m[q.section]||(m[q.section]={count:0,points:0});g.count++;g.points+=q.points;return m;},{});
  if(!groups)throw Error('章节科目不存在');
  const seen=new Set();
  for(const q of a.questions){const original=pool.find(p=>p.id===q.id);if(!original||seen.has(q.id))throw Error('章节题目版本不可恢复，请保留原备份');seen.add(q.id);
   const category=chapterCategory(a.subject,original);const index=a.questions.filter(p=>p.section===category).findIndex(p=>p.id===q.id);const g=groups[category];
   if(!g)throw Error('章节题目内容或分值不匹配');
   const expected={...original,section:category,points:Math.floor(g.points/g.count)+(index<g.points%g.count?1:0)};
   if(!sameQuestionSnapshot(q,expected,snapshotVersion(a)===1))throw Error('章节题目内容或分值不匹配');
  }
  for(const [name,g]of Object.entries(groups))if(a.questions.filter(q=>q.section===name).length!==g.count)throw Error('章节题型数量不匹配');
  }
  if(a.status==='settled'){
   let total=0;for(const q of a.questions){const score=a.result?.scores?.[q.id];if(!Number.isInteger(score)||score<0||score>q.points)throw Error('章节成绩不完整');if(a.marks[q.id]!==score||(q.judge&&automaticCodeScore(a,q)!==score)||(usesAIGrading(a)&&isAIQuestion(q)&&automaticAIScore(a,q)!==score))throw Error('章节成绩与判题记录不一致');if(q.type!=='short'&&score!==(validAnswer(q,a.answers[q.id])&&grade(q,a.answers[q.id],a.gradingVersion??1).correct?q.points:0))throw Error('章节客观成绩不一致');total+=score;}
   if(total!==a.result.total)throw Error('章节总分不一致');
  }
  if(!room.tests.some(old=>old.id===a.id)){const copy=JSON.parse(JSON.stringify(a));if(copy.status==='marking'){refreshObjectiveMarks(copy);pendingCodeQuestions(copy);pendingAIQuestions(copy);}room.tests.push(copy);}
 }
 for(const id of Object.keys(courseBanks)){
  const incoming=input.practice[id];if(!incoming||!incoming.records)continue;
  const p=room.practice[id]||(room.practice[id]={seen:[],current:null,records:{}});
  const bank=new Map(getPracticeCourse(id).questions.map(q=>[q.id,q]));
  for(const [key,value]of Object.entries(incoming.records)){
   if(!value||typeof value!=='object')continue;
   const old=p.records[key],q=bank.get(key);
   if(!old){p.records[key]=value;continue;}
   if(q&&(old.study||value.study)&&(old.revision??1)===(q.revision??1)){
    const study=mergePracticeStudy(q,old,value);
    if(study)p.records[key]={...old,study};
   }
  }
  for(const [key,value]of Object.entries(incoming.archived||{}))if(value&&typeof value==='object'&&!p.archived?.[key])(p.archived||(p.archived={}))[key]=value;
  // Fresh v2 rooms formerly emitted an unversioned nested legacy object.
  // Its containing v2 format supplies the missing v1 default; explicit future
  // versions still reach the existing strict sanitizer unchanged.
  if(incoming.legacy)p.legacy=mergeProgress({...emptyProgress(),...(p.legacy||{})},sanitizeImportedProgress({version:1,...incoming.legacy,subject:id},id,getCourse(id).questions));
 }
 if(input.chapterPracticeDefaults!==undefined){
  if(!input.chapterPracticeDefaults||Array.isArray(input.chapterPracticeDefaults)||typeof input.chapterPracticeDefaults!=='object')throw Error('默认练习配置格式不正确');
  for(const [scope,value]of Object.entries(input.chapterPracticeDefaults)){
   if(scope!=='all'&&!Object.hasOwn(courseBanks,scope))throw Error('默认练习配置的科目不存在');
   const plan=normalizeChapterDefault(value);if(!room.chapterPracticeDefaults?.[scope])(room.chapterPracticeDefaults||(room.chapterPracticeDefaults={}))[scope]=plan;
  }
 }
 return reconcilePracticeRecords(room,id=>getPracticeCourse(id).questions);
}
