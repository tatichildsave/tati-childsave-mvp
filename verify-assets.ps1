[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing') | Out-Null

Write-Host "=== STEP 1: VERIFYING ALL ASSET FILES ==="
Write-Host ""

$files = @(
  'checkin-20.jpeg',
  'checkin-21.jpeg',
  'checkin-22.jpeg',
  'journey-hero.jpeg',
  'scene-77.jpeg',
  'scene-78.jpeg',
  'scene-79.jpeg',
  'scene-83.jpeg',
  'scene-84.jpeg',
  'scene-85.jpeg',
  'tati-avatars.jpeg'
)

$allValid = $true

foreach ($filename in $files) {
  $path = "public/assets/$filename"
  
  if (-not (Test-Path $path)) {
    Write-Host "❌ $filename - FILE NOT FOUND"
    $allValid = $false
    continue
  }
  
  $file = Get-Item $path
  $size = $file.Length
  
  try {
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    $width = $img.Width
    $height = $img.Height
    $format = $img.RawFormat.ToString()
    $img.Dispose()
    
    $status = "✅ VALID"
    Write-Host "$status $filename"
    Write-Host "  Size: $size bytes | Dimensions: $width x $height | Format: $format"
  } catch {
    Write-Host "❌ $filename - CORRUPT/INVALID"
    Write-Host "  Error: $($_.Exception.Message)"
    $allValid = $false
  }
}

Write-Host ""
if ($allValid) {
  Write-Host "✅ ALL 11 ASSETS ARE VALID IMAGE FILES"
} else {
  Write-Host "❌ SOME ASSETS ARE INVALID OR MISSING"
}
Write-Host ""
