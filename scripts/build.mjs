import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','app.js','bank.js','grading.js','diagrams.js']) await copyFile(file,`dist/${file}`);
console.log('网站已构建到 dist');
