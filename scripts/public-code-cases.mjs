import {judgeContract,evaluateContract} from './judge-contracts.mjs';

// These forms come from the repository's generated, trusted drivers.
// Never use this parser on a learner's code.
function blockAt(source,start){
 let depth=0,quote='';
 for(let i=start;i<source.length;i++){
  const c=source[i],next=source[i+1];
  if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"){quote=c;continue;}
  if(c==='/'&&next==='/'){const end=source.indexOf('\n',i+2);i=end<0?source.length:end;continue;}
  if(c==='/'&&next==='*'){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+1;continue;}
  if(c==='{')depth++;
  if(c==='}'&&--depth===0)return {start,end:i+1,body:source.slice(start+1,i)};
 }
 return null;
}

function outputFor(contract){
 if(typeof contract.exactOutput==='string')return contract.exactOutput;
 return contract.groups?.map(tokens=>tokens.join(' ')).join('\n')??'';
}

function fileText(hex){
 const bytes=Buffer.from(hex,'hex');
 return bytes.every(byte=>byte>=32&&byte<=126||[9,10,13].includes(byte))
  ?JSON.stringify(bytes.toString('ascii')):Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join(' ');
}

function filesFor(contract){
 const policy=contract.file_policy;
 if(!policy)return {};
 return {
  inputFiles:policy.names.map(name=>({name,content:Object.hasOwn(policy.seeds||{},name)?fileText(policy.seeds[name]):'文件不存在'})),
  outputFiles:(contract.fileChecks||[]).map(check=>({name:check.name,
   content:check.mode==='absent'?'文件不存在':check.mode==='bytes'?fileText(check.expected):check.mode==='prefix'?fileText(check.expected)+'（允许写入的前缀）':check.expected.join(' ')}))
 };
}

function simpleCall(body){
 const match=body.match(/^printf\("%(?:ll)?[diu]\\n",\s*(?:\((?:long long|int)\))?([\s\S]+)\);$/);
 return match?.[1]??body;
}

function publicCall(body,head){
 const tree=body.match(/^treeJudge_lca\((treeJudge_parent_\d+),\d+,(-?\d+),(-?\d+),(-?\d+)\);$/);
 if(!tree)return simpleCall(body);
 const [name,n,p,q]=tree.slice(1);
 const data=head.match(new RegExp('const int '+name+'\\[\\]\\s*=\\s*(\\{[^}]+\\})'))?.[1];
 return data?'int parent[]='+data+';\nlcaParent(parent, '+[n,p,q].join(', ')+')':body;
}

function driverSamples(contract){
 const harness=contract.sampleHarness||contract.harness;
 const groups=contract.groups;
 const entry=harness.match(/(?:int\s+main\s*\(\s*void\s*\)|public\s+static\s+void\s+main\s*\(String\[\]\s+args\))\s*\{/);
 if(!entry||!Array.isArray(groups))return [];
 const main=blockAt(harness,entry.index+entry[0].length-1);
 if(!main)return [];
 const definitions=Array.from(harness.matchAll(/(?:static void|private static void)\s+([A-Za-z_]\w*case_?\d+|case\d+)\(\s*(?:void)?\s*\)\s*\{/g),
  match=>({...blockAt(harness,match.index+match[0].length-1),name:match[1],start:match.index}));
 let rows,head=harness.slice(0,main.start);
 if(definitions.length){
  rows=definitions.filter(row=>main.body.includes(row.name+'();')).map(row=>row.body);
  head=definitions.reduceRight((out,row)=>out.slice(0,row.start)+out.slice(row.end),head);
 }else{
  const body=main.body.trim().replace(/\s*return\s+0\s*;\s*$/,'').trim();
  rows=[];
  let cursor=0;
  while(body[cursor]==='{'){
   const block=blockAt(body,cursor);
   if(!block)break;
   rows.push(block.body);
   cursor=block.end;
   while(/\s/.test(body[cursor]??''))cursor++;
  }
  if(cursor!==body.length){
   rows=body.split('\n').map(line=>line.trim()).filter(Boolean);
   if(!rows.every(line=>line.startsWith('printf(')&&line.endsWith(');')))return [];
  }
 }
 const resultGroups=contract.sampleGroups||groups.map(group=>[group]);
 if(rows.length!==resultGroups.length)return [];
 return rows.map((row,index)=>{
  const selectedGroups=resultGroups[index];
  const selected={...contract,groups:selectedGroups,expected:selectedGroups.flat(),
   harness:head+'{\n{\n'+row+'\n}\n'+(entry[0].startsWith('int')?'return 0;\n':'')+'}'+harness.slice(main.end)};
  return {input:publicCall(row.trim(),head),output:outputFor(selected),kind:'call',contract:selected};
 });
}

const casesByQuestion=new Map();
export function publicCodeCases(questionId,language='c'){
 const key=language+':'+questionId;
 if(casesByQuestion.has(key))return casesByQuestion.get(key);
 const whole=judgeContract(questionId,language,true);
 if(!whole)return [];
 const variants=whole.variants||[whole];
 const cases=variants.flatMap(contract=>contract.harness?driverSamples(contract).map(example=>{
  const defines=(contract.prelude||'').split('\n').filter(line=>/^#define [A-Z]\w*(?:\s+[-+]?\d.*)?$/.test(line));
  return {...example,input:[...defines,example.input].join('\n')};
 }):[{kind:'stdin',input:contract.stdin||'',output:outputFor(contract),...filesFor(contract),contract}]);
 const unique=[...new Map(cases.map(item=>[JSON.stringify([item.input,item.inputFiles,item.output,item.outputFiles]),item])).values()];
 const compact=unique.filter(item=>item.input.length<=900&&item.output.length<=400&&
  [...(item.inputFiles||[]),...(item.outputFiles||[])].every(file=>file.content.length<=250));
 const pool=compact.length>=2?compact:unique;
 const first=pool.find(item=>item.inputFiles?.some(file=>!['文件不存在','""'].includes(file.content)))||pool[0];
 const second=pool.find(item=>item.input!==first?.input&&item.output!==first?.output)
  ||pool.find(item=>item!==first&&(item.input!==first?.input||JSON.stringify(item.inputFiles)!==JSON.stringify(first?.inputFiles)));
 const selected=[first,second].filter(Boolean);
 casesByQuestion.set(key,selected);
 return selected;
}

export function evaluatePublicCodeCases(result,cases){
 const results=result.status==='variants'?result.results:[result];
 if(!Array.isArray(results)||!results.length||results.length>cases.length)return {status:'unavailable',message:'运行服务未返回完整样例结果。'};
 const samples=results.map((raw,i)=>{
  const check=evaluateContract(raw,cases[i].contract);
  return {sample:i+1,status:check.status,message:check.message,
   ...(typeof raw.stdout==='string'?{stdout:raw.stdout}:{}),...(raw.stderr?{stderr:raw.stderr}:{})};
 });
 const passed=samples.filter(sample=>sample.status==='accepted').length;
 const status=samples.find(sample=>!['accepted','wrong_answer'].includes(sample.status))?.status||
  (samples.length!==cases.length?'unavailable':passed===cases.length?'accepted':'wrong_answer');
 return {status,passed,total:cases.length,samples,message:status==='accepted'?'公开样例全部通过。':'查看各组公开样例的运行结果。'};
}
