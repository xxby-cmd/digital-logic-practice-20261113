import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeBackup} from '../room-progress.js';
import {startExam,submitExam,settleExam} from '../sessions.js';
import {examPapers} from '../exam-bank.js';
const empty=()=>({version:2,attempts:[],practice:{}});
test('备份可恢复，重复导入不重复计分，已有首次成绩不被导入覆盖',()=>{
 const a=startExam('network',examPapers.network[0],1,'backup');submitExam(a,2);settleExam(a);
 const backup={...empty(),attempts:[a]};const restored=mergeBackup(empty(),backup);
 assert.equal(restored.attempts.length,1);assert.equal(mergeBackup(restored,backup).attempts.length,1);
 const changed=structuredClone(backup);changed.attempts[0].id='another-id';changed.attempts[0].startedAt=3;changed.attempts[0].deadline+=2;
 assert.equal(mergeBackup(restored,changed).attempts[0].id,'backup');
 const invalid=structuredClone(backup);invalid.attempts[0].result.total=200;
 assert.throws(()=>mergeBackup(empty(),invalid));assert.deepEqual(empty(),empty());
});
test('旧单科备份仍可导入，科目身份不能混用',()=>{
 const old={version:1,subject:'network',records:{'1-01':{revision:1,status:'correct',answer:2}},favorites:[],last:'1-01',archived:{}};
 assert.equal(mergeBackup(empty(),old,'network').practice.network.records['1-01'].status,'correct');
 assert.throws(()=>mergeBackup(empty(),old,'structures'));
 assert.throws(()=>mergeBackup(empty(),old,null));
});
