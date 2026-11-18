"""Local C17 -> WASI runner; optional files use server-owned isolated policies."""
import json, os, pathlib, re, subprocess, sys, tempfile

HEADERS = {'stdio.h','stdlib.h','string.h','math.h','ctype.h','stdint.h','stdbool.h','stddef.h','limits.h','float.h','assert.h','errno.h','inttypes.h'}

def check_source(source, max_bytes=32768):
    if not isinstance(source, str) or not source.strip() or len(source.encode()) > max_bytes:
        raise ValueError('请提交不超过32KB的C语言代码。')
    # Only literal standard headers. Never let a submission read arbitrary host headers.
    trigraphs = {'=':'#', '/':'\\', "'":'^', '(':'[', ')':']', '!':'|', '<':'{', '>':'}', '-':'~'}
    normalized = source.removeprefix('\ufeff').replace('\r\n', '\n').replace('\r', '\n')
    phase_one = re.sub(r"\?\?([=/'()!<>-])", lambda m: trigraphs[m[1]], normalized)
    joined = re.sub(r'\\\r?\n', '', phase_one)
    # A # in a character, string or comment is not a directive. Preserve lines
    # while masking those tokens, following the compiler's preprocessing phases.
    tokens = r'''/\*.*?\*/|//[^\n]*|"(?:\\[^\n]|[^"\\\n])*"|'(?:\\[^\n]|[^'\\\n])*' '''.rstrip()
    # Translation phase 3 replaces each comment with one space. Do not also
    # parse physical comment lines: that rejects legal multiline macro arguments.
    # Invalid multiline literals must not mask directives the compiler may parse.
    folded = re.sub(tokens, lambda m: ' ' if m[0].startswith('/*') else m[0], joined, flags=re.S)
    for view in (folded,):
        mask = lambda text: re.sub(r'[^\n]', ' ', text)
        cleaned = re.sub(tokens, lambda m: mask(m[0]), view, flags=re.S)
        comments_only = re.sub(tokens, lambda m: mask(m[0]) if m[0].startswith(('/*', '//')) else m[0], view, flags=re.S)
        cleaned = cleaned.replace('%:', '#')
        if '\ufeff' in cleaned:
            raise ValueError('请移除代码中间的BOM标记，仅允许文件开头的UTF-8标记。')
        # Invalid ASCII UCN spellings must not hide a reserved operation from this
        # check, even if a compiler continues preprocessing after diagnosing them.
        if any(int(m[0][2:], 16) < 128 for m in re.finditer(r'\\(?:u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})', cleaned)):
            raise ValueError('基本字符请直接书写，不支持以通用字符名隐藏预处理指令。')
        reserved = ('_Pragma', '__asm', '__asm__', '__has_include', '__has_include_next', '__has_embed')
        if any(re.search(r'\b' + re.escape(name) + r'\b', cleaned) for name in reserved):
            raise ValueError('当前练习环境不支持内联汇编、动态头文件或编译器扩展指令。')
        if '##' in cleaned:
            identifiers = re.findall(r'\b[A-Za-z_]\w*\b', cleaned)
            if any(word.startswith('_') and any(name.startswith(word) for name in reserved) for word in identifiers):
                raise ValueError('宏拼接请使用普通标识符，当前环境不支持拼接实现保留指令。')
        original_lines = comments_only.split('\n')
        for index, line in enumerate(cleaned.split('\n')):
            if not re.match(r'\s*#', line):
                continue
            # The directive name itself is not macro expanded. Includes remain
            # literal and whitelisted, including inside inactive conditional arms.
            original = original_lines[index].replace('%:', '#')
            include = re.fullmatch(r'\s*#\s*include\s*(?:<([a-z0-9_.]+)>|"([a-z0-9_.]+)")\s*', original)
            define = re.fullmatch(r'\s*#\s*define\s+[A-Za-z_]\w*(?:(?:\([^)]*\).*)|(?:\s+.*))?', line)
            if include and (include[1] or include[2]) in HEADERS:
                continue
            if define:
                continue
            if re.fullmatch(r'\s*#\s*(?:undef|ifdef|ifndef)\s+[A-Za-z_]\w*\s*', line):
                continue
            if re.fullmatch(r'\s*#\s*(?:if|elif|line)\s+.+', line):
                continue
            if re.fullmatch(r'\s*#\s*(?:else|endif)\s*', line):
                continue
            if re.fullmatch(r'\s*#(?:\s*error\b.*|\s*)', line):
                continue
            raise ValueError('仅支持白名单C标准头文件、宏和标准条件编译，请移除动态包含或扩展指令。')

def execute_wasm(wasm, stdin_path, file_run_path=None):
    if file_run_path is not None:
        from judge_file_runtime import execute_file_wasm
        configured = json.loads(pathlib.Path(file_run_path).read_text(encoding='utf-8'))
        return execute_file_wasm(wasm, stdin_path, configured['guest'], configured['policy'])
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

def compile_and_run(source, data, file_policy=None):
    sdk = pathlib.Path(os.environ.get('JUDGE_SDK',''))
    with tempfile.TemporaryDirectory(prefix='practice-c-') as folder:
        work = pathlib.Path(folder)
        file_run = None
        if file_policy is not None:
            from judge_file_runtime import prepare_file_run
            guest, normalized_policy = prepare_file_run(work, file_policy)
            file_run = work/'file-run.json'
            file_run.write_bytes(json.dumps({'guest':str(guest),'policy':normalized_policy}).encode('utf-8'))
        code, wasm, input_file = work/'solution.c', work/'solution.wasm', work/'stdin.txt'
        # Windows text-mode writes would turn submitted LF into CRLF. Preserve
        # source/stdin bytes, especially for getchar and fixed-width %c tasks.
        code.write_bytes(source.encode('utf-8'))
        input_file.write_bytes(data.encode('utf-8'))
        compiler = [os.environ['JUDGE_ZIG'],'cc','-target','wasm32-wasi'] if os.environ.get('JUDGE_ZIG') else [str(sdk/'bin/clang.exe'),'--sysroot='+str(sdk/'share/wasi-sysroot')]
        command = compiler+[str(code),'-std=c17','-O1','-Werror=implicit-function-declaration','-Wl,--max-memory=67108864','-Wl,-z,stack-size=1048576','-lm','-o',str(wasm)]
        creation = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        compiled = subprocess.run(command, capture_output=True, timeout=15, creationflags=creation)
        if compiled.returncode:
            diagnostic = compiled.stderr.decode(errors='replace').replace(str(work), '')[:12000]
            return {'status':'compile_error','message':'编译未通过。','stderr':diagnostic}
        execute_args = [sys.executable,__file__,'--execute',str(wasm),str(input_file)]
        if file_run is not None:
            execute_args.append(str(file_run))
        child = subprocess.run(execute_args,capture_output=True,timeout=4,creationflags=creation,encoding='utf-8',env={**os.environ,'PYTHONIOENCODING':'utf-8'})
        if child.returncode:
            return {'status':'unavailable','message':'运行环境暂不可用，请稍后重试。'}
        else:
            result=json.loads(child.stdout)
            if compiled.stderr:
                result['stderr']=(compiled.stderr.decode(errors='replace').replace(str(work),'')+'\n'+result.get('stderr',''))[:12000]
            return result

def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--execute':
        print(json.dumps(execute_wasm(pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), sys.argv[4] if len(sys.argv)>4 else None), ensure_ascii=False))
        return
    request = json.load(sys.stdin)
    source = request.get('source')
    check_source(source)
    source = source.removeprefix('\ufeff')
    variants = request.get('variants')
    if variants is not None and (not isinstance(variants, list) or not 1 <= len(variants) <= 4):
        raise RuntimeError('invalid server configurations')
    configurations = variants if variants is not None else [request]
    inputs = []
    for config in configurations:
        if not isinstance(config, dict):
            raise RuntimeError('invalid server configuration')
        prelude, harness, data = config.get('prelude', ''), config.get('harness', ''), config.get('stdin', '')
        if not isinstance(prelude, str) or not isinstance(harness, str):
            raise RuntimeError('invalid trusted driver')
        if not isinstance(data, str) or len(data.encode()) > 32768:
            if variants is not None or request.get('trusted_driver'):
                raise RuntimeError('invalid trusted input')
            raise ValueError('自定义输入不能超过32KB。')
        combined = prelude + source + harness
        try:
            check_source(combined, max_bytes=262144)
        except ValueError as error:
            if variants is not None or request.get('trusted_driver'):
                raise RuntimeError('invalid trusted driver') from error
            raise
        file_policy = None
        if 'file_policy' in config:
            if not (variants is not None or request.get('trusted_driver')):
                raise RuntimeError('file policy requires a trusted server driver')
            from judge_file_runtime import validate_file_policy
            file_policy = validate_file_policy(config['file_policy'])
        inputs.append((combined, data, file_policy))
    results, output_bytes = [], 0
    for combined, data, file_policy in inputs:
        result = compile_and_run(combined, data, file_policy)
        if variants is not None:
            for key in ('stdout', 'stderr'):
                encoded = result.get(key, '').encode()
                remaining = max(0, 65536 - output_bytes)
                if len(encoded) > remaining:
                    result[key] = encoded[:remaining].decode(errors='replace')
                    result.update(status='output_limit', message='程序输出过多。')
                output_bytes += min(len(encoded), remaining)
        results.append(result)
        if result.get('status') != 'ran':
            break
    response = {'status':'variants', 'results':results} if variants is not None else results[0]
    print(json.dumps(response, ensure_ascii=False))

if __name__ == '__main__':
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    try:
        main()
    except subprocess.TimeoutExpired:
        print(json.dumps({'status':'time_limit','message':'编译或运行超时。'},ensure_ascii=False))
    except ValueError as error:
        print(json.dumps({'status':'invalid','message':str(error)},ensure_ascii=False))
    except Exception:
        print(json.dumps({'status':'unavailable','message':'运行环境尚未就绪，请稍后重试。'},ensure_ascii=False))
