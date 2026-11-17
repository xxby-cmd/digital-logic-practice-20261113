// Server-only C17 drivers. Expected values are computed by independent JS models.
const questionId = (tag, n) => `C6L-programming-4-${tag}-${String(n).padStart(3, '0')}`;
const lit = a => `{${a.length ? a.join(',') : 0}}`;
const specs = new Map();
const sources = {};
const item = (body, out) => ({body, out});
const add = (tag, n, source, build) => {const id=questionId(tag,n);sources[id]=source;specs.set(id,build);};
function scalar(tag, n, name, source, cases, expected) {
 add(tag,n,source,()=>cases.map(args=>item(`printf("%lld\\n",(long long)${name}(${args.join(',')}));`,[expected(...args)])));
}
const cross = (a,b) => a.flatMap(x=>b.map(y=>[x,y]));
const gcd = (a,b) => b ? gcd(b,a%b) : a;
const digits = n => String(n).split('').map(Number);
const digitSum = n => digits(n).reduce((a,b)=>a+b,0);
const arrays = [[],[0],[1],[-1],[4,-2,0,9],[-3,-2,0,-1],[2,-3,-4,5,0,-1],
 [1,-1,1,-1],[0,7,-8],[7,0,0],[-1000000000,-1000000000,1000000000],
 [1000000000,1000000000,1000000000],[-1000000000,-1000000000,-1000000000],Array(100).fill(1000000000)];
function arrayScalar(tag,n,name,source,cases,expected,extras=()=>[]) {
 add(tag,n,source,()=>cases.map(a=>{
  const extra=extras(a),args=['a',a.length,...extra];
  return item(`const int a[${Math.max(1,a.length)}]=${lit(a)};`+
   `printf("%lld ",(long long)${name}(${args.join(',')}));for(int i=0;i<${a.length};i++)printf("%d ",a[i]);puts("");`,
  [expected(a,...extra),...a]);
 }));
}

scalar('B',1,'sumMultiples','long long sumMultiples(int n,int d){long long s=0;for(int i=d;i<=n;i+=d)s+=i;return s;}',
 cross([0,1,2,7,99,1000,100000],[1,2,7,1000]),(n,d)=>{const k=BigInt(Math.floor(n/d));return BigInt(d)*k*(k+1n)/2n;});
scalar('B',2,'matchingSuffixDigits','int matchingSuffixDigits(unsigned int a,unsigned int b){int k=0;do{if(a%10!=b%10)break;k++;a/=10;b/=10;}while(a&&b);return k;}',
 [[0,0],[0,1000],[1000,0],[1,2],[12,12],[12030,9030],[12345,9345],[10,110],[1000000000,0],[999999999,999999999],[1000000000,900000000]],
 (a,b)=>{const x=[...String(a)].reverse(),y=[...String(b)].reverse();const k=x.findIndex((d,i)=>i>=y.length||d!==y[i]);return k<0?x.length:k;});
const factorials = [1n];for(let n=1;n<=18;n++)factorials.push(factorials.at(-1)*BigInt(n));
scalar('B',3,'factorialTailSum','long long factorialTailSum(int k,int n){long long p=1,s=0;for(int i=0;i<=n;i++){if(i)p*=i;if(i>=k)s+=p;}return s;}',
 Array.from({length:19},(_,n)=>[...new Set([0,Math.floor(n/2),n])].map(k=>[k,n])).flat(),
 (k,n)=>factorials.slice(k,n+1).reduce((a,b)=>a+b,0n));
scalar('B',4,'ceilLogTwo','int ceilLogTwo(int n){long long p=1;int k=0;while(p<n){p*=2;k++;}return k;}',
 [1,2,3,4,5,7,8,9,1023,1024,1025,536870912,1000000000].map(n=>[n]),n=>Math.ceil(Math.log2(n)));
scalar('B',5,'remainderRounds','int remainderRounds(int a,int b){int rounds=0;while(b){int r=a%b;a=b;b=r;rounds++;}return rounds;}',
 [[0,0],[0,7],[7,0],[1,1],[18,12],[12,18],[35,64],[999999937,1000000000],[1000000000,1000000000]],
 (a,b)=>{const states=[[a,b]];while(states.at(-1)[1]){const [x,y]=states.at(-1);states.push([y,x%y]);}return states.length-1;});
scalar('B',6,'properDivisorSum','int properDivisorSum(int n){int s=0;for(int d=1;d<n;d++)if(n%d==0)s+=d;return s;}',
 [1,2,3,4,6,12,25,28,36,49,97,9999,10000].map(n=>[n]),n=>Array.from({length:n-1},(_,i)=>i+1).filter(d=>n%d===0).reduce((a,b)=>a+b,0));
arrayScalar('B',7,'sumUntilZero','long long sumUntilZero(const int a[],int n){long long s=0;for(int i=0;i<n;i++){if(a[i]==0)break;s+=a[i];}return s;}',
 arrays,a=>a.slice(0,a.includes(0)?a.indexOf(0):a.length).reduce((s,x)=>s+BigInt(x),0n));
const signArrays=arrays.filter(a=>a.every(x=>Math.abs(x)<=1000));
arrayScalar('B',8,'signFlips','int signFlips(const int a[],int n){int last=0,k=0;for(int i=0;i<n&&a[i]!=0;i++){int current=a[i]>0?1:-1;if(last&&last!=current)k++;last=current;}return k;}',
 [...signArrays,[1000,-1000,1000]],a=>{const p=a.slice(0,a.includes(0)?a.indexOf(0):a.length);return p.slice(1).filter((x,i)=>(x>0)!==(p[i]>0)).length;});
scalar('B',9,'digitRuns','int digitRuns(int n){int last=-1,k=0;do{int d=n%10;if(d!=last)k++;last=d;n/=10;}while(n);return k;}',
 [0,1,11,101,110011,1000000000,999999999,123456789,12002001].map(n=>[n]),n=>String(n).match(/(.)\1*/g).length);
scalar('B',10,'stripTrailingZeros','int stripTrailingZeros(int n){while(n&&n%10==0)n/=10;return n;}',
 [0,1,10,100,12000,1001,1020,1000000000,999999999].map(n=>[n]),n=>Number(String(n).replace(/0+$/,'')));
scalar('B',11,'divisiblePairCount','int divisiblePairCount(int n){int k=0;for(int i=1;i<=n;i++)for(int j=i+1;j<=n;j++)if((i+j)%3==0)k++;return k;}',
 [0,1,2,3,4,5,10,31,100,200].map(n=>[n]),n=>{const r=[0,0,0];for(let x=1;x<=n;x++)r[x%3]++;return r[0]*(r[0]-1)/2+r[1]*r[2];});
scalar('B',12,'coinWays','int coinWays(int amount){int k=0;for(int six=0;six*6<=amount;six++)for(int four=0;six*6+four*4<=amount;four++)k++;return k;}',
 [0,1,3,4,5,6,10,12,23,50,199,200].map(n=>[n]),amount=>{let k=0;for(let ones=0;ones<=amount;ones++)for(let fours=0;fours*4<=amount;fours++)if(amount-ones-fours*4>=0&&(amount-ones-fours*4)%6===0)k++;return k;});
scalar('B',13,'alternatingBlocks','long long alternatingBlocks(int n){long long s=0;for(int i=1;i<=n;i++){switch(i%4){case 1:case 2:s+=i;break;default:s-=i;}}return s;}',
 [0,1,2,3,4,5,6,7,8,99,100,99999,100000].map(n=>[n]),n=>{const groups=Math.floor(n/4),rem=n%4;return -4*groups+[0,4*groups+1,8*groups+3,4*groups][rem];});
const nonnegative=[[],[0],[1],[0,0,0],[2,0,3,1],[1000000,1000000],Array(100).fill(1000000)];
add('B',14,'int thresholdPrefix(const int a[],int n,long long target){long long s=0;for(int i=0;i<n;i++){s+=a[i];if(s>=target)return i+1;}return 0;}',()=>
 nonnegative.flatMap(a=>[1,2,5,1000000,1000000000].map(target=>{
  const sums=a.map((_,i)=>a.slice(0,i+1).reduce((s,x)=>s+x,0)),position=sums.findIndex(s=>s>=target);
  return item(`const int a[${Math.max(1,a.length)}]=${lit(a)};printf("%d ",thresholdPrefix(a,${a.length},${target}));for(int i=0;i<${a.length};i++)printf("%d ",a[i]);puts("");`,[position+1,...a]);
 })));
scalar('B',15,'exchangedDrinks','int exchangedDrinks(int initial,int rate){int total=initial,empty=initial;while(empty>=rate){int fresh=empty/rate;total+=fresh;empty=empty%rate+fresh;}return total;}',
 cross([0,1,2,3,5,9,20,100000],[2,3,7,20]),(initial,rate)=>initial===0?0:initial+Math.floor((initial-1)/(rate-1)));

const menuCases=[[],[0],[1],[2,2,4],[4,2,2],[2,2,4,0,1],[2,2,4,4],[1,3,2,4,4],Array(100).fill(2)];
arrayScalar('P',1,'menuBill','int menuBill(const int codes[],int n){int bill=0;for(int i=0;i<n;i++){switch(codes[i]){case 0:return bill;case 1:bill+=300;break;case 2:bill+=500;break;case 3:bill+=200;break;case 4:if(bill>=1000)bill-=100;break;}}return bill;}',
 menuCases,a=>{let s=0;for(const code of a){if(code===0)break;if(code===4){if(s>=1000)s-=100;}else s+=[0,300,500,200][code];}return s;});
scalar('P',2,'deliveryCharge','int deliveryCharge(int grams,int urgent){int cost=600;if(grams>1000)cost+=((grams-1000+499)/500)*200;if(urgent)cost+=400;return cost;}',
 cross([1,999,1000,1001,1499,1500,1501,4999,5000],[0,1]),(g,u)=>600+Math.ceil(Math.max(0,g-1000)/500)*200+u*400);
const triangleCases=[...new Map([[1,1,1],[1,1,2],[2,3,4],[5,5,3],[1,2,9],
 [1000000000,1000000000,2000000000],[2000000000,2000000000,2000000000],[2000000000,1,2000000000],[2000000000,1,1]]
 .flatMap(([a,b,c])=>[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]]).map(a=>[a.join(','),a])).values()];
scalar('P',3,'triangleKind','int triangleKind(int a,int b,int c){if((long long)a+b<=c||(long long)a+c<=b||(long long)b+c<=a)return 0;if(a==b&&b==c)return 3;if(a==b||a==c||b==c)return 2;return 1;}',
 triangleCases,
 (...a)=>{const s=[...a].sort((x,y)=>x-y);return s[0]+s[1]<=s[2]?0:new Set(s).size===1?3:new Set(s).size===2?2:1;});
scalar('P',4,'monthDays','int monthDays(int year,int month){switch(month){case 2:return 28+(year%400==0||(year%4==0&&year%100!=0));case 4:case 6:case 9:case 11:return 30;default:return 31;}}',
 cross([1600,1700,1900,1996,2000,2023,2024,2100,2400,9999],Array.from({length:12},(_,i)=>i+1)),
 (y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate());
scalar('P',5,'advanceWorkdays','int advanceWorkdays(int day,int workdays){int done=0;while(done<workdays){day=day%7+1;if(day<=5)done++;}return day;}',
 cross([1,2,3,4,5,6,7],[0,1,2,5,7,10000]),(day,n)=>{const future=Array.from({length:n*7+7},(_,i)=>(day+i)%7+1).filter(d=>d<=5);return n?future[n-1]:day;});
scalar('P',6,'firstSquareAbove','int firstSquareAbove(int n){int k=1;while((long long)k*k<=n)k++;return k;}',
 [0,1,2,3,4,8,9,10,9999,10000,10001,999999999,1000000000].map(n=>[n]),n=>Math.floor(Math.sqrt(n))+1);
scalar('P',7,'collatzWithin','int collatzWithin(int start,int limit){long long x=start;int steps=0;while(x!=1&&steps<limit){if(x%2)x=3*x+1;else x/=2;steps++;}return x==1?steps:-1;}',
 cross([1,2,3,6,7,27,97,871,1000],[0,1,2,6,7,10,50,100]),(start,limit)=>{const states=[start];for(let i=0;i<limit;i++){const x=states.at(-1);if(x===1)break;states.push(x%2?3*x+1:x/2);}return states.indexOf(1);});
scalar('P',8,'digitPalindrome','int digitPalindrome(int n){int old=n;long long r=0;do{r=r*10+n%10;n/=10;}while(n);return r==old;}',
 [0,1,10,11,101,110,1001,1221,12321,12341,100000001,999999999,1000000000].map(n=>[n]),n=>Number(String(n)===[...String(n)].reverse().join('')));
scalar('P',9,'eraseDecimalDigit','int eraseDecimalDigit(int n,int digit){long long place=1,result=0;do{int d=n%10;if(d!=digit){result+=d*place;place*=10;}n/=10;}while(n);return (int)result;}',
 cross([0,1,10,101,10203,11111,909090,999999999,1000000000],[0,1,2,9]),(n,d)=>Number([...String(n)].filter(c=>Number(c)!==d).join('')));
scalar('P',10,'rotateDecimal','int rotateDecimal(int n,int width,int steps){int place=1;for(int i=1;i<width;i++)place*=10;steps%=width;for(int i=0;i<steps;i++)n=(n%10)*place+n/10;return n;}',
 [[0,1,0],[0,9,1000],[1,1,5],[12,4,0],[12,4,1],[12,4,2],[12,4,3],[12,4,4],[1000,4,1],[1000,4,2],[900010001,9,8],[999999999,9,1000]],
 (n,w,k)=>{const s=String(n).padStart(w,'0'),r=k%w;return Number(r?s.slice(-r)+s.slice(0,-r):s);});
scalar('P',11,'digitSumRounds','int digitSumRounds(int n){int rounds=0;while(n>=10){int sum=0;while(n){sum+=n%10;n/=10;}n=sum;rounds++;}return rounds;}',
 [0,1,9,10,19,99,999,999999999,1000000000,987654321].map(n=>[n]),n=>{let k=0;while(String(n).length>1){n=digits(n).reduce((s,d)=>s+d,0);k++;}return k;});
const primePowers=new Set();for(let p=2;p<=1000;p++){let prime=true;for(let d=2;d*d<=p;d++)if(p%d===0){prime=false;break;}if(prime)for(let v=p*p;v<=1000000;v*=p)primePowers.add(v);}
scalar('P',12,'primePower','int primePower(int n){int p=2;while(p<=n/p&&n%p!=0)p++;if(p>n/p)return 0;int count=0;while(n%p==0){n/=p;count++;}return n==1&&count>=2;}',
 [2,3,4,6,7,8,9,12,16,25,27,36,64,81,125,256,1024,999983,1000000].map(n=>[n]),n=>Number(primePowers.has(n)));
scalar('P',13,'nextCoprime','int nextCoprime(int n,int a){for(int x=n+1;;x++){int u=x,v=a;while(v){int r=u%v;u=v;v=r;}if(u==1)return x;}}',
 cross([1,2,8,29,100,9999,10000],[1,2,6,30,210,10000]),(n,a)=>{const factors=[];for(let d=2,t=a;d<=t;d++)if(t%d===0){factors.push(d);while(t%d===0)t/=d;}let x=n+1;while(factors.some(d=>x%d===0))x++;return x;});
scalar('P',14,'factorialZeros','int factorialZeros(int n){int count=0;while(n){n/=5;count+=n;}return count;}',
 [0,1,4,5,10,24,25,26,124,125,1000,1000000000].map(n=>[n]),n=>[5,25,125,625,3125,15625,78125,390625,1953125,9765625,48828125,244140625].reduce((s,d)=>s+Math.floor(n/d),0));
scalar('P',15,'multipleUnionCount','int multipleUnionCount(int n,int a,int b){int count=0;for(int i=1;i<=n;i++)if(i%a==0||i%b==0)count++;return count;}',
 [[0,1,1],[1,1,1],[10,2,3],[20,4,6],[31,7,7],[1000,1,1000],[100000,3,7],[100000,999,1000]],
 (n,a,b)=>Math.floor(n/a)+Math.floor(n/b)-Math.floor(n/(a/gcd(a,b)*b)));
scalar('P',16,'tieredPurchase','int tieredPurchase(int budget,int firstPrice,int increment){int count=0,price=firstPrice;while(budget>=price){budget-=price;count++;price+=increment;}return count;}',
 [[0,1,0],[1,1,0],[10000,1,0],[10000,100,0],[99,100,20],[100,100,20],[10,2,1],[20,2,1],[10000,1,100],[10000,100,100]],
 (b,p,d)=>{let k=0;while((k+1)*p+d*k*(k+1)/2<=b)k++;return k;});
add('P',17,'int changeTwoFive(int amount,int*twos,int*fives){int best=10001,t=0,f=0;for(int y=0;y*5<=amount;y++){int rest=amount-y*5;if(rest%2==0&&y+rest/2<best){best=y+rest/2;t=rest/2;f=y;}}if(best==10001)return 0;*twos=t;*fives=f;return 1;}',()=>
 [0,1,2,3,4,5,6,7,8,9,10,11,13,9999,10000].map(amount=>{
  const solutions=[];for(let t=0;t*2<=amount;t++)if((amount-2*t)%5===0)solutions.push(t+(amount-2*t)/5);
  const minimum=solutions.length?Math.min(...solutions):null;
  return item(`int twos=-71,fives=-93;int result=changeTwoFive(${amount},&twos,&fives);`+
   (minimum===null?'printf("%d\\n",result);':`int valid=twos>=0&&fives>=0&&(long long)twos*2+(long long)fives*5==${amount}&&(long long)twos+fives==${minimum};printf("%d %d\\n",result,valid);`),minimum===null?[0]:[1,1]);
 }));
scalar('P',18,'nonsquareRectangles','int nonsquareRectangles(int area){int count=0;for(int w=1;w<area/w;w++)if(area%w==0)count++;return count;}',
 [1,2,3,4,6,12,16,36,64,100,999983,1000000].map(n=>[n]),n=>{let c=0;for(let w=1;w<=Math.sqrt(n);w++)if(n%w===0&&w!==n/w)c++;return c;});
const rightCounts=new Map();for(let a=1;a<=100;a++)for(let b=a;b<=150;b++){const c=Math.sqrt(a*a+b*b),p=a+b+c;if(Number.isInteger(c)&&c>b&&p<=300)rightCounts.set(p,(rightCounts.get(p)||0)+1);}
scalar('P',19,'rightTriangles','int rightTriangles(int perimeter){int count=0;for(int a=1;a<perimeter;a++)for(int b=a;b<perimeter-a-b;b++){int c=perimeter-a-b;if(a*a+b*b==c*c)count++;}return count;}',
 [3,6,11,12,24,30,36,60,84,120,240,300].map(n=>[n]),n=>rightCounts.get(n)||0);
scalar('P',20,'digitSumCount','int digitSumCount(int lo,int hi,int target){int count=0;for(int x=lo;x<=hi;x++){int t=x,sum=0;do{sum+=t%10;t/=10;}while(t);if(sum==target)count++;}return count;}',
 [[0,0,0],[0,0,1],[1,9,0],[0,20,2],[98,102,10],[1,1000,1],[9990,10000,36],[0,10000,0],[0,10000,18]],
 (lo,hi,target)=>Array.from({length:hi-lo+1},(_,i)=>lo+i).filter(x=>digitSum(x)===target).length);
scalar('P',21,'increasingTriples','int increasingTriples(int n){int count=0;for(int a=1;a<=n;a++)for(int b=a+1;b<=n;b++){int max=n-a-b;if(max>b)count+=max-b;}return count;}',
 [0,1,5,6,7,10,15,20,30].map(n=>[n]),n=>{let c=0;for(let a=1;a<=n;a++)for(let b=a+1;b<=n;b++)for(let d=b+1;d<=n;d++)if(a+b+d<=n)c++;return c;});
const transactions=[{balance:0,a:[]},{balance:0,a:[0,-1,1]},{balance:3,a:[-5,4,-6]},
 {balance:5,a:[-5,-1,10,-10]},{balance:100000,a:Array(100).fill(1000)},
 {balance:0,a:Array.from({length:100},(_,i)=>i%2?1000:-1000)}];
add('P',22,'int applyTransactions(int balance,const int delta[],int n,int*accepted){*accepted=0;for(int i=0;i<n;i++)if(balance+delta[i]>=0){balance+=delta[i];(*accepted)++;}return balance;}',()=>transactions.map(({balance,a})=>{
 let after=balance,accepted=0;for(const x of a)if(after+x>=0){after+=x;accepted++;}
 return item(`const int a[${Math.max(1,a.length)}]=${lit(a)};int accepted=-7;int result=applyTransactions(${balance},a,${a.length},&accepted);printf("%d %d ",result,accepted);for(int i=0;i<${a.length};i++)printf("%d ",a[i]);puts("");`,[after,accepted,...a]);
}));
const batteryCases=[{capacity:1,a:[]},{capacity:1,a:[1,1,1]},{capacity:5,a:[5,5]},{capacity:5,a:[2,3]},
 {capacity:5,a:[3,3,2,1]},{capacity:100,a:Array(100).fill(100)},{capacity:7,a:[1,2,4,1,6,7]}];
add('P',23,'int rechargeCount(int capacity,const int cost[],int n){int remaining=capacity,count=0;for(int i=0;i<n;i++){if(remaining<cost[i]){remaining=capacity;count++;}remaining-=cost[i];}return count;}',()=>batteryCases.map(({capacity,a})=>{
 const groups=[0];for(const x of a){if(groups.at(-1)+x>capacity)groups.push(0);groups[groups.length-1]+=x;}
 return item(`const int a[${Math.max(1,a.length)}]=${lit(a)};printf("%d ",rechargeCount(${capacity},a,${a.length}));for(int i=0;i<${a.length};i++)printf("%d ",a[i]);puts("");`,[groups.length-1,...a]);
}));
const floors=[[],[1],[50],[2,2,1],[50,1,50,1],Array.from({length:100},(_,i)=>i%50+1)];
arrayScalar('P',24,'elevatorTime','int elevatorTime(const int requests[],int n){int floor=1,total=0;for(int i=0;i<n;i++){int d=requests[i]-floor;if(d>0)total+=d*6;else total+=-d*4;total+=5;floor=requests[i];}return total;}',
 floors,a=>a.reduce((s,x,i)=>{const d=x-(i?a[i-1]:1);return s+Math.max(d,0)*6+Math.max(-d,0)*4+5;},0));
const words=['',' ','a','abc',' abc ','ab  cdef ghi','a  b','abcdefghijklmno',' '.repeat(200),'a'.repeat(200)];
const wordInputs=[...words.map(s=>({s,n:s.length,terminated:true})),
 {s:'abc def',n:3,terminated:true},{s:'abcdef xyz',n:0,terminated:true},
 {s:'ab cdef',n:2,terminated:true},{s:'ab cdef',n:5,terminated:true},
 {s:'abc',n:3,terminated:false},{s:'ab cd',n:5,terminated:false},
 {s:'abc',n:0,terminated:false},{s:'a'.repeat(200),n:200,terminated:false}];
const charInput=({s,terminated})=>terminated?`const char s[]=${JSON.stringify(s)};`:
 `const char s[${Math.max(1,s.length)}]=${lit([...s].map(c=>c.charCodeAt(0)))};`;
add('P',25,'int longWordCount(const char s[],int n,int minimum){int length=0,count=0;for(int i=0;i<n;i++){if(s[i]!=32)length++;else{if(length>=minimum)count++;length=0;}}if(length>=minimum)count++;return count;}',()=>wordInputs.flatMap(input=>[1,2,3,20].map(m=>{
 const prefix=input.s.slice(0,input.n);
 return item(charInput(input)+`printf("%d ",longWordCount(s,${input.n},${m}));for(int i=0;i<${input.n};i++)printf("%d ",(unsigned char)s[i]);puts("");`,
 [prefix.split(' ').filter(w=>w.length>=m).length,...[...prefix].map(c=>c.charCodeAt(0))]);
})));
const lines=['','a',' ','\n','a\n','\na','a\na','a  a\n \na','  \n \n','a\n\n  a  ','a\n'.repeat(100)];
const lineInputs=[...lines.map(s=>({s,n:s.length,terminated:true})),
 {s:'a\na',n:2,terminated:true},{s:'a\na',n:0,terminated:true},{s:'a\na',n:1,terminated:true},
 {s:'a\na',n:2,terminated:false},{s:'a',n:1,terminated:false},{s:'a',n:0,terminated:false},
 {s:'a\n a',n:4,terminated:false}];
add('P',26,'int dataLineCount(const char s[],int n){int has=0,count=0;for(int i=0;i<n;i++){if(s[i]==97)has=1;if(s[i]==10){count+=has;has=0;}}return count+has;}',()=>lineInputs.map(input=>{
 const prefix=input.s.slice(0,input.n);
 return item(charInput(input)+`printf("%d ",dataLineCount(s,${input.n}));for(int i=0;i<${input.n};i++)printf("%d ",(unsigned char)s[i]);puts("");`,
 [prefix.split('\n').filter(line=>line.includes('a')).length,...[...prefix].map(c=>c.charCodeAt(0))]);
}));
scalar('P',27,'additionCarries','int additionCarries(int a,int b){int carry=0,count=0;while(a||b){int sum=a%10+b%10+carry;carry=sum>=10;if(carry)count++;a/=10;b/=10;}return count;}',
 [[0,0],[9,0],[9,1],[99,1],[999,1],[19,81],[123,456],[555,555],[999999999,1],[1000000000,1000000000]],
 (a,b)=>{const c=String(a+b).split('').reduce((s,d)=>s+Number(d),0);return (digitSum(a)+digitSum(b)-c)/9;});
scalar('P',28,'modularPower','int modularPower(int base,int exponent,int modulus){long long result=1%modulus;for(int i=0;i<exponent;i++)result=result*base%modulus;return (int)result;}',
 [[0,0,1],[0,0,7],[0,1,7],[1,10000,1],[1,0,999983],[2,10,1000],[1000000,2,999983],[999999,99,1000000],[123456,10000,997]],
 (b,e,m)=>{let value=1n,x=BigInt(b),k=BigInt(e),mod=BigInt(m);while(k){if(k%2n)value=value*x%mod;x=x*x%mod;k/=2n;}return value%mod;});
scalar('P',29,'limitedLcm','long long limitedLcm(int a,int b,long long limit){int x=a,y=b;while(y){int r=x%y;x=y;y=r;}long long value=(long long)(a/x)*b;return value<=limit?value:-1;}',
 [[1,1,0],[1,1,1],[6,8,23],[6,8,24],[6,8,25],[1000000000,1000000000,1000000000],
  [999999937,1000000000,1000000000000],[999999,1000000,1000000000000],[2,3,1000000000000]],
 (a,b,limit)=>{const value=BigInt(a)/BigInt(gcd(a,b))*BigInt(b);return value<=BigInt(limit)?value:-1n;});

export const cControlContractIds = [...specs.keys()];
export const cControlReferenceSources = sources;
export function cControlContract(id) {
 const build=specs.get(id);if(!build)return null;
 const cases=build(),groups=cases.map(t=>t.out.map(String));
 return {prelude:'',harness:'\n#include <stdio.h>\n'+cases.map((t,i)=>`static void ccontrol_case_${i}(void){${t.body}}`).join('\n')+
  '\nint main(void){\n'+cases.map((_,i)=>`ccontrol_case_${i}();`).join('\n')+'\nreturn 0;}',groups,expected:groups.flat()};
}
