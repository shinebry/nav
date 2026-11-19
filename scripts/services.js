const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
const action=process.argv[2];if(!['start','stop','status'].includes(action)){console.error('Choose start, stop or status');process.exit(1)}
const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
const args=[...(process.env.NAV_DOCKER_SOCKET?['--host='+process.env.NAV_DOCKER_SOCKET]:process.platform==='linux'?['--host=unix:///var/run/docker.sock']:[]),'compose','--env-file','.local/compose.env','-f','compose.yaml',...(fs.existsSync('.local/bridges/compose.yaml')?['-f','.local/bridges/compose.yaml']:[]),...(action==='start'?['up','-d']:action==='stop'?['stop']:['ps','--all'])];
const child=spawnSync('docker',args,{env,stdio:'inherit'});process.exitCode=child.status??1;
