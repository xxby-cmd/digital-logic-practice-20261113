export function uiEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function uiIcon(name){
 const paths={courses:'M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z',overview:'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5',back:'m14 5-7 7 7 7',menu:'M4 6h16M4 12h16M4 18h16',code:'m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16'};
 return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.overview}"/></svg>`;
}
const names={firstPeak:'寻找首个峰值',lastZero:'查找最后一个零元素',countRuns:'统计连续相等段',lastMin:'寻找最后一个最小值',mean:'计算数组平均值',negatives:'按序提取负数',intersection:'求有序数组交集',reverseRows:'逐行逆置数组',nondecreasing:'判断数组是否非递减',compactPositive:'原地保留正数',prefix:'计算前缀和',differences:'计算相邻差值',countBelow:'统计小于指定值的元素',longestSame:'寻找最长相等段',twoSum:'寻找和为目标值的两个数',insert:'数组插入',erase:'删除数组区间',encodeRuns:'连续段编码',compressRuns:'压缩连续重复项',copyOdd:'按序复制奇数',rotate90:'矩阵顺时针旋转',dayOfYear:'计算日期序号',isPrime:'判断素数',removeLast:'删除链表中最后一个匹配结点',atDepth:'统计二叉树指定层结点',rowSums:'计算各行元素和'};
export function functionSignature(q,guide){if(guide?.signature&&guide?.methodName)return [guide.signature,guide.methodName];return (q.stem+'\n'+(guide?.instruction||'')).match(/\b(?:long long|unsigned int|int|void|double|float|char|size_t)\s+\*?\s*([A-Za-z_]\w*)\s*\([^\n)]*\)/);}
export function questionTitle(q){
 if(q.title)return q.title;
 const match=q.type==='short'||q.coding?functionSignature(q):null;if(match)return names[match[1]]||`${match[1]} 函数`;
 const named=q.stem.match(/(?:实现|编写|补全|补齐)\s*([A-Za-z_]\w*)(?=[，,（(])/);if(named)return names[named[1]]||`${named[1]} 函数`;
 const first=q.stem.split('\n')[0].replace(/```[a-z]*/g,'').trim();return first.length>42?first.slice(0,42)+'…':first;
}
export function codingStatement(q,render,guide){
 const parts=q.stem.split(/(```[\s\S]*?```)/g);
 if(parts.length>1)return parts.map(part=>part.startsWith('```')?`<h3>函数接口与代码片段</h3>${render(part)}`:`<div class="problem-body">${render(part)}</div>`).join('');
 const match=functionSignature(q,guide);
 const description=match?q.stem.replace(match[0],` ${match[1]} 函数`):q.stem;
 return `<div class="problem-body">${render(description)}</div>${match?`<h3>函数接口</h3><pre class="problem-code"><code>${uiEscape(match[0])};</code></pre>`:''}`;
}
export function codingExamples(samples){
 if(!samples.length)return '';
 const block=(label,value)=>`<div class="sample-value"><h4>${uiEscape(label)}</h4><pre class="problem-code"><code>${value===''?'（空）':uiEscape(value)}</code></pre></div>`;
 return samples.map((sample,index)=>{
  const i=index+1;
  const input=block((sample.kind==='call'?'调用样例 ':'输入样例 ')+i,sample.input);
  const output=block('输出样例 '+i,sample.output);
  const files=(sample.inputFiles||[]).map(file=>block('初始文件 · '+file.name,file.content))
   .concat((sample.outputFiles||[]).map(file=>block('预期文件 · '+file.name,file.content)));
  return `<div class="problem-sample" data-problem-sample="${i}">${input}${output}${files.join('')}</div>`;
 }).join('');
}
export function editorControls(){return `<div class="editor-settings"><label>字号<select data-code-font aria-label="代码字号"><option value="13">13 px</option><option value="14" selected>14 px</option><option value="16">16 px</option><option value="18">18 px</option></select></label><button class="btn small" type="button" data-editor-expand aria-pressed="false">展开编辑区</button></div>`;}
export function highlightC(code,language='c'){
 const tokens=String(code).match(/\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b|\b[A-Za-z_]\w*\b|[^]/g)||[];
 const keywords=new Set('auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while _Bool'.split(' '));
 if(language==='java')for(const word of 'abstract assert boolean byte catch class extends final finally implements import instanceof interface native new package private protected public strictfp super synchronized this throw throws transient try var record sealed permits yield null true false'.split(' '))keywords.add(word);
 return tokens.map(t=>{const kind=t.startsWith('//')||t.startsWith('/*')?'comment':/^["']/.test(t)?'string':/^\d/.test(t)?'number':keywords.has(t)?'keyword':'';return kind?`<span class="syntax-${kind}">${uiEscape(t)}</span>`:uiEscape(t);}).join('');
}
export function bindWorkbenchUI(root=document){
 root.querySelectorAll('[data-code-workspace]').forEach(panel=>{
  const input=panel.querySelector('[data-code-source]'),container=panel.querySelector('.code-input');if(!input||!container)return;
  const pre=document.createElement('pre');pre.className='code-highlight';pre.setAttribute('aria-hidden','true');container.append(pre);panel.classList.add('has-highlight');
  const update=()=>{pre.innerHTML=highlightC(input.value,panel.dataset.codeLanguage||'c')+'\n';pre.scrollTop=input.scrollTop;pre.scrollLeft=input.scrollLeft;};update();
  input.addEventListener('input',update);input.addEventListener('scroll',update);
 });
 root.querySelectorAll('[data-code-font]').forEach(select=>select.addEventListener('change',()=>{const article=select.closest('.exam-question');article?.style.setProperty('--code-size',`${Number(select.value)}px`);}));
 root.querySelectorAll('[data-editor-expand]').forEach(button=>{const area=button.closest('.answer-area');const close=()=>{area.classList.remove('editor-expanded');button.setAttribute('aria-pressed','false');button.textContent='展开编辑区';};button.addEventListener('click',()=>{const expanded=area.classList.toggle('editor-expanded');button.setAttribute('aria-pressed',String(expanded));button.textContent=expanded?'收起编辑区':'展开编辑区';});area.addEventListener('keydown',event=>{if(event.key==='Escape')close();});});
 const toggle=root.querySelector('[data-toggle-sidebar]');
 if(toggle){const mobile=()=>window.matchMedia?.('(max-width:760px)').matches||false;toggle.setAttribute?.('aria-expanded',String(!mobile()));toggle.addEventListener('click',()=>{const shell=root.querySelector('.site-workspace');const active=shell.classList.toggle(mobile()?'sidebar-open':'sidebar-collapsed');toggle.setAttribute('aria-expanded',String(mobile()?active:!active));});}
}
