package engine

import (
	"context"
	"strings"
	"sync"
	"time"

	"email-intelligence/internal/analyzers"
	"email-intelligence/internal/config"
	"email-intelligence/internal/models"
	"email-intelligence/internal/providers"
	"email-intelligence/internal/validators"

	"github.com/patrickmn/go-cache"
)

// Engine is the main email intelligence engine
type Engine struct {
	config            *config.Config
	cache             *cache.Cache
	syntaxValidator   *validators.SyntaxValidator
	dnsValidator      *validators.DNSValidator
	securityValidator *validators.SecurityValidator
	smtpValidator     *validators.SMTPValidator
	mailboxVerifier   providers.MailboxVerifier
	domainValidator   *validators.DomainValidator
	scoreAnalyzer     *analyzers.ScoreAnalyzer
	riskAnalyzer      *analyzers.RiskAnalyzer
	mlAnalyzer        *analyzers.MLAnalyzer
	qualityAnalyzer   *analyzers.QualityAnalyzer
	contentGenerator  *analyzers.ContentGenerator
}

// New creates a new email intelligence engine
func New(cfg *config.Config) *Engine {
	var mailboxVerifier providers.MailboxVerifier
	if (cfg.VerificationProvider == "auto" || cfg.VerificationProvider == "verifalia") &&
		cfg.VerifaliaUsername != "" && cfg.VerifaliaPassword != "" {
		mailboxVerifier = providers.NewVerifaliaVerifier(
			cfg.VerifaliaUsername, cfg.VerifaliaPassword, cfg.VerifaliaTimeout,
			cfg.VerifaliaConcurrency, cfg.ScoringWeights,
		)
	}
	return &Engine{
		config:            cfg,
		cache:             cache.New(cfg.CacheDuration, cfg.CacheDuration*2),
		syntaxValidator:   validators.NewSyntaxValidator(cfg.ScoringWeights),
		dnsValidator:      validators.NewDNSValidator(cfg.DNSTimeout),
		securityValidator: validators.NewSecurityValidator(cfg.DNSTimeout),
		smtpValidator:     validators.NewSMTPValidator(cfg.SMTPTimeout, cfg.ScoringWeights),
		mailboxVerifier:   mailboxVerifier,
		domainValidator:   validators.NewDomainValidator(cfg.ScoringWeights),
		scoreAnalyzer:     analyzers.NewScoreAnalyzer(cfg.ScoringWeights),
		riskAnalyzer:      analyzers.NewRiskAnalyzer(),
		mlAnalyzer:        analyzers.NewMLAnalyzer(),
		qualityAnalyzer:   analyzers.NewQualityAnalyzer(),
		contentGenerator:  analyzers.NewContentGenerator(),
	}
}

// AnalyzeEmail performs complete email intelligence analysis
func (e *Engine) AnalyzeEmail(ctx context.Context, email string, deepAnalysis bool) (*models.EmailIntelligence, error) {
	startTime := time.Now()
	email = normalizeEmail(email)
	cacheKey := fmtCacheKey(email, deepAnalysis)

	// Deep analysis is deliberately uncached: every request must obtain a fresh
	// SMTP recipient response. Basic DNS/domain analysis may use the short cache.
	if !deepAnalysis {
		if cached, found := e.cache.Get(cacheKey); found {
			if intelligence, ok := cached.(*models.EmailIntelligence); ok {
				return intelligence, nil
			}
		}
	}

	intelligence := &models.EmailIntelligence{
		Email:      email,
		Timestamp:  time.Now(),
		APIVersion: "3.2.0",
	}

	// 1. Syntax Validation (immediate)
	intelligence.SyntaxValidation = e.syntaxValidator.Validate(email)

	if intelligence.SyntaxValidation.Status != "pass" {
		intelligence.ValidationScore = 0
		intelligence.ScoreBreakdown = models.ScoreBreakdown{
			TotalScore: 0, MaxPossible: 100, Outcome: "invalid_syntax",
			OverrideReason: "The address syntax is invalid or unsupported",
			Explanation:    "The address syntax is invalid or unsupported; final score 0/100",
		}
		e.qualityAnalyzer.Determine(intelligence)
		e.contentGenerator.Generate(intelligence)
		intelligence.ProcessingTime = time.Since(startTime).Milliseconds()
		if !deepAnalysis {
			e.cache.Set(cacheKey, intelligence, cache.DefaultExpiration)
		}
		return intelligence, nil
	}

	// Extract domain
	parts := strings.Split(email, "@")
	domain := parts[1]

	// 2-4. Parallel validation pipeline
	var wg sync.WaitGroup
	var mu sync.Mutex

	// DNS Validation (parallel)
	wg.Add(1)
	go func() {
		defer wg.Done()
		result := e.dnsValidator.Validate(ctx, domain)
		mu.Lock()
		intelligence.DNSValidation = result
		mu.Unlock()
	}()

	// Security Analysis (parallel - SPF, DMARC, DKIM all parallel inside)
	wg.Add(1)
	go func() {
		defer wg.Done()
		result := e.securityValidator.Validate(ctx, domain)
		mu.Lock()
		intelligence.SecurityAnalysis = result
		mu.Unlock()
	}()

	// Domain Intelligence (parallel)
	wg.Add(1)
	go func() {
		defer wg.Done()
		result := e.domainValidator.Validate(domain)
		mu.Lock()
		intelligence.DomainIntelligence = result
		mu.Unlock()
	}()

	// Wait for parallel operations
	wg.Wait()

	// 5. SMTP Validation (if deep analysis and MX records exist)
	if deepAnalysis && intelligence.DNSValidation.MXRecords.Status == "pass" {
		intelligence.SMTPValidation = e.verifyMailbox(ctx, email, intelligence.DNSValidation.MXDetails)
	} else {
		intelligence.SMTPValidation = models.SMTPValidationResult{
			Reachable:       models.ValidationResult{Status: "unknown", Reason: "SMTP mailbox probe was not performed", RawSignal: "not_checked", Score: 0, Weight: e.config.ScoringWeights.SMTPReachability},
			MailboxStatus:   "not_checked",
			AcceptAllStatus: "not_checked",
			Source:          "none",
		}
	}
	e.applyProviderSignals(intelligence)

	// A random address accepted in the same SMTP session indicates accept-all.
	if intelligence.SMTPValidation.AcceptAllStatus == "yes" {
		intelligence.DomainIntelligence.IsCatchAll = models.ValidationResult{Status: "fail", Reason: "Server accepted a random recipient", RawSignal: "accept_all", Score: 0, Weight: e.config.ScoringWeights.CatchAllRisk}
	} else if intelligence.SMTPValidation.AcceptAllStatus == "no" {
		intelligence.DomainIntelligence.IsCatchAll = models.ValidationResult{Status: "pass", Reason: "Server rejected a random recipient", RawSignal: "not_accept_all", Score: e.config.ScoringWeights.CatchAllRisk, Weight: e.config.ScoringWeights.CatchAllRisk}
	}

	// 6. Calculate Enterprise Score
	intelligence.ScoreBreakdown = e.scoreAnalyzer.Calculate(intelligence)
	intelligence.ValidationScore = intelligence.ScoreBreakdown.TotalScore

	// 7. Risk Analysis
	intelligence.RiskAnalysis = e.riskAnalyzer.Analyze(intelligence)

	// 8. Determine quality and the explicit deliverability state.
	e.qualityAnalyzer.Determine(intelligence)

	// 9. Produce deterministic heuristic estimates after status is known.
	intelligence.MLPredictions = e.mlAnalyzer.Predict(intelligence)

	// 10. Generate user-friendly content.
	e.contentGenerator.Generate(intelligence)

	intelligence.ProcessingTime = time.Since(startTime).Milliseconds()

	// Cache result
	if !deepAnalysis {
		e.cache.Set(cacheKey, intelligence, cache.DefaultExpiration)
	}

	return intelligence, nil
}

func (e *Engine) verifyMailbox(ctx context.Context, email string, mxRecords []models.MXRecord) models.SMTPValidationResult {
	if e.mailboxVerifier != nil {
		result, err := e.mailboxVerifier.Verify(ctx, email)
		if err == nil {
			return result
		}
		if e.config.SMTPFallbackEnabled {
			return e.smtpValidator.Validate(ctx, email, mxRecords)
		}
		return models.SMTPValidationResult{
			Reachable: models.ValidationResult{
				Status: "unknown", Reason: "The external verification provider was unavailable; mailbox existence is unknown",
				RawSignal: "provider_error", Weight: e.config.ScoringWeights.SMTPReachability,
			},
			MailboxStatus: "unknown", AcceptAllStatus: "unknown", Attempted: true, Source: "verifalia",
		}
	}
	if e.config.VerificationProvider == "verifalia" {
		return models.SMTPValidationResult{
			Reachable: models.ValidationResult{
				Status: "unknown", Reason: "Verifalia credentials are not configured; mailbox verification was not performed",
				RawSignal: "provider_not_configured", Weight: e.config.ScoringWeights.SMTPReachability,
			},
			MailboxStatus: "not_checked", AcceptAllStatus: "not_checked", Source: "verifalia",
		}
	}
	return e.smtpValidator.Validate(ctx, email, mxRecords)
}

func (e *Engine) applyProviderSignals(intelligence *models.EmailIntelligence) {
	signals := intelligence.SMTPValidation.ProviderSignals
	if signals.Disposable != nil && *signals.Disposable {
		intelligence.DomainIntelligence.IsDisposable = models.ValidationResult{
			Status: "fail", Reason: "External verification provider identified a disposable address",
			RawSignal: "provider_disposable", Score: 0, Weight: e.config.ScoringWeights.DisposableCheck,
		}
	}
	if signals.Free != nil && *signals.Free {
		intelligence.DomainIntelligence.IsFreeProvider = models.ValidationResult{
			Status: "pass", Reason: "External verification provider identified a free email provider",
			RawSignal: "provider_free", Score: 0,
		}
	}
}

func fmtCacheKey(email string, deep bool) string {
	if deep {
		return email + "|deep"
	}
	return email + "|basic"
}

// normalizeEmail preserves the local-part because RFC mailbox local-parts can
// be case-sensitive, while DNS domains are case-insensitive.
func normalizeEmail(email string) string {
	email = strings.TrimSpace(email)
	at := strings.LastIndexByte(email, '@')
	if at < 0 {
		return email
	}
	return email[:at+1] + strings.ToLower(email[at+1:])
}
