import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
test('宿主执行器故障不当作学生运行错误',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const code=String.raw`
import importlib.util,types
s=importlib.util.spec_from_file_location('worker','scripts/judge-worker.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
responses=iter([types.SimpleNamespace(returncode=0,stderr=b''),types.SimpleNamespace(returncode=1,stdout='',stderr='ModuleNotFoundError')])
m.subprocess.run=lambda *args,**kwargs:next(responses)
assert m.compile_and_run('int main(void){return 0;}','')['status']=='unavailable'
print('passed')
`;
 const r=spawnSync(process.env.JUDGE_PYTHON,['-c',code],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'passed');
});
