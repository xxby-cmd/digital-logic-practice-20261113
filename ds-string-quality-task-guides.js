import {dsAnalysisTaskGuides} from './ds-analysis-task-guides.js';

// Revision 4 keeps the same C interface and functional contract. The question
// registry holds the corrected explanation and scoring criteria for this version.
const ids=[4,6,7,8,9].map(n=>`P4-structures-4-D-${String(n).padStart(3,'0')}`);
export const dsStringQualityTaskGuides=Object.fromEntries(ids.map(id=>[
 id,{...dsAnalysisTaskGuides[id],revision:4}
]));
