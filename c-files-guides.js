import {cFilesPractice} from './bank-c-files.js';
export const cFilesGuides=Object.fromEntries(cFilesPractice.programming.filter(q=>q.coding).map(q=>[q.id,{
 instruction:q.submissionInstruction,starter:q.codeStarter,usesFiles:true
}]));
