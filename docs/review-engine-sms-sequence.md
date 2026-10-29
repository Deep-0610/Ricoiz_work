# Review Engine SMS Sequence (v3)

4 SMS touches per lead. Then stop.

**Cloned from Voltaris websell flow** (13.7% reply, 78% of replies land on Touch 1). Same cadence, same sticky-sender mechanic, same casual first-person voice. Pivoted from "no website" to "reviews behind competitors" (verifiable claim, cleaner than "your site is down").

---

## Touch 1: Opener (Day 1)

**Workflow**: WF-REV-SL-01
**Schedule**: 7:30, 8:30, 9:30, 10:30 AM ET

```
I live in {city} and went looking for a {niche_singular}... {business_name} barely showed up.

the ones above you had more reviews so I almost called them instead. that's what everyone's doing right now, today, without you ever knowing.

that's real money walking to your competitors every week.

I know exactly how to flip it. can I show you?
```

---

## Touch 2: Followup #1 (Day 2)

**Workflow**: WF-REV-SL-02
**Cooldown**: 1 day after Touch 1
**Schedule**: Every hour 9 AM to 8 PM lead local time

```
hey, still want me to show you how {business_name} climbs above those guys in {city}? that money's still leaking whenever you're ready.
```

---

## Touch 3: Followup #2 (Day 5)

**Workflow**: WF-REV-SL-02
**Cooldown**: 3 days after Touch 2

```
last try i promise... someone in {city} needed a {niche_singular} today and called the guy above you instead of {business_name}. can I show you how to flip that?
```

---

## Touch 4: Breakup (Day 7)

**Workflow**: WF-REV-SL-02
**Cooldown**: 2 days after Touch 3

```
alright, i'll give the {city} spot to another {niche_singular} then. I only work with one per area so I'm not helping your competitors outrank you too. cya later alligator 🐊
```

---

## Personalization Placeholders

| Placeholder | Source | Example |
|---|---|---|
| `{city}` | Convex lead.city | "Cincinnati" |
| `{niche_singular}` | Convex lead.niche via singular map | "roofing company" |
| `{business_name}` | Convex lead.businessName | "Champion Roofing Services" |

### Niche to Singular Mapping

| Convex Value | Rendered As |
|---|---|
| roofing / roofer | roofing company |
| plumbing / plumber | plumbing company |
| hvac | HVAC company |
| electrical / electrician | electrician |
| concrete | concrete company |
| tree service | tree service |
| septic | septic company |
| landscaping | landscaping company |
| garage door | garage door company |
| foundation | foundation company |
| painting | painting company |
| pressure washing | pressure washing company |
| remodeling | remodeler |
| deck builder | deck builder |
| junk removal | junk removal company |
| general contractor / gc | general contractor |
| dentist | dentist |
| chiropractor | chiropractor |
| med spa | med spa |
| auto repair | auto shop |
| pest control | pest control company |
| (any other) | `{niche} company` |

---

## Sticky Sender Rule

Whichever number sends **Touch 1** sends **ALL 4 touches** from same number. Recipient sees consistent phone = looks like real person conversation.

---

## Copy Notes (matched to websell voice)

- First person, casual, lowercase drift on later touches (like websell breakup).
- Whitespace + line breaks in Touch 1 reads like a person, not a blast.
- Already-made asset ("I know exactly how to flip it") gives websell-style reciprocity.
- Yes/no soft close ("can I show you?").
- No em-dashes in send bodies (UCS-2 encoding cost). Use hyphen, comma, or ellipsis.
- Claim must be TRUE per lead. Never fake the gap. Review-count gap is checkable; keep it honest.

---

## Filters (Won't Send If Any True)

- Status: `HUMAN HAND`, `Opted Out`, `Replied`, `Notes sent`, `Client (paid)`
- Line Type = `landline`
- Currently in cooldown window
- Outside quiet hours (before 8 AM or after 9 PM lead local time)
- Missing Close lead_id / contact_id / valid phone
- Niche in SKIP list: paving, fencing, pool, realtor, restaurant, title/escrow
- Claim validity: lead must have at least 1 competitor above them on Google with higher review count. No gap = no send.

---

## Ops Requirement

Notes asset pre-generated per lead at enqueue time. "Ready whenever" must be true; yes-reply gets the notes within 10 min during send hours.
