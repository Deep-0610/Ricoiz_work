import { Worker } from "bullmq";
import mongoose from "mongoose";
import { Client, Customer, SmsActivity } from "../models.js";
import { QUEUE_NAMES } from "../queues/index.js";
import { getRedisConnection } from "../queues/connection.js";
import { validateSmsRecipient } from "./smsPolicy.js";

async function sendTwilioSms({ to, body }) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error("Twilio is not configured; SMS delivery is disabled");
  }
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Twilio returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function deliverSmsJob(data) {
  const { clientId, customerId, body, campaignId } = data;
  if (!mongoose.isValidObjectId(clientId) || !mongoose.isValidObjectId(customerId)) {
    throw new Error("Invalid tenant or customer id");
  }
  const [client, customer] = await Promise.all([
    Client.findById(clientId).select("timezone status").lean(),
    Customer.findOne({ _id: customerId, clientId })
  ]);
  if (!client || client.status === "paused") return { skipped: "workspace_inactive" };
  if (!customer) return { skipped: "customer_not_found" };
  const policy = validateSmsRecipient(customer, client.timezone || "UTC");
  if (!policy.allowed) {
    await SmsActivity.create({
      clientId,
      customerId,
      direction: "outbound",
      body,
      status: "failed",
      demo: true
    });
    return { skipped: policy.reason };
  }
  if (process.env.SMS_DELIVERY_ENABLED !== "true") return { skipped: "sms_delivery_disabled" };

  const activity = await SmsActivity.create({
    clientId,
    customerId,
    direction: "outbound",
    body,
    status: "queued",
    demo: false
  });
  try {
    const result = await sendTwilioSms({ to: customer.phone, body });
    activity.status = "sent";
    activity.providerId = result.sid;
    await activity.save();
    customer.lastContactedAt = new Date();
    await customer.save();
    return { sent: true, messageId: result.sid, campaignId: campaignId || null };
  } catch (error) {
    activity.status = "failed";
    await activity.save();
    throw error;
  }
}

export async function startSmsWorker() {
  const worker = new Worker(QUEUE_NAMES.sms, job => {
    if (job.name !== "deliver-sms") throw new Error(`Unsupported SMS job: ${job.name}`);
    return deliverSmsJob(job.data);
  }, { connection: getRedisConnection(), concurrency: 3, limiter: { max: 10, duration: 60_000 } });
  worker.on("completed", job => console.info("[sms-worker] completed", job.id));
  worker.on("failed", (job, error) => console.error("[sms-worker] failed", job?.id, error.message));
  return worker;
}
