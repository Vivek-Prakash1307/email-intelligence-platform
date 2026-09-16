// Package server wires the HTTP API and starts the service.
package server

import (
	"log"
	"net/http"

	"email-intelligence/internal/config"
	"email-intelligence/internal/engine"
	"email-intelligence/internal/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

// Run configures and starts the HTTP server.
func Run() {
	cfg := config.Load()

	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-Rate-Limit", "X-Processing-Time"},
		AllowCredentials: false,
		MaxAge:           86400,
	}))

	eng := engine.New(cfg)
	h := handlers.New(eng)

	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"service": "email-intelligence-api",
			"status":  "healthy",
			"health":  "/api/v1/health",
			"version": "3.2.0",
		})
	})

	v1 := router.Group("/api/v1")
	{
		v1.POST("/analyze", h.AnalyzeEmail)
		v1.POST("/bulk-analyze", h.BulkAnalyze)
		v1.GET("/health", h.Health)
		v1.GET("/metrics", h.Metrics)
		v1.GET("/scoring-weights", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"algorithm": "Enterprise Email Intelligence Scoring",
				"version":   "3.2.0",
				"weights":   cfg.ScoringWeights,
				"total":     100,
			})
		})
	}

	log.Printf("Email verification service starting on port %s", cfg.Port)
	log.Printf("Validation: syntax, DNS/MX, SMTP recipient, catch-all, SPF/DMARC/DKIM")
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
