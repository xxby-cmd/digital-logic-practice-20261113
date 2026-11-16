import {grade,validAnswer} from './grading.js';
export function emptyProgress(){return {version:1,records:{},favorites:[],last:null,archived:{}};}
export function sanitizeImportedProgress(input,subject,bank){
 if(input?.subject?input.subject!==subject:subject!=='digital')throw Error('Wrong subject');
 return sanitizeProgress(input,bank);
}
export function sanitizeProgress(input,bank){
 if(!input||input.version!==1||!input.records||typeof input.records!=='object'||Array.isArray(input.records)||!Array.isArray(input.favorites))throw Error('Invalid progress');
 const clean=emptyProgress();
 const ids=new Set(bank.map(q=>q.id));
 const aliases=new Map(bank.flatMap(q=>(q.legacyIds||[]).map(id=>[id,q.id])));
 const canonical=id=>aliases.get(id)||id;
 clean.favorites=[...new Set(input.favorites.map(canonical).filter(id=>ids.has(id)))];
 for(const [key,value]of Object.entries(input.archived||{}))if(/^\d+-\d{2}@\d+$/.test(key)&&value&&typeof value==='object')clean.archived[key]=value;
 for(const [id,r]of Object.entries(input.records)){
  if(!ids.has(canonical(id))&&/^\d+-\d{2}$/.test(id)&&r&&typeof r==='object')clean.archived[`${id}@${r.revision||1}`]={...r,retired:true,favorite:input.favorites.includes(id)};
 }
 for(const id of input.favorites)if(!ids.has(canonical(id))&&/^\d+-\d{2}$/.test(id)&&!input.records[id])clean.archived[`${id}@0`]={retired:true,favorite:true};
 for(const q of bank){
  const r=input.records[q.id]||(q.legacyIds||[]).map(id=>input.records[id]).find(Boolean);if(!r||typeof r!=='object')continue;
  const revision=q.revision||1;
  if((r.revision||1)!==revision){clean.archived[`${q.id}@${r.revision||1}`]={...r};continue;}
  if(r.status==='draft'){
   if(typeof r.answer==='string'||Array.isArray(r.answer)||r.answer===null||Number.isInteger(r.answer))clean.records[q.id]={status:'draft',answer:r.answer,revision,attempts:Math.max(0,Number(r.attempts)||0)};
   continue;
  }
  if(!validAnswer(q,r.answer))continue;
  const result=grade(q,r.answer);
  const status=q.type==='short'&&['correct','wrong'].includes(r.status)?r.status:result.status;
  clean.records[q.id]={answer:r.answer,status,revision,attempts:Math.max(1,Math.min(9999,Number(r.attempts)||1)),updatedAt:typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.updatedAt))?r.updatedAt:new Date().toISOString(),self:q.type==='short'&&status!=='review'};
 }
 if(ids.has(canonical(input.last)))clean.last=canonical(input.last);
 return clean;
}
export function mergeProgress(current,incoming){
 const merged={...current,records:{...current.records},favorites:[...new Set([...current.favorites,...incoming.favorites])],archived:{...incoming.archived,...current.archived}};
 for(const [id,r]of Object.entries(incoming.records)){const old=merged.records[id];if(!old||!old.updatedAt||(r.updatedAt&&Date.parse(r.updatedAt)>Date.parse(old.updatedAt)))merged.records[id]=r;}
 return merged;
}
