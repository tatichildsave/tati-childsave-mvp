Write-Host "=== STEP 9: LOVABLE FORENSIC SEARCH ==="
Write-Host ""

$searchTerms = @(
  'lovable.dev',
  '@lovable.dev',
  '__l5e/',
  'LOVABLE_CRON_SECRET',
  'LOVABLE_DB_MIGRATION',
  'cloud-auth-js',
  'vite-tanstack-config'
)

Write-Host "Searching for remaining Lovable references..."
Write-Host ""

$totalMatches = 0

foreach ($term in $searchTerms) {
  $matches = Select-String -Path "src/**/*" -Pattern $term -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Path -notmatch '.json.lock|node_modules' }
  
  if ($matches) {
    $count = @($matches).Count
    Write-Host "❌ Found $count match(es) for: $term"
    foreach ($match in $matches) {
      Write-Host "  - $($match.Path): Line $($match.LineNumber): $($match.Line.Trim())"
    }
    $totalMatches += $count
  } else {
    Write-Host "✅ No matches for: $term"
  }
}

Write-Host ""
if ($totalMatches -eq 0) {
  Write-Host "✅ NO ACTIVE LOVABLE REFERENCES FOUND IN SOURCE CODE"
} else {
  Write-Host "❌ FOUND $totalMatches LOVABLE REFERENCE(S) IN SOURCE CODE"
}

# Check previewAuthStorage specifically as it's allowed to have fallback
Write-Host ""
Write-Host "Checking previewAuthStorage.ts for acceptable references..."
$preview = Select-String -Path "src/integrations/supabase/previewAuthStorage.ts" -Pattern 'lovable.dev' -ErrorAction SilentlyContinue
if ($preview) {
  Write-Host "✅ Found lovable.dev in previewAuthStorage.ts (graceful fallback for preview environments - ACCEPTABLE)"
  foreach ($line in $preview) {
    Write-Host "  Line $($line.LineNumber): $($line.Line.Trim())"
  }
} else {
  Write-Host "No references in previewAuthStorage.ts"
}

Write-Host ""
