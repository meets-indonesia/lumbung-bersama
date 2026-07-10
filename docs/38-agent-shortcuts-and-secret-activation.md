# Agent Shortcuts and Secret Activation

This runbook keeps live activation separate from code. Do not commit API keys,
database passwords, WhatsApp tokens, or copied `.env` files.

## Agent Run Shortcuts

All shortcuts require an authenticated operator session. They call the existing
MVP endpoint:

```http
POST /api/agents/run
Content-Type: application/json
```

### Unggulan Desa

Use when the operator wants commodity/product priority from an existing record.

```json
{"agentName":"Agen Unggulan Desa","recordId":"LB-1024"}
```

Operator prompt:

```text
Jalankan Agen Unggulan Desa untuk record LB-1024. Fokus pada prioritas komoditas,
readiness koperasi, bukti yang sudah ada, gap data, dan next action yang perlu
disetujui pengurus.
```

### Pasar dan Mitra

Use after a WA intake, operator queue item, or stock item is ready for buyer
matching lite. Buyer names stay as archetypes until verified.

```json
{"agentName":"Agen Pasar dan Mitra","recordId":"LB-1024"}
```

Operator prompt:

```text
Jalankan Agen Pasar dan Mitra untuk record LB-1024. Berikan buyer archetype,
alasan match, syarat kualitas, gap stok/readiness, outreach draft, dan status
approval manusia. Jangan klaim buyer nyata atau demand pasti.
```

### Laporan Aksi

Use when preparing the weekly executive report.

```json
{"agentName":"Agen Laporan","recordId":"LB-1024"}
```

Operator prompt:

```text
Jalankan Agen Laporan untuk record LB-1024. Ringkas evidence, peluang utama,
pending verification, buyer action, stock/readiness gap, risk note, dan decision
status untuk laporan pengurus.
```

## Secret-Safe Server Activation

Run these commands directly in a private SSH session on the server. Do not paste
real secrets into Git, docs, screenshots, shared chat, or command transcripts.

```bash
ssh meetsin-studio
cd /home/meetsin/internal/lumbung-bersama
umask 077
npm run env:merge
```

Paste only the keys you are enabling, then press `Ctrl+D`:

```dotenv
OPENAI_API_KEY=<xai-or-openai-compatible-key>
OPENAI_BASE_URL=https://xai.hashmicro.co/v1
OPENAI_MODEL=gpt-5.2
OPENAI_WIRE_API=responses
AI_PROVIDER_TIMEOUT_MS=12000
WHATSAPP_BUSINESS_TOKEN=<meta-cloud-api-token>
WHATSAPP_PHONE_NUMBER_ID=<meta-phone-number-id>
WHATSAPP_VERIFY_TOKEN=<webhook-verify-token>
WHATSAPP_APP_SECRET=<meta-app-secret>
HACKATHON_SHARED_DATABASE_URL=<read-only-shared-db-url>
HACKATHON_SHARED_DB_SSL=require
HACKATHON_TABLE_PREFIX=anak_sarengklek_
```

Then restart and verify:

```bash
docker compose -f docker-compose.production.yml up -d lumbung-bersama-web
docker compose -f docker-compose.production.yml exec -T lumbung-bersama-web npm run db:migrate
curl -sS http://127.0.0.1:3080/api/health
```

Expected changes after secrets are present:

- `ai.configured` becomes `true` when `OPENAI_API_KEY` is set.
- `whatsapp.webhookConfigured` becomes `true` after verify token and app secret.
- `whatsapp.sendConfigured` becomes `true` after business token and phone number id.
- `/api/hackathon/*` moves from config-required to authenticated aggregate evidence.

WhatsApp Cloud API does not provide QR pairing. If QR pairing is required, build
and operate a separate WhatsApp Web adapter/service and label it separately from
the Cloud API integration.
