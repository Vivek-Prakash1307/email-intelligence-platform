package engine

import (
	"context"
	"testing"

	"email-intelligence/internal/config"
	"email-intelligence/internal/models"
)

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
