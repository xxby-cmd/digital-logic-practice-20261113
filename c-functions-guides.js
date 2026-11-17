import {cFunctionsPractice} from './bank-c-functions.js';
export const cFunctionsGuides=Object.fromEntries(cFunctionsPractice.programming.filter(q=>q.coding).map(q=>[q.id,{instruction:q.submissionInstruction,starter:q.codeStarter}]));
