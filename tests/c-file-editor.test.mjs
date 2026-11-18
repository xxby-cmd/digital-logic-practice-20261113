import test from 'node:test';
import assert from 'node:assert/strict';
import {codeEditor,bindCodeEditors} from '../code-editor.js';
import {getPracticeCourse} from '../practice-library.js';

test('文件题直接提交实际文件判题，普通C题仍有标准输入自测',()=>{
 const file=getPracticeCourse('programming').questions.find(q=>q.id==='C6L-programming-11-B-001');
 const html=codeEditor(file,undefined,'file',false,true);assert.ok(html.includes('data-code-judge'));assert.ok(!html.includes('data-code-run'));assert.ok(!html.includes('data-code-stdin'));assert.ok(html.includes('文件用例由系统提供'));
 const ordinary=getPracticeCourse('programming').questions.find(q=>q.id==='C6B-programming-2-P-001');
 assert.ok(codeEditor(ordinary,undefined,'ordinary',false,true).includes('data-code-run'));
});

test('没有自测输入框的文件题仍可点击判题并回传当前代码结果',async()=>{
 const oldFetch=globalThis.fetch,oldLocation=globalThis.location;let click,submitted,judged;
 const source={value:'int main(void){return 0;}',addEventListener(){}},lines={},result={};
 const button={disabled:false,hasAttribute:name=>name==='data-code-judge',addEventListener:(name,fn)=>{if(name==='click')click=fn;}};
 const panel={dataset:{codeQuestion:'C6L-programming-11-B-001'},querySelector:selector=>({'[data-code-source]':source,'.code-lines':lines,'[data-code-result]':result,'[data-code-judge]':button}[selector]??null)};
 try{
  globalThis.location={protocol:'http:'};globalThis.fetch=async(url,request)=>{submitted={url,...JSON.parse(request.body)};return {ok:true,json:async()=>({status:'accepted',message:'答案正确。',passed:8,total:8})};};
  bindCodeEditors({querySelectorAll:()=>[panel]},value=>{judged=value;});await click({currentTarget:button});
  assert.equal(submitted.url,'/api/judge');assert.equal(submitted.stdin,'');assert.equal(submitted.source,source.value);assert.equal(judged.result.status,'accepted');assert.equal(button.disabled,false);assert.ok(result.textContent.includes('通过 8 / 8'));
 }finally{globalThis.fetch=oldFetch;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
});
