$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$uvicorn = Join-Path $PSScriptRoot ".venv\Scripts\uvicorn.exe"
if (-not (Test-Path $uvicorn)) {
    Write-Host "Missing backend\.venv - create it from the backend folder:" -ForegroundColor Yellow
    Write-Host '  python -m venv .venv' -ForegroundColor Gray
    Write-Host '  .\.venv\Scripts\pip install -r requirements.txt' -ForegroundColor Gray
    Write-Host 'Then run this script again, or: npm run dev:api' -ForegroundColor Yellow
    exit 1
}

& $uvicorn main:app --reload --host 127.0.0.1 --port 8000
