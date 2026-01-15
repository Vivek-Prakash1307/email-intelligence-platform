package analyzers

import "email-intelligence/internal/models"

// RiskAnalyzer analyzes risk factors
type RiskAnalyzer struct{}

// NewRiskAnalyzer creates a new risk analyzer
func NewRiskAnalyzer() *RiskAnalyzer {
	return &RiskAnalyzer{}
}

// Analyze performs risk analysis
func (a *RiskAnalyzer) Analyze(intelligence *models.EmailIntelligence) models.RiskAnalysis {
	analysis := models.RiskAnalysis{
		RiskFactors: []models.RiskFactor{},
	}
	
	if intelligence.DomainIntelligence.IsDisposable.Status == "fail" && intelligence.DomainIntelligence.IsDisposable.Score == 0 {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{
			Factor:      "Disposable Email",
			Severity:    "High",
			Impact:      30,
			Description: "Email address uses a temporary/disposable email service",
		})
	}
	
	if intelligence.DNSValidation.MXRecords.Status == "fail" {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{
			Factor:      "No MX Records",
			Severity:    "High",
			Impact:      25,
			Description: "Domain cannot receive emails",
		})
	}
	
	if intelligence.SecurityAnalysis.SecurityScore < 10 {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{
			Factor:      "Poor Security",
			Severity:    "Medium",
			Impact:      15,
			Description: "Domain lacks proper email security records",
		})
	}
	
	if intelligence.SMTPValidation.Reachable.Status == "fail" && intelligence.DomainIntelligence.IsFreeProvider.Status != "pass" {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{
			Factor:      "SMTP Unreachable",
			Severity:    "Medium",
			Impact:      20,
			Description: "Mail server is not reachable",
		})
	}
	
	totalImpact := 0
	for _, factor := range analysis.RiskFactors {
		totalImpact += factor.Impact
	}
	analysis.RiskScore = totalImpact
	
	if analysis.RiskScore >= 50 {
		analysis.RiskLevel = "High"
	} else if analysis.RiskScore >= 25 {
		analysis.RiskLevel = "Medium"
	} else {
		analysis.RiskLevel = "Low"
	}
	
	analysis.Recommendations = a.generateRecommendations(analysis.RiskFactors)
	
	return analysis
}

func (a *RiskAnalyzer) generateRecommendations(riskFactors []models.RiskFactor) []string {
	recommendations := []string{}
	
	for _, factor := range riskFactors {
		switch factor.Factor {
		case "Disposable Email":
			recommendations = append(recommendations, "Use a permanent email address for better deliverability")
		case "No MX Records":
			recommendations = append(recommendations, "Verify domain configuration and MX records")
		case "Poor Security":
			recommendations = append(recommendations, "Implement SPF, DKIM, and DMARC records")
		case "SMTP Unreachable":
			recommendations = append(recommendations, "Check mail server configuration and connectivity")
		}
	}
	
	return recommendations
}
