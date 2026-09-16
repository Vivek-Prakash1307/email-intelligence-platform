# Email verification methodology

## What the result means

The API reports `deliverability_status` separately from the legacy `is_valid`
field:

- `deliverable`: the recipient was accepted during an SMTP envelope probe and a
  random address was rejected.
- `risky`: the recipient was accepted, but the server is catch-all or the
  catch-all test was inconclusive.
- `undeliverable`: the domain explicitly cannot receive mail, has no MX record,
  or the receiving server permanently rejected the recipient.
- `unknown`: the domain can receive mail, but the provider blocked, deferred, or
  did not answer the mailbox probe.
- `invalid`: the address fails syntax validation.

`is_valid` means that the address syntax and receiving domain are valid. It is
not a claim that the individual mailbox exists. Only a confirmation message and
user action can prove inbox access and actual delivery.

## Evidence score (0-100)

| Signal | Maximum | Why |
| --- | ---: | --- |
| Syntax | 10 | Address has a supported, valid structure |
| MX record | 25 | Domain advertises receiving mail servers |
| SMTP recipient response | 45 | Strongest remote evidence about the mailbox |
| Non-disposable domain | 10 | Reduces temporary-address risk |
| Catch-all evidence | 10 | Full credit only when a random recipient is rejected |
| SPF/DKIM/DMARC | 0 | Informational; outbound authentication does not prove recipient existence |
| Unverified reputation | 0 | No points without a real external reputation source |

A permanent SMTP recipient rejection or a failed MX check forces the score to 0.
Unknown SMTP results receive no SMTP points; they are not converted into passes.
Known disposable domains are reported as `risky` and capped at 10, even when
the mailbox itself is accepted.

For a non-disposable address, the important reference outcomes are:

- 100: recipient accepted and a random recipient rejected.
- 75: recipient accepted but the catch-all test was inconclusive.
- 70: recipient accepted by a confirmed catch-all server.
- 45: syntax and MX pass, but SMTP provides no recipient evidence.
- 0: invalid receiving domain or explicit permanent recipient rejection.

The `verification_details` object provides the display-ready reason/message,
domain name, accept-all/disposable/free states, role-account classification,
provider family, evidence score, and toxicity indicator. `disabled` and
`full_mailbox` stay `unknown` unless an SMTP response directly supports them.
It also reports SMTP evidence separately from inbox placement and ownership.
Inbox placement and ownership remain `not_verified` until a real confirmation
workflow supplies that evidence.

## Operational limitations

Many large providers deliberately hide mailbox existence, rate-limit probes, or
accept mail first and bounce it later. Port 25 may also be blocked by the host
running this service. Those conditions correctly produce `unknown`, not a false
positive. The probe sends `EHLO`, `MAIL FROM`, and `RCPT TO`, then stops without
sending `DATA`; no email message is transmitted.

Deep analysis is not cached. Each deep-analysis request performs fresh DNS and
SMTP work. Basic analysis may use the configured short-lived cache.

For definitive verification, send a consent-based confirmation link (double
opt-in) and record the successful confirmation.

The syntax validator supports the common ASCII mailbox format. Internationalized
SMTPUTF8 local-parts and quoted local-parts are rejected until capability-aware
SMTPUTF8 probing is implemented.
