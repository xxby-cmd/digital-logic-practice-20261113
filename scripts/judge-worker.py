"""Local C17 -> WASI compiler/runner. No guest filesystem or network capabilities."""
import json, os, pathlib, re, subprocess, sys, tempfile

HEADERS = {'stdio.h','stdlib.h','string.h','math.h','ctype.h','stdint.h','stdbool.h','stddef.h','limits.h','float.h','assert.h','errno.h','inttypes.h'}

def check_source(source, max_bytes=32768):
    if not isinstance(source, str) or not source.strip() or len(source.encode()) > max_bytes:
        raise ValueError('请提交不超过32KB的C语言代码。')
    # Only literal standard headers. Never let a submission read arbitrary host headers.
    trigraphs = {'=':'#', '/':'\\', "'":'^', '(':'[', ')':']', '!':'|', '<':'{', '>':'}', '-':'~'}
    phase_one = re.sub(r"\?\?([=/'()!<>-])", lambda m: trigraphs[m[1]], source.removeprefix('\ufeff'))
    joined = re.sub(r'\\\r?\n', '', phase_one)
    # A # in a character, string or comment is not a directive. Preserve lines
    # while masking those tokens, following the compiler's preprocessing phases.
    tokens = r'''/\*.*?\*/|//[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*' '''.rstrip()
    cleaned = re.sub(tokens, lambda m: re.sub(r'[^\n]', ' ', m[0]), joined, flags=re.S)
    cleaned = cleaned.replace('%:', '#')
    if re.search(r'\b(?:_Pragma|__asm(?:__)?|__has_include)\b', cleaned):
        raise ValueError('当前练习环境不支持内联汇编、动态头文件或编译器扩展指令。')
    for line in cleaned.splitlines():
        if not re.match(r'\s*#', line):
            continue
        include = re.fullmatch(r'\s*#\s*include\s*<([a-z0-9_.]+)>\s*', line)
        define = re.fullmatch(r'\s*#\s*define\s+[A-Za-z_]\w*(?:\([^#]*?\))?\s+[^#]*', line)
        if include and include[1] in HEADERS:
            continue
        if define:
            continue
        raise ValueError('仅支持常用C标准头文件和普通宏定义，请移除其他预处理指令。')

def execute_wasm(wasm, stdin_path):
    import wasmtime
    config = wasmtime.Config()
    config.consume_fuel = True
    engine = wasmtime.Engine(config)
    store = wasmtime.Store(engine)
    store.set_fuel(20_000_000)
    store.set_limits(memory_size=64*1024*1024, instances=1, memories=1, tables=2)
    wasi = wasmtime.WasiConfig()
    wasi.argv = ['solution']
    wasi.stdin_file = str(stdin_path)
    output, errors = bytearray(), bytearray()
    overflow = [False]
    def capture(target):
        def write(data):
            if len(target) + len(data) > 65536:
                overflow[0] = True
            target.extend(data[:max(0,65536-len(target))])
            return len(data)
        return write
    wasi.stdout_custom = capture(output)
    wasi.stderr_custom = capture(errors)
    # No preopened directories, inherited environment or network imports.
    store.set_wasi(wasi)
    linker = wasmtime.Linker(engine)
    linker.define_wasi()
    module = wasmtime.Module.from_file(engine, str(wasm))
    try:
        instance = linker.instantiate(store, module)
        instance.exports(store)['_start'](store)
    except wasmtime.ExitTrap as error:
        if error.code != 0:
            return {'status':'runtime_error','message':f'程序以状态 {error.code} 结束。','stdout':output.decode(errors='replace'),'stderr':errors.decode(errors='replace')}
    except wasmtime.Trap as error:
        exhausted = 'fuel' in str(error).lower()
        return {'status':'time_limit' if exhausted else 'runtime_error','message':'运行超出计算量限制。' if exhausted else '程序运行异常，请检查数组边界、指针或计算。','stdout':output.decode(errors='replace'),'stderr':errors.decode(errors='replace')}
    return {'status':'output_limit' if overflow[0] else 'ran','message':'程序输出过多。' if overflow[0] else '自测运行完成。','stdout':output.decode(errors='replace'),'stderr':errors.decode(errors='replace')}

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--execute':
        print(json.dumps(execute_wasm(pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])), ensure_ascii=False))
        return
    request = json.load(sys.stdin)
    source = request.get('source')
    check_source(source)
    source = request.get('prelude', '') + source + request.get('harness', '')
    check_source(source, max_bytes=262144)
    data = request.get('stdin', '')
    if not isinstance(data,str) or len(data.encode()) > 32768:
        raise ValueError('自定义输入不能超过32KB。')
    sdk = pathlib.Path(os.environ.get('JUDGE_SDK',''))
    with tempfile.TemporaryDirectory(prefix='practice-c-') as folder:
        work = pathlib.Path(folder)
        code, wasm, input_file = work/'solution.c', work/'solution.wasm', work/'stdin.txt'
        code.write_text(source, encoding='utf-8')
        input_file.write_text(data, encoding='utf-8')
        compiler = [os.environ['JUDGE_ZIG'],'cc','-target','wasm32-wasi'] if os.environ.get('JUDGE_ZIG') else [str(sdk/'bin/clang.exe'),'--sysroot='+str(sdk/'share/wasi-sysroot')]
        command = compiler+[str(code),'-std=c17','-O0','-Werror=implicit-function-declaration','-Wl,--max-memory=67108864','-Wl,-z,stack-size=1048576','-lm','-o',str(wasm)]
        creation = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        compiled = subprocess.run(command, capture_output=True, timeout=15, creationflags=creation)
        if compiled.returncode:
            diagnostic = compiled.stderr.decode(errors='replace').replace(str(work), '')[:12000]
            print(json.dumps({'status':'compile_error','message':'编译未通过。','stderr':diagnostic}, ensure_ascii=False))
            return
        child = subprocess.run([sys.executable,__file__,'--execute',str(wasm),str(input_file)],capture_output=True,timeout=4,creationflags=creation,encoding='utf-8',env={**os.environ,'PYTHONIOENCODING':'utf-8'})
        if child.returncode:
            print(json.dumps({'status':'runtime_error','message':'程序运行未完成，请检查代码。'},ensure_ascii=False))
        else:
            result=json.loads(child.stdout)
            if compiled.stderr:
                result['stderr']=(compiled.stderr.decode(errors='replace').replace(str(work),'')+'\n'+result.get('stderr',''))[:12000]
            print(json.dumps(result,ensure_ascii=False))

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except subprocess.TimeoutExpired:
        print(json.dumps({'status':'time_limit','message':'编译或运行超时。'},ensure_ascii=False))
    except ValueError as error:
        print(json.dumps({'status':'invalid','message':str(error)},ensure_ascii=False))
    except Exception:
        print(json.dumps({'status':'unavailable','message':'运行环境尚未就绪，请稍后重试。'},ensure_ascii=False))
