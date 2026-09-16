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
	// Exact domains avoid false positives such as legitimate domains containing
	// words like "mail" or "spam". This embedded set is intentionally modest;
	// production deployments can replace it with a maintained data source.
	disposableDomains := map[string]bool{
		"10minutemail.com": true, "guerrillamail.com": true, "mailinator.com": true,
		"tempmail.com": true, "temp-mail.org": true, "yopmail.com": true,
		"throwawaymail.com": true, "sharklasers.com": true, "guerrillamailblock.com": true,
		"maildrop.cc": true, "dispostable.com": true, "getnada.com": true,
		"mailnesia.com": true, "mintemail.com": true, "trashmail.com": true,
	}
	domainLower := strings.ToLower(domain)
	for candidate := domainLower; candidate != ""; {
		if disposableDomains[candidate] {
			return models.ValidationResult{
				Status:    "fail",
				Reason:    "Disposable email service detected",
				RawSignal: candidate,
				Score:     0,
				Weight:    v.weights.DisposableCheck,
			}
		}
		dot := strings.IndexByte(candidate, '.')
		if dot < 0 {
			break
		}
		candidate = candidate[dot+1:]
	}

	return models.ValidationResult{
		Status:    "pass",
		Reason:    "Not found in the embedded disposable-domain list",
		RawSignal: "not_listed",
		Score:     v.weights.DisposableCheck,
		Weight:    v.weights.DisposableCheck,
	}
}

func (v *DomainValidator) checkFreeProvider(domain string) models.ValidationResult {
	freeProviders := map[string]bool{
		"gmail.com": true, "googlemail.com": true,
		"yahoo.com": true, "yahoo.co.in": true, "yahoo.co.uk": true,
		"hotmail.com": true, "outlook.com": true, "live.com": true, "msn.com": true,
		"aol.com": true, "icloud.com": true, "me.com": true, "mac.com": true,
		"protonmail.com": true, "proton.me": true, "yandex.com": true, "yandex.ru": true,
		"mail.ru": true, "zoho.com": true,
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
	return models.ValidationResult{
		Status:    "unknown",
		Reason:    "Blacklist status was not checked against an external reputation service",
		RawSignal: "not_checked",
		Score:     0,
		Weight:    0,
	}
}

func (v *DomainValidator) estimateDomainAge(domain string) int {
	return -1 // Unknown without an RDAP/WHOIS data source.
}

func (v *DomainValidator) calculateDomainReputation(result models.DomainIntelligenceResult) int {
	score := 50 // Neutral when no external reputation source is configured.

	if result.IsDisposable.Status == "fail" && result.IsDisposable.Score == 0 {
		score -= 30
	}

	return maxInt(0, minInt(100, score))
}

func (v *DomainValidator) identifyRiskIndicators(result models.DomainIntelligenceResult) []string {
	indicators := []string{}

	if result.IsDisposable.Status == "fail" && result.IsDisposable.Score == 0 {
		indicators = append(indicators, "Disposable email service")
	}

	if result.DomainAge >= 0 && result.DomainAge < 30 {
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
