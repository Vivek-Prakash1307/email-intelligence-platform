package analyzers

import (
	"math"
	"testing"

	"email-intelligence/internal/models"
)

func scoringWeights() models.ScoringWeights {
	return models.ScoringWeights{SyntaxFormat: 10, MXRecords: 25, SMTPReachability: 45, DisposableCheck: 10, DomainReputation: 0, CatchAllRisk: 10}
}

func strongIntelligence() *models.EmailIntelligence {
	return &models.EmailIntelligence{
		SyntaxValidation: models.ValidationResult{Status: "pass", Score: 10},
		DNSValidation:    models.DNSValidationResult{MXRecords: models.ValidationResult{Status: "pass", Score: 25}},
		SMTPValidation:   models.SMTPValidationResult{Reachable: models.ValidationResult{Status: "pass", Score: 45}, MailboxStatus: "accepted", AcceptAllStatus: "no"},
		DomainIntelligence: models.DomainIntelligenceResult{
			IsDisposable:    models.ValidationResult{Status: "pass", Score: 10},
			IsCatchAll:      models.ValidationResult{Status: "pass", Score: 10},
			ReputationScore: 100,
		},
	}
}

func TestScoreUsesRecipientEvidence(t *testing.T) {
	result := NewScoreAnalyzer(scoringWeights()).Calculate(strongIntelligence())
	if result.TotalScore != 100 {
		t.Fatalf("total = %d, want 100", result.TotalScore)
	}
	if result.SecurityScore != 0 {
		t.Fatalf("security must be informational, got %d", result.SecurityScore)
	}
}

func TestRejectedMailboxCannotReceiveHighScore(t *testing.T) {
	intelligence := strongIntelligence()
	intelligence.SMTPValidation.MailboxStatus = "rejected"
	intelligence.SMTPValidation.Reachable = models.ValidationResult{Status: "fail", Score: 0}
	result := NewScoreAnalyzer(scoringWeights()).Calculate(intelligence)
	if result.TotalScore != 0 {
		t.Fatalf("rejected mailbox score = %d, want 0", result.TotalScore)
	}
}

func TestUnknownEvidenceReceivesNoAssumedCredit(t *testing.T) {
	intelligence := strongIntelligence()
	intelligence.SMTPValidation = models.SMTPValidationResult{Reachable: models.ValidationResult{Status: "unknown", Score: 0}, MailboxStatus: "unknown", AcceptAllStatus: "unknown"}
	intelligence.DomainIntelligence.IsCatchAll = models.ValidationResult{Status: "unknown"}
	result := NewScoreAnalyzer(scoringWeights()).Calculate(intelligence)
	if result.TotalScore != 45 {
		t.Fatalf("unknown-evidence score = %d, want 45", result.TotalScore)
	}
}

func TestRiskySMTPScoring(t *testing.T) {
	tests := []struct {
		name, acceptAll string
		smtpScore, want int
	}{
		{name: "confirmed catch-all", acceptAll: "yes", smtpScore: 25, want: 70},
		{name: "catch-all inconclusive", acceptAll: "unknown", smtpScore: 30, want: 75},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			intelligence := strongIntelligence()
			intelligence.SMTPValidation.AcceptAllStatus = test.acceptAll
			intelligence.SMTPValidation.Reachable.Score = test.smtpScore
			intelligence.DomainIntelligence.IsCatchAll = models.ValidationResult{Status: "unknown"}
			result := NewScoreAnalyzer(scoringWeights()).Calculate(intelligence)
			if result.TotalScore != test.want {
				t.Fatalf("score = %d, want %d", result.TotalScore, test.want)
			}
		})
	}
}

func TestDisposableAddressScoreIsCapped(t *testing.T) {
	intelligence := strongIntelligence()
	intelligence.DomainIntelligence.IsDisposable = models.ValidationResult{Status: "fail", Score: 0}
	result := NewScoreAnalyzer(scoringWeights()).Calculate(intelligence)
	if result.TotalScore != 10 {
		t.Fatalf("disposable score = %d, want 10", result.TotalScore)
	}
}

func TestEvidenceEstimateMatchesScore(t *testing.T) {
	intelligence := strongIntelligence()
	intelligence.ValidationScore = 70
	intelligence.DeliverabilityStatus = "risky"
	prediction := NewMLAnalyzer().Predict(intelligence)
	if math.Abs(prediction.DeliverabilityScore-0.70) > 1e-9 || math.Abs(prediction.BounceProbability-0.30) > 1e-9 {
		t.Fatalf("estimate does not match score: %+v", prediction)
	}
}

func TestQualityStates(t *testing.T) {
	tests := []struct{ name, mailbox, acceptAll, want string }{
		{"confirmed", "accepted", "no", "deliverable"},
		{"catch-all", "accepted", "yes", "risky"},
		{"catch-all-unknown", "accepted", "unknown", "risky"},
		{"provider-hidden", "unknown", "not_checked", "unknown"},
		{"rejected", "rejected", "no", "undeliverable"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			intelligence := strongIntelligence()
			intelligence.ValidationScore = 80
			intelligence.SMTPValidation.MailboxStatus = test.mailbox
			intelligence.SMTPValidation.AcceptAllStatus = test.acceptAll
			NewQualityAnalyzer().Determine(intelligence)
			if intelligence.DeliverabilityStatus != test.want {
				t.Fatalf("status = %q, want %q", intelligence.DeliverabilityStatus, test.want)
			}
		})
	}
}

func TestDisposableDetailsAndProviderDetails(t *testing.T) {
	intelligence := strongIntelligence()
	intelligence.Email = "person@mailinator.com"
	intelligence.ValidationScore = 10
	intelligence.DomainIntelligence.IsDisposable = models.ValidationResult{Status: "fail"}
	intelligence.DNSValidation.MXRecords = models.ValidationResult{Status: "unknown"}
	NewQualityAnalyzer().Determine(intelligence)
	if intelligence.DeliverabilityStatus != "risky" || intelligence.VerificationDetails.Reason != "low_quality" {
		t.Fatalf("unexpected disposable result: status=%q reason=%q", intelligence.DeliverabilityStatus, intelligence.VerificationDetails.Reason)
	}
	if intelligence.VerificationDetails.Domain.Disposable != "yes" || intelligence.VerificationDetails.Toxicity != 3 {
		t.Fatalf("unexpected details: %+v", intelligence.VerificationDetails)
	}

	intelligence = strongIntelligence()
	intelligence.Email = "support@gmail.com"
	intelligence.ValidationScore = 100
	intelligence.DomainIntelligence.IsFreeProvider = models.ValidationResult{Status: "pass"}
	NewQualityAnalyzer().Determine(intelligence)
	if intelligence.VerificationDetails.Provider.Domain != "google.com" || intelligence.VerificationDetails.Account.Role != "yes" {
		t.Fatalf("unexpected provider/account details: %+v", intelligence.VerificationDetails)
	}
	if intelligence.VerificationDetails.Evidence.InboxPlacement != "not_verified" || !intelligence.VerificationDetails.Evidence.ConfirmationNeeded {
		t.Fatalf("inbox limitations were not represented: %+v", intelligence.VerificationDetails.Evidence)
	}
}
