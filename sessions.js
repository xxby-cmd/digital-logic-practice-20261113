import {grade,validAnswer} from './grading.js';

export const EXAM_DURATION=2*60*60*1000;
function startSession(subject,paper,kind,now,id){
 if(!paper?.questions?.length)throw new Error('试卷尚未准备好');
 return {id,kind,subject,paperId:paper.id,title:paper.title,chapter:paper.chapter,questions:JSON.parse(JSON.stringify(paper.questions)),startedAt:now,deadline:kind==='exam'?now+EXAM_DURATION:null,status:'active',answers:{},marks:{},result:null};
}
export function startExam(subject,paper,now=Date.now(),id=`${subject}-${now}-${Math.random().toString(36).slice(2)}`){return startSession(subject,paper,'exam',now,id);}
export function startChapterTest(subject,paper,now=Date.now(),id=`test-${subject}-${now}-${Math.random().toString(36).slice(2)}`){return startSession(subject,paper,'chapter',now,id);}
export function submitExam(attempt,now=Date.now()){
 if(attempt.status!=='active')return attempt;
 const timed=Number.isFinite(attempt.deadline);attempt.status='marking';attempt.submittedAt=timed?Math.min(now,attempt.deadline):now;attempt.expired=timed&&now>=attempt.deadline;
 for(const q of attempt.questions){const a=attempt.answers[q.id];if(!validAnswer(q,a))attempt.marks[q.id]=0;else if(q.type==='single'||q.type==='fill')attempt.marks[q.id]=grade(q,a).correct?q.points:0;}
 return attempt;
}
export function expireExam(attempt,now=Date.now()){if(attempt?.status==='active'&&Number.isFinite(attempt.deadline)&&now>=attempt.deadline)submitExam(attempt,now);return attempt;}
export function saveExamAnswer(attempt,id,answer,now=Date.now()){
 expireExam(attempt,now);if(attempt.status!=='active'||!attempt.questions.some(q=>q.id===id))return false;
 attempt.answers[id]=JSON.parse(JSON.stringify(answer));return true;
}
export function setMark(attempt,id,value){
 if(attempt.status!=='marking')return false;
 const q=attempt.questions.find(q=>q.id===id);if(!q||['single','fill'].includes(q.type))return false;
 const n=Number(value);if(value===''||!Number.isFinite(n)||n<0||n>q.points||!Number.isInteger(n))return false;
 attempt.marks[id]=n;return true;
}
export function settleExam(attempt){
 if(attempt.result)return attempt.result;
 if(attempt.status!=='marking'||attempt.questions.some(q=>!Number.isInteger(attempt.marks[q.id])||attempt.marks[q.id]<0||attempt.marks[q.id]>q.points))throw new Error('请先完成全部主观题自评');
 const scores=Object.fromEntries(attempt.questions.map(q=>[q.id,attempt.marks[q.id]]));
 attempt.result={total:Object.values(scores).reduce((a,b)=>a+b,0),scores,settledAt:Date.now()};attempt.status='settled';return attempt.result;
}
export function totalPoints(attempts,subject){return attempts.filter(a=>a.kind!=='chapter'&&a.status==='settled'&&(!subject||a.subject===subject)).reduce((sum,a)=>sum+a.result.total,0);}
export function nextPaper(papers,attempts,subject){return papers.find(p=>!attempts.some(a=>a.subject===subject&&a.paperId===p.id))||null;}
export function drawPractice(questions,seen,random=Math.random){const remaining=questions.filter(q=>!seen.includes(q.id));return remaining.length?remaining[Math.min(remaining.length-1,Math.floor(random()*remaining.length))]:null;}
export function distributePoints(questions,groups){
 return groups.flatMap(g=>{const qs=questions.filter(q=>q.section===g.name);if(qs.length!==g.count)throw new Error(`${g.name}题量不符`);return qs.map((q,i)=>({...q,points:Math.floor(g.points/qs.length)+(i<g.points%qs.length?1:0)}));});
}
