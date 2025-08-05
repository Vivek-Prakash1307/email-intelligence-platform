package main

import (
	"context"       // Import the context package
	"encoding/json" // For encoding/decoding JSON data
	"fmt"           // For formatted I/O (e.g., printing to console)
	"log"           // For logging
	"net"           // For network operations like DNS lookups
	"net/http"      // For creating HTTP server and handling requests
	"os"            // For accessing environment variables
	"strings"       // For string manipulation (e.g., trimming whitespace)
	"time"          // For setting timeouts
)

// DomainCheckRequest struct defines the expected structure of the incoming JSON request
// It expects a slice of strings named 'domains'.
type DomainCheckRequest struct {
	Domains []string `json:"domains"`
}

// DomainCheckResult struct defines the structure of each domain's check result
type DomainCheckResult struct {
	Domain  string `json:"domain"`          // The domain that was checked
	IsValid bool   `json:"isValid"`         // True if the domain is valid (has MX records), false otherwise
	Error   string `json:"error,omitempty"` // Optional error message if validation fails
}

// DomainCheckResponse struct defines the overall structure of the JSON response
type DomainCheckResponse struct {
	Results []DomainCheckResult `json:"results"`         // A slice of individual domain check results
	Error   string              `json:"error,omitempty"` // Optional overall error message
}

// checkDomain performs the actual validation for a single domain
func checkDomain(domain string) DomainCheckResult {
	// Trim any leading/trailing whitespace from the domain string
	domain = strings.TrimSpace(domain)

	// Basic format validation: check if the domain is empty or contains spaces
	if domain == "" {
		return DomainCheckResult{Domain: domain, IsValid: false, Error: "Domain cannot be empty"}
	}
	if strings.ContainsAny(domain, " \t\n\r") {
		return DomainCheckResult{Domain: domain, IsValid: false, Error: "Domain contains invalid characters (whitespace)"}
	}

	// Use a custom resolver with a timeout to prevent hanging
	resolver := &net.Resolver{
		PreferGo: true, // Use Go's native DNS resolver
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{
				Timeout: time.Second * 10, // Increased timeout to 10 seconds
			}
			return d.DialContext(ctx, network, address)
		},
	}

	// Create a context with timeout for the DNS lookup
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Perform an MX (Mail Exchange) record lookup for the domain
	// MX records indicate which mail servers are responsible for accepting email for a domain.
	mxRecords, err := resolver.LookupMX(ctx, domain)
	if err != nil {
		// If an error occurs during lookup, the domain is considered invalid for email
		// Common errors include "no such host" (domain doesn't exist) or DNS issues.
		log.Printf("MX lookup failed for domain %s: %v", domain, err)
		return DomainCheckResult{Domain: domain, IsValid: false, Error: fmt.Sprintf("MX lookup failed: %v", err)}
	}

	// If MX records are found, the domain is considered valid for receiving emails
	if len(mxRecords) > 0 {
		log.Printf("Domain %s is valid (found %d MX records)", domain, len(mxRecords))
		return DomainCheckResult{Domain: domain, IsValid: true}
	}

	// If no MX records are found but no error occurred, it means the domain exists
	// but is not configured to receive emails.
	log.Printf("Domain %s is invalid (no MX records found)", domain)
	return DomainCheckResult{Domain: domain, IsValid: false, Error: "No MX records found for this domain"}
}

// enableCORS is a middleware function to add CORS headers to the response
func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Set Access-Control-Allow-Origin to allow requests from any origin.
		// In a production environment, you should restrict this to your frontend's domain.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		// Allow specific HTTP methods
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		// Allow specific headers in the request
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		// Allow credentials
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		// Set max age for preflight requests
		w.Header().Set("Access-Control-Max-Age", "86400")

		// Handle preflight requests (OPTIONS method)
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK) // Respond with 200 OK for preflight
			return
		}
		// Call the next handler in the chain
		next(w, r)
	}
}

// checkDomainsHandler handles the HTTP requests for domain validation
func checkDomainsHandler(w http.ResponseWriter, r *http.Request) {
	// Set the Content-Type header to application/json for the response
	w.Header().Set("Content-Type", "application/json")

	// Only allow POST requests for this endpoint
	if r.Method != http.MethodPost {
		log.Printf("Invalid method %s for /check-domains endpoint", r.Method)
		w.WriteHeader(http.StatusMethodNotAllowed) // 405 Method Not Allowed
		json.NewEncoder(w).Encode(DomainCheckResponse{Error: "Method not allowed"})
		return
	}

	var req DomainCheckRequest
	// Decode the incoming JSON request body into the DomainCheckRequest struct
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		log.Printf("Failed to decode request body: %v", err)
		w.WriteHeader(http.StatusBadRequest) // 400 Bad Request
		json.NewEncoder(w).Encode(DomainCheckResponse{Error: fmt.Sprintf("Invalid request payload: %v", err)})
		return
	}

	// Validate that domains array is not empty
	if len(req.Domains) == 0 {
		log.Printf("Empty domains array received")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(DomainCheckResponse{Error: "No domains provided"})
		return
	}

	log.Printf("Received request to check %d domains: %v", len(req.Domains), req.Domains)

	var results []DomainCheckResult
	// Iterate over each domain received in the request and check it
	for _, domain := range req.Domains {
		results = append(results, checkDomain(domain))
	}

	// Encode the results into a JSON response and send it back to the client
	response := DomainCheckResponse{Results: results}
	log.Printf("Sending response with %d results", len(results))
	json.NewEncoder(w).Encode(response)
}

// healthCheckHandler provides a simple health check endpoint
func healthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "Email checker backend is running"})
}

// main function is the entry point of the Go application
func main() {
	// Register the /check-domains endpoint with the checkDomainsHandler,
	// wrapped with the enableCORS middleware to allow cross-origin requests.
	http.HandleFunc("/check-domains", enableCORS(checkDomainsHandler))

	// Add a health check endpoint
	http.HandleFunc("/health", healthCheckHandler)

	// Define the port on which the server will listen
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	port = ":" + port

	log.Printf("Backend server starting on port %s", port)
	fmt.Printf("Backend server starting on port %s\n", port)

	// Start the HTTP server and listen for incoming requests
	// If ListenAndServe returns an error, it will be printed.
	err := http.ListenAndServe(port, nil)
	if err != nil {
		log.Printf("Server failed to start: %v", err)
		fmt.Printf("Server failed to start: %v\n", err)
	}
}
