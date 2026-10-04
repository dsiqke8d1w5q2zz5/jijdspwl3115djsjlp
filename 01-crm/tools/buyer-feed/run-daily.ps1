$ErrorActionPreference = 'Stop'
$nodeExecutable = Join-Path $env:ProgramFiles 'nodejs/node.exe'
& $nodeExecutable (Join-Path $PSScriptRoot 'run-local.cjs')
exit $LASTEXITCODE
