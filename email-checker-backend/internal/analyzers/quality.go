package analyzers

import "email-intelligence/internal/models"

// QualityAnalyzer determines quality metrics
type QualityAnalyzer struct{}

// NewQualityAnalyzer creates a new quality analyzer
func NewQualityAnalyzer() *QualityAnalyzer {
	return &QualityAnalyzer{}
}

// Determine determines quality metrics
func (a *QualityAnalyzer) Determine(intelligence *models.EmailIntelligence) {
	score := intelligence.ValidationScore
	
	hasValidSyntax := intelligence.SyntaxValidation.Status == "pass"
	hasMXRecords := intelligence.DNSValidation.MXRecords.Status == "pass"
	isFreeProvider := intelligence.DomainIntelligence.IsFreeProvider.Status == "pass"
	isDisposable := intelligence.DomainIntelligence.IsDisposable.Status == "fail" && intelligence.DomainIntelligence.IsDisposable.Score == 0
	
	intelligence.IsValid = hasValidSyntax && (hasMXRecords || isFreeProvider) && !isDisposable && score >= 50
	
	if isFreeProvider && hasValidSyntax && hasMXRecords {
		intelligence.IsValid = true
		intelligence.RiskCategory = "Safe"
	}
	
	// Confidence level
	if score >= 85 {
		intelligence.ConfidenceLevel = "High"
	} else if score >= 60 {
		intelligence.ConfidenceLevel = "Medium"
	} else {
		intelligence.ConfidenceLevel = "Low"
	}
	
	// Risk category
	riskScore := intelligence.RiskAnalysis.RiskScore
	
	if isFreeProvider && score >= 60 {
		intelligence.RiskCategory = "Safe"
	} else if isDisposable {
		intelligence.RiskCategory = "High Risk"
	} else if riskScore >= 50 {
		intelligence.RiskCategory = "High Risk"
	} else if riskScore >= 25 {
		intelligence.RiskCategory = "Medium Risk"
	} else if intelligence.IsValid {
		intelligence.RiskCategory = "Safe"
	} else {
		intelligence.RiskCategory = "Invalid"
	}
	
	// Quality tier
	if score >= 90 {
		intelligence.QualityTier = "Premium"
	} else if score >= 75 {
		intelligence.QualityTier = "Excellent"
	} else if score >= 60 {
		intelligence.QualityTier = "Good"
	} else if score >= 40 {
		intelligence.QualityTier = "Fair"
	} else {
		intelligence.QualityTier = "Poor"
	}
}
