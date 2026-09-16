package analyzers

import "email-intelligence/internal/models"

// MLAnalyzer is retained for API compatibility. The implementation is an
// explicit, deterministic heuristic; it does not claim to be a trained model.
type MLAnalyzer struct{}

func NewMLAnalyzer() *MLAnalyzer { return &MLAnalyzer{} }

func (a *MLAnalyzer) Predict(intelligence *models.EmailIntelligence) models.MLPredictions {
	confidence := 0.30
	switch intelligence.DeliverabilityStatus {
	case "deliverable":
		confidence = 0.95
	case "risky":
		confidence = 0.60
	case "undeliverable", "invalid":
		confidence = 0.95
	}
	disposableRisk := 0.0
	if intelligence.DomainIntelligence.IsDisposable.Status == "fail" {
		disposableRisk = 1.0
	}
	deliverability := float64(intelligence.ValidationScore) / 100
	deliveryRisk := 1 - deliverability
	return models.MLPredictions{
		SpamProbability: disposableRisk, BounceProbability: deliveryRisk,
		DeliverabilityScore: deliverability, Confidence: confidence,
		Features: map[string]float64{
			"syntax_valid":       boolToFloat(intelligence.SyntaxValidation.Status == "pass"),
			"mx_present":         boolToFloat(intelligence.DNSValidation.MXRecords.Status == "pass"),
			"recipient_accepted": boolToFloat(intelligence.SMTPValidation.MailboxStatus == "accepted"),
			"accept_all":         boolToFloat(intelligence.SMTPValidation.AcceptAllStatus == "yes"),
			"disposable":         boolToFloat(intelligence.DomainIntelligence.IsDisposable.Status == "fail"),
		},
		ModelVersion: "deterministic-evidence-v4",
		Explanation:  "Deterministic indices derived from the evidence score; these are not statistically calibrated probabilities or a trained ML prediction",
	}
}

func boolToFloat(value bool) float64 {
	if value {
		return 1
	}
	return 0
}
