const SMS_TEMPLATES = {
  checkin: (firstName, ownerFirstName, businessName) => `Hey ${firstName}, this is ${ownerFirstName} from ${businessName}. Just checking in to make sure everything looks good with the work we did today.`,
  reviewRequest: (firstName, ownerFirstName, businessName, reviewLink) => `Hi ${firstName}, ${ownerFirstName} here from ${businessName}. Just wanted to say thanks again for the opportunity to work with you. If you have 30 seconds, would you mind sharing your experience in a quick Google review? ${reviewLink} It helps other customers know they can trust us.`,
  nudge: (reviewLink) => `Just a quick follow-up. If you haven't had a chance yet, we'd really appreciate a quick Google review. It helps others know they can trust us. ${reviewLink}`,
  serviceRecoveryAlert: (customerFirstName, replyText) => `\u{1F6A8} ${customerFirstName} just replied to your check-in: "${replyText}" \u2014 give them a call. Review request suppressed.`,
  intakeConfirm: (firstName, scheduledTime) => `Got it \u2014 ${firstName} added. First text goes out at ${scheduledTime}.`,
  intakeParseError: () => `Couldn't parse that \u2014 please send as: FirstName +1XXXXXXXXXX

Example: "Sarah Johnson +14155551234"`,
  intakeInactivityAlert: (ownerFirstName) => `Hey ${ownerFirstName}, haven't heard from you in a week. Everything OK with Review Engine? Reply YES to snooze this alert, HELP for support.`,
  guaranteeMetRefAsk: (ownerFirstName, vertical, referralLink) => `\u{1F389} You just hit 10 new reviews, ${ownerFirstName} \u2014 guarantee is safe! Know any other ${vertical}s who'd want this? Send them my way, you get 1 month free per closed referral: ${referralLink}`,
  foundingTestimonialReminder: (ownerFirstName, daysRemaining, calendly) => `Hey ${ownerFirstName}, quick reminder \u2014 your testimonial for the Founding 5 setup waiver is due in ${daysRemaining} days. Book here: ${calendly}`,
  // Sales
  salesDay1Hook: (firstName, businessName, reviewCount, competitorCount) => `Hey ${firstName}, quick one \u2014 noticed ${businessName} has ${reviewCount} Google reviews. Your top local competitor has ${competitorCount}. We fix this in 30 days or your next month is free. Worth a 10-min chat?`,
  salesDay3Followup: (topCompetitor, competitorNewReviews, clientNewReviews) => `Followed up because your competitors keep pulling ahead \u2014 ${topCompetitor} added ${competitorNewReviews} reviews last month while you added ${clientNewReviews}. Want to see how we close the gap?`,
  salesDay6Audit: (firstName, businessName, auditUrl, calendlyLink) => `${firstName}, made a quick audit for ${businessName} \u2014 you vs your top 3 local competitors. Attached: ${auditUrl}. If this makes sense, book here: ${calendlyLink}`,
  salesDay10Breakup: () => `Closing your file today unless I hear back. If reviews aren't a priority right now, all good \u2014 reply KEEP and I'll circle back Q2.`
};
const AI_FALLBACK_TEMPLATES = {
  5: (firstName, businessName, ownerFirstName) => `${firstName} \u2014 thanks so much for taking the time to leave this! Really appreciate you choosing ${businessName}. We're here whenever you need us.
- ${ownerFirstName}`,
  4: (firstName, ownerFirstName) => `Thanks for the honest feedback, ${firstName}. We appreciate you giving us a shot and will use this to keep improving.
- ${ownerFirstName}`,
  3: (firstName, ownerFirstName, ownerPhone) => `Thanks for the feedback, ${firstName}. I'd like to make it right \u2014 please call me directly at ${ownerPhone}.
- ${ownerFirstName}`,
  2: (firstName, ownerFirstName, ownerPhone) => `Thanks for the feedback, ${firstName}. I'd like to make it right \u2014 please call me directly at ${ownerPhone}.
- ${ownerFirstName}`,
  1: (firstName, ownerFirstName, ownerPhone) => `Thanks for the feedback, ${firstName}. I'd like to make it right \u2014 please call me directly at ${ownerPhone}.
- ${ownerFirstName}`
};
function contentFilterCheck(text, ownerPhone) {
  let textForPhoneCheck = text;
  if (ownerPhone) {
    const digitsOnly = ownerPhone.replace(/[^0-9]/g, "");
    textForPhoneCheck = textForPhoneCheck.replace(new RegExp(ownerPhone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "").replace(new RegExp(digitsOnly, "g"), "");
    if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
      textForPhoneCheck = textForPhoneCheck.replace(new RegExp(digitsOnly.substring(1), "g"), "");
    }
  }
  const violations = [
    { pattern: /https?:\/\//i, reason: "URL detected", target: text },
    { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, reason: "Phone number detected (not owner phone)", target: textForPhoneCheck },
    { pattern: /\b(AI|automated|automation|chatbot|GPT|Claude)\b/i, reason: "AI mention detected", target: text },
    { pattern: /\b(discount|coupon|off|promo|save \$)\b/i, reason: "Promotional language detected", target: text },
    { pattern: /\b(free|click here|visit)\b/i, reason: "CTA/promotional language", target: text }
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
export {
  AI_FALLBACK_TEMPLATES,
  SMS_TEMPLATES,
  contentFilterCheck
};
