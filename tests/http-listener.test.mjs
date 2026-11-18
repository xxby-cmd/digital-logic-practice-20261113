import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {listenForFetch} from './helpers/http-listener.mjs';

test('HTTP检查避开操作系统可绑定而Fetch禁用的端口，释放旧监听后使用可用端口',async()=>{
 const ports=[5060,5061,6000,4174],server=new EventEmitter();let current,closed=0;
 server.listen=(port,host)=>{assert.equal(port,0);assert.equal(host,'127.0.0.1');current=ports.shift();queueMicrotask(()=>server.emit('listening'));};
 server.address=()=>({port:current});server.close=done=>{closed++;done();};
 assert.equal(await listenForFetch(server),'http://127.0.0.1:4174');assert.equal(closed,3);assert.equal(ports.length,0);
});
