"""Local Java21 JSON runner. All compiler/JVM launches use AppContainer + Job."""
import json
import hashlib
import os
from pathlib import Path
import re
import sys
import time
import uuid

MAX_SOURCE=32768
MAX_COMBINED=262144
MAX_INPUT=32768
MAX_OUTPUT=65536
JAVA_IDENTIFIER=re.compile(r'[A-Za-z_$][A-Za-z0-9_$]*\Z')
JAVA_KEYWORDS=set('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null _'.split())
PRIMITIVES={'boolean','byte','short','char','int','long','float','double','void'}
JAVA_LANG={'String','Object','CharSequence','Number','Boolean','Byte','Short','Character','Integer','Long','Float','Double','Void'}


class RequestError(ValueError):
    def __init__(self,message,configuration=False):
        super().__init__(message)
        self.configuration=configuration


def _text(value,limit,label,configuration=False):
    if not isinstance(value,str):
        raise RequestError(label+'格式不正确。',configuration)
    try:
        size=len(value.encode('utf-8'))
    except UnicodeEncodeError as error:
        raise RequestError(label+'包含无效字符。',configuration) from error
    if size>limit:
        raise RequestError(label+'超过长度限制。',configuration)
    return value


def _interface_type(value,parameter=False):
    value=_text(value,1024,'题目接口类型',True).strip()
    value=re.sub(r'\s*\[\s*\]\s*','[]',value)
    base=value.split('[',1)[0]
    suffix=value[len(base):]
    dimensions=len(suffix)//2
    if suffix!='[]'*dimensions or dimensions>255 or not base:
        raise RequestError('题目接口类型不正确。',True)
    if base not in PRIMITIVES:
        if any(not JAVA_IDENTIFIER.fullmatch(part) or part in JAVA_KEYWORDS for part in base.split('.')):
            raise RequestError('题目接口类型不正确。',True)
        if base in JAVA_LANG:
            base='java.lang.'+base
    if base=='void' and (parameter or dimensions):
        raise RequestError('题目接口不能使用该void类型。',True)
    return base+'[]'*dimensions


def validate_interface_spec(value):
    if not isinstance(value,dict) or set(value)!={'name','returnType','parameterTypes'}:
        raise RequestError('题目接口配置尚未完整。',True)
    name=value['name']
    if not isinstance(name,str) or len(name)>128 or not JAVA_IDENTIFIER.fullmatch(name) or name in JAVA_KEYWORDS:
        raise RequestError('题目方法名配置不正确。',True)
    parameters=value['parameterTypes']
    if not isinstance(parameters,list) or len(parameters)>255:
        raise RequestError('题目参数配置不正确。',True)
    parameters=[_interface_type(item,True) for item in parameters]
    if sum(2 if item in ('long','double') else 1 for item in parameters)>255:
        raise RequestError('题目参数配置超过Java接口限制。',True)
    return {'name':name,'returnType':_interface_type(value['returnType']),'parameterTypes':parameters}


def interface_sources(spec,check_name):
    result=spec['returnType']
    defaults={'void':'','boolean':'return false;','byte':'return 0;','short':'return 0;','char':"return '\\0';",'int':'return 0;','long':'return 0L;','float':'return 0.0f;','double':'return 0.0d;'}
    body=defaults.get(result,'return null;')
    parameters=', '.join(kind+' p'+str(index) for index,kind in enumerate(spec['parameterTypes']))
    stub='public class Solution { public static '+result+' '+spec['name']+'('+parameters+') { '+body+' } }\n'
    expected=', '.join(kind+'.class' for kind in spec['parameterTypes'])
    method=json.dumps(spec['name'])
    check='''public final class CHECK_NAME {
 public static void main(java.lang.String[] args) {
  final java.lang.Class<?> expectedReturn;
  final java.lang.Class<?>[] expectedParameters;
  try {
   expectedReturn=RETURN_TYPE.class;
   expectedParameters=new java.lang.Class<?>[]{PARAMETER_TYPES};
  } catch(java.lang.Throwable configurationFailure) {
   java.lang.System.out.print("CONFIG"); return;
  }
  final java.lang.Class<?> student;
  try {
   student=java.lang.Class.forName("Solution",false,java.lang.ClassLoader.getSystemClassLoader());
  } catch(java.lang.ClassNotFoundException absentStudent) {
   java.lang.System.out.print("CE"); return;
  } catch(java.lang.LinkageError invalidStudent) {
   java.lang.System.out.print("CE"); return;
  }
  try {
   java.lang.reflect.Method method=student.getMethod(METHOD_NAME,expectedParameters);
   int flags=method.getModifiers();
   boolean valid=method.getReturnType()==expectedReturn
     && java.lang.reflect.Modifier.isPublic(flags)
     && java.lang.reflect.Modifier.isStatic(flags);
   java.lang.System.out.print(valid?"OK":"CE");
  } catch(java.lang.NoSuchMethodException absentMethod) {
   java.lang.System.out.print("CE");
  } catch(java.lang.Throwable unexpectedFailure) {
   java.lang.System.out.print("CONFIG");
  }
 }
}
'''
    check=check.replace('CHECK_NAME',check_name).replace('RETURN_TYPE',result).replace('PARAMETER_TYPES',expected).replace('METHOD_NAME',method)
    return stub,check


def validate_request(request):
    if not isinstance(request,dict) or request.get('language')!='java':
        raise RequestError('请选择Java语言。')
    if set(request)-{'language','source','stdin','prelude','harness','trusted_driver','variants','interfaceSpec'}:
        raise RequestError('运行请求包含不支持的设置。')
    source=_text(request.get('source'),MAX_SOURCE,'代码')
    if not source.strip():
        raise RequestError('请先填写Java代码。')
    trusted=request.get('trusted_driver') is True
    variants=request.get('variants')
    multiple=variants is not None
    if multiple:
        if not trusted:
            raise RequestError('测试配置须由题目运行服务提供。')
        if not isinstance(variants,list) or not 1<=len(variants)<=4:
            raise RequestError('测试配置数量不正确。',True)
        if any(key in request for key in ('prelude','harness','stdin')):
            raise RequestError('测试配置重复。',True)
        configurations=variants
    else:
        configurations=[{key:request[key] for key in ('prelude','harness','stdin') if key in request}]
    normalized=[]
    for config in configurations:
        if not isinstance(config,dict) or set(config)-{'prelude','harness','stdin','interfaceSpec'}:
            raise RequestError('测试配置格式不正确。',trusted)
        functional=multiple or any(key in config for key in ('prelude','harness'))
        if functional and not trusted:
            raise RequestError('测试器须由题目运行服务提供。')
        if not functional and ('interfaceSpec' in config or 'interfaceSpec' in request):
            raise RequestError('自测不需要题目接口配置。',trusted)
        interface=validate_interface_spec(config.get('interfaceSpec',request.get('interfaceSpec'))) if functional else None
        prelude=_text(config.get('prelude',''),MAX_COMBINED,'测试配置',functional)
        harness=_text(config.get('harness',''),MAX_COMBINED,'测试配置',functional)
        stdin=_text(config.get('stdin',''),MAX_INPUT,'输入',functional)
        generated=interface_sources(interface,'CourseInterface_'+'0'*32) if functional else ('','')
        if len((source+'\n'+prelude+'\n'+harness+'\n'+''.join(generated)).encode('utf-8'))>MAX_COMBINED:
            raise RequestError('测试配置超过长度限制。',functional)
        if functional and not (prelude+'\n'+harness).strip():
            raise RequestError('题目测试配置尚未完整。',True)
        normalized.append({'functional':functional,'prelude':prelude,'harness':harness,'stdin':stdin,'interfaceSpec':interface})
    return source,normalized,multiple


def configured_jdk():
    home=Path(os.environ.get('JUDGE_JAVA_HOME','C:/Program Files/Java/jdk-21')).resolve()
    for relative in ['bin/java.exe','bin/javac.exe','bin/server/jvm.dll','lib/modules','conf/security/java.security','release']:
        if not (home/relative).is_file():
            raise RuntimeError('Java21运行环境尚未准备好。')
    release=(home/'release').read_text(encoding='utf-8',errors='strict')
    if not re.search(r'^JAVA_VERSION="21(?:[.\-+"]|$)',release,re.M):
        raise RuntimeError('当前运行器需要Java21。')
    return home


def _without_host_paths(value):
    return '\n'.join(line for line in value.splitlines() if not re.search(r'(?i)(?:\b[a-z]:[\\/]|\\\\[^\\\s]+\\)',line))


def _student_compile_message(code):
    if code=='compiler.err.expected' or 'illegal.start' in code or 'premature.eof' in code or 'unclosed' in code:
        return '语法不完整，请检查分号、括号和声明。'
    if code.startswith('compiler.err.cant.resolve'):
        return '找不到所用的类、变量或方法，请检查名称和声明。'
    if code.startswith('compiler.err.cant.apply.symbol'):
        return '方法参数的数量或类型不符合要求。'
    if code in ('compiler.err.prob.found.req','compiler.err.void.not.allowed.here'):
        return '类型不匹配，请检查返回值、表达式和赋值。'
    if code=='compiler.err.non-static.cant.be.ref':
        return '静态调用方式不正确，请检查static声明或对象用法。'
    if code=='compiler.err.report.access':
        return '访问权限不符合要求，请检查public与private声明。'
    return '编译未通过，请检查这一行的语法和类型。'


def compiler_diagnostic(stderr,functional):
    # Only the student file is compiled at this phase. Machine keys are never UI.
    allowed='Solution.java' if functional else 'Main.java'
    messages=[]
    for match in re.finditer(r'(?m)^([^\r\n]*?\.java):(\d+):(\d+):\s*(compiler\.[\w.-]+)',stderr):
        filename=match[1].replace('\\','/').rsplit('/',1)[-1]
        if filename==allowed and match[4].startswith('compiler.err.'):
            messages.append(f'{allowed}:{int(match[2])}：'+_student_compile_message(match[4]))
    return '\n'.join(dict.fromkeys(messages)) or ('请检查Solution类及方法声明。' if functional else '请检查Main类、main方法及Java语法。')


def runtime_diagnostic(stderr,functional):
    if functional:
        # Any text, frame or custom exception name can contain private inputs.
        # Functional judging reports controlled status messages, never this stream.
        return ''
    if not functional:
        lines=[]
        for line in stderr.splitlines():
            if ('Main.java:' in line or 'Exception' in line or 'Error' in line or line.startswith('Caused by:')) and 'JudgeMain' not in line:
                safe=_without_host_paths(line)
                if safe:
                    lines.append(safe)
        return '\n'.join(lines)


def _clip(value,remaining):
    encoded=value.encode('utf-8')
    if len(encoded)<=remaining:
        return value,len(encoded),False
    return encoded[:max(0,remaining)].decode('utf-8',errors='ignore'),max(0,remaining),True


def bounded_result(result,wire_budget):
    clipped=False
    for field in ('stdout','stderr'):
        value,used,one=_clip(result.get(field,''),wire_budget[0])
        result[field]=value
        wire_budget[0]-=used
        clipped|=one
    if clipped:
        result.update(status='output_limit',message='程序输出过多。')
    return result


HEALTH_SOURCE='''import java.util.*;
public class RuntimeCheck {
 public static void main(String[] args) {
  Scanner scanner=new Scanner("9 4");HashMap<Integer,Integer> map=new HashMap<>();map.put(scanner.nextInt(),scanner.nextInt());
  PriorityQueue<Integer> queue=new PriorityQueue<>();queue.add(9);queue.add(4);
  if(map.get(9)!=4||queue.remove()!=4||java.security.Security.getProperty("security.provider.1")==null)throw new IllegalStateException();
  System.out.print("READY");
 }
}
'''


def health_check(home,Profile,run_limited,jvm_args):
    with Profile(home) as profile:
        file=profile.work/'RuntimeCheck.java'
        file.write_bytes(HEALTH_SOURCE.encode('utf-8'))
        compiled=run_limited([home/'bin/javac.exe',*jvm_args(profile.work,True),'-source','21','-target','21','-proc:none','-encoding','UTF-8','-classpath',profile.work,'-d',profile.work,file],profile.work,limits={'wall_seconds':6,'output_bytes':4096},profile=profile)
        if compiled['status']!='exited' or compiled['exit_code']!=0:
            raise RuntimeError('Java可信环境检查未通过。')
        ran=run_limited([home/'bin/java.exe',*jvm_args(profile.work),'-cp',profile.work,'RuntimeCheck'],profile.work,limits={'wall_seconds':2,'output_bytes':4096},profile=profile)
        if ran['status']!='exited' or ran['exit_code']!=0 or ran['stdout']!='READY':
            raise RuntimeError('Java标准库环境检查未通过。')


def _unavailable(message='Java题目运行环境暂不可用。'):
    return {'status':'unavailable','message':message,'stdout':'','stderr':''}


def _compile(home,profile,files,budget,run_limited,jvm_args,student_only=False):
    # JDK21 is fixed; source/target21 uses its platform API without ct.sym.
    options=[]
    if student_only:
        empty=profile.work/'empty-sourcepath'
        empty.mkdir()
        options=['-sourcepath',empty,'-implicit:none']
    result=run_limited([home/'bin/javac.exe',*jvm_args(profile.work,True),'-source','21','-target','21','-proc:none','-XDrawDiagnostics','-encoding','UTF-8','-classpath',profile.work,'-d',profile.work,*options,*files],profile.work,limits={'wall_seconds':12,'output_bytes':max(0,budget[0])},profile=profile)
    budget[0]-=result['_metrics']['raw_output_bytes']
    return result


def _class_fingerprints(work):
    return {file.relative_to(work):hashlib.sha256(file.read_bytes()).digest()
            for file in work.rglob('*.class') if file!=work/'Solution.class'}


def run_configuration(home,source,config,budget,Profile,run_limited,jvm_args):
    with Profile(home) as profile:
        functional=config['functional']
        filename='Solution.java' if functional else 'Main.java'
        student=profile.work/filename
        provided=None
        if functional:
            check_name='CourseInterface_'+uuid.uuid4().hex
            stub,check=interface_sources(config['interfaceSpec'],check_name)
            student.write_bytes(stub.encode('utf-8'))
            driver=profile.work/'JudgeMain.java'
            driver.write_bytes(config['harness'].encode('utf-8'))
            preparation_files=[student,driver]
            if config['prelude'].strip():
                # Public provided types are compiled from the exact same file
                # twice. Private driver/verifier sources are never recompiled
                # with the student's source. JDK21's Windows directory binary
                # lookup otherwise silently rejects inaccessible real paths.
                provided=profile.work/'ProvidedTypes.java'
                provided.write_bytes(config['prelude'].encode('utf-8'))
                preparation_files.append(provided)
            verifier=profile.work/(check_name+'.java')
            verifier.write_bytes(check.encode('utf-8'))
            # Fixed trusted monitoring work has its own bounded output and
            # must not shrink the student's advertised 64KiB output domain.
            prepared=_compile(home,profile,[*preparation_files,verifier],[16384],run_limited,jvm_args)
            if prepared['status']!='exited' or prepared['exit_code']!=0:
                return _unavailable('题目测试配置尚未准备好，答卷已保留。')
            if any(not (profile.work/(name+'.class')).is_file() for name in ('Solution','JudgeMain',check_name)):
                return _unavailable('题目测试配置尚未完整。')
            trusted_classes=_class_fingerprints(profile.work)
            # Remove the stub rather than treating a residual class as success.
            (profile.work/'Solution.class').unlink()
        student.write_bytes(source.encode('utf-8'))
        compiled=_compile(home,profile,[student,*([provided] if provided else [])],budget,run_limited,jvm_args,student_only=functional)
        if compiled['status']=='time_limit':
            return {'status':'time_limit','message':'编译超出时间限制。','stdout':'','stderr':''}
        if compiled['status']=='output_limit':
            return {'status':'output_limit','message':'编译输出过多。','stdout':'','stderr':''}
        if compiled['exit_code']!=0:
            if compiled['exit_code']!=1:
                return _unavailable()
            return {'status':'compile_error','message':'编译未通过。','stdout':'','stderr':compiler_diagnostic(compiled['stderr'],functional)}
        main='JudgeMain' if functional else 'Main'
        if functional:
            # Inspect each original trusted artifact, including nested/support
            # classes. Missing/unreadable artifacts are a preparation failure.
            for relative,expected in trusted_classes.items():
                artifact=profile.work/relative
                if not artifact.is_file():
                    return _unavailable('题目运行文件不完整，答卷已保留。')
                if hashlib.sha256(artifact.read_bytes()).digest()!=expected:
                    return {'status':'compile_error','message':'题目接口不符合要求。','stdout':'','stderr':'请勿重新定义或覆盖题目提供的类。'}
            if not (profile.work/'Solution.class').is_file():
                return {'status':'compile_error','message':'题目接口不符合要求。','stdout':'','stderr':'请提供Solution类及题目要求的public static方法接口。'}
            checked=run_limited([home/'bin/java.exe',*jvm_args(profile.work),'-cp',profile.work,check_name],profile.work,limits={'wall_seconds':2,'output_bytes':4096},profile=profile)
            if checked['status']!='exited' or checked['exit_code']!=0 or checked['stdout'] not in ('OK','CE') or checked['stderr']:
                return _unavailable('题目接口检查暂不可用，答卷已保留。')
            if checked['stdout']=='CE':
                return {'status':'compile_error','message':'题目接口不符合要求。','stdout':'','stderr':'请核对题目接口的方法名称、参数类型、返回类型以及public static声明。'}
        ran=run_limited([home/'bin/java.exe',*jvm_args(profile.work),'-cp',profile.work,main],profile.work,stdin=config['stdin'].encode('utf-8'),limits={'wall_seconds':3,'output_bytes':max(0,budget[0])},profile=profile)
        budget[0]-=ran['_metrics']['raw_output_bytes']
        stderr=runtime_diagnostic(ran['stderr'],functional)
        if ran['status']=='time_limit':
            return {'status':'time_limit','message':'运行超出时间限制。','stdout':'' if functional else ran['stdout'],'stderr':stderr}
        if ran['status']=='output_limit':
            return {'status':'output_limit','message':'程序输出过多。','stdout':'' if functional else ran['stdout'],'stderr':stderr}
        if ran['exit_code']!=0:
            # Execution cannot authenticate blame from arbitrary user stderr.
            # Trusted driver runtime correctness is covered by its own matrix.
            memory=not functional and bool(re.search(r'OutOfMemoryError|Unable to allocate|insufficient memory|Native memory allocation',ran['stderr'],re.I))
            return {'status':'runtime_error','message':'程序超出可用内存。' if memory else '程序运行异常。','stdout':'' if functional else ran['stdout'],'stderr':stderr}
        # Successful private-driver output is only for the server-side evaluator.
        # Its stdout must never be forwarded directly by the /api/judge route.
        return {'status':'ran','message':'运行完成。','stdout':ran['stdout'],'stderr':stderr if ran['stderr'] else ''}


def process_request(request):
    try:
        source,configurations,multiple=validate_request(request)
    except RequestError as error:
        return {'status':'unavailable' if error.configuration else 'invalid','message':str(error)}
    try:
        if os.name!='nt':
            raise RuntimeError('Java受限运行环境需要Windows。')
        from java_appcontainer import Profile,run_limited,jvm_args
        home=configured_jdk()
        deadline=time.monotonic()+140
        health_check(home,Profile,run_limited,jvm_args)
        budget=[MAX_OUTPUT]
        wire_budget=[MAX_OUTPUT]
        results=[]
        for config in configurations:
            if deadline-time.monotonic()<30:
                result={'status':'unavailable','message':'运行服务本轮处理时间不足，请稍后重试。'}
            else:
                result=bounded_result(run_configuration(home,source,config,budget,Profile,run_limited,jvm_args),wire_budget)
            results.append(result)
            if result['status']!='ran':
                break
        return {'status':'variants','results':results} if multiple else results[0]
    except Exception:
        return {'status':'unavailable','message':'Java受限运行环境暂不可用，代码与答卷已保留。'}


def main():
    try:
        request=json.load(sys.stdin)
    except (ValueError,UnicodeError):
        answer={'status':'invalid','message':'运行请求格式不正确。'}
    else:
        answer=process_request(request)
    sys.stdout.write(json.dumps(answer,ensure_ascii=False))
    sys.stdout.write('\n')


if __name__=='__main__':
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    main()
