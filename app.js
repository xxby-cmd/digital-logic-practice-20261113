import {isProgrammingQuestion,codeEditor,bindCodeEditors,requestCodeJudge} from './code-editor.js';
import {getCourse,progressKey} from './course-banks.js';
import {subjects,resolveRoute} from './subjects.js';
import {sanitizeProgress} from './progress.js';
import {grade,validAnswer} from './grading.js';
import {diagram} from './diagrams.js';
import {fullExamPapers as examPapers,fullExamBlueprints as examBlueprints} from './full-exams.js';
import {getPracticeCourse} from './practice-library.js';
import {chapterAvailability,composeChapterTest} from './chapter-tests.js';
import {practiceTypes,practiceType,filterPracticeTypes,practiceTypeCounts} from './practice-types.js';
import {chapterPracticePresets,chapterPracticeKinds,chapterPracticeCounts,chapterPracticeStock,chapterPracticeShortages,composeChapterPractice} from './chapter-practice.js';
import {startExam,startChapterTest,submitExam,expireExam,saveExamAnswer,setMark,settleExam,totalPoints,nextPaper,drawPractice,pendingCodeQuestions,applyCodeResult} from './sessions.js';
import {mergeBackup,reconcilePracticeRecords} from './room-progress.js';

const KEY='course-practice-room-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={single:'选择题',fill:'填空题',short:'简答题'};
let storageOK=true;
const practiceBank=id=>getPracticeCourse(id).questions;
function filteredPractice(){const p=practice();return filterPracticeTypes(state.subject,practiceBank(state.subject),p.chapter,p.kind);}
function tests(){return room.tests||(room.tests=[]);}
function load(){
 try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(parsed.version===2&&Array.isArray(parsed.attempts)&&parsed.practice)return parsed;throw Error('记录格式无法识别');}
  const room={version:2,attempts:[],practice:{}};
  for(const s of subjects.filter(s=>s.ready)){
   const old=localStorage.getItem(progressKey(s.id));let progress={records:{},favorites:[],archived:{}};
   if(old){try{progress=sanitizeProgress(JSON.parse(old),getCourse(s.id).questions);}catch{/* 原记录保留在原存储中 */}}
   room.practice[s.id]={seen:[],current:null,records:progress.records,legacy:progress};
  }
  return room;
 }catch{storageOK=false;return {version:2,attempts:[],practice:{}};}
}
let room=load();
reconcilePracticeRecords(room,practiceBank);
let state={subject:null,mode:'menu',attempt:null},retryId=null;
const judging=new Set(),judgeErrors=new Map();
async function markCode(a){
 if(typeof fetch!=='function'||!a||judging.has(a.id)||judgeErrors.has(a.id)||!pendingCodeQuestions(a).length)return;
 judging.add(a.id);
 try{
  for(const q of pendingCodeQuestions(a)){
   const source=a.answers[q.id],result=await requestCodeJudge(q.id,source);
   if(![...room.attempts,...tests()].includes(a))return;
   if(!applyCodeResult(a,q.id,source,result))throw Error('判题暂未完成，答卷已保留，请重试。');
   save();
  }
 }catch(e){judgeErrors.set(a.id,e.message||'判题暂未完成，请重试。');}
 finally{judging.delete(a.id);if(currentAttempt()===a)render();}
}
function save(){if(!storageOK)return;try{localStorage.setItem(KEY,JSON.stringify(room));}catch{storageOK=false;}}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.className='show';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='',3000);}
function practice(){return room.practice[state.subject]||(room.practice[state.subject]={seen:[],current:null,records:{}});}
function currentAttempt(){return (state.mode==='test'?tests():room.attempts).find(a=>a.id===state.attempt&&a.subject===state.subject);}
function text(value){return String(value??'').split(/(```[\s\S]*?```)/g).map(p=>p.startsWith('```')?`<pre class="problem-code"><code>${esc(p.replace(/^```[^\n]*\n?/,'').replace(/```$/,''))}</code></pre>`:esc(p)).join('');}
function answerText(q){return q.type==='single'?`${String.fromCharCode(65+q.answer)}. ${q.options[q.answer]}`:q.type==='fill'?q.answers.map((v,i)=>`第${i+1}空：${v[0]}`).join('；'):q.model;}
function solution(q){return `<section class="feedback"><h3>参考答案与解析</h3><div class="problem-body">${text(answerText(q))}</div>${q.walkthrough?`<h4>先抓住这一点</h4><p>${esc(q.walkthrough.idea)}</p><ol class="solution-steps">${q.walkthrough.steps.map(v=>`<li>${text(v)}</li>`).join('')}</ol>${q.walkthrough.trap?`<p class="solution-trap"><strong>容易错在：</strong>${esc(q.walkthrough.trap)}</p>`:''}`:q.explanation?`<div class="problem-body">${text(q.explanation)}</div>`:''}${q.rubric?`<details><summary>评分与核对要点</summary><ul>${q.rubric.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details>`:''}${q.reference?.url?.startsWith('https://')?`<p class="muted-note">原题来源：<a href="${esc(q.reference.url)}" target="_blank" rel="noopener noreferrer">${esc(q.reference.title)}</a></p>`:''}</section>`;}
function answerFields(q,answer,prefix,disabled=false){
 const dis=disabled?'disabled':'';
 if(isProgrammingQuestion(q))return codeEditor(q,answer,prefix,disabled,(state.mode==='practice'||currentAttempt()?.status==='settled')&&!disabled);
 if(q.type==='single')return `<fieldset class="options answer-fieldset"><legend class="visually-hidden">第${esc(prefix)}题，选择一个答案</legend>${q.options.map((v,i)=>`<label class="option"><input ${dis} type="radio" name="${esc(prefix)}" data-answer="${q.id}" data-option="${i}" value="${i}" ${answer===i?'checked':''}><b>${String.fromCharCode(65+i)}.</b><span>${esc(v)}</span></label>`).join('')}</fieldset>`;
 if(q.type==='fill')return q.answers.map((_,i)=>`<div class="fill-row"><label for="${prefix}-${i}">第${i+1}空</label><input ${dis} id="${prefix}-${i}" data-answer="${q.id}" data-blank="${i}" value="${esc(Array.isArray(answer)?answer[i]:'')}" autocomplete="off"></div>`).join('');
 return `<label class="answer-label" for="${prefix}-text">你的作答</label><textarea ${dis} id="${prefix}-text" data-answer="${q.id}" spellcheck="false" placeholder="写出分析、计算过程或代码">${esc(typeof answer==='string'?answer:'')}</textarea>`;
}
function questionCard(q,i,answer,extra='',disabled=false,label=q.section||types[q.type]){return `<article class="card exam-question" id="question-${i}"><div class="section-bar"><strong>第 ${i} 题</strong><span>${esc(label)}${q.points?` · ${q.points}分`:''}</span></div><div class="problem-content"><div class="problem-body">${text(q.stem)}</div>${diagram(q.diagram)}<div class="answer-area">${answerFields(q,answer,`q${i}`,disabled)}</div>${extra}</div></article>`;}
function header(){const s=subjects.find(s=>s.id===state.subject);return `<header class="topbar"><a href="#/subjects" class="brand"><span class="brand-icon">练</span>课程练习室</a>${s?`<span class="divider"></span><strong class="top-course">${s.name}</strong>`:''}<nav class="top-right"><span class="points-pill">累计积分 ${totalPoints(room.attempts)}</span><a class="btn small" href="#/subjects">切换科目</a><button class="btn small" data-export>备份记录</button></nav></header>`;}
function home(){return `<main class="subject-main" id="main"><section class="subject-intro"><p class="eyebrow">练习与考试，各有节奏</p><h1>今天，练哪一科？</h1><p>逐题巩固，再用限时考试检验自己。</p></section><div class="subject-grid">${subjects.map(s=>`<a class="subject-card ${s.id}" href="#/subjects/${s.id}"><div class="subject-card-top"><span class="subject-state ${s.ready?'ready':''}">${s.ready?'练习 · 考试':'等待材料'}</span></div><p class="subject-en">${s.en}</p><h2>${s.name}</h2><p class="subject-description">${s.description}</p><div class="subject-card-bottom"><span>${s.ready?`${practiceBank(s.id).length}道练习 · ${examPapers[s.id]?.length||0}批考试`:'暂无习题'}</span><strong>进入 →</strong></div></a>`).join('')}</div><p class="subject-footer">记录保存在当前浏览器。考试积分只在首次结算时计入。</p></main>`;}
function courseMenu(){
 const s=subjects.find(s=>s.id===state.subject);
 if(!s.ready)return `<main class="subject-main"><section class="pending-card"><h1>${s.name}</h1><h2>暂无习题</h2><p>等待材料补齐后开放。</p><a class="btn primary" href="#/subjects">返回科目</a></section></main>`;
 const p=practice(),papers=examPapers[s.id]||[],active=room.attempts.find(a=>a.subject===s.id&&a.status!=='settled'),next=nextPaper(papers,room.attempts,s.id),bp=examBlueprints[s.id];
 const history=[...room.attempts,...tests()].filter(a=>a.subject===s.id).slice().sort((a,b)=>b.startedAt-a.startedAt);
 return `<main class="subject-main"><div class="breadcrumb"><a href="#/subjects">全部科目</a><span>/</span>${s.name}</div><div class="heading-row"><div><h1>${s.name}</h1><p class="subtitle">选择一种方式，开始今天的训练。</p></div><span class="points-pill">本科积分 ${totalPoints(room.attempts,s.id)}</span></div><div class="mode-grid"><section class="card mode-card"><p class="eyebrow">PRACTICE</p><h2>逐题练习</h2><p>按题型练习，选择、填空、分析和代码题各练各的。</p><p class="muted-note">独立练习池 ${practiceBank(s.id).length} 题 · 本轮已抽 ${p.seen.length} 题<br>考试题不进入练习池，练习不计考试积分。</p>${practiceTypePicker(true)}<button class="btn" data-practice>按章节选择题型 →</button></section><section class="card mode-card"><p class="eyebrow">EXAM</p><h2>限时考试 <small>120分钟</small></h2><p>整卷作答，交卷前不显示答案与解析。到时自动交卷。</p><p class="muted-note">${bp?bp.groups.map(g=>`${g.name}${g.count}题`).join(' · '):'试卷准备中'}<br>每批100分 · 主观题交卷后自评 · 首次结算后积分固定</p><button class="btn primary" data-exam ${!active&&!next?'disabled':''}>${active?active.status==='active'?'继续考试 →':'完成交卷自评 →':next?'开始下一批 →':'本轮试卷已全部完成'}</button>${!active&&!next?'<p class="muted-note">当前试卷已用完，后续补入新题后再组卷；不会把旧题重排成“新批次”。</p>':''}</section></div>${chapterPanel()}<section class="card record-card"><h2>测验与考试记录</h2>${history.length?history.map(a=>`<div class="history-row"><div><h3>${esc(a.title)}</h3><p>${new Date(a.startedAt).toLocaleString('zh-CN',{hour12:false})} · ${a.status==='settled'?`${a.result.total} / 100分 · ${a.kind==='chapter'?'成绩已保存，不计积分':'积分已锁定'}`:a.status==='active'?(a.kind==='chapter'?'练习中':'考试中'):'已提交，待核对'}</p></div><a class="btn small" href="#/subjects/${s.id}/${a.kind==='chapter'?'test':'exam'}/${a.id}">${a.status==='settled'?(a.kind==='chapter'?'查看结果':'查看错题'):'继续'}</a></div>`).join(''):'<p class="muted-note">完成第一场考试后，成绩会保存在这里。</p>'}</section></main>`;
}
function chapterPanel(){return `<section class="card chapter-panel"><h2>按章节练习</h2><p class="muted-note">选择章节，再选择快捷方案或自定义题量。整组作答，提交后核对答案，不限时、不计积分。</p><div class="chapter-cards">${getPracticeCourse(state.subject).chapters.map(c=>{
 const active=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(c.id)&&a.status!=='settled');
 return `<section class="chapter-tile"><h3>${esc(c.name)}</h3><p>本章题库 <strong>${c.count}</strong> 题</p><div class="chapter-buttons"><a class="btn small primary" href="#/subjects/${state.subject}/chapter-practice/${c.id}">开始练习</a>${active?`<a class="btn small" href="#/subjects/${state.subject}/test/${active.id}">继续上次练习</a>`:''}<button class="btn small" data-chapter-practice="${c.id}" ${!c.count?'disabled':''}>逐题练习</button></div></section>`;
 }).join('')}</div></section>`;}
function chapterPlan(){
 const bySubject=(room.chapterPracticeSettings||(room.chapterPracticeSettings={}))[state.subject]||((room.chapterPracticeSettings)[state.subject]={});
 return bySubject[state.chapter]||(bySubject[state.chapter]={preset:'choice',addJudgement:false,judgementCount:3,custom:{choice:20,fill:10,code:0,judgement:0}});
}
function chapterPlanPreview(){
 try{const counts=chapterPracticeCounts(chapterPlan()),missing=chapterPracticeShortages(state.subject,state.chapter,counts);return {text:missing.length?missing.join('；'):chapterPracticeKinds.filter(k=>counts[k.id]).map(k=>`${counts[k.id]}道${k.name}`).join(' + '),invalid:!!missing.length};}
 catch(e){return {text:e.message,invalid:true};}
}
function updateChapterPlanPreview(){const preview=chapterPlanPreview(),output=document.querySelector('#chapter-plan-summary'),button=document.querySelector('[data-build-practice]');if(output){output.textContent=preview.text;output.className=preview.invalid?'chapter-plan-summary shortage':'chapter-plan-summary';}if(button)button.disabled=preview.invalid;}
function chapterComposer(){
 const c=getPracticeCourse(state.subject).chapters.find(c=>String(c.id)===String(state.chapter));if(!c)return `<main class="subject-main"><h1>章节不存在</h1><a href="#/subjects/${state.subject}">返回课程</a></main>`;
 const plan=chapterPlan(),stock=chapterPracticeStock(state.subject,state.chapter),preview=chapterPlanPreview();
 return `<main class="room-main"><div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>${esc(c.name)}</div><h1>开始章节练习</h1><p class="subtitle">${esc(c.name)} · 选择组题方式</p><section class="card chapter-composer"><fieldset class="chapter-plan-options"><legend>快捷选择</legend>${chapterPracticePresets.map(p=>`<label class="chapter-plan-option"><input type="radio" name="chapter-preset" data-chapter-preset value="${p.id}" ${plan.preset===p.id?'checked':''}><span><strong>${p.name}</strong><small>${chapterPracticeKinds.filter(k=>p.counts[k.id]).map(k=>`${p.counts[k.id]}道${k.name}`).join(' + ')}</small></span></label>`).join('')}<label class="chapter-plan-option"><input type="radio" name="chapter-preset" data-chapter-preset value="custom" ${plan.preset==='custom'?'checked':''}><span><strong>自定义</strong><small>自行设置各类题量</small></span></label></fieldset>${plan.preset==='custom'?`<div class="chapter-custom-counts">${chapterPracticeKinds.map(k=>`<label>${k.name}<input type="number" min="0" max="100" step="1" inputmode="numeric" data-practice-count="${k.id}" value="${esc(plan.custom[k.id]??0)}"><span>道</span></label>`).join('')}</div>`:`<div class="chapter-judgement-toggle"><label><input type="checkbox" id="chapter-add-judgement" ${plan.addJudgement?'checked':''}>额外加入判断题</label><label for="chapter-judgement-count">题量</label><select id="chapter-judgement-count" ${plan.addJudgement?'':'disabled'}>${[3,4,5].map(n=>`<option value="${n}" ${Number(plan.judgementCount)===n?'selected':''}>${n}道</option>`).join('')}</select><p class="muted-note">未勾选时不添加。判断题优先使用本章已有题，不足时从未被本组使用的选择题抽取，改为判断给定答案是否正确。</p></div>`}<p class="muted-note">本章现有：${chapterPracticeKinds.map(k=>`${k.name}${stock[k.id]}道`).join(' · ')}。<br>每组1–100题，满分100分，不计积分。同组题目不重复，优先抽取未练过的题。</p><p id="chapter-plan-summary" class="chapter-plan-summary ${preview.invalid?'shortage':''}" role="status" aria-live="polite">${esc(preview.text)}</p><button type="button" class="btn primary" data-build-practice ${preview.invalid?'disabled':''}>生成题目，开始练习</button></section></main>`;
}
function practiceTypePicker(compact=false){
 const p=practice(),groups=practiceTypeCounts(state.subject,practiceBank(state.subject),compact?'all':p.chapter);
 return `<section class="practice-kinds" aria-label="选择练习题型">${compact?'':'<h2>选择题型</h2><p class="muted-note">选好题型后，只抽取这一类题目。</p>'}<div class="practice-kind-grid ${compact?'compact':''}">${groups.filter((t,i)=>i<5||t.count).map(t=>`<button class="practice-kind" type="button" data-practice-kind="${t.id}" ${t.count?'':'disabled'}><strong>${t.name}</strong><span>${t.count?`${t.count} 道题`:'暂无题目'}</span></button>`).join('')}</div></section>`;
}
function practiceSelector(){
 const p=practice(),selected=p.chapter||'all',kind=practiceTypes.find(t=>t.id===p.kind);
 return `<div class="practice-filter"><label for="practice-chapter">选择章节</label><select id="practice-chapter"><option value="all">全部章节</option>${getPracticeCourse(state.subject).chapters.map(c=>`<option value="${c.id}" ${String(c.id)===String(selected)?'selected':''}>${esc(c.name)}（${kind?filterPracticeTypes(state.subject,practiceBank(state.subject),c.id,p.kind).length:c.count}题）</option>`).join('')}</select>${kind?`<label for="practice-kind">题型</label><select id="practice-kind">${practiceTypeCounts(state.subject,practiceBank(state.subject),p.chapter).filter(t=>t.count||t.id===p.kind).map(t=>`<option value="${t.id}" ${t.id===p.kind?'selected':''}>${t.name}（${t.count}题）</option>`).join('')}</select>`:''}</div>`;
}
function practicePage(){
 const p=practice(),kind=practiceTypes.find(t=>t.id===p.kind),bank=filteredPractice(),q=bank.find(q=>q.id===p.current);
 const top=`<div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>题型练习</div>`;
 if(!kind)return `<main class="room-main">${top}<h1>想练哪一种题？</h1>${practiceSelector()}${practiceTypePicker()}</main>`;
 if(!q)return `<main class="room-main">${top}<div class="heading-row"><h1>${kind.name}</h1><button class="btn" data-change-kind>更换题型</button></div>${practiceSelector()}<section class="pending-card"><h2>${bank.length?'本类练习已完成':'当前章节暂无此类题目'}</h2><p>${bank.length?`本轮已抽完 ${bank.length} 道${kind.name}，可以重练或更换题型。`:'可以切换章节或选择其他题型。'}</p>${bank.length?'<button class="btn primary" data-practice-reset>重新练习这一类</button>':''}</section></main>`;
 const r=p.records[q.id],shown=r?.revealed,submitted=r?.submitted;
 return `<main class="room-main">${top}<div class="heading-row"><div><h1>${kind.name}练习</h1><p class="subtitle">本轮 ${bank.filter(q=>p.seen.includes(q.id)).length} / ${bank.length} 题 · 不计考试积分</p></div><div class="answer-actions"><button class="btn" data-change-kind>更换题型</button><button class="btn primary" data-practice-next>下一题 →</button></div></div>${practiceSelector()}${questionCard(q,bank.filter(q=>p.seen.includes(q.id)).length||1,r?.answer,`<div class="answer-actions"><button class="btn primary" data-practice-submit>核对答案</button><button class="btn" data-reveal>查看解析</button></div>${submitted?`<p class="practice-status" role="status">${r.status==='correct'?'回答正确':r.status==='wrong'?'本题还需巩固':'请对照参考答案和要点自评'}</p>`:''}${shown?solution(q):''}`,false,kind.name)}<p class="footer-note">作答自动保存。下一题只从当前题型与章节中抽取，本轮不重复。</p></main>`;
}
function examPage(){const a=currentAttempt();if(!a)return courseMenu();expireExam(a);save();
 const active=a.status==='active',marking=a.status==='marking',isTest=a.kind==='chapter';
 const qs=a.status==='settled'&&!isTest?a.questions.filter(q=>a.result.scores[q.id]<q.points):a.questions;
 const answered=a.questions.filter(q=>validAnswer(q,a.answers[q.id])).length;
 return `<main class="room-main"><div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>${esc(a.title)}</div><section class="exam-toolbar card"><div><h1>${active?(isTest?(a.practicePlan?'章节练习':'章节测验'):'限时考试'):marking?'已提交 · 核对结果':isTest?'练习结果':'考试结果'}</h1><p>${active?`已答 ${answered} / ${a.questions.length} 题 · 满分100分`:marking?`${a.expired?'时间已到，已自动交卷。':'答卷已提交。'}作答已锁定，参考答案仅用于交卷后核对。`:`${a.result.total} / 100分 · ${isTest?'已保存成绩，不计积分':`已计入 ${a.result.total} 积分`}`}</p></div>${active&&!isTest?'<div class="exam-clock"><small>剩余时间</small><strong id="countdown" role="timer"></strong></div><button class="btn primary" data-submit>交卷</button>':active?`<button class="btn primary" data-submit>${a.practicePlan?'提交练习':'提交测验'}</button>`:marking?'<button class="btn primary" data-settle>完成自评并结算</button>':`<a class="btn primary" href="#/subjects/${state.subject}">返回课程 / 下一批 →</a>`}</section>${active?`<div class="exam-progress"><span id="answer-progress">已答${answered}/${a.questions.length}</span><button class="btn small" data-save-draft>保存作答</button><span id="save-state">作答自动保存</span></div><nav class="exam-numbers" aria-label="题目导航">${a.questions.map((q,i)=>`<a href="#question-${i+1}" data-jump="${i+1}" class="${validAnswer(q,a.answers[q.id])?'answered':''}">${i+1}</a>`).join('')}</nav>`:marking?'<p class="marking-note">选择、普通填空已自动核对。已接入判题的代码题自动评分，其余主观题对照要点自评。确认结算后首次成绩固定；章节测验不累计积分。</p>':isTest?'<p class="marking-note">测验已提交，以下为全部题目的答案与解析；重做不改变首次成绩，不计考试积分。</p>':'<p class="marking-note">以下仅列错题及未得满分的题。可重新作答核对，原分数和积分保持不变。</p>'}${marking&&pendingCodeQuestions(a).length?`<section class="card marking-note" role="status"><strong>编程题待判 ${pendingCodeQuestions(a).length} 道</strong><p>${esc(judgeErrors.get(a.id)||'正在依次编译与测试，答卷已锁定。刷新后可继续判题。')}</p>${judgeErrors.has(a.id)?'<button class="btn primary" data-judge-retry>重试判题</button>':''}</section>`:''}${qs.map(q=>{
  const i=a.questions.indexOf(q)+1,manual=q.type==='short'&&!q.judge;let extra='';
  if(!active){extra=`<div class="score-line">${marking&&manual?`<label for="mark-${q.id}">自评分（0–${q.points}）</label><input id="mark-${q.id}" type="number" min="0" max="${q.points}" step="1" data-mark="${q.id}" value="${a.marks[q.id]??''}">`:`<strong>首次得分：${a.result?.scores[q.id]??a.marks[q.id]??'待判题'} / ${q.points}</strong>`}</div>${solution(q)}${a.status==='settled'?`<button class="btn small" data-retry="${q.id}">重做本题（不计分）</button>${retryId===q.id?`<section class="retry-area"><h3>重新作答</h3>${answerFields(q,undefined,`retry${i}`)}<button class="btn small primary" data-retry-check="${q.id}">核对本次作答</button><p id="retry-feedback" role="status"></p></section>`:''}`:''}`;}
  return questionCard(q,i,a.answers[q.id],extra,!active);
 }).join('')}${a.status==='settled'&&!qs.length?'<section class="pending-card"><h2>本批全部答对</h2><p>没有需要回看的错题，可以开始下一批。</p></section>':''}${marking?'<div class="bottom-actions"><button class="btn primary" data-settle>完成自评并结算</button></div>':''}</main>`;
}
function render(){const s=subjects.find(s=>s.id===state.subject);document.title=`${s?.name||'选择科目'} · 课程练习室`;document.querySelector('#app').innerHTML=header()+(!s?home():state.mode==='practice'?practicePage():state.mode==='compose'?chapterComposer():['exam','test'].includes(state.mode)?examPage():courseMenu())+'<footer class="room-backup"><button class="btn small" data-import>恢复记录备份</button><input id="backup-file" type="file" accept="application/json,.json" hidden></footer>'+(!storageOK?'<p class="storage-warning" role="alert">当前浏览器无法保存记录，请勿刷新或关闭页面，及时备份。</p>':'');bind();updateClock();void markCode(currentAttempt());}
function navigate(hash){location.hash=hash;}
function draw(){const p=practice(),q=drawPractice(filteredPractice(),p.seen);p.current=q?.id||null;if(q)p.seen.push(q.id);save();}
function readAnswer(q,container=document){if(q.type==='single'){const v=container.querySelector(`input[data-answer="${q.id}"]:checked`);return v?Number(v.value):null;}if(q.type==='fill')return q.answers.map((_,i)=>container.querySelector(`input[data-answer="${q.id}"][data-blank="${i}"]`)?.value||'');return container.querySelector(`textarea[data-answer="${q.id}"]`)?.value||'';}
function syncPractice(){const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current);if(!q)return;const answer=readAnswer(q);p.records[q.id]={...p.records[q.id],answer,revision:q.revision||1,submitted:false};save();}
function updateClock(){const a=currentAttempt();if(state.mode!=='exam'||!a||a.status!=='active')return;const left=Math.max(0,a.deadline-Date.now());const el=document.querySelector('#countdown');if(el){const n=Math.ceil(left/1000);el.textContent=`${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;el.className=left<=5*60*1000?'urgent':'';}if(left===0){expireExam(a);save();render();toast('时间已到，答卷已自动提交。');}}
function checkAllDeadlines(){let changed=false;for(const a of room.attempts)if(a.status==='active'&&Date.now()>=a.deadline){expireExam(a);changed=true;}if(changed)save();return changed;}
function exportRecords(){const blob=new Blob([JSON.stringify(room,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`课程练习记录_${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(){
 document.querySelectorAll('[data-chapter-preset]').forEach(el=>el.addEventListener('change',()=>{const plan=chapterPlan();if(el.value==='custom'&&plan.preset!=='custom')plan.custom=chapterPracticeCounts(plan);plan.preset=el.value;save();render();}));
 document.querySelector('#chapter-add-judgement')?.addEventListener('change',e=>{chapterPlan().addJudgement=e.target.checked;save();render();});
 document.querySelector('#chapter-judgement-count')?.addEventListener('change',e=>{chapterPlan().judgementCount=Number(e.target.value);save();updateChapterPlanPreview();});
 document.querySelectorAll('[data-practice-count]').forEach(el=>el.addEventListener('input',()=>{chapterPlan().custom[el.dataset.practiceCount]=el.value;save();updateChapterPlanPreview();}));
 document.querySelector('[data-build-practice]')?.addEventListener('click',()=>{try{const paper=composeChapterPractice(state.subject,state.chapter,chapterPlan(),tests());const a=startChapterTest(state.subject,paper);tests().push(a);save();navigate(`#/subjects/${state.subject}/test/${a.id}`);}catch(e){toast(e.message);updateChapterPlanPreview();}});

 document.querySelector('[data-judge-retry]')?.addEventListener('click',()=>{const a=currentAttempt();judgeErrors.delete(a.id);void markCode(a);render();});
 bindCodeEditors(document,({questionId,source,result})=>{if(state.mode!=='practice')return;const r=practice().records[questionId];if(!r||r.answer!==source)return;r.judged={source,status:result.status};if(['accepted','wrong_answer'].includes(result.status)){r.status=result.status==='accepted'?'correct':'wrong';r.correct=result.status==='accepted';r.submitted=true;}save();});
 const skip=document.querySelector('.skip');if(skip)skip.onclick=e=>{e.preventDefault();const main=document.querySelector('main');main?.setAttribute('tabindex','-1');main?.focus();};
 document.querySelector('[data-export]')?.addEventListener('click',exportRecords);
 document.querySelector('[data-import]')?.addEventListener('click',()=>document.querySelector('#backup-file').click());
 document.querySelector('#backup-file')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>8_000_000){toast('文件过大，请选择记录备份。');return;}try{const incoming=JSON.parse(await file.text());room=mergeBackup(room,incoming,state.subject);checkAllDeadlines();save();render();toast('记录已恢复，已有考试成绩保持不变。');}catch(error){toast(error.message||'无法读取此备份。');}});
 document.querySelector('[data-practice]')?.addEventListener('click',()=>{const p=practice();p.kind=null;p.current=null;save();navigate(`#/subjects/${state.subject}/practice`);});
 document.querySelectorAll('[data-practice-kind]').forEach(el=>el.addEventListener('click',()=>{if(state.mode==='practice')syncPractice();const p=practice();if(state.mode==='menu')p.chapter='all';p.kind=el.dataset.practiceKind;draw();if(state.mode==='practice')render();else navigate(`#/subjects/${state.subject}/practice`);}));
 document.querySelector('[data-change-kind]')?.addEventListener('click',()=>{syncPractice();practice().kind=null;practice().current=null;save();render();});
 document.querySelector('#practice-kind')?.addEventListener('change',e=>{syncPractice();practice().kind=e.target.value;draw();render();});
 document.querySelectorAll('[data-chapter-practice]').forEach(el=>el.addEventListener('click',()=>{practice().chapter=el.dataset.chapterPractice;practice().kind=null;practice().current=null;save();navigate(`#/subjects/${state.subject}/practice`);}));
 document.querySelector('#practice-chapter')?.addEventListener('change',e=>{syncPractice();practice().chapter=e.target.value;draw();render();});
 document.querySelectorAll('[data-chapter-test]').forEach(el=>el.addEventListener('click',()=>{const chapter=el.dataset.chapterTest;const active=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(chapter)&&a.status!=='settled');if(active){navigate(`#/subjects/${state.subject}/test/${active.id}`);return;}try{const paper=composeChapterTest(state.subject,chapter,tests());const a=startChapterTest(state.subject,paper);tests().push(a);save();navigate(`#/subjects/${state.subject}/test/${a.id}`);}catch(error){toast(error.message);}}));
 document.querySelector('[data-save-draft]')?.addEventListener('click',()=>{save();toast(storageOK?'作答已保存，尚未提交，不显示答案与解析。':'保存失败，请备份记录。');});
 document.querySelector('[data-practice-next]')?.addEventListener('click',()=>{syncPractice();draw();render();window.scrollTo({top:0});});
 document.querySelector('[data-practice-reset]')?.addEventListener('click',()=>{const ids=new Set(filteredPractice().map(q=>q.id));practice().seen=practice().seen.filter(id=>!ids.has(id));draw();render();});
 document.querySelector('[data-reveal]')?.addEventListener('click',()=>{syncPractice();const p=practice();p.records[p.current].revealed=true;save();render();});
 document.querySelector('[data-practice-submit]')?.addEventListener('click',()=>{syncPractice();const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current),r=p.records[q.id];if(!validAnswer(q,r.answer)){toast('请先完成本题作答。');return;}Object.assign(r,r.judged?.source===r.answer&&['accepted','wrong_answer'].includes(r.judged.status)?{status:r.judged.status==='accepted'?'correct':'wrong',correct:r.judged.status==='accepted'}:grade(q,r.answer),{submitted:true,revealed:true});save();render();});
 document.querySelector('[data-exam]')?.addEventListener('click',()=>{
  checkAllDeadlines();const old=room.attempts.find(a=>a.subject===state.subject&&a.status!=='settled');if(old){navigate(`#/subjects/${state.subject}/exam/${old.id}`);return;}
  const paper=nextPaper(examPapers[state.subject]||[],room.attempts,state.subject);if(!paper)return;
  const a=startExam(state.subject,paper);room.attempts.push(a);save();navigate(`#/subjects/${state.subject}/exam/${a.id}`);
 });
 document.querySelectorAll('[data-answer]').forEach(el=>el.addEventListener(el.type==='radio'?'change':'input',()=>{
  if(state.mode==='practice'){syncPractice();return;}
  const a=currentAttempt();if(!a||a.status!=='active')return;const q=a.questions.find(q=>q.id===el.dataset.answer);if(!q)return;
  if(!saveExamAnswer(a,q.id,readAnswer(q))){save();render();return;}save();
  const count=a.questions.filter(q=>validAnswer(q,a.answers[q.id])).length;const progress=document.querySelector('#answer-progress');if(progress)progress.textContent=`已答${count}/${a.questions.length}`;
  const link=document.querySelector(`[data-jump="${a.questions.indexOf(q)+1}"]`);link?.classList.toggle('answered',validAnswer(q,a.answers[q.id]));
  const status=document.querySelector('#save-state');if(status)status.textContent=storageOK?'草稿已保存':'记录未能保存，请及时备份';
 }));
 document.querySelectorAll('[data-jump]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();document.querySelector(`#question-${el.dataset.jump}`)?.scrollIntoView({behavior:'smooth',block:'start'});}));
 document.querySelector('[data-submit]')?.addEventListener('click',()=>{
  const a=currentAttempt();expireExam(a);if(a.status==='active'){
   const left=a.questions.filter(q=>!validAnswer(q,a.answers[q.id])).length;
   const dialog=document.createElement('dialog');dialog.innerHTML=`<h2>确认交卷？</h2><p>${left?`还有${left}题未完成。`:''}交卷后不能修改本次作答，可查看解析并完成主观题自评。</p><div class="answer-actions"><button class="btn" data-cancel>继续作答</button><button class="btn primary" data-confirm>确认交卷</button></div>`;document.body.append(dialog);dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('[data-confirm]').onclick=()=>{submitExam(a);save();dialog.close();render();};dialog.onclose=()=>dialog.remove();dialog.showModal();
  }else{save();render();}
 });
 document.querySelectorAll('[data-mark]').forEach(el=>el.addEventListener('input',()=>{const a=currentAttempt();if(el.value==='')delete a.marks[el.dataset.mark];else if(!setMark(a,el.dataset.mark,el.value))delete a.marks[el.dataset.mark];save();}));
 document.querySelectorAll('[data-settle]').forEach(el=>el.addEventListener('click',()=>{try{settleExam(currentAttempt());save();render();toast('成绩已结算，分数与积分已固定。');}catch(e){toast(e.message);}}));
 document.querySelectorAll('[data-retry]').forEach(el=>el.addEventListener('click',()=>{retryId=el.dataset.retry;render();document.querySelector('.retry-area')?.scrollIntoView({block:'center'});}));
 document.querySelector('[data-retry-check]')?.addEventListener('click',e=>{const a=currentAttempt(),q=a.questions.find(q=>q.id===e.target.dataset.retryCheck),area=document.querySelector('.retry-area'),answer=readAnswer(q,area);document.querySelector('#retry-feedback').textContent=!validAnswer(q,answer)?'请先完成作答。':q.type==='short'?'请对照上方要点核对，本次重做不改变原成绩。':grade(q,answer).correct?'本次回答正确，原成绩保持不变。':'本次回答仍有误，请对照解析。';});
}
function route(){
 const parts=location.hash.replace(/^#\/?/,'').split('/');
 state={subject:subjects.some(s=>s.id===parts[1])&&parts[0]==='subjects'?parts[1]:null,mode:'menu',attempt:null};retryId=null;
 if(parts[2]==='practice'&&parts.length===3&&getCourse(state.subject).questions.length){state.mode='practice';if(!practice().current)draw();}
 if(['exam','test'].includes(parts[2])&&parts[3]){state.mode=parts[2];state.attempt=parts.slice(3).join('/');}
 if(state.subject&&parts[2]==='chapter-practice'&&parts[3]&&parts.length===4){state.mode='compose';state.chapter=parts[3];}
 const legacy=resolveRoute(location.hash,state.subject?practiceBank(state.subject):undefined);if(legacy.question){state.subject=legacy.subject;state.mode='practice';const p=practice();p.chapter='all';p.kind=practiceType(state.subject,practiceBank(state.subject).find(q=>q.id===legacy.question));p.current=legacy.question;if(!p.seen.includes(legacy.question))p.seen.push(legacy.question);save();}
 checkAllDeadlines();render();
}
window.addEventListener('hashchange',route);
window.addEventListener('pageshow',()=>{if(checkAllDeadlines())render();else updateClock();});
window.addEventListener('focus',()=>{if(checkAllDeadlines())render();else updateClock();});
document.addEventListener?.('visibilitychange',()=>{if(checkAllDeadlines())render();else updateClock();});
window.addEventListener('storage',e=>{if(e.key===KEY){room=load();checkAllDeadlines();render();}});
if(typeof setInterval==='function')setInterval(()=>{if(checkAllDeadlines()){render();toast('考试时间已到，已自动交卷。');}else updateClock();},1000);
route();
