// 权重只用于默认抽题，不在题面显示；章节定向练习仍保留全部题。
// 依据：用户2021/22数据结构卷、2023计网卷、2023—2024数电模拟及教师PPT。
const chapterWeights={
 structures:{1:0.8,2:3,3:2.5,4:1,5:1,6:3,7:3,8:0.3,9:2.5,10:2.5,11:0.4,12:0.4},
 programming:{1:0.5,2:0.8,3:2,4:3,5:3,6:3,7:0.6,8:3,9:1.5,10:0.6,11:1,12:1},
 digital:{1:1.2,2:3,3:0.5,4:3,5:2.5,6:3,7:1,8:0.6},
 network:{1:1,physical:1,2:2,3:3,4:3,5:2}
};
export function practiceWeight(subject,q){
 const chapter=chapterWeights[subject]?.[q.chapter]??1;
 // 新题按实际讲授证据标记；没有逐题证据的旧题维持原章权重。
 const relative=[1,2,3].includes(q.studyWeight)?q.studyWeight/2:1;
 return chapter*relative;
}
