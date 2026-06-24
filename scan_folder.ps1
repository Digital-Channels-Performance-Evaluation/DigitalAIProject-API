# Scan data folder and train models
# Usage: .\scan_folder.ps1

# Configuration - UPDATE THESE!
$baseUrl = "http://localhost:8000/api"
$email = "admin@ahadubank.com"
$password = "Admin@123"

Write-Host "Logging in..." -ForegroundColor Cyan

try {
    $loginBody = @{
        email = $email
        password = $password
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.access_token
    Write-Host "Logged in successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Login failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your email and password" -ForegroundColor Yellow
    Write-Host "Update them in scan_folder.ps1 at the top" -ForegroundColor Yellow
    exit 1
}

# Check if backend has scan-folder endpoint
Write-Host "`nNote: Using direct folder scanning" -ForegroundColor Yellow
Write-Host "Place your CSV files in: backend\data\raw\" -ForegroundColor Yellow

# For now, we'll use the upload endpoint instead
# since scan-folder might not be available in this version

Write-Host "`nChecking data folder..." -ForegroundColor Cyan
$rawFolder = "backend\data\raw"

if (!(Test-Path $rawFolder)) {
    Write-Host "Error: Raw data folder not found at $rawFolder" -ForegroundColor Red
    exit 1
}

$csvFiles = Get-ChildItem -Path $rawFolder -Filter *.csv
if ($csvFiles.Count -eq 0) {
    Write-Host "No CSV files found in $rawFolder" -ForegroundColor Yellow
    Write-Host "Please place your CSV file in that folder first" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found $($csvFiles.Count) CSV file(s):" -ForegroundColor Green
foreach ($file in $csvFiles) {
    Write-Host "   - $($file.Name)" -ForegroundColor White
}

# Train models
Write-Host "`nTraining models..." -ForegroundColor Cyan

try {
    $trainResult = Invoke-RestMethod -Uri "$baseUrl/ml/train-all" -Method POST -Headers @{"Authorization" = "Bearer $token"}
    Write-Host "Training started!" -ForegroundColor Green
    Write-Host "   Task ID: $($trainResult.task_id)"
    Write-Host "   Mode: $($trainResult.mode)"
    Write-Host "   Message: $($trainResult.message)"
    Write-Host "`nTraining is running in the background." -ForegroundColor Yellow
    Write-Host "Check backend logs for progress" -ForegroundColor Yellow
}
catch {
    Write-Host "Training failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nAll done!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Upload your CSV through the web interface at http://localhost:3000" -ForegroundColor White
Write-Host "   2. Or use the data upload API endpoint" -ForegroundColor White
Write-Host "   3. Training will happen automatically or manually trigger it" -ForegroundColor White
