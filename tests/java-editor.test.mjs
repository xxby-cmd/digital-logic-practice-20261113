import test from 'node:test';
import assert from 'node:assert/strict';
import {getPracticeCourse} from '../practice-library.js';
import {javaTaskGuides} from '../java-task-guides.js';
import {preferredCodeLanguage,codeTaskGuide,codeEditor,requestCodeJudge} from '../code-editor.js';

test('适配题新作答默认Java并记主动C偏好，旧版本及C专属题仍用原接口',()=>{
 const previous=globalThis.localStorage,storage=new Map();
 try{
  globalThis.localStorage={getItem:key=>storage.get(key)??null};
  const questions=getPracticeCourse('structures').questions;
  for(const [id,guide]of Object.entries(javaTaskGuides)){
   const q=questions.find(q=>q.id===id);assert.equal(preferredCodeLanguage(q),'java');assert.equal(codeTaskGuide(q,'java'),guide);
   storage.set('practice-code-language','c');assert.equal(preferredCodeLanguage(q),'c');storage.clear();
   const old={...q,revision:1};assert.equal(preferredCodeLanguage(old),'c');assert.equal(codeTaskGuide(old,'java'),undefined);assert.ok(!codeEditor(old,undefined,'old').includes('value="java"'));
   const locked=codeEditor(q,'saved code','locked',true,true,'java');assert.ok(locked.includes('saved code'));assert.ok(locked.includes('value="java" selected'));assert.ok(!locked.includes('data-code-run'));assert.ok(!locked.includes('文件用例'));
  }
  const c=getPracticeCourse('programming').questions.find(q=>q.id==='6-02');assert.equal(preferredCodeLanguage(c),'c');assert.equal(codeTaskGuide(c,'java'),undefined);
 }finally{if(previous===undefined)delete globalThis.localStorage;else globalThis.localStorage=previous;}
});

test('提交携带所选语言，服务超时/不可用作为待判异常返回，不伪造学生得分',async()=>{
 const oldFetch=globalThis.fetch,oldLocation=globalThis.location;let payload;
 try{
  globalThis.location={protocol:'file:'};globalThis.fetch=async(url,options)=>{assert.equal(url,'http://127.0.0.1:4174/api/judge');payload=JSON.parse(options.body);return {ok:true,json:async()=>({status:'accepted',passed:3,total:3})};};
  const result=await requestCodeJudge('question','public class Solution {}','java');assert.equal(result.status,'accepted');assert.deepEqual(payload,{questionId:'question',source:'public class Solution {}',language:'java'});
  globalThis.fetch=async()=>({ok:false,status:503});await assert.rejects(()=>requestCodeJudge('question','saved code','java'),/已保留/);
  globalThis.fetch=async()=>({ok:true,json:async()=>({status:'unavailable'})});await assert.rejects(()=>requestCodeJudge('question','saved code','java'),/已保留/);
 }finally{globalThis.fetch=oldFetch;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
});

test('折半插入排序的新旧答卷保留对应Java题面，评分接受重叠搬移',()=>{
 const id='P4-structures-10-D-002';
 const old=getPracticeCourse('structures',{questionRevisions:{[id]:2}}).questions.find(q=>q.id===id);
 const latest=getPracticeCourse('structures').questions.find(q=>q.id===id);
 assert.equal(old.revision,2);
 assert.equal(latest.revision,3);
 assert.match(codeTaskGuide(old,'java').publicStatement,/采用所选方向/);
 assert.match(codeTaskGuide(latest,'java').publicStatement,/支持重叠区间的等价操作/);
 assert.match(codeTaskGuide(latest,'c').publicStatement,/支持重叠区间的等价操作/);
 assert.match(latest.rubric[1],/合法的重叠搬移/);
 assert.equal(codeTaskGuide(latest,'java').solution,codeTaskGuide(old,'java').solution);
 assert.equal(codeTaskGuide(latest,'java').manualReview,true);
});

test('绪论最值题覆盖整个类型范围，Java和C各自保留旧题面',()=>{
 const id='P4-structures-1-D-002';
 const old=getPracticeCourse('structures',{questionRevisions:{[id]:2}}).questions.find(q=>q.id===id);
 const latest=getPracticeCourse('structures').questions.find(q=>q.id===id);
 assert.equal(latest.revision,3);
 assert.doesNotMatch(codeTaskGuide(old,'java').publicStatement,/Integer\.MAX_VALUE/);
 assert.match(codeTaskGuide(latest,'java').publicStatement,/Integer\.MAX_VALUE.*Integer\.MIN_VALUE/);
 assert.match(codeTaskGuide(latest,'c').publicStatement,/INT_MAX初始化最小值、INT_MIN初始化最大值/);
 assert.match(latest.rubric[0],/完整int值域/);
 assert.equal(codeTaskGuide(latest,'java').solution,codeTaskGuide(old,'java').solution);
});
