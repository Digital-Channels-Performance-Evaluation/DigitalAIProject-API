# Upload CSV data file
# Usage: .\upload_data.ps1

# === CONFIGURATION ===
$EMAIL = "admin@ahadubank.com"
$PASSWORD = "Admin@123"
$CSV_FILE = "backend\data\raw\your_data.csv"  # UPDATE THIS PATH!
# ====================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  CSV Data Upload Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if file exists
if (!(Test-Path $CSV_FILE)) {
    Write-Host "ERROR: File not found: $CSV_FILE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please update the CSV_FILE path in this script" -ForegroundColor Yellow
    Write-Host "Or place your CSV in: backend\data\raw\" -ForegroundColor Yellow
    exit 1
}

$fileInfo = Get-Item $CSV_FILE
Write-Host "File to upload:" -ForegroundColor Cyan
Write-Host "  Path: $CSV_FILE" -ForegroundColor White
Write-Host "  Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host ""

# Login
Write-Host "[1/2] Logging in..." -ForegroundColor Yellow

try {
    $loginBody = @{
        email = $EMAIL
        password = $PASSWORD
    } | ConvertTo-Json

    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    
    Invoke-WebRequest `
        -Uri "http://localhost:8000/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody `
        -WebSession $session `
        -UseBasicParsing | Out-Null

    Write-Host "      SUCCESS: Logged in" -ForegroundColor Green
}
catch {
    Write-Host "      FAILED: Login failed" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Upload file
Write-Host ""
Write-Host "[2/2] Uploading CSV file..." -ForegroundColor Yellow
Write-Host "      This may take a few minutes for large files..." -ForegroundColor Gray

try {
    $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $CSV_FILE))
    $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$(Split-Path $CSV_FILE -Leaf)`"",
        "Content-Type: text/csv$LF",
        $fileContent,
        "--$boundary--$LF"
    ) -join $LF

    $uploadResponse = Invoke-RestMethod `
        -Uri "http://localhost:8000/api/data/upload" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines `
        -WebSession $session

    Write-Host "      SUCCESS: File uploaded!" -ForegroundColor Green
    Write-Host "      Status: $($uploadResponse.status)" -ForegroundColor White
    Write-Host "      Message: $($uploadResponse.message)" -ForegroundColor White
}
catch {
    Write-Host "      FAILED: Upload failed" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "      Detail: $($errorDetail.detail)" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Upload Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Data is being processed in the background." -ForegroundColor White
Write-Host "AUTO_TRAIN is enabled - models will train automatically!" -ForegroundColor Green
Write-Host ""
Write-Host "Check progress in:" -ForegroundColor Yellow
Write-Host "  - Backend logs (this terminal)" -ForegroundColor White
Write-Host "  - Dashboard at http://localhost:3000" -ForegroundColor White
Write-Host ""
