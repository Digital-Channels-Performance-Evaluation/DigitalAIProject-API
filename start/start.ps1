# ─────────────────────────────────────────────────────────────────────────────
# AHADU PULSE — PowerShell Startup Script
# Starts backend (FastAPI) and frontend (Next.js) in separate windows
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║         AHADU BANK — AHADU PULSE v1.0.0                 ║" -ForegroundColor Cyan
Write-Host "  ║     AI-Powered Digital Banking Evaluation Platform       ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Check prerequisites ───────────────────────────────────────────────────────
Write-Host "  Checking prerequisites..." -ForegroundColor Yellow

# Python
try {
    $pyVer = & py --version 2>&1
    Write-Host "  [OK] $pyVer" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Python not found. Install Python 3.11+ and add to PATH." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# Node
try {
    $nodeVer = & node --version 2>&1
    Write-Host "  [OK] Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  [ERROR] Node.js not found. Install Node.js 18+ and add to PATH." -ForegroundColor Red
    Read-Host "  Press Enter to exit"
    exit 1
}

# MySQL connection check
Write-Host "  [..] Checking MySQL (XAMPP)..." -ForegroundColor Yellow
$mysqlOk = & py -c "
import sys
try:
    import pymysql
    pymysql.connect(host='localhost',user='root',password='',database='ahadu_bank_eval',connect_timeout=3)
    print('ok')
except Exception as e:
    print(f'fail: {e}')
" 2>&1

if ($mysqlOk -like "ok*") {
    Write-Host "  [OK] MySQL connected (ahadu_bank_eval)" -ForegroundColor Green
} else {
    Write-Host "  [WARNING] MySQL not reachable — start XAMPP MySQL first!" -ForegroundColor Yellow
    Write-Host "  $mysqlOk" -ForegroundColor DarkYellow
    Write-Host ""
    $continue = Read-Host "  Continue anyway? (y/n)"
    if ($continue -ne "y" -and $continue -ne "Y") { exit 0 }
}

# ── Install backend deps if needed ───────────────────────────────────────────
Write-Host ""
Write-Host "  [..] Checking backend dependencies..." -ForegroundColor Yellow
$fastapiOk = & py -c "import fastapi; print('ok')" 2>&1
if ($fastapiOk -ne "ok") {
    Write-Host "  [..] Installing backend packages (first run)..." -ForegroundColor Yellow
    & py -m pip install -r "$root\backend\requirements.txt" --quiet
    Write-Host "  [OK] Backend packages installed." -ForegroundColor Green
} else {
    Write-Host "  [OK] Backend packages ready." -ForegroundColor Green
}

# ── Install frontend deps if needed ──────────────────────────────────────────
Write-Host "  [..] Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "  [..] Installing frontend packages (first run)..." -ForegroundColor Yellow
    Push-Location "$root\frontend"
    & npm install --silent
    Pop-Location
    Write-Host "  [OK] Frontend packages installed." -ForegroundColor Green
} else {
    Write-Host "  [OK] Frontend packages ready." -ForegroundColor Green
}

# ── Start Backend ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  [..] Starting Backend  →  http://localhost:8000" -ForegroundColor Cyan

$backendScript = @"
`$host.UI.RawUI.WindowTitle = 'AHADU PULSE — Backend (FastAPI :8000)'
Write-Host '  AHADU PULSE BACKEND' -ForegroundColor Cyan
Write-Host '  FastAPI running on http://localhost:8000' -ForegroundColor Green
Write-Host '  API Docs: http://localhost:8000/docs' -ForegroundColor Green
Write-Host ''
Set-Location '$root\backend'
py -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript

# ── Wait for backend to initialise ───────────────────────────────────────────
Write-Host "  [..] Waiting for backend to initialise (5s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# ── Start Frontend ────────────────────────────────────────────────────────────
Write-Host "  [..] Starting Frontend  →  http://localhost:3000" -ForegroundColor Cyan

$frontendScript = @"
`$host.UI.RawUI.WindowTitle = 'AHADU PULSE — Frontend (Next.js :3000)'
Write-Host '  AHADU PULSE FRONTEND' -ForegroundColor Cyan
Write-Host '  Next.js running on http://localhost:3000' -ForegroundColor Green
Write-Host ''
Set-Location '$root\frontend'
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║   ✓  Both services launched in separate windows         ║" -ForegroundColor Green
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host "  ║   Frontend  →  http://localhost:3000                    ║" -ForegroundColor Green
Write-Host "  ║   Backend   →  http://localhost:8000                    ║" -ForegroundColor Green
Write-Host "  ║   API Docs  →  http://localhost:8000/docs               ║" -ForegroundColor Green
Write-Host "  ║                                                          ║" -ForegroundColor Green
Write-Host "  ║   Login: admin@ahadubank.com  /  Admin@123              ║" -ForegroundColor Green
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
