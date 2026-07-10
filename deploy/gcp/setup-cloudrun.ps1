param(
  [string]$ProjectId = "hackaton-kemenkop",
  [string]$Region = "asia-southeast2",
  [string]$ServiceName = "lumbung-web",
  [string]$Repository = "lumbung",
  [string]$ImageName = "lumbung-web",
  [string]$SqlInstance = "lumbung-postgres",
  [string]$DatabaseName = "lumbung_bersama",
  [string]$DatabaseUser = "lumbung_app",
  [string]$BucketName = "",
  [int]$BudgetAmountIdr = 500000
)

$ErrorActionPreference = "Stop"

function Get-Gcloud {
  $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidate = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  if (Test-Path $candidate) { return $candidate }

  throw "gcloud tidak ditemukan. Install Google Cloud CLI lalu buka terminal baru."
}

function Ensure-Api([string]$name) {
  & $gcloud services enable $name --project $ProjectId | Out-Host
}

function Ensure-Secret([string]$name, [string]$value) {
  $exists = (& $gcloud secrets describe $name --project $ProjectId --format "value(name)" 2>$null)
  if (-not $exists) {
    & $gcloud secrets create $name --project $ProjectId --replication-policy automatic | Out-Host
  }
  if ($value) {
    $value | & $gcloud secrets versions add $name --project $ProjectId --data-file=-
  }
}

function Read-SecretValue([string]$prompt, [bool]$required = $false) {
  $secure = Read-Host $prompt -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
  if ($required -and [string]::IsNullOrWhiteSpace($plain)) {
    throw "Nilai wajib diisi: $prompt"
  }
  return $plain
}

function New-RandomSecret([int]$bytes = 32) {
  $buffer = [byte[]]::new($bytes)
  [Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
  return [Convert]::ToBase64String($buffer).TrimEnd("=")
}

$gcloud = Get-Gcloud
$ArtifactHost = "$Region-docker.pkg.dev"
$ImageUri = "$ArtifactHost/$ProjectId/$Repository/$ImageName`:latest"
if (-not $BucketName) { $BucketName = "$ProjectId-lumbung-evidence" }

Write-Host "Project: $ProjectId"
Write-Host "Region : $Region"
Write-Host "Service: $ServiceName"
Write-Host "Image  : $ImageUri"

& $gcloud config set project $ProjectId | Out-Host
& $gcloud config set run/region $Region | Out-Host

Ensure-Api "run.googleapis.com"
Ensure-Api "cloudbuild.googleapis.com"
Ensure-Api "artifactregistry.googleapis.com"
Ensure-Api "sqladmin.googleapis.com"
Ensure-Api "secretmanager.googleapis.com"
Ensure-Api "logging.googleapis.com"
Ensure-Api "monitoring.googleapis.com"
Ensure-Api "cloudscheduler.googleapis.com"
Ensure-Api "storage.googleapis.com"
Ensure-Api "billingbudgets.googleapis.com"

$repoExists = (& $gcloud artifacts repositories describe $Repository --location $Region --project $ProjectId --format "value(name)" 2>$null)
if (-not $repoExists) {
  & $gcloud artifacts repositories create $Repository `
    --repository-format docker `
    --location $Region `
    --project $ProjectId `
    --description "Lumbung Bersama container images" | Out-Host
}

$bucketExists = (& $gcloud storage buckets describe "gs://$BucketName" --project $ProjectId --format "value(name)" 2>$null)
if (-not $bucketExists) {
  & $gcloud storage buckets create "gs://$BucketName" --project $ProjectId --location $Region --uniform-bucket-level-access | Out-Host
  & $gcloud storage buckets update "gs://$BucketName" --lifecycle-file deploy/gcp/storage-lifecycle.json | Out-Host
}

$sqlExists = (& $gcloud sql instances describe $SqlInstance --project $ProjectId --format "value(name)" 2>$null)
if (-not $sqlExists) {
  & $gcloud sql instances create $SqlInstance `
    --project $ProjectId `
    --database-version POSTGRES_16 `
    --region $Region `
    --tier db-g1-small `
    --storage-type SSD `
    --storage-size 20GB `
    --availability-type zonal `
    --backup-start-time 17:00 `
    --enable-point-in-time-recovery | Out-Host
}

$dbExists = (& $gcloud sql databases describe $DatabaseName --instance $SqlInstance --project $ProjectId --format "value(name)" 2>$null)
if (-not $dbExists) {
  & $gcloud sql databases create $DatabaseName --instance $SqlInstance --project $ProjectId | Out-Host
}

$dbPassword = New-RandomSecret
$userExists = (& $gcloud sql users list --instance $SqlInstance --project $ProjectId --format "value(name)" | Select-String -SimpleMatch $DatabaseUser)
if (-not $userExists) {
  & $gcloud sql users create $DatabaseUser --instance $SqlInstance --project $ProjectId --password $dbPassword | Out-Host
} else {
  & $gcloud sql users set-password $DatabaseUser --instance $SqlInstance --project $ProjectId --password $dbPassword | Out-Host
}

$databaseUrl = "postgresql://$DatabaseUser`:$dbPassword@/$DatabaseName`?host=/cloudsql/$ProjectId`:$Region`:$SqlInstance"
Ensure-Secret "lb-database-url" $databaseUrl
Ensure-Secret "lb-session-secret" (New-RandomSecret 48)

$adminEmail = Read-Host "Admin email untuk login operator"
$adminPasswordHash = Read-SecretValue "ADMIN_PASSWORD_HASH dari npm run auth:hash-password (kosongkan jika sudah ada secret)" $false
$aiKey = Read-SecretValue "OPENAI_API_KEY / XAI gateway key (kosongkan jika belum dipakai)" $false
$sharedDbUrl = Read-SecretValue "HACKATHON_SHARED_DATABASE_URL read-only (kosongkan jika nanti diisi manual)" $false
$waToken = Read-SecretValue "WHATSAPP_BUSINESS_TOKEN (kosongkan jika belum pakai WA Business)" $false
$waPhoneId = Read-SecretValue "WHATSAPP_PHONE_NUMBER_ID (kosongkan jika belum pakai WA Business)" $false
$waVerify = Read-SecretValue "WHATSAPP_VERIFY_TOKEN (kosongkan jika belum pakai WA Business)" $false
$waAppSecret = Read-SecretValue "WHATSAPP_APP_SECRET (kosongkan jika belum pakai WA Business)" $false
$bpsKey = Read-SecretValue "BPS_API_KEY (kosongkan jika belum ada)" $false

Ensure-Secret "lb-admin-email" $adminEmail
Ensure-Secret "lb-admin-password-hash" $adminPasswordHash
Ensure-Secret "lb-openai-api-key" $aiKey
Ensure-Secret "lb-hackathon-shared-database-url" $sharedDbUrl
Ensure-Secret "lb-whatsapp-business-token" $waToken
Ensure-Secret "lb-whatsapp-phone-number-id" $waPhoneId
Ensure-Secret "lb-whatsapp-verify-token" $waVerify
Ensure-Secret "lb-whatsapp-app-secret" $waAppSecret
Ensure-Secret "lb-bps-api-key" $bpsKey

Write-Host "GCP base setup selesai. Lanjut build/deploy dengan deploy/gcp/deploy-cloudrun.ps1."
