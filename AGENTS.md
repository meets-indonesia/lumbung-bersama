<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Lumbung Bersama App Rules

Before frontend work, read:

1. `..\00-index.md`
2. `..\AGENTS.md`
3. `..\docs\09-lumbung-bersama-brand-system.md`
4. `..\docs\10-uiux-pro-max-frontend-workflow.md`
5. `..\docs\12-development-progress.md`

Active public brand:

`Lumbung Bersama`

Retired candidate:

`LumbungKop`

Frontend non-negotiables:

1. No AI slop.
2. No fake metrics.
3. Every button must navigate, open a modal, call a state action, call an API, download/export, or be disabled with a clear env-gated reason.
4. Every input must have empty, focus, filled, valid, invalid, disabled, loading, success, error, helper, and mobile-friendly states where applicable.
5. Public pages are light and SEO-ready by default.
6. Dashboard surfaces must be checked in dark mode.
7. Browser tests on desktop and mobile should run before shipping when practical.

Demo data must be labeled as demo data. Do not claim real Kemenkop usage, official endorsement, production WhatsApp delivery, or live SIMKOPDES integration unless actually implemented.
