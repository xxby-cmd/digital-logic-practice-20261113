import {uiIcon,questionTitle,codingStatement,editorControls,bindWorkbenchUI} from './workbench-ui.js';
import {AI_GRADING_VERSION,enableAIGrading,usesAIGrading,isAIQuestion,isCodingReview,pendingAIQuestions,applyAIReview,validAIReview,requestAIReviews} from './ai-grading.js';
import {bindSelectionExplainer} from './selection-explainer.js';
import {bindTermHelp} from './term-help.js';
import {visibleReadingQuestion} from './java-reading.js';
import {isProgrammingQuestion,codeEditor,bindCodeEditors,requestCodeJudge,codeTaskGuide,preferredCodeLanguage} from './code-editor.js';
import {getCourse,progressKey} from './course-banks.js';
import {subjects,resolveRoute} from './subjects.js';
import {sanitizeProgress,emptyProgress} from './progress.js';
import {grade,validAnswer} from './grading.js';
import {diagram} from './diagrams.js';
import {fullExamPapers as examPapers,fullExamBlueprints as examBlueprints} from './full-exams.js';
import {getPracticeCourse} from './practice-library.js';
import {chapterAvailability,composeChapterTest} from './chapter-tests.js';
import {practiceTypes,practiceType,filterPracticeTypes,practiceTypeCounts} from './practice-types.js';
import {DEFAULT_CHAPTER_PRACTICE_TOTAL,chapterDefaultKinds,normalizeChapterDefault,chapterPracticePresets,chapterPracticeKinds,chapterPracticeCounts,chapterPracticeStock,chapterPracticeShortages,composeChapterPractice} from './chapter-practice.js';
import {startExam,startChapterTest,submitExam,expireExam,saveExamAnswer,setMark,settleExam,totalPoints,nextPaper,drawPractice,pendingCodeQuestions,applyCodeResult} from './sessions.js';
import {mergeBackup,reconcilePracticeRecords} from './room-progress.js';
import {chapterStudyProgress,notePracticeSubmission,preservePracticeStudy} from './study-progress.js';

const KEY='course-practice-room-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={single:'选择题',fill:'填空题',short:'简答题'};
let storageOK=true;
const practiceBank=id=>getPracticeCourse(id).questions;
function filteredPractice(){const p=practice();return filterPracticeTypes(state.subject,practiceBank(state.subject),p.chapter,p.kind);}
function tests(){return room.tests||(room.tests=[]);}
function studyOverviewOpen(subject){return state.subject===subject&&['menu','review'].includes(state.mode);}
function load(){
 try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(parsed.version===2&&Array.isArray(parsed.attempts)&&parsed.practice)return parsed;throw Error('记录格式无法识别');}
  const room={version:2,attempts:[],practice:{}};
  for(const s of subjects.filter(s=>s.ready)){
   const old=localStorage.getItem(progressKey(s.id));let progress=emptyProgress();
   if(old){try{progress=sanitizeProgress(JSON.parse(old),getCourse(s.id).questions);}catch{/* 原记录保留在原存储中 */}}
   room.practice[s.id]={seen:[],current:null,records:progress.records,legacy:progress};
  }
  return room;
 }catch{storageOK=false;return {version:2,attempts:[],practice:{}};}
}
let room=load();
reconcilePracticeRecords(room,practiceBank);
let state={subject:null,mode:'menu',attempt:null},retryId=null,settingsDraft=null;
const retryCodeDrafts=new Map();
const judging=new Set(),judgeErrors=new Map();
async function markAttempt(a){
 if(typeof fetch!=='function'||!a||a.status!=='marking'||judging.has(a.id)||judgeErrors.has(a.id))return;
 const code=pendingCodeQuestions(a),written=pendingAIQuestions(a);
 if(!code.length&&!written.length){if(usesAIGrading(a)){settleExam(a);save();if(currentAttempt()===a||studyOverviewOpen(a.subject))render();}return;}
 judging.add(a.id);
 try{
  for(const q of pendingCodeQuestions(a)){
   const source=a.answers[q.id],language=a.answerLanguages?.[q.id]||'c',result=await requestCodeJudge(q.id,source,language);
   if(![...room.attempts,...tests()].includes(a))return;
   if(!applyCodeResult(a,q.id,source,result,language))throw Error('判题暂未完成，答卷已保留，请重试。');
   save();
  }
  while(pendingAIQuestions(a).length){
   const batch=pendingAIQuestions(a).slice(0,4),reviews=await requestAIReviews(a.subject,batch,a.answers,{languages:a.answerLanguages});
   if(![...room.attempts,...tests()].includes(a))return;
   for(const receipt of reviews)if(!applyAIReview(a,receipt))throw Error('评阅结果暂未保存，答卷已保留，请重试。');save();
  }
  if(usesAIGrading(a)){settleExam(a);save();}
 }catch(e){judgeErrors.set(a.id,e.message||'判题暂未完成，请重试。');}
 finally{judging.delete(a.id);if(currentAttempt()===a||studyOverviewOpen(a.subject))render();}
}
const practiceJobs=new Set();
async function markPracticeAnswer(subject,q,r){
 const key=`${subject}:${q.id}:${r.submissionId}`;if(typeof fetch!=='function'||practiceJobs.has(key)||r.reviewError||!r.reviewPending)return;
 practiceJobs.add(key);const source=r.answer,language=r.language||'c',token=r.submissionId;
 try{
  if(q.judge){const result=r.judged?.source===source&&(r.judged.language||'c')===language&&['accepted','wrong_answer','compile_error','runtime_error','time_limit','output_limit','invalid'].includes(r.judged.status)?r.judged:await requestCodeJudge(q.id,source,language);if(!['accepted','wrong_answer','compile_error','runtime_error','time_limit','output_limit','invalid'].includes(result.status))throw Error('判题暂未完成，请重试。');if(room.practice[subject]?.records[q.id]!==r||r.answer!==source||r.submissionId!==token)return;r.judged={...result,source,language};r.correct=result.status==='accepted';r.status=r.correct?'correct':'wrong';r.score=r.correct?100:0;}
  else{const [receipt]=await requestAIReviews(subject,[{...q,points:100}],{[q.id]:source},{languages:{[q.id]:language}});if(room.practice[subject]?.records[q.id]!==r||r.answer!==source||r.submissionId!==token)return;r.aiReview=receipt;r.score=receipt.score;r.correct=receipt.score===100;r.status=r.correct?'correct':'wrong';}
  r.reviewPending=false;notePracticeSubmission(q,r,r.study?.submittedAt??Date.now());save();
 }catch(error){if(room.practice[subject]?.records[q.id]===r&&r.submissionId===token){r.reviewError=error.message||'评阅暂未完成，作答已保存，请重试。';save();}}
 finally{practiceJobs.delete(key);if(studyOverviewOpen(subject)||(state.mode==='practice'&&state.subject===subject&&practice().current===q.id))render();}
}
function save(){if(!storageOK)return false;try{localStorage.setItem(KEY,JSON.stringify(room));return true;}catch{storageOK=false;return false;}}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.className='show';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='',3000);}
function practice(){return room.practice[state.subject]||(room.practice[state.subject]={seen:[],current:null,records:{}});}
function currentAttempt(){return (state.mode==='test'?tests():room.attempts).find(a=>a.id===state.attempt&&a.subject===state.subject);}
function text(value){return String(value??'').split(/(```[\s\S]*?```)/g).map(p=>p.startsWith('```')?`<pre class="problem-code"><code>${esc(p.replace(/^```[^\n]*\n?/,'').replace(/```$/,''))}</code></pre>`:esc(p)).join('');}
function answerText(q){return q.type==='single'?`${String.fromCharCode(65+q.answer)}. ${q.options[q.answer]}`:q.type==='fill'?q.answers.map((v,i)=>`第${i+1}空：${v[0]}`).join('；'):q.model;}
function answerLanguage(q,answer){
 const record=state.mode==='practice'?practice().records[q.id]:undefined,attempt=currentAttempt(),saved=state.mode==='practice'?record?.language:attempt?.answerLanguages?.[q.id];
 if(saved)return saved;const existing=state.mode==='practice'?record?.answer:attempt?.answers[q.id];
 return typeof existing==='string'&&existing.length?'c':isProgrammingQuestion(q)?preferredCodeLanguage(q):'c';
}
function solution(q){const language=isProgrammingQuestion(q)?answerLanguage(q):null,guide=language?codeTaskGuide(q,language):undefined;if(guide?.language==='java'&&guide.solution)q={...q,model:guide.solution,walkthrough:undefined,explanation:guide.explanation||''};return `<section class="feedback"><h3>参考答案与解析${language?` · ${language==='java'?'Java':'C17'}`:''}</h3><div class="problem-body">${text(answerText(q))}</div>${q.walkthrough?`<h4>先抓住这一点</h4><p>${esc(q.walkthrough.idea)}</p><ol class="solution-steps">${q.walkthrough.steps.map(v=>`<li>${text(v)}</li>`).join('')}</ol>${q.walkthrough.trap?`<p class="solution-trap"><strong>容易错在：</strong>${esc(q.walkthrough.trap)}</p>`:''}`:q.explanation?`<div class="problem-body">${text(q.explanation)}</div>`:''}${q.rubric?`<details><summary>评分与核对要点</summary><ul>${q.rubric.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details>`:''}${q.reference?.url?.startsWith('https://')?`<p class="muted-note">原题来源：<a href="${esc(q.reference.url)}" target="_blank" rel="noopener noreferrer">${esc(q.reference.title)}</a></p>`:''}</section>`;}
function answerFields(q,answer,prefix,disabled=false){
 if(prefix.startsWith('retry')){const draft=retryCodeDrafts.get(q.id);answer=isProgrammingQuestion(q)?draft?.source??answer:draft?.answer??answer;}
 const dis=disabled?'disabled':'';
 if(isProgrammingQuestion(q)){const attempt=currentAttempt(),allowRun=(state.mode==='practice'||attempt?.status==='settled')&&!disabled||(attempt?.status==='marking'&&q.manualReview===true),retry=prefix.startsWith('retry')?retryCodeDrafts.get(q.id):undefined;return editorControls()+codeEditor(q,answer,prefix,disabled,allowRun,retry?.language||answerLanguage(q,answer));}
 if(q.type==='single')return `<fieldset class="options answer-fieldset"><legend class="visually-hidden">第${esc(prefix)}题，选择一个答案</legend>${q.options.map((v,i)=>`<label class="option"><input ${dis} type="radio" name="${esc(prefix)}" data-answer="${q.id}" data-option="${i}" value="${i}" ${answer===i?'checked':''}>${q.section==='判断题'?'':`<b>${String.fromCharCode(65+i)}.</b>`}<span>${esc(v)}</span></label>`).join('')}</fieldset>`;
 // HTML discards a textarea's first LF; the extra LF below preserves the saved answer verbatim.
 if(q.type==='fill')return q.answers.map((_,i)=>{const value=esc(Array.isArray(answer)?answer[i]:''),attributes=`${dis} id="${prefix}-${i}" data-answer="${q.id}" data-blank="${i}" autocomplete="off"`;return `<div class="fill-row"><label for="${prefix}-${i}">第${i+1}空</label>${['c-tokens','integer-sequence','integer-set','literal-string'].includes(q.formats?.[i])?`<textarea ${attributes} class="structured-fill" rows="${Math.min(4,Math.max(1,String(Array.isArray(answer)?answer[i]??'':'').split(/\r\n?|\n/).length))}" spellcheck="false" autocapitalize="off">
${value}</textarea>`:`<input ${attributes} value="${value}">`}</div>`;}).join('');
 return `<label class="answer-label" for="${prefix}-text">你的作答</label><textarea ${dis} id="${prefix}-text" data-answer="${q.id}" spellcheck="false" placeholder="写出分析、计算过程或代码">${esc(typeof answer==='string'?answer:'')}</textarea>`;
}
function reviewFeedback(receipt){return `<section class="feedback ai-review" aria-label="AI评阅结果"><h3>评阅得分：${receipt.score} / ${receipt.points}</h3><p>${esc(receipt.feedback)}</p>${receipt.method==='code-reading'?`<p class="muted-note">${receipt.execution?receipt.execution.status==='accepted'?'代码测试通过，得分同时包含分析部分。':'代码测试未全部通过，已结合分析评阅。':'代码由AI评阅，本次没有执行测试。'}</p>`:''}<details><summary>逐点评阅</summary><ul>${receipt.criteria.map((point,i)=>`<li><strong>评分点${i+1} · ${point.verdict==='met'?'已满足':point.verdict==='partial'?'部分满足':'未满足'}：</strong>${esc(point.comment)}</li>`).join('')}</ul></details></section>`;}
function retryArea(q,i){
 const language=retryCodeDrafts.get(q.id)?.language||answerLanguage(q),changed=isProgrammingQuestion(q)&&language!==answerLanguage(q),guide=changed?codeTaskGuide(q,language):undefined,visible=changed?visibleReadingQuestion(q,language,guide):q;
 return `<section class="retry-area"><h3>重新作答${isProgrammingQuestion(q)?` · ${language==='java'?'Java':'C17'}`:''}</h3>${changed?`<section class="retry-language-question"><h4>本次重做题面</h4><div class="retry-public-statement">${codingStatement(visible,text,guide)}${diagram(q.diagram)}</div></section>`:''}<div class="answer-area">${answerFields(q,undefined,`retry${i}`)}</div><button class="btn small primary" data-retry-check="${q.id}">核对本次作答</button><div id="retry-feedback" role="status"></div></section>`;
}
function questionCard(q,i,answer,extra='',disabled=false,label=q.section||types[q.type]){
 const coding=isProgrammingQuestion(q),language=answerLanguage(q,answer),guide=coding?codeTaskGuide(q,language):undefined,displayQ=visibleReadingQuestion(q,language,guide);
 return `<article class="card exam-question" data-code-problem="${coding}" id="question-${i}">${coding?'<div class="problem-caption">题目描述</div>':''}<div class="section-bar"><strong>第 ${i} 题${coding?` · ${esc(questionTitle(q))}`:''}</strong><span>${esc(label)}${q.points?` · ${q.points}分`:''}</span></div><div class="problem-content"><div class="problem-layout"><div class="problem-statement">${coding?codingStatement(displayQ,text,guide):`<div class="problem-body">${text(q.stem)}</div>`}${diagram(q.diagram)}${coding?`<dl class="submission-limits"><div><dt>语言</dt><dd>${language==='java'?'Java':'C17'}</dd></div><div><dt>代码长度限制</dt><dd>32 KB</dd></div><div><dt>${language==='java'?'堆内存限制':'内存限制'}</dt><dd>64 MB</dd></div></dl>`:''}</div><div class="answer-area">${answerFields(q,answer,`q${i}`,disabled)}</div></div>${extra}</div></article>`;
}
function header(){const s=subjects.find(s=>s.id===state.subject);return `<header class="topbar"><a href="#/subjects" class="brand">${uiIcon('back')}<span>${s?.name||'课程练习室'}</span></a><span class="site-location">${s?'课程练习室':''}</span><nav class="top-right"><span class="points-pill">累计积分 ${totalPoints(room.attempts)}</span><a class="btn small" href="${state.subject?`#/subjects/${state.subject}/settings`:'#/settings'}">设置</a><button class="btn small" data-export>备份记录</button><a class="btn small" href="#/subjects">切换科目</a></nav></header>`;}
function siteSidebar(){
 if(state.mode==='settings')return `<div class="sidebar-heading">练习设置</div><a class="sidebar-row ${!state.subject?'active':''}" href="#/settings">全部科目默认配置</a>${subjects.filter(s=>s.ready).map(s=>`<a class="sidebar-row ${s.id===state.subject?'active':''}" href="#/subjects/${s.id}/settings">${esc(s.name)}</a>`).join('')}`;
 if(!state.subject)return `<div class="sidebar-heading">课程目录</div>${subjects.map(s=>`<a class="sidebar-row" href="#/subjects/${s.id}"><span>${esc(s.name)}</span><small>${s.ready?'可练习':'待开放'}</small></a>`).join('')}<p class="sidebar-note">先选课程，再按章节或题型开始练习。</p>`;
 if(state.mode==='practice'){
  const p=practice(),bank=filteredPractice(),all=practiceBank(state.subject);
  const groups=practiceTypeCounts(state.subject,all,p.chapter);
  return `<div class="sidebar-heading"><strong>题目总览</strong><span>作答 / 题数</span></div>${groups.filter(g=>g.count||g.id===p.kind).map(g=>`<button class="sidebar-row ${g.id===p.kind?'active':''}" data-practice-kind="${g.id}"><span>${esc(g.name)}</span><small>${all.filter(q=>practiceType(state.subject,q)===g.id&&(!p.chapter||p.chapter==='all'||String(q.chapter)===String(p.chapter))&&p.records[q.id]?.submitted).length} / ${g.count}</small></button>`).join('')}<div class="sidebar-heading section-heading"><strong>${practiceTypes.find(t=>t.id===p.kind)?.name||'题号导航'}</strong></div>${bank.length?`<div class="number-grid">${bank.map((q,i)=>`<button data-practice-open="${q.id}" class="${q.id===p.current&&!p.listView?'current ':''}${p.records[q.id]?.status==='correct'?'correct':p.records[q.id]?.submitted?'wrong':p.records[q.id]?.answer!==undefined?'answered':''}" aria-label="第${i+1}题" ${q.id===p.current&&!p.listView?'aria-current="true"':''}>${i+1}</button>`).join('')}</div><p class="sidebar-note">本类共 ${bank.length} 题</p>`:'<p class="sidebar-note">选择一种题型后，题号会显示在这里。</p>'}`;
 }
 const a=currentAttempt();
 if(a&&['exam','test'].includes(state.mode)){
  const qs=a.status==='settled'&&a.kind!=='chapter'?a.questions.filter(q=>a.result.scores[q.id]<q.points):a.questions;
  const groups=[...new Set(qs.map(q=>q.section||types[q.type]))];
  return `<div class="sidebar-heading"><strong>题目总览</strong><span>作答 / 题数</span></div>${groups.map(name=>{const group=qs.filter(q=>(q.section||types[q.type])===name);return `<button class="sidebar-row" data-section-jump="${a.questions.indexOf(group[0])+1}"><span>${esc(name)}</span><small>${group.filter(q=>validAnswer(q,a.answers[q.id])).length} / ${group.length}</small></button>`;}).join('')}<div class="sidebar-heading section-heading"><strong>题号导航</strong></div><div class="number-grid">${qs.map(q=>{const i=a.questions.indexOf(q)+1;return `<a href="#question-${i}" data-jump="${i}" class="${validAnswer(q,a.answers[q.id])?'answered':''}">${i}</a>`;}).join('')}</div><p class="sidebar-note">${a.kind==='chapter'?'章节练习 · 不计积分':'限时考试 · 120分钟'}</p>`;
 }
 return `<div class="sidebar-heading">章节目录</div>${getPracticeCourse(state.subject).chapters.map(c=>`<a class="sidebar-row ${String(c.id)===String(state.chapter)?'active':''}" href="#/subjects/${state.subject}/chapter-start/${c.id}"><span>${esc(c.name)}</span><small>${c.count}</small></a>`).join('')}<a class="sidebar-row sidebar-course-link" href="#/subjects/${state.subject}">返回课程概览</a>`;
}
function siteLayout(content){return `<div class="site-workspace"><nav class="site-rail" aria-label="主导航"><a href="#/subjects" class="${!state.subject?'active':''}">${uiIcon('courses')}<span>科目</span></a>${state.subject?`<a href="#/subjects/${state.subject}" class="${state.mode==='menu'?'active':''}">${uiIcon('overview')}<span>概览</span></a>`:''}</nav><aside class="site-sidebar" aria-label="课程与题目导航">${siteSidebar()}</aside><div class="site-content"><div class="workspace-controls"><button class="icon-btn" type="button" data-toggle-sidebar aria-label="切换侧栏" aria-expanded="true">${uiIcon('menu')}</button><span>${state.mode==='settings'?'练习设置':state.mode==='practice'?'分类练习':state.mode==='compose'?'章节组题':state.mode==='review'?'错题复习':state.mode==='test'?'章节练习':state.mode==='exam'?'限时考试':state.subject?'课程概览':'课程列表'}</span></div>${content}</div></div>`;}
function home(){return `<main class="subject-main" id="main"><div class="page-heading"><h1>我的课程</h1><p>选择科目，开始章节练习或限时考试。</p></div><section class="card table-card"><table class="subject-table"><thead><tr><th>课程</th><th>练习题数</th><th>考试</th><th>状态</th><th></th></tr></thead><tbody>${subjects.map(s=>`<tr><td><a class="course-name" href="#/subjects/${s.id}">${esc(s.name)}</a><p class="table-description">${esc(s.description)}</p></td><td>${s.ready?practiceBank(s.id).length:'—'}</td><td>${s.ready?`${examPapers[s.id]?.length||0}套`:'—'}</td><td><span class="status-badge ${s.ready?'ready':''}">${s.ready?'可练习':'等待材料'}</span></td><td><a class="btn small" href="#/subjects/${s.id}">${s.ready?'进入课程':'查看'}</a></td></tr>`).join('')}</tbody></table></section><p class="footer-note">作答保存在当前浏览器。章节练习不计积分，考试首次结算后积分固定。</p></main>`;}
function courseMenu(){
 const s=subjects.find(s=>s.id===state.subject);
 if(!s.ready)return `<main class="subject-main"><section class="pending-card"><h1>${s.name}</h1><h2>暂无习题</h2><p>等待材料补齐后开放。</p><a class="btn primary" href="#/subjects">返回科目</a></section></main>`;
 const p=practice(),papers=examPapers[s.id]||[],active=room.attempts.find(a=>a.subject===s.id&&a.status!=='settled'),next=nextPaper(papers,room.attempts,s.id),bp=examBlueprints[s.id];
 const history=[...room.attempts,...tests()].filter(a=>a.subject===s.id).slice().sort((a,b)=>b.startedAt-a.startedAt);
 return `<main class="subject-main"><div class="breadcrumb"><a href="#/subjects">全部科目</a><span>/</span>${s.name}</div><div class="heading-row"><div><h1>${s.name}</h1><p class="subtitle">选择章节，直接开始${chapterDefaultPlan().total}道练习。</p></div><span class="points-pill">本科积分 ${totalPoints(room.attempts,s.id)}</span></div>${chapterPanel()}<div class="mode-grid"><section class="card mode-card"><p class="eyebrow">PRACTICE</p><h2>逐题练习</h2><p>按题型练习，选择、填空、分析和代码题各练各的。</p><p class="muted-note">独立练习池 ${practiceBank(s.id).length} 题 · 本轮已抽 ${p.seen.length} 题<br>考试题不进入练习池，练习不计考试积分。</p>${practiceTypePicker(true)}<button class="btn" data-practice>按章节选择题型 →</button></section><section class="card mode-card"><p class="eyebrow">EXAM</p><h2>限时考试 <small>120分钟</small></h2><p>整卷作答，交卷前不显示答案与解析。到时自动交卷。</p><p class="muted-note">${bp?bp.groups.map(g=>`${g.name}${g.count}题`).join(' · '):'试卷准备中'}<br>每批100分 · 主观题提交后自动评阅 · 首次成绩固定</p><button class="btn primary" data-exam ${!active&&!next?'disabled':''}>${active?active.status==='active'?'继续考试 →':'完成历史答卷核对 →':next?'开始下一批 →':'本轮试卷已全部完成'}</button>${!active&&!next?'<p class="muted-note">当前试卷已用完，后续补入新题后再组卷；不会把旧题重排成“新批次”。</p>':''}</section></div><section class="card record-card"><h2>测验与考试记录</h2>${history.length?history.map(a=>`<div class="history-row"><div><h3>${esc(a.title)}</h3><p>${new Date(a.startedAt).toLocaleString('zh-CN',{hour12:false})} · ${a.status==='settled'?`${a.result.total} / 100分 · ${a.kind==='chapter'?'成绩已保存，不计积分':'积分已锁定'}`:a.status==='active'?(a.kind==='chapter'?'练习中':'考试中'):'已提交，待核对'}</p></div><a class="btn small" href="#/subjects/${s.id}/${a.kind==='chapter'?'test':'exam'}/${a.id}">${a.status==='settled'?(a.kind==='chapter'?'查看结果':'查看错题'):'继续'}</a></div>`).join(''):'<p class="muted-note">完成第一场考试后，成绩会保存在这里。</p>'}</section></main>`;
}
function studySummaries(course){return chapterStudyProgress(state.subject,course,practice().records,tests());}
function chapterStudyMeter(summary,chapter){
 const {done,total,graded,correct,waiting,wrong}=summary;
 const name=esc(chapter.name),review=wrong.length?`<a href="#/subjects/${state.subject}/review/${encodeURIComponent(chapter.id)}" aria-label="${name}，待巩固 ${wrong.length} 题">待巩固 ${wrong.length} 题</a>`:'';
 return `<div class="study-meter"><strong>已做 ${done} / ${total} 题</strong><progress value="${done}" max="${total||1}" aria-label="${name}练习进度"></progress><div class="study-metrics"><span>正确率 ${graded?`${Math.round(100*correct/graded)}%（${correct}/${graded}）`:'—'}</span><span>答对覆盖 ${correct}/${total}</span>${waiting?`<span>未计入正确率 ${waiting} 题</span>`:''}${review}</div></div>`;
}
function chapterPanel(){
 const course=getPracticeCourse(state.subject),summaries=studySummaries(course);
 return `<section class="card chapter-panel" id="chapter-panel"><div class="section-title"><h2>章节练习</h2><p>每组${chapterDefaultPlan().total}道。已做按交过的不同题目累计，正确率取每题最近一次判分。</p></div><div class="table-scroll"><table><thead><tr><th>章节</th><th>学习进度</th><th>操作</th></tr></thead><tbody>${course.chapters.map(c=>{
  const active=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(c.id)&&a.status!=='settled');
  const answered=active?.questions.filter(q=>validAnswer(q,active.answers[q.id])).length;
  return `<tr><td><a href="#/subjects/${state.subject}/chapter-start/${c.id}">${esc(c.name)}</a></td><td>${chapterStudyMeter(summaries.get(String(c.id)),c)}</td><td class="table-actions"><a class="btn small primary" href="#/subjects/${state.subject}/chapter-start/${c.id}">开始练习</a>${active?`<a class="btn small" href="#/subjects/${state.subject}/test/${active.id}">${active.status==='active'?`继续上次（${answered}/${active.questions.length}）`:'查看评阅'}</a>`:''}<a class="btn small" href="#/subjects/${state.subject}/chapter-practice/${c.id}">自定义组题</a><button class="btn small" data-chapter-practice="${c.id}" ${!c.count?'disabled':''}>逐题练习</button></td></tr>`;
 }).join('')}</tbody></table></div></section>`;
}
function chapterReviewPage(){
 const course=getPracticeCourse(state.subject),chapter=course.chapters.find(c=>String(c.id)===String(state.chapter));
 const wrong=studySummaries(course).get(String(chapter.id)).wrong.slice().sort((a,b)=>b.practiceWeight-a.practiceWeight);
 const path=`#/subjects/${state.subject}`;
 const breakdown=practiceTypes.map(t=>({name:t.name,count:wrong.filter(q=>practiceType(state.subject,q)===t.id).length})).filter(t=>t.count);
 return `<main class="room-main"><div class="breadcrumb"><a href="${path}">课程概览</a><span>/</span>${esc(chapter.name)}</div><div class="heading-row"><div><h1>待巩固</h1><p class="subtitle">${esc(chapter.name)} · ${wrong.length} 题</p></div><a class="btn" href="${path}/chapter-start/${chapter.id}">开始章节练习</a></div>${wrong.length?`<section class="card table-card"><div class="section-title"><p>${breakdown.map(t=>`${t.name} ${t.count} 题`).join(' · ')}</p></div><div class="table-scroll"><table aria-label="本章待巩固题目"><thead><tr><th>题目</th><th>题型</th><th>操作</th></tr></thead><tbody>${wrong.map(q=>`<tr><td>${esc(questionTitle(q))}</td><td>${esc(q.section||types[q.type])}</td><td><button type="button" class="btn small" data-study-retry="${esc(q.id)}">重做这题</button></td></tr>`).join('')}</tbody></table></div></section>`:'<p class="muted-note">本章暂无待巩固题。</p>'}</main>`;
}
function chapterPlan(){
 const bySubject=(room.chapterPracticeSettings||(room.chapterPracticeSettings={}))[state.subject]||((room.chapterPracticeSettings)[state.subject]={});
 return bySubject[state.chapter]||(bySubject[state.chapter]={preset:'choice',addJudgement:false,judgementCount:3,custom:{choice:20,fill:10,code:0,judgement:0}});
}
function chapterDefaultPlan(subject=state.subject){return normalizeChapterDefault(room.chapterPracticeDefaults?.[subject]||room.chapterPracticeDefaults?.all||{});}
function saveChapterDefault(plan){const previous=room.chapterPracticeDefaults;room.chapterPracticeDefaults={...previous};if(plan)room.chapterPracticeDefaults[state.subject||'all']=plan;else delete room.chapterPracticeDefaults[state.subject];if(!save()){room.chapterPracticeDefaults=previous;throw Error('设置未能保存，请先备份记录再重试。');}}
function defaultSettingsDraft(){
 if(!settingsDraft){const plan=chapterDefaultPlan();settingsDraft={...plan,enabledKinds:plan.enabledKinds||chapterDefaultKinds.map(k=>k.id),counts:plan.counts||Object.fromEntries(chapterDefaultKinds.map(k=>[k.id,k.id==='choice'?10:['fill','analysis'].includes(k.id)?5:0]))};}
 return settingsDraft;
}
function defaultSettingsSummary(){
 try{const plan=normalizeChapterDefault(defaultSettingsDraft());return plan.mode==='auto'?`每组 ${plan.total} 道 · 自动分配各题型数量`:`共 ${plan.total} 道 · ${chapterDefaultKinds.filter(k=>plan.counts[k.id]).map(k=>`${k.name}${plan.counts[k.id]}道`).join('、')}`;}
 catch(e){return e.message;}
}
function practiceSettingsPage(){
 const draft=defaultSettingsDraft(),scope=state.subject||'all';
 return `<main class="room-main settings-main"><div class="page-heading"><h1>练习设置</h1><p>保存一次，之后点击章节“开始练习”直接使用。</p></div><section class="card settings-card"><h2>默认练习配置</h2><div class="settings-row"><label for="practice-default-scope">应用范围</label><select id="practice-default-scope"><option value="all" ${scope==='all'?'selected':''}>全部科目（默认）</option>${subjects.filter(s=>s.ready).map(s=>`<option value="${s.id}" ${scope===s.id?'selected':''}>${s.name}</option>`).join('')}</select></div><p class="muted-note">${scope==='all'?'未单独设置的科目会沿用此配置。':'本科可单独保存配置；恢复默认后沿用全部科目的配置。'}</p><fieldset class="settings-modes"><legend>题型分配</legend><label><input type="radio" name="default-mode" data-default-mode value="auto" ${draft.mode==='auto'?'checked':''}>自动分配</label><label><input type="radio" name="default-mode" data-default-mode value="fixed" ${draft.mode==='fixed'?'checked':''}>指定各题型数量</label></fieldset>${draft.mode==='auto'?`<div class="settings-row"><label for="practice-default-total">每组总题量</label><input id="practice-default-total" type="number" min="1" max="100" step="1" value="${esc(draft.total)}"><span>道</span></div><fieldset class="settings-kind-options"><legend>参与抽取的题型</legend>${chapterDefaultKinds.map(k=>`<label><input type="checkbox" data-default-kind="${k.id}" ${draft.enabledKinds.includes(k.id)?'checked':''}>${k.name}</label>`).join('')}</fieldset><p class="muted-note">从本章选中的题型里自动组题，各类数量不固定。</p>`:`<div class="chapter-custom-counts settings-counts">${chapterDefaultKinds.map(k=>`<label>${k.name}<input type="number" min="0" max="100" step="1" data-default-count="${k.id}" value="${esc(draft.counts[k.id]??0)}"><span>道</span></label>`).join('')}</div><p class="muted-note">总题量为各题型数量之和，合计须为1–100道。本章缺少指定题目时会提示调整。</p>`}<p id="default-settings-summary" class="chapter-plan-summary" aria-live="polite">${esc(defaultSettingsSummary())}</p><p class="muted-note">同类题连续排列。设置用于之后开始的练习，已有答卷保持原样。</p><div class="settings-actions"><button class="btn primary" data-save-default-settings>保存设置</button><button class="btn" data-reset-default-settings>恢复默认</button><a class="btn" href="${scope==='all'?'#/subjects':`#/subjects/${scope}`}">返回练习</a></div><p id="default-settings-status" class="settings-status" role="status"></p></section></main>`;
}
function chapterPlanPreview(){
 try{const counts=chapterPracticeCounts(chapterPlan()),missing=chapterPracticeShortages(state.subject,state.chapter,counts);return {text:missing.length?missing.join('；'):chapterPracticeKinds.filter(k=>counts[k.id]).map(k=>`${counts[k.id]}道${k.name}`).join(' + '),invalid:!!missing.length};}
 catch(e){return {text:e.message,invalid:true};}
}
function updateChapterPlanPreview(){const preview=chapterPlanPreview(),output=document.querySelector('#chapter-plan-summary'),button=document.querySelector('[data-build-practice]');if(output){output.textContent=preview.text;output.className=preview.invalid?'chapter-plan-summary shortage':'chapter-plan-summary';}if(button)button.disabled=preview.invalid;}
function chapterComposer(){
 const c=getPracticeCourse(state.subject).chapters.find(c=>String(c.id)===String(state.chapter));if(!c)return `<main class="subject-main"><h1>章节不存在</h1><a href="#/subjects/${state.subject}">返回课程</a></main>`;
 const plan=chapterPlan(),stock=chapterPracticeStock(state.subject,state.chapter),preview=chapterPlanPreview();
 return `<main class="room-main"><div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>${esc(c.name)}</div><h1>自定义章节练习</h1><p class="subtitle">${esc(c.name)} · 设置题型与题量</p><section class="card chapter-composer"><fieldset class="chapter-plan-options"><legend>快捷选择</legend>${chapterPracticePresets.map(p=>`<label class="chapter-plan-option"><input type="radio" name="chapter-preset" data-chapter-preset value="${p.id}" ${plan.preset===p.id?'checked':''}><span><strong>${p.name}</strong><small>${chapterPracticeKinds.filter(k=>p.counts[k.id]).map(k=>`${p.counts[k.id]}道${k.name}`).join(' + ')}</small></span></label>`).join('')}<label class="chapter-plan-option"><input type="radio" name="chapter-preset" data-chapter-preset value="custom" ${plan.preset==='custom'?'checked':''}><span><strong>自定义</strong><small>自行设置各类题量</small></span></label></fieldset>${plan.preset==='custom'?`<div class="chapter-custom-counts">${chapterPracticeKinds.map(k=>`<label>${k.name}<input type="number" min="0" max="100" step="1" inputmode="numeric" data-practice-count="${k.id}" value="${esc(plan.custom[k.id]??0)}"><span>道</span></label>`).join('')}</div>`:`<div class="chapter-judgement-toggle"><label><input type="checkbox" id="chapter-add-judgement" ${plan.addJudgement?'checked':''}>额外加入判断题</label><label for="chapter-judgement-count">题量</label><select id="chapter-judgement-count" ${plan.addJudgement?'':'disabled'}>${[3,4,5].map(n=>`<option value="${n}" ${Number(plan.judgementCount)===n?'selected':''}>${n}道</option>`).join('')}</select><p class="muted-note">未勾选时不添加。判断题优先使用本章已有题，不足时从未被本组使用的选择题抽取，改为判断给定答案是否正确。</p></div>`}<p class="muted-note">本章现有：${chapterPracticeKinds.map(k=>`${k.name}${stock[k.id]}道`).join(' · ')}。<br>每组1–100题，满分100分，不计积分。同组题目不重复，优先抽取未练过的题。</p><p id="chapter-plan-summary" class="chapter-plan-summary ${preview.invalid?'shortage':''}" role="status" aria-live="polite">${esc(preview.text)}</p><button type="button" class="btn primary" data-build-practice ${preview.invalid?'disabled':''}>生成题目，开始练习</button></section></main>`;
}
function practiceTypePicker(compact=false){
 const p=practice(),groups=practiceTypeCounts(state.subject,practiceBank(state.subject),compact?'all':p.chapter);
 return `<section class="practice-kinds" aria-label="选择练习题型">${compact?'':'<h2>选择题型</h2><p class="muted-note">选好题型后，只抽取这一类题目。</p>'}<div class="practice-kind-grid ${compact?'compact':''}">${groups.filter((t,i)=>i<5||t.count).map(t=>`<button class="practice-kind" type="button" data-practice-kind="${t.id}" ${t.count?'':'disabled'}><strong>${t.name}</strong><span>${t.count?`${t.count} 道题`:'暂无题目'}</span></button>`).join('')}</div></section>`;
}
function practiceSelector(){
 const p=practice(),selected=p.chapter||'all',kind=practiceTypes.find(t=>t.id===p.kind);
 return `<div class="practice-filter"><label for="practice-chapter">选择章节</label><select id="practice-chapter"><option value="all">全部章节</option>${getPracticeCourse(state.subject).chapters.map(c=>`<option value="${c.id}" ${String(c.id)===String(selected)?'selected':''}>${esc(c.name)}（${kind?filterPracticeTypes(state.subject,practiceBank(state.subject),c.id,p.kind).length:c.count}题）</option>`).join('')}</select>${kind?`<label for="practice-kind">题型</label><select id="practice-kind">${practiceTypeCounts(state.subject,practiceBank(state.subject),p.chapter).filter(t=>t.count||t.id===p.kind).map(t=>`<option value="${t.id}" ${t.id===p.kind?'selected':''}>${t.name}（${t.count}题）</option>`).join('')}</select>`:''}</div>`;
}
function practiceList(bank){
 const p=practice(),page=Math.max(0,Math.min(p.listPage||0,Math.ceil(bank.length/20)-1)),visible=bank.slice(page*20,(page+1)*20);
 return `<section class="card table-card"><div class="section-title"><h2>题目列表</h2><span>${bank.length}道题</span></div><div class="table-scroll"><table><thead><tr><th>标号</th><th>标题</th><th>作答状态</th><th></th></tr></thead><tbody>${visible.map(q=>{const i=bank.indexOf(q)+1,r=p.records[q.id];return `<tr><td>${i}</td><td><button class="text-link question-list-link" data-practice-open="${q.id}">${esc(questionTitle(q))}</button></td><td><span class="status-badge ${r?.status==='correct'?'ready':''}">${r?.status==='correct'?'已答对':r?.submitted?'待巩固':r?.answer!==undefined?'已保存':'未作答'}</span></td><td><button class="btn small" data-practice-open="${q.id}">作答</button></td></tr>`;}).join('')}</tbody></table></div><div class="table-pagination"><span>共 ${bank.length} 题 · 每页20题</span><button class="btn small" data-list-page="${page-1}" ${page<=0?'disabled':''}>上一页</button><span>${page+1} / ${Math.max(1,Math.ceil(bank.length/20))}</span><button class="btn small" data-list-page="${page+1}" ${(page+1)*20>=bank.length?'disabled':''}>下一页</button></div></section>`;
}
function practicePage(){
 const p=practice(),kind=practiceTypes.find(t=>t.id===p.kind),bank=filteredPractice(),q=bank.find(q=>q.id===p.current);
 const top=`<div class="breadcrumb"><a href="#/subjects/${state.subject}">课程概览</a><span>/</span>分类练习</div>`;
 const course=getPracticeCourse(state.subject),chapter=course.chapters.find(c=>String(c.id)===String(q?.chapter??p.chapter));
 const chapterMeter=chapter?`<section class="card practice-study" aria-label="${esc(chapter.name)}学习进度"><strong>${esc(chapter.name)}</strong>${chapterStudyMeter(studySummaries(course).get(String(chapter.id)),chapter)}</section>`:'';
 if(!kind)return `<main class="room-main">${top}<h1>想练哪一种题？</h1>${chapterMeter}${practiceSelector()}${practiceTypePicker()}</main>`;
 if(p.listView)return `<main class="room-main">${top}<div class="heading-row"><h1>${kind.name}</h1><button class="btn" data-practice-show-question>返回当前题目</button></div>${chapterMeter}${practiceSelector()}${practiceList(bank)}</main>`;
 if(!q)return `<main class="room-main">${top}<div class="heading-row"><h1>${kind.name}</h1><button class="btn" data-change-kind>更换题型</button></div>${chapterMeter}${practiceSelector()}<section class="pending-card"><h2>${bank.length?'本类练习已完成':'当前章节暂无此类题目'}</h2><p>${bank.length?`本轮已抽完 ${bank.length} 道${kind.name}，可以重练或更换题型。`:'可以切换章节或选择其他题型。'}</p>${bank.length?'<button class="btn primary" data-practice-reset>重新练习这一类</button><button class="btn" data-practice-list>题目列表</button>':''}</section></main>`;
 const r=p.records[q.id],shown=r?.revealed,submitted=r?.submitted,i=bank.indexOf(q)+1,review=r?.aiReview&&validAIReview(q,r.answer,r.aiReview,100,r.language||'c')?r.aiReview:null;
 return `<main class="room-main practice-room">${top}<div class="heading-row"><div><h1>${kind.name}练习</h1><p class="subtitle">本轮已抽 ${bank.filter(q=>p.seen.includes(q.id)).length} / ${bank.length} 题</p></div><div class="question-navigation"><button class="btn" data-practice-list>题目列表</button><button class="btn" data-practice-prev>上一题</button><button class="btn primary" data-practice-next>下一题 →</button></div></div>${chapterMeter}${practiceSelector()}${questionCard(q,i,r?.answer,`<div class="answer-actions"><span class="save-state">作答自动保存</span><div><button class="btn" data-reveal>查看解析</button><button class="btn primary" data-practice-submit ${r?.reviewPending&&!r?.reviewError?'disabled':''}>${r?.reviewPending&&!r?.reviewError?'正在评阅…':r?.reviewError?'重试评阅':'提交作答'}</button></div></div>${submitted?`<p class="practice-status" role="status">${r.reviewPending?(r.reviewError?esc(r.reviewError):'作答已保存，正在自动评阅…'):r.status==='correct'?'回答正确':r.status==='wrong'?'本题还需巩固':'本题尚未评阅，提交后可自动核对。'}</p>`:''}${review?reviewFeedback(review):''}${shown?solution(q):''}`,!!r?.reviewPending&&!r?.reviewError,kind.name)}<p class="footer-note">练习不计考试积分。下一题只从当前题型与章节中抽取，本轮不重复。</p></main>`;
}
function examPage(){const a=currentAttempt();if(!a)return courseMenu();expireExam(a);save();
 const active=a.status==='active',marking=a.status==='marking',isTest=a.kind==='chapter',auto=usesAIGrading(a);
 const qs=a.status==='settled'&&!isTest?a.questions.filter(q=>a.result.scores[q.id]<q.points):a.questions;
 const answered=a.questions.filter(q=>validAnswer(q,a.answers[q.id])).length;
 return `<main class="room-main"><div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>${esc(a.title)}</div><section class="exam-toolbar card"><div><h1>${active?(isTest?(a.practicePlan?'章节练习':'章节测验'):'限时考试'):marking?(auto?'已提交 · 自动评阅':'历史答卷 · 核对结果'):isTest?'练习结果':'考试结果'}</h1><p>${active?`已答 <span id="answer-progress">${answered} / ${a.questions.length}</span> 题 · 满分100分`:marking?`${a.expired?'时间已到，已自动交卷。':'答卷已提交。'}作答已锁定，参考答案仅用于交卷后核对。`:`${a.result.total} / 100分 · ${isTest?'已保存成绩，不计积分':`已计入 ${a.result.total} 积分`}`}</p>${active&&isTest?`<progress class="chapter-draft-meter" id="chapter-draft-meter" value="${answered}" max="${a.questions.length}" aria-label="本组作答进度"></progress>`:''}</div>${active&&!isTest?'<div class="exam-clock"><small>剩余时间</small><strong id="countdown" role="timer"></strong></div><button class="btn primary" data-submit>交卷</button>':active?`<button class="btn primary" data-submit>${a.practicePlan?'提交练习':'提交测验'}</button>`:marking?(auto?'':`<button class="btn primary" data-settle>完成历史自评并结算</button>`):isTest?`<a class="btn" href="#/subjects/${state.subject}">返回课程</a><a class="btn primary" href="#/subjects/${state.subject}/chapter-start/${a.chapter}">开始下一组</a>`:`<a class="btn primary" href="#/subjects/${state.subject}">返回课程 / 下一批 →</a>`}</section>${active?`<div class="exam-progress"><span id="answer-progress">已答${answered}/${a.questions.length}</span><button class="btn small" data-save-draft>保存作答</button><span id="save-state">作答自动保存</span></div><nav class="exam-numbers" aria-label="题目导航">${a.questions.map((q,i)=>`<a href="#question-${i+1}" data-jump="${i+1}" class="${validAnswer(q,a.answers[q.id])?'answered':''}">${i+1}</a>`).join('')}</nav>`:marking?`<p class="marking-note">${auto?'选择、填空按答案核对；代码按测试判分，简答及分析由Codex评阅。完成后自动保存首次成绩。':'本份历史答卷沿用原评分方式：代码自动判题，其余主观题对照要点自评。'}章节练习不计积分。</p>`:isTest?'<p class="marking-note">测验已提交，以下为全部题目的答案与解析；重做不改变首次成绩，不计考试积分。</p>':'<p class="marking-note">以下仅列错题及未得满分的题。可重新作答核对，原分数和积分保持不变。</p>'}${marking&&(pendingCodeQuestions(a).length+pendingAIQuestions(a).length||judgeErrors.has(a.id))?`<section class="card marking-note" role="status"><strong>待评 ${pendingCodeQuestions(a).length+pendingAIQuestions(a).length} 道</strong><p>${esc(judgeErrors.get(a.id)||'正在自动评阅，答卷已锁定保存。刷新后可以继续。')}</p>${judgeErrors.has(a.id)?'<button class="btn primary" data-judge-retry>重试评阅</button>':''}</section>`:''}${qs.map(q=>{
  const i=a.questions.indexOf(q)+1,manual=q.type==='short'&&!q.judge&&!auto,receipt=auto&&validAIReview(q,a.answers[q.id],a.aiReviews?.[q.id],q.points,a.answerLanguages?.[q.id]||'c')?a.aiReviews[q.id]:null;let extra='';
  if(!active){extra=`<div class="score-line">${marking&&manual?`<label for="mark-${q.id}">自评分（0–${q.points}）</label><input id="mark-${q.id}" type="number" min="0" max="${q.points}" step="1" data-mark="${q.id}" value="${a.marks[q.id]??''}">`:`<strong>首次得分：${a.result?.scores[q.id]??a.marks[q.id]??'待判题'} / ${q.points}</strong>`}</div>${receipt?reviewFeedback(receipt):''}${solution(q)}${a.status==='settled'?`<button class="btn small" data-retry="${q.id}">重做本题（不计分）</button>${retryId===q.id?`${retryArea(q,i)}`:''}`:''}`;}
  return `${qs.indexOf(q)===0||qs[qs.indexOf(q)-1].section!==q.section?`<h2 class="question-type-heading">${esc(q.section||types[q.type])}</h2>`:''}${questionCard(q,i,a.answers[q.id],extra,!active)}`;
 }).join('')}${a.status==='settled'&&!qs.length?'<section class="pending-card"><h2>本批全部答对</h2><p>没有需要回看的错题，可以开始下一批。</p></section>':''}${marking&&!auto?'<div class="bottom-actions"><button class="btn primary" data-settle>完成自评并结算</button></div>':''}</main>`;
}
function readingHelpEnabled(){return !(state.mode==='exam'&&currentAttempt()?.status==='active');}
function readingContext(element){const article=element?.closest('.exam-question'),retry=element?.closest('.retry-area'),statement=(retry?.querySelector('.retry-public-statement')||article?.querySelector('.problem-statement'))?.innerText||'',choices=[...((retry||article)?.querySelectorAll('.option span')||[])].map(n=>n.innerText).join('\n'),language=(retry||article)?.querySelector('[data-code-workspace]')?.dataset.codeLanguage;return {subject:subjects.find(s=>s.id===state.subject)?.name||'',context:((language==='java'?'作答语言：Java。\n':'')+statement+'\n'+choices).trim().slice(0,5000)};}
function readingQuestions(questions){return questions.map(q=>visibleReadingQuestion(q,(retryId===q.id?retryCodeDrafts.get(q.id)?.language:null)||answerLanguage(q)));}
function render(){const s=subjects.find(s=>s.id===state.subject);document.title=`${s?.name||'选择科目'} · 课程练习室`;document.querySelector('#app').innerHTML=header()+siteLayout(state.mode==='settings'?practiceSettingsPage():!s?home():state.mode==='practice'?practicePage():state.mode==='compose'?chapterComposer():state.mode==='review'?chapterReviewPage():['exam','test'].includes(state.mode)?examPage():courseMenu())+'<footer class="room-backup"><button class="btn small" data-import>恢复记录备份</button><input id="backup-file" type="file" accept="application/json,.json" hidden></footer>'+(!storageOK?'<p class="storage-warning" role="alert">当前浏览器无法保存记录，请勿刷新或关闭页面，及时备份。</p>':'');bind();bindWorkbenchUI();bindSelectionExplainer({enabled:readingHelpEnabled,context:readingContext});bindTermHelp({subject:state.subject,enabled:readingHelpEnabled(),context:readingContext,questions:readingQuestions(state.mode==='practice'?filteredPractice():currentAttempt()?.questions||[]),courseQuestions:readingQuestions(state.subject?[...practiceBank(state.subject),...(examPapers[state.subject]||[]).flatMap(paper=>paper.questions),...(currentAttempt()?.questions||[])]:[]),refresh:render});updateClock();void markAttempt(currentAttempt());if(state.mode==='practice'){const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current),r=p.records[p.current];if(q&&r?.submitted&&r.reviewPending)void markPracticeAnswer(state.subject,q,r);}}
function navigate(hash){location.hash=hash;}
function draw(){const p=practice(),q=drawPractice(filteredPractice(),p.seen);p.current=q?.id||null;if(q)p.seen.push(q.id);save();}
function readAnswer(q,container=document){if(q.type==='single'){const v=container.querySelector(`input[data-answer="${q.id}"]:checked`);return v?Number(v.value):null;}if(q.type==='fill')return q.answers.map((_,i)=>container.querySelector(`[data-answer="${q.id}"][data-blank="${i}"]`)?.value||'');return container.querySelector(`textarea[data-answer="${q.id}"]`)?.value||'';}
function practiceDraft(q,previous,answer,language){
 return {...previous,study:preservePracticeStudy(q,previous),answer,...(language?{language}:{}),revision:q.revision??1,submitted:false,status:undefined,correct:undefined,score:undefined,aiReview:undefined,reviewPending:false,reviewError:undefined};
}
function syncPractice(){const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current);if(!q||p.listView)return;const answer=readAnswer(q),previous=p.records[q.id],language=isProgrammingQuestion(q)?answerLanguage(q):undefined;if(previous&&JSON.stringify(previous.answer)===JSON.stringify(answer)&&(!language||(previous.language||'c')===language)){if(language&&!previous.language){previous.language=language;save();}return;}p.records[q.id]=practiceDraft(q,previous,answer,language);save();}
function updateClock(){const a=currentAttempt();if(state.mode!=='exam'||!a||a.status!=='active')return;const left=Math.max(0,a.deadline-Date.now());const el=document.querySelector('#countdown');if(el){const n=Math.ceil(left/1000);el.textContent=`${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;el.className=left<=5*60*1000?'urgent':'';}if(left===0){expireExam(a);save();render();toast('时间已到，答卷已自动提交。');}}
function checkAllDeadlines(){let changed=false;for(const a of room.attempts)if(a.status==='active'&&Date.now()>=a.deadline){expireExam(a);changed=true;}if(changed)save();return changed;}
function exportRecords(){const blob=new Blob([JSON.stringify(room,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`课程练习记录_${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(){
 document.querySelector('#practice-default-scope')?.addEventListener('change',e=>navigate(e.target.value==='all'?'#/settings':`#/subjects/${e.target.value}/settings`));
 document.querySelectorAll('[data-default-mode]').forEach(el=>el.addEventListener('change',()=>{defaultSettingsDraft().mode=el.value;render();}));
 document.querySelector('#practice-default-total')?.addEventListener('input',e=>{defaultSettingsDraft().total=e.target.value;document.querySelector('#default-settings-summary').textContent=defaultSettingsSummary();});
 document.querySelectorAll('[data-default-kind]').forEach(el=>el.addEventListener('change',()=>{const draft=defaultSettingsDraft();draft.enabledKinds=el.checked?[...draft.enabledKinds,el.dataset.defaultKind]:draft.enabledKinds.filter(id=>id!==el.dataset.defaultKind);document.querySelector('#default-settings-summary').textContent=defaultSettingsSummary();}));
 document.querySelectorAll('[data-default-count]').forEach(el=>el.addEventListener('input',()=>{defaultSettingsDraft().counts[el.dataset.defaultCount]=el.value;document.querySelector('#default-settings-summary').textContent=defaultSettingsSummary();}));
 document.querySelector('[data-save-default-settings]')?.addEventListener('click',()=>{try{saveChapterDefault(normalizeChapterDefault(defaultSettingsDraft()));settingsDraft=null;render();document.querySelector('#default-settings-status').textContent='设置已保存，下次开始练习时生效。';}catch(e){const status=document.querySelector('#default-settings-status');status.textContent=e.message;status.className='settings-status error';}});
 document.querySelector('[data-reset-default-settings]')?.addEventListener('click',()=>{try{saveChapterDefault(state.subject?null:normalizeChapterDefault());settingsDraft=null;render();document.querySelector('#default-settings-status').textContent='已恢复默认配置。';}catch(e){const status=document.querySelector('#default-settings-status');status.textContent=e.message;status.className='settings-status error';}});
 document.querySelectorAll('[data-study-retry]').forEach(el=>el.addEventListener('click',()=>{
  const q=practiceBank(state.subject).find(q=>q.id===el.dataset.studyRetry&&String(q.chapter)===String(state.chapter));if(!q)return;
  const p=practice(),previous=p.records[q.id],resuming=previous?.submitted===false;
  p.records[q.id]={...practiceDraft(q,previous,resuming?previous.answer:undefined,previous?.language),revealed:false,judged:undefined};
  p.chapter=q.chapter;p.kind=practiceType(state.subject,q);p.current=q.id;p.listView=false;
  if(!p.seen.includes(q.id))p.seen.push(q.id);
  save();navigate(`#/subjects/${state.subject}/practice`);
 }));
 document.querySelectorAll('[data-practice-open]').forEach(el=>el.addEventListener('click',()=>{const q=filteredPractice().find(q=>q.id===el.dataset.practiceOpen);if(!q)return;syncPractice();const p=practice();p.current=q.id;p.listView=false;if(!p.seen.includes(q.id))p.seen.push(q.id);save();render();window.scrollTo?.({top:0});}));
 document.querySelector('[data-practice-list]')?.addEventListener('click',()=>{syncPractice();practice().listView=true;practice().listPage=0;save();render();});
 document.querySelector('[data-practice-show-question]')?.addEventListener('click',()=>{practice().listView=false;save();render();});
 document.querySelectorAll('[data-list-page]').forEach(el=>el.addEventListener('click',()=>{practice().listPage=Number(el.dataset.listPage);save();render();}));
 document.querySelector('[data-practice-prev]')?.addEventListener('click',()=>{syncPractice();const p=practice(),ids=new Set(filteredPractice().map(q=>q.id)),history=p.seen.filter(id=>ids.has(id)),i=history.indexOf(p.current);if(i>0){p.current=history[i-1];save();render();}else toast('这是本轮最早练习的题目。');});
 document.querySelectorAll('[data-section-jump]').forEach(el=>el.addEventListener('click',()=>document.querySelector(`#question-${el.dataset.sectionJump}`)?.scrollIntoView({behavior:'smooth',block:'start'})));

 document.querySelectorAll('[data-chapter-preset]').forEach(el=>el.addEventListener('change',()=>{const plan=chapterPlan();if(el.value==='custom'&&plan.preset!=='custom')plan.custom=chapterPracticeCounts(plan);plan.preset=el.value;save();render();}));
 document.querySelector('#chapter-add-judgement')?.addEventListener('change',e=>{chapterPlan().addJudgement=e.target.checked;save();render();});
 document.querySelector('#chapter-judgement-count')?.addEventListener('change',e=>{chapterPlan().judgementCount=Number(e.target.value);save();updateChapterPlanPreview();});
 document.querySelectorAll('[data-practice-count]').forEach(el=>el.addEventListener('input',()=>{chapterPlan().custom[el.dataset.practiceCount]=el.value;save();updateChapterPlanPreview();}));
 document.querySelector('[data-build-practice]')?.addEventListener('click',()=>{try{const paper=composeChapterPractice(state.subject,state.chapter,chapterPlan(),tests());const a=enableAIGrading(startChapterTest(state.subject,paper));tests().push(a);save();navigate(`#/subjects/${state.subject}/test/${a.id}`);}catch(e){toast(e.message);updateChapterPlanPreview();}});

 document.querySelector('[data-judge-retry]')?.addEventListener('click',()=>{const a=currentAttempt();judgeErrors.delete(a.id);void markAttempt(a);render();});
 bindCodeEditors(document,({questionId,source,result,language='c'})=>{if(state.mode!=='practice')return;const r=practice().records[questionId],q=practiceBank(state.subject).find(q=>q.id===questionId);if(!r||r.answer!==source||(r.language||'c')!==language)return;r.judged={source,status:result.status,language};if(q?.judge&&['accepted','wrong_answer'].includes(result.status)){r.status=result.status==='accepted'?'correct':'wrong';r.correct=result.status==='accepted';r.submitted=true;notePracticeSubmission(q,r);}save();},({questionId,language,previousLanguage='c',source})=>{
  const a=currentAttempt(),q=state.mode==='practice'?practiceBank(state.subject).find(q=>q.id===questionId):a?.questions.find(q=>q.id===questionId);if(!q)return;
  const nextSource=source===codeTaskGuide(q,previousLanguage)?.starter?codeTaskGuide(q,language)?.starter??'':source;
  if(state.mode==='practice'){const p=practice(),r=p.records[questionId]||{};p.records[questionId]={...practiceDraft(q,r,nextSource,language),judged:undefined};save();render();}
  else if(a?.status==='settled'&&retryId===questionId){retryCodeDrafts.set(questionId,{language,source:nextSource});render();}
  else if(a&&saveExamAnswer(a,questionId,nextSource,Date.now(),language)){save();render();}
 });
 const skip=document.querySelector('.skip');if(skip)skip.onclick=e=>{e.preventDefault();const main=document.querySelector('main');main?.setAttribute('tabindex','-1');main?.focus();};
 document.querySelector('[data-export]')?.addEventListener('click',exportRecords);
 document.querySelector('[data-import]')?.addEventListener('click',()=>document.querySelector('#backup-file').click());
 document.querySelector('#backup-file')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>8_000_000){toast('文件过大，请选择记录备份。');return;}try{const incoming=JSON.parse(await file.text());room=mergeBackup(room,incoming,state.subject);checkAllDeadlines();save();render();toast('记录已恢复，已有考试成绩保持不变。');}catch(error){toast(error.message||'无法读取此备份。');}});
 document.querySelector('[data-practice]')?.addEventListener('click',()=>{const p=practice();p.kind=null;p.current=null;save();navigate(`#/subjects/${state.subject}/practice`);});
 document.querySelectorAll('[data-practice-kind]').forEach(el=>el.addEventListener('click',()=>{if(state.mode==='practice')syncPractice();const p=practice();if(state.mode==='menu')p.chapter='all';p.kind=el.dataset.practiceKind;p.listView=false;draw();if(state.mode==='practice')render();else navigate(`#/subjects/${state.subject}/practice`);}));
 document.querySelector('[data-change-kind]')?.addEventListener('click',()=>{syncPractice();practice().kind=null;practice().current=null;save();render();});
 document.querySelector('#practice-kind')?.addEventListener('change',e=>{syncPractice();practice().kind=e.target.value;practice().listView=false;draw();render();});
 document.querySelectorAll('[data-chapter-practice]').forEach(el=>el.addEventListener('click',()=>{practice().chapter=el.dataset.chapterPractice;practice().kind=null;practice().current=null;save();navigate(`#/subjects/${state.subject}/practice`);}));
 document.querySelector('#practice-chapter')?.addEventListener('change',e=>{syncPractice();practice().chapter=e.target.value;draw();render();});
 document.querySelectorAll('[data-chapter-test]').forEach(el=>el.addEventListener('click',()=>{const chapter=el.dataset.chapterTest;const active=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(chapter)&&a.status!=='settled');if(active){navigate(`#/subjects/${state.subject}/test/${active.id}`);return;}try{const paper=composeChapterTest(state.subject,chapter,tests());const a=enableAIGrading(startChapterTest(state.subject,paper));tests().push(a);save();navigate(`#/subjects/${state.subject}/test/${a.id}`);}catch(error){toast(error.message);}}));
 document.querySelector('[data-save-draft]')?.addEventListener('click',()=>{save();toast(storageOK?'作答已保存，尚未提交，不显示答案与解析。':'保存失败，请备份记录。');});
 document.querySelector('[data-practice-next]')?.addEventListener('click',()=>{syncPractice();draw();render();window.scrollTo({top:0});});
 document.querySelector('[data-practice-reset]')?.addEventListener('click',()=>{const ids=new Set(filteredPractice().map(q=>q.id));practice().seen=practice().seen.filter(id=>!ids.has(id));draw();render();});
 document.querySelector('[data-reveal]')?.addEventListener('click',()=>{syncPractice();const p=practice();p.records[p.current].revealed=true;save();render();});
 document.querySelector('[data-practice-submit]')?.addEventListener('click',()=>{syncPractice();const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current),r=p.records[q.id];if(!validAnswer(q,r.answer)){toast('请先完成本题作答。');return;}let submittedAt=Date.now();if(q.type==='short'){if(r.reviewError){submittedAt=r.study?.submittedAt??submittedAt;delete r.reviewError;}else if(!r.reviewPending){r.submissionId=`${Date.now()}-${Math.random().toString(36).slice(2)}`;r.reviewPending=true;r.status='review';r.correct=null;}r.submitted=true;r.revealed=true;}else Object.assign(r,grade(q,r.answer),{submitted:true,revealed:true});notePracticeSubmission(q,r,submittedAt);save();render();});
 document.querySelector('[data-exam]')?.addEventListener('click',()=>{
  checkAllDeadlines();const old=room.attempts.find(a=>a.subject===state.subject&&a.status!=='settled');if(old){navigate(`#/subjects/${state.subject}/exam/${old.id}`);return;}
  const paper=nextPaper(examPapers[state.subject]||[],room.attempts,state.subject);if(!paper)return;
  const a=enableAIGrading(startExam(state.subject,paper));room.attempts.push(a);save();navigate(`#/subjects/${state.subject}/exam/${a.id}`);
 });
 document.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener(el.type==='radio'?'change':'input',()=>{
  if(el.classList.contains('structured-fill'))el.rows=Math.min(4,Math.max(1,el.value.split(/\r\n?|\n/).length));
  if(state.mode==='practice'){syncPractice();return;}
  const a=currentAttempt();if(!a)return;const q=a.questions.find(q=>q.id===el.dataset.answer);if(!q)return;const retry=el.closest?.('.retry-area');if(a.status==='settled'&&retry&&retryId===q.id){const answer=readAnswer(q,retry);retryCodeDrafts.set(q.id,isProgrammingQuestion(q)?{source:answer,language:retry.querySelector('[data-code-workspace]')?.dataset.codeLanguage||answerLanguage(q)}:{answer});return;}if(a.status!=='active')return;
  if(!saveExamAnswer(a,q.id,readAnswer(q),Date.now(),isProgrammingQuestion(q)?answerLanguage(q):undefined)){save();render();return;}save();
  const count=a.questions.filter(q=>validAnswer(q,a.answers[q.id])).length;const progress=document.querySelector('#answer-progress');if(progress)progress.textContent=`${count} / ${a.questions.length}`;
  const meter=document.querySelector('#chapter-draft-meter');if(meter)meter.value=count;
  const link=document.querySelector(`[data-jump="${a.questions.indexOf(q)+1}"]`);link?.classList.toggle('answered',validAnswer(q,a.answers[q.id]));
  const status=document.querySelector('#save-state');if(status)status.textContent=storageOK?'草稿已保存':'记录未能保存，请及时备份';
 }));
 document.querySelectorAll('[data-jump]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();document.querySelector(`#question-${el.dataset.jump}`)?.scrollIntoView({behavior:'smooth',block:'start'});}));
 document.querySelector('[data-submit]')?.addEventListener('click',()=>{
  const a=currentAttempt();expireExam(a);if(a.status==='active'){
   const left=a.questions.filter(q=>!validAnswer(q,a.answers[q.id])).length;
   const dialog=document.createElement('dialog');dialog.innerHTML=`<h2>确认交卷？</h2><p>${left?`还有${left}题未完成。`:''}交卷后不能修改本次作答，${usesAIGrading(a)?'系统会自动判分，主观题由Codex评阅。':'可查看解析并完成历史自评。'}</p><div class="answer-actions"><button class="btn" data-cancel>继续作答</button><button class="btn primary" data-confirm>确认交卷</button></div>`;document.body.append(dialog);dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-confirm]').onclick=()=>{submitExam(a);save();dialog.close();render();};dialog.onclose=()=>dialog.remove();dialog.showModal();
  }else{save();render();}
 });
 document.querySelectorAll('[data-mark]').forEach(el=>el.addEventListener('input',()=>{const a=currentAttempt();if(el.value==='')delete a.marks[el.dataset.mark];else if(!setMark(a,el.dataset.mark,el.value))delete a.marks[el.dataset.mark];save();}));
 document.querySelectorAll('[data-settle]').forEach(el=>el.addEventListener('click',()=>{try{settleExam(currentAttempt());save();render();toast('成绩已结算，分数与积分已固定。');}catch(e){toast(e.message);}}));
 document.querySelectorAll('[data-retry]').forEach(el=>el.addEventListener('click',()=>{retryId=el.dataset.retry;render();document.querySelector('.retry-area')?.scrollIntoView({block:'center'});}));
 document.querySelector('[data-retry-check]')?.addEventListener('click',async e=>{
  const button=e.currentTarget,a=currentAttempt(),q=a.questions.find(q=>q.id===button.dataset.retryCheck),area=document.querySelector('.retry-area'),answer=readAnswer(q,area),output=document.querySelector('#retry-feedback'),language=area.querySelector('select[data-code-language]')?.value||answerLanguage(q);
  if(!validAnswer(q,answer)){output.textContent='请先完成作答。';return;}
  if(q.type!=='short'){output.textContent=grade(q,answer).correct?'本次回答正确，原成绩保持不变。':'本次回答仍有误，请对照解析。';return;}
  button.disabled=true;output.textContent='正在核对本次作答，首次成绩和积分保持不变…';
  try{
   if(q.judge){const result=await requestCodeJudge(q.id,answer,language);if(!['accepted','wrong_answer','compile_error','runtime_error','time_limit','output_limit','invalid'].includes(result.status))throw Error('判题尚未完成，请重试。');output.textContent=result.status==='accepted'?'本次代码测试通过，首次成绩和积分保持不变。':'本次代码尚未通过全部测试，首次成绩和积分保持不变。';}
   else{const [receipt]=await requestAIReviews(a.subject,[q],{[q.id]:answer},{languages:{[q.id]:language}});output.innerHTML=reviewFeedback(receipt)+'<p>本次重做不改变首次成绩和积分。</p>';}
  }catch(error){output.textContent=error.message||'核对尚未完成，请重试。';}finally{button.disabled=false;}
 });
}
function route(){
 const parts=location.hash.replace(/^#\/?/,'').split('/');retryCodeDrafts.clear();
 state={subject:subjects.some(s=>s.id===parts[1])&&parts[0]==='subjects'?parts[1]:null,mode:'menu',attempt:null};retryId=null;settingsDraft=null;
 if(parts[0]==='settings'||(state.subject&&parts[2]==='settings'))state.mode='settings';
 if(state.subject&&subjects.find(s=>s.id===state.subject)?.ready&&parts[2]==='chapter-start'&&parts[3]&&parts.length===4){
  try{
   const configuration=chapterDefaultPlan();
   let a=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(parts[3])&&a.status!=='settled'&&a.practicePlan?.version===2&&JSON.stringify(a.practicePlan.configuration||normalizeChapterDefault({mode:a.practicePlan.mode,total:a.practicePlan.total,counts:a.practicePlan.counts}))===JSON.stringify(configuration));
   if(!a){a=enableAIGrading(startChapterTest(state.subject,composeChapterPractice(state.subject,parts[3],{...configuration,preset:configuration.mode},tests())));tests().push(a);save();}
   navigate(`#/subjects/${state.subject}/test/${a.id}`);return;
  }catch(e){render();toast(e.message);return;}
 }
 if(parts[2]==='practice'&&parts.length===3&&getCourse(state.subject).questions.length){state.mode='practice';if(!practice().current)draw();}
 if(['exam','test'].includes(parts[2])&&parts[3]){state.mode=parts[2];state.attempt=parts.slice(3).join('/');}
 if(state.subject&&parts[2]==='chapter-practice'&&parts[3]&&parts.length===4){state.mode='compose';state.chapter=parts[3];}
 if(state.subject&&parts[2]==='review'&&parts.length===4&&getPracticeCourse(state.subject).chapters.some(c=>String(c.id)===parts[3])){state.mode='review';state.chapter=parts[3];}
 const legacy=resolveRoute(location.hash,state.subject?practiceBank(state.subject):undefined);if(legacy.question){state.subject=legacy.subject;state.mode='practice';const p=practice();p.chapter='all';p.kind=practiceType(state.subject,practiceBank(state.subject).find(q=>q.id===legacy.question));p.current=legacy.question;p.listView=false;if(!p.seen.includes(legacy.question))p.seen.push(legacy.question);save();}
 checkAllDeadlines();render();
}
window.addEventListener('hashchange',route);
window.addEventListener('pageshow',()=>{if(checkAllDeadlines())render();else updateClock();});
window.addEventListener('focus',()=>{if(checkAllDeadlines())render();else updateClock();});
document.addEventListener?.('visibilitychange',()=>{if(checkAllDeadlines())render();else updateClock();});
window.addEventListener('storage',e=>{if(e.key===KEY){room=load();checkAllDeadlines();render();}});
if(typeof setInterval==='function')setInterval(()=>{if(checkAllDeadlines()){render();toast('考试时间已到，已自动交卷。');}else updateClock();},1000);
route();
