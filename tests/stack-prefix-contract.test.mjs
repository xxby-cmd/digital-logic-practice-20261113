import test from 'node:test';
import assert from 'node:assert/strict';
import {dsStackContract} from '../scripts/judge-ds-stack-contracts.mjs';
const prefixBalanced=(bytes,n)=>{const stack=[];for(const c of bytes.slice(0,n)){if(c===40)stack.push(c);else if(!stack.length)return 0;else stack.pop();}return Number(stack.length===0);};
test('括号匹配按公开n域测试：前缀与尾部字符串结果不同，也覆盖不含NUL的数组',()=>{
 const c=dsStackContract('P3-structures-3-97'),cases=[{bytes:[40,41,40,0],n:2},{bytes:[40,41,0],n:1},{bytes:[40,0],n:0},{bytes:[40,41],n:2},{bytes:[41],n:1}];
 assert.equal(c.groups.length,522);const actual=c.groups.slice(-cases.length).map(g=>g.map(Number));
 assert.deepEqual(actual,cases.map(p=>[prefixBalanced(p.bytes,p.n)]));
 for(const p of cases){assert.ok(c.harness.includes(`const char s[${p.bytes.length}]={${p.bytes.join(',')}};printf("%d\\n",match(s,${p.n}));`));assert.ok(p.bytes.slice(0,p.n).every(b=>b===40||b===41));}
 for(const p of cases.slice(0,3)){const end=p.bytes.indexOf(0);assert.notEqual(prefixBalanced(p.bytes,p.n),prefixBalanced(p.bytes,end));}
 assert.ok(cases.some(p=>!p.bytes.includes(0)&&p.bytes.length===p.n));
});
