package validators

import (
	"regexp"
	"strings"

	"email-intelligence/internal/models"
)

// SyntaxValidator validates email syntax
type SyntaxValidator struct {
	weights models.ScoringWeights
}

// NewSyntaxValidator creates a new syntax validator
func NewSyntaxValidator(weights models.ScoringWeights) *SyntaxValidator {
	return &SyntaxValidator{weights: weights}
}

// Validate validates email syntax according to RFC 5322
func (v *SyntaxValidator) Validate(email string) models.ValidationResult {
	// RFC 5322 compliant regex with enhanced validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)
	
	if !emailRegex.MatchString(email) {
		return models.ValidationResult{
			Status:    "fail",
			Reason:    "Invalid email format",
			RawSignal: "regex_mismatch",
			Score:     0,
			Weight:    v.weights.SyntaxFormat,
		}
	}
	
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return models.ValidationResult{
			Status:    "fail",
			Reason:    "Invalid email structure",
			RawSignal: "invalid_parts",
			Score:     0,
			Weight:    v.weights.SyntaxFormat,
		}
	}
	
	localPart, domain := parts[0], parts[1]
	
	// Enhanced validation checks
	if len(localPart) > 64 || len(domain) > 253 || len(email) > 254 {
		return models.ValidationResult{
			Status:    "fail",
			Reason:    "Email length exceeds RFC limits",
			RawSignal: "length_exceeded",
			Score:     0,
			Weight:    v.weights.SyntaxFormat,
		}
	}
	
	if strings.Contains(email, "..") || strings.HasPrefix(localPart, ".") || strings.HasSuffix(localPart, ".") {
		return models.ValidationResult{
			Status:    "fail",
			Reason:    "Invalid dot placement",
			RawSignal: "invalid_dots",
			Score:     0,
			Weight:    v.weights.SyntaxFormat,
		}
	}
	
	return models.ValidationResult{
		Status:    "pass",
		Reason:    "Valid RFC 5322 format",
		RawSignal: "rfc5322_compliant",
		Score:     v.weights.SyntaxFormat,
		Weight:    v.weights.SyntaxFormat,
	}
}
