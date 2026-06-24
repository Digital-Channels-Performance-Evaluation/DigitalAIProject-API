# Upload CSV from Desktop
# This will upload your file and trigger automatic training

$EMAIL = "admin@ahadubank.com"
$PASSWORD = "Admin@123"
$CSV_FILE = "C:\Users\user\Desktop\ahadu_bank_full_dataset (2).csv"

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Upload Desktop Dataset" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check file exists
if (!(Test-Path $CSV_FILE)) {
    Write-Host "ERROR: File not found: $CSV_FILE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  - Is the file at: C:\Users\user\Desktop\" -ForegroundColor Yellow
    Write-Host "  - Is the filename correct?" -ForegroundColor Yellow
    exit 1
}

$fileInfo = Get-Item $CSV_FILE
Write-Host "File found:" -ForegroundColor Green
Write-Host "  Path: $CSV_FILE" -ForegroundColor White
Write-Host "  Size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor White
Write-Host "  Rows: ~$([math]::Round($fileInfo.Length / 200)) (estimated)" -ForegroundColor White
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
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Upload
Write-Host ""
Write-Host "[2/2] Uploading file..." -ForegroundColor Yellow
Write-Host "      This may take 2-5 minutes..." -ForegroundColor Gray
Write-Host ""

try {
    # Use form data for upload with file stream to avoid locks
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    # Read file with FileShare mode to avoid locking issues
    $fileStream = [System.IO.File]::Open($CSV_FILE, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    try {
        $fileBytes = New-Object byte[] $fileStream.Length
        $fileStream.Read($fileBytes, 0, $fileStream.Length) | Out-Null
        $fileContent = [System.Text.Encoding]::GetEncoding('iso-8859-1').GetString($fileBytes)
    }
    finally {
        $fileStream.Close()
        $fileStream.Dispose()
    }
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"ahadu_bank_dataset.csv`"",
        "Content-Type: text/csv$LF",
        $fileContent,
        "--$boundary--$LF"
    ) -join $LF

    $response = Invoke-RestMethod `
        -Uri "http://localhost:8000/api/data/upload" `
        -Method POST `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines `
        -WebSession $session `
        -TimeoutSec 600

    Write-Host "      SUCCESS: Upload complete!" -ForegroundColor Green
    Write-Host "      Status: $($response.status)" -ForegroundColor White
    Write-Host "      Message: $($response.message)" -ForegroundColor White
}
catch {
    Write-Host "      FAILED: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorDetail = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "      Detail: $($errorDetail.detail)" -ForegroundColor Red
        } catch {
            Write-Host "      Detail: $($_.ErrorDetails.Message)" -ForegroundColor Red
        }
    }
    exit 1
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Upload Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What's happening now:" -ForegroundColor Yellow
Write-Host "  1. Data validation" -ForegroundColor White
Write-Host "  2. Feature engineering" -ForegroundColor White
Write-Host "  3. Model training (AUTO_TRAIN enabled)" -ForegroundColor White
Write-Host ""
Write-Host "Monitor progress in:" -ForegroundColor Yellow
Write-Host "  - Backend terminal (uvicorn logs)" -ForegroundColor White
Write-Host "  - Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Training typically takes 10-20 minutes." -ForegroundColor Gray
Write-Host ""
