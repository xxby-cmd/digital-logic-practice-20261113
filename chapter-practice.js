import {getPracticeCourse} from './practice-library.js';
import {practiceType} from './practice-types.js';

export const chapterPracticePresets=[
 {id:'choice',name:'纯选择题',counts:{choice:30,fill:0,code:0,judgement:0}},
 {id:'mixed',name:'选择 + 填空',counts:{choice:20,fill:10,code:0,judgement:0}},
 {id:'code',name:'选择 + 填空 + 编程',counts:{choice:20,fill:5,code:5,judgement:0}}
];
export const chapterPracticeKinds=[{id:'choice',name:'选择题'},{id:'fill',name:'填空题'},{id:'code',name:'编程题'},{id:'judgement',name:'判断题'}];
export function chapterPracticeCounts(plan){
 let counts;
 if(plan?.preset==='custom')counts={...plan.custom};
 else{
  const preset=chapterPracticePresets.find(p=>p.id===plan?.preset);if(!preset)throw Error('请选择组题方案');
  counts={...preset.counts};
  if(plan.addJudgement){if(![3,4,5].includes(Number(plan.judgementCount)))throw Error('快捷方案可额外加入3至5道判断题');counts.judgement=Number(plan.judgementCount);}
 }
 const normalized={};
 for(const {id,name}of chapterPracticeKinds){const n=Number(counts[id]??0);if(!Number.isInteger(n)||n<0||n>100)throw Error(`${name}题量须为0至100的整数`);normalized[id]=n;}
 const total=Object.values(normalized).reduce((s,n)=>s+n,0);if(total<1||total>100)throw Error('每组请选择1至100道题');
 return normalized;
}
function planKind(subject,q){const kind=practiceType(subject,q);return kind==='code-fill'?'fill':kind;}
function pools(subject,chapter){
 const course=getPracticeCourse(subject),c=course.chapters.find(c=>String(c.id)===String(chapter));if(!c)throw Error('章节不存在');
 const groups=Object.fromEntries(chapterPracticeKinds.map(k=>[k.id,[]]));
 for(const q of course.questions.filter(q=>String(q.chapter)===String(chapter))){const kind=planKind(subject,q);if(groups[kind])groups[kind].push(q);}
 return {chapter:c,groups};
}
export function chapterPracticeStock(subject,chapter){const {groups}=pools(subject,chapter);return Object.fromEntries(chapterPracticeKinds.map(k=>[k.id,groups[k.id].length]));}
export function chapterPracticeShortages(subject,chapter,counts){
 const stock=chapterPracticeStock(subject,chapter),missing=[];
 for(const id of ['choice','fill','code'])if(counts[id]>stock[id])missing.push(`${chapterPracticeKinds.find(k=>k.id===id).name}需${counts[id]}道，本章现有${stock[id]}道`);
 const available=stock.judgement+Math.max(0,stock.choice-counts.choice);
 if(counts.judgement>available)missing.push(`判断题需${counts.judgement}道，本章可用${available}道（含未被本组选择题占用的题目）`);
 return missing;
}
function shuffle(qs,random){const a=qs.slice();for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function choiceAsJudgement(q,option){
 if(q.type!=='single'||!Array.isArray(q.options)||!Number.isInteger(option)||option<0||option>=q.options.length)throw Error('无法将此题改为判断题');
 return {...q,id:`${q.id}~judge-${option}`,sourceId:q.id,judgementOption:option,section:'判断题',type:'single',stem:`判断下面给定的答案是否正确。\n\n题目：${q.stem}\n给定答案：${q.options[option]}`,options:['正确','错误'],answer:option===q.answer?0:1,explanation:`原题正确答案：${q.options[q.answer]}。${q.explanation||''}`};
}
export function composeChapterPractice(subject,chapter,plan,previous=[],random=Math.random){
 const counts=chapterPracticeCounts(plan),missing=chapterPracticeShortages(subject,chapter,counts);if(missing.length)throw Error(missing.join('；'));
 const {chapter:c,groups}=pools(subject,chapter);
 // Prefer unseen source questions; once exhausted, a new practice group may revisit old questions.
 const used=new Set(previous.filter(a=>a.subject===subject&&String(a.chapter)===String(chapter)).flatMap(a=>a.questions.map(q=>q.sourceId||q.id)));
 const choose=(qs,n)=>[...shuffle(qs.filter(q=>!used.has(q.id)),random),...shuffle(qs.filter(q=>used.has(q.id)),random)].slice(0,n);
 const selected=[];
 for(const id of ['choice','fill','code'])selected.push(...choose(groups[id],counts[id]).map(q=>({...q,section:chapterPracticeKinds.find(k=>k.id===id).name})));
 const natives=choose(groups.judgement,Math.min(counts.judgement,groups.judgement.length));selected.push(...natives.map(q=>({...q,section:'判断题'})));
 const chosenIds=new Set(selected.map(q=>q.id)),extra=counts.judgement-natives.length;
 const converted=choose(groups.choice.filter(q=>!chosenIds.has(q.id)),extra);
 const truthFirst=random()<.5;
 converted.forEach((q,i)=>{const wrong=q.options.map((_,j)=>j).filter(j=>j!==q.answer);const option=((i%2===0)===truthFirst)?q.answer:wrong[Math.min(wrong.length-1,Math.floor(random()*wrong.length))];selected.push(choiceAsJudgement(q,option));});
 const total=selected.length,questions=selected.map((q,i)=>({...q,points:Math.floor(100/total)+(i<100%total?1:0)}));
 return {id:`chapter-practice-${subject}-${c.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,chapter:c.id,title:`${c.name} · 章节练习`,practicePlan:{version:1,counts},questions};
}
export function validateChapterPracticeSnapshot(a){
 const counts=chapterPracticeCounts({preset:'custom',custom:a.practicePlan?.counts});
 if(a.practicePlan?.version!==1)throw Error('章节组题版本不匹配');
 const {groups}=pools(a.subject,a.chapter),pool=Object.values(groups).flat(),seen=new Set();
 if(a.questions.length!==Object.values(counts).reduce((s,n)=>s+n,0))throw Error('章节练习题量不匹配');
 for(let i=0;i<a.questions.length;i++){
  const actual=a.questions[i],source=pool.find(q=>q.id===(actual.sourceId||actual.id));if(!source||seen.has(source.id))throw Error('章节题目不可恢复');seen.add(source.id);
  const kind=actual.sourceId?'judgement':planKind(a.subject,source);if(!Object.hasOwn(counts,kind))throw Error('章节题型不匹配');
  const base=actual.sourceId?choiceAsJudgement(source,actual.judgementOption):{...source,section:chapterPracticeKinds.find(k=>k.id===kind).name};
  const expected={...base,points:Math.floor(100/a.questions.length)+(i<100%a.questions.length?1:0)};
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('章节题目内容或分值不匹配');
 }
 for(const k of chapterPracticeKinds)if(a.questions.filter(q=>q.section===k.name).length!==counts[k.id])throw Error('章节题型数量不匹配');
 return true;
}
