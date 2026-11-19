import {legacyCodingAliases,legacyOnlyCodeId} from '../../legacy-coding.js';
const overrides={
 'P2-programming-6-10':'int negatives(const int a[],int n,int b[]){int k=0;for(int i=0;i<n;i++)if(a[i]<0)b[k++]=a[i];return k;}',
 'P3-programming-6-41':'int less(const int a[],int n,int x){int c=0;for(int i=0;i<n;i++)if(a[i]<x)c++;return c;}',
 'P3-programming-6-42':'int lastMax(const int a[],int n){int k=0;for(int i=1;i<n;i++)if(a[i]>=a[k])k=i;return k;}',
 'P3-programming-6-43':'int ordered(const int a[],int n){for(int i=1;i<n;i++)if(a[i]<a[i-1])return 0;return 1;}',
 'P3-programming-6-49':'int equal(const int a[],const int b[],int n){for(int i=0;i<n;i++)if(a[i]!=b[i])return 0;return 1;}',
 'FULL-programming-v1-21':'int longest(const int a[],int n){if(!n)return 0;int cur=1,best=1;for(int i=1;i<n;i++){if(a[i]>a[i-1])cur++;else cur=1;if(cur>best)best=cur;}return best;}',
 'FULL-programming-v1-22':"void compact(char s[]){int j=0;for(int i=0;s[i];i++)if(s[i]!=' ')s[j++]=s[i];s[j]=0;}",
 'FULL-programming-v1-23':'int find(const int a[],int l,int r,int x){if(l>r)return -1;int m=l+(r-l)/2;if(a[m]==x)return m;if(x<a[m])return find(a,l,m-1,x);return find(a,m+1,r,x);}',
 'FULL-programming-v1-24':'int pal(int x){if(x&&x%10==0)return 0;int r=0;while(x>r){r=r*10+x%10;x/=10;}return x==r||x==r/10;}',
 'FULL-programming-v1-25':'void reverse(int a[],int n){for(int i=0,j=n-1;i<j;i++,j--){int t=a[i];a[i]=a[j];a[j]=t;}}',
 [legacyOnlyCodeId]:"int first(const char s[],char c){for(int i=0;s[i];i++)if(s[i]==c)return i;return -1;}"
};
export function referenceSource(q){
 const id=legacyCodingAliases[q.id]||q.id;
 if(overrides[id])return overrides[id];
 const functions=[];const regex=/\b(?:int|void|long long)\s+\w+\([^{};]*\)\s*\{/g;let match;
 while((match=regex.exec(q.model))){let depth=1,i=regex.lastIndex;for(;depth&&i<q.model.length;i++){if(q.model[i]==='{')depth++;if(q.model[i]==='}')depth--;}functions.push(q.model.slice(match.index,i));regex.lastIndex=i;}
 if(!functions.length)throw Error(`缺参考代码 ${q.id}`);return functions.join('\n');
}
