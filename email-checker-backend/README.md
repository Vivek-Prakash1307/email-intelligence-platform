# Email Checker API

The backend is a modular Go service. `internal/engine` orchestrates validators
and analyzers; `cmd/server` exposes the Gin API.

```powershell
go run ./cmd/server
```

Core behavior:

- DNS and security-record checks run concurrently.
- A deep check probes up to three priority-ordered MX hosts on receiving port
  25 within one overall timeout.
- SMTP acceptance, rejection, temporary failure, and policy blocking are kept
  distinct.
- A random recipient probe detects catch-all servers.
- No trusted-provider shortcut and no MX-only SMTP fallback can create a pass.
- The probe stops before `DATA`; it sends no email content.

Run verification with `go test ./...` and `go vet ./...`. See the repository's
`VALIDATION_METHODOLOGY.md` for scoring and limitations.
