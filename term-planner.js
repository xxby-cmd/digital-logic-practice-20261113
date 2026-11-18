import {questionTermCandidates} from './term-candidates.js';

// Quotas count distinct questions in the whole course, never page visits.
// Aliases share one catalogue ID and therefore one capacity.
export function planCourseTerms(subject,questions,known={},capacity){
 const unique=[...new Map(questions.map(q=>[q.id,q])).values()].sort((a,b)=>String(a.id).localeCompare(String(b.id))),limit=Math.floor(unique.length/20),allocationLimit=Math.min(limit,capacity??limit);
 const rows=unique.map(q=>({q,candidates:questionTermCandidates(subject,q,known)})),frequency=new Map();
 for(const row of rows)for(const c of row.candidates)frequency.set(c.entry.id,(frequency.get(c.entry.id)||0)+1);
 const terms=[...frequency.keys()].sort(),termIndex=new Map(terms.map((id,i)=>[id,unique.length+1+i])),sink=unique.length+terms.length+1,graph=Array.from({length:sink+1},()=>[]);
 const edge=(from,to,capacity)=>{const a={to,capacity,reverse:graph[to].length},b={to:from,capacity:0,reverse:graph[from].length};graph[from].push(a);graph[to].push(b);return a;};
 // Scarce questions reserve their legitimate concepts before broad questions.
 const ordered=rows.slice().sort((a,b)=>a.candidates.length-b.candidates.length||String(a.q.id).localeCompare(String(b.q.id)));
 for(const row of ordered){row.node=rows.indexOf(row)+1;edge(0,row.node,2);row.links=row.candidates.slice().sort((a,b)=>(b.score-20*Math.log2(frequency.get(b.entry.id)))-(a.score-20*Math.log2(frequency.get(a.entry.id)))||a.entry.id.localeCompare(b.entry.id)).map(candidate=>({candidate,edge:edge(row.node,termIndex.get(candidate.entry.id),1)}));}
 for(const id of terms)edge(termIndex.get(id),sink,allocationLimit);
 let total=0;
 for(;;){
  const level=new Int32Array(graph.length).fill(-1),queue=[0];level[0]=0;
  for(let i=0;i<queue.length;i++)for(const e of graph[queue[i]])if(e.capacity&&level[e.to]<0){level[e.to]=level[queue[i]]+1;queue.push(e.to);}
  if(level[sink]<0)break;
  const next=new Int32Array(graph.length);
  const send=(v,available)=>{if(v===sink)return available;for(;next[v]<graph[v].length;next[v]++){const e=graph[v][next[v]];if(e.capacity&&level[e.to]===level[v]+1){const amount=send(e.to,Math.min(available,e.capacity));if(amount){e.capacity-=amount;graph[e.to][e.reverse].capacity+=amount;return amount;}}}return 0;};
  for(let sent;(sent=send(0,2));)total+=sent;
 }
 const byQuestion=new Map(),usage=new Map(),shortages=[];
 for(const row of rows){const selected=row.links.filter(link=>link.edge.capacity===0).map(link=>link.candidate).sort((a,b)=>b.score-a.score);byQuestion.set(row.q.id,selected.map(c=>c.entry));for(const c of selected)usage.set(c.entry.id,(usage.get(c.entry.id)||0)+1);if(selected.length<2)shortages.push({id:row.q.id,missing:2-selected.length,candidates:row.candidates.map(c=>c.entry.id)});}
 return {byQuestion,usage,shortages,limit,allocationLimit,total,questionCount:unique.length,complete:total===unique.length*2};
}

const cache=new Map();
export function courseTermPlan(subject,questions,known={}){
 // Keep one plan per course. Rebuild when content or the user's known terms change.
 const signature=JSON.stringify([questions.map(q=>[q.id,q.stem,q.options,q.readingLanguage]),Object.keys(known).filter(key=>key.startsWith(subject+':')&&known[key]).sort()]),previous=cache.get(subject);
 if(previous?.signature===signature)return previous.plan;
 let plan=planCourseTerms(subject,questions,known);
 // Prefer a lower repeat rate where it leaves enough relevant candidates.
 // Do not minimize it further at the expense of the question's important terms.
 if(plan.complete){const spread=planCourseTerms(subject,questions,known,Math.max(1,Math.floor(plan.questionCount*0.03)));if(spread.complete)plan=spread;}
 cache.set(subject,{signature,plan});return plan;
}
