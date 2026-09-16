# Email Checker

An evidence-based email verification service with a Go API and React UI. It
checks supported address syntax, DNS/MX routing, SMTP recipient responses,
catch-all behavior, disposable domains, and SPF/DKIM/DMARC records.

The service does **not** claim that every mailbox can be discovered. Mail
providers commonly hide recipient existence or block probes. Those cases are
reported as `unknown`, never silently converted into a pass.

## Result states

- `deliverable`: recipient accepted and a random recipient rejected
- `risky`: recipient accepted but catch-all behavior exists or is inconclusive
- `undeliverable`: no receiving route or a permanent recipient rejection
- `unknown`: provider/network did not provide conclusive recipient evidence
- `invalid`: unsupported or invalid address syntax

See [VALIDATION_METHODOLOGY.md](VALIDATION_METHODOLOGY.md) for the exact scoring
model and limitations.

## Run locally

Backend (Go 1.23+):

```powershell
cd email-checker-backend
go run ./cmd/server
```

Frontend (Node.js/npm):

```powershell
cd email-checker-frontend
npm install
npm start
```

The frontend uses `http://localhost:8080` locally and the production Render API
when hosted elsewhere. `REACT_APP_API_URL` can override either default.

## Deploy

The repository-level `render.yaml` configures the backend with:

- Root directory: `email-checker-backend`
- Build command: `go build -tags netgo -ldflags="-s -w" -o app .`
- Start command: `./app`
- Health check: `/api/v1/health`

If the Render service was created manually instead of from the Blueprint, copy
those values into its dashboard and keep `CORS_ALLOWED_ORIGINS` synchronized
with the public Vercel domains. On Vercel, set the project root directory to
`email-checker-frontend`; `vercel.json` supplies the build and SPA routing
configuration. Public visitors also require Vercel Deployment Protection to be
disabled for the production environment.

## API

```http
POST /api/v1/analyze
Content-Type: application/json

{"email":"person@example.com","deep_analysis":true}
```

Set `deep_analysis` to `true` for the SMTP recipient and catch-all probe. The
probe never sends `DATA`, so it does not transmit a message. Other endpoints:

- `POST /api/v1/bulk-analyze` (up to 1,000 addresses)
- `GET /api/v1/health`
- `GET /api/v1/metrics`
- `GET /api/v1/scoring-weights`

Configuration:

- `PORT` (default `8080`)
- `CORS_ALLOWED_ORIGINS` (comma-separated)
- `DNS_TIMEOUT` (Go duration, default `4s`)
- `SMTP_TIMEOUT` (Go duration, default `8s`)

## Verify

```powershell
cd email-checker-backend
go test ./...
go vet ./...

cd ../email-checker-frontend
npm run build
```

For definitive ownership verification, use a consent-based confirmation email
(double opt-in). No passive checker can guarantee inbox delivery.
