param(
  [Parameter(Mandatory = $true)]
  [string]$Name,
  [string]$ProjectId = "hackaton-kemenkop"
)

$ErrorActionPreference = "Stop"

function Get-Gcloud {
  $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidate = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  if (Test-Path $candidate) { return $candidate }
  throw "gcloud tidak ditemukan."
}

$secure = Read-Host "Secret value for $Name" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if ([string]::IsNullOrWhiteSpace($plain)) {
  throw "Secret value kosong, batal."
}

$gcloud = Get-Gcloud
if (-not (& $gcloud secrets describe $Name --project $ProjectId --format "value(name)" 2>$null)) {
  & $gcloud secrets create $Name --project $ProjectId --replication-policy automatic | Out-Host
}

$plain | & $gcloud secrets versions add $Name --project $ProjectId --data-file=- | Out-Host
Write-Host "Secret $Name updated."
