# Train AI Models Script
# Update the email and password below, then run: .\train_model.ps1

# === CONFIGURATION - UPDATE THESE ===
$EMAIL = "admin@ahadubank.com"
$PASSWORD = "Admin@123"
# ====================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  AI Model Training Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login and get cookie
Write-Host "[1/2] Logging in..." -ForegroundColor Yellow

try {
    $loginBody = @{
        email = $EMAIL
        password = $PASSWORD
    } | ConvertTo-Json

    # Create session to persist cookies
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
    $loginResponse = Invoke-WebRequest `
        -Uri "http://localhost:8000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -WebSession $session `
        -UseBasicParsing

    Write-Host "      SUCCESS: Logged in as $EMAIL" -ForegroundColor Green
}
catch {
    Write-Host "      FAILED: Login failed" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "      Please check:" -ForegroundColor Yellow
    Write-Host "      - Is backend running? (uvicorn app.main:app --reload)" -ForegroundColor Yellow
    Write-Host "      - Is email/password correct in this script?" -ForegroundColor Yellow
    exit 1
}

# Step 2: Train models using the session with cookies
Write-Host ""
Write-Host "[2/2] Starting model training..." -ForegroundColor Yellow

try {
    $trainResponse = Invoke-RestMethod `
        -Uri "http://localhost:8000/api/ml/train-all" `
        -Method POST `
        -WebSession $session

    Write-Host "      SUCCESS: Training started!" -ForegroundColor Green
    Write-Host "      Task ID: $($trainResponse.task_id)" -ForegroundColor White
    Write-Host "      Mode: $($trainResponse.mode)" -ForegroundColor White
    Write-Host "      Message: $($trainResponse.message)" -ForegroundColor White
}
catch {
    Write-Host "      FAILED: Training failed" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "      Possible reasons:" -ForegroundColor Yellow
    Write-Host "      - No data uploaded yet (upload CSV first)" -ForegroundColor Yellow
    Write-Host "      - Insufficient permissions" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Training In Progress" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Training is running in the background." -ForegroundColor White
Write-Host "This may take several minutes for 50,000 rows." -ForegroundColor White
Write-Host ""
Write-Host "Check progress in:" -ForegroundColor Yellow
Write-Host "  - Backend logs (terminal window)" -ForegroundColor White
Write-Host "  - Dashboard at http://localhost:3000" -ForegroundColor White
Write-Host ""
