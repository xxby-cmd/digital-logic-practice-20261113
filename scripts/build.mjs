import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const modules=['bank-revisions.js','bank.js','course-banks.js','subjects.js','grading.js','progress.js','diagrams.js','sessions.js','exam-bank.js','coding-catalog.js','full-exams.js','practice-extra.js','expanded-practice.js','reference-bank.js','bank-wave-02.js','question-factory.js','bank-wave-03.js','bank-wave-04.js','bank-wave-05.js','study-priorities.js','question-language.js','practice-library.js','chapter-tests.js','practice-types.js','room-progress.js','coding-task-guides.js','ds-coding-task-guides.js','code-editor.js','app.js'];
const overrides={};
if(process.argv.includes('--local')){
 const input=JSON.parse(await readFile('../学习资料/外校题库参考/已核验题目.json','utf8'));
 overrides['reference-bank.js']=`export const referenceQuestions=${JSON.stringify(input)};`;
}
for(const file of ['index.html','styles.css',...modules]) await copyFile(file,`dist/${file}`);
for(const [file,source]of Object.entries(overrides))await writeFile(`dist/${file}`,source);
// 同一份实现打包为独立HTML，网络受限时也可双击打开，无需服务器。
const css=await readFile('styles.css','utf8');
let bundle='const bundledModules={};\n';
for(const file of modules){
 const original=overrides[file]??await readFile(file,'utf8');
 const exported=[...original.matchAll(/\bexport (?:const|(?:async\s+)?function)\s+(\w+)/g)].map(m=>m[1]);
 const source=original.replace(/^import \{([^}]+)\} from ['"]\.\/([^'"]+)['"];\r?\n/gm,(_,names,module)=>`const {${names.replace(/\s+as\s+/g,':')}}=bundledModules[${JSON.stringify(module)}];\n`).replace(/\bexport (?=(const|function|async\s+function)\b)/g,'');
 bundle+=`bundledModules[${JSON.stringify(file)}]=(()=>{\n${source}\nreturn {${exported.join(',')}};\n})();\n`;
}
let html=await readFile('index.html','utf8');
html=html.replace('<link rel="stylesheet" href="./styles.css">',()=>`<style>${css}</style>`).replace('<script type="module" src="./app.js"></script>',()=>`<script>(()=>{\n${bundle}\n})();</script>`);
await writeFile('dist/index.html',html);
console.log('网站已构建到 dist');
