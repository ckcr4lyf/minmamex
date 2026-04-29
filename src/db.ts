import { LoyaltyTransaction } from "./api.js";
import { QuarterlySummary } from "./utils.js";

export enum JobStatus {
  AUTHENTICATING = "AUTHENTICATING",
  RETRIEVING_DATA = "RETRIEVING_DATA",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export type Job = {
  id: string;
  secret: string;
  status: JobStatus;
  createdAt: Date;
  error?: string;
  results?: {
    accountToken: string;
    cardName: string;
    transactions: LoyaltyTransaction[];
    quarterlySummary: QuarterlySummary[];
  }[];
};