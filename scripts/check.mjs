import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
const files=readdirSync(new URL('../tests/',import.meta.url)).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>`tests/${name}`);
for(const args of [['scripts/build.mjs'],['--test',...process.argv.slice(2),...files]]){
 const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit',windowsHide:true});
 if(r.error){console.error(r.error.message);process.exit(1);}if(r.status!==0)process.exit(r.status||1);
}
