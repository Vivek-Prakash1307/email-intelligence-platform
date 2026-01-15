package analyzers

import (
	"math"
	"strings"

	"email-intelligence/internal/models"
)

// MLAnalyzer performs machine learning predictions
type MLAnalyzer struct{}

// NewMLAnalyzer creates a new ML analyzer
func NewMLAnalyzer() *MLAnalyzer {
	return &MLAnalyzer{}
}

// Predict generates ML predictions
func (a *MLAnalyzer) Predict(intelligence *models.EmailIntelligence) models.MLPredictions {
	features := map[string]float64{
		"syntax_score":      float64(intelligence.SyntaxValidation.Score) / 10.0,
		"mx_score":          float64(intelligence.DNSValidation.MXRecords.Score) / 20.0,
		"security_score":    float64(intelligence.SecurityAnalysis.SecurityScore) / 20.0,
		"smtp_score":        float64(intelligence.SMTPValidation.Reachable.Score) / 20.0,
		"is_disposable":     boolToFloat(intelligence.DomainIntelligence.IsDisposable.Status == "fail"),
		"is_free_provider":  boolToFloat(intelligence.DomainIntelligence.IsFreeProvider.Status == "pass"),
		"is_corporate":      boolToFloat(intelligence.DomainIntelligence.IsCorporate.Status == "pass"),
		"domain_age":        float64(intelligence.DomainIntelligence.DomainAge) / 365.0,
		"reputation_score":  float64(intelligence.DomainIntelligence.ReputationScore) / 100.0,
	}
	
	spamProbability := a.calculateSpamProbability(features)
	bounceProbability := a.calculateBounceProbability(features)
	deliverabilityScore := 1.0 - math.Max(spamProbability, bounceProbability)
	confidence := a.calculateConfidence(features)
	
	return models.MLPredictions{
		SpamProbability:     spamProbability,
		BounceProbability:   bounceProbability,
		DeliverabilityScore: deliverabilityScore,
		Confidence:          confidence,
		Features:            features,
		ModelVersion:        "v2.0.0",
		Explanation:         a.generateExplanation(features, spamProbability, bounceProbability),
	}
}

func (a *MLAnalyzer) calculateSpamProbability(features map[string]float64) float64 {
	weights := map[string]float64{
		"is_disposable":    0.8,
		"is_free_provider": 0.2,
		"security_score":   -0.3,
		"reputation_score": -0.4,
		"domain_age":       -0.2,
	}
	
	score := 0.0
	for feature, value := range features {
		if weight, exists := weights[feature]; exists {
			score += weight * value
		}
	}
	
	return 1.0 / (1.0 + math.Exp(-score))
}

func (a *MLAnalyzer) calculateBounceProbability(features map[string]float64) float64 {
	weights := map[string]float64{
		"mx_score":       -0.4,
		"smtp_score":     -0.5,
		"syntax_score":   -0.3,
		"is_disposable":  0.6,
	}
	
	score := 0.0
	for feature, value := range features {
		if weight, exists := weights[feature]; exists {
			score += weight * value
		}
	}
	
	return math.Max(0.0, math.Min(1.0, 1.0/(1.0+math.Exp(-score))))
}

func (a *MLAnalyzer) calculateConfidence(features map[string]float64) float64 {
	totalFeatures := len(features)
	availableFeatures := 0
	
	for _, value := range features {
		if value > 0 {
			availableFeatures++
		}
	}
	
	return float64(availableFeatures) / float64(totalFeatures)
}

func (a *MLAnalyzer) generateExplanation(features map[string]float64, spamProb, bounceProb float64) string {
	explanations := []string{}
	
	if features["is_disposable"] > 0 {
		explanations = append(explanations, "Disposable email increases spam risk")
	}
	
	if features["security_score"] > 0.7 {
		explanations = append(explanations, "Strong security records reduce spam likelihood")
	}
	
	if features["smtp_score"] > 0.8 {
		explanations = append(explanations, "SMTP reachability indicates good deliverability")
	}
	
	if len(explanations) == 0 {
		return "Prediction based on domain and email characteristics"
	}
	
	return strings.Join(explanations, "; ")
}

func boolToFloat(b bool) float64 {
	if b {
		return 1.0
	}
	return 0.0
}
