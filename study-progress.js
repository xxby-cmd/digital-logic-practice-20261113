import {grade,validAnswer} from './grading.js';

const recordedAt=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:0;

function practiceEvidence(q,record){
 if(!record||(record.revision??1)!==(q.revision??1))return null;
 const saved=record.study;
 if(saved&&typeof saved.submittedAt==='number'&&Number.isFinite(saved.submittedAt)&&saved.submittedAt>=0){
  return {submittedAt:saved.submittedAt,...(typeof saved.correct==='boolean'?{correct:saved.correct,checkedAt:recordedAt(saved.checkedAt)}:{})};
 }
 const status=record.status;
 const submitted=record.submitted===true||(record.submitted===undefined&&['correct','wrong','review'].includes(status));
 if(!submitted||!validAnswer(q,record.answer))return null;
 const at=recordedAt(Date.parse(record.updatedAt));
 const correct=record.reviewPending?undefined:q.type!=='short'?grade(q,record.answer).correct:
  status==='correct'?true:status==='wrong'?false:undefined;
 return {submittedAt:at,...(typeof correct==='boolean'?{correct,checkedAt:at}:{})};
}

function combineEvidence(old,added){
 if(!old||!added)return old||added;
 const best=typeof added.correct==='boolean'&&
  (typeof old.correct!=='boolean'||added.checkedAt>=old.checkedAt)?added:old;
 return {submittedAt:Math.max(old.submittedAt,added.submittedAt),
  ...(typeof best.correct==='boolean'?{correct:best.correct,checkedAt:best.checkedAt}:{})};
}

// Keep the last submission while editing a new draft or changing language.
export function preservePracticeStudy(q,record){
 return practiceEvidence(q,record)??undefined;
}

export function notePracticeSubmission(q,record,at=Date.now()){
 const {study,...current}=record;
 const added=practiceEvidence(q,{...current,updatedAt:new Date(at).toISOString()});
 if(added)record.study=combineEvidence(practiceEvidence(q,{revision:record.revision,study}),added);
}

export function mergePracticeStudy(q,current,incoming){
 return combineEvidence(practiceEvidence(q,current),practiceEvidence(q,incoming))??undefined;
}

export function chapterStudyProgress(subject,course,practiceRecords={},chapterAttempts=[]){
 const summaries=new Map(course.chapters.map(c=>[String(c.id),{total:0,done:0,correct:0,graded:0,waiting:0,wrong:[]}]));
 const questions=new Map(),evidence=new Map();
 for(const q of course.questions){
  if(q.pool==='exam')continue;
  questions.set(q.id,q);
  for(const id of q.legacyIds||[])if(!questions.has(id))questions.set(id,q);
  const record=practiceRecords[q.id]||(q.legacyIds||[]).map(id=>practiceRecords[id]).find(Boolean);
  const saved=practiceEvidence(q,record);
  if(saved)evidence.set(q.id,saved);
 }
 for(const a of chapterAttempts){
  if(a.subject!==subject||a.kind!=='chapter'||!['marking','settled'].includes(a.status))continue;
  const at=recordedAt(a.submittedAt)||recordedAt(a.result?.settledAt)||recordedAt(a.startedAt);
  const scores=a.status==='settled'?a.result?.scores:a.marks;
  for(const snapshot of a.questions){
   const q=questions.get(snapshot.sourceId||snapshot.id);
   if(!q||(q.revision??1)!==(snapshot.revision??1)||!validAnswer(snapshot,a.answers?.[snapshot.id]))continue;
   const score=scores?.[snapshot.id];
   // Converted true/false variants cover the original question, but do not judge the original skill.
   const checked=!snapshot.sourceId&&Number.isInteger(score)&&score>=0&&score<=snapshot.points&&snapshot.points>0;
   evidence.set(q.id,combineEvidence(evidence.get(q.id),{submittedAt:at,...(checked?{checkedAt:at,correct:score===snapshot.points}:{})}));
  }
 }
 for(const q of course.questions){
  const summary=summaries.get(String(q.chapter));
  if(!summary||q.pool==='exam')continue;
  summary.total++;
  const result=evidence.get(q.id);
  if(!result)continue;
  summary.done++;
  if(typeof result.correct!=='boolean'){summary.waiting++;continue;}
  summary.graded++;
  if(result.correct)summary.correct++;
  else summary.wrong.push(q);
 }
 return summaries;
}
