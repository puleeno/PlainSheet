param(
    [ValidateSet("debug", "release")]
    [string]$Profile = "debug",
    [switch]$NoRun
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root "target\$Profile"
$exe = Join-Path $target "plainsheet.exe"
$sdkDll = "C:\Users\Administrator\Projects\sciter-js-sdk-main\bin\windows\x64\sciter.dll"

if (-not (Test-Path $exe)) {
    Write-Host "Building $Profile..." -ForegroundColor Cyan
    cargo build --$Profile
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
}

Write-Host "Staging sciter.dll + ui/ next to exe..." -ForegroundColor Cyan
Copy-Item -LiteralPath $sdkDll -Destination (Join-Path $target "sciter.dll") -Force
if (Test-Path (Join-Path $target "ui")) {
    Remove-Item -LiteralPath (Join-Path $target "ui") -Recurse -Force
}
Copy-Item -LiteralPath (Join-Path $root "ui") -Destination (Join-Path $target "ui") -Recurse

if ($NoRun) { Write-Host "Staged: $target"; exit 0 }

Write-Host "Launching $exe" -ForegroundColor Cyan
& $exe