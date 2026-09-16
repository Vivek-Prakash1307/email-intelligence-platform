package analyzers

import (
	"fmt"
	"strings"

	"email-intelligence/internal/models"
)

// ScoreAnalyzer calculates validation scores
type ScoreAnalyzer struct {
	weights models.ScoringWeights
}

// NewScoreAnalyzer creates a new score analyzer
func NewScoreAnalyzer(weights models.ScoringWeights) *ScoreAnalyzer {
	return &ScoreAnalyzer{weights: weights}
}

// Calculate calculates the enterprise score
func (a *ScoreAnalyzer) Calculate(intelligence *models.EmailIntelligence) models.ScoreBreakdown {
	breakdown := models.ScoreBreakdown{
		MaxPossible: 100,
	}

	// The deliverability score uses only evidence related to receiving mail.
	// SPF/DKIM/DMARC describe outbound authentication and are informational.
	breakdown.SyntaxScore = intelligence.SyntaxValidation.Score
	breakdown.MXScore = intelligence.DNSValidation.MXRecords.Score
	breakdown.SecurityScore = 0
	breakdown.SMTPScore = intelligence.SMTPValidation.Reachable.Score
	breakdown.DisposableScore = intelligence.DomainIntelligence.IsDisposable.Score
	breakdown.ReputationScore = 0

	switch intelligence.DomainIntelligence.IsCatchAll.Status {
	case "fail": // catch-all detected
		breakdown.CatchAllScore = 0
	case "pass": // random recipient rejected
		breakdown.CatchAllScore = a.weights.CatchAllRisk
	default:
		breakdown.CatchAllScore = 0
	}

	breakdown.TotalScore = breakdown.SyntaxScore + breakdown.MXScore + breakdown.SecurityScore +
		breakdown.SMTPScore + breakdown.DisposableScore + breakdown.ReputationScore + breakdown.CatchAllScore
	switch {
	case intelligence.DNSValidation.MXRecords.Status == "fail":
		breakdown.Outcome = "invalid_domain"
		breakdown.OverrideReason = "A domain that cannot receive mail is not deliverable"
	case intelligence.SMTPValidation.MailboxStatus == "rejected":
		breakdown.Outcome = "mailbox_rejected"
		breakdown.OverrideReason = "The receiving server permanently rejected the recipient"
	case intelligence.DomainIntelligence.IsDisposable.Status == "fail":
		breakdown.Outcome = "disposable"
		breakdown.OverrideReason = "Disposable addresses are capped because they may expire"
	case intelligence.SMTPValidation.MailboxStatus == "accepted" && intelligence.SMTPValidation.AcceptAllStatus == "no":
		breakdown.Outcome = "confirmed_smtp"
	case intelligence.SMTPValidation.MailboxStatus == "accepted" && intelligence.SMTPValidation.AcceptAllStatus == "yes":
		breakdown.Outcome = "catch_all"
	case intelligence.SMTPValidation.MailboxStatus == "accepted":
		breakdown.Outcome = "accepted_inconclusive"
	default:
		breakdown.Outcome = "inconclusive"
	}
	if breakdown.Outcome == "invalid_domain" || breakdown.Outcome == "mailbox_rejected" {
		breakdown.TotalScore = 0
	}
	if breakdown.Outcome == "disposable" {
		breakdown.TotalScore = min(breakdown.TotalScore, 10)
	}
	if breakdown.TotalScore > 100 {
		breakdown.TotalScore = 100
	}
	breakdown.Explanation = a.generateExplanation(breakdown)
	return breakdown
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func (a *ScoreAnalyzer) generateExplanation(breakdown models.ScoreBreakdown) string {
	if breakdown.OverrideReason != "" {
		return fmt.Sprintf("%s; final score %d/100", breakdown.OverrideReason, breakdown.TotalScore)
	}
	explanations := []string{}

	if breakdown.SyntaxScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Valid syntax (+%d)", breakdown.SyntaxScore))
	}
	if breakdown.MXScore > 0 {
		explanations = append(explanations, fmt.Sprintf("MX records found (+%d)", breakdown.MXScore))
	}
	if breakdown.SMTPScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Mailbox recipient evidence (+%d)", breakdown.SMTPScore))
	}
	if breakdown.DisposableScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Not disposable (+%d)", breakdown.DisposableScore))
	}
	if breakdown.CatchAllScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Catch-all confidence (+%d)", breakdown.CatchAllScore))
	}

	if len(explanations) == 0 {
		return "Score based on failed validation checks"
	}

	return strings.Join(explanations, ", ")
}
