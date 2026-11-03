import { beforeAll, afterAll, beforeEach, describe, expect, test } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

let mongo;
let app;
let User;
let Client;
let Customer;
let Review;
let Campaign;
let agentA;
let clientA;
let clientB;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-only-secret-that-is-long-enough-for-jwt";
  process.env.DEMO_MODE = "false";
  process.env.CLIENT_ORIGIN = "http://localhost:3000";
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  ({ app } = await import("../src/index.js"));
  ({ User, Client, Customer, Review, Campaign } = await import("../src/models.js"));
}, 60000);

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
  clientA = await Client.create({ businessName: "Workspace A", status: "active", demo: false });
  clientB = await Client.create({ businessName: "Workspace B", status: "active", demo: false });
  const passwordHash = await bcrypt.hash("Correct-Horse-123!", 4);
  await User.create({ name: "Owner A", email: "owner-a@example.test", passwordHash, clientId: clientA._id, role: "owner" });
  await User.create({ name: "Owner B", email: "owner-b@example.test", passwordHash, clientId: clientB._id, role: "owner" });
  agentA = request.agent(app);
  await agentA.post("/api/auth/login").send({ email: "owner-a@example.test", password: "Correct-Horse-123!" }).expect(200);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe("authentication and tenant isolation", () => {
  test("rejects unauthenticated protected requests", async () => {
    await request(app).get("/api/dashboard/overview").expect(401);
  });

  test("does not allow a caller-supplied clientId to switch tenants", async () => {
    await Customer.create({ clientId: clientA._id, firstName: "A contact", phone: "+14155550101" });
    await Customer.create({ clientId: clientB._id, firstName: "B contact", phone: "+14155550102" });
    const response = await agentA.get("/api/customers").query({ clientId: String(clientB._id) }).expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].firstName).toBe("A contact");
  });

  test("does not allow updating another workspace's customer", async () => {
    const foreign = await Customer.create({ clientId: clientB._id, firstName: "Foreign", phone: "+14155550103" });
    await agentA.patch(`/api/customers/${foreign._id}`).send({ firstName: "Changed" }).expect(404);
    expect((await Customer.findById(foreign._id)).firstName).toBe("Foreign");
  });
});

describe("review filtering", () => {
  test("filters reviews by unanswered status within the authenticated tenant", async () => {
    await Review.create([
      { clientId: clientA._id, platform: "google", rating: 5, author: "Answered", responseStatus: "published", externalId: "a-1" },
      { clientId: clientA._id, platform: "google", rating: 2, author: "Needs reply", responseStatus: "not_started", externalId: "a-2" },
      { clientId: clientB._id, platform: "google", rating: 1, author: "Other tenant", responseStatus: "not_started", externalId: "b-1" }
    ]);
    const response = await agentA.get("/api/reviews").query({ platform: "google", responseStatus: "unanswered" }).expect(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].author).toBe("Needs reply");
  });
});

describe("campaign CRUD", () => {
  test("creates, lists and updates a campaign only in the authenticated workspace", async () => {
    const created = await agentA.post("/api/campaigns").send({ name: "Welcome follow-up", channel: "sms" }).expect(201);
    expect(created.body.item.clientId.toString()).toBe(String(clientA._id));
    const list = await agentA.get("/api/campaigns").expect(200);
    expect(list.body.items).toHaveLength(1);
    await agentA.patch(`/api/campaigns/${created.body.item._id}/status`).send({ status: "paused" }).expect(200);
    expect((await Campaign.findById(created.body.item._id)).status).toBe("paused");
  });

  test("cannot change a campaign owned by another workspace", async () => {
    const foreign = await Campaign.create({ clientId: clientB._id, name: "Private campaign" });
    await agentA.patch(`/api/campaigns/${foreign._id}/status`).send({ status: "paused" }).expect(404);
    expect((await Campaign.findById(foreign._id)).status).toBe("draft");
  });
});
