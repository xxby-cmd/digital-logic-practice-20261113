import test from 'node:test';
import assert from 'node:assert/strict';
import {getPracticeCourse} from '../practice-library.js';
test('随机呈现的栈、队列与前缀和题给齐自身所需定义',()=>{
 const ds=getPracticeCourse('structures').questions,c=getPracticeCourse('programming').questions;
 for(const id of ['P3-structures-3-92','P3-structures-3-94','P3-structures-3-96']){
  const q=ds.find(q=>q.id===id);assert.ok(q.revision>=2);assert.ok(!/同上|同约定|沿用/.test(q.stem));
 }
 assert.ok(ds.find(q=>q.id==='P3-structures-3-94').stem.includes('typedef struct Node{int v;struct Node *next;}Node;'));
 assert.ok(ds.find(q=>q.id==='P3-structures-3-96').stem.includes('牺牲一个单元'));
 const q=c.find(q=>q.id==='P3-programming-6-60');assert.ok(q.stem.includes('s[0]=0'));assert.ok(!q.stem.includes('上一题'));
 assert.ok(ds.find(q=>q.id==='P3-structures-3-99').model.includes('(long long)rear'));
});
