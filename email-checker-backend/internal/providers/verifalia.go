package providers

import (
	"context"
	"errors"
	"time"

	"email-intelligence/internal/models"

	"github.com/verifalia/verifalia-go-sdk/v2/verifalia"
	"github.com/verifalia/verifalia-go-sdk/v2/verifalia/emailverification"
)

// MailboxVerifier abstracts external mailbox-verification services.
type MailboxVerifier interface {
	Verify(context.Context, string) (models.SMTPValidationResult, error)
}

type verificationRunner interface {
	Run(context.Context, string) (*emailverification.Job, error)
}

// VerifaliaVerifier maps Verifalia's vendor-specific result into the stable
// evidence model used by the rest of the application.
type VerifaliaVerifier struct {
	runner  verificationRunner
	timeout time.Duration
	weights models.ScoringWeights
	slots   chan struct{}
}

func NewVerifaliaVerifier(username, password string, timeout time.Duration, concurrency int, weights models.ScoringWeights) *VerifaliaVerifier {
	client := verifalia.NewClient(username, password)
	if concurrency < 1 {
		concurrency = 1
	}
	return &VerifaliaVerifier{
		runner: &client.EmailVerification, timeout: timeout, weights: weights,
		slots: make(chan struct{}, concurrency),
	}
}

func (v *VerifaliaVerifier) Verify(ctx context.Context, email string) (models.SMTPValidationResult, error) {
	started := time.Now()
	requestCtx, cancel := context.WithTimeout(ctx, v.timeout)
	defer cancel()

	select {
	case v.slots <- struct{}{}:
		defer func() { <-v.slots }()
	case <-requestCtx.Done():
		return models.SMTPValidationResult{}, requestCtx.Err()
	}

	job, err := v.runner.Run(requestCtx, email)
	if err != nil {
		return models.SMTPValidationResult{}, err
	}
	if job == nil || len(job.Entries) == 0 {
		return models.SMTPValidationResult{}, errors.New("verifalia returned no verification entry")
	}
	return v.mapEntry(job.Entries[0], time.Since(started)), nil
}

func (v *VerifaliaVerifier) mapEntry(entry emailverification.Entry, elapsed time.Duration) models.SMTPValidationResult {
	result := models.SMTPValidationResult{
		Reachable: models.ValidationResult{
			Status: "unknown", Reason: "The verification provider returned an inconclusive result",
			RawSignal: "provider_inconclusive", Weight: v.weights.SMTPReachability,
		},
		MailboxStatus:   "unknown",
		AcceptAllStatus: "unknown",
		Attempted:       true,
		ResponseTime:    elapsed.Milliseconds(),
		Source:          "verifalia",
		ProviderStatus:  string(entry.Status),
		ProviderClass:   string(entry.Classification),
		ProviderSignals: models.ProviderSignals{
			Disposable: entry.IsDisposableEmailAddress,
			Free:       entry.IsFreeEmailAddress,
			Role:       entry.IsRoleAccount,
		},
	}

	switch entry.Classification {
	case emailverification.ClassificationDeliverable:
		result.MailboxStatus = "accepted"
		result.AcceptAllStatus = "no"
		result.Reachable.Status = "pass"
		result.Reachable.Score = v.weights.SMTPReachability
		result.Reachable.Reason = "Verifalia classified the recipient as deliverable"
		result.Reachable.RawSignal = "provider_deliverable"
	case emailverification.ClassificationUndeliverable:
		result.MailboxStatus = "rejected"
		result.AcceptAllStatus = "not_checked"
		result.Reachable.Status = "fail"
		result.Reachable.Reason = "Verifalia classified the recipient as undeliverable"
		result.Reachable.RawSignal = "provider_undeliverable"
	case emailverification.ClassificationRisky:
		result.Reachable.Reason = "Verifalia classified the recipient as risky"
		result.Reachable.RawSignal = "provider_risky"
		if entry.Status == emailverification.StatusServerIsCatchAll {
			result.MailboxStatus = "accepted"
			result.AcceptAllStatus = "yes"
			result.AcceptAll = true
			result.Reachable.Status = "pass"
			result.Reachable.Score = v.weights.SMTPReachability * 5 / 9
			result.Reachable.Reason = "Verifalia detected a catch-all server; this mailbox cannot be confirmed"
			result.Reachable.RawSignal = "accept_all"
		}
	}

	return result
}
