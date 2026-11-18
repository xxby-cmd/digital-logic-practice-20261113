import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('合法条件编译、空宏、取消宏和字符串化/拼接可用，包含边界仍独立核验',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const code=String.raw`
import importlib.util
s=importlib.util.spec_from_file_location('worker','scripts/judge-worker.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
good=['#ifndef GUARD\n#define GUARD\n#include "stdio.h"\n#endif\nint main(void){return 0;}', '#define T(x)#x\n#define C(a,b)a##b\n#define OLD 1\n#undef OLD\n#if defined(OLD)\n#error unexpected\n#elif 1\n#define VALUE 7\n#else\n#define VALUE 9\n#endif\nint main(void){return 0;}', '#\n#line 100 "exercise.c"\nint main(void){return 0;}', '#define C(a,b) a##b\nint main(void){return _Generic(1,int:0,default:1);}']
bad=['#/*\n*/include <forbidden.h>\nint main(void){return 0;}', '#include "../stdio.h"\nint main(void){return 0;}', '#define HEADER <forbidden.h>\n#include HEADER\nint main(void){return 0;}', '#if 0\n#include <forbidden.h>\n#endif\nint main(void){return 0;}', '#define C(a,b) a##b\nC(_Pr,agma)("message(hi)")\nint main(void){return 0;}', '#define C(a,b) a%:%:b\nC(__a,sm__)("x");', '#define C(a,b) a##b\n#if C(__has_,include)("x")\n#endif', r'_Pr\u0061gma("x")', '#pragma once\nint main(void){return 0;}']
good += ['#define INC(/*\n*/ x) ((x)+1)\nint main(void){return INC(6);}', 'const char*s="escaped\\ntext";\nint main(void){return 0;}']
bad += ['const char*s="\n#include <codex_missing_non_sensitive_header.h>\n";', "char c='\n#include <codex_missing_non_sensitive_header.h>\n';", 'int main(void){return 0;}\n\ufeff#include <stdio.h>']
for value in good:m.check_source(value)
for value in bad:
 try:m.check_source(value)
 except ValueError:continue
 raise AssertionError(repr(value))
print('passed')
`;
 const r=spawnSync(process.env.JUDGE_PYTHON,['-c',code],{encoding:'utf8',windowsHide:true});
 assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'passed');
});

test('宏参数里的跨行块注释按C翻译阶段替换为空白',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const source='#include <stdio.h>\n#define INC(/*\n*/ x) ((x)+1)\nint main(void){printf("%d",INC(6));return 0;}';
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify({source,stdin:''}),encoding:'utf8',windowsHide:true,timeout:25000});
 assert.equal(r.status,0,r.stderr);const data=JSON.parse(r.stdout);assert.equal(data.status,'ran',JSON.stringify(data));assert.equal(data.stdout,'7');
});

test('C17真实编译执行条件宏、无空白字符串化与普通标识符拼接',{skip:process.env.JUDGE_RUNTIME!=='1'},()=>{
 const source='#include "stdio.h"\n#define JOIN(a,b)a##b\n#define TEXT(x)#x\n#ifndef BASE\n#define BASE 7\n#endif\n#if BASE==7\n#define VALUE 3\n#elif BASE==8\n#define VALUE 4\n#else\n#error unsupported\n#endif\n#define OLD\n#undef OLD\n#ifndef OLD\n#define CHECK 1\n#else\n#define CHECK 0\n#endif\nint field_n=VALUE;\nint main(void){printf("%s %d %d",TEXT(hello),JOIN(field_,n),CHECK);return 0;}';
 const r=spawnSync(process.env.JUDGE_PYTHON,['scripts/judge-worker.py'],{input:JSON.stringify({source,stdin:''}),encoding:'utf8',env:{...process.env,PYTHONIOENCODING:'utf-8'},windowsHide:true,timeout:25000});
 assert.equal(r.status,0,r.stderr);const data=JSON.parse(r.stdout);assert.equal(data.status,'ran',JSON.stringify(data));assert.equal(data.stdout,'hello 3 1');
});
