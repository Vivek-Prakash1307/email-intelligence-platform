package analyzers

import (
	"strings"

	"email-intelligence/internal/models"
)

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
	isDisposable := intelligence.DomainIntelligence.IsDisposable.Status == "fail" && intelligence.DomainIntelligence.IsDisposable.Score == 0

	intelligence.IsValid = hasValidSyntax && hasMXRecords
	switch {
	case !hasValidSyntax:
		intelligence.DeliverabilityStatus = "invalid"
	case intelligence.DNSValidation.MXRecords.Status == "fail" || intelligence.SMTPValidation.MailboxStatus == "rejected":
		intelligence.DeliverabilityStatus = "undeliverable"
		intelligence.IsValid = false
	case isDisposable:
		intelligence.DeliverabilityStatus = "risky"
	case !hasMXRecords:
		intelligence.DeliverabilityStatus = "unknown"
		intelligence.IsValid = false
	case intelligence.SMTPValidation.MailboxStatus == "accepted" && intelligence.SMTPValidation.AcceptAllStatus != "no":
		intelligence.DeliverabilityStatus = "risky"
	case intelligence.SMTPValidation.MailboxStatus == "accepted":
		intelligence.DeliverabilityStatus = "deliverable"
	default:
		intelligence.DeliverabilityStatus = "unknown"
	}

	// Confidence level
	if intelligence.DeliverabilityStatus == "deliverable" || intelligence.DeliverabilityStatus == "undeliverable" {
		intelligence.ConfidenceLevel = "High"
	} else if intelligence.DeliverabilityStatus == "risky" {
		intelligence.ConfidenceLevel = "Medium"
	} else {
		intelligence.ConfidenceLevel = "Low"
	}

	// Risk category
	riskScore := intelligence.RiskAnalysis.RiskScore

	if isDisposable || intelligence.DeliverabilityStatus == "undeliverable" {
		intelligence.RiskCategory = "High Risk"
	} else if intelligence.DeliverabilityStatus == "deliverable" {
		intelligence.RiskCategory = "Safe"
	} else if intelligence.DeliverabilityStatus == "risky" || intelligence.DeliverabilityStatus == "unknown" {
		intelligence.RiskCategory = "Medium Risk"
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

	a.populateVerificationDetails(intelligence, isDisposable)
}

func (a *QualityAnalyzer) populateVerificationDetails(intelligence *models.EmailIntelligence, isDisposable bool) {
	domain := ""
	localPart := intelligence.Email
	if at := strings.LastIndexByte(intelligence.Email, '@'); at >= 0 {
		localPart, domain = intelligence.Email[:at], strings.ToLower(intelligence.Email[at+1:])
	}

	details := models.VerificationDetails{
		Domain: models.DomainDetails{
			Name: domain, AcceptAll: normalizeTriState(intelligence.SMTPValidation.AcceptAllStatus),
			Disposable: yesNo(isDisposable),
			Free:       yesNo(intelligence.DomainIntelligence.IsFreeProvider.Status == "pass"),
		},
		Account: models.AccountDetails{
			Role: yesNo(isRoleAddress(localPart)), Disabled: "unknown", FullMailbox: "unknown",
		},
		Provider: models.ProviderDetails{Domain: providerDomain(domain)},
		Evidence: models.EvidenceDetails{
			SMTPRecipient:      normalizeMailboxEvidence(intelligence.SMTPValidation.MailboxStatus),
			InboxPlacement:     "not_verified",
			Ownership:          "not_verified",
			Method:             verificationMethod(intelligence.SMTPValidation.Attempted),
			RealTime:           intelligence.SMTPValidation.Attempted,
			ConfirmationNeeded: true,
			Limitations: []string{
				"SMTP acceptance cannot prove inbox placement",
				"A provider may filter, quarantine, or bounce a message later",
				"Only a user-completed confirmation proves inbox ownership",
			},
		},
		Score: intelligence.ValidationScore,
	}

	if intelligence.SMTPValidation.DiagnosticCode == 552 {
		details.Account.FullMailbox = "yes"
	}

	switch {
	case intelligence.DeliverabilityStatus == "invalid":
		details.Reason = "invalid_email"
		details.Message = "The email address format is invalid or unsupported."
		details.Toxicity = 2
	case intelligence.DNSValidation.MXRecords.Status == "fail":
		details.Reason = "invalid_domain"
		details.Message = "Do not send to this address because its domain cannot receive email."
		details.Toxicity = 2
	case intelligence.SMTPValidation.MailboxStatus == "rejected":
		details.Reason = "rejected_email"
		details.Message = "The receiving server rejected this address. Do not send unless the address is corrected or confirmed."
		details.Toxicity = 2
	case isDisposable:
		details.Reason = "low_quality"
		details.Message = "This address uses a disposable domain and may stop existing before you send email."
		details.Toxicity = 3
	case intelligence.DeliverabilityStatus == "deliverable":
		details.Reason = "accepted_email"
		details.Message = "The receiving server accepted this recipient and rejected a random address. Delivery is likely, but not guaranteed."
	case intelligence.DeliverabilityStatus == "risky":
		details.Reason = "catch_all_or_inconclusive"
		details.Message = "The recipient was accepted, but catch-all behavior could not be excluded."
		details.Toxicity = 1
	default:
		details.Reason = "inconclusive"
		details.Message = "The provider did not reveal whether this mailbox exists. Verify it with a confirmation email."
		details.Toxicity = 1
	}

	intelligence.VerificationDetails = details
}

func normalizeMailboxEvidence(value string) string {
	switch value {
	case "accepted", "rejected":
		return value
	case "not_checked":
		return "not_checked"
	default:
		return "unknown"
	}
}

func verificationMethod(attempted bool) string {
	if attempted {
		return "smtp_envelope_probe"
	}
	return "none"
}

func normalizeTriState(value string) string {
	if value == "yes" || value == "no" {
		return value
	}
	return "unknown"
}

func yesNo(value bool) string {
	if value {
		return "yes"
	}
	return "no"
}

func isRoleAddress(localPart string) bool {
	roleAddresses := map[string]bool{
		"admin": true, "billing": true, "contact": true, "help": true,
		"hr": true, "info": true, "jobs": true, "marketing": true,
		"office": true, "sales": true, "security": true, "support": true,
		"team": true, "webmaster": true,
	}
	return roleAddresses[strings.ToLower(localPart)]
}

func providerDomain(domain string) string {
	switch domain {
	case "gmail.com", "googlemail.com":
		return "google.com"
	case "outlook.com", "hotmail.com", "live.com", "msn.com":
		return "outlook.com"
	case "yahoo.com", "yahoo.co.in", "yahoo.co.uk":
		return "yahoo.com"
	case "protonmail.com", "proton.me":
		return "protonmail.com"
	case "icloud.com", "me.com", "mac.com":
		return "icloud.com"
	default:
		return "other"
	}
}
