import test from 'node:test';
import assert from 'node:assert/strict';
import {practiceWeight} from '../study-priorities.js';
import {drawPractice} from '../sessions.js';

test('新题的章内重点权重实际影响抽取，补充题仍可抽到，旧题权重不变',()=>{
 const base=practiceWeight('programming',{chapter:4});
 assert.equal(base,3);
 const pool=[3,2,1].map((studyWeight,i)=>({id:String(i),chapter:4,studyWeight})).map(q=>({...q,practiceWeight:practiceWeight('programming',q)}));
 assert.equal(drawPractice(pool,[],()=>.4).id,'0');
 assert.equal(drawPractice(pool,[],()=>.99).id,'2');
 assert.equal(drawPractice(pool,['0'],()=>.4).id,'1');
 assert.equal(drawPractice(pool,['0','1'],()=>.2).id,'2');
 assert.equal(drawPractice(pool,['0','1','2']),null);
 for(const studyWeight of [undefined,0,-1,Infinity,NaN,99])assert.equal(practiceWeight('programming',{chapter:4,studyWeight}),base);
});
