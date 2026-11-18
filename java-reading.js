import {javaTaskGuide} from './java-task-guides.js';

// Display copies are for reading help only. Locked question snapshots retain
// their original wording, scoring mode and revision.
export function visibleReadingQuestion(q,language='c',guide=javaTaskGuide(q.id,q.revision??1)){
 if(language!=='java'||guide?.language!=='java'||guide.revision!==(q.revision??1)||!guide.publicStatement)return q;
 return {...q,stem:guide.publicStatement,readingLanguage:'java'};
}

export const javaReadingNotes=[
 {id:'java:static-method',aliases:['Java静态方法'],difficulty:65,languages:['java'],when:[/\bpublic\s+static\b/],definition:'用static声明的方法属于类，调用它不需要先创建该类的对象。public表示可从允许访问该类的位置调用。',purpose:'看懂题目要求的方法入口，区分通过类名调用和通过对象调用。',example:'工具类声明public static int twice(int x)，可用工具类名调用twice(3)。'},
 {id:'java:array-reference',aliases:['Java数组引用'],difficulty:65,languages:['java'],when:[/\b(?:int|SortRecord)\s*\[\]/],definition:'Java数组是对象，数组变量保存对该对象的引用。把数组传给方法时，复制的是这个引用值。',purpose:'理解为什么方法能改数组里的元素，而仅把形参改指向另一个数组不会替换调用者的变量。',example:'a和b引用同一个数组时，b[0]=9会使a[0]也变成9；随后令b=new int[2]不会让a改指向新数组。'},
 {id:'java:long',aliases:['Java长整型'],difficulty:70,languages:['java'],when:[/\blong\b/],definition:'Java的long是64位有符号整数，比32位int能容纳更大的整数；整数字面量后加L可明确写成长整型。',purpose:'避免较大计数或累加结果超出int范围；计算过程也要先使用long，不能只在溢出后转换结果。',example:'long total=3_000_000_000L可保存三十亿；两个int相加前可先把其中一个转成long。'},
 {id:'java:final-field',aliases:['Java只读字段'],difficulty:64,languages:['java'],when:[/\bfinal\s+int\b/],definition:'这里的final字段在完成初始化后不能再次赋值；它限制的是该字段的重新赋值，不代表所有相关对象都自动不可变。',purpose:'看懂系统提供的记录类型：不能改写只读的key或identity字段，但可按题意移动数组中的记录引用。',example:'final int code在构造时赋值后不能再写code=2；保存该记录的数组位置仍可改放另一条记录。'},
 {id:'java:reference-content',aliases:['对象引用与内容'],difficulty:63,languages:['java'],when:[/记录引用|同一对象引用/],definition:'引用标识一个对象，对象字段保存它的内容。两个不同对象可以有相同的字段值，引用相同与内容相同是两件事。',purpose:'区分题目要求保留字段数据，还是要求保留原来的同一个对象；不要自行加上题目没有要求的限制。',example:'分别创建的两条记录都含key=4、tag=7，它们内容相同，但用==比较引用时仍可能为false。'},
 {id:'java:null',aliases:['Java空引用'],difficulty:64,languages:['java'],when:[/\bnull\b/],definition:'null表示变量当前没有引用任何对象。读取空引用的数组元素或对象成员会出错，必须先满足题目给定的访问条件。',purpose:'区分空数组和没有数组对象：前者长度可以为0，后者不能读取length或元素。',example:'new int[0]是有效的零长度数组；int[] a=null则没有数组对象，不能读取a.length。'}
];
