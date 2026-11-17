import {cPreprocessorPractice} from './bank-c-preprocessor.js';
export const cPreprocessorGuides=Object.fromEntries(cPreprocessorPractice.programming.filter(q=>q.coding).map(q=>[q.id,{instruction:q.submissionInstruction,starter:q.codeStarter}]));
