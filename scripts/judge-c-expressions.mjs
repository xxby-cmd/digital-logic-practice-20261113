// Server-only C17 drivers and references. Numeric expectations originate in JS,
// using BigInt where C long long results exceed exact Number integer precision.
const id = (kind, n) => `C6E-programming-3-${kind}-${String(n).padStart(3,'0')}`;
const I = [-2147483648,-1000000000,-1001,-127,-25,-2,-1,0,1,2,7,25,127,1001,1000000000,2147483647];
const bounded = limit => I.filter(n => Math.abs(n)<=limit);
const pairs = values => values.flatMap(a => values.map(b => [a,b]));
const triples = values => values.flatMap(a => values.flatMap(b => values.map(c => [a,b,c])));
const absBig = x => x<0n ? -x : x;
const compareBig = (a,b) => a<b ? -1 : a>b ? 1 : 0;
const cLiteral = value => typeof value==='bigint' ? `${value}LL` :
 value===-2147483648 ? '(-2147483647-1)' : String(value);
const specs = new Map();
const refs = {};
function add(kind,n,fn,args,expected,source,{floating=false}={}) {
 const key=id(kind,n);specs.set(key,{fn,args,expected,floating});refs[key]=source;
}
add('B',1,'meanPair',pairs(bounded(1e9)),([a,b])=>(a+b)/2,
 'double meanPair(int a,int b){return ((double)a+b)/2;}',{floating:true});
add('B',2,'tensDigit',Array.from({length:900},(_,i)=>[i+100]),([n])=>Math.floor(n/10)%10,
 'int tensDigit(int n){return n/10%10;}');
add('B',3,'leapExpr',[1,4,100,400,1582,1600,1700,1800,1896,1900,1996,1999,2000,2004,2024,2100,2400,9999].map(y=>[y]),
 ([y])=>dateValid(y,2,29),
 'int leapExpr(int y){return y%400==0||(y%4==0&&y%100!=0);}');
add('B',4,'oneZero',pairs(I),([a,b])=>Number([a,b].filter(x=>x===0).length===1),
 'int oneZero(int a,int b){return (a==0)!=(b==0);}');
const bounds = [[-2147483648,2147483647],[-10,10],[0,0],[5,5],[-100,-1],[1,100],[2147483646,2147483647]];
add('B',5,'inClosed',bounds.flatMap(([lo,hi])=>[...new Set([...I,lo,hi])].map(x=>[x,lo,hi])),
 ([x,lo,hi])=>Number(x>=lo&&x<=hi), 'int inClosed(int x,int lo,int hi){return x>=lo&&x<=hi;}');
add('B',6,'totalSeconds',[0,1,23,99,1000000].flatMap(h=>[0,1,59].flatMap(m=>[0,1,59].map(s=>[h,m,s]))),
 ([h,m,s])=>BigInt(h)*3600n+BigInt(m)*60n+BigInt(s),
 'long long totalSeconds(int h,int m,int s){return 3600LL*h+60LL*m+s;}');
const quarterValues=[-1000000,-999999.75,-999999.5,-99.75,-2.75,-2.5,-2.25,-1.5,-0.75,-0.5,-0.25,0,0.25,0.5,0.75,1.5,2.25,2.5,2.75,99.75,999999.5,999999.75,1000000];
function adjacentPositive(x,direction){
 const b=new ArrayBuffer(8),v=new DataView(b);v.setFloat64(0,x);
 v.setBigUint64(0,v.getBigUint64(0)+(direction>0?1n:-1n));return v.getFloat64(0);
}
const halfNeighbors=[0.5,1.5,2.5,99.5,999999.5].flatMap(x=>[-1,0,1].flatMap(d=>{
 const y=d?adjacentPositive(x,d):x;return [y,-y];
}));
add('B',7,'nearestAway',[...new Set([...quarterValues,...halfNeighbors])].map(x=>[x]),([x])=>x<0?-Math.round(-x):Math.round(x),
 'int nearestAway(double x){int t=(int)x;double r=x-t;return t+(r>=0.5)-(r<=-0.5);}');
add('B',8,'signValue',I.map(x=>[x]),([x])=>Math.sign(x),
 'int signValue(int x){return (x>0)-(x<0);}');
const unsignedValues=[0,1,2,15,128,255,256,65535,0x80000000,0xabcdef12,0xffffffff];
add('B',9,'bitValue',unsignedValues.flatMap(x=>Array.from({length:32},(_,k)=>[x,k])),
 ([x,k])=>Number((BigInt(x)>>BigInt(k))&1n),
 'unsigned int bitValue(unsigned int x,int k){return (x>>k)&1U;}');
add('B',10,'shiftedHour',Array.from({length:24},(_,h)=>[-1000000000,-49,-24,-23,-1,0,1,23,24,49,1000000000].map(d=>[h,d])).flat(),
 ([h,d])=>((h+d)%24+24)%24,
 'int shiftedHour(int h,int delta){int r=(h+delta)%24;return r<0?r+24:r;}');
add('B',11,'realQuotient',pairs(bounded(1e9)).filter(([,b])=>b!==0),([a,b])=>a/b,
 'double realQuotient(int a,int b){return (double)a/b;}',{floating:true});
add('B',12,'absoluteGap',pairs(I),([a,b])=>absBig(BigInt(a)-BigInt(b)),
 'long long absoluteGap(int a,int b){long long d=(long long)a-b;return d<0?-d:d;}');
add('B',13,'sameParity',pairs(I),([a,b])=>Number(Math.abs(a%2)===Math.abs(b%2)),
 'int sameParity(int a,int b){return (a%2==0)==(b%2==0);}');
add('B',14,'triangleSides',triples([0,1,2,3,5,1000000000]),([a,b,c])=>Number(a>0&&b>0&&c>0&&
 [a,b,c].sort((x,y)=>x-y).slice(0,2).reduce((s,x)=>s+x,0)>Math.max(a,b,c)),
 'int triangleSides(int a,int b,int c){return a>0&&b>0&&c>0&&(long long)a+b>c&&(long long)a+c>b&&(long long)b+c>a;}');
add('B',15,'discountedCents',[0,1,2,99,100,101,199,100000000].flatMap(c=>[0,1,25,50,75,99,100].map(p=>[c,p])),
 ([c,p])=>BigInt(c)*BigInt(100-p)/100n,
 'int discountedCents(int cents,int off){return (int)((long long)cents*(100-off)/100);}');

add('P',1,'addWide',pairs(I),([a,b])=>BigInt(a)+BigInt(b),
 'long long addWide(int a,int b){return (long long)a+b;}');
add('P',2,'squareWide',bounded(1e9).concat([-999999999,999999999]).map(x=>[x]),([x])=>BigInt(x)**2n,
 'long long squareWide(int x){return (long long)x*x;}');
add('P',3,'cubeValue',[-1000000,-999999,-1001,-2,-1,0,1,2,1001,999999,1000000].map(x=>[x]),
 ([x])=>BigInt(x)**3n, 'long long cubeValue(int x){return (long long)x*x*x;}');
add('P',4,'boxesNeeded',pairs([0,1,2,3,10,99,100,1000000000,2147483646,2147483647]).filter(([,k])=>k>0),
 ([n,k])=>(BigInt(n)+BigInt(k)-1n)/BigInt(k),
 'int boxesNeeded(int n,int k){return n/k+(n%k!=0);}');
const divisorArgs=I.flatMap(a=>[1,2,3,7,25,1000000000,2147483647].map(d=>[a,d]));
add('P',5,'floorQuotient',divisorArgs,([a,d])=>Math.floor(a/d),
 'int floorQuotient(int a,int d){int q=a/d,r=a%d;return q-(r<0);}');
add('P',6,'positiveRemainder',divisorArgs,([a,d])=>((BigInt(a)%BigInt(d))+BigInt(d))%BigInt(d),
 'int positiveRemainder(int a,int d){int r=a%d;return r<0?r+d:r;}');
add('P',7,'nearestMultiple',pairs([0,1,2,3,5,10,11,1000000000,1073741824,1400000000,2147483646,2147483647]).filter(([,s])=>s>0),
 ([n,s])=>{const a=BigInt(n),b=BigInt(s),lo=a/b*b,hi=lo+b;return a-lo<hi-a?lo:hi;},
 'long long nearestMultiple(int n,int step){long long q=n/step,r=n%step;return (q+(2*r>=step))*step;}');
const fractions = [[0,1],[1,1],[1,2],[2,3],[3,4],[2,4],[1,1000000000],[999999999,1000000000],[1000000000,999999999],[1000000000,1],[999999998,999999999]];
add('P',8,'compareFractions',fractions.flatMap(([a,b])=>fractions.map(([c,d])=>[a,b,c,d])),
 ([a,b,c,d])=>compareBig(BigInt(a)*BigInt(d),BigInt(c)*BigInt(b)),
 'int compareFractions(int a,int b,int c,int d){long long x=(long long)a*d,y=(long long)c*b;return (x>y)-(x<y);}');
add('P',9,'medianValue',triples([-2147483648,-1,0,1,2147483647]),a=>[...a].sort((x,y)=>x-y)[1],
 'int medianValue(int a,int b,int c){return a<b?(b<c?b:(a<c?c:a)):(a<c?a:(b<c?c:b));}');
add('P',10,'clampValue',bounds.flatMap(([lo,hi])=>[...new Set([...I,lo,hi])].map(x=>[x,lo,hi])),
 ([x,lo,hi])=>Math.max(lo,Math.min(hi,x)),
 'int clampValue(int x,int lo,int hi){return x<lo?lo:(x>hi?hi:x);}');
add('P',11,'distanceToBoundary',[[-1000000000,1000000000],[-10,20],[0,0],[7,7],[0,1]].flatMap(([l,r])=>
 [...new Set([l,r,Math.floor((l+r)/2),Math.ceil((l+r)/2)])].map(x=>[x,l,r])),
 ([x,l,r])=>Math.min(x-l,r-x),
 'int distanceToBoundary(int x,int left,int right){int a=x-left,b=right-x;return a<b?a:b;}');
const points=[[-1000000000,-1000000000],[1000000000,1000000000],[0,0],[1,-1],[-7,10],[5,10]];
add('P',12,'gridDistance',points.flatMap(([x,y])=>points.map(([u,v])=>[x,y,u,v])),
 ([x,y,u,v])=>absBig(BigInt(x)-BigInt(u))+absBig(BigInt(y)-BigInt(v)),
 'long long gridDistance(int x1,int y1,int x2,int y2){long long x=(long long)x1-x2,y=(long long)y1-y2;return (x<0?-x:x)+(y<0?-y:y);}');
const rects=[[-3,-2,5,8],[0,0,0,0],[2,-3,2,7],[-2147483648,-2147483648,2147483647,2147483647]];
add('P',13,'insideRectangle',rects.flatMap(([x1,y1,x2,y2])=>pairs([...new Set([-2147483648,-4,-3,-2,0,2,5,7,8,9,2147483647,x1,x2,y1,y2])]).map(([x,y])=>[x,y,x1,y1,x2,y2])),
 ([x,y,x1,y1,x2,y2])=>Number(x>=x1&&x<=x2&&y>=y1&&y<=y2),
 'int insideRectangle(int x,int y,int x1,int y1,int x2,int y2){return x>=x1&&x<=x2&&y>=y1&&y<=y2;}');
const intervals=[[-2147483648,-1],[-1,-1],[-10,0],[0,0],[0,10],[10,20],[11,30],[2147483647,2147483647],[-2147483648,2147483647]];
add('P',14,'closedOverlap',intervals.flatMap(a=>intervals.map(b=>[...a,...b])),
 ([l,r,u,v])=>Number(Math.max(l,u)<=Math.min(r,v)),
 'int closedOverlap(int l1,int r1,int l2,int r2){return !(r1<l2||r2<l1);}');
const timeWindows=[[0,0],[0,1439],[1439,0],[1380,60],[100,200],[200,100],[720,720]];
add('P',15,'clockWindow',timeWindows.flatMap(([s,e])=>[...new Set([0,1,59,60,61,99,100,101,199,200,201,719,720,721,1379,1380,1381,1438,1439,s,e])].map(t=>[t,s,e])),
 ([t,s,e])=>Number(s<=e?t>=s&&t<=e:t>=s||t<=e),
 'int clockWindow(int minute,int start,int end){return start<=end?(minute>=start&&minute<=end):(minute>=start||minute<=end);}');
add('P',16,'parkingCents',[0,1,29,30,31,59,60,61,89,90,91,999999999,1000000000].map(m=>[m]),
 ([m])=>m<=30?0n:BigInt(Math.ceil((m-30)/30))*250n,
 'long long parkingCents(int minutes){return minutes<=30?0:((long long)minutes-30+29)/30*250;}');
add('P',17,'tierCents',[0,1,99,100,101,199,200,201,500,999999999,1000000000].map(u=>[u]),
 ([u])=>BigInt(Math.min(u,100))*50n+BigInt(Math.max(0,Math.min(u-100,100)))*65n+BigInt(Math.max(0,u-200))*80n,
 'long long tierCents(int units){return units<=100?50LL*units:(units<=200?5000+65LL*(units-100):11500+80LL*(units-200));}');
const digitNums=[0,1,9,10,99,100,101,909,999,1000,1001,1111,1200,2001,4321,9000,9090,9999];
add('P',18,'fourDigitSum',digitNums.map(n=>[n]),([n])=>[...String(n)].reduce((s,c)=>s+Number(c),0),
 'int fourDigitSum(int n){return n/1000+n/100%10+n/10%10+n%10;}');
add('P',19,'reversedFour',digitNums.filter(n=>n>=1000).map(n=>[n]),
 ([n])=>Number([...String(n)].reverse().join('')),
 'int reversedFour(int n){return n%10*1000+n/10%10*100+n/100%10*10+n/1000;}');
add('P',20,'palindromeFive',[10000,10001,10101,11011,11111,12321,12341,12521,90009,99999,99998].map(n=>[n]),
 ([n])=>Number(String(n)===[...String(n)].reverse().join('')),
 'int palindromeFive(int n){return n/10000==n%10&&n/1000%10==n/10%10;}');
add('P',21,'replaceHundreds',digitNums.flatMap(n=>[0,1,5,9].map(d=>[n,d])),
 ([n,d])=>{const s=String(n).padStart(4,'0').split('');s[1]=String(d);return Number(s.join(''));},
 'int replaceHundreds(int n,int digit){return n-n/100%10*100+digit*100;}');
add('P',22,'clockHalfDegrees',Array.from({length:12},(_,h)=>Array.from({length:60},(_,m)=>[h,m])).flat(),
 ([h,m])=>{const hands=[30*h+0.5*m,6*m],d=Math.abs(hands[0]-hands[1]);return Math.round(2*Math.min(d,360-d));},
 'int clockHalfDegrees(int hour,int minute){int d=60*hour-11*minute;if(d<0)d=-d;return d<720-d?d:720-d;}');
const dateArgs=[1,4,100,400,1900,2000,2023,2024,2100,9999].flatMap(y=>Array.from({length:14},(_,m)=>m).flatMap(m=>[0,1,28,29,30,31,32].map(d=>[y,m,d])));
function dateValid(y,m,d) {
 if(m<1||m>12||d<1)return 0;
 // Avoid Date's special constructor handling of years 0..99.
 const x=new Date(0);x.setUTCHours(0,0,0,0);x.setUTCFullYear(y,m-1,d);
 return Number(x.getUTCFullYear()===y&&x.getUTCMonth()===m-1&&x.getUTCDate()===d);
}
add('P',23,'validCalendarDate',dateArgs,([y,m,d])=>dateValid(y,m,d),
 'int validCalendarDate(int y,int m,int d){if(m<1||m>12||d<1)return 0;int leap=y%400==0||(y%4==0&&y%100!=0);int days=m==2?28+leap:((m==4||m==6||m==9||m==11)?30:31);return d<=days;}');
add('P',24,'hexDigitValue',Array.from({length:128},(_,c)=>[c]),([c])=>{
 const at='0123456789abcdef'.indexOf(String.fromCharCode(c).toLowerCase());return at;
},
 "int hexDigitValue(int ch){return ch>='0'&&ch<='9'?ch-'0':(ch>='A'&&ch<='F'?ch-'A'+10:(ch>='a'&&ch<='f'?ch-'a'+10:-1));}");
add('P',25,'flippedCase',Array.from({length:128},(_,c)=>[c]),([c])=>{
 const s=String.fromCharCode(c),t=s===s.toUpperCase()?s.toLowerCase():s.toUpperCase();return t.charCodeAt(0);
},
 "int flippedCase(int ch){return ch>='a'&&ch<='z'?ch-'a'+'A':(ch>='A'&&ch<='Z'?ch-'A'+'a':ch);}");
add('P',26,'replacedLowByte',unsignedValues.flatMap(x=>[0,1,15,128,255].map(b=>[x,b])),
 ([x,b])=>BigInt(Math.floor(x/256))*256n+BigInt(b),
 'unsigned int replacedLowByte(unsigned int x,unsigned int byte){return (x&~255U)|byte;}');
add('P',27,'swappedNibbles',Array.from({length:256},(_,x)=>[x]),([x])=>Number.parseInt(x.toString(16).padStart(2,'0').split('').reverse().join(''),16),
 'unsigned int swappedNibbles(unsigned int x){return ((x&15U)<<4)|(x>>4);}');
add('P',28,'twoPositive',triples([-2147483648,-1,0,1,2147483647]),a=>Number(a.filter(x=>x>0).length===2),
 'int twoPositive(int a,int b,int c){return (a>0)+(b>0)+(c>0)==2;}');
add('P',29,'sameNonzeroSign',pairs(I),([a,b])=>Number(a!==0&&b!==0&&Math.sign(a)===Math.sign(b)),
 'int sameNonzeroSign(int a,int b){return (a>0&&b>0)||(a<0&&b<0);}');

export const cExpressionsContractIds=[...specs.keys()];
export const cExpressionsReferenceSources=Object.freeze(refs);
export function cExpressionsContract(key) {
 const spec=specs.get(key);if(!spec)return null;
 const tests=spec.args.map(args=>{
  const result=spec.expected(args),call=`${spec.fn}(${args.map(cLiteral).join(',')})`;
  if(spec.floating) {
   const expected=String(result);
   return {body:`double actual=${call},expected=${expected};double d=actual-expected;if(d<0)d=-d;double s=expected<0?-expected:expected;printf("%d\\n",actual==actual&&d<=1e-9+1e-12*s);`,out:['1']};
  }
  return {body:`printf("%lld\\n",(long long)${call});`,out:[String(result)]};
 });
 return {harness:`\n#include <stdio.h>\nint main(void){\n${tests.map(t=>`{${t.body}}`).join('\n')}\nreturn 0;}`,
  groups:tests.map(t=>t.out),expected:tests.flatMap(t=>t.out)};
}

// Valid numeric/trace choice items also have a separate real-C cross-check.
// Constraint/undefined/implementation-defined questions are reviewed by rule,
// not assigned a numeric "result" by executing undefined code.
export const cExpressionsChoiceChecks=[
 [1,'printf("%d",18-5*3+8/3);','5'],[2,'printf("%d",72/3/4);','6'],
 [3,'printf("%d %d",-19/5,-19%5);','-3 -4'],[4,'printf("%d %d",19/(-5),19%(-5));','-3 4'],
 [5,'printf("%d %.2f",_Generic((double)(9/4),double:1,default:0),(double)(9/4));','1 2.00'],
 [6,'printf("%.2f",(double)9/4);','2.25'],[7,'printf("%d",(int)(-3.9));','-3'],
 [8,'printf("%d %d",(int)2.8*3,(int)(2.8*3));','6 8'],[9,'double x=7/2;printf("%.1f",x);','3.0'],
 [10,'int x=7;x/=2.0;printf("%d",x);','3'],[11,'double x=7;x/=2;printf("%.1f",x);','3.5'],
 [12,'int a=5;printf("%d %.1f",_Generic(a+0.5,double:1,default:0),a+0.5);','1 5.5'],
 [13,'int x=3;int n=sizeof(x++);printf("%d %d",x,n);','3 4'],
 [14,'unsigned char c=250;int x=c+10;printf("%d",x);','260'],
 [15,'unsigned char c=260;printf("%d",(int)c);','4'],
 [16,'unsigned int x=0;x-=1;printf("%d",x==UINT_MAX);','1'],[17,'printf("%d",-1<1U);','0'],
 [18,'int a=1,b=2,c=0;c=(a=b=6);printf("%d %d %d",a,b,c);','6 6 6'],
 [19,'int a=0;int x=(a=3,a*2+1);printf("%d %d",a,x);','3 7'],
 [20,'int a=1,b=2;a=b,b=8;printf("%d %d",a,b);','2 8'],
 [21,'int a=4;int b=a++;b+=a;printf("%d %d",a,b);','5 9'],
 [22,'int a=4;int b=++a*2;printf("%d %d",a,b);','5 10'],
 [23,'int a=3;int b=-a--;printf("%d %d",a,b);','2 -3'],
 [27,'int a=2,b=3,c=0;printf("%d",a==b<c);','0'],[28,'printf("%d",2+3>4==1);','1'],
 [29,'printf("%d",0||2&&0);','0'],[30,'printf("%d",-4&&9);','1'],[31,'printf("%d",!5+2);','2'],
 [32,'int x=0,y=3;int z=x&&++y;printf("%d %d",y,z);','3 0'],
 [33,'int x=2,y=3;int z=x||++y;printf("%d %d",y,z);','3 1'],
 [35,'int a=0,b=0;int r=(a=5)||(b=7);printf("%d %d %d",a,b,r);','5 0 1'],
 [36,'printf("%d %.1f",_Generic(1?4:2.5,double:1,default:0),1?4:2.5);','1 4.0'],
 [37,'int x=0,y=4;int r=x?++y:y*2;printf("%d %d",y,r);','4 8'],
 [38,'int a=4,b=7,c=6;int x=a>b?a:b>c?b:c;printf("%d",x);','7'],
 [39,'int x=0,y=2,z=3;int r=x||y?y:z;printf("%d",r);','2'],
 [40,'printf("%d %d",6&3,6&&3);','2 1'],[41,'printf("%d",3^2);','1'],
 [42,'unsigned int x=13U;printf("%u",x>>2);','3'],[43,'printf("%u",1U<<2+1);','8'],
 [44,'unsigned int x=0xA5U;x&=~0x0FU;printf("%X",x);','A0'],
 [45,"printf(\"%d\",'7'-'0');",'7'],[50,'printf("%d %.0f",-7/3,floor(-7.0/3.0));','-2 -3'],
 [51,'long long z=(long long)50000*50000;printf("%lld",z);','2500000000'],
 [54,'printf("%d %.1f",_Generic((int)(-2.75)+0.5,double:1,default:0),(int)(-2.75)+0.5);','1 -1.5']
];
