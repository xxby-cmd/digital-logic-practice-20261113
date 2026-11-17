// 仅结构化人工编写的题面；不枚举参数生成额外题数。
export function makeQuestions(subject,chapter,section,prefix,rows){
 const tags={'判断题':'J','选择题':'S','填空题':'F','应用题':'A','算法设计':'D','分析题':'R','综合应用':'C','程序填空':'B','编程题':'P'};
 return rows.map(([stem,...parts],i)=>{
  const q={id:`${prefix}-${subject}-${chapter}-${tags[section]}-${String(i+1).padStart(3,'0')}`,chapter,section,revision:1,pool:'practice',origin:'原创',stem};
  if(section==='选择题'||section==='判断题'){
   q.type='single';[q.options,q.answer,q.explanation]=parts;
   if(section==='选择题'){const shift=Array.from(q.id).reduce((n,c)=>n+c.charCodeAt(0),0)%q.options.length,options=q.options;q.options=options.map((_,j)=>options[(j+shift)%options.length]);q.answer=(q.answer-shift+options.length)%options.length;}
  }else if(section==='填空题'){
   q.type='fill';const [answers,why]=parts;q.answers=answers.map(a=>Array.isArray(a)?a:[String(a)]);q.formats=answers.map(a=>typeof a==='number'?'number':'text');q.explanation=why;
  }else{q.type='short';[q.model,q.rubric]=parts;}
  return q;
 });
}
