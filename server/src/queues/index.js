import { Queue } from "bullmq";
import { getRedisConnection } from "./connection.js";

export const QUEUE_NAMES = Object.freeze({
  reviews: "ricoiz-review-sync",
  sms: "ricoiz-sms-delivery"
});

let reviewQueue;
let smsQueue;

function queueOptions() {
  return {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 10_000 },
      removeOnFail: { age: 30 * 24 * 60 * 60, count: 25_000 }
    }
  };
}

export function getReviewQueue() {
  if (!reviewQueue) reviewQueue = new Queue(QUEUE_NAMES.reviews, queueOptions());
  return reviewQueue;
}

export function getSmsQueue() {
  if (!smsQueue) smsQueue = new Queue(QUEUE_NAMES.sms, queueOptions());
  return smsQueue;
}

export async function enqueueGoogleReviewSync(clientId, reason = "scheduled") {
  if (!clientId) throw new Error("clientId is required");
  return getReviewQueue().add("sync-google-reviews", { clientId: String(clientId), reason }, {
    jobId: `google-${String(clientId)}-${Math.floor(Date.now() / 60_000)}`
  });
}

export async function enqueueSms({ clientId, customerId, body, campaignId = null }) {
  if (!clientId || !customerId || !body) throw new Error("clientId, customerId and body are required");
  return getSmsQueue().add("deliver-sms", {
    clientId: String(clientId),
    customerId: String(customerId),
    body: String(body),
    campaignId: campaignId ? String(campaignId) : null
  }, {
    jobId: `sms-${String(clientId)}-${String(customerId)}-${Date.now()}`
  });
}

export async function closeQueues() {
  await Promise.all([reviewQueue?.close(), smsQueue?.close()]);
  reviewQueue = undefined;
  smsQueue = undefined;
}
