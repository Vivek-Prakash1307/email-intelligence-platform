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
	
	isFreeProvider := intelligence.DomainIntelligence.IsFreeProvider.Status == "pass"
	
	// Syntax Score (10 points)
	breakdown.SyntaxScore = intelligence.SyntaxValidation.Score
	
	// MX Score (20 points)
	breakdown.MXScore = intelligence.DNSValidation.MXRecords.Score
	
	// Security Score (20 points)
	breakdown.SecurityScore = intelligence.SecurityAnalysis.SecurityScore
	
	// SMTP Score (20 points) - Full credit for trusted providers
	breakdown.SMTPScore = intelligence.SMTPValidation.Reachable.Score
	if isFreeProvider && breakdown.SMTPScore < 20 {
		breakdown.SMTPScore = 20
	}
	
	// Disposable Score (10 points)
	breakdown.DisposableScore = intelligence.DomainIntelligence.IsDisposable.Score
	
	// Reputation Score (10 points)
	reputationScore := intelligence.DomainIntelligence.ReputationScore
	if isFreeProvider && reputationScore < 75 {
		reputationScore = 85
	}
	breakdown.ReputationScore = reputationScore / 10
	
	// Catch-all Score (10 points)
	breakdown.CatchAllScore = intelligence.DomainIntelligence.IsCatchAll.Score
	if isFreeProvider {
		breakdown.CatchAllScore = 10
	}
	
	// Calculate total
	breakdown.TotalScore = breakdown.SyntaxScore + breakdown.MXScore + breakdown.SecurityScore +
		breakdown.SMTPScore + breakdown.DisposableScore + breakdown.ReputationScore + breakdown.CatchAllScore
	
	if breakdown.TotalScore > 100 {
		breakdown.TotalScore = 100
	}
	
	breakdown.Explanation = a.generateExplanation(breakdown)
	
	return breakdown
}

func (a *ScoreAnalyzer) generateExplanation(breakdown models.ScoreBreakdown) string {
	explanations := []string{}
	
	if breakdown.SyntaxScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Valid syntax (+%d)", breakdown.SyntaxScore))
	}
	if breakdown.MXScore > 0 {
		explanations = append(explanations, fmt.Sprintf("MX records found (+%d)", breakdown.MXScore))
	}
	if breakdown.SecurityScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Security records (+%d)", breakdown.SecurityScore))
	}
	if breakdown.SMTPScore > 0 {
		explanations = append(explanations, fmt.Sprintf("SMTP reachable (+%d)", breakdown.SMTPScore))
	}
	if breakdown.DisposableScore > 0 {
		explanations = append(explanations, fmt.Sprintf("Not disposable (+%d)", breakdown.DisposableScore))
	}
	
	if len(explanations) == 0 {
		return "Score based on failed validation checks"
	}
	
	return strings.Join(explanations, ", ")
}
