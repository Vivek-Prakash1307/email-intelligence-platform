package analyzers

import (
	"strings"

	"email-intelligence/internal/models"
)

// ContentGenerator generates user-friendly content
type ContentGenerator struct{}

// NewContentGenerator creates a new content generator
func NewContentGenerator() *ContentGenerator {
	return &ContentGenerator{}
}

// Generate generates user-friendly content
func (g *ContentGenerator) Generate(intelligence *models.EmailIntelligence) {
	intelligence.Suggestions = g.generateSuggestions(intelligence)
	intelligence.Warnings = g.generateWarnings(intelligence)
	intelligence.AlternativeEmails = g.generateAlternatives(intelligence.Email)
	intelligence.ExplanationText = g.generateExplanation(intelligence)
}

func (g *ContentGenerator) generateSuggestions(intelligence *models.EmailIntelligence) []string {
	suggestions := []string{}
	
	if intelligence.ValidationScore < 50 {
		suggestions = append(suggestions, "Consider using a different email address")
	}
	
	if intelligence.DomainIntelligence.IsDisposable.Status == "fail" {
		suggestions = append(suggestions, "Use a permanent email address for better deliverability")
	}
	
	if intelligence.SecurityAnalysis.SecurityScore < 10 {
		suggestions = append(suggestions, "Domain should implement email security records (SPF, DKIM, DMARC)")
	}
	
	return suggestions
}

func (g *ContentGenerator) generateWarnings(intelligence *models.EmailIntelligence) []string {
	warnings := []string{}
	
	for _, factor := range intelligence.RiskAnalysis.RiskFactors {
		if factor.Severity == "High" {
			warnings = append(warnings, factor.Description)
		}
	}
	
	return warnings
}

func (g *ContentGenerator) generateAlternatives(email string) []string {
	alternatives := []string{}
	
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return alternatives
	}
	
	localPart, domain := parts[0], parts[1]
	
	typoCorrections := map[string]string{
		"gmai.com":    "gmail.com",
		"gamil.com":   "gmail.com",
		"gmial.com":   "gmail.com",
		"yahooo.com":  "yahoo.com",
		"yaho.com":    "yahoo.com",
		"hotmial.com": "hotmail.com",
		"outlok.com":  "outlook.com",
	}
	
	if correction, exists := typoCorrections[domain]; exists {
		alternatives = append(alternatives, localPart+"@"+correction)
	}
	
	return alternatives
}

func (g *ContentGenerator) generateExplanation(intelligence *models.EmailIntelligence) string {
	score := intelligence.ValidationScore
	
	if score >= 85 {
		return "This email address has excellent validation scores across all checks and is highly likely to be deliverable."
	} else if score >= 70 {
		return "This email address passes most validation checks and should be deliverable with good confidence."
	} else if score >= 50 {
		return "This email address has some validation issues that may affect deliverability."
	} else {
		return "This email address has significant validation issues and may not be deliverable."
	}
}
