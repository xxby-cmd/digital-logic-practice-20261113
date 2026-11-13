export function normalize(value){return String(value??'').normalize('NFKC').replace(/[\s，,；;]/g,'').replace(/[−–]/g,'-').toLowerCase();}
export function grade(question,answer){
 if(question.type==='short') return {status:'review',correct:null};
 if(question.type==='single')return {status:Number(answer)===question.answer?'correct':'wrong',correct:Number(answer)===question.answer};
 const entries=Array.isArray(answer)?answer:[answer];
 const correct=question.answers.every((variants,i)=>variants.some(v=>{const actual=normalize(entries[i]),expected=normalize(v);if(question.formats?.[i]==='number'&&/^-?\d*(\.\d+)?$/.test(actual)&&actual!==''&&Number.isFinite(Number(actual)))return Number(actual)===Number(expected);return expected===actual;}));
 return {status:correct?'correct':'wrong',correct};
}
export function validAnswer(q,answer){if(q.type==='single')return Number.isInteger(answer)&&answer>=0&&answer<q.options.length;if(q.type==='fill')return Array.isArray(answer)&&answer.length===q.answers.length&&answer.every(a=>String(a).trim().length>0);return typeof answer==='string'&&answer.trim().length>0;}
export function activeRecord(record){return record&&record.status!=='draft';}
export function counts(questions,records){let correct=0,wrong=0,review=0,done=0;for(const q of questions){const r=records[q.id];if(!activeRecord(r))continue;done++;if(r.status==='correct')correct++;else if(r.status==='wrong')wrong++;else review++;}return {correct,wrong,review,done,total:questions.length};}
