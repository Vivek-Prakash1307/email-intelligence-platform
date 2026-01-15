package main

import (
	"log"

	"email-intelligence/internal/config"
	"email-intelligence/internal/engine"
	"email-intelligence/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg := config.Load()
	
	// Initialize Gin
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	
	// Add middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	
	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-Rate-Limit", "X-Processing-Time"},
		AllowCredentials: false,
		MaxAge:           86400,
	}))
	
	// Initialize engine and handlers
	eng := engine.New(cfg)
	h := handlers.New(eng)
	
	// API Routes
	v1 := router.Group("/api/v1")
	{
		v1.POST("/analyze", h.AnalyzeEmail)
		v1.POST("/bulk-analyze", h.BulkAnalyze)
		v1.GET("/health", h.Health)
		v1.GET("/metrics", h.Metrics)
		v1.GET("/scoring-weights", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"algorithm": "Enterprise Email Intelligence Scoring",
				"version":   "2.0.0",
				"weights":   cfg.ScoringWeights,
				"total":     100,
			})
		})
	}
	
	// Start server
	log.Printf("🚀 Enterprise Email Intelligence Platform starting on port %s", cfg.Port)
	log.Printf("📊 Ultra-Fast • Highly Accurate • Enterprise-Grade")
	log.Printf("⚡ Parallel Validation: DNS + Security (SPF/DMARC/DKIM) + Domain Intelligence")
	log.Printf("🔥 DKIM: 30+ selectors searched in parallel")
	log.Printf("🌐 SMTP: Multiple MX servers & ports tested concurrently")
	
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}
