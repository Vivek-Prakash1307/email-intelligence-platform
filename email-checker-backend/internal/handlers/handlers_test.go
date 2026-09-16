package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"email-intelligence/internal/config"
	"email-intelligence/internal/engine"

	"github.com/gin-gonic/gin"
)

func testRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	handler := New(engine.New(config.Load()))
	router.POST("/analyze", handler.AnalyzeEmail)
	router.POST("/bulk", handler.BulkAnalyze)
	return router
}

func TestAnalyzeInvalidEmailResponse(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/analyze", bytes.NewBufferString(`{"email":"not-an-email","deep_analysis":true}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	testRouter().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["deliverability_status"] != "invalid" || body["validation_score"].(float64) != 0 {
		t.Fatalf("unexpected response: %v", body)
	}
}

func TestBulkRejectsEmptyList(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/bulk", bytes.NewBufferString(`{"emails":[],"deep_analysis":false}`))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	testRouter().ServeHTTP(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400; body = %s", response.Code, response.Body.String())
	}
}
