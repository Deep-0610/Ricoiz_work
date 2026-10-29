// Sender rotation for sales workflows.
// Delivery workflows use sticky sender per client (already set on reviewClients.senderPhone).

/**
 * Deterministic sender rotation based on lead ID.
 * Same lead always gets same sender (for follow-ups). Load spreads across pool.
 */
export function rotateSender(pool: string[], leadId: string): string {
  if (pool.length === 0) throw new Error("Empty sender pool");
  const hash = leadId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return pool[hash % pool.length];
}
