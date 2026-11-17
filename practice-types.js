import {chapterCategory} from './chapter-tests.js';

export const practiceTypes=[
 {id:'choice',name:'选择题'},
 {id:'fill',name:'填空题'},
 {id:'analysis',name:'分析题'},
 {id:'code',name:'编程题'},
 {id:'code-fill',name:'程序填空题'},
 {id:'judgement',name:'判断题'},
 {id:'calculation',name:'计算题'},
 {id:'design',name:'综合应用题'}
];
export function practiceType(subject,q){
 const category=chapterCategory(subject,q);
 if(category==='程序填空'||category==='程序填空题')return 'code-fill';
 if(category==='判断题')return 'judgement';
 if(q.type==='single')return 'choice';
 if(q.type==='fill')return 'fill';
 if(category==='编程题'||category==='算法设计')return 'code';
 if(category==='计算题')return 'calculation';
 if(['综合应用','综合应用题','设计题'].includes(category))return 'design';
 return 'analysis';
}
export function filterPracticeTypes(subject,questions,chapter,kind){
 if(!practiceTypes.some(t=>t.id===kind))return [];
 return questions.filter(q=>(!chapter||chapter==='all'||String(q.chapter)===String(chapter))&&practiceType(subject,q)===kind);
}
export function practiceTypeCounts(subject,questions,chapter='all'){
 return practiceTypes.map(t=>({...t,count:filterPracticeTypes(subject,questions,chapter,t.id).length}));
}
