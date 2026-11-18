"""Windows AppContainer/Job execution for the local Java runner.

No fallback launches outside the container. The caller owns Java source layout.
Windows may add conhost to a job; ActiveProcessLimit is not a unique-PID count.
"""
import ctypes as C
from ctypes import wintypes as W
import os
from pathlib import Path
import subprocess
import threading
import time
import uuid


class HostError(RuntimeError):
    pass


if os.name != 'nt':
    raise HostError('当前系统不支持Windows受限运行环境。')

K=C.WinDLL('kernel32',use_last_error=True)
U=C.WinDLL('userenv',use_last_error=True)
A=C.WinDLL('advapi32',use_last_error=True)
O=C.WinDLL('ole32',use_last_error=True)
SIZE=C.c_size_t
PTR=C.c_void_p
MEMORY_LIMIT=512*1024*1024


class SECURITY_ATTRIBUTES(C.Structure):
    _fields_=[('nLength',W.DWORD),('lpSecurityDescriptor',PTR),('bInheritHandle',W.BOOL)]


class SECURITY_CAPABILITIES(C.Structure):
    _fields_=[('AppContainerSid',PTR),('Capabilities',PTR),('CapabilityCount',W.DWORD),('Reserved',W.DWORD)]


class STARTUPINFOW(C.Structure):
    _fields_=[('cb',W.DWORD),('lpReserved',W.LPWSTR),('lpDesktop',W.LPWSTR),('lpTitle',W.LPWSTR),
              ('dwX',W.DWORD),('dwY',W.DWORD),('dwXSize',W.DWORD),('dwYSize',W.DWORD),
              ('dwXCountChars',W.DWORD),('dwYCountChars',W.DWORD),('dwFillAttribute',W.DWORD),
              ('dwFlags',W.DWORD),('wShowWindow',W.WORD),('cbReserved2',W.WORD),('lpReserved2',PTR),
              ('hStdInput',W.HANDLE),('hStdOutput',W.HANDLE),('hStdError',W.HANDLE)]


class STARTUPINFOEXW(C.Structure):
    _fields_=[('StartupInfo',STARTUPINFOW),('lpAttributeList',PTR)]


class PROCESS_INFORMATION(C.Structure):
    _fields_=[('hProcess',W.HANDLE),('hThread',W.HANDLE),('dwProcessId',W.DWORD),('dwThreadId',W.DWORD)]


class JOB_BASIC_LIMIT(C.Structure):
    _fields_=[('PerProcessUserTimeLimit',C.c_longlong),('PerJobUserTimeLimit',C.c_longlong),('LimitFlags',W.DWORD),
              ('MinimumWorkingSetSize',SIZE),('MaximumWorkingSetSize',SIZE),('ActiveProcessLimit',W.DWORD),
              ('Affinity',SIZE),('PriorityClass',W.DWORD),('SchedulingClass',W.DWORD)]


class IO_COUNTERS(C.Structure):
    _fields_=[(name,C.c_ulonglong) for name in ['ReadOperationCount','WriteOperationCount','OtherOperationCount','ReadTransferCount','WriteTransferCount','OtherTransferCount']]


class JOB_EXTENDED_LIMIT(C.Structure):
    _fields_=[('BasicLimitInformation',JOB_BASIC_LIMIT),('IoInfo',IO_COUNTERS),('ProcessMemoryLimit',SIZE),
              ('JobMemoryLimit',SIZE),('PeakProcessMemoryUsed',SIZE),('PeakJobMemoryUsed',SIZE)]


def _api(dll,name,restype,args):
    fn=getattr(dll,name)
    fn.restype=restype
    fn.argtypes=args
    return fn


_api(K,'CloseHandle',W.BOOL,[W.HANDLE])
_api(K,'CreatePipe',W.BOOL,[C.POINTER(W.HANDLE),C.POINTER(W.HANDLE),C.POINTER(SECURITY_ATTRIBUTES),W.DWORD])
_api(K,'SetHandleInformation',W.BOOL,[W.HANDLE,W.DWORD,W.DWORD])
_api(K,'ReadFile',W.BOOL,[W.HANDLE,PTR,W.DWORD,C.POINTER(W.DWORD),PTR])
_api(K,'WriteFile',W.BOOL,[W.HANDLE,PTR,W.DWORD,C.POINTER(W.DWORD),PTR])
_api(K,'InitializeProcThreadAttributeList',W.BOOL,[PTR,W.DWORD,W.DWORD,C.POINTER(SIZE)])
_api(K,'UpdateProcThreadAttribute',W.BOOL,[PTR,W.DWORD,SIZE,PTR,SIZE,PTR,PTR])
_api(K,'DeleteProcThreadAttributeList',None,[PTR])
_api(K,'CreateProcessW',W.BOOL,[W.LPCWSTR,W.LPWSTR,PTR,PTR,W.BOOL,W.DWORD,PTR,W.LPCWSTR,C.POINTER(STARTUPINFOEXW),C.POINTER(PROCESS_INFORMATION)])
_api(K,'CreateJobObjectW',W.HANDLE,[PTR,W.LPCWSTR])
_api(K,'SetInformationJobObject',W.BOOL,[W.HANDLE,C.c_int,PTR,W.DWORD])
_api(K,'QueryInformationJobObject',W.BOOL,[W.HANDLE,C.c_int,PTR,W.DWORD,PTR])
_api(K,'AssignProcessToJobObject',W.BOOL,[W.HANDLE,W.HANDLE])
_api(K,'TerminateJobObject',W.BOOL,[W.HANDLE,W.UINT])
_api(K,'TerminateProcess',W.BOOL,[W.HANDLE,W.UINT])
_api(K,'ResumeThread',W.DWORD,[W.HANDLE])
_api(K,'WaitForSingleObject',W.DWORD,[W.HANDLE,W.DWORD])
_api(K,'GetExitCodeProcess',W.BOOL,[W.HANDLE,C.POINTER(W.DWORD)])
_api(K,'OpenThread',W.HANDLE,[W.DWORD,W.BOOL,W.DWORD])
_api(K,'CancelSynchronousIo',W.BOOL,[W.HANDLE])
_api(K,'LocalFree',PTR,[PTR])
_api(A,'FreeSid',PTR,[PTR])
_api(A,'ConvertSidToStringSidW',W.BOOL,[PTR,C.POINTER(W.LPWSTR)])
_api(A,'OpenProcessToken',W.BOOL,[W.HANDLE,W.DWORD,C.POINTER(W.HANDLE)])
_api(A,'GetTokenInformation',W.BOOL,[W.HANDLE,C.c_int,PTR,W.DWORD,C.POINTER(W.DWORD)])
_api(U,'CreateAppContainerProfile',C.c_long,[W.LPCWSTR,W.LPCWSTR,W.LPCWSTR,PTR,W.DWORD,C.POINTER(PTR)])
_api(U,'GetAppContainerFolderPath',C.c_long,[W.LPCWSTR,C.POINTER(W.LPWSTR)])
_api(U,'DeleteAppContainerProfile',C.c_long,[W.LPCWSTR])
_api(O,'CoTaskMemFree',None,[PTR])


def _checked(ok,stage):
    if not ok:
        raise HostError(f'{stage}: Windows错误{C.get_last_error()}')
    return ok


def _hresult(result,stage):
    if result<0:
        raise HostError(f'{stage}: HRESULT 0x{result&0xffffffff:08x}')


def _close(handle):
    if handle:
        K.CloseHandle(handle)


def _sid_string(sid):
    result=W.LPWSTR()
    _checked(A.ConvertSidToStringSidW(sid,C.byref(result)),'转换隔离身份')
    try:
        return result.value
    finally:
        K.LocalFree(C.cast(result,PTR))


class Profile:
    def __init__(self,jdk_home):
        self.name='CoursePractice.Java.'+uuid.uuid4().hex
        self.jdk_bin=Path(jdk_home).resolve()/'bin'
        self.sid=PTR()
        self.created=False
        self.deleted=False

    def __enter__(self):
        _hresult(U.CreateAppContainerProfile(self.name,self.name,'Local course Java runner',None,0,C.byref(self.sid)),'创建隔离目录')
        self.created=True
        try:
            self.sid_text=_sid_string(self.sid)
            result=W.LPWSTR()
            _hresult(U.GetAppContainerFolderPath(self.sid_text,C.byref(result)),'读取隔离目录')
            try:
                self.folder=Path(result.value).resolve()
            finally:
                O.CoTaskMemFree(C.cast(result,PTR))
            self.work=self.folder/'LocalState'/'runner'
            self.work.mkdir(parents=True,exist_ok=False)
            return self
        except BaseException:
            self.__exit__(None,None,None)
            raise

    def __exit__(self,*args):
        result=0
        try:
            if self.created and not self.deleted:
                result=U.DeleteAppContainerProfile(self.name)
                self.deleted=result>=0
        finally:
            if self.sid:
                A.FreeSid(self.sid)
                self.sid=PTR()
        _hresult(result,'清理隔离目录')


def _verify_token(process,profile):
    token=W.HANDLE()
    _checked(A.OpenProcessToken(process,0x0008,C.byref(token)),'读取隔离身份')
    try:
        flag=W.DWORD()
        size=W.DWORD()
        _checked(A.GetTokenInformation(token,29,C.byref(flag),C.sizeof(flag),C.byref(size)),'验证AppContainer身份')
        if flag.value!=1:
            raise HostError('进程不属于AppContainer，拒绝运行。')
        needed=W.DWORD()
        A.GetTokenInformation(token,31,None,0,C.byref(needed))
        data=C.create_string_buffer(needed.value)
        _checked(A.GetTokenInformation(token,31,data,needed,C.byref(needed)),'验证隔离SID')
        if _sid_string(C.cast(data,C.POINTER(PTR))[0])!=profile.sid_text:
            raise HostError('进程隔离SID不符，拒绝运行。')
        A.GetTokenInformation(token,30,None,0,C.byref(needed))
        data=C.create_string_buffer(needed.value)
        _checked(A.GetTokenInformation(token,30,data,needed,C.byref(needed)),'验证隔离能力')
        if C.cast(data,C.POINTER(W.DWORD))[0]!=0:
            raise HostError('进程拥有未授权能力，拒绝运行。')
    finally:
        _close(token)


def jvm_args(work,compiler=False):
    options=['-Xms16m','-Xmx64m','-Xss512k','-XX:+UseSerialGC','-XX:ActiveProcessorCount=2',
             '-XX:MaxMetaspaceSize=128m','-XX:ReservedCodeCacheSize=64m','-XX:-UsePerfData','-Xshare:off',
             '-Djava.awt.headless=true','-Dfile.encoding=UTF-8','-Dstdout.encoding=UTF-8','-Dstderr.encoding=UTF-8',
             '-Djava.io.tmpdir='+str(work),'-Duser.home='+str(work)]
    if compiler:
        options+=['-Duser.language=en','-Duser.country=US']
        return ['-J'+value for value in options]
    return options


def run_limited(argv,cwd,stdin=b'',limits=None,profile=None):
    limits={'wall_seconds':3,'output_bytes':65536,**(limits or {})}
    if not isinstance(stdin,bytes) or len(stdin)>32768:
        raise HostError('输入超过受限运行器范围。')
    if not 0<limits['wall_seconds']<=12 or not 0<=limits['output_bytes']<=65536:
        raise HostError('受限运行器配置无效。')
    if not profile or not profile.created or profile.deleted:
        raise HostError('缺少有效隔离目录。')
    cwd=Path(cwd).resolve()
    if cwd!=profile.work or not cwd.is_relative_to(profile.folder):
        raise HostError('运行目录不属于本次隔离环境。')
    argv=[str(value) for value in argv]
    if Path(argv[0]).resolve() not in {(profile.jdk_bin/'java.exe').resolve(),(profile.jdk_bin/'javac.exe').resolve()}:
        raise HostError('不是指定的Java运行入口。')
    handles=[]
    process=PROCESS_INFORMATION()
    job=None
    attrs=None
    threads=[]
    writer_thread=None
    buffers={'stdout':bytearray(),'stderr':bytearray()}
    lock=threading.Lock()
    overflow=threading.Event()
    io_errors=[]
    failure=None
    answer=None
    try:
        sa=SECURITY_ATTRIBUTES(C.sizeof(SECURITY_ATTRIBUTES),None,True)
        stdin_r,stdin_w,stdout_r,stdout_w,stderr_r,stderr_w=[W.HANDLE() for _ in range(6)]
        for left,right,parent in [(stdin_r,stdin_w,stdin_w),(stdout_r,stdout_w,stdout_r),(stderr_r,stderr_w,stderr_r)]:
            _checked(K.CreatePipe(C.byref(left),C.byref(right),C.byref(sa),65536),'创建标准管道')
            handles.extend([left.value,right.value])
            _checked(K.SetHandleInformation(parent,1,0),'设置标准管道继承')
        job=_checked(K.CreateJobObjectW(None,None),'创建运行限额')
        info=JOB_EXTENDED_LIMIT()
        info.BasicLimitInformation.LimitFlags=0x8|0x100|0x200|0x400|0x2000
        info.BasicLimitInformation.ActiveProcessLimit=1
        info.ProcessMemoryLimit=info.JobMemoryLimit=MEMORY_LIMIT
        _checked(K.SetInformationJobObject(job,9,C.byref(info),C.sizeof(info)),'设置运行限额')
        size=SIZE()
        K.InitializeProcThreadAttributeList(None,2,0,C.byref(size))
        if not size.value:
            raise HostError('系统不支持所需隔离属性。')
        storage=C.create_string_buffer(size.value)
        attrs=C.cast(storage,PTR)
        _checked(K.InitializeProcThreadAttributeList(attrs,2,0,C.byref(size)),'初始化隔离属性')
        caps=SECURITY_CAPABILITIES(profile.sid,None,0,0)
        inherited=(W.HANDLE*3)(stdin_r.value,stdout_w.value,stderr_w.value)
        _checked(K.UpdateProcThreadAttribute(attrs,0,0x20009,C.byref(caps),C.sizeof(caps),None,None),'设置AppContainer能力')
        _checked(K.UpdateProcThreadAttribute(attrs,0,0x20002,inherited,C.sizeof(inherited),None,None),'限制继承句柄')
        startup=STARTUPINFOEXW()
        startup.StartupInfo.cb=C.sizeof(startup)
        startup.StartupInfo.dwFlags=0x100|0x1
        startup.StartupInfo.wShowWindow=0
        startup.StartupInfo.hStdInput=stdin_r
        startup.StartupInfo.hStdOutput=stdout_w
        startup.StartupInfo.hStdError=stderr_w
        startup.lpAttributeList=attrs
        system_root=os.environ.get('SystemRoot','C:\\Windows')
        env={'SystemRoot':system_root,'WINDIR':system_root,'JAVA_HOME':str(profile.jdk_bin.parent),
             'TEMP':str(cwd),'TMP':str(cwd),'USERPROFILE':str(cwd),'LOCALAPPDATA':str(cwd),'APPDATA':str(cwd),
             'PATH':str(profile.jdk_bin)+';'+str(Path(system_root)/'System32')}
        environment=C.create_unicode_buffer('\0'.join(key+'='+value for key,value in sorted(env.items()))+'\0\0')
        command=C.create_unicode_buffer(subprocess.list2cmdline(argv))
        _checked(K.CreateProcessW(argv[0],command,None,None,True,0x80000|0x400|0x08000000|0x4,environment,str(cwd),C.byref(startup),C.byref(process)),'创建暂停进程')
        _checked(K.AssignProcessToJobObject(job,process.hProcess),'分配运行限额')
        _verify_token(process.hProcess,profile)
        for handle in [stdin_r.value,stdout_w.value,stderr_w.value]:
            _close(handle)
            handles.remove(handle)

        def reader(handle,label):
            data=C.create_string_buffer(4096)
            count=W.DWORD()
            while True:
                ok=K.ReadFile(handle,data,len(data),C.byref(count),None)
                if not ok:
                    error=C.get_last_error()
                    if error not in (109,232):
                        io_errors.append(('read',error))
                    break
                if not count.value:
                    break
                with lock:
                    room=max(0,limits['output_bytes']-sum(len(value) for value in buffers.values()))
                    buffers[label].extend(data.raw[:min(room,count.value)])
                    if count.value>room:
                        overflow.set()

        def writer():
            try:
                at=0
                while at<len(stdin):
                    block=stdin[at:at+4096]
                    data=C.create_string_buffer(block)
                    count=W.DWORD()
                    if not K.WriteFile(stdin_w,data,len(block),C.byref(count),None):
                        error=C.get_last_error()
                        if error not in (109,232,995):
                            io_errors.append(('write',error))
                        break
                    if not count.value:
                        break
                    at+=count.value
            finally:
                _close(stdin_w)

        for handle,label in [(stdout_r,'stdout'),(stderr_r,'stderr')]:
            thread=threading.Thread(target=reader,args=(handle,label),daemon=True)
            thread.start()
            threads.append(thread)
        writer_thread=threading.Thread(target=writer,daemon=True)
        writer_thread.start()
        threads.append(writer_thread)
        handles.remove(stdin_w.value)
        if K.ResumeThread(process.hThread)==0xffffffff:
            _checked(False,'恢复受限进程')
        started=time.monotonic()
        reason=None
        while True:
            waited=K.WaitForSingleObject(process.hProcess,20)
            if waited==0:
                break
            if waited!=258:
                _checked(False,'等待受限进程')
            if overflow.is_set():
                reason='output_limit'
                _checked(K.TerminateJobObject(job,0xe0010002),'终止超量输出')
                break
            if time.monotonic()-started>limits['wall_seconds']:
                reason='time_limit'
                _checked(K.TerminateJobObject(job,0xe0010001),'终止超时程序')
                break
        if K.WaitForSingleObject(process.hProcess,2000)!=0:
            raise HostError('受限进程未正常结束。')
        for thread in threads:
            thread.join(.5)
        if writer_thread.is_alive():
            thread_handle=K.OpenThread(0x0001,False,writer_thread.native_id)
            if thread_handle:
                K.CancelSynchronousIo(thread_handle)
                _close(thread_handle)
            writer_thread.join(.5)
        if any(thread.is_alive() for thread in threads) or io_errors:
            raise HostError('标准输入输出收集未完成。')
        code=W.DWORD()
        _checked(K.GetExitCodeProcess(process.hProcess,C.byref(code)),'读取程序状态')
        stats=JOB_EXTENDED_LIMIT()
        _checked(K.QueryInformationJobObject(job,9,C.byref(stats),C.sizeof(stats),None),'读取运行限额')
        if stats.ProcessMemoryLimit!=MEMORY_LIMIT or stats.JobMemoryLimit!=MEMORY_LIMIT or stats.BasicLimitInformation.ActiveProcessLimit!=1:
            raise HostError('实际运行限额不符。')
        answer={'status':reason or ('output_limit' if overflow.is_set() else 'exited'),'exit_code':code.value,
                'stdout':buffers['stdout'].decode('utf-8',errors='replace'),'stderr':buffers['stderr'].decode('utf-8',errors='replace'),
                '_metrics':{'raw_output_bytes':sum(len(value) for value in buffers.values()),'peak_process_memory':stats.PeakProcessMemoryUsed,'peak_job_memory':stats.PeakJobMemoryUsed}}
    except BaseException as error:
        failure=error
    finally:
        if process.hProcess and K.WaitForSingleObject(process.hProcess,0)==258:
            if job:
                K.TerminateJobObject(job,0xe0010003)
            K.TerminateProcess(process.hProcess,0xe0010003)
            K.WaitForSingleObject(process.hProcess,2000)
        _close(job)
        for thread in threads:
            thread.join(.5)
        _close(process.hThread)
        _close(process.hProcess)
        if attrs:
            K.DeleteProcThreadAttributeList(attrs)
        for handle in handles:
            _close(handle)
    if failure:
        if isinstance(failure,HostError):
            raise failure
        raise HostError('受限运行环境发生异常。') from failure
    return answer
