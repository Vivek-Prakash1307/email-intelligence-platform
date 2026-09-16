package validators

import (
	"bufio"
	"context"
	"crypto/rand"
	"encoding/hex"
	"net"
	"net/textproto"
	"strings"
	"time"

	"email-intelligence/internal/models"
)

// SMTPValidator performs a non-delivery SMTP envelope probe. It never sends
// DATA and therefore never sends a message to the address being checked.
type SMTPValidator struct {
	timeout time.Duration
	weights models.ScoringWeights
}

func NewSMTPValidator(timeout time.Duration, weights models.ScoringWeights) *SMTPValidator {
	return &SMTPValidator{timeout: timeout, weights: weights}
}

// Validate tries up to three MX hosts in priority order. Only port 25 is used:
// submission ports do not prove that an MX receives Internet mail.
func (v *SMTPValidator) Validate(ctx context.Context, email string, mxRecords []models.MXRecord) models.SMTPValidationResult {
	started := time.Now()
	if len(mxRecords) == 0 {
		return v.result("unknown", "No MX host is available for an SMTP probe", "no_mx_records", 0, started)
	}
	probeCtx, cancel := context.WithTimeout(ctx, v.timeout)
	defer cancel()
	ctx = probeCtx
	limit := len(mxRecords)
	if limit > 3 {
		limit = 3
	}
	attempted := make([]string, 0, limit)
	var permanentReject *models.SMTPValidationResult
	var lastUnknown models.SMTPValidationResult
	for _, mx := range mxRecords[:limit] {
		if ctx.Err() != nil {
			break
		}
		attempted = append(attempted, mx.Host)
		result := v.probeHost(ctx, email, mx.Host, started)
		result.AttemptedHosts = append([]string(nil), attempted...)
		switch result.MailboxStatus {
		case "accepted":
			return result
		case "rejected":
			copy := result
			permanentReject = &copy
		default:
			lastUnknown = result
		}
	}
	if permanentReject != nil {
		permanentReject.AttemptedHosts = attempted
		return *permanentReject
	}
	if lastUnknown.MailboxStatus != "" {
		lastUnknown.AttemptedHosts = attempted
		return lastUnknown
	}
	result := v.result("unknown", "SMTP probe was cancelled or timed out", "probe_cancelled", 0, started)
	result.AttemptedHosts = attempted
	return result
}

func (v *SMTPValidator) probeHost(ctx context.Context, email, host string, started time.Time) models.SMTPValidationResult {
	dialer := net.Dialer{Timeout: v.timeout}
	conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(host, "25"))
	if err != nil {
		result := v.result("unknown", "Could not connect to the MX server; mailbox existence is unknown", "connection_failed", 0, started)
		result.Attempted, result.Host, result.Port = true, host, 25
		return result
	}
	defer conn.Close()
	deadline := time.Now().Add(v.timeout)
	if parentDeadline, ok := ctx.Deadline(); ok && parentDeadline.Before(deadline) {
		deadline = parentDeadline
	}
	_ = conn.SetDeadline(deadline)
	reader := textproto.NewReader(bufio.NewReader(conn))
	writer := bufio.NewWriter(conn)
	read := func() (int, string, error) { return reader.ReadResponse(0) }
	write := func(command string) error {
		if _, err := writer.WriteString(command + "\r\n"); err != nil {
			return err
		}
		return writer.Flush()
	}

	code, message, err := read()
	if err != nil || code != 220 {
		return v.smtpUnknown(host, code, message, "invalid_banner", "MX server did not provide a usable SMTP greeting", started)
	}
	if err = write("EHLO verifier.invalid"); err != nil {
		return v.smtpUnknown(host, 0, "", "write_failed", "SMTP handshake failed", started)
	}
	ehloCode, ehloMessage, err := read()
	if err != nil || ehloCode/100 != 2 {
		_ = write("HELO verifier.invalid")
		ehloCode, ehloMessage, err = read()
		if err != nil || ehloCode/100 != 2 {
			return v.smtpUnknown(host, ehloCode, ehloMessage, "helo_rejected", "MX server rejected the SMTP handshake", started)
		}
	}
	if err = write("MAIL FROM:<>"); err != nil {
		return v.smtpUnknown(host, 0, "", "write_failed", "Could not start an SMTP envelope", started)
	}
	mailCode, mailMessage, err := read()
	if err != nil || mailCode/100 != 2 {
		return v.smtpUnknown(host, mailCode, mailMessage, "sender_probe_blocked", "Server policy blocked the verification probe", started)
	}
	if err = write("RCPT TO:<" + email + ">"); err != nil {
		return v.smtpUnknown(host, 0, "", "write_failed", "Could not submit the recipient probe", started)
	}
	rcptCode, rcptMessage, err := read()
	if err != nil {
		return v.smtpUnknown(host, rcptCode, rcptMessage, "response_failed", "No conclusive recipient response was received", started)
	}
	if isMailboxRejection(rcptCode, rcptMessage) {
		result := v.result("rejected", "Mailbox was rejected by the receiving server", "mailbox_rejected", rcptCode, started)
		result.Attempted, result.Host, result.Port = true, host, 25
		result.ServerResponse = sanitizeSMTPMessage(rcptMessage)
		_ = write("QUIT")
		return result
	}
	if !isRecipientAccepted(rcptCode) {
		return v.smtpUnknown(host, rcptCode, rcptMessage, "inconclusive_response", "Server returned a temporary or policy response; mailbox existence is unknown", started)
	}

	_ = write("RSET")
	_, _, _ = read()
	acceptAllStatus := v.probeRandomRecipient(write, read, email)
	result := v.result("accepted", "Recipient was accepted by the receiving server", "mailbox_accepted", rcptCode, started)
	result.Attempted, result.Host, result.Port = true, host, 25
	result.TLSSupported = strings.Contains(strings.ToUpper(ehloMessage), "STARTTLS")
	result.ServerResponse = sanitizeSMTPMessage(rcptMessage)
	result.AcceptAllStatus = acceptAllStatus
	result.AcceptAll = acceptAllStatus == "yes"
	if result.AcceptAll {
		result.Reachable.Reason = "Server accepts random recipients (catch-all); this mailbox cannot be confirmed"
		result.Reachable.RawSignal = "accept_all"
		result.Reachable.Score = v.weights.SMTPReachability * 5 / 9
	} else if acceptAllStatus == "unknown" {
		result.Reachable.Reason = "Recipient was accepted, but the catch-all probe was inconclusive"
		result.Reachable.RawSignal = "mailbox_accepted_catch_all_unknown"
		result.Reachable.Score = v.weights.SMTPReachability * 2 / 3
	}
	_ = write("QUIT")
	return result
}

func (v *SMTPValidator) probeRandomRecipient(write func(string) error, read func() (int, string, error), email string) string {
	at := strings.LastIndex(email, "@")
	if at < 0 {
		return "unknown"
	}
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil || write("MAIL FROM:<>") != nil {
		return "unknown"
	}
	code, _, err := read()
	if err != nil || code/100 != 2 {
		return "unknown"
	}
	probe := "email-check-" + hex.EncodeToString(random) + email[at:]
	if write("RCPT TO:<"+probe+">") != nil {
		return "unknown"
	}
	code, message, err := read()
	if err != nil {
		return "unknown"
	}
	if isRecipientAccepted(code) {
		return "yes"
	}
	if isMailboxRejection(code, message) {
		return "no"
	}
	return "unknown"
}

func (v *SMTPValidator) result(mailboxStatus, reason, signal string, code int, started time.Time) models.SMTPValidationResult {
	status, score := "unknown", 0
	if mailboxStatus == "accepted" {
		status, score = "pass", v.weights.SMTPReachability
	} else if mailboxStatus == "rejected" {
		status = "fail"
	}
	return models.SMTPValidationResult{
		Reachable:     models.ValidationResult{Status: status, Reason: reason, RawSignal: signal, Score: score, Weight: v.weights.SMTPReachability},
		MailboxStatus: mailboxStatus, AcceptAllStatus: "not_checked", DiagnosticCode: code, ResponseTime: time.Since(started).Milliseconds(),
		Source: "direct_smtp",
	}
}

func (v *SMTPValidator) smtpUnknown(host string, code int, message, signal, reason string, started time.Time) models.SMTPValidationResult {
	result := v.result("unknown", reason, signal, code, started)
	result.Attempted, result.Host, result.Port = true, host, 25
	result.ServerResponse = sanitizeSMTPMessage(message)
	return result
}

func isRecipientAccepted(code int) bool { return code == 250 || code == 251 || code == 252 }

func isMailboxRejection(code int, message string) bool {
	if code/100 != 5 {
		return false
	}
	lower := strings.ToLower(message)
	mailboxSignals := []string{
		"5.1.1", "5.1.3", "5.1.6", "5.1.10",
		"user unknown", "unknown user", "unknown recipient", "no such user",
		"recipient not found", "mailbox not found", "does not exist",
		"recipient address rejected", "mailbox unavailable",
	}
	for _, signal := range mailboxSignals {
		if strings.Contains(lower, signal) {
			return true
		}
	}
	return false
}

func sanitizeSMTPMessage(message string) string {
	message = strings.Join(strings.Fields(message), " ")
	if len(message) > 300 {
		return message[:300]
	}
	return message
}
