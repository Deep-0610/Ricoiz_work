import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
const check = query({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const optOut = await ctx.db.query("optOuts").withIndex("by_phone", (q) => q.eq("phone", phone)).first();
    return { optedOut: !!optOut };
  }
});
const add = mutation({
  args: {
    phone: v.string(),
    triggerClientId: v.optional(v.id("reviewClients")),
    triggerCustomerId: v.optional(v.id("reviewCustomers")),
    reason: v.string(),
    keywordMatched: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("optOuts").withIndex("by_phone", (q) => q.eq("phone", args.phone)).first();
    if (existing) return { ok: true, already: true };
    await ctx.db.insert("optOuts", {
      ...args,
      optedOutAt: Date.now()
    });
    await ctx.scheduler.runAfter(0, internal.reviewCustomers.markOptedOut, {
      phone: args.phone
    });
    return { ok: true, already: false };
  }
});
const remove = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const optOut = await ctx.db.query("optOuts").withIndex("by_phone", (q) => q.eq("phone", phone)).first();
    if (!optOut) return { ok: false, error: "not_found" };
    await ctx.db.delete(optOut._id);
    return { ok: true };
  }
});
const STOP_KEYWORDS_EXACT = /^(stop|stopall|unsubscribe|cancel|end|quit|revoke|opt.?out|remove)[\s\.\!\?]*$/i;
const NATURAL_STOP_PHRASES = /\b(please stop|stop texting|stop messaging|take me off|no more|remove me|don't text|do not text|delete me)\b/i;
const RESUBSCRIBE = /^(start|unstop|yes)[\s\.\!\?]*$/i;
function detectOptOut(text) {
  const trimmed = text.trim();
  if (RESUBSCRIBE.test(trimmed) && trimmed.length < 15) return { isOptOut: false, isResubscribe: true };
  const kwMatch = trimmed.match(STOP_KEYWORDS_EXACT);
  if (kwMatch) return { isOptOut: true, keyword: kwMatch[1].toLowerCase() };
  if (NATURAL_STOP_PHRASES.test(trimmed)) return { isOptOut: true, keyword: "natural_language" };
  return { isOptOut: false };
}
export {
  add,
  check,
  detectOptOut,
  remove
};
