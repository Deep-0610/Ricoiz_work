/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as http from "../http.js";
import type * as lib_npaTz from "../lib/npaTz.js";
import type * as lib_quietHours from "../lib/quietHours.js";
import type * as lib_senderRotation from "../lib/senderRotation.js";
import type * as lib_templates from "../lib/templates.js";
import type * as monitoring from "../monitoring.js";
import type * as onboardings from "../onboardings.js";
import type * as optOuts from "../optOuts.js";
import type * as reactivation from "../reactivation.js";
import type * as referrals from "../referrals.js";
import type * as reports from "../reports.js";
import type * as reviewClients from "../reviewClients.js";
import type * as reviewCustomers from "../reviewCustomers.js";
import type * as reviewResponses from "../reviewResponses.js";
import type * as reviewSalesLeads from "../reviewSalesLeads.js";
import type * as reviewSalesSenders from "../reviewSalesSenders.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  http: typeof http;
  "lib/npaTz": typeof lib_npaTz;
  "lib/quietHours": typeof lib_quietHours;
  "lib/senderRotation": typeof lib_senderRotation;
  "lib/templates": typeof lib_templates;
  monitoring: typeof monitoring;
  onboardings: typeof onboardings;
  optOuts: typeof optOuts;
  reactivation: typeof reactivation;
  referrals: typeof referrals;
  reports: typeof reports;
  reviewClients: typeof reviewClients;
  reviewCustomers: typeof reviewCustomers;
  reviewResponses: typeof reviewResponses;
  reviewSalesLeads: typeof reviewSalesLeads;
  reviewSalesSenders: typeof reviewSalesSenders;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
