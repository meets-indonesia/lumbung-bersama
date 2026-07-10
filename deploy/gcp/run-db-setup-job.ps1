param(
  [string]$ProjectId = "hackaton-kemenkop",
  [string]$Region = "asia-southeast2",
  [string]$JobName = "lumbung-db-setup",
  [string]$Repository = "lumbung",
  [string]$ImageName = "lumbung-web",
  [string]$SqlInstance = "lumbung-postgres"
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

$exists = (& $gcloud run jobs describe $JobName --project $ProjectId --region $Region --format "value(name)" 2>$null)
$commonArgs = @(
  "--project", $ProjectId,
  "--region", $Region,
  "--image", $ImageUri,
  "--add-cloudsql-instances", $CloudSqlInstance,
  "--set-env-vars", "NODE_ENV=production,PGSSLMODE=disable",
  "--set-secrets", "DATABASE_URL=lb-database-url:latest",
  "--command", "npm",
  "--args", "run,db:setup",
  "--max-retries", "1",
  "--task-timeout", "900"
)

if ($exists) {
  & $gcloud run jobs update $JobName @commonArgs | Out-Host
} else {
  & $gcloud run jobs create $JobName @commonArgs | Out-Host
}

& $gcloud run jobs execute $JobName --project $ProjectId --region $Region --wait | Out-Host
