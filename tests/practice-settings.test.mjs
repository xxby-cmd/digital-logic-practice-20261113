import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script,createContext} from 'node:vm';
import {chapterDefaultKinds,normalizeChapterDefault,composeChapterPractice,validateChapterPracticeSnapshot} from '../chapter-practice.js';
import {startChapterTest} from '../sessions.js';
import {mergeBackup} from '../room-progress.js';

test('默认设置支持总题量、题型筛选和精确份额，缺题不跨章或补别的题型',()=>{
 assert.equal(normalizeChapterDefault().total,20);
 const auto=composeChapterPractice('structures',2,{preset:'auto',total:12,enabledKinds:['choice','fill']});
 assert.equal(auto.questions.length,12);assert.ok(auto.questions.every(q=>['选择题','填空题'].includes(q.section)));
 const fixed=composeChapterPractice('programming',3,{preset:'fixed',counts:{choice:2,'code-fill':3,code:2}});
 assert.equal(fixed.questions.length,7);assert.deepEqual(['选择题','程序填空题','编程题'].map(s=>fixed.questions.filter(q=>q.section===s).length),[2,3,2]);
 assert.equal(fixed.questions.reduce((s,q)=>s+q.points,0),100);assert.equal(validateChapterPracticeSnapshot({...fixed,subject:'programming'}),true);
 assert.throws(()=>composeChapterPractice('network',2,{preset:'fixed',counts:{code:1}}),/编程题需1道/);
 for(const config of [null,[],{total:0},{total:101},{total:2.5},{enabledKinds:[]},{enabledKinds:['unknown']},{mode:'fixed',counts:{}},{mode:'fixed',counts:{choice:90,fill:20}}])assert.throws(()=>normalizeChapterDefault(config));
});

test('设置纳入备份恢复，保留本地已有偏好，旧20道记录与新固定份额都可恢复',()=>{
 const all=normalizeChapterDefault({total:30}),network=normalizeChapterDefault({mode:'fixed',counts:{choice:4,fill:2}});
 const old=startChapterTest('structures',composeChapterPractice('structures',2),1,'old20');delete old.practicePlan.configuration;
 const fresh=startChapterTest('network',composeChapterPractice('network',2,{...network,preset:network.mode}),2,'new6');
 const input={version:2,attempts:[],practice:{},tests:[old,fresh],chapterPracticeDefaults:{all,network}};
 const output=mergeBackup({version:2,attempts:[],practice:{}},input);
 assert.deepEqual(output.chapterPracticeDefaults,input.chapterPracticeDefaults);assert.equal(output.tests[0].questions.length,20);assert.equal(output.tests[1].questions.length,6);
 const current={version:2,attempts:[],practice:{},chapterPracticeDefaults:{all:normalizeChapterDefault({total:15})}};
 assert.equal(mergeBackup(current,input).chapterPracticeDefaults.all.total,15);
 assert.throws(()=>mergeBackup(current,{...input,chapterPracticeDefaults:{all:{total:0}}}),/总题量/);
});

test('设置页面保存后默认开始使用新配置，分科覆盖可恢复继承，不改已有答卷',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),nodes=new Map(),events=new Map(),storage=new Map();
 const old=startChapterTest('network',composeChapterPractice('network',2),1,'original20');
 const key='course-practice-room-v2';storage.set(key,JSON.stringify({version:2,attempts:[],practice:{},tests:[old]}));
 const node=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:'',dataset:{},addEventListener(name,fn){this[name]=fn;},setAttribute(){}});return nodes.get(s);};
 const queryAll=s=>s==='[data-default-mode]'?['auto','fixed'].map(value=>Object.assign(node(`mode-${value}`),{value})):s==='[data-default-count]'?chapterDefaultKinds.map(k=>Object.assign(node(`count-${k.id}`),{dataset:{defaultCount:k.id}})):[];
 const location={hash:'#/settings'},context=createContext({document:{title:'',querySelector:node,querySelectorAll:queryAll},window:{addEventListener:(name,fn)=>events.set(name,fn)},location,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},setTimeout,clearTimeout,console});
 new Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
 assert.match(node('#app').innerHTML,/默认练习配置/);
 node('#practice-default-total').input({target:{value:'30'}});node('[data-save-default-settings]').click();
 assert.equal(JSON.parse(storage.get(key)).chapterPracticeDefaults.all.total,30);
 const go=hash=>{location.hash=hash;events.get('hashchange')();};
 go('#/subjects/network/chapter-start/2');events.get('hashchange')();
 let saved=JSON.parse(storage.get(key));assert.equal(saved.tests.length,2);assert.equal(saved.tests[0].questions.length,20);assert.equal(saved.tests[1].questions.length,30);
 go('#/subjects/network/settings');node('mode-fixed').change();
 for(const k of chapterDefaultKinds){node(`count-${k.id}`).value=k.id==='choice'?'4':k.id==='fill'?'2':'0';node(`count-${k.id}`).input();}
 node('[data-save-default-settings]').click();assert.equal(JSON.parse(storage.get(key)).chapterPracticeDefaults.network.total,6);
 go('#/subjects/network/chapter-start/2');events.get('hashchange')();saved=JSON.parse(storage.get(key));assert.equal(saved.tests.at(-1).questions.length,6);assert.equal(saved.tests[0].questions.length,20);
 go('#/subjects/network/settings');node('[data-reset-default-settings]').click();assert.ok(!JSON.parse(storage.get(key)).chapterPracticeDefaults.network);
 assert.match(node('#app').innerHTML,/value="30"/);
 node('#practice-default-total').input({target:{value:'0'}});node('[data-save-default-settings]').click();assert.match(node('#default-settings-status').textContent,/总题量/);assert.ok(!JSON.parse(storage.get(key)).chapterPracticeDefaults.network);
});
