Write-Host "=== STEP 2: VERIFYING ASSET JSON METADATA ==="
Write-Host ""

$assetJsons = @(
  'src/assets/checkin-20.png.asset.json',
  'src/assets/checkin-21.png.asset.json',
  'src/assets/checkin-22.png.asset.json',
  'src/assets/journey-hero.png.asset.json',
  'src/assets/scene-77.png.asset.json',
  'src/assets/scene-78.png.asset.json',
  'src/assets/scene-79.png.asset.json',
  'src/assets/scene-83.png.asset.json',
  'src/assets/scene-84.png.asset.json',
  'src/assets/scene-85.png.asset.json',
  'src/assets/tati-avatars.png.asset.json'
)

$fileSizes = @{
  'checkin-20.jpeg' = 186180
  'checkin-21.jpeg' = 92741
  'checkin-22.jpeg' = 92609
  'journey-hero.jpeg' = 158568
  'scene-77.jpeg' = 142440
  'scene-78.jpeg' = 110617
  'scene-79.jpeg' = 115491
  'scene-83.jpeg' = 118348
  'scene-84.jpeg' = 103262
  'scene-85.jpeg' = 87922
  'tati-avatars.jpeg' = 102368
}

$allValid = $true

foreach ($jsonPath in $assetJsons) {
  if (-not (Test-Path $jsonPath)) {
    Write-Host "❌ $jsonPath - FILE NOT FOUND"
    $allValid = $false
    continue
  }
  
  $json = Get-Content $jsonPath -Raw | ConvertFrom-Json
  $url = $json.url
  $size = $json.size
  $contentType = $json.content_type
  
  # Extract filename from URL
  $filename = $url -replace '^/assets/', ''
  
  # Check for Lovable CDN references
  if ($url -match '/__l5e/|lovable\.dev') {
    Write-Host "❌ $jsonPath - LOVABLE CDN REFERENCE FOUND: $url"
    $allValid = $false
  } elseif ($url -notmatch '^/assets/') {
    Write-Host "❌ $jsonPath - INVALID URL FORMAT: $url"
    $allValid = $false
  } elseif ($contentType -ne 'image/jpeg') {
    Write-Host "❌ $jsonPath - WRONG CONTENT TYPE: $contentType (expected image/jpeg)"
    $allValid = $false
  } else {
    # Check if file exists and size matches
    $actualFilePath = "public/assets/$filename"
    if (-not (Test-Path $actualFilePath)) {
      Write-Host "❌ $jsonPath - REFERENCED FILE MISSING: $actualFilePath"
      $allValid = $false
    } else {
      $actualSize = (Get-Item $actualFilePath).Length
      if ($size -ne $actualSize) {
        Write-Host "❌ $jsonPath - SIZE MISMATCH: JSON says $size, actual file is $actualSize"
        $allValid = $false
      } else {
        Write-Host "✅ $jsonPath"
        Write-Host "  URL: $url | Size: $size | Type: $contentType"
      }
    }
  }
}

Write-Host ""
if ($allValid) {
  Write-Host "✅ ALL ASSET JSON FILES ARE VALID AND MATCH ACTUAL FILES"
} else {
  Write-Host "❌ SOME ASSET JSON FILES HAVE ISSUES"
}
Write-Host ""
