package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"email-intelligence/internal/models"
)

// Config holds application configuration
type Config struct {
	Port                 string
	CORSOrigins          []string
	SMTPTimeout          time.Duration
	DNSTimeout           time.Duration
	WorkerPoolSize       int
	CacheDuration        time.Duration
	VerificationProvider string
	VerifaliaUsername    string
	VerifaliaPassword    string
	VerifaliaTimeout     time.Duration
	VerifaliaConcurrency int
	SMTPFallbackEnabled  bool
	ScoringWeights       models.ScoringWeights
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Port:                 getEnv("PORT", "8080"),
		CORSOrigins:          getCORSOrigins(),
		SMTPTimeout:          getDurationEnv("SMTP_TIMEOUT", 8*time.Second),
		DNSTimeout:           getDurationEnv("DNS_TIMEOUT", 4*time.Second),
		WorkerPoolSize:       100,
		CacheDuration:        15 * time.Minute,
		VerificationProvider: strings.ToLower(getEnv("EMAIL_VERIFICATION_PROVIDER", "auto")),
		VerifaliaUsername:    os.Getenv("VERIFALIA_USERNAME"),
		VerifaliaPassword:    os.Getenv("VERIFALIA_PASSWORD"),
		VerifaliaTimeout:     getDurationEnv("VERIFALIA_TIMEOUT", 20*time.Second),
		VerifaliaConcurrency: getPositiveIntEnv("VERIFALIA_MAX_CONCURRENCY", 5),
		SMTPFallbackEnabled:  getBoolEnv("SMTP_FALLBACK_ENABLED", false),
		ScoringWeights: models.ScoringWeights{
			SyntaxFormat:     10,
			MXRecords:        25,
			SecurityRecords:  0, // informational: sender authentication does not prove recipient existence
			SMTPReachability: 45,
			DisposableCheck:  10,
			DomainReputation: 0, // unknown reputation never receives assumed credit
			CatchAllRisk:     10,
		},
	}
}

func getPositiveIntEnv(key string, defaultValue int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value <= 0 {
		return defaultValue
	}
	return value
}

func getBoolEnv(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func getDurationEnv(key string, defaultValue time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		return defaultValue
	}
	return parsed
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getCORSOrigins() []string {
	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,https://email-intelligence-platform-eora-3d3gdricp.vercel.app,https://email-intelligence-platform-eora.vercel.app,https://email-intelligence-platform.vercel.app")
	result := []string{}
	for _, origin := range splitAndTrim(origins, ",") {
		if origin != "" {
			result = append(result, origin)
		}
	}
	return result
}

func splitAndTrim(s, sep string) []string {
	parts := []string{}
	for _, part := range splitString(s, sep) {
		trimmed := trimSpace(part)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func splitString(s, sep string) []string {
	if s == "" {
		return []string{}
	}
	result := []string{}
	current := ""
	for _, char := range s {
		if string(char) == sep {
			result = append(result, current)
			current = ""
		} else {
			current += string(char)
		}
	}
	result = append(result, current)
	return result
}

func trimSpace(s string) string {
	start := 0
	end := len(s)

	for start < end && (s[start] == ' ' || s[start] == '\t' || s[start] == '\n' || s[start] == '\r') {
		start++
	}

	for end > start && (s[end-1] == ' ' || s[end-1] == '\t' || s[end-1] == '\n' || s[end-1] == '\r') {
		end--
	}

	return s[start:end]
}
