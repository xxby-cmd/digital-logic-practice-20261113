$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$runtimeRoot=Join-Path (Split-Path -Parent $projectRoot) '制作记录/判题运行环境/python'
$pythonPath=Join-Path $runtimeRoot 'Scripts/python.exe'
$zigPath=Join-Path $runtimeRoot 'Lib/site-packages/ziglang/zig.exe'
if(!(Test-Path -LiteralPath $pythonPath) -or !(Test-Path -LiteralPath $zigPath)){throw '请先运行 scripts/setup-judge.ps1 准备本地运行环境。'}
$env:JUDGE_PYTHON=$pythonPath
$env:JUDGE_ZIG=$zigPath
$env:PORT='4174'
Set-Location -LiteralPath $projectRoot
if(!(Test-Path -LiteralPath (Join-Path $projectRoot 'dist/index.html'))){
    node scripts/build.mjs
    if($LASTEXITCODE -ne 0){throw '练习室构建未完成，请检查上方提示。'}
}
node scripts/serve.mjs
