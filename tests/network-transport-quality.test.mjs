import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {getPracticeCourse} from '../practice-library.js';
import {practiceQuestionRevisions} from '../bank-revisions.js';
import {grade} from '../grading.js';

// Only repository-owned original questions belong in this suite. Its fixture
// is produced by the integrating reviewer after approval; it is never rebuilt
// from external drafts or from whatever the current library happens to return.
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'
 ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const compact=value=>String(value).replace(/\s/g,'');
function match(q,pattern){const found=q.stem.match(pattern);assert.ok(found,q.id+' statement/conditions changed: '+pattern);return found;}
function option(q,pattern){const hits=q.options.flatMap((value,index)=>pattern.test(compact(value))?[index]:[]);assert.equal(hits.length,1,q.id+' needs one independently classified option: '+pattern);return hits[0];}
const result=(answer,method,facts={},legacyAssumption)=>({answer,method,facts,...(legacyAssumption?{legacyAssumption}:{})});
const width=65535n;
function onesSum(words){let value=words.reduce((sum,word)=>sum+BigInt(word),0n);while(value>width)value=(value&width)+(value>>16n);return value;}
const hex=value=>value.toString(16).toUpperCase();
function firstGap(start,intervals){let next=start;for(const [low,high]of [...intervals].sort((a,b)=>a[0]-b[0])){if(low>next)break;if(high>=next)next=high+1;}return next;}
function receiveOverlap(expected,cached,seq,length){const received=new Set(cached),newBytes=[];for(let value=seq;value<seq+length;value++)if(value>=expected&&!received.has(value)){received.add(value);newBytes.push(value);}let next=expected;while(received.has(next))next++;return {newBytes,next};}

// For conceptual choices these are read-reviewed classifications with concrete
// counterexamples, not an automated natural-language proof. No public key is
// an input to the derived option. Whole-field fingerprints bind the reading.
function solveChoice(q){
 const n=Number(q.id.split('-').at(-1)),s=compact(q.stem);
 const classify=(pattern,method,facts={})=>result(option(q,pattern),method,facts);
 const meaning={
  1:[/端口.*(?:进程|套接字)/,'host delivery still needs transport demultiplexing'],
  3:[/^可靠.*字节流交付$/,'UDP itself does not provide reliable ordered byte streams'],
  5:[/字节.*位置/,'sequence positions count bytes, not segments or calls'],
  6:[/^下一个期待的字节序号$/,'cumulative ACK points to the next missing byte'],
  7:[/首个缺失字节/,'a later interval does not fill the first gap'],
  8:[/接收端(?:的)?(?:缓存|缓冲区)/,'receiver flow control protects receiver capacity'],
  9:[/^网络路径的拥塞状况$/,'congestion feedback concerns the shared path'],
  10:[/rwnd与cwnd及已在途数据|接收窗口、拥塞窗口和当前未确认在途量/,'new allowance uses the smaller bound minus outstanding data'],
  11:[/MSS.*TCP数据.*MTU.*网络层/,'MSS data and the network packet MTU have different encapsulation scopes'],
  12:[/被当成正确新数据交付|把该损坏段当作正确的新数据交给应用/,'a detected corrupt segment cannot be delivered as correct new data'],
  13:[/发生不必要重传|^不必要重传$/,'an ACK taking 120 ms can arrive normally after a premature 60 ms timeout'],
  14:[/兼顾变化和测量波动|减小单次测量波动的影响/,'weighted history smooths noise but still follows changes'],
  15:[/采样归属歧义|无法确定该ACK应配对/,'one ambiguous ACK can correspond to two different sending instants'],
  17:[/^同样占用一个序号$/,'FIN occupies a reliably acknowledged end-of-stream position'],
  18:[/支持半关闭，本端继续发送自己的数据|只结束对端的发送方向，本端仍可继续发送自己的数据/,'one received FIN does not finish the reverse sending direction'],
  19:[/被动方确认主动方收到|让服务器进一步确认客户端收到了/,'sending SYNACK does not establish that the client received it'],
  20:[/避免.*窗口重新开放.*丢失/,'a lost reopened-window update otherwise leaves two waiting endpoints'],
  21:[/最后ACK.*(?:旧报文|隔离)/,'TIME_WAIT permits finishing acknowledgement recovery and limits old-incarnation overlap'],
  22:[/保留数据报边界/,'datagram boundaries are distinct from arrival guarantees and truncation API details'],
  23:[/丢失、乱序.*(?:拥塞|共享路径负载)/,'time-sensitive UDP still has losses, reordering and shared-path obligations'],
  24:[/^两个方向可同时独立传送字节流$/,'full duplex has two independent directional streams'],
  25:[/接收窗口通告|接收端所通告的可用接收窗口/,'slower reads can accumulate unread bytes and reduce advertised space'],
  27:[/^加1MSS$|^每轮增加约1MSS$/,'classic ideal congestion avoidance adds about one MSS per RTT'],
  28:[/不能.*(?:误码|其他故障)/,'a checksum-discard loss need not have been caused by congestion'],
  29:[/报文乱序|报文到达顺序发生变化/,'reordering can leave a temporary gap and generate duplicate ACKs'],
  30:[/按序交付导致的队头阻塞现象|TCP按序字节交付中的队头阻塞/,'a gap blocks application delivery of buffered later bytes'],
  31:[/稍后.*更大.*累计/,'a later cumulative ACK can cover bytes whose earlier ACK was lost'],
  32:[/不能，传输(?:层接收)?确认不等(?:于|同)/,'a TCP ACK can precede reading, processing and database commit'],
  33:[/不能.*(?:原四元组连接|原连接)/,'transport progress state cannot substitute for connection endpoint identity'],
  35:[/^UDP首部(?:与|和)UDP数据$/,'UDP Length includes its own header and payload, excluding outer headers'],
  37:[/每个MSS(?:对应的字节数|代表的TCP数据字节数)/,'a count in MSS needs the byte size represented by one MSS'],
  38:[/SACK.*补充报告.*非连续/,'SACK adds received interval reports without changing cumulative ACK meaning'],
  39:[/暂时(?:没有可读数据|无数据).*流结束/,'an empty receive buffer is compatible with an open connection'],
 };
 if(n===2){const bytes=Number(match(q,/send写入(\d+)B/)[1]);assert.ok(bytes>1);const first=Math.floor(bytes/2),second=bytes-first;assert.equal(first+second,bytes);return classify(/不必等于|可能只返回部分/,'construct two reads of one write',{write:bytes,reads:[first,second]});}
 if(n===4){
  if(!s.startsWith('客户A以'))return classify(/^服务器端口$/,'one local listening port is insufficient to distinguish all connected peer tuples');
  const z=match(q,/客户A以([\d.]+):(\d+)、客户B以([\d.]+):(\d+)，同时连接同一服务器([\d.]+):(\d+)/),a=[z[1],Number(z[2]),z[5],Number(z[6])],b=[z[3],Number(z[4]),z[5],Number(z[6])];
  const different=a.flatMap((value,i)=>value!==b[i]?[i]:[]);assert.deepEqual(different,[0]);return classify(/源IP地址不同/,'compare the four endpoint fields and use their unequal source IP',{a,b,different});
 }
 if(n===16){match(q,/SYN消耗的序号数量/);const data=0,syn=1,fin=0;return classify(new RegExp('^'+(data+syn+fin)+'$'),'one SYN consumes one sequence position',{data,syn,fin});}
 if(n===26){match(q,/理想慢启动.*每轮完整窗口得到确认/);const cases=[1,2,4,8].map(initial=>{let win=initial;for(let ack=0;ack<initial;ack++)win++;assert.equal(win,2*initial);return [initial,win];});return classify(/^每RTT倍增$/,'apply the stated ideal per-round slow-start model',{cases});}
 if(n===34){match(q,/UDP首部长度/);const lengths=[16,16,16,16],bytes=lengths.reduce((a,b)=>a+b,0)/8;return classify(new RegExp('^'+bytes+'B$'),'sum the four 16-bit header fields',{lengths,bytes});}
 if(n===36){
  if(s.startsWith('课程中的rdt1.0')){match(q,/没有设置差错检测与重传机制/);return classify(/^下层既不丢包，也不发生比特差错$/,'without detection/recovery the course model requires a perfect lower channel',{lossWithoutRecovery:'never delivered',corruptionWithoutDetection:'wrong data'});}
  match(q,/TCP存在端口号的主要用途/);return classify(/标识传输端点中的进程\/服务关系/,'ports identify process/service endpoint context');
 }
 if(n===40){
  if(s.startsWith('在rdt2.0中')){match(q,/ACK表示数据正确、NAK表示数据损坏/);match(q,/反馈报文本身也可能损坏/);const runs=[{delivered:true,feedback:'ACK',seen:'damaged'},{delivered:false,feedback:'NAK',seen:'damaged'}];assert.equal(runs[0].seen,runs[1].seen);assert.notEqual(runs[0].delivered,runs[1].delivered);return classify(/原数据已正确交付但ACK损坏，与数据损坏而NAK也损坏/,'construct two indistinguishable observations with opposite delivery states',{runs});}
  match(q,/可靠性的本意/);return classify(/在协议及环境条件下恢复差错\/丢失/,'recovery and duplicate/order control are conditional protocol services, not a noiseless channel or infallible application');
 }
 assert.ok(meaning[n],q.id+' choice lacks an independent classification');
 const [pattern,method]=meaning[n];
 if(n===7){match(q,/乱序后续字节.*前面仍有缺口/);assert.equal(firstGap(2000,[[2200,2299]]),2000);}
 if(n===10){for(const r of [0,4,9])for(const c of [0,6,12])for(const used of [0,2,7]){const allowed=Math.max(0,Math.min(r,c)-used);assert.ok(allowed>=0);if(used<Math.min(r,c))assert.ok(used+allowed<=r&&used+allowed<=c);}}
 if(n===12)assert.match(q.stem,/不能|不正确/);
 if(n===15){match(q,/重传后的ACK可能对应原段或重传段/);assert.notEqual(100-0,100-60);}
 return classify(pattern,method);
}

function solveFill(q,originals){
 const n=Number(q.id.split('-').at(-1)),s=compact(q.stem),give=(values,method,facts={},legacy)=>result(values.map(String),method,facts,legacy);
 if(q.id==='P-N-02'){
  if(s.startsWith('链路速率')){const z=match(q,/链路速率为(\d+) Mb\/s，应用数据(\d+)字节，协议总开销(\d+)字节/),[rate,data,overhead]=z.slice(1).map(Number);return give([(data+overhead)*8/(rate*1e6)*1000],'serialize all data and overhead bits',{rate,data,overhead});}
  const words=[...q.stem.matchAll(/0x([0-9A-F]+)/g)].map(z=>BigInt('0x'+z[1]));assert.equal(words.length,2);match(q,/16位反码加法（最高位进位回卷至最低位），再逐位取反/);const ordinary=words.reduce((a,b)=>a+b),sum=onesSum(words);assert.notEqual(ordinary%width,0n);assert.equal(sum,ordinary%width);return give([hex(width^sum)],'end-around carry followed by bit complement',{words:words.map(hex),ordinary:hex(ordinary),folded:hex(sum)});
 }
 if(q.id==='3-01'){const first=Number(match(q,/首段序号为(\d+)/)[1]),lengths=match(q,/数据长度依次为(\d+) B、(\d+) B、(\d+) B/).slice(1).map(Number);match(q,/第二段丢失，第三段已缓存/);match(q,/均不含SYN或FIN/);const intervals=lengths.map((length,i)=>{const start=first+lengths.slice(0,i).reduce((a,b)=>a+b,0);return[start,start+length-1];});return give([firstGap(first,[intervals[0],intervals[2]]),firstGap(first,intervals)],'continuous prefix before and after filling the middle hole',{first,lengths,intervals});}
 if(n===41){const z=match(q,/SEQ=(\d+)，载荷(\d+)B，不含SYN\/FIN/),[seq,len]=z.slice(1).map(Number);return give([seq+len-1],'inclusive endpoint of the stated segment',{seq,len});}
 if(n===42){const revised=s.includes('此前的数据已按序收齐'),last=Number(match(q,revised?/按序收齐至字节(\d+)/:/已连续收到\d+至(\d+)字节/)[1]);return give([last+1],'one past the end of the continuous prefix',{last},revised?undefined:'old key assumes the stated received interval is the entire required prefix; default revision makes that premise explicit');}
 if(n===43){if(s.startsWith('无数据的SYN段')){const seq=Number(match(q,/SYN段SEQ=(\d+)/)[1]);return give([seq+1],'SYN occupies one sequence position',{seq});}const start=Number(match(q,/下一待发送字节序号为(\d+)/)[1]);match(q,/不带数据、SYN或FIN的纯ACK段/);return give([start],'a pure ACK consumes no sequence positions',{start,occupancy:{data:0,syn:0,fin:0}});}
 if(n===44){const seq=Number(match(q,/FIN.*?SEQ=(\d+)|SEQ=(\d+)、无数据的FIN/).slice(1).find(Boolean));const revised=s.includes('此前的TCP数据已连续收齐');if(revised){const expected=Number(match(q,/当前期待序号(\d+)/)[1]);assert.equal(seq,expected);match(q,/正常接纳/);}return give([seq+1],'sequence position immediately after an accepted zero-data FIN',{seq},revised?undefined:'old statement asks for acknowledgement of the FIN; full old fields are compatibility evidence, not a new proof that arbitrary arrival fills all earlier holes');}
 if(n===45){const [seq,len]=match(q,/SEQ=(\d+)、载荷(\d+)B且带FIN|SEQ=(\d+)、(\d+)B数据并带FIN/).slice(1).filter(Boolean).map(Number);const revised=s.includes('原先期待序号');if(revised){assert.equal(Number(match(q,/原先期待序号(\d+)/)[1]),seq);match(q,/完整按序接纳/);}return give([seq+len+1],'data interval followed by the FIN position',{seq,len,dataEnd:seq+len-1,fin:seq+len},revised?undefined:'old key assumes an unbroken prefix before the stated segment; the new default supplies it');}
 if(n===46){const total=Number(match(q,/UDP总长(\d+)B/)[1]);return give([total-8],'UDP Length includes its eight-byte header',{total,header:8});}
 if(n===47){const [mtu,ip,tcp]=match(q,/MTU(\d+)B，IP首部(\d+)B、TCP首部(\d+)B/).slice(1).map(Number);return give([mtu-ip-tcp],'subtract both explicit headers from network-packet capacity',{mtu,ip,tcp});}
 if(n===48){const [r,c,used]=match(q,/rwnd=(\d+)B、cwnd=(\d+)B、未确认数据(\d+)B/).slice(1).map(Number);match(q,/其他条件不限制/);return give([Math.max(0,Math.min(r,c)-used)],'intersect receive/congestion bounds and subtract existing flight',{r,c,used});}
 if(n===49){if(s.startsWith('cwnd=')){const [count,size]=match(q,/cwnd=(\d+)MSS，每MSS(\d+)B/).slice(1).map(Number);return give([count*size],'convert the stated count of MSS to bytes',{count,size});}const ack=Number(match(q,/确认号(\d+)的新ACK/)[1]);match(q,/此后又连续收到三个.*重复ACK/);match(q,/发送方仍有待确认数据/);const events=['new',...Array.from({length:3},()=> 'duplicate')];return give([events.length],'count the initial progressing ACK separately from three duplicates',{ack,events});}
 if(n===50){const [capacity,used]=match(q,/接收缓存(\d+)B，尚未被应用读走的数据占(\d+)B/).slice(1).map(Number);return give([capacity-used],'subtract unread occupancy from total receive space',{capacity,used});}
 if(n===51){const initial=Number(match(q,/初始cwnd=(\d+)MSS/)[1]),listed=match(q,/发送窗口依次为([\d、]+)/)[1].split('、').map(Number);const revised=s.includes('前三轮始终处于慢启动');if(revised)match(q,/每轮确认完整窗口后按倍增模型更新/);let win=initial;const rounds=[];for(let i=0;i<3;i++){rounds.push([win,win*2]);win*=2;}assert.deepEqual(rounds.map(r=>r[0]),listed);return give([win],'the third completed round updates its initial window once',{initial,rounds},revised?undefined:'old key uses the course ideal continuing doubling model; the new default explicitly preserves that phase');}
 if(n===52){const [initial,add,rounds]=match(q,/初始cwnd=(\d+)MSS，每完整RTT加(\d+)，(\d+)轮全部确认/).slice(1).map(Number);return give([initial+add*rounds],'apply the specified additive update once per completed round',{initial,add,rounds});}
 if(n===53){match(q,/按2\^32循环，序号2\^32−1之后/);const modulus=2n**32n;return give([(modulus-1n+1n)%modulus],'modular successor at the largest 32-bit sequence',{modulus:String(modulus)});}
 if(n===54){const [bytes,unit]=match(q,/首部长度(\d+)B，数据偏移字段按(\d+)B计/).slice(1).map(Number);assert.equal(bytes%unit,0);return give([bytes/unit],'count four-byte words in the actual header',{bytes,unit});}
 if(n===55){if(s.startsWith('TCP数据偏移字段')){const offset=Number(match(q,/字段为(\d+)/)[1]);return give([offset*4],'TCP data offset uses 32-bit words',{offset,bytesPerWord:4});}const values=[...q.stem.matchAll(/0x([0-9A-F]+)/g)].map(z=>BigInt('0x'+z[1]));assert.equal(values.length,5);const [a,b,checksum,c,d]=values;assert.equal(onesSum([a,b,checksum]),width);assert.notEqual(a,c);assert.equal(a+b,c+d);match(q,/检查是否全1/);return give([onesSum([c,d,checksum])===width?0:1],'two changed words cancel in the ones-complement sum',{oldDataSum:hex(a+b),newDataSum:hex(c+d),receiverSum:hex(onesSum([c,d,checksum]))});}
 if(n===56){if(s.startsWith('两个不含SYN/FIN')){const [seq,length]=match(q,/首段SEQ=(\d+)、长度(\d+)/).slice(1).map(Number);return give([seq+length],'the adjacent next segment starts after all current data bytes',{seq,length});}const [size,base]=match(q,/窗口大小为(\d+)，当前窗口基序号为(\d+)/).slice(1).map(Number),sent=match(q,/分组([\d、]+)已经发送/)[1].split('、').map(Number),ack=Number(match(q,/只收到对分组(\d+)的选择确认/)[1]),notSent=Number(match(q,/已经发送，(\d+)尚未发送/)[1]),unacked=match(q,/(\d+)、(\d+)仍未确认/).slice(1).map(Number);assert.ok(unacked.includes(base));assert.ok(!unacked.includes(ack));match(q,/序号不回绕/);const acked=new Set([ack]);let nextBase=base;while(acked.has(nextBase))nextBase++;const window=Array.from({length:size},(_,i)=>nextBase+i),newAllowed=window.filter(n=>!sent.includes(n));assert.ok(newAllowed.includes(notSent));return give([newAllowed.length],'an interior selective ACK does not advance an unacknowledged window base',{size,base,ack,sent,unacked,notSent,window,newAllowed});}
 if(n===57){
  if(s.startsWith('采用累计ACK')){const expected=Number(match(q,/期待(\d+)/)[1]),[seq,length]=match(q,/SEQ=(\d+)、长度(\d+)/).slice(1).map(Number);return give([firstGap(expected,[[seq,seq+length-1]])],'a future interval leaves the given first gap untouched',{expected,seq,length});}
  const last=Number(match(q,/按序收齐至字节(\d+)/)[1]),expected=Number(match(q,/当前期待(\d+)/)[1]),[seq,length]=match(q,/SEQ=(\d+)、载荷(\d+)B/).slice(1).map(Number);assert.equal(last+1,expected);match(q,/当前未缓存任何后续报文段/);match(q,/不含SYN或FIN/);match(q,/新字节均可接纳/);const state=receiveOverlap(expected,[],seq,length);return give([state.newBytes.length,state.next],'clip already received prefix bytes, then extend the continuous prefix',{last,expected,seq,length,newRange:[state.newBytes[0],state.newBytes.at(-1)]});
 }
 if(n===58){
  if(s.startsWith('延续前题')){assert.ok(originals,'legacy continuation requires its explicit old preceding question');const previous=originals.get('P3-network-3-57'),expected=Number(match(previous,/期待(\d+)/)[1]);const [low,high,cachedLow,cachedHigh]=match(q,/补齐(\d+)至(\d+)后且此前(\d+)至(\d+)已缓存/).slice(1).map(Number);return give([firstGap(expected,[[low,high],[cachedLow,cachedHigh]])],'restore the legacy continuation together with its stated previous question',{expected,low,high,cachedLow,cachedHigh},'old statement is not standalone; the old preceding-question binding is required');}
  let expected=Number(match(q,/当前期待分组(\d+)/)[1]);const arrivals=match(q,/依次收到([\d、]+)，均无差错/)[1].split('、').map(Number);match(q,/ACK\(k\)表示编号到k为止已按序收齐/);match(q,/不缓存失序分组/);match(q,/每次到达立即发送累计ACK/);const states=arrivals.map(received=>{const delivered=received===expected;if(delivered)expected++;return{received,delivered,ack:expected-1};});return give(states.map(x=>x.ack),'GBN discards later packets and acknowledges the last delivered packet',{states});
 }
 if(n===59){if(s.startsWith('一条连接双向传输')){match(q,/两个方向的数据序号空间/);return give([2],'full duplex gives each direction its own byte numbering',{directions:['A to B','B to A']});}match(q,/确认号字段只有在____标志位为1时才作为有效确认号解释/);return give(['ACK'],'ACK flag controls acknowledgement-field significance');}
 if(n===60){const [a,b,old,sample]=match(q,/Enew=([\d.]+)Eold\+([\d.]+)Sample，旧估计(\d+)ms、新样本(\d+)ms/).slice(1).map(Number);return give([a*old+b*sample],'weighted mean of the given old estimate and sample',{a,b,old,sample});}
 if(n===61){const [multiplier,e,d]=match(q,/RTO=E\+(\d+)D，E=(\d+)ms、偏差D=(\d+)ms/).slice(1).map(Number);return give([e+multiplier*d],'use the explicitly simplified RTO formula',{multiplier,e,d});}
 if(n===62){const initial=Number(match(q,/从(\d+)ms起/)[1]);match(q,/连续两次退避/);match(q,/每次超时翻倍且无上限/);return give([initial*2**2],'two successive interval doublings',{initial,intervals:[initial*2,initial*4]});}
 if(n===63){const [bytes,rttMs]=match(q,/窗口为(\d+)B、RTT(\d+)ms/).slice(1).map(Number);match(q,/持续满窗且无其他限制/);return give([bytes*8/(rttMs/1000)/1e6],'window data bits per feedback second, in decimal megabits',{bytes,rttMs});}
 if(n===64){if(s.startsWith('需要至少')){const [low,high]=match(q,/提供(\d+)至(\d+)的闭区间/).slice(1).map(Number);return give([high-low+1],'enumerate the inclusive local-port range',{low,high});}const local=Number(match(q,/绑定在[\d.]+:(\d+)/)[1]),peer=Number(match(q,/源端点为[\d.]+:(\d+)/)[1]);match(q,/用该套接字回复此客户/);return give([local,peer],'reply uses the bound local port as source and received peer port as destination',{incoming:[peer,local],reply:[local,peer]});}
 if(n===65){const [ip,tcp,payload]=match(q,/IP首部(\d+)B、TCP首部(\d+)B，发(\d+)B应用数据/).slice(1).map(Number);return give([ip+tcp+payload],'IP total includes both nested headers and application payload',{ip,tcp,payload});}
 throw Error('missing fill oracle '+q.id);
}

const observations=[];
function checkObjective(q,originals,phase){
 const solved=q.type==='single'?solveChoice(q):solveFill(q,originals),expected=solved.answer;
 assert.equal(grade(q,expected,2).correct,true,q.id+' independently derived key');
 if(q.type==='single'){
  for(let index=0;index<q.options.length;index++)if(index!==expected)assert.equal(grade(q,index,2).correct,false,q.id+' independently rejected choice '+index);
 }else for(let i=0;i<expected.length;i++){
  const actual=[...expected];
  actual[i]=q.id==='P-N-02'&&q.stem.startsWith('按Internet')?hex(BigInt('0x'+expected[i])+1n)
   :expected[i]==='ACK'?'SYN':String(Number(expected[i])+1);
  const marked=grade(q,actual,2);assert.equal(marked.correct,false,q.id+' wrong blank '+i);
  assert.equal(marked.correctBlanks,expected.length-1,q.id+' other blanks retain their independent correctness');
 }
 observations.push({phase,id:q.id,revision:q.revision??1,questionSha256:digest(q),...solved});
 return solved;
}
function checkFillFormats(q,expected){
 for(let i=0;i<expected.length;i++){
  let variants=[];
  if(q.id==='P-N-02'&&q.stem.startsWith('按Internet'))variants=[expected[i].toLowerCase(),'0x'+expected[i],'0X'+expected[i].toLowerCase()];
  else if(expected[i]==='ACK')variants=['ack','Ack'];
  else if(q.formats?.[i]==='number')variants=['+'+Number(expected[i]).toFixed(6),'00'+expected[i],expected[i].replace(/\d/g,c=>String.fromCharCode(c.charCodeAt(0)+0xfee0))];
  for(const variant of variants){const answer=[...expected];answer[i]=variant;assert.equal(grade(q,answer,2).correct,true,q.id+' legal numeric/hex/keyword spelling '+variant);}
 }
}

function checkBoundaryCases(current,originals){
 const q=n=>{const value=current.get(`P3-network-3-${n}`);assert.ok(value);return value;};
 const rejected=(question,answer,reason)=>assert.equal(grade(question,answer,2).correct,false,question.id+' '+reason);
 const clipping=solveFill(q(57),originals),{expected,seq,length}=clipping.facts;
 const baseline=receiveOverlap(expected,[],seq,length);assert.equal(baseline.newBytes.length,50);assert.equal(baseline.next,1250);
 const tailLength=50,tail=Array.from({length:tailLength},(_,i)=>baseline.next+i),withTail=receiveOverlap(expected,tail,seq,length);
 assert.equal(withTail.newBytes.length,baseline.newBytes.length);assert.equal(withTail.next,baseline.next+tailLength);
 assert.notEqual(withTail.next,baseline.next,'next expected alone does not rule out a separately buffered tail');
 const bufferedFin=baseline.next,afterFin=baseline.next===bufferedFin?baseline.next+1:baseline.next;
 assert.equal(afterFin,1251);assert.notEqual(afterFin,baseline.next,'a cached FIN is also a later segment, not new payload bytes');
 for(const bad of [[length,expected+length],[baseline.newBytes.length,expected+length],[length,baseline.next],[baseline.newBytes.length,withTail.next]])rejected(q(57),bad.map(String),'recounted old bytes or invented cached-tail state');
 for(const start of [expected-100,expected-10,expected,expected+10])for(const size of [10,100,150]){
  const received=receiveOverlap(expected,[],start,size),newCount=Math.max(0,start+size-Math.max(start,expected)),next=start<=expected&&start+size>expected?start+size:expected;
  assert.equal(received.newBytes.length,newCount);assert.equal(received.next,next);
 }

 const checksum=current.get('P-N-02'),words=[...checksum.stem.matchAll(/0x([0-9A-F]+)/g)].map(z=>BigInt('0x'+z[1]));assert.equal(words.length,2);
 const ordinary=words.reduce((a,b)=>a+b);assert.ok(ordinary>width);rejected(checksum,[hex(width^(ordinary&width))],'discarding the high carry differs from wrapping it');rejected(checksum,[hex(onesSum(words))],'forgetting the final complement');
 const selective=solveFill(q(56),originals),{size,sent,ack,newAllowed}=selective.facts,freeSlotError=size-sent.filter(n=>n!==ack).length;
 assert.notEqual(freeSlotError,newAllowed.length);rejected(q(56),[String(freeSlotError)],'an interior ACK cannot reopen a sequence number past the window edge');
 const gbn=solveFill(q(58),originals),firstExpected=Number(match(q(58),/当前期待分组(\d+)/)[1]);let receiveBase=firstExpected;const buffered=new Set(),wrongBufferedAcks=[];
 for(const state of gbn.facts.states){buffered.add(state.received);while(buffered.has(receiveBase))receiveBase++;wrongBufferedAcks.push(String(receiveBase-1));}
 assert.notDeepEqual(wrongBufferedAcks,gbn.answer);rejected(q(58),wrongBufferedAcks,'the stated GBN receiver discards, rather than saving the future packets');
 rejected(q(58),gbn.answer.map(v=>String(Number(v)+1)),'last-delivered packet ACK is not a TCP next-byte ACK');
 rejected(q(49),['3'],'three duplicates plus the first progressing ACK totals four reports');
 const slow=solveFill(q(51),originals);rejected(q(51),[String(slow.facts.rounds.at(-1)[0])],'round-start window is not the completed-round window');
 const pure=solveFill(q(43),originals);rejected(q(43),[String(pure.facts.start+1)],'pure ACK adds no SYN/FIN occupancy');
 const finData=solveFill(q(45),originals);rejected(q(45),[String(finData.facts.seq+finData.facts.len)],'FIN remains after all payload bytes');
 const values=[...q(55).stem.matchAll(/0x([0-9A-F]+)/g)].map(z=>BigInt('0x'+z[1]));assert.equal(values.length,5);assert.notEqual(onesSum([values[3],values[1],values[2]]),width,'a single changed word is a detected control, so the checksum oracle is not a constant no-error result');rejected(q(55),['1'],'the two actual word changes cancel');
 const reply=solveFill(q(64),originals);rejected(q(64),[...reply.answer].reverse(),'reply source is the bound server port');
 observations.push({phase:'default-boundaries',id:q(57).id,revision:q(57).revision,method:'overlap clipping with necessary empty-later-segment premise',facts:{baseline:{newBytes:baseline.newBytes.length,next:baseline.next},cachedTail:{newBytes:withTail.newBytes.length,next:withTail.next},cachedFin:{sequence:bufferedFin,ack:afterFin},enumeratedOverlapStates:12}});
}

// The fixture is supplied only by the integrating reviewer. Absence is a hard
// failure, as is an unregistered target; neither is an old-question fallback.
const fixture=JSON.parse(readFileSync(new URL('./fixtures/network-transport-quality-20261118.json',import.meta.url),'utf8'));
assert.equal(fixture.entries.length,103);assert.equal(fixture.items.length,71);
const entries=new Map(fixture.entries.map(entry=>[entry.id,entry]));
const changes=new Map(fixture.items.map(item=>[item.id,item]));
assert.equal(entries.size,103);assert.equal(changes.size,71);
const oldVersions=Object.fromEntries(fixture.entries.map(entry=>[entry.id,entry.baseRevision]));
const originals=new Map(getPracticeCourse('network',{questionRevisions:oldVersions}).questions.filter(q=>q.chapter===3).map(q=>[q.id,q]));
const current=new Map(getPracticeCourse('network').questions.filter(q=>q.chapter===3).map(q=>[q.id,q]));

function installed(id){
 const change=changes.get(id);assert.ok(change,id+' must be in the approved revision list');
 assert.ok(Object.hasOwn(practiceQuestionRevisions[id]??{},String(change.revision)),id+' target must actually be registered; a draft or old question is not a passing default check');
 const q=current.get(id);assert.ok(q,id+' must exist in the real default practice course');
 assert.equal(q.revision,change.revision,id+' registration must advance the actual default, not merely retain a candidate');
 return q;
}

test('运输层103道原创的明确旧版本保留完整字段，不补造原本缺少的revision或origin',()=>{
 assert.equal(originals.size,103);assert.equal(current.size,103);
 assert.deepEqual([...originals.keys()].sort(),[...entries.keys()].sort());
 assert.deepEqual([...current.keys()].sort(),[...entries.keys()].sort());
 for(const entry of fixture.entries){
  assert.equal(entry.baseRevision,1);assert.equal(entry.original.id,entry.id);assert.equal(entry.original.chapter,3);
  assert.equal(digest(entry.original),entry.baseQuestionSha256,entry.id+' approved baseline fingerprint');
  const q=originals.get(entry.id);assert.equal(q.revision??1,entry.baseRevision,entry.id+' effective historical revision');
  assert.deepEqual(q,entry.original,entry.id+' explicit old object must remain byte-value equivalent in all fields');
  assert.equal(digest(q),entry.baseQuestionSha256,entry.id+' actual complete historical fingerprint');
 }
 assert.equal(Object.hasOwn(originals.get('P-N-02'),'revision'),false);
 assert.equal(Object.hasOwn(originals.get('P-N-04'),'revision'),false);
 assert.equal(Object.hasOwn(originals.get('3-01'),'origin'),false);
 assert.throws(()=>getPracticeCourse('network',{questionRevisions:{'P3-network-3-57':99}}),/版本/);
});

test('运输层71个审定新版必须已注册并由真实默认入口返回，32个未改题仍精确保留',()=>{
 const types={};const weights={};
 for(const item of fixture.items){
  const entry=entries.get(item.id);assert.ok(entry);assert.equal(item.subject,'network');assert.equal(item.baseRevision,1);assert.equal(item.revision,2);
  assert.equal(item.chapter,3);assert.equal(item.type,entry.original.type);
  assert.deepEqual(item.original,entry.original);assert.equal(item.baseQuestionSha256,entry.baseQuestionSha256);
  assert.equal(digest(item.proposed),item.newQuestionSha256,item.id+' approved target fingerprint');
  assert.deepEqual(practiceQuestionRevisions[item.id]?.[item.revision],item.patch,item.id+' actual revision registry must contain the whole approved patch');
  const q=installed(item.id);assert.equal(q.chapter,item.chapter);assert.equal(q.type,item.type);
  assert.deepEqual(q,item.proposed,item.id+' real default full object, not a patched fixture used as a substitute');
  assert.equal(digest(q),item.newQuestionSha256,item.id+' real default complete fingerprint');
  assert.equal(q.studyWeight,item.studyWeight);
  // The established chapter-3 sampling weight is 3; studyWeight is a relative
  // tier divided by 2, not the final sampling weight itself.
  assert.equal(q.practiceWeight,3*item.studyWeight/2,item.id+' chapter weight times the approved relative tier');
  assert.ok([2,3].includes(q.studyWeight));assert.ok(typeof q.studyEvidence==='string'&&q.studyEvidence.length>0);
  types[item.type]=(types[item.type]??0)+1;weights[item.studyWeight]=(weights[item.studyWeight]??0)+1;
 }
 assert.deepEqual(types,{single:35,fill:13,short:23});assert.deepEqual(weights,{2:12,3:59});
 const unchanged=fixture.entries.filter(entry=>!changes.has(entry.id));assert.equal(unchanged.length,32);
 for(const entry of unchanged)assert.deepEqual(current.get(entry.id),entry.original,entry.id+' unchanged default must keep all old fields and weight');
});

test('运输层旧40选择与27填空从各自原题语义独立核键，旧缺前提处明确仅验证原意兼容',()=>{
 let choices=0,fills=0,blanks=0;
 for(const entry of fixture.entries){const q=originals.get(entry.id);if(q.type==='short')continue;const solved=checkObjective(q,originals,'explicit-old');if(q.type==='single')choices++;else{fills++;blanks+=solved.answer.length;checkFillFormats(q,solved.answer);}}
 assert.deepEqual({choices,fills,blanks},{choices:40,fills:27,blanks:28});
 const conditional=observations.filter(x=>x.phase==='explicit-old'&&x.legacyAssumption).map(x=>x.id).sort();
 assert.deepEqual(conditional,['P3-network-3-42','P3-network-3-44','P3-network-3-45','P3-network-3-51','P3-network-3-58'].sort());
});

test('运输层当前40选择与27填空必须读真实默认题后严格解析、独算、grade，新增57为两空',()=>{
 let choices=0,fills=0,blanks=0,changedObjective=0;
 for(const entry of fixture.entries){const q=changes.has(entry.id)?installed(entry.id):current.get(entry.id);if(q.type==='short')continue;
  const solved=checkObjective(q,originals,'actual-default');assert.equal(solved.legacyAssumption,undefined,q.id+' current default must be self-contained');
  if(changes.has(q.id))changedObjective++;
  if(q.type==='single')choices++;else{fills++;blanks+=solved.answer.length;checkFillFormats(q,solved.answer);}
 }
 assert.deepEqual({choices,fills,blanks,changedObjective},{choices:40,fills:27,blanks:32,changedObjective:48});
});

test('运输层真实新版的重叠裁剪、缓存尾段/FIN反例、SR窗口与GBN丢弃机制相互区分',()=>{
 for(const id of ['P-N-02',43,45,49,51,55,56,57,58,64].map(value=>typeof value==='number'?`P3-network-3-${value}`:value))installed(id);
 checkBoundaryCases(current,originals);
});

test('运输层新旧主观题仍走review状态，历史字段核验不冒充模型评分正确性',()=>{
 for(const entry of fixture.entries){if(entry.original.type!=='short')continue;assert.equal(grade(originals.get(entry.id),'独立试答',2).status,'review');assert.equal(grade(current.get(entry.id),'独立试答',2).status,'review');}
});

test.after(()=>{
 const output=process.env.NETWORK_TRANSPORT_AUDIT_OUTPUT;
 if(output)writeFileSync(output,JSON.stringify({scope:'103 repository-owned originals; explicit old versions and 71 registered real defaults. Concept judgments are read-reviewed; historical missing-premise checks are compatibility only.',
  counts:{originalFingerprints:fixture.entries.length,registeredTargets:fixture.items.filter(c=>Object.hasOwn(practiceQuestionRevisions[c.id]??{},String(c.revision))).length,
   explicitOldObjectives:observations.filter(x=>x.phase==='explicit-old').length,actualDefaultObjectives:observations.filter(x=>x.phase==='actual-default').length},
  observations},null,2)+'\n');
});
