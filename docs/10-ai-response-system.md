# 10. AI Response System

**No manual paste phase. No OAuth verification wait. GBP Manager access from Day 1, API active Day 8 (Google 7-day cooldown).**

## Architecture

- **Rating 4-5**: Auto-post via GBP API
- **Rating 1-3**: Slack approval workflow (60-min SLA, auto-post as fallback)

## Why This Split

- 4-5 star reviews are low-risk thank-yous. Fallback template + content filter make auto-post safe.
- 1-3 star reviews are reputation-sensitive. Client trust depends on getting these right. Human approval catches edge cases.

## Model + Provider

- **Model**: `claude-haiku-4-5-20251001`
- **Provider**: OpenRouter (existing setup)
- **Cost**: ~$0.002 per response

## Claude Prompt

```
You are {ownerFirstName}, owner of {businessName}. Respond to this Google review authentically, warmly, briefly (2-4 sentences).

Rules:
- 5-star: warm thanks, mention specific detail if present, brief invitation to return
- 4-star: thank them, acknowledge feedback, offer to improve  
- 3-star or below: sincere apology, no excuses, provide {ownerPhone} for direct contact
- Sign with "- {ownerFirstName}"
- No emojis unless review had them
- Sound human, not corporate
- Never mention AI or automation
- If review mentions specific staff/product/issue, acknowledge it directly

Review from {reviewerName} ({rating} stars):
"{reviewText}"

Response:
```

## Auto-Post Flow (4-5 stars)

```
WF-REV-04 polls GBP API
  ↓
New 5-star review detected
  ↓
Claude generates response
  ↓
POST Convex /reviews/response-drafted → status="auto_posted"
  ↓
Wait 10 min (feels human, not bot)
  ↓
POST GBP API /reply
  ↓
POST Convex /reviews/response-posted
  ↓
Slack #review-engine-ops:
  "✅ Auto-posted 5-star response for {clientName}"
```

## Approval Flow (1-3 stars)

```
WF-REV-04 polls GBP API
  ↓
New 2-star review detected
  ↓
Claude generates response
  ↓
POST Convex /reviews/response-drafted → status="pending_approval"
  ↓
Post to Slack #review-engine-approvals with:
  → Review text + rating + reviewer name
  → AI draft
  → Buttons: [✅ Approve] [✍️ Edit] [❌ Skip]
  ↓
IF approved within 60 min:
  → POST GBP API /reply
  → status="approved" → "posted"
IF no action within 60 min:
  → Auto-post as fallback
  → Slack notify: "⚠️ Auto-posted 2-star response after 60-min SLA. Review: {url}"
IF edited:
  → Post with edited text
  → status="posted"
IF skipped:
  → No post, status="skipped"
  → Slack notify Owner to handle manually
```

## Content Filters (before auto-post)

Reject auto-post if AI response contains:
- URLs
- Phone numbers (except client's own `ownerPhone`)
- "AI" or "automated"
- Words in banned list (curse words, promotional language)
- Length > 500 chars

If content filter triggers → route to Slack approval regardless of rating.

## Fallback Templates (if Claude API fails)

**5-star fallback**:
```
{firstName} — thanks so much for taking the time! Really appreciate you choosing {businessName}. We're here whenever you need us.
- {ownerFirstName}
```

**4-star fallback**:
```
Thanks for the honest feedback, {firstName}. We appreciate you giving us a shot and will use this to keep improving.
- {ownerFirstName}
```

**1-3 star fallback**:
```
Thanks for the feedback, {firstName}. I'd like to make it right — please call me at {ownerPhone}.
- {ownerFirstName}
```

Fallbacks activate on Claude 5xx errors OR after 3 retries.

## GBP API Access — 7-Day Cooldown

Google requires new Manager to have accepted invite AND wait 7 days before that Manager can post review responses.

**Day 1-7**: 
- WF-REV-04 polls reviews (read is available immediately)
- New reviews stored in `reviewResponses` table
- Draft generated but NOT posted
- Slack notify: "📥 New review received, response held until GBP cooldown clears on {date}"

**Day 8+**: Auto-post/approval flow activates. Backlog cleared.

## Monitoring

| Metric | Target |
|---|---|
| Response post rate | 100% (excluding skipped) |
| Auto-post rate | ~80% (4-5 star share) |
| Approval SLA hit rate | >95% within 60 min |
| Content filter trigger rate | <5% |
| Claude API cost | <$0.10/mo/client |

Slack alerts on:
- GBP OAuth token failure → email client to re-invite
- Response failed to post 3 retries → manual escalation
- Approval SLA breached (auto-post fallback fired)
