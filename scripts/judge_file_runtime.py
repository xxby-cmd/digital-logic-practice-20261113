"""Real WASI-p1 file execution for server-owned judge configurations.

The caller owns a fresh private work directory, compiles outside its guest
subdirectory, and enforces the existing four-second child-process timeout.
Only execute_file_wasm grants a guest directory. This module does not compile,
accept user policies, inherit networking/environment, or integrate API routes.

Budgets bound logical lengths and cumulative reservations, not NTFS sectors,
journal/MFT overhead, compiler output, or shared compiler caches.
"""
import importlib.metadata
import os, re, stat, struct, sys
from pathlib import Path
import wasmtime

NS='wasi_snapshot_preview1'
BADF,FAULT,FBIG,INVAL,MFILE,NFILE,NOSPC,NOTCAPABLE=8,21,22,28,33,41,51,76
U32=(1<<32)-1;U64=(1<<64)-1
WRAPPED=['path_open','fd_write','fd_pwrite','fd_read','fd_pread','fd_seek',
 'fd_filestat_set_size','fd_filestat_set_times','fd_allocate','fd_fdstat_set_flags','fd_close','fd_renumber',
 'path_filestat_get','path_filestat_set_times','path_unlink_file','path_rename','path_create_directory',
 'path_link','path_symlink','path_readlink','path_remove_directory','fd_readdir',
 'sock_accept','sock_recv','sock_send','sock_shutdown','proc_raise']
QUERIES=['fd_tell','fd_filestat_get']
DENIED={'path_create_directory','path_link','path_symlink','path_readlink','path_filestat_set_times',
 'path_remove_directory','fd_readdir','sock_accept','sock_recv','sock_send','sock_shutdown','proc_raise'}
ALLOWED_IMPORTS=set(WRAPPED+QUERIES+[
 'args_get','args_sizes_get','environ_get','environ_sizes_get',
 'fd_prestat_get','fd_prestat_dir_name','fd_fdstat_get','fd_fdstat_set_rights',
 'fd_advise','fd_datasync','fd_sync','clock_time_get','clock_res_get',
 'poll_oneoff','proc_exit','random_get','sched_yield'])
CAPTURE_HARD_LIMIT=65536
LIMITS={
 # (default, minimum, server-policy hard maximum)
 'max_file_bytes':(65536,0,1048576),
 'max_allocation_reservation_bytes':(262144,0,4194304),
 'max_write_reservation_bytes':(1048576,0,16777216),
 'max_create_reservations':(64,0,256),
 'max_open_files':(16,1,64),
 'max_guarded_calls':(32768,1,131072),
 'max_stream_bytes':(65536,1,65536),
 'max_capture_bytes':(65536,0,CAPTURE_HARD_LIMIT),
}

class PolicyError(Exception):
    def __init__(self,code,reason):self.code,self.reason=code,reason

class FileConfigurationError(RuntimeError):
    """Server policy or private-directory setup error, never student invalid."""

def valid_leaf(name):
    if not isinstance(name,str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,31}(?:\.[a-z0-9]{1,8})?',name):return False
    return name.split('.')[0].upper() not in {'CON','PRN','AUX','NUL',*[f'COM{i}' for i in range(1,10)],*[f'LPT{i}' for i in range(1,10)]}


def _names(value,label):
    if not isinstance(value,list) or len(value)>32 or any(not valid_leaf(n) for n in value) or len(set(value))!=len(value):
        raise FileConfigurationError('invalid file policy '+label)
    return list(value)


def validate_file_policy(policy):
    """Return a deep normalized copy; perform no filesystem operations.

    seeds maps declared leaf names to even-length hexadecimal strings. Only
    declared capture names are returned, defaulting to writable names. The
    create reservation budget includes initial seeded files plus attempted
    missing-file creation calls; growth/write/create reservations never refund
    on failed syscalls, truncation, unlink, or replacement rename.
    """
    if not isinstance(policy,dict) or set(policy)-{'names','writable','seeds','capture','limits'}:
        raise FileConfigurationError('invalid file policy fields')
    names=_names(policy.get('names'),'names')
    writable=_names(policy.get('writable',[]),'writable')
    capture=_names(policy.get('capture',writable),'capture')
    allowed=set(names)
    if not set(writable)<=allowed or not set(capture)<=allowed:
        raise FileConfigurationError('file policy names must be declared')
    raw_limits=policy.get('limits',{})
    if not isinstance(raw_limits,dict) or set(raw_limits)-set(LIMITS):raise FileConfigurationError('invalid file policy limits')
    limits={}
    for name,(default,minimum,maximum) in LIMITS.items():
        value=raw_limits.get(name,default)
        if type(value) is not int or not minimum<=value<=maximum:raise FileConfigurationError('invalid file policy limit '+name)
        limits[name]=value
    raw_seeds=policy.get('seeds',{})
    if not isinstance(raw_seeds,dict) or any(not isinstance(name,str) or name not in allowed for name in raw_seeds):
        raise FileConfigurationError('invalid file policy seeds')
    seeds={};total=0
    for name,value in raw_seeds.items():
        # Validate encoded length before decoding or writing any seed.
        if not isinstance(value,str) or len(value)%2 or len(value)>2*limits['max_file_bytes'] or re.fullmatch(r'[0-9a-fA-F]*',value) is None:
            raise FileConfigurationError('invalid seed hex/size')
        total+=len(value)//2
        if total>limits['max_allocation_reservation_bytes']:raise FileConfigurationError('seed allocation reservation exceeded')
        seeds[name]=value.lower()
    if len(seeds)>limits['max_create_reservations']:raise FileConfigurationError('seed create reservation exceeded')
    # Readonly captured seeds cannot be truncated, renamed, or removed by the
    # guest. An already impossible capture budget is a server configuration
    # error, not an output-limit failure attributable to any student program.
    immutable_capture=sum(len(seeds[name])//2 for name in capture if name in seeds and name not in writable)
    if immutable_capture>limits['max_capture_bytes']:raise FileConfigurationError('immutable capture seeds exceed capture budget')
    return {'names':names,'writable':writable,'seeds':seeds,'capture':capture,'limits':limits}


def _directory(path):
    path=Path(path)
    try:attributes=path.lstat()
    except OSError as exc:raise FileConfigurationError('private directory is unavailable') from exc
    if not stat.S_ISDIR(attributes.st_mode) or stat.S_ISLNK(attributes.st_mode) or getattr(attributes,'st_file_attributes',0)&1024:
        raise FileConfigurationError('file run requires a private regular directory')
    return path.resolve()


def _regular(path):
    s=path.lstat()
    if not stat.S_ISREG(s.st_mode) or stat.S_ISLNK(s.st_mode) or s.st_nlink!=1 or getattr(s,'st_file_attributes',0)&1024:
        raise FileConfigurationError('nonregular/reparse/hardlinked seed or target')
    return s


def prepare_file_run(private_work,policy):
    """Validate everything, then create a new guest directory and seed files.

    private_work must be an existing caller-owned temporary directory. Refuse
    an existing guest child rather than reusing another variant's files.
    """
    normalized=validate_file_policy(policy)
    work=_directory(private_work)
    guest=work/'guest'
    try:
        guest.mkdir(mode=0o700,exist_ok=False)
        for name,encoded in normalized['seeds'].items():
            with (guest/name).open('xb') as target:target.write(bytes.fromhex(encoded))
    except OSError as exc:raise FileConfigurationError('cannot prepare a fresh file run') from exc
    return guest,normalized


def _check_guest(guest,policy):
    """Reject a substituted or reused guest before granting native preopen."""
    folder=_directory(guest)
    children=list(folder.iterdir())
    if {p.name for p in children}!=set(policy['seeds']):raise FileConfigurationError('guest does not match fresh seeds')
    for path in children:
        encoded=policy['seeds'][path.name];size=len(encoded)//2;s=_regular(path)
        if s.st_size!=size:raise FileConfigurationError('guest seed size changed')
        with path.open('rb') as source:data=source.read(size+1)
        if data.hex()!=encoded:raise FileConfigurationError('guest seed bytes changed')
    return folder


def _capture_files(folder,policy):
    """Inspect named outputs before allocation; bounded reads, never read_bytes."""
    remaining=policy['limits']['max_capture_bytes'];selected=[]
    for name in policy['capture']:
        path=folder/name
        try:s=_regular(path)
        except FileNotFoundError:continue
        if s.st_size>policy['limits']['max_file_bytes']:raise RuntimeError('checked file length exceeded')
        if s.st_size>remaining:raise OverflowError('file capture quota')
        remaining-=s.st_size;selected.append((name,path,s.st_size))
    files={}
    for name,path,size in selected:
        with path.open('rb') as source:data=source.read(size+1)
        if len(data)!=size:raise RuntimeError('file changed during result capture')
        files[name]={'size':size,'hex':data.hex()}
    return files

class Guard:
    def __init__(self,engine,store,linker,folder,contract):
        self.engine,self.store,self.linker=engine,store,linker
        self.folder=Path(folder).resolve();self.contract=contract
        self.allowed=set(contract['names']);self.writable=set(contract['writable'])
        if not self.writable<=self.allowed or not all(valid_leaf(n) for n in self.allowed):raise FileConfigurationError('invalid contract filenames')
        limits=contract['limits']
        self.max_file=limits['max_file_bytes'];self.max_total=limits['max_allocation_reservation_bytes']
        self.max_written=limits['max_write_reservation_bytes'];self.max_created=limits['max_create_reservations']
        self.max_handles=limits['max_open_files'];self.max_calls=limits['max_guarded_calls']
        self.max_output=limits['max_stream_bytes'];self.stream_written={'stdout':0,'stderr':0}
        # Small normal native-WASI tests establish append pwrite-to-EOF on this
        # exact backend. execute_file_wasm rejects unverified backends rather
        # than converting an environment semantic difference to student error.
        self.entries={0:{'kind':'stdin'},1:{'kind':'stdout'},2:{'kind':'stderr'},3:{'kind':'directory'}}
        self.calls=[];self.denials=[];self.call_count=0;self.written=0
        initial=[]
        for p in self.folder.iterdir():
            if p.name not in self.allowed:raise FileConfigurationError('unlisted seed')
            s=self.regular(p);initial.append(s.st_size)
            if s.st_size>self.max_file:raise FileConfigurationError('oversized seed')
        self.created=len(initial);self.allocated=sum(initial)
        if self.created>self.max_created or self.allocated>self.max_total:raise FileConfigurationError('initial quota')
        self.original={name:linker.get(store,NS,name) for name in WRAPPED+QUERIES}
        imports=[];exports=[]
        for i,(name,func) in enumerate(self.original.items()):
            ty=func.type(store);params=' '.join(map(str,ty.params));results=' '.join(map(str,ty.results))
            imports.append(f'(import "private" "{name}" (func $f{i} (param {params}) (result {results})))')
            args=' '.join(f'local.get {n}' for n in range(len(ty.params)))
            exports.append(f'(func (export "{name}") (param {params}) (result {results}) {args} call $f{i})')
        # No private imports are ever registered in the guest linker.
        self.bridge_module=wasmtime.Module(engine,'(module (import "private" "memory" (memory 0)) '+''.join(imports)+' (export "memory" (memory 0)) '+''.join(exports)+')')
        self.bridge=None;self.bridge_funcs=None
        linker.allow_shadowing=True
        for name in WRAPPED:
            def callback(caller,*args,_name=name):return self.invoke(_name,caller,args)
            linker.define(store,NS,name,wasmtime.Func(store,self.original[name].type(store),callback,access_caller=True))

    def regular(self,p):
        return _regular(p)

    def exists(self,p):
        try:p.lstat();return True
        except FileNotFoundError:return False

    def memory(self,caller):
        memory=caller.get('memory')
        if not isinstance(memory,wasmtime.Memory):raise PolicyError(FAULT,'missing memory')
        return memory

    def block(self,caller,pointer,length):
        p,n=pointer&U32,length&U32;m=self.memory(caller)
        # Python Memory.read slices/clamps and accepts negative indices: never
        # use it for unvalidated guest pointers.
        if p>m.data_len(caller) or n>m.data_len(caller)-p:raise PolicyError(FAULT,'memory range')
        return p,n

    def bytes(self,caller,pointer,length):
        p,n=self.block(caller,pointer,length);return bytes(self.memory(caller).read(caller,p,p+n))

    def number(self,caller,pointer,width):
        return int.from_bytes(self.bytes(caller,pointer,width),'little')

    def delegate(self,name,caller,*args):
        if self.bridge is None:
            self.bridge=wasmtime.Instance(self.store,self.bridge_module,[self.memory(caller),*self.original.values()])
            self.bridge_funcs=self.bridge.exports(self.store)
        return self.bridge_funcs[name](caller,*args)

    def query(self,name,caller,fd,width,offset=0):
        # Temporarily save/restore scratch bytes in the *same* memory. Guest is
        # single-threaded. No fake file contents or FILE state are fabricated.
        m=self.memory(caller);p=m.data_len(caller)-64
        if p<0:raise PolicyError(FAULT,'query scratch')
        saved=bytes(m.read(caller,p,p+64))
        try:
            err=self.delegate(name,caller,fd,p)
            if err:raise PolicyError(err,'native '+name)
            return self.number(caller,p+offset,width)
        finally:m.write(caller,saved,p)

    def size(self,caller,fd):return self.query('fd_filestat_get',caller,fd,8,32)
    def position(self,caller,fd):return self.query('fd_tell',caller,fd,8)

    def path(self,caller,fd,pointer,length):
        if self.entries.get(fd,{}).get('kind')!='directory':raise PolicyError(NOTCAPABLE,'not preopen directory')
        if (length&U32)>64:raise PolicyError(NOTCAPABLE,'path length')
        try:name=self.bytes(caller,pointer,length).decode('ascii')
        except UnicodeError:raise PolicyError(NOTCAPABLE,'nonascii path')
        if not valid_leaf(name) or name not in self.allowed:raise PolicyError(NOTCAPABLE,'unlisted/nonleaf path')
        p=self.folder/name
        if self.exists(p):
            try:self.regular(p)
            except FileConfigurationError:raise PolicyError(NOTCAPABLE,'nonregular target')
        return name

    def file(self,fd,writing=False):
        entry=self.entries.get(fd)
        if not entry or entry.get('kind')!='file':raise PolicyError(BADF,'not a tracked regular file')
        if writing and not entry['writable']:raise PolicyError(NOTCAPABLE,'readonly contract file')
        return entry

    def iovecs(self,caller,pointer,count,result_pointer):
        count&=U32
        if count>1024:raise PolicyError(INVAL,'iov count')
        self.block(caller,result_pointer,4);raw=self.bytes(caller,pointer,count*8);total=0
        for i in range(count):
            p,n=struct.unpack_from('<II',raw,i*8);self.block(caller,p,n);total+=n
        return total

    def reserve(self,old,new,cost):
        growth=max(0,new-old)
        if new>self.max_file:raise PolicyError(FBIG,'single file quota')
        if self.allocated+growth>self.max_total:raise PolicyError(NOSPC,'cumulative allocation quota')
        if self.written+cost>self.max_written:raise PolicyError(NOSPC,'cumulative write quota')
        # Conservative reservations are not refunded by failed calls, truncate,
        # unlink or rename. This bounds disk even for unlinked-but-open files.
        self.allocated+=growth;self.written+=cost

    def invoke(self,name,caller,args):
        self.call_count+=1
        if self.call_count>self.max_calls:raise wasmtime.Trap('file syscall quota')
        event={'op':name,'args':list(args)}
        if len(self.calls)<160:self.calls.append(event)
        try:
            if name in DENIED:raise PolicyError(NOTCAPABLE,'disabled capability')
            result=self.perform(name,caller,args);event['errno']=result;return result
        except PolicyError as e:
            event.update(errno=e.code,denial=e.reason)
            if len(self.denials)<80:self.denials.append({'op':name,'errno':e.code,'reason':e.reason})
            return e.code

    def perform(self,name,caller,a):
        if name=='path_open':
            fd,flags,p,n,oflags,rights,inherit,fdflags,out=a;self.block(caller,out,4)
            leaf=self.path(caller,fd,p,n);target=self.folder/leaf
            if oflags&2:raise PolicyError(NOTCAPABLE,'directory open')
            if oflags&~13 or fdflags&~31:raise PolicyError(INVAL,'unknown open flags')
            write=bool((rights&U64)&(1<<6) or oflags&9)
            if write and leaf not in self.writable:raise PolicyError(NOTCAPABLE,'readonly open')
            if sum(e.get('kind')=='file' for e in self.entries.values())>=self.max_handles:raise PolicyError(MFILE,'open handles quota')
            if oflags&1 and not self.exists(target):
                if self.created>=self.max_created:raise PolicyError(NFILE,'created files quota')
                self.created+=1
            err=self.delegate(name,caller,*a)
            if not err:
                opened=self.number(caller,out,4)
                self.entries[opened]={'kind':'file','name':leaf,'writable':leaf in self.writable,'append':bool(fdflags&1)}
                if self.size(caller,opened)>self.max_file:raise wasmtime.Trap('native file exceeded checked quota')
            return err
        if name in ('fd_write','fd_pwrite'):
            fd,p,n,*tail=a;total=self.iovecs(caller,p,n,tail[-1]);entry=self.entries.get(fd,{})
            if entry.get('kind')!='file':
                kind=entry.get('kind')
                if kind in self.stream_written:
                    if self.stream_written[kind]+total>self.max_output:raise PolicyError(FBIG,'standard stream quota')
                    self.stream_written[kind]+=total
                elif total>64*1024*1024:raise PolicyError(FBIG,'untracked write request')
                return self.delegate(name,caller,*a)
            self.file(fd,True);old=self.size(caller,fd)
            # Keep the public logical-position bound on explicit offsets too;
            # APPEND does not turn a disallowed huge offset into a permitted
            # request, even though the supported backend writes at EOF.
            if name=='fd_pwrite' and (tail[0]&U64)>self.max_file:raise PolicyError(FBIG,'pwrite position quota')
            if entry['append']:
                # O_APPEND fd_write starts at actual EOF, even if a successful
                # earlier seek placed the logical position beyond EOF.
                # Native APPEND pwrite also uses EOF on the supported backend;
                # unlike fd_write it does not move the current file offset.
                start=old
            else:start=(tail[0]&U64) if name=='fd_pwrite' else self.position(caller,fd)
            if start>self.max_file:raise PolicyError(FBIG,'write position quota')
            if total:
                self.reserve(old,max(old,start+total),total+max(0,start-old))
            err=self.delegate(name,caller,*a)
            if not err and self.size(caller,fd)>self.max_file:raise wasmtime.Trap('native write exceeded checked quota')
            return err
        if name in ('fd_read','fd_pread'):
            if self.iovecs(caller,a[1],a[2],a[-1])>64*1024*1024:raise PolicyError(INVAL,'read request size')
            return self.delegate(name,caller,*a)
        if name=='fd_seek':
            fd,offset,whence,out=a;self.block(caller,out,8)
            if whence not in (0,1,2):raise PolicyError(INVAL,'whence')
            if self.entries.get(fd,{}).get('kind')=='file':
                base=0 if whence==0 else self.position(caller,fd) if whence==1 else self.size(caller,fd)
                target=base+offset
                if target<0:raise PolicyError(INVAL,'negative seek')
                if target>self.max_file:raise PolicyError(FBIG,'logical seek quota')
            err=self.delegate(name,caller,*a)
            if not err and self.entries.get(fd,{}).get('kind')=='file' and self.number(caller,out,8)>self.max_file:raise wasmtime.Trap('native seek exceeded checked quota')
            return err
        if name in ('fd_filestat_set_size','fd_allocate'):
            self.file(a[0],True);old=self.size(caller,a[0])
            if name=='fd_filestat_set_size':new=a[1]&U64;cost=max(0,new-old)
            else:
                offset,length=a[1]&U64,a[2]&U64;new=max(old,offset+length);cost=max(length,new-old)
            self.reserve(old,new,cost);return self.delegate(name,caller,*a)
        if name=='fd_filestat_set_times':
            self.file(a[0],True);return self.delegate(name,caller,*a)
        if name=='fd_fdstat_set_flags':
            fd,flags=a
            if flags&~31:raise PolicyError(INVAL,'fd flags')
            err=self.delegate(name,caller,*a)
            if not err and self.entries.get(fd,{}).get('kind')=='file':self.entries[fd]['append']=bool(flags&1)
            return err
        if name=='fd_close':
            err=self.delegate(name,caller,*a)
            if not err:self.entries.pop(a[0],None)
            return err
        if name=='fd_renumber':
            old,new=a
            if old==3 or new==3 or not 0<=new<32:raise PolicyError(NOTCAPABLE,'directory/large fd renumber')
            err=self.delegate(name,caller,*a)
            if not err and old!=new:
                entry=self.entries.pop(old,None);self.entries.pop(new,None)
                if entry:self.entries[new]=entry
            return err
        if name=='path_filestat_get':
            self.path(caller,a[0],a[2],a[3]);self.block(caller,a[4],64);return self.delegate(name,caller,*a)
        if name=='path_unlink_file':
            leaf=self.path(caller,*a)
            if leaf not in self.writable:raise PolicyError(NOTCAPABLE,'readonly unlink')
            err=self.delegate(name,caller,*a)
            if not err:
                for e in self.entries.values():
                    if e.get('kind')=='file' and e.get('name')==leaf:e['name']=None
            return err
        if name=='path_rename':
            old=self.path(caller,a[0],a[1],a[2]);new=self.path(caller,a[3],a[4],a[5])
            if old not in self.writable or new not in self.writable:raise PolicyError(NOTCAPABLE,'readonly rename')
            err=self.delegate(name,caller,*a)
            if not err and old!=new:
                for e in self.entries.values():
                    if e.get('kind')=='file':
                        if e.get('name')==new:e['name']=None
                        elif e.get('name')==old:e['name']=new
            return err
        raise AssertionError('unguarded operation '+name)

def execute_file_wasm(wasm_path,stdin_path,guest_path,policy):
    """Execute a compiled module using an already prepared private guest.

    Return standard worker status/stdout/stderr plus only declared, bounded
    files{name:{size,hex}}. Missing captured files are absent keys. This call
    must run in the worker's existing four-second-limited child process.
    Server setup failures return unavailable; policy validation/preparation
    helpers raise FileConfigurationError (a RuntimeError), never ValueError.
    """
    empty={'stdout':'','stderr':'','files':{}}
    if sys.platform!='win32' or importlib.metadata.version('wasmtime')!='50.0.1':
        return {**empty,'status':'unavailable','message':'当前文件运行后端尚未核验。'}
    store=None;guard=None;output=bytearray();errors=bytearray();overflow=[False]
    status='ran';message='自测运行完成。'
    try:
        normalized=validate_file_policy(policy)
        folder=_check_guest(guest_path,normalized)
        wasm=Path(wasm_path).resolve();stdin=Path(stdin_path).resolve()
        if wasm.is_relative_to(folder) or stdin.is_relative_to(folder):
            raise FileConfigurationError('private runtime inputs must be outside guest')
        _regular(wasm);_regular(stdin)
        capture_limit=normalized['limits']['max_stream_bytes']
        def capture(target):
            def write(data):
                if len(target)+len(data)>capture_limit:overflow[0]=True
                target.extend(data[:max(0,capture_limit-len(target))]);return len(data)
            return write
        config=wasmtime.Config();config.consume_fuel=True;config.wasm_threads=False
        engine=wasmtime.Engine(config);store=wasmtime.Store(engine)
        # The second instance is the private native-WASI delegate bridge. Both
        # instances share the single original guest Memory.
        store.set_fuel(20_000_000);store.set_limits(memory_size=64*1024*1024,instances=2,memories=1,tables=2)
        wasi=wasmtime.WasiConfig();wasi.argv=['solution'];wasi.env=[]
        wasi.stdin_file=str(stdin);wasi.stdout_custom=capture(output);wasi.stderr_custom=capture(errors)
        wasi.preopen_dir(str(folder),'/',True);store.set_wasi(wasi)
        linker=wasmtime.Linker(engine);linker.define_wasi()
        guard=Guard(engine,store,linker,folder,normalized)
        module=wasmtime.Module.from_file(engine,str(wasm))
        if any(imp.module!=NS or imp.name not in ALLOWED_IMPORTS or not isinstance(imp.type,wasmtime.FuncType) for imp in module.imports):
            status='runtime_error';message='程序使用了当前文件题不支持的运行接口。'
        else:
            try:
                instance=linker.instantiate(store,module)
                exports=instance.exports(store)
                if not isinstance(exports.get('memory'),wasmtime.Memory) or not isinstance(exports.get('_start'),wasmtime.Func):
                    status='runtime_error';message='程序缺少有效运行入口。'
                else:exports['_start'](store)
            except wasmtime.ExitTrap as exc:
                if exc.code:status='runtime_error';message=f'程序以状态 {exc.code} 结束。'
            except wasmtime.Trap as exc:
                limited='fuel' in str(exc).lower() or 'file syscall quota' in str(exc).lower()
                status='time_limit' if limited else 'runtime_error'
                message='运行超出计算量限制。' if limited else '程序运行异常，请检查文件操作、数组或指针。'
            except wasmtime.WasmtimeError:
                status='runtime_error';message='程序无法按当前文件题接口运行。'
    except (FileConfigurationError,OSError,RuntimeError,wasmtime.WasmtimeError):
        return {**empty,'status':'unavailable','message':'文件运行环境暂不可用，请稍后重试。'}
    finally:
        if store is not None:store.close()
    if overflow[0] or any(d['reason']=='standard stream quota' for d in guard.denials):
        status='output_limit';message='程序输出过多。'
    try:files=_capture_files(folder,normalized)
    except OverflowError:
        files={};status='output_limit';message='输出文件超出本题可取回的内容上限。'
    except (FileConfigurationError,OSError,RuntimeError):
        return {**empty,'status':'unavailable','message':'文件结果暂不可用，请稍后重试。'}
    return {'status':status,'message':message,'stdout':output.decode(errors='replace'),
        'stderr':errors.decode(errors='replace'),'files':files,
        'file_usage':{'allocation_reserved_bytes':guard.allocated,'write_reserved_bytes':guard.written,
            'create_reservations':guard.created,'guarded_calls':guard.call_count}}
