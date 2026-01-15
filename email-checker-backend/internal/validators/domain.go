package validators

import (
	"strings"

	"email-intelligence/internal/models"
)

// DomainValidator validates domain intelligence
type DomainValidator struct {
	weights models.ScoringWeights
}

// NewDomainValidator creates a new domain validator
func NewDomainValidator(weights models.ScoringWeights) *DomainValidator {
	return &DomainValidator{weights: weights}
}

// Validate performs domain intelligence analysis
func (v *DomainValidator) Validate(domain string) models.DomainIntelligenceResult {
	result := models.DomainIntelligenceResult{}
	
	result.IsDisposable = v.checkDisposableEmail(domain)
	result.IsFreeProvider = v.checkFreeProvider(domain)
	result.IsCorporate = v.checkCorporateDomain(domain, result.IsFreeProvider.Status == "fail")
	result.IsCatchAll = v.checkCatchAllDomain(domain)
	result.IsBlacklisted = v.checkBlacklistedDomain(domain)
	result.DomainAge = v.estimateDomainAge(domain)
	result.ReputationScore = v.calculateDomainReputation(result)
	result.RiskIndicators = v.identifyRiskIndicators(result)
	
	return result
}

func (v *DomainValidator) checkDisposableEmail(domain string) models.ValidationResult {
	disposablePatterns := []string{
		"10minutemail", "guerrillamail", "mailinator", "tempmail", "yopmail",
		"throwaway", "disposable", "temporary", "fake", "trash", "spam",
	}
	
	domainLower := strings.ToLower(domain)
	
	for _, pattern := range disposablePatterns {
		if strings.Contains(domainLower, pattern) {
			return models.ValidationResult{
				Status:    "fail",
				Reason:    "Disposable email service detected",
				RawSignal: pattern,
				Score:     0,
				Weight:    v.weights.DisposableCheck,
			}
		}
	}
	
	return models.ValidationResult{
		Status:    "pass",
		Reason:    "Not a disposable email service",
		RawSignal: "legitimate_domain",
		Score:     v.weights.DisposableCheck,
		Weight:    v.weights.DisposableCheck,
	}
}

func (v *DomainValidator) checkFreeProvider(domain string) models.ValidationResult {
	freeProviders := map[string]bool{
		"gmail.com": true, "yahoo.com": true, "hotmail.com": true, "outlook.com": true,
		"aol.com": true, "icloud.com": true, "protonmail.com": true, "yandex.com": true,
		"mail.ru": true, "zoho.com": true, "live.com": true, "msn.com": true,
	}
	
	if freeProviders[strings.ToLower(domain)] {
		return models.ValidationResult{
			Status:    "pass",
			Reason:    "Free email provider",
			RawSignal: "free_provider",
			Score:     5,
			Weight:    5,
		}
	}
	
	return models.ValidationResult{
		Status:    "fail",
		Reason:    "Not a free email provider",
		RawSignal: "not_free_provider",
		Score:     0,
		Weight:    5,
	}
}

func (v *DomainValidator) checkCorporateDomain(domain string, notFreeProvider bool) models.ValidationResult {
	if notFreeProvider {
		corporateIndicators := []string{"corp", "company", "inc", "ltd", "llc", "org"}
		domainLower := strings.ToLower(domain)
		
		for _, indicator := range corporateIndicators {
			if strings.Contains(domainLower, indicator) {
				return models.ValidationResult{
					Status:    "pass",
					Reason:    "Corporate domain detected",
					RawSignal: indicator,
					Score:     8,
					Weight:    8,
				}
			}
		}
		
		return models.ValidationResult{
			Status:    "pass",
			Reason:    "Likely corporate domain",
			RawSignal: "custom_domain",
			Score:     6,
			Weight:    8,
		}
	}
	
	return models.ValidationResult{
		Status:    "fail",
		Reason:    "Not a corporate domain",
		RawSignal: "free_provider",
		Score:     0,
		Weight:    8,
	}
}

func (v *DomainValidator) checkCatchAllDomain(domain string) models.ValidationResult {
	return models.ValidationResult{
		Status:    "unknown",
		Reason:    "Catch-all status unknown",
		RawSignal: "not_tested",
		Score:     v.weights.CatchAllRisk / 2,
		Weight:    v.weights.CatchAllRisk,
	}
}

func (v *DomainValidator) checkBlacklistedDomain(domain string) models.ValidationResult {
	blacklistedDomains := map[string]bool{
		"spam.com": true,
		"malware.com": true,
	}
	
	if blacklistedDomains[strings.ToLower(domain)] {
		return models.ValidationResult{
			Status:    "fail",
			Reason:    "Domain is blacklisted",
			RawSignal: "blacklisted",
			Score:     0,
			Weight:    10,
		}
	}
	
	return models.ValidationResult{
		Status:    "pass",
		Reason:    "Domain not blacklisted",
		RawSignal: "not_blacklisted",
		Score:     5,
		Weight:    10,
	}
}

func (v *DomainValidator) estimateDomainAge(domain string) int {
	return 365 // Default to 1 year
}

func (v *DomainValidator) calculateDomainReputation(result models.DomainIntelligenceResult) int {
	score := 50
	
	if result.IsDisposable.Status == "fail" && result.IsDisposable.Score == 0 {
		score -= 30
	}
	
	if result.IsBlacklisted.Status == "fail" {
		score -= 40
	}
	
	if result.IsCorporate.Status == "pass" {
		score += 20
	}
	
	if result.IsFreeProvider.Status == "pass" {
		score += 25
	}
	
	if result.DomainAge > 365 {
		score += 10
	}
	
	return maxInt(0, minInt(100, score))
}

func (v *DomainValidator) identifyRiskIndicators(result models.DomainIntelligenceResult) []string {
	indicators := []string{}
	
	if result.IsDisposable.Status == "fail" && result.IsDisposable.Score == 0 {
		indicators = append(indicators, "Disposable email service")
	}
	
	if result.IsBlacklisted.Status == "fail" {
		indicators = append(indicators, "Blacklisted domain")
	}
	
	if result.DomainAge < 30 {
		indicators = append(indicators, "Very new domain")
	}
	
	return indicators
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
