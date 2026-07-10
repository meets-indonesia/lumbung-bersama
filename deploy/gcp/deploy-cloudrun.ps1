param(
  [string]$ProjectId = "hackaton-kemenkop",
  [string]$Region = "asia-southeast2",
  [string]$ServiceName = "lumbung-web",
  [string]$Repository = "lumbung",
  [string]$ImageName = "lumbung-web",
  [string]$SqlInstance = "lumbung-postgres",
  [int]$MinInstances = 0,
  [int]$MaxInstances = 10
)

$ErrorActionPreference = "Stop"

function Get-Gcloud {
  $cmd = Get-Command gcloud -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidate = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
  if (Test-Path $candidate) { return $candidate }
  throw "gcloud tidak ditemukan."
}

$gcloud = Get-Gcloud
$ImageUri = "$Region-docker.pkg.dev/$ProjectId/$Repository/$ImageName`:latest"
$CloudSqlInstance = "$ProjectId`:$Region`:$SqlInstance"

function Test-SecretVersion([string]$name) {
  $oldPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $version = (& $gcloud secrets versions list $name --project $ProjectId --filter "state=ENABLED" --limit 1 --format "value(name)" 2>$null)
    if ($LASTEXITCODE -ne 0) { return $false }
  } finally {
    $ErrorActionPreference = $oldPreference
  }
  return -not [string]::IsNullOrWhiteSpace($version)
}

$secretPairs = [ordered]@{
  DATABASE_URL = "lb-database-url";
  ADMIN_EMAIL = "lb-admin-email";
  ADMIN_PASSWORD_HASH = "lb-admin-password-hash";
  JURY_EMAIL = "lb-jury-email";
  JURY_PASSWORD_HASH = "lb-jury-password-hash";
  OPENAI_API_KEY = "lb-openai-api-key";
  HACKATHON_SHARED_DATABASE_URL = "lb-hackathon-shared-database-url";
  WHATSAPP_BUSINESS_TOKEN = "lb-whatsapp-business-token";
  WHATSAPP_PHONE_NUMBER_ID = "lb-whatsapp-phone-number-id";
  WHATSAPP_VERIFY_TOKEN = "lb-whatsapp-verify-token";
  WHATSAPP_APP_SECRET = "lb-whatsapp-app-secret";
  BPS_API_KEY = "lb-bps-api-key";
  DATA_PIPELINE_SECRET = "lb-data-pipeline-secret";
  S3_OR_R2_BUCKET = "lb-s3-bucket";
  S3_OR_R2_REGION = "lb-s3-region";
  S3_OR_R2_ACCESS_KEY_ID = "lb-s3-access-key-id";
  S3_OR_R2_SECRET_ACCESS_KEY = "lb-s3-secret-access-key";
  S3_OR_R2_PUBLIC_BASE_URL = "lb-s3-public-base-url";
  SIMKOPDES_API_BASE = "lb-simkopdes-api-base";
  SIMKOPDES_CLIENT_ID = "lb-simkopdes-client-id";
  SIMKOPDES_CLIENT_SECRET = "lb-simkopdes-client-secret";
}

$secretArgs = New-Object System.Collections.Generic.List[string]
foreach ($entry in $secretPairs.GetEnumerator()) {
  if (Test-SecretVersion $entry.Value) {
    $secretArgs.Add("$($entry.Key)=$($entry.Value):latest")
  } else {
    Write-Host "Skipping Cloud Run secret binding for missing secret: $($entry.Value)"
  }
}

if (-not ($secretArgs | Where-Object { $_ -like "DATABASE_URL=*" })) {
  throw "Missing required secret lb-database-url."
}

& $gcloud config set project $ProjectId | Out-Host
& $gcloud config set run/region $Region | Out-Host

& $gcloud builds submit `
  --project $ProjectId `
  --config deploy/gcp/cloudbuild.yaml `
  --substitutions "_REGION=$Region,_REPOSITORY=$Repository,_IMAGE=$ImageName,_SERVICE=$ServiceName" `
  . | Out-Host

& $gcloud run deploy $ServiceName `
  --project $ProjectId `
  --region $Region `
  --image $ImageUri `
  --platform managed `
  --allow-unauthenticated `
  --port 8080 `
  --cpu 1 `
  --memory 1Gi `
  --concurrency 80 `
  --min-instances $MinInstances `
  --max-instances $MaxInstances `
  --add-cloudsql-instances $CloudSqlInstance `
  --set-env-vars "NODE_ENV=production,NEXT_PUBLIC_APP_URL=https://lumbung-bersama.meetsin.id,APP_URL=https://lumbung-bersama.meetsin.id,PGSSLMODE=disable,DATABASE_POOL_MAX=5,HACKATHON_SHARED_DB_SSL=require,HACKATHON_TABLE_PREFIX=anak_sarengklek_,OPENAI_BASE_URL=https://xai.hashmicro.co/v1,OPENAI_MODEL=gpt-5.2,OPENAI_WIRE_API=responses,AI_BASE_URL=https://xai.hashmicro.co/v1,AI_MODEL=gpt-5.2,AI_WIRE_API=responses,AI_PROVIDER_TIMEOUT_MS=12000,WHATSAPP_GRAPH_API_VERSION=v23.0,WA_PERSONAL_ADAPTER_ENABLED=0" `
  --set-secrets ($secretArgs -join ",") | Out-Host

Write-Host "Deploy selesai. Jalankan migration job dengan deploy/gcp/run-db-setup-job.ps1."
