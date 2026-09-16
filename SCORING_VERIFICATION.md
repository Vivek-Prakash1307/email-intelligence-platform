# Scoring verification

The old trusted-provider and multi-submission-port verification logic has been
removed because it produced false positives. Automated scoring and status tests
now live in:

- `email-checker-backend/internal/analyzers/score_test.go`
- `email-checker-backend/internal/validators/syntax_test.go`
- `email-checker-backend/internal/engine/engine_test.go`

Run `go test ./...` from `email-checker-backend`. The current scoring contract
is documented in [VALIDATION_METHODOLOGY.md](VALIDATION_METHODOLOGY.md).
