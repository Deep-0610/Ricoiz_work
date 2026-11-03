import "dotenv/config";
import mongoose from "mongoose";
import { startReviewSyncWorker } from "./reviewSyncWorker.js";
import { startSmsWorker } from "./smsWorker.js";
import { closeQueues } from "../queues/index.js";
import { closeRedisConnection } from "../queues/connection.js";

const workers = [];

async function shutdown(signal) {
  console.info(`[workers] received ${signal}; shutting down`);
  await Promise.all(workers.map(worker => worker.close()));
  await closeQueues();
  await closeRedisConnection();
  await mongoose.disconnect();
  process.exit(0);
}

async function start() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");
  await mongoose.connect(process.env.MONGODB_URI);
  workers.push(await startReviewSyncWorker());
  workers.push(await startSmsWorker());
  console.info("[workers] review sync and SMS workers started");
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch(error => {
  console.error("[workers] startup failed", error);
  process.exit(1);
});
