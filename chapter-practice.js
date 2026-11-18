import {getPracticeCourse,PRACTICE_LAYOUT_VERSION} from './practice-library.js';
import {practiceType,practiceTypes} from './practice-types.js';
import {drawPractice} from './sessions.js';

export const DEFAULT_CHAPTER_PRACTICE_TOTAL=20;
const automaticKinds=['choice','judgement','fill','code-fill','analysis','calculation','design','code'].map(id=>practiceTypes.find(k=>k.id===id));
export const chapterDefaultKinds=automaticKinds;
export function normalizeChapterDefault(config={}){
 if(!config||Array.isArray(config)||typeof config!=='object')throw Error('默认练习配置格式不正确');
 const mode=config.mode??'auto';if(!['auto','fixed'].includes(mode))throw Error('请选择自动分配或指定题型数量');
 if(mode==='fixed'){
  const counts={};
  for(const k of automaticKinds){const n=Number(config.counts?.[k.id]??0);if(!Number.isInteger(n)||n<0||n>100)throw Error(`${k.name}题量须为0至100的整数`);counts[k.id]=n;}
  const total=Object.values(counts).reduce((s,n)=>s+n,0);if(total<1||total>100)throw Error('各题型合计须为1至100道');
  return {mode,total,counts};
 }
 const total=Number(config.total??DEFAULT_CHAPTER_PRACTICE_TOTAL);if(!Number.isInteger(total)||total<1||total>100)throw Error('每组总题量须为1至100的整数');
 const ids=config.enabledKinds??automaticKinds.map(k=>k.id);
 if(!Array.isArray(ids)||!ids.length||ids.some(id=>!automaticKinds.some(k=>k.id===id))||new Set(ids).size!==ids.length)throw Error('至少选择一种有效题型');
 return {mode,total,enabledKinds:automaticKinds.filter(k=>ids.includes(k.id)).map(k=>k.id)};
}

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
function pools(subject,chapter,layout=PRACTICE_LAYOUT_VERSION,automatic=false,questionRevisions={}){
 const course=getPracticeCourse(subject,{layout,questionRevisions}),c=course.chapters.find(c=>String(c.id)===String(chapter));if(!c)throw Error('章节不存在');
 const groups=Object.fromEntries((automatic?automaticKinds:chapterPracticeKinds).map(k=>[k.id,[]]));
 for(const q of course.questions.filter(q=>String(q.chapter)===String(chapter))){const kind=automatic?practiceType(subject,q):planKind(subject,q);if(groups[kind])groups[kind].push(q);}
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
 if(!plan||['auto','fixed'].includes(plan.preset))return composeAutomaticPractice(subject,chapter,previous,random,normalizeChapterDefault({...plan,mode:plan?.preset??'auto'}));
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
 return {id:`chapter-practice-${subject}-${c.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,chapter:c.id,chapterLayout:PRACTICE_LAYOUT_VERSION,title:`${c.name} · 章节练习`,practicePlan:{version:1,counts},questions};
}
function composeAutomaticPractice(subject,chapter,previous,random,configuration){
 const {chapter:c,groups}=pools(subject,chapter,PRACTICE_LAYOUT_VERSION,true),pool=Object.values(groups).flat().filter(q=>configuration.mode==='fixed'||configuration.enabledKinds.includes(practiceType(subject,q)));
 const total=configuration.total;
 if(configuration.mode==='fixed')for(const k of automaticKinds)if(configuration.counts[k.id]>groups[k.id].length)throw Error(`${k.name}需${configuration.counts[k.id]}道，本章现有${groups[k.id].length}道，请在设置中调整。`);
 if(pool.length<total)throw Error(`所选题型在本章现有${pool.length}道题，暂不足${total}道，请调整设置或等待补齐。`);
 const used=new Set(previous.filter(a=>a.subject===subject&&String(a.chapter)===String(chapter)).flatMap(a=>a.questions.map(q=>q.sourceId||q.id)));
 const selected=[],ids=[],choose=(available,n)=>{const target=selected.length+n;for(const candidates of [available.filter(q=>!used.has(q.id)),available.filter(q=>used.has(q.id))])while(selected.length<target){const q=drawPractice(candidates,ids,random);if(!q)break;selected.push(q);ids.push(q.id);}};
 if(configuration.mode==='fixed')for(const k of automaticKinds)choose(groups[k.id],configuration.counts[k.id]);else choose(pool,total);
 const counts=Object.fromEntries(automaticKinds.map(k=>[k.id,0]));
 const questions=automaticKinds.flatMap(k=>selected.filter(q=>practiceType(subject,q)===k.id).map(q=>{counts[k.id]++;return {...q,section:k.name};})).map((q,i)=>({...q,points:Math.floor(100/total)+(i<100%total?1:0)}));
 return {id:`chapter-practice-${subject}-${c.id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,chapter:c.id,chapterLayout:PRACTICE_LAYOUT_VERSION,title:`${c.name} · 章节练习`,practicePlan:{version:2,mode:configuration.mode,total,counts,configuration},questions};
}
export function validateChapterPracticeSnapshot(a){
 const automatic=a.practicePlan?.version===2&&['auto','fixed'].includes(a.practicePlan.mode),kinds=automatic?automaticKinds:chapterPracticeKinds;
 if(!automatic&&a.practicePlan?.version!==1)throw Error('章节组题版本不匹配');
 const counts=automatic?a.practicePlan.counts:chapterPracticeCounts({preset:'custom',custom:a.practicePlan?.counts});
 if(automatic&&(!counts||Object.keys(counts).some(id=>!kinds.some(k=>k.id===id))||kinds.some(k=>!Number.isInteger(counts[k.id])||counts[k.id]<0)||!Number.isInteger(a.practicePlan.total)||a.practicePlan.total<1||a.practicePlan.total>100||Object.values(counts).reduce((s,n)=>s+n,0)!==a.practicePlan.total))throw Error('章节自动组题数量不匹配');
 if(automatic&&a.practicePlan.configuration){const config=normalizeChapterDefault(a.practicePlan.configuration);if(config.mode!==a.practicePlan.mode||config.total!==a.practicePlan.total||kinds.some(k=>config.mode==='fixed'?config.counts[k.id]!==counts[k.id]:counts[k.id]>0&&!config.enabledKinds.includes(k.id)))throw Error('章节组题与保存配置不匹配');}
 const questionRevisions=Object.fromEntries(a.questions.map(q=>[q.sourceId||q.id,q.revision??1]));
 const {groups}=pools(a.subject,a.chapter,a.chapterLayout??1,automatic,questionRevisions),pool=Object.values(groups).flat(),seen=new Set();
 if(a.questions.length!==Object.values(counts).reduce((s,n)=>s+n,0))throw Error('章节练习题量不匹配');
 for(let i=0;i<a.questions.length;i++){
  const actual=a.questions[i],source=pool.find(q=>q.id===(actual.sourceId||actual.id));if(!source||seen.has(source.id))throw Error('章节题目不可恢复');seen.add(source.id);
  if(automatic&&actual.sourceId)throw Error('自动组题须使用原有题型');
  const kind=actual.sourceId?'judgement':automatic?practiceType(a.subject,source):planKind(a.subject,source);if(!Object.hasOwn(counts,kind))throw Error('章节题型不匹配');
  if(automatic&&i>0&&kinds.findIndex(k=>k.name===a.questions[i-1].section)>kinds.findIndex(k=>k.id===kind))throw Error('章节同类题目应连续排列');
  const base=actual.sourceId?choiceAsJudgement(source,actual.judgementOption):{...source,section:kinds.find(k=>k.id===kind).name};
  const expected={...base,points:Math.floor(100/a.questions.length)+(i<100%a.questions.length?1:0)};
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('章节题目内容或分值不匹配');
 }
 for(const k of kinds)if(a.questions.filter(q=>q.section===k.name).length!==counts[k.id])throw Error('章节题型数量不匹配');
 return true;
}
