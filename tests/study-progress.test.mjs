import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {chapterStudyProgress,notePracticeSubmission,preservePracticeStudy} from '../study-progress.js';
import {mergeBackup} from '../room-progress.js';
import {getPracticeCourse} from '../practice-library.js';

const questions=['a','b','c','d','e','f'].map(id=>({id,chapter:'control',pool:'practice',type:'single',options:['甲','乙'],answer:0}));
questions[2].revision=2;
questions[4].legacyIds=['old-e'];
questions[5]={...questions[5],type:'short'};
const course={chapters:[{id:'control'}],questions};
const summary=(records,attempts)=>chapterStudyProgress('network',course,records,attempts).get('control');
const exercise=(changes={})=>({subject:'network',kind:'chapter',status:'settled',submittedAt:100,questions:[{...questions[0],points:10}],answers:{a:0},result:{scores:{a:10}},...changes});
const studySubject=getPracticeCourse('physics').questions.length?'physics':'network';
const settingsSubject=studySubject==='physics'?'software':'structures';

test('已做和正确率覆盖两种练习，合并源题、现行章节和最近有效判分',()=>{
 const q=questions[0],latest={answer:1,submitted:true,status:'wrong'};
 notePracticeSubmission(q,latest,120);
 const records={a:latest,b:{answer:0,submitted:false,revealed:true},c:{answer:0,status:'correct'},'old-e':{answer:0,status:'correct'},f:{answer:'过程',submitted:true,status:'review',reviewPending:true}};
 const converted={...questions[3],id:'derived',sourceId:'d',section:'判断题',points:5};
 const attempts=[
  exercise(),
  exercise({status:'active',questions:[{...questions[1],points:10}],answers:{b:0}}),
  exercise({subject:'digital',questions:[{...questions[1],points:10}],answers:{b:0}}),
  exercise({questions:[{...questions[2],revision:1,points:10}],answers:{c:0}}),
  exercise({questions:[converted],answers:{derived:0},result:{scores:{derived:5}}}),
  exercise({kind:'exam',questions:[{...questions[1],points:10}],answers:{b:0}})
 ];
 assert.deepEqual(summary(records,attempts),{total:6,done:4,correct:1,graded:2,waiting:2,wrong:[q]});
 assert.equal(summary(records,[...attempts,exercise({submittedAt:125})]).correct,2);
});

test('编辑新草稿或等待重评时保留已做和上一次判分，评阅完成后才替换',()=>{
 const q=questions[5],record={answer:'旧答案',submitted:true,status:'correct'};
 notePracticeSubmission(q,record,60);
 const draft={answer:'新草稿',submitted:false,study:preservePracticeStudy(q,record)};
 assert.equal(summary({f:draft},[]).correct,1);
 draft.submitted=true;draft.status='review';draft.reviewPending=true;
 notePracticeSubmission(q,draft,70);
 assert.equal(summary({f:draft},[]).correct,1);
 draft.status='wrong';draft.reviewPending=false;
 notePracticeSubmission(q,draft,70);
 assert.equal(summary({f:draft},[]).wrong[0],q);
 assert.equal(summary({f:{...draft,revision:2}},[]).done,0);
});

test('各科章节进度随现有备份恢复，较新判分保留本地草稿',()=>{
 const base={version:2,attempts:[],practice:{}};
 const course=getPracticeCourse(studySubject),q=course.questions.find(q=>q.type==='single');
 const local={revision:q.revision,answer:q.answer,submitted:false};
 const imported={revision:q.revision,answer:(q.answer+1)%q.options.length,submitted:true,status:'wrong'};
 notePracticeSubmission(q,imported,300);
 const current={...base,practice:{[studySubject]:{records:{[q.id]:local}}}};
 const backup={...base,practice:{[studySubject]:{records:{[q.id]:imported}},[settingsSubject]:{records:{}}},chapterPracticeDefaults:{[settingsSubject]:{mode:'auto',total:10}}};
 const restored=mergeBackup(current,JSON.parse(JSON.stringify(backup)));
 const records=restored.practice[studySubject].records;
 assert.deepEqual(records[q.id],{...local,study:imported.study});
 assert.equal(chapterStudyProgress(studySubject,course,records).get(String(q.chapter)).wrong[0].id,q.id);
 assert.equal(restored.chapterPracticeDefaults[settingsSubject].total,10);
});

test('在正式构建中从章节进度进入错题，重做隐藏旧答案且刷新保留进度',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const script=new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 const course=getPracticeCourse(studySubject),q=course.questions.find(q=>q.type==='single');
 const chapter=course.chapters.find(c=>c.id===q.chapter),counter='已做 1 / '+chapter.count+' 题',subjectPath='#/subjects/'+studySubject;
 const key='course-practice-room-v2',storage=new Map();
 const wrong=(q.answer+1)%q.options.length,record={answer:wrong,submitted:true,status:'wrong',revealed:true,revision:q.revision};
 notePracticeSubmission(q,record,10);
 storage.set(key,JSON.stringify({version:2,attempts:[],practice:{[studySubject]:{seen:[],current:null,records:{[q.id]:record}}}}));
 const nodes=new Map(),handlers=new Map(),location={hash:subjectPath};
 const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',dataset:{},addEventListener(name,fn){this[name]=fn;},setAttribute(){}});return nodes.get(selector);};
 const row=node('retry');row.dataset.studyRetry=q.id;
 const context=()=>createContext({document:{title:'',querySelector:node,querySelectorAll:selector=>selector==='[data-study-retry]'?[row]:[]},
  window:{addEventListener:(name,fn)=>handlers.set(name,fn)},location,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 script.runInContext(context());
 const view=()=>node('#app').innerHTML;
 assert.ok(view().includes(counter));
 assert.match(view(),/正确率 0%（0\/1）/);
 location.hash=subjectPath+'/review/'+q.chapter;handlers.get('hashchange')();
 assert.match(view(),/重做这题/);
 row.click();handlers.get('hashchange')();
 assert.ok(view().includes(counter));
 assert.doesNotMatch(view(),/参考答案与解析|value="\d" checked/);
 script.runInContext(context());
 assert.match(view(),/待巩固 1 题/);
 assert.ok(view().includes(counter));
});
