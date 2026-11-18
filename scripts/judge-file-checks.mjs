// Server-only checks of bounded file snapshots from the real WASI runner.
const bad=()=>({status:'unavailable',message:'文件测试配置或运行结果不完整。'});
const hex=s=>typeof s==='string'&&s.length%2===0&&/^[0-9a-f]*$/i.test(s);
const integer=s=>typeof s==='string'&&/^[+-]?\d+$/.test(s);
export function evaluateFileChecks(files,checks){
 if(!files||typeof files!=='object'||Array.isArray(files)||!Array.isArray(checks)||checks.length>32)return bad();
 for(const value of Object.values(files))if(!value||typeof value!=='object'||!Number.isInteger(value.size)||value.size<0||value.size>65536||!hex(value.hex)||value.hex.length!==value.size*2)return bad();
 let passed=0;
 for(const check of checks){
  if(!check||typeof check.name!=='string')return bad();
  const present=Object.hasOwn(files,check.name),value=present?files[check.name]:undefined;
  if(check.mode==='absent'){passed+=Number(!present);continue;}
  let valid=false;
  if(check.mode==='bytes'||check.mode==='prefix'){
   if(!hex(check.expected))return bad();
   if(check.mode==='prefix'&&check.maxBytes!==undefined&&(!Number.isInteger(check.maxBytes)||check.maxBytes<0))return bad();
   if(present){
    const actual=value.hex.toLowerCase(),expected=check.expected.toLowerCase();
    valid=check.mode==='bytes'?actual===expected:expected.startsWith(actual)&&(check.maxBytes===undefined||value.size<=check.maxBytes);
   }
  }else if(check.mode==='tokens'||check.mode==='integers'){
   if(!Array.isArray(check.expected)||check.expected.some(s=>typeof s!=='string'))return bad();
   if(check.mode==='integers'&&check.expected.some(s=>!integer(s)))return bad();
   if(present){
    const data=Buffer.from(value.hex,'hex');
    // Token protocols here are ASCII; replacement decoding must not hide bytes.
    if(data.every(b=>b<128)){
     const text=data.toString('ascii').trim(),tokens=text?text.split(/\s+/):[];
     valid=tokens.length===check.expected.length&&tokens.every((s,i)=>check.mode==='integers'?integer(s)&&BigInt(s)===BigInt(check.expected[i]):s===check.expected[i]);
    }
   }
  }else return bad();
  passed+=Number(valid);
 }
 return {status:passed===checks.length?'accepted':'wrong_answer',message:passed===checks.length?'文件结果正确。':'文件内容或有无状态不符合要求。',passed,total:checks.length};
}
