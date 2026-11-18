import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {cFunctionsContract} from '../scripts/judge-c-functions.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';

function question(suffix,revision){
 const id='C6F-programming-5-'+suffix;
 return getPracticeCourse('programming',revision?{questionRevisions:{[id]:revision}}:{}).questions.find(q=>q.id===id);
}

test('函数考题的公开契约与代码模板检验同一个条件',()=>{
 assert.match(question('B-003',1).stem,/先调用.*再调用/);
 assert.doesNotMatch(question('B-003').stem,/先调用|再调用/);
 assert.match(question('B-008').stem,/与s的存储不重叠/);
 assert.match(question('P-004').stem,/与输入字符串不重叠/);
 assert.match(question('P-008').stem,/每次部分和都可用long long表示/);
 assert.match(question('S-031').stem,/"ABCD"\[n\]/);
 assert.doesNotMatch(question('S-001').explanation,/第一项/);
});

test('逐行输出题声明实际判题接受的前后空白及仍然拒绝的行内空格',()=>{
 const q=question('B-014'),contract=cFunctionsContract(q.id);
 const text=contract.groups.map(([row])=>row.startsWith('*')?' '+row+' ':row).join('\n')+'\n';
 assert.match(q.stem,/忽略行首和行尾的空白/);
 assert.equal(evaluateContract({status:'ran',stdout:text},contract).status,'accepted');
 assert.equal(evaluateContract({status:'ran',stdout:text.replace('**','* *')},contract).status,'wrong_answer');
});
