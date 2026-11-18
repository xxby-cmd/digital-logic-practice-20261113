import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {mergeBackup} from '../room-progress.js';
import {settleExam,totalPoints,setMark} from '../sessions.js';
const empty=()=>({version:2,attempts:[],practice:{}});
for(const state of ['draft','settled'])test(`四章修前393原创题的${state}快照保持原题/答案/评分方式且不带本地参考`,async()=>{
 const before=JSON.parse(await readFile(new URL(`./fixtures/chapters-before-quality-20261118-${state}.json`,import.meta.url),'utf8'));
 assert.equal(before.tests.length,4);assert.equal(before.tests.flatMap(a=>a.questions).length,393);
 assert.deepEqual(before.tests.map(a=>a.questions.length),[100,93,100,100]);
 assert.ok(before.tests.every(a=>a.subjectiveGradingVersion===1));assert.ok(!before.tests.flatMap(a=>a.questions).some(q=>q.id.startsWith('WHU-HW02')));
 const restored=mergeBackup(empty(),before);assert.ok(JSON.stringify(restored.tests)===JSON.stringify(before.tests),'旧快照和首分必须逐字段保持');assert.equal(totalPoints(restored.tests),0);
 if(state==='settled')for(const a of restored.tests){assert.equal(settleExam(a).total,100);assert.equal(setMark(a,a.questions[0].id,0),false);}
 const injected=structuredClone(before);injected.tests[0].questions[0].revision=99;assert.throws(()=>mergeBackup(empty(),injected),/题目|版本/);
 const changed=structuredClone(before);changed.tests[2].questions.find(q=>q.id==='P3-structures-3-88').rubric=['偷偷用新版评分覆盖旧版'];assert.throws(()=>mergeBackup(empty(),changed),/题目|版本/);
});
