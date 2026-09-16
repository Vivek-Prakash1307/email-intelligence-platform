package validators

import (
	"testing"

	"email-intelligence/internal/models"
)

func TestSyntaxValidator(t *testing.T) {
	validator := NewSyntaxValidator(models.ScoringWeights{SyntaxFormat: 10})
	tests := []struct {
		email string
		want  string
	}{
		{"person+tag@example.com", "pass"},
		{"first.last@example.co.uk", "pass"},
		{".leading@example.com", "fail"},
		{"double..dot@example.com", "fail"},
		{"missing-at.example.com", "fail"},
		{"person@-example.com", "fail"},
	}
	for _, test := range tests {
		t.Run(test.email, func(t *testing.T) {
			if got := validator.Validate(test.email).Status; got != test.want {
				t.Fatalf("status = %q, want %q", got, test.want)
			}
		})
	}
}

func TestSMTPResponseClassification(t *testing.T) {
	for _, code := range []int{250, 251, 252} {
		if !isRecipientAccepted(code) {
			t.Errorf("%d should be accepted", code)
		}
	}
	mailboxFailures := []struct {
		code    int
		message string
	}{
		{550, "5.1.1 user unknown"},
		{551, "No such user"},
		{553, "5.1.3 recipient address rejected"},
		{556, "5.1.10 recipient does not exist"},
	}
	for _, failure := range mailboxFailures {
		if !isMailboxRejection(failure.code, failure.message) {
			t.Errorf("%d %q should be a mailbox rejection", failure.code, failure.message)
		}
	}
	if isMailboxRejection(550, "5.7.1 blocked by policy") {
		t.Error("policy rejection must remain inconclusive")
	}
	for _, code := range []int{421, 450, 451, 452, 552, 554} {
		if isRecipientAccepted(code) || isMailboxRejection(code, "temporary or policy failure") {
			t.Errorf("%d should remain inconclusive", code)
		}
	}
}

func TestDisposableMatchingDoesNotUseSubstrings(t *testing.T) {
	validator := NewDomainValidator(models.ScoringWeights{DisposableCheck: 10, CatchAllRisk: 10})
	if got := validator.Validate("mailinator.com").IsDisposable.Status; got != "fail" {
		t.Fatalf("known disposable status = %q", got)
	}
	if got := validator.Validate("maildrop.cc").IsDisposable.Status; got != "fail" {
		t.Fatalf("maildrop.cc disposable status = %q", got)
	}
	if got := validator.Validate("legitimate-spam-company.example").IsDisposable.Status; got != "pass" {
		t.Fatalf("substring false positive: status = %q", got)
	}
}
