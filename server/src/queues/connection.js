import "dotenv/config";
import IORedis from "ioredis";

let connection;

export function getRedisConnection() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required for background workers");
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: attempts => Math.min(attempts * 500, 10_000)
    });
    connection.on("error", error => console.error("[redis]", error.message));
  }
  return connection;
}

export async function closeRedisConnection() {
  if (connection) {
    const current = connection;
    connection = undefined;
    await current.quit();
  }
}
