import {termCatalogue} from './term-candidates.js';
import {courseTermPlan} from './term-planner.js';
import {openSelectionExplanation} from './selection-explainer.js';
import {uiEscape} from './workbench-ui.js';
const KEY='course-practice-known-terms-v1';let popover,anchor,listener=false,options={},known={};
try{known=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{/* Reading aids remain usable if storage is unavailable. */}
function hide(){if(popover)popover.hidden=true;anchor?.setAttribute('aria-expanded','false');}
function position(){if(!popover||popover.hidden||!anchor?.isConnected)return;const rect=anchor.getBoundingClientRect(),width=Math.min(330,window.innerWidth-24);popover.style.width=`${width}px`;popover.style.left=`${Math.max(12,Math.min(rect.left,window.innerWidth-width-12))}px`;popover.style.top=`${Math.max(64,Math.min(rect.bottom+8,window.innerHeight-popover.offsetHeight-12))}px`;}
function display(button){
 const subject=options.subject,entry=termCatalogue(subject).find(t=>t.id===button.dataset.termId);if(!entry)return;
 if(!popover){popover=document.createElement('section');popover.className='term-popover';popover.setAttribute('aria-label','名词解释');document.body.append(popover);}
 popover.innerHTML=`<header><strong>${uiEscape(button.textContent)}</strong><button class="icon-btn" type="button" aria-label="关闭名词解释">×</button></header><div class="term-definition"><dl><dt>是什么</dt><dd>${uiEscape(entry.definition)}</dd><dt>有什么用</dt><dd>${uiEscape(entry.purpose)}</dd><dt>小例子</dt><dd>${uiEscape(entry.example)}</dd></dl></div><footer><button class="text-link" type="button" data-term-ai>再讲白一点</button><button class="text-link" type="button" data-term-known>我已了解</button></footer>`;
 anchor?.setAttribute('aria-expanded','false');anchor=button;button.setAttribute('aria-expanded','true');popover.hidden=false;position();
 popover.querySelector('[aria-label="关闭名词解释"]').addEventListener('click',hide);
 popover.querySelector('[data-term-ai]').addEventListener('click',()=>{hide();openSelectionExplanation({selection:button.textContent,...options.context?.(button)});});
 popover.querySelector('[data-term-known]').addEventListener('click',()=>{known[`${options.subject}:${entry.id}`]=true;try{localStorage.setItem(KEY,JSON.stringify(known));}catch{}hide();options.refresh?.();});
}
export function bindTermHelp(config){
 options=config;if(typeof document.createElement!=='function')return;hide();
 if(!listener){listener=true;document.addEventListener('click',e=>{const button=e.target.closest?.('[data-term-id]');if(button&&options.enabled){e.preventDefault();display(button);return;}if(popover&&!popover.contains(e.target))hide();});document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});window.addEventListener('scroll',position,true);}
 if(!config.enabled)return;
 const plan=courseTermPlan(config.subject,config.courseQuestions||config.questions||[],known);
 document.querySelectorAll('.exam-question').forEach(article=>{
  article.querySelector('.term-notes')?.remove();const id=article.querySelector('[data-answer]')?.dataset.answer,q=config.questions?.find(q=>q.id===id);if(!q)return;
  const selected=plan.byQuestion.get(q.id)||[],row=document.createElement('div');row.className='term-notes';row.innerHTML='<span>名词解释</span>';
  // A future unsupported question is reported by the audit, never padded with
  // unrelated chapter terms or aliases of a term that has exhausted its quota.
  if(selected.length!==2)return;
  for(const entry of selected){const button=document.createElement('button');button.type='button';button.className='term-hint';button.dataset.termId=entry.id;button.textContent=entry.aliases[0];button.setAttribute('aria-label',`${button.textContent}，展开名词解释`);button.setAttribute('aria-expanded','false');row.append(button);}
  const statement=article.querySelector('.retry-public-statement')||article.querySelector('.problem-statement');statement?.append(row);
 });
}
