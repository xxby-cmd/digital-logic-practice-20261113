import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {handleRun} from './run-api.mjs';
import {handleExplain} from './explain-api.mjs';
import {handleReview} from './ai-grading.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
export function createPracticeServer(directory=path.resolve(process.cwd(),'dist')){
 const root=path.resolve(directory);
 return http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');
   if(['/api/run','/api/test','/api/judge'].includes(url.pathname))return await handleRun(req,res,res.socket.localPort);
   if(url.pathname==='/api/explain')return await handleExplain(req,res,res.socket.localPort);
   if(url.pathname==='/api/review')return await handleReview(req,res,res.socket.localPort);
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
   const name=decodeURIComponent(url.pathname)==='/'?'/index.html':decodeURIComponent(url.pathname);
   const file=path.resolve(root,'.'+name);
   if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
   const data=await readFile(file);
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('页面不存在');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||4174),server=createPracticeServer();
 server.on('error',()=>{console.error('网站未能启动，请检查端口是否被占用。');process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
}
