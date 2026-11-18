import test from 'node:test';
import assert from 'node:assert/strict';
import {dsLinearContract} from '../scripts/judge-ds-linear-contracts.mjs';
import {evaluateContract} from '../scripts/judge-contracts.mjs';
test('同一逻辑链表同时使用连续布局与反向间隔物理槽，期望仍按逻辑身份',()=>{
 for(const [id,oldCount]of [['P4-structures-2-D-002',39],['P4-structures-2-D-004',118]]){
  const c=dsLinearContract(id);assert.equal(c.groups.length,oldCount*2,id);
  for(let i=0;i<oldCount;i++)assert.deepEqual(c.groups[2*i],c.groups[2*i+1],id+' 同逻辑不同物理布局');
  assert.match(c.harness,/scattered\?2\*\((?:count|n)-1-i\)\+1:i/);
  assert.match(c.harness,/pool\[slot\[/);assert.match(c.harness,/\]=\{0\}/);
  assert.equal(evaluateContract({status:'ran',stdout:c.groups.map(g=>g.join(' ')).join('\n')+'\n'},c).status,'accepted');
 }
 // Two live inputs may share a node whose physical successor is not p+1.
 const values=[7,7,7],next=[2,-1,-1],slot=values.map((_,i)=>2*(values.length-1-i)+1);
 const nodes=Array(2*values.length+1).fill(null).map(()=>({next:null}));
 next.forEach((j,i)=>nodes[slot[i]].next=j<0?null:slot[j]);
 const tail=start=>{let p=start;while(nodes[p].next!==null)p=nodes[p].next;return p;};
 const wrong=start=>{let p=start;while(nodes[p].next!==null)p++;return p;};
 assert.equal(tail(slot[0]),tail(slot[2]));assert.notEqual(wrong(slot[0]),wrong(slot[2]));
 // A reverse, spaced mapping is injective, in-bounds, and leaves every p+1
 // inside initialized storage for the observed adjacent-address wrong family.
 for(let count=1;count<=256;count++){
  const map=Array.from({length:count},(_,i)=>2*(count-1-i)+1);
  assert.equal(new Set(map).size,count);assert.ok(map.every(p=>p>=1&&p+1<513));
 }
});
