package models

import "time"

// EmailIntelligence represents the complete analysis result
type EmailIntelligence struct {
	Email                    string                   `json:"email"`
	IsValid                  bool                     `json:"is_valid"`
	ValidationScore          int                      `json:"validation_score"`
	ConfidenceLevel          string                   `json:"confidence_level"`
	RiskCategory             string                   `json:"risk_category"`
	QualityTier              string                   `json:"quality_tier"`
	
	// Core Components
	SyntaxValidation         ValidationResult         `json:"syntax_validation"`
	DNSValidation            DNSValidationResult      `json:"dns_validation"`
	SMTPValidation           SMTPValidationResult     `json:"smtp_validation"`
	SecurityAnalysis         SecurityAnalysisResult   `json:"security_analysis"`
	DomainIntelligence       DomainIntelligenceResult `json:"domain_intelligence"`
	
	// Advanced Analytics
	ScoreBreakdown           ScoreBreakdown           `json:"score_breakdown"`
	RiskAnalysis             RiskAnalysis             `json:"risk_analysis"`
	MLPredictions            MLPredictions            `json:"ml_predictions"`
	
	// Metadata
	ProcessingTime           int64                    `json:"processing_time_ms"`
	Timestamp                time.Time                `json:"timestamp"`
	APIVersion               string                   `json:"api_version"`
	
	// User Experience
	Suggestions              []string                 `json:"suggestions"`
	Warnings                 []string                 `json:"warnings"`
	AlternativeEmails        []string                 `json:"alternative_emails"`
	ExplanationText          string                   `json:"explanation_text"`
}

// ValidationResult represents a single validation check result
type ValidationResult struct {
	Status      string `json:"status"`      // pass, fail, unknown
	Reason      string `json:"reason"`
	RawSignal   string `json:"raw_signal"`
	Score       int    `json:"score"`
	Weight      int    `json:"weight"`
}

// DNSValidationResult contains DNS validation details
type DNSValidationResult struct {
	DomainExists    ValidationResult `json:"domain_exists"`
	MXRecords       ValidationResult `json:"mx_records"`
	ARecords        []string         `json:"a_records"`
	MXDetails       []MXRecord       `json:"mx_details"`
	ResponseTime    int64            `json:"response_time_ms"`
}

// SMTPValidationResult contains SMTP validation details
type SMTPValidationResult struct {
	Reachable       ValidationResult `json:"reachable"`
	ResponseTime    int64            `json:"response_time_ms"`
	ServerResponse  string           `json:"server_response"`
	Port            int              `json:"port"`
	TLSSupported    bool             `json:"tls_supported"`
}

// SecurityAnalysisResult contains security record analysis
type SecurityAnalysisResult struct {
	SPFRecord       ValidationResult `json:"spf_record"`
	DKIMRecord      ValidationResult `json:"dkim_record"`
	DMARCRecord     ValidationResult `json:"dmarc_record"`
	SecurityScore   int              `json:"security_score"`
	ThreatLevel     string           `json:"threat_level"`
}

// DomainIntelligenceResult contains domain intelligence data
type DomainIntelligenceResult struct {
	IsDisposable     ValidationResult `json:"is_disposable"`
	IsFreeProvider   ValidationResult `json:"is_free_provider"`
	IsCorporate      ValidationResult `json:"is_corporate"`
	IsCatchAll       ValidationResult `json:"is_catch_all"`
	IsBlacklisted    ValidationResult `json:"is_blacklisted"`
	DomainAge        int              `json:"domain_age_days"`
	ReputationScore  int              `json:"reputation_score"`
	RiskIndicators   []string         `json:"risk_indicators"`
}

// ScoreBreakdown shows detailed scoring
type ScoreBreakdown struct {
	SyntaxScore      int    `json:"syntax_score"`
	MXScore          int    `json:"mx_score"`
	SecurityScore    int    `json:"security_score"`
	SMTPScore        int    `json:"smtp_score"`
	DisposableScore  int    `json:"disposable_score"`
	ReputationScore  int    `json:"reputation_score"`
	CatchAllScore    int    `json:"catch_all_score"`
	TotalScore       int    `json:"total_score"`
	MaxPossible      int    `json:"max_possible"`
	Explanation      string `json:"explanation"`
}

// RiskAnalysis contains risk assessment
type RiskAnalysis struct {
	RiskFactors      []RiskFactor `json:"risk_factors"`
	RiskScore        int          `json:"risk_score"`
	RiskLevel        string       `json:"risk_level"`
	Recommendations  []string     `json:"recommendations"`
}

// RiskFactor represents a single risk factor
type RiskFactor struct {
	Factor      string `json:"factor"`
	Severity    string `json:"severity"`
	Impact      int    `json:"impact"`
	Description string `json:"description"`
}

// MLPredictions contains machine learning predictions
type MLPredictions struct {
	SpamProbability     float64            `json:"spam_probability"`
	BounceProbability   float64            `json:"bounce_probability"`
	DeliverabilityScore float64            `json:"deliverability_score"`
	Confidence          float64            `json:"confidence"`
	Features            map[string]float64 `json:"features"`
	ModelVersion        string             `json:"model_version"`
	Explanation         string             `json:"explanation"`
}

// MXRecord represents a mail exchange record
type MXRecord struct {
	Host     string `json:"host"`
	Priority int    `json:"priority"`
	IP       string `json:"ip,omitempty"`
}

// ScoringWeights defines the scoring system
type ScoringWeights struct {
	SyntaxFormat     int `json:"syntax_format"`      // 10 points
	MXRecords        int `json:"mx_records"`         // 20 points
	SecurityRecords  int `json:"security_records"`   // 20 points
	SMTPReachability int `json:"smtp_reachability"`  // 20 points
	DisposableCheck  int `json:"disposable_check"`   // 10 points
	DomainReputation int `json:"domain_reputation"`  // 10 points
	CatchAllRisk     int `json:"catch_all_risk"`     // 10 points
}
