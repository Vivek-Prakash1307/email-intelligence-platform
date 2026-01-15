package config

import (
	"os"
	"time"

	"email-intelligence/internal/models"
)

// Config holds application configuration
type Config struct {
	Port             string
	CORSOrigins      []string
	SMTPTimeout      time.Duration
	DNSTimeout       time.Duration
	WorkerPoolSize   int
	CacheDuration    time.Duration
	ScoringWeights   models.ScoringWeights
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Port:           getEnv("PORT", "8080"),
		CORSOrigins:    getCORSOrigins(),
		SMTPTimeout:    3 * time.Second,
		DNSTimeout:     2 * time.Second,
		WorkerPoolSize: 100,
		CacheDuration:  15 * time.Minute,
		ScoringWeights: models.ScoringWeights{
			SyntaxFormat:     10,
			MXRecords:        20,
			SecurityRecords:  20,
			SMTPReachability: 20,
			DisposableCheck:  10,
			DomainReputation: 10,
			CatchAllRisk:     10,
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getCORSOrigins() []string {
	origins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,https://email-intelligence-platform.vercel.app")
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
