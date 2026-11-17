import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {handleRun} from './run-api.mjs';
const root=path.resolve(process.cwd(),'dist'), port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(['/api/run','/api/judge'].includes(url.pathname))return await handleRun(req,res,port);let name=decodeURIComponent(url.pathname);if(name==='/')name='/index.html';if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end('页面不存在');}}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
