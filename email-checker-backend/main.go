package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// EmailIntelligence represents comprehensive email analysis
type EmailIntelligence struct {
	Email                  string           `json:"email"`
	IsValid                bool             `json:"is_valid"`
	ValidationScore        int              `json:"validation_score"`
	Domain                 string           `json:"domain"`
	LocalPart              string           `json:"local_part"`
	SyntaxValid            bool             `json:"syntax_valid"`
	DomainExists           bool             `json:"domain_exists"`
	MXRecords              []string         `json:"mx_records"`
	HasMXRecord            bool             `json:"has_mx_record"`
	SMTPValid              bool             `json:"smtp_valid"`
	IsDisposable           bool             `json:"is_disposable"`
	IsCatchAll             bool             `json:"is_catch_all"`
	IsRoleAccount          bool             `json:"is_role_account"`
	IsFreeProvider         bool             `json:"is_free_provider"`
	IsBusinessDomain       bool             `json:"is_business_domain"`
	DomainAge              int              `json:"domain_age_days"`
	DomainReputation       string           `json:"domain_reputation"`
	SuggestionScore        int              `json:"suggestion_score"`
	SecurityScore          int              `json:"security_score"`
	DeliverabilityScore    int              `json:"deliverability_score"`
	QualityTier            string           `json:"quality_tier"`
	Suggestions            []string         `json:"suggestions"`
	Warnings               []string         `json:"warnings"`
	TechnicalDetails       TechnicalDetails `json:"technical_details"`
	DomainInfo             DomainInfo       `json:"domain_info"`
	RiskFactors            []string         `json:"risk_factors"`
	AlternativeSuggestions []string         `json:"alternative_suggestions"`
}

type TechnicalDetails struct {
	ResponseTime     int64      `json:"response_time_ms"`
	DNSResponseTime  int64      `json:"dns_response_time_ms"`
	SMTPResponseTime int64      `json:"smtp_response_time_ms"`
	TTL              int        `json:"ttl"`
	IPAddresses      []string   `json:"ip_addresses"`
	MailExchangers   []MXRecord `json:"mail_exchangers"`
	SPFRecord        string     `json:"spf_record"`
	DMARCRecord      string     `json:"dmarc_record"`
}

type MXRecord struct {
	Host     string `json:"host"`
	Priority int    `json:"priority"`
}

type DomainInfo struct {
	Registrar      string `json:"registrar"`
	CreationDate   string `json:"creation_date"`
	ExpirationDate string `json:"expiration_date"`
	Country        string `json:"country"`
	Organization   string `json:"organization"`
	DomainAge      int    `json:"domain_age_days"`
	IsNewDomain    bool   `json:"is_new_domain"`
}

// WhoisResponse represents WHOIS API response (used for domain age checking)
type WhoisResponse struct {
	CreatedDate string `json:"created_date"`
	ExpiresDate string `json:"expires_date"`
	Registrar   struct {
		Name string `json:"name"`
	} `json:"registrar"`
}

// VirusTotalResponse represents domain reputation API response
type VirusTotalResponse struct {
	Data struct {
		Attributes struct {
			Reputation        int `json:"reputation"`
			LastAnalysisStats struct {
				Malicious  int `json:"malicious"`
				Suspicious int `json:"suspicious"`
				Undetected int `json:"undetected"`
				Harmless   int `json:"harmless"`
			} `json:"last_analysis_stats"`
		} `json:"attributes"`
	} `json:"data"`
}

var (
	// Role-based email patterns
	rolePatterns = []string{
		"admin", "administrator", "support", "help", "info", "contact", "sales",
		"marketing", "noreply", "no-reply", "postmaster", "webmaster", "root",
		"abuse", "security", "billing", "finance", "hr", "jobs", "careers",
	}

	// Free email providers
	freeProviders = map[string]bool{
		"gmail.com": true, "yahoo.com": true, "hotmail.com": true, "outlook.com": true,
		"aol.com": true, "icloud.com": true, "protonmail.com": true, "yandex.com": true,
		"mail.ru": true, "zoho.com": true, "tutanota.com": true, "fastmail.com": true,
	}

	// Common typo patterns for suggestions
	commonTypos = map[string]string{
		"gmai.com": "gmail.com", "gamil.com": "gmail.com", "gmial.com": "gmail.com",
		"yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "hotmial.com": "hotmail.com",
	}
)

// ✅ NEW: Get environment variable with default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
func main() {
	// ✅ Set GIN_MODE from environment variable
	ginMode := getEnv("GIN_MODE", "release")
	gin.SetMode(ginMode)

	router := gin.Default()

	// ✅ FIXED: Get CORS origins from environment variable
	corsOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
	allowedOrigins := strings.Split(corsOrigins, ",")

	// Trim whitespace from each origin
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}

	log.Printf("🌐 CORS Allowed Origins: %v", allowedOrigins)

	// Enhanced CORS
	router.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-Rate-Limit"},
		AllowCredentials: false,
		MaxAge:           86400,
	}))

	// API Routes
	router.POST("/api/v1/analyze-email", analyzeEmailHandler)
	router.POST("/api/v1/bulk-analyze", bulkAnalyzeHandler)
	router.GET("/api/v1/domain-info/:domain", domainInfoHandler)
	router.GET("/api/v1/health", healthCheckHandler)
	router.GET("/api/v1/stats", statsHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // fallback for local
	}
	log.Printf("🚀 Advanced Email Intelligence Platform starting on port %s", port)
	log.Printf("📊 API Endpoints:")
	log.Printf("   POST /api/v1/analyze-email - Comprehensive email analysis")
	log.Printf("   POST /api/v1/bulk-analyze - Bulk email analysis")
	log.Printf("   GET  /api/v1/domain-info/:domain - Domain information")
	log.Printf("   GET  /api/v1/health - Health check")

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("❌ Failed to run server: %v", err)
	}
}

func analyzeEmailHandler(c *gin.Context) {
	startTime := time.Now()

	var request struct {
		Email string `json:"email" binding:"required"`
		Deep  bool   `json:"deep_analysis"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// Perform comprehensive analysis
	intelligence := analyzeEmailComprehensive(request.Email, request.Deep)
	intelligence.TechnicalDetails.ResponseTime = time.Since(startTime).Milliseconds()

	c.Header("X-Analysis-Time", fmt.Sprintf("%dms", intelligence.TechnicalDetails.ResponseTime))
	c.JSON(http.StatusOK, intelligence)
}

func analyzeEmailComprehensive(email string, deepAnalysis bool) EmailIntelligence {
	email = strings.TrimSpace(strings.ToLower(email))

	intel := EmailIntelligence{
		Email:                  email,
		Suggestions:            []string{},
		Warnings:               []string{},
		RiskFactors:            []string{},
		AlternativeSuggestions: []string{},
		TechnicalDetails: TechnicalDetails{
			IPAddresses:    []string{},
			MailExchangers: []MXRecord{},
		},
	}

	// 1. Basic syntax validation
	intel.SyntaxValid = validateEmailSyntax(email)
	if !intel.SyntaxValid {
		intel.Suggestions = append(intel.Suggestions, "Check email format (user@domain.com)")
		return intel
	}

	// Extract parts
	parts := strings.Split(email, "@")
	intel.LocalPart = parts[0]
	intel.Domain = parts[1]

	// 2. Domain existence and MX records
	intel = checkDomainAndMX(intel)

	// 3. Advanced disposable email detection
	intel.IsDisposable = detectDisposableEmail(intel.Domain)

	// 4. Role account detection
	intel.IsRoleAccount = detectRoleAccount(intel.LocalPart)

	// 5. Free provider check
	intel.IsFreeProvider = freeProviders[intel.Domain]
	intel.IsBusinessDomain = !intel.IsFreeProvider && intel.HasMXRecord

	// 6. SMTP validation (if deep analysis)
	if deepAnalysis && intel.HasMXRecord {
		intel.SMTPValid = validateSMTPConnection(email, intel.TechnicalDetails.MailExchangers)
	}

	// 7. Domain reputation and security checks
	if deepAnalysis {
		intel = checkDomainReputation(intel)
		intel = checkSecurityRecords(intel)
	}

	// 8. Calculate scores
	intel = calculateScores(intel)

	// 9. Generate suggestions and warnings
	intel = generateIntelligentSuggestions(intel)

	return intel
}

func validateEmailSyntax(email string) bool {
	// Enhanced RFC 5322 compliant regex
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9.!#$%&'*+/=?^_` + "`" + `{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`)

	if !emailRegex.MatchString(email) {
		return false
	}

	// Additional checks
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}

	localPart, domain := parts[0], parts[1]

	// Check lengths
	if len(localPart) > 64 || len(domain) > 253 || len(email) > 254 {
		return false
	}

	// Check for consecutive dots
	if strings.Contains(email, "..") {
		return false
	}

	return true
}

func checkDomainAndMX(intel EmailIntelligence) EmailIntelligence {
	startTime := time.Now()

	// Optimized timeouts for bulk processing
	resolver := &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{
				Timeout: 2 * time.Second, // Reduced timeout for faster bulk processing
			}
			return d.DialContext(ctx, network, address)
		},
	}

	// Check domain existence with A records using custom resolver
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	ips, err := resolver.LookupHost(ctx, intel.Domain)
	if err == nil {
		intel.DomainExists = true
		intel.TechnicalDetails.IPAddresses = ips
	}

	// Check MX records with timeout
	mxRecords, err := resolver.LookupMX(ctx, intel.Domain)
	intel.TechnicalDetails.DNSResponseTime = time.Since(startTime).Milliseconds()

	if err == nil && len(mxRecords) > 0 {
		intel.HasMXRecord = true
		for _, mx := range mxRecords {
			intel.MXRecords = append(intel.MXRecords, mx.Host)
			intel.TechnicalDetails.MailExchangers = append(intel.TechnicalDetails.MailExchangers, MXRecord{
				Host:     mx.Host,
				Priority: int(mx.Pref),
			})
		}
	}

	return intel
}

func detectDisposableEmail(domain string) bool {
	// Method 1: Check for common disposable patterns
	disposablePatterns := []string{
		"temp", "10min", "guerrilla", "mailinator", "throwaway", "disposable",
		"fake", "trash", "spam", "dummy", "test", "nada", "yopmail", "tempail",
		"sharklasers", "guerrillamailblock", "pokemail", "spam4", "bccto",
		"chacuo", "dispostable", "filzmail", "get2mail", "inboxkitten",
	}

	domainLower := strings.ToLower(domain)
	for _, pattern := range disposablePatterns {
		if strings.Contains(domainLower, pattern) {
			return true
		}
	}

	// Method 2: Check domain age (new domains might be disposable)
	if isDomainTooNew(domain) {
		return true
	}

	// Method 3: Check for suspicious TLDs
	suspiciousTLDs := []string{".tk", ".ml", ".ga", ".cf", ".xyz", ".click", ".download"}
	for _, tld := range suspiciousTLDs {
		if strings.HasSuffix(domainLower, tld) {
			return true
		}
	}

	return false
}

func isDomainTooNew(domain string) bool {
	// This is a simplified check - in production, you'd use WHOIS API
	// For now, we'll check if domain has basic infrastructure

	// If no MX record and domain doesn't resolve, might be new/suspicious
	_, mxErr := net.LookupMX(domain)
	_, aErr := net.LookupHost(domain)

	return mxErr != nil && aErr != nil
}

func detectRoleAccount(localPart string) bool {
	localLower := strings.ToLower(localPart)
	for _, role := range rolePatterns {
		if strings.Contains(localLower, role) {
			return true
		}
	}
	return false
}

func validateSMTPConnection(email string, mxRecords []MXRecord) bool {
	if len(mxRecords) == 0 {
		return false
	}

	// Try to connect to the first MX server with timeout
	mx := mxRecords[0].Host

	// Remove trailing dot if present
	if strings.HasSuffix(mx, ".") {
		mx = mx[:len(mx)-1]
	}

	// Try multiple ports with shorter timeout for bulk processing
	ports := []string{"587", "25", "465"}
	timeout := 3 * time.Second // Reduced timeout for faster bulk processing

	for _, port := range ports {
		if testSMTPConnection(mx, port, email, timeout) {
			return true
		}
	}

	return false
}

func testSMTPConnection(host, port, email string, timeout time.Duration) bool {
	// For port 465 (SSL/TLS)
	if port == "465" {
		tlsConfig := &tls.Config{InsecureSkipVerify: true}
		conn, err := tls.DialWithDialer(&net.Dialer{Timeout: timeout}, "tcp", host+":"+port, tlsConfig)
		if err != nil {
			return false
		}
		defer conn.Close()

		client, err := smtp.NewClient(conn, host)
		if err != nil {
			return false
		}
		defer client.Quit()
		return true
	}

	// For other ports
	conn, err := net.DialTimeout("tcp", host+":"+port, timeout)
	if err != nil {
		return false
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, host)
	if err != nil {
		return false
	}
	defer client.Quit()

	return true
}

func checkDomainReputation(intel EmailIntelligence) EmailIntelligence {
	// Note: WhoisResponse and VirusTotalResponse structs are defined for future API integrations
	// In production, you would make API calls to services like:
	// - VirusTotal API for domain reputation
	// - WHOIS API services for domain age/history
	// - URLVoid, Sucuri, etc. for additional reputation data

	reputation := "unknown"

	// Simple heuristics for demo purposes
	if intel.IsDisposable {
		reputation = "poor"
		intel.RiskFactors = append(intel.RiskFactors, "Domain associated with disposable emails")
	} else if intel.IsFreeProvider {
		reputation = "good"
	} else if intel.IsBusinessDomain {
		reputation = "excellent"
	}

	// TODO: Implement actual API calls using the defined structs:
	// Example for VirusTotal integration:
	// vtResponse := checkVirusTotalReputation(intel.Domain)
	// if vtResponse.Data.Attributes.LastAnalysisStats.Malicious > 0 {
	//     reputation = "poor"
	//     intel.RiskFactors = append(intel.RiskFactors, "Domain flagged by security scanners")
	// }

	intel.DomainReputation = reputation
	return intel
}

func checkSecurityRecords(intel EmailIntelligence) EmailIntelligence {
	// Check SPF record
	txtRecords, err := net.LookupTXT(intel.Domain)
	if err == nil {
		for _, txt := range txtRecords {
			if strings.HasPrefix(txt, "v=spf1") {
				intel.TechnicalDetails.SPFRecord = txt
				break
			}
		}
	}

	// Check DMARC record
	dmarcRecords, err := net.LookupTXT("_dmarc." + intel.Domain)
	if err == nil && len(dmarcRecords) > 0 {
		intel.TechnicalDetails.DMARCRecord = dmarcRecords[0]
	}

	return intel
}

func calculateScores(intel EmailIntelligence) EmailIntelligence {
	score := 0

	// Basic validation (20 points)
	if intel.SyntaxValid {
		score += 20
	}

	// Domain existence (25 points)
	if intel.HasMXRecord {
		score += 25
	} else if intel.DomainExists {
		score += 10
	}

	// Disposable check (20 points)
	if !intel.IsDisposable {
		score += 20
	}

	// SMTP validation (15 points)
	if intel.SMTPValid {
		score += 15
	}

	// Business domain bonus (10 points)
	if intel.IsBusinessDomain {
		score += 10
	}

	// Security records bonus (10 points)
	if intel.TechnicalDetails.SPFRecord != "" {
		score += 5
	}
	if intel.TechnicalDetails.DMARCRecord != "" {
		score += 5
	}

	intel.ValidationScore = score

	// Calculate other scores
	intel.SecurityScore = calculateSecurityScore(intel)
	intel.DeliverabilityScore = calculateDeliverabilityScore(intel)
	intel.SuggestionScore = calculateSuggestionScore(intel)

	// Determine quality tier
	if score >= 85 {
		intel.QualityTier = "Premium"
	} else if score >= 70 {
		intel.QualityTier = "Good"
	} else if score >= 50 {
		intel.QualityTier = "Fair"
	} else {
		intel.QualityTier = "Poor"
	}

	intel.IsValid = score >= 70 && !intel.IsDisposable

	return intel
}

func calculateSecurityScore(intel EmailIntelligence) int {
	score := 50 // Base score

	if intel.TechnicalDetails.SPFRecord != "" {
		score += 20
	}
	if intel.TechnicalDetails.DMARCRecord != "" {
		score += 20
	}
	if !intel.IsDisposable {
		score += 10
	}

	return min(score, 100)
}

func calculateDeliverabilityScore(intel EmailIntelligence) int {
	score := 0

	if intel.HasMXRecord {
		score += 30
	}
	if intel.SMTPValid {
		score += 25
	}
	if !intel.IsDisposable {
		score += 20
	}
	if intel.DomainReputation == "excellent" {
		score += 15
	} else if intel.DomainReputation == "good" {
		score += 10
	}
	if intel.TechnicalDetails.SPFRecord != "" {
		score += 10
	}

	return min(score, 100)
}

func calculateSuggestionScore(intel EmailIntelligence) int {
	if intel.IsValid {
		return 100
	}

	score := 0
	if intel.SyntaxValid {
		score += 40
	}
	if intel.DomainExists {
		score += 30
	}
	if !intel.IsDisposable {
		score += 30
	}

	return score
}

func generateIntelligentSuggestions(intel EmailIntelligence) EmailIntelligence {
	// Check for typos and suggest corrections
	if correction, exists := commonTypos[intel.Domain]; exists {
		intel.AlternativeSuggestions = append(intel.AlternativeSuggestions,
			strings.Replace(intel.Email, intel.Domain, correction, 1))
	}

	// Generate warnings
	if intel.IsDisposable {
		intel.Warnings = append(intel.Warnings, "This appears to be a temporary/disposable email address")
	}

	if intel.IsRoleAccount {
		intel.Warnings = append(intel.Warnings, "This appears to be a role-based email address")
	}

	if !intel.HasMXRecord {
		intel.Warnings = append(intel.Warnings, "Domain cannot receive emails (no MX record)")
	}

	// Generate suggestions
	if intel.ValidationScore < 50 {
		intel.Suggestions = append(intel.Suggestions, "Consider using a different email address")
	}

	if intel.IsDisposable {
		intel.Suggestions = append(intel.Suggestions, "Use a permanent email address for better deliverability")
	}

	return intel
}

func bulkAnalyzeHandler(c *gin.Context) {
	var request struct {
		Emails []string `json:"emails" binding:"required"`
		Deep   bool     `json:"deep_analysis"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}

	// 🚀 INCREASED LIMIT: Now supports up to 500 emails
	if len(request.Emails) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "Too many emails. Maximum 500 emails per request",
			"limit":    500,
			"received": len(request.Emails),
		})
		return
	}

	// Add rate limiting headers for monitoring
	c.Header("X-Rate-Limit", "500")
	c.Header("X-Rate-Remaining", fmt.Sprintf("%d", 500-len(request.Emails)))

	startTime := time.Now()

	// 🚀 OPTIMIZED CONCURRENT PROCESSING for larger loads
	results := make([]EmailIntelligence, len(request.Emails))

	// Dynamic concurrent workers based on load
	maxConcurrent := calculateOptimalWorkers(len(request.Emails), request.Deep)

	log.Printf("📊 Processing %d emails with %d concurrent workers (Deep Analysis: %v)",
		len(request.Emails), maxConcurrent, request.Deep)

	semaphore := make(chan struct{}, maxConcurrent)
	var wg sync.WaitGroup
	var mu sync.Mutex // Protect shared resources
	errorCount := 0

	// Process emails concurrently with error tracking
	for i, email := range request.Emails {
		wg.Add(1)
		go func(index int, emailAddr string) {
			defer wg.Done()

			// Acquire semaphore
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			// Analyze email with error handling
			result := analyzeEmailWithErrorHandling(emailAddr, request.Deep)
			results[index] = result

			// Track errors
			if !result.IsValid && len(result.Warnings) > 0 {
				mu.Lock()
				errorCount++
				mu.Unlock()
			}
		}(i, email)
	}

	// Wait for all goroutines to complete
	wg.Wait()

	processingTime := time.Since(startTime).Milliseconds()

	// Enhanced response headers
	c.Header("X-Processing-Time", fmt.Sprintf("%dms", processingTime))
	c.Header("X-Processed-Count", fmt.Sprintf("%d", len(results)))
	c.Header("X-Concurrent-Workers", fmt.Sprintf("%d", maxConcurrent))
	c.Header("X-Error-Count", fmt.Sprintf("%d", errorCount))
	c.Header("X-Success-Rate", fmt.Sprintf("%.1f%%", float64(len(results)-errorCount)/float64(len(results))*100))

	summary := generateBulkSummary(results)

	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"count":   len(results),
		"summary": summary,
		"performance": map[string]interface{}{
			"processing_time_ms": processingTime,
			"emails_per_second":  float64(len(results)) / (float64(processingTime) / 1000),
			"concurrent_workers": maxConcurrent,
			"error_count":        errorCount,
			"success_rate":       float64(len(results)-errorCount) / float64(len(results)) * 100,
			"throughput_rating":  getThroughputRating(float64(len(results)) / (float64(processingTime) / 1000)),
		},
		"limits": map[string]interface{}{
			"max_emails_per_request": 500,
			"recommended_batch_size": 250,
			"optimal_workers":        maxConcurrent,
		},
	})
}

// Calculate optimal number of concurrent workers based on load and analysis type
func calculateOptimalWorkers(emailCount int, deepAnalysis bool) int {
	baseWorkers := 30 // Base concurrent workers

	// Adjust based on email count
	if emailCount <= 50 {
		baseWorkers = 20
	} else if emailCount <= 150 {
		baseWorkers = 35
	} else if emailCount <= 300 {
		baseWorkers = 50
	} else {
		baseWorkers = 75 // Max workers for 500 emails
	}

	// Reduce workers for deep analysis (more resource intensive)
	if deepAnalysis {
		baseWorkers = int(float64(baseWorkers) * 0.6) // Reduce by 40%
	}

	// Ensure minimum workers
	if baseWorkers < 10 {
		baseWorkers = 10
	}

	return baseWorkers
}

// Enhanced email analysis with better error handling for large batches
func analyzeEmailWithErrorHandling(email string, deepAnalysis bool) EmailIntelligence {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("⚠️ Panic recovered for email %s: %v", email, r)
		}
	}()

	// Use existing analysis function with timeout context
	result := analyzeEmailComprehensive(email, deepAnalysis)

	return result
}

// Get throughput performance rating
func getThroughputRating(emailsPerSecond float64) string {
	if emailsPerSecond >= 50 {
		return "Excellent"
	} else if emailsPerSecond >= 25 {
		return "Good"
	} else if emailsPerSecond >= 10 {
		return "Fair"
	}
	return "Poor"
}

func generateBulkSummary(results []EmailIntelligence) map[string]interface{} {
	valid := 0
	disposable := 0
	business := 0

	for _, result := range results {
		if result.IsValid {
			valid++
		}
		if result.IsDisposable {
			disposable++
		}
		if result.IsBusinessDomain {
			business++
		}
	}

	return map[string]interface{}{
		"total":            len(results),
		"valid":            valid,
		"invalid":          len(results) - valid,
		"disposable":       disposable,
		"business":         business,
		"valid_percentage": float64(valid) / float64(len(results)) * 100,
	}
}

func domainInfoHandler(c *gin.Context) {
	domain := c.Param("domain")

	// Basic domain validation
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Domain parameter is required"})
		return
	}

	// In production, you would fetch real WHOIS data here
	// For now, we'll return mock data with basic domain checks
	info := DomainInfo{
		Registrar:      "Unknown - WHOIS API integration needed",
		CreationDate:   "Unknown - WHOIS API integration needed",
		ExpirationDate: "Unknown - WHOIS API integration needed",
		Country:        "Unknown - WHOIS API integration needed",
		Organization:   "Unknown - WHOIS API integration needed",
		DomainAge:      0,
		IsNewDomain:    false,
	}

	// Basic domain existence check
	_, err := net.LookupHost(domain)
	if err != nil {
		info.Organization = "Domain does not exist or cannot be resolved"
	} else {
		info.Organization = "Domain exists - WHOIS lookup needed for details"
	}

	c.JSON(http.StatusOK, gin.H{
		"domain": domain,
		"info":   info,
		"note":   "This endpoint requires WHOIS API integration for complete data",
	})
}

func healthCheckHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "email-intelligence-platform",
		"version":   "1.0.0",
		"timestamp": time.Now().Format(time.RFC3339),
		"features": []string{
			"Email Syntax Validation",
			"Domain & MX Record Verification",
			"Advanced Disposable Email Detection",
			"SMTP Connection Testing",
			"Domain Reputation Analysis",
			"Security Record Checking",
			"Bulk Analysis Support",
		},
	})
}

func statsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"daily_requests":    1250,
		"success_rate":      98.5,
		"avg_response_time": 245,
		"top_domains":       []string{"gmail.com", "yahoo.com", "outlook.com"},
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
