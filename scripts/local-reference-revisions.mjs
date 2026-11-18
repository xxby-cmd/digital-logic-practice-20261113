import {readFile} from 'node:fs/promises';
import path from 'node:path';
const isTextList=value=>Array.isArray(value)&&value.every(part=>typeof part==='string');
function validWalkthrough(value){
 return value&&typeof value.idea==='string'&&isTextList(value.steps)&&
  (value.trap===undefined||typeof value.trap==='string')&&
  (value.result===undefined||typeof value.result==='string')&&
  (value.pitfalls===undefined||isTextList(value.pitfalls));
}
// Reference patches stay beside the private source material, outside the repo.
export async function readLocalReferenceRevisions(directory=path.resolve('../学习资料/外校题库参考')){
 let revisions;
 try{revisions=JSON.parse(await readFile(path.join(directory,'已接入修订.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}
 const fields=new Set(['stem','options','answer','answers','formats','explanation','model','rubric','studyLevel','studyWeight','studyEvidence','mechanism','walkthrough']);
 if(!revisions||typeof revisions!=='object'||Array.isArray(revisions))throw Error('本地参考题修订格式无效。');
 for(const [id,versions]of Object.entries(revisions)){
  if(!id||!versions||typeof versions!=='object'||Array.isArray(versions)||!Object.keys(versions).length)throw Error('本地参考题修订格式无效。');
  for(const [revision,patch]of Object.entries(versions)){
   if(!/^[1-9]\d*$/.test(revision)||!patch||typeof patch!=='object'||Array.isArray(patch)||!Object.keys(patch).length||
    Object.keys(patch).some(key=>!fields.has(key))||Object.hasOwn(patch,'walkthrough')&&!validWalkthrough(patch.walkthrough))throw Error('本地参考题修订格式无效。');
  }
 }
 return revisions;
}
