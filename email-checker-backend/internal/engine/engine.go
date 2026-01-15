package engine

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"email-intelligence/internal/analyzers"
	"email-intelligence/internal/config"
	"email-intelligence/internal/models"
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
	domainValidator   *validators.DomainValidator
	scoreAnalyzer     *analyzers.ScoreAnalyzer
	riskAnalyzer      *analyzers.RiskAnalyzer
	mlAnalyzer        *analyzers.MLAnalyzer
	qualityAnalyzer   *analyzers.QualityAnalyzer
	contentGenerator  *analyzers.ContentGenerator
	rateLimiter       map[string]time.Time
	rateLimitMutex    sync.RWMutex
}

// New creates a new email intelligence engine
func New(cfg *config.Config) *Engine {
	return &Engine{
		config:            cfg,
		cache:             cache.New(cfg.CacheDuration, cfg.CacheDuration*2),
		syntaxValidator:   validators.NewSyntaxValidator(cfg.ScoringWeights),
		dnsValidator:      validators.NewDNSValidator(cfg.DNSTimeout),
		securityValidator: validators.NewSecurityValidator(cfg.DNSTimeout),
		smtpValidator:     validators.NewSMTPValidator(cfg.SMTPTimeout, cfg.ScoringWeights),
		domainValidator:   validators.NewDomainValidator(cfg.ScoringWeights),
		scoreAnalyzer:     analyzers.NewScoreAnalyzer(cfg.ScoringWeights),
		riskAnalyzer:      analyzers.NewRiskAnalyzer(),
		mlAnalyzer:        analyzers.NewMLAnalyzer(),
		qualityAnalyzer:   analyzers.NewQualityAnalyzer(),
		contentGenerator:  analyzers.NewContentGenerator(),
		rateLimiter:       make(map[string]time.Time),
	}
}

// AnalyzeEmail performs complete email intelligence analysis
func (e *Engine) AnalyzeEmail(ctx context.Context, email string, deepAnalysis bool) (*models.EmailIntelligence, error) {
	startTime := time.Now()
	
	// Check cache first
	if cached, found := e.cache.Get(email); found {
		if intelligence, ok := cached.(*models.EmailIntelligence); ok {
			return intelligence, nil
		}
	}
	
	// Rate limiting check
	if !e.checkRateLimit(email) {
		return nil, fmt.Errorf("rate limit exceeded")
	}
	
	email = strings.TrimSpace(strings.ToLower(email))
	
	intelligence := &models.EmailIntelligence{
		Email:      email,
		Timestamp:  time.Now(),
		APIVersion: "2.0.0",
	}
	
	// 1. Syntax Validation (immediate)
	intelligence.SyntaxValidation = e.syntaxValidator.Validate(email)
	
	if intelligence.SyntaxValidation.Status != "pass" {
		intelligence.IsValid = false
		intelligence.ValidationScore = 0
		intelligence.RiskCategory = "Invalid"
		intelligence.ConfidenceLevel = "High"
		intelligence.ProcessingTime = time.Since(startTime).Milliseconds()
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
		intelligence.SMTPValidation = e.smtpValidator.Validate(ctx, email, intelligence.DNSValidation.MXDetails)
	}
	
	// 6. Calculate Enterprise Score
	intelligence.ScoreBreakdown = e.scoreAnalyzer.Calculate(intelligence)
	intelligence.ValidationScore = intelligence.ScoreBreakdown.TotalScore
	
	// 7. Risk Analysis
	intelligence.RiskAnalysis = e.riskAnalyzer.Analyze(intelligence)
	
	// 8. ML Predictions
	intelligence.MLPredictions = e.mlAnalyzer.Predict(intelligence)
	
	// 9. Determine Quality Metrics
	e.qualityAnalyzer.Determine(intelligence)
	
	// 10. Generate User-Friendly Content
	e.contentGenerator.Generate(intelligence)
	
	intelligence.ProcessingTime = time.Since(startTime).Milliseconds()
	
	// Cache result
	e.cache.Set(email, intelligence, cache.DefaultExpiration)
	
	return intelligence, nil
}

// checkRateLimit checks if email is rate limited
func (e *Engine) checkRateLimit(email string) bool {
	e.rateLimitMutex.Lock()
	defer e.rateLimitMutex.Unlock()
	
	now := time.Now()
	if lastRequest, exists := e.rateLimiter[email]; exists {
		if now.Sub(lastRequest) < time.Second {
			return false
		}
	}
	
	e.rateLimiter[email] = now
	return true
}
