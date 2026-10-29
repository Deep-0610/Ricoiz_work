# 09. Client Onboarding

**Goal**: Payment → first SMS drip in 24 hours. Manual for first 5 clients.

## Blocking Requirements

Client cannot go live without:

1. **GBP Manager access granted** to our dedicated Google account (`reviews@<domain>`)
2. **Signed structured TCPA consent attestation** (method + date range, e-signed)
3. **Past customer CSV uploaded** (name + phone minimum)
4. **Founding 5 testimonial release signed** (if applicable)

Refusal on any = disqualify + refund. Frame each as "standard agency practice."

## Flow

1. Client completes Stripe checkout ($297/mo + $497 setup, waived for Founding 5)
2. Automated welcome email → onboarding form link
3. Client completes onboarding form (Google Form for MVP):

### Onboarding Form Fields

| Field | Required | Notes |
|---|---|---|
| Business name | ✅ | |
| Owner first name | ✅ | Used in SMS |
| Owner last name | ✅ | |
| Owner email | ✅ | Weekly reports |
| Owner phone | ✅ | Service recovery routing + inactivity alerts |
| Timezone | ✅ | Quiet hours default |
| Google review URL | ✅ | Form field |
| Google Business Profile URL | ✅ | For Manager invite |
| GBP Manager invite acceptance | ✅ | Step-by-step instructions provided |
| Top 3 local competitors (business names) | ✅ | Weekly competitor report |
| Vertical | ✅ | Roofing (Phase 1) |
| Past customer CSV | ✅ | Upload or "will email" |
| Structured consent attestation | ✅ | See below |
| Founding 5 testimonial release | ✅ if applicable | 1-page e-signed |

### Structured Consent Attestation (not a checkbox)

```
I attest to the following about the customer list I am uploading:

1. Method of consent obtained:
   ○ Signed service agreement with SMS clause
   ○ Checkbox at point of transaction
   ○ Verbal consent with staff notation
   ○ Other: ___________

2. Date range of transactions represented in this list:
   From: __/__/____ To: __/__/____

3. I confirm that:
   ☐ All customers on this list transacted with my business within the last 12 months
   ☐ All customers provided their phone number voluntarily
   ☐ I have express written consent to send them SMS communications
   ☐ I understand consent basis is PEWC (Prior Express Written Consent), not EBR (Established Business Relationship)
   ☐ I indemnify Review Engine against TCPA violations arising from this list

Signed: _____________
Date: __/__/____
IP: (auto-captured)
```

**Store hashed CSV + attestation for 7 years.**

## GBP Manager Access Instructions (in onboarding form)

Screenshotted step-by-step:

1. Go to business.google.com
2. Select your business
3. Click "Users" (three-dot menu)
4. Click "Add user"
5. Email: `reviews@<domain>`
6. Role: **Manager**
7. Click Invite

**Note**: Google enforces a 7-day cooldown before we can post responses. AI review response goes live Day 8. Reactivation SMS drip still starts within 24 hours.

## Admin Setup (Owner, ~30 min/client)

Once form submitted:

1. Purchase 2 Close CRM numbers in client's area code:
   - Sender phone (outbound reviews)
   - Intake phone (owner texts customer info)
2. Register both to A2P campaign
3. Create Convex `reviewClient` row with:
   - Business info from form
   - `senderPhone` + `intakePhone`
   - `gbpManagerInvitedAt = now`
   - `isFoundingClient` if applicable
   - `foundingTestimonialDueAt = null` (set after first review)
4. Accept GBP Manager invite in `reviews@<domain>` inbox
5. Update `gbpManagerAcceptedAt = now`, `gbpApiActiveFrom = now + 7 days`
6. Upload past customer CSV → parse → insert into Convex
7. WF-REV-03 (reactivation trickler) picks up on next cycle (within 12 min)

## Client Training (One Message)

After setup, text owner from their intake number:

```
Hey {ownerFirstName}, you're live!

Your dedicated line for job intake is this number ({intakePhone}). 
When a job is done, text me:

FirstName +1XXXXXXXXXX

Example: "Sarah Johnson +14155551234"

That's it. I'll handle the rest.
```

**No portal. No login. No training beyond one example.**

## First 7 Days (Client Perspective)

| Day | What happens |
|---|---|
| 0 | Payment → onboarding form |
| 1 | Setup complete, first reactivation SMS trickling |
| 2-3 | 30+ past customers texted, 3-5 replies, first reviews |
| 7 | First weekly competitor report emailed |
| 8 | GBP API cooldown clears → AI response goes live |
| 14 | Guarantee milestone check: on track for 10 reviews? |
| 30 | Guarantee resolved. Testimonial due if Founding 5. |

## Client Ongoing Actions

**Just text customer info. That's it.**

- Option A: Owner texts intake number after each job (recommended)
- Option B: Owner emails weekly CSV (fallback)
- Option C: Webhook from job management system (Jobber, HouseCall Pro, etc.) — Phase 2

Inactivity monitoring: if no intake for 7 days, WF-REV-06 texts owner.
