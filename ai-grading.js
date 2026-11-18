import {validAnswer} from './grading.js';

export const AI_GRADING_VERSION=1;
export function enableAIGrading(attempt){
 if(attempt.status!=='active'||attempt.result)throw Error('已提交的历史答卷保持原评分方式。');
 attempt.subjectiveGradingVersion=AI_GRADING_VERSION;return attempt;
}
export function usesAIGrading(attempt){return attempt?.subjectiveGradingVersion===AI_GRADING_VERSION;}
export function isAIQuestion(q){return q?.type==='short'&&!q.judge;}
export function isCodingReview(q){return q?.coding===true||['编程题','程序填空','程序填空题','算法设计'].includes(q?.section);}
export function reviewRubric(q){return Array.isArray(q.rubric)&&q.rubric.length?q.rubric:['依据题目要求和参考答案，核对核心思路、结论和必要过程'];}
export function validAIReview(q,answer,receipt,points=q.points??100,language='c'){
 return !!receipt&&receipt.version===AI_GRADING_VERSION&&receipt.grader==='codex'&&receipt.questionId===q.id&&receipt.revision===(q.revision??1)&&receipt.answer===answer&&receipt.points===points&&receipt.language===language&&Number.isInteger(receipt.score)&&receipt.score>=0&&receipt.score<=points&&typeof receipt.feedback==='string'&&receipt.feedback.trim().length>=2&&receipt.feedback.length<=1000&&Array.isArray(receipt.criteria)&&receipt.criteria.length===reviewRubric(q).length&&receipt.criteria.every((item,i)=>item.index===i&&['met','partial','missing'].includes(item.verdict)&&typeof item.comment==='string'&&item.comment.length>=2&&item.comment.length<=500)&&(!receipt.criteria.every(item=>item.verdict==='missing')||receipt.score===0)&&(!receipt.criteria.every(item=>item.verdict==='met')||receipt.score===points);
}
export function automaticAIScore(attempt,q){
 if(!usesAIGrading(attempt)||!isAIQuestion(q))return undefined;
 const answer=attempt.answers[q.id];if(!validAnswer(q,answer))return 0;
 const receipt=attempt.aiReviews?.[q.id];return validAIReview(q,answer,receipt,q.points,attempt.answerLanguages?.[q.id]||'c')?receipt.score:undefined;
}
export function pendingAIQuestions(attempt){
 if(attempt?.status!=='marking'||!usesAIGrading(attempt))return [];
 for(const q of attempt.questions.filter(isAIQuestion)){const score=automaticAIScore(attempt,q);if(score===undefined)delete attempt.marks[q.id];else attempt.marks[q.id]=score;}
 return attempt.questions.filter(q=>isAIQuestion(q)&&validAnswer(q,attempt.answers[q.id])&&automaticAIScore(attempt,q)===undefined);
}
export function applyAIReview(attempt,receipt){
 if(attempt.status!=='marking'||!usesAIGrading(attempt))return false;
 const q=attempt.questions.find(q=>q.id===receipt?.questionId);if(!isAIQuestion(q)||!validAnswer(q,attempt.answers[q.id])||automaticAIScore(attempt,q)!==undefined||!validAIReview(q,attempt.answers[q.id],receipt,q.points,attempt.answerLanguages?.[q.id]||'c'))return false;
 (attempt.aiReviews||(attempt.aiReviews={}))[q.id]=JSON.parse(JSON.stringify(receipt));attempt.marks[q.id]=receipt.score;return true;
}
export async function requestAIReviews(subject,questions,answers,{signal,languages={}}={}){
 const items=questions.map(q=>({questionId:q.id,revision:q.revision??1,points:q.points??100,answer:answers[q.id],language:languages[q.id]||'c'})),payload=JSON.stringify({subject,items}),port=Number(location.port||4174),base=location.protocol==='file:'?'http://127.0.0.1:4174':'';
 const timeout=240000+questions.reduce((sum,q)=>sum+(isCodingReview(q)?languages[q.id]==='java'?180000:25000:0),0);
 const options={method:'POST',headers:{'Content-Type':'application/json'},body:payload,signal:signal||AbortSignal.timeout(timeout)};let response;
 try{response=await fetch(base+'/api/review',options);}catch(error){if(options.signal.aborted)throw error;}
 if(!response||[404,405].includes(response.status))try{response=await fetch(`http://127.0.0.1:${port+1}/api/review`,options);}catch{throw Error('评阅服务尚未连接，作答已保存，请从本地启动器打开后重试。');}
 let result;try{result=await response.json();}catch{throw Error('评阅尚未完成，作答已保存，请重试。');}
 if(!response.ok)throw Error(result.message||'评阅服务暂不可用，作答已保存，请稍后重试。');
 if(!Array.isArray(result.reviews)||result.reviews.length!==questions.length||new Set(result.reviews.map(r=>r.questionId)).size!==questions.length||result.reviews.some(r=>{const q=questions.find(q=>q.id===r.questionId);return !q||!validAIReview(q,answers[q.id],r,q.points??100,languages[q.id]||'c');}))throw Error('评阅结果尚不完整，作答已保存，请重试。');
 return result.reviews;
}
