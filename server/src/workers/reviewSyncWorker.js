import { Worker } from "bullmq";
import mongoose from "mongoose";
import { Client, IntegrationConnection, Review } from "../models.js";
import { googleAccessToken, listGoogleReviews } from "../googleBusinessProfile.js";
import { QUEUE_NAMES, getReviewQueue } from "../queues/index.js";
import { getRedisConnection } from "../queues/connection.js";

const ratingMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export async function syncGoogleReviewsForTenant(clientId) {
  if (!mongoose.isValidObjectId(String(clientId))) throw new Error("Invalid tenant id");
  const [client, connection] = await Promise.all([
    Client.findById(clientId).select("_id status").lean(),
    IntegrationConnection.findOne({ clientId, provider: "google-business-profile", status: "connected" })
  ]);
  if (!client || client.status !== "active") return { skipped: "workspace_inactive", synced: 0 };
  if (!connection?.locationName) return { skipped: "google_location_not_configured", synced: 0 };

  const accessToken = await googleAccessToken(connection, document => document.save());
  let pageToken;
  let pages = 0;
  let synced = 0;
  do {
    const data = await listGoogleReviews(accessToken, connection.locationName, pageToken);
    for (const item of data.reviews || []) {
      const rating = ratingMap[item.starRating] || Number(item.starRating) || 0;
      if (!rating || !item.reviewId) continue;
      await Review.findOneAndUpdate(
        { clientId, externalId: item.reviewId, platform: "google" },
        { $set: {
          externalId: item.reviewId,
          platform: "google",
          rating,
          author: item.reviewer?.displayName || "Google user",
          text: item.comment || "",
          response: item.reviewReply?.comment || "",
          responseStatus: item.reviewReply?.comment ? "published" : "not_started",
          reviewedAt: item.createTime ? new Date(item.createTime) : new Date(),
          demo: false
        } },
        { upsert: true, new: true, runValidators: true }
      );
      synced += 1;
    }
    pageToken = data.nextPageToken;
    pages += 1;
  } while (pageToken && pages < 10);

  return { synced, pages, hasMore: Boolean(pageToken) };
}

export async function startReviewSyncWorker() {
  const queue = getReviewQueue();
  await queue.upsertJobScheduler(
    "connected-google-workspaces-every-four-hours",
    { every: 4 * 60 * 60 * 1000 },
    { name: "discover-connected-google-workspaces", data: {} }
  );

  const worker = new Worker(QUEUE_NAMES.reviews, async job => {
    if (job.name === "discover-connected-google-workspaces") {
      const connections = await IntegrationConnection.find({
        provider: "google-business-profile",
        status: "connected",
        locationName: { $type: "string", $ne: "" }
      }).select("clientId").lean();
      const queued = await Promise.all(connections.map(item => queue.add(
        "sync-google-reviews",
        { clientId: String(item.clientId), reason: "four-hour-schedule" },
        { jobId: `scheduled-google-${String(item.clientId)}-${Math.floor(Date.now() / (4 * 60 * 60 * 1000))}` }
      )));
      return { workspacesQueued: queued.length };
    }
    if (job.name === "sync-google-reviews") {
      return syncGoogleReviewsForTenant(job.data.clientId);
    }
    throw new Error(`Unsupported review job: ${job.name}`);
  }, { connection: getRedisConnection(), concurrency: 5, limiter: { max: 20, duration: 60_000 } });

  worker.on("completed", job => console.info("[review-worker] completed", job.name, job.id));
  worker.on("failed", (job, error) => console.error("[review-worker] failed", job?.name, job?.id, error.message));
  return worker;
}
