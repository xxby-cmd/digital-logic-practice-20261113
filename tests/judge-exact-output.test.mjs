import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {evaluateContract} from '../scripts/judge-contracts.mjs';

test('显式精确输出契约保留列宽、小数、换行，不改变原有分词规则',()=>{
 const contract={exactOutput:'[  3.50]\n'};
 assert.equal(evaluateContract({status:'ran',stdout:contract.exactOutput},contract).status,'accepted');
 for(const stdout of ['[3.50]\n','[  3.5]\n','[  3.50]','[  3.50]\nextra'])assert.equal(evaluateContract({status:'ran',stdout},contract).status,'wrong_answer');
 assert.equal(evaluateContract({status:'ran',stdout:'  7   9 \n'},{groups:[['7','9']]}).status,'accepted');
 const variants={variants:[contract,{exactOutput:'0007\n'}]};
 let result=evaluateContract({status:'variants',results:[{status:'ran',stdout:contract.exactOutput},{status:'ran',stdout:'0007\n'}]},variants);assert.equal(result.status,'accepted');assert.equal(result.total,2);
 result=evaluateContract({status:'variants',results:[{status:'ran',stdout:'[3.50]\n'},{status:'ran',stdout:'0007\n'}]},variants);assert.equal(result.status,'wrong_answer');assert.equal(result.passed,1);
});

test('标准输入逐字节保留LF、CRLF和UTF8，不被Windows文本写入改写',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const source='#include <stdio.h>\nint main(void){int c;while((c=getchar())!=EOF)printf("%d ",c);return 0;}';
 const variants=[{stdin:'A\nB',exactOutput:'65 10 66 '},{stdin:'A\r\nB',exactOutput:'65 13 10 66 '},{stdin:'汉',exactOutput:'230 177 137 '}];
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify({source,variants}),encoding:'utf8',windowsHide:true,timeout:25000});assert.equal(r.status,0,r.stderr);
 const result=evaluateContract(JSON.parse(r.stdout),{variants});assert.equal(result.status,'accepted',JSON.stringify(result));assert.equal(result.passed,3);
});

test('真实stdin与printf列宽精度按各配置完整输出判定',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const source='#include <stdio.h>\nint main(void){double x;if(scanf("%lf",&x)!=1)return 0;printf("[%6.2f]\\n",x);return 0;}';
 const variants=[{stdin:'3.5',exactOutput:'[  3.50]\n'},{stdin:'-0.25',exactOutput:'[ -0.25]\n'}];
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify({source,variants}),encoding:'utf8',windowsHide:true,timeout:25000});assert.equal(r.status,0,r.stderr);
 const result=evaluateContract(JSON.parse(r.stdout),{variants});assert.equal(result.status,'accepted',JSON.stringify(result));assert.equal(result.passed,2);
});
