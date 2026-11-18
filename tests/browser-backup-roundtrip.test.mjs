import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {emptyProgress,sanitizeProgress,sanitizeImportedProgress} from '../progress.js';
import {mergeBackup} from '../room-progress.js';
import {getCourse,progressKey} from '../course-banks.js';
import {subjects} from '../subjects.js';
import {totalPoints} from '../sessions.js';
const before=JSON.parse(await readFile(new URL('./fixtures/browser-room-before-legacy-version-20261118.json',import.meta.url),'utf8'));
const empty=()=>({version:2,attempts:[],practice:{},tests:[]});

test('实际浏览器新房间导出过的无版本legacy可恢复，原答案/归档/首分保持',()=>{
 assert.equal(before.tests.length,1);assert.equal(before.tests[0].questions.length,18);
 assert.ok(before.tests[0].questions.every(q=>q.origin==='原创'&&!q.reference));
 assert.equal(before.tests[0].result.total,17);
 for(const p of Object.values(before.practice))assert.equal(p.legacy.version,undefined);
 const photo=structuredClone(before),restored=mergeBackup(empty(),before);
 assert.deepEqual(before,photo,'导入不改原始浏览器导出数据');
 assert.deepEqual(restored.tests,before.tests);assert.deepEqual(restored.attempts,before.attempts);
 for(const [subject,p]of Object.entries(before.practice)){
  assert.deepEqual(restored.practice[subject].records,p.records,subject+'当前逐题答案');
  assert.deepEqual(restored.practice[subject].archived??{},p.archived??{},subject+'旧版归档');
  assert.equal(restored.practice[subject].legacy.version,1);
 }
 assert.equal(restored.tests[0].result.total,17);assert.equal(totalPoints(restored.tests),0);
 assert.equal(restored.practice.structures.archived['P4-structures-2-F-005@1'].status,'correct');
 const roundtrip=mergeBackup(empty(),JSON.parse(JSON.stringify(restored)));
 assert.deepEqual(roundtrip.tests,restored.tests);assert.deepEqual(roundtrip.practice,restored.practice);
});

test('恢复到既有无版本legacy房间也补标准结构，已有首分和当前作答不被覆盖',()=>{
 const current=structuredClone(before),photo=structuredClone(current);
 const restored=mergeBackup(current,before);
 assert.deepEqual(current,photo);assert.deepEqual(restored.tests,current.tests);
 for(const subject of Object.keys(before.practice))assert.equal(restored.practice[subject].legacy.version,1);
 assert.deepEqual(restored.practice.structures.records,current.practice.structures.records);
 assert.deepEqual(restored.practice.structures.archived,current.practice.structures.archived);
 assert.doesNotThrow(()=>mergeBackup(empty(),JSON.parse(JSON.stringify(restored))));
});

test('只兼容v2内嵌旧默认缺版本，明确未知版本和坏结构仍拒绝',()=>{
 for(const version of [2,99,null,'1']){
  const bad=structuredClone(before);bad.practice.network.legacy.version=version;
  assert.throws(()=>mergeBackup(empty(),bad),/Invalid progress/);
 }
 for(const change of [{records:[]},{favorites:{}},{records:null}]){
  const bad=structuredClone(before);Object.assign(bad.practice.network.legacy,change);
  assert.throws(()=>mergeBackup(empty(),bad),/Invalid progress/);
 }
 assert.throws(()=>sanitizeImportedProgress({subject:'network',records:{},favorites:[]},'network',getCourse('network').questions),/Invalid progress/,'独立v1导入仍明确要求version');
 const valid=structuredClone(before);for(const p of Object.values(valid.practice))p.legacy={...emptyProgress(),...p.legacy};
 assert.doesNotThrow(()=>mergeBackup(empty(),valid));
});

test('真正app.load新建房间复用标准emptyProgress，可立即导出再恢复',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
 const body=app.slice(app.indexOf('function load(){'),app.indexOf('\nlet room=load();'));
 const load=new Function('localStorage','KEY','subjects','progressKey','emptyProgress','sanitizeProgress','getCourse',body+';return load;')({getItem:()=>null},'room-test',subjects,progressKey,emptyProgress,sanitizeProgress,getCourse);
 const fresh=load();assert.equal(fresh.version,2);
 for(const subject of subjects.filter(s=>s.ready))assert.deepEqual(fresh.practice[subject.id].legacy,emptyProgress());
 assert.doesNotThrow(()=>mergeBackup(empty(),JSON.parse(JSON.stringify(fresh))));
});
