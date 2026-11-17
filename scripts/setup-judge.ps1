$ErrorActionPreference='Stop'
$projectRoot=Split-Path -Parent $PSScriptRoot
$runtimeRoot=Join-Path (Split-Path -Parent $projectRoot) '制作记录/判题运行环境/python'
if(!(Test-Path -LiteralPath (Join-Path $runtimeRoot 'Scripts/python.exe'))){python -m venv $runtimeRoot;if($LASTEXITCODE -ne 0){throw 'Python环境创建失败。'}}
& (Join-Path $runtimeRoot 'Scripts/python.exe') -m pip install 'wasmtime==50.0.1' 'ziglang==0.17.1'
if($LASTEXITCODE -ne 0){throw '判题依赖安装失败，请检查网络后重试。'}
Write-Output '本地运行环境已准备好。'
