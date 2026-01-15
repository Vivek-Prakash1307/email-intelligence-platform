package validators

import (
	"context"
	"fmt"
	"net"
	"sort"
	"time"

	"email-intelligence/internal/models"
)

// DNSValidator validates DNS records
type DNSValidator struct {
	resolver *net.Resolver
	timeout  time.Duration
}

// NewDNSValidator creates a new DNS validator
func NewDNSValidator(timeout time.Duration) *DNSValidator {
	return &DNSValidator{
		resolver: createOptimizedResolver(),
		timeout:  timeout,
	}
}

func createOptimizedResolver() *net.Resolver {
	return &net.Resolver{
		PreferGo: true,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			d := net.Dialer{
				Timeout: 1 * time.Second,
			}
			return d.DialContext(ctx, network, address)
		},
	}
}

// Validate performs DNS validation for a domain
func (v *DNSValidator) Validate(ctx context.Context, domain string) models.DNSValidationResult {
	startTime := time.Now()
	
	result := models.DNSValidationResult{
		MXDetails: []models.MXRecord{},
	}
	
	// Create timeout context
	dnsCtx, cancel := context.WithTimeout(ctx, v.timeout)
	defer cancel()
	
	// Check A records (domain existence) - Informational only, no score
	aRecords, err := v.resolver.LookupHost(dnsCtx, domain)
	if err != nil {
		result.DomainExists = models.ValidationResult{
			Status:    "fail",
			Reason:    "Domain does not exist",
			RawSignal: err.Error(),
			Score:     0,
			Weight:    0,
		}
	} else {
		result.DomainExists = models.ValidationResult{
			Status:    "pass",
			Reason:    "Domain exists",
			RawSignal: fmt.Sprintf("%d_a_records", len(aRecords)),
			Score:     0,
			Weight:    0,
		}
		result.ARecords = aRecords
	}
	
	// Check MX records
	mxRecords, err := v.resolver.LookupMX(dnsCtx, domain)
	if err != nil || len(mxRecords) == 0 {
		result.MXRecords = models.ValidationResult{
			Status:    "fail",
			Reason:    "No MX records found",
			RawSignal: "no_mx_records",
			Score:     0,
			Weight:    20,
		}
	} else {
		result.MXRecords = models.ValidationResult{
			Status:    "pass",
			Reason:    fmt.Sprintf("Found %d MX records", len(mxRecords)),
			RawSignal: fmt.Sprintf("%d_mx_records", len(mxRecords)),
			Score:     20,
			Weight:    20,
		}
		
		// Convert to our format and sort by priority
		for _, mx := range mxRecords {
			result.MXDetails = append(result.MXDetails, models.MXRecord{
				Host:     trimSuffix(mx.Host, "."),
				Priority: int(mx.Pref),
			})
		}
		
		sort.Slice(result.MXDetails, func(i, j int) bool {
			return result.MXDetails[i].Priority < result.MXDetails[j].Priority
		})
	}
	
	result.ResponseTime = time.Since(startTime).Milliseconds()
	return result
}

func trimSuffix(s, suffix string) string {
	if len(s) >= len(suffix) && s[len(s)-len(suffix):] == suffix {
		return s[:len(s)-len(suffix)]
	}
	return s
}
