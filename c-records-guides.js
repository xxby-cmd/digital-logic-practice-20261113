import {cRecordsPractice} from './bank-c-records.js';
export const cRecordsGuides=Object.fromEntries(cRecordsPractice.programming.filter(q=>q.coding).map(q=>[q.id,{
 instruction:q.submissionInstruction,starter:q.codeStarter
}]));
