package validators

import (
	"context"
	"fmt"
	"net"
	"sort"
	"sync"
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

	// Address and MX lookups are independent and share the same wall-clock
	// budget, avoiding two consecutive timeout periods.
	var aRecords []string
	var mxRecords []*net.MX
	var aErr, mxErr error
	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		lookupCtx, cancel := context.WithTimeout(ctx, v.timeout)
		defer cancel()
		aRecords, aErr = v.resolver.LookupHost(lookupCtx, domain)
	}()
	go func() {
		defer wg.Done()
		lookupCtx, cancel := context.WithTimeout(ctx, v.timeout)
		defer cancel()
		mxRecords, mxErr = v.resolver.LookupMX(lookupCtx, domain)
	}()
	wg.Wait()

	if aErr != nil {
		status, reason := "unknown", "Domain address lookup was inconclusive"
		if dnsErr, ok := aErr.(*net.DNSError); ok && dnsErr.IsNotFound {
			status, reason = "fail", "Domain does not exist"
		}
		result.DomainExists = models.ValidationResult{
			Status:    status,
			Reason:    reason,
			RawSignal: "address_lookup_error",
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

	if mxErr != nil {
		status, reason, signal := "unknown", "MX lookup failed temporarily", "mx_lookup_error"
		if dnsErr, ok := mxErr.(*net.DNSError); ok && dnsErr.IsNotFound {
			if len(result.ARecords) > 0 {
				status, reason, signal = "pass", "No MX record; using RFC implicit MX at the domain", "implicit_mx"
				result.MXDetails = append(result.MXDetails, models.MXRecord{Host: domain, Priority: 0})
			} else {
				status, reason, signal = "fail", "No MX records found", "no_mx_records"
			}
		}
		score := 0
		if status == "pass" {
			score = 25
		}
		result.MXRecords = models.ValidationResult{Status: status, Reason: reason, RawSignal: signal, Score: score, Weight: 25}
	} else if len(mxRecords) == 0 {
		if len(result.ARecords) > 0 {
			result.MXRecords = models.ValidationResult{Status: "pass", Reason: "No MX record; using RFC implicit MX at the domain", RawSignal: "implicit_mx", Score: 25, Weight: 25}
			result.MXDetails = append(result.MXDetails, models.MXRecord{Host: domain, Priority: 0})
		} else {
			result.MXRecords = models.ValidationResult{Status: "fail", Reason: "No MX records found", RawSignal: "no_mx_records", Score: 0, Weight: 25}
		}
	} else {
		// RFC 7505 null MX explicitly declares that a domain accepts no email.
		if len(mxRecords) == 1 && mxRecords[0].Host == "." {
			result.MXRecords = models.ValidationResult{Status: "fail", Reason: "Domain publishes a null MX and does not accept email", RawSignal: "null_mx", Score: 0, Weight: 25}
			result.ResponseTime = time.Since(startTime).Milliseconds()
			return result
		}
		result.MXRecords = models.ValidationResult{
			Status:    "pass",
			Reason:    fmt.Sprintf("Found %d MX records", len(mxRecords)),
			RawSignal: fmt.Sprintf("%d_mx_records", len(mxRecords)),
			Score:     25,
			Weight:    25,
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
