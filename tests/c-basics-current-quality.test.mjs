import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fixture=JSON.parse(await readFile(new URL('./fixtures/c-basics-current-review-20261118.json',import.meta.url),'utf8'));
test('C2全部60选择绑定当前题干：36真实编译输出与24语义答案独立核选项',()=>{
 const qs=getPracticeCourse('programming').questions.filter(q=>String(q.chapter)==='2'&&q.type==='single');
 assert.equal(qs.length,60);assert.equal(fixture.cases.length,60);
 for(const c of fixture.cases){
  const q=qs.find(q=>q.id===c.id);assert.ok(q,c.id);assert.equal(hash(q.stem),c.stemHashes[q.revision],c.id+'题干变更须重审');
  const matches=q.options.flatMap((value,index)=>value===c.expectedText?[index]:[]);assert.equal(matches.length,1,c.id);
  assert.equal(grade(q,matches[0]).correct,true,c.id);for(let i=0;i<q.options.length;i++)if(i!==matches[0])assert.equal(grade(q,i).correct,false,c.id);
  if(c.sourceSha256){assert.equal(hash(q.stem.match(/```c\n([\s\S]*?)\n```/)[1]),c.sourceSha256);assert.equal(q.traceInput,c.stdin);}
 }
});
test('实际输入换行与反斜线n有区别，当前题允许的澄清仅改变表示不改变程序和输入',()=>{
 const expected={34:[' ','\n',' ','7'],36:[' ','\n',' ','Q'],47:['7',' ','\n',' ','X']};
 for(const [number,input]of Object.entries(expected)){
  const q=getPracticeCourse('programming').questions.find(q=>q.id==='C6B-programming-2-S-'+number.padStart(3,'0'));assert.equal(q.traceInput,input.join(''));
  if(q.revision===2){assert.match(q.stem,/一个换行/);assert.ok(!q.stem.startsWith('标准输入的完整内容为'));}
  else assert.equal(q.revision,1);
  assert.notEqual(q.traceInput,q.traceInput.replace('\n','\\n'),'真实换行不同于两个字面字符');
 }
});
