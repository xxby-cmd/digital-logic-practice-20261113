import {grade,validAnswer,GRADING_VERSION} from './grading.js';
import {usesAIGrading,isAIQuestion,pendingAIQuestions} from './ai-grading.js';

export const EXAM_DURATION=2*60*60*1000;
const codeStatuses=new Set(['accepted','wrong_answer','compile_error','runtime_error','time_limit','output_limit','invalid']);
function startSession(subject,paper,kind,now,id){
 if(!paper?.questions?.length)throw new Error('试卷尚未准备好');
 return {id,kind,subject,paperId:paper.id,title:paper.title,chapter:paper.chapter,gradingVersion:GRADING_VERSION,questionSnapshotVersion:2,...(paper.chapterLayout!==undefined?{chapterLayout:paper.chapterLayout}:{}),...(paper.practicePlan?{practicePlan:JSON.parse(JSON.stringify(paper.practicePlan))}:{}),questions:JSON.parse(JSON.stringify(paper.questions)),startedAt:now,deadline:kind==='exam'?now+EXAM_DURATION:null,status:'active',answers:{},marks:{},result:null};
}
export function startExam(subject,paper,now=Date.now(),id=`${subject}-${now}-${Math.random().toString(36).slice(2)}`){return startSession(subject,paper,'exam',now,id);}
export function startChapterTest(subject,paper,now=Date.now(),id=`test-${subject}-${now}-${Math.random().toString(36).slice(2)}`){return startSession(subject,paper,'chapter',now,id);}
export function refreshObjectiveMarks(attempt){
 const version=attempt.gradingVersion??1;
 for(const q of attempt.questions){
  if(!['single','fill'].includes(q.type))continue;
  const answer=attempt.answers[q.id];
  attempt.marks[q.id]=q.type==='fill'&&q.blankPoints?Math.min(q.points,grade(q,Array.isArray(answer)?answer:[],version).correctBlanks*q.blankPoints):(validAnswer(q,answer)&&grade(q,answer,version).correct?q.points:0);
 }
 return attempt;
}
export function submitExam(attempt,now=Date.now()){
 if(attempt.status!=='active')return attempt;
 attempt.questionSnapshotVersion??=attempt.gradingVersion===GRADING_VERSION?2:1;
 attempt.gradingVersion=GRADING_VERSION;
 const timed=Number.isFinite(attempt.deadline);attempt.status='marking';attempt.submittedAt=timed?Math.min(now,attempt.deadline):now;attempt.expired=timed&&now>=attempt.deadline;
 refreshObjectiveMarks(attempt);
 for(const q of attempt.questions)if(q.type==='short'&&!validAnswer(q,attempt.answers[q.id]))attempt.marks[q.id]=0;
 return attempt;
}
export function expireExam(attempt,now=Date.now()){if(attempt?.status==='active'&&Number.isFinite(attempt.deadline)&&now>=attempt.deadline)submitExam(attempt,now);return attempt;}
export function saveExamAnswer(attempt,id,answer,now=Date.now(),language){
 expireExam(attempt,now);if(attempt.status!=='active'||!attempt.questions.some(q=>q.id===id))return false;
 if(language!==undefined&&!['c','java'].includes(language))return false;
 attempt.answers[id]=JSON.parse(JSON.stringify(answer));if(language!==undefined)(attempt.answerLanguages||(attempt.answerLanguages={}))[id]=language;return true;
}
export function setMark(attempt,id,value){
 if(attempt.status!=='marking')return false;
 const q=attempt.questions.find(q=>q.id===id);if(!q||q.judge||['single','fill'].includes(q.type)||(usesAIGrading(attempt)&&isAIQuestion(q)))return false;
 const n=Number(value);if(value===''||!Number.isFinite(n)||n<0||n>q.points||!Number.isInteger(n))return false;
 attempt.marks[id]=n;return true;
}
export function automaticCodeScore(attempt,q){
 if(!q.judge)return undefined;
 if(!validAnswer(q,attempt.answers[q.id]))return 0;
 const result=attempt.judgements?.[q.id];
 return codeStatuses.has(result?.status)&&(result.language||'c')===(attempt.answerLanguages?.[q.id]||'c')?(result.status==='accepted'?q.points:0):undefined;
}
export function pendingCodeQuestions(attempt){
 if(attempt?.status!=='marking')return [];
 for(const q of attempt.questions.filter(q=>q.judge)){
  const score=automaticCodeScore(attempt,q);if(score===undefined)delete attempt.marks[q.id];else attempt.marks[q.id]=score;
 }
 return attempt.questions.filter(q=>q.judge&&validAnswer(q,attempt.answers[q.id])&&!Number.isInteger(attempt.marks[q.id]));
}
export function applyCodeResult(attempt,id,source,result,language='c'){
 if(attempt.status!=='marking'||attempt.answers[id]!==source||(attempt.answerLanguages?.[id]||'c')!==language)return false;
 const q=attempt.questions.find(q=>q.id===id);
 if(!q?.judge||Number.isInteger(attempt.marks[id])||!codeStatuses.has(result?.status))return false;
 attempt.marks[id]=result.status==='accepted'?q.points:0;
 (attempt.judgements||(attempt.judgements={}))[id]={status:result.status,passed:result.passed,total:result.total,...(language==='java'?{language}:{})};
 return true;
}
export function settleExam(attempt){
 if(attempt.result)return attempt.result;
 if(attempt.status==='marking')refreshObjectiveMarks(attempt);
 if(pendingCodeQuestions(attempt).length)throw new Error('请先完成编程题判题');
 if(pendingAIQuestions(attempt).length)throw new Error('简答评阅尚未完成，原作答已保存');
 if(attempt.status!=='marking'||attempt.questions.some(q=>!Number.isInteger(attempt.marks[q.id])||attempt.marks[q.id]<0||attempt.marks[q.id]>q.points))throw new Error('请先完成全部主观题自评');
 const scores=Object.fromEntries(attempt.questions.map(q=>[q.id,attempt.marks[q.id]]));
 attempt.result={total:Object.values(scores).reduce((a,b)=>a+b,0),scores,settledAt:Date.now()};attempt.status='settled';return attempt.result;
}
export function totalPoints(attempts,subject){return attempts.filter(a=>a.kind!=='chapter'&&a.status==='settled'&&(!subject||a.subject===subject)).reduce((sum,a)=>sum+a.result.total,0);}
export function nextPaper(papers,attempts,subject){return papers.find(p=>!attempts.some(a=>a.subject===subject&&a.paperId===p.id))||null;}
export function drawPractice(questions,seen,random=Math.random){const remaining=questions.filter(q=>!seen.includes(q.id));if(!remaining.length)return null;const weights=remaining.map(q=>Number.isFinite(q.practiceWeight)&&q.practiceWeight>0?q.practiceWeight:1),total=weights.reduce((s,w)=>s+w,0);let pick=Math.max(0,Math.min(1,random()))*total;for(let i=0;i<remaining.length;i++){pick-=weights[i];if(pick<0)return remaining[i];}return remaining.at(-1);}
export function distributePoints(questions,groups){
 return groups.flatMap(g=>{const qs=questions.filter(q=>q.section===g.name);if(qs.length!==g.count)throw new Error(`${g.name}题量不符`);return qs.map((q,i)=>({...q,points:Math.floor(g.points/qs.length)+(i<g.points%qs.length?1:0)}));});
}
