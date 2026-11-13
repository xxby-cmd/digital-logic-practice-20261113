import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','app.js','bank.js','grading.js','diagrams.js']) await copyFile(file,`dist/${file}`);
// 同一份实现打包为独立HTML，网络受限时也可双击打开，无需服务器。
const css=await readFile('styles.css','utf8');
let bundle='';
for(const file of ['bank.js','grading.js','diagrams.js','app.js'])bundle+=(await readFile(file,'utf8')).replace(/^import .+;\r?\n/gm,'').replace(/\bexport (?=(const|function)\b)/g,'')+'\n';
let html=await readFile('index.html','utf8');
html=html.replace('<link rel="stylesheet" href="./styles.css">',`<style>${css}</style>`).replace('<script type="module" src="./app.js"></script>',`<script>(()=>{\n${bundle}\n})();</script>`);
await writeFile('dist/index.html',html);
console.log('网站已构建到 dist');
