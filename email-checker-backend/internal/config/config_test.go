package config

import (
	"testing"
	"time"
)

func TestLoadVerificationProviderConfiguration(t *testing.T) {
	t.Setenv("EMAIL_VERIFICATION_PROVIDER", "VERIFALIA")
	t.Setenv("VERIFALIA_USERNAME", "api-user")
	t.Setenv("VERIFALIA_PASSWORD", "secret")
	t.Setenv("VERIFALIA_TIMEOUT", "12s")
	t.Setenv("VERIFALIA_MAX_CONCURRENCY", "3")
	t.Setenv("SMTP_FALLBACK_ENABLED", "true")

	cfg := Load()
	if cfg.VerificationProvider != "verifalia" || cfg.VerifaliaUsername != "api-user" || cfg.VerifaliaPassword != "secret" {
		t.Fatalf("provider credentials were not loaded correctly")
	}
	if cfg.VerifaliaTimeout != 12*time.Second || cfg.VerifaliaConcurrency != 3 || !cfg.SMTPFallbackEnabled {
		t.Fatalf("unexpected provider settings: timeout=%s concurrency=%d fallback=%t", cfg.VerifaliaTimeout, cfg.VerifaliaConcurrency, cfg.SMTPFallbackEnabled)
	}
}

func TestLoadUsesSafeProviderDefaults(t *testing.T) {
	t.Setenv("EMAIL_VERIFICATION_PROVIDER", "")
	t.Setenv("VERIFALIA_TIMEOUT", "invalid")
	t.Setenv("VERIFALIA_MAX_CONCURRENCY", "0")
	t.Setenv("SMTP_FALLBACK_ENABLED", "invalid")

	cfg := Load()
	if cfg.VerificationProvider != "auto" || cfg.VerifaliaTimeout != 20*time.Second || cfg.VerifaliaConcurrency != 5 || cfg.SMTPFallbackEnabled {
		t.Fatalf("unexpected defaults: provider=%s timeout=%s concurrency=%d fallback=%t", cfg.VerificationProvider, cfg.VerifaliaTimeout, cfg.VerifaliaConcurrency, cfg.SMTPFallbackEnabled)
	}
}
