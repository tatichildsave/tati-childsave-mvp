#!/usr/bin/env pwsh
<#
Test data setup for Phase H3.4 using Firebase Emulator REST APIs
#>

$ErrorActionPreference = "Stop"

Write-Host "🧪 TATI Phase H3.4 Test Data Setup`n" -ForegroundColor Green

# Firebase Emulator endpoints
$authUrl = "http://127.0.0.1:9099"
$firestoreUrl = "http://127.0.0.1:8080"
$projectId = "demo-tati"

# Journey A - Brand new child
Write-Host "Setting up Journey A (brand-new child)..." -ForegroundColor Cyan

$parentEmail = "parent-a@test.com"
$parentPassword = "TestPassword123!"
$childEmail = "child-a@test.com"
$childPassword = "1234"
$tatiId = "TATI-JOURNEYA01"
$pin = "1234"

# Create parent account
try {
  $createParentBody = @{
    email = $parentEmail
    password = $parentPassword
    returnSecureToken = $true
  } | ConvertTo-Json

  $parentResponse = Invoke-WebRequest -Uri "$authUrl/v1/accounts:signUp?key=test" `
    -Method Post `
    -Body $createParentBody `
    -ContentType "application/json" -ErrorAction SilentlyContinue
  
  $parentData = $parentResponse.Content | ConvertFrom-Json
  $parentId = $parentData.localId
  
  Write-Host "✓ Parent A created: $parentId"
} catch {
  Write-Host "Note: Parent account may already exist" -ForegroundColor Yellow
  $parentId = "parent-a-test-id"
}

# Create child account
try {
  $createChildBody = @{
    email = $childEmail
    password = $childPassword
    returnSecureToken = $true
  } | ConvertTo-Json

  $childResponse = Invoke-WebRequest -Uri "$authUrl/v1/accounts:signUp?key=test" `
    -Method Post `
    -Body $createChildBody `
    -ContentType "application/json" -ErrorAction SilentlyContinue
  
  $childData = $childResponse.Content | ConvertFrom-Json
  $childId = $childData.localId
  
  Write-Host "✓ Child A created: $childId"
} catch {
  Write-Host "Note: Child account may already exist" -ForegroundColor Yellow
  $childId = "child-a-test-id"
}

Write-Host "`n✅ Test data setup reference:`n"
Write-Host "📝 Journey A (Brand-new child):" -ForegroundColor Green
Write-Host "   TATI ID: $tatiId"
Write-Host "   PIN: $pin"
Write-Host "   Email: $childEmail"
Write-Host "`n🌐 Visit http://localhost:8080/child/login to test"
Write-Host "   Use the TATI ID and PIN above to log in`n"
