$ErrorActionPreference='Stop'
$crmRoot=Resolve-Path (Join-Path $PSScriptRoot '../..')
$source=Join-Path $PSScriptRoot 'Program.cs'
$output=Join-Path $crmRoot 'downloads/房仲管家搜尋助手.exe'
& "$env:WINDIR/Microsoft.NET/Framework64/v4.0.30319/csc.exe" /nologo /target:winexe "/out:$output" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll $source
if($LASTEXITCODE -ne 0){throw 'EXE compilation failed'}
$helper=Join-Path $crmRoot 'tools/buyer-browser'
$names=@('manifest.json','background.js','bridge.js','popup.html','popup.js','read.js','read591.js','pagination.js','areas.js','match-engine.js','storage.js','acorn.js','ACORN-LICENSE.txt')
$files=$names | ForEach-Object { Join-Path $helper $_ }
$zip=Join-Path $crmRoot 'downloads/buyer-search-helper.zip'
Compress-Archive -LiteralPath $files -DestinationPath $zip -Force
$version=(Get-Content -LiteralPath (Join-Path $helper 'manifest.json') -Raw | ConvertFrom-Json).version
@{version=$version;sha256=(Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()} | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $crmRoot 'downloads/buyer-helper-release.json')
'BUILT '+$version
