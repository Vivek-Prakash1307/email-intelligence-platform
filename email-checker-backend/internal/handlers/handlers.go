package handlers

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"email-intelligence/internal/engine"
	"email-intelligence/internal/models"

	"github.com/gin-gonic/gin"
)

// Handlers contains all HTTP handlers
type Handlers struct {
	engine       *engine.Engine
	requestCount int64
	totalLatency int64
	errorCount   int64
	metricsLock  sync.RWMutex
}

// New creates new handlers
func New(eng *engine.Engine) *Handlers {
	return &Handlers{
		engine: eng,
	}
}

// AnalyzeEmail handles single email analysis
func (h *Handlers) AnalyzeEmail(c *gin.Context) {
	startTime := time.Now()
	
	var request struct {
		Email        string `json:"email" binding:"required"`
		DeepAnalysis bool   `json:"deep_analysis"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}
	
	intelligence, err := h.engine.AnalyzeEmail(c.Request.Context(), request.Email, request.DeepAnalysis)
	if err != nil {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": err.Error(),
		})
		return
	}
	
	c.Header("X-Processing-Time", fmt.Sprintf("%dms", time.Since(startTime).Milliseconds()))
	c.Header("X-Confidence-Level", intelligence.ConfidenceLevel)
	c.Header("X-Risk-Category", intelligence.RiskCategory)
	
	h.updateMetrics(intelligence.ProcessingTime, intelligence.IsValid)
	
	c.JSON(http.StatusOK, intelligence)
}

// BulkAnalyze handles bulk email analysis
func (h *Handlers) BulkAnalyze(c *gin.Context) {
	startTime := time.Now()
	
	var request struct {
		Emails       []string `json:"emails" binding:"required"`
		DeepAnalysis bool     `json:"deep_analysis"`
	}
	
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request format",
			"details": err.Error(),
		})
		return
	}
	
	if len(request.Emails) > 1000 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":    "Too many emails. Maximum 1000 emails per request",
			"limit":    1000,
			"received": len(request.Emails),
		})
		return
	}
	
	// Process emails concurrently
	results := make([]*models.EmailIntelligence, len(request.Emails))
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 50)
	
	for i, email := range request.Emails {
		wg.Add(1)
		go func(index int, emailAddr string) {
			defer wg.Done()
			
			semaphore <- struct{}{}
			defer func() { <-semaphore }()
			
			intelligence, err := h.engine.AnalyzeEmail(c.Request.Context(), emailAddr, request.DeepAnalysis)
			if err != nil {
				intelligence = &models.EmailIntelligence{
					Email:           emailAddr,
					IsValid:         false,
					ValidationScore: 0,
					RiskCategory:    "Error",
					ConfidenceLevel: "Low",
					Warnings:        []string{err.Error()},
				}
			}
			results[index] = intelligence
		}(i, email)
	}
	
	wg.Wait()
	
	summary := h.generateBulkSummary(results)
	processingTime := time.Since(startTime).Milliseconds()
	
	c.Header("X-Processing-Time", fmt.Sprintf("%dms", processingTime))
	c.Header("X-Processed-Count", fmt.Sprintf("%d", len(results)))
	
	c.JSON(http.StatusOK, gin.H{
		"results": results,
		"summary": summary,
		"performance": gin.H{
			"processing_time_ms": processingTime,
			"emails_per_second":  float64(len(results)) / (float64(processingTime) / 1000),
			"total_emails":       len(results),
		},
	})
}

// Health returns health status
func (h *Handlers) Health(c *gin.Context) {
	h.metricsLock.RLock()
	avgLatency := float64(0)
	if h.requestCount > 0 {
		avgLatency = float64(h.totalLatency) / float64(h.requestCount)
	}
	successRate := float64(h.requestCount-h.errorCount) / float64(max(h.requestCount, 1)) * 100
	h.metricsLock.RUnlock()
	
	c.JSON(http.StatusOK, gin.H{
		"status":      "healthy",
		"service":     "enterprise-email-intelligence-platform",
		"version":     "2.0.0",
		"timestamp":   time.Now().Format(time.RFC3339),
		"performance": gin.H{
			"avg_latency_ms": avgLatency,
			"success_rate":   successRate,
			"total_requests": h.requestCount,
		},
		"features": []string{
			"Ultra-Accurate Scoring (0-100)",
			"Real-time Intelligence",
			"ML-Enhanced Predictions",
			"Enterprise Security Analysis",
			"Bulk Processing (1000 emails)",
			"Advanced Risk Assessment",
			"Parallel Validation Pipeline",
		},
	})
}

// Metrics returns performance metrics
func (h *Handlers) Metrics(c *gin.Context) {
	h.metricsLock.RLock()
	defer h.metricsLock.RUnlock()
	
	c.JSON(http.StatusOK, gin.H{
		"requests": gin.H{
			"total":   h.requestCount,
			"errors":  h.errorCount,
			"success": h.requestCount - h.errorCount,
		},
		"performance": gin.H{
			"total_latency_ms": h.totalLatency,
			"avg_latency_ms":   float64(h.totalLatency) / float64(max(h.requestCount, 1)),
			"success_rate":     float64(h.requestCount-h.errorCount) / float64(max(h.requestCount, 1)) * 100,
		},
	})
}

func (h *Handlers) updateMetrics(latency int64, isValid bool) {
	h.metricsLock.Lock()
	defer h.metricsLock.Unlock()
	
	h.requestCount++
	h.totalLatency += latency
	
	if !isValid {
		h.errorCount++
	}
}

func (h *Handlers) generateBulkSummary(results []*models.EmailIntelligence) gin.H {
	total := len(results)
	valid := 0
	premium := 0
	highRisk := 0
	disposable := 0
	
	for _, result := range results {
		if result.IsValid {
			valid++
		}
		if result.QualityTier == "Premium" {
			premium++
		}
		if result.RiskCategory == "High Risk" {
			highRisk++
		}
		if result.DomainIntelligence.IsDisposable.Status == "fail" {
			disposable++
		}
	}
	
	return gin.H{
		"total":            total,
		"valid":            valid,
		"invalid":          total - valid,
		"premium":          premium,
		"high_risk":        highRisk,
		"disposable":       disposable,
		"valid_percentage": float64(valid) / float64(total) * 100,
	}
}

func max(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}
