import assert from 'node:assert/strict';
import test from 'node:test';
import {getPracticeCourse} from '../practice-library.js';
import {grade} from '../grading.js';

const question=(n, revision)=>{
 const id='P2-network-physical-'+n;
 return getPracticeCourse('network',revision?{questionRevisions:{[id]:revision}}:{}).questions.find(q=>q.id===id);
};

test('物理层多跳题使用收完整包和出口空闲两者中较晚的时刻',()=>{
 const q=question(96);
 const arrivals=[1,2,3,4].map(sendEnd=>sendEnd+1);
 let outgoingEnd=0;
 for(const arrival of arrivals)outgoingEnd=Math.max(arrival,outgoingEnd)+2;
 assert.match(q.stem,/两段单向传播各1 ms.*按到达顺序排队/);
 assert.ok(q.model.includes(`${outgoingEnd+1} ms收完`));
 assert.match(question(96,1).model,/5ms/);
});

test('半双工和固定时隙可接受等值数值，同一题号的旧作答仍按旧题判分',()=>{
 assert.ok(grade(question(81),['5.00']).correct);
 assert.equal(grade(question(81),['14']).correct,false);
 assert.ok(grade(question(81,1),['14']).correct);
 assert.ok(grade(question(83),['4000','4.0']).correct);
 assert.equal(grade(question(83),['4800','4']).correct,false);
 assert.ok(grade(question(83,1),['4']).correct);
});
