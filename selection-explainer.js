import {uiEscape} from './workbench-ui.js';

let hooks={},ready=false,panel,popup,pendingSelection=null,selectionRange=null,selectionInput=null,conversation=null,controller=null,requestId=0;
function positionSelection(){if(!popup||popup.hidden)return;const rect=selectionInput?.getBoundingClientRect()||selectionRange?.getBoundingClientRect();if(!rect)return;popup.style.left=`${Math.max(12,Math.min(rect.left,window.innerWidth-100))}px`;popup.style.top=`${Math.max(60,Math.min(rect.bottom+8,window.innerHeight-52))}px`;}
export async function requestExplanation(payload,{signal}={}){
 const port=Number(location.port||4174),base=location.protocol==='file:'?'http://127.0.0.1:4174':'';
 let response;
 try{response=await fetch(`${base}/api/explain`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal});}
 catch(e){if(signal?.aborted)throw e;}
 if(!response||[404,405].includes(response.status))try{response=await fetch(`http://127.0.0.1:${port+1}/api/explain`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal});}catch(e){if(signal?.aborted)throw e;throw Error('解释服务尚未连接，请从本地启动器打开练习室。');}
 let data;try{data=await response.json();}catch{throw Error('解释服务尚未连接，请从本地启动器打开练习室。');}
 if(!response.ok||typeof data.answer!=='string')throw Error(data.message||'解释暂未完成，请重试。');
 return data.answer;
}
function closeExplanation(){requestId++;controller?.abort();controller=null;panel.hidden=true;document.body.classList.remove('explanation-open');popup.hidden=true;}
function renderConversation(){
 if(!conversation)return;
 panel.querySelector('.explain-quote').textContent=conversation.selection;
 const log=panel.querySelector('.explain-messages');
 log.innerHTML=conversation.messages.map(m=>`<section class="explain-message ${m.role}"><div>${m.role==='assistant'?'Codex':'你'}</div><p>${uiEscape(m.content)}</p></section>`).join('')+(conversation.loading?'<p class="explain-loading" role="status"><span></span>正在用大白话解释…</p>':'')+(conversation.error?`<div class="explain-error" role="status">${uiEscape(conversation.error)}<button type="button" class="btn small" data-explain-retry>重试</button></div>`:'');
 log.querySelector('[data-explain-retry]')?.addEventListener('click',()=>void sendExplanation());
 panel.querySelector('[type="submit"]').disabled=!!conversation.loading;panel.querySelector('textarea').disabled=!!conversation.loading;
 log.scrollTop=log.scrollHeight;
}
async function sendExplanation(question){
 if(!conversation||conversation.loading||!hooks.enabled?.())return;
 if(question){conversation.messages.push({role:'user',content:question});}
 conversation.loading=true;conversation.error='';controller?.abort();controller=new AbortController();const signal=controller.signal,id=++requestId,active=conversation;
 renderConversation();
 try{const answer=await requestExplanation({selection:active.selection,context:active.context,subject:active.subject,messages:active.messages.slice(-8)},{signal});if(id!==requestId)return;active.messages.push({role:'assistant',content:answer});}
 catch(e){if(id!==requestId||signal.aborted)return;active.error=e.message||'解释暂不可用，请稍后重试。';}
 finally{if(id===requestId){active.loading=false;renderConversation();}}
}
function ensureUI(){
 if(ready)return;ready=true;
 popup=document.createElement('button');popup.type='button';popup.className='selection-explain';popup.textContent='解释';popup.hidden=true;popup.setAttribute('aria-label','用大白话解释选中文字');document.body.append(popup);
 popup.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});popup.addEventListener('mousedown',e=>{e.preventDefault();e.stopPropagation();});popup.addEventListener('mouseup',e=>e.stopPropagation());popup.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(pendingSelection)openSelectionExplanation(pendingSelection);});
 panel=document.createElement('aside');panel.className='explain-panel';panel.hidden=true;panel.setAttribute('aria-label','文字解释');
 panel.innerHTML='<header class="explain-header"><div><strong>文字解释</strong><span>用大白话，说清这一步</span></div><button type="button" class="icon-btn" aria-label="关闭解释">×</button></header><blockquote class="explain-quote"></blockquote><div class="explain-messages" role="log" aria-live="polite"></div><form class="explain-followup"><label for="explain-question">还有哪里不明白？</label><textarea id="explain-question" maxlength="2000" rows="2" placeholder="例如：能用两个帧举个例子吗？"></textarea><button class="btn primary" type="submit">发送</button><span>仅发送选中文字、必要题面和本段追问。</span></form>';
 document.body.append(panel);panel.querySelector('[aria-label="关闭解释"]').addEventListener('click',closeExplanation);
 panel.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=panel.querySelector('textarea'),text=input.value.trim();if(text){input.value='';void sendExplanation(text);}});
 const select=e=>{
  if(!hooks.enabled?.()||panel.contains(e.target)||popup.contains(e.target))return;
  let text='',element=e.target instanceof Element?e.target:null,rect;
  if(element?.matches('textarea[data-answer]')){text=element.value.slice(element.selectionStart,element.selectionEnd).trim();selectionInput=element;selectionRange=null;rect=element.getBoundingClientRect();}
  else{const selection=window.getSelection();text=selection?.toString().trim()||'';element=selection?.anchorNode?.parentElement;selectionInput=null;selectionRange=selection?.rangeCount?selection.getRangeAt(0).cloneRange():null;rect=selectionRange?.getBoundingClientRect();}
  if(!text||text.length>2000||!element?.closest('#app main')||!rect){popup.hidden=true;return;}
  pendingSelection={selection:text,...hooks.context?.(element)};
  popup.hidden=false;positionSelection();
 };
 document.addEventListener('mouseup',select);document.addEventListener('keyup',e=>{if(e.key==='Escape'){closeExplanation();return;}if(e.key==='Shift'||e.key.startsWith('Arrow')||(e.ctrlKey&&e.key.toLowerCase()==='a'))select(e);});
 document.addEventListener('pointerdown',e=>{if(!popup.contains(e.target)&&!panel.contains(e.target))popup.hidden=true;});
 window.addEventListener('scroll',positionSelection,true);
}
export function openSelectionExplanation(input){
 ensureUI();if(!hooks.enabled?.())return;
 requestId++;controller?.abort();conversation={selection:String(input.selection||'').slice(0,2000),context:String(input.context||'').slice(0,5000),subject:String(input.subject||''),messages:[],loading:false,error:''};
 popup.hidden=true;panel.hidden=false;document.body.classList.add('explanation-open');void sendExplanation();
}
export function bindSelectionExplainer(options){hooks=options;if(typeof document.createElement!=='function'||typeof window.getSelection!=='function')return;ensureUI();if(!hooks.enabled?.())closeExplanation();}
