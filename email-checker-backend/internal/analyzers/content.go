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

	if intelligence.DeliverabilityStatus == "unknown" || intelligence.DeliverabilityStatus == "risky" {
		suggestions = append(suggestions, "Send a confirmation link (double opt-in) to verify actual inbox ownership")
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
	if intelligence.VerificationDetails.Message != "" {
		return intelligence.VerificationDetails.Message
	}
	switch intelligence.DeliverabilityStatus {
	case "deliverable":
		return "The receiving server accepted this recipient and rejected a random address. Delivery is likely, but only a real message can prove inbox delivery."
	case "risky":
		return "The server accepted the recipient but catch-all behavior could not be excluded, so this mailbox cannot be confirmed."
	case "undeliverable":
		return "The domain cannot receive mail or its receiving server rejected this recipient."
	case "invalid":
		return "The address is not syntactically valid."
	default:
		return "The domain can receive mail, but the provider did not reveal whether this specific mailbox exists."
	}
}
