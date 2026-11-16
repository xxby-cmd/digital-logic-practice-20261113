import {getPracticeCourse} from './practice-library.js';
import {examBlueprints} from './exam-bank.js';

export function chapterCategory(subject,q){
 if(q.section)return q.section;
 if(q.type==='single')return '选择题';
 if(q.type==='fill')return '填空题';
 if(subject==='network')return q.model&&/计算|时延|利用率|带宽|窗口|ms|Mb\/s/.test(q.stem)?'计算题':'分析题';
 if(subject==='structures')return /算法|代码|函数|编写/.test(q.stem)?'算法设计':'应用题';
 if(subject==='programming')return /补全|补齐/.test(q.stem)?'程序填空':'编程题';
 return /设计|实现|连接/.test(q.stem)?'综合应用':'分析题';
}
function shuffle(qs,random){const a=qs.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function chapterAvailability(subject,chapter){
 const qs=getPracticeCourse(subject).questions.filter(q=>String(q.chapter)===String(chapter));
 return (examBlueprints[subject]?.groups||[]).map(g=>({...g,available:qs.filter(q=>chapterCategory(subject,q)===g.name).length}));
}
export function composeChapterTest(subject,chapter,previous=[],random=Math.random){
 const {questions,chapters}=getPracticeCourse(subject),c=chapters.find(c=>String(c.id)===String(chapter));if(!c)throw Error('章节不存在');
 const pool=questions.filter(q=>String(q.chapter)===String(chapter));
 const prior=new Set(previous.filter(a=>a.subject===subject&&String(a.chapter)===String(chapter)).flatMap(a=>a.questions.map(q=>q.id)));
 const groups=chapterAvailability(subject,chapter);const missing=groups.filter(g=>g.available<g.count);
 // 材料不足时不降题量、不跨章借题、不用换数题补齐。
 if(missing.length)throw Error(`本章暂不能按约定组卷：${missing.map(g=>`${g.name}需${g.count}题、现有${g.available}题`).join('；')}`);
 const repeated=groups.filter(g=>pool.filter(q=>chapterCategory(subject,q)===g.name&&!prior.has(q.id)).length<g.count);
 if(repeated.length)throw Error('本章未用题不足以组成下一批；可回看已有测验，待补入新题后再生成。');
 const selected=groups.flatMap(g=>shuffle(pool.filter(q=>chapterCategory(subject,q)===g.name&&!prior.has(q.id)),random).slice(0,g.count).map((q,i)=>({...q,section:g.name,points:Math.floor(g.points/g.count)+(i<g.points%g.count?1:0)})));
 return {id:`chapter-${subject}-${chapter}-${previous.length+1}`,chapter:c.id,title:`${c.name} · 章节测验`,questions:selected};
}
