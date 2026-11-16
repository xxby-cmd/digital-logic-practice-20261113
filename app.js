import {getCourse,progressKey} from './course-banks.js';
import {subjects,resolveRoute} from './subjects.js';
import {sanitizeProgress} from './progress.js';
import {grade,validAnswer} from './grading.js';
import {diagram} from './diagrams.js';
import {examPapers,examBlueprints} from './exam-bank.js';
import {getPracticeCourse} from './practice-library.js';
import {chapterAvailability,composeChapterTest} from './chapter-tests.js';
import {startExam,startChapterTest,submitExam,expireExam,saveExamAnswer,setMark,settleExam,totalPoints,nextPaper,drawPractice} from './sessions.js';
import {mergeBackup} from './room-progress.js';

const KEY='course-practice-room-v2';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={single:'选择题',fill:'填空题',short:'简答题'};
let storageOK=true;
const practiceBank=id=>getPracticeCourse(id).questions;
function filteredPractice(){const selected=practice().chapter;return practiceBank(state.subject).filter(q=>!selected||selected==='all'||String(q.chapter)===String(selected));}
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
let state={subject:null,mode:'menu',attempt:null},retryId=null;
function save(){if(!storageOK)return;try{localStorage.setItem(KEY,JSON.stringify(room));}catch{storageOK=false;}}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.className='show';clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='',3000);}
function practice(){return room.practice[state.subject]||(room.practice[state.subject]={seen:[],current:null,records:{}});}
function currentAttempt(){return (state.mode==='test'?tests():room.attempts).find(a=>a.id===state.attempt&&a.subject===state.subject);}
function text(value){return String(value??'').split(/(```[\s\S]*?```)/g).map(p=>p.startsWith('```')?`<pre class="problem-code"><code>${esc(p.replace(/^```[^\n]*\n?/,'').replace(/```$/,''))}</code></pre>`:esc(p)).join('');}
function answerText(q){return q.type==='single'?`${String.fromCharCode(65+q.answer)}. ${q.options[q.answer]}`:q.type==='fill'?q.answers.map((v,i)=>`第${i+1}空：${v[0]}`).join('；'):q.model;}
function solution(q){return `<section class="feedback"><h3>参考答案与解析</h3><div class="problem-body">${text(answerText(q))}</div>${q.walkthrough?`<h4>先抓住这一点</h4><p>${esc(q.walkthrough.idea)}</p><ol class="solution-steps">${q.walkthrough.steps.map(v=>`<li>${text(v)}</li>`).join('')}</ol>${q.walkthrough.trap?`<p class="solution-trap"><strong>容易错在：</strong>${esc(q.walkthrough.trap)}</p>`:''}`:q.explanation?`<div class="problem-body">${text(q.explanation)}</div>`:''}${q.rubric?`<details><summary>评分与核对要点</summary><ul>${q.rubric.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details>`:''}${q.reference?.url?.startsWith('https://')?`<p class="muted-note">原题来源：<a href="${esc(q.reference.url)}" target="_blank" rel="noopener noreferrer">${esc(q.reference.title)}</a></p>`:''}</section>`;}
function answerFields(q,answer,prefix,disabled=false){
 const dis=disabled?'disabled':'';
 if(q.type==='single')return `<fieldset class="options answer-fieldset"><legend class="visually-hidden">第${esc(prefix)}题，选择一个答案</legend>${q.options.map((v,i)=>`<label class="option"><input ${dis} type="radio" name="${esc(prefix)}" data-answer="${q.id}" data-option="${i}" value="${i}" ${answer===i?'checked':''}><b>${String.fromCharCode(65+i)}.</b><span>${esc(v)}</span></label>`).join('')}</fieldset>`;
 if(q.type==='fill')return q.answers.map((_,i)=>`<div class="fill-row"><label for="${prefix}-${i}">第${i+1}空</label><input ${dis} id="${prefix}-${i}" data-answer="${q.id}" data-blank="${i}" value="${esc(Array.isArray(answer)?answer[i]:'')}" autocomplete="off"></div>`).join('');
 return `<label class="answer-label" for="${prefix}-text">你的作答</label><textarea ${dis} id="${prefix}-text" data-answer="${q.id}" spellcheck="false" placeholder="写出分析、计算过程或代码">${esc(typeof answer==='string'?answer:'')}</textarea>`;
}
function questionCard(q,i,answer,extra='',disabled=false){return `<article class="card exam-question" id="question-${i}"><div class="section-bar"><strong>第 ${i} 题</strong><span>${esc(q.section||types[q.type])}${q.points?` · ${q.points}分`:''}</span></div><div class="problem-content"><div class="problem-body">${text(q.stem)}</div>${diagram(q.diagram)}<div class="answer-area">${answerFields(q,answer,`q${i}`,disabled)}</div>${extra}</div></article>`;}
function header(){const s=subjects.find(s=>s.id===state.subject);return `<header class="topbar"><a href="#/subjects" class="brand"><span class="brand-icon">练</span>课程练习室</a>${s?`<span class="divider"></span><strong class="top-course">${s.name}</strong>`:''}<nav class="top-right"><span class="points-pill">累计积分 ${totalPoints(room.attempts)}</span><a class="btn small" href="#/subjects">切换科目</a><button class="btn small" data-export>备份记录</button></nav></header>`;}
function home(){return `<main class="subject-main" id="main"><section class="subject-intro"><p class="eyebrow">练习与考试，各有节奏</p><h1>今天，练哪一科？</h1><p>逐题巩固，再用限时考试检验自己。</p></section><div class="subject-grid">${subjects.map(s=>`<a class="subject-card ${s.id}" href="#/subjects/${s.id}"><div class="subject-card-top"><span class="subject-state ${s.ready?'ready':''}">${s.ready?'练习 · 考试':'等待材料'}</span></div><p class="subject-en">${s.en}</p><h2>${s.name}</h2><p class="subject-description">${s.description}</p><div class="subject-card-bottom"><span>${s.ready?`${practiceBank(s.id).length}道练习 · ${examPapers[s.id]?.length||0}批考试`:'暂无习题'}</span><strong>进入 →</strong></div></a>`).join('')}</div><p class="subject-footer">记录保存在当前浏览器。考试积分只在首次结算时计入。</p></main>`;}
function courseMenu(){
 const s=subjects.find(s=>s.id===state.subject);
 if(!s.ready)return `<main class="subject-main"><section class="pending-card"><h1>${s.name}</h1><h2>暂无习题</h2><p>等待材料补齐后开放。</p><a class="btn primary" href="#/subjects">返回科目</a></section></main>`;
 const p=practice(),papers=examPapers[s.id]||[],active=room.attempts.find(a=>a.subject===s.id&&a.status!=='settled'),next=nextPaper(papers,room.attempts,s.id),bp=examBlueprints[s.id];
 const history=[...room.attempts,...tests()].filter(a=>a.subject===s.id).slice().sort((a,b)=>b.startedAt-a.startedAt);
 return `<main class="subject-main"><div class="breadcrumb"><a href="#/subjects">全部科目</a><span>/</span>${s.name}</div><div class="heading-row"><div><h1>${s.name}</h1><p class="subtitle">选择一种方式，开始今天的训练。</p></div><span class="points-pill">本科积分 ${totalPoints(room.attempts,s.id)}</span></div><div class="mode-grid"><section class="card mode-card"><p class="eyebrow">PRACTICE</p><h2>逐题练习</h2><p>一次一道，随机抽取。随时核对答案、查看解析。</p><p class="muted-note">独立练习池 ${practiceBank(s.id).length} 题 · 本轮已抽 ${p.seen.length} 题<br>考试题不进入练习池，练习不计考试积分。</p><button class="btn primary" data-practice>进入练习 →</button></section><section class="card mode-card"><p class="eyebrow">EXAM</p><h2>限时考试 <small>120分钟</small></h2><p>整卷作答，交卷前不显示答案与解析。到时自动交卷。</p><p class="muted-note">${bp?bp.groups.map(g=>`${g.name}${g.count}题`).join(' · '):'试卷准备中'}<br>每批100分 · 主观题交卷后自评 · 首次结算后积分固定</p><button class="btn primary" data-exam ${!active&&!next?'disabled':''}>${active?active.status==='active'?'继续考试 →':'完成交卷自评 →':next?'开始下一批 →':'本轮试卷已全部完成'}</button>${!active&&!next?'<p class="muted-note">当前两批已用完，后续补入新题后再组卷；不会把旧题重排成“新批次”。</p>':''}</section></div>${chapterPanel()}<section class="card record-card"><h2>测验与考试记录</h2>${history.length?history.map(a=>`<div class="history-row"><div><h3>${esc(a.title)}</h3><p>${new Date(a.startedAt).toLocaleString('zh-CN',{hour12:false})} · ${a.status==='settled'?`${a.result.total} / 100分 · ${a.kind==='chapter'?'成绩已保存，不计积分':'积分已锁定'}`:a.status==='active'?'考试中':'已交卷，待自评'}</p></div><a class="btn small" href="#/subjects/${s.id}/${a.kind==='chapter'?'test':'exam'}/${a.id}">${a.status==='settled'?(a.kind==='chapter'?'查看结果':'查看错题'):'继续'}</a></div>`).join(''):'<p class="muted-note">完成第一场考试后，成绩会保存在这里。</p>'}</section></main>`;
}
function chapterPanel(){return `<section class="card chapter-panel"><h2>章节题库与测验</h2><p class="muted-note">逐题练习可随时看解析；章节测验整组作答，提交后统一核对，不限时、不计积分。题型及题量沿用本科半卷约定；不足时明确显示，不跨章拼题。</p><div class="chapter-cards">${getPracticeCourse(state.subject).chapters.map(c=>{
 const groups=chapterAvailability(state.subject,c.id),missing=groups.filter(g=>g.available<g.count),active=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(c.id)&&a.status!=='settled');
 return `<section class="chapter-tile"><h3>${esc(c.name)}</h3>${c.note?`<p class="muted-note">${esc(c.note)}</p>`:''}<p>现有 <strong>${c.count}</strong> 题 <span class="muted-note">/ 目标至少${c.target}题</span></p><div class="chapter-meter"><i style="width:${Math.min(100,c.count/c.target*100)}%"></i></div><p class="chapter-ready">${active?'已有待完成测验':missing.length?`测验待扩充：${missing.map(g=>`${g.name}${g.available}/${g.count}`).join('、')}`:'可按约定题型组卷'}</p><div class="chapter-buttons"><button class="btn small" data-chapter-practice="${c.id}" ${!c.count?'disabled':''}>逐题练习</button><button class="btn small primary" data-chapter-test="${c.id}" ${!active&&missing.length?'disabled':''}>${active?'继续测验':'生成章节测验'}</button></div></section>`;
 }).join('')}</div></section>`;}
function practiceSelector(){const selected=practice().chapter||'all';return `<div class="practice-filter"><label for="practice-chapter">选择章节</label><select id="practice-chapter"><option value="all">全部章节</option>${getPracticeCourse(state.subject).chapters.map(c=>`<option value="${c.id}" ${String(c.id)===String(selected)?'selected':''}>${esc(c.name)}（${c.count}题）</option>`).join('')}</select></div>`;}
function practicePage(){const p=practice(),bank=filteredPractice(),q=bank.find(q=>q.id===p.current);if(!q)return `<main class="subject-main"><a href="#/subjects/${state.subject}">← 返回课程</a><section class="pending-card"><h1>本轮练习已完成</h1><p>练习池中的${bank.length}道题已全部抽过，可以开始新一轮。</p><button class="btn primary" data-practice-reset>开始新一轮</button></section></main>`;
 const r=p.records[q.id],shown=r?.revealed,submitted=r?.submitted;
 return `<main class="room-main"><div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>逐题练习</div><div class="heading-row"><div><h1>逐题练习</h1><p class="subtitle">本轮 ${bank.filter(q=>p.seen.includes(q.id)).length} / ${bank.length} 题 · 不计考试积分</p></div><button class="btn primary" data-practice-next>下一题 →</button></div>${practiceSelector()}${questionCard(q,bank.filter(q=>p.seen.includes(q.id)).length||1,r?.answer,`<div class="answer-actions"><button class="btn primary" data-practice-submit>核对答案</button><button class="btn" data-reveal>查看解析</button></div>${submitted?`<p class="practice-status" role="status">${r.status==='correct'?'回答正确':r.status==='wrong'?'本题还需巩固':'请对照参考答案和要点自评'}</p>`:''}${shown?solution(q):''}`)}<p class="footer-note">作答自动保存。下一题从本轮未抽过的练习题中选择。</p></main>`;
}
function examPage(){const a=currentAttempt();if(!a)return courseMenu();expireExam(a);save();
 const active=a.status==='active',marking=a.status==='marking',isTest=a.kind==='chapter';
 const qs=a.status==='settled'&&!isTest?a.questions.filter(q=>a.result.scores[q.id]<q.points):a.questions;
 const answered=a.questions.filter(q=>validAnswer(q,a.answers[q.id])).length;
 return `<main class="room-main"><div class="breadcrumb"><a href="#/subjects/${state.subject}">← 返回课程</a><span>/</span>${esc(a.title)}</div><section class="exam-toolbar card"><div><h1>${active?(isTest?'章节测验':'限时考试'):marking?'已交卷 · 完成自评':'考试结果'}</h1><p>${active?`已答 ${answered} / ${a.questions.length} 题 · 满分100分`:marking?`${a.expired?'时间已到，已自动交卷。':'答卷已提交。'}作答已锁定，参考答案仅用于交卷后核对。`:`${a.result.total} / 100分 · ${isTest?'已保存成绩，不计积分':`已计入 ${a.result.total} 积分`}`}</p></div>${active&&!isTest?'<div class="exam-clock"><small>剩余时间</small><strong id="countdown" role="timer"></strong></div><button class="btn primary" data-submit>交卷</button>':active?'<button class="btn primary" data-submit>提交测验</button>':marking?'<button class="btn primary" data-settle>完成自评并结算</button>':`<a class="btn primary" href="#/subjects/${state.subject}">返回课程 / 下一批 →</a>`}</section>${active?`<div class="exam-progress"><span id="answer-progress">已答${answered}/${a.questions.length}</span><button class="btn small" data-save-draft>保存作答</button><span id="save-state">作答自动保存</span></div><nav class="exam-numbers" aria-label="题目导航">${a.questions.map((q,i)=>`<a href="#question-${i+1}" data-jump="${i+1}" class="${validAnswer(q,a.answers[q.id])?'answered':''}">${i+1}</a>`).join('')}</nav>`:marking?'<p class="marking-note">选择、普通填空已自动核对。程序填空、编程、分析等题对照要点填写自评分（整数）；本站不运行C代码。确认结算后首次成绩固定；章节测验不累计积分。</p>':isTest?'<p class="marking-note">测验已提交，以下为全部题目的答案与解析；重做不改变首次成绩，不计考试积分。</p>':'<p class="marking-note">以下仅列错题及未得满分的题。可重新作答核对，原分数和积分保持不变。</p>'}${qs.map(q=>{
  const i=a.questions.indexOf(q)+1,manual=q.type==='short';let extra='';
  if(!active){extra=`<div class="score-line">${marking&&manual?`<label for="mark-${q.id}">自评分（0–${q.points}）</label><input id="mark-${q.id}" type="number" min="0" max="${q.points}" step="1" data-mark="${q.id}" value="${a.marks[q.id]??''}">`:`<strong>首次得分：${a.result?.scores[q.id]??a.marks[q.id]} / ${q.points}</strong>`}</div>${solution(q)}${a.status==='settled'?`<button class="btn small" data-retry="${q.id}">重做本题（不计分）</button>${retryId===q.id?`<section class="retry-area"><h3>重新作答</h3>${answerFields(q,undefined,`retry${i}`)}<button class="btn small primary" data-retry-check="${q.id}">核对本次作答</button><p id="retry-feedback" role="status"></p></section>`:''}`:''}`;}
  return questionCard(q,i,a.answers[q.id],extra,!active);
 }).join('')}${a.status==='settled'&&!qs.length?'<section class="pending-card"><h2>本批全部答对</h2><p>没有需要回看的错题，可以开始下一批。</p></section>':''}${marking?'<div class="bottom-actions"><button class="btn primary" data-settle>完成自评并结算</button></div>':''}</main>`;
}
function render(){const s=subjects.find(s=>s.id===state.subject);document.title=`${s?.name||'选择科目'} · 课程练习室`;document.querySelector('#app').innerHTML=header()+(!s?home():state.mode==='practice'?practicePage():['exam','test'].includes(state.mode)?examPage():courseMenu())+'<footer class="room-backup"><button class="btn small" data-import>恢复记录备份</button><input id="backup-file" type="file" accept="application/json,.json" hidden></footer>'+(!storageOK?'<p class="storage-warning" role="alert">当前浏览器无法保存记录，请勿刷新或关闭页面，及时备份。</p>':'');bind();updateClock();}
function navigate(hash){location.hash=hash;}
function draw(){const p=practice(),q=drawPractice(filteredPractice(),p.seen);p.current=q?.id||null;if(q)p.seen.push(q.id);save();}
function readAnswer(q,container=document){if(q.type==='single'){const v=container.querySelector(`input[data-answer="${q.id}"]:checked`);return v?Number(v.value):null;}if(q.type==='fill')return q.answers.map((_,i)=>container.querySelector(`input[data-answer="${q.id}"][data-blank="${i}"]`)?.value||'');return container.querySelector(`textarea[data-answer="${q.id}"]`)?.value||'';}
function syncPractice(){const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current);if(!q)return;const answer=readAnswer(q);p.records[q.id]={...p.records[q.id],answer,revision:q.revision||1,submitted:false};save();}
function updateClock(){const a=currentAttempt();if(state.mode!=='exam'||!a||a.status!=='active')return;const left=Math.max(0,a.deadline-Date.now());const el=document.querySelector('#countdown');if(el){const n=Math.ceil(left/1000);el.textContent=`${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;el.className=left<=5*60*1000?'urgent':'';}if(left===0){expireExam(a);save();render();toast('时间已到，答卷已自动提交。');}}
function checkAllDeadlines(){let changed=false;for(const a of room.attempts)if(a.status==='active'&&Date.now()>=a.deadline){expireExam(a);changed=true;}if(changed)save();return changed;}
function exportRecords(){const blob=new Blob([JSON.stringify(room,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`课程练习记录_${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function bind(){
 const skip=document.querySelector('.skip');if(skip)skip.onclick=e=>{e.preventDefault();const main=document.querySelector('main');main?.setAttribute('tabindex','-1');main?.focus();};
 document.querySelector('[data-export]')?.addEventListener('click',exportRecords);
 document.querySelector('[data-import]')?.addEventListener('click',()=>document.querySelector('#backup-file').click());
 document.querySelector('#backup-file')?.addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;if(file.size>8_000_000){toast('文件过大，请选择记录备份。');return;}try{const incoming=JSON.parse(await file.text());room=mergeBackup(room,incoming,state.subject);checkAllDeadlines();save();render();toast('记录已恢复，已有考试成绩保持不变。');}catch(error){toast(error.message||'无法读取此备份。');}});
 document.querySelector('[data-practice]')?.addEventListener('click',()=>{if(!practice().current)draw();navigate(`#/subjects/${state.subject}/practice`);});
 document.querySelectorAll('[data-chapter-practice]').forEach(el=>el.addEventListener('click',()=>{practice().chapter=el.dataset.chapterPractice;draw();navigate(`#/subjects/${state.subject}/practice`);}));
 document.querySelector('#practice-chapter')?.addEventListener('change',e=>{practice().chapter=e.target.value;draw();render();});
 document.querySelectorAll('[data-chapter-test]').forEach(el=>el.addEventListener('click',()=>{const chapter=el.dataset.chapterTest;const active=tests().find(a=>a.subject===state.subject&&String(a.chapter)===String(chapter)&&a.status!=='settled');if(active){navigate(`#/subjects/${state.subject}/test/${active.id}`);return;}try{const paper=composeChapterTest(state.subject,chapter,tests());const a=startChapterTest(state.subject,paper);tests().push(a);save();navigate(`#/subjects/${state.subject}/test/${a.id}`);}catch(error){toast(error.message);}}));
 document.querySelector('[data-save-draft]')?.addEventListener('click',()=>{save();toast(storageOK?'作答已保存，尚未提交，不显示答案与解析。':'保存失败，请备份记录。');});
 document.querySelector('[data-practice-next]')?.addEventListener('click',()=>{syncPractice();draw();render();window.scrollTo({top:0});});
 document.querySelector('[data-practice-reset]')?.addEventListener('click',()=>{const ids=new Set(filteredPractice().map(q=>q.id));practice().seen=practice().seen.filter(id=>!ids.has(id));draw();render();});
 document.querySelector('[data-reveal]')?.addEventListener('click',()=>{syncPractice();const p=practice();p.records[p.current].revealed=true;save();render();});
 document.querySelector('[data-practice-submit]')?.addEventListener('click',()=>{syncPractice();const p=practice(),q=practiceBank(state.subject).find(q=>q.id===p.current),r=p.records[q.id];if(!validAnswer(q,r.answer)){toast('请先完成本题作答。');return;}Object.assign(r,grade(q,r.answer),{submitted:true,revealed:true});save();render();});
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
 const legacy=resolveRoute(location.hash);if(legacy.question){state.subject=legacy.subject;state.mode='practice';const p=practice();p.chapter='all';p.current=legacy.question;if(!p.seen.includes(legacy.question))p.seen.push(legacy.question);save();}
 checkAllDeadlines();render();
}
window.addEventListener('hashchange',route);
window.addEventListener('pageshow',()=>{if(checkAllDeadlines())render();else updateClock();});
window.addEventListener('focus',()=>{if(checkAllDeadlines())render();else updateClock();});
document.addEventListener?.('visibilitychange',()=>{if(checkAllDeadlines())render();else updateClock();});
window.addEventListener('storage',e=>{if(e.key===KEY){room=load();checkAllDeadlines();render();}});
if(typeof setInterval==='function')setInterval(()=>{if(checkAllDeadlines()){render();toast('考试时间已到，已自动交卷。');}else updateClock();},1000);
route();
