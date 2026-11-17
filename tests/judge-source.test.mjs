import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('源校验区分字面量/注释并阻止BOM、拼接行、三字符及替代指令绕过',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const python=String.raw`
import importlib.util
s=importlib.util.spec_from_file_location('worker','scripts/judge-worker.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
good=["int main(void){char c='#';return c==0;}", 'int main(void){char*s="_Pragma __asm #embed ??text";return s[0]==0;}', '/* #include <forbidden.h> */\nint main(void){return 0;}', '#include <stdio.h>\n#define VALUE 3\nint main(void){return 0;}']
bad=['#include </not/allowed/header.h>\nint main(void){return 0;}', '\ufeff#include </not/allowed/header.h>\nint main(void){return 0;}', '%:include </not/allowed/header.h>\nint main(void){return 0;}', '??=include </not/allowed/header.h>\nint main(void){return 0;}', '#inc\\\nlude </not/allowed/header.h>\nint main(void){return 0;}']
for code in good:m.check_source(code)
for code in bad:
 try:m.check_source(code)
 except ValueError:continue
 raise AssertionError(repr(code))
print('passed')
`;
 const p=spawnSync(process.env.JUDGE_PYTHON,['-c',python],{encoding:'utf8',windowsHide:true});
 assert.equal(p.status,0,p.stderr);assert.equal(p.stdout.trim(),'passed');
});
