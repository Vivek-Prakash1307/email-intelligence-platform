package providers

import (
	"testing"
	"time"

	"email-intelligence/internal/models"

	"github.com/verifalia/verifalia-go-sdk/v2/verifalia/emailverification"
)

func testVerifier() *VerifaliaVerifier {
	return &VerifaliaVerifier{weights: models.ScoringWeights{SMTPReachability: 45}}
}

func TestVerifaliaDeliverableMapping(t *testing.T) {
	free := true
	result := testVerifier().mapEntry(emailverification.Entry{
		Classification: emailverification.ClassificationDeliverable,
		Status:         emailverification.StatusSuccess, IsFreeEmailAddress: &free,
	}, time.Second)
	if result.MailboxStatus != "accepted" || result.AcceptAllStatus != "no" || result.Reachable.Score != 45 {
		t.Fatalf("unexpected deliverable mapping: %+v", result)
	}
	if result.Source != "verifalia" || result.ProviderStatus != "Success" || result.ProviderSignals.Free == nil || !*result.ProviderSignals.Free {
		t.Fatalf("provider evidence was not preserved: %+v", result)
	}
}

func TestVerifaliaCatchAllMapping(t *testing.T) {
	result := testVerifier().mapEntry(emailverification.Entry{
		Classification: emailverification.ClassificationRisky,
		Status:         emailverification.StatusServerIsCatchAll,
	}, time.Second)
	if result.MailboxStatus != "accepted" || result.AcceptAllStatus != "yes" || result.Reachable.Score != 25 {
		t.Fatalf("unexpected catch-all mapping: %+v", result)
	}
}

func TestVerifaliaUndeliverableMapping(t *testing.T) {
	result := testVerifier().mapEntry(emailverification.Entry{
		Classification: emailverification.ClassificationUndeliverable,
		Status:         emailverification.StatusMailboxDoesNotExist,
	}, time.Second)
	if result.MailboxStatus != "rejected" || result.Reachable.Status != "fail" || result.Reachable.Score != 0 {
		t.Fatalf("unexpected undeliverable mapping: %+v", result)
	}
}

func TestVerifaliaUnknownAndGenericRiskyRemainUnknown(t *testing.T) {
	for _, entry := range []emailverification.Entry{
		{Classification: emailverification.ClassificationUnknown, Status: emailverification.StatusMailboxValidationTimeout},
		{Classification: emailverification.ClassificationRisky, Status: emailverification.StatusMailboxHasInsufficientStorage},
	} {
		result := testVerifier().mapEntry(entry, time.Second)
		if result.MailboxStatus != "unknown" || result.Reachable.Status != "unknown" {
			t.Fatalf("inconclusive evidence became conclusive: %+v", result)
		}
	}
}
