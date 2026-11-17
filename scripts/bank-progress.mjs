import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {getPracticeCourse} from '../practice-library.js';
const local=process.argv.includes('--local');
const refs=local?JSON.parse(await readFile('../学习资料/外校题库参考/已接入题目.json','utf8')):{};
const goal=JSON.parse(await readFile('bank-goal.json','utf8'));
const subjects=goal.subjects;
const rows=subjects.flatMap(subject=>getPracticeCourse(subject).chapters.map(c=>{
 const qs=getPracticeCourse(subject).questions.filter(q=>String(q.chapter)===String(c.id));
 const originalIds=new Set(qs.map(q=>q.id)),extra=(refs[subject]||[]).filter(q=>String(q.chapter)===String(c.id)&&!originalIds.has(q.id));
 const stems=new Set([...qs,...extra].map(q=>q.stem.normalize('NFKC').replace(/\s/g,'')));
 const count=stems.size;return {subject,chapter:c.id,name:c.name,count,target:goal.targetPerChapter,missing:Math.max(0,goal.targetPerChapter-count),reached:count>=goal.targetPerChapter};
}));
const report={updatedAt:new Date().toISOString(),mode:local?'本地含已核原题':'源码不含原题',requiredMinimum:goal.targetPerChapter,units:rows.length,reachedUnits:rows.filter(r=>r.reached).length,knownUnitMissing:rows.reduce((s,r)=>s+r.missing,0),scopePending:goal.scopePending,goalComplete:rows.every(r=>r.reached)&&goal.scopePending.length===0&&goal.waitingSubjects.length===0,rows};
await mkdir('../制作记录/总目标进度',{recursive:true});
await writeFile('../制作记录/总目标进度/当前进度.json',JSON.stringify(report,null,2));
await writeFile('../制作记录/总目标进度/当前进度.csv','科目,章节,有效题数,目标,缺额\n'+rows.map(r=>`${r.subject},${r.name},${r.count},${r.target},${r.missing}`).join('\n'));
console.log(JSON.stringify({units:report.units,reached:report.reachedUnits,missing:report.knownUnitMissing,scopePending:report.scopePending},null,2));
if(process.argv.includes('--check-all')&&!report.goalComplete)process.exitCode=1;
