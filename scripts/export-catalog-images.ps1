$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'frontend/public/images/product-collection.png'
$outputPath = Join-Path $projectRoot 'backend/uploads/catalog-import'
New-Item -ItemType Directory -Path $outputPath -Force | Out-Null

# Preserve the exact row-major mapping used by ProductPhoto's existing 6 x 3 sheet.
$slugs = @(
  'arlo-crossbody', 'nara-sling', 'kiro-flap-sling', 'tavo-utility-sling', 'lumi-mini-sling', 'dova-pocket-sling',
  'mero-daypack', 'zeno-laptop-pack', 'kavi-campus-pack', 'rhea-mini-pack', 'orin-roll-top-pack', 'talo-trail-pack',
  'sora-canvas-tote', 'kuma-zip-tote', 'lino-shopper-tote', 'mika-pocket-tote', 'ayo-stripe-tote', 'hana-mini-tote'
)

$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  for ($index = 0; $index -lt $slugs.Count; $index++) {
    $column = $index % 6
    $row = [Math]::Floor($index / 6)
    $left = [int][Math]::Round($column * $source.Width / 6)
    $top = [int][Math]::Round($row * $source.Height / 3)
    $right = [int][Math]::Round(($column + 1) * $source.Width / 6)
    $bottom = [int][Math]::Round(($row + 1) * $source.Height / 3)
    $bounds = [System.Drawing.Rectangle]::new($left, $top, $right - $left, $bottom - $top)
    $tile = $source.Clone($bounds, $source.PixelFormat)
    try {
      $tile.Save((Join-Path $outputPath ($slugs[$index] + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $tile.Dispose()
    }
  }
} finally {
  $source.Dispose()
}

$slugs | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputPath 'manifest.json') -Encoding utf8
Write-Output "Exported $($slugs.Count) individual product images to backend/uploads/catalog-import."
