import {formattedFillEqual} from './fill-answer-formats.js';
export function normalize(value){return String(value??'').normalize('NFKC').replace(/[\s，,；;]/g,'').replace(/[−–]/g,'-').toLowerCase();}
export const GRADING_VERSION=2;
export function grade(question,answer,version=GRADING_VERSION){
 if(![1,GRADING_VERSION].includes(version))throw Error('评分版本不受支持，请保留原备份。');
 if(question.type==='short') return {status:'review',correct:null};
 if(question.type==='single')return {status:Number(answer)===question.answer?'correct':'wrong',correct:Number(answer)===question.answer};
 const entries=Array.isArray(answer)?answer:[answer];
 const numeric=version===1?/^-?\d*(\.\d+)?$/:/^[+-]?\d*(\.\d+)?$/;
 const results=question.answers.map((variants,i)=>variants.some(v=>{const structured=formattedFillEqual(question.formats?.[i],entries[i],v);if(structured!==null)return structured;const actual=normalize(entries[i]),expected=normalize(v);if(question.formats?.[i]==='number'&&numeric.test(actual)&&actual!==''&&Number.isFinite(Number(actual)))return Number(actual)===Number(expected);return expected===actual;}));
 const correct=results.every(Boolean);return {status:correct?'correct':'wrong',correct,correctBlanks:results.filter(Boolean).length};
}
export function validAnswer(q,answer){if(q.type==='single')return Number.isInteger(answer)&&answer>=0&&answer<q.options.length;if(q.type==='fill')return Array.isArray(answer)&&answer.length===q.answers.length&&answer.every(a=>String(a).trim().length>0);return typeof answer==='string'&&answer.trim().length>0;}
export function activeRecord(record){return record&&record.status!=='draft';}
export function counts(questions,records){let correct=0,wrong=0,review=0,done=0;for(const q of questions){const r=records[q.id];if(!activeRecord(r))continue;done++;if(r.status==='correct')correct++;else if(r.status==='wrong')wrong++;else review++;}return {correct,wrong,review,done,total:questions.length};}
