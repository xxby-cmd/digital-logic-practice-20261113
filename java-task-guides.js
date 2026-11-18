import {javaAlgorithmTaskGuides} from './java-algorithm-task-guides.js';

const minMaxId='P4-structures-1-D-002';
const binaryInsertionId='P4-structures-10-D-002';
const minMax=javaAlgorithmTaskGuides[minMaxId];
const binaryInsertion=javaAlgorithmTaskGuides[binaryInsertionId];

// Public task data only; executable drivers and expected results stay server-side.
export const javaTaskGuides={
 ...javaAlgorithmTaskGuides,
 [minMaxId]:{...minMax,revision:3,publicStatement:minMax.publicStatement.replace(
  '可由实际元素初始化，不得用0、9999等固定数据哨兵假定值域。',
  '可由实际元素初始化，也可用Integer.MAX_VALUE初始化最小值、Integer.MIN_VALUE初始化最大值；不得用0、9999等值假定输入范围。'
 ),explanation:'从实际首元素开始扫描，或用int完整范围的两个边界初始化，均可处理单项、全正、全负和int极值。返回含两个值的定长数组。'},
 [binaryInsertionId]:{...binaryInsertion,revision:3,publicStatement:binaryInsertion.publicStatement.replace(
  '及右移记录采用所选方向的理由',
  '，以及所选搬移方法怎样避免覆盖尚未搬移的记录（可用倒序逐项搬移或支持重叠区间的等价操作）'
 ),explanation:'右移整个区间时，可从后向前逐项赋值，也可用支持同一数组内重叠搬移的System.arraycopy。解释怎样避免覆盖尚未搬移的记录，并说明上界插入位置。'}
};
export function javaTaskGuide(id,revision=1){
 const latest=javaTaskGuides[id];
 if(latest?.revision===revision)return latest;
 const previous=javaAlgorithmTaskGuides[id];
 return previous?.revision===revision?previous:undefined;
}
