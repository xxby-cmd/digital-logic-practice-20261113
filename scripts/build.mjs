import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {auditReadingTerms} from './audit-reading-terms.mjs';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {reviseQuestionLanguage} from '../question-language.js';
import {getPracticeCourse} from '../practice-library.js';
import {readLocalReferenceRevisions} from './local-reference-revisions.mjs';
await mkdir('dist',{recursive:true});
const modules=["bank-revisions.js","bank.js","course-banks.js","fill-answer-formats.js","grading.js","ai-grading.js","progress.js","diagrams.js","sessions.js","exam-bank.js","question-factory.js","bank-c-expressions.js","c-expressions-guides.js","bank-c-control.js","c-control-guides.js","bank-c-functions.js","c-functions-guides.js","bank-c-pointers.js","c-pointers-guides.js","bank-c-records.js","c-records-guides.js","bank-c-preprocessor.js","c-preprocessor-guides.js","bank-c-introduction.js","bank-c-basics.js","c-basics-guides.js","bank-c-files.js","c-file-availability.js","c-files-guides.js","ds-linear-task-guides.js","ds-string-task-guides.js","ds-array-task-guides.js","ds-intro-task-guides.js","ds-graph-task-guides.js","ds-tree-task-guides.js","ds-sort-task-guides.js","ds-search-task-guides.js","ds-analysis-task-guides.js","ds-string-quality-task-guides.js","ds-array-quality-task-guides.js","ds-coding-task-guides.js","java-algorithm-task-guides.js","java-task-guides.js","java-reading.js","java-coding-catalog.js","coding-catalog.js","full-exams.js","practice-extra.js","expanded-practice.js","reference-bank.js","bank-wave-02.js","bank-wave-03.js","bank-wave-04.js","bank-wave-05.js","bank-wave-06.js","bank-wave-07.js","bank-wave-08.js","bank-network-control.js","bank-network-wireless.js","bank-network-dataplane.js","bank-network-security.js","bank-network-multimedia.js","study-priorities.js","question-language.js","practice-library.js","subjects.js","chapter-tests.js","practice-types.js","chapter-practice.js","room-progress.js","coding-task-guides.js","code-editor.js","workbench-ui.js","selection-explainer.js","term-notes.js","term-glossary.js","term-candidates.js","term-planner.js","term-help.js","app.js"];
const overrides={};
let localReferences={};
let localReferenceRevisions={};
if(process.argv.includes('--local')){
 const input=JSON.parse(await readFile('../学习资料/外校题库参考/已接入题目.json','utf8'));
 const revisions=await readLocalReferenceRevisions(),raw=new Map(Object.values(input).flat().map(q=>[q.id,q]));
 const originals=new Set(['network','structures','digital','programming'].flatMap(subject=>getPracticeCourse(subject).questions.map(q=>q.id)));
 if(raw.size!==Object.values(input).flat().length||[...raw.keys()].some(id=>originals.has(id)))throw Error('本地参考题题号重复或与原创题冲突。');
 for(const [id,versions]of Object.entries(revisions)){
  if(!raw.has(id)||Object.hasOwn(practiceQuestionRevisions,id))throw Error('本地参考题修订题号无效或与原创题冲突。');
  const base=reviseQuestionLanguage(raw.get(id));
  if(Object.keys(versions).some(v=>Number(v)<=(base.revision??1)))throw Error('本地参考题修订必须保留原始版本。');
 }
 localReferences=input;localReferenceRevisions=revisions;
 overrides['reference-bank.js']=`export const referenceQuestions=${JSON.stringify(input)};`;
 if(Object.keys(revisions).length){
  const source=await readFile('bank-revisions.js','utf8'),start=source.indexOf('export const practiceQuestionRevisions='),end=source.indexOf('\nexport function practiceQuestionAtRevision',start);
  if(start<0||end<start)throw Error('题目版本入口暂不可读。');
  overrides['bank-revisions.js']=source.slice(0,start)+'export const practiceQuestionRevisions='+JSON.stringify({...practiceQuestionRevisions,...revisions})+';'+source.slice(end);
 }
}
auditReadingTerms(localReferences,{referenceRevisions:localReferenceRevisions});
for(const file of ['index.html','styles.css','reading-ui.css','favicon.svg',...modules]) await copyFile(file,`dist/${file}`);
for(const [file,source]of Object.entries(overrides))await writeFile(`dist/${file}`,source);
// 同一份实现打包为独立HTML，网络受限时也可双击打开，无需服务器。
const css=await readFile('styles.css','utf8')+'\n'+await readFile('reading-ui.css','utf8');
let bundle='const bundledModules={};\n';
for(const file of modules){
 const original=overrides[file]??await readFile(file,'utf8');
 const exported=[...original.matchAll(/\bexport (?:const|(?:async\s+)?function)\s+(\w+)/g)].map(m=>m[1]);
 const source=original.replace(/^import \{([^}]+)\} from ['"]\.\/([^'"]+)['"];\r?\n/gm,(_,names,module)=>`const {${names.replace(/\s+as\s+/g,':')}}=bundledModules[${JSON.stringify(module)}];\n`).replace(/\bexport (?=(const|function|async\s+function)\b)/g,'');
 bundle+=`bundledModules[${JSON.stringify(file)}]=(()=>{\n${source}\nreturn {${exported.join(',')}};\n})();\n`;
}
let html=await readFile('index.html','utf8');
html=html.replace('href="./favicon.svg"',`href="data:image/svg+xml,${encodeURIComponent(await readFile('favicon.svg','utf8'))}"`);
html=html.replace('<link rel="stylesheet" href="./reading-ui.css">','');
html=html.replace('<link rel="stylesheet" href="./styles.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./app.js"></script>',()=>`<script>(()=>{\n${bundle}\n})();</script>`);
await writeFile('dist/index.html',html);
console.log('网站已构建到 dist');
