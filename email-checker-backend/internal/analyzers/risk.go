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

	if intelligence.SMTPValidation.MailboxStatus == "rejected" {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{
			Factor:      "Mailbox Rejected",
			Severity:    "High",
			Impact:      40,
			Description: "Receiving server rejected this recipient",
		})
	} else if intelligence.SMTPValidation.AcceptAllStatus == "yes" {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{Factor: "Catch-all Domain", Severity: "Medium", Impact: 20, Description: "Server accepts random recipients, so this mailbox cannot be confirmed"})
	} else if intelligence.SMTPValidation.MailboxStatus == "unknown" {
		analysis.RiskFactors = append(analysis.RiskFactors, models.RiskFactor{Factor: "SMTP Inconclusive", Severity: "Low", Impact: 10, Description: "Receiving server did not reveal whether this mailbox exists"})
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
		case "Mailbox Rejected":
			recommendations = append(recommendations, "Do not send until the recipient address is corrected or confirmed")
		case "Catch-all Domain", "SMTP Inconclusive":
			recommendations = append(recommendations, "Use confirmation email or double opt-in for definitive verification")
		}
	}

	return recommendations
}
