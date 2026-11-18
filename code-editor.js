import {hasJudgeContract} from './coding-catalog.js';
import {codingTaskGuides} from './coding-task-guides.js';
import {dsCodingTaskGuides,dsTaskGuide,revisionedDsTaskGuides} from './ds-coding-task-guides.js';
import {cExpressionsGuides} from './c-expressions-guides.js';
import {cControlGuides} from './c-control-guides.js';
import {cFunctionsGuides} from './c-functions-guides.js';
import {cPointersGuides} from './c-pointers-guides.js';
import {cRecordsGuides} from './c-records-guides.js';
import {cPreprocessorGuides} from './c-preprocessor-guides.js';
import {cBasicsGuides} from './c-basics-guides.js';
import {cFilesGuides} from './c-files-guides.js';
import {javaTaskGuide} from './java-task-guides.js';
const escapeCode=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function isProgrammingQuestion(q){return ['编程题','程序填空','程序填空题','算法设计'].includes(q.section)||q.coding===true;}
export async function requestCodeJudge(questionId,source,language='c'){
 const base=location.protocol==='file:'?'http://127.0.0.1:4174':'';
 const response=await fetch(`${base}/api/judge`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId,source,language}),signal:AbortSignal.timeout(language==='java'?180000:25000)});
 if(!response.ok)throw Error(response.status===429?'运行服务正在处理其他程序，请稍后重试。':'运行服务尚未连接，代码与答卷已保留。');
 const result=await response.json();
 if(!result.status||result.status==='unavailable')throw Error('运行环境暂不可用，代码与答卷已保留。');
 return result;
}
export function preferredCodeLanguage(q){if(!javaTaskGuide(q.id,q.revision??1))return 'c';try{return localStorage.getItem('practice-code-language')==='c'?'c':'java';}catch{return 'java';}}
export function codeTaskGuide(q,language='c'){if(language==='java')return javaTaskGuide(q.id,q.revision??1);if(language!=='c')return undefined;return dsTaskGuide(q.id,q.revision??1)||codingTaskGuides[q.id]||(!revisionedDsTaskGuides[q.id]||(q.revision??1)===1?dsCodingTaskGuides[q.id]:undefined)||cExpressionsGuides[q.id]||cControlGuides[q.id]||cFunctionsGuides[q.id]||cPointersGuides[q.id]||cRecordsGuides[q.id]||cPreprocessorGuides[q.id]||cBasicsGuides[q.id]||cFilesGuides[q.id];}
export function codeEditor(q,answer,prefix,disabled=false,allowRun=false,language='c'){
 const guide=codeTaskGuide(q,language),code=typeof answer==='string'?answer:guide?.starter||'',canSelfTest=allowRun&&!disabled&&!guide?.usesFiles;
 return `<section class="code-workspace" data-code-workspace data-code-language="${escapeCode(language)}" data-code-review="${q.manualReview===true}" data-code-question="${escapeCode(q.id)}"><div class="code-toolbar"><label>语言 <select data-code-language aria-label="编程语言" ${disabled?'disabled':''}><option value="c" ${language==='c'?'selected':''}>C17</option>${javaTaskGuide(q.id,q.revision??1)?`<option value="java" ${language==='java'?'selected':''}>Java</option>`:''}</select></label><span>代码自动保存 · 最多32KB</span></div>${hasJudgeContract(q.id,q.revision,language)&&!guide?`<p class="muted-note">提交题目指定的完整函数，无需编写 main。${q.id.startsWith('FULL-structures')?'结构体定义由系统提供，不要重复定义。':'程序填空题请提交补全后的函数。'}</p>`:''}${guide?`<p class="muted-note">${escapeCode(guide.instruction)}</p>`:''}<div class="code-input"><pre class="code-lines" aria-hidden="true">${code.split('\n').map((_,i)=>i+1).join('\n')}</pre><textarea class="code-source" id="${escapeCode(prefix)}-text" data-answer="${escapeCode(q.id)}" data-code-source aria-label="${language==='java'?'Java代码':'C语言代码'}" spellcheck="false" autocapitalize="off" autocomplete="off" ${disabled?'disabled':''} placeholder="在这里编写代码；程序填空题请填写补全后的代码。">${escapeCode(code)}</textarea></div>${allowRun?`${canSelfTest?`<details class="code-test"><summary>自定义输入</summary><label>标准输入<textarea data-code-stdin aria-label="程序标准输入" spellcheck="false"></textarea></label></details>`:guide?.usesFiles?'<p class="muted-note">文件用例由系统提供，提交判题后核对程序输出和文件结果。</p>':'<p class="muted-note">使用题目测试用例核对已提交的代码。</p>'}<div class="code-actions">${canSelfTest?'<button class="btn" type="button" data-code-run>运行自测</button>':''}${hasJudgeContract(q.id,q.revision,language)?`<button class="btn primary" type="button" data-code-judge>${q.manualReview?'测试代码':'提交判题'}</button>`:''}${canSelfTest?`<span>${language==='java'?'自测请提交含main的Main类；':'自测请包含 main 函数；'}自测结果不等于通过全部测试。</span>`:''}</div><pre class="code-result" data-code-result role="status" hidden></pre>`:''}</section>`;
}
export function bindCodeEditors(root=document,onJudge=()=>{},onLanguageChange=()=>{}){
 root.querySelectorAll('[data-code-workspace]').forEach(panel=>{
  const source=panel.querySelector('[data-code-source]'),lines=panel.querySelector('.code-lines');
  source.addEventListener('input',()=>{lines.textContent=source.value.split('\n').map((_,i)=>i+1).join('\n');});
  source.addEventListener('scroll',()=>{lines.scrollTop=source.scrollTop;});
  source.addEventListener('keydown',e=>{if(e.key==='Tab'&&!source.disabled){e.preventDefault();source.setRangeText('    ',source.selectionStart,source.selectionEnd,'end');source.dispatchEvent(new Event('input',{bubbles:true}));}});
  panel.querySelector('[data-code-language]')?.addEventListener('change',e=>{const language=e.target.value,previousLanguage=panel.dataset.codeLanguage||'c';if(!['c','java'].includes(language)||language===previousLanguage)return;try{localStorage.setItem('practice-code-language',language);}catch{}onLanguageChange({questionId:panel.dataset.codeQuestion,language,previousLanguage,source:source.value});});
  const run=async e=>{
   const button=e.currentTarget,result=panel.querySelector('[data-code-result]'),submitted=source.value,isJudge=button.hasAttribute('data-code-judge');button.disabled=true;result.hidden=false;result.textContent='正在编译并运行…';
   try{
    const base=location.protocol==='file:'?'http://127.0.0.1:4174':'';
    const language=panel.dataset.codeLanguage||'c',response=await fetch(`${base}${isJudge?'/api/judge':'/api/run'}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({questionId:panel.dataset.codeQuestion,source:submitted,language,stdin:panel.querySelector('[data-code-stdin]')?.value??''}),signal:AbortSignal.timeout(language==='java'?180000:25000)});
    if(!response.ok)throw Error('运行服务暂不可用。');const data=await response.json();
    if(source.value!==submitted){result.textContent='代码已更改，请重新提交当前版本。';return;}
    if(isJudge)onJudge({questionId:panel.dataset.codeQuestion,source:submitted,language,result:data});
    const message=isJudge&&panel.dataset.codeReview==='true'?(data.status==='accepted'?'代码测试通过；分析部分随作答提交评阅。':data.status==='wrong_answer'?'代码测试未通过。':data.message):data.message;
    result.textContent=[message,Number.isInteger(data.passed)?`通过 ${data.passed} / ${data.total} 组测试`:'',data.stdout?`程序输出：\n${data.stdout}`:'',data.stderr?`编译或运行提示：\n${data.stderr}`:''].filter(Boolean).join('\n\n');
   }catch{result.textContent='运行服务尚未连接，请使用已启动的本地练习室。代码已保留。';}finally{button.disabled=false;}
  };
  panel.querySelector('[data-code-run]')?.addEventListener('click',run);
  panel.querySelector('[data-code-judge]')?.addEventListener('click',run);
 });
}
