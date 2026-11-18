import test from 'node:test';
import assert from 'node:assert/strict';
import {listenForFetch} from './helpers/http-listener.mjs';
import {fileURLToPath} from 'node:url';
import {createPracticeServer} from '../scripts/serve.mjs';
test('网站实际HTTP入口、图标和隐藏源文件边界可用',async t=>{
 const server=createPracticeServer(fileURLToPath(new URL('../dist/',import.meta.url)));
 const base=await listenForFetch(server);
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const home=await fetch(base);assert.equal(home.status,200);assert.match(home.headers.get('content-type'),/text\/html/);
 const html=await home.text();assert.ok(html.includes('课程练习室'));assert.ok(html.includes('chapterPracticePresets'));assert.ok(html.includes('data:image/svg+xml,'));
 const icon=await fetch(base+'/favicon.svg');assert.equal(icon.status,200);assert.match(icon.headers.get('content-type'),/image\/svg\+xml/);
 for(const pathname of ['/scripts/judge-contracts.mjs','/.git/config','/AGENTS.md'])assert.equal((await fetch(base+pathname)).status,404);
 assert.equal((await fetch(base,{method:'POST'})).status,405);
 const head=await fetch(base,{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
});
