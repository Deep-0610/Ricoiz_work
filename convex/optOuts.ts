import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Global opt-out check. Called by every SMS-sending workflow before send.
 */
export const check = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const optOut = await ctx.db
      .query("optOuts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    return { optedOut: !!optOut };
  },
});

/**
 * Add phone to global opt-out list + suppress all matching customers.
 */
export const add = mutation({
  args: {
    phone: v.string(),
    triggerClientId: v.optional(v.id("reviewClients")),
    triggerCustomerId: v.optional(v.id("reviewCustomers")),
    reason: v.string(),
    keywordMatched: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Dedup
    const existing = await ctx.db
      .query("optOuts")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();
    if (existing) return { ok: true, already: true };

    await ctx.db.insert("optOuts", {
      ...args,
      optedOutAt: Date.now(),
    });

    // Suppress all customers with this phone across all clients
    await ctx.scheduler.runAfter(0, internal.reviewCustomers.markOptedOut, {
      phone: args.phone,
    });

    return { ok: true, already: false };
  },
});

/**
 * Re-subscribe (START/UNSTOP). Manual review required — this is a query for admin only.
 */
export const remove = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const optOut = await ctx.db
      .query("optOuts")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (!optOut) return { ok: false, error: "not_found" };
    await ctx.db.delete(optOut._id);
    return { ok: true };
  },
});

// FIX 2026-07-11: STOP_KEYWORDS now requires the keyword to be the ENTIRE message
// (or the whole message minus trailing punctuation). Previous \b...\b form
// false-triggered on "cancel my appointment", "at the end of week", "I quit smoking".
// CTIA best practice is to match STOP intent only, not every use of these words.
const STOP_KEYWORDS_EXACT = /^(stop|stopall|unsubscribe|cancel|end|quit|revoke|opt.?out|remove)[\s\.\!\?]*$/i;
const NATURAL_STOP_PHRASES = /\b(please stop|stop texting|stop messaging|take me off|no more|remove me|don't text|do not text|delete me)\b/i;
const RESUBSCRIBE = /^(start|unstop|yes)[\s\.\!\?]*$/i;

/**
 * Detect if inbound SMS text is an opt-out signal.
 * - Single-word STOPs must be the whole message.
 * - Natural-language STOP phrases can appear anywhere in a longer message.
 */
export function detectOptOut(text: string): { isOptOut: boolean; keyword?: string; isResubscribe?: boolean } {
  const trimmed = text.trim();
  if (RESUBSCRIBE.test(trimmed) && trimmed.length < 15) return { isOptOut: false, isResubscribe: true };
  const kwMatch = trimmed.match(STOP_KEYWORDS_EXACT);
  if (kwMatch) return { isOptOut: true, keyword: kwMatch[1].toLowerCase() };
  if (NATURAL_STOP_PHRASES.test(trimmed)) return { isOptOut: true, keyword: "natural_language" };
  return { isOptOut: false };
}
