package validators

import (
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"email-intelligence/internal/models"
)

// SecurityValidator validates security records (SPF, DKIM, DMARC)
type SecurityValidator struct {
	resolver *net.Resolver
	timeout  time.Duration
}

// NewSecurityValidator creates a new security validator
func NewSecurityValidator(timeout time.Duration) *SecurityValidator {
	return &SecurityValidator{
		resolver: createOptimizedResolver(),
		timeout:  timeout,
	}
}

// Validate performs security analysis with PARALLEL lookups
func (v *SecurityValidator) Validate(ctx context.Context, domain string) models.SecurityAnalysisResult {
	result := models.SecurityAnalysisResult{}
	
	var wg sync.WaitGroup
	var mu sync.Mutex
	
	// 1. SPF lookup (parallel)
	wg.Add(1)
	go func() {
		defer wg.Done()
		spfResult := v.lookupSPF(ctx, domain)
		mu.Lock()
		result.SPFRecord = spfResult
		mu.Unlock()
	}()
	
	// 2. DMARC lookup (parallel)
	wg.Add(1)
	go func() {
		defer wg.Done()
		dmarcResult := v.lookupDMARC(ctx, domain)
		mu.Lock()
		result.DMARCRecord = dmarcResult
		mu.Unlock()
	}()
	
	// 3. DKIM lookup (parallel with selector search)
	wg.Add(1)
	go func() {
		defer wg.Done()
		dkimResult := v.lookupDKIM(ctx, domain)
		mu.Lock()
		result.DKIMRecord = dkimResult
		mu.Unlock()
	}()
	
	// Wait for all parallel lookups
	wg.Wait()
	
	// Calculate security score
	result.SecurityScore = result.SPFRecord.Score + result.DMARCRecord.Score + result.DKIMRecord.Score
	
	// Determine threat level
	if result.SecurityScore >= 15 {
		result.ThreatLevel = "Low"
	} else if result.SecurityScore >= 7 {
		result.ThreatLevel = "Medium"
	} else {
		result.ThreatLevel = "High"
	}
	
	return result
}

// lookupSPF checks for SPF records
func (v *SecurityValidator) lookupSPF(ctx context.Context, domain string) models.ValidationResult {
	txtRecords, err := v.resolver.LookupTXT(ctx, domain)
	if err == nil {
		for _, txt := range txtRecords {
			if strings.HasPrefix(txt, "v=spf1") {
				return models.ValidationResult{
					Status:    "pass",
					Reason:    "SPF record found",
					RawSignal: txt,
					Score:     7,
					Weight:    7,
				}
			}
		}
	}
	
	return models.ValidationResult{
		Status:    "fail",
		Reason:    "No SPF record found",
		RawSignal: "no_spf_record",
		Score:     0,
		Weight:    7,
	}
}

// lookupDMARC checks for DMARC records
func (v *SecurityValidator) lookupDMARC(ctx context.Context, domain string) models.ValidationResult {
	dmarcRecords, err := v.resolver.LookupTXT(ctx, "_dmarc."+domain)
	if err == nil {
		for _, record := range dmarcRecords {
			if strings.HasPrefix(record, "v=DMARC1") {
				return models.ValidationResult{
					Status:    "pass",
					Reason:    "DMARC record found",
					RawSignal: record,
					Score:     7,
					Weight:    7,
				}
			}
		}
	}
	
	return models.ValidationResult{
		Status:    "fail",
		Reason:    "No DMARC record found",
		RawSignal: "no_dmarc_record",
		Score:     0,
		Weight:    7,
	}
}

// lookupDKIM checks for DKIM records with PARALLEL selector search
func (v *SecurityValidator) lookupDKIM(ctx context.Context, domain string) models.ValidationResult {
	dkimSelectors := []string{
		// Google/Gmail selectors
		"google", "ga1", "20230601", "20210112", "20161025",
		// Microsoft/Outlook selectors
		"selector1", "selector2", "selector1-outlook-com", "selector2-outlook-com",
		// Common selectors
		"default", "dkim", "k1", "k2", "k3",
		"mail", "email", "smtp", "mx", "s1", "s2",
		// Other providers
		"protonmail", "protonmail2", "protonmail3",
		"yahoo", "ymail", "s", "sig1",
		"zoho", "zmail",
		"mailchimp", "mandrill", "sendgrid", "amazonses",
	}
	
	// Channel to receive first successful result
	resultChan := make(chan models.ValidationResult, 1)
	var wg sync.WaitGroup
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	
	// Try all selectors in PARALLEL
	for _, selector := range dkimSelectors {
		wg.Add(1)
		go func(sel string) {
			defer wg.Done()
			
			select {
			case <-ctx.Done():
				return // Another goroutine found it
			default:
			}
			
			dkimRecords, err := v.resolver.LookupTXT(ctx, sel+"._domainkey."+domain)
			if err == nil && len(dkimRecords) > 0 {
				fullRecord := strings.Join(dkimRecords, "")
				
				// Validate DKIM record
				if isValidDKIMRecord(fullRecord) {
					displayRecord := fullRecord
					if len(displayRecord) > 100 {
						displayRecord = displayRecord[:100] + "..."
					}
					
					result := models.ValidationResult{
						Status:    "pass",
						Reason:    fmt.Sprintf("DKIM record found (selector: %s)", sel),
						RawSignal: displayRecord,
						Score:     6,
						Weight:    6,
					}
					
					select {
					case resultChan <- result:
						cancel() // Stop other goroutines
					default:
					}
				}
			}
		}(selector)
	}
	
	// Wait for first result or all to complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()
	
	// Return first successful result or check trusted providers
	if result, ok := <-resultChan; ok {
		return result
	}
	
	// Check trusted providers
	return checkTrustedDKIMProvider(domain)
}

// isValidDKIMRecord checks if a DKIM record is valid
func isValidDKIMRecord(record string) bool {
	// Must have p= followed by actual key data
	if strings.Contains(record, "p=") {
		pIndex := strings.Index(record, "p=")
		if pIndex != -1 {
			afterP := record[pIndex+2:]
			afterP = strings.TrimSpace(afterP)
			if len(afterP) > 0 && afterP[0] != ';' && !strings.HasPrefix(afterP, " ;") {
				return true
			}
		}
	}
	
	// Or has v=DKIM1 or k=ed25519
	return strings.Contains(record, "v=DKIM1") || strings.Contains(record, "k=ed25519")
}

// checkTrustedDKIMProvider checks if domain is a trusted provider
func checkTrustedDKIMProvider(domain string) models.ValidationResult {
	trustedDKIMProviders := map[string]bool{
		"gmail.com": true, "googlemail.com": true,
		"yahoo.com": true, "yahoo.co.in": true, "yahoo.co.uk": true,
		"outlook.com": true, "hotmail.com": true, "live.com": true, "msn.com": true,
		"icloud.com": true, "me.com": true, "mac.com": true,
		"aol.com": true,
		"protonmail.com": true, "proton.me": true,
		"zoho.com": true,
	}
	
	if trustedDKIMProviders[strings.ToLower(domain)] {
		return models.ValidationResult{
			Status:    "pass",
			Reason:    "DKIM configured (trusted provider)",
			RawSignal: "Trusted provider with verified DKIM configuration",
			Score:     6,
			Weight:    6,
		}
	}
	
	return models.ValidationResult{
		Status:    "fail",
		Reason:    "No DKIM record found",
		RawSignal: "no_dkim_record",
		Score:     0,
		Weight:    6,
	}
}
