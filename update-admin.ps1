# PowerShell script to update admin roles in Firestore

# Step 1: Get auth token
Write-Host "🔗 Getting authentication token from Firebase Auth emulator..." -ForegroundColor Green

$signInUrl = "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key"
$signInBody = @{
    email = "admin@test.com"
    password = "Admin@12345"
    returnSecureToken = $true
} | ConvertTo-Json

try {
    $signInResponse = Invoke-WebRequest -Uri $signInUrl -Method POST -ContentType "application/json" -Body $signInBody -ErrorAction Stop
    $signInData = $signInResponse.Content | ConvertFrom-Json
    $idToken = $signInData.idToken
    Write-Host "✅ Auth token obtained`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to get auth token: $_" -ForegroundColor Red
    exit 1
}

# Step 2: Update Firestore document
Write-Host "📝 Updating roles array in Firestore..." -ForegroundColor Green

$uid = "gubN3Ry88IsIOsKy4IFzE7A0bAGl"
$projectId = "demo-tati"
$updateUrl = "http://127.0.0.1:8080/v1/projects/$projectId/databases/(default)/documents/users/$uid`?updateMask.fieldPaths=roles"

$updateBody = @{
    fields = @{
        roles = @{
            arrayValue = @{
                values = @(
                    @{ stringValue = "admin" }
                )
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $updateResponse = Invoke-WebRequest -Uri $updateUrl -Method PATCH -ContentType "application/json" -Body $updateBody `
        -Headers @{ "Authorization" = "Bearer $idToken" } -ErrorAction Stop
    
    Write-Host "✅ Successfully updated roles array!" -ForegroundColor Green
    Write-Host "Response: " + ($updateResponse.Content | ConvertFrom-Json | ConvertTo-Json -Depth 3)
    Write-Host "`n🌐 Now try signing in at: http://localhost:8080/admin-login" -ForegroundColor Yellow
    Write-Host "Email: admin@test.com" -ForegroundColor Yellow
    Write-Host "Password: Admin@12345`n" -ForegroundColor Yellow
    
} catch {
    if ($_.Exception.Response.StatusCode -eq "NotFound") {
        Write-Host "⚠️  Port 8080 connection failed - dev server may be blocking it" -ForegroundColor Yellow
        Write-Host "Try stopping the dev server first, then running this script again" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to update document: $_" -ForegroundColor Red
        Write-Host "Response: " + $_.Exception.Response.Content.ReadAsStringAsync().Result -ForegroundColor Red
    }
    exit 1
}
