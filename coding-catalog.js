const ready=new Set(['6-02','P-C-03','P-C-04']);
for(let i=10;i<=15;i++)ready.add(`P2-programming-6-${i}`);
for(let i=41;i<=81;i++)ready.add(`P3-programming-6-${i}`);
for(let i=21;i<=35;i++)ready.add(`FULL-programming-v1-${i}`);
ready.add('FULL-structures-v1-31');ready.add('FULL-structures-v1-32');
for(let i=91;i<=100;i++)ready.add(`P3-structures-3-${i}`);
export function hasJudgeContract(id){return ready.has(id);}
