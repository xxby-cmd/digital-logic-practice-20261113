import {javaTaskGuide} from './java-task-guides.js';
export function hasJavaJudgeContract(id,revision=1){return javaTaskGuide(id,revision)?.testable===true;}
