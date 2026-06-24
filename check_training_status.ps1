# Check model training status
# Usage: .\check_training_status.ps1

$EMAIL = "admin@ahadubank.com"
$PASSWORD = "Admin@123"

Write-Host "Checking training status..." -ForegroundColor Cyan
Write-Host ""

try {
    # Login
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

    # Get models
    $models = Invoke-RestMethod `
        -Uri "http://localhost:8000/api/ml/models" `
        -Method GET `
        -WebSession $session

    Write-Host "Trained Models: $($models.Count)" -ForegroundColor Green
    Write-Host ""

    if ($models.Count -eq 0) {
        Write-Host "No models trained yet. Training in progress..." -ForegroundColor Yellow
    }
    else {
        Write-Host "Model Details:" -ForegroundColor Cyan
        Write-Host "============================================" -ForegroundColor Cyan
        
        foreach ($model in $models | Sort-Object -Property created_at -Descending | Select-Object -First 10) {
            Write-Host ""
            Write-Host "Model: $($model.model_name)" -ForegroundColor White
            Write-Host "  Type: $($model.model_type)"
            Write-Host "  Version: $($model.version)"
            Write-Host "  Active: $($model.is_active)"
            Write-Host "  Created: $($model.created_at)"
            
            if ($model.accuracy) {
                Write-Host "  Accuracy: $([math]::Round($model.accuracy * 100, 2))%"
            }
            if ($model.r2_score) {
                Write-Host "  R2 Score: $([math]::Round($model.r2_score, 4))"
            }
        }
    }

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
