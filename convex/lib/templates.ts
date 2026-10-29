// Central SMS template registry. Also loaded by n8n workflows via env or duplication.

export const SMS_TEMPLATES = {
  checkin: (firstName: string, ownerFirstName: string, businessName: string) =>
    `Hey ${firstName}, this is ${ownerFirstName} from ${businessName}. Just checking in to make sure everything looks good with the work we did today.`,

  reviewRequest: (firstName: string, ownerFirstName: string, businessName: string, reviewLink: string) =>
    `Hi ${firstName}, ${ownerFirstName} here from ${businessName}. Just wanted to say thanks again for the opportunity to work with you. If you have 30 seconds, would you mind sharing your experience in a quick Google review? ${reviewLink} It helps other customers know they can trust us.`,

  nudge: (reviewLink: string) =>
    `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review. It helps others know they can trust us. ${reviewLink}`,

  serviceRecoveryAlert: (customerFirstName: string, replyText: string) =>
    `🚨 ${customerFirstName} just replied to your check-in: "${replyText}" — give them a call. Review request suppressed.`,

  intakeConfirm: (firstName: string, scheduledTime: string) =>
    `Got it — ${firstName} added. First text goes out at ${scheduledTime}.`,

  intakeParseError: () =>
    `Couldn't parse that — please send as: FirstName +1XXXXXXXXXX\n\nExample: "Sarah Johnson +14155551234"`,

  intakeInactivityAlert: (ownerFirstName: string) =>
    `Hey ${ownerFirstName}, haven't heard from you in a week. Everything OK with Review Engine? Reply YES to snooze this alert, HELP for support.`,

  guaranteeMetRefAsk: (ownerFirstName: string, vertical: string, referralLink: string) =>
    `🎉 You just hit 10 new reviews, ${ownerFirstName} — guarantee is safe! Know any other ${vertical}s who'd want this? Send them my way, you get 1 month free per closed referral: ${referralLink}`,

  foundingTestimonialReminder: (ownerFirstName: string, daysRemaining: number, calendly: string) =>
    `Hey ${ownerFirstName}, quick reminder — your testimonial for the Founding 5 setup waiver is due in ${daysRemaining} days. Book here: ${calendly}`,

  // Sales
  salesDay1Hook: (firstName: string, businessName: string, reviewCount: string, competitorCount: string) =>
    `Hey ${firstName}, quick one — noticed ${businessName} has ${reviewCount} Google reviews. Your top local competitor has ${competitorCount}. We fix this in 30 days or your next month is free. Worth a 10-min chat?`,

  salesDay3Followup: (topCompetitor: string, competitorNewReviews: number, clientNewReviews: number) =>
    `Followed up because your competitors keep pulling ahead — ${topCompetitor} added ${competitorNewReviews} reviews last month while you added ${clientNewReviews}. Want to see how we close the gap?`,

  salesDay6Audit: (firstName: string, businessName: string, auditUrl: string, calendlyLink: string) =>
    `${firstName}, made a quick audit for ${businessName} — you vs your top 3 local competitors. Attached: ${auditUrl}. If this makes sense, book here: ${calendlyLink}`,

  salesDay10Breakup: () =>
    `Closing your file today unless I hear back. If reviews aren't a priority right now, all good — reply KEEP and I'll circle back Q2.`,
};

// Claude AI response fallbacks (when API fails or content filter triggers)
export const AI_FALLBACK_TEMPLATES = {
  5: (firstName: string, businessName: string, ownerFirstName: string) =>
    `${firstName} — thanks so much for taking the time to leave this! Really appreciate you choosing ${businessName}. We're here whenever you need us.\n- ${ownerFirstName}`,
  4: (firstName: string, ownerFirstName: string) =>
    `Thanks for the honest feedback, ${firstName}. We appreciate you giving us a shot and will use this to keep improving.\n- ${ownerFirstName}`,
  3: (firstName: string, ownerFirstName: string, ownerPhone: string) =>
    `Thanks for the feedback, ${firstName}. I'd like to make it right — please call me directly at ${ownerPhone}.\n- ${ownerFirstName}`,
  2: (firstName: string, ownerFirstName: string, ownerPhone: string) =>
    `Thanks for the feedback, ${firstName}. I'd like to make it right — please call me directly at ${ownerPhone}.\n- ${ownerFirstName}`,
  1: (firstName: string, ownerFirstName: string, ownerPhone: string) =>
    `Thanks for the feedback, ${firstName}. I'd like to make it right — please call me directly at ${ownerPhone}.\n- ${ownerFirstName}`,
};

// Content filter for AI responses (reject if any of these patterns).
// FIX 2026-07-11: accept ownerPhone param — strip it before phone-regex check
// so fallback templates (which contain ownerPhone) don't false-positive → infinite Slack loop.
export function contentFilterCheck(text: string, ownerPhone?: string): { pass: boolean; reason?: string } {
  let textForPhoneCheck = text;
  if (ownerPhone) {
    const digitsOnly = ownerPhone.replace(/[^0-9]/g, "");
    textForPhoneCheck = textForPhoneCheck
      .replace(new RegExp(ownerPhone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "")
      .replace(new RegExp(digitsOnly, "g"), "");
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      textForPhoneCheck = textForPhoneCheck.replace(new RegExp(digitsOnly.substring(1), "g"), "");
    }
  }

  const violations = [
    { pattern: /https?:\/\//i, reason: "URL detected", target: text },
    { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, reason: "Phone number detected (not owner phone)", target: textForPhoneCheck },
    { pattern: /\b(AI|automated|automation|chatbot|GPT|Claude)\b/i, reason: "AI mention detected", target: text },
    { pattern: /\b(discount|coupon|off|promo|save \$)\b/i, reason: "Promotional language detected", target: text },
    { pattern: /\b(free|click here|visit)\b/i, reason: "CTA/promotional language", target: text },
  ];

  for (const v of violations) {
    if (v.pattern.test(v.target)) {
      return { pass: false, reason: v.reason };
    }
  }

  if (text.length > 500) {
    return { pass: false, reason: "Response too long (>500 chars)" };
  }

  return { pass: true };
}
