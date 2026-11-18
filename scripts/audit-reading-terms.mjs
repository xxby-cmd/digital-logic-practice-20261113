import {getPracticeCourse} from '../practice-library.js';
import {fullExamPapers} from '../full-exams.js';
import {reviseQuestionLanguage} from '../question-language.js';
import {practiceQuestionAtRevision} from '../bank-revisions.js';
import {courseTermPlan} from '../term-planner.js';
import {termCatalogue} from '../term-candidates.js';
import {visibleReadingQuestion} from '../java-reading.js';
import {javaTaskGuide} from '../java-task-guides.js';

export function auditReadingTerms(references={}, {requireCompiled=true,javaGuideFor=javaTaskGuide,referenceRevisions={}}={}){
 const report=[];
 for(const subject of ['network','structures','digital','programming']){
  const missing=termCatalogue(subject).filter(entry=>['definition','purpose','example'].some(key=>typeof entry[key]!=='string'||entry[key].trim().length<6));
  if(requireCompiled&&missing.length)throw Error(`名词短注尚未预存完整：${subject} ${missing.map(entry=>entry.id).join('、')}`);
  const questions=[...getPracticeCourse(subject).questions,...(references[subject]||[]).map(q=>practiceQuestionAtRevision(reviseQuestionLanguage(q),undefined,referenceRevisions[q.id])),...(fullExamPapers[subject]||[]).flatMap(paper=>paper.questions)],plan=courseTermPlan(subject,questions);
  if(!plan.complete)throw Error(`名词短注未满足每题2个及整科5%上限：${subject}，请补充与题面相关的概念：${plan.shortages.map(s=>s.id).join('、')}`);
  if([...plan.usage.values()].some(count=>count>plan.limit))throw Error(`名词配额核验失败：${subject}`);
  const javaQuestions=questions.map(q=>visibleReadingQuestion(q,'java',javaGuideFor(q.id,q.revision??1))),changed=javaQuestions.filter((q,i)=>q!==questions[i]).length;
  const javaPlan=changed?courseTermPlan(subject,javaQuestions):null;
  if(javaPlan&&(!javaPlan.complete||[...javaPlan.usage.values()].some(count=>count>javaPlan.limit)))throw Error(`Java可见题面的名词短注未满足每题2个及整科5%上限：${subject}`);
  report.push({subject,questions:plan.questionCount,notes:plan.total,maxUsage:Math.max(...plan.usage.values()),limit:plan.limit,...(javaPlan?{javaVariant:{adapted:changed,questions:javaPlan.questionCount,notes:javaPlan.total,maxUsage:Math.max(...javaPlan.usage.values()),limit:javaPlan.limit}}:{})});
 }
 return report;
}
