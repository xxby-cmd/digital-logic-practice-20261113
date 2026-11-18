import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fieldsSource=source.slice(source.indexOf('function answerFields('),source.indexOf('\nfunction reviewFeedback('));
const fields=new Function('esc','isProgrammingQuestion','retryCodeDrafts',fieldsSource+';return answerFields;')(esc,()=>false,new Map());
const readSource=source.slice(source.indexOf('function readAnswer('),source.indexOf('\n',source.indexOf('function readAnswer(')));
const read=new Function(readSource+';return readAnswer;')();

test('结构填空保留行边界，混合普通空继续使用既有输入，禁用与标签完整',()=>{
 const q={id:'input-fidelity',type:'fill',answers:[['next'],['1,2'],['2,4'],['2']],formats:['c-tokens','integer-sequence','integer-set','number']};
 const html=fields(q,['ne\nxt','1,\n2','2,4','2'],'qa',true);
 assert.equal((html.match(/<textarea /g)??[]).length,3);
 assert.equal((html.match(/<input /g)??[]).length,1);
 assert.match(html,/<textarea disabled id="qa-0"[^>]*>\nne\nxt<\/textarea>/);
 assert.match(html,/<textarea disabled id="qa-1"[^>]*>\n1,\n2<\/textarea>/);
 assert.match(html,/<textarea disabled id="qa-0"[^>]*rows="2"/);
 assert.match(fields({...q,answers:[['next']],formats:['c-tokens']},['\nnext\nnext'],'lines'),/rows="3"[^>]*>\n\nnext\nnext<\/textarea>/);
 assert.match(html,/<input disabled id="qa-3"[^>]*value="2">/);
 for(let i=0;i<4;i++)assert.ok(html.includes(`<label for="qa-${i}">第${i+1}空</label>`));
 assert.doesNotMatch(html,/c-tokens|integer-sequence|integer-set/);
 assert.ok(fields({...q,answers:[['next']],formats:['c-tokens']},['</textarea><script>'],'safe').includes('&lt;/textarea&gt;&lt;script&gt;'));
});

test('统一读取混合填空与重做草稿，不在判分前吞掉换行或混用控件',()=>{
 const seen=[],values=['ne\nxt','1,\n2','2,4','2'];
 const q={id:'input-fidelity',type:'fill',answers:values.map(v=>[v])};
 const result=read(q,{querySelector(selector){seen.push(selector);const index=Number(selector.match(/data-blank="(\d+)"/)[1]);return {value:values[index]};}});
 assert.deepEqual(result,values);
 assert.ok(seen.every(selector=>selector.startsWith('[data-answer=')));
 assert.equal(read({id:'choice',type:'single'},{querySelector:()=>({value:'0'})}),0);
 assert.equal(read({id:'short',type:'short'},{querySelector:()=>({value:'分析\n第二行'})}),'分析\n第二行');
});

test('字面串填空与重做保留实际字符，换行不能在精确判分前消失',()=>{
 const q={id:'literal-input',type:'fill',answers:[['aba']],formats:['literal-string']};
 for(const value of ['a\nba','\naba','aba\n',' aba ','abXYcd','</textarea><script>']){
  const html=fields(q,[value],'literal');
  assert.match(html,/<textarea [^>]*class="structured-fill"/);
  assert.ok(html.includes('>\n'+esc(value)+'</textarea>'));
  assert.doesNotMatch(html,/<input /);
  assert.deepEqual(read(q,{querySelector:()=>({value})}),[value]);
  assert.ok(fields(q,[value],'retry-literal').includes('>\n'+esc(value)+'</textarea>'));
 }
 assert.doesNotMatch(fields(q,['aba'],'literal'),/literal-string/);
});
