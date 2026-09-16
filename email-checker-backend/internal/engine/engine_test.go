package engine

import (
	"context"
	"errors"
	"testing"

	"email-intelligence/internal/config"
	"email-intelligence/internal/models"
)

type failingMailboxVerifier struct{}

func (failingMailboxVerifier) Verify(context.Context, string) (models.SMTPValidationResult, error) {
	return models.SMTPValidationResult{}, errors.New("provider unavailable")
}

func TestNormalizeEmailPreservesLocalPartCase(t *testing.T) {
	got := normalizeEmail("  Case.Sensitive@EXAMPLE.COM  ")
	if got != "Case.Sensitive@example.com" {
		t.Fatalf("normalizeEmail() = %q", got)
	}
}

func TestCacheKeySeparatesAnalysisDepth(t *testing.T) {
	if fmtCacheKey("a@example.com", true) == fmtCacheKey("a@example.com", false) {
		t.Fatal("deep and basic analyses must not share a cache entry")
	}
}

func TestDeepAnalysisBypassesCache(t *testing.T) {
	eng := New(config.Load())
	eng.cache.SetDefault(fmtCacheKey("invalid", true), &models.EmailIntelligence{Email: "cached"})

	result, err := eng.AnalyzeEmail(context.Background(), "invalid", true)
	if err != nil {
		t.Fatal(err)
	}
	if result.Email == "cached" {
		t.Fatal("deep analysis returned a cached result")
	}
}

func TestProviderFailureRemainsUnknownWithoutSMTPFallback(t *testing.T) {
	cfg := config.Load()
	cfg.VerificationProvider = "verifalia"
	cfg.SMTPFallbackEnabled = false
	eng := New(cfg)
	eng.mailboxVerifier = failingMailboxVerifier{}

	result := eng.verifyMailbox(context.Background(), "person@example.com", nil)
	if result.MailboxStatus != "unknown" || result.Reachable.Status != "unknown" || result.Source != "verifalia" {
		t.Fatalf("provider failure became conclusive: %+v", result)
	}
}

func TestMissingProviderCredentialsAreExplicit(t *testing.T) {
	cfg := config.Load()
	cfg.VerificationProvider = "verifalia"
	cfg.VerifaliaUsername = ""
	cfg.VerifaliaPassword = ""
	eng := New(cfg)

	result := eng.verifyMailbox(context.Background(), "person@example.com", nil)
	if result.MailboxStatus != "not_checked" || result.Reachable.RawSignal != "provider_not_configured" || result.Attempted {
		t.Fatalf("missing credentials result = %+v", result)
	}
}
