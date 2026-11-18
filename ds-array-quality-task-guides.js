import {dsAnalysisTaskGuides} from './ds-analysis-task-guides.js';

const ids=[3,6,7].map(n=>`P4-structures-5-D-${String(n).padStart(3,'0')}`);
export const dsArrayQualityTaskGuides=Object.fromEntries(ids.map(id=>{
 const previous=dsAnalysisTaskGuides[id];
 const publicStatement=id.endsWith('006')
  ? previous.publicStatement.replace('时间O(展开访问数)','时间O(展开访问数+levels)')
  : previous.publicStatement;
 return [id,{...previous,revision:4,publicStatement}];
}));
