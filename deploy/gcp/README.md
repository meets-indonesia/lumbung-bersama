# Lumbung Bersama GCP Deployment

Target project: `hackaton-kemenkop`
Region: `asia-southeast2`
Primary service: Cloud Run `lumbung-web`

## Why Cloud Run

Use Cloud Run for the web/API container because the app is stateless at runtime and can autoscale. Keep durable state outside the container:

- Cloud SQL for PostgreSQL operational data.
- Secret Manager for credentials.
- Cloud Storage for evidence/media/export objects.
- Cloud Run Jobs for migration, seed, imports, and refresh tasks.

Do not run production PostgreSQL inside Docker Compose on Cloud Run.

## First-time setup

Install and login:

```powershell
gcloud auth login
gcloud auth application-default login
```

Then run:

```powershell
.\deploy\gcp\setup-cloudrun.ps1
```

The script creates/enables:

- Cloud Run, Cloud Build, Artifact Registry, Cloud SQL, Secret Manager, Logging, Monitoring, Scheduler, Storage, and Billing Budget APIs.
- Artifact Registry repository `lumbung`.
- Cloud SQL PostgreSQL instance `lumbung-postgres`.
- Cloud Storage bucket for evidence exports.
- Secret Manager entries for runtime config.

Secrets are prompted interactively and are not written to this repository.

To set or rotate one secret later, use:

```powershell
.\deploy\gcp\set-secret.ps1 -Name lb-openai-api-key
.\deploy\gcp\set-secret.ps1 -Name lb-admin-password-hash
.\deploy\gcp\set-secret.ps1 -Name lb-jury-password-hash
.\deploy\gcp\set-secret.ps1 -Name lb-hackathon-shared-database-url
```

Jury access is optional and uses the same admin-level dashboard permissions as
the operator account, but with a separate email and password. Configure
`lb-jury-email` and `lb-jury-password-hash` when a dedicated jury login is
needed.

## Deploy app

```powershell
.\deploy\gcp\deploy-cloudrun.ps1
.\deploy\gcp\run-db-setup-job.ps1
```

## AI brain provider

Production Cloud Run uses the Hashmicro XAI-compatible gateway through runtime environment variables:

- `OPENAI_BASE_URL=https://xai.hashmicro.co/v1`
- `OPENAI_MODEL=gpt-5.2`
- `OPENAI_WIRE_API=responses`
- `AI_BASE_URL=https://xai.hashmicro.co/v1`
- `AI_MODEL=gpt-5.2`
- `AI_WIRE_API=responses`

The API key is stored in Secret Manager as `lb-openai-api-key` and injected into `OPENAI_API_KEY`. Do not copy Codex `auth.json`, Codex `config.toml`, or plaintext keys into the app image, repository, logs, or slides.

After deploy, map `lumbung-bersama.meetsin.id` to the Cloud Run service from Google Cloud Console or `gcloud run domain-mappings`.

## Data migration from current server

Preferred migration path:

1. Export current operational database from the old server with `pg_dump` using the server-side secret env. Do not print the connection string.
2. Restore into Cloud SQL with `psql` or `gcloud sql import sql` from a temporary Cloud Storage object.
3. Run `.\deploy\gcp\run-db-setup-job.ps1` to ensure schema compatibility.
4. Run app smoke checks against the Cloud Run URL.

Shared hackathon DB remains a read-only evidence source. Store its URL in Secret Manager as `lb-hackathon-shared-database-url`.

## Jury-day settings

For the presentation window:

```powershell
.\deploy\gcp\deploy-cloudrun.ps1 -MinInstances 1 -MaxInstances 10
```

After the presentation:

```powershell
.\deploy\gcp\deploy-cloudrun.ps1 -MinInstances 0 -MaxInstances 5
```

## Smoke checks

Use the Cloud Run or mapped domain URL:

```powershell
$env:QA_HACKATHON_BASE_URL="https://lumbung-bersama.meetsin.id"
npm run qa:hackathon-demo
```
